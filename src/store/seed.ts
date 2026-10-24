import type { AppData, Question, Topic, Unit } from './types';
import { parseSyllabus } from '../lib/syllabus';
import { splitQuestions, detectType } from '../lib/questions';
import { suggestTopic } from '../lib/tagging';
import { detectStem } from '../lib/stems';
import { DEFAULT_CONSTANTS } from '../lib/constants';
import { detectQuantities, toTemplate } from '../lib/numerical';
import { generatePlan } from '../lib/planner';
import { addDays, ymd } from '../lib/dates';
import { uid } from '../lib/id';

export const SUBJECT_COLORS = ['#a8c3a0', '#f2b5c0', '#b9cfe8', '#f3d58f', '#c9b6e4', '#f0b98d'];

export function emptyData(): AppData {
  const now = new Date().toISOString();
  return {
    version: 1,
    semesters: [], subjects: [], units: [], topics: [], topicGroups: [], papers: [], questions: [], templates: [],
    generatedPapers: [], attempts: [], flashcards: [], flashReviews: [],
    plan: { hoursPerDay: 4, daysOff: [], weekdaysOff: [0] },
    planTasks: [], experiments: [], posts: [],
    settings: { name: 'shroomie', college: 'University of Delhi', theme: 'system', hoursPerDay: 4, constants: DEFAULT_CONSTANTS, createdAt: ymd(), visits: 0 },
    patternOverrides: {}, studyDays: [], updatedAt: '1970-01-01T00:00:00.000Z',
  };
}

const SYLLABUS = `Unit 1: Fundamentals of Dynamics
Reference frames, Inertial frames; Galilean transformations
Newton's laws of motion, Dynamics of a system of particles
Conservation of momentum, Centre of mass
Unit 2: Work and Energy
Work energy theorem, Conservative and non-conservative forces
Potential energy, Conservation of energy
Unit 3: Rotational Dynamics
Angular momentum of a particle, Torque
Moment of inertia of ring, Moment of inertia of disc, Moment of inertia of solid sphere, Moment of inertia of rod
Theorem of parallel axes, Theorem of perpendicular axes
Unit 4: Elasticity
Hooke's law, Young's modulus, Poisson's ratio
Torsion of a cylinder, Bending of beams
Unit 5: Oscillations
Simple harmonic motion, Damped oscillations, Forced oscillations and resonance`;

const PYQ_2023 = `Time: 3 Hours   Maximum Marks: 75
SECTION A
Attempt any four questions.
Q1. Derive the expression for moment of inertia of a disc about its axis. (6)
Q2. State and prove the theorem of parallel axes. (6)
Q3. A body of mass 2 kg is dropped from a height of 20 m. Calculate its speed just before hitting the ground. (6)
Q4. Explain the working of a Galilean transformation and show that acceleration is invariant. (6)
Q5. Distinguish between conservative and non-conservative forces. (6)
SECTION B
Attempt all questions.
6. Write a short note on Poisson's ratio. (3)
7. Define Young's modulus. Give its applications. (3)
8. What is simple harmonic motion? Explain with a neat diagram. (3)`;

const PYQ_2024 = `Time: 3 Hours   Maximum Marks: 75
SECTION A
Attempt any four questions.
Q1. Derive an expression for the moment of inertia of a disc about its axis. (6)
Q2. Derive the expression for moment of inertia of ring. (6)
Q3. A wheel of radius 0.5 m rotates at 30 rad/s. Calculate the linear speed of a point on its rim. (6)
Q4. State and prove the work energy theorem. (6)
Q5. Explain damped oscillations and obtain the expression for the logarithmic decrement. (6)
SECTION B
Attempt all questions.
6. Write a short note on Torsion of a cylinder. (3)
7. Define centre of mass. Give its applications. (3)
8. A spring of force constant 200 N/m is stretched by 5 cm. Find the potential energy stored. (3)`;

export function makeSeed(emptyOnly: boolean): AppData {
  const d = emptyData();
  if (emptyOnly) return d;
  const today = ymd();
  const semId = uid();
  const subId = uid();
  d.semesters.push({ id: semId, name: 'Sem 3, 2026', archived: false, createdAt: today });
  d.semesters.push({ id: uid(), name: 'Sem 2, 2025', archived: true, createdAt: addDays(today, -200) });
  d.subjects.push({
    id: subId, semesterId: semId, name: 'Mechanics', code: 'PHYS-C1', examDate: addDays(today, 21), practicalDate: addDays(today, 6),
    syllabusRaw: SYLLABUS, color: SUBJECT_COLORS[0],
  });
  const units: Unit[] = [];
  const topics: Topic[] = [];
  parseSyllabus(SYLLABUS).forEach((u, ui) => {
    units.push({ id: u.id, subjectId: subId, name: u.name, order: ui });
    u.topics.forEach((t, ti) =>
      topics.push({
        id: t.id, subjectId: subId, unitId: u.id, name: t.name, order: ui * 100 + ti, sourceLine: t.sourceLine,
        difficulty: /inertia|theorem|torsion|bending|damped|forced/i.test(t.name) ? 'hard' : /law|frames|energy/i.test(t.name) ? 'easy' : 'medium',
        confidence: ti % 3 === 0 ? 2 : ti % 3 === 1 ? 4 : null,
        lastRevised: ti % 2 ? addDays(today, -(3 + ti * 3)) : undefined,
      }),
    );
  });
  d.units = units;
  d.topics = topics;

  const lite = topics.map((t) => ({ id: t.id, name: t.name, unitId: t.unitId }));
  const questions: Question[] = [];
  for (const [year, raw] of [[2023, PYQ_2023], [2024, PYQ_2024]] as const) {
    const pid = uid();
    const r = splitQuestions(raw);
    d.papers.push({ id: pid, subjectId: subId, year, title: `Mechanics ${year}`, rawText: raw, sections: r.sections, totalMarks: r.totalMarks, durationHours: r.durationHours, createdAt: today });
    for (const q of r.questions) {
      const t = suggestTopic(q.text, lite);
      questions.push({
        id: uid(), subjectId: subId, paperId: pid, unitId: t?.unitId, topicId: t?.id, text: q.text, marks: q.marks, year,
        section: q.section, type: detectType(q.text, q.marks), source: 'pyq', timesPractised: 0, approved: true,
        stem: detectStem(q.text)?.stem.id, createdAt: today,
      });
    }
  }
  d.questions = questions;

  const numQ = questions.find((q) => /dropped from a height/.test(q.text));
  if (numQ) {
    const vars = detectQuantities(numQ.text);
    d.templates.push({
      id: uid(), subjectId: subId, questionId: numQ.id, template: toTemplate(numQ.text, vars), variables: vars.map(({ start: _s, end: _e, ...v }) => v),
      formula: 'v = sqrt(2*g*d)', answerUnit: 'm/s', constants: { g: 9.8 }, sigFigs: 3,
    });
    numQ.templateId = d.templates[0].id;
  }

  const moi = topics.filter((t) => /moment of inertia/i.test(t.name));
  d.topicGroups.push({ id: uid(), subjectId: subId, name: 'Moment of inertia bodies', topicIds: moi.map((t) => t.id), allowUnit: false });
  const forces = topics.filter((t) => /conservative/i.test(t.name));
  if (forces.length) d.topicGroups.push({ id: uid(), subjectId: subId, name: 'Forces', topicIds: forces.map((t) => t.id), allowUnit: false });

  d.experiments.push({
    id: uid(), subjectId: subId, title: 'Simple pendulum — determine g',
    aim: 'To determine the acceleration due to gravity (g) using a simple pendulum.',
    apparatus: 'Bob, thread, split cork, clamp stand, stopwatch, metre scale, vernier callipers',
    theory: 'For small oscillations the time period of a simple pendulum is T = 2π√(L/g), independent of the mass of the bob.',
    formula: 'g = 4π²L / T²',
    videos: ['https://www.youtube.com/watch?v=5XO1_dX0Cj4'],
    circuitImages: [], embeds: [],
    steps: [
      'Measure the diameter of the bob with vernier callipers and find its radius.',
      'Suspend the bob and set the effective length L = thread length + radius.',
      'Displace the bob slightly (< 10°) and release it.',
      'Time 20 oscillations twice and take the mean; compute T.',
      'Repeat for 4 different lengths.',
    ].map((text) => ({ id: uid(), text, done: false })),
    columns: [
      { id: 'c1', name: 'L (m)', key: 'L' },
      { id: 'c2', name: 't for 20 osc (s)', key: 't20' },
      { id: 'c3', name: 'T (s)', key: 'T', formula: 't20/20' },
      { id: 'c4', name: 'g (m/s²)', key: 'g', formula: '4*pi^2*L/T^2' },
    ],
    rows: [
      { c1: '0.6', c2: '31.1' }, { c1: '0.8', c2: '35.9' }, { c1: '1.0', c2: '40.2' },
    ],
    resultFormula: 'mean_g', standardValue: 9.8, resultUnit: 'm/s²',
    precautions: 'Keep amplitude small. Start the stopwatch when the bob crosses the mean position. Avoid air draughts.',
    errors: 'Reaction time in starting/stopping the stopwatch; thread is not perfectly inextensible; air resistance.',
    viva: [
      { id: uid(), q: 'Why should the amplitude be small?', a: 'The formula T = 2π√(L/g) holds only for small angles where sin θ ≈ θ.' },
      { id: uid(), q: 'Does the period depend on the mass of the bob?', a: 'No, the time period is independent of the mass.' },
      { id: uid(), q: 'What is a seconds pendulum?', a: 'A pendulum with a time period of 2 s; its length is about 99.4 cm.' },
    ],
    status: 'performed',
  });

  const cards: [string, string][] = [
    ['Moment of inertia of a disc about its axis', 'I = ½ M R²'],
    ['Moment of inertia of a ring about its axis', 'I = M R²'],
    ['Theorem of parallel axes', 'I = I_cm + M d²'],
    ["Young's modulus", 'Y = stress / strain = (F/A)/(ΔL/L)'],
    ['Time period of SHM (spring)', 'T = 2π √(m/k)'],
  ];
  cards.forEach(([front, back], i) => {
    const t = suggestTopic(front, lite);
    d.flashcards.push({ id: uid(), subjectId: subId, topicId: t?.id, front, back, box: (i % 3) + 1, nextDue: i < 3 ? today : addDays(today, 2), createdAt: today });
  });

  // a few past attempts so the charts have something to show
  questions.slice(0, 6).forEach((q, i) => {
    d.attempts.push({ id: uid(), questionId: q.id, topicId: q.topicId, subjectId: subId, score: [0.8, 0.4, 0.6, 0.3, 0.9, 0.5][i], date: addDays(today, -10 + i), kind: 'quiz' });
    q.timesPractised = 1;
    q.lastScore = [0.8, 0.4, 0.6, 0.3, 0.9, 0.5][i];
  });

  d.posts.push({
    id: uid(), title: 'hello, little nest ✿', date: today, mood: 'cozy', tags: ['intro', 'sem 3'], isPublic: true, updatedAt: today,
    html: '<p>ELLO! this is my lil corner for studying physics :D it holds my syllabus, PYQs, practicals and random rambles.</p><p>goal for this sem: <strong>actually revise before the exam</strong>.</p>',
  });

  d.plan = { hoursPerDay: 4, daysOff: [], weekdaysOff: [0], generatedAt: today };
  const plan = generatePlan(
    d.subjects,
    topics.map((t) => ({ id: t.id, subjectId: t.subjectId, difficulty: t.difficulty, weakness: t.confidence ? (5 - t.confidence) / 4 : 0.5, order: t.order })),
    { start: today, hoursPerDay: 4, daysOff: [], weekdaysOff: [0] },
  );
  d.planTasks = plan.map((p) => ({ ...p, id: uid(), done: false }));
  d.studyDays = [addDays(today, -2), addDays(today, -1)];
  d.updatedAt = new Date().toISOString();
  return d;
}
