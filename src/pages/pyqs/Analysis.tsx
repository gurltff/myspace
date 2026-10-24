import { useState } from 'react';
import { BarChart, Bar as RBar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts';
import { Box, Btn, Empty, Input } from '../../components/ui';
import { useStore, update } from '../../store/store';
import { subjectPattern } from '../../store/derive';
import { STEMS } from '../../lib/stems';
import type { PatternSection } from '../../lib/pattern';

export const CHART_COLORS = ['#a9bf96', '#f3b8c2', '#bcd3ea', '#f5dd96', '#cfbde8', '#f0b98d', '#9fd3c7'];
export const chartInk = () => (document.documentElement.dataset.theme === 'dark' ? '#ede7d3' : '#5e584a');
export const tooltipStyle = { background: 'var(--panel)', border: '2px solid var(--line)', borderRadius: 10, fontFamily: 'Gaegu', color: 'var(--ink)' };

export default function Analysis({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const p = subjectPattern(s, subjectId);
  const ink = chartInk();
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState<{ sections: PatternSection[]; totalMarks: number; durationHours: number } | null>(null);
  const unitName = (id: string) => s.units.find((u) => u.id === id)?.name.split(':')[0] ?? '?';
  const topicName = (id: string) => s.topics.find((t) => t.id === id)?.name ?? '?';
  if (!p.paperCount) return <Box title="paper analysis"><Empty>upload at least one PYQ to see the pattern</Empty></Box>;

  const unitData = p.unitWeight.map((u) => ({ name: unitName(u.unitId), value: u.marks, pct: u.pct }));
  const topicData = p.topicFreq.slice(0, 8).map((t) => ({ name: topicName(t.topicId).slice(0, 22), count: t.count }));
  const d = draft ?? { sections: p.sections, totalMarks: p.totalMarks, durationHours: p.durationHours };

  return (
    <>
      <Box title={`detected pattern · from ${p.paperCount} paper${p.paperCount > 1 ? 's' : ''}`} delay={0.05}
        right={edit ? null : <Btn small variant="ghost" onClick={() => { setDraft({ sections: p.sections.map((x) => ({ ...x })), totalMarks: p.totalMarks, durationHours: p.durationHours }); setEdit(true); }}>✎ edit</Btn>}>
        <div className="flex flex-wrap gap-3 mb-2 text-[16px]">
          <span>total marks: {edit ? <Input className="!w-20 !inline !py-0" type="number" value={d.totalMarks} onChange={(e) => setDraft({ ...d, totalMarks: Number(e.target.value) })} /> : <b>{p.totalMarks}</b>}</span>
          <span>duration: {edit ? <Input className="!w-16 !inline !py-0" type="number" value={d.durationHours} onChange={(e) => setDraft({ ...d, durationHours: Number(e.target.value) })} /> : <b>{p.durationHours} h</b>}</span>
          <span>sections: <b>{p.sections.length}</b></span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[15px] border-collapse">
            <thead><tr className="text-left text-muted">{['section', 'questions', 'marks each', 'attempt', 'section marks'].map((h) => <th key={h} className="px-2 py-1 border-b-2 border-line/40">{h}</th>)}</tr></thead>
            <tbody>
              {d.sections.map((x, i) => (
                <tr key={x.name} className="hover:bg-pill/60 transition">
                  <td className="px-2 py-1">{x.name}</td>
                  {(['questionCount', 'marksEach'] as const).map((k) => (
                    <td key={k} className="px-2 py-1">{edit ? <Input type="number" className="!w-16 !py-0" value={x[k]} onChange={(e) => { const sec = [...d.sections]; sec[i] = { ...sec[i], [k]: Number(e.target.value) }; setDraft({ ...d, sections: sec }); }} /> : x[k]}</td>
                  ))}
                  <td className="px-2 py-1">{edit ? <Input className="!w-20 !py-0" value={x.attempt ?? ''} onChange={(e) => { const sec = [...d.sections]; const v = e.target.value; sec[i] = { ...sec[i], attempt: v === 'all' ? 'all' : v ? Number(v) : undefined }; setDraft({ ...d, sections: sec }); }} /> : x.attempt === 'all' ? 'all' : x.attempt ? `any ${x.attempt}` : '—'}</td>
                  <td className="px-2 py-1">{x.totalMarks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {edit && (
          <div className="flex gap-2 mt-2">
            <Btn small onClick={() => {
              const sections = d.sections.map((x) => ({ ...x, totalMarks: (x.attempt === 'all' || !x.attempt ? x.questionCount : Math.min(Number(x.attempt), x.questionCount)) * x.marksEach }));
              update((st) => void (st.patternOverrides[subjectId] = { sections, totalMarks: d.totalMarks, durationHours: d.durationHours }));
              setEdit(false); setDraft(null);
            }}>save pattern</Btn>
            <Btn small variant="ghost" onClick={() => { setEdit(false); setDraft(null); }}>cancel</Btn>
            <Btn small variant="pink" onClick={() => { update((st) => void delete st.patternOverrides[subjectId]); setEdit(false); setDraft(null); }}>reset to detected</Btn>
          </div>
        )}
      </Box>

      <div className="grid md:grid-cols-2 gap-4">
        <Box title="unit-wise weightage" delay={0.1}>
          <div className="h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={unitData} dataKey="value" nameKey="name" innerRadius="40%" outerRadius="68%" paddingAngle={3} stroke={ink} strokeWidth={2} label={(e: { pct: number; name: string }) => `${e.name} ${e.pct}%`} animationDuration={900}>
                  {unitData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Box>
        <Box title="marks distribution" delay={0.15}>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={p.marksDist.map((x) => ({ name: `${x.marks}m`, count: x.count }))}>
                <CartesianGrid strokeDasharray="4 4" stroke={ink} opacity={0.3} />
                <XAxis dataKey="name" stroke={ink} /><YAxis allowDecimals={false} stroke={ink} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--pill)' }} />
                <RBar dataKey="count" fill="#bcd3ea" stroke={ink} strokeWidth={2} radius={[8, 8, 0, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Box>
      </div>

      <Box title="most repeated topics" delay={0.2}>
        {topicData.length ? (
          <div className="h-72">
            <ResponsiveContainer>
              <BarChart data={topicData} layout="vertical" margin={{ left: 10 }}>
                <CartesianGrid strokeDasharray="4 4" stroke={ink} opacity={0.3} />
                <XAxis type="number" allowDecimals={false} stroke={ink} /><YAxis type="category" dataKey="name" width={150} stroke={ink} tick={{ fontSize: 13 }} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: 'var(--pill)' }} />
                <RBar dataKey="count" fill="#f3b8c2" stroke={ink} strokeWidth={2} radius={[0, 8, 8, 0]} animationDuration={900} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : <Empty>tag questions with topics to see this</Empty>}
      </Box>

      <Box title="common question formats" delay={0.25}>
        {p.stems.length ? (
          <div className="flex flex-wrap gap-2">{p.stems.map((x) => <span key={x.stem} className="nest-tag !text-[15px]">“{STEMS.find((d) => d.id === x.stem)?.label}” ×{x.count}</span>)}</div>
        ) : <Empty>no stems detected yet</Empty>}
      </Box>
    </>
  );
}
