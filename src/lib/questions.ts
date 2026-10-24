export type QType = 'theory' | 'numerical' | 'short' | 'long';

export interface SplitQuestion {
  label: string;
  text: string;
  marks?: number;
  section?: string;
}
export interface SplitSection {
  name: string;
  instruction?: string;
  /** number of questions to attempt; 'all' when "attempt all" */
  attempt?: number | 'all';
}
export interface SplitResult {
  questions: SplitQuestion[];
  sections: SplitSection[];
  totalMarks?: number;
  durationHours?: number;
}

const NUM_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  eleven: 11, twelve: 12, fifteen: 15, twenty: 20,
};

const SECTION_RE = /^\s*(section|part)\s*[-–—:]?\s*([A-Z]|[IVX]+|\d+)\b\s*[-–—:.)]?\s*(.*)$/i;
const CHOICE_RE = /\b(attempt|answer|do)\s+(any\s+(\w+)|all)\b/i;
const Q_START_RE = /^\s*(?:Q(?:uestion)?\s*\.?\s*(\d{1,2})\s*[.):-]?|(\d{1,2})\s*[.)])\s+/i;
const SUB_RE = /^\s*\(?((?:[a-h])|(?:x|ix|iv|v?i{1,3}|v))\)\s*/i;
const MARKS_TAIL_RE = /[\[(]\s*(\d{1,2}(?:\s*[+×x*]\s*\d{1,2})*)\s*(?:marks?|m)?\s*[\])]\s*\.?\s*$/i;
const MARKS_WORD_RE = /\b(\d{1,2})\s*(?:marks?\b|M\b)/;

export function parseChoice(text: string): number | 'all' | undefined {
  const m = text.match(CHOICE_RE);
  if (!m) return undefined;
  if (m[2].toLowerCase() === 'all') return 'all';
  const w = m[3].toLowerCase();
  return NUM_WORDS[w] ?? (Number(w) || undefined);
}

/** Detect marks; returns marks and the text with the marks token removed. */
export function detectMarks(text: string): { marks?: number; text: string } {
  const t = text.trim();
  const m = t.match(MARKS_TAIL_RE);
  if (m) {
    const expr = m[1];
    const nums = expr.split(/\s*[+]\s*/).map((p) => {
      const mul = p.split(/\s*[×x*]\s*/).map(Number);
      return mul.reduce((a, b) => a * b, 1);
    });
    return { marks: nums.reduce((a, b) => a + b, 0), text: t.slice(0, m.index).trim() };
  }
  const w = t.match(MARKS_WORD_RE);
  if (w) return { marks: Number(w[1]), text: (t.slice(0, w.index) + t.slice((w.index ?? 0) + w[0].length)).replace(/\s+/g, ' ').trim() };
  return { text: t };
}

const UNIT_HINT = /\b\d+(?:\.\d+)?\s*(?:×\s*10\^?-?\d+\s*)?(m|cm|mm|nm|km|kg|g|s|ms|hz|khz|mhz|n|j|ev|kev|mev|w|v|mv|a|ma|ohm|Ω|k|°c|°|t|wb|f|μf|pf|h|mol|pa|atm|m\/s|rad)\b/i;
const CALC_WORDS = /\b(calculate|compute|find|determine|evaluate|estimate|how (much|many|long|far))\b/i;

export function detectType(text: string, marks?: number): QType {
  if (CALC_WORDS.test(text) && (UNIT_HINT.test(text) || /\d/.test(text))) return 'numerical';
  if (UNIT_HINT.test(text) && /\?/.test(text)) return 'numerical';
  if (marks !== undefined && marks <= 4) return 'short';
  if (marks !== undefined && marks >= 8) return 'long';
  if (/short note/i.test(text)) return 'short';
  return 'theory';
}

/** Break inline sub-parts "(a) foo (b) bar" onto separate lines. */
function explodeInlineSubparts(line: string): string[] {
  return line
    .split(/\s+(?=\((?:[a-h]|iv|v?i{1,3}|v)\)\s)/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function splitQuestions(raw: string): SplitResult {
  const res: SplitResult = { questions: [], sections: [] };
  const durM = raw.match(/time\s*(?:allowed)?\s*[:\-]?\s*(\d+(?:\.\d+)?)\s*(hours?|hrs?)/i);
  if (durM) res.durationHours = Number(durM[1]);
  const mmM = raw.match(/max(?:imum)?\.?\s*marks?\s*[:\-]?\s*(\d{2,3})/i);
  if (mmM) res.totalMarks = Number(mmM[1]);

  let section: SplitSection | undefined;
  type Block = { label: string; stem: string; subs: { label: string; text: string }[]; section?: string };
  let block: Block | null = null;
  const blocks: Block[] = [];

  const lines = raw.split(/\r?\n/).flatMap(explodeInlineSubparts);
  for (const line of lines) {
    if (!line.trim()) continue;
    const sm = line.match(SECTION_RE);
    if (sm && line.length < 120) {
      section = { name: `Section ${sm[2].toUpperCase()}`, instruction: sm[3] || undefined, attempt: parseChoice(sm[3] || '') };
      res.sections.push(section);
      block = null;
      continue;
    }
    if (section && !block && CHOICE_RE.test(line) && line.length < 160 && !Q_START_RE.test(line)) {
      section.instruction = line;
      section.attempt = parseChoice(line);
      continue;
    }
    if (/^\s*(time|max(imum)?\.?\s*marks|note|instructions?|roll no|unique paper code|name of)/i.test(line)) continue;

    const qm = line.match(Q_START_RE);
    if (qm) {
      block = { label: `Q${qm[1] ?? qm[2]}`, stem: line.slice(qm[0].length).trim(), subs: [], section: section?.name };
      blocks.push(block);
      continue;
    }
    const sub = line.match(SUB_RE);
    if (sub && block) {
      block.subs.push({ label: `(${sub[1].toLowerCase()})`, text: line.slice(sub[0].length).trim() });
      continue;
    }
    if (block) {
      if (block.subs.length) block.subs[block.subs.length - 1].text += ' ' + line.trim();
      else block.stem += (block.stem ? ' ' : '') + line.trim();
    }
  }

  for (const b of blocks) {
    if (!b.subs.length) {
      const { marks, text } = detectMarks(b.stem);
      if (text) res.questions.push({ label: b.label, text, marks, section: b.section });
      continue;
    }
    const stemInfo = detectMarks(b.stem);
    const stemIsInstruction = CHOICE_RE.test(stemInfo.text) && stemInfo.text.length < 80;
    for (const s of b.subs) {
      const { marks, text } = detectMarks(s.text);
      const prefix = stemInfo.text && !stemIsInstruction ? stemInfo.text + ' ' : '';
      res.questions.push({ label: `${b.label}${s.label}`, text: (prefix + text).trim(), marks, section: b.section });
    }
  }
  return res;
}

/** Split pasted batch of questions (one per line or numbered) — used for manual entry. */
export function splitBatch(raw: string): SplitQuestion[] {
  const r = splitQuestions(raw);
  if (r.questions.length) return r.questions;
  return raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l, i) => ({ label: `Q${i + 1}`, ...detectMarks(l) }));
}
