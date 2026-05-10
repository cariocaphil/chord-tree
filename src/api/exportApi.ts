/**
 * exportApi.ts
 * ────────────
 * Typed HTTP client for the PDF export endpoint.
 *
 * POST /api/export/pdf
 *   – sends the progression title and an ordered array of chord blocks,
 *     each carrying the chord name and a high-resolution PNG data-URL
 *     rendered from the VexFlow SVG on the client side.
 *   – receives an application/pdf blob that the caller can turn into a
 *     browser download.
 */

import { ApiError } from './chordApi';

const BASE_URL = '/api';

// ── Request shape (mirrors backend ChordExportItem / ExportPdfRequest) ────────

export interface ChordExportItem {
  /** Chord symbol shown below the staff, e.g. "Am7". */
  chordName: string;
  /** MIDI note names kept for metadata, e.g. ["A3","C4","E4","G4"]. */
  notes: string[];
  /**
   * High-resolution PNG rendered from the VexFlow SVG via an HTML canvas
   * at 3× scale, encoded as a data-URL ("data:image/png;base64,…").
   * Pass an empty string if conversion failed; the backend will draw a
   * five-line placeholder staff instead.
   */
  notationImage: string;
}

export interface ExportPdfRequest {
  /** User-supplied title centred at the top of the PDF. */
  title: string;
  /** Ordered chord blocks from root to the currently selected node. */
  chords: ChordExportItem[];
}

// ── Endpoint ──────────────────────────────────────────────────────────────────

/**
 * POST /export/pdf
 *
 * Ask the backend to render an A4 PDF for the given chord progression and
 * return it as a Blob so the caller can trigger a browser download.
 *
 * Throws {@link ApiError} for non-2xx responses.
 */
export async function exportPdf(
  payload: ExportPdfRequest,
  signal?: AbortSignal,
): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/export/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? message;
    } catch {
      // response body was not JSON — keep the default message
    }
    throw new ApiError(res.status, message);
  }

  return res.blob();
}
