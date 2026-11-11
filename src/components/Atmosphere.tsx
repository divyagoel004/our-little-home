import { useMemo } from 'react';
import { moodOf } from '../lib/moods';
import type { MoodKey } from '../types';

/** A very gentle full-screen atmosphere that follows the mood either of you set. */
export function Atmosphere({ mood }: { mood: MoodKey | null | undefined }) {
  const info = moodOf(mood);
  const items = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ left: (i * 61) % 100, dur: 9 + (i % 6) * 2.3, delay: -((i * 1.7) % 12), size: 12 + (i % 4) * 5 })),
    [],
  );
  if (!info) return null;
  const glow = <div className="atmo-glow" style={{ ['--glow' as string]: info.color }} aria-hidden />;
  if (info.atmosphere === 'none' || info.atmosphere === 'glow') return glow;
  const glyph = info.atmosphere === 'hearts' ? '♥' : info.atmosphere === 'petals' ? '🌸' : '✦';
  const up = info.atmosphere === 'hearts' || info.atmosphere === 'sparkles';
  return (
    <>
      {glow}
      <div className={`atmo ${up ? 'up' : ''}`} aria-hidden>
        {items.map((it, i) =>
          info.atmosphere === 'rain' ? (
            <i key={i} className="drop" style={{ left: `${it.left}%`, animationDuration: `${1.1 + (i % 4) * 0.35}s`, animationDelay: `${it.delay / 8}s` }} />
          ) : (
            <i key={i} style={{ left: `${it.left}%`, fontSize: it.size, color: info.atmosphere === 'hearts' ? '#DFAEAA' : '#C9A66B', animationDuration: `${it.dur}s`, animationDelay: `${it.delay}s` }}>{glyph}</i>
          ),
        )}
      </div>
    </>
  );
}
