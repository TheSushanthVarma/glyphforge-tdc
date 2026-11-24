'use client';
import { useSyncExternalStore } from 'react';
import { defaultAscii, defaultIcon, SIZES } from './engine/presets';
import { modeState } from './engine/math';
import { Tracks, Ease, upsertKey, valueAt } from './keyframes';
import { getPath, setPath } from './util';

export type Mode = 'ascii' | 'icon' | 'math';
export type Doc = {
  mode: Mode; size: string; dur: number; fps: number; gifw: number; scale: number; autoKey: boolean; snap: boolean;
  ascii: any; icon: any; math: any; tracks: Tracks; sel: { path: string; i: number } | null; ease: Ease;
  /** id of the creation this document was opened from / last saved as */
  openId: string | null;
};

export const initialDoc = (): Doc => ({
  mode: 'ascii', size: 'sq', dur: 4, fps: 24, gifw: 540, scale: 1, autoKey: false, snap: true,
  ascii: defaultAscii(), icon: defaultIcon(), math: modeState('liss'), tracks: {}, sel: null, ease: 'smooth', openId: null,
});

/* ---------------- document store ---------------- */
let doc: Doc = initialDoc();
let ver = 0;
const subs = new Set<() => void>();
const LS = 'glyphforge.next.v2';

export const getDoc = () => doc;
export const getVer = () => ver;
export function mutate(fn: (d: Doc) => void, save = true) {
  fn(doc);
  ver++;
  subs.forEach((f) => f());
  if (save) persist();
}
export function replaceDoc(d: Doc) {
  doc = { ...initialDoc(), ...d };
  ver++;
  subs.forEach((f) => f());
  persist();
}
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export function useDoc() {
  useSyncExternalStore(subscribe, getVer, getVer);
  return doc;
}

let pT: any;
function persist() {
  clearTimeout(pT);
  pT = setTimeout(() => {
    try {
      const a = { ...doc.ascii, src: doc.ascii.src === 'upload' ? 'terrain' : doc.ascii.src };
      localStorage.setItem(LS, JSON.stringify({ ...doc, ascii: a, sel: null }));
    } catch { /* storage unavailable */ }
  }, 400);
}
export function loadPersisted() {
  try {
    const raw = localStorage.getItem(LS);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d && d.ascii && Array.isArray(d.ascii.glyphs) && d.math && d.icon) {
      const base = initialDoc();
      doc = { ...base, ...d, ascii: { ...base.ascii, ...d.ascii }, icon: { ...base.icon, ...d.icon }, math: { ...base.math, ...d.math }, tracks: d.tracks || {} };
      if (!SIZES[doc.size]) doc.size = 'sq';
      ver++;
    }
  } catch { /* ignore */ }
}

/* ---------------- clock (fast, separate from doc) ---------------- */
export const clock = { t: 0, playing: true };
const csubs = new Set<() => void>();
const csub = (f: () => void) => { csubs.add(f); return () => csubs.delete(f); };
export function setT(t: number) { clock.t = Math.min(1, Math.max(0, t)); csubs.forEach((f) => f()); }
export function setPlaying(p: boolean) { clock.playing = p; csubs.forEach((f) => f()); }
export function useClock<T>(sel: (c: typeof clock) => T): T {
  return useSyncExternalStore(csub, () => sel(clock), () => sel(clock));
}

/* ---------------- parameter registry (labels / ranges for the timeline) ---------------- */
export type ParamMeta = { label: string; min?: number; max?: number; step?: number; color?: boolean; group?: string };
export const registry: Record<string, ParamMeta> = {};
export const registerParam = (path: string, m: ParamMeta) => { registry[path] = { ...registry[path], ...m }; };

/* ---------------- keyframe helpers ---------------- */
export const frameEps = (d: Doc) => 0.5 / Math.max(1, d.dur * d.fps);
export const snapT = (d: Doc, t: number) => (d.snap ? Math.round(t * d.dur * d.fps) / (d.dur * d.fps) : t);
export const hasTrack = (d: Doc, path: string) => !!d.tracks[path]?.length;
export function paramValue(d: Doc, path: string, t = clock.t) {
  return hasTrack(d, path) ? valueAt(d.tracks[path], t) : getPath(d, path);
}

/** Writes a parameter. If it is animated (or auto-key is on) the value is recorded as a keyframe at the playhead. */
export function setParam(path: string, v: number | string) {
  mutate((d) => {
    if (hasTrack(d, path) || d.autoKey) {
      if (!hasTrack(d, path) && d.autoKey) {
        // first auto key: also pin the previous value at t=0 so the change animates in
        const prev = getPath(d, path);
        if (clock.t > frameEps(d) && prev !== undefined) upsertKey(d.tracks, path, 0, prev, frameEps(d), d.ease);
      }
      upsertKey(d.tracks, path, snapT(d, clock.t), v, frameEps(d), d.ease);
    }
    setPath(d, path, v);
  });
}
export function toggleKey(path: string) {
  mutate((d) => {
    const t = snapT(d, clock.t), eps = frameEps(d), keys = d.tracks[path];
    const cur = paramValue(d, path);
    const idx = keys ? keys.findIndex((k) => Math.abs(k.t - t) <= eps) : -1;
    if (keys && idx >= 0) {
      keys.splice(idx, 1);
      if (!keys.length) { delete d.tracks[path]; setPath(d, path, cur); }
      d.sel = null;
    } else {
      upsertKey(d.tracks, path, t, cur as any, eps, d.ease);
      const i = d.tracks[path].findIndex((k) => Math.abs(k.t - t) <= eps);
      d.sel = { path, i };
    }
  });
}
export function removeTrack(path: string) {
  mutate((d) => {
    const v = paramValue(d, path);
    delete d.tracks[path];
    if (v !== undefined) setPath(d, path, v);
    if (d.sel?.path === path) d.sel = null;
  });
}
export const keyTimes = (d: Doc, mode?: Mode) => {
  const s = new Set<number>();
  for (const p in d.tracks) if (!mode || p.startsWith(mode + '.')) d.tracks[p].forEach((k) => s.add(k.t));
  return [...s].sort((a, b) => a - b);
};

/* ---------------- reset ---------------- */
/** Restores one studio to its default settings and removes that studio's keyframes. */
export function resetStudio(mode: Mode) {
  mutate((d) => {
    if (mode === 'ascii') { const keep = { src: d.ascii.src, text: d.ascii.text }; d.ascii = { ...defaultAscii(), ...keep }; }
    else if (mode === 'icon') d.icon = defaultIcon();
    else d.math = modeState(d.math.mode, { xe: undefined, ye: undefined, turns: undefined });
    for (const p of Object.keys(d.tracks)) if (p.startsWith(mode + '.')) delete d.tracks[p];
    d.sel = null;
  });
}
/** Everything back to first-launch defaults (Creations are untouched). */
export function resetAll() {
  replaceDoc(initialDoc());
}
