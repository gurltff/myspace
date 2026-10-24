import { useEffect, useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Btn, Empty, Field, Input, Select, Tabs, Tag } from '../../components/ui';
import { useStore, update, getState, markStudied } from '../../store/store';
import { subjectPattern, topicMastery } from '../../store/derive';
import { generatePaper, type PoolQuestion, type GenOptions } from '../../lib/paperGen';
import { generateValues, renderTemplate, evaluateFormula, formatNum, mulberry32 } from '../../lib/numerical';
import { uid } from '../../lib/id';
import { ymd, prettyDate } from '../../lib/dates';
import type { GeneratedPaper } from '../../store/types';

export default function Generator({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const papers = s.generatedPapers.filter((p) => p.subjectId === subjectId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const [openId, setOpenId] = useState<string | null>(null);
  const open = papers.find((p) => p.id === openId);
  return (
    <>
      <Options subjectId={subjectId} onCreated={setOpenId} />
      <AnimatePresence mode="wait">{open && <PaperView key={open.id} paper={open} onClose={() => setOpenId(null)} />}</AnimatePresence>
      <Box title="paper history" delay={0.1}>
        {papers.length ? (
          <div className="space-y-1.5">
            {papers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 border-2 border-line/30 rounded-xl px-2 py-1 bg-panel2">
                <span className="flex-1 min-w-0 truncate">{p.title} <span className="text-[13px] text-muted">· {prettyDate(p.createdAt.slice(0, 10))} · {p.mode}</span></span>
                {p.scored !== undefined ? <Tag color="var(--sage)">{p.scored}/{p.totalMarks}</Tag> : <Tag>not attempted</Tag>}
                <Btn small variant="sky" onClick={() => setOpenId(p.id)}>open</Btn>
                <button className="text-muted hover:text-ink" onClick={() => update((d) => void (d.generatedPapers = d.generatedPapers.filter((x) => x.id !== p.id)))}>✕</button>
              </div>
            ))}
          </div>
        ) : <Empty>no papers generated yet</Empty>}
      </Box>
    </>
  );
}

function Options({ subjectId, onCreated }: { subjectId: string; onCreated: (id: string) => void }) {
  const s = useStore((x) => x);
  const units = s.units.filter((u) => u.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const [o, setO] = useState<GenOptions>({ mode: 'full', originalRatio: 0.6, unitIds: [], customMarks: 30 });
  const pattern = subjectPattern(s, subjectId);
  const pool = s.questions.filter((q) => q.subjectId === subjectId && q.approved);

  const generate = () => {
    const st = getState();
    const sub = st.subjects.find((x) => x.id === subjectId)!;
    const rng = mulberry32(Date.now() % 1e9);
    const templates = st.templates.filter((t) => t.subjectId === subjectId);
    const poolQ: PoolQuestion[] = pool.map((q) => ({ id: q.id, text: q.text, marks: q.marks, unitId: q.unitId, topicId: q.topicId, source: q.source, timesPractised: q.timesPractised }));
    for (const t of templates) {
      const q = st.questions.find((x) => x.id === t.questionId);
      if (q) poolQ.push({ id: 'tpl:' + t.id, text: q.text, marks: q.marks, unitId: q.unitId, topicId: q.topicId, source: 'variant', timesPractised: 0 });
    }
    const recent = new Set(st.generatedPapers.filter((p) => p.subjectId === subjectId).slice(-3).flatMap((p) => p.sections.flatMap((x) => x.questions.map((q) => q.questionId))));
    const ctx = {
      topicFreq: Object.fromEntries(pattern.topicFreq.map((t) => [t.topicId, t.count])),
      unitPct: Object.fromEntries(pattern.unitWeight.map((u) => [u.unitId, u.pct])),
      mastery: topicMastery(st),
      recentIds: recent,
    };
    const sections = pattern.sections.length ? pattern.sections : [{ name: 'Section A', questionCount: 5, marksEach: 0, totalMarks: 0 }];
    const out = generatePaper(sections, poolQ, ctx, o, rng);
    const paper: GeneratedPaper = {
      id: uid(), subjectId, createdAt: new Date().toISOString(), mode: o.mode,
      title: `${sub.name} practice paper #${st.generatedPapers.filter((p) => p.subjectId === subjectId).length + 1}`,
      durationHours: o.mode === 'full' ? pattern.durationHours : Math.max(0.5, Math.round(((o.customMarks ?? 30) / Math.max(1, pattern.totalMarks)) * pattern.durationHours * 2) / 2),
      totalMarks: 0,
      sections: out.map((sec) => {
        const pat = sections.find((x) => x.name === sec.name);
        return {
          name: sec.name, instruction: sec.instruction ?? (pat?.attempt === 'all' ? 'Attempt all questions.' : pat?.attempt ? `Attempt any ${pat.attempt} questions.` : undefined),
          questions: sec.questions.map((g) => {
            if (g.questionId.startsWith('tpl:')) {
              const t = templates.find((x) => 'tpl:' + x.id === g.questionId)!;
              const vals = generateValues(t.variables, rng);
              let answer = '';
              try { answer = `${formatNum(evaluateFormula(t.formula, t.variables, vals, { ...Object.fromEntries(st.settings.constants.map((c) => [c.name, c.value])), ...t.constants }).value, 3)} ${t.answerUnit}`; } catch { /* no formula */ }
              return { questionId: t.questionId, marks: g.marks, text: renderTemplate(t.template, t.variables, vals), answer };
            }
            const q = st.questions.find((x) => x.id === g.questionId)!;
            return { questionId: q.id, marks: g.marks, text: q.text, answer: q.answer };
          }),
        };
      }),
    };
    paper.totalMarks = o.mode === 'full' && pattern.totalMarks ? pattern.totalMarks : paper.sections.reduce((a, x) => {
      const pat = sections.find((p) => p.name === x.name);
      const n = pat?.attempt && pat.attempt !== 'all' ? Math.min(pat.attempt, x.questions.length) : x.questions.length;
      return a + x.questions.slice(0, n).reduce((b, q) => b + q.marks, 0);
    }, 0);
    update((d) => void d.generatedPapers.push(paper));
    onCreated(paper.id);
  };

  return (
    <Box title="practice paper generator" delay={0.05}>
      <p className="text-[15px] mb-2">follows the detected pattern: {pattern.sections.map((x) => `${x.name} (${x.questionCount}×${x.marksEach}m)`).join(' · ') || 'no pattern yet'} · {pattern.totalMarks} marks · {pattern.durationHours}h</p>
      <div className="grid sm:grid-cols-3 gap-3">
        <Field label="paper type">
          <Select value={o.mode} onChange={(e) => setO({ ...o, mode: e.target.value as GenOptions['mode'] })}>
            <option value="full">full paper</option><option value="unit">unit-wise</option><option value="weak">weak topics only</option><option value="custom">custom marks</option>
          </Select>
        </Field>
        <Field label={`original PYQs vs generated: ${Math.round(o.originalRatio * 100)}% / ${100 - Math.round(o.originalRatio * 100)}%`}>
          <input type="range" min={0} max={1} step={0.1} value={o.originalRatio} onChange={(e) => setO({ ...o, originalRatio: Number(e.target.value) })} className="w-full accent-[var(--sage-dark)]" />
        </Field>
        {o.mode === 'custom' && <Field label="total marks"><Input type="number" value={o.customMarks} onChange={(e) => setO({ ...o, customMarks: Number(e.target.value) })} /></Field>}
      </div>
      {o.mode === 'unit' && (
        <div className="flex flex-wrap gap-1 mt-2">
          {units.map((u) => <Tag key={u.id} color={o.unitIds?.includes(u.id) ? 'var(--sage)' : undefined} onClick={() => setO({ ...o, unitIds: o.unitIds?.includes(u.id) ? o.unitIds.filter((x) => x !== u.id) : [...(o.unitIds ?? []), u.id] })}>{u.name}</Tag>)}
        </div>
      )}
      <p className="text-[13px] text-muted mt-2">weights: frequently asked topics ↑ · high-weightage units ↑ · weak topics ↑ · unpractised ↑ · questions from your last 3 papers ↓</p>
      <Btn className="mt-2" onClick={generate} disabled={!pool.length}>✨ generate paper</Btn>
    </Box>
  );
}

function fmtTime(sec: number) {
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), x = sec % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`;
}

function PaperView({ paper, onClose }: { paper: GeneratedPaper; onClose: () => void }) {
  const s = useStore((x) => x);
  const [tab, setTab] = useState<'paper' | 'timer' | 'key' | 'score'>('paper');
  const [left, setLeft] = useState(paper.durationHours * 3600);
  const [running, setRunning] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>(() => Object.fromEntries(paper.sections.flatMap((sec, si) => sec.questions.map((q, qi) => [`${si}-${qi}`, q.score?.toString() ?? '']))));
  const sub = s.subjects.find((x) => x.id === paper.subjectId);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((l) => (l <= 1 ? (setRunning(false), 0) : l - 1)), 1000);
    return () => clearInterval(t);
  }, [running]);

  const total = useMemo(() => Object.values(scores).reduce((a, v) => a + (Number(v) || 0), 0), [scores]);

  const exportPdf = async (withKey: boolean) => {
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const W = doc.internal.pageSize.getWidth();
    let y = 50;
    const line = (txt: string, opts: { size?: number; bold?: boolean; align?: 'center' | 'left'; indent?: number; right?: string } = {}) => {
      doc.setFont('times', opts.bold ? 'bold' : 'normal');
      doc.setFontSize(opts.size ?? 11);
      const x = 50 + (opts.indent ?? 0);
      const lines = doc.splitTextToSize(txt, W - x - 80);
      for (const l of lines) {
        if (y > 780) { doc.addPage(); y = 50; }
        if (opts.align === 'center') doc.text(l, W / 2, y, { align: 'center' });
        else doc.text(l, x, y);
        y += (opts.size ?? 11) * 1.35;
      }
      if (opts.right) doc.text(opts.right, W - 50, y - (opts.size ?? 11) * 1.35 * lines.length, { align: 'right' });
    };
    line(s.settings.college || 'College', { size: 14, bold: true, align: 'center' });
    line(`${sub?.name ?? ''} ${sub?.code ? `(${sub.code})` : ''}`, { size: 12, align: 'center' });
    line(withKey ? 'ANSWER KEY' : paper.title, { size: 11, align: 'center' });
    y += 6;
    line(`Time: ${paper.durationHours} Hours`, { right: `Maximum Marks: ${paper.totalMarks}` });
    doc.line(50, y - 6, W - 50, y - 6);
    y += 8;
    if (!withKey) line('Instructions: Write your Roll No. on the top immediately on receipt of this question paper. All questions carry marks as indicated against them.', { size: 10 });
    let n = 1;
    for (const sec of paper.sections) {
      y += 8;
      line(sec.name.toUpperCase(), { bold: true, align: 'center' });
      if (sec.instruction) line(sec.instruction, { size: 10, align: 'center' });
      for (const q of sec.questions) {
        line(`${n}. ${q.text}`, { indent: 0, right: `(${q.marks})` });
        if (withKey) line(q.answer ? `Answer: ${q.answer}` : `Source: ${s.questions.find((x) => x.id === q.questionId)?.year ?? 'bank'} — see original question`, { size: 10, indent: 16 });
        y += 4;
        n++;
      }
    }
    doc.save(`${paper.title}${withKey ? ' - answer key' : ''}.pdf`);
  };

  const saveScores = () => {
    const today = ymd();
    update((d) => {
      const p = d.generatedPapers.find((x) => x.id === paper.id)!;
      p.sections.forEach((sec, si) => sec.questions.forEach((q, qi) => {
        const v = scores[`${si}-${qi}`];
        if (v === '' || v === undefined) return;
        const got = Math.min(q.marks || Number(v), Number(v));
        q.score = got;
        const frac = q.marks ? got / q.marks : 0;
        const orig = d.questions.find((x) => x.id === q.questionId);
        d.attempts = d.attempts.filter((a) => !(a.refId === paper.id && a.questionId === q.questionId));
        d.attempts.push({ id: uid(), questionId: q.questionId, topicId: orig?.topicId, subjectId: paper.subjectId, score: frac, date: today, kind: 'paper', refId: paper.id });
        if (orig) {
          orig.timesPractised += 1;
          orig.lastScore = frac;
          const t = d.topics.find((x) => x.id === orig.topicId);
          if (t) t.lastRevised = today;
        }
      }));
      p.scored = total;
      p.attemptedAt = today;
    });
    markStudied();
    setTab('paper');
  };

  let n = 0;
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <Box title={paper.title} right={<Btn small variant="ghost" onClick={onClose}>close</Btn>}>
        <Tabs tabs={[{ id: 'paper', label: 'paper' }, { id: 'timer', label: '⏱ timer mode' }, { id: 'key', label: 'answer key' }, { id: 'score', label: 'enter marks' }]} value={tab} onChange={setTab} />
        <div className="flex gap-2 flex-wrap mb-3">
          <Btn small variant="sky" onClick={() => exportPdf(false)}>⬇ paper PDF</Btn>
          <Btn small variant="butter" onClick={() => exportPdf(true)}>⬇ answer key PDF</Btn>
          <Btn small variant="ghost" onClick={() => window.print()}>🖨 print</Btn>
        </div>

        {tab === 'timer' && (
          <div className="text-center mb-3 sticky top-16 z-10">
            <motion.div animate={running ? { scale: [1, 1.03, 1] } : {}} transition={{ repeat: Infinity, duration: 1 }} className={`inline-block nest-box px-5 py-1 font-bubble text-[32px] ${left < 600 ? 'text-[#c0606f]' : ''}`}>{fmtTime(left)}</motion.div>
            <div className="flex gap-2 justify-center mt-2">
              <Btn small onClick={() => setRunning(!running)}>{running ? 'pause' : left === paper.durationHours * 3600 ? 'start' : 'resume'}</Btn>
              <Btn small variant="ghost" onClick={() => { setRunning(false); setLeft(paper.durationHours * 3600); }}>reset</Btn>
              <Btn small variant="pink" onClick={() => { setRunning(false); setTab('score'); }}>finish → enter marks</Btn>
            </div>
          </div>
        )}

        <div className="bg-[#fffdf6] text-[#222] rounded-lg border-2 border-line p-4 sm:p-6 font-serif text-[15px] shadow-inner" style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}>
          <div className="text-center">
            <div className="font-bold text-[17px]">{s.settings.college || 'College name'}</div>
            <div>{sub?.name} {sub?.code && `(${sub.code})`}</div>
            {tab === 'key' && <div className="font-bold mt-1">ANSWER KEY</div>}
          </div>
          <div className="flex justify-between border-b border-[#222] mt-2 pb-1 text-[14px]"><span>Time: {paper.durationHours} Hours</span><span>Maximum Marks: {paper.totalMarks}</span></div>
          {tab !== 'key' && <p className="text-[13px] italic mt-2">Instructions: Write your Roll No. on the top immediately on receipt of this question paper. Marks are indicated against each question.</p>}
          {paper.sections.map((sec, si) => (
            <div key={sec.name} className="mt-4">
              <div className="text-center font-bold">{sec.name.toUpperCase()}</div>
              {sec.instruction && <div className="text-center text-[13px] italic">{sec.instruction}</div>}
              <ol className="mt-2 space-y-2">
                {sec.questions.map((q, qi) => {
                  n++;
                  const orig = s.questions.find((x) => x.id === q.questionId);
                  return (
                    <li key={qi} className="flex gap-2">
                      <span>{n}.</span>
                      <div className="flex-1">
                        {q.text}
                        {tab === 'key' && (
                          <div className="text-[13px] text-[#2f6b3a] mt-0.5">{q.answer ? `Answer: ${q.answer}` : `Linked original: ${orig?.year ? `PYQ ${orig.year}` : orig?.source ?? 'bank'} — “${orig?.text.slice(0, 80)}${(orig?.text.length ?? 0) > 80 ? '…' : ''}”`}</div>
                        )}
                        {tab === 'score' && (
                          <div className="flex items-center gap-1 mt-1 text-[13px] font-sans">
                            marks got: <input type="number" min={0} max={q.marks} className="w-16 border border-[#888] rounded px-1" value={scores[`${si}-${qi}`]} onChange={(e) => setScores({ ...scores, [`${si}-${qi}`]: e.target.value })} /> / {q.marks}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0">({q.marks})</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
        {tab === 'score' && (
          <div className="flex items-center gap-3 mt-3">
            <Btn onClick={saveScores}>save scores ({total}/{paper.totalMarks})</Btn>
            <span className="text-[14px] text-muted">updates mastery for every topic ✿</span>
          </div>
        )}
      </Box>
    </motion.div>
  );
}
