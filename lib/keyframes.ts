import { clamp, lerp, mix, getPath, setPath } from './util';

export type Ease = 'linear' | 'smooth' | 'in' | 'out' | 'hold' | 'back' | 'elastic' | 'bounce';
export type Key = { t: number; v: number | string; e: Ease };
export type Tracks = Record<string, Key[]>;

const bounceOut = (x: number) => {
  const n = 7.5625, d = 2.75;
  if (x < 1 / d) return n * x * x;
  if (x < 2 / d) return n * (x -= 1.5 / d) * x + 0.75;
  if (x < 2.5 / d) return n * (x -= 2.25 / d) * x + 0.9375;
  return n * (x -= 2.625 / d) * x + 0.984375;
};
export const EASES: Record<Ease, (x: number) => number> = {
  linear: (x) => x,
  smooth: (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  in: (x) => x * x * x,
  out: (x) => 1 - Math.pow(1 - x, 3),
  hold: () => 0,
  back: (x) => {
    const c = 1.70158 * 1.525;
    return x < 0.5 ? (Math.pow(2 * x, 2) * ((c + 1) * 2 * x - c)) / 2 : (Math.pow(2 * x - 2, 2) * ((c + 1) * (x * 2 - 2) + c) + 2) / 2;
  },
  elastic: (x) => (x === 0 || x === 1 ? x : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1),
  bounce: bounceOut,
};
export const EASE_LABELS: [Ease, string][] = [
  ['smooth', 'Ease in-out'], ['linear', 'Linear'], ['in', 'Ease in'], ['out', 'Ease out'], ['back', 'Overshoot'], ['elastic', 'Elastic'], ['bounce', 'Bounce'], ['hold', 'Hold'],
];

export function valueAt(keys: Key[], t: number): number | string | undefined {
  if (!keys || !keys.length) return undefined;
  if (t <= keys[0].t) return keys[0].v;
  const last = keys[keys.length - 1];
  if (t >= last.t) return last.v;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].t <= t) i++;
  const a = keys[i], b = keys[i + 1], p = clamp((t - a.t) / Math.max(1e-6, b.t - a.t)), e = EASES[a.e || 'smooth'](p);
  if (typeof a.v === 'number' && typeof b.v === 'number') return lerp(a.v, b.v, e);
  if (typeof a.v === 'string' && typeof b.v === 'string' && a.v[0] === '#' && b.v[0] === '#') return a.e === 'hold' ? a.v : mix(a.v, b.v, clamp(e, 0, 1));
  return e < 1 ? a.v : b.v;
}

/** Returns studio states with every keyframed parameter evaluated at time t (0–1 of the loop). */
export function evaluate<T extends { ascii: any; icon: any; math: any; tracks: Tracks }>(doc: T, t: number) {
  const out: { ascii: any; icon: any; math: any } = { ascii: doc.ascii, icon: doc.icon, math: doc.math };
  const cloned: Record<string, boolean> = {};
  for (const path in doc.tracks) {
    const keys = doc.tracks[path];
    if (!keys || !keys.length) continue;
    const root = path.split('.')[0] as 'ascii' | 'icon' | 'math';
    if (!(root in out)) continue;
    if (!cloned[root]) { out[root] = structuredClone(out[root]); cloned[root] = true; }
    const v = valueAt(keys, t);
    if (getPath(out, path) !== undefined) setPath(out, path, v);
  }
  return out;
}

export function upsertKey(tracks: Tracks, path: string, t: number, v: number | string, eps: number, ease: Ease = 'smooth') {
  const keys = tracks[path] || (tracks[path] = []);
  const ex = keys.find((k) => Math.abs(k.t - t) <= eps);
  if (ex) ex.v = v;
  else { keys.push({ t, v, e: ease }); keys.sort((a, b) => a.t - b.t); }
}
