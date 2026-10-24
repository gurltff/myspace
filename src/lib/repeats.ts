import { tokenSet, jaccard } from './text';

export interface QLite {
  id: string;
  text: string;
  year?: number;
}

/** Group similar questions (union-find over Jaccard >= threshold). Returns groups with 2+ members. */
export function groupRepeats(qs: QLite[], threshold = 0.6): string[][] {
  const sets = qs.map((q) => tokenSet(q.text));
  const parent = qs.map((_, i) => i);
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < qs.length; i++)
    for (let j = i + 1; j < qs.length; j++)
      if (jaccard(sets[i], sets[j]) >= threshold) parent[find(i)] = find(j);
  const groups = new Map<number, string[]>();
  qs.forEach((q, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), q.id]);
  });
  return [...groups.values()].filter((g) => g.length > 1);
}

/** Map question id -> how many times it (or a near-duplicate) was asked. */
export function repeatCounts(qs: QLite[], threshold = 0.6): Record<string, number> {
  const out: Record<string, number> = {};
  for (const g of groupRepeats(qs, threshold)) for (const id of g) out[id] = g.length;
  return out;
}
