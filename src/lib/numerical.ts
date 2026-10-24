import { evaluate } from 'mathjs';

export interface Variable {
  name: string;
  value: number;
  unit: string;
  raw: string;
  sigFigs: number;
  integer: boolean;
  angle: boolean;
  min?: number;
  max?: number;
  step?: number;
}

export interface Detected extends Variable {
  start: number;
  end: number;
}

export const NICE_ANGLES = [30, 37, 45, 53, 60, 90];

const UNIT_LIST = [
  'm/s\\^?2', 'm/s', 'km/h', 'rad/s', 'kg', 'g', 'mg', 'km', 'cm', 'mm', 'nm', 'μm', 'um', 'Å', 'm',
  'ms', 's', 'min', 'kHz', 'MHz', 'Hz', 'kN', 'N', 'kJ', 'MeV', 'keV', 'eV', 'J', 'kW', 'W', 'kV', 'mV', 'V',
  'mA', 'μA', 'A', 'kΩ', 'Ω', 'ohms?', 'μF', 'pF', 'nF', 'F', 'mH', 'H', 'Wb', 'T', 'K', '°C', '°', 'degrees?',
  'mol', 'atm', 'Pa', 'L', 'C', 'rpm',
];
const COUNT_WORDS = ['turns', 'slits', 'moles', 'lines', 'rulings', 'electrons', 'photons', 'atoms', 'loops', 'fringes', 'cycles'];

const NUM = String.raw`(\d+(?:\.\d+)?)(?:\s*(?:×|x|\*)\s*10\s*\^?\s*\{?([-−+]?\d+)\}?|e([-−+]?\d+))?`;
const QTY_RE = new RegExp(
  NUM + String.raw`\s*(` + UNIT_LIST.join('|') + '|' + COUNT_WORDS.join('|') + String.raw`)(?![A-Za-z])`,
  'g',
);

const NAME_BY_UNIT: [RegExp, string][] = [
  [/^m\/s\^?2$/, 'a'], [/^(m\/s|km\/h)$/, 'v'], [/^rad\/s$/, 'w'], [/^(kg|g|mg)$/, 'mass'],
  [/^(nm|Å|μm|um)$/, 'lambda'], [/^(km|cm|mm|m)$/, 'd'], [/^(ms|s|min)$/, 't'], [/Hz$/, 'f'], [/N$/, 'F'],
  [/(eV|J)$/, 'E'], [/W$/, 'P'], [/V$/, 'V'], [/A$/, 'I'], [/(Ω|ohm)/, 'R'], [/F$/, 'Cap'], [/H$/, 'Lind'],
  [/^Wb$/, 'phi'], [/^T$/, 'B'], [/^(K|°C)$/, 'T'], [/^(°|degrees?)$/, 'theta'], [/^mol$/, 'n'], [/^(atm|Pa)$/, 'p'],
  [/^C$/, 'q'], [/^rpm$/, 'rpm'], [/^turns$/, 'N'], [/^slits$/, 'Ns'], [/^moles$/, 'n'],
];

export function countSigFigs(raw: string): number {
  const digits = raw.replace(/^[-+]/, '').replace('.', '').replace(/^0+/, '');
  if (!raw.includes('.')) return Math.max(1, digits.replace(/0+$/, '').length || 1);
  return Math.max(1, digits.length);
}

export function roundSig(x: number, sig: number): number {
  if (x === 0 || !isFinite(x)) return x;
  const p = Math.ceil(Math.log10(Math.abs(x)));
  const f = Math.pow(10, sig - p);
  return Math.round(x * f) / f;
}

export function formatNum(x: number, sig = 3): string {
  if (!isFinite(x)) return String(x);
  const r = roundSig(x, sig);
  const a = Math.abs(r);
  if (a !== 0 && (a >= 1e5 || a < 1e-3)) {
    const exp = Math.floor(Math.log10(a));
    const mant = roundSig(r / Math.pow(10, exp), sig);
    return `${mant} × 10^${exp}`;
  }
  return String(Number(r.toPrecision(Math.max(sig, 1))));
}

export function detectQuantities(text: string): Detected[] {
  const out: Detected[] = [];
  const used = new Map<string, number>();
  for (const m of text.matchAll(QTY_RE)) {
    const [raw, mant, exp1, exp2, unitRaw] = m;
    const exp = (exp1 ?? exp2)?.replace('−', '-');
    const value = Number(mant) * (exp ? Math.pow(10, Number(exp)) : 1);
    const unit = unitRaw;
    const angle = /^(°|degrees?)$/.test(unit);
    const integer = COUNT_WORDS.includes(unit) || (!mant.includes('.') && /^(mol)$/.test(unit) && Number(mant) < 20);
    let base = NAME_BY_UNIT.find(([re]) => re.test(unit))?.[1] ?? 'x';
    const n = (used.get(base) ?? 0) + 1;
    used.set(base, n);
    const name = n === 1 ? base : `${base}${n}`;
    out.push({
      name, value, unit, raw, sigFigs: countSigFigs(mant), integer, angle,
      start: m.index!, end: m.index! + raw.length,
    });
  }
  // rename first occurrences when a base name is used more than once (d -> d1, d2)
  for (const [base, count] of used) if (count > 1) {
    const first = out.find((v) => v.name === base);
    if (first) first.name = `${base}1`;
  }
  return out;
}

/** Convert detected quantities to a template string with {{name}} placeholders. */
export function toTemplate(text: string, vars: Detected[]): string {
  let s = '';
  let last = 0;
  for (const v of [...vars].sort((a, b) => a.start - b.start)) {
    s += text.slice(last, v.start) + `{{${v.name}}}`;
    last = v.end;
  }
  return s + text.slice(last);
}

export function renderTemplate(tpl: string, vars: Variable[], values: Record<string, number>): string {
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, name) => {
    const v = vars.find((x) => x.name === name);
    if (!v) return name;
    const val = values[name] ?? v.value;
    const num = v.angle ? `${val}` : formatNum(val, v.integer ? 10 : Math.max(4, v.sigFigs));
    const unit = v.angle ? '°' : ` ${v.unit}`;
    return v.angle ? num + unit : num + unit;
  });
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function varyValue(v: Variable, rng: Rng): number {
  if (v.min !== undefined && v.max !== undefined) {
    const step = v.step || (v.integer ? 1 : roundSig((v.max - v.min) / 10, 1) || 1);
    const n = Math.floor((v.max - v.min) / step);
    const val = v.min + Math.floor(rng() * (n + 1)) * step;
    return v.integer ? Math.round(val) : roundSig(val, Math.max(v.sigFigs, 2));
  }
  if (v.angle) {
    const choices = NICE_ANGLES.filter((a) => a !== v.value);
    return choices[Math.floor(rng() * choices.length)];
  }
  // change by 20–80 % up or down
  const pct = 0.2 + rng() * 0.6;
  const up = rng() < 0.5 || v.value * (1 - pct) <= 0;
  let x = v.value * (up ? 1 + pct : 1 - pct);
  if (v.integer) return Math.max(1, Math.round(x));
  x = roundSig(x, v.sigFigs);
  if (x === v.value) x = roundSig(v.value * 1.5, v.sigFigs);
  return x;
}

export function generateValues(vars: Variable[], rng: Rng): Record<string, number> {
  const out: Record<string, number> = {};
  for (const v of vars) out[v.name] = varyValue(v, rng);
  return out;
}

/** Evaluate "lhs = expr" (or just "expr"). Angles are converted to radians before evaluation. */
export function evaluateFormula(
  formula: string,
  vars: Variable[],
  values: Record<string, number>,
  constants: Record<string, number> = {},
): { name: string; value: number } {
  const [lhs, rhs] = formula.includes('=') ? formula.split('=').map((s) => s.trim()) : ['ans', formula];
  const scope: Record<string, number> = { ...constants };
  for (const v of vars) {
    const val = values[v.name] ?? v.value;
    scope[v.name] = v.angle ? (val * Math.PI) / 180 : val;
  }
  const value = Number(evaluate(rhs, scope));
  return { name: lhs, value };
}
