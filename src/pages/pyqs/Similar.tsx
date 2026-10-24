import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Btn, Empty, Input, Tag, TextArea } from '../../components/ui';
import { useStore, update } from '../../store/store';
import { suggestGroups, generateSimilar, detectStem, STEMS } from '../../lib/stems';
import { uid } from '../../lib/id';
import { ymd } from '../../lib/dates';
import { normalize } from '../../lib/text';

export default function Similar({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const topics = s.topics.filter((t) => t.subjectId === subjectId);
  const groups = s.topicGroups.filter((g) => g.subjectId === subjectId);
  const questions = s.questions.filter((q) => q.subjectId === subjectId);
  const pending = questions.filter((q) => !q.approved && q.source === 'generated');
  const [name, setName] = useState('');
  const [pick, setPick] = useState<string[]>([]);
  const tname = (id: string) => topics.find((t) => t.id === id)?.name ?? '?';

  const suggestions = useMemo(() => {
    const existing = new Set(groups.map((g) => [...g.topicIds].sort().join()));
    return suggestGroups(topics.map((t) => ({ id: t.id, name: t.name, unitId: t.unitId }))).filter((g) => !existing.has([...g.topicIds].sort().join()));
  }, [topics, groups]);

  const candidates = useMemo(() => {
    const have = new Set(questions.map((q) => normalize(q.text)));
    const out: { text: string; topicId: string; stemId: string; from: string }[] = [];
    for (const q of questions.filter((x) => x.approved && x.topicId && x.source !== 'variant')) {
      if (!detectStem(q.text)) continue;
      for (const g of groups) {
        let members = g.topicIds;
        if (!members.includes(q.topicId!)) continue;
        if (g.allowUnit) members = [...new Set([...members, ...topics.filter((t) => t.unitId === q.unitId).map((t) => t.id)])];
        const gt = members.map((id) => topics.find((t) => t.id === id)).filter(Boolean).map((t) => ({ id: t!.id, name: t!.name, unitId: t!.unitId }));
        for (const c of generateSimilar(q.text, q.topicId!, gt)) {
          const k = normalize(c.text);
          if (have.has(k)) continue;
          have.add(k);
          out.push({ ...c, from: q.text });
        }
      }
    }
    return out;
  }, [questions, groups, topics]);

  const addCandidates = () => update((d) => candidates.forEach((c) => {
    const src = questions.find((q) => q.text === c.from);
    const t = topics.find((x) => x.id === c.topicId);
    d.questions.push({ id: uid(), subjectId, topicId: c.topicId, unitId: t?.unitId, text: c.text, marks: src?.marks, section: src?.section, type: src?.type ?? 'theory', source: 'generated', timesPractised: 0, approved: false, stem: c.stemId, parentId: src?.id, createdAt: ymd() });
  }));

  return (
    <>
      <Box title="topic groups" delay={0.05}>
        <p className="text-[14px] text-muted mb-2">groups of similar concepts — new questions only ever swap topics within a group (or the same unit if you allow it).</p>
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.id} className="border-2 border-line/40 rounded-xl p-2 bg-panel2">
              <div className="flex gap-2 items-center flex-wrap">
                <input className="bg-transparent font-round font-extrabold outline-none flex-1 min-w-32" value={g.name} onChange={(e) => update((d) => void (d.topicGroups.find((x) => x.id === g.id)!.name = e.target.value))} />
                <label className="flex items-center gap-1 text-[14px]"><input type="checkbox" className="checkbox" checked={g.allowUnit} onChange={(e) => update((d) => void (d.topicGroups.find((x) => x.id === g.id)!.allowUnit = e.target.checked))} /> allow same unit</label>
                <button className="text-muted hover:text-ink" onClick={() => update((d) => void (d.topicGroups = d.topicGroups.filter((x) => x.id !== g.id)))}>✕</button>
              </div>
              <div className="flex flex-wrap gap-1 mt-1">
                {g.topicIds.map((id) => <Tag key={id} onClick={() => update((d) => { const x = d.topicGroups.find((y) => y.id === g.id)!; x.topicIds = x.topicIds.filter((t) => t !== id); })}>{tname(id)} ✕</Tag>)}
                <select className="nest-tag" value="" onChange={(e) => e.target.value && update((d) => void d.topicGroups.find((y) => y.id === g.id)!.topicIds.push(e.target.value))}>
                  <option value="">+ topic</option>
                  {topics.filter((t) => !g.topicIds.includes(t.id)).map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
            </div>
          ))}
          {!groups.length && <Empty>no groups yet</Empty>}
        </div>
        <hr className="nest-divider my-3" />
        <div className="flex gap-2 flex-wrap items-center">
          <Input className="!w-56" placeholder="new group name" value={name} onChange={(e) => setName(e.target.value)} />
          <Btn small disabled={!name || pick.length < 2} onClick={() => { update((d) => void d.topicGroups.push({ id: uid(), subjectId, name, topicIds: pick, allowUnit: false })); setName(''); setPick([]); }}>create with {pick.length} topics</Btn>
        </div>
        <div className="flex flex-wrap gap-1 mt-2 max-h-36 overflow-y-auto nest-scroll">
          {topics.map((t) => <Tag key={t.id} color={pick.includes(t.id) ? 'var(--sage)' : undefined} onClick={() => setPick(pick.includes(t.id) ? pick.filter((x) => x !== t.id) : [...pick, t.id])}>{t.name}</Tag>)}
        </div>
        {suggestions.length > 0 && (
          <>
            <h4 className="font-round font-bold mt-3 mb-1">💡 suggested groups (from shared words in the same unit)</h4>
            <div className="space-y-1">
              {suggestions.map((g) => (
                <div key={g.topicIds.join()} className="flex gap-2 items-center flex-wrap text-[15px]">
                  <span className="flex-1">{g.topicIds.map(tname).join(' · ')}</span>
                  <Btn small onClick={() => update((d) => void d.topicGroups.push({ id: uid(), subjectId, name: g.name, topicIds: g.topicIds, allowUnit: false }))}>confirm ✓</Btn>
                </div>
              ))}
            </div>
          </>
        )}
      </Box>

      <Box title={`similar-style questions · ${candidates.length} new ideas`} delay={0.1} right={<Btn small disabled={!candidates.length} onClick={addCandidates}>send all for review</Btn>}>
        <p className="text-[14px] text-muted mb-2">detected stems: {STEMS.slice(0, 8).map((x) => x.label).join(' · ')}</p>
        {candidates.length ? (
          <ul className="space-y-1 text-[16px] max-h-72 overflow-y-auto nest-scroll">
            {candidates.slice(0, 60).map((c) => <li key={c.text}>✿ {c.text} <span className="text-[13px] text-muted">← {c.from.slice(0, 50)}…</span></li>)}
          </ul>
        ) : <Empty>add groups containing topics that have PYQs with a recognisable stem</Empty>}
      </Box>

      <Box title={`awaiting approval · ${pending.length}`} delay={0.15} right={pending.length ? <Btn small onClick={() => update((d) => d.questions.forEach((q) => { if (q.subjectId === subjectId && q.source === 'generated') q.approved = true; }))}>approve all</Btn> : null}>
        <AnimatePresence>
          {pending.map((q) => (
            <motion.div key={q.id} layout initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, x: 60 }} className="flex gap-2 items-start mb-1.5">
              <TextArea rows={1} className="!min-h-0 flex-1" value={q.text} onChange={(e) => update((d) => void (d.questions.find((x) => x.id === q.id)!.text = e.target.value))} />
              <Btn small onClick={() => update((d) => void (d.questions.find((x) => x.id === q.id)!.approved = true))}>✓</Btn>
              <Btn small variant="ghost" onClick={() => update((d) => void (d.questions = d.questions.filter((x) => x.id !== q.id)))}>✕</Btn>
            </motion.div>
          ))}
        </AnimatePresence>
        {!pending.length && <Empty>nothing waiting ✓</Empty>}
      </Box>
    </>
  );
}
