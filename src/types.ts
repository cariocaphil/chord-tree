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
  /** True while a /suggest-next-chords request is in-flight. */
  isFetchingSuggestions: boolean;
  /** Non-null when the last fetch ended with an error. */
  suggestionError: string | null;
  /** Composition style forwarded to the engine (e.g. "jazz"). */
  style: string;
  /** Mood forwarded to the engine (e.g. "melancholic"). */
  mood: string;
  /** Tonal centre forwarded to the engine (e.g. "C major"). Undefined means unknown. */
  currentKey?: string;
  // currently active branch id (the branch the user has checked out)
  activeBranchId: string;
}
