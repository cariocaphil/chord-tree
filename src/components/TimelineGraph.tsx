import React, { useMemo } from 'react';
import { useChordStore } from '../chordStore';

interface NodePosition {
  nodeId: string;
  x: number;
  y: number;
  branchIndex: number;
}

const LANE_HEIGHT = 60;
const NODE_RADIUS = 5;
const LANE_WIDTH = 50;
const HORIZONTAL_SPACING = 100;

export const TimelineGraph: React.FC = () => {
  const nodes = useChordStore((state) => state.nodes);
  const selectedNodeId = useChordStore((state) => state.selectedNodeId);
  const activeBranchId = useChordStore((state) => state.activeBranchId);
  const selectNode = useChordStore((state) => state.selectNode);

  const positions = useMemo(() => {
    const posMap: Map<string, NodePosition> = new Map();
    const visited = new Set<string>();
    

    // BFS to assign positions
    const queue: string[] = ['root'];
    const branchMap = new Map<string, number>();
    branchMap.set('main', 0);

    let x = 0;
    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current)) continue;
      visited.add(current);

      const branch = nodes[current]?.branchId || 'main';
      if (!branchMap.has(branch)) {
        branchMap.set(branch, branchMap.size);
      }

      const branchIndex = branchMap.get(branch) || 0;
      posMap.set(current, {
        nodeId: current,
        x,
        y: branchIndex * LANE_HEIGHT,
        branchIndex,
      });

      // Add children to queue
      const children = Object.values(nodes)
        .filter((n) => n.parentId === current)
        .sort((a, b) => a.createdAt - b.createdAt);

      children.forEach((child) => {
        if (!visited.has(child.id)) {
          queue.push(child.id);
        }
      });

      x += HORIZONTAL_SPACING;
    }

    return Array.from(posMap.values());
  }, [nodes]);

  const svgHeight = Math.max(300, (Math.max(...positions.map((p) => p.branchIndex)) + 1) * LANE_HEIGHT);
  const svgWidth = Math.max(400, (Math.max(...positions.map((p) => p.x)) || 0) + 150);

  // Draw edges
  const edges = Object.values(nodes)
    .filter((node) => node.parentId)
    .map((node) => {
      const parentPos = positions.find((p) => p.nodeId === node.parentId);
      const childPos = positions.find((p) => p.nodeId === node.id);
      return { parent: parentPos, child: childPos };
    })
    .filter((e) => e.parent && e.child);

  return (
    <div className="timeline-graph">
      <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`}>
        {/* Branch lanes (light grid) */}
        {Array.from(new Set(positions.map((p) => p.branchIndex))).map((branchIdx) => (
          <line
            key={`lane-${branchIdx}`}
            x1="0"
            y1={branchIdx * LANE_HEIGHT + LANE_HEIGHT / 2}
            x2={svgWidth}
            y2={branchIdx * LANE_HEIGHT + LANE_HEIGHT / 2}
            className="timeline-lane"
          />
        ))}

        {/* Edges (connections) */}
        {edges.map((edge) => {
          if (!edge.parent || !edge.child) return null;
          const x1 = edge.parent.x + LANE_WIDTH / 2;
          const y1 = edge.parent.y + LANE_HEIGHT / 2;
          const x2 = edge.child.x - LANE_WIDTH / 2;
          const y2 = edge.child.y + LANE_HEIGHT / 2;

          // consider an edge active if it belongs to the active branch
          const parentNode = nodes[edge.parent.nodeId];
          const childNode = nodes[edge.child.nodeId];
          const edgeActive = parentNode?.branchId === activeBranchId || childNode?.branchId === activeBranchId;

          const edgeKey = `${edge.parent.nodeId}->${edge.child.nodeId}`;

          return (
            <g key={edgeKey} className={edgeActive ? 'branch-active' : 'branch-inactive'}>
              {/* Curve connection */}
              <path
                d={`M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1} ${x2} ${y2}`}
                className={`timeline-edge ${edgeActive ? 'active' : ''}`}
              />
            </g>
          );
        })}

        {/* Nodes */}
        {positions.map((pos) => {
          const node = nodes[pos.nodeId];
          if (!node) return null;
          const isSelected = pos.nodeId === selectedNodeId;
          const isBranchActive = node.branchId === activeBranchId;
          const children = Object.values(nodes)
            .filter((n) => n.parentId === pos.nodeId)
            .sort((a, b) => a.createdAt - b.createdAt);
          const hasChildren = children.length > 0;

          return (
            <g
              key={pos.nodeId}
              className={`timeline-node ${isSelected ? 'selected' : ''} ${hasChildren ? 'has-children' : ''} ${isBranchActive ? 'branch-active' : 'branch-inactive'}`}
              onClick={() => selectNode(pos.nodeId)}
              style={{ cursor: 'pointer' }}
            >
              {/* Node circle */}
              <circle
                cx={pos.x + LANE_WIDTH / 2}
                cy={pos.y + LANE_HEIGHT / 2}
                r={NODE_RADIUS}
                className="node-dot"
              />

              {/* Node label */}
              <text
                x={pos.x + LANE_WIDTH / 2}
                y={pos.y + LANE_HEIGHT / 2 + 18}
                className="node-label"
                textAnchor="middle"
              >
                {node.chordName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};
