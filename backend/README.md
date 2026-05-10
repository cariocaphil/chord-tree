# Chord Tree – Backend API

FastAPI backend that powers the chord-suggestion engine for the Chord Tree composition tool.

---

## Project layout

```
backend/
├── app/
│   ├── main.py                  # App factory, CORS, lifespan, /health
│   ├── engine/
│   │   ├── base_engine.py       # Abstract BaseSuggestionEngine interface
│   │   ├── hardcoded_engine.py  # Deterministic rule-based engine (active)
│   │   ├── openai_engine.py     # GPT-4o engine (stub, ready to enable)
│   │   ├── factory.py           # ← swap engines here, nowhere else
│   │   ├── chord_data.py        # Static voicing library (chord → notes)
│   │   └── progression_rules.py # Rule table (last chord → candidates)
│   ├── models/
│   │   └── chord_models.py      # Pydantic request / response models
│   └── routers/
│       └── suggestions.py       # POST /suggest-next-chords
└── requirements.txt
```

---

## Quick start

```bash
# 1. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the dev server (auto-reload on file changes)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

API docs are available at:
- Swagger UI → http://127.0.0.1:8000/docs
- ReDoc      → http://127.0.0.1:8000/redoc
- Health     → http://127.0.0.1:8000/health

---

## Endpoint

### `POST /suggest-next-chords`

**Request body**

| Field                | Type       | Required | Description                                 |
|----------------------|------------|----------|---------------------------------------------|
| `progression`        | `string[]` | ✅        | Ordered chord names root → current node     |
| `style`              | `string`   | ✅        | e.g. `"jazz"`, `"lo-fi"`, `"bossa nova"`    |
| `mood`               | `string`   | ✅        | e.g. `"melancholic"`, `"uplifting"`         |
| `numberOfSuggestions`| `number`   | ✅        | 1–8, how many suggestions to return         |

**Response body**

```json
{
  "suggestions": [
    {
      "chordName":   "Am7",
      "notes":       ["A3", "C4", "E4", "G4"],
      "label":       "Am7",
      "explanation": "vi m7 – smooth diatonic descent"
    }
  ]
}
```

**Example `curl`**

```bash
curl -s -X POST http://127.0.0.1:8000/suggest-next-chords \
  -H "Content-Type: application/json" \
  -d '{
    "progression": ["Cmaj7", "Am7"],
    "style": "jazz",
    "mood": "melancholic",
    "numberOfSuggestions": 4
  }' | python3 -m json.tool
```

---

## Switching to the OpenAI engine

1. Install the OpenAI SDK: `pip install openai`
2. Create `backend/.env` and add: `OPENAI_API_KEY=sk-...`
3. In `app/engine/factory.py`, change:

```python
# before
return HardcodedSuggestionEngine()

# after
from app.engine.openai_engine import OpenAISuggestionEngine
return OpenAISuggestionEngine(model="gpt-4o-mini")
```

No other file needs to change — the router, models, and frontend are all engine-agnostic.

---

## How the hardcoded engine works

```
Request
  └─ last chord ──→ PROGRESSION_RULES lookup (fallback if unknown)
                          │
                          ▼
                   FollowCandidate list
                          │
                    score each candidate
                    base_weight
                    + 0.30 × matching style tags
                    + 0.25 × matching mood tags
                          │
                    sort by score (desc)
                          │
                    filter out chords already in progression
                          │
                    take top-N
                          │
                    resolve notes from CHORD_VOICINGS
                          │
                          ▼
                   ChordSuggestion[]
```
