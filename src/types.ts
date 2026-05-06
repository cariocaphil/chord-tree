export interface ChordNode {
  id: string;
  chordName: string;
  notes: string[];
  parentId: string | null;
  branchId: string;
  createdAt: number;
}

export interface ChordSuggestion {
  chordName: string;
  notes: string[];
  label: string;
  explanation: string;
}

export interface ProgressionState {
  nodes: Record<string, ChordNode>;
  selectedNodeId: string;
  suggestions: ChordSuggestion[];
  // currently active branch id (the branch the user has checked out)
  activeBranchId: string;
}
