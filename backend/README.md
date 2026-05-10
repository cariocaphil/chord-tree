# Chord Tree – Backend API

FastAPI backend that powers the AI chord-suggestion engine for the Chord Tree
composition tool. The active engine delegates to **OpenAI GPT-4o-mini** using
Structured Outputs to guarantee a schema-conformant response on every call.

---

## Project layout

```
backend/
├── app/
│   ├── main.py                  # App factory, CORS, lifespan hooks, /health
│   ├── engine/
│   │   ├── base_engine.py       # Abstract BaseSuggestionEngine interface
│   │   ├── openai_engine.py     # ★ Active — GPT-4o Structured Outputs engine
│   │   ├── hardcoded_engine.py  # Fallback — deterministic rule-based engine
│   │   ├── factory.py           # ← swap engines here, nowhere else
│   │   ├── chord_data.py        # Static voicing library (chord symbol → notes)
│   │   └── progression_rules.py # Rule table used by the hardcoded engine
│   ├── models/
│   │   └── chord_models.py      # Pydantic request / response models
│   └── routers/
│       └── suggestions.py       # POST /suggest-next-chords
├── requirements.txt
└── .env                         # OPENAI_API_KEY goes here (git-ignored)
```

---

## Quick start

```bash
# 1. Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 2. Install dependencies (includes openai>=1.23.0)
pip install -r requirements.txt

# 3. Add your OpenAI key
echo "OPENAI_API_KEY=sk-..." > .env

# 4. Run the dev server (auto-reload on file changes)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Verify the server is up:
```bash
curl http://127.0.0.1:8000/health
# {"status": "ok"}
```

Interactive API docs:
- Swagger UI → http://127.0.0.1:8000/docs
- ReDoc      → http://127.0.0.1:8000/redoc

---

## Endpoint

### `POST /suggest-next-chords`

**Request body**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `progression` | `string[]` | ✅ | Ordered chord names root → current node |
| `style` | `string` | ✅ | e.g. `"jazz"`, `"lo-fi"`, `"bossa nova"` |
| `mood` | `string` | ✅ | e.g. `"melancholic"`, `"uplifting"`, `"tense"` |
| `numberOfSuggestions` | `integer` | ✅ | 1–8 — how many suggestions to return |
| `currentKey` | `string` | ❌ | Tonal centre, e.g. `"C major"`, `"A minor"` |

**Response body**

```json
{
  "suggestions": [
    {
      "chordName":   "Dm7",
      "notes":       ["D4", "F4", "A4", "C5"],
      "label":       "Dm7",
      "explanation": "ii m7 sets up a ii–V–I cadence back to Cmaj7."
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
    "numberOfSuggestions": 4,
    "currentKey": "C major"
  }' | python3 -m json.tool
```

---

## How the OpenAI engine works

```
POST /suggest-next-chords
  └─ SuggestNextChordsRequest (Pydantic validated)
       └─ OpenAISuggestionEngine.suggest()
            └─ _build_user_message()
            │     ├─ progression (full path, root → current)
            │     ├─ style
            │     ├─ mood
            │     ├─ currentKey  ("unknown" if not provided)
            │     └─ numberOfSuggestions
            └─ OpenAI Chat Completions (AsyncOpenAI)
            │     ├─ model: gpt-4o-mini
            │     ├─ response_format: json_schema (strict=True)
            │     ├─ system prompt: harmonic composition assistant
            │     └─ temperature: 0.8
            └─ json.loads(raw_json)
            └─ for each suggestion → _parse_and_validate()
            │     ├─ _validate_chord_name()  — CHORD_NAME_RE
            │     └─ _validate_notes()       — NOTE_RE (SPN)
            └─ _resolve_notes()
            │     ├─ use CHORD_VOICINGS if chord is known
            │     └─ else use model-supplied notes (already validated)
            └─ ChordSuggestion[]  →  SuggestNextChordsResponse
```

### Structured Outputs schema

The engine sends a `json_schema` response format with `strict: true`. OpenAI
enforces this shape server-side before returning:

```json
{
  "suggestions": [
    {
      "chordName":   "string",
      "notes":       ["string"],
      "label":       "string",
      "explanation": "string"
    }
  ]
}
```

### Validation layer

After the API call a second validation pass runs on every suggestion:

| Check | Rule | On failure |
|-------|------|------------|
| `chordName` format | Must match `^[A-G][b#]?(quality)?(extensions)*$` | Suggestion dropped, warning logged |
| `notes` presence | Must be a non-empty list | Suggestion dropped, warning logged |
| `notes` format | Every entry must be valid SPN (`[A-G][b#]?\d{1,2}`) | Suggestion dropped, warning logged |

Dropped suggestions are logged at `WARNING` level. Valid suggestions in the
same response are still returned to the client.

### Note resolution priority

1. **`CHORD_VOICINGS` library** — hand-curated, consistent mid-range voicings
2. **Model-supplied notes** — used for chords not in the library, after SPN
   validation passes

---

## Switching to the hardcoded fallback engine

If you need to run without an OpenAI API key, edit `app/engine/factory.py`:

```python
# Change this line:
return OpenAISuggestionEngine(model="gpt-4o-mini")

# To this:
return HardcodedSuggestionEngine()
```

Also uncomment the import at the top of `factory.py`. No other file changes
are required — the router, models, and frontend are all engine-agnostic.

### How the hardcoded engine works

```
last chord ─→ PROGRESSION_RULES lookup (falls back to "_fallback" entry)
                    │
             FollowCandidate list
                    │
              score = base_weight
                      + 0.30 × matching style tags
                      + 0.25 × matching mood tags
                    │
              sort by score desc, stable
                    │
              filter out chords already in progression
                    │
              take top-N → resolve notes from CHORD_VOICINGS
                    │
                    ▼
             ChordSuggestion[]
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | Yes (OpenAI engine) | Your OpenAI secret key (`sk-...`) |

Create `backend/.env`:

```
OPENAI_API_KEY=sk-your-key-here
```

---

## Diagnostics

**Check the server is running:**
```bash
curl http://localhost:8000/health
```

**Watch live logs (shows every OpenAI call and any validation warnings):**
```bash
uvicorn app.main:app --reload --port 8000 --log-level debug
```

**Confirm the API key is loaded:**
```bash
python3 -c "
import os; from dotenv import load_dotenv; load_dotenv()
k = os.getenv('OPENAI_API_KEY', '')
print('Key loaded:', bool(k), '|', k[:10] + '...' if k else 'MISSING')
"
```

**Common errors:**

| Error | Cause | Fix |
|-------|-------|-----|
| `connection refused` on `/health` | Server not running | Run `uvicorn app.main:app --reload` |
| `AuthenticationError` | Missing or invalid API key | Check `backend/.env` |
| `ImportError: openai` | Package not installed | `pip install -r requirements.txt` |
| `suggestions: []` | All suggestions failed validation | Check `[WARNING]` lines in server log |
