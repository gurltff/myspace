import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Box, Btn, Empty, Field, Input, Select, TextArea, Bar, Tag } from '../../components/ui';
import { useStore, update } from '../../store/store';
import { splitQuestions, detectType, detectMarks, type SplitResult } from '../../lib/questions';
import { suggestTopics } from '../../lib/tagging';
import { detectStem } from '../../lib/stems';
import { saveFile, loadFile, deleteFile } from '../../store/files';
import { uid } from '../../lib/id';
import { ymd } from '../../lib/dates';

interface Draft { key: string; text: string; marks?: number; section?: string; topicId?: string }

export default function Papers({ subjectId }: { subjectId: string }) {
  const s = useStore((x) => x);
  const papers = s.papers.filter((p) => p.subjectId === subjectId).sort((a, b) => b.year - a.year);
  const topics = s.topics.filter((t) => t.subjectId === subjectId);
  const lite = topics.map((t) => ({ id: t.id, name: t.name, unitId: t.unitId }));
  const [file, setFile] = useState<File | null>(null);
  const [year, setYear] = useState(new Date().getFullYear() - 1);
  const [progress, setProgress] = useState<{ stage: string; pct: number } | null>(null);
  const [text, setText] = useState('');
  const [meta, setMeta] = useState<SplitResult | null>(null);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [err, setErr] = useState('');

  const extract = async (forceOcr = false) => {
    if (!file) return;
    setErr('');
    setProgress({ stage: 'loading', pct: 0 });
    try {
      const { extractText } = await import('../../lib/extract');
      const r = await extractText(file, (stage, pct) => setProgress({ stage, pct }), forceOcr);
      setText(r.text);
      setProgress({ stage: r.method === 'pdf' ? 'text layer read with pdf.js ✓' : 'OCR done with Tesseract ✓', pct: 100 });
    } catch (e) {
      setErr(String(e));
      setProgress(null);
    }
  };

  const doSplit = () => {
    const r = splitQuestions(text);
    setMeta(r);
    setDrafts(r.questions.map((q) => ({ key: uid(), text: q.text, marks: q.marks, section: q.section, topicId: suggestTopics(q.text, lite, 1)[0]?.score >= 0.3 ? suggestTopics(q.text, lite, 1)[0].topic.id : undefined })));
  };

  const save = async () => {
    if (!drafts) return;
    const fileId = file ? await saveFile(file) : undefined;
    const pid = uid();
    update((d) => {
      d.papers.push({
        id: pid, subjectId, year, title: `${s.subjects.find((x) => x.id === subjectId)?.name} ${year}`, fileId, fileName: file?.name, fileType: file?.type,
        rawText: text, sections: meta?.sections ?? [], totalMarks: meta?.totalMarks, durationHours: meta?.durationHours, createdAt: ymd(),
      });
      for (const q of drafts) {
        const t = topics.find((x) => x.id === q.topicId);
        d.questions.push({
          id: uid(), subjectId, paperId: pid, unitId: t?.unitId, topicId: t?.id, text: q.text, marks: q.marks, year, section: q.section,
          type: detectType(q.text, q.marks), source: 'pyq', timesPractised: 0, approved: true, stem: detectStem(q.text)?.stem.id, createdAt: ymd(),
        });
      }
    });
    setDrafts(null); setText(''); setFile(null); setProgress(null); setMeta(null);
  };

  const editDraft = (i: number, patch: Partial<Draft>) => setDrafts((ds) => ds!.map((d, j) => (j === i ? { ...d, ...patch } : d)));

  return (
    <>
      <Box title="upload a previous year paper" delay={0.05}>
        <div className="grid sm:grid-cols-[1fr_120px_auto] gap-2 items-end">
          <Field label="PDF or photo">
            <label className="nest-input flex items-center gap-2 cursor-pointer hover:bg-pill transition">
              <span>📎</span><span className="truncate">{file ? file.name : 'choose file…'}</span>
              <input type="file" accept="application/pdf,image/*" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </Field>
          <Field label="year"><Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} /></Field>
          <div className="flex gap-1.5">
            <Btn disabled={!file} onClick={() => extract()}>extract text</Btn>
            <Btn variant="ghost" small disabled={!file} onClick={() => extract(true)} title="force OCR for scanned PDFs">OCR</Btn>
          </div>
        </div>
        <p className="text-[14px] text-muted mt-1">text PDFs → pdf.js · scanned PDFs & photos → Tesseract OCR (runs in your browser) · or just paste the text below</p>
        <AnimatePresence>
          {progress && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-2">
              <div className="text-[14px] mb-0.5">{progress.stage} {progress.pct ? `· ${Math.round(progress.pct)}%` : ''}</div>
              <Bar value={progress.pct} color="var(--sky)" />
            </motion.div>
          )}
        </AnimatePresence>
        {err && <p className="text-[#c0606f] text-[14px] mt-1">{err}</p>}
        <Field label="extracted text (fix mistakes before splitting)" className="mt-3">
          <TextArea rows={10} value={text} onChange={(e) => setText(e.target.value)} placeholder={'SECTION A\nAttempt any four.\nQ1. Derive ... (6)\nQ2. ...'} />
        </Field>
        <Btn className="mt-2" variant="sky" disabled={!text.trim()} onClick={doSplit}>✂ split into questions</Btn>
      </Box>

      {drafts && (
        <Box title={`split result — ${drafts.length} questions`} delay={0}>
          {meta && (
            <div className="flex flex-wrap gap-1.5 mb-2 text-[14px]">
              {meta.totalMarks && <Tag>max marks {meta.totalMarks}</Tag>}
              {meta.durationHours && <Tag>{meta.durationHours} hours</Tag>}
              {meta.sections.map((x) => <Tag key={x.name}>{x.name}: {x.attempt === 'all' ? 'attempt all' : x.attempt ? `attempt any ${x.attempt}` : '—'}</Tag>)}
            </div>
          )}
          <div className="space-y-2">
            {drafts.map((q, i) => {
              const sugg = suggestTopics(q.text, lite, 3);
              return (
                <motion.div layout key={q.key} className="border-2 border-line/40 rounded-xl p-2 bg-panel2">
                  <div className="flex gap-2 items-start">
                    <span className="font-round font-bold pt-1">{i + 1}.</span>
                    <TextArea rows={2} value={q.text} onChange={(e) => editDraft(i, { text: e.target.value })} className="!min-h-0" />
                  </div>
                  <div className="flex flex-wrap gap-2 mt-1 items-center text-[14px]">
                    <Input className="!w-20 !py-0" type="number" placeholder="marks" value={q.marks ?? ''} onChange={(e) => editDraft(i, { marks: e.target.value ? Number(e.target.value) : undefined })} />
                    <Input className="!w-28 !py-0" placeholder="section" value={q.section ?? ''} onChange={(e) => editDraft(i, { section: e.target.value || undefined })} />
                    <Select className="!w-auto !py-0 max-w-56" value={q.topicId ?? ''} onChange={(e) => editDraft(i, { topicId: e.target.value || undefined })}>
                      <option value="">— topic —</option>
                      {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </Select>
                    {sugg.filter((x) => x.topic.id !== q.topicId).slice(0, 2).map((x) => (
                      <Tag key={x.topic.id} onClick={() => editDraft(i, { topicId: x.topic.id })} title="click to use this topic">💡 {x.topic.name}</Tag>
                    ))}
                    <span className="flex-1" />
                    {i < drafts.length - 1 && <Btn small variant="ghost" onClick={() => setDrafts((ds) => { const n = [...ds!]; const m = detectMarks(n[i + 1].text); n[i] = { ...n[i], text: n[i].text + ' ' + m.text, marks: (n[i].marks ?? 0) + (n[i + 1].marks ?? 0) || undefined }; n.splice(i + 1, 1); return n; })}>merge ↓</Btn>}
                    <Btn small variant="ghost" title="split at the first '|' you type in the text" onClick={() => setDrafts((ds) => {
                      const n = [...ds!];
                      const at = n[i].text.indexOf('|');
                      const cut = at >= 0 ? at : Math.floor(n[i].text.length / 2);
                      const a = n[i].text.slice(0, cut).trim(); const b = n[i].text.slice(cut).replace(/^\|/, '').trim();
                      n.splice(i, 1, { ...n[i], key: uid(), ...detectMarks(a) }, { ...n[i], key: uid(), ...detectMarks(b) });
                      return n;
                    })}>split ✂</Btn>
                    <Btn small variant="ghost" onClick={() => setDrafts((ds) => ds!.filter((_, j) => j !== i))}>✕</Btn>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <div className="flex gap-2 mt-3">
            <Btn onClick={save}>save {drafts.length} questions ✿</Btn>
            <Btn variant="ghost" onClick={() => setDrafts(null)}>cancel</Btn>
          </div>
          <p className="text-[13px] text-muted mt-1">tip: type a “|” in a question and press split ✂ to cut it there.</p>
        </Box>
      )}

      <Box title="stored papers" delay={0.1}>
        {papers.length ? (
          <div className="space-y-1.5">
            {papers.map((p) => (
              <div key={p.id} className="flex flex-wrap items-center gap-2 border-2 border-line/30 rounded-xl px-2 py-1 bg-panel2">
                <span className="font-bubble text-[18px]">{p.year}</span>
                <span className="flex-1 min-w-0 truncate">{p.title} <span className="text-[13px] text-muted">· {s.questions.filter((q) => q.paperId === p.id).length} questions</span></span>
                {p.fileId && <Btn small variant="sky" onClick={async () => { const b = await loadFile(p.fileId!); if (b) window.open(URL.createObjectURL(b), '_blank'); else alert('File not found on this device.'); }}>view original</Btn>}
                <Btn small variant="ghost" onClick={() => { const w = window.open('', '_blank'); if (w) { w.document.title = p.title; w.document.body.style.cssText = 'white-space:pre-wrap;font-family:monospace;padding:20px'; w.document.body.textContent = p.rawText; } }}>text</Btn>
                <Btn small variant="ghost" onClick={() => { if (!confirm('Delete paper and its questions?')) return; if (p.fileId) deleteFile(p.fileId); update((d) => { d.papers = d.papers.filter((x) => x.id !== p.id); d.questions = d.questions.filter((q) => q.paperId !== p.id); }); }}>🗑</Btn>
              </div>
            ))}
          </div>
        ) : <Empty>no papers yet — upload one above</Empty>}
      </Box>
    </>
  );
}
