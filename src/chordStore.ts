import { create } from 'zustand';
import { ChordNode, ChordSuggestion, ProgressionState } from './types';

interface ChordStore extends ProgressionState {
  addChordNode: (suggestion: ChordSuggestion) => void;
  selectNode: (nodeId: string) => void;
  getProgression: () => string[];
  getProgressionNodes: () => ChordNode[];
  getActiveBranchId: () => string;
  getChildrenOf: (nodeId: string) => ChordNode[];
  getBranchNodes: (branchId: string) => ChordNode[];
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
