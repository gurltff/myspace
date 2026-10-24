import { motion } from 'framer-motion';

/** Hand-drawn style study-desk scene in the spirit of the photo in the reference layout. */
export function Hero({ children }: { children?: React.ReactNode }) {
  return (
    <div className="hero-art relative rounded-lg border-2 border-line overflow-hidden aspect-[16/7] bg-sky">
      <svg viewBox="0 0 640 280" className="absolute inset-0 w-full h-full" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#cfe0ee" />
            <stop offset="1" stopColor="#eef3e2" />
          </linearGradient>
          <linearGradient id="water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#9fb9a3" />
            <stop offset="1" stopColor="#7d9b86" />
          </linearGradient>
        </defs>
        <rect width="640" height="280" fill="url(#sky)" />
        <g className="clouds">
          <motion.g animate={{ x: [0, 40, 0] }} transition={{ duration: 26, repeat: Infinity, ease: 'easeInOut' }}>
            <ellipse cx="120" cy="50" rx="46" ry="14" fill="#fff" opacity=".85" />
            <ellipse cx="150" cy="42" rx="28" ry="14" fill="#fff" opacity=".85" />
          </motion.g>
          <motion.g animate={{ x: [0, -50, 0] }} transition={{ duration: 32, repeat: Infinity, ease: 'easeInOut' }}>
            <ellipse cx="470" cy="38" rx="56" ry="13" fill="#fff" opacity=".8" />
            <ellipse cx="500" cy="30" rx="30" ry="13" fill="#fff" opacity=".8" />
          </motion.g>
        </g>
        {/* trees */}
        <g fill="#8fae7e" stroke="#5e584a" strokeWidth="2">
          <circle cx="40" cy="110" r="58" /><circle cx="110" cy="96" r="46" /><circle cx="600" cy="100" r="62" /><circle cx="540" cy="118" r="40" />
        </g>
        <g fill="#a9c493" opacity=".8"><circle cx="70" cy="90" r="24" /><circle cx="590" cy="80" r="26" /></g>
        {/* pond */}
        <rect y="150" width="640" height="130" fill="url(#water)" />
        <motion.g animate={{ x: [0, 260, 0] }} transition={{ duration: 40, repeat: Infinity, ease: 'easeInOut' }}>
          <path d="M150 168 h70 l-8 10 h-54z" fill="#f3b8c2" stroke="#5e584a" strokeWidth="2" />
          <circle cx="185" cy="160" r="6" fill="#fbf6ec" stroke="#5e584a" strokeWidth="2" />
        </motion.g>
        {[0, 1, 2].map((i) => (
          <motion.ellipse key={i} cx={260 + i * 120} cy={200 + i * 18} rx="30" ry="3" fill="#fff" opacity=".35" style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
            animate={{ scaleX: [0.6, 1.3, 0.6], opacity: [0.15, 0.45, 0.15] }} transition={{ duration: 4 + i, repeat: Infinity }} />
        ))}
        {/* fence */}
        <g stroke="#5e584a" strokeWidth="2.5" fill="#b89470">
          <rect x="0" y="200" width="300" height="10" rx="3" />
          <rect x="0" y="230" width="300" height="10" rx="3" />
          {[20, 90, 160, 230].map((x) => <rect key={x} x={x} y="190" width="14" height="90" rx="3" />)}
        </g>
        {/* book stack on the fence */}
        <g stroke="#5e584a" strokeWidth="2">
          <rect x="60" y="178" width="70" height="12" rx="2" fill="#bcd3ea" />
          <rect x="66" y="166" width="60" height="12" rx="2" fill="#f5dd96" />
          <rect x="62" y="154" width="64" height="12" rx="2" fill="#cfbde8" />
          <motion.path d="M140 190 q4 -18 0 -30 q-4 -10 4 -18" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" animate={{ opacity: [0, 0.8, 0], y: [4, -6, -12] }} transition={{ duration: 3, repeat: Infinity }} />
          <rect x="134" y="176" width="16" height="14" rx="3" fill="#fbf6ec" />
        </g>
        {/* cat from behind */}
        <g transform="translate(370 150)" stroke="#5e584a" strokeWidth="3" strokeLinejoin="round">
          <motion.path d="M70 110 q40 -10 34 -50" fill="none" strokeLinecap="round" style={{ transformOrigin: '70px 110px' }} animate={{ rotate: [0, 14, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} />
          <path d="M10 120 Q0 60 30 40 L22 0 L54 28 Q66 25 78 28 L110 0 L102 40 Q132 60 122 120Z" fill="#f7f4ec" />
        </g>
      </svg>
      {children && <div className="absolute inset-0 p-3 flex flex-col justify-end">{children}</div>}
    </div>
  );
}
