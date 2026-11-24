'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useDoc, mutate } from '@/lib/store';
import { drawGlyph, SHAPE_NAMES, CH, Glyph } from '@/lib/engine/glyphs';
import { mk, MONO } from '@/lib/util';
import { Section } from './controls';

function GlyphCanvas({ g, size = 30, bg, fg }: { g: Glyph; size?: number; bg: string; fg: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!, x = c.getContext('2d')!, s = size * 2;
    c.width = s; c.height = s;
    x.fillStyle = bg; x.fillRect(0, 0, s, s);
    drawGlyph(x, g, s * 0.1, s * 0.1, s * 0.8, s * 0.8, fg === 'currentColor' ? getComputedStyle(c).color : fg, 1, 400);
  }, [g, size, bg, fg]);
  return <canvas ref={ref} style={{ width: size, height: size }} />;
}

export default function GlyphEditor() {
  const d = useDoc();
  const A = d.ascii, G: Glyph[] = A.glyphs, sel = Math.min(A.sel, G.length - 1), gl = G[sel];
  const [cset, setCset] = useState('');
  const paint = useRef<string | null>(null);
  const setG = (v: Glyph) => mutate((x) => { x.ascii.glyphs[x.ascii.sel] = v; x.ascii.preset = -1; });
  const act = (a: string) => mutate((x) => {
    const g = x.ascii.glyphs, i = x.ascii.sel;
    if (a === 'add') { g.splice(i + 1, 0, { ...g[i] }); x.ascii.sel = i + 1; }
    if (a === 'del' && g.length > 2) { g.splice(i, 1); x.ascii.sel = Math.min(i, g.length - 1); }
    if (a === 'l' && i > 0) { [g[i - 1], g[i]] = [g[i], g[i - 1]]; x.ascii.sel--; }
    if (a === 'r' && i < g.length - 1) { [g[i + 1], g[i]] = [g[i], g[i + 1]]; x.ascii.sel++; }
    if (a === 'rev') g.reverse();
  });
  const tab = A.gtab;
  const toPixel = () => {
    if (gl.k === 'p') return;
    const c = mk(8, 8), x = c.getContext('2d')!;
    drawGlyph(x, gl, 0, 0, 8, 8, '#fff', 1, 700);
    const px = x.getImageData(0, 0, 8, 8).data;
    let bits = '';
    for (let i = 0; i < 64; i++) bits += px[i * 4 + 3] > 90 ? '1' : '0';
    setG({ k: 'p', v: bits });
  };
  const bits = gl.k === 'p' ? gl.v : '0'.repeat(64);
  const setBit = (i: number, v: string) => { const a = [...bits]; a[i] = v; setG({ k: 'p', v: a.join('') }); };
  return (
    <Section title="Glyph ramp" note={`${G.length} levels · dark → bright`}>
      <div className="ramp">
        {G.map((g, i) => (
          <button key={i} type="button" aria-pressed={sel === i} title={`Level ${i + 1}`} onClick={() => mutate((x) => { x.ascii.sel = i; })}>
            <GlyphCanvas g={g} bg={A.bg} fg={A.fg} />
          </button>
        ))}
      </div>
      <div className="row mb">
        <button className="btn sm" onClick={() => act('add')}>+ Level</button>
        <button className="btn sm" onClick={() => act('del')}>− Level</button>
        <button className="btn sm" onClick={() => act('l')} aria-label="Move left">←</button>
        <button className="btn sm" onClick={() => act('r')} aria-label="Move right">→</button>
        <button className="btn sm" onClick={() => act('rev')}>Reverse</button>
      </div>
      <div className="seg">
        {[['char', 'Character'], ['shape', 'Shape'], ['pixel', 'Draw 8×8']].map(([k, l]) => (
          <button key={k} type="button" aria-pressed={tab === k} onClick={() => { if (k === 'pixel') toPixel(); mutate((x) => { x.ascii.gtab = k; }); }}>{l}</button>
        ))}
      </div>
      {tab === 'char' && (
        <div>
          <input className="in big" maxLength={2} value={gl.k === 'c' ? gl.v : ''} placeholder="Type a character" aria-label="Replacement character"
            style={{ fontFamily: MONO }} onChange={(e) => setG({ k: 'c', v: [...e.target.value][0] || ' ' })} />
          <p className="note">Replaces level {sel + 1}. Letters, symbols, Braille, katakana or emoji all work.</p>
          <div className="row mt">
            <input className="in" style={{ flex: 1, fontFamily: MONO }} placeholder=" .:-=+*#%@" value={cset} onChange={(e) => setCset(e.target.value)} aria-label="Charset for the whole ramp" />
            <button className="btn sm" onClick={() => { if ([...cset].length >= 2) mutate((x) => { x.ascii.glyphs = CH(cset); x.ascii.sel = 0; x.ascii.preset = -1; }); }}>Use charset</button>
          </div>
        </div>
      )}
      {tab === 'shape' && (
        <div className="shapes">
          {SHAPE_NAMES.map((n) => (
            <button key={n} type="button" title={n} aria-pressed={gl.k === 's' && gl.v === n} onClick={() => setG({ k: 's', v: n })}>
              <GlyphCanvas g={{ k: 's', v: n }} size={34} bg="transparent" fg="currentColor" />
            </button>
          ))}
        </div>
      )}
      {tab === 'pixel' && (
        <div>
          <div className="pix" onPointerLeave={() => (paint.current = null)} onPointerUp={() => (paint.current = null)}>
            {[...bits].map((b, i) => (
              <button key={i} type="button" className={b === '1' ? 'on' : ''} aria-label={`Pixel ${i + 1}`}
                onPointerDown={(e) => { e.preventDefault(); paint.current = b === '1' ? '0' : '1'; setBit(i, paint.current); }}
                onPointerEnter={(e) => { if (paint.current && e.buttons & 1) setBit(i, paint.current); }} />
            ))}
          </div>
          <div className="row">
            <button className="btn sm" onClick={() => setG({ k: 'p', v: '0'.repeat(64) })}>Clear</button>
            <button className="btn sm" onClick={() => setG({ k: 'p', v: '1'.repeat(64) })}>Fill</button>
            <button className="btn sm" onClick={() => setG({ k: 'p', v: [...bits].map((c) => (c === '1' ? '0' : '1')).join('') })}>Invert</button>
            <button className="btn sm" onClick={() => { let o = ''; for (let y = 0; y < 8; y++) o += [...bits.slice(y * 8, y * 8 + 8)].reverse().join(''); setG({ k: 'p', v: o }); }}>Mirror</button>
          </div>
        </div>
      )}
    </Section>
  );
}
