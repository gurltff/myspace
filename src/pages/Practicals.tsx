import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Btn, Empty, Field, Input, PageTitle, TextArea, Tag, Tabs } from '../components/ui';
import { SubjectPicker, useLocalState } from '../components/SubjectPicker';
import { useStore, update, markStudied } from '../store/store';
import { computeRows, columnMean, percentError, finalResult, toKey } from '../lib/observations';
import { formatNum } from '../lib/numerical';
import { saveFile, loadFile } from '../store/files';
import { uid } from '../lib/id';
import { diffDays, ymd } from '../lib/dates';
import type { Experiment } from '../store/types';

const STATUS: Record<Experiment['status'], { label: string; color: string }> = {
  'not-started': { label: 'not started', color: 'var(--panel2)' },
  performed: { label: 'performed', color: 'var(--butter)' },
  revised: { label: 'revised before exam', color: 'var(--sage)' },
};

function ytId(url: string) {
  return url.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)?.[1];
}

export default function Practicals() {
  const s = useStore((x) => x);
  const [subjectId, setSubjectId] = useLocalState('lab-subject', '');
  const [expId, setExpId] = useState<string | null>(null);
  const [mode, setMode] = useState<'list' | 'exam'>('list');
  const exps = s.experiments.filter((e) => e.subjectId === subjectId);
  const exp = exps.find((e) => e.id === expId);
  const sub = s.subjects.find((x) => x.id === subjectId);

  const create = () => {
    const id = uid();
    update((d) => void d.experiments.push({
      id, subjectId, title: 'New experiment', aim: '', apparatus: '', theory: '', formula: '', videos: [], circuitImages: [], embeds: [], steps: [],
      columns: [{ id: uid(), name: 'x', key: 'x' }, { id: uid(), name: 'y', key: 'y' }], rows: [{}, {}, {}], resultFormula: '', resultUnit: '',
      precautions: '', errors: '', viva: [], status: 'not-started',
    }));
    setExpId(id);
  };

  return (
    <div className="space-y-4">
      <Box className="pt-4">
        <PageTitle sub="experiments, circuits, observation tables & viva prep">PRACTICALS</PageTitle>
        <SubjectPicker value={subjectId} onChange={(id) => { setSubjectId(id); setExpId(null); }} />
        <Tabs tabs={[{ id: 'list', label: 'experiments' }, { id: 'exam', label: '🎓 practical exam mode' }]} value={mode} onChange={(m) => { setMode(m); setExpId(null); }} />
      </Box>
      {mode === 'exam' ? (
        <ExamMode exps={exps} practicalDate={sub?.practicalDate} onOpen={(id) => { setMode('list'); setExpId(id); }} />
      ) : exp ? (
        <ExperimentPage key={exp.id} exp={exp} onBack={() => setExpId(null)} />
      ) : (
        <Box title={`experiments · ${exps.length}`} delay={0.05} right={subjectId ? <Btn small onClick={create}>+ experiment</Btn> : null}>
          {exps.length ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {exps.map((e, i) => (
                <motion.button key={e.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} whileHover={{ y: -4, rotate: -0.6 }}
                  onClick={() => setExpId(e.id)} className="text-left border-2 border-line rounded-xl p-3 bg-panel2">
                  <div className="font-round font-extrabold">🧪 {e.title}</div>
                  <div className="text-[14px] text-muted line-clamp-2">{e.aim}</div>
                  <div className="mt-1"><Tag color={STATUS[e.status].color}>{STATUS[e.status].label}</Tag> <Tag>{e.steps.filter((x) => x.done).length}/{e.steps.length} steps</Tag> <Tag>{e.viva.length} viva</Tag></div>
                </motion.button>
              ))}
            </div>
          ) : <Empty>no experiments yet</Empty>}
        </Box>
      )}
    </div>
  );
}

function ExamMode({ exps, practicalDate, onOpen }: { exps: Experiment[]; practicalDate?: string; onOpen: (id: string) => void }) {
  const d = practicalDate ? diffDays(ymd(), practicalDate) : undefined;
  return (
    <Box title="practical exam mode" delay={0.05}>
      {d !== undefined && <p className="mb-2 text-[17px]">⏳ practical exam {d >= 0 ? `in ${d} days` : 'is over'} · {exps.filter((e) => e.status !== 'revised').length} not revised yet</p>}
      {exps.length ? (
        <div className="space-y-2">
          {exps.map((e) => (
            <div key={e.id} className="border-2 border-line/40 rounded-xl p-2 bg-panel2">
              <div className="flex flex-wrap gap-2 items-center">
                <b className="flex-1 min-w-40">{e.title}</b>
                <select className="nest-tag" style={{ background: STATUS[e.status].color }} value={e.status} onChange={(ev) => update((dd) => void (dd.experiments.find((x) => x.id === e.id)!.status = ev.target.value as Experiment['status']))}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
                <Btn small variant="sky" onClick={() => onOpen(e.id)}>open</Btn>
              </div>
              <div className="text-[15px] mt-1 flex flex-wrap gap-x-4 gap-y-1">
                {e.formula && <span>📐 <code>{e.formula}</code></span>}
                {e.embeds[0] && <a className="underline" href={e.embeds[0]} target="_blank" rel="noreferrer">🔌 circuit</a>}
                {e.circuitImages.length > 0 && <span>🖼 {e.circuitImages.length} circuit image(s)</span>}
                {e.viva.length > 0 && <span>💬 {e.viva.length} viva Qs</span>}
              </div>
            </div>
          ))}
        </div>
      ) : <Empty>no experiments</Empty>}
    </Box>
  );
}

function ImageThumb({ fileId, name }: { fileId: string; name: string }) {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    let u: string | undefined;
    loadFile(fileId).then((b) => { if (b) { u = URL.createObjectURL(b); setUrl(u); } });
    return () => { if (u) URL.revokeObjectURL(u); };
  }, [fileId]);
  return url ? <a href={url} target="_blank" rel="noreferrer"><img src={url} alt={name} className="h-32 rounded-lg border-2 border-line object-cover hover:scale-105 transition" /></a> : <div className="h-32 w-32 rounded-lg border-2 border-dashed border-line grid place-items-center text-[13px]">{name}</div>;
}

function ExperimentPage({ exp, onBack }: { exp: Experiment; onBack: () => void }) {
  const set = (fn: (e: Experiment) => void) => update((d) => fn(d.experiments.find((x) => x.id === exp.id)!));
  const [video, setVideo] = useState('');
  const [embed, setEmbed] = useState('');
  const computed = computeRows(exp.columns, exp.rows);
  const resultCol = exp.columns.filter((c) => c.formula).pop();
  const mean = resultCol ? columnMean(computed, resultCol.id) : undefined;
  const final = exp.resultFormula ? finalResult(exp.resultFormula, exp.columns, computed) : mean;
  const err = final !== undefined && exp.standardValue ? percentError(final, exp.standardValue) : undefined;

  const text = (k: 'title' | 'aim' | 'apparatus' | 'theory' | 'formula' | 'precautions' | 'errors', label: string, rows = 2) => (
    <Field label={label}>
      {rows === 0 ? <Input value={exp[k]} onChange={(e) => set((x) => void (x[k] = e.target.value))} /> : <TextArea rows={rows} className="!min-h-0" value={exp[k]} onChange={(e) => set((x) => void (x[k] = e.target.value))} />}
    </Field>
  );

  return (
    <>
      <Box title={exp.title || 'experiment'} delay={0.05} right={<div className="flex gap-1"><Btn small variant="ghost" onClick={onBack}>← back</Btn><Btn small variant="ghost" onClick={() => { if (confirm('Delete experiment?')) { update((d) => void (d.experiments = d.experiments.filter((x) => x.id !== exp.id))); onBack(); } }}>🗑</Btn></div>}>
        <div className="flex gap-1.5 mb-3 flex-wrap">
          {Object.entries(STATUS).map(([k, v]) => (
            <button key={k} onClick={() => { set((x) => void (x.status = k as Experiment['status'])); if (k !== 'not-started') markStudied(); }} className="px-3 rounded-full border-2 border-line text-[14px] transition hover:-translate-y-0.5" style={{ background: exp.status === k ? v.color : 'transparent' }}>{v.label}</button>
          ))}
        </div>
        <div className="grid sm:grid-cols-2 gap-2">
          {text('title', 'title', 0)}
          {text('formula', 'formula', 0)}
          {text('aim', 'aim')}
          {text('apparatus', 'apparatus')}
        </div>
        <div className="mt-2">{text('theory', 'short theory', 3)}</div>
      </Box>

      <Box title="videos" delay={0.1}>
        <div className="grid sm:grid-cols-2 gap-2">
          {exp.videos.map((v, i) => {
            const id = ytId(v);
            return (
              <div key={i} className="relative">
                {id ? <iframe className="w-full aspect-video rounded-lg border-2 border-line" src={`https://www.youtube-nocookie.com/embed/${id}`} title="video" allowFullScreen loading="lazy" /> : <a href={v} className="underline">{v}</a>}
                <button className="absolute top-1 right-1 nest-btn small ghost" onClick={() => set((x) => void x.videos.splice(i, 1))}>✕</button>
              </div>
            );
          })}
        </div>
        <div className="flex gap-2 mt-2"><Input placeholder="paste a YouTube link" value={video} onChange={(e) => setVideo(e.target.value)} /><Btn small disabled={!video} onClick={() => { set((x) => void x.videos.push(video)); setVideo(''); }}>add</Btn></div>
      </Box>

      <Box title="breadboard / circuit" delay={0.12}>
        <div className="flex flex-wrap gap-2">
          {exp.circuitImages.map((c) => <ImageThumb key={c.fileId} {...c} />)}
          <label className="h-32 w-32 rounded-lg border-2 border-dashed border-line grid place-items-center text-center text-[14px] cursor-pointer hover:bg-pill transition">
            + upload image<br />(Fritzing / photo)
            <input type="file" accept="image/*" className="hidden" onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const fileId = await saveFile(f); set((x) => void x.circuitImages.push({ fileId, name: f.name })); }} />
          </label>
        </div>
        {exp.embeds.map((u, i) => (
          <div key={i} className="mt-2 relative">
            <iframe src={u} className="w-full h-80 rounded-lg border-2 border-line bg-white" title="circuit" loading="lazy" />
            <div className="flex gap-2 mt-1 text-[14px]"><a href={u} target="_blank" rel="noreferrer" className="underline">open in new tab</a><button className="text-muted" onClick={() => set((x) => void x.embeds.splice(i, 1))}>remove</button></div>
          </div>
        ))}
        <div className="flex gap-2 mt-2"><Input placeholder="paste a Wokwi or Falstad circuit link" value={embed} onChange={(e) => setEmbed(e.target.value)} /><Btn small disabled={!embed} onClick={() => { set((x) => void x.embeds.push(embed)); setEmbed(''); }}>embed</Btn></div>
      </Box>

      <Box title={`procedure · ${exp.steps.filter((x) => x.done).length}/${exp.steps.length}`} delay={0.14} right={exp.steps.some((x) => x.done) ? <Btn small variant="ghost" onClick={() => set((x) => x.steps.forEach((st) => (st.done = false)))}>reset</Btn> : null}>
        <div className="space-y-1">
          <AnimatePresence>
            {exp.steps.map((st, i) => (
              <motion.div key={st.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} className="flex gap-2 items-start">
                <input type="checkbox" className="checkbox mt-1" checked={st.done} onChange={() => set((x) => void (x.steps[i].done = !x.steps[i].done))} />
                <span className="font-bold pt-0.5">{i + 1}.</span>
                <input className={`bg-transparent flex-1 outline-none ${st.done ? 'line-through text-muted' : ''}`} value={st.text} onChange={(e) => set((x) => void (x.steps[i].text = e.target.value))} />
                <button className="text-muted" onClick={() => set((x) => void x.steps.splice(i, 1))}>✕</button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <button className="text-[14px] text-muted mt-1 hover:text-ink" onClick={() => set((x) => void x.steps.push({ id: uid(), text: '', done: false }))}>+ add step</button>
      </Box>

      <Box title="observation table" delay={0.16}>
        <div className="overflow-x-auto nest-scroll">
          <table className="text-[15px] border-collapse min-w-full">
            <thead>
              <tr>
                <th className="px-1 text-muted">#</th>
                {exp.columns.map((c, ci) => (
                  <th key={c.id} className="px-1 py-1 align-top min-w-28">
                    <input className="nest-input !py-0 !text-[14px] font-bold" value={c.name} onChange={(e) => set((x) => { x.columns[ci].name = e.target.value; x.columns[ci].key = toKey(e.target.value) || x.columns[ci].key; })} />
                    <input className="nest-input !py-0 !text-[12px] font-mono mt-0.5" placeholder="formula (optional)" value={c.formula ?? ''} onChange={(e) => set((x) => void (x.columns[ci].formula = e.target.value || undefined))} />
                    <div className="text-[11px] text-muted font-mono flex justify-between">var: {c.key}<button onClick={() => set((x) => void x.columns.splice(ci, 1))}>✕</button></div>
                  </th>
                ))}
                <th><Btn small variant="ghost" onClick={() => set((x) => void x.columns.push({ id: uid(), name: `col${x.columns.length + 1}`, key: `col${x.columns.length + 1}` }))}>+ col</Btn></th>
              </tr>
            </thead>
            <tbody>
              {exp.rows.map((r, ri) => (
                <tr key={ri}>
                  <td className="px-1 text-muted">{ri + 1}</td>
                  {exp.columns.map((c) => (
                    <td key={c.id} className="px-1 py-0.5">
                      {c.formula ? (
                        <div className="nest-input !py-0 !bg-pill text-right">{typeof computed[ri][c.id] === 'number' ? formatNum(computed[ri][c.id] as number, 4) : '—'}</div>
                      ) : (
                        <input className="nest-input !py-0 text-right" value={r[c.id] ?? ''} onChange={(e) => set((x) => void (x.rows[ri][c.id] = e.target.value))} />
                      )}
                    </td>
                  ))}
                  <td><button className="text-muted px-1" onClick={() => set((x) => void x.rows.splice(ri, 1))}>✕</button></td>
                </tr>
              ))}
              <tr>
                <td />
                {exp.columns.map((c) => { const m = columnMean(computed, c.id); return <td key={c.id} className="px-1 text-[13px] text-muted text-right">{m !== undefined ? `mean ${formatNum(m, 4)}` : ''}</td>; })}
              </tr>
            </tbody>
          </table>
        </div>
        <Btn small variant="ghost" className="mt-1" onClick={() => set((x) => void x.rows.push({}))}>+ row</Btn>
        <div className="grid sm:grid-cols-3 gap-2 mt-3">
          <Field label="final result formula (use mean_<var>)"><Input className="font-mono !text-[14px]" value={exp.resultFormula} placeholder="mean_g" onChange={(e) => set((x) => void (x.resultFormula = e.target.value))} /></Field>
          <Field label="standard value"><Input type="number" value={exp.standardValue ?? ''} onChange={(e) => set((x) => void (x.standardValue = e.target.value ? Number(e.target.value) : undefined))} /></Field>
          <Field label="unit"><Input value={exp.resultUnit} onChange={(e) => set((x) => void (x.resultUnit = e.target.value))} /></Field>
        </div>
        <motion.div key={String(final)} initial={{ scale: 0.95, opacity: 0.5 }} animate={{ scale: 1, opacity: 1 }} className="mt-3 nest-box !bg-pill px-3 py-2 inline-block">
          result: <b>{final !== undefined ? formatNum(final, 4) : '—'} {exp.resultUnit}</b>
          {err !== undefined && <> · % error vs {exp.standardValue}: <b className={err > 5 ? 'text-[#c0606f]' : ''}>{err.toFixed(2)}%</b></>}
        </motion.div>
      </Box>

      <div className="grid sm:grid-cols-2 gap-4">
        <Box title="precautions" delay={0.18}><TextArea rows={4} value={exp.precautions} onChange={(e) => set((x) => void (x.precautions = e.target.value))} /></Box>
        <Box title="sources of error" delay={0.2}><TextArea rows={4} value={exp.errors} onChange={(e) => set((x) => void (x.errors = e.target.value))} /></Box>
      </div>
      <Viva exp={exp} set={set} />
    </>
  );
}

function Viva({ exp, set }: { exp: Experiment; set: (fn: (e: Experiment) => void) => void }) {
  const [quiz, setQuiz] = useState(false);
  const [i, setI] = useState(0);
  const [show, setShow] = useState(false);
  const [q, setQ] = useState('');
  const [a, setA] = useState('');
  const cur = exp.viva[i % Math.max(1, exp.viva.length)];
  return (
    <Box title={`viva · ${exp.viva.length}`} delay={0.22} right={exp.viva.length ? <Btn small variant="pink" onClick={() => { setQuiz(!quiz); setI(0); setShow(false); }}>{quiz ? 'stop quiz' : '🎤 quiz me'}</Btn> : null}>
        {quiz && cur ? (
          <div className="text-center py-4">
            <AnimatePresence mode="wait">
              <motion.div key={i} initial={{ opacity: 0, rotateY: -90 }} animate={{ opacity: 1, rotateY: 0 }} exit={{ opacity: 0, rotateY: 90 }} transition={{ duration: 0.35 }}>
                <p className="text-muted text-[14px]">question {(i % exp.viva.length) + 1} / {exp.viva.length}</p>
                <p className="font-round font-extrabold text-[20px] my-2">{cur.q}</p>
                {show ? <motion.p initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="text-[17px]">{cur.a}</motion.p> : <Btn variant="sky" onClick={() => setShow(true)}>show answer</Btn>}
              </motion.div>
            </AnimatePresence>
            <Btn className="mt-3" onClick={() => { setI(i + 1); setShow(false); markStudied(); }}>next →</Btn>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {exp.viva.map((v, k) => (
                <details key={v.id} className="border-2 border-line/40 rounded-xl px-2 py-1 bg-panel2 group">
                  <summary className="cursor-pointer font-bold flex justify-between">{v.q}<button className="text-muted font-normal" onClick={(e) => { e.preventDefault(); set((x) => void x.viva.splice(k, 1)); }}>✕</button></summary>
                  <p className="text-[16px] mt-1">{v.a}</p>
                </details>
              ))}
            </div>
            <div className="grid gap-2 mt-3">
              <Input placeholder="viva question" value={q} onChange={(e) => setQ(e.target.value)} />
              <TextArea rows={2} className="!min-h-0" placeholder="answer" value={a} onChange={(e) => setA(e.target.value)} />
              <Btn small disabled={!q} onClick={() => { set((x) => void x.viva.push({ id: uid(), q, a })); setQ(''); setA(''); }}>+ add viva question</Btn>
            </div>
          </>
        )}
    </Box>
  );
}

