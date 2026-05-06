import React, { useEffect, useRef } from 'react';

interface ChordNotationProps {
  chordName: string;
  notes: string[];
}

export const ChordNotation: React.FC<ChordNotationProps> = ({ chordName, notes }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="chord-notation" ref={containerRef}>
      <div className="notation-staff">
        {/* Simplified representation - full VexFlow would be complex */}
        <div className="chord-info">
          <div className="chord-name-notation">{chordName}</div>
          <div className="chord-notes">{notes.join(' ')}</div>
        </div>
      </div>
    </div>
  );
};
