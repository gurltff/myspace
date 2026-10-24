import { useEffect, useState } from 'react';
import { Link, useParams, Routes, Route } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '../store/supabase';
import { getState } from '../store/store';
import { prettyDate } from '../lib/dates';
import { CatSticker, DangoSticker, StarSticker } from '../components/Stickers';
import { MOOD_EMOJI } from './Ramble';

interface PubPost { id: string; title: string; html: string; date: string; mood: string; tags: string[]; author?: string }

function usePosts() {
  const [posts, setPosts] = useState<PubPost[] | null>(null);
  useEffect(() => {
    if (supabase) {
      supabase.from('public_posts').select('*').order('date', { ascending: false }).then(({ data }) => setPosts((data as PubPost[]) ?? []));
    } else {
      const s = getState();
      setPosts(s.posts.filter((p) => p.isPublic).sort((a, b) => b.date.localeCompare(a.date)).map((p) => ({ ...p, author: s.settings.name })));
    }
  }, []);
  return posts;
}

function List({ posts }: { posts: PubPost[] }) {
  return (
    <div className="space-y-3">
      {posts.map((p, i) => (
        <motion.article key={p.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="nest-box hoverable p-4">
          <Link to={`/blog/${p.id}`}>
            <div className="text-[14px] text-muted">{prettyDate(p.date)} · {MOOD_EMOJI[p.mood] ?? ''} {p.mood}</div>
            <h2 className="font-round font-extrabold text-[22px]">{p.title || 'untitled'}</h2>
            <p className="text-[16px] text-muted line-clamp-3">{p.html.replace(/<[^>]+>/g, ' ').slice(0, 240)}</p>
            <div className="flex gap-1 mt-1 flex-wrap">{p.tags.map((t) => <span key={t} className="nest-tag">#{t}</span>)}</div>
          </Link>
        </motion.article>
      ))}
      {!posts.length && <div className="nest-box p-6 text-center text-muted">no public posts yet ✿</div>}
    </div>
  );
}

function One({ posts }: { posts: PubPost[] }) {
  const { id } = useParams();
  const p = posts.find((x) => x.id === id);
  if (!p) return <div className="nest-box p-6 text-center">post not found · <Link to="/blog" className="underline">back</Link></div>;
  return (
    <motion.article initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="nest-box p-5">
      <Link to="/blog" className="text-[15px] underline text-muted">← all posts</Link>
      <div className="text-[14px] text-muted mt-2">{prettyDate(p.date)} · {MOOD_EMOJI[p.mood] ?? ''} {p.mood}</div>
      <h1 className="font-round font-extrabold text-[30px] mb-2">{p.title}</h1>
      <div className="prose-nest text-[18px]" dangerouslySetInnerHTML={{ __html: p.html }} />
      <div className="flex gap-1 mt-3 flex-wrap">{p.tags.map((t) => <span key={t} className="nest-tag">#{t}</span>)}</div>
    </motion.article>
  );
}

export default function PublicBlog() {
  const posts = usePosts();
  const author = posts?.[0]?.author ?? getState().settings.name;
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 relative">
      <CatSticker size={100} className="sticker hidden sm:block" style={{ right: -40, top: 10 }} />
      <DangoSticker size={70} className="sticker hidden sm:block" style={{ left: -50, top: 160 }} />
      <StarSticker size={40} className="sticker" style={{ right: 20, bottom: -10 }} />
      <div className="nest-box p-5 mb-4">
        <h1 className="nest-title text-[38px] sm:text-[48px]">{author.toUpperCase()}'S RAMBLES !!</h1>
        <p className="text-muted mt-1">a lil physics student's public journal ✿ {!supabase && <span className="text-[13px]">(offline mode: showing posts saved in this browser)</span>}</p>
      </div>
      {posts === null ? <p className="text-center text-muted">loading…</p> : (
        <Routes>
          <Route path=":id" element={<One posts={posts} />} />
          <Route path="*" element={<List posts={posts} />} />
        </Routes>
      )}
      <p className="text-center text-[14px] text-muted mt-6"><Link to="/" className="underline">✿ studynest</Link></p>
    </div>
  );
}
