"""
Engine factory – the single place where you choose which suggestion engine
the app uses at runtime.

The active engine is OpenAISuggestionEngine.  To fall back to the
deterministic rule-based engine (no API key required), swap the return
statement to HardcodedSuggestionEngine().

Setup
─────
1. pip install openai            (or uncomment the line in requirements.txt)
2. Add OPENAI_API_KEY=sk-...    to backend/.env
"""

from app.engine.base_engine import BaseSuggestionEngine
from app.engine.openai_engine import OpenAISuggestionEngine

# Retained for easy fallback – swap the return statement below to use it.
# from app.engine.hardcoded_engine import HardcodedSuggestionEngine


def get_engine() -> BaseSuggestionEngine:
    """
    Return the active suggestion engine.

    Called once per request (FastAPI dependency injection).
    """
    return OpenAISuggestionEngine(model="gpt-4o-mini")

    # ── Deterministic fallback (no API key required) ───────────────────────────
    # return HardcodedSuggestionEngine()
