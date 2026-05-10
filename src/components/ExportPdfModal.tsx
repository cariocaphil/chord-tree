/**
 * ExportPdfModal.tsx
 * ──────────────────
 * Modal dialog that collects a user-supplied title, renders each chord
 * directly to an off-screen canvas via VexFlow's Canvas backend, and
 * POSTs the resulting PNG data-URLs to /export/pdf.
 *
 * Why Canvas backend instead of SVG → canvas rasterisation
 * ─────────────────────────────────────────────────────────
 * VexFlow's SVG backend uses the Bravura / Gonville music font for
 * noteheads.  These fonts are loaded as web fonts on the page but are
 * NOT embedded inside the serialised SVG markup.  When that SVG is loaded
 * from a Blob URL (a different origin context) the browser cannot resolve
 * the @font-face references and renders every music glyph as a ■ block.
 *
 * The Canvas backend draws glyphs using the browser's 2D rendering engine
 * against the page's already-loaded font cache, bypassing serialisation
 * entirely.  canvas.toDataURL() captures pixels — same result as what the
 * user sees on screen, zero font loss.
 */

import React, { useEffect, useState } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';
import { ChordNode } from '../types';
import { exportPdf } from '../api/exportApi';

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Off-screen canvas size per chord render.
 * 360×300 px ≈ 1.2:1 aspect ratio, closely matching the PDF notation
 * slot (143×122 pt ≈ 1.17:1) to minimise scaling waste.
 */
const CANVAS_W = 360;
const CANVAS_H = 300;

// ── Props ─────────────────────────────────────────────────────────────────────

interface Props {
  progressionNodes: ChordNode[];
  onClose: () => void;
}

// ── Note-key converter (mirrors ChordNotation.tsx) ────────────────────────────

function toVexKey(note: string): string {
  const m = note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!m) return note;
  return `${m[1].toLowerCase()}${m[2]}/${m[3]}`;
}

// ── Canvas renderer ───────────────────────────────────────────────────────────

/**
 * Render *notes* onto an off-screen HTMLCanvasElement using VexFlow's
 * Canvas backend and return a PNG data-URL.
 *
 * document.fonts.ready is awaited first so Bravura / Gonville are
 * guaranteed to be in the browser's glyph cache before any note is drawn
 * — eliminating the replacement-block problem entirely.
 */
async function renderChordToPng(notes: string[]): Promise<string> {
  await document.fonts.ready;

  const canvas  = document.createElement('canvas');
  canvas.width  = CANVAS_W;
  canvas.height = CANVAS_H;

  const ctx2d = canvas.getContext('2d');
  if (ctx2d) {
    ctx2d.fillStyle = '#ffffff';
    ctx2d.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  try {
    const renderer = new Renderer(canvas, Renderer.Backends.CANVAS);
    renderer.resize(CANVAS_W, CANVAS_H);
    const context = renderer.getContext();

    const staveX = 15;
    const staveY = 50;   // 50 px top padding keeps high ledger lines inside
    const staveW = CANVAS_W - 30;

    const stave = new Stave(staveX, staveY, staveW);
    stave.addClef('treble');
    stave.setContext(context).draw();

    const keys    = notes.map(toVexKey);
    const vexNote = new StaveNote({ keys, duration: 'w' });
    keys.forEach((k, idx) => {
      const acc = k.match(/([#b])/);
      if (acc) vexNote.addModifier(new Accidental(acc[1]), idx);
    });

    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.addTickable(vexNote);
    new Formatter().joinVoices([voice]).format([voice], staveW - 60);
    voice.draw(context, stave);
  } catch (err) {
    console.warn('[ExportPdfModal] VexFlow canvas render error:', err);
  }

  return canvas.toDataURL('image/png');
}

// ── Component ─────────────────────────────────────────────────────────────────

export const ExportPdfModal: React.FC<Props> = ({ progressionNodes, onClose }) => {
  const [title, setTitle]             = useState('My Chord Progression');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // ── Close on Escape key ─────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // ── Export handler ───────────────────────────────────────────────────────────
  const handleExport = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportError(null);

    try {
      const chords = await Promise.all(
        progressionNodes.map(async (node) => {
          let notationImage = '';
          try {
            notationImage = await renderChordToPng(node.notes);
          } catch (renderErr) {
            console.warn('[ExportPdfModal] render failed for', node.chordName, renderErr);
          }
          return { chordName: node.chordName, notes: node.notes, notationImage };
        }),
      );

      const blob = await exportPdf({ title: title.trim() || 'Chord Progression', chords });

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
    <div
      className="pdf-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdf-modal-title"
      onClick={onClose}
    >
      <div className="pdf-modal-panel" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="pdf-modal-header">
          <h2 id="pdf-modal-title" className="pdf-modal-heading">Export PDF</h2>
          <button className="pdf-modal-close" onClick={onClose} aria-label="Close export dialog">
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="pdf-modal-body">
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

          <div className="pdf-modal-preview">
            <span className="pdf-modal-preview__meta">
              {progressionNodes.length} chord{progressionNodes.length !== 1 ? 's' : ''} · selected path only
            </span>
            <div className="pdf-modal-preview__pills">
              {progressionNodes.map((node) => (
                <span key={node.id} className="pdf-chord-pill">{node.chordName}</span>
              ))}
            </div>
          </div>

          {exportError && (
            <div className="pdf-modal-error" role="alert">⚠&nbsp; {exportError}</div>
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
            disabled={isExporting || progressionNodes.length === 0}
          >
            {isExporting
              ? <><span className="spinner" aria-hidden="true" />&nbsp;Generating…</>
              : 'Download PDF'
            }
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPdfModal;
