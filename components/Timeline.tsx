'use client';
import React, { useRef, useState } from 'react';
import { useDoc, useClock, clock, setT, setPlaying, mutate, registry, keyTimes, removeTrack, snapT, getDoc } from '@/lib/store';
import { valueAt, EASE_LABELS, Key, EASES } from '@/lib/keyframes';
import { clamp } from '@/lib/util';

const PAD = 14;

function TimeReadout() {
  const d = useDoc();
  const t = useClock((c) => Math.round(c.t * d.dur * d.fps));
  const total = Math.round(d.dur * d.fps);
  return <span className="tc">{((t / d.fps) || 0).toFixed(2)}s <i>/ {d.dur.toFixed(2)}s</i> <b>f{t}</b><i>/{total}</i></span>;
}
function PlayBtn() {
  const playing = useClock((c) => c.playing);
  return (
    <button type="button" className="tb play" onClick={() => setPlaying(!clock.playing)} aria-label={playing ? 'Pause' : 'Play'} title="Play / pause (Space)">
      {playing ? <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><rect x="2" y="1" width="3.5" height="12" /><rect x="8.5" y="1" width="3.5" height="12" /></svg>
        : <svg width="13" height="13" viewBox="0 0 14 14" fill="currentColor"><path d="M3 1.5v11l9.5-5.5z" /></svg>}
    </button>
  );
}
function Playhead() {
  const t = useClock((c) => c.t);
  return <div className="playhead" style={{ left: `calc(var(--lw) + ${PAD}px + (100% - var(--lw) - ${2 * PAD}px) * ${t})` }}><i /></div>;
}

export function jumpKey(dir: 1 | -1) {
  const d = getDoc(), ts = keyTimes(d, d.mode), t = clock.t, e = 1e-4;
  const n = dir > 0 ? ts.find((x) => x > t + e) : [...ts].reverse().find((x) => x < t - e);
  if (n !== undefined) { setPlaying(false); setT(n); }
}
export function stepFrame(dir: number) {
  const d = getDoc(), f = 1 / (d.dur * d.fps);
  setPlaying(false);
  setT(clamp(snapT({ ...d, snap: true }, clock.t) + dir * f));
}

function Ruler() {
  const d = useDoc();
  const ref = useRef<HTMLDivElement>(null);
  const major = d.dur > 16 ? 4 : d.dur > 8 ? 2 : 1, minor = major / 4, ticks: React.ReactNode[] = [];
  for (let s = 0; s <= d.dur + 1e-6; s += minor) {
    const isMajor = Math.abs(s / major - Math.round(s / major)) < 1e-6;
    ticks.push(<div key={s} className={`tick${isMajor ? ' M' : ''}`} style={{ left: `${(s / d.dur) * 100}%` }}>{isMajor && <span>{s.toFixed(0)}s</span>}</div>);
  }
  const seek = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    setPlaying(false);
    setT(snapT(getDoc(), clamp((e.clientX - r.left) / r.width)));
  };
  return (
    <div className="ruler" onPointerDown={(e) => { (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); seek(e); }} onPointerMove={(e) => { if (e.buttons & 1) seek(e); }}>
      <div ref={ref}>{ticks}</div>
    </div>
  );
}

function Spark({ keys, path }: { keys: Key[]; path: string }) {
  const m = registry[path] || { label: path };
  if (m.color || typeof keys[0].v === 'string') {
    const stops = Array.from({ length: 24 }, (_, i) => `${valueAt(keys, i / 23)} ${(i / 23) * 100}%`).join(',');
    return <div className="cspark" style={{ background: `linear-gradient(90deg,${stops})` }} />;
  }
  const nums = keys.map((k) => Number(k.v));
  let lo = Math.min(...nums), hi = Math.max(...nums);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const N = 120;
  let dpath = '';
  for (let i = 0; i <= N; i++) {
    const t = i / N, v = Number(valueAt(keys, t));
    dpath += `${i ? 'L' : 'M'}${(t * 1000).toFixed(1)} ${(26 - ((v - lo) / (hi - lo)) * 22).toFixed(2)}`;
  }
  return <svg className="spark" viewBox="0 0 1000 30" preserveAspectRatio="none" aria-hidden="true"><path d={dpath} /></svg>;
}

function Lane({ path, keys }: { path: string; keys: Key[] }) {
  const d = useDoc();
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Key | null>(null);
  const tAt = (x: number) => { const r = ref.current!.getBoundingClientRect(); return snapT(getDoc(), clamp((x - r.left) / r.width)); };
  return (
    <div className="lane" ref={ref}
      onPointerDown={(e) => { if ((e.target as HTMLElement).closest('.kd')) return; setPlaying(false); setT(tAt(e.clientX)); }}>
      <Spark keys={keys} path={path} />
      {keys.map((k, i) => {
        const sel = d.sel?.path === path && d.sel.i === i;
        return (
          <button key={i} type="button" className={`kd${sel ? ' sel' : ''} e-${k.e}`} style={{ left: `${k.t * 100}%` }}
            title={`${(k.t * d.dur).toFixed(2)}s · ${typeof k.v === 'number' ? k.v.toFixed(3) : k.v} · ${k.e}`}
            onPointerDown={(e) => {
              e.stopPropagation();
              (e.target as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = k;
              mutate((x) => { x.sel = { path, i }; }, false);
            }}
            onPointerMove={(e) => {
              if (!drag.current || !(e.buttons & 1)) return;
              const nt = tAt(e.clientX), key = drag.current;
              if (Math.abs(nt - key.t) < 1e-9) return;
              mutate((x) => {
                const arr = x.tracks[path];
                const obj = arr.find((q) => q === key);
                if (!obj) return;
                obj.t = nt;
                arr.sort((a, b) => a.t - b.t);
                x.sel = { path, i: arr.indexOf(obj) };
              });
            }}
            onPointerUp={() => { drag.current = null; }}
            onDoubleClick={() => { setPlaying(false); setT(k.t); }}
            aria-label={`Keyframe at ${(k.t * d.dur).toFixed(2)} seconds`}
          />
        );
      })}
    </div>
  );
}

function KeyEditor() {
  const d = useDoc();
  const s = d.sel, k = s && d.tracks[s.path]?.[s.i];
  if (!s || !k) return <span className="hint">Select a keyframe to edit its timing, value and easing.</span>;
  const m = registry[s.path] || { label: s.path };
  const upd = (fn: (k: Key, arr: Key[]) => void) => mutate((x) => { const arr = x.tracks[s.path]; const kk = arr?.[s.i]; if (kk) { fn(kk, arr); arr.sort((a, b) => a.t - b.t); x.sel = { path: s.path, i: arr.indexOf(kk) }; } });
  return (
    <div className="kedit">
      <b>{m.label}</b>
      <label>at <input type="number" step={1 / d.fps} min={0} max={d.dur} value={+(k.t * d.dur).toFixed(3)} onChange={(e) => upd((kk) => { kk.t = clamp(+e.target.value / d.dur); })} />s</label>
      {typeof k.v === 'string'
        ? <input type="color" value={k.v} onChange={(e) => upd((kk) => { kk.v = e.target.value; })} aria-label="Key colour" />
        : <label>value <input type="number" step={m.step || 0.01} value={+Number(k.v).toFixed(4)} onChange={(e) => upd((kk) => { kk.v = +e.target.value; })} /></label>}
      <label>ease <select value={k.e} onChange={(e) => upd((kk) => { kk.e = e.target.value as any; })}>{EASE_LABELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
      <EaseGlyph e={k.e} />
      <button type="button" className="tb sm" onClick={() => { setPlaying(false); setT(k.t); }}>Go to</button>
      <button type="button" className="tb sm danger" onClick={() => mutate((x) => { const arr = x.tracks[s.path]; arr.splice(s.i, 1); if (!arr.length) removeTrackSilently(x, s.path); x.sel = null; })}>Delete key</button>
    </div>
  );
}
function removeTrackSilently(x: any, path: string) { delete x.tracks[path]; }
function EaseGlyph({ e }: { e: string }) {
  const f = (EASES as any)[e];
  let p = '';
  for (let i = 0; i <= 30; i++) { const t = i / 30, v = e === 'hold' ? 0 : f(t); p += `${i ? 'L' : 'M'}${(2 + t * 30).toFixed(1)} ${(26 - v * 20).toFixed(1)}`; }
  if (e === 'hold') p += ' L32 6';
  return <svg className="eg" viewBox="0 0 34 30" aria-hidden="true"><path d={p} /></svg>;
}

export default function Timeline() {
  const d = useDoc();
  const [confirm, setConfirm] = useState(false);
  const paths = Object.keys(d.tracks).filter((p) => p.startsWith(d.mode + '.') && d.tracks[p]?.length);
  const otherCount = Object.keys(d.tracks).length - paths.length;
  return (
    <div className="timeline">
      <div className="tlbar">
        <div className="tgrp">
          <button type="button" className="tb" title="Go to start" aria-label="Go to start" onClick={() => { setPlaying(false); setT(0); }}>⏮</button>
          <button type="button" className="tb" title="Previous keyframe (,)" aria-label="Previous keyframe" onClick={() => jumpKey(-1)}>◆◂</button>
          <PlayBtn />
          <button type="button" className="tb" title="Next keyframe (.)" aria-label="Next keyframe" onClick={() => jumpKey(1)}>▸◆</button>
          <button type="button" className="tb" title="Go to end" aria-label="Go to end" onClick={() => { setPlaying(false); setT(1); }}>⏭</button>
          <TimeReadout />
        </div>
        <div className="tgrp">
          <label>Length <input type="number" min={0.5} max={60} step={0.5} value={d.dur} onChange={(e) => mutate((x) => { x.dur = clamp(+e.target.value || 4, 0.5, 60); })} />s</label>
          <label>FPS <select value={d.fps} onChange={(e) => mutate((x) => { x.fps = +e.target.value; })}>{[12, 15, 20, 24, 25, 30, 60].map((f) => <option key={f}>{f}</option>)}</select></label>
          <label>New key ease <select value={d.ease} onChange={(e) => mutate((x) => { x.ease = e.target.value as any; })}>{EASE_LABELS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="chk"><input type="checkbox" checked={d.autoKey} onChange={(e) => mutate((x) => { x.autoKey = e.target.checked; })} /><span className={d.autoKey ? 'rec' : ''}>Auto-key</span></label>
          <label className="chk"><input type="checkbox" checked={d.snap} onChange={(e) => mutate((x) => { x.snap = e.target.checked; })} />Snap to frames</label>
        </div>
      </div>
      <div className="tlsub">
        <KeyEditor />
        {paths.length > 0 && (
          <button type="button" className={`tb sm${confirm ? ' danger' : ''}`} onBlur={() => setConfirm(false)}
            onClick={() => { if (!confirm) { setConfirm(true); return; } mutate((x) => { paths.forEach((p) => { const v = valueAt(x.tracks[p], clock.t); delete x.tracks[p]; const ks = p.split('.'); let o: any = x; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]]; o[ks[ks.length - 1]] = v; }); x.sel = null; }); setConfirm(false); }}>
            {confirm ? 'Click again to clear' : 'Clear all keys'}
          </button>
        )}
      </div>
      <div className="tlgrid">
        <div className="tlh">Tracks <small>{paths.length}{otherCount ? ` · ${otherCount} in other studios` : ''}</small></div>
        <Ruler />
        {paths.map((p) => (
          <React.Fragment key={p}>
            <div className={`tll${d.sel?.path === p ? ' on' : ''}`}>
              <span title={p}>{registry[p]?.label || p}</span>
              <button type="button" className="x" aria-label={`Remove animation from ${registry[p]?.label || p}`} title="Remove track (keeps current value)" onClick={() => removeTrack(p)}>×</button>
            </div>
            <Lane path={p} keys={d.tracks[p]} />
          </React.Fragment>
        ))}
        {!paths.length && (
          <div className="tlempty">
            <b>No keyframes yet.</b> Click the ◆ beside any slider or colour to key it at the playhead, move the playhead, change the value — it animates.
            Turn on <em>Auto-key</em> to record every change you make.
          </div>
        )}
        <Playhead />
      </div>
    </div>
  );
}
