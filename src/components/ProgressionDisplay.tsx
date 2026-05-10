import { useState } from 'react';
import { useChordStore } from '../chordStore';
import playbackService from '../playbackService';
import ChordNotation from './ChordNotation';
import { ExportPdfModal } from './ExportPdfModal';

export const ProgressionDisplay = () => {
  const getProgressionNodes = useChordStore((state) => state.getProgressionNodes);
  const selectedNodeId = useChordStore((state) => state.selectedNodeId);
  const nodes = useChordStore((state) => state.nodes);
  const deleteSelectedNode = useChordStore((state) => state.deleteSelectedNode);
  const isLeafNode = useChordStore((state) => state.isLeafNode);
  
  // Subscribe to nodes and selectedNodeId to trigger re-render on changes
  useChordStore((state) => [state.nodes, state.selectedNodeId]);

  const [isPdfModalOpen, setIsPdfModalOpen] = useState(false);

  const progressionNodes = getProgressionNodes();
  
  // Determine if delete button should be enabled
  const selectedNode = nodes[selectedNodeId];
  const isRootNode = selectedNode?.parentId === null;
  const isLeaf = isLeafNode(selectedNodeId);
  const canDelete = !isRootNode && isLeaf;

  const handlePlay = async () => {
    const chords: string[][] = progressionNodes.map((n) => n.notes || []);
    await playbackService.playProgression(chords, 1);
  };

  const handleDelete = () => {
    deleteSelectedNode();
  };

  return (
    <div className="progression-display">
      <h2>Current Progression</h2>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <button onClick={handlePlay} disabled={progressionNodes.length === 0} className="play-button">
          Play
        </button>
        <button
          onClick={handleDelete}
          disabled={!canDelete}
          className="delete-button"
          title={isRootNode ? 'Cannot delete root node' : !isLeaf ? 'Cannot delete node with children' : 'Delete selected node'}
        >
          Delete
        </button>
        <button
          onClick={() => setIsPdfModalOpen(true)}
          disabled={progressionNodes.length === 0}
          className="export-pdf-button"
          title="Export current path as PDF"
        >
          Export PDF
        </button>
        <div className="progression-row">
          {progressionNodes.length === 0 ? (
            <span className="no-progression">No progression yet</span>
          ) : (
            progressionNodes.map((node) => (
              <div key={node.id} className="chord-badge" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ChordNotation notes={node.notes} width={140} height={96} />
                <div style={{ marginTop: 6 }}>{node.chordName}</div>
              </div>
            ))
          )}
        </div>
      </div>

      {isPdfModalOpen && (
        <ExportPdfModal
          progressionNodes={progressionNodes}
          onClose={() => setIsPdfModalOpen(false)}
        />
      )}
    </div>
  );
};
