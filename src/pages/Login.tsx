import { useState } from 'react';
import { supabase } from '../store/supabase';
import { Btn, Input, Field } from '../components/ui';
import { Unicorn, Bow } from '../components/Stickers';
import { DreamBg } from '../components/Layout';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'in' | 'up'>('in');
  const [msg, setMsg] = useState('');
  const go = async () => {
    if (!supabase) return;
    setMsg('…');
    const r = mode === 'in' ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password });
    setMsg(r.error ? r.error.message : mode === 'up' ? 'Check your inbox to confirm your email ✿' : '');
  };
  return (
    <div className="min-h-screen grid place-items-center p-4">
      <DreamBg />
      <div className="nest-box p-6 w-full max-w-sm relative">
        <Bow size={90} className="sticker sway" style={{ right: -30, top: -50 }} />
        <Unicorn size={170} className="sticker" style={{ left: -90, bottom: -60 }} />
        <h1 className="nest-title text-[56px] mb-1">StudyNest</h1>
        <p className="text-muted mb-4">your lil study corner ✿ log in to continue</p>
        <div className="space-y-3">
          <Field label="email"><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          <Field label="password"><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && go()} /></Field>
          <div className="flex items-center gap-3">
            <Btn onClick={go}>{mode === 'in' ? 'log in' : 'sign up'}</Btn>
            <button className="text-muted underline text-[15px]" onClick={() => setMode(mode === 'in' ? 'up' : 'in')}>{mode === 'in' ? 'new here? sign up' : 'have an account? log in'}</button>
          </div>
          {msg && <p className="text-[15px]">{msg}</p>}
        </div>
      </div>
    </div>
  );
}
