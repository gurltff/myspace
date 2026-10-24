import type { PatternSection } from './pattern';
import type { Rng } from './numerical';

export interface PoolQuestion {
  id: string;
  text: string;
  marks?: number;
  unitId?: string;
  topicId?: string;
  source: 'pyq' | 'generated' | 'mine' | 'variant';
  timesPractised: number;
}

export interface GenContext {
  topicFreq: Record<string, number>;
  unitPct: Record<string, number>;
  /** topicId -> mastery 0..100 or null */
  mastery: Record<string, number | null>;
  recentIds: Set<string>;
}

export interface GenOptions {
  mode: 'full' | 'unit' | 'weak' | 'custom';
  unitIds?: string[];
  customMarks?: number;
  /** 0..1 share of original PYQs (rest generated/variants/mine) */
  originalRatio: number;
}

export interface GenSection {
  name: string;
  instruction?: string;
  questions: { questionId: string; marks: number }[];
}

export function questionWeight(q: PoolQuestion, ctx: GenContext): number {
  let w = 1;
  if (q.topicId) w += Math.min(3, (ctx.topicFreq[q.topicId] ?? 0) * 0.5);
  if (q.unitId) w += (ctx.unitPct[q.unitId] ?? 0) / 25;
  const m = q.topicId ? ctx.mastery[q.topicId] : undefined;
  if (m === null || m === undefined) w += 1;
  else w += ((100 - m) / 100) * 2;
  if (q.timesPractised === 0) w += 1;
  if (ctx.recentIds.has(q.id)) w *= 0.1;
  return w;
}

function weightedPick<T>(items: T[], weight: (t: T) => number, rng: Rng): T | undefined {
  const total = items.reduce((a, t) => a + weight(t), 0);
  if (!items.length || total <= 0) return undefined;
  let r = rng() * total;
  for (const t of items) {
    r -= weight(t);
    if (r <= 0) return t;
  }
  return items[items.length - 1];
}

export function filterPool(pool: PoolQuestion[], ctx: GenContext, o: GenOptions): PoolQuestion[] {
  let p = pool;
  if (o.mode === 'unit' && o.unitIds?.length) p = p.filter((q) => q.unitId && o.unitIds!.includes(q.unitId));
  if (o.mode === 'weak')
    p = p.filter((q) => {
      if (!q.topicId) return false;
      const m = ctx.mastery[q.topicId];
      return m === null || m === undefined || m < 50;
    });
  return p;
}

export function generatePaper(
  sections: PatternSection[],
  pool: PoolQuestion[],
  ctx: GenContext,
  o: GenOptions,
  rng: Rng,
): GenSection[] {
  const available = filterPool(pool, ctx, o);
  const used = new Set<string>();
  const pick = (marks: number): PoolQuestion | undefined => {
    const fresh = available.filter((q) => !used.has(q.id));
    const wantOriginal = rng() < o.originalRatio;
    const bucket = (orig: boolean) => fresh.filter((q) => (q.source === 'pyq') === orig);
    const tryMarks = (list: PoolQuestion[]) => {
      if (!marks) return list;
      const exact = list.filter((q) => q.marks === marks);
      if (exact.length) return exact;
      const near = list.filter((q) => q.marks && Math.abs(q.marks - marks) <= Math.max(1, marks * 0.4));
      return near.length ? near : list.filter((q) => !q.marks);
    };
    let cands = tryMarks(bucket(wantOriginal));
    if (!cands.length) cands = tryMarks(bucket(!wantOriginal));
    if (!cands.length) cands = tryMarks(fresh);
    const q = weightedPick(cands, (x) => questionWeight(x, ctx), rng);
    if (q) used.add(q.id);
    return q;
  };

  if (o.mode === 'custom' && o.customMarks) {
    const qs: { questionId: string; marks: number }[] = [];
    let total = 0;
    let guard = 0;
    while (total < o.customMarks && guard++ < 200) {
      const q = pick(0);
      if (!q) break;
      const m = q.marks ?? 5;
      if (total + m > o.customMarks && qs.length) {
        continue;
      }
      qs.push({ questionId: q.id, marks: m });
      total += m;
    }
    return [{ name: 'Section A', instruction: 'Attempt all questions.', questions: qs }];
  }

  return sections.map((s) => {
    const qs: { questionId: string; marks: number }[] = [];
    for (let i = 0; i < s.questionCount; i++) {
      const q = pick(s.marksEach);
      if (q) qs.push({ questionId: q.id, marks: s.marksEach || q.marks || 0 });
    }
    return { name: s.name, instruction: s.instruction, questions: qs };
  });
}
