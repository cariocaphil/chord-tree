# Chord Tree — Composition Tool

A React + TypeScript + Vite app for chord-by-chord composition exploration,
powered by an AI suggestion engine (GPT-4o) on the backend.

---

## Features

- **AI-powered suggestions** — GPT-4o suggests the next chord based on the full
  progression, style, mood, and optional key context
- **Chord node graph** — build branching progressions by clicking suggestion cards;
  each branch is tracked independently (git-style)
- **Playback** — play the progression root-to-selected with a PolySynth (Tone.js)
- **Notation** — every chord card and progression badge renders a mini treble staff
  (VexFlow)
- **Educational comments** — one-sentence music-theory explanation on every suggestion
- **Style & mood context** — set the composition style (e.g. `jazz`) and mood
  (e.g. `melancholic`) to steer the AI
- **Key context** — optionally set a tonal centre (e.g. `C major`) for harmonically
  grounded suggestions

---

## Project structure

```
chord-tree/
├── src/
│   ├── types.ts                       # Shared TypeScript interfaces
│   ├── chordStore.ts                  # Zustand store — all app state + actions
│   ├── playbackService.ts             # Tone.js PolySynth playback
│   ├── App.tsx                        # Root component
│   ├── App.css                        # Component styles
│   ├── main.tsx                       # Vite entry point
│   ├── index.css                      # Global styles / CSS variables
│   ├── api/
│   │   └── chordApi.ts                # Typed fetch client for the backend
│   └── components/
│       ├── ProgressionDisplay.tsx     # Progression path + Play button
│       ├── SuggestionCards.tsx        # AI suggestion cards
│       ├── ChordNotation.tsx          # VexFlow mini staff renderer
│       ├── EducationalComments.tsx    # Theory explanation display
│       ├── TimelineGraph.tsx          # Branch / timeline visualisation
│       └── DebugGraphView.tsx         # Raw graph state inspector
└── backend/                           # FastAPI suggestion engine (see backend/README.md)
```

---

## Prerequisites

| Tool | Version |
|------|---------|
| Node.js | 18 + |
| npm | 9 + |
| Python | 3.11 + |
| OpenAI API key | — |

---

## Quick start

### 1. Backend

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Create the environment file
echo "OPENAI_API_KEY=sk-..." > .env

uvicorn app.main:app --reload --port 8000
```

Confirm it is running:
```bash
curl http://localhost:8000/health
# {"status": "ok"}
```

### 2. Frontend

```bash
# in the project root
npm install
npm run dev
```

Open **http://localhost:5173**. Vite proxies `/api/*` to `http://127.0.0.1:8000`
so no CORS configuration is needed in development.

---

## Build for production

```bash
npm run build       # outputs to dist/
npm run preview     # serve the production build locally
```

---

## Data model

### `ChordNode`
| Field | Type | Description |
|-------|------|-------------|
| `id` | `string` | Unique node identifier |
| `chordName` | `string` | Chord symbol, e.g. `"Am7"` |
| `notes` | `string[]` | SPN note names, e.g. `["A3","C4","E4","G4"]` |
| `parentId` | `string \| null` | Parent node id; `null` for root |
| `branchId` | `string` | Branch this node belongs to |
| `createdAt` | `number` | Unix timestamp (ms) |

### `ChordSuggestion`
| Field | Type | Description |
|-------|------|-------------|
| `chordName` | `string` | Chord symbol |
| `notes` | `string[]` | SPN note names for playback / notation |
| `label` | `string` | Short display label |
| `explanation` | `string` | One-sentence music-theory reason |

### `ProgressionState` (Zustand store)
| Field | Type | Description |
|-------|------|-------------|
| `nodes` | `Record<string, ChordNode>` | All nodes keyed by id |
| `selectedNodeId` | `string` | Currently selected node |
| `suggestions` | `ChordSuggestion[]` | Current AI suggestions |
| `isFetchingSuggestions` | `boolean` | True while a request is in-flight |
| `suggestionError` | `string \| null` | Last fetch error message |
| `style` | `string` | Composition style context |
| `mood` | `string` | Emotional mood context |
| `currentKey` | `string \| undefined` | Tonal centre, e.g. `"C major"` |
| `activeBranchId` | `string` | Currently checked-out branch |

---

## Store actions

| Action | Description |
|--------|-------------|
| `addChordNode(suggestion)` | Append a chord node and re-fetch suggestions |
| `selectNode(nodeId)` | Change selection and re-fetch suggestions |
| `deleteSelectedNode()` | Remove the selected leaf node |
| `setStyle(style)` | Update style context |
| `setMood(mood)` | Update mood context |
| `setCurrentKey(key?)` | Set or clear the tonal centre |
| `fetchSuggestions()` | Manually trigger a suggestion fetch |
| `getProgression()` | Return chord names root → selected |
| `getProgressionNodes()` | Return `ChordNode[]` root → selected |
| `getChildrenOf(nodeId)` | Return direct children of a node |
| `isLeafNode(nodeId)` | True when a node has no children |

---

## How suggestions are fetched

```
User action (select / add node)
  └─ fetchSuggestions()
       └─ builds progression[]  root → selectedNode
       └─ POST /api/suggest-next-chords
            { progression, style, mood, numberOfSuggestions, currentKey }
                 │
                 ▼  (FastAPI → OpenAI GPT-4o-mini)
            { suggestions: [{ chordName, notes, label, explanation }] }
       └─ set({ suggestions })
            └─ SuggestionCards re-renders
```

Vite proxies `/api/*` → `http://127.0.0.1:8000` in development
(configured in `vite.config.ts`).

---

## Playback

- Click **Play** in `ProgressionDisplay` to hear the full progression root → selected node.
- Each chord sounds for one second using `Tone.PolySynth`.
- Browsers require a user gesture before audio can start — if nothing plays on
  the first click, click once anywhere on the page then try again.

---

## Notation

- Every suggestion card and progression badge renders a small treble staff via
  **VexFlow** (`ChordNotation.tsx`), displaying the chord as stacked whole notes.
- The staff is purely visual — it reflects the `notes[]` array from the suggestion.

---

## Technologies

| Layer | Technology |
|-------|------------|
| UI framework | React 18 |
| Language | TypeScript |
| Build tool | Vite |
| State management | Zustand |
| Audio | Tone.js |
| Music notation | VexFlow |
| Styling | CSS3 + CSS variables |
| Backend | FastAPI (Python) |
| AI suggestions | OpenAI GPT-4o-mini |
