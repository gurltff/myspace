import { addDays, diffDays } from './dates';

export interface MasteryInput {
  /** 0..1 average accuracy from papers/quizzes */
  accuracy?: number;
  /** 0..1 from flashcard boxes */
  flash?: number;
  /** 1..5 */
  confidence?: number | null;
  lastRevised?: string;
}

export function recencyScore(today: string, lastRevised?: string): number {
  if (!lastRevised) return 0;
  const d = diffDays(lastRevised, today);
  if (d <= 7) return 1;
  return Math.max(0, 1 - (d - 7) / 23); // decays to 0 at 30 days
}

/** 0..100, or null when the topic has no data ("Not started"). Missing parts are re-weighted. */
export function masteryScore(m: MasteryInput, today: string): number | null {
  const parts: [number, number][] = [];
  if (m.accuracy !== undefined) parts.push([0.4, m.accuracy]);
  if (m.flash !== undefined) parts.push([0.3, m.flash]);
  if (m.confidence) parts.push([0.2, (m.confidence - 1) / 4]);
  if (!parts.length) return null;
  parts.push([0.1, recencyScore(today, m.lastRevised)]);
  const w = parts.reduce((a, [x]) => a + x, 0);
  return Math.round((parts.reduce((a, [x, v]) => a + x * v, 0) / w) * 100);
}

export interface NudgeInput {
  today: string;
  topics: { id: string; name: string; subjectName: string; lastRevised?: string; mastery: number | null }[];
  units: { name: string; subjectName: string; pyqPct: number; mastery: number | null }[];
  behind: { subjectName: string; days: number; moved: number }[];
  practicals: { subjectName: string; date?: string; notRevised: number }[];
  exams: { subjectName: string; date?: string }[];
  cardsDue: number;
  streak: number;
}

/** Plain if/else rules → short nudges, most urgent first. */
export function nudges(n: NudgeInput): string[] {
  const out: { p: number; t: string }[] = [];
  for (const e of n.exams) {
    if (!e.date) continue;
    const d = diffDays(n.today, e.date);
    if (d >= 0 && d <= 3) out.push({ p: 10, t: `${e.subjectName} exam in ${d === 0 ? 'today!' : d + ' day' + (d > 1 ? 's' : '')}. Revision mode on ✿` });
  }
  for (const p of n.practicals) {
    if (!p.date) continue;
    const d = diffDays(n.today, p.date);
    if (d >= 0 && d <= 7 && p.notRevised > 0)
      out.push({ p: 9, t: `${p.subjectName} practical exam in ${d} days, ${p.notRevised} experiment${p.notRevised > 1 ? 's' : ''} not revised.` });
  }
  for (const b of n.behind)
    if (b.days > 0)
      out.push({ p: 8, t: `You're ${b.days} day${b.days > 1 ? 's' : ''} behind in ${b.subjectName}.${b.moved ? ` ${b.moved} topic${b.moved > 1 ? 's were' : ' was'} moved ahead.` : ' Hit "reschedule" to catch up.'}` });
  for (const u of n.units)
    if (u.pyqPct >= 25 && u.mastery !== null && u.mastery < 60)
      out.push({ p: 7, t: `${u.name} is ${u.pyqPct}% of ${u.subjectName} PYQ marks but your mastery is ${u.mastery}%. Focus here this week.` });
  const stale = n.topics
    .filter((t) => t.lastRevised && diffDays(t.lastRevised, n.today) >= 10)
    .sort((a, b) => (a.lastRevised! < b.lastRevised! ? -1 : 1))
    .slice(0, 2);
  for (const t of stale) out.push({ p: 5, t: `You haven't revised ${t.name} in ${diffDays(t.lastRevised!, n.today)} days.` });
  if (n.cardsDue >= 10) out.push({ p: 4, t: `${n.cardsDue} flashcards are waiting for you. A quick 10-minute review?` });
  if (n.streak >= 3) out.push({ p: 1, t: `${n.streak}-day study streak! keep it going ♡` });
  if (!out.length) out.push({ p: 0, t: 'All caught up — maybe practise one paper today? ☆' });
  return out.sort((a, b) => b.p - a.p).map((x) => x.t);
}

/** consecutive days (ending today or yesterday) on which something was studied */
export function streak(days: string[], today: string): number {
  const set = new Set(days);
  let d = set.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (set.has(d)) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}
