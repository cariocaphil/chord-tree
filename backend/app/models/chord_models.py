"""
Pydantic models that are shared across the app.
These are the single source of truth for request/response shapes
and must stay in sync with src/types.ts on the frontend.
"""

from pydantic import BaseModel, Field


# ──────────────────────────────────────────────────────────────────────────────
# Request
# ──────────────────────────────────────────────────────────────────────────────

class SuggestNextChordsRequest(BaseModel):
    """
    Payload sent by the client when asking for chord suggestions.

    Attributes:
        progression:         Ordered list of chord names already in the
                             progression, root → current selection.
                             e.g. ["Cmaj7", "Am7", "Dm7"]
        style:               Free-form style string.
                             e.g. "jazz", "bossa nova", "lo-fi"
        mood:                Free-form mood string.
                             e.g. "melancholic", "uplifting", "tense"
        numberOfSuggestions: How many chord suggestions to return (1-8).
    """

    progression: list[str] = Field(
        ...,
        min_length=1,
        description="Ordered chord names from root to current node.",
        examples=[["Cmaj7", "Am7", "Dm7"]],
    )
    style: str = Field(
        ...,
        min_length=1,
        description="Musical style context.",
        examples=["jazz"],
    )
    mood: str = Field(
        ...,
        min_length=1,
        description="Emotional mood context.",
        examples=["melancholic"],
    )
    numberOfSuggestions: int = Field(
        default=4,
        ge=1,
        le=8,
        description="Number of chord suggestions to return.",
    )


# ──────────────────────────────────────────────────────────────────────────────
# Response
# ──────────────────────────────────────────────────────────────────────────────

class ChordSuggestion(BaseModel):
    """
    A single chord suggestion – mirrors the frontend ChordSuggestion type.

    Attributes:
        chordName:   Chord symbol.          e.g. "Am7"
        notes:       MIDI note names.       e.g. ["A3", "C4", "E4", "G4"]
        label:       Short display label.   e.g. "Am7"
        explanation: Human-readable reason for this suggestion.
    """

    chordName: str
    notes: list[str]
    label: str
    explanation: str


class SuggestNextChordsResponse(BaseModel):
    """Wrapper returned by POST /suggest-next-chords."""

    suggestions: list[ChordSuggestion]
