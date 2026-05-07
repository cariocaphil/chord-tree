import * as Tone from 'tone';

let synth: Tone.PolySynth | null = null;

function getSynth(): Tone.PolySynth {
  if (synth) return synth;

  // Simple PolySynth using basic synth voices for an MVP piano-like tone
  synth = new Tone.PolySynth(Tone.Synth, {
    volume: -6,
    envelope: {
      attack: 0.005,
      decay: 0.2,
      sustain: 0.3,
      release: 1.2,
    },
    oscillator: {
      type: 'sine',
    },
  }).toDestination();

  return synth;
}

/**
 * Play a progression of chords. Each chord is an array of note names (e.g. ["C4","E4","G4"]).
 * Each chord will be played for `durationSec` seconds in sequence.
 */
export async function playProgression(chords: string[][], durationSec = 1) {
  if (!Array.isArray(chords) || chords.length === 0) return;

  await Tone.start();
  const s = getSynth();
  const now = Tone.now();

  for (let i = 0; i < chords.length; i++) {
    const notes = chords[i];
    const time = now + i * durationSec;
    // triggerAttackRelease accepts array of notes
    s.triggerAttackRelease(notes, durationSec, time);
  }
}

export function stopPlayback() {
  if (!synth) return;
  try {
    synth.releaseAll?.(Tone.now());
  } catch (e) {
    // ignore
  }
}

export default { playProgression, stopPlayback };
