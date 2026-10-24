const L = '#5e584a';
type P = { size?: number };

function Wrap({ size = 20, children }: P & { children: React.ReactNode }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden fill="none" stroke={L} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round">
      {children}
    </svg>
  );
}

export const Icon = {
  home: (p: P) => <Wrap {...p}><path d="M3 11 L12 4 L21 11 V20 H3Z" fill="#f3d58f" /><path d="M10 20 V14 H14 V20" fill="#f3b8c2" /></Wrap>,
  book: (p: P) => <Wrap {...p}><path d="M4 5 Q8 3 12 5 Q16 3 20 5 V19 Q16 17 12 19 Q8 17 4 19Z" fill="#bcd3ea" /><path d="M12 5 V19" /></Wrap>,
  scroll: (p: P) => <Wrap {...p}><rect x="5" y="3" width="14" height="18" rx="2" fill="#fbf6ec" /><path d="M8 8 H16 M8 12 H16 M8 16 H13" /></Wrap>,
  flask: (p: P) => <Wrap {...p}><path d="M9 3 H15 M10 3 V9 L4 19 Q3 21 6 21 H18 Q21 21 20 19 L14 9 V3" fill="#cfbde8" /><circle cx="10" cy="16" r="1" fill={L} /><circle cx="14" cy="18" r="1" fill={L} /></Wrap>,
  star: (p: P) => <Wrap {...p}><path d="M12 3 L14.5 9 L21 9.5 L16 13.5 L17.5 20 L12 16.5 L6.5 20 L8 13.5 L3 9.5 L9.5 9Z" fill="#f5dd96" /></Wrap>,
  pencil: (p: P) => <Wrap {...p}><path d="M4 20 L5 15 L16 4 L20 8 L9 19Z" fill="#f3b8c2" /><path d="M14 6 L18 10" /></Wrap>,
  gear: (p: P) => <Wrap {...p}><circle cx="12" cy="12" r="7" fill="#a9bf96" /><circle cx="12" cy="12" r="2.5" fill="#fbf6ec" /><path d="M12 2 V5 M12 19 V22 M2 12 H5 M19 12 H22 M5 5 L7 7 M17 17 L19 19 M5 19 L7 17 M17 7 L19 5" /></Wrap>,
  globe: (p: P) => <Wrap {...p}><circle cx="12" cy="12" r="9" fill="#bcd3ea" /><path d="M3 12 H21 M12 3 Q17 12 12 21 Q7 12 12 3" /></Wrap>,
  cards: (p: P) => <Wrap {...p}><rect x="3" y="6" width="13" height="15" rx="2" fill="#fbf6ec" transform="rotate(-8 9 13)" /><rect x="8" y="4" width="13" height="15" rx="2" fill="#a9bf96" /></Wrap>,
  moon: (p: P) => <Wrap {...p}><path d="M20 14 A8 8 0 1 1 10 4 A6 6 0 0 0 20 14Z" fill="#f5dd96" /></Wrap>,
  sun: (p: P) => <Wrap {...p}><circle cx="12" cy="12" r="4.5" fill="#f5dd96" /><path d="M12 2 V4.5 M12 19.5 V22 M2 12 H4.5 M19.5 12 H22 M4.9 4.9 L6.7 6.7 M17.3 17.3 L19.1 19.1 M4.9 19.1 L6.7 17.3 M17.3 6.7 L19.1 4.9" /></Wrap>,
};
