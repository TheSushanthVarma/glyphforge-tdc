export const TAU = Math.PI * 2;
export const clamp = (v: number, a = 0, b = 1) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const hash = (x: number, y: number, z = 0) => {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(z | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
};

export const hexRgb = (h: string): [number, number, number] => {
  h = String(h).replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h, 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
export const rgbHex = (r: number, g: number, b: number) => '#' + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
export const mix = (a: string, b: string, t: number) => {
  const A = hexRgb(a), B = hexRgb(b), k = clamp(t);
  return rgbHex(Math.round(lerp(A[0], B[0], k)), Math.round(lerp(A[1], B[1], k)), Math.round(lerp(A[2], B[2], k)));
};
export const gradAt = (stops: string[], t: number) => {
  t = clamp(t) * (stops.length - 1);
  const i = Math.min(stops.length - 2, Math.floor(t));
  return mix(stops[i], stops[i + 1], t - i);
};
export const esc = (s: unknown) =>
  String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as Record<string, string>)[c]);
export const f3 = (n: number) => (Math.round(n * 1000) / 1000).toString();
export const mk = (w: number, h: number) => {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
};
export const MONO = '"JetBrains Mono", ui-monospace, monospace';
export const fmt = (v: number, step: number) =>
  step >= 1 ? String(Math.round(v)) : step >= 0.1 ? (+v).toFixed(1) : step >= 0.01 ? (+v).toFixed(2) : (+v).toFixed(3);

export function getPath(o: any, path: string) {
  return path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
}
export function setPath(o: any, path: string, v: unknown) {
  const ks = path.split('.');
  let c = o;
  for (let i = 0; i < ks.length - 1; i++) c = c[ks[i]];
  c[ks[ks.length - 1]] = v;
}
export const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];
