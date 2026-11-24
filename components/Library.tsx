'use client';
import React, { useEffect, useRef } from 'react';
import { useDoc, mutate, getDoc } from '@/lib/store';
import { PRESETS, ANIMS, SOURCES, ICONS, ICON_ANIMS, presetFields } from '@/lib/engine/presets';
import { MODES, modeState, renderMath } from '@/lib/engine/math';
import { renderAscii } from '@/lib/engine/ascii';
import { evaluate } from '@/lib/keyframes';
import { src } from '@/lib/engine/sources';
import { Section, Chips } from './controls';

function PresetThumb({ i }: { i: number }) {
  const d = useDoc();
  const ref = useRef<HTMLCanvasElement>(null);
  const A = d.ascii;
  useEffect(() => {
    const id = setTimeout(() => {
      const c = ref.current;
      if (!c) return;
      const p = PRESETS[i], doc = getDoc(), eff = evaluate(doc, 0.5);
      const st = { ...eff.ascii, ...presetFields(i), cols: Math.round(p.cols * 0.32), anim: 'none' };
      renderAscii(c.getContext('2d')!, 132, 132, 0.5, st, eff, true);
    }, 30 + i * 8);
    return () => clearTimeout(id);
  }, [i, A.src, A.text, A.zoom, A.panX, A.panY, A.contrast, A.bright, d.size, src.ver]);
  return <canvas ref={ref} width={132} height={132} />;
}

function MathThumb({ k }: { k: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current!; renderMath(c.getContext('2d')!, 104, 104, 0.15, modeState(k)); }, [k]);
  return <canvas ref={ref} width={104} height={104} />;
}

export default function Library({ onUpload }: { onUpload: () => void }) {
  const d = useDoc();
  if (d.mode === 'ascii') {
    const A = d.ascii;
    return (
      <>
        <Section title="Source" note="drop or paste any image">
          <Chips items={SOURCES} value={A.src} onPick={(k) => { if (k === 'upload' && !src.upload) { onUpload(); return; } mutate((x) => { x.ascii.src = k; }); }} />
          <div className="row mt">
            <button className="btn sm" onClick={onUpload}>Choose image…</button>
            {A.src === 'text' && <input className="in" style={{ flex: 1 }} maxLength={40} value={A.text} aria-label="Source text" onChange={(e) => mutate((x) => { x.ascii.text = e.target.value; })} />}
          </div>
        </Section>
        <Section title="Visual styles" note="20 presets">
          <div className="grid3">
            {PRESETS.map((p, i) => (
              <button key={i} type="button" className="tile" aria-pressed={A.preset === i} onClick={() => mutate((x) => { Object.assign(x.ascii, presetFields(i)); x.ascii.sel = 1; })}>
                <PresetThumb i={i} /><span>{p.n}</span>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Animation" note="10 motions">
          <Chips items={ANIMS} value={A.anim} onPick={(k) => mutate((x) => { x.ascii.anim = k; })} />
        </Section>
      </>
    );
  }
  if (d.mode === 'icon') {
    const I = d.icon;
    return (
      <>
        <Section title="Icons" note={`${Object.keys(ICONS).length} + custom`}>
          <div className="grid4">
            {[...Object.keys(ICONS), 'custom'].map((k) => (
              <button key={k} type="button" className="ico" aria-pressed={I.icon === k} title={k} onClick={() => mutate((x) => { x.icon.icon = k; })}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
                  {(k === 'custom' ? (I.custom || '').split(/\n+/).filter(Boolean).map((p: string) => [p, 0]) : ICONS[k]).map((p: any, j: number) => <path key={j} d={p[0]} />)}
                </svg>
              </button>
            ))}
          </div>
          <label className="note mt" htmlFor="cpath">Custom paths — one SVG path per line on a 24×24 grid</label>
          <textarea id="cpath" className="in" spellCheck={false} value={I.custom} onChange={(e) => mutate((x) => { x.icon.custom = e.target.value; x.icon.icon = 'custom'; })} />
        </Section>
        <Section title="Animation">
          <Chips items={ICON_ANIMS} value={I.anim} onPick={(k) => mutate((x) => { x.icon.anim = k; })} />
        </Section>
        <Section title="Hand-off">
          <button className="btn sm" onClick={() => mutate((x) => { x.ascii.src = 'icon'; x.mode = 'ascii'; })}>Send icon to ASCII Studio (live)</button>
          <p className="note">The animated icon — keyframes included — becomes the live source for every glyph style.</p>
        </Section>
      </>
    );
  }
  return (
    <>
      <Section title="Generators" note={`${Object.keys(MODES).length} systems`}>
        <div className="mlist">
          {Object.entries(MODES).map(([k, m]) => (
            <button key={k} type="button" className="mitem" aria-pressed={d.math.mode === k}
              onClick={() => mutate((x) => {
                const keep = { xe: x.math.xe, ye: x.math.ye, turns: x.math.turns };
                x.math = modeState(k, keep);
                for (const p of Object.keys(x.tracks)) if (p.startsWith('math.v.') || p.startsWith('math.lfo.')) delete x.tracks[p];
                x.sel = null;
              })}>
              <MathThumb k={k} />
              <span><b>{m.n}</b><i>{m.d}</i></span>
            </button>
          ))}
        </div>
      </Section>
      <Section title="Hand-off">
        <button className="btn sm" onClick={() => mutate((x) => { x.ascii.src = 'math'; x.mode = 'ascii'; })}>Send to ASCII Studio (live)</button>
        <p className="note">Renders this generator through the glyph engine every frame.</p>
      </Section>
    </>
  );
}
