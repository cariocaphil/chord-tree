import { useChordStore } from '../chordStore';
import playbackService from '../playbackService';

export const ProgressionDisplay = () => {
  const getProgression = useChordStore((state) => state.getProgression);
  const getProgressionNodes = useChordStore((state) => state.getProgressionNodes);
  // Subscribe to nodes and selectedNodeId to trigger re-render on changes
  useChordStore((state) => [state.nodes, state.selectedNodeId]);

  const progression = getProgression();
  const progressionNodes = getProgressionNodes();

  const handlePlay = async () => {
    const chords: string[][] = progressionNodes.map((n) => n.notes || []);
    await playbackService.playProgression(chords, 1);
  };

  return (
    <div className="progression-display">
      <h2>Current Progression</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button onClick={handlePlay} disabled={progressionNodes.length === 0} className="play-button">
          Play
        </button>
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
    </div>
  );
};
