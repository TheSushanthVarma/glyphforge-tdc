'use client';
import React, { useId } from 'react';
import { useDoc, useClock, setParam, toggleKey, registerParam, paramValue, frameEps, mutate, getDoc } from '@/lib/store';
import { fmt, getPath } from '@/lib/util';

export function Section({ title, note, children, actions }: { title: string; note?: string; children?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <section className="sec">
      <h3>
        <span>{title}</span>
        {note && <small>{note}</small>}
        {actions}
      </h3>
      {children}
    </section>
  );
}

/** Diamond button: add / remove a keyframe for `path` at the playhead. */
export function KeyBtn({ path }: { path: string }) {
  const d = useDoc();
  const keys = d.tracks[path];
  const state = useClock((c) => {
    if (!keys || !keys.length) return 0;
    const eps = frameEps(d);
    return keys.some((k) => Math.abs(k.t - c.t) <= eps) ? 2 : 1;
  });
  const label = state === 2 ? 'Remove keyframe' : 'Add keyframe at playhead';
  return (
    <button type="button" className={`kbtn k${state}`} onClick={() => toggleKey(path)} title={label} aria-label={label}>
      <svg viewBox="0 0 12 12" width="12" height="12" aria-hidden="true">
        <path d="M6 1l5 5-5 5-5-5z" />
      </svg>
    </button>
  );
}

function useAnimatedValue(path: string) {
  const d = useDoc();
  const animated = !!d.tracks[path]?.length;
  const v = useClock((c) => (animated ? paramValue(d, path, c.t) : getPath(d, path)));
  return { v, animated };
}

export function Slider({ path, label, min, max, step, lfo }: { path: string; label: string; min: number; max: number; step: number; lfo?: string }) {
  registerParam(path, { label, min, max, step });
  const id = useId();
  const { v, animated } = useAnimatedValue(path);
  const num = Number(v ?? 0);
  return (
    <div className={`ctl${animated ? ' anim' : ''}`}>
      <div className="ch">
        <KeyBtn path={path} />
        <label htmlFor={id}>{label}</label>
        <output>{fmt(num, step)}</output>
        {lfo && <LfoBtn k={lfo} />}
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={num} onChange={(e) => setParam(path, +e.target.value)} />
      {lfo && <LfoRow k={lfo} label={label} />}
    </div>
  );
}

function LfoBtn({ k }: { k: string }) {
  const d = useDoc();
  const on = !!d.math.lfo[k]?.on;
  return (
    <button type="button" className="lfo" aria-pressed={on} title="Oscillate this value over the loop"
      onClick={() => mutate((x) => { x.math.lfo[k].on = !x.math.lfo[k].on; })}>∿ LFO</button>
  );
}
function LfoRow({ k, label }: { k: string; label: string }) {
  const d = useDoc();
  const L = d.math.lfo[k];
  if (!L?.on) return null;
  return (
    <div className="lforow">
      <Slider path={`math.lfo.${k}.amt`} label={`${label} · LFO depth`} min={0} max={1} step={0.01} />
      <select aria-label="Cycles per loop" value={L.cyc} onChange={(e) => mutate((x) => { x.math.lfo[k].cyc = +e.target.value; })}>
        {[1, 2, 3, 4, 6, 8].map((c) => <option key={c} value={c}>{c}×</option>)}
      </select>
    </div>
  );
}

export function ColorField({ path, label }: { path: string; label: string }) {
  registerParam(path, { label, color: true });
  const { v, animated } = useAnimatedValue(path);
  return (
    <label className={`sw${animated ? ' anim' : ''}`}>
      <span className="swh"><KeyBtn path={path} />{label}</span>
      <input type="color" value={String(v || '#000000')} onChange={(e) => setParam(path, e.target.value)} />
    </label>
  );
}
export function Colors({ items }: { items: [string, string][] }) {
  return <div className="colors">{items.map(([p, l]) => <ColorField key={p} path={p} label={l} />)}</div>;
}

export function Select({ path, label, options, numeric }: { path: string; label: string; options: [string | number, string][]; numeric?: boolean }) {
  const d = useDoc();
  const v = getPath(d, path);
  return (
    <div className="ctl">
      <div className="ch"><span className="kspace" /><label>{label}</label></div>
      <select className="in" value={String(v)} onChange={(e) => mutate((x) => {
        const val = numeric ? +e.target.value : e.target.value;
        const ks = path.split('.'); let o: any = x; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = val;
      })}>
        {options.map(([o, l]) => <option key={String(o)} value={String(o)}>{l}</option>)}
      </select>
    </div>
  );
}

export function Toggle({ path, label }: { path: string; label: string }) {
  const d = useDoc();
  const v = !!getPath(d, path);
  return (
    <label className="tog">
      <span>{label}</span>
      <input type="checkbox" checked={v} onChange={(e) => mutate((x) => {
        const ks = path.split('.'); let o: any = x; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = e.target.checked;
      })} />
    </label>
  );
}

export function Chips({ items, value, onPick }: { items: [string, string][]; value: string; onPick: (k: string) => void }) {
  return (
    <div className="chips">
      {items.map(([k, l]) => <button key={k} type="button" className="chip" aria-pressed={value === k} onClick={() => onPick(k)}>{l}</button>)}
    </div>
  );
}

export const set = (path: string, v: unknown) => mutate((x) => {
  const ks = path.split('.'); let o: any = x; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v;
});
export { getDoc };
