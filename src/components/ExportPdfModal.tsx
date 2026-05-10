/**
 * ExportPdfModal.tsx
 * ──────────────────
 * Modal dialog that collects a user-supplied title, converts every chord's
 * VexFlow SVG to a high-resolution PNG, then POSTs the result to
 * /export/pdf.  The returned blob is immediately offered as a download.
 *
 * PNG capture strategy
 * ────────────────────
 * 1. A hidden off-screen container renders one <ChordNotation /> per chord
 *    at HIDDEN_NOTATION_W × HIDDEN_NOTATION_H so VexFlow has plenty of room.
 * 2. After SVG_READY_DELAY_MS all VexFlow useEffects have settled and the
 *    SVG elements are fully populated in the DOM.
 * 3. Each SVG is serialised with XMLSerializer, loaded into an
 *    HTMLImageElement via a Blob URL, then painted onto an off-screen
 *    canvas at PNG_SCALE (3×) with a solid white background.
 * 4. canvas.toDataURL('image/png') produces a lossless, high-DPI image
 *    that the backend embeds directly — no font or path translation needed,
 *    so noteheads always render exactly as they appear on screen.
 */

import React, { useEffect, useRef, useState } from 'react';
import { ChordNode } from '../types';
import ChordNotation from './ChordNotation';
import { exportPdf } from '../api/exportApi';

// ── Constants ─────────────────────────────────────────────────────────────────

/** ms to wait after mount before treating the hidden SVGs as ready. */
const SVG_READY_DELAY_MS = 350;

/**
 * Size passed to the hidden ChordNotation renderers.
 * ChordNotation adds ~25 % extra height internally for ledger-line padding,
 * so the actual SVG element will be taller than HIDDEN_NOTATION_H.
 */
const HIDDEN_NOTATION_W = 220;
const HIDDEN_NOTATION_H = 150;

/**
 * Canvas up-scale factor for the SVG → PNG conversion.
 * 3× produces a ~660 × 562 px image from a 220 × ~187 px SVG —
 * crisp at any PDF zoom level.
 */
const PNG_SCALE = 3;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  progressionNodes: ChordNode[];
  onClose: () => void;
}

// ── SVG → PNG helper ─────────────────────────────────────────────────────────

/**
 * Rasterise *svgEl* to a PNG data-URL at *scale*× resolution.
 *
 * The browser's own SVG renderer draws the glyphs onto an off-screen
 * canvas, so VexFlow noteheads appear exactly as they do on screen —
 * no font embedding or path translation required.
 */
function svgElementToPng(svgEl: SVGSVGElement, scale: number): Promise<string> {
  return new Promise((resolve, reject) => {
    // Read the exact pixel dimensions VexFlow wrote into the SVG element.
    const svgW = parseFloat(svgEl.getAttribute('width')  ?? '220');
    const svgH = parseFloat(svgEl.getAttribute('height') ?? '187');

    const svgStr = new XMLSerializer().serializeToString(svgEl);
    const blob   = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8' });
    const url    = URL.createObjectURL(blob);

    const img = new Image();

    img.onload = () => {
      const canvas  = document.createElement('canvas');
      canvas.width  = Math.round(svgW * scale);
      canvas.height = Math.round(svgH * scale);

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        URL.revokeObjectURL(url);
        reject(new Error('Could not acquire 2D canvas context'));
        return;
      }

      // White background so noteheads render on white, not transparent.
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/png'));
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`SVG→PNG conversion failed (${svgW}×${svgH})`));
    };

    img.src = url;
  });
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ExportPdfModal: React.FC<Props> = ({ progressionNodes, onClose }) => {
  const [title, setTitle]           = useState('My Chord Progression');
  const [isExporting, setIsExporting] = useState(false);
  const [svgsReady, setSvgsReady]   = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // One ref-slot per chord node; each slot points at the wrapper div that
  // contains the rendered <ChordNotation />.
  const notationRefs = useRef<(HTMLDivElement | null)[]>([]);

  // ── Wait for VexFlow to finish rendering ────────────────────────────────────
  useEffect(() => {
    setSvgsReady(false);
    const timer = window.setTimeout(() => setSvgsReady(true), SVG_READY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [progressionNodes]);

  // ── Close on Escape key ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Export handler ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (!svgsReady || isExporting) return;

    setIsExporting(true);
    setExportError(null);

    try {
      // Convert each hidden VexFlow SVG → high-res PNG in parallel.
      const chords = await Promise.all(
        progressionNodes.map(async (node, idx) => {
          const wrapper = notationRefs.current[idx];
          const svgEl   = wrapper?.querySelector('svg') as SVGSVGElement | null;
          let notationImage = '';
          if (svgEl) {
            try {
              notationImage = await svgElementToPng(svgEl, PNG_SCALE);
            } catch (convErr) {
              // Non-fatal: backend will draw a placeholder staff instead.
              console.warn('PNG conversion failed for', node.chordName, convErr);
            }
          }
          return { chordName: node.chordName, notes: node.notes, notationImage };
        }),
      );

      const blob = await exportPdf({ title: title.trim() || 'Chord Progression', chords });

      // Trigger browser download.
      const url  = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href     = url;
      link.download = `${(title.trim() || 'chord_progression').replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      onClose();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed — please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      {/* ── Backdrop + panel ────────────────────────────────────────────── */}
      <div
        className="pdf-modal-overlay"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-modal-title"
        onClick={onClose}
      >
        <div
          className="pdf-modal-panel"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="pdf-modal-header">
            <h2 id="pdf-modal-title" className="pdf-modal-heading">
              Export PDF
            </h2>
            <button
              className="pdf-modal-close"
              onClick={onClose}
              aria-label="Close export dialog"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div className="pdf-modal-body">
            {/* Title field */}
            <label className="pdf-modal-field">
              <span className="pdf-modal-field__label">Document title</span>
              <input
                className="pdf-modal-field__input"
                type="text"
                value={title}
                maxLength={120}
                placeholder="My Chord Progression"
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleExport(); }}
                autoFocus
              />
            </label>

            {/* Progression preview pills */}
            <div className="pdf-modal-preview">
              <span className="pdf-modal-preview__meta">
                {progressionNodes.length} chord{progressionNodes.length !== 1 ? 's' : ''} · selected path only
              </span>
              <div className="pdf-modal-preview__pills">
                {progressionNodes.map((node) => (
                  <span key={node.id} className="pdf-chord-pill">
                    {node.chordName}
                  </span>
                ))}
              </div>
            </div>

            {/* Error banner */}
            {exportError && (
              <div className="pdf-modal-error" role="alert">
                ⚠&nbsp; {exportError}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="pdf-modal-footer">
            <button
              className="pdf-modal-btn pdf-modal-btn--secondary"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              className="pdf-modal-btn pdf-modal-btn--primary"
              onClick={handleExport}
              disabled={isExporting || !svgsReady || progressionNodes.length === 0}
            >
              {isExporting ? (
                <><span className="spinner" aria-hidden="true" />&nbsp;Generating…</>
              ) : !svgsReady ? (
                'Preparing…'
              ) : (
                'Download PDF'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Hidden off-screen notation renderers ──────────────────────────
          Absolutely positioned far outside the viewport so they are in
          the DOM (required for VexFlow's SVG renderer) but invisible to
          the user.  opacity:0 + pointer-events:none ensures no visual
          artefacts or accidental interaction.
      ─────────────────────────────────────────────────────────────────── */}
      <div
        aria-hidden="true"
        style={{
          position:      'fixed',
          left:          -9999,
          top:           -9999,
          opacity:       0,
          pointerEvents: 'none',
          zIndex:        -1,
        }}
      >
        {progressionNodes.map((node, idx) => (
          <div
            key={node.id}
            ref={(el) => { notationRefs.current[idx] = el; }}
          >
            <ChordNotation
              notes={node.notes}
              width={HIDDEN_NOTATION_W}
              height={HIDDEN_NOTATION_H}
            />
          </div>
        ))}
      </div>
    </>
  );
};

export default ExportPdfModal;
