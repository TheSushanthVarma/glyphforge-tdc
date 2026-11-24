'use client';
import { useSyncExternalStore } from 'react';
import type { Doc } from './store';

/** A saved piece of work, kept in the browser's IndexedDB ("Creations" folder in the UI). */
export type Creation = {
  id: string;
  name: string;
  mode: Doc['mode'];
  created: number;
  updated: number;
  thumb: string; // JPEG data URL
  doc: Doc;
  upload?: string; // source image (JPEG data URL) when the ASCII studio used an uploaded image
};

const DB = 'glyphforge', STORE = 'creations';
let items: Creation[] = [];
let loaded = false;
let memoryOnly = false;
const subs = new Set<() => void>();
let ver = 0;
const emit = () => { ver++; subs.forEach((f) => f()); };

function open(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    try {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = () => { if (!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE, { keyPath: 'id' }); };
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    } catch (e) { rej(e); }
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  if (memoryOnly) return undefined;
  const db = await open();
  return new Promise((res, rej) => {
    const t = db.transaction(STORE, mode), s = t.objectStore(STORE), q = fn(s);
    t.oncomplete = () => res(q ? (q as IDBRequest<T>).result : undefined);
    t.onerror = () => rej(t.error);
  });
}

export async function loadCreations() {
  if (loaded) return;
  loaded = true;
  try { items = ((await tx<Creation[]>('readonly', (s) => s.getAll())) || []) as Creation[]; }
  catch { memoryOnly = true; items = []; }
  items.sort((a, b) => b.updated - a.updated);
  emit();
}
export async function putCreation(c: Creation) {
  items = [c, ...items.filter((x) => x.id !== c.id)].sort((a, b) => b.updated - a.updated);
  emit();
  try { await tx('readwrite', (s) => s.put(c)); } catch { memoryOnly = true; }
}
export async function deleteCreation(id: string) {
  items = items.filter((x) => x.id !== id);
  emit();
  try { await tx('readwrite', (s) => s.delete(id)); } catch { /* memory only */ }
}
export const getCreations = () => items;
export const isMemoryOnly = () => memoryOnly;
export const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };
export function useCreations() {
  useSyncExternalStore(subscribe, () => ver, () => ver);
  return items;
}

export function timeAgo(ts: number) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 45) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d} d ago`;
  return new Date(ts).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}
