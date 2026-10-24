export const STOPWORDS = new Set(
  `a an the and or of in on at to for from by with without is are was were be been being this that these those it its as
  into about over under between using use used what which who whom whose why how when where explain derive state prove show
  write short note define give discuss describe obtain find calculate deduce briefly neat diagram expression relation
  their there then than also any all each both either neither not no can could would should will may might must do does did
  has have had i ii iii iv v vi marks mark q question part section answer following its your his her our we you they them
  si unit units value values term terms case cases`.split(/\s+/).filter(Boolean),
);

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** crude stemmer: strips common English suffixes so "waves" ~ "wave" */
export function stem(w: string): string {
  if (w.length <= 4) return w;
  return w.replace(/(ies|es|s|ing|ed|ly|al)$/, '') || w;
}

export function tokens(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((w) => w.length > 1 && !STOPWORDS.has(w) && !/^\d+$/.test(w))
    .map(stem);
}

export function tokenSet(text: string): Set<string> {
  return new Set(tokens(text));
}

export function jaccard(a: Set<string>, b: Set<string>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
