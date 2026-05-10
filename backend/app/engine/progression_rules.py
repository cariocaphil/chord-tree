"""
Deterministic chord-progression rules.

Each entry in PROGRESSION_RULES maps a last-chord symbol to a list of
FollowCandidate objects.  The engine picks the top-N candidates after
filtering/reordering them by style and mood weights.

Design contract
---------------
- This module is intentionally self-contained (no I/O, no side effects).
- The public surface used by the engine is just PROGRESSION_RULES and
  FollowCandidate; nothing else needs to be imported.
- When the OpenAI engine is plugged in, this module stays in place and is
  simply never called.
"""

from __future__ import annotations

from dataclasses import dataclass, field


# ──────────────────────────────────────────────────────────────────────────────
# Data types
# ──────────────────────────────────────────────────────────────────────────────

@dataclass(frozen=True)
class FollowCandidate:
    """A chord that may follow a given predecessor chord.

    Attributes:
        chord:        Chord symbol that follows.
        explanation:  Human-readable reason (shown in the UI card).
        styles:       Style tags that increase this candidate's rank.
        moods:        Mood tags that increase this candidate's rank.
        base_weight:  Baseline priority before style/mood weighting (higher = preferred).
    """

    chord: str
    explanation: str
    styles: list[str] = field(default_factory=list)
    moods: list[str] = field(default_factory=list)
    base_weight: float = 1.0


# ──────────────────────────────────────────────────────────────────────────────
# Rule table
# ──────────────────────────────────────────────────────────────────────────────

# Maps every known last-chord → ordered list of candidates.
# Candidates are declared most-to-least musically common so that the default
# (no-style, no-mood) order already sounds reasonable.

PROGRESSION_RULES: dict[str, list[FollowCandidate]] = {

    # ── Cmaj7 ─────────────────────────────────────────────────────────────────
    "Cmaj7": [
        FollowCandidate("Am7",   "vi m7 – smooth diatonic descent",            styles=["jazz","pop","lo-fi"],         moods=["melancholic","chill","romantic"],   base_weight=1.4),
        FollowCandidate("Dm7",   "ii m7 – sets up a ii–V–I",                   styles=["jazz","bossa nova"],          moods=["uplifting","hopeful"],              base_weight=1.3),
        FollowCandidate("G7",    "V7 – dominant tension before resolution",     styles=["jazz","classical","swing"],  moods=["tense","dramatic"],                base_weight=1.2),
        FollowCandidate("Fmaj7", "IV maj7 – warm plagal motion",               styles=["pop","lo-fi","r&b"],          moods=["chill","dreamy","romantic"],        base_weight=1.1),
        FollowCandidate("Em7",   "iii m7 – subtle colour change",              styles=["jazz","neo-soul"],            moods=["introspective","melancholic"],      base_weight=1.0),
        FollowCandidate("Bm7b5", "viiø7 – jazz leading-tone approach",        styles=["jazz","bebop"],               moods=["tense","mysterious"],              base_weight=0.9),
        FollowCandidate("Cmaj9", "I maj9 – richer colour on the tonic",        styles=["jazz","neo-soul","lo-fi"],   moods=["dreamy","chill"],                  base_weight=0.8),
    ],

    # ── Am7 ───────────────────────────────────────────────────────────────────
    "Am7": [
        FollowCandidate("Dm7",   "iv m7 – deepens the minor feel",             styles=["jazz","bossa nova","soul"],   moods=["melancholic","sad","introspective"], base_weight=1.4),
        FollowCandidate("G7",    "VII7 – back to dominant, creates momentum",  styles=["jazz","r&b","funk"],         moods=["uplifting","energetic"],           base_weight=1.3),
        FollowCandidate("Fmaj7", "VI maj7 – relative major relief",            styles=["pop","lo-fi"],               moods=["hopeful","dreamy"],                base_weight=1.2),
        FollowCandidate("Em7",   "v m7 – minor subdominant colour",            styles=["jazz","neo-soul"],           moods=["melancholic","mysterious"],        base_weight=1.1),
        FollowCandidate("Cmaj7", "III maj7 – return to relative major",        styles=["jazz","pop"],                moods=["uplifting","romantic"],            base_weight=1.0),
        FollowCandidate("Bm7b5", "iiø7 – Dorian / jazz minor approach",       styles=["jazz","bebop"],              moods=["tense","dark"],                    base_weight=0.9),
        FollowCandidate("Am9",   "i m9 – richer voicing on the tonic",        styles=["jazz","neo-soul","lo-fi"],   moods=["dreamy","introspective"],          base_weight=0.8),
    ],

    # ── Dm7 ───────────────────────────────────────────────────────────────────
    "Dm7": [
        FollowCandidate("G7",    "V7 – classic ii–V resolution",               styles=["jazz","bebop","swing"],      moods=["tense","dramatic","hopeful"],      base_weight=1.5),
        FollowCandidate("Cmaj7", "I maj7 – completes ii–V–I",                  styles=["jazz","bossa nova"],         moods=["resolved","uplifting"],            base_weight=1.4),
        FollowCandidate("Am7",   "v m7 – deceptive, stays in minor world",     styles=["jazz","neo-soul"],           moods=["melancholic","introspective"],     base_weight=1.1),
        FollowCandidate("Fmaj7", "III maj7 – relative major warmth",           styles=["pop","lo-fi"],              moods=["dreamy","romantic"],               base_weight=1.0),
        FollowCandidate("Em7",   "ii m7 of IV – chromatic side-slip",          styles=["jazz","bebop"],             moods=["tense","mysterious"],              base_weight=0.9),
        FollowCandidate("Dm9",   "ii m9 – richer ii chord",                    styles=["jazz","neo-soul"],          moods=["dreamy","chill"],                  base_weight=0.8),
    ],

    # ── G7 ────────────────────────────────────────────────────────────────────
    "G7": [
        FollowCandidate("Cmaj7", "I maj7 – resolves V7→I",                     styles=["jazz","classical","pop"],   moods=["resolved","uplifting","hopeful"],  base_weight=1.6),
        FollowCandidate("Cm7",   "i m7 – deceptive minor resolution",          styles=["jazz","blues"],             moods=["melancholic","dramatic"],          base_weight=1.2),
        FollowCandidate("Am7",   "ii m7 – deceptive cadence, fresh motion",    styles=["jazz","pop"],               moods=["surprised","hopeful"],             base_weight=1.1),
        FollowCandidate("Dm7",   "v m7 – back-cycle",                          styles=["jazz","bebop"],             moods=["tense","energetic"],               base_weight=1.0),
        FollowCandidate("Fmaj7", "bVII maj7 – modal interchange",              styles=["pop","r&b","lo-fi"],        moods=["dreamy","mysterious"],             base_weight=0.9),
        FollowCandidate("Bdim7", "viidim7 – chromatic passing chord",          styles=["jazz","classical"],         moods=["tense","dramatic"],                base_weight=0.8),
    ],

    # ── Fmaj7 ─────────────────────────────────────────────────────────────────
    "Fmaj7": [
        FollowCandidate("Em7",   "vii m7 – stepwise descent",                  styles=["jazz","neo-soul"],          moods=["melancholic","introspective"],     base_weight=1.3),
        FollowCandidate("Dm7",   "vi m7 – diatonic descending line",           styles=["jazz","pop","lo-fi"],       moods=["melancholic","chill"],             base_weight=1.2),
        FollowCandidate("Cmaj7", "V maj7 – resolution to tonic",               styles=["pop","lo-fi"],              moods=["resolved","uplifting"],            base_weight=1.1),
        FollowCandidate("G7",    "II7 – secondary dominant to Cmaj7",          styles=["jazz","bossa nova"],        moods=["hopeful","uplifting"],             base_weight=1.0),
        FollowCandidate("Am7",   "iii m7 – gentle colour",                     styles=["pop","r&b"],                moods=["romantic","dreamy"],               base_weight=0.9),
        FollowCandidate("Fmaj9", "I maj9 – extended tonic colour",             styles=["jazz","lo-fi","neo-soul"],  moods=["dreamy","chill"],                  base_weight=0.8),
    ],

    # ── Em7 ───────────────────────────────────────────────────────────────────
    "Em7": [
        FollowCandidate("A7",    "V7/ii – secondary dominant pull",            styles=["jazz","bebop"],             moods=["tense","energetic"],               base_weight=1.3),
        FollowCandidate("Am7",   "iv m7 – minor subdominant",                  styles=["jazz","soul"],              moods=["melancholic","sad"],               base_weight=1.2),
        FollowCandidate("Dm7",   "vii m7 – descending thirds",                 styles=["jazz","neo-soul","lo-fi"],  moods=["introspective","melancholic"],     base_weight=1.1),
        FollowCandidate("Cmaj7", "vi maj7 – step to tonic",                    styles=["pop","lo-fi"],              moods=["resolved","chill"],                base_weight=1.0),
        FollowCandidate("Fmaj7", "bII maj7 – Neapolitan-style tension",        styles=["jazz","classical"],         moods=["mysterious","dramatic"],           base_weight=0.9),
    ],

    # ── Gmaj7 ─────────────────────────────────────────────────────────────────
    "Gmaj7": [
        FollowCandidate("Em7",   "vi m7 – diatonic descent",                   styles=["jazz","pop"],               moods=["melancholic","chill"],             base_weight=1.4),
        FollowCandidate("Am7",   "ii m7 – preps ii–V",                         styles=["jazz","bossa nova"],        moods=["hopeful","uplifting"],             base_weight=1.3),
        FollowCandidate("D7",    "V7 – dominant push",                         styles=["jazz","classical","swing"], moods=["tense","dramatic"],                base_weight=1.2),
        FollowCandidate("Cmaj7", "IV maj7 – plagal warmth",                    styles=["pop","lo-fi","r&b"],        moods=["chill","romantic"],                base_weight=1.1),
        FollowCandidate("Bm7",   "iii m7 – subtle colour",                     styles=["jazz","neo-soul"],          moods=["introspective","melancholic"],     base_weight=1.0),
    ],

    # ── Bm7b5 ─────────────────────────────────────────────────────────────────
    "Bm7b5": [
        FollowCandidate("E7",    "V7 of Am – natural resolution",              styles=["jazz","classical","bebop"],  moods=["tense","dramatic"],               base_weight=1.5),
        FollowCandidate("Am7",   "i m7 – resolution (jazz minor ii–V–i)",      styles=["jazz","bebop"],             moods=["resolved","melancholic"],          base_weight=1.4),
        FollowCandidate("G7",    "VI7 – back to dominant seventh",             styles=["jazz"],                     moods=["energetic","tense"],               base_weight=1.0),
    ],

    # ── Bdim7 ─────────────────────────────────────────────────────────────────
    "Bdim7": [
        FollowCandidate("Cmaj7", "I maj7 – passing dim resolves up",           styles=["jazz","classical"],         moods=["resolved","dramatic"],             base_weight=1.4),
        FollowCandidate("Am7",   "vi m7 – deceptive move",                     styles=["jazz"],                     moods=["melancholic","mysterious"],        base_weight=1.1),
        FollowCandidate("G7",    "V7 – dominant via symmetrical dim",          styles=["jazz","bebop"],             moods=["tense","energetic"],               base_weight=1.0),
    ],

    # ── Amaj7 ─────────────────────────────────────────────────────────────────
    "Amaj7": [
        FollowCandidate("F#m7" if "F#m7" in {} else "Dm7",
                        "vi m7 – diatonic descent",                            styles=["jazz","pop"],               moods=["melancholic","chill"],             base_weight=1.3),
        FollowCandidate("Bm7",   "ii m7 – preps ii–V",                         styles=["jazz","bossa nova"],        moods=["hopeful","uplifting"],             base_weight=1.2),
        FollowCandidate("E7",    "V7 – dominant tension",                      styles=["jazz","classical"],         moods=["tense","dramatic"],                base_weight=1.1),
        FollowCandidate("Dmaj7", "IV maj7 – plagal warmth",                    styles=["pop","lo-fi"],              moods=["chill","romantic"],                base_weight=1.0),
    ],

    # ── Bbmaj7 ────────────────────────────────────────────────────────────────
    "Bbmaj7": [
        FollowCandidate("Gm7",   "vi m7 – minor colour",                       styles=["jazz","r&b"],               moods=["melancholic","chill"],             base_weight=1.3),
        FollowCandidate("Cm7",   "ii m7 – ii–V setup",                         styles=["jazz","bossa nova"],        moods=["hopeful"],                         base_weight=1.2),
        FollowCandidate("F7",    "V7 – dominant push",                         styles=["jazz","blues"],             moods=["tense","energetic"],               base_weight=1.1),
        FollowCandidate("Ebmaj7" if "Ebmaj7" in {} else "Fmaj7",
                        "IV maj7 – subdominant warmth",                        styles=["pop","lo-fi"],              moods=["dreamy","romantic"],               base_weight=1.0),
    ],

    # ── Cm7 ───────────────────────────────────────────────────────────────────
    "Cm7": [
        FollowCandidate("F7",    "IV7 – blues-style subdominant",              styles=["blues","jazz","funk"],      moods=["tense","energetic","dark"],        base_weight=1.4),
        FollowCandidate("Bb7",   "VII7 – deceptive resolution",                styles=["jazz","r&b"],               moods=["dramatic","melancholic"],          base_weight=1.2),
        FollowCandidate("Gm7",   "v m7 – minor subdominant",                   styles=["jazz","soul"],              moods=["melancholic","sad"],               base_weight=1.1),
        FollowCandidate("Bbmaj7","bVII maj7 – Mixolydian brightness",          styles=["rock","pop","r&b"],         moods=["hopeful","uplifting"],             base_weight=1.0),
        FollowCandidate("Dm7b5", "iiø7 – jazz minor approach",                 styles=["jazz","bebop"],             moods=["mysterious","tense"],              base_weight=0.9),
    ],

    # ── Generic fallback (used when the last chord is not in the table) ───────
    # (The engine will use this when no specific rule exists.)
    "_fallback": [
        FollowCandidate("Am7",   "A natural minor seventh – versatile choice", styles=[],                           moods=[],                                  base_weight=1.0),
        FollowCandidate("Fmaj7", "F major seventh – warm and stable",          styles=[],                           moods=[],                                  base_weight=1.0),
        FollowCandidate("G7",    "G dominant seventh – creates tension",       styles=[],                           moods=[],                                  base_weight=1.0),
        FollowCandidate("Dm7",   "D minor seventh – gentle minor colour",      styles=[],                           moods=[],                                  base_weight=1.0),
        FollowCandidate("Em7",   "E minor seventh – subtle introspection",     styles=[],                           moods=[],                                  base_weight=1.0),
        FollowCandidate("Cmaj7", "C major seventh – bright and resolved",      styles=[],                           moods=[],                                  base_weight=1.0),
        FollowCandidate("Bm7b5", "B half-diminished – adds jazz tension",      styles=[],                           moods=[],                                  base_weight=0.8),
        FollowCandidate("Bdim7", "B diminished seventh – chromatic colour",    styles=[],                           moods=[],                                  base_weight=0.7),
    ],
}
