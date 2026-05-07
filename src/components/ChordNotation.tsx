import React, { useEffect, useRef } from 'react';
import { Renderer, Stave, StaveNote, Voice, Formatter, Accidental } from 'vexflow';

type Props = {
  notes: string[]; // e.g. ["C4","E4","G4"]
  width?: number;
  height?: number;
};

function toVexKey(note: string) {
  // Convert 'C4' -> 'c/4', 'C#4' -> 'c#/4', 'Bb3' -> 'bb/3' (VexFlow accepts b)
  const m = note.match(/^([A-Ga-g])([#b]?)(-?\d+)$/);
  if (!m) return note;
  const letter = m[1].toLowerCase();
  const acc = m[2] || '';
  const octave = m[3];
  return `${letter}${acc}/${octave}`;
}

export const ChordNotation: React.FC<Props> = ({ notes, width = 120, height = 72 }) => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;

    // Clear previous render
    ref.current.innerHTML = '';

    const renderer = new Renderer(ref.current, Renderer.Backends.SVG);
    // Add extra vertical padding so ledger lines / noteheads aren't clipped
    const extraVertical = Math.max(8, Math.round(height * 0.25));
    const svgHeight = height + extraVertical;
    renderer.resize(width, svgHeight);
    const context = renderer.getContext();

    // Use a slightly smaller font so the staff fits in small chips
    try {
      context.setFont('Arial', Math.max(8, Math.floor(height * 0.12)), '');
    } catch (e) {
      // ignore if backend doesn't support setFont
    }

    // Leave some top padding so ledger lines and noteheads aren't clipped
    const staveY = Math.max(6, Math.round(extraVertical * 0.5));
    const stave = new Stave(0, staveY, width);
    stave.addClef('treble');
    stave.setContext(context).draw();

    const keys = notes.map(toVexKey);

    const note = new StaveNote({ keys, duration: 'w' });

    // Add accidentals if present
    keys.forEach((k, idx) => {
      const accMatch = k.match(/([#b])/);
      if (accMatch) {
        note.addModifier(new Accidental(accMatch[1]), idx);
      }
    });

    const voice = new Voice({ numBeats: 4, beatValue: 4 });
    voice.addTickable(note);

    // Format into slightly reduced width to keep padding
    new Formatter().joinVoices([voice]).format([voice], Math.max(20, width - 20));
    voice.draw(context, stave);

    // Ensure the container is tall enough to show the SVG without clipping
    if (ref.current) {
      ref.current.style.height = `${svgHeight}px`;
      ref.current.style.overflow = 'visible';
    }

    return () => {
      // nothing to cleanup for SVG besides removing DOM node which we clear at start
    };
  }, [notes, width, height]);

  return <div ref={ref} style={{ width, height }} />;
};

export default ChordNotation;
