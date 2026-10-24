import { evaluate } from 'mathjs';

export interface ObsColumn {
  id: string;
  name: string;
  /** variable key used in formulas */
  key: string;
  /** if set, column is computed with math.js from other columns in the same row */
  formula?: string;
}

export function toKey(name: string): string {
  const k = name.replace(/\(.*?\)/g, '').trim().replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
  return /^[A-Za-z_]/.test(k) ? k : `c_${k}`;
}

export function computeRows(columns: ObsColumn[], rows: Record<string, string>[]): Record<string, number | string>[] {
  return rows.map((row) => {
    const scope: Record<string, number> = {};
    const out: Record<string, number | string> = {};
    for (const c of columns) {
      if (c.formula) continue;
      const n = parseFloat(row[c.id]);
      if (!isNaN(n)) scope[c.key] = n;
      out[c.id] = row[c.id] ?? '';
    }
    for (const c of columns) {
      if (!c.formula) continue;
      try {
        const v = Number(evaluate(c.formula, scope));
        out[c.id] = isFinite(v) ? v : '';
        if (isFinite(v)) scope[c.key] = v;
      } catch {
        out[c.id] = '';
      }
    }
    return out;
  });
}

export function columnMean(computed: Record<string, number | string>[], colId: string): number | undefined {
  const nums = computed.map((r) => (typeof r[colId] === 'number' ? (r[colId] as number) : parseFloat(String(r[colId])))).filter((n) => !isNaN(n));
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

export function percentError(measured: number, standard: number): number {
  return (Math.abs(measured - standard) / Math.abs(standard)) * 100;
}

/** Final result: evaluate formula with mean_<key> for every column. */
export function finalResult(formula: string, columns: ObsColumn[], computed: Record<string, number | string>[]): number | undefined {
  const scope: Record<string, number> = {};
  for (const c of columns) {
    const m = columnMean(computed, c.id);
    if (m !== undefined) {
      scope[`mean_${c.key}`] = m;
      scope[c.key] = m;
    }
  }
  try {
    const v = Number(evaluate(formula, scope));
    return isFinite(v) ? v : undefined;
  } catch {
    return undefined;
  }
}
