import { evaluate } from '../keyframes';
import { renderAscii, svgAscii, asciiText } from './ascii';
import { renderIcon, svgIcon } from './icon';
import { renderMath, svgMath } from './math';
import type { Doc } from '../store';

/** Draw the active studio at loop time t (0–1) with all keyframes applied. */
export function renderDoc(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, doc: Doc, hq = false) {
  const eff = evaluate(doc, t);
  if (doc.mode === 'ascii') renderAscii(ctx, W, H, t, eff.ascii, eff, hq);
  else if (doc.mode === 'icon') renderIcon(ctx, W, H, t, eff.icon);
  else renderMath(ctx, W, H, t, eff.math);
}
export function svgDoc(W: number, H: number, t: number, doc: Doc) {
  const eff = evaluate(doc, t);
  if (doc.mode === 'ascii') return svgAscii(W, H, t, eff.ascii, eff);
  if (doc.mode === 'icon') return svgIcon(W, H, t, eff.icon, doc.dur, Object.keys(doc.tracks).every((p) => !p.startsWith('icon.')));
  return svgMath(W, H, t, eff.math);
}
export function textDoc(W: number, H: number, t: number, doc: Doc) {
  const eff = evaluate(doc, t);
  return asciiText(W, H, t, eff.ascii, eff);
}
