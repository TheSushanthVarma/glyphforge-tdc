import { TAU, lerp, mix, hash, f3 } from '../util';
import { compiled } from './expr';

type V = Record<string, number>;
type Out = { L?: Float32Array[]; P?: Float32Array; ps?: number; occ?: boolean };
export type MathMode = {
  n: string; d: string; v: [string, number, number, number, number][]; lfo: Record<string, [number, number]>;
  pre: Record<string, unknown>; gen: (V: V, T: number, N: number, st: any) => Out;
};

export const MODES: Record<string, MathMode> = {
  liss: {
    n: 'Lissajous', d: 'Harmonic figure', v: [['Freq X', 1, 12, 1, 3], ['Freq Y', 1, 12, 1, 4], ['Phase', 0, 6.283, 0.01, 1.57], ['Decay', 0, 0.9, 0.01, 0]],
    lfo: { c: [0.35, 1] }, pre: { copies: 9, copyPhase: 0.012, copyScale: 1, copyRot: 0, c1: '#2F5BFF', c2: '#FFFFFF', bg: '#070709', stroke: 1.3, cm: 'copies', style: 'line' },
    gen(V, T, N) {
      const n = Math.round(900 * N), o = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) { const t = (i / (n - 1)) * TAU, dm = 1 - (V.d * i) / (n - 1); o[i * 2] = Math.sin(V.a * t + V.c + TAU * T) * dm; o[i * 2 + 1] = Math.sin(V.b * t) * dm; }
      return { L: [o] };
    },
  },
  rose: {
    n: 'Rose', d: 'Polar petals', v: [['Petals n', 1, 12, 1, 5], ['Divisor d', 1, 12, 1, 3], ['Wobble', 0, 0.5, 0.01, 0.08], ['Twist', 0, 1, 0.01, 0.25]],
    lfo: { d: [0.3, 1] }, pre: { copies: 5, copyPhase: 0.04, copyScale: 0.86, copyRot: 6, c1: '#8A4BFF', c2: '#F1EDFF', bg: '#120F24', stroke: 1.4, cm: 'copies', style: 'line' },
    gen(V, T, N) {
      const n = Math.round(1400 * N), o = new Float32Array(n * 2), k = V.a / V.b, R = TAU * V.b;
      for (let i = 0; i < n; i++) {
        let th = (i / (n - 1)) * R;
        const r = (Math.cos(k * th + TAU * T) * (1 + V.c * Math.sin(7 * th - TAU * T))) / (1 + V.c);
        th += V.d * r * Math.sin(TAU * T);
        o[i * 2] = r * Math.cos(th); o[i * 2 + 1] = r * Math.sin(th);
      }
      return { L: [o] };
    },
  },
  spiro: {
    n: 'Spirograph', d: 'Hypotrochoid gears', v: [['Gear r', 0.05, 0.95, 0.01, 0.37], ['Pen', 0, 1.5, 0.01, 0.9], ['Turns', 1, 60, 1, 20], ['Wobble', 0, 1, 0.01, 0]],
    lfo: { b: [0.15, 1] }, pre: { copies: 1, c1: '#2F5BFF', c2: '#FFFFFF', bg: '#050507', stroke: 0.8, cm: 'path', style: 'line', blend: true, density: 1.6 },
    gen(V, T, N) {
      const n = Math.round(2400 * N), o = new Float32Array(n * 2), r = V.a, R = 1, p = V.b, nm = R - r + p;
      for (let i = 0; i < n; i++) {
        const th = (i / (n - 1)) * TAU * V.c, q = ((R - r) / r) * th + TAU * T, w = 1 + V.d * 0.15 * Math.sin(5 * th);
        o[i * 2] = (((R - r) * Math.cos(th) + p * Math.cos(q)) / nm) * w; o[i * 2 + 1] = (((R - r) * Math.sin(th) - p * Math.sin(q)) / nm) * w;
      }
      return { L: [o] };
    },
  },
  superf: {
    n: 'Superformula', d: 'Gielis shapes', v: [['Symmetry m', 0, 24, 1, 7], ['n1', 0.1, 10, 0.01, 0.6], ['n2', 0.1, 10, 0.01, 1.8], ['n3', 0.1, 10, 0.01, 1.8]],
    lfo: {}, pre: { copies: 18, copyPhase: 0.02, copyScale: 0.93, copyRot: 4, c1: '#E8501C', c2: '#0B0B0B', bg: '#E6E6E3', stroke: 1.2, cm: 'copies', style: 'line' },
    gen(V, T, N) {
      const n = Math.round(700 * N), o = new Float32Array(n * 2), n1 = V.b * (1 + 0.25 * Math.sin(TAU * T));
      let mx = 0; const rs = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const f = (i / (n - 1)) * TAU, a = Math.pow(Math.abs(Math.cos((V.a * f) / 4)), V.c), b = Math.pow(Math.abs(Math.sin((V.a * f) / 4)), V.d);
        let r = Math.pow(a + b, -1 / n1); if (!isFinite(r)) r = 0; rs[i] = r; if (r > mx) mx = r;
      }
      mx = mx || 1;
      for (let i = 0; i < n; i++) { const f = (i / (n - 1)) * TAU; o[i * 2] = (rs[i] / mx) * Math.cos(f); o[i * 2 + 1] = (rs[i] / mx) * Math.sin(f); }
      return { L: [o] };
    },
  },
  harmo: {
    n: 'Harmonograph', d: 'Damped pendulums', v: [['Freq 1', 1, 6, 0.001, 2], ['Freq 2', 1, 6, 0.001, 3], ['Detune', -0.05, 0.05, 0.0005, 0.012], ['Damping', 0, 0.05, 0.0005, 0.018]],
    lfo: {}, pre: { copies: 1, c1: '#FFFFFF', c2: '#2F5BFF', bg: '#08080A', stroke: 0.7, cm: 'path', style: 'line', density: 1.4 },
    gen(V, T, N) {
      const n = Math.round(3000 * N), o = new Float32Array(n * 2);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * 110, e = Math.exp(-V.d * t);
        o[i * 2] = (Math.sin(V.a * t + TAU * T) + Math.sin(V.b * t + 1.2)) * 0.5 * e;
        o[i * 2 + 1] = (Math.sin((V.a + V.c) * t + 0.8) + Math.sin((V.b - V.c) * t + TAU * T)) * 0.5 * e;
      }
      return { L: [o] };
    },
  },
  cliff: {
    n: 'Strange attractor', d: 'Clifford map', v: [['a', -3, 3, 0.01, -1.4], ['b', -3, 3, 0.01, 1.6], ['c', -3, 3, 0.01, 1], ['d', -3, 3, 0.01, 0.7]],
    lfo: { a: [0.04, 1], c: [0.05, 1] }, pre: { copies: 1, c1: '#7FA0FF', c2: '#FFFFFF', bg: '#04040A', cm: 'path', style: 'dots', dot: 1.1, alpha: 0.45, blend: true },
    gen(V, T, N) {
      const n = Math.round(36000 * N), o = new Float32Array(n * 2);
      let x = 0.1, y = 0.1;
      for (let i = -20; i < n; i++) {
        const nx = Math.sin(V.a * y) + V.c * Math.cos(V.a * x), ny = Math.sin(V.b * x) + V.d * Math.cos(V.b * y);
        x = nx; y = ny;
        if (i >= 0) { o[i * 2] = x / (1 + Math.abs(V.c)); o[i * 2 + 1] = y / (1 + Math.abs(V.d)); }
      }
      return { P: o, ps: 2 };
    },
  },
  phyllo: {
    n: 'Phyllotaxis', d: 'Golden-angle bloom', v: [['Angle °', 130, 145, 0.001, 137.508], ['Seed size', 0.2, 3, 0.01, 1], ['Spread', 0.3, 1, 0.01, 0.5], ['Breath', 0, 1, 0.01, 0.4]],
    lfo: {}, pre: { copies: 1, c1: '#8A4BFF', c2: '#FFFFFF', bg: '#120F24', cm: 'path', style: 'dots', dot: 9, alpha: 1 },
    gen(V, T, N) {
      const n = Math.round(1400 * N), o = new Float32Array(n * 3), ang = ((V.a + V.d * 0.05 * Math.sin(TAU * T)) * Math.PI) / 180;
      for (let i = 0; i < n; i++) { const r = Math.pow((i + 1) / n, V.c), th = (i + 1) * ang; o[i * 3] = r * Math.cos(th); o[i * 3 + 1] = r * Math.sin(th); o[i * 3 + 2] = V.b * (0.35 + 0.65 * r); }
      return { P: o, ps: 3 };
    },
  },
  flow: {
    n: 'Flow field', d: 'Particles on a vector field', v: [['Seeds', 4, 40, 1, 18], ['Steps', 10, 200, 1, 80], ['Frequency', 0.2, 6, 0.01, 2.2], ['Curl', 0, 3, 0.01, 1.2]],
    lfo: {}, pre: { copies: 1, c1: '#2F5BFF', c2: '#9CF0FF', bg: '#050507', cm: 'path', style: 'line', stroke: 1, alpha: 0.85 },
    gen(V, T, N) {
      const a = Math.round(V.a), st = Math.max(2, Math.round(V.b * N)), L: Float32Array[] = [];
      for (let gy = 0; gy < a; gy++) for (let gx = 0; gx < a; gx++) {
        let x = -1.1 + (2.2 * (gx + 0.5)) / a + (hash(gx, gy) - 0.5) * 0.05, y = -1.1 + (2.2 * (gy + 0.5)) / a;
        const o = new Float32Array(st * 2);
        for (let i = 0; i < st; i++) {
          o[i * 2] = x; o[i * 2 + 1] = y;
          const an = (Math.sin(x * V.c + TAU * T) + Math.cos(y * V.c * 1.3 - TAU * T) + Math.sin((x + y) * V.c * 0.5)) * V.d * Math.PI * 0.6;
          x += Math.cos(an) * 0.014; y += Math.sin(an) * 0.014;
        }
        L.push(o);
      }
      return { L };
    },
  },
  inter: {
    n: 'Interference', d: 'Moiré from ring sources', v: [['Sources', 1, 8, 1, 3], ['Rings', 4, 60, 1, 28], ['Spread', 0, 1, 0.01, 0.42], ['Wobble', 0, 1, 0.01, 0.2]],
    lfo: {}, pre: { copies: 1, c1: '#0B0B0B', c2: '#2F5BFF', bg: '#F2F2F0', cm: 'solid', style: 'line', stroke: 1.1 },
    gen(V, T, N) {
      const a = Math.round(V.a), b = Math.round(V.b), L: Float32Array[] = [], m = Math.round(96 * N);
      for (let k = 0; k < a; k++) {
        const ang = (TAU * k) / a + (TAU * T) / a, sx = V.c * Math.cos(ang) * (a > 1 ? 1 : 0), sy = V.c * Math.sin(ang) * (a > 1 ? 1 : 0);
        for (let j = 0; j < b; j++) {
          const r = ((j + T) / b) * 1.7, o = new Float32Array((m + 1) * 2);
          for (let i = 0; i <= m; i++) { const f = (i / m) * TAU, rr = r * (1 + V.d * 0.06 * Math.sin(6 * f + TAU * T)); o[i * 2] = sx + rr * Math.cos(f); o[i * 2 + 1] = sy + rr * Math.sin(f); }
          L.push(o);
        }
      }
      return { L };
    },
  },
  polar: {
    n: 'Polar waves', d: 'Concentric oscillators', v: [['Rings', 3, 60, 1, 26], ['Lobes', 1, 16, 1, 6], ['Amplitude', 0, 1, 0.01, 0.35], ['Twist', 0, 2, 0.01, 0.6]],
    lfo: {}, pre: { copies: 1, c1: '#E8501C', c2: '#FFFFFF', bg: '#0B0B0B', cm: 'path', style: 'line', stroke: 1.2 },
    gen(V, T, N) {
      const a = Math.round(V.a), L: Float32Array[] = [], m = Math.round(220 * N);
      for (let i = 0; i < a; i++) {
        const r0 = (i + 1) / a, o = new Float32Array((m + 1) * 2);
        for (let k = 0; k <= m; k++) { const f = (k / m) * TAU, r = r0 + (V.c / a) * 3 * Math.sin(V.b * f + TAU * T + i * V.d); o[k * 2] = r * Math.cos(f); o[k * 2 + 1] = r * Math.sin(f); }
        L.push(o);
      }
      return { L };
    },
  },
  knot: {
    n: 'Torus knot', d: 'Rotating 3D vector', v: [['p winds', 1, 9, 1, 2], ['q loops', 1, 13, 1, 5], ['Ripple', 0, 1, 0.01, 0.25], ['Tilt', 0, 1.57, 0.01, 0.6]],
    lfo: {}, pre: { copies: 3, copyPhase: 0.01, copyScale: 1, c1: '#2F5BFF', c2: '#FFFFFF', bg: '#050507', cm: 'path', style: 'line', stroke: 1.4, glow: 6, blend: true },
    gen(V, T, N) {
      const n = Math.round(1600 * N), o = new Float32Array(n * 2), ry = TAU * T, cy = Math.cos(ry), sy = Math.sin(ry), cx = Math.cos(V.d), sx = Math.sin(V.d);
      for (let i = 0; i < n; i++) {
        const t = (i / (n - 1)) * TAU, r = Math.cos(V.b * t) + 2 + V.c * 0.3 * Math.sin(V.b * 3 * t);
        const x = r * Math.cos(V.a * t), y = r * Math.sin(V.a * t), z = -Math.sin(V.b * t);
        const x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y1 = y * cx - z1 * sx, z2 = y * sx + z1 * cx, f = 4 / (4 + z2 * 0.7);
        o[i * 2] = (x1 * f) / 3.3; o[i * 2 + 1] = (y1 * f) / 3.3;
      }
      return { L: [o] };
    },
  },
  terrain: {
    n: 'Ridge terrain', d: 'Occluded line landscape', v: [['Lines', 10, 80, 1, 40], ['Frequency', 0.5, 6, 0.01, 2.2], ['Height', 0, 1, 0.01, 0.5], ['Perspective', 0, 1, 0.01, 0.6]],
    lfo: {}, pre: { copies: 1, c1: '#EDEDED', c2: '#2F5BFF', bg: '#0B0B0C', cm: 'solid', style: 'line', stroke: 1.2 },
    gen(V, T, N) {
      const a = Math.round(V.a), L: Float32Array[] = [], m = Math.round(160 * N);
      for (let i = 0; i < a; i++) {
        const z = i / (a - 1), yb = lerp(-0.7, 0.85, z), sc = 1 - V.d * 0.45 * (1 - z), o = new Float32Array((m + 1) * 2);
        for (let k = 0; k <= m; k++) {
          const x = -1.35 + (2.7 * k) / m, env = Math.exp(-x * x * 1.6);
          const h = V.c * env * (0.55 * Math.sin(x * V.b * 3 + i * 0.45 + TAU * T) + 0.35 * Math.sin(x * V.b * 7.3 - i * 0.8 - TAU * T * 2) + 0.35);
          o[k * 2] = x * sc; o[k * 2 + 1] = yb - Math.max(0, h) * (0.5 + 0.5 * z);
        }
        L.push(o);
      }
      return { L, occ: true };
    },
  },
  custom: {
    n: 'Custom equation', d: 'Write x(t), y(t)', v: [['a', -6, 6, 0.01, 3], ['b', -6, 6, 0.01, 2], ['c', -6, 6, 0.01, 1], ['d', -6, 6, 0.01, 0.5]],
    lfo: { d: [0.3, 1] }, pre: { copies: 4, copyPhase: 0.02, copyScale: 0.96, c1: '#FFFFFF', c2: '#2F5BFF', bg: '#0B0B0C', cm: 'copies', style: 'line', stroke: 1.2 },
    gen(V, T, N, st) {
      const fx = compiled(st.xe).f, fy = compiled(st.ye).f;
      if (!fx || !fy) return { L: [] };
      const n = Math.round(1500 * N), o = new Float32Array(n * 2), env: Record<string, number> = { a: V.a, b: V.b, c: V.c, d: V.d, T, t: 0 };
      const R = TAU * (+st.turns || 1);
      for (let i = 0; i < n; i++) { env.t = (i / (n - 1)) * R; o[i * 2] = fx(env); o[i * 2 + 1] = fy(env); }
      return { L: [o] };
    },
  },
};

export const MDEF = {
  copies: 1, copyPhase: 0, copyScale: 1, copyRot: 0, sym: 1, mirror: false, density: 1, stroke: 1.2, alpha: 1, style: 'line', dot: 2,
  blend: false, glow: 0, cm: 'solid', c1: '#FFFFFF', c2: '#2F5BFF', bg: '#0B0B0C', zoom: 1, rot: 0, spin: 0, cyc: 1, panX: 0, panY: 0,
};

export function modeState(key: string, keep: any = {}) {
  const md = MODES[key];
  const st: any = { ...MDEF, ...md.pre, mode: key, v: {}, lfo: {}, xe: keep.xe ?? 'sin(a*t + 2*pi*T) * cos(d*t)', ye: keep.ye ?? 'sin(b*t) * cos(c*t*0.5)', turns: keep.turns ?? 1 };
  'abcd'.split('').forEach((k, i) => {
    st.v[k] = md.v[i][4];
    const l = md.lfo[k];
    st.lfo[k] = { on: !!l, amt: l ? l[0] : 0.2, cyc: l ? l[1] : 1 };
  });
  ['zoom', 'rot', 'copyPhase'].forEach((k) => (st.lfo[k] = { on: false, amt: 0.2, cyc: 1 }));
  return st;
}

function effVars(st: any, t: number): V {
  const md = MODES[st.mode], V: V = {};
  const lf = (k: string, base: number, range: number) => { const l = st.lfo[k]; return l && l.on ? base + l.amt * range * 0.5 * Math.sin(TAU * l.cyc * t) : base; };
  'abcd'.split('').forEach((k, i) => { const m = md.v[i]; V[k] = lf(k, st.v[k], m[2] - m[1]); });
  V.zoom = lf('zoom', st.zoom, 2); V.rot = lf('rot', st.rot, 360); V.copyPhase = lf('copyPhase', st.copyPhase, 1);
  return V;
}
function mathColor(st: any, k: number, s: number, t: number) {
  if (st.cm === 'copies') return st.copies > 1 ? mix(st.c1, st.c2, k / (st.copies - 1)) : st.c1;
  if (st.cm === 'hue') return `hsl(${((k / Math.max(1, st.copies) + s / Math.max(1, st.sym)) * 360 + t * 360) % 360} 85% 62%)`;
  return st.c1;
}
function passes(st: any, t: number, cb: (out: Out, m: number[], k: number, s: number, sk: number) => void) {
  const md = MODES[st.mode], V = effVars(st, t), copies = Math.max(1, Math.round(st.copies)), sym = Math.max(1, Math.round(st.sym));
  for (let k = 0; k < copies; k++) {
    const out = md.gen(V, t * Math.round(st.cyc) + k * V.copyPhase, st.density, st), sk = Math.pow(st.copyScale, k);
    const rk = ((V.rot + Math.round(st.spin) * 360 * t + st.copyRot * k) * Math.PI) / 180;
    for (let s = 0; s < sym; s++) for (let m = 0; m < (st.mirror ? 2 : 1); m++) {
      const a = rk + (TAU * s) / sym, c = Math.cos(a) * sk, sn = Math.sin(a) * sk, fx = m ? -1 : 1;
      cb(out, [c * fx, sn * fx, -sn, c], k, s, sk);
    }
  }
  return V;
}

export function renderMath(ctx: CanvasRenderingContext2D, W: number, H: number, t: number, st: any) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = st.bg;
  ctx.fillRect(0, 0, W, H);
  const mn = Math.min(W, H), px = mn / 1080, base = mn * 0.42 * effVars(st, t).zoom, cxp = W / 2 + st.panX * mn * 0.5, cyp = H / 2 + st.panY * mn * 0.5;
  if (st.blend) ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = st.alpha;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  passes(st, t, (out, m, k, s, sk) => {
    ctx.setTransform(m[0] * base, m[1] * base, m[2] * base, m[3] * base, cxp, cyp);
    const unit = base * sk, col = mathColor(st, k, s, t);
    if (st.glow > 0) { ctx.shadowBlur = st.glow * px * 2; ctx.shadowColor = st.cm === 'path' ? st.c2 : col; }
    if (out.L && st.style !== 'dots') {
      ctx.lineWidth = (st.stroke * px) / unit;
      if (out.occ) {
        out.L.forEach((l, li) => {
          ctx.beginPath();
          for (let i = 0; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]);
          ctx.lineTo(l[l.length - 2], 3); ctx.lineTo(l[0], 3); ctx.closePath();
          ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = st.bg; ctx.fill();
          if (st.blend) ctx.globalCompositeOperation = 'lighter';
          ctx.beginPath();
          for (let i = 0; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]);
          ctx.strokeStyle = st.cm === 'path' ? mix(st.c1, st.c2, li / out.L.length) : col;
          ctx.stroke();
        });
      } else if (st.cm === 'path') {
        const nl = out.L.length;
        out.L.forEach((l, li) => {
          const np = l.length / 2, ch = Math.max(2, Math.ceil(np / 28));
          for (let c0 = 0; c0 < np - 1; c0 += ch) {
            ctx.beginPath();
            const e = Math.min(np - 1, c0 + ch);
            for (let i = c0; i <= e; i++) ctx.lineTo(l[i * 2], l[i * 2 + 1]);
            ctx.strokeStyle = mix(st.c1, st.c2, nl > 1 ? (li / (nl - 1)) * 0.6 + (c0 / np) * 0.4 : c0 / np);
            ctx.stroke();
          }
        });
      } else {
        ctx.beginPath();
        for (const l of out.L) { ctx.moveTo(l[0], l[1]); for (let i = 2; i < l.length; i += 2) ctx.lineTo(l[i], l[i + 1]); }
        ctx.strokeStyle = col;
        ctx.stroke();
      }
    }
    const ds = (st.dot * px) / unit;
    const draw = (arr: Float32Array, ps: number) => {
      const n = arr.length / ps;
      if (st.cm === 'path') {
        const B = 8;
        for (let b = 0; b < B; b++) {
          ctx.beginPath();
          for (let i = Math.floor((n * b) / B); i < Math.floor((n * (b + 1)) / B); i++) { const z = ps === 3 ? arr[i * 3 + 2] : 1, r = ds * z; ctx.rect(arr[i * ps] - r / 2, arr[i * ps + 1] - r / 2, r, r); }
          ctx.fillStyle = mix(st.c1, st.c2, b / (B - 1));
          ctx.fill();
        }
      } else {
        ctx.beginPath();
        for (let i = 0; i < n; i++) { const z = ps === 3 ? arr[i * 3 + 2] : 1, r = ds * z; ctx.rect(arr[i * ps] - r / 2, arr[i * ps + 1] - r / 2, r, r); }
        ctx.fillStyle = col;
        ctx.fill();
      }
    };
    if (out.P) draw(out.P, out.ps);
    else if (st.style !== 'line' && out.L) for (const l of out.L) {
      const step = Math.max(1, Math.round(l.length / 2 / 160)), a = new Float32Array(Math.ceil(l.length / 2 / step) * 2);
      let q = 0;
      for (let i = 0; i < l.length / 2; i += step) { a[q++] = l[i * 2]; a[q++] = l[i * 2 + 1]; }
      draw(a, 2);
    }
    ctx.shadowBlur = 0;
  });
  ctx.restore();
}

export function svgMath(W: number, H: number, t: number, st: any) {
  const mn = Math.min(W, H), px = mn / 1080, base = mn * 0.42 * effVars(st, t).zoom, cxp = W / 2 + st.panX * mn * 0.5, cyp = H / 2 + st.panY * mn * 0.5;
  let o = '';
  passes(st, t, (out, m, k, s, sk) => {
    const col = mathColor(st, k, s, t), unit = base * sk;
    o += `<g transform="matrix(${[m[0] * base, m[1] * base, m[2] * base, m[3] * base, cxp, cyp].map(f3).join(' ')})">`;
    if (out.L && st.style !== 'dots') out.L.forEach((l, li) => {
      let d = 'M';
      for (let i = 0; i < l.length; i += 2) d += (i ? ' L' : '') + f3(l[i]) + ' ' + f3(l[i + 1]);
      const c = st.cm === 'path' ? mix(st.c1, st.c2, out.L.length > 1 ? li / (out.L.length - 1) : 0.5) : col;
      if (out.occ) o += `<path d="${d} L${f3(l[l.length - 2])} 3 L${f3(l[0])} 3 Z" fill="${st.bg}"/>`;
      o += `<path d="${d}" fill="none" stroke="${c}" stroke-width="${f3(st.stroke * px)}" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/>`;
    });
    if (out.P) {
      const ds = (st.dot * px) / unit, n = out.P.length / out.ps, stp = Math.max(1, Math.ceil(n / 25000));
      o += `<g fill="${st.cm === 'path' ? st.c1 : col}">`;
      for (let i = 0; i < n; i += stp) { const z = out.ps === 3 ? out.P[i * 3 + 2] : 1, r = ds * z; o += `<rect x="${f3(out.P[i * out.ps] - r / 2)}" y="${f3(out.P[i * out.ps + 1] - r / 2)}" width="${f3(r)}" height="${f3(r)}"/>`; }
      o += '</g>';
    }
    o += '</g>';
  });
  const glow = st.glow > 0 ? `<defs><filter id="gl" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${f3(st.glow * px)}" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` : '';
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${glow}<rect width="100%" height="100%" fill="${st.bg}"/><g opacity="${st.alpha}"${st.glow > 0 ? ' filter="url(#gl)"' : ''}${st.blend ? ' style="mix-blend-mode:screen"' : ''}>${o}</g></svg>`;
}
