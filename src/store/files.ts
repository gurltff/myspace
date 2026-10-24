import { get, set, del } from 'idb-keyval';
import { uid } from '../lib/id';
import { supabase } from './supabase';

/** Uploaded files live in IndexedDB (and Supabase Storage when configured). */
export async function saveFile(file: Blob): Promise<string> {
  const id = uid();
  await set('file:' + id, file);
  if (supabase) {
    const { data } = await supabase.auth.getUser();
    if (data.user) await supabase.storage.from('studynest').upload(`${data.user.id}/${id}`, file).catch(() => undefined);
  }
  return id;
}

export async function loadFile(id: string): Promise<Blob | undefined> {
  const local = await get<Blob>('file:' + id);
  if (local) return local;
  if (supabase) {
    const { data: u } = await supabase.auth.getUser();
    if (u.user) {
      const { data } = await supabase.storage.from('studynest').download(`${u.user.id}/${id}`);
      if (data) {
        await set('file:' + id, data);
        return data;
      }
    }
  }
  return undefined;
}

export async function deleteFile(id: string) {
  await del('file:' + id);
}
