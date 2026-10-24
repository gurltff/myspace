import { describe, it, expect } from 'vitest';
import { parseSyllabus, undoSplit } from './syllabus';
import { splitQuestions, detectMarks, detectType, parseChoice } from './questions';
import { suggestTopic } from './tagging';
import { groupRepeats } from './repeats';
import { analyzePattern } from './pattern';
import { detectQuantities, toTemplate, generateValues, evaluateFormula, mulberry32, roundSig, countSigFigs, renderTemplate } from './numerical';
import { detectStem, generateSimilar, suggestGroups } from './stems';
import { generatePaper } from './paperGen';
import { generatePlan, behindBy } from './planner';
import { review, isDue } from './leitner';
import { masteryScore, nudges, streak } from './mastery';
import { computeRows, columnMean, percentError, finalResult } from './observations';
import { jaccard, tokenSet } from './text';

describe('syllabus parser', () => {
  const raw = `UNIT I: Rotational Dynamics (12 Hours)
Moment of inertia of ring, disc, solid sphere; Theorems of parallel and perpendicular axes
Angular momentum
Unit 2 - Elasticity
Hooke's law, Young's modulus (Y), Poisson's ratio`;
  it('detects units and splits topics', () => {
    const u = parseSyllabus(raw);
    expect(u).toHaveLength(2);
    expect(u[0].name).toBe('Unit I: Rotational Dynamics');
    expect(u[0].topics.map((t) => t.name)).toEqual([
      'Moment of inertia of ring', 'disc', 'solid sphere', 'Theorems of parallel and perpendicular axes', 'Angular momentum',
    ]);
    expect(u[1].topics.map((t) => t.name)).toContain("Young's modulus (Y)");
  });
  it('undoes a split', () => {
    const u = parseSyllabus(raw)[1];
    const merged = undoSplit(u, u.topics[0].sourceLine!);
    expect(merged.topics).toHaveLength(1);
  });
  it('can skip splitting', () => {
    expect(parseSyllabus(raw, { split: false })[0].topics).toHaveLength(2);
  });
});

describe('question splitter', () => {
  const paper = `Time: 3 Hours    Maximum Marks: 75
SECTION A
Attempt any five questions.
Q1. Derive the expression for moment of inertia of a disc. (5)
Q2 State and prove the theorem of parallel axes [5]
3. A wheel of mass 2 kg and radius 0.5 m rotates at 30 rad/s. Calculate its kinetic energy. 5 marks
Section B
Attempt all.
4. Answer the following: (a) Define Young's modulus. (2) (b) Write a short note on Poisson's ratio (3)`;
  it('splits questions, marks, sections', () => {
    const r = splitQuestions(paper);
    expect(r.durationHours).toBe(3);
    expect(r.totalMarks).toBe(75);
    expect(r.sections.map((s) => s.name)).toEqual(['Section A', 'Section B']);
    expect(r.sections[0].attempt).toBe(5);
    expect(r.sections[1].attempt).toBe('all');
    expect(r.questions).toHaveLength(5);
    expect(r.questions[0]).toMatchObject({ label: 'Q1', marks: 5, section: 'Section A' });
    expect(r.questions[2].marks).toBe(5);
    expect(r.questions[3]).toMatchObject({ label: 'Q4(a)', marks: 2, section: 'Section B' });
    expect(r.questions[4].text).toMatch(/short note/);
  });
  it('detects marks formats', () => {
    expect(detectMarks('foo (5)').marks).toBe(5);
    expect(detectMarks('foo [10]').marks).toBe(10);
    expect(detectMarks('foo 6M').marks).toBe(6);
    expect(detectMarks('foo (2+3)').marks).toBe(5);
  });
  it('types and choice', () => {
    expect(detectType('Calculate the speed if h = 5 m', 5)).toBe('numerical');
    expect(detectType('Define entropy', 2)).toBe('short');
    expect(parseChoice('Attempt any four')).toBe(4);
  });
});

describe('tagging & repeats', () => {
  const topics = [
    { id: 't1', name: 'Moment of inertia of disc', unitId: 'u1' },
    { id: 't2', name: "Young's modulus", unitId: 'u2' },
  ];
  it('suggests topic', () => {
    expect(suggestTopic('Derive moment of inertia of a uniform disc about its axis', topics)?.id).toBe('t1');
    expect(suggestTopic('Explain quantum tunnelling', topics)).toBeUndefined();
  });
  it('groups repeated questions', () => {
    const g = groupRepeats([
      { id: 'a', text: 'Derive the expression for moment of inertia of a disc about its axis' },
      { id: 'b', text: 'Derive an expression for the moment of inertia of a disc about its axis.' },
      { id: 'c', text: 'State Hooke law' },
    ]);
    expect(g).toEqual([['a', 'b']]);
  });
  it('jaccard', () => {
    expect(jaccard(tokenSet('wave optics'), tokenSet('wave optics'))).toBe(1);
  });
});

describe('pattern analysis', () => {
  it('derives section pattern and weightage', () => {
    const p = analyzePattern(
      [{ id: 'p1', sections: [{ name: 'Section A', attempt: 2 }], totalMarks: 10, durationHours: 3 }],
      [
        { paperId: 'p1', section: 'Section A', marks: 5, unitId: 'u1', topicId: 't1' },
        { paperId: 'p1', section: 'Section A', marks: 5, unitId: 'u1', topicId: 't1' },
        { paperId: 'p1', section: 'Section A', marks: 5, unitId: 'u2' },
      ],
    );
    expect(p.sections[0]).toMatchObject({ questionCount: 3, marksEach: 5, totalMarks: 10 });
    expect(p.unitWeight.find((u) => u.unitId === 'u1')?.pct).toBe(67);
    expect(p.topicFreq[0]).toMatchObject({ topicId: 't1', count: 2 });
  });
});

describe('numerical value changer', () => {
  const q = 'A body falls from a height of 20 m. If g = 9.8 m/s^2 and it makes an angle of 30° find v. Coil has 100 turns.';
  it('detects quantities', () => {
    const v = detectQuantities(q);
    expect(v.map((x) => [x.name, x.value, x.unit])).toEqual([
      ['d', 20, 'm'], ['a', 9.8, 'm/s^2'], ['theta', 30, '°'], ['N', 100, 'turns'],
    ]);
    expect(v[3].integer).toBe(true);
    expect(v[2].angle).toBe(true);
  });
  it('handles scientific notation', () => {
    const v = detectQuantities('light of 3 × 10^8 m/s and wavelength 500 nm');
    expect(v[0].value).toBe(3e8);
    expect(v[1]).toMatchObject({ name: 'lambda', value: 500 });
  });
  it('generates sensible variants and answers', () => {
    const vars = detectQuantities('dropped from 20 m height');
    const tpl = toTemplate('dropped from 20 m height', vars);
    expect(tpl).toBe('dropped from {{d}} height');
    const rng = mulberry32(42);
    for (let i = 0; i < 20; i++) {
      const vals = generateValues(vars, rng);
      expect(vals.d).toBeGreaterThan(0);
      const ratio = vals.d / 20;
      expect(ratio >= 0.2 && ratio <= 1.8).toBe(true);
      const { value } = evaluateFormula('v = sqrt(2*g*d)', vars, vals, { g: 9.8 });
      expect(value).toBeCloseTo(Math.sqrt(2 * 9.8 * vals.d));
    }
    expect(renderTemplate(tpl, vars, { d: 35 })).toBe('dropped from 35 m height');
  });
  it('angles use nice values and radians', () => {
    const vars = detectQuantities('incline at 30°');
    const vals = generateValues(vars, mulberry32(1));
    expect([37, 45, 53, 60, 90]).toContain(vals.theta);
    expect(evaluateFormula('s = sin(theta)', vars, { theta: 30 }).value).toBeCloseTo(0.5);
  });
  it('sig figs', () => {
    expect(countSigFigs('1.50')).toBe(3);
    expect(countSigFigs('200')).toBe(1);
    expect(roundSig(123.456, 3)).toBe(123);
  });
});

describe('stems & similar questions', () => {
  it('detects stems', () => {
    expect(detectStem('Derive the expression for moment of inertia of a ring.')?.stem.id).toBe('derive');
    expect(detectStem('Distinguish between conductors and insulators.')?.y).toBe('insulators');
    expect(detectStem('Write a short note on Hall effect')?.x).toBe('Hall effect');
  });
  it('swaps topic within group only', () => {
    const group = [
      { id: 'r', name: 'ring', unitId: 'u' },
      { id: 'd', name: 'disc', unitId: 'u' },
      { id: 's', name: 'solid sphere', unitId: 'u' },
    ];
    const out = generateSimilar('Derive the expression for moment of inertia of a ring.', 'r', group);
    expect(out.map((o) => o.text)).toEqual([
      'Derive the expression for moment of inertia of a disc.',
      'Derive the expression for moment of inertia of a solid sphere.',
    ]);
  });
  it('suggests groups', () => {
    const g = suggestGroups([
      { id: '1', name: 'Moment of inertia of ring', unitId: 'u' },
      { id: '2', name: 'Moment of inertia of disc', unitId: 'u' },
      { id: '3', name: 'Hooke law', unitId: 'u' },
    ]);
    expect(g[0].topicIds).toEqual(['1', '2']);
  });
});

describe('paper generator', () => {
  it('follows pattern and avoids recent', () => {
    const pool = Array.from({ length: 10 }, (_, i) => ({
      id: 'q' + i, text: 'q', marks: i < 6 ? 5 : 2, source: (i % 2 ? 'pyq' : 'generated') as 'pyq' | 'generated', timesPractised: 0,
    }));
    const out = generatePaper(
      [{ name: 'Section A', questionCount: 3, marksEach: 5, totalMarks: 15 }, { name: 'Section B', questionCount: 2, marksEach: 2, totalMarks: 4 }],
      pool,
      { topicFreq: {}, unitPct: {}, mastery: {}, recentIds: new Set() },
      { mode: 'full', originalRatio: 0.5 },
      mulberry32(3),
    );
    expect(out[0].questions).toHaveLength(3);
    expect(out[1].questions.every((q) => q.marks === 2)).toBe(true);
    const ids = out.flatMap((s) => s.questions.map((q) => q.questionId));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('planner', () => {
  const opts = { start: '2026-01-01', hoursPerDay: 4, daysOff: [], weekdaysOff: [] };
  const topics = Array.from({ length: 8 }, (_, i) => ({
    id: 't' + i, subjectId: 's1', difficulty: (i % 2 ? 'hard' : 'easy') as 'hard' | 'easy', weakness: i / 10, order: i,
  }));
  it('covers all topics before exam and reserves revision', () => {
    const plan = generatePlan([{ id: 's1', examDate: '2026-01-11' }], topics, opts);
    const study = plan.filter((t) => t.kind === 'study');
    expect(new Set(study.map((t) => t.topicId)).size).toBe(8);
    expect(study.every((t) => t.date < '2026-01-09')).toBe(true);
    const rev = plan.filter((t) => t.kind === 'revision');
    expect(rev[0].date).toBe('2026-01-09');
    expect(rev[0].topicId).toBe('t7'); // weakest first
  });
  it('respects days off', () => {
    const plan = generatePlan([{ id: 's1', examDate: '2026-01-11' }], topics, { ...opts, daysOff: ['2026-01-02'] });
    expect(plan.some((t) => t.date === '2026-01-02')).toBe(false);
  });
  it('computes behind', () => {
    const b = behindBy(
      [
        { id: '1', subjectId: 's', topicId: 'a', date: '2026-01-01', kind: 'study', hours: 1, done: false },
        { id: '2', subjectId: 's', topicId: 'b', date: '2026-01-02', kind: 'study', hours: 1, done: false },
        { id: '3', subjectId: 's', topicId: 'c', date: '2026-01-05', kind: 'study', hours: 1, done: false },
      ],
      '2026-01-03',
    );
    expect(b).toEqual({ missed: 2, days: 2 });
  });
});

describe('leitner, mastery, nudges', () => {
  it('moves boxes', () => {
    let c = { box: 1, nextDue: '2026-01-01' };
    c = review(c, true, '2026-01-01');
    expect(c).toEqual({ box: 2, nextDue: '2026-01-03' });
    c = review(c, false, '2026-01-03');
    expect(c).toEqual({ box: 1, nextDue: '2026-01-04' });
    expect(isDue(c, '2026-01-04')).toBe(true);
  });
  it('mastery', () => {
    expect(masteryScore({}, '2026-01-01')).toBeNull();
    expect(masteryScore({ accuracy: 1, flash: 1, confidence: 5, lastRevised: '2026-01-01' }, '2026-01-01')).toBe(100);
    expect(masteryScore({ accuracy: 0.5 }, '2026-01-01')).toBe(40);
  });
  it('nudges and streak', () => {
    const n = nudges({
      today: '2026-01-20',
      topics: [{ id: 't', name: 'Thermodynamics', subjectName: 'Thermal', lastRevised: '2026-01-10', mastery: 50 }],
      units: [{ name: 'Unit 3', subjectName: 'Thermal', pyqPct: 30, mastery: 40 }],
      behind: [], practicals: [], exams: [], cardsDue: 0, streak: 0,
    });
    expect(n).toContain("You haven't revised Thermodynamics in 10 days.");
    expect(n[0]).toMatch(/Unit 3 is 30%/);
    expect(streak(['2026-01-18', '2026-01-19', '2026-01-20'], '2026-01-20')).toBe(3);
    expect(streak(['2026-01-18', '2026-01-19'], '2026-01-20')).toBe(2);
  });
});

describe('observations', () => {
  it('computes columns, mean, error', () => {
    const cols = [
      { id: 'l', name: 'L (m)', key: 'L' },
      { id: 't', name: 'T (s)', key: 'T' },
      { id: 'g', name: 'g', key: 'g', formula: '4*pi^2*L/T^2' },
    ];
    const rows = computeRows(cols, [{ l: '1', t: '2.006' }, { l: '0.5', t: '1.418' }]);
    const mean = columnMean(rows, 'g')!;
    expect(mean).toBeCloseTo(9.8, 1);
    expect(percentError(mean, 9.8)).toBeLessThan(1);
    expect(finalResult('mean_g', cols, rows)).toBeCloseTo(mean);
  });
});
