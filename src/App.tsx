import { Route, Routes, useLocation } from 'react-router-dom';
import { lazy, Suspense, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { Layout } from './components/Layout';
import { useApplyTheme } from './components/theme';
import { supabase } from './store/supabase';
import { pullRemote } from './store/store';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import { CatSticker } from './components/Stickers';

const Subjects = lazy(() => import('./pages/Subjects'));
const Pyqs = lazy(() => import('./pages/Pyqs'));
const Practicals = lazy(() => import('./pages/Practicals'));
const Assessment = lazy(() => import('./pages/Assessment'));
const Ramble = lazy(() => import('./pages/Ramble'));
const PublicBlog = lazy(() => import('./pages/PublicBlog'));
const Settings = lazy(() => import('./pages/Settings'));

function Loading() {
  return (
    <div className="grid place-items-center py-20">
      <CatSticker mood="sleepy" size={90} className="animate-bounce" />
      <p className="font-round text-muted mt-2">loading…</p>
    </div>
  );
}

export default function App() {
  useApplyTheme();
  const loc = useLocation();
  const [session, setSession] = useState<Session | null | undefined>(supabase ? undefined : null);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (session) pullRemote();
  }, [session]);

  // the public blog is readable without logging in
  if (loc.pathname.startsWith('/blog'))
    return (
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path="/blog/*" element={<PublicBlog />} />
        </Routes>
      </Suspense>
    );
  if (supabase && session === undefined) return <Loading />;
  if (supabase && !session) return <Login />;

  return (
    <Layout>
      <Suspense fallback={<Loading />}>
        <Routes location={loc}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/subjects/*" element={<Subjects />} />
          <Route path="/pyqs/*" element={<Pyqs />} />
          <Route path="/practicals/*" element={<Practicals />} />
          <Route path="/assessment/*" element={<Assessment />} />
          <Route path="/ramble/*" element={<Ramble />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Dashboard />} />
        </Routes>
      </Suspense>
    </Layout>
  );
}
