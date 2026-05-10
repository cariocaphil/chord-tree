"""
OpenAISuggestionEngine  (stub – not active yet)
───────────────────────────────────────────────
Plug-in replacement for HardcodedSuggestionEngine that delegates to the
OpenAI Chat Completions API.

How to activate
───────────────
1. pip install openai
2. Set OPENAI_API_KEY in backend/.env
3. In engine/factory.py change:
       return HardcodedSuggestionEngine()
   to:
       return OpenAISuggestionEngine()

Prompt design notes
───────────────────
- We ask the model to return a JSON array so we can parse it reliably.
- The system prompt embeds music-theory context so the model understands
  the task without large few-shot examples.
- We pass the full progression, style, and mood so the model can consider
  the entire harmonic journey, not just the last chord.
- `response_format={"type": "json_object"}` (GPT-4o / GPT-3.5-turbo-1106+)
  guarantees valid JSON back, avoiding brittle regex parsing.
"""

from __future__ import annotations

import json
import logging
import os

from app.engine.base_engine import BaseSuggestionEngine
from app.engine.chord_data import CHORD_VOICINGS
from app.models.chord_models import ChordSuggestion, SuggestNextChordsRequest

logger = logging.getLogger(__name__)

# Fallback voicing when the model returns a chord we don't have in our library
_UNKNOWN_VOICING: list[str] = ["C4", "E4", "G4"]

_SYSTEM_PROMPT = """\
You are an expert music theory assistant specialising in chord progressions.
When asked for chord suggestions you respond ONLY with a valid JSON object
of the following shape (no markdown, no extra text):

{
  "suggestions": [
    {
      "chordName": "<chord symbol, e.g. Am7>",
      "label":     "<chord symbol>",
      "explanation": "<one concise sentence explaining why this chord fits>"
    }
  ]
}

Rules:
- Return exactly the number of suggestions requested.
- Use standard chord symbols (e.g. Cmaj7, Dm7, G7, Bm7b5).
- Explanations must be short (≤ 15 words) and musically informative.
- Consider the full progression history, the requested style, and the mood.
"""


class OpenAISuggestionEngine(BaseSuggestionEngine):
    """
    Suggestion engine powered by OpenAI Chat Completions.

    This class is intentionally left as a stub so it can be enabled without
    modifying any other file.  Install `openai` and set OPENAI_API_KEY to use.
    """

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self._model = model
        # Import lazily so the rest of the app works without `openai` installed.
        try:
            from openai import AsyncOpenAI  # type: ignore[import]
            self._client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "openai package is not installed. "
                "Run `pip install openai` and set OPENAI_API_KEY."
            ) from exc

    async def suggest(self, request: SuggestNextChordsRequest) -> list[ChordSuggestion]:
        user_message = (
            f"Chord progression so far: {', '.join(request.progression)}\n"
            f"Style: {request.style}\n"
            f"Mood: {request.mood}\n"
            f"Suggest {request.numberOfSuggestions} chords that could follow the last chord."
        )

        response = await self._client.chat.completions.create(
            model=self._model,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            temperature=0.7,
        )

        raw = response.choices[0].message.content or "{}"
        data = json.loads(raw)
        raw_suggestions: list[dict] = data.get("suggestions", [])

        return [
            ChordSuggestion(
                chordName=s["chordName"],
                notes=CHORD_VOICINGS.get(s["chordName"], _UNKNOWN_VOICING),
                label=s.get("label", s["chordName"]),
                explanation=s.get("explanation", ""),
            )
            for s in raw_suggestions
        ]
