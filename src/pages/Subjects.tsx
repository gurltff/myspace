import { useMemo, useState } from 'react';
import { Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, TouchSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, Btn, Empty, Field, Input, PageTitle, Select, Stars, Tabs, Tag, TextArea, Modal } from '../components/ui';
import { useStore, update, getState, markStudied } from '../store/store';
import { activeSubjects, topicMastery } from '../store/derive';
import { parseSyllabus, splitTopicLine } from '../lib/syllabus';
import { behindBy, reschedule, type Difficulty } from '../lib/planner';
import { addDays, parseYmd, prettyDate, ymd } from '../lib/dates';
import { uid } from '../lib/id';
import { SUBJECT_COLORS } from '../store/seed';
import type { Topic, Unit } from '../store/types';
import { useLocalState } from '../components/SubjectPicker';

export default function Subjects() {
  const nav = useNavigate();
  const loc = useLocation();
  const tab = loc.pathname.includes('/plan') ? 'plan' : 'subjects';
  return (
    <div className="space-y-6">
      <Box className="pt-4">
        <PageTitle sub="semesters, syllabus & a rule-based study plan">Subjects &amp; Plan</PageTitle>
        <Tabs tabs={[{ id: 'subjects', label: 'semesters & syllabus' }, { id: 'plan', label: 'study plan' }]} value={tab} onChange={(t) => nav(t === 'plan' ? '/subjects/plan' : '/subjects')} />
      </Box>
      <Routes>
        <Route path="plan" element={<Plan />} />
        <Route path="*" element={<SemestersView />} />
      </Routes>
    </div>
  );
}

/* ---------------- semesters & subjects ---------------- */

function SemestersView() {
  const s = useStore((x) => x);
  const [semId, setSemId] = useLocalState('sem', s.semesters.find((x) => !x.archived)?.id ?? '');
  const [subId, setSubId] = useLocalState('subject', '');
  const [newSem, setNewSem] = useState('');
  const [adding, setAdding] = useState(false);
  const sem = s.semesters.find((x) => x.id === semId) ?? s.semesters[0];
  const subs = s.subjects.filter((x) => x.semesterId === sem?.id);
  const sub = subs.find((x) => x.id === subId) ?? subs[0];

  return (
    <>
      <Box title="semesters" delay={0.05}>
        <div className="flex flex-wrap gap-2 items-center">
          {s.semesters.map((x) => (
            <button key={x.id} onClick={() => setSemId(x.id)}
              className={`px-3 py-0.5 rounded-full border-2 border-line font-round text-[15px] transition-all hover:-translate-y-0.5 ${x.archived ? 'opacity-60' : ''}`}
              style={{ background: sem?.id === x.id ? 'var(--sage)' : 'var(--panel2)', color: sem?.id === x.id ? '#3e3a2e' : undefined }}>
              {x.name} {x.archived && '📦'}
            </button>
          ))}
          <div className="flex gap-1.5">
            <Input placeholder="Sem 4, 2027" value={newSem} onChange={(e) => setNewSem(e.target.value)} className="!w-36" />
            <Btn small disabled={!newSem.trim()} onClick={() => {
              const id = uid();
              update((d) => void d.semesters.push({ id, name: newSem.trim(), archived: false, createdAt: ymd() }));
              setSemId(id);
              setNewSem('');
            }}>+ add</Btn>
          </div>
        </div>
        {sem && (
          <div className="mt-2 flex gap-2 items-center text-[15px]">
            <Btn small variant="ghost" onClick={() => update((d) => { const x = d.semesters.find((q) => q.id === sem.id)!; x.archived = !x.archived; })}>
              {sem.archived ? 'unarchive' : 'archive semester'}
            </Btn>
            <span className="text-muted">{sem.archived ? 'archived — read only-ish, still here forever ✿' : 'archived semesters are never deleted'}</span>
          </div>
        )}
      </Box>

      {sem && (
        <Box title={`subjects in ${sem.name}`} delay={0.1} right={<Btn small onClick={() => setAdding(true)}>+ subject</Btn>}>
          {subs.length ? (
            <div className="grid sm:grid-cols-2 gap-2">
              {subs.map((x, i) => (
                <motion.button key={x.id} onClick={() => setSubId(x.id)} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  whileHover={{ y: -3, rotate: -0.5 }}
                  className="text-left border-2 border-line rounded-xl p-2"
                  style={{ background: sub?.id === x.id ? x.color : 'var(--panel2)', color: sub?.id === x.id ? '#3e3a2e' : undefined }}>
                  <div className="font-round font-extrabold">{x.name} <span className="font-normal text-[14px] opacity-70">{x.code}</span></div>
                  <div className="text-[14px] opacity-80">
                    {s.topics.filter((t) => t.subjectId === x.id).length} topics · exam {x.examDate ? prettyDate(x.examDate) : '—'}
                  </div>
                </motion.button>
              ))}
            </div>
          ) : <Empty>no subjects yet</Empty>}
        </Box>
      )}
      {sub && <SubjectEditor key={sub.id} subjectId={sub.id} />}
      <AddSubject open={adding} onClose={() => setAdding(false)} semesterId={sem?.id} onAdded={setSubId} />
    </>
  );
}

function AddSubject({ open, onClose, semesterId, onAdded }: { open: boolean; onClose: () => void; semesterId?: string; onAdded: (id: string) => void }) {
  const [f, setF] = useState({ name: '', code: '', examDate: '', practicalDate: '' });
  return (
    <Modal open={open} onClose={onClose} title="new subject">
      <div className="space-y-2">
        <Field label="name"><Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Electricity & Magnetism" /></Field>
        <Field label="paper code"><Input value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="exam date"><Input type="date" value={f.examDate} onChange={(e) => setF({ ...f, examDate: e.target.value })} /></Field>
          <Field label="practical date"><Input type="date" value={f.practicalDate} onChange={(e) => setF({ ...f, practicalDate: e.target.value })} /></Field>
        </div>
        <Btn disabled={!f.name || !semesterId} onClick={() => {
          const id = uid();
          update((d) => void d.subjects.push({
            id, semesterId: semesterId!, name: f.name, code: f.code, examDate: f.examDate || undefined, practicalDate: f.practicalDate || undefined,
            syllabusRaw: '', color: SUBJECT_COLORS[d.subjects.length % SUBJECT_COLORS.length],
          }));
          onAdded(id);
          setF({ name: '', code: '', examDate: '', practicalDate: '' });
          onClose();
        }}>create ✿</Btn>
      </div>
    </Modal>
  );
}

function SubjectEditor({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const sub = s.subjects.find((x) => x.id === subjectId)!;
  const [raw, setRaw] = useState(sub.syllabusRaw);
  const [split, setSplit] = useState(true);
  const preview = useMemo(() => parseSyllabus(raw, { split }), [raw, split]);
  const units = s.units.filter((u) => u.subjectId === subjectId).sort((a, b) => a.order - b.order);
  const [showParse, setShowParse] = useState(!units.length);
  const set = (k: 'name' | 'code' | 'examDate' | 'practicalDate' | 'color', v: string) =>
    update((d) => { const x = d.subjects.find((q) => q.id === subjectId)!; (x as Record<string, unknown>)[k] = v || undefined; });

  const applyParse = () => {
    if (units.length && !confirm('Replace existing units & topics with the parsed syllabus?')) return;
    update((d) => {
      const oldUnits = new Set(d.units.filter((u) => u.subjectId === subjectId).map((u) => u.id));
      d.units = d.units.filter((u) => !oldUnits.has(u.id));
      d.topics = d.topics.filter((t) => t.subjectId !== subjectId);
      d.subjects.find((x) => x.id === subjectId)!.syllabusRaw = raw;
      preview.forEach((u, ui) => {
        d.units.push({ id: u.id, subjectId, name: u.name, order: ui });
        u.topics.forEach((t, ti) => d.topics.push({ id: t.id, subjectId, unitId: u.id, name: t.name, order: ti, difficulty: 'medium', confidence: null, sourceLine: t.sourceLine }));
      });
    });
    setShowParse(false);
  };

  return (
    <>
      <Box title={sub.name} delay={0.15} right={<Btn small variant="ghost" onClick={() => { if (confirm(`Delete ${sub.name} and everything in it?`)) update((d) => { d.subjects = d.subjects.filter((x) => x.id !== subjectId); d.topics = d.topics.filter((t) => t.subjectId !== subjectId); d.units = d.units.filter((u) => u.subjectId !== subjectId); }); }}>🗑</Btn>}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Field label="name"><Input value={sub.name} onChange={(e) => set('name', e.target.value)} /></Field>
          <Field label="code"><Input value={sub.code ?? ''} onChange={(e) => set('code', e.target.value)} /></Field>
          <Field label="exam date"><Input type="date" value={sub.examDate ?? ''} onChange={(e) => set('examDate', e.target.value)} /></Field>
          <Field label="practical date"><Input type="date" value={sub.practicalDate ?? ''} onChange={(e) => set('practicalDate', e.target.value)} /></Field>
        </div>
        <div className="flex gap-1.5 mt-2 items-center">
          <span className="text-[14px] text-muted">colour</span>
          {SUBJECT_COLORS.map((c) => (
            <button key={c} onClick={() => set('color', c)} className="w-6 h-6 rounded-full border-2 border-line transition-transform hover:scale-125" style={{ background: c, transform: sub.color === c ? 'scale(1.2)' : undefined }} />
          ))}
        </div>
        <hr className="nest-divider my-3" />
        <Btn small variant="sky" onClick={() => setShowParse(!showParse)}>{showParse ? 'hide syllabus parser' : '📋 paste / re-parse syllabus'}</Btn>
        <AnimatePresence>
          {showParse && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="grid md:grid-cols-2 gap-3 mt-3">
                <div>
                  <TextArea rows={12} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder={'Unit 1: Vector Analysis\nScalar and vector products, Gradient, Divergence, Curl\nUnit 2: ...'} />
                  <label className="flex items-center gap-2 mt-1 text-[15px]"><input type="checkbox" className="checkbox" checked={split} onChange={(e) => setSplit(e.target.checked)} /> split long lines on commas / semicolons</label>
                </div>
                <div className="border-2 border-dashed border-line/50 rounded-xl p-2 max-h-80 overflow-y-auto nest-scroll text-[15px]">
                  <div className="text-muted text-[13px] mb-1">preview — {preview.length} units, {preview.reduce((a, u) => a + u.topics.length, 0)} topics</div>
                  {preview.map((u) => (
                    <div key={u.id} className="mb-2"><b>{u.name}</b><ul className="pl-4 list-['✿_']">{u.topics.map((t) => <li key={t.id}>{t.name}</li>)}</ul></div>
                  ))}
                </div>
              </div>
              <Btn className="mt-2" onClick={applyParse} disabled={!preview.length}>save units & topics</Btn>
            </motion.div>
          )}
        </AnimatePresence>
      </Box>
      <UnitsEditor subjectId={subjectId} units={units} />
    </>
  );
}

function UnitsEditor({ subjectId, units }: { subjectId: string; units: Unit[] }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));
  const onUnitDrag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = units.map((u) => u.id);
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    update((d) => next.forEach((id, i) => (d.units.find((u) => u.id === id)!.order = i)));
  };
  return (
    <Box title="units & topics" delay={0.2} right={<Btn small onClick={() => update((d) => void d.units.push({ id: uid(), subjectId, name: `Unit ${units.length + 1}`, order: units.length }))}>+ unit</Btn>}>
      <p className="text-[14px] text-muted mb-2">drag ⠿ to reorder · tap stars for confidence · edit names inline</p>
      {units.length ? (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onUnitDrag}>
          <SortableContext items={units.map((u) => u.id)} strategy={verticalListSortingStrategy}>
            <div className="space-y-3">{units.map((u) => <UnitCard key={u.id} unit={u} units={units} />)}</div>
          </SortableContext>
        </DndContext>
      ) : <Empty>paste a syllabus above to get started</Empty>}
    </Box>
  );
}

function useSortableStyle(id: string) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return {
    ref: setNodeRef,
    handle: { ...attributes, ...listeners },
    style: { transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 30 : undefined, opacity: isDragging ? 0.85 : 1 },
  };
}

function UnitCard({ unit, units }: { unit: Unit; units: Unit[] }) {
  const topics = useStore((s) => s.topics.filter((t) => t.unitId === unit.id).sort((a, b) => a.order - b.order));
  const { ref, handle, style } = useSortableStyle(unit.id);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }), useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }));
  const [open, setOpen] = useState(true);
  const onDrag = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const ids = topics.map((t) => t.id);
    const next = arrayMove(ids, ids.indexOf(String(e.active.id)), ids.indexOf(String(e.over.id)));
    update((d) => next.forEach((id, i) => (d.topics.find((t) => t.id === id)!.order = i)));
  };
  return (
    <div ref={ref} style={style} className="border-2 border-line rounded-xl bg-panel2 p-2">
      <div className="flex items-center gap-2">
        <button {...handle} className="cursor-grab text-muted touch-none px-1" aria-label="drag unit">⠿</button>
        <input className="bg-transparent font-round font-extrabold flex-1 min-w-0 outline-none" value={unit.name} onChange={(e) => update((d) => void (d.units.find((u) => u.id === unit.id)!.name = e.target.value))} />
        <button onClick={() => setOpen(!open)} className="text-muted transition-transform" style={{ transform: open ? 'rotate(90deg)' : undefined }}>▶</button>
        <button className="text-muted hover:text-ink" title="delete unit" onClick={() => confirm('Delete this unit and its topics?') && update((d) => { d.units = d.units.filter((u) => u.id !== unit.id); d.topics = d.topics.filter((t) => t.unitId !== unit.id); })}>✕</button>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDrag}>
              <SortableContext items={topics.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                <div className="mt-1 space-y-1">{topics.map((t) => <TopicRow key={t.id} topic={t} units={units} />)}</div>
              </SortableContext>
            </DndContext>
            <button className="text-[14px] text-muted hover:text-ink mt-1 ml-6" onClick={() => update((d) => void d.topics.push({ id: uid(), subjectId: unit.subjectId, unitId: unit.id, name: 'new topic', order: topics.length, difficulty: 'medium', confidence: null }))}>+ add topic</button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TopicRow({ topic, units }: { topic: Topic; units: Unit[] }) {
  const { ref, handle, style } = useSortableStyle(topic.id);
  const siblings = useStore((s) => s.topics.filter((t) => t.sourceLine && t.sourceLine === topic.sourceLine && t.unitId === topic.unitId));
  const set = (fn: (t: Topic) => void) => update((d) => fn(d.topics.find((t) => t.id === topic.id)!));
  const isFirstOfSplit = siblings.length > 1 && [...siblings].sort((a, b) => a.order - b.order)[0].id === topic.id;
  return (
    <div ref={ref} style={style} className="flex flex-wrap items-center gap-x-2 gap-y-1 bg-panel rounded-lg border border-line/30 px-1.5 py-1">
      <button {...handle} className="cursor-grab text-muted touch-none" aria-label="drag topic">⠿</button>
      <input className="bg-transparent flex-1 min-w-[140px] outline-none text-[16px]" value={topic.name} onChange={(e) => set((t) => void (t.name = e.target.value))} />
      <select className="bg-panel2 border border-line/40 rounded-md text-[14px] px-1" value={topic.difficulty} onChange={(e) => set((t) => void (t.difficulty = e.target.value as Difficulty))}>
        <option value="easy">easy</option><option value="medium">medium</option><option value="hard">hard</option>
      </select>
      <Stars value={topic.confidence} onChange={(v) => set((t) => void (t.confidence = v))} />
      {units.length > 1 && (
        <select className="bg-panel2 border border-line/40 rounded-md text-[13px] px-1 max-w-24" value={topic.unitId} title="move to unit" onChange={(e) => set((t) => void (t.unitId = e.target.value))}>
          {units.map((u) => <option key={u.id} value={u.id}>{u.name.split(':')[0]}</option>)}
        </select>
      )}
      {isFirstOfSplit && (
        <button className="text-[13px] underline text-muted" title="merge the split pieces back into one topic" onClick={() => update((d) => {
          const ids = new Set(siblings.map((x) => x.id));
          const first = d.topics.find((t) => t.id === topic.id)!;
          first.name = topic.sourceLine!.replace(/[.\s]+$/, '');
          first.sourceLine = undefined;
          d.topics = d.topics.filter((t) => !ids.has(t.id) || t.id === topic.id);
        })}>undo split</button>
      )}
      {!topic.sourceLine && /[,;]/.test(topic.name) && (
        <button className="text-[13px] underline text-muted" onClick={() => update((d) => {
          const parts = splitTopicLine(topic.name);
          const t = d.topics.find((x) => x.id === topic.id)!;
          const line = t.name;
          t.name = parts[0];
          t.sourceLine = line;
          parts.slice(1).forEach((p, i) => d.topics.push({ ...t, id: uid(), name: p, order: t.order + (i + 1) * 0.01 }));
        })}>split</button>
      )}
      <button className="text-muted hover:text-ink" onClick={() => update((d) => void (d.topics = d.topics.filter((t) => t.id !== topic.id)))}>✕</button>
    </div>
  );
}

/* ---------------- study plan ---------------- */

const WEEKDAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

function planInputs() {
  const s = getState();
  const subs = activeSubjects(s);
  const m = topicMastery(s);
  return {
    subs,
    topics: s.topics.filter((t) => subs.some((x) => x.id === t.subjectId)).map((t) => ({
      id: t.id, subjectId: t.subjectId, difficulty: t.difficulty, order: (s.units.find((u) => u.id === t.unitId)?.order ?? 0) * 1000 + t.order,
      weakness: m[t.id] === null ? (t.confidence ? (5 - t.confidence) / 4 : 0.6) : 1 - (m[t.id] as number) / 100,
    })),
    opts: { start: ymd(), hoursPerDay: s.plan.hoursPerDay, daysOff: s.plan.daysOff, weekdaysOff: s.plan.weekdaysOff },
  };
}

function Plan() {
  const s = useStore((x) => x);
  const today = ymd();
  const subs = activeSubjects(s);
  const [view, setView] = useState<'month' | 'week'>('month');
  const [cursor, setCursor] = useState(today);
  const [dayOff, setDayOff] = useState('');
  const [selected, setSelected] = useState(today);
  const live = s.planTasks.filter((t) => subs.some((x) => x.id === t.subjectId));
  const b = behindBy(live, today);
  const name = (id: string) => s.topics.find((t) => t.id === id)?.name ?? '(deleted topic)';
  const color = (id: string) => s.subjects.find((x) => x.id === id)?.color ?? 'var(--pill)';

  const generate = () => {
    if (live.some((t) => t.done) && !confirm('Regenerate the plan? Completed tasks are kept.')) return;
    const { subs, topics, opts } = planInputs();
    const r = reschedule(getState().planTasks, subs, topics, opts);
    update((d) => {
      d.planTasks = [...r.keep, ...r.fresh.map((t) => ({ ...t, id: uid(), done: false }))];
      d.plan.generatedAt = today;
      d.plan.lastMoved = 0;
    });
  };
  const resched = () => {
    const { subs, topics, opts } = planInputs();
    const r = reschedule(getState().planTasks, subs, topics, opts);
    update((d) => {
      d.planTasks = [...r.keep, ...r.fresh.map((t) => ({ ...t, id: uid(), done: false }))];
      d.plan.lastMoved = r.moved;
    });
  };

  const byDate = useMemo(() => {
    const m = new Map<string, typeof live>();
    for (const t of live) m.set(t.date, [...(m.get(t.date) ?? []), t]);
    return m;
  }, [live]);

  const cur = parseYmd(cursor);
  const days: (string | null)[] = [];
  if (view === 'month') {
    const first = new Date(cur.getFullYear(), cur.getMonth(), 1);
    for (let i = 0; i < first.getDay(); i++) days.push(null);
    const n = new Date(cur.getFullYear(), cur.getMonth() + 1, 0).getDate();
    for (let i = 1; i <= n; i++) days.push(ymd(new Date(cur.getFullYear(), cur.getMonth(), i)));
  } else {
    const start = addDays(cursor, -cur.getDay());
    for (let i = 0; i < 7; i++) days.push(addDays(start, i));
  }
  const step = (n: number) => setCursor(view === 'month' ? ymd(new Date(cur.getFullYear(), cur.getMonth() + n, 1)) : addDays(cursor, 7 * n));
  const selTasks = byDate.get(selected) ?? [];

  return (
    <>
      <Box title="plan settings" delay={0.05}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label={`study hours per day: ${s.plan.hoursPerDay}h`}>
            <input type="range" min={1} max={12} step={0.5} value={s.plan.hoursPerDay} onChange={(e) => update((d) => void (d.plan.hoursPerDay = Number(e.target.value)))} className="w-full accent-[var(--sage-dark)]" />
          </Field>
          <Field label="weekly days off">
            <div className="flex flex-wrap gap-1">
              {WEEKDAYS.map((w, i) => (
                <button key={w} onClick={() => update((d) => { const x = d.plan.weekdaysOff; d.plan.weekdaysOff = x.includes(i) ? x.filter((y) => y !== i) : [...x, i]; })}
                  className="px-2 rounded-full border-2 border-line text-[14px] transition hover:-translate-y-0.5" style={{ background: s.plan.weekdaysOff.includes(i) ? 'var(--pink)' : 'var(--panel2)' }}>{w}</button>
              ))}
            </div>
          </Field>
          <Field label="specific days off">
            <div className="flex gap-1.5">
              <Input type="date" value={dayOff} onChange={(e) => setDayOff(e.target.value)} />
              <Btn small disabled={!dayOff} onClick={() => { update((d) => void d.plan.daysOff.push(dayOff)); setDayOff(''); }}>add</Btn>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">{s.plan.daysOff.map((d0) => <Tag key={d0} onClick={() => update((d) => void (d.plan.daysOff = d.plan.daysOff.filter((x) => x !== d0)))}>{prettyDate(d0)} ✕</Tag>)}</div>
          </Field>
          <Field label="exam dates">
            <div className="space-y-1">
              {subs.map((x) => (
                <div key={x.id} className="flex gap-2 items-center">
                  <span className="w-3 h-3 rounded-full border border-line" style={{ background: x.color }} />
                  <span className="flex-1 truncate text-[15px]">{x.name}</span>
                  <Input type="date" className="!w-40 !py-0.5" value={x.examDate ?? ''} onChange={(e) => update((d) => void (d.subjects.find((q) => q.id === x.id)!.examDate = e.target.value || undefined))} />
                </div>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 items-center">
          <Btn onClick={generate}>✨ generate plan</Btn>
          <Btn variant="pink" onClick={resched} disabled={!b.missed}>↻ reschedule missed ({b.missed})</Btn>
          <span className="text-[15px]">
            {b.days ? <>you're <b>{b.days} day{b.days > 1 ? 's' : ''} behind</b> — {b.missed} task{b.missed > 1 ? 's' : ''} missed</> : live.length ? 'on track ✓' : 'no plan yet'}
            {s.plan.lastMoved ? ` · ${s.plan.lastMoved} tasks were moved to the days left` : ''}
          </span>
        </div>
        <p className="text-[13px] text-muted mt-2">rules: easy=1, medium=1.5, hard=2 weight · last 20% of days before each exam = revision (weakest first) · nearest exam gets priority on shared days.</p>
      </Box>

      <Box title="calendar" delay={0.1} right={<Tabs tabs={[{ id: 'month', label: 'month' }, { id: 'week', label: 'week' }]} value={view} onChange={setView} />}>
        <div className="flex items-center justify-between mb-2">
          <Btn small variant="ghost" onClick={() => step(-1)}>←</Btn>
          <b className="font-round">{view === 'month' ? cur.toLocaleDateString(undefined, { month: 'long', year: 'numeric' }) : `week of ${prettyDate(days[0]!)}`}</b>
          <Btn small variant="ghost" onClick={() => step(1)}>→</Btn>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-[13px] text-muted mb-1">{WEEKDAYS.map((w) => <div key={w}>{w}</div>)}</div>
        <motion.div key={cursor + view} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="grid grid-cols-7 gap-1">
          {days.map((d, i) => {
            if (!d) return <div key={'e' + i} />;
            const ts = byDate.get(d) ?? [];
            const exam = subs.find((x) => x.examDate === d);
            return (
              <button key={d} onClick={() => setSelected(d)}
                className={`rounded-lg border-2 text-left p-1 transition-all hover:-translate-y-0.5 ${view === 'week' ? 'min-h-32' : 'min-h-14'} ${d === selected ? 'border-line' : 'border-line/20'}`}
                style={{ background: exam ? 'var(--pink)' : d === today ? 'var(--butter)' : 'var(--panel2)' }}>
                <div className="text-[13px] font-bold">{parseYmd(d).getDate()}{exam && ' 📝'}</div>
                {view === 'month' ? (
                  <div className="flex flex-wrap gap-0.5">{ts.slice(0, 8).map((t) => <span key={t.id} className="w-2 h-2 rounded-full border border-line/50" style={{ background: t.done ? 'var(--muted)' : color(t.subjectId) }} />)}</div>
                ) : (
                  <div className="space-y-0.5">{ts.map((t) => <div key={t.id} className={`text-[11px] leading-tight rounded px-0.5 ${t.done ? 'line-through opacity-60' : ''}`} style={{ background: color(t.subjectId), color: '#3e3a2e' }}>{t.kind === 'revision' ? '↻ ' : ''}{name(t.topicId)}</div>)}</div>
                )}
              </button>
            );
          })}
        </motion.div>
      </Box>

      <Box title={selected === today ? "today's tasks" : `tasks · ${prettyDate(selected)}`} delay={0.15}>
        {selTasks.length ? (
          <div className="space-y-1.5">
            {selTasks.map((t) => (
              <motion.label layout key={t.id} className="flex gap-2 items-start cursor-pointer">
                <input type="checkbox" className="checkbox mt-0.5" checked={t.done} onChange={() => {
                  update((d) => { const x = d.planTasks.find((q) => q.id === t.id)!; x.done = !x.done; if (x.done) { const tp = d.topics.find((q) => q.id === x.topicId); if (tp) tp.lastRevised = today; } });
                  markStudied();
                }} />
                <span className={t.done ? 'line-through text-muted' : ''}>
                  <span className="inline-block w-2.5 h-2.5 rounded-full border border-line mr-1" style={{ background: color(t.subjectId) }} />
                  {name(t.topicId)} <span className="text-[13px] text-muted">· {t.hours}h · {t.kind}{t.date < today && !t.done ? ' · missed!' : ''}</span>
                </span>
              </motion.label>
            ))}
          </div>
        ) : <Empty>nothing planned — rest day ☁</Empty>}
      </Box>
    </>
  );
}

