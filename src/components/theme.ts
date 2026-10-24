import { useEffect } from 'react';
import { update, useStore } from '../store/store';

function resolve(t: 'light' | 'dark' | 'system'): 'light' | 'dark' {
  if (t !== 'system') return t;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function useApplyTheme() {
  const t = useStore((s) => s.settings.theme);
  useEffect(() => {
    const apply = () => document.documentElement.setAttribute('data-theme', resolve(t));
    apply();
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [t]);
}

export function useTheme(): ['light' | 'dark', () => void] {
  const t = useStore((s) => s.settings.theme);
  const cur = resolve(t);
  return [cur, () => update((d) => void (d.settings.theme = cur === 'dark' ? 'light' : 'dark'))];
}
