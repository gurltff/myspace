import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icons';
import { CatSticker, DangoSticker, DinoSticker, NoteSticker, StarSticker, MushroomSticker } from './Stickers';
import { useStore, update } from '../store/store';
import { activeSubjects, buildNudges, cardsDue } from '../store/derive';
import { streak } from '../lib/mastery';
import { diffDays, prettyDate, ymd } from '../lib/dates';
import { useTheme } from './theme';

export const NAV = [
  { group: 'me, myself, and i', items: [
    { to: '/', label: 'dashboard', short: 'home', icon: Icon.home },
    { to: '/ramble', label: 'ramble', short: 'ramble', icon: Icon.pencil },
  ] },
  { group: 'studies', items: [
    { to: '/subjects', label: 'subjects & plan', short: 'plan', icon: Icon.book },
    { to: '/pyqs', label: 'pyqs & papers', short: 'pyqs', icon: Icon.scroll },
    { to: '/practicals', label: 'practicals', short: 'labs', icon: Icon.flask },
    { to: '/assessment', label: 'assessment', short: 'quiz', icon: Icon.cards },
  ] },
  { group: 'site', items: [
    { to: '/blog', label: 'public blog', short: 'blog', icon: Icon.globe },
    { to: '/settings', label: 'settings & data', short: 'settings', icon: Icon.gear },
  ] },
];

const BLINKIES: { text: string; bg: string; blink?: boolean }[] = [
  { text: '✿ do what makes u happy ✿', bg: 'repeating-linear-gradient(90deg,#fbd3dc 0 8px,#fde7ec 8px 16px)' },
  { text: 'i ♥ physics', bg: '#fff', blink: true },
  { text: 'happy study 2 u !!', bg: 'radial-gradient(#f9e7a7 2px, #fff6d6 2px) 0 0/8px 8px' },
  { text: '∮ maxwell fan club ∮', bg: 'repeating-linear-gradient(90deg,#c8dcef 0 10px,#e3eef8 10px 20px)' },
  { text: 'ow ow ow (pyqs)', bg: '#f6c3cd', blink: true },
  { text: 'i ♥ cats', bg: 'repeating-linear-gradient(45deg,#e9dcf6 0 6px,#f6effc 6px 12px)' },
  { text: 'E = mc² ☆', bg: '#cfe6bd' },
  { text: '☆ shooting star ☆', bg: 'linear-gradient(90deg,#fff3c4,#fde1ea,#e1eefc)' },
  { text: 'soft & warm', bg: '#f7e6d3' },
  { text: '~ just keep studying ~', bg: 'repeating-linear-gradient(90deg,#cbb9ea 0 10px,#e0d4f4 10px 20px)', blink: true },
  { text: 'strawberry sundae', bg: '#fbd3dc' },
];

function Sparkles() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = 0;
    const glyphs = ['✦', '✧', '⋆', '♡', '✿'];
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - last < 70) return;
      last = now;
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      s.style.color = ['#f3b8c2', '#a9bf96', '#f5dd96', '#bcd3ea'][Math.floor(Math.random() * 4)];
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 900);
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return null;
}

function NavBox() {
  return (
    <div className="nest-box p-3 relative">
      <h2 className="nest-pill mb-2">nav</h2>
      {NAV.map((g, gi) => (
        <div key={g.group} className="mb-2">
          <h3 className="font-round font-extrabold text-[17px] mt-2 mb-0.5 px-1">{g.group}</h3>
          {g.items.map((it, i) => (
            <motion.div key={it.to} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + (gi * 3 + i) * 0.05 }}>
              <NavLink to={it.to} end={it.to === '/'} className={({ isActive }) => `nest-link ${isActive ? 'active' : ''}`}>
                <it.icon size={20} />
                <span>{it.label}</span>
              </NavLink>
            </motion.div>
          ))}
        </div>
      ))}
    </div>
  );
}

function ChatBox() {
  const n = useStore((s) => buildNudges(s));
  return (
    <div className="nest-box p-3">
      <h2 className="nest-pill mb-2">chatbox</h2>
      <div className="max-h-[300px] overflow-y-auto nest-scroll pr-1 space-y-2">
        {n.map((t, i) => (
          <motion.div key={t} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }} className="flex gap-2 text-[15px] leading-tight">
            <span className="w-8 h-8 shrink-0 rounded-md border-2 border-line bg-pill grid place-items-center text-[16px]">{['🐱', '🍡', '🦕', '⭐', '🍄'][i % 5]}</span>
            <div>
              <div className="flex justify-between gap-2 text-[13px] text-muted"><b>tutor-chan</b><span>today</span></div>
              <p>{t}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StatsBox() {
  const s = useStore((x) => x);
  const subs = activeSubjects(s);
  const st = streak(s.studyDays, ymd());
  const due = cardsDue(s).length;
  const next = subs.filter((x) => x.examDate && x.examDate >= ymd()).sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0];
  return (
    <div className="nest-box p-3">
      <h2 className="nest-pill mb-2">site stats</h2>
      <div className="italic text-[16px] space-y-0.5 px-1">
        <div>Created: {prettyDate(s.settings.createdAt)}</div>
        <div>Updated: {prettyDate(s.updatedAt.slice(0, 10) === '1970-01-01' ? ymd() : ymd(new Date(s.updatedAt)))}</div>
        <div>Visits: {s.settings.visits}</div>
        <div>Streak: {st} day{st === 1 ? '' : 's'} 🔥</div>
        <div>Cards due: {due}</div>
        {next && <div>Next exam: {next.name} in {diffDays(ymd(), next.examDate!)}d</div>}
      </div>
    </div>
  );
}

function NowStudying() {
  const s = useStore((x) => x);
  const t = s.planTasks.find((p) => p.date === ymd() && !p.done);
  const topic = t && s.topics.find((x) => x.id === t.topicId);
  const sub = t && s.subjects.find((x) => x.id === t.subjectId);
  return (
    <div className="nest-box p-3">
      <p className="text-[15px] mb-1 px-1">now studying:</p>
      <div className="flex gap-3 items-center">
        <div className="w-16 h-16 shrink-0 rounded-md border-2 border-line grid place-items-center relative overflow-hidden" style={{ background: sub?.color ?? 'var(--pill)' }}>
          <div className="absolute inset-0" style={{ animation: 'spin-slow 8s linear infinite', background: 'conic-gradient(from 0deg, transparent, rgba(255,255,255,.5), transparent 30%)' }} />
          <span className="relative text-[26px]">📖</span>
        </div>
        <div className="text-[15px] leading-tight min-w-0">
          <div className="font-bold truncate">{topic?.name ?? 'nothing… free time!'}</div>
          <div className="text-muted truncate">{sub ? `by ${sub.name}` : 'go touch grass ☘'}</div>
        </div>
      </div>
    </div>
  );
}

function Blinkies() {
  return (
    <div className="nest-box p-3 space-y-1.5">
      {BLINKIES.map((b, i) => (
        <motion.div key={b.text} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 + i * 0.05 }}
          className={`blinkie ${b.blink ? 'blink' : ''}`} style={{ background: b.bg, ['--d' as string]: `${i * 0.3}s` }}>
          <span>{b.text}</span>
        </motion.div>
      ))}
    </div>
  );
}

function ThemeButton() {
  const [theme, toggle] = useTheme();
  return (
    <button onClick={toggle} className="nest-btn ghost small" aria-label="toggle theme" title="toggle light/dark">
      {theme === 'dark' ? <Icon.sun size={18} /> : <Icon.moon size={18} />}
    </button>
  );
}

function BottomBar() {
  const items = NAV.flatMap((g) => g.items).filter((i) => !['/blog', '/settings'].includes(i.to));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 no-print">
      <div className="nest-box flex justify-around py-1 px-1">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} className="relative flex flex-col items-center px-1.5 py-0.5 rounded-lg text-[12px] font-round">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="bottom-pill" className="absolute inset-0 rounded-lg bg-pill border-2 border-line" transition={{ type: 'spring', stiffness: 300, damping: 26 }} />}
                <span className="relative"><it.icon size={22} /></span>
                <span className="relative">{it.short}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const loc = useLocation();
  useEffect(() => {
    const today = ymd();
    if (localStorage.getItem('studynest:visit') !== today) {
      localStorage.setItem('studynest:visit', today);
      update((d) => void (d.settings.visits += 1));
    }
  }, []);
  useEffect(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [loc.pathname]);

  return (
    <div className="min-h-screen pb-24 lg:pb-8">
      <Sparkles />
      {/* mobile header */}
      <header className="lg:hidden sticky top-0 z-40 px-3 pt-2 no-print">
        <div className="nest-box flex items-center justify-between px-3 py-1.5">
          <NavLink to="/" className="font-bubble text-[20px] nest-title" style={{ WebkitTextStroke: '1px var(--line)' }}>StudyNest</NavLink>
          <div className="flex gap-1.5">
            <NavLink to="/blog" className="nest-btn ghost small" aria-label="public blog"><Icon.globe size={18} /></NavLink>
            <NavLink to="/settings" className="nest-btn ghost small" aria-label="settings"><Icon.gear size={18} /></NavLink>
            <ThemeButton />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-3 sm:px-4 pt-3 lg:pt-6 grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)_250px]">
        <aside className="hidden lg:flex flex-col gap-4 relative no-print">
          <NavBox />
          <DangoSticker size={84} className="sticker hidden xl:block" style={{ right: -40, top: 395, ['--r' as string]: '-14deg' }} />
          <ChatBox />
          <div className="flex justify-center"><ThemeButton /></div>
        </aside>

        <main className="min-w-0 relative">
          <CatSticker size={104} className="sticker hidden md:block" style={{ right: -10, top: -18 }} />
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname}
              initial={{ opacity: 0, y: 14, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>

        <aside className="hidden lg:flex flex-col gap-4 relative no-print">
          <DinoSticker size={84} className="sticker" style={{ right: -30, top: -28, ['--r' as string]: '8deg' }} />
          <StatsBox />
          <NowStudying />
          <NoteSticker size={42} className="sticker" style={{ left: -26, top: 200 }} />
          <Blinkies />
          <CatSticker size={90} mood="smug" className="sticker" style={{ left: -54, bottom: 110 }} />
          <StarSticker size={38} className="sticker" style={{ right: -14, bottom: 30, ['--r' as string]: '12deg' }} />
          <MushroomSticker size={50} className="sticker hidden xl:block" style={{ right: -36, top: 300 }} />
        </aside>
      </div>
      <BottomBar />
    </div>
  );
}
