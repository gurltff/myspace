import { uid } from './id';

export interface ParsedTopic {
  id: string;
  name: string;
  /** original line this topic was split from (for undo) */
  sourceLine?: string;
}
export interface ParsedUnit {
  id: string;
  name: string;
  topics: ParsedTopic[];
}

const UNIT_RE = /^\s*(unit|module|chapter)\s*[-–—:.]?\s*([0-9]+|[ivxlc]+)\b\s*[-–—:.)]?\s*(.*)$/i;

export function isUnitLine(line: string): RegExpMatchArray | null {
  return line.match(UNIT_RE);
}

/** Split a long topic line on commas/semicolons (ignoring commas inside brackets). */
export function splitTopicLine(line: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let cur = '';
  for (const ch of line) {
    if (ch === '(' || ch === '[') depth++;
    if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if ((ch === ',' || ch === ';') && depth === 0) {
      parts.push(cur);
      cur = '';
    } else cur += ch;
  }
  parts.push(cur);
  return parts.map(cleanTopic).filter(Boolean);
}

function cleanTopic(s: string): string {
  return s
    .replace(/^\s*([-*•●▪]|\d+[.)]|[a-z][.)])\s*/i, '')
    .replace(/\(\s*\d+\s*(hours?|hrs?|lectures?|l)\s*\)/gi, '')
    .replace(/\s+/g, ' ')
    .replace(/[.\s]+$/, '')
    .trim();
}

export function parseSyllabus(raw: string, opts: { split?: boolean } = {}): ParsedUnit[] {
  const split = opts.split ?? true;
  const units: ParsedUnit[] = [];
  let current: ParsedUnit | null = null;
  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = isUnitLine(line);
    if (m) {
      const title = m[3].replace(/\(\s*\d+\s*(hours?|hrs?|lectures?)\s*\)/gi, '').trim();
      current = { id: uid(), name: `Unit ${m[2].toUpperCase()}${title ? ': ' + title.replace(/[:.]+$/, '') : ''}`, topics: [] };
      units.push(current);
      continue;
    }
    if (!current) {
      current = { id: uid(), name: 'General', topics: [] };
      units.push(current);
    }
    const pieces = split ? splitTopicLine(line) : [cleanTopic(line)].filter(Boolean);
    const isSplit = pieces.length > 1;
    for (const p of pieces) current.topics.push({ id: uid(), name: p, sourceLine: isSplit ? line : undefined });
  }
  return units;
}

/** Undo a split: merge every topic that came from `sourceLine` back into one topic. */
export function undoSplit(unit: ParsedUnit, sourceLine: string): ParsedUnit {
  const idx = unit.topics.findIndex((t) => t.sourceLine === sourceLine);
  if (idx < 0) return unit;
  const rest = unit.topics.filter((t) => t.sourceLine !== sourceLine);
  rest.splice(idx, 0, { id: uid(), name: cleanTopic(sourceLine) });
  return { ...unit, topics: rest };
}
