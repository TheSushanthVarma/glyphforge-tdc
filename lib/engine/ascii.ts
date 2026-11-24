import { TAU, clamp, lerp, hash, mix, gradAt, rgbHex, mk } from '../util';
import { drawGlyph, svgGlyph, isBlank, glyphChar, Glyph } from './glyphs';
import { src } from './sources';
import { renderMath } from './math';
import { renderIcon } from './icon';

export type Eff = { ascii: any; icon: any; math: any };

const sampCache = new Map<string, { lum: Float32Array; rgb: Uint8Array }>();
let liveC: HTMLCanvasElement | null = null;

function getSample(cols: number, rows: number, st: any, t: number, W: number, H: number, eff: Eff) {
  const live = st.src === 'math' || st.src === 'icon';
  const zoom = Math.max(0.1, st.zoom ?? 1), px = st.panX ?? 0, py = st.panY ?? 0;
  const key = `${cols}x${rows}|${st.ca}|${src.ver}|${st.fit}|${zoom.toFixed(3)}|${px.toFixed(3)}|${py.toFixed(3)}`;
  if (!live) { const s = sampCache.get(key); if (s) return s; }
  let source: HTMLCanvasElement | null = src.canvas;
  if (live) {
    const lw = 420, lh = Math.max(1, Math.round((420 * H) / W));
    if (!liveC || liveC.width !== lw || liveC.height !== lh) liveC = mk(lw, lh);
    const lx = liveC.getContext('2d')!;
    lx.setTransform(1, 0, 0, 1, 0, 0);
    if (st.src === 'math') renderMath(lx, lw, lh, t, eff.math); else renderIcon(lx, lw, lh, t, eff.icon);
    source = liveC;
  }
  const c = mk(cols, rows), x = c.getContext('2d', { willReadFrequently: true })!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, cols, rows);
  if (source) {
    x.imageSmoothingQuality = 'high';
    const PW = cols, PH = rows * st.ca;
    const k = (st.fit === 'cover' ? Math.max : Math.min)(PW / source.width, PH / source.height) * zoom;
    const dw = source.width * k, dh = source.height * k;
    const ox = (PW - dw) / 2 + px * PW * 0.5, oy = (PH - dh) / 2 + py * PH * 0.5;
    x.drawImage(source, ox, oy / st.ca, dw, dh / st.ca);
  }
  const d = x.getImageData(0, 0, cols, rows).data, n = cols * rows, lum = new Float32Array(n), rgb = new Uint8Array(n * 3);
  for (let i = 0; i < n; i++) {
    const r = d[i * 4], g = d[i * 4 + 1], b = d[i * 4 + 2];
    lum[i] = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    rgb[i * 3] = r; rgb[i * 3 + 1] = g; rgb[i * 3 + 2] = b;
  }
  const s = { lum, rgb };
  if (!live) { if (sampCache.size > 64) sampCache.clear(); sampCache.set(key, s); }
  return s;
}

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

function computeAscii(W: number, H: number, t: number, st: any, eff: Eff) {
  const cols = Math.max(4, Math.round(st.cols)), cw = W / cols, ch = cw * st.ca, rows = Math.max(1, Math.ceil(H / ch)), n = cols * rows;
  const Smp = getSample(cols, rows, st, t, W, H, eff);
  const B = new Float32Array(n), R = new Float32Array(n), DX = new Float32Array(n), DY = new Float32Array(n), SC = new Float32Array(n), HI = new Uint8Array(n), SI = new Int32Array(n);
  const sp = Math.max(1, Math.round(st.speed)), tt = (((t * sp) % 1) + 1) % 1, P = tt * TAU, Am = st.amp, F = st.freq, ar = W / H, an = st.anim, L = st.glyphs.length;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    const k = j * cols + i, u = (i + 0.5) / cols, v = (j + 0.5) / rows;
    let su = u, sv = v, dx = 0, dy = 0, sc = 1, hi = 0;
    const cx = (u - 0.5) * ar, cy = v - 0.5, d = Math.sqrt(cx * cx + cy * cy);
    if (an === 'drift') { su = u + tt; sv = v + 0.025 * Math.sin(P + u * TAU); }
    else if (an === 'swirl') { const a = Am * 2.4 * Math.sin(P) * Math.max(0, 1 - d * 1.5), c = Math.cos(a), s = Math.sin(a); su = (cx * c - cy * s) / ar + 0.5; sv = cx * s + cy * c + 0.5; }
    else if (an === 'glitch') {
      const seg = Math.floor(tt * 16), band = Math.floor(j / (2 + Math.floor(hash(seg, 3) * 5)));
      if (hash(band, seg, 1) < Am * 0.4) { su = u + (hash(band, seg, 2) - 0.5) * 0.3; hi = hash(band, seg, 4) < 0.35 ? 1 : 0; }
    }
    const si = ((((Math.floor(su * cols) % cols) + cols) % cols)) + ((((Math.floor(sv * rows) % rows) + rows) % rows)) * cols;
    SI[k] = si;
    let b = clamp((Smp.lum[si] - 0.5) * st.contrast + 0.5 + st.bright);
    if (st.gamma !== 1) b = Math.pow(b, 1 / st.gamma);
    if (st.inv) b = 1 - b;
    switch (an) {
      case 'breathe': { const w = Math.sin(P); sc = 1 + Am * 0.45 * w * (0.3 + b * 0.7); b += Am * 0.12 * w; break; }
      case 'waves': { const w = Math.sin(TAU * u * F - P + Math.sin(v * TAU) * 1.2); b += Am * 0.35 * w; dy = Am * 0.6 * w; break; }
      case 'ripple': { const w = Math.sin(d * F * TAU * 1.5 - P); b += Am * 0.4 * w * (1 - Math.min(1, d)); sc = 1 + Am * 0.3 * w; break; }
      case 'twinkle': { const h = hash(i, j, 9), q = 0.5 + 0.5 * Math.sin(P * (1 + Math.floor(h * 3)) + h * TAU); b *= 1 - Am * 0.8 * (1 - q); if (q > 0.985 && h < Am * 0.6) { b = 1; hi = 1; } break; }
      case 'scan': {
        let dd = Math.abs(v - tt); dd = Math.min(dd, 1 - dd);
        const bw = 0.03 + Am * 0.08;
        if (dd < bw) { const q = 1 - dd / bw; b = clamp(b + q * Am * 1.2); hi = q > 0.55 ? 1 : 0; sc = 1 + q * 0.35; dx = (hash(j, Math.floor(tt * 30)) - 0.5) * q * Am * 2; } else b *= 1 - Am * 0.25;
        break;
      }
      case 'dissolve': { const p = 0.5 - 0.5 * Math.cos(P), h = hash(i, j, 5); if (h > p * 1.08) b *= 1 - Am; else if (h > p - 0.05) hi = 1; break; }
      case 'rain': { const h = hash(i, 0, 11), s2 = 1 + Math.floor(h * 3), f = (((tt * s2 - v + h * 7) % 1) + 1) % 1, tr = Math.pow(1 - f, 2 + F * 2); b = Math.max(b * (1 - Am * 0.7), tr * Am * 1.1); if (f < 0.015) hi = 1; break; }
    }
    b = clamp(b);
    B[k] = b; R[k] = b; DX[k] = dx; DY[k] = dy; SC[k] = sc; HI[k] = hi;
  }
  const q = L - 1;
  if (q > 0 && st.dither === 'bayer') {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const k = j * cols + i; B[k] = clamp(B[k] + (BAYER[(j & 3) * 4 + (i & 3)] / 16 - 0.47) / q); }
  } else if (q > 0 && st.dither === 'floyd') {
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const k = j * cols + i, o = B[k], nv = Math.round(clamp(o) * q) / q, e = o - nv;
      B[k] = nv;
      if (i + 1 < cols) B[k + 1] += (e * 7) / 16;
      if (j + 1 < rows) { if (i > 0) B[k + cols - 1] += (e * 3) / 16; B[k + cols] += (e * 5) / 16; if (i + 1 < cols) B[k + cols + 1] += e / 16; }
    }
  }
  return { cols, rows, cw, ch, n, B, R, DX, DY, SC, HI, SI, Smp };
}

function palette(st: any) {
  const duo: string[] = [], gr: string[] = [];
  for (let i = 0; i < 16; i++) duo.push(mix(st.bg, st.fg, 0.25 + (0.75 * i) / 15));
  for (let i = 0; i < 32; i++) gr.push(gradAt(st.gr, i / 31));
  return { duo, gr };
}
function cellColor(F: ReturnType<typeof computeAscii>, k: number, st: any, pal: ReturnType<typeof palette>, i: number, j: number) {
  if (F.HI[k] || (st.accAmt > 0 && hash(i, j, 7) < st.accAmt)) return st.acc;
  switch (st.cm) {
    case 'duo': return pal.duo[Math.round(F.R[k] * 15)];
    case 'grad': return pal.gr[Math.round(F.R[k] * 31)];
    case 'image': { const s = F.SI[k] * 3, r = F.Smp.rgb; return rgbHex(r[s] & 0xf8, r[s + 1] & 0xf8, r[s + 2] & 0xf8); }
    default: return st.fg;
  }
}

const atlas = new Map<string, HTMLCanvasElement>();
export function renderAscii(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, st: any, eff: Eff, hq = false) {
  ctx.fillStyle = st.bg;
  ctx.fillRect(0, 0, W, H);
  const F = computeAscii(W, H, t, st, eff), pal = palette(st), glyphs: Glyph[] = st.glyphs, q = glyphs.length - 1, { cols, cw, ch } = F;
  const useAtlas = !hq && st.cm !== 'image', aw = Math.ceil(cw) + 2, ah = Math.ceil(ch) + 2, sig = JSON.stringify(glyphs);
  if (atlas.size > 2500) atlas.clear();
  for (let k = 0; k < F.n; k++) {
    const gi = Math.round(clamp(F.B[k]) * q), g = glyphs[gi];
    if (isBlank(g)) continue;
    const i = k % cols, j = (k / cols) | 0, col = cellColor(F, k, st, pal, i, j);
    const s = F.SC[k] * st.fill * lerp(1, 0.25 + 0.75 * F.R[k], st.sizeBy), x = i * cw + F.DX[k] * cw, y = j * ch + F.DY[k] * ch;
    if (useAtlas) {
      const key = `${sig}|${gi}|${col}|${cw.toFixed(2)}|${st.ca}|${st.wt}`;
      let a = atlas.get(key);
      if (!a) { a = mk(aw, ah); drawGlyph(a.getContext('2d')!, g, 1, 1, cw, ch, col, 1, st.wt); atlas.set(key, a); }
      ctx.drawImage(a, x + cw / 2 - (aw / 2) * s, y + ch / 2 - (ah / 2) * s, aw * s, ah * s);
    } else drawGlyph(ctx, g, x, y, cw, ch, col, s, st.wt);
  }
}

export function svgAscii(W: number, H: number, t: number, st: any, eff: Eff) {
  const F = computeAscii(W, H, t, st, eff), pal = palette(st), q = st.glyphs.length - 1, { cols, cw, ch } = F, groups = new Map<string, string>();
  for (let k = 0; k < F.n; k++) {
    const gi = Math.round(clamp(F.B[k]) * q), g = st.glyphs[gi];
    if (isBlank(g)) continue;
    const i = k % cols, j = (k / cols) | 0, col = cellColor(F, k, st, pal, i, j), s = F.SC[k] * st.fill * lerp(1, 0.25 + 0.75 * F.R[k], st.sizeBy);
    const e = svgGlyph(g, i * cw + F.DX[k] * cw, j * ch + F.DY[k] * ch, cw, ch, s, st.wt);
    if (e) groups.set(col, (groups.get(col) || '') + e);
  }
  let o = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="${st.bg}"/><g font-family="JetBrains Mono, ui-monospace, monospace" text-anchor="middle" dominant-baseline="central">`;
  for (const [c, e] of groups) o += `<g fill="${c}" color="${c}">${e}</g>`;
  return o + '</g></svg>';
}

export function asciiText(W: number, H: number, t: number, st: any, eff: Eff) {
  const F = computeAscii(W, H, t, st, eff), q = st.glyphs.length - 1;
  let o = '';
  for (let j = 0; j < F.rows; j++) {
    let line = '';
    for (let i = 0; i < F.cols; i++) line += glyphChar(st.glyphs[Math.round(clamp(F.B[j * F.cols + i]) * q)]);
    o += line.replace(/\s+$/, '') + '\n';
  }
  return o;
}
