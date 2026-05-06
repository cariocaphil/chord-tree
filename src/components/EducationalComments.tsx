import React, { useMemo } from 'react';
import { useChordStore } from '../chordStore';

// Simple harmonic analysis
const analyzeProgression = (progression: string[]): string[] => {
  const comments: string[] = [];

  if (progression.length === 0) return [];

  // Detect common patterns
  if (progression.includes('Cmaj7') && progression.includes('Am7')) {
    comments.push('ii–V–I cadence structure detected');
  }

  if (progression.length >= 2) {
    const last = progression[progression.length - 1];
    const secondLast = progression[progression.length - 2];

    if (
      (secondLast === 'Cmaj7' && last === 'Am7') ||
      (secondLast === 'Fmaj7' && last === 'G7')
    ) {
      comments.push('Major to minor motion — chromatic descent');
    }
  }

  if (progression.length >= 3) {
    comments.push(`Progression depth: ${progression.length} chords`);
  }

  if (progression.filter((c) => c.includes('maj7')).length > 0) {
    comments.push('Rich harmonic language with extended chords');
  }

  return comments;
};

export const EducationalComments: React.FC = () => {
  const getProgression = useChordStore((state) => state.getProgression);
  const progression = getProgression();

  const comments = useMemo(() => analyzeProgression(progression), [progression]);

  if (comments.length === 0) {
    return (
      <div className="educational-comments">
        <div className="comment-placeholder">Start building your progression...</div>
      </div>
    );
  }

  return (
    <div className="educational-comments">
      {comments.map((comment, idx) => (
        <div key={idx} className="comment-line">
          <span className="comment-prefix">$</span>
          <span className="comment-text">{comment}</span>
        </div>
      ))}
    </div>
  );
};
