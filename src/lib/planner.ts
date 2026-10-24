import { addDays, diffDays, parseYmd } from './dates';

export type Difficulty = 'easy' | 'medium' | 'hard';
export const DIFF_WEIGHT: Record<Difficulty, number> = { easy: 1, medium: 1.5, hard: 2 };

export interface PlanSubject {
  id: string;
  examDate?: string;
}
export interface PlanTopic {
  id: string;
  subjectId: string;
  difficulty: Difficulty;
  /** 0 (strong) .. 1 (weak) — weak topics come first in revision */
  weakness: number;
  order: number;
}
export interface PlanOptions {
  start: string;
  hoursPerDay: number;
  daysOff: string[];
  weekdaysOff: number[];
  /** fraction of days reserved for revision */
  revisionFraction?: number;
}
export interface PlannedTask {
  subjectId: string;
  topicId: string;
  date: string;
  kind: 'study' | 'revision';
  hours: number;
}

export function isOff(date: string, o: PlanOptions): boolean {
  return o.daysOff.includes(date) || o.weekdaysOff.includes(parseYmd(date).getDay());
}

export function availableDays(from: string, until: string, o: PlanOptions): string[] {
  const out: string[] = [];
  for (let d = from; d < until; d = addDays(d, 1)) if (!isOff(d, o)) out.push(d);
  return out;
}

/**
 * Rule-based plan:
 *  - each subject's available days before its exam are split 80/20 into study/revision
 *  - topics are spread across study days in proportion to their weight
 *  - on shared days the nearest exam is served first
 *  - revision days cycle through all topics, weakest first
 */
export function generatePlan(subjects: PlanSubject[], topics: PlanTopic[], o: PlanOptions, studyDoneIds: Set<string> = new Set()): PlannedTask[] {
  const rf = o.revisionFraction ?? 0.2;
  const subs = subjects.filter((s) => s.examDate && s.examDate > o.start).sort((a, b) => a.examDate!.localeCompare(b.examDate!));
  const tasks: PlannedTask[] = [];
  const info = subs.map((s) => {
    const days = availableDays(o.start, s.examDate!, o);
    const revCount = days.length >= 2 ? Math.max(1, Math.ceil(days.length * rf)) : 0;
    const studyDays = days.slice(0, days.length - revCount);
    const revDays = days.slice(days.length - revCount);
    const queue = topics.filter((t) => t.subjectId === s.id && !studyDoneIds.has(t.id)).sort((a, b) => a.order - b.order);
    return { s, studyDays, revDays, queue, all: topics.filter((t) => t.subjectId === s.id) };
  });

  const allDays = [...new Set(info.flatMap((i) => i.studyDays))].sort();
  for (const day of allDays) {
    let capacity = o.hoursPerDay;
    const active = info.filter((i) => i.queue.length && i.studyDays.includes(day));
    const dayTasks: PlannedTask[] = [];
    for (const i of active) {
      if (capacity <= 0) break;
      const daysLeft = i.studyDays.filter((d) => d >= day).length;
      const remaining = i.queue.reduce((a, t) => a + DIFF_WEIGHT[t.difficulty], 0);
      const pace = remaining / Math.max(1, daysLeft);
      let acc = 0;
      while (i.queue.length && (acc === 0 || acc + DIFF_WEIGHT[i.queue[0].difficulty] / 2 <= pace) && capacity > 0) {
        const t = i.queue.shift()!;
        const w = DIFF_WEIGHT[t.difficulty];
        acc += w;
        capacity -= w;
        dayTasks.push({ subjectId: i.s.id, topicId: t.id, date: day, kind: 'study', hours: w });
      }
    }
    // scale hours so the day's tasks fill the available study hours
    const used = dayTasks.reduce((a, t) => a + t.hours, 0);
    const scale = used ? o.hoursPerDay / used : 1;
    for (const t of dayTasks) t.hours = Math.round(t.hours * scale * 4) / 4;
    tasks.push(...dayTasks);
  }
  // overflow: if topics remain (not enough days), squeeze them onto the last study day
  for (const i of info) {
    const last = i.studyDays[i.studyDays.length - 1] ?? i.revDays[0];
    if (!last) continue;
    for (const t of i.queue) tasks.push({ subjectId: i.s.id, topicId: t.id, date: last, kind: 'study', hours: 0.5 });
    i.queue = [];
  }
  // revision
  for (const i of info) {
    if (!i.revDays.length) continue;
    const order = [...i.all].sort((a, b) => b.weakness - a.weakness || DIFF_WEIGHT[b.difficulty] - DIFF_WEIGHT[a.difficulty]);
    const per = Math.ceil(order.length / i.revDays.length);
    i.revDays.forEach((d, k) => {
      const chunk = order.slice(k * per, (k + 1) * per);
      const sharing = info.filter((x) => x.revDays.includes(d) || x.studyDays.includes(d)).length;
      const hrs = Math.round(((o.hoursPerDay / sharing) / Math.max(1, chunk.length)) * 4) / 4 || 0.25;
      for (const t of chunk) tasks.push({ subjectId: i.s.id, topicId: t.id, date: d, kind: 'revision', hours: hrs });
    });
  }
  return tasks.sort((a, b) => a.date.localeCompare(b.date));
}

export interface ExistingTask extends PlannedTask {
  id: string;
  done: boolean;
}

/** How many days behind: missed study weight divided by the average planned weight per day. */
export function behindBy(tasks: ExistingTask[], today: string): { missed: number; days: number } {
  const missed = tasks.filter((t) => t.date < today && !t.done);
  if (!missed.length) return { missed: 0, days: 0 };
  const dates = new Set(tasks.map((t) => t.date));
  const avg = tasks.length / Math.max(1, dates.size);
  return { missed: missed.length, days: Math.max(1, Math.round(missed.length / avg)) };
}

/** Keep completed tasks; regenerate everything not yet done from today onwards. */
export function reschedule(
  existing: ExistingTask[],
  subjects: PlanSubject[],
  topics: PlanTopic[],
  o: PlanOptions,
): { keep: ExistingTask[]; fresh: PlannedTask[]; moved: number } {
  const keep = existing.filter((t) => t.done);
  const doneStudy = new Set(keep.filter((t) => t.kind === 'study').map((t) => t.topicId));
  const moved = existing.filter((t) => !t.done && t.date < o.start).length;
  const fresh = generatePlan(subjects, topics, o, doneStudy);
  return { keep, fresh, moved };
}

export function daysUntil(today: string, date?: string): number | undefined {
  return date ? diffDays(today, date) : undefined;
}
