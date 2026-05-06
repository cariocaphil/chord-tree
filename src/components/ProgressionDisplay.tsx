import { useChordStore } from '../chordStore';

export const ProgressionDisplay = () => {
  const getProgression = useChordStore((state) => state.getProgression);
  // Subscribe to nodes and selectedNodeId to trigger re-render on changes
  useChordStore((state) => [state.nodes, state.selectedNodeId]);
  const progression = getProgression();

  return (
    <div className="progression-display">
      <h2>Current Progression</h2>
      <div className="progression-row">
        {progression.length === 0 ? (
          <span className="no-progression">No progression yet</span>
        ) : (
          progression.map((chordName, index) => (
            <div key={index} className="chord-badge">
              {chordName}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
