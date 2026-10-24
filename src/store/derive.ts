import type { AppData, Subject } from './types';
import { masteryScore, nudges, streak } from '../lib/mastery';
import { boxPerformance } from '../lib/leitner';
import { analyzePattern, type PaperPattern } from '../lib/pattern';
import { behindBy } from '../lib/planner';
import { ymd } from '../lib/dates';

export function activeSubjects(s: AppData): Subject[] {
  const live = new Set(s.semesters.filter((x) => !x.archived).map((x) => x.id));
  return s.subjects.filter((x) => live.has(x.semesterId));
}

export function topicMastery(s: AppData, today = ymd()): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  const acc = new Map<string, number[]>();
  for (const a of s.attempts) if (a.topicId) acc.set(a.topicId, [...(acc.get(a.topicId) ?? []), a.score]);
  const boxes = new Map<string, number[]>();
  for (const c of s.flashcards) if (c.topicId) boxes.set(c.topicId, [...(boxes.get(c.topicId) ?? []), c.box]);
  for (const t of s.topics) {
    const a = acc.get(t.id);
    out[t.id] = masteryScore(
      {
        accuracy: a?.length ? a.reduce((x, y) => x + y, 0) / a.length : undefined,
        flash: boxPerformance(boxes.get(t.id) ?? []),
        confidence: t.confidence,
        lastRevised: t.lastRevised,
      },
      today,
    );
  }
  return out;
}

export function avgMastery(ids: string[], m: Record<string, number | null>): number | null {
  const v = ids.map((i) => m[i]).filter((x): x is number => x !== null && x !== undefined);
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

export function subjectPattern(s: AppData, subjectId: string): PaperPattern {
  const p = analyzePattern(
    s.papers.filter((p) => p.subjectId === subjectId),
    s.questions.filter((q) => q.subjectId === subjectId && q.approved),
  );
  return { ...p, ...(s.patternOverrides[subjectId] ?? {}) };
}

export function cardsDue(s: AppData, today = ymd()) {
  return s.flashcards.filter((c) => c.nextDue <= today);
}

export function buildNudges(s: AppData, today = ymd()): string[] {
  const subs = activeSubjects(s);
  const m = topicMastery(s, today);
  const name = (id: string) => s.subjects.find((x) => x.id === id)?.name ?? '';
  return nudges({
    today,
    topics: s.topics.filter((t) => subs.some((x) => x.id === t.subjectId)).map((t) => ({ id: t.id, name: t.name, subjectName: name(t.subjectId), lastRevised: t.lastRevised, mastery: m[t.id] })),
    units: subs.flatMap((sub) => {
      const pat = subjectPattern(s, sub.id);
      return pat.unitWeight.map((u) => {
        const unit = s.units.find((x) => x.id === u.unitId);
        return {
          name: unit?.name.split(':')[0] ?? 'A unit', subjectName: sub.name, pyqPct: u.pct,
          mastery: avgMastery(s.topics.filter((t) => t.unitId === u.unitId).map((t) => t.id), m),
        };
      });
    }),
    behind: subs.map((sub) => {
      const b = behindBy(s.planTasks.filter((t) => t.subjectId === sub.id), today);
      return { subjectName: sub.name, days: b.days, moved: 0 };
    }),
    practicals: subs.map((sub) => ({
      subjectName: sub.name, date: sub.practicalDate,
      notRevised: s.experiments.filter((e) => e.subjectId === sub.id && e.status !== 'revised').length,
    })),
    exams: subs.map((sub) => ({ subjectName: sub.name, date: sub.examDate })),
    cardsDue: cardsDue(s, today).length,
    streak: streak(s.studyDays, today),
  });
}
