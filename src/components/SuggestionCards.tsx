import { useChordStore } from '../chordStore';

export const SuggestionCards = () => {
  const suggestions = useChordStore((state) => state.suggestions);
  const addChordNode = useChordStore((state) => state.addChordNode);

  return (
    <div className="suggestion-cards">
      <h2>Suggested Next Chords</h2>
      <div className="cards-container">
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.chordName}
            className="suggestion-card"
            onClick={() => addChordNode(suggestion)}
          >
            <div className="card-name">{suggestion.chordName}</div>
            <div className="card-label">{suggestion.label}</div>
            <div className="card-explanation">{suggestion.explanation}</div>
            <div className="card-notes">{suggestion.notes.join(', ')}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
