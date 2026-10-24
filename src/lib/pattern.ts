export interface PatternSection {
  name: string;
  instruction?: string;
  attempt?: number | 'all';
  questionCount: number;
  marksEach: number;
  totalMarks: number;
}
export interface PaperPattern {
  sections: PatternSection[];
  totalMarks: number;
  durationHours: number;
  unitWeight: { unitId: string; marks: number; pct: number }[];
  topicFreq: { topicId: string; count: number; marks: number }[];
  marksDist: { marks: number; count: number }[];
  stems: { stem: string; count: number }[];
  paperCount: number;
}

interface PaperIn {
  id: string;
  sections?: { name: string; instruction?: string; attempt?: number | 'all' }[];
  totalMarks?: number;
  durationHours?: number;
}
interface QIn {
  paperId?: string;
  section?: string;
  marks?: number;
  unitId?: string;
  topicId?: string;
  stem?: string;
}

function mode<T>(arr: T[]): T | undefined {
  const c = new Map<T, number>();
  for (const x of arr) c.set(x, (c.get(x) ?? 0) + 1);
  let best: T | undefined;
  let n = 0;
  for (const [k, v] of c) if (v > n) [best, n] = [k, v];
  return best;
}

export function analyzePattern(papers: PaperIn[], questions: QIn[]): PaperPattern {
  const pq = questions.filter((q) => q.paperId && papers.some((p) => p.id === q.paperId));
  const sectionNames = [...new Set(pq.map((q) => q.section ?? 'Section A'))].sort();
  const sections: PatternSection[] = sectionNames.map((name) => {
    const perPaperCounts = papers
      .map((p) => pq.filter((q) => q.paperId === p.id && (q.section ?? 'Section A') === name).length)
      .filter((n) => n > 0);
    const marks = pq.filter((q) => (q.section ?? 'Section A') === name && q.marks).map((q) => q.marks!);
    const meta = papers.flatMap((p) => p.sections ?? []).filter((s) => s.name === name);
    const attempt = mode(meta.map((m) => m.attempt).filter((a) => a !== undefined));
    const questionCount = mode(perPaperCounts) ?? 0;
    const marksEach = mode(marks) ?? 0;
    const attemptN = attempt === 'all' || attempt === undefined ? questionCount : Math.min(attempt, questionCount);
    return {
      name,
      instruction: meta.find((m) => m.instruction)?.instruction,
      attempt,
      questionCount,
      marksEach,
      totalMarks: attemptN * marksEach,
    };
  });

  const totalMarks =
    mode(papers.map((p) => p.totalMarks).filter(Boolean) as number[]) ?? sections.reduce((a, s) => a + s.totalMarks, 0);
  const durationHours = mode(papers.map((p) => p.durationHours).filter(Boolean) as number[]) ?? 3;

  const unitMarks = new Map<string, number>();
  const topicMap = new Map<string, { count: number; marks: number }>();
  const dist = new Map<number, number>();
  const stemMap = new Map<string, number>();
  for (const q of questions) {
    const m = q.marks ?? 0;
    if (q.unitId) unitMarks.set(q.unitId, (unitMarks.get(q.unitId) ?? 0) + (m || 1));
    if (q.topicId) {
      const t = topicMap.get(q.topicId) ?? { count: 0, marks: 0 };
      topicMap.set(q.topicId, { count: t.count + 1, marks: t.marks + m });
    }
    if (m) dist.set(m, (dist.get(m) ?? 0) + 1);
    if (q.stem) stemMap.set(q.stem, (stemMap.get(q.stem) ?? 0) + 1);
  }
  const unitTotal = [...unitMarks.values()].reduce((a, b) => a + b, 0) || 1;
  return {
    sections,
    totalMarks,
    durationHours,
    unitWeight: [...unitMarks].map(([unitId, marks]) => ({ unitId, marks, pct: Math.round((marks / unitTotal) * 100) })),
    topicFreq: [...topicMap].map(([topicId, v]) => ({ topicId, ...v })).sort((a, b) => b.count - a.count),
    marksDist: [...dist].map(([marks, count]) => ({ marks, count })).sort((a, b) => a.marks - b.marks),
    stems: [...stemMap].map(([stem, count]) => ({ stem, count })).sort((a, b) => b.count - a.count),
    paperCount: papers.length,
  };
}
