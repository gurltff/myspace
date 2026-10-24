import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';
import { Box, Btn, Empty, Field, Input, PageTitle, Select, Tabs, Tag } from '../components/ui';
import { SubjectPicker, useLocalState } from '../components/SubjectPicker';
import { useStore, update, markStudied } from '../store/store';
import { review, BOX_INTERVALS } from '../lib/leitner';
import { uid } from '../lib/id';
import { prettyDate, ymd } from '../lib/dates';
import { tooltipStyle, chartInk } from './pyqs/Analysis';
import type { Question } from '../store/types';

type T = 'cards' | 'quiz' | 'mock' | 'tracker';

export default function Assessment() {
  const [tab, setTab] = useLocalState<T>('assess-tab', 'cards');
  const [subjectId, setSubjectId] = useLocalState('assess-subject', '');
  return (
    <div className="space-y-4">
      <Box className="pt-4">
        <PageTitle sub="flashcards with spaced repetition, quizzes & mock tests">ASSESSMENT</PageTitle>
        <SubjectPicker value={subjectId} onChange={setSubjectId} />
        <Tabs tabs={[{ id: 'cards', label: 'flashcards' }, { id: 'quiz', label: 'topic quiz' }, { id: 'mock', label: 'mock test' }, { id: 'tracker', label: 'score tracker' }]} value={tab} onChange={setTab} />
      </Box>
      {subjectId && tab === 'cards' && <Flashcards subjectId={subjectId} />}
      {subjectId && tab === 'quiz' && <Quiz subjectId={subjectId} />}
      {subjectId && tab === 'mock' && <Mock subjectId={subjectId} />}
      {subjectId && tab === 'tracker' && <Tracker subjectId={subjectId} />}
    </div>
  );
}

function Flashcards({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const today = ymd();
  const cards = s.flashcards.filter((c) => c.subjectId === subjectId);
  const topics = s.topics.filter((t) => t.subjectId === subjectId);
  const due = cards.filter((c) => c.nextDue <= today);
  const [flipped, setFlipped] = useState(false);
  const [f, setF] = useState({ front: '', back: '', topicId: '' });
  const card = due[0];

  const answer = (correct: boolean) => {
    if (!card) return;
    const next = review(card, correct, today);
    update((d) => {
      Object.assign(d.flashcards.find((c) => c.id === card.id)!, next);
      d.flashReviews.push({ id: uid(), cardId: card.id, date: today, correct });
      const t = d.topics.find((x) => x.id === card.topicId);
      if (t) t.lastRevised = today;
    });
    markStudied();
    setFlipped(false);
  };

  return (
    <>
      <Box title={`review · ${due.length} due`} delay={0.05}>
        <AnimatePresence mode="wait">
          {card ? (
            <motion.div key={card.id} initial={{ opacity: 0, x: 60, rotate: 4 }} animate={{ opacity: 1, x: 0, rotate: 0 }} exit={{ opacity: 0, x: -80, rotate: -6 }} transition={{ type: 'spring', stiffness: 180, damping: 18 }}>
              <div className={`flip-card cursor-pointer ${flipped ? 'flipped' : ''}`} onClick={() => setFlipped(!flipped)}>
                <div className="flip-inner min-h-48">
                  <div className="flip-face nest-box !bg-panel2 min-h-48 p-5 grid place-items-center text-center">
                    <div><div className="text-[13px] text-muted mb-1">box {card.box} · tap to flip</div><p className="font-round font-extrabold text-[22px]">{card.front}</p></div>
                  </div>
                  <div className="flip-face flip-back nest-box !bg-pill p-5 grid place-items-center text-center">
                    <p className="text-[22px]">{card.back}</p>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 justify-center mt-3">
                <Btn variant="pink" onClick={() => answer(false)}>✕ wrong → box 1</Btn>
                <Btn onClick={() => answer(true)}>✓ right → box {Math.min(5, card.box + 1)}</Btn>
              </div>
            </motion.div>
          ) : (
            <motion.div key="done" initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}><Empty>all caught up! 🎉 come back tomorrow</Empty></motion.div>
          )}
        </AnimatePresence>
        <div className="grid grid-cols-5 gap-1.5 mt-4">
          {[1, 2, 3, 4, 5].map((b) => {
            const n = cards.filter((c) => c.box === b).length;
            return (
              <div key={b} className="text-center border-2 border-line rounded-lg py-1 bg-panel2">
                <div className="font-bubble text-[18px]">{n}</div>
                <div className="text-[12px] text-muted">box {b} · {BOX_INTERVALS[b - 1]}d</div>
              </div>
            );
          })}
        </div>
      </Box>

      <Box title={`cards · ${cards.length}`} delay={0.1}>
        <div className="grid sm:grid-cols-[1fr_1fr_180px_auto] gap-2 items-end">
          <Field label="front"><Input value={f.front} onChange={(e) => setF({ ...f, front: e.target.value })} /></Field>
          <Field label="back"><Input value={f.back} onChange={(e) => setF({ ...f, back: e.target.value })} /></Field>
          <Field label="topic"><Select value={f.topicId} onChange={(e) => setF({ ...f, topicId: e.target.value })}><option value="">—</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select></Field>
          <Btn disabled={!f.front || !f.back} onClick={() => { update((d) => void d.flashcards.push({ id: uid(), subjectId, topicId: f.topicId || undefined, front: f.front, back: f.back, box: 1, nextDue: today, createdAt: today })); setF({ front: '', back: '', topicId: f.topicId }); }}>+ add</Btn>
        </div>
        <div className="mt-3 space-y-1 max-h-80 overflow-y-auto nest-scroll">
          {cards.map((c) => (
            <div key={c.id} className="flex gap-2 items-center text-[15px] border-b border-line/20 py-1">
              <Tag>box {c.box}</Tag>
              <span className="flex-1 min-w-0 truncate"><b>{c.front}</b> — {c.back}</span>
              <span className="text-[13px] text-muted shrink-0">due {prettyDate(c.nextDue)}</span>
              <button className="text-muted" onClick={() => update((d) => void (d.flashcards = d.flashcards.filter((x) => x.id !== c.id)))}>✕</button>
            </div>
          ))}
        </div>
      </Box>
    </>
  );
}

function shuffle<X>(a: X[]): X[] {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

function recordAttempt(q: Question, score: number, kind: 'quiz' | 'mock', refId?: string) {
  const today = ymd();
  update((d) => {
    d.attempts.push({ id: uid(), questionId: q.id, topicId: q.topicId, subjectId: q.subjectId, score, date: today, kind, refId });
    const x = d.questions.find((y) => y.id === q.id);
    if (x) { x.timesPractised += 1; x.lastScore = score; }
    const t = d.topics.find((y) => y.id === q.topicId);
    if (t) t.lastRevised = today;
  });
  markStudied();
}

function Quiz({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const topics = s.topics.filter((t) => t.subjectId === subjectId);
  const [topicId, setTopicId] = useState('');
  const [n, setN] = useState(5);
  const [queue, setQueue] = useState<Question[] | null>(null);
  const [i, setI] = useState(0);
  const [tally, setTally] = useState<number[]>([]);
  const pool = s.questions.filter((q) => q.subjectId === subjectId && q.approved && (!topicId || q.topicId === topicId));

  const mark = (score: number) => {
    recordAttempt(queue![i], score, 'quiz');
    setTally([...tally, score]);
    setI(i + 1);
  };

  if (queue && i < queue.length) {
    const q = queue[i];
    return (
      <Box title={`quiz · ${i + 1}/${queue.length}`}>
        <div className="h-2 rounded-full bg-panel2 border border-line overflow-hidden mb-3"><motion.div className="h-full bg-sage" animate={{ width: `${(i / queue.length) * 100}%` }} /></div>
        <AnimatePresence mode="wait">
          <motion.div key={q.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            <p className="text-[19px] mb-1">{q.text} {q.marks && <b>[{q.marks}]</b>}</p>
            <p className="text-[14px] text-muted mb-3">{topics.find((t) => t.id === q.topicId)?.name}{q.answer && <> · answer: <span className="blur-sm hover:blur-none transition">{q.answer}</span></>}</p>
            <p className="text-[15px] mb-2">answer it in your notebook, then mark yourself honestly ♡</p>
            <div className="flex gap-2 flex-wrap">
              <Btn onClick={() => mark(1)}>✓ right</Btn>
              <Btn variant="butter" onClick={() => mark(0.5)}>~ partially</Btn>
              <Btn variant="pink" onClick={() => mark(0)}>✕ wrong</Btn>
            </div>
          </motion.div>
        </AnimatePresence>
      </Box>
    );
  }
  return (
    <Box title="quick topic quiz" delay={0.05}>
      {queue && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="nest-box !bg-pill p-3 mb-3 text-center">
          <p className="font-bubble text-[26px]">{Math.round((tally.reduce((a, b) => a + b, 0) / Math.max(1, tally.length)) * 100)}%</p>
          <p>quiz done! {tally.filter((x) => x === 1).length} right · {tally.filter((x) => x === 0.5).length} partial · {tally.filter((x) => x === 0).length} wrong</p>
        </motion.div>
      )}
      <div className="grid sm:grid-cols-[1fr_100px_auto] gap-2 items-end">
        <Field label="topic"><Select value={topicId} onChange={(e) => setTopicId(e.target.value)}><option value="">all topics</option>{topics.map((t) => <option key={t.id} value={t.id}>{t.name} ({s.questions.filter((q) => q.topicId === t.id).length})</option>)}</Select></Field>
        <Field label="questions"><Input type="number" min={1} value={n} onChange={(e) => setN(Number(e.target.value))} /></Field>
        <Btn disabled={!pool.length} onClick={() => { setQueue(shuffle(pool).slice(0, n)); setI(0); setTally([]); }}>start ✿</Btn>
      </div>
      <p className="text-[14px] text-muted mt-1">{pool.length} questions available</p>
    </Box>
  );
}

function Mock({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const [mins, setMins] = useState(30);
  const [n, setN] = useState(5);
  const [test, setTest] = useState<{ id: string; qs: Question[] } | null>(null);
  const [left, setLeft] = useState(0);
  const [phase, setPhase] = useState<'idle' | 'running' | 'marking'>('idle');
  const [scores, setScores] = useState<Record<string, string>>({});
  const pool = s.questions.filter((q) => q.subjectId === subjectId && q.approved);

  useEffect(() => {
    if (phase !== 'running') return;
    const t = setInterval(() => setLeft((l) => { if (l <= 1) { setPhase('marking'); return 0; } return l - 1; }), 1000);
    return () => clearInterval(t);
  }, [phase]);

  if (phase !== 'idle' && test) {
    return (
      <Box title={phase === 'running' ? 'mock test — go go go!' : 'mark your answers'}>
        {phase === 'running' && <div className="text-center mb-3"><span className="nest-box inline-block px-4 font-bubble text-[30px]">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span></div>}
        <ol className="space-y-2 list-decimal pl-6">
          {test.qs.map((q) => (
            <li key={q.id} className="text-[17px]">
              {q.text} <b>[{q.marks ?? 5}]</b>
              {phase === 'marking' && <div className="text-[14px] mt-0.5">got <input type="number" min={0} max={q.marks ?? 5} className="nest-input !w-16 !inline !py-0" value={scores[q.id] ?? ''} onChange={(e) => setScores({ ...scores, [q.id]: e.target.value })} /> / {q.marks ?? 5} {q.answer && <span className="text-muted">· answer: {q.answer}</span>}</div>}
            </li>
          ))}
        </ol>
        <div className="flex gap-2 mt-3">
          {phase === 'running' ? <Btn variant="pink" onClick={() => setPhase('marking')}>finish early</Btn> : (
            <Btn onClick={() => { test.qs.forEach((q) => { const v = scores[q.id]; if (v !== undefined && v !== '') recordAttempt(q, Math.min(1, Number(v) / (q.marks ?? 5)), 'mock', test.id); }); setPhase('idle'); setTest(null); setScores({}); }}>save scores</Btn>
          )}
        </div>
      </Box>
    );
  }
  return (
    <Box title="timed mock test" delay={0.05}>
      <div className="grid sm:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <Field label="minutes"><Input type="number" value={mins} onChange={(e) => setMins(Number(e.target.value))} /></Field>
        <Field label="questions"><Input type="number" value={n} onChange={(e) => setN(Number(e.target.value))} /></Field>
        <Btn disabled={!pool.length} onClick={() => { setTest({ id: uid(), qs: shuffle(pool).slice(0, n) }); setLeft(mins * 60); setPhase('running'); }}>start timer ⏱</Btn>
      </div>
      <p className="text-[14px] text-muted mt-1">for full past-paper style attempts, use PYQs → practice papers (timer mode).</p>
    </Box>
  );
}

function Tracker({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const data = useMemo(() => {
    const by = new Map<string, { quiz: number[]; mock: number[]; paper: number[] }>();
    for (const a of s.attempts.filter((x) => x.subjectId === subjectId)) {
      const e = by.get(a.date) ?? { quiz: [], mock: [], paper: [] };
      e[a.kind].push(a.score);
      by.set(a.date, e);
    }
    const avg = (v: number[]) => (v.length ? Math.round((v.reduce((x, y) => x + y, 0) / v.length) * 100) : undefined);
    return [...by].sort(([a], [b]) => a.localeCompare(b)).map(([date, e]) => ({ date: prettyDate(date).replace(/ \d{4}$/, ''), quiz: avg(e.quiz), mock: avg(e.mock), paper: avg(e.paper) }));
  }, [s.attempts, subjectId]);
  const papers = s.generatedPapers.filter((p) => p.subjectId === subjectId && p.scored !== undefined);
  const ink = chartInk();
  return (
    <>
      <Box title="scores over time" delay={0.05}>
        {data.length ? (
          <div className="h-72">
            <ResponsiveContainer>
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="4 4" stroke={ink} opacity={0.3} />
                <XAxis dataKey="date" stroke={ink} /><YAxis domain={[0, 100]} unit="%" stroke={ink} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Line type="monotone" dataKey="quiz" stroke="#7f9a6c" strokeWidth={3} dot={{ r: 5, stroke: ink, strokeWidth: 2, fill: '#a9bf96' }} connectNulls animationDuration={1000} />
                <Line type="monotone" dataKey="mock" stroke="#d98a9a" strokeWidth={3} dot={{ r: 5, stroke: ink, strokeWidth: 2, fill: '#f3b8c2' }} connectNulls animationDuration={1000} />
                <Line type="monotone" dataKey="paper" stroke="#7d97b3" strokeWidth={3} dot={{ r: 5, stroke: ink, strokeWidth: 2, fill: '#bcd3ea' }} connectNulls animationDuration={1000} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty>attempt a quiz to see your progress</Empty>}
      </Box>
      <Box title="past paper attempts" delay={0.1}>
        {papers.length ? papers.map((p) => <div key={p.id} className="flex justify-between border-b border-line/20 py-1"><span>{p.title} · {p.attemptedAt && prettyDate(p.attemptedAt)}</span><b>{p.scored}/{p.totalMarks}</b></div>) : <Empty>no papers attempted yet</Empty>}
      </Box>
    </>
  );
}

