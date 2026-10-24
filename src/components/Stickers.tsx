import type { CSSProperties } from 'react';

const L = '#5e584a';
type P = { size?: number; className?: string; style?: CSSProperties; title?: string };

export function CatSticker({ size = 110, mood = 'happy', ...p }: P & { mood?: 'happy' | 'smug' | 'sleepy' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" {...p} aria-hidden>
      {mood === 'happy' && (
        <g stroke={L} strokeWidth="3" strokeLinecap="round" fill="#f7f1e1">
          <path d="M18 70 Q4 52 10 40" />
          <path d="M102 70 Q116 52 110 40" />
        </g>
      )}
      <path d="M22 50 L28 14 L50 34 Q60 31 70 34 L92 14 L98 50 Q106 66 100 82 Q90 104 60 104 Q30 104 20 82 Q14 66 22 50Z" fill="#f7f1e1" stroke={L} strokeWidth="3" strokeLinejoin="round" />
      <path d="M30 22 L34 38 L44 32Z M90 22 L86 38 L76 32Z" fill="#e8c9a8" />
      <ellipse cx="34" cy="74" rx="9" ry="5.5" fill="#f4a9b6" opacity="0.9" />
      <ellipse cx="86" cy="74" rx="9" ry="5.5" fill="#f4a9b6" opacity="0.9" />
      {mood === 'happy' && (
        <g stroke={L} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M38 62 L46 58 L38 54" />
          <path d="M82 62 L74 58 L82 54" />
          <path d="M50 74 Q60 90 70 74 Z" fill="#fff" />
        </g>
      )}
      {mood === 'smug' && (
        <g stroke={L} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M36 60 Q42 56 48 60" />
          <path d="M72 60 Q78 56 84 60" />
          <path d="M52 76 Q56 80 60 76 Q64 80 68 76" />
        </g>
      )}
      {mood === 'sleepy' && (
        <g stroke={L} strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M36 60 Q42 64 48 60" />
          <path d="M72 60 Q78 64 84 60" />
          <circle cx="60" cy="78" r="3" />
          <text x="94" y="30" fontSize="16" fill={L} stroke="none" fontFamily="Sniglet">z</text>
          <text x="104" y="18" fontSize="12" fill={L} stroke="none" fontFamily="Sniglet">z</text>
        </g>
      )}
    </svg>
  );
}

export function DangoSticker({ size = 90, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" {...p} aria-hidden>
      <line x1="20" y1="18" x2="84" y2="92" stroke="#c9a36b" strokeWidth="5" strokeLinecap="round" />
      <line x1="20" y1="18" x2="84" y2="92" stroke={L} strokeWidth="1.5" strokeLinecap="round" opacity=".4" />
      <circle cx="32" cy="32" r="15" fill="#f6b3c2" stroke={L} strokeWidth="2.5" />
      <circle cx="49" cy="51" r="15" fill="#fbf6ec" stroke={L} strokeWidth="2.5" />
      <circle cx="66" cy="70" r="15" fill="#b5cf8f" stroke={L} strokeWidth="2.5" />
      <ellipse cx="27" cy="27" rx="4" ry="2.5" fill="#fff" opacity=".8" />
      <ellipse cx="44" cy="46" rx="4" ry="2.5" fill="#fff" opacity=".9" />
      <ellipse cx="61" cy="65" rx="4" ry="2.5" fill="#fff" opacity=".7" />
    </svg>
  );
}

export function DinoSticker({ size = 90, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" {...p} aria-hidden>
      <path d="M30 88 Q20 60 34 46 Q40 22 62 20 Q84 20 86 38 Q88 52 72 54 L66 54 Q74 70 70 88 Z" fill="#a9cf8f" stroke={L} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M30 80 Q12 84 6 74 Q18 76 30 70" fill="#a9cf8f" stroke={L} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M44 30 l-6 -8 l8 2 l2 -9 l6 7 l5 -8 l3 9" fill="#f3d58f" stroke={L} strokeWidth="2" strokeLinejoin="round" />
      <circle cx="72" cy="34" r="3.2" fill={L} />
      <ellipse cx="78" cy="44" rx="5" ry="3" fill="#f4a9b6" opacity=".9" />
      <path d="M50 60 q6 4 10 0" stroke={L} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <ellipse cx="50" cy="72" rx="10" ry="12" fill="#e9f3d6" opacity=".8" />
    </svg>
  );
}

export function NoteSticker({ size = 46, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" {...p} aria-hidden>
      <circle cx="25" cy="25" r="22" fill="#fff" stroke={L} strokeWidth="2.5" />
      <path d="M20 33 V15 L33 12 V30" stroke={L} strokeWidth="2.5" fill="none" strokeLinejoin="round" />
      <ellipse cx="17" cy="33" rx="4.5" ry="3.5" fill={L} />
      <ellipse cx="30" cy="30" rx="4.5" ry="3.5" fill={L} />
    </svg>
  );
}

export function StarSticker({ size = 40, color = '#f5dd96', ...p }: P & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 50 50" {...p} aria-hidden>
      <path d="M25 4 L31 18 L46 19 L34 29 L38 45 L25 36 L12 45 L16 29 L4 19 L19 18 Z" fill={color} stroke={L} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="20" cy="25" r="1.8" fill={L} />
      <circle cx="30" cy="25" r="1.8" fill={L} />
      <path d="M22 30 q3 3 6 0" stroke={L} strokeWidth="1.8" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function MushroomSticker({ size = 60, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 60 60" {...p} aria-hidden>
      <path d="M22 34 Q20 52 30 54 Q40 52 38 34Z" fill="#fbf6ec" stroke={L} strokeWidth="2.5" />
      <path d="M6 34 Q6 8 30 8 Q54 8 54 34 Z" fill="#f2a7a7" stroke={L} strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="20" cy="20" r="4" fill="#fff" /><circle cx="36" cy="16" r="3" fill="#fff" /><circle cx="44" cy="26" r="3.5" fill="#fff" />
      <circle cx="26" cy="43" r="1.6" fill={L} /><circle cx="34" cy="43" r="1.6" fill={L} />
    </svg>
  );
}

export function BookSticker({ size = 64, ...p }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" {...p} aria-hidden>
      <path d="M8 16 Q20 10 32 16 Q44 10 56 16 V50 Q44 44 32 50 Q20 44 8 50Z" fill="#bcd3ea" stroke={L} strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M32 16 V50" stroke={L} strokeWidth="2.5" />
      <path d="M14 22 Q20 20 26 22 M14 28 Q20 26 26 28 M38 22 Q44 20 50 22" stroke={L} strokeWidth="1.6" fill="none" opacity=".6" />
      <text x="40" y="38" fontSize="10" fontFamily="Sniglet" fill={L}>E=mc²</text>
    </svg>
  );
}
