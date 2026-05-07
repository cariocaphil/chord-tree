import { useChordStore } from '../chordStore';
import ChordNotation from './ChordNotation';

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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <ChordNotation notes={suggestion.notes} width={160} height={96} />
              <div className="card-name">{suggestion.chordName}</div>
            </div>
            <div className="card-explanation">{suggestion.explanation}</div>
          </button>
        ))}
      </div>
    </div>
  );
};
