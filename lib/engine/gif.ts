// Dependency-free animated GIF89a encoder: global 256-colour palette + LZW.

function buildPalette(frames: Uint8ClampedArray[]) {
  const cnt = new Uint32Array(32768), sr = new Float64Array(32768), sg = new Float64Array(32768), sb = new Float64Array(32768);
  for (const d of frames)
    for (let i = 0; i < d.length; i += 8) {
      const r = d[i], g = d[i + 1], b = d[i + 2], k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3);
      cnt[k]++; sr[k] += r; sg[k] += g; sb[k] += b;
    }
  const keys: number[] = [];
  for (let k = 0; k < 32768; k++) if (cnt[k]) keys.push(k);
  keys.sort((a, b) => cnt[b] - cnt[a]);
  const pal: number[][] = [], skip: number[][] = [];
  for (const k of keys) {
    if (pal.length >= 256) break;
    const c = [sr[k] / cnt[k], sg[k] / cnt[k], sb[k] / cnt[k]];
    if (pal.every((p) => (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2 + (p[2] - c[2]) ** 2 > 140)) pal.push(c); else skip.push(c);
  }
  for (const c of skip) { if (pal.length >= 256) break; pal.push(c); }
  while (pal.length < 256) pal.push([0, 0, 0]);
  return pal.map((c) => c.map(Math.round));
}
function makeMapper(pal: number[][]) {
  const lut = new Int16Array(32768).fill(-1);
  return (k: number) => {
    let v = lut[k];
    if (v >= 0) return v;
    const r = ((k >> 10) << 3) + 4, g = (((k >> 5) & 31) << 3) + 4, b = ((k & 31) << 3) + 4;
    let best = 0, bd = 1e9;
    for (let i = 0; i < 256; i++) { const p = pal[i], d = (p[0] - r) ** 2 + (p[1] - g) ** 2 + (p[2] - b) ** 2; if (d < bd) { bd = d; best = i; } }
    lut[k] = best;
    return best;
  };
}
const codes = new Uint16Array(1 << 20), gens = new Uint32Array(1 << 20);
let gen = 0;
function lzw(px: Uint8Array) {
  const minC = 8, clear = 256, eoi = 257;
  let size = 9, next = 258;
  gen++;
  const out = new Uint8Array(Math.ceil(px.length * 1.6) + 64);
  let op = 0, cur = 0, bits = 0;
  const emit = (c: number) => { cur |= c << bits; bits += size; while (bits >= 8) { out[op++] = cur & 255; cur >>>= 8; bits -= 8; } };
  emit(clear);
  let pre = px[0];
  for (let i = 1; i < px.length; i++) {
    const k = px[i], key = (pre << 8) | k;
    if (gens[key] === gen) { pre = codes[key]; continue; }
    emit(pre);
    if (next === 4096) { emit(clear); gen++; next = 258; size = 9; }
    else { if (next >= 1 << size) size++; gens[key] = gen; codes[key] = next++; }
    pre = k;
  }
  emit(pre); emit(eoi);
  if (bits > 0) out[op++] = cur & 255;
  const blocks = new Uint8Array(op + Math.ceil(op / 255) + 2);
  let bp = 0;
  blocks[bp++] = minC;
  for (let i = 0; i < op; i += 255) { const n = Math.min(255, op - i); blocks[bp++] = n; blocks.set(out.subarray(i, i + n), bp); bp += n; }
  blocks[bp++] = 0;
  return blocks.subarray(0, bp);
}

export async function encodeGif(opts: {
  w: number; h: number; frames: number; fps: number;
  draw: (ctx: CanvasRenderingContext2D, w: number, h: number, t: number) => void;
  onProgress?: (p: number) => void; cancelled?: () => boolean;
}) {
  const { w, h, frames: n, fps, draw } = opts, delay = Math.round(100 / fps);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true })!;
  const sample: Uint8ClampedArray[] = [];
  for (let i = 0; i < 8; i++) { x.setTransform(1, 0, 0, 1, 0, 0); draw(x, w, h, i / 8); sample.push(x.getImageData(0, 0, w, h).data); }
  const pal = buildPalette(sample), map = makeMapper(pal), parts: Uint8Array[] = [];
  const hd = new Uint8Array(13 + 768 + 19);
  let p = 0;
  [71, 73, 70, 56, 57, 97].forEach((b) => (hd[p++] = b));
  hd[p++] = w & 255; hd[p++] = w >> 8; hd[p++] = h & 255; hd[p++] = h >> 8; hd[p++] = 0xf7; hd[p++] = 0; hd[p++] = 0;
  for (const c3 of pal) { hd[p++] = c3[0]; hd[p++] = c3[1]; hd[p++] = c3[2]; }
  [0x21, 0xff, 11, 78, 69, 84, 83, 67, 65, 80, 69, 50, 46, 48, 3, 1, 0, 0, 0].forEach((b) => (hd[p++] = b));
  parts.push(hd);
  const idx = new Uint8Array(w * h);
  for (let f = 0; f < n; f++) {
    if (opts.cancelled?.()) return null;
    x.setTransform(1, 0, 0, 1, 0, 0);
    draw(x, w, h, f / n);
    const d = x.getImageData(0, 0, w, h).data;
    for (let i = 0, q = 0; i < d.length; i += 4, q++) idx[q] = map(((d[i] >> 3) << 10) | ((d[i + 1] >> 3) << 5) | (d[i + 2] >> 3));
    parts.push(new Uint8Array([0x21, 0xf9, 4, 4, delay & 255, delay >> 8, 0, 0, 0x2c, 0, 0, 0, 0, w & 255, w >> 8, h & 255, h >> 8, 0]));
    parts.push(lzw(idx));
    opts.onProgress?.((f + 1) / n);
    await new Promise((r) => setTimeout(r, 0));
  }
  parts.push(new Uint8Array([0x3b]));
  return new Blob(parts as BlobPart[], { type: 'image/gif' });
}
