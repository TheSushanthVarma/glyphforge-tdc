import { TAU, mix, rgbHex, hash, mk, esc, f3 } from '../util';
import { ICONS } from './presets';
import { drawGlyph, svgGlyph } from './glyphs';

const lenCache = new Map<string, number>();
let measPath: SVGPathElement | null = null;
function pathLen(d: string) {
  let l = lenCache.get(d);
  if (l == null) {
    try {
      if (!measPath) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '0'); svg.setAttribute('height', '0'); svg.style.position = 'absolute';
        measPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        svg.appendChild(measPath); document.body.appendChild(svg);
      }
      measPath.setAttribute('d', d);
      l = measPath.getTotalLength();
    } catch { l = 60; }
    lenCache.set(d, l);
  }
  return l;
}
export function iconParts(st: any): [string, number][] {
  if (st.icon === 'custom') return (st.custom || '').split(/\n+/).filter(Boolean).map((d: string, i: number) => [d, i % 2]);
  return ICONS[st.icon] || ICONS.shield;
}
const toneCol = (st: any, tone: number, i: number) =>
  st.tone === 'mono' ? st.p : st.tone === 'swap' ? (tone ? st.p : st.s) : st.tone === 'alt' ? (i % 2 ? st.s : st.p) : tone ? st.s : st.p;

function xform(st: any, t: number) {
  const P = TAU * t;
  let s = 1, r = (st.rot * Math.PI) / 180, dy = 0, sx = 1, sy = 1;
  switch (st.anim) {
    case 'pulse': s = 1 + 0.07 * Math.sin(P); break;
    case 'spin': r += P; break;
    case 'bounce': { const b = Math.abs(Math.sin(P)); dy = -b * 0.12; sy = 1 - (b < 0.15 ? 0.08 * (1 - b) : 0); sx = 2 - sy; break; }
    case 'wiggle': r += 0.2 * Math.sin(P * 2); break;
  }
  return { s, r, dy, sx, sy };
}

function strokeIcon(ctx: CanvasRenderingContext2D, st: any, t: number, size: number) {
  const parts = iconParts(st), k = (size * (1 - st.pad * 2)) / 24;
  ctx.save();
  ctx.scale(k, k);
  ctx.translate(-12, -12);
  ctx.lineWidth = st.stroke;
  ctx.lineCap = st.cap;
  ctx.lineJoin = st.join;
  parts.forEach(([d, tone], i) => {
    let p: Path2D;
    try { p = new Path2D(d); } catch { return; }
    const col = toneCol(st, tone, i), L = pathLen(d);
    if (st.fillA > 0) { ctx.globalAlpha = st.fillA; ctx.fillStyle = col; ctx.fill(p); ctx.globalAlpha = 1; }
    let dash: number[] = [], off = 0;
    if (st.anim === 'draw') {
      const q = t < 0.5 ? 1 - Math.pow(1 - t / 0.5, 3) : 1;
      dash = [L + 0.01, L + 1];
      off = t < 0.5 ? L * (1 - q) : t < 0.78 ? 0 : -L * ((t - 0.78) / 0.22);
    } else if (st.anim === 'march') {
      const sg = st.cutSeg > 0 ? st.cutSeg : 2, gp = st.cutGap;
      dash = [sg, gp]; off = -t * (sg + gp) * 3;
    } else if (st.cutSeg > 0) dash = [st.cutSeg, st.cutGap];
    if (st.echo > 0) {
      ctx.save(); ctx.translate(st.echo, st.echo);
      ctx.strokeStyle = st.tone === 'mono' ? mix(st.p, st.canvas, 0.5) : tone ? st.p : st.s;
      ctx.globalAlpha = 0.5; ctx.setLineDash(dash); ctx.lineDashOffset = off; ctx.stroke(p); ctx.restore();
    }
    ctx.setLineDash(dash);
    ctx.lineDashOffset = off;
    if (st.glow > 0) { ctx.shadowBlur = (st.glow * size) / 120; ctx.shadowColor = col; }
    ctx.strokeStyle = col;
    ctx.stroke(p);
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}
function bgShape(ctx: CanvasRenderingContext2D, st: any, size: number) {
  if (st.bgShape === 'none') return;
  ctx.fillStyle = st.bgc;
  ctx.beginPath();
  const h = size / 2;
  if (st.bgShape === 'circle') ctx.arc(0, 0, h, 0, TAU);
  else if (st.bgShape === 'squircle') (ctx as any).roundRect(-h, -h, size, size, size * 0.28);
  else ctx.rect(-h, -h, size, size);
  ctx.fill();
}
let pixC: HTMLCanvasElement | null = null;
function rasterIcon(st: any, t: number) {
  const res = Math.max(4, Math.round(st.res));
  if (!pixC || pixC.width !== res) pixC = mk(res, res);
  const px = pixC.getContext('2d', { willReadFrequently: true })!;
  px.setTransform(1, 0, 0, 1, 0, 0);
  px.clearRect(0, 0, res, res);
  px.translate(res / 2, res / 2);
  strokeIcon(px, { ...st, glow: 0 }, t, res);
  return { res, d: px.getImageData(0, 0, res, res).data };
}

export function renderIcon(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, st: any) {
  ctx.fillStyle = st.canvas;
  ctx.fillRect(0, 0, W, H);
  const mn = Math.min(W, H), size = mn * st.scale, X = xform(st, t);
  ctx.save();
  ctx.translate(W / 2 + st.offX * mn * 0.5, H / 2 + st.offY * mn * 0.5 + X.dy * size);
  ctx.rotate(X.r);
  ctx.scale(X.s * X.sx, X.s * X.sy);
  bgShape(ctx, st, size);
  if (st.pixel === 'off') { strokeIcon(ctx, st, t, size); ctx.restore(); return; }
  const { res, d } = rasterIcon(st, t), cs = size / res, g = { k: 's' as const, v: st.pshape };
  const gh = st.ghost > 0 ? mix(st.bgShape === 'none' ? st.canvas : st.bgc, st.p, st.ghost) : null;
  for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
    const o = (j * res + i) * 4, x = -size / 2 + i * cs, y = -size / 2 + j * cs;
    let on = d[o + 3] / 255 > 0.32;
    if (on && st.anim === 'flicker' && hash(i, j, Math.floor(t * 14)) < 0.18) on = false;
    if (on) drawGlyph(ctx, g, x, y, cs, cs, rgbHex(d[o], d[o + 1], d[o + 2]), 0.92);
    else if (gh) drawGlyph(ctx, { k: 's', v: 'dot' }, x, y, cs, cs, gh, 1);
  }
  ctx.restore();
}

export function svgIcon(W: number, H: number, t: number, st: any, dur: number, animated: boolean) {
  const mn = Math.min(W, H), size = mn * st.scale, h = size / 2;
  let bg = '';
  if (st.bgShape === 'circle') bg = `<circle r="${f3(h)}" fill="${st.bgc}"/>`;
  else if (st.bgShape === 'squircle') bg = `<rect x="${f3(-h)}" y="${f3(-h)}" width="${f3(size)}" height="${f3(size)}" rx="${f3(size * 0.28)}" fill="${st.bgc}"/>`;
  else if (st.bgShape === 'square') bg = `<rect x="${f3(-h)}" y="${f3(-h)}" width="${f3(size)}" height="${f3(size)}" fill="${st.bgc}"/>`;
  const X = animated ? { s: 1, r: (st.rot * Math.PI) / 180, dy: 0, sx: 1, sy: 1 } : xform(st, t);
  let body = '';
  if (st.pixel !== 'off') {
    const { res, d } = rasterIcon(st, t), cs = size / res, groups = new Map<string, string>();
    for (let j = 0; j < res; j++) for (let i = 0; i < res; i++) {
      const o = (j * res + i) * 4;
      if (d[o + 3] / 255 > 0.32) { const c = rgbHex(d[o], d[o + 1], d[o + 2]); groups.set(c, (groups.get(c) || '') + svgGlyph({ k: 's', v: st.pshape }, -h + i * cs, -h + j * cs, cs, cs, 0.92)); }
    }
    for (const [c, e] of groups) body += `<g fill="${c}" color="${c}">${e}</g>`;
  } else {
    const k = (size * (1 - st.pad * 2)) / 24;
    body = `<g transform="scale(${f3(k)}) translate(-12 -12)" fill="none" stroke-width="${st.stroke}" stroke-linecap="${st.cap}" stroke-linejoin="${st.join}">`;
    iconParts(st).forEach(([d, tone], i) => {
      const col = toneCol(st, tone, i), dash = st.cutSeg > 0 ? ` stroke-dasharray="${st.cutSeg} ${st.cutGap}"` : '';
      if (st.fillA > 0) body += `<path d="${esc(d)}" fill="${col}" fill-opacity="${st.fillA}" stroke="none"/>`;
      if (st.echo > 0) body += `<path d="${esc(d)}" stroke="${tone ? st.p : st.s}" opacity=".5" transform="translate(${st.echo} ${st.echo})"${dash}/>`;
      body += `<path class="p" d="${esc(d)}" stroke="${col}"${animated && st.anim === 'draw' ? ' pathLength="1"' : dash}/>`;
    });
    body += '</g>';
  }
  let css = '';
  if (animated) {
    const D = dur + 's', seg = st.cutSeg || 2;
    const m: Record<string, string> = {
      draw: `.p{stroke-dasharray:1 1;animation:d ${D} infinite}@keyframes d{0%{stroke-dashoffset:1}50%{stroke-dashoffset:0}78%{stroke-dashoffset:0}100%{stroke-dashoffset:-1}}`,
      march: `.p{stroke-dasharray:${seg} ${st.cutGap};animation:m ${D} linear infinite}@keyframes m{to{stroke-dashoffset:-${3 * (seg + st.cutGap)}}}`,
      pulse: `#ic{animation:a ${D} ease-in-out infinite}@keyframes a{25%{transform:scale(1.07)}75%{transform:scale(.93)}}`,
      spin: `#ic{animation:a ${D} linear infinite}@keyframes a{to{transform:rotate(360deg)}}`,
      bounce: `#ic{animation:a ${D} ease-in-out infinite}@keyframes a{0%,50%,100%{transform:translateY(0)}25%,75%{transform:translateY(-${f3(size * 0.12)}px)}}`,
      wiggle: `#ic{animation:a ${D} ease-in-out infinite}@keyframes a{25%{transform:rotate(11deg)}75%{transform:rotate(-11deg)}}`,
    };
    css = m[st.anim] ? `<style>${m[st.anim]}</style>` : '';
  }
  const tx = W / 2 + st.offX * mn * 0.5, ty = H / 2 + st.offY * mn * 0.5 + X.dy * size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${css}<rect width="100%" height="100%" fill="${st.canvas}"/><g transform="translate(${f3(tx)} ${f3(ty)})"><g id="ic"><g transform="rotate(${f3((X.r * 180) / Math.PI)}) scale(${f3(X.s * X.sx)} ${f3(X.s * X.sy)})">${bg}${body}</g></g></g></svg>`;
}
