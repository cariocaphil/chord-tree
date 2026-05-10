"""
Abstract base class for suggestion engines.

Any concrete engine (hardcoded rules, OpenAI, local LLM, …) must implement
this interface so that the router never needs to know which engine is active.
"""

from abc import ABC, abstractmethod

from app.models.chord_models import ChordSuggestion, SuggestNextChordsRequest


class BaseSuggestionEngine(ABC):
    """Contract every suggestion engine must fulfill."""

    @abstractmethod
    async def suggest(self, request: SuggestNextChordsRequest) -> list[ChordSuggestion]:
        """
        Given a chord progression request, return an ordered list of
        ChordSuggestion objects.  The list length should equal (or be at most)
        request.numberOfSuggestions.
        """
        ...
