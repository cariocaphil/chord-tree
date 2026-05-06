# Chord Tree - Composition Tool

A React + TypeScript + Vite app for chord-by-chord composition exploration.

## Features

- **Chord Node Graph**: Build chord progressions by selecting from suggestions
- **State Management**: Zustand-based store for progression state
- **Visual Display**: 
  - Current progression shown as chord badges
  - Clickable suggestion cards for next chords
  - Debug view showing graph structure

## Project Structure

```
src/
├── types.ts                 # Core type definitions
├── chordStore.ts           # Zustand store for state management
├── App.tsx                 # Main application component
├── App.css                 # Application styles
├── main.tsx                # Entry point
├── index.css               # Global styles
└── components/
    ├── ProgressionDisplay.tsx    # Shows current chord progression
    ├── SuggestionCards.tsx       # Displays suggested next chords
    └── DebugGraphView.tsx        # Debug view of graph state
```

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

The app will start at `http://localhost:5173`

## Build

```bash
npm run build
```

## Data Model

### ChordNode
- `id`: Unique identifier
- `chordName`: Name of the chord (e.g., "Cmaj7")
- `notes`: Array of note strings (e.g., ["C4", "E4", "G4", "B4"])
- `parentId`: ID of the parent node (null for root)
- `branchId`: Identifier for the branch this node belongs to
- `createdAt`: Timestamp when the node was created

### ChordSuggestion
- `chordName`: Name of the suggested chord
- `notes`: Array of note strings
- `label`: Display label
- `explanation`: Brief explanation of the chord

### ProgressionState
- `nodes`: Record of all ChordNodes keyed by ID
- `selectedNodeId`: Currently selected node
- `suggestions`: Array of suggested next chords

## Workflow

1. **Start**: Root node "Cmaj7" is created and selected
2. **Select Suggestion**: Click a suggestion card to create a new chord node
3. **Progression Updates**: The top section shows the path from root to current node
4. **Debug View**: Monitor the graph structure in real-time

## Technologies Used

- **React 18**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool and dev server
- **Zustand**: State management
- **CSS3**: Styling with CSS variables for theming
