import { useChordStore } from '../chordStore';

export const DebugGraphView = () => {
  const nodes = useChordStore((state) => state.nodes);
  const selectedNodeId = useChordStore((state) => state.selectedNodeId);

  const debugState = {
    nodes,
    selectedNodeId,
    nodeCount: Object.keys(nodes).length,
  };

  return (
    <div className="debug-view">
      <h2>Graph State (Debug)</h2>
      <pre>{JSON.stringify(debugState, null, 2)}</pre>
    </div>
  );
};
