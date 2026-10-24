import { useRef, useState } from 'react';
import { Box, Btn, Field, Input, PageTitle, Select } from '../components/ui';
import { useStore, update, replaceState, getState, pushRemote } from '../store/store';
import { supabase } from '../store/supabase';
import { makeSeed, emptyData } from '../store/seed';
import type { AppData } from '../store/types';

export default function Settings() {
  const st = useStore((s) => s.settings);
  const file = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState('');
  const set = (patch: Partial<typeof st>) => update((d) => void Object.assign(d.settings, patch));

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `studynest-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setMsg('backup downloaded ✓ (uploaded files stay on this device)');
  };
  const importJson = async (f: File) => {
    try {
      const data = JSON.parse(await f.text()) as AppData;
      if (!Array.isArray(data.subjects) || !data.settings) throw new Error('not a StudyNest backup');
      if (!confirm('Replace all current data with this backup?')) return;
      replaceState({ ...emptyData(), ...data, updatedAt: new Date().toISOString() });
      setMsg('backup restored ✓');
    } catch (e) {
      setMsg('import failed: ' + (e as Error).message);
    }
  };

  return (
    <div className="space-y-6">
      <Box className="pt-4"><PageTitle sub="profile, constants & your data">Settings</PageTitle></Box>
      <Box title="profile" delay={0.05}>
        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="your name"><Input value={st.name} onChange={(e) => set({ name: e.target.value })} /></Field>
          <Field label="college name (printed on generated papers)"><Input value={st.college} onChange={(e) => set({ college: e.target.value })} /></Field>
          <Field label="theme">
            <Select value={st.theme} onChange={(e) => set({ theme: e.target.value as typeof st.theme })}><option value="system">follow system</option><option value="light">light ☀</option><option value="dark">dark ☾</option></Select>
          </Field>
          <Field label={`default study hours: ${st.hoursPerDay}h`}>
            <input type="range" min={1} max={12} step={0.5} value={st.hoursPerDay} className="w-full accent-[var(--sage-dark)]" onChange={(e) => update((d) => { d.settings.hoursPerDay = Number(e.target.value); d.plan.hoursPerDay = Number(e.target.value); })} />
          </Field>
        </div>
      </Box>

      <Box title="physics constants" delay={0.1} right={<Btn small onClick={() => update((d) => void d.settings.constants.push({ name: 'k', value: 1, unit: '', label: 'new constant' }))}>+ add</Btn>}>
        <p className="text-[14px] text-muted mb-2">available by name in every numerical formula.</p>
        <div className="space-y-1">
          {st.constants.map((c, i) => (
            <div key={i} className="grid grid-cols-[80px_1fr_90px_1fr_24px] gap-1.5 items-center text-[15px]">
              <Input className="!py-0 font-mono" value={c.name} onChange={(e) => update((d) => void (d.settings.constants[i].name = e.target.value.replace(/\W/g, '')))} />
              <Input className="!py-0 font-mono" value={c.value} onChange={(e) => update((d) => void (d.settings.constants[i].value = Number(e.target.value)))} />
              <Input className="!py-0" value={c.unit} onChange={(e) => update((d) => void (d.settings.constants[i].unit = e.target.value))} />
              <Input className="!py-0" value={c.label} onChange={(e) => update((d) => void (d.settings.constants[i].label = e.target.value))} />
              <button className="text-muted" onClick={() => update((d) => void d.settings.constants.splice(i, 1))}>✕</button>
            </div>
          ))}
        </div>
      </Box>

      <Box title="data" delay={0.15}>
        <div className="flex flex-wrap gap-2">
          <Btn onClick={exportJson}>⬇ export JSON backup</Btn>
          <Btn variant="sky" onClick={() => file.current?.click()}>⬆ import backup</Btn>
          <input ref={file} type="file" accept="application/json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          <Btn variant="butter" onClick={() => confirm('Load the demo data? This replaces current data.') && replaceState(makeSeed(false))}>load demo data</Btn>
          <Btn variant="pink" onClick={() => confirm('Erase EVERYTHING and start empty?') && replaceState({ ...emptyData(), updatedAt: new Date().toISOString() })}>start fresh</Btn>
        </div>
        {msg && <p className="mt-2 text-[15px]">{msg}</p>}
      </Box>

      <Box title="account & sync" delay={0.2}>
        {supabase ? (
          <div className="flex flex-wrap gap-2 items-center">
            <span>☁ synced with Supabase (row-level security: only you can read your data)</span>
            <Btn small variant="sky" onClick={async () => { await pushRemote(); setMsg('synced ✓'); }}>sync now</Btn>
            <Btn small variant="ghost" onClick={() => supabase!.auth.signOut()}>log out</Btn>
          </div>
        ) : (
          <p className="text-[16px]">offline mode — everything is saved in this browser. To log in and sync across your phone & laptop, add <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> (see README).</p>
        )}
      </Box>
    </div>
  );
}
