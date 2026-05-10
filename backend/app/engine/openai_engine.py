"""
OpenAISuggestionEngine
──────────────────────
Production suggestion engine that delegates to the OpenAI Chat Completions
API using *Structured Outputs* (json_schema / strict mode) so the response
is guaranteed to conform to the expected shape before it even reaches our
validation layer.

Setup
─────
1. pip install openai          (or: uncomment the line in requirements.txt)
2. Add OPENAI_API_KEY=sk-...   to backend/.env
3. engine/factory.py already imports and returns this class.

Architecture
────────────
  Request
    └─ _build_user_message()   – assembles the human-turn prompt
    └─ OpenAI structured call  – json_schema enforces the response shape
    └─ _validate_suggestion()  – rejects bad chord names / malformed notes
    └─ _resolve_notes()        – fills octave-aware voicing from the library
                                  (falls back to the model's own notes if the
                                   chord isn't in CHORD_VOICINGS)

Validation rules
────────────────
- chordName  must match CHORD_NAME_RE  (root + optional quality/extension)
- notes      must be non-empty and every element must match NOTE_RE (SPN)
"""

from __future__ import annotations

import json
import logging
import os
import re
from typing import Any

from app.engine.base_engine import BaseSuggestionEngine
from app.engine.chord_data import CHORD_VOICINGS
from app.models.chord_models import ChordSuggestion, SuggestNextChordsRequest

logger = logging.getLogger(__name__)


# ── Validation patterns ───────────────────────────────────────────────────────

# Chord symbol: root note (A-G, with optional b/#) followed by any combination
# of letters, digits, '#', and 'b' that make up common chord quality tokens
# (maj7, m7b5, dim7, aug, sus4, add9, ø, °, etc.).
CHORD_NAME_RE = re.compile(
    r"^[A-G][b#]?"
    r"(maj|min|m|dim|aug|sus|add|ø|°)?"
    r"[0-9b#]*"
    r"(maj|min|m|dim|aug|sus|add|b|#|[0-9])*$"
)

# Scientific Pitch Notation: note name + optional accidental + one or two digit
# octave number, e.g. C4, F#4, Bb3, D#5, C#10.
NOTE_RE = re.compile(r"^[A-G][b#]?\d{1,2}$")


# ── JSON schema sent to OpenAI (Structured Outputs / strict mode) ─────────────

_RESPONSE_SCHEMA: dict[str, Any] = {
    "type": "json_schema",
    "json_schema": {
        "name": "chord_suggestions",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "suggestions": {
                    "type": "array",
                    "description": "Ordered list of possible next chords.",
                    "items": {
                        "type": "object",
                        "properties": {
                            "chordName": {
                                "type": "string",
                                "description": "Standard chord symbol, e.g. Am7, Bm7b5.",
                            },
                            "notes": {
                                "type": "array",
                                "description": (
                                    "Piano note names with octave numbers in "
                                    "Scientific Pitch Notation, e.g. ['A3','C4','E4','G4']."
                                ),
                                "items": {"type": "string"},
                            },
                            "label": {
                                "type": "string",
                                "description": "Short display label (usually the chord symbol).",
                            },
                            "explanation": {
                                "type": "string",
                                "description": (
                                    "One sentence explaining why this chord fits "
                                    "the progression, style, and mood."
                                ),
                            },
                        },
                        "required": ["chordName", "notes", "label", "explanation"],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["suggestions"],
            "additionalProperties": False,
        },
    },
}


# ── System prompt (as specified) ──────────────────────────────────────────────

_SYSTEM_PROMPT = (
    "You are a harmonic composition assistant. "
    "You suggest exactly one next chord at a time, not full progressions. "
    "Given the current chord progression, style, mood, and key context, "
    "return several possible next chords. "
    "Each suggestion must include: chordName, notes as piano note names with "
    "octaves (Scientific Pitch Notation, e.g. A3, C#4, Bb4), a short label, "
    "and a one-sentence explanation. "
    "Favor musically meaningful choices: functional harmony, modal interchange, "
    "secondary dominants, chromatic mediants, deceptive resolutions, or smooth "
    "voice-leading. "
    "Make the suggestions diverse — avoid returning variations of the same chord. "
    "Return only valid JSON."
)


# ── Engine ────────────────────────────────────────────────────────────────────

class OpenAISuggestionEngine(BaseSuggestionEngine):
    """
    Suggestion engine powered by OpenAI Chat Completions with Structured Outputs.

    The engine:
    1. Sends a richly-contextualised prompt to the model.
    2. Enforces the response schema via json_schema / strict mode.
    3. Validates every returned suggestion (chord name pattern, SPN notes).
    4. Resolves voicings from the local library when available, falling back
       to the model-supplied notes for chords not in CHORD_VOICINGS.
    """

    def __init__(self, model: str = "gpt-4o-mini") -> None:
        self._model = model
        try:
            from openai import AsyncOpenAI  # type: ignore[import]
            self._client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        except ImportError as exc:  # pragma: no cover
            raise RuntimeError(
                "openai package is not installed. "
                "Run `pip install openai` and set OPENAI_API_KEY."
            ) from exc

    # ── Public interface ──────────────────────────────────────────────────────

    async def suggest(self, request: SuggestNextChordsRequest) -> list[ChordSuggestion]:
        """Call the OpenAI API and return validated ChordSuggestion objects."""
        user_message = self._build_user_message(request)

        logger.debug(
            "OpenAIEngine → model=%s progression=%s style='%s' mood='%s' key='%s' n=%d",
            self._model,
            request.progression,
            request.style,
            request.mood,
            request.currentKey or "unspecified",
            request.numberOfSuggestions,
        )

        response = await self._client.chat.completions.create(
            model=self._model,
            response_format=_RESPONSE_SCHEMA,
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user",   "content": user_message},
            ],
            temperature=0.8,
        )

        raw_json: str = response.choices[0].message.content or '{"suggestions":[]}'

        # The schema guarantees valid JSON + correct shape; we still validate
        # musical content (chord names and note formats) ourselves.
        data: dict[str, Any] = json.loads(raw_json)
        raw_suggestions: list[dict[str, Any]] = data.get("suggestions", [])

        suggestions: list[ChordSuggestion] = []
        for idx, raw in enumerate(raw_suggestions):
            try:
                suggestion = self._parse_and_validate(raw)
                suggestions.append(suggestion)
            except ValueError as exc:
                logger.warning(
                    "OpenAIEngine: dropping suggestion[%d] – validation failed: %s | raw=%s",
                    idx, exc, raw,
                )

        logger.info(
            "OpenAIEngine: returned %d/%d valid suggestions.",
            len(suggestions),
            len(raw_suggestions),
        )
        return suggestions

    # ── Private helpers ───────────────────────────────────────────────────────

    @staticmethod
    def _build_user_message(request: SuggestNextChordsRequest) -> str:
        """Compose the human-turn message from the request fields."""
        key_line = (
            f"Current key: {request.currentKey}\n"
            if request.currentKey
            else "Current key: unknown\n"
        )
        return (
            f"Chord progression so far: {', '.join(request.progression)}\n"
            f"Style: {request.style}\n"
            f"Mood: {request.mood}\n"
            + key_line +
            f"Number of suggestions needed: {request.numberOfSuggestions}\n"
            "Return the next possible chords (one chord each, not full progressions)."
        )

    @staticmethod
    def _validate_chord_name(chord_name: str) -> None:
        """Raise ValueError if *chord_name* does not look like a valid chord symbol."""
        if not chord_name or not isinstance(chord_name, str):
            raise ValueError("chordName is missing or not a string.")
        if not CHORD_NAME_RE.match(chord_name.strip()):
            raise ValueError(
                f"chordName '{chord_name}' does not match a recognised chord symbol pattern."
            )

    @staticmethod
    def _validate_notes(notes: Any) -> list[str]:
        """
        Validate *notes* is a non-empty list of SPN strings.
        Returns the cleaned list or raises ValueError.
        """
        if not isinstance(notes, list) or len(notes) == 0:
            raise ValueError("notes must be a non-empty list.")
        invalid = [n for n in notes if not isinstance(n, str) or not NOTE_RE.match(n.strip())]
        if invalid:
            raise ValueError(
                f"notes contains invalid SPN entries: {invalid}. "
                "Expected format: note name + optional accidental + octave, e.g. 'F#4'."
            )
        return [n.strip() for n in notes]

    @classmethod
    def _parse_and_validate(cls, raw: dict[str, Any]) -> ChordSuggestion:
        """
        Validate a raw suggestion dict and return a ChordSuggestion.
        Raises ValueError for any validation failure so the caller can skip
        the offending entry and log a warning.
        """
        chord_name: str = (raw.get("chordName") or "").strip()
        cls._validate_chord_name(chord_name)

        # Resolve notes: prefer our curated library voicing, fall back to the
        # model-supplied notes (after validation), ensuring we always have audio.
        if chord_name in CHORD_VOICINGS:
            notes = CHORD_VOICINGS[chord_name]
        else:
            notes = cls._validate_notes(raw.get("notes"))

        label: str       = (raw.get("label") or chord_name).strip()
        explanation: str = (raw.get("explanation") or "").strip()

        return ChordSuggestion(
            chordName=chord_name,
            notes=notes,
            label=label,
            explanation=explanation,
        )
