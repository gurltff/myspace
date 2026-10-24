import type { CSSProperties, ReactNode } from 'react';

type P = { size?: number; className?: string; style?: CSSProperties };
const C = '#5e3a34'; // chocolate
const CR = '#fff3ec'; // cream
const PK = '#f2b7c1'; // rose

export function HeartPath({ fill = PK, stroke = C, sw = 2.5 }: { fill?: string; stroke?: string; sw?: number }) {
  return <path d="M50 88 C20 66 6 50 8 32 C10 16 26 8 38 14 C44 17 48 22 50 27 C52 22 56 17 62 14 C74 8 90 16 92 32 C94 50 80 66 50 88Z" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />;
}

/** Heart with little angel wings that flap. */
export function WingedHeart({ size = 70, className, style, fill = PK }: P & { fill?: string }) {
  const wing = (
    <path d="M0 30 C-6 18 -18 12 -30 14 C-24 20 -26 24 -34 26 C-26 30 -26 34 -32 38 C-20 42 -8 40 0 36Z" fill="#fff" stroke={C} strokeWidth="2.2" strokeLinejoin="round" />
  );
  return (
    <svg width={size * 1.6} height={size} viewBox="-40 0 180 100" className={className} style={style} aria-hidden>
      <g className="wing-l" style={{ transformBox: 'fill-box' }}><g transform="translate(14 14)">{wing}</g></g>
      <g className="wing-r" style={{ transformBox: 'fill-box' }}><g transform="translate(86 14) scale(-1 1)">{wing}</g></g>
      <HeartPath fill={fill} />
      <path d="M26 30 Q30 22 38 24" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" opacity=".8" />
    </svg>
  );
}

/** Chocolate heart badge with cream lettering inside. */
export function HeartBadge({ children, size = 150, className, style }: P & { children: ReactNode }) {
  return (
    <div className={`relative grid place-items-center ${className ?? ''}`} style={{ width: size, height: size * 0.92, ...style }}>
      <svg viewBox="0 0 100 92" className="absolute inset-0 w-full h-full" aria-hidden style={{ filter: 'drop-shadow(4px 5px 0 rgba(94,50,44,.28))' }}>
        <g transform="translate(0 2)">
          <HeartPath fill={C} stroke={CR} sw={3.5} />
          <path d="M50 82 C24 62 12 48 14 33 C16 21 28 15 37 19 C43 22 47 27 50 32 C53 27 57 22 63 19 C72 15 84 21 86 33 C88 48 76 62 50 82Z" fill="none" stroke={CR} strokeWidth="1" strokeDasharray="3 3" opacity=".7" />
        </g>
      </svg>
      <div className="relative text-center font-bubble leading-[1.1] -mt-5 px-7" style={{ color: CR, fontSize: size * 0.095 }}>{children}</div>
    </div>
  );
}

/** Award rosette with checkered ring and ribbon tails. */
export function Rosette({ children, size = 150, className, style }: P & { children: ReactNode }) {
  const petals = Array.from({ length: 18 }, (_, i) => i * 20);
  return (
    <div className={`relative ${className ?? ''}`} style={{ width: size, height: size * 1.4, ...style }}>
      <svg viewBox="0 0 100 140" className="absolute inset-0 w-full h-full" aria-hidden style={{ filter: 'drop-shadow(4px 5px 0 rgba(94,50,44,.25))' }}>
        <defs>
          <pattern id="chk" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill={CR} /><rect width="4" height="4" fill={C} /><rect x="4" y="4" width="4" height="4" fill={C} /></pattern>
        </defs>
        <g stroke={C} strokeWidth="2" strokeLinejoin="round">
          <path d="M34 80 L22 132 L32 124 L40 136 L48 84Z" fill={PK} />
          <path d="M66 80 L78 132 L68 124 L60 136 L52 84Z" fill={C} />
          <path d="M44 84 L46 138 L52 130 L58 138 L56 84Z" fill="url(#chk)" />
          {petals.map((a) => <ellipse key={a} cx="50" cy="12" rx="9" ry="12" fill="#fff" transform={`rotate(${a} 50 50)`} />)}
          <circle cx="50" cy="50" r="36" fill="url(#chk)" />
          <circle cx="50" cy="50" r="27" fill="#fff7f4" />
        </g>
      </svg>
      <div className="absolute grid place-items-center text-center font-hand leading-[1.05]" style={{ left: '24%', right: '24%', top: '20%', height: '30%', color: C, fontSize: size * 0.115 }}><div>{children}</div></div>
    </div>
  );
}

export function TrebleClef({ size = 50, className, style, color = C }: P & { color?: string }) {
  return (
    <svg width={size * 0.6} height={size} viewBox="0 0 60 120" className={className} style={style} aria-hidden fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M34 108 Q30 118 22 114 Q14 108 22 100 Q30 96 32 104 L40 24 Q42 6 34 8 Q22 12 28 34 Q34 52 20 64 Q6 78 20 90 Q36 100 48 84 Q54 70 40 64 Q28 62 28 76" />
    </svg>
  );
}

export function Note({ size = 30, className, style, color = C, double }: P & { color?: string; double?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} style={style} aria-hidden fill={color}>
      {double ? (
        <><ellipse cx="9" cy="32" rx="6" ry="4.5" transform="rotate(-20 9 32)" /><ellipse cx="29" cy="28" rx="6" ry="4.5" transform="rotate(-20 29 28)" /><path d="M14 31 V8 L34 4 V27" stroke={color} strokeWidth="2.6" fill="none" /><path d="M14 8 L34 4 V9 L14 13Z" /></>
      ) : (
        <><ellipse cx="14" cy="32" rx="7" ry="5" transform="rotate(-20 14 32)" /><path d="M20 30 V4 Q28 10 32 18" stroke={color} strokeWidth="2.6" fill="none" strokeLinecap="round" /></>
      )}
    </svg>
  );
}

/** Open heart-shaped chocolate box with lace trim and a winged lid. */
export function HeartBox({ size = 260, className, style }: P) {
  return (
    <svg width={size} height={size * 0.75} viewBox="0 0 260 195" className={className} style={style} aria-hidden>
      <g transform="translate(6 60) rotate(-8 60 60)">
        <g transform="scale(1.35)"><HeartPath fill="#c9707f" /></g>
        <g transform="translate(10 8) scale(1.15)"><HeartPath fill="#7a4740" stroke="#5e3a34" sw={2} /></g>
        {[[40, 40], [64, 36], [52, 60], [76, 58], [34, 62], [62, 82]].map(([x, y], i) => (
          <g key={i}><circle cx={x} cy={y} r="8" fill={i % 2 ? '#5e3a34' : '#a5635a'} stroke="#3d2420" strokeWidth="1.5" /><path d={`M${x - 3} ${y - 3} q3 -2 6 0`} stroke="#fff" strokeWidth="1.4" fill="none" opacity=".6" /></g>
        ))}
      </g>
      <g transform="translate(118 20) rotate(14 66 66)">
        <g transform="scale(1.32)">
          <HeartPath fill="#fbe1e4" />
          <path d="M50 80 C24 62 12 48 14 33 C16 21 28 15 37 19 C43 22 47 27 50 32 C53 27 57 22 63 19 C72 15 84 21 86 33 C88 48 76 62 50 80Z" fill="none" stroke="#e79aa9" strokeWidth="5" strokeDasharray="1 6" strokeLinecap="round" />
          <path d="M50 66 C34 54 26 46 28 36 C30 28 40 26 46 32 L50 36 L54 32 C60 26 70 28 72 36 C74 46 66 54 50 66Z" fill="#f2b7c1" stroke="#5e3a34" strokeWidth="1.8" />
        </g>
        <g transform="translate(48 26) scale(.55)"><TrebleClefPaths /></g>
        <path d="M18 46 C8 40 -4 42 -10 50 C-2 52 -2 56 -8 60 C2 62 10 58 16 54" fill="#fff" stroke="#5e3a34" strokeWidth="2" />
        <path d="M114 46 C124 40 136 42 142 50 C134 52 134 56 140 60 C130 62 122 58 116 54" fill="#fff" stroke="#5e3a34" strokeWidth="2" />
      </g>
    </svg>
  );
}
function TrebleClefPaths() {
  return <path d="M34 108 Q30 118 22 114 Q14 108 22 100 Q30 96 32 104 L40 24 Q42 6 34 8 Q22 12 28 34 Q34 52 20 64 Q6 78 20 90 Q36 100 48 84 Q54 70 40 64 Q28 62 28 76" fill="none" stroke="#c9707f" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />;
}

export function Bunny({ size = 70, className, style }: P) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={className} style={style} aria-hidden>
      <g stroke={C} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M26 30 Q16 6 24 4 Q32 4 34 28Z" fill="#fff6ef" /><path d="M46 28 Q50 4 58 6 Q64 10 54 30Z" fill="#fff6ef" />
        <path d="M26 26 Q22 12 25 9 Q29 10 31 26Z M50 26 Q54 12 57 11 Q58 14 53 27Z" fill={PK} strokeWidth="0" />
        <ellipse cx="40" cy="44" rx="24" ry="20" fill="#fff6ef" />
        <ellipse cx="40" cy="68" rx="18" ry="10" fill="#fff6ef" />
      </g>
      <circle cx="31" cy="42" r="2.6" fill={C} /><circle cx="49" cy="42" r="2.6" fill={C} />
      <path d="M37 49 q3 3 6 0" stroke={C} strokeWidth="1.8" fill="none" strokeLinecap="round" />
      <ellipse cx="25" cy="49" rx="4" ry="2.4" fill={PK} /><ellipse cx="55" cy="49" rx="4" ry="2.4" fill={PK} />
      <g transform="translate(30 58) scale(.2)"><HeartPath fill={PK} sw={8} /></g>
    </svg>
  );
}

export function Bow({ size = 100, className, style }: P) {
  return (
    <svg width={size} height={size * 0.8} viewBox="0 0 120 96" className={className} style={style} aria-hidden>
      <g fill={PK} stroke={C} strokeWidth="2.2" strokeLinejoin="round">
        <path d="M58 40 Q30 8 10 22 Q2 40 22 50 Q40 56 58 44Z" />
        <path d="M62 40 Q90 8 110 22 Q118 40 98 50 Q80 56 62 44Z" />
        <path d="M54 46 Q44 70 34 92 L44 88 L48 96 Q56 72 58 50Z" />
        <path d="M66 46 Q76 70 86 92 L76 88 L72 96 Q64 72 62 50Z" />
        <ellipse cx="60" cy="44" rx="9" ry="8" fill="#e591a2" />
      </g>
    </svg>
  );
}

/** Hand-drawn curly arrow; point it with rotate on the wrapper. */
export function Arrow({ size = 60, className, style, curl = true }: P & { curl?: boolean }) {
  return (
    <svg width={size} height={size * 0.6} viewBox="0 0 100 60" className={className} style={style} aria-hidden fill="none" stroke={C} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      {curl ? <path d="M4 40 Q20 10 40 30 Q52 44 44 50 Q34 54 40 36 Q50 14 92 20" /> : <path d="M4 40 Q40 10 92 20" />}
      <path d="M80 10 L93 20 L80 30" />
    </svg>
  );
}

export function Annot({ children, className, style, arrowStyle, flip }: { children: ReactNode; className?: string; style?: CSSProperties; arrowStyle?: CSSProperties; flip?: boolean }) {
  return (
    <div className={`absolute pointer-events-none flex items-center gap-1 font-hand text-[20px] text-choco dark:text-pink ${flip ? 'flex-row-reverse' : ''} ${className ?? ''}`} style={{ animation: 'bob 6s ease-in-out infinite', ...style }}>
      <span className="leading-none whitespace-nowrap">{children}</span>
      <Arrow size={46} style={{ transform: flip ? 'scaleX(-1)' : undefined, ...arrowStyle }} />
    </div>
  );
}

export function Sparkle({ size = 16, className, style, color = '#fff3ec' }: P & { color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 100 92" className={className} style={style} aria-hidden>
      <HeartPath fill={color} stroke={C} sw={7} />
    </svg>
  );
}

/** Vertical column of hearts & notes, like the doodled borders of a letter. */
export function DoodleColumn({ className, style }: { className?: string; style?: CSSProperties }) {
  const items = Array.from({ length: 22 }, (_, i) => i);
  return (
    <div className={`doodles flex flex-col items-center gap-5 py-6 ${className ?? ''}`} style={style}>
      {items.map((i) =>
        i % 3 === 0 ? <Note key={i} size={24} double={i % 2 === 0} color="currentColor" /> : (
          <svg key={i} width={i % 3 === 1 ? 14 : 10} height={i % 3 === 1 ? 13 : 9} viewBox="0 0 100 92" aria-hidden><HeartPath fill="currentColor" stroke="currentColor" sw={4} /></svg>
        ),
      )}
    </div>
  );
}

/* legacy names kept so older imports still resolve */
export const CatSticker = ({ size = 90, className, style }: P & { mood?: string }) => <Bunny size={size} className={className} style={style} />;
export const StarSticker = ({ size = 30, className, style }: P) => <Sparkle size={size} className={className} style={style} />;
export const Unicorn = ({ size = 120, className, style }: P) => <Bunny size={size * 0.5} className={className} style={style} />;
