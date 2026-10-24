import { tokenSet, jaccard, tokens } from './text';

export interface StemDef {
  id: string;
  label: string;
  re: RegExp;
  /** template with {X} (and {Y} for two-topic stems) */
  template: string;
  pair?: boolean;
}

export const STEMS: StemDef[] = [
  { id: 'derive', label: 'Derive the expression for X', re: /^\s*(?:obtain|derive|deduce)\s+(?:an?\s+|the\s+)?(?:expression|relation|formula|equation)?\s*(?:for|of)?\s+(?:the\s+)?(.+?)[.?]?$/i, template: 'Derive the expression for {X}.' },
  { id: 'state-prove', label: 'State and prove X', re: /^\s*state\s+and\s+prove\s+(?:the\s+)?(.+?)[.?]?$/i, template: 'State and prove {X}.' },
  { id: 'distinguish', label: 'Distinguish between X and Y', re: /^\s*(?:distinguish|differentiate)\s+between\s+(.+?)\s+and\s+(.+?)[.?]?$/i, template: 'Distinguish between {X} and {Y}.', pair: true },
  { id: 'what-diagram', label: 'What is X? Explain with a neat diagram', re: /^\s*what\s+(?:is|are)\s+(?:an?\s+|the\s+)?(.+?)\?\s*explain.*diagram/i, template: 'What is {X}? Explain with a neat diagram.' },
  { id: 'short-note', label: 'Write a short note on X', re: /^\s*write\s+(?:a\s+)?short\s+notes?\s+on\s+(?:the\s+)?(.+?)[.?]?$/i, template: 'Write a short note on {X}.' },
  { id: 'define-app', label: 'Define X. Give its applications', re: /^\s*define\s+(?:an?\s+|the\s+)?(.+?)[.,]\s*(?:give|write|mention|state).*applications?/i, template: 'Define {X}. Give its applications.' },
  { id: 'working', label: 'Explain the working of X', re: /^\s*(?:explain|describe)\s+(?:the\s+)?(?:working|construction\s+and\s+working|principle\s+and\s+working)\s+of\s+(?:an?\s+|the\s+)?(.+?)[.?]?$/i, template: 'Explain the working of {X}.' },
  { id: 'show-that', label: 'Show that X', re: /^\s*(?:show|prove)\s+that\s+(.+?)[.?]?$/i, template: 'Show that {X}.' },
  { id: 'what-is', label: 'What is X? Explain', re: /^\s*what\s+(?:is|are)\s+(?:an?\s+|the\s+)?(.+?)\?/i, template: 'What is {X}? Explain.' },
  { id: 'define', label: 'Define X', re: /^\s*define\s+(?:an?\s+|the\s+)?(.+?)[.?]?$/i, template: 'Define {X}.' },
  { id: 'explain', label: 'Explain X', re: /^\s*(?:explain|discuss|describe)\s+(?:an?\s+|the\s+)?(.+?)[.?]?$/i, template: 'Explain {X}.' },
];

export interface StemMatch {
  stem: StemDef;
  x: string;
  y?: string;
}

export function detectStem(text: string): StemMatch | undefined {
  const first = text.split(/(?<=[.?])\s+(?=[A-Z])/)[0];
  for (const s of STEMS) {
    const m = (s.id === 'what-diagram' || s.id === 'define-app' ? text : first).match(s.re);
    if (m) return { stem: s, x: m[1].trim(), y: m[2]?.trim() };
  }
  return undefined;
}

export interface GTopic {
  id: string;
  name: string;
  unitId: string;
}

/** Suggest topic groups inside each unit: topics sharing words cluster together. */
export function suggestGroups(topics: GTopic[], threshold = 0.25): { name: string; topicIds: string[] }[] {
  const out: { name: string; topicIds: string[] }[] = [];
  const byUnit = new Map<string, GTopic[]>();
  for (const t of topics) byUnit.set(t.unitId, [...(byUnit.get(t.unitId) ?? []), t]);
  for (const list of byUnit.values()) {
    const sets = list.map((t) => tokenSet(t.name));
    const parent = list.map((_, i) => i);
    const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
    for (let i = 0; i < list.length; i++)
      for (let j = i + 1; j < list.length; j++) if (jaccard(sets[i], sets[j]) >= threshold) parent[find(i)] = find(j);
    const groups = new Map<number, number[]>();
    list.forEach((_, i) => groups.set(find(i), [...(groups.get(find(i)) ?? []), i]));
    for (const idx of groups.values()) {
      if (idx.length < 2) continue;
      const common = [...sets[idx[0]]].filter((w) => idx.every((i) => sets[i].has(w)));
      out.push({ name: common.length ? common.join(' ') : list[idx[0]].name, topicIds: idx.map((i) => list[i].id) });
    }
  }
  return out;
}

/** Find which topic a phrase most likely refers to. */
function phraseScore(phrase: string, topicName: string): number {
  const a = tokenSet(phrase);
  const b = tokenSet(topicName);
  return jaccard(a, b);
}

/**
 * Generate similar-style questions: keep the stem, swap the topic with others from the same group.
 * `group` must contain the question's own topic; nothing is swapped across groups.
 */
export function generateSimilar(
  text: string,
  ownTopicId: string,
  group: GTopic[],
): { text: string; topicId: string; stemId: string }[] {
  const m = detectStem(text);
  if (!m) return [];
  const others = group.filter((t) => t.id !== ownTopicId);
  if (m.stem.pair) {
    const out: { text: string; topicId: string; stemId: string }[] = [];
    for (let i = 0; i < group.length; i++)
      for (let j = i + 1; j < group.length; j++) {
        const s = m.stem.template.replace('{X}', group[i].name).replace('{Y}', group[j].name);
        if (tokens(s).join() !== tokens(text).join()) out.push({ text: s, topicId: group[i].id, stemId: m.stem.id });
      }
    return out.slice(0, 6);
  }
  const own = group.find((t) => t.id === ownTopicId);
  return others.map((t) => {
    // If the matched phrase contains the own topic name, replace only that part, keeping extra context
    let x = t.name;
    if (own && phraseScore(m.x, own.name) < 0.9) {
      const re = new RegExp(own.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      if (re.test(m.x)) x = m.x.replace(re, t.name);
    }
    return { text: m.stem.template.replace('{X}', x), topicId: t.id, stemId: m.stem.id };
  });
}
