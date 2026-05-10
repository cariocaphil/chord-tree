"""
Engine factory – the single place where you choose which suggestion engine
the app uses at runtime.

Switching to OpenAI
───────────────────
1. Install the openai package:      pip install openai
2. Add your key to backend/.env:    OPENAI_API_KEY=sk-...
3. Change the return statement below:

       # before
       return HardcodedSuggestionEngine()

       # after
       return OpenAISuggestionEngine()

No other file needs to change.
"""

from app.engine.base_engine import BaseSuggestionEngine
from app.engine.hardcoded_engine import HardcodedSuggestionEngine

# from app.engine.openai_engine import OpenAISuggestionEngine  # ← uncomment to switch


def get_engine() -> BaseSuggestionEngine:
    """
    Return the active suggestion engine.

    Called once per request (FastAPI dependency injection).
    """
    return HardcodedSuggestionEngine()

    # ── OpenAI variant ────────────────────────────────────────────────────────
    # return OpenAISuggestionEngine(model="gpt-4o-mini")
