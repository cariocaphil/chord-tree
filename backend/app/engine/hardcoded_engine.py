"""
HardcodedSuggestionEngine
─────────────────────────
Deterministic suggestion engine that derives chord recommendations from a
static rule table (progression_rules.py) and a chord-voicing library
(chord_data.py).

Algorithm
─────────
1. Look up the last chord in PROGRESSION_RULES.
   Fall back to the "_fallback" entry if no specific rule exists.
2. Score each FollowCandidate:
     score = base_weight
             + STYLE_BONUS  for every matching style tag
             + MOOD_BONUS   for every matching mood tag
3. Sort candidates by score (descending), break ties by original list order.
4. Discard candidates whose chord symbol is already in the progression
   (avoid immediate repetition).
5. Pick the top-N candidates, resolve their voicings from CHORD_VOICINGS,
   and return them as ChordSuggestion objects.
"""

from __future__ import annotations

import logging

from app.engine.base_engine import BaseSuggestionEngine
from app.engine.chord_data import CHORD_VOICINGS
from app.engine.progression_rules import PROGRESSION_RULES, FollowCandidate
from app.models.chord_models import ChordSuggestion, SuggestNextChordsRequest

logger = logging.getLogger(__name__)

# ── Scoring constants ─────────────────────────────────────────────────────────
_STYLE_BONUS: float = 0.3   # added per matching style tag
_MOOD_BONUS:  float = 0.25  # added per matching mood tag

# ── Fallback voicing used when a chord isn't in CHORD_VOICINGS ───────────────
_UNKNOWN_VOICING: list[str] = ["C4", "E4", "G4"]


class HardcodedSuggestionEngine(BaseSuggestionEngine):
    """
    Pure-Python, zero-I/O suggestion engine.

    Swap this out for OpenAISuggestionEngine (or any other BaseSuggestionEngine
    subclass) in engine/factory.py without touching the router or models.
    """

    async def suggest(self, request: SuggestNextChordsRequest) -> list[ChordSuggestion]:
        last_chord = request.progression[-1]
        style      = request.style.lower().strip()
        mood       = request.mood.lower().strip()
        n          = request.numberOfSuggestions

        candidates = self._get_candidates(last_chord)
        scored     = self._score_candidates(candidates, style, mood)
        filtered   = self._filter_progression(scored, request.progression)
        top_n      = filtered[: n]

        suggestions = [self._build_suggestion(c) for c in top_n]

        logger.debug(
            "HardcodedEngine: last=%s style=%s mood=%s → %d suggestions",
            last_chord, style, mood, len(suggestions),
        )
        return suggestions

    # ── Private helpers ───────────────────────────────────────────────────────

    def _get_candidates(self, last_chord: str) -> list[FollowCandidate]:
        """Return the candidate list for *last_chord*, falling back to _fallback."""
        if last_chord in PROGRESSION_RULES:
            return list(PROGRESSION_RULES[last_chord])
        logger.debug("No rule for '%s', using _fallback.", last_chord)
        return list(PROGRESSION_RULES["_fallback"])

    def _score_candidates(
        self,
        candidates: list[FollowCandidate],
        style: str,
        mood: str,
    ) -> list[FollowCandidate]:
        """
        Return candidates sorted by computed score (highest first).
        Preserves original order for equal scores (stable sort).
        """

        def score(c: FollowCandidate) -> float:
            s = c.base_weight
            s += sum(_STYLE_BONUS for tag in c.styles if tag.lower() in style)
            s += sum(_MOOD_BONUS  for tag in c.moods  if tag.lower() in mood)
            return s

        return sorted(candidates, key=score, reverse=True)

    def _filter_progression(
        self,
        candidates: list[FollowCandidate],
        progression: list[str],
    ) -> list[FollowCandidate]:
        """
        Remove candidates whose chord symbol already appears in the progression
        so the engine avoids suggesting an immediate repeat.
        If filtering would leave fewer candidates than exist, we keep them all
        (better a repeat than an empty list).
        """
        seen = set(progression)
        filtered = [c for c in candidates if c.chord not in seen]
        return filtered if filtered else candidates

    def _build_suggestion(self, candidate: FollowCandidate) -> ChordSuggestion:
        """Resolve a FollowCandidate into a full ChordSuggestion with notes."""
        notes = CHORD_VOICINGS.get(candidate.chord, _UNKNOWN_VOICING)
        return ChordSuggestion(
            chordName=candidate.chord,
            notes=notes,
            label=candidate.chord,
            explanation=candidate.explanation,
        )
