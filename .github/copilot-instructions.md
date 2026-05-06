# Chord Tree - Composition Tool

A React + TypeScript + Vite app for exploring chord progressions through a graph-based composition system.

## Project Setup

### Completed Steps:
- Scaffolded Vite project with React + TypeScript
- Installed all dependencies (react, react-dom, zustand)
- Created core project structure with proper type safety
- Implemented Zustand state management
- Built responsive UI with three main sections
- Compiled without errors

### Project Structure:
```
src/
├── types.ts                      # Type definitions
├── chordStore.ts                 # Zustand store
├── App.tsx                       # Main component
├── App.css                       # App styling
├── main.tsx                      # Entry point
├── index.css                     # Global styles
└── components/
    ├── ProgressionDisplay.tsx    # Current progression
    ├── SuggestionCards.tsx       # Chord suggestions
    └── DebugGraphView.tsx        # Graph state debug
```

## To Run the Project

Start the development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Core Features Implemented

1. **ChordNode Data Model**: Tracks chord, notes, parent, branch, and timestamp
2. **Zustand Store**: Centralized state management with actions to:
   - Add new chord nodes from suggestions
   - Select nodes
   - Calculate current progression by walking tree backwards
3. **UI Layout**:
   - Top: Current progression as chord badges
   - Middle: Clickable suggestion cards
   - Bottom: Debug view showing graph state as JSON
4. **Hardcoded Suggestions**: Am7, Dm7, Fmaj7, G7
5. **Workflow**: Click suggestion → create node → update progression

## Development

Build for production:
```bash
npm run build
```

Preview production build:
```bash
npm run preview
```
