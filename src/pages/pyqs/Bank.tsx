import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Btn, Empty, Field, Input, Select, TextArea, Tag, Modal } from '../../components/ui';
import { useStore, update } from '../../store/store';
import { repeatCounts } from '../../lib/repeats';
import { suggestTopics } from '../../lib/tagging';
import { splitBatch, detectType, type QType } from '../../lib/questions';
import { detectStem } from '../../lib/stems';
import { uid } from '../../lib/id';
import { ymd } from '../../lib/dates';
import type { Question } from '../../store/types';

const SRC_LABEL: Record<string, string> = { pyq: 'original PYQ', generated: 'generated', mine: 'added by me', variant: 'numerical variant' };
const SRC_COLOR: Record<string, string> = { pyq: 'var(--sky)', generated: 'var(--lilac)', mine: 'var(--butter)', variant: 'var(--pink)' };

export default function Bank({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const all = s.questions.filter((q) => q.subjectId === subjectId);
  const topics = s.topics.filter((t) => t.subjectId === subjectId);
  const units = s.units.filter((u) => u.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const lite = topics.map((t) => ({ id: t.id, name: t.name, unitId: t.unitId }));
  const [f, setF] = useState({ q: '', unit: '', topic: '', type: '', source: '', pending: false, repeated: false });
  const [adding, setAdding] = useState(false);
  const counts = useMemo(() => repeatCounts(all.filter((q) => q.source === 'pyq').map((q) => ({ id: q.id, text: q.text, year: q.year }))), [all]);
  const pending = all.filter((q) => !q.approved);

  const list = all.filter((q) =>
    (f.pending ? !q.approved : q.approved) &&
    (!f.q || q.text.toLowerCase().includes(f.q.toLowerCase())) &&
    (!f.unit || q.unitId === f.unit) && (!f.topic || q.topicId === f.topic) &&
    (!f.type || q.type === f.type) && (!f.source || q.source === f.source) && (!f.repeated || (counts[q.id] ?? 0) > 1),
  );
  const set = (id: string, patch: Partial<Question>) => update((d) => Object.assign(d.questions.find((q) => q.id === id)!, patch));

  return (
    <>
      <Box title={`question bank · ${all.filter((q) => q.approved).length}`} delay={0.05} right={<Btn small onClick={() => setAdding(true)}>+ add</Btn>}>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-2">
          <Input placeholder="search…" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} className="col-span-2 sm:col-span-1" />
          <Select value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value, topic: '' })}><option value="">all units</option>{units.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</Select>
          <Select value={f.topic} onChange={(e) => setF({ ...f, topic: e.target.value })}><option value="">all topics</option>{topics.filter((t) => !f.unit || t.unitId === f.unit).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</Select>
          <Select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })}><option value="">all types</option>{['theory', 'numerical', 'short', 'long'].map((t) => <option key={t}>{t}</option>)}</Select>
          <Select value={f.source} onChange={(e) => setF({ ...f, source: e.target.value })}><option value="">all sources</option>{Object.entries(SRC_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</Select>
        </div>
        <div className="flex gap-3 text-[15px] mb-2 flex-wrap">
          <label className="flex items-center gap-1.5"><input type="checkbox" className="checkbox" checked={f.repeated} onChange={(e) => setF({ ...f, repeated: e.target.checked })} /> frequently asked only</label>
          <label className="flex items-center gap-1.5"><input type="checkbox" className="checkbox" checked={f.pending} onChange={(e) => setF({ ...f, pending: e.target.checked })} /> awaiting approval ({pending.length})</label>
        </div>
        {list.length ? (
          <div className="space-y-2">
            {list.slice(0, 150).map((q, i) => {
              const sugg = suggestTopics(q.text, lite, 2).filter((x) => x.topic.id !== q.topicId);
              return (
                <motion.div key={q.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} className="border-2 border-line/40 rounded-xl p-2 bg-panel2">
                  <div className="flex gap-2">
                    <p className="flex-1 text-[16px]">{q.text}</p>
                    {q.marks !== undefined && <span className="font-bubble text-[15px] shrink-0">[{q.marks}]</span>}
                  </div>
                  {q.answer && <p className="text-[14px] text-muted">answer: {q.answer}</p>}
                  <div className="flex flex-wrap gap-1.5 mt-1 items-center text-[13px]">
                    <Tag color={SRC_COLOR[q.source]}>{SRC_LABEL[q.source]}</Tag>
                    {q.year && <Tag>{q.year}</Tag>}
                    {q.section && <Tag>{q.section}</Tag>}
                    <select className="nest-tag !text-[13px]" value={q.type} onChange={(e) => set(q.id, { type: e.target.value as QType })}>{['theory', 'numerical', 'short', 'long'].map((t) => <option key={t}>{t}</option>)}</select>
                    {(counts[q.id] ?? 0) > 1 && <Tag color="var(--pink)">🔥 Frequently Asked ×{counts[q.id]}</Tag>}
                    {q.timesPractised > 0 && <Tag>practised ×{q.timesPractised}{q.lastScore !== undefined ? ` · last ${Math.round(q.lastScore * 100)}%` : ''}</Tag>}
                    <select className="nest-tag !text-[13px] max-w-52" value={q.topicId ?? ''} onChange={(e) => { const t = topics.find((x) => x.id === e.target.value); set(q.id, { topicId: t?.id, unitId: t?.unitId }); }}>
                      <option value="">— no topic —</option>
                      {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    {sugg[0] && sugg[0].score >= 0.3 && <Tag onClick={() => set(q.id, { topicId: sugg[0].topic.id, unitId: sugg[0].topic.unitId })} title="suggested by keyword match — click to confirm">💡 {sugg[0].topic.name}</Tag>}
                    <span className="flex-1" />
                    {!q.approved && <Btn small onClick={() => set(q.id, { approved: true })}>approve ✓</Btn>}
                    <EditQ q={q} />
                    <button className="text-muted hover:text-ink" onClick={() => update((d) => void (d.questions = d.questions.filter((x) => x.id !== q.id)))}>✕</button>
                  </div>
                </motion.div>
              );
            })}
            {list.length > 150 && <p className="text-muted text-center">showing first 150 — use the filters ✿</p>}
          </div>
        ) : <Empty>no questions match</Empty>}
      </Box>
      <AddQuestions open={adding} onClose={() => setAdding(false)} subjectId={subjectId} />
    </>
  );
}

function EditQ({ q }: { q: Question }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(q.text);
  const [marks, setMarks] = useState(q.marks?.toString() ?? '');
  return (
    <>
      <button className="text-muted hover:text-ink" onClick={() => setOpen(true)}>✎</button>
      <Modal open={open} onClose={() => setOpen(false)} title="edit question">
        <TextArea rows={5} value={text} onChange={(e) => setText(e.target.value)} />
        <Field label="marks" className="mt-2"><Input type="number" value={marks} onChange={(e) => setMarks(e.target.value)} /></Field>
        <Btn className="mt-2" onClick={() => { update((d) => { const x = d.questions.find((y) => y.id === q.id)!; x.text = text; x.marks = marks ? Number(marks) : undefined; x.stem = detectStem(text)?.stem.id; }); setOpen(false); }}>save</Btn>
      </Modal>
    </>
  );
}

function AddQuestions({ open, onClose, subjectId }: { open: boolean; onClose: () => void; subjectId: string }) {
  const topics = useStore((s) => s.topics.filter((t) => t.subjectId === subjectId));
  const [raw, setRaw] = useState('');
  const [year, setYear] = useState('');
  const parsed = raw.trim() ? splitBatch(raw) : [];
  const lite = topics.map((t) => ({ id: t.id, name: t.name, unitId: t.unitId }));
  return (
    <Modal open={open} onClose={onClose} title="add questions" wide>
      <p className="text-[15px] text-muted mb-1">type one question, or paste a batch (numbered “1.”, “Q2”, one per line…). Marks like (5) are detected.</p>
      <TextArea rows={8} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'1. Define Poynting vector. (2)\n2. Derive the wave equation for E in free space. (6)'} />
      <div className="flex gap-2 items-end mt-2">
        <Field label="year (optional)"><Input value={year} onChange={(e) => setYear(e.target.value)} className="!w-28" /></Field>
        <Btn disabled={!parsed.length} onClick={() => {
          update((d) => parsed.forEach((q) => {
            const t = suggestTopics(q.text, lite, 1)[0];
            const topic = t && t.score >= 0.3 ? t.topic : undefined;
            d.questions.push({ id: uid(), subjectId, text: q.text, marks: q.marks, year: year ? Number(year) : undefined, section: q.section, type: detectType(q.text, q.marks), source: 'mine', timesPractised: 0, approved: true, topicId: topic?.id, unitId: topic?.unitId, stem: detectStem(q.text)?.stem.id, createdAt: ymd() });
          }));
          setRaw('');
          onClose();
        }}>add {parsed.length || ''} question{parsed.length === 1 ? '' : 's'}</Btn>
      </div>
      {parsed.length > 0 && <ol className="list-decimal pl-6 mt-2 text-[15px] max-h-40 overflow-y-auto nest-scroll">{parsed.map((q, i) => <li key={i}>{q.text} {q.marks && <b>[{q.marks}]</b>}</li>)}</ol>}
    </Modal>
  );
}
