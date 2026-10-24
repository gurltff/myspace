import { useCallback, useEffect, useState } from 'react';
import { useStore } from '../store/store';
import { activeSubjects } from '../store/derive';

/** Pill row to pick a subject; remembers the choice per page. */
export function SubjectPicker({ value, onChange, all }: { value: string; onChange: (id: string) => void; all?: boolean }) {
  const s = useStore((x) => x);
  const subs = all ? s.subjects : activeSubjects(s);
  useEffect(() => {
    if (!subs.find((x) => x.id === value) && subs[0]) onChange(subs[0].id);
  }, [subs, value, onChange]);
  if (!subs.length) return <p className="text-muted mb-3">add a subject first in “subjects & plan” ✿</p>;
  return (
    <div className="flex gap-1.5 flex-wrap mb-3">
      {subs.map((x) => (
        <button key={x.id} onClick={() => onChange(x.id)}
          className="px-3 py-0.5 rounded-full border-2 border-line font-round text-[15px] transition-all hover:-translate-y-0.5"
          style={{ background: value === x.id ? x.color : 'var(--panel2)', color: value === x.id ? '#3e3a2e' : 'var(--ink)', boxShadow: value === x.id ? '0 3px 0 var(--line)' : 'none' }}>
          {x.name}
        </button>
      ))}
    </div>
  );
}

export function useLocalState<T>(key: string, initial: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem('studynest:ui:' + key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  const set = useCallback((n: T) => {
    setV(n);
    try {
      localStorage.setItem('studynest:ui:' + key, JSON.stringify(n));
    } catch {
      /* ignore */
    }
  }, [key]);
  return [v, set];
}
