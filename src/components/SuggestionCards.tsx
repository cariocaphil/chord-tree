import { useEffect } from 'react';
import { useChordStore } from '../chordStore';
import ChordNotation from './ChordNotation';

// ─── Style options presented in the UI ───────────────────────────────────────

const STYLE_OPTIONS = [
  'jazz', 'bossa nova', 'lo-fi', 'pop', 'classical',
  'r&b', 'neo-soul', 'blues', 'funk', 'bebop',
];

const MOOD_OPTIONS = [
  'melancholic', 'uplifting', 'tense', 'dreamy',
  'romantic', 'mysterious', 'energetic', 'chill',
];

// ─── Skeleton card shown while loading ─────────────────────────────────────

const SkeletonCard = () => (
  <div className="suggestion-card suggestion-card--skeleton" aria-hidden="true">
    <div className="skeleton-notation" />
    <div className="skeleton-line skeleton-line--name" />
    <div className="skeleton-line skeleton-line--explanation" />
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────

export const SuggestionCards = () => {
  const suggestions         = useChordStore((s) => s.suggestions);
  const isFetching          = useChordStore((s) => s.isFetchingSuggestions);
  const suggestionError     = useChordStore((s) => s.suggestionError);
  const style               = useChordStore((s) => s.style);
  const mood                = useChordStore((s) => s.mood);
  const addChordNode        = useChordStore((s) => s.addChordNode);
  const setStyle            = useChordStore((s) => s.setStyle);
  const setMood             = useChordStore((s) => s.setMood);
  const fetchSuggestions    = useChordStore((s) => s.fetchSuggestions);

  // Trigger the initial fetch when the component first mounts (root chord).
  useEffect(() => { fetchSuggestions(); }, []);

  // Re-fetch whenever style or mood changes.
  const handleStyleChange = (next: string) => {
    setStyle(next);
    // Call fetchSuggestions after the state settles.
    setTimeout(() => useChordStore.getState().fetchSuggestions(), 0);
  };

  const handleMoodChange = (next: string) => {
    setMood(next);
    setTimeout(() => useChordStore.getState().fetchSuggestions(), 0);
  };

  return (
    <div className="suggestion-cards">

      {/* ── Header row ────────────────────────────────────────────── */}
      <div className="suggestion-cards__header">
        <h2>Suggested Next Chords</h2>

        {/* Style + mood selectors */}
        <div className="suggestion-cards__controls">
          <label className="control-label">
            Style
            <select
              className="control-select"
              value={style}
              onChange={(e) => handleStyleChange(e.target.value)}
              disabled={isFetching}
            >
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>

          <label className="control-label">
            Mood
            <select
              className="control-select"
              value={mood}
              onChange={(e) => handleMoodChange(e.target.value)}
              disabled={isFetching}
            >
              {MOOD_OPTIONS.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </label>

          <button
            className="control-refresh"
            onClick={fetchSuggestions}
            disabled={isFetching}
            title="Refresh suggestions"
            aria-label="Refresh suggestions"
          >
            {isFetching ? (
              <span className="spinner" aria-label="Loading" />
            ) : (
              <span>&#8635;</span>
            )}
          </button>
        </div>
      </div>

      {/* ── Error banner ─────────────────────────────────────────── */}
      {suggestionError && !isFetching && (
        <div className="suggestion-error" role="alert">
          <span>&#9888;&nbsp; Could not load suggestions — {suggestionError}</span>
          <button className="suggestion-error__retry" onClick={fetchSuggestions}>
            Retry
          </button>
        </div>
      )}

      {/* ── Cards grid ───────────────────────────────────────────── */}
      <div className="cards-container">
        {isFetching
          ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
          : suggestions.map((suggestion) => (
              <button
                key={suggestion.chordName}
                className="suggestion-card"
                onClick={() => addChordNode(suggestion)}
              >
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <ChordNotation notes={suggestion.notes} width={160} height={96} />
                  <div className="card-name">{suggestion.chordName}</div>
                </div>
                <div className="card-explanation">{suggestion.explanation}</div>
              </button>
            ))
        }
      </div>
    </div>
  );
};
