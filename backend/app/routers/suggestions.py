"""
Router: /suggest-next-chords
─────────────────────────────
Defines the single POST endpoint consumed by the Chord Tree frontend.
The router is intentionally thin: it validates input via Pydantic, delegates
all domain logic to the injected engine, and serialises the result.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.engine.base_engine import BaseSuggestionEngine
from app.engine.factory import get_engine
from app.models.chord_models import SuggestNextChordsRequest, SuggestNextChordsResponse

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/suggest-next-chords", tags=["suggestions"])


@router.post(
    "",
    response_model=SuggestNextChordsResponse,
    summary="Suggest next chords for a progression",
    response_description="An ordered list of chord suggestions with voicings and explanations.",
)
async def suggest_next_chords(
    body: SuggestNextChordsRequest,
    engine: BaseSuggestionEngine = Depends(get_engine),
) -> SuggestNextChordsResponse:
    """
    Given a chord progression, style, and mood, return up to
    `numberOfSuggestions` chord suggestions.

    Each suggestion contains:
    - **chordName** – chord symbol (e.g. `"Am7"`)
    - **notes**     – MIDI note names for playback / notation (e.g. `["A3","C4","E4","G4"]`)
    - **label**     – short display label (matches chordName)
    - **explanation** – one-sentence music-theory reason for the suggestion
    """
    logger.info(
        "POST /suggest-next-chords | progression=%s style='%s' mood='%s' n=%d",
        body.progression,
        body.style,
        body.mood,
        body.numberOfSuggestions,
    )

    try:
        suggestions = await engine.suggest(body)
    except Exception as exc:
        logger.exception("Engine error: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate chord suggestions. Please try again.",
        ) from exc

    return SuggestNextChordsResponse(suggestions=suggestions)
