import { TAU, MONO, esc, f3 } from '../util';

export type Glyph = { k: 'c' | 's' | 'p'; v: string };
type Op = any[];

const fr = (x: number, y: number, w: number, h: number, t: number): Op[] => [
  ['r', x, y, w, t], ['r', x, y + h - t, w, t], ['r', x, y, t, h], ['r', x + w - t, y, t, h],
];

export const SHAPES: Record<string, Op[]> = {
  blank: [],
  dot: [['c', 0.5, 0.5, 0.14]],
  'dot-lg': [['c', 0.5, 0.5, 0.32]],
  square: [['r', 0.28, 0.28, 0.44, 0.44]],
  'square-o': fr(0.2, 0.2, 0.6, 0.6, 0.12),
  ring: [['o', 0.5, 0.5, 0.27, 0.11]],
  'ring-dot': [['o', 0.5, 0.5, 0.31, 0.1], ['c', 0.5, 0.5, 0.1]],
  cross: [['l', 0.26, 0.26, 0.74, 0.74, 0.12], ['l', 0.74, 0.26, 0.26, 0.74, 0.12]],
  plus: [['r', 0.44, 0.18, 0.12, 0.64], ['r', 0.18, 0.44, 0.64, 0.12]],
  dash: [['r', 0.18, 0.44, 0.64, 0.12]],
  equals: [['r', 0.16, 0.3, 0.68, 0.12], ['r', 0.16, 0.58, 0.68, 0.12]],
  pipe: [['r', 0.44, 0.12, 0.12, 0.76]],
  slash: [['l', 0.24, 0.8, 0.76, 0.2, 0.12]],
  block: [['r', 0, 0, 1, 1]],
  'block-in': [['r', 0.08, 0.08, 0.84, 0.84]],
  diamond: [['p', [0.5, 0.12, 0.88, 0.5, 0.5, 0.88, 0.12, 0.5]]],
  triangle: [['p', [0.5, 0.18, 0.86, 0.8, 0.14, 0.8]]],
  dots4: [['c', 0.3, 0.3, 0.1], ['c', 0.7, 0.3, 0.1], ['c', 0.3, 0.7, 0.1], ['c', 0.7, 0.7, 0.1]],
  chain: [['o', 0.5, 0.5, 0.22, 0.1], ['r', 0, 0.45, 0.28, 0.1], ['r', 0.72, 0.45, 0.28, 0.1]],
};
export const SHAPE_NAMES = Object.keys(SHAPES);

const pixCache = new Map<string, Op[]>();
export function glyphOps(g: Glyph): Op[] | null {
  if (g.k === 's') return SHAPES[g.v] || [];
  if (g.k === 'p') {
    let o = pixCache.get(g.v);
    if (o) return o;
    o = [];
    for (let y = 0; y < 8; y++) {
      let x = 0;
      while (x < 8) {
        if (g.v[y * 8 + x] === '1') {
          let e = x;
          while (e < 8 && g.v[y * 8 + e] === '1') e++;
          o.push(['r', x / 8, y / 8, (e - x) / 8, 1 / 8]);
          x = e;
        } else x++;
      }
    }
    pixCache.set(g.v, o);
    return o;
  }
  return null;
}
export const isBlank = (g: Glyph) =>
  (g.k === 'c' && (!g.v || g.v === ' ')) || (g.k === 's' && g.v === 'blank') || (g.k === 'p' && !g.v.includes('1'));

export function drawGlyph(ctx: CanvasRenderingContext2D, g: Glyph, x: number, y: number, w: number, h: number, col: string, s: number, wt = 400) {
  if (g.k === 'c') {
    if (!g.v || g.v === ' ') return;
    ctx.fillStyle = col;
    ctx.font = `${wt} ${h * 0.86 * s}px ${MONO}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(g.v, x + w / 2, y + h / 2 + h * 0.04 * s);
    return;
  }
  const ops = glyphOps(g);
  if (!ops || !ops.length) return;
  const W = w * s, H = h * s, ox = x + (w - W) / 2, oy = y + (h - H) / 2, m = Math.min(W, H);
  ctx.fillStyle = col;
  ctx.strokeStyle = col;
  for (const o of ops) {
    switch (o[0]) {
      case 'r': {
        let x0 = ox + o[1] * W, y0 = oy + o[2] * H, x1 = x0 + o[3] * W, y1 = y0 + o[4] * H;
        if (W > 6) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.max(x0 + 1, Math.round(x1)); y1 = Math.max(y0 + 1, Math.round(y1)); }
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
        break;
      }
      case 'c': ctx.beginPath(); ctx.arc(ox + o[1] * W, oy + o[2] * H, Math.max(0.3, o[3] * m), 0, TAU); ctx.fill(); break;
      case 'o': ctx.lineWidth = Math.max(0.6, o[4] * m); ctx.beginPath(); ctx.arc(ox + o[1] * W, oy + o[2] * H, o[3] * m, 0, TAU); ctx.stroke(); break;
      case 'l': ctx.lineWidth = Math.max(0.6, o[5] * m); ctx.lineCap = 'square'; ctx.beginPath(); ctx.moveTo(ox + o[1] * W, oy + o[2] * H); ctx.lineTo(ox + o[3] * W, oy + o[4] * H); ctx.stroke(); break;
      case 'p': { const p = o[1]; ctx.beginPath(); for (let i = 0; i < p.length; i += 2) ctx[i ? 'lineTo' : 'moveTo'](ox + p[i] * W, oy + p[i + 1] * H); ctx.fill(); break; }
    }
  }
}

export function svgGlyph(g: Glyph, x: number, y: number, w: number, h: number, s: number, wt = 400) {
  if (g.k === 'c') {
    if (!g.v || g.v === ' ') return '';
    return `<text x="${f3(x + w / 2)}" y="${f3(y + h / 2 + h * 0.04 * s)}" font-size="${f3(h * 0.86 * s)}"${wt != 400 ? ` font-weight="${wt}"` : ''}>${esc(g.v)}</text>`;
  }
  const ops = glyphOps(g) || [];
  const W = w * s, H = h * s, ox = x + (w - W) / 2, oy = y + (h - H) / 2, m = Math.min(W, H);
  let o = '';
  for (const p of ops) {
    switch (p[0]) {
      case 'r': o += `<rect x="${f3(ox + p[1] * W)}" y="${f3(oy + p[2] * H)}" width="${f3(p[3] * W)}" height="${f3(p[4] * H)}"/>`; break;
      case 'c': o += `<circle cx="${f3(ox + p[1] * W)}" cy="${f3(oy + p[2] * H)}" r="${f3(p[3] * m)}"/>`; break;
      case 'o': o += `<circle cx="${f3(ox + p[1] * W)}" cy="${f3(oy + p[2] * H)}" r="${f3(p[3] * m)}" fill="none" stroke="currentColor" stroke-width="${f3(p[4] * m)}"/>`; break;
      case 'l': o += `<line x1="${f3(ox + p[1] * W)}" y1="${f3(oy + p[2] * H)}" x2="${f3(ox + p[3] * W)}" y2="${f3(oy + p[4] * H)}" stroke="currentColor" stroke-width="${f3(p[5] * m)}" stroke-linecap="square"/>`; break;
      case 'p': o += `<polygon points="${p[1].map((v: number, i: number) => f3(i % 2 ? oy + v * H : ox + v * W)).join(' ')}"/>`; break;
    }
  }
  return o;
}

export const SH = (s: string): Glyph[] => s.split(' ').map((v) => ({ k: 's', v }));
export const CH = (s: string): Glyph[] => [...s].map((v) => ({ k: 'c', v }));
const CHAR_FALLBACK: Record<string, string> = {
  blank: ' ', dot: '.', 'dot-lg': 'o', square: '■', 'square-o': '□', ring: 'o', 'ring-dot': '◉', cross: 'x', plus: '+',
  dash: '-', equals: '=', pipe: '|', slash: '/', block: '█', 'block-in': '▓', diamond: '◆', triangle: '▲', dots4: ':', chain: '∞',
};
export const glyphChar = (g: Glyph) => (g.k === 'c' ? g.v || ' ' : g.k === 'p' ? '#' : CHAR_FALLBACK[g.v] || '?');
