import { TAU, mk } from '../util';

export const src = { canvas: null as HTMLCanvasElement | null, upload: null as HTMLCanvasElement | null, ver: 0 };

/** Builds the procedural (or uploaded) source image that the ASCII engine samples. */
export function genSource(kind: string, text: string, w0: number, h0: number) {
  if (kind === 'upload' && src.upload) { src.canvas = src.upload; src.ver++; return; }
  if (kind === 'math' || kind === 'icon') { src.ver++; return; }
  const w = 900, h = Math.round((900 * h0) / w0);
  const c = mk(w, h), x = c.getContext('2d')!;
  x.fillStyle = '#000';
  x.fillRect(0, 0, w, h);
  if (kind === 'terrain' || kind === 'upload') {
    let g = x.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#06081a'); g.addColorStop(0.55, '#3a3f9a'); g.addColorStop(0.75, '#f08a5d');
    x.fillStyle = g; x.fillRect(0, 0, w, h);
    const rg = x.createRadialGradient(w * 0.66, h * 0.5, 0, w * 0.66, h * 0.5, h * 0.22);
    rg.addColorStop(0, '#fff6d8'); rg.addColorStop(0.35, '#ffc58a'); rg.addColorStop(1, 'rgba(255,160,100,0)');
    x.fillStyle = rg; x.fillRect(0, 0, w, h);
    ([['#9aa3ff', 0.5, 0.18, 1], ['#4a3f9f', 0.62, 0.22, 2], ['#1b1640', 0.74, 0.2, 3], ['#07060f', 0.88, 0.16, 4]] as [string, number, number, number][]).forEach(([col, yb, amp, s]) => {
      x.beginPath(); x.moveTo(0, h);
      for (let i = 0; i <= w; i += 4) {
        const u = i / w;
        x.lineTo(i, yb * h - amp * h * (0.5 * Math.abs(Math.sin(u * 3.1 + s * 1.7)) + 0.3 * Math.sin(u * 9 + s) + 0.2 * Math.sin(u * 23 + s * 3)));
      }
      x.lineTo(w, h); x.closePath();
      const lg = x.createLinearGradient(0, (yb - amp) * h, 0, h);
      lg.addColorStop(0, col); lg.addColorStop(1, '#000');
      x.fillStyle = lg; x.fill();
    });
  } else if (kind === 'orb') {
    const r = Math.min(w, h) * 0.32, cx = w * 0.5, cy = h * 0.5;
    const ring = (a0: number, a1: number, col: string) => { x.save(); x.translate(cx, cy); x.rotate(-0.35); x.strokeStyle = col; x.lineWidth = r * 0.09; x.beginPath(); x.ellipse(0, 0, r * 1.6, r * 0.42, 0, a0, a1); x.stroke(); x.restore(); };
    ring(Math.PI, TAU, 'rgba(140,170,255,.85)');
    const g = x.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.05, cx, cy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, '#8aa4ff'); g.addColorStop(0.8, '#2a2a8a'); g.addColorStop(1, '#080818');
    x.fillStyle = g; x.beginPath(); x.arc(cx, cy, r, 0, TAU); x.fill();
    ring(0, Math.PI, 'rgba(190,210,255,.95)');
  } else if (kind === 'waves') {
    for (let b = 0; b < 4; b++) {
      x.beginPath();
      const off = b * 0.18;
      for (let i = 0; i <= w; i += 3) { const u = i / w, y = h * (0.25 + off + 0.22 * Math.sin(u * 3.4 + b * 1.3) + 0.06 * Math.sin(u * 11 + b)); if (i) x.lineTo(i, y); else x.moveTo(i, y); }
      const lg = x.createLinearGradient(0, 0, w, 0);
      lg.addColorStop(0, ['#2de2e6', '#7b5cff', '#ff5ca8', '#ffffff'][b]); lg.addColorStop(1, ['#1b3aff', '#ff5ca8', '#ffd166', '#6a7cff'][b]);
      x.strokeStyle = lg; x.lineWidth = h * (0.12 - b * 0.018); x.lineCap = 'round'; x.stroke();
    }
  } else if (kind === 'text') {
    const t = (text || ' ').slice(0, 40);
    let fs = h * 0.6;
    x.font = `800 ${fs}px "Inter Tight", sans-serif`;
    fs = Math.min(fs, (fs * w * 0.88) / Math.max(1, x.measureText(t).width));
    x.font = `800 ${fs}px "Inter Tight", sans-serif`;
    x.textAlign = 'center'; x.textBaseline = 'middle';
    const g = x.createLinearGradient(0, h * 0.3, w, h * 0.7);
    g.addColorStop(0, '#ffd166'); g.addColorStop(0.5, '#ff5ca8'); g.addColorStop(1, '#7b5cff');
    x.fillStyle = g; x.fillText(t, w / 2, h / 2);
  }
  src.canvas = c;
  src.ver++;
}

export function loadImageFile(f: File): Promise<void> {
  return new Promise((res, rej) => {
    if (!f || !/^image\//.test(f.type)) return rej(new Error('Not an image'));
    const url = URL.createObjectURL(f), im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = mk(im.width * k, im.height * k);
      c.getContext('2d')!.drawImage(im, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      src.upload = c;
      res();
    };
    im.onerror = () => rej(new Error('Could not read that image'));
    im.src = url;
  });
}

/** Restores an uploaded source image saved inside a creation. */
export function loadDataURL(url: string): Promise<void> {
  return new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => { const c = mk(im.width, im.height); c.getContext('2d')!.drawImage(im, 0, 0); src.upload = c; res(); };
    im.onerror = () => rej(new Error('Could not restore the source image'));
    im.src = url;
  });
}
