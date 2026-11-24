'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useCreations, deleteCreation, putCreation, newId, timeAgo, isMemoryOnly, Creation } from '@/lib/creations';
import { useDoc } from '@/lib/store';
import { renderDoc } from '@/lib/engine/render';
import { SIZES } from '@/lib/engine/presets';

const MODE_LABEL = { ascii: 'ASCII', icon: 'Icon', math: 'Math' } as const;

function Thumb({ c }: { c: Creation }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState(false);
  // Live hover preview where the render does not depend on a source image.
  const canAnimate = c.mode !== 'ascii' || c.doc.ascii.src === 'math' || c.doc.ascii.src === 'icon';
  useEffect(() => {
    if (!hover || !canAnimate) return;
    const cv = ref.current!, s = SIZES[c.doc.size] || SIZES.sq;
    cv.width = 320; cv.height = Math.round((320 * s[2]) / s[1]);
    const x = cv.getContext('2d')!;
    let raf = 0;
    const t0 = performance.now();
    const loop = (now: number) => {
      const t = (((now - t0) / 1000 / c.doc.dur) % 1 + 1) % 1;
      x.setTransform(1, 0, 0, 1, 0, 0);
      try { renderDoc(x, cv.width, cv.height, t, c.doc); } catch { /* ignore */ }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [hover, canAnimate, c]);
  return (
    <div className="cthumb" onPointerEnter={() => setHover(true)} onPointerLeave={() => setHover(false)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={c.thumb} alt="" />
      {hover && canAnimate && <canvas ref={ref} />}
    </div>
  );
}

function Card({ c, isOpen, onOpen, onOverwrite, onDownload }: { c: Creation; isOpen: boolean; onOpen: () => void; onOverwrite: () => void; onDownload: () => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(c.name);
  const [del, setDel] = useState(false);
  const tracks = Object.keys(c.doc.tracks || {}).filter((p) => p.startsWith(c.mode + '.')).length;
  const commit = () => { setEditing(false); const n = name.trim() || c.name; if (n !== c.name) putCreation({ ...c, name: n, updated: Date.now() }); setName(n); };
  return (
    <article className={`ccard${isOpen ? ' open' : ''}`}>
      <button type="button" className="cimg" onClick={onOpen} aria-label={`Open ${c.name}`}>
        <Thumb c={c} />
        <span className="cbadge">{MODE_LABEL[c.mode]}</span>
        {isOpen && <span className="cbadge now">Open now</span>}
      </button>
      <div className="cbody">
        {editing
          ? <input className="in" autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={commit} onKeyDown={(e) => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setName(c.name); setEditing(false); } }} aria-label="Creation name" />
          : <b title="Double-click to rename" onDoubleClick={() => setEditing(true)}>{c.name}</b>}
        <span className="cmeta">{tracks ? `${tracks} animated · ` : ''}{c.doc.dur}s · {timeAgo(c.updated)}</span>
        <div className="cact">
          <button type="button" className="tb sm" onClick={onOpen}>Open</button>
          {isOpen && <button type="button" className="tb sm" onClick={onOverwrite} title="Replace this creation with your current work">Update</button>}
          <button type="button" className="tb sm" onClick={() => setEditing(true)}>Rename</button>
          <button type="button" className="tb sm" onClick={() => { const now = Date.now(), id = newId(); putCreation({ ...c, id, name: `${c.name} copy`, created: now, updated: now, doc: { ...structuredClone(c.doc), openId: id } }); }}>Duplicate</button>
          <button type="button" className="tb sm" onClick={onDownload} title="Download as .json">.json</button>
          <button type="button" className={`tb sm${del ? ' danger' : ''}`} onBlur={() => setDel(false)} onClick={() => { if (!del) { setDel(true); return; } deleteCreation(c.id); }}>{del ? 'Confirm delete' : 'Delete'}</button>
        </div>
      </div>
    </article>
  );
}

export default function Creations({ open, onClose, onOpen, onSaveNew, onOverwrite, onImport, onDownload }: {
  open: boolean; onClose: () => void; onOpen: (c: Creation) => void; onSaveNew: () => void; onOverwrite: (c: Creation) => void;
  onImport: (f?: File | null) => void; onDownload: (c: Creation) => void;
}) {
  const items = useCreations();
  const d = useDoc();
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<'all' | 'ascii' | 'icon' | 'math'>('all');
  const [sort, setSort] = useState<'new' | 'name'>('new');
  const imp = useRef<HTMLInputElement>(null);
  const list = useMemo(() => {
    let l = items.filter((c) => (filter === 'all' || c.mode === filter) && c.name.toLowerCase().includes(q.trim().toLowerCase()));
    if (sort === 'name') l = [...l].sort((a, b) => a.name.localeCompare(b.name));
    return l;
  }, [items, q, filter, sort]);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="cveil" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <aside className="drawer" aria-label="Creations">
        <div className="dhead">
          <div>
            <h2>Creations</h2>
            <span className="note">{items.length} saved {isMemoryOnly() ? '· this browser blocks storage, saves last until you close the tab' : '· stored in this browser'}</span>
          </div>
          <button type="button" className="tb" onClick={onClose} aria-label="Close creations">✕</button>
        </div>
        <div className="dtools">
          <button type="button" className="btn sm pri" onClick={onSaveNew}>Save current as new</button>
          <button type="button" className="btn sm" onClick={() => imp.current?.click()}>Import .json</button>
          <input ref={imp} type="file" accept="application/json,.json" hidden onChange={(e) => { onImport(e.target.files?.[0]); e.target.value = ''; }} />
        </div>
        <div className="dtools">
          <input className="in" placeholder="Search creations" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search creations" style={{ flex: 1 }} />
          <select className="in" style={{ width: 'auto' }} value={sort} onChange={(e) => setSort(e.target.value as any)} aria-label="Sort"><option value="new">Newest</option><option value="name">Name</option></select>
        </div>
        <div className="chips dfilter">
          {(['all', 'ascii', 'icon', 'math'] as const).map((f) => (
            <button key={f} type="button" className="chip" aria-pressed={filter === f} onClick={() => setFilter(f)}>
              {f === 'all' ? `All ${items.length}` : `${MODE_LABEL[f]} ${items.filter((c) => c.mode === f).length}`}
            </button>
          ))}
        </div>
        <div className="cgrid">
          {list.map((c) => (
            <Card key={c.id + c.updated} c={c} isOpen={d.openId === c.id} onOpen={() => onOpen(c)} onOverwrite={() => onOverwrite(c)} onDownload={() => onDownload(c)} />
          ))}
        </div>
        {!items.length && (
          <div className="cempty">
            <b>Nothing saved yet.</b>
            <p>Press <kbd>Save</kbd> (or <kbd>⌘S</kbd> / <kbd>Ctrl S</kbd>) and your current piece, with all its keyframes, lands here as a card. Every save makes a new item, so you can keep versions side by side.</p>
          </div>
        )}
        {items.length > 0 && !list.length && <p className="note pad">No creations match.</p>}
      </aside>
    </div>
  );
}
