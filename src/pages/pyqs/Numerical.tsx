import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Box, Btn, Empty, Field, Input, Select, TextArea, Tag } from '../../components/ui';
import { useStore, update } from '../../store/store';
import { detectQuantities, toTemplate, renderTemplate, generateValues, evaluateFormula, formatNum, mulberry32, type Variable } from '../../lib/numerical';
import { uid } from '../../lib/id';
import { ymd } from '../../lib/dates';

type V = Variable & { on: boolean; start?: number; end?: number };

const VAR_COLORS = ['#f3b8c2', '#bcd3ea', '#f5dd96', '#cfbde8', '#a9bf96', '#f0b98d'];

function constText(c: Record<string, number>) {
  return Object.entries(c).map(([k, v]) => `${k} = ${v}`).join('\n');
}
function parseConsts(t: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const line of t.split(/\n|,/)) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*=\s*([-+0-9.eE]+)\s*$/);
    if (m) out[m[1]] = Number(m[2]);
  }
  return out;
}

export default function Numerical({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const qs = s.questions.filter((q) => q.subjectId === subjectId && q.type === 'numerical' && q.source !== 'variant');
  const [qid, setQid] = useState(qs[0]?.id ?? '');
  const q = qs.find((x) => x.id === qid);
  const existing = s.templates.find((t) => t.questionId === qid);
  const [vars, setVars] = useState<V[]>([]);
  const [formula, setFormula] = useState('');
  const [unit, setUnit] = useState('');
  const [consts, setConsts] = useState('');
  const [n, setN] = useState(3);
  const [seed, setSeed] = useState(1);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!q) return;
    setMsg('');
    const det = detectQuantities(q.text);
    if (existing) {
      setVars(det.map((d) => {
        const saved = existing.variables.find((v) => v.raw === d.raw);
        return saved ? { ...d, ...saved, on: true } : { ...d, on: false };
      }));
      setFormula(existing.formula); setUnit(existing.answerUnit); setConsts(constText(existing.constants));
    } else {
      setVars(det.map((d) => ({ ...d, on: true })));
      setFormula(''); setUnit(''); setConsts('');
    }
  }, [qid]); // eslint-disable-line react-hooks/exhaustive-deps

  const active = vars.filter((v) => v.on);
  const constants = useMemo(() => {
    const c = parseConsts(consts);
    // auto-include built-in constants used in the formula
    for (const k of s.settings.constants) if (!(k.name in c) && new RegExp(`\\b${k.name}\\b`).test(formula.split('=').pop() ?? '') && !active.some((v) => v.name === k.name)) c[k.name] = k.value;
    return c;
  }, [consts, formula, active, s.settings.constants]);

  const tpl = q ? toTemplate(q.text, active.map((v) => ({ ...v, start: v.start!, end: v.end! }))) : '';
  let original: string | undefined;
  let formulaErr = '';
  try {
    if (formula) original = formatNum(evaluateFormula(formula, active, {}, constants).value, 3);
  } catch (e) {
    formulaErr = (e as Error).message;
  }
  const variants = useMemo(() => {
    if (!q || !active.length) return [];
    const rng = mulberry32(seed * 7919);
    return Array.from({ length: n }, () => {
      const vals = generateValues(active, rng);
      let ans = '';
      try { if (formula) ans = `${formatNum(evaluateFormula(formula, active, vals, constants).value, 3)} ${unit}`.trim(); } catch { ans = '—'; }
      return { text: renderTemplate(tpl, active, vals), answer: ans };
    });
  }, [q, active, seed, n, formula, constants, unit, tpl]);

  const setVar = (i: number, patch: Partial<V>) => setVars((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  const saveTemplate = () => {
    if (!q) return;
    const variables = active.map(({ on: _o, start: _s, end: _e, ...v }) => v);
    update((d) => {
      const t = d.templates.find((x) => x.questionId === q.id);
      const data = { template: tpl, variables, formula, answerUnit: unit, constants: parseConsts(consts), sigFigs: 3 };
      if (t) Object.assign(t, data);
      else {
        const id = uid();
        d.templates.push({ id, subjectId, questionId: q.id, ...data });
        d.questions.find((x) => x.id === q.id)!.templateId = id;
      }
    });
    setMsg('template saved ✓ — practice papers will now use fresh values automatically');
  };

  const addToBank = () => {
    if (!q) return;
    saveTemplate();
    update((d) => variants.forEach((v) => d.questions.push({
      id: uid(), subjectId, unitId: q.unitId, topicId: q.topicId, text: v.text, marks: q.marks, type: 'numerical', source: 'variant',
      timesPractised: 0, approved: true, answer: v.answer, parentId: q.id, createdAt: ymd(),
    })));
    setMsg(`${variants.length} variants added to the bank ✓`);
  };

  // highlighted original text
  const highlighted = useMemo(() => {
    if (!q) return null;
    const parts: React.ReactNode[] = [];
    let last = 0;
    vars.forEach((v, i) => {
      parts.push(q.text.slice(last, v.start));
      parts.push(
        <button key={i} onClick={() => setVar(i, { on: !v.on })} title={v.on ? 'click to un-mark' : 'click to mark as variable'}
          className="rounded px-0.5 border-2 transition-all hover:scale-105" style={{ background: v.on ? VAR_COLORS[i % VAR_COLORS.length] : 'transparent', borderColor: v.on ? 'var(--line)' : 'transparent', color: v.on ? '#3e3a2e' : undefined }}>
          {q.text.slice(v.start, v.end)}{v.on && <sub className="ml-0.5 font-bold">{v.name}</sub>}
        </button>,
      );
      last = v.end!;
    });
    parts.push(q.text.slice(last));
    return parts;
  }, [q, vars]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!qs.length) return <Box title="numerical value changer"><Empty>no numerical questions yet — tag a question as “numerical” in the bank</Empty></Box>;

  return (
    <>
      <Box title="pick a numerical" delay={0.05}>
        <Select value={qid} onChange={(e) => setQid(e.target.value)}>
          {qs.map((x) => <option key={x.id} value={x.id}>{s.templates.some((t) => t.questionId === x.id) ? '★ ' : ''}{x.text.slice(0, 90)}</option>)}
        </Select>
        {q && <p className="mt-3 text-[17px] leading-relaxed">{highlighted}</p>}
        <p className="text-[13px] text-muted mt-1">highlighted = detected quantities → variables. click to un-mark / mark.</p>
      </Box>

      <Box title="variables" delay={0.1}>
        {vars.length ? (
          <div className="space-y-1.5">
            {vars.map((v, i) => v.on && (
              <motion.div layout key={i} className="flex flex-wrap gap-2 items-center bg-panel2 border-2 border-line/30 rounded-xl px-2 py-1 text-[15px]">
                <span className="w-3 h-3 rounded-full border border-line" style={{ background: VAR_COLORS[i % VAR_COLORS.length] }} />
                <Input className="!w-20 !py-0" value={v.name} onChange={(e) => setVar(i, { name: e.target.value.replace(/\W/g, '') })} />
                <span>= {formatNum(v.value, 4)} {v.unit}</span>
                <label className="flex items-center gap-1"><input type="checkbox" className="checkbox" checked={v.integer} onChange={(e) => setVar(i, { integer: e.target.checked })} />integer</label>
                <label className="flex items-center gap-1"><input type="checkbox" className="checkbox" checked={v.angle} onChange={(e) => setVar(i, { angle: e.target.checked })} />angle</label>
                <Input className="!w-20 !py-0" placeholder="min" value={v.min ?? ''} onChange={(e) => setVar(i, { min: e.target.value === '' ? undefined : Number(e.target.value) })} />
                <Input className="!w-20 !py-0" placeholder="max" value={v.max ?? ''} onChange={(e) => setVar(i, { max: e.target.value === '' ? undefined : Number(e.target.value) })} />
                <Input className="!w-20 !py-0" placeholder="step" value={v.step ?? ''} onChange={(e) => setVar(i, { step: e.target.value === '' ? undefined : Number(e.target.value) })} />
              </motion.div>
            ))}
          </div>
        ) : <Empty>no quantities with units detected</Empty>}
        <div className="grid sm:grid-cols-[1fr_120px] gap-2 mt-3">
          <Field label="answer formula (math.js) — angles are converted to radians for sin/cos">
            <Input value={formula} onChange={(e) => setFormula(e.target.value)} placeholder="v = sqrt(2*g*d)" className="font-mono !text-[15px]" />
          </Field>
          <Field label="answer unit"><Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="m/s" /></Field>
        </div>
        <Field label="extra constants (name = value per line) — built-ins like g, c, e, h_p, k_B are added automatically" className="mt-2">
          <TextArea rows={2} value={consts} onChange={(e) => setConsts(e.target.value)} className="!min-h-0 font-mono !text-[14px]" placeholder="g = 9.8" />
        </Field>
        <div className="flex flex-wrap gap-1 mt-1">{Object.entries(constants).map(([k, v]) => <Tag key={k}>{k} = {formatNum(v, 4)}</Tag>)}</div>
        <p className="mt-2 text-[16px]">original answer: {formulaErr ? <span className="text-[#c0606f] text-[14px]">{formulaErr}</span> : <b>{original ?? '—'} {unit}</b>}</p>
      </Box>

      <Box title="new versions" delay={0.15} right={<div className="flex gap-1.5 items-center"><Input type="number" min={1} max={20} value={n} onChange={(e) => setN(Math.max(1, Math.min(20, Number(e.target.value))))} className="!w-16 !py-0" /><Btn small variant="sky" onClick={() => setSeed(seed + 1)}>🎲 reroll</Btn></div>}>
        <div className="space-y-2">
          {variants.map((v, i) => (
            <motion.div key={seed + '-' + i} initial={{ opacity: 0, rotateX: -60 }} animate={{ opacity: 1, rotateX: 0 }} transition={{ delay: i * 0.06 }} className="border-2 border-line/40 rounded-xl p-2 bg-panel2">
              <p className="text-[16px]">{v.text}</p>
              {v.answer && <p className="text-[15px] mt-0.5">→ <b>{v.answer}</b></p>}
            </motion.div>
          ))}
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          <Btn onClick={saveTemplate} disabled={!formula}>save template</Btn>
          <Btn variant="pink" onClick={addToBank} disabled={!variants.length}>add these to bank</Btn>
        </div>
        {msg && <p className="text-[15px] mt-2">{msg}</p>}
      </Box>
    </>
  );
}
