import { create } from 'zustand';
import { ChordNode, ChordSuggestion, ProgressionState } from './types';

interface ChordStore extends ProgressionState {
  addChordNode: (suggestion: ChordSuggestion) => void;
  selectNode: (nodeId: string) => void;
  deleteSelectedNode: () => void;
  getProgression: () => string[];
  getProgressionNodes: () => ChordNode[];
  getActiveBranchId: () => string;
  getChildrenOf: (nodeId: string) => ChordNode[];
  getBranchNodes: (branchId: string) => ChordNode[];
  isLeafNode: (nodeId: string) => boolean;
  getParentNode: (nodeId: string) => ChordNode | null;
}

const createRootNode = (): ChordNode => ({
  id: 'root',
  chordName: 'Cmaj7',
  notes: ['C4', 'E4', 'G4', 'B4'],
  parentId: null,
  branchId: 'main',
  createdAt: Date.now(),
});

const HARDCODED_SUGGESTIONS: ChordSuggestion[] = [
  {
    chordName: 'Am7',
    notes: ['A3', 'C4', 'E4', 'G4'],
    label: 'Am7',
    explanation: 'Minor seventh chord',
  },
  {
    chordName: 'Dm7',
    notes: ['D4', 'F4', 'A4', 'C5'],
    label: 'Dm7',
    explanation: 'Minor seventh chord',
  },
  {
    chordName: 'Fmaj7',
    notes: ['F4', 'A4', 'C5', 'E5'],
    label: 'Fmaj7',
    explanation: 'Major seventh chord',
  },
  {
    chordName: 'G7',
    notes: ['G4', 'B4', 'D5', 'F5'],
    label: 'G7',
    explanation: 'Dominant seventh chord',
  },
];

export const useChordStore = create<ChordStore>((set, get) => ({
  nodes: { root: createRootNode() },
  selectedNodeId: 'root',
  suggestions: HARDCODED_SUGGESTIONS,
  // active branch (checked-out branch)
  activeBranchId: 'main',

  addChordNode: (suggestion: ChordSuggestion) => {
    set((state) => {
      const parentId = state.selectedNodeId;
      const parentNode = state.nodes[parentId];

      const newNodeId = `node-${Date.now()}`;
      // find children of the parent to determine if we're branching
      const siblings = Object.values(state.nodes).filter((n) => n.parentId === parentId);
      const parentBranchId = parentNode?.branchId || 'main';

      // If parent already has a child, creating a new child should create a new branch
      // (i.e. like branching off a historical commit). If parent has no children,
      // continue the parent's branch.
      const willBranch = siblings.length > 0;

      const branchId = willBranch ? `branch-${newNodeId}` : parentBranchId;

      const newNode: ChordNode = {
        id: newNodeId,
        chordName: suggestion.chordName,
        notes: suggestion.notes,
        parentId,
        branchId,
        createdAt: Date.now(),
      };

      return {
        nodes: {
          ...state.nodes,
          [newNodeId]: newNode,
        },
        selectedNodeId: newNodeId,
        // when we add a node we also check out its branch
        activeBranchId: branchId,
      };
    });
  },

  selectNode: (nodeId: string) => {
    set((state) => {
      const node: ChordNode | undefined = state.nodes[nodeId];
      return {
        selectedNodeId: nodeId,
        activeBranchId: node?.branchId || state.activeBranchId,
      };
    });
  },

  // ─── Delete the currently selected node (leaf nodes only, not root) ───────
  deleteSelectedNode: () => {
    set((state) => {
      const targetId = state.selectedNodeId;
      const targetNode = state.nodes[targetId];

      // Guard: root node cannot be deleted
      if (!targetNode || targetNode.parentId === null) return state;

      // Guard: only leaf nodes (nodes with no children) can be deleted
      const hasChildren = Object.values(state.nodes).some(
        (n) => n.parentId === targetId,
      );
      if (hasChildren) return state;

      // Immutably remove the target node from the nodes map
      const { [targetId]: _removed, ...remainingNodes } = state.nodes;

      // Move selection up to the deleted node's parent
      const parentId = targetNode.parentId;
      const parentNode = remainingNodes[parentId];

      return {
        nodes: remainingNodes,
        selectedNodeId: parentId,
        activeBranchId: parentNode?.branchId ?? state.activeBranchId,
      };
    });
  },

  // ─── Helper: true when nodeId has no children ─────────────────────────────
  isLeafNode: (nodeId: string) => {
    const nodes = get().nodes;
    return !Object.values(nodes).some((n) => n.parentId === nodeId);
  },

  // ─── Helper: return the parent ChordNode, or null for root ───────────────
  getParentNode: (nodeId: string) => {
    const state = get();
    const node = state.nodes[nodeId];
    if (!node || node.parentId === null) return null;
    return state.nodes[node.parentId] ?? null;
  },

  getProgression: () => {
    const state = get();
    const progression: string[] = [];
    let currentNodeId: string | null = state.selectedNodeId;

    while (currentNodeId !== null) {
      const node: ChordNode | undefined = state.nodes[currentNodeId];
      if (!node) break;
      progression.unshift(node.chordName);
      currentNodeId = node.parentId;
    }

    return progression;
  },

  getActiveBranchId: () => {
    return get().activeBranchId;
  },

  getChildrenOf: (nodeId: string) => {
    return Object.values(get().nodes).filter((n) => n.parentId === nodeId).sort((a,b)=>a.createdAt-b.createdAt);
  },

  getBranchNodes: (branchId: string) => {
    return Object.values(get().nodes).filter((n) => n.branchId === branchId).sort((a,b)=>a.createdAt-b.createdAt);
  },
  // Return the progression as an array of ChordNode objects from root -> selected
  getProgressionNodes: () => {
    const state = get();
    const progression: ChordNode[] = [];
    let currentNodeId: string | null = state.selectedNodeId;

    while (currentNodeId !== null) {
      const node: ChordNode | undefined = state.nodes[currentNodeId];
      if (!node) break;
      progression.unshift(node);
      currentNodeId = node.parentId;
    }

    return progression;
  },
}));
