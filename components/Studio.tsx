'use client';
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useDoc, getDoc, getVer, mutate, clock, setT, setPlaying, loadPersisted, replaceDoc, registry, Mode, frameEps, resetStudio, resetAll } from '@/lib/store';
import { loadCreations, putCreation, getCreations, newId, useCreations, Creation } from '@/lib/creations';
import Creations from './Creations';
import { upsertKey } from '@/lib/keyframes';
import { SIZES, PRESETS, ANIMS, ICONS, ICON_ANIMS, presetFields } from '@/lib/engine/presets';
import { MODES } from '@/lib/engine/math';
import { genSource, loadImageFile, loadDataURL, src } from '@/lib/engine/sources';
import { renderDoc, svgDoc, textDoc } from '@/lib/engine/render';
import { encodeGif } from '@/lib/engine/gif';
import { saveFile } from '@/lib/engine/save';
import { mk, pick, clamp, getPath } from '@/lib/util';
import Library from './Library';
import Inspector from './Inspector';
import Timeline, { jumpKey, stepFrame } from './Timeline';

function useToast() {
  const [msg, setMsg] = useState('');
  const t = useRef<any>(null);
  const show = useCallback((m: string) => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 2400); }, []);
  return { msg, show };
}

export default function Studio() {
  const d = useDoc();
  const cv = useRef<HTMLCanvasElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const file = useRef<HTMLInputElement>(null);
  const { msg, show } = useToast();
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<{ title: string; note: string; p: number } | null>(null);
  const cancelled = useRef(false);
  const [ready, setReady] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const [resetMenu, setResetMenu] = useState(false);
  const [armed, setArmed] = useState<'studio' | 'all' | null>(null);
  const creations = useCreations();

  /* boot */
  useEffect(() => { loadPersisted(); setReady(true); mutate(() => {}, false); loadCreations(); }, []);

  /* procedural sources follow the source / text / canvas size */
  const sz = SIZES[d.size] || SIZES.sq;
  useEffect(() => {
    if (!ready) return;
    genSource(d.ascii.src, d.ascii.text, sz[1], sz[2]);
    mutate(() => {}, false);
  }, [ready, d.ascii.src, d.ascii.text, d.size]);
  useEffect(() => {
    document.fonts?.ready.then(() => { const x = getDoc(); genSource(x.ascii.src, x.ascii.text, sz[1], sz[2]); mutate(() => {}, false); });
  }, []);

  /* stage sizing */
  useEffect(() => {
    const fit = () => {
      const b = box.current, c = cv.current;
      if (!b || !c) return;
      const r = b.getBoundingClientRect(), s = SIZES[getDoc().size] || SIZES.sq, ar = s[1] / s[2];
      let w = Math.max(60, r.width - 40), h = Math.max(60, r.height - 40);
      if (w / h > ar) w = h * ar; else h = w / ar;
      c.style.width = w + 'px'; c.style.height = h + 'px';
      const dpr = Math.min(window.devicePixelRatio || 1, 2), k = Math.min(1, 1400 / Math.max(w * dpr, h * dpr));
      c.width = Math.round(w * dpr * k); c.height = Math.round(h * dpr * k);
      lastVer.current = -1;
    };
    const ro = new ResizeObserver(fit);
    if (box.current) ro.observe(box.current);
    fit();
    return () => ro.disconnect();
  }, [d.size]);

  /* render loop */
  const lastVer = useRef(-1), lastT = useRef(-1);
  useEffect(() => {
    let raf = 0, last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const doc = getDoc();
      if (clock.playing) setT((clock.t + dt / doc.dur) % 1);
      if (lastVer.current !== getVer() || lastT.current !== clock.t) {
        lastVer.current = getVer(); lastT.current = clock.t;
        const c = cv.current;
        if (c) { const x = c.getContext('2d')!; x.setTransform(1, 0, 0, 1, 0, 0); try { renderDoc(x, c.width, c.height, clock.t, doc); } catch (e) { console.error(e); } }
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  /* keyboard */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); saveRef.current(); return; }
      const tag = (document.activeElement?.tagName || '').toUpperCase();
      if (/INPUT|TEXTAREA|SELECT/.test(tag) && (document.activeElement as HTMLInputElement).type !== 'range') return;
      if (e.code === 'Space' && tag !== 'BUTTON') { e.preventDefault(); setPlaying(!clock.playing); }
      else if (e.key === ',') jumpKey(-1);
      else if (e.key === '.') jumpKey(1);
      else if (e.key === 'ArrowLeft' && tag !== 'INPUT') { e.preventDefault(); stepFrame(-1); }
      else if (e.key === 'ArrowRight' && tag !== 'INPUT') { e.preventDefault(); stepFrame(1); }
      else if (e.key === 'Home') { setPlaying(false); setT(0); }
      else if (e.key === 'End') { setPlaying(false); setT(1); }
      else if ((e.key === 'Delete' || e.key === 'Backspace') && getDoc().sel) {
        e.preventDefault();
        mutate((x) => { const s = x.sel!, arr = x.tracks[s.path]; if (arr) { arr.splice(s.i, 1); if (!arr.length) delete x.tracks[s.path]; } x.sel = null; });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  /* uploads: picker, drop, paste */
  const takeFile = useCallback((f?: File | null) => {
    if (!f) return;
    loadImageFile(f).then(() => { mutate((x) => { x.ascii.src = 'upload'; x.mode = 'ascii'; }); genSource('upload', '', 1, 1); mutate(() => {}, false); show('Image loaded'); }).catch((e) => show(e.message));
  }, [show]);
  useEffect(() => {
    const dov = (e: DragEvent) => { if ([...(e.dataTransfer?.types || [])].includes('Files')) { e.preventDefault(); setOver(true); } };
    const dl = (e: DragEvent) => { if (!e.relatedTarget) setOver(false); };
    const dr = (e: DragEvent) => { e.preventDefault(); setOver(false); takeFile(e.dataTransfer?.files?.[0]); };
    const ps = (e: ClipboardEvent) => { const it = [...(e.clipboardData?.items || [])].find((i) => i.type.startsWith('image/')); if (it) takeFile(it.getAsFile()); };
    document.addEventListener('dragover', dov); document.addEventListener('dragleave', dl); document.addEventListener('drop', dr); document.addEventListener('paste', ps);
    return () => { document.removeEventListener('dragover', dov); document.removeEventListener('dragleave', dl); document.removeEventListener('drop', dr); document.removeEventListener('paste', ps); };
  }, [takeFile]);

  /* exports */
  const dims = () => { const s = SIZES[d.size], k = d.scale; return [Math.round(s[1] * k), Math.round(s[2] * k)]; };
  const fname = (ext: string) => `glyphforge-${d.mode}-${Date.now().toString(36)}.${ext}`;
  const exPNG = () => { const [w, h] = dims(), c = mk(w, h); renderDoc(c.getContext('2d')!, w, h, clock.t, getDoc(), true); c.toBlob((b) => b && saveFile(fname('png'), b).then(show), 'image/png'); };
  const exSVG = () => { const [w, h] = dims(); saveFile(fname('svg'), new Blob([svgDoc(w, h, clock.t, getDoc())], { type: 'image/svg+xml' })).then(show); };
  const copySVG = async () => { const [w, h] = dims(); try { await navigator.clipboard.writeText(svgDoc(w, h, clock.t, getDoc())); show('SVG copied'); } catch { show('Clipboard blocked here'); } };
  const copyTxt = async () => { const s = SIZES[d.size]; try { await navigator.clipboard.writeText(textDoc(1080, Math.round((1080 * s[2]) / s[1]), clock.t, getDoc())); show('ASCII text copied'); } catch { show('Clipboard blocked here'); } };
  const exGIF = async () => {
    const s = SIZES[d.size], w = d.gifw, h = Math.round((w * s[2]) / s[1]), n = Math.max(2, Math.round(d.dur * d.fps));
    cancelled.current = false;
    setBusy({ title: 'Encoding GIF', note: `${n} frames · ${w}×${h}`, p: 0 });
    try {
      const doc = getDoc();
      const blob = await encodeGif({ w, h, frames: n, fps: d.fps, draw: (x, W, H, t) => renderDoc(x, W, H, t, doc), onProgress: (p) => setBusy((b) => b && { ...b, p }), cancelled: () => cancelled.current });
      setBusy(null);
      if (!blob) { show('Export cancelled'); return; }
      show(await saveFile(fname('gif'), blob));
    } catch (e: any) { setBusy(null); show('GIF failed: ' + e.message); }
  };
  const exWebM = async () => {
    if (!(window as any).MediaRecorder) { show('WebM recording is not supported here'); return; }
    const s = SIZES[d.size], w = Math.min(1080, s[1]), h = Math.round((w * s[2]) / s[1]), c = mk(w, h), x = c.getContext('2d')!;
    let stream: MediaStream;
    try { stream = (c as any).captureStream(30); } catch { show('Recording blocked here'); return; }
    const mt = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((m) => MediaRecorder.isTypeSupported(m));
    const rec = new MediaRecorder(stream, { mimeType: mt, videoBitsPerSecond: 12e6 }), ch: Blob[] = [];
    rec.ondataavailable = (e) => e.data.size && ch.push(e.data);
    const done = new Promise((r) => (rec.onstop = r));
    cancelled.current = false;
    setBusy({ title: 'Recording WebM', note: 'One full loop in real time', p: 0 });
    const doc = getDoc();
    renderDoc(x, w, h, 0, doc); rec.start();
    const t0 = performance.now();
    await new Promise<void>((res) => { const step = () => { const el = (performance.now() - t0) / 1000; if (el >= doc.dur || cancelled.current) return res(); renderDoc(x, w, h, el / doc.dur, doc); setBusy((b) => b && { ...b, p: el / doc.dur }); requestAnimationFrame(step); }; step(); });
    rec.stop(); await done; setBusy(null);
    if (cancelled.current) { show('Recording cancelled'); return; }
    show(await saveFile(fname('webm'), new Blob(ch, { type: 'video/webm' })));
  };
  /* creations */
  const autoName = (x: ReturnType<typeof getDoc>) => {
    const base = x.mode === 'ascii'
      ? `${PRESETS[x.ascii.preset]?.n || 'Custom glyphs'} · ${ANIMS.find((a) => a[0] === x.ascii.anim)?.[1] || ''}`
      : x.mode === 'icon' ? `${x.icon.icon[0].toUpperCase() + x.icon.icon.slice(1)} icon · ${ICON_ANIMS.find((a) => a[0] === x.icon.anim)?.[1] || ''}`
      : MODES[x.math.mode].n;
    const n = getCreations().filter((c) => c.name.startsWith(base)).length;
    return n ? `${base} ${n + 1}` : base;
  };
  const snapshot = (x: ReturnType<typeof getDoc>) => {
    const s2 = SIZES[x.size] || SIZES.sq, tw = 360, th = Math.round((tw * s2[2]) / s2[1]), c = mk(tw, th);
    renderDoc(c.getContext('2d')!, tw, th, clock.t, x);
    return c.toDataURL('image/jpeg', 0.82);
  };
  const saveCreation = async (overwrite?: Creation) => {
    const x = getDoc(), now = Date.now(), id = overwrite?.id || newId();
    let upload: string | undefined;
    if (x.ascii.src === 'upload' && src.upload) upload = src.upload.toDataURL('image/jpeg', 0.9);
    const c: Creation = {
      id, name: overwrite?.name || autoName(x), mode: x.mode, created: overwrite?.created || now, updated: now,
      thumb: snapshot(x), doc: structuredClone({ ...x, sel: null, openId: id }), upload,
    };
    await putCreation(c);
    mutate((d) => { d.openId = id; });
    show(overwrite ? `Updated “${c.name}”` : `Saved “${c.name}” to Creations`);
  };
  const saveRef = useRef(() => {});
  saveRef.current = () => { saveCreation(); };
  const openCreation = async (c: Creation) => {
    const doc = structuredClone({ ...c.doc, openId: c.id });
    if (doc.ascii.src === 'upload') {
      if (c.upload) { try { await loadDataURL(c.upload); } catch { doc.ascii.src = 'terrain'; } } else doc.ascii.src = 'terrain';
    }
    replaceDoc(doc);
    const s2 = SIZES[doc.size] || SIZES.sq;
    genSource(doc.ascii.src, doc.ascii.text, s2[1], s2[2]);
    setT(0); setPlaying(true); setDrawer(false);
    show(`Opened “${c.name}”`);
  };
  const downloadCreation = (c: Creation) => {
    const safe = c.name.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-').toLowerCase() || 'creation';
    saveFile(`${safe}.glyphforge.json`, new Blob([JSON.stringify({ app: 'glyphforge', v: 3, name: c.name, upload: c.upload, doc: c.doc }, null, 1)], { type: 'application/json' })).then(show);
  };
  const importProject = (f?: File | null) => {
    if (!f) return;
    f.text().then(async (t) => {
      const j = JSON.parse(t);
      if (j.app !== 'glyphforge' || !j.doc) throw new Error('Not a Glyphforge project');
      const now = Date.now(), id = newId();
      const c: Creation = { id, name: j.name || f.name.replace(/\.(glyphforge\.)?json$/i, ''), mode: j.doc.mode || 'ascii', created: now, updated: now, thumb: '', doc: { ...j.doc, openId: id }, upload: j.upload };
      await openCreation(c);
      c.thumb = snapshot(getDoc());
      await putCreation(c);
      show(`Imported “${c.name}”`);
    }).catch((e) => show(e.message || 'Could not open project'));
  };

  /* randomise + auto-animate */
  const randomise = () => mutate((x) => {
    if (x.mode === 'ascii') { Object.assign(x.ascii, presetFields(Math.floor(Math.random() * PRESETS.length))); x.ascii.anim = pick(ANIMS.slice(1))[0]; x.ascii.amp = +(0.3 + Math.random() * 0.6).toFixed(2); }
    else if (x.mode === 'icon') {
      const I = x.icon; I.icon = pick(Object.keys(ICONS));
      [I.p, I.s, I.canvas] = pick([['#8A4BFF', '#EDEBFF', '#120F24'], ['#2F5BFF', '#FFFFFF', '#0B0B0C'], ['#E8501C', '#0B0B0B', '#E6E6E3'], ['#FFFFFF', '#2F5BFF', '#2F5BFF'], ['#0B0B0C', '#2F5BFF', '#F2F2F0']]);
      I.anim = pick(ICON_ANIMS.slice(1))[0]; I.pixel = Math.random() < 0.4 ? 'on' : 'off';
    } else {
      const md = MODES[x.math.mode];
      'abcd'.split('').forEach((k, i) => { if (x.math.mode === 'custom' && i > 1) return; const m = md.v[i]; x.math.v[k] = +(Math.round((m[1] + Math.random() * (m[2] - m[1])) / m[3]) * m[3]).toFixed(4); });
      x.math.copies = Math.random() < 0.5 ? 1 : 2 + Math.floor(Math.random() * 12); x.math.sym = pick([1, 1, 2, 3, 4, 6, 8]);
    }
  });
  const autoAnimate = () => {
    const x = getDoc(), mode = x.mode;
    const cands = Object.entries(registry).filter(([p, m]) => p.startsWith(mode + '.') && !m.color && m.min !== undefined && !p.includes('.lfo.') && !/cols|res|copies|sym|cyc|spin|speed|turns|density/.test(p));
    if (!cands.length) return;
    const chosen = [...cands].sort(() => Math.random() - 0.5).slice(0, 3);
    mutate((dd) => {
      for (const [p, m] of chosen) {
        const cur = Number(getPath(dd, p)), span = (m.max! - m.min!) * (0.25 + Math.random() * 0.35);
        const up = cur + span <= m.max! && (cur - span < m.min! || Math.random() < 0.5), v2 = clamp(cur + (up ? span : -span), m.min!, m.max!);
        delete dd.tracks[p];
        const eps = frameEps(dd);
        upsertKey(dd.tracks, p, 0, cur, eps, 'smooth');
        upsertKey(dd.tracks, p, 0.5, +v2.toFixed(4), eps, pick(['smooth', 'back', 'out', 'elastic'] as any));
        upsertKey(dd.tracks, p, 1, cur, eps, 'smooth');
      }
    });
    show(`Animated ${chosen.map(([, m]) => m.label).join(', ')}`);
  };

  const setMode = (m: Mode) => mutate((x) => { x.mode = m; x.sel = null; });

  return (
    <div className="app">
      <header>
        <div className="brand">
          <svg viewBox="0 0 26 26" aria-hidden="true"><g fill="currentColor"><rect x="2" y="2" width="6" height="6" rx="1" /><rect x="10" y="2" width="6" height="6" rx="3" /><rect x="18" y="2" width="6" height="6" rx="1" fill="#2F5BFF" /><rect x="2" y="10" width="6" height="6" rx="3" /><rect x="10" y="10" width="6" height="6" rx="1" /><rect x="18" y="10" width="6" height="6" rx="3" /><rect x="2" y="18" width="6" height="6" rx="1" /><rect x="10" y="18" width="6" height="6" rx="3" /><rect x="18" y="18" width="6" height="6" rx="1" /></g></svg>
          Glyphforge
        </div>
        <div className="tabs" role="group" aria-label="Studio">
          {([['ascii', 'ASCII Studio'], ['icon', 'Icon Maker'], ['math', 'Math Lab']] as [Mode, string][]).map(([m, l]) => (
            <button key={m} type="button" aria-pressed={d.mode === m} onClick={() => setMode(m)}>{l}</button>
          ))}
        </div>
        <div className="spacer" />
        <button className="btn sm" onClick={autoAnimate} title="Keyframe three random parameters into a looping move">Auto-animate</button>
        <button className="btn sm" onClick={randomise}>Randomise</button>
        <div className="menuwrap">
          <button className="btn sm" aria-expanded={resetMenu} onClick={() => { setResetMenu(!resetMenu); setArmed(null); }}>Reset</button>
          {resetMenu && (
            <div className="menu" role="menu" onPointerLeave={() => setArmed(null)}>
              <button type="button" role="menuitem" className={armed === 'studio' ? 'armed' : ''} onClick={() => {
                if (armed !== 'studio') { setArmed('studio'); return; }
                resetStudio(d.mode); setResetMenu(false); setArmed(null); show(`${{ ascii: 'ASCII Studio', icon: 'Icon Maker', math: 'Math Lab' }[d.mode]} reset to defaults`);
              }}>
                <b>{armed === 'studio' ? 'Click again to reset' : `Reset ${{ ascii: 'ASCII Studio', icon: 'Icon Maker', math: MODES[d.math.mode].n }[d.mode]}`}</b>
                <span>Default settings for this studio and remove its keyframes{d.mode === 'ascii' ? '. Your source image stays.' : '.'}</span>
              </button>
              <button type="button" role="menuitem" className={armed === 'all' ? 'armed' : ''} onClick={() => {
                if (armed !== 'all') { setArmed('all'); return; }
                resetAll(); setT(0); setResetMenu(false); setArmed(null); show('Everything reset to defaults');
              }}>
                <b>{armed === 'all' ? 'Click again to reset everything' : 'Reset everything'}</b>
                <span>All three studios, timeline length and every keyframe. Creations are kept.</span>
              </button>
            </div>
          )}
        </div>
        <button className="btn sm" onClick={() => setDrawer(true)}>Creations <span className="count">{creations.length}</span></button>
        <button className="btn sm pri" onClick={() => saveCreation()} title="Save to Creations (⌘S / Ctrl S)">Save</button>
      </header>
      <main>
        <aside className="panel" aria-label="Library"><Library onUpload={() => file.current?.click()} /></aside>
        <section className="center">
          <div className={`stage${over ? ' over' : ''}`} ref={box}>
            <canvas ref={cv} aria-label="Live preview" />
            <div className="drop">Drop image to convert</div>
          </div>
          <div className="exp">
            <label>Canvas <select value={d.size} onChange={(e) => mutate((x) => { x.size = e.target.value; })}>{Object.entries(SIZES).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></label>
            <label>Scale <select value={d.scale} onChange={(e) => mutate((x) => { x.scale = +e.target.value; })}>{[0.5, 1, 2, 4].map((v) => <option key={v} value={v}>{v}×</option>)}</select></label>
            <label>GIF width <select value={d.gifw} onChange={(e) => mutate((x) => { x.gifw = +e.target.value; })}>{[360, 540, 720, 1080].map((v) => <option key={v}>{v}</option>)}</select></label>
            <span className="spacer" />
            <button className="btn sm" onClick={exPNG}>PNG</button>
            <button className="btn sm" onClick={exSVG}>SVG</button>
            <button className="btn sm pri" onClick={exGIF}>GIF</button>
            <button className="btn sm" onClick={exWebM}>WebM</button>
            <button className="btn sm" onClick={copySVG}>Copy SVG</button>
            {d.mode === 'ascii' && <button className="btn sm" onClick={copyTxt}>Copy text</button>}
          </div>
        </section>
        <aside className="panel r" aria-label="Variables"><Inspector /></aside>
      </main>
      <Timeline />
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { takeFile(e.target.files?.[0]); e.target.value = ''; }} />
      <Creations open={drawer} onClose={() => setDrawer(false)} onOpen={openCreation} onSaveNew={() => saveCreation()}
        onOverwrite={(c) => saveCreation(c)} onImport={importProject} onDownload={downloadCreation} />
      {resetMenu && <div className="menuveil" onPointerDown={() => { setResetMenu(false); setArmed(null); }} />}
      {busy && (
        <div className="veil">
          <div className="card">
            <b>{busy.title}</b>
            <div className="prog"><i style={{ width: `${busy.p * 100}%` }} /></div>
            <span className="note">{busy.note}</span>
            <button className="btn" onClick={() => { cancelled.current = true; }}>Cancel</button>
          </div>
        </div>
      )}
      <div className={`toast${msg ? ' on' : ''}`} role="status">{msg}</div>
    </div>
  );
}
