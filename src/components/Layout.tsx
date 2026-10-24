import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { Icon } from './Icons';
import { WingedHeart, Rosette, Bunny, Annot, DoodleColumn, Note, TrebleClef, Sparkle, Bow } from './Stickers';
import { Box } from './ui';
import { useStore, update } from '../store/store';
import { activeSubjects, buildNudges, cardsDue } from '../store/derive';
import { streak } from '../lib/mastery';
import { diffDays, prettyDate, ymd } from '../lib/dates';
import { useTheme } from './theme';

const EASE = [0.22, 1, 0.36, 1] as const;

export const NAV = [
  { group: 'me, myself & i', items: [
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
  { text: '♥ romanticize ur studies ♥', bg: '#fbe1e4' },
  { text: 'i ♥ physics', bg: '#fff', blink: true },
  { text: 'dear love, pls pass', bg: 'radial-gradient(#f2b7c1 1.6px, #fff6f3 1.8px) 0 0/8px 8px' },
  { text: '∮ maxwell fan club ∮', bg: '#f7e1d5' },
  { text: 'choco & coffee', bg: '#e9c9b8' },
  { text: 'E = mc² ♪', bg: '#fff3ec' },
  { text: 'wishful study club', bg: 'repeating-linear-gradient(45deg,#f9d9de 0 6px,#fff3f3 6px 12px)', blink: true },
  { text: 'crush it anyway!', bg: '#f2b7c1' },
];

export function DreamBg() {
  return (
    <div className="dream-bg" aria-hidden>
      <div className="dots" />
      <DoodleColumn className="hidden sm:flex" style={{ left: 6 }} />
      <DoodleColumn className="hidden sm:flex" style={{ right: 6 }} />
      <TrebleClef size={90} className="absolute opacity-25" color="var(--doodle)" style={{ left: '30%', bottom: '6%' }} />
      <Note size={40} double className="absolute opacity-25" color="var(--doodle)" style={{ right: '22%', top: '14%' }} />
      {[[14, 22], [36, 9], [64, 6], [90, 48], [20, 80], [74, 88], [52, 56]].map(([x, y], i) => (
        <Sparkle key={i} size={10 + (i % 3) * 5} className="twinkle" style={{ left: `${x}%`, top: `${y}%`, animationDelay: `${i * 0.6}s` }} />
      ))}
    </div>
  );
}

function Sparkles() {
  useEffect(() => {
    if (window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let last = 0;
    const glyphs = ['♥', '♡', '♪', '♫'];
    const onMove = (e: MouseEvent) => {
      const now = performance.now();
      if (now - last < 90) return;
      last = now;
      const s = document.createElement('span');
      s.className = 'sparkle';
      s.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      s.style.left = e.clientX + 'px';
      s.style.top = e.clientY + 'px';
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 1100);
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return null;
}

function ThemeButton() {
  const [theme, toggle] = useTheme();
  return (
    <button onClick={toggle} className="orb !w-10 !h-10" aria-label="toggle theme" title="toggle light/dark">
      {theme === 'dark' ? <Icon.sun size={18} /> : <Icon.moon size={18} />}
    </button>
  );
}

const PAGE_BADGE: Record<string, string> = {
  '': 'personalized studies ♥', subjects: 'study plan ♥', pyqs: 'past papers ♥', practicals: 'lab notes ♥',
  assessment: 'quiz time ♥', ramble: 'dear diary ♥', settings: 'settings ♥',
};

function MailHeader() {
  const loc = useLocation();
  const nav = useNavigate();
  const month = new Date().toLocaleDateString('en', { month: 'long' });
  const seg = loc.pathname.split('/')[1] ?? '';
  return (
    <motion.header initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE }} className="mail-header no-print">
      <NavLink to="/" className="nest-title text-[38px] sm:text-[58px] lg:text-[68px] leading-none">{month} Mail</NavLink>
      <WingedHeart size={46} className="hidden sm:block -ml-2" />
      <span className="flex-1" />
      <AnimatePresence mode="wait">
        <motion.span key={seg} initial={{ opacity: 0, scale: 0.9, rotate: -6 }} animate={{ opacity: 1, scale: 1, rotate: -4 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.45, ease: EASE }} className="mail-badge hidden sm:inline-flex">
          {PAGE_BADGE[seg] ?? 'studynest ♥'}
        </motion.span>
      </AnimatePresence>
      <div className="flex gap-2 items-center">
        <button className="orb !w-10 !h-10 hidden sm:grid" onClick={() => nav(-1)} aria-label="back">‹</button>
        <ThemeButton />
      </div>
    </motion.header>
  );
}

function NavBox() {
  return (
    <Box variant="choco" title="menu ♥" delay={0.1}>
      {NAV.map((g, gi) => (
        <div key={g.group} className="mb-2">
          <h3 className="font-bubble text-[15px] mt-1 mb-0.5 px-1 text-pink">{g.group}</h3>
          {g.items.map((it, i) => (
            <motion.div key={it.to} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.2 + (gi * 3 + i) * 0.05 }}>
              <NavLink to={it.to} end={it.to === '/'} className={({ isActive }) => `nest-link ${isActive ? 'active' : ''}`}>
                <it.icon size={18} />
                <span>{it.label}</span>
              </NavLink>
            </motion.div>
          ))}
        </div>
      ))}
      <p className="font-hand text-[17px] text-pink mt-2 leading-tight">sign up any time,<br />no AI, just rules ♥</p>
    </Box>
  );
}

function ChatBox() {
  const n = useStore((s) => buildNudges(s));
  return (
    <Box title="Postcard" delay={0.2} className="staff-paper">
      <div className="max-h-[300px] overflow-y-auto nest-scroll pr-1 space-y-2 text-[14px] leading-[26px]">
        {n.map((t, i) => (
          <motion.p key={t} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: EASE, delay: 0.35 + i * 0.08 }}>
            <span className="text-[#c9707f]">♥</span> {t}
          </motion.p>
        ))}
      </div>
      <div className="font-hand text-[18px] mt-2 border-t border-dashed border-line/40 pt-1">
        <div>to: <span className="text-muted">you</span></div>
        <div>from: <span className="text-muted">tutor-chan</span></div>
      </div>
    </Box>
  );
}

function StatsBox() {
  const s = useStore((x) => x);
  const subs = activeSubjects(s);
  const st = streak(s.studyDays, ymd());
  const due = cardsDue(s).length;
  const next = subs.filter((x) => x.examDate && x.examDate >= ymd()).sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0];
  const row = (k: string, v: ReactNode) => <div className="flex justify-between gap-3"><span>{k}:</span><span className="text-right">{v}</span></div>;
  return (
    <Box variant="notepad" bar="Wishful Study Club" delay={0.15}>
      <p className="mb-2 text-[13.5px] font-news italic leading-snug">Dear {s.settings.name}, this little paper holds your syllabus, pyqs, practicals and rambles ♥</p>
      <div className="space-y-0.5 text-[13.5px]" style={{ columnRule: '1px solid var(--line)' }}>
        {row('created', prettyDate(s.settings.createdAt))}
        {row('updated', prettyDate(s.updatedAt.startsWith('1970') ? ymd() : ymd(new Date(s.updatedAt))))}
        {row('visits', s.settings.visits)}
        {row('cards due', due)}
        {next && row('next exam', `${next.name} · ${diffDays(ymd(), next.examDate!)}d`)}
      </div>
    </Box>
  );
}

function NowStudying() {
  const s = useStore((x) => x);
  const st = streak(s.studyDays, ymd());
  const t = s.planTasks.find((p) => p.date === ymd() && !p.done);
  const topic = t && s.topics.find((x) => x.id === t.topicId);
  return (
    <div className="relative flex items-start gap-1 -my-2">
      <Rosette size={120} className="shrink-0" style={{ animation: 'sway 7s ease-in-out infinite', transformOrigin: 'top center' }}>
        <span className="font-bubble text-[22px] leading-none">{st}</span><br />days ♥
      </Rosette>
      <div className="pt-6 font-hand text-[18px] leading-tight min-w-0">
        <div className="text-muted text-[15px]">now studying:</div>
        <div className="truncate">{topic?.name ?? 'free time ☁'}</div>
      </div>
    </div>
  );
}

function Blinkies() {
  return (
    <div className="relative">
      <Box title="Dear Love" delay={0.3} className="!pt-3" right={<Bunny size={34} />}>
        <div className="grid grid-cols-1 gap-2.5" style={{ backgroundImage: 'radial-gradient(rgba(242,183,193,.6) 1.4px, transparent 1.6px)', backgroundSize: '10px 10px' }}>
          {BLINKIES.map((b, i) => (
            <motion.div key={b.text} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, ease: EASE, delay: 0.4 + i * 0.05 }}
              className={`blinkie ${b.blink ? 'blink' : ''}`} style={{ background: b.bg, transform: `rotate(${(i % 3) - 1}deg)` }}>
              <span>{b.text}</span>
            </motion.div>
          ))}
        </div>
        <p className="text-center font-hand text-[15px] mt-2 text-muted">⑧ usable stickers!</p>
      </Box>
      <p className="absolute -right-9 top-24 font-hand text-[22px] text-choco dark:text-pink" style={{ writingMode: 'vertical-rl' }}>Sticker Sheet</p>
    </div>
  );
}

function BottomBar() {
  const items = NAV.flatMap((g) => g.items).filter((i) => !['/blog', '/settings'].includes(i.to));
  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-50 px-2 pb-[max(env(safe-area-inset-bottom),6px)] pt-1.5 no-print">
      <div className="nest-box flex justify-around py-1 px-1">
        {items.map((it) => (
          <NavLink key={it.to} to={it.to} end={it.to === '/'} className="relative flex flex-col items-center px-1.5 py-0.5 rounded-xl text-[11px] font-round font-bold">
            {({ isActive }) => (
              <>
                {isActive && <motion.span layoutId="bottom-pill" className="absolute inset-0 rounded-xl border border-line" style={{ background: 'var(--pink)' }} transition={{ duration: 0.5, ease: EASE }} />}
                <span className="relative"><it.icon size={21} /></span>
                <span className="relative text-ink">{it.short}</span>
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
  const name = useStore((s) => s.settings.name);
  useEffect(() => {
    const today = ymd();
    if (localStorage.getItem('studynest:visit') !== today) {
      localStorage.setItem('studynest:visit', today);
      update((d) => void (d.settings.visits += 1));
    }
  }, []);
  useEffect(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [loc.pathname]);

  return (
    <div className="min-h-screen pb-24 lg:pb-10 relative isolate">
      <DreamBg />
      <Sparkles />
      <div className="relative z-30 px-4 sm:px-6 pt-3 lg:pt-6 mx-auto max-w-[1260px]">
        <MailHeader />
      </div>

      <div className="relative z-10 mx-auto max-w-[1260px] px-4 sm:px-6 pt-4 lg:pt-6 grid gap-6 lg:grid-cols-[230px_minmax(0,1fr)_240px]">
        <aside className="hidden lg:flex flex-col gap-6 relative no-print">
          <Annot className="!relative self-end -mb-7 mr-2 z-20" arrowStyle={{ rotate: '70deg' }}>menu</Annot>
          <NavBox />
                    <Annot className="!relative self-end -mb-7 mr-2 z-20" arrowStyle={{ rotate: '70deg' }}>notes 4 u</Annot>
          <ChatBox />
          <div className="relative">
            <div className="nest-box choco !rounded-lg px-4 py-3">
              <p className="font-bubble text-[22px] leading-tight text-cream">GET IT ALL</p>
              <p className="font-hand text-[18px] leading-tight text-pink">+ study streak, flashcards & pyqs</p>
              <p className="font-bubble text-[30px] leading-none text-cream mt-1">₹0 / $0</p>
              <p className="font-hand text-[16px] text-pink leading-tight">made by {name} ♥</p>
            </div>
          </div>
        </aside>

        <main className="min-w-0 relative">
          <Bow size={86} className="sticker sway hidden md:block" style={{ right: -18, top: -30, ['--r' as string]: '8deg' }} />
          <AnimatePresence mode="wait">
            <motion.div
              key={loc.pathname.split('/')[1]}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.5, ease: EASE }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
          <p className="text-center mt-8 font-bubble text-[22px] text-choco dark:text-pink flex items-center justify-center gap-2"><Bunny size={40} /> @studynest</p>
        </main>

        <aside className="hidden lg:flex flex-col gap-6 relative no-print">
          <Annot className="!relative self-start -mb-7 ml-1 z-20" arrowStyle={{ rotate: '70deg' }}>study club</Annot>
          <StatsBox />
          <NowStudying />
          <Blinkies />
        </aside>
      </div>
      <BottomBar />
    </div>
  );
}
