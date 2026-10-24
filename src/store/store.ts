import { useRef, useSyncExternalStore } from 'react';
import { produce, type Draft } from 'immer';
import type { AppData } from './types';
import { makeSeed } from './seed';
import { supabase } from './supabase';
import { ymd } from '../lib/dates';

const KEY = 'studynest:data:v1';

function load(): AppData {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...makeSeed(true), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return makeSeed(false);
}

let state: AppData = load();
const listeners = new Set<() => void>();
let syncTimer: ReturnType<typeof setTimeout> | undefined;

function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* quota */
  }
  if (supabase) {
    clearTimeout(syncTimer);
    syncTimer = setTimeout(pushRemote, 1500);
  }
}

export function getState() {
  return state;
}

export function update(fn: (d: Draft<AppData>) => void) {
  state = produce(state, (d) => {
    fn(d);
    d.updatedAt = new Date().toISOString();
  });
  persist();
  listeners.forEach((l) => l());
}

export function replaceState(next: AppData) {
  state = next;
  persist();
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  return () => void listeners.delete(cb);
};

/** Subscribe to a derived slice; recomputed only when the state or the selector changes. */
export function useStore<T>(sel: (s: AppData) => T): T {
  const cache = useRef<{ s?: AppData; sel?: unknown; v?: T }>({});
  const get = () => {
    const c = cache.current;
    if (c.s !== state || c.sel !== sel) cache.current = { s: state, sel, v: sel(state) };
    return cache.current.v as T;
  };
  return useSyncExternalStore(subscribe, get);
}

export function markStudied() {
  const t = ymd();
  if (!state.studyDays.includes(t)) update((d) => void d.studyDays.push(t));
}

/* ---------- Supabase sync (one JSON snapshot per user, protected by RLS) ---------- */

export async function pushRemote() {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  await supabase.from('user_snapshots').upsert({ user_id: data.user.id, data: state, updated_at: state.updatedAt });
  const pub = state.posts.filter((p) => p.isPublic);
  await supabase.from('public_posts').delete().eq('user_id', data.user.id);
  if (pub.length)
    await supabase.from('public_posts').insert(
      pub.map((p) => ({ id: p.id, user_id: data.user!.id, author: state.settings.name, title: p.title, html: p.html, date: p.date, mood: p.mood, tags: p.tags })),
    );
}

export async function pullRemote() {
  if (!supabase) return;
  const { data } = await supabase.auth.getUser();
  if (!data.user) return;
  const { data: row } = await supabase.from('user_snapshots').select('data, updated_at').eq('user_id', data.user.id).maybeSingle();
  if (row?.data && row.updated_at > state.updatedAt) replaceState({ ...makeSeed(true), ...(row.data as AppData) });
  else await pushRemote();
}
