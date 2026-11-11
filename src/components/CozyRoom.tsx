import { motion } from 'framer-motion';

/** The animated cozy room: glowing lamp, rainy window, swaying curtains, bed + pillows, handwritten note, floating hearts. */
export function CozyRoom({ note = 'welcome home ♡' }: { note?: string }) {
  const drops = Array.from({ length: 14 }, (_, i) => ({ x: 214 + (i % 7) * 18 + (i > 6 ? 8 : 0), d: 0.9 + (i % 5) * 0.22, delay: (i * 0.37) % 2 }));
  const hearts = [
    { x: 120, s: 1, d: 0 }, { x: 300, s: 0.8, d: 1.8 }, { x: 440, s: 1.2, d: 3.2 }, { x: 210, s: 0.7, d: 4.5 },
  ];
  return (
    <svg className="room" viewBox="0 0 560 420" role="img" aria-label="A cozy little room with a glowing lamp, a rainy window and a bed with pillows">
      <defs>
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#FFE7B0" stopOpacity=".95" />
          <stop offset="100%" stopColor="#FFE7B0" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#F9E3DB" /><stop offset="1" stopColor="#F5D6D0" />
        </linearGradient>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#B9C6C9" /><stop offset="1" stopColor="#DCE3DB" />
        </linearGradient>
        <clipPath id="win"><rect x="200" y="60" width="140" height="130" rx="8" /></clipPath>
      </defs>

      {/* room */}
      <rect x="20" y="20" width="520" height="380" rx="26" fill="url(#wall)" />
      <rect x="20" y="318" width="520" height="82" rx="0" fill="#E8D6B8" />
      <path d="M20 318h520" stroke="#806451" strokeOpacity=".25" strokeWidth="2" />
      <rect x="20" y="340" width="520" height="60" rx="0" fill="#DEC9A6" opacity=".7" />
      <rect x="20" y="20" width="520" height="380" rx="26" fill="none" stroke="#806451" strokeWidth="3" />

      {/* window with rain */}
      <rect x="190" y="50" width="160" height="150" rx="12" fill="#806451" />
      <rect x="200" y="60" width="140" height="130" rx="8" fill="url(#sky)" />
      <g clipPath="url(#win)">
        <motion.circle cx="250" cy="100" r="22" fill="#fff" opacity=".25" animate={{ opacity: [0.15, 0.3, 0.15] }} transition={{ duration: 6, repeat: Infinity }} />
        {drops.map((d, i) => (
          <motion.line key={i} x1={d.x - 200 + 200} y1="55" x2={d.x - 200 + 196} y2="72" stroke="#fff" strokeOpacity=".75" strokeWidth="1.6" strokeLinecap="round"
            initial={{ y: -20 }} animate={{ y: 150 }} transition={{ duration: d.d, repeat: Infinity, ease: 'linear', delay: d.delay }} />
        ))}
      </g>
      <path d="M270 60v130M200 125h140" stroke="#806451" strokeWidth="5" />
      <rect x="184" y="196" width="172" height="10" rx="5" fill="#6d5444" />

      {/* curtains */}
      <motion.path d="M180 44c18 30 18 70 4 118-6 20-6 34 0 50h-40V44z" fill="#B7C4AE" style={{ transformOrigin: '150px 44px' }}
        animate={{ skewX: [0, 2.5, 0, -1.5, 0] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut' }} />
      <motion.path d="M360 44c-18 30-18 70-4 118 6 20 6 34 0 50h40V44z" fill="#B7C4AE" style={{ transformOrigin: '390px 44px' }}
        animate={{ skewX: [0, -2.5, 0, 1.5, 0] }} transition={{ duration: 7.5, repeat: Infinity, ease: 'easeInOut' }} />
      <rect x="126" y="38" width="288" height="9" rx="4.5" fill="#806451" />

      {/* fairy lights */}
      <path d="M40 40 Q 120 90 200 40 T 360 40 T 520 40" fill="none" stroke="#806451" strokeOpacity=".5" strokeWidth="1.5" />
      {[70, 120, 165, 395, 445, 490].map((x, i) => (
        <motion.circle key={x} cx={x} cy={i < 3 ? 62 + (i % 2) * 8 : 60 + (i % 2) * 8} r="4.5" fill="#FFE7B0"
          animate={{ opacity: [0.35, 1, 0.35] }} transition={{ duration: 2.4 + i * 0.3, repeat: Infinity, delay: i * 0.4 }} />
      ))}

      {/* bed */}
      <rect x="250" y="262" width="270" height="70" rx="14" fill="#fffaf0" stroke="#806451" strokeWidth="3" />
      <rect x="250" y="236" width="48" height="96" rx="12" fill="#DFAEAA" stroke="#806451" strokeWidth="3" />
      <path d="M298 288h222v44H298z" fill="#F5D6D0" stroke="#806451" strokeWidth="3" />
      <path d="M320 288v44M360 288v44M400 288v44M440 288v44M480 288v44" stroke="#DFAEAA" strokeWidth="3" />
      <rect x="262" y="250" width="62" height="34" rx="14" fill="#fff" stroke="#806451" strokeWidth="2.5" />
      <rect x="296" y="258" width="52" height="30" rx="13" fill="#E8D6B8" stroke="#806451" strokeWidth="2.5" />
      <rect x="258" y="332" width="10" height="22" fill="#806451" /><rect x="502" y="332" width="10" height="22" fill="#806451" />

      {/* side table + lamp */}
      <rect x="62" y="270" width="104" height="14" rx="6" fill="#806451" />
      <rect x="74" y="284" width="10" height="66" fill="#806451" /><rect x="144" y="284" width="10" height="66" fill="#806451" />
      <motion.circle cx="114" cy="214" r="86" fill="url(#lampGlow)" animate={{ opacity: [0.75, 1, 0.8, 1], scale: [1, 1.04, 1] }} style={{ transformOrigin: '114px 214px' }} transition={{ duration: 4, repeat: Infinity }} />
      <rect x="108" y="236" width="12" height="34" rx="3" fill="#806451" />
      <path d="M86 238 98 190h32l12 48z" fill="#FFE7B0" stroke="#806451" strokeWidth="3" strokeLinejoin="round" />

      {/* handwritten note on wall */}
      <g transform="rotate(-4 120 120)">
        <rect x="52" y="78" width="130" height="62" rx="4" fill="#FFFBF0" stroke="#806451" strokeOpacity=".5" />
        <rect x="104" y="72" width="26" height="12" fill="#B7C4AE" opacity=".8" />
        <text x="117" y="116" textAnchor="middle" fontFamily="Caveat, cursive" fontSize="22" fill="#806451">{note}</text>
      </g>

      {/* rug */}
      <ellipse cx="260" cy="370" rx="120" ry="16" fill="#DFAEAA" opacity=".55" />

      {/* floating hearts */}
      {hearts.map((h, i) => (
        <motion.text key={i} x={h.x} y="300" fontSize={22 * h.s} fill="#DFAEAA" textAnchor="middle"
          initial={{ opacity: 0, y: 0 }} animate={{ opacity: [0, 0.9, 0], y: [0, -150] }} transition={{ duration: 6, repeat: Infinity, delay: h.d, ease: 'easeOut' }}>♥</motion.text>
      ))}
    </svg>
  );
}
