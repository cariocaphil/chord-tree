/**
 * chordApi.ts
 * ───────────
 * Typed HTTP client for the Chord Tree backend.
 *
 * All network calls live here so the rest of the app stays fetch-agnostic.
 * To point at a different base URL (e.g. a deployed server) just change
 * BASE_URL — nothing else needs to change.
 *
 * In development, Vite proxies `/api/*` to `http://127.0.0.1:8000` so
 * relative paths work without CORS issues (see vite.config.ts).
 */

import type { ChordSuggestion } from '../types';

// ── Config ────────────────────────────────────────────────────────────────────

const BASE_URL = '/api';

// ── Request / response shapes (mirror backend Pydantic models) ───────────────

export interface SuggestNextChordsRequest {
  progression: string[];
  style: string;
  mood: string;
  numberOfSuggestions: number;
}

export interface SuggestNextChordsResponse {
  suggestions: ChordSuggestion[];
}

// ── Error type ────────────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      message = body?.detail ?? message;
    } catch {
      // body wasn't JSON — keep the default message
    }
    throw new ApiError(res.status, message);
  }
  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────────────────

/**
 * POST /suggest-next-chords
 *
 * Ask the engine for chord suggestions that may follow the current
 * progression.  Returns the `suggestions` array from the response body.
 */
export async function fetchChordSuggestions(
  payload: SuggestNextChordsRequest,
  signal?: AbortSignal,
): Promise<ChordSuggestion[]> {
  const res = await fetch(`${BASE_URL}/suggest-next-chords`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  const data = await handleResponse<SuggestNextChordsResponse>(res);
  return data.suggestions;
}
