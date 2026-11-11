import { motion } from 'framer-motion';
import { loveLabel, missLabel, timeAgo } from '../lib/format';

/** Eight-petal flower that blooms with the "I miss you" value. */
export function MissFlower({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  const petal = 0.25 + (v / 100) * 0.75;
  return (
    <svg className="meter-visual" viewBox="-60 -60 120 120" role="img" aria-label={`Miss you ${v} out of 100`}>
      <motion.g animate={{ rotate: [0, 4, 0, -4, 0] }} transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}>
        {Array.from({ length: 8 }, (_, i) => (
          <g key={i} transform={`rotate(${i * 45})`}>
            <motion.ellipse cx="0" cy="-26" rx="12" ry="24" fill={i % 2 ? '#DFAEAA' : '#F5D6D0'} stroke="#806451" strokeOpacity=".4" strokeWidth="1.5"
              initial={false} animate={{ scale: petal }} transition={{ type: 'spring', stiffness: 80, damping: 14 }} style={{ transformOrigin: '0px 0px', transformBox: 'view-box' }} />
          </g>
        ))}
        <circle r={8 + (v / 100) * 5} fill="#E8D6B8" stroke="#806451" strokeOpacity=".55" strokeWidth="2" />
      </motion.g>
    </svg>
  );
}

/** Heart that fills (bottom to top) with the "I love you" value. */
export function LoveHeart({ value, pulse }: { value: number; pulse: number }) {
  const v = Math.max(0, Math.min(100, value));
  const id = `lh-${Math.round(Math.random() * 1e6)}`;
  const top = 100 - v;
  return (
    <motion.svg className="meter-visual" viewBox="0 0 100 100" role="img" aria-label={`Love you ${v} out of 100`} key={pulse}
      animate={pulse ? { scale: [1, 1.18, 1] } : undefined} transition={{ duration: 0.7 }}>
      <defs>
        <clipPath id={id}><path d="M50 88C20 66 8 50 8 32 8 19 18 10 30 10c8 0 16 4 20 12 4-8 12-12 20-12 12 0 22 9 22 22 0 18-12 34-42 56z" /></clipPath>
      </defs>
      <path d="M50 88C20 66 8 50 8 32 8 19 18 10 30 10c8 0 16 4 20 12 4-8 12-12 20-12 12 0 22 9 22 22 0 18-12 34-42 56z" fill="#FFF7EC" stroke="#806451" strokeWidth="3" strokeLinejoin="round" />
      <g clipPath={`url(#${id})`}>
        <motion.rect x="0" width="100" height="100" fill="#DFAEAA" initial={false} animate={{ y: top }} transition={{ type: 'spring', stiffness: 60, damping: 16 }} />
        <motion.path d="M0 4q12-6 25 0t25 0 25 0 25 0V12H0z" fill="#E7BDB8" initial={false} animate={{ y: top - 4, x: [0, -25, 0] }} transition={{ y: { type: 'spring', stiffness: 60, damping: 16 }, x: { duration: 4, repeat: Infinity, ease: 'linear' } }} />
      </g>
      <path d="M50 88C20 66 8 50 8 32 8 19 18 10 30 10c8 0 16 4 20 12 4-8 12-12 20-12 12 0 22 9 22 22 0 18-12 34-42 56z" fill="none" stroke="#806451" strokeWidth="3" strokeLinejoin="round" />
    </motion.svg>
  );
}

export function MeterCaption({ kind, value, updatedAt, now }: { kind: 'miss' | 'love'; value: number; updatedAt: string | null; now: number }) {
  return (
    <>
      <div className="big">{value}<span className="small muted">/100</span></div>
      <div className="meter-label">{kind === 'love' ? loveLabel(value) : missLabel(value)}</div>
      <div className="small muted">Last updated {timeAgo(updatedAt, now)}</div>
    </>
  );
}
