import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useStore, update, markStudied } from '../store/store';
import { activeSubjects } from '../store/derive';
import { addDays, parseYmd, prettyDate, ymd } from '../lib/dates';
import { HeartBox, Note, TrebleClef, WingedHeart, Annot, HeartBadge } from './Stickers';
import { Box } from './ui';

const EASE = [0.22, 1, 0.36, 1] as const;

/** "Postcard front": heart box art on music-staff paper + the day's tasks written on the lines. */
export function TrackPlayer() {
  const s = useStore((x) => x);
  const today = ymd();
  const [offset, setOffset] = useState(0);
  const [dir, setDir] = useState(1);
  const day = addDays(today, offset);
  const subs = activeSubjects(s);
  const tasks = s.planTasks.filter((t) => t.date === day && subs.some((x) => x.id === t.subjectId));
  const name = (id: string) => s.topics.find((t) => t.id === id)?.name ?? '?';
  const step = (n: number) => { setDir(n); setOffset(offset + n); };
  const label = offset === 0 ? "Today's tasks" : offset === 1 ? 'Tomorrow' : offset === -1 ? 'Yesterday' : prettyDate(day);

  return (
    <div className="relative">
      <Annot className="-top-7 right-6 z-30" arrowStyle={{ rotate: '60deg' }}>front</Annot>
      <Box delay={0.1} className="!p-0">
        <div className="grid sm:grid-cols-[1.05fr_1fr]">
          <div className="relative staff-paper min-h-[230px] rounded-tl-lg sm:rounded-bl-lg overflow-hidden hero-art">
            <TrebleClef size={70} className="absolute left-4 top-4 opacity-50" color="#d98c9a" />
            <Note size={30} className="absolute left-[38%] top-6 opacity-60" color="#d98c9a" />
            <Note size={34} double className="absolute right-8 top-10 opacity-60" color="#d98c9a" />
            <HeartBox size={250} className="absolute left-1/2 -translate-x-1/2 bottom-2" style={{ animation: 'bob 7s ease-in-out infinite' }} />
            <span className="absolute left-3 bottom-2 font-hand text-[15px] text-muted">studynest ♥</span>
          </div>
          <div className="p-4 sm:border-l-[1.5px] border-dashed border-line/50 relative">
            <div className="flex items-center justify-between">
              <h2 className="font-hand text-[28px] leading-none">Postcard</h2>
              <div className="w-12 h-14 border-[1.5px] border-dashed border-line rounded grid place-items-center bg-panel2"><WingedHeart size={18} /></div>
            </div>
            <AnimatePresence mode="wait" custom={dir}>
              <motion.div key={day} initial={{ opacity: 0, x: 20 * dir }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 * dir }} transition={{ duration: 0.5, ease: EASE }}>
                <p className="font-bubble text-[20px] mt-1 text-[#c9707f]">{label}</p>
                <ol className="mt-1 text-[14px]" style={{ backgroundImage: 'repeating-linear-gradient(transparent 0 25px, rgba(110,70,64,.3) 25px 26px)', lineHeight: '26px', minHeight: 104 }}>
                  {tasks.length ? tasks.map((t, i) => (
                    <li key={t.id}>
                      <button
                        onClick={() => { update((d) => { const x = d.planTasks.find((q) => q.id === t.id)!; x.done = !x.done; if (x.done) { const tp = d.topics.find((q) => q.id === x.topicId); if (tp) tp.lastRevised = today; } }); markStudied(); }}
                        className={`text-left w-full truncate hover:translate-x-1 transition-transform duration-500 ${t.done ? 'line-through opacity-55' : ''}`}
                        title="tap to mark done"
                      >
                        <span className="font-hand text-[17px]">{String(i + 1).padStart(2, '0')}.</span> {name(t.topicId)} <span className="text-muted text-[12px]">· {t.hours}h{t.kind === 'revision' ? ' · rev' : ''}</span>
                      </button>
                    </li>
                  )) : <li className="text-muted">no tasks — a rest day ☁</li>}
                </ol>
              </motion.div>
            </AnimatePresence>
            <div className="font-hand text-[18px] mt-1 leading-tight">
              <div>to: <span className="text-muted">future me</span></div>
              <div>from: <span className="text-muted">studynest</span></div>
            </div>
            <div className="flex gap-2 mt-2 items-center">
              <button className="orb !w-9 !h-9 text-[13px]" onClick={() => step(-1)} aria-label="previous day">◀</button>
              <button className="orb !w-9 !h-9 text-[13px]" onClick={() => step(1)} aria-label="next day">▶</button>
              {offset !== 0 && <button className="nest-btn small ghost" onClick={() => { setDir(offset > 0 ? -1 : 1); setOffset(0); }}>today</button>}
            </div>
          </div>
        </div>
      </Box>
    </div>
  );
}

/** Mini calendar with a house-shaped header; dots mark planned days. */
export function MiniCalendar() {
  const s = useStore((x) => x);
  const today = ymd();
  const [cursor, setCursor] = useState(today);
  const cur = parseYmd(cursor);
  const subs = activeSubjects(s);
  const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
  const n = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
  const days: (string | null)[] = [...Array(first.getDay()).fill(null), ...Array.from({ length: n }, (_, i) => ymd(new Date(cur.getFullYear(), cur.getMonth(), i + 1)))];
  const planned = new Set(s.planTasks.map((t) => t.date));
  const exams = new Set(subs.map((x) => x.examDate).filter(Boolean));
  const step = (k: number) => setCursor(ymd(new Date(cur.getFullYear(), cur.getMonth() + k, 1)));
  return (
    <div className="relative">
      <Annot className="-top-6 -left-2 z-30" flip arrowStyle={{ rotate: '-60deg' }}>Mini Calendar</Annot>
      <Box delay={0.2} className="!pt-2">
        <div className="relative mx-auto w-[88%]">
          <svg viewBox="0 0 200 70" className="w-full" aria-hidden><path d="M10 68 V30 L100 4 L190 30 V68Z" fill="var(--choco)" stroke="var(--cream)" strokeWidth="3" strokeLinejoin="round" /></svg>
          <div className="absolute inset-0 flex items-end justify-between pb-1 px-3">
            <button onClick={() => step(-1)} className="text-cream text-[14px] hover:scale-125 transition" aria-label="previous month">◀</button>
            <span className="font-hand text-[24px] text-cream leading-none">{cur.toLocaleDateString('en', { month: 'long' })}</span>
            <button onClick={() => step(1)} className="text-cream text-[14px] hover:scale-125 transition" aria-label="next month">▶</button>
          </div>
        </div>
        <div className="grid grid-cols-7 text-center text-[11px] font-bold text-muted mt-2">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <motion.div key={cursor.slice(0, 7)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE }} className="grid grid-cols-7 gap-[3px] mt-1">
          {days.map((d, i) => (
            <div key={d ?? 'e' + i} className="aspect-square border border-line/40 rounded-[3px] text-[11px] relative grid place-items-center"
              style={{ background: !d ? 'transparent' : d === today ? 'var(--pink)' : exams.has(d) ? 'var(--choco)' : 'var(--panel2)', color: d && exams.has(d) ? 'var(--cream)' : 'var(--ink)', borderColor: d ? undefined : 'transparent' }}>
              {d && parseYmd(d).getDate()}
              {d && planned.has(d) && !exams.has(d) && <span className="absolute bottom-0.5 text-[7px] text-[#c9707f]">♥</span>}
            </div>
          ))}
        </motion.div>
        <p className="text-[12px] text-muted mt-2">♥ planned · pink = today · brown = exam</p>
      </Box>
    </div>
  );
}

export function ExamHeart() {
  const s = useStore((x) => x);
  const today = ymd();
  const next = activeSubjects(s).filter((x) => x.examDate && x.examDate >= today).sort((a, b) => a.examDate!.localeCompare(b.examDate!))[0];
  if (!next) return null;
  const d = Math.round((parseYmd(next.examDate!).getTime() - parseYmd(today).getTime()) / 86400000);
  return (
    <HeartBadge size={150} style={{ animation: 'bob 5s ease-in-out infinite', ['--r' as string]: '-6deg' }}>
      {next.name}<br />exam in<br /><span style={{ fontSize: '1.6em' }}>{d}d</span>
    </HeartBadge>
  );
}
