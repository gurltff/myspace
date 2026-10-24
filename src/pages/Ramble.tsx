import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import { Box, Btn, Empty, Field, Input, PageTitle, Select, Tag } from '../components/ui';
import { useStore, update } from '../store/store';
import { uid } from '../lib/id';
import { prettyDate, ymd } from '../lib/dates';
import type { Post } from '../store/types';

export const MOODS = ['cozy', 'happy', 'tired', 'stressed', 'proud', 'curious', 'meh', 'sleepy'];
export const MOOD_EMOJI: Record<string, string> = { cozy: '☕', happy: '🌸', tired: '🥱', stressed: '😵‍💫', proud: '🏆', curious: '🔭', meh: '🫠', sleepy: '💤' };

export default function Ramble() {
  const posts = useStore((s) => s.posts);
  const [openId, setOpenId] = useState<string | null>(null);
  const [f, setF] = useState({ q: '', tag: '', mood: '', from: '', to: '' });
  const tags = [...new Set(posts.flatMap((p) => p.tags))];
  const list = posts
    .filter((p) => (!f.q || (p.title + p.html).toLowerCase().includes(f.q.toLowerCase())) && (!f.tag || p.tags.includes(f.tag)) && (!f.mood || p.mood === f.mood) && (!f.from || p.date >= f.from) && (!f.to || p.date <= f.to))
    .sort((a, b) => b.date.localeCompare(a.date));
  const open = posts.find((p) => p.id === openId);

  const create = () => {
    const id = uid();
    update((d) => void d.posts.push({ id, title: '', date: ymd(), mood: 'cozy', tags: [], html: '', isPublic: false, updatedAt: new Date().toISOString() }));
    setOpenId(id);
  };

  return (
    <div className="space-y-4">
      <Box className="pt-4">
        <PageTitle sub="blog / journal — private by default, public posts show on your blog page">RAMBLE ✎</PageTitle>
        <div className="flex gap-2 flex-wrap"><Btn onClick={create}>+ new post</Btn><a href="/blog" target="_blank" rel="noreferrer"><Btn variant="sky">🌐 view public blog</Btn></a></div>
      </Box>
      <AnimatePresence mode="wait">
        {open ? (
          <PostEditor key={open.id} post={open} onClose={() => setOpenId(null)} />
        ) : (
          <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <Box title="search & filter" delay={0.05}>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <Input placeholder="search…" className="col-span-2 sm:col-span-1" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} />
                <Select value={f.tag} onChange={(e) => setF({ ...f, tag: e.target.value })}><option value="">any tag</option>{tags.map((t) => <option key={t}>{t}</option>)}</Select>
                <Select value={f.mood} onChange={(e) => setF({ ...f, mood: e.target.value })}><option value="">any mood</option>{MOODS.map((m) => <option key={m} value={m}>{MOOD_EMOJI[m]} {m}</option>)}</Select>
                <Input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value })} title="from" />
                <Input type="date" value={f.to} onChange={(e) => setF({ ...f, to: e.target.value })} title="to" />
              </div>
            </Box>
            <Box title={`posts · ${list.length}`} delay={0.1}>
              {list.length ? (
                <div className="space-y-2">
                  {list.map((p, i) => (
                    <motion.button key={p.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }} whileHover={{ x: 4 }}
                      onClick={() => setOpenId(p.id)} className="w-full text-left border-2 border-line/40 rounded-xl p-2 bg-panel2 block">
                      <div className="flex justify-between gap-2"><b className="font-round">{MOOD_EMOJI[p.mood]} {p.title || 'untitled'}</b><span className="text-[13px] text-muted shrink-0">{prettyDate(p.date)}</span></div>
                      <p className="text-[15px] text-muted line-clamp-2">{p.html.replace(/<[^>]+>/g, ' ').slice(0, 160)}</p>
                      <div className="flex gap-1 mt-1 flex-wrap">{p.isPublic ? <Tag color="var(--sky)">🌐 public</Tag> : <Tag>🔒 private</Tag>}{p.tags.map((t) => <Tag key={t}>#{t}</Tag>)}</div>
                    </motion.button>
                  ))}
                </div>
              ) : <Empty>no posts yet — write something!</Empty>}
            </Box>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ToolBtn({ on, children, onClick, title }: { on?: boolean; children: React.ReactNode; onClick: () => void; title: string }) {
  return <button type="button" title={title} onClick={onClick} className="min-w-8 h-8 px-1.5 rounded-lg border-2 border-line text-[14px] font-bold transition hover:-translate-y-0.5" style={{ background: on ? 'var(--sage)' : 'var(--panel2)' }}>{children}</button>;
}

function Toolbar({ editor }: { editor: Editor }) {
  const file = useRef<HTMLInputElement>(null);
  return (
    <div className="flex flex-wrap gap-1 mb-2">
      <ToolBtn title="heading 1" on={editor.isActive('heading', { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}>H1</ToolBtn>
      <ToolBtn title="heading 2" on={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</ToolBtn>
      <ToolBtn title="bold" on={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>B</ToolBtn>
      <ToolBtn title="italic" on={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}><i>i</i></ToolBtn>
      <ToolBtn title="bullet list" on={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>• list</ToolBtn>
      <ToolBtn title="numbered list" on={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1. list</ToolBtn>
      <ToolBtn title="quote" on={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>❝</ToolBtn>
      <ToolBtn title="code block" on={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>{'</>'}</ToolBtn>
      <ToolBtn title="image" onClick={() => file.current?.click()}>🖼</ToolBtn>
      <input ref={file} type="file" accept="image/*" className="hidden" onChange={(e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        const img = new window.Image();
        const r = new FileReader();
        r.onload = () => {
          img.onload = () => {
            // downscale so posts stay small
            const scale = Math.min(1, 900 / img.width);
            const c = document.createElement('canvas');
            c.width = img.width * scale; c.height = img.height * scale;
            c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height);
            editor.chain().focus().setImage({ src: c.toDataURL('image/jpeg', 0.8) }).run();
          };
          img.src = String(r.result);
        };
        r.readAsDataURL(f);
        e.target.value = '';
      }} />
      <ToolBtn title="undo" onClick={() => editor.chain().focus().undo().run()}>↶</ToolBtn>
      <ToolBtn title="redo" onClick={() => editor.chain().focus().redo().run()}>↷</ToolBtn>
    </div>
  );
}

function PostEditor({ post, onClose }: { post: Post; onClose: () => void }) {
  const [saved, setSaved] = useState('saved');
  const [tag, setTag] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const set = (patch: Partial<Post>) => update((d) => Object.assign(d.posts.find((p) => p.id === post.id)!, patch, { updatedAt: new Date().toISOString() }));
  const editor = useEditor({
    extensions: [StarterKit, Image, Placeholder.configure({ placeholder: 'ramble away… ✿' })],
    content: post.html,
    onUpdate: ({ editor: e }) => {
      setSaved('saving…');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { set({ html: e.getHTML() }); setSaved('draft autosaved ✓'); }, 700);
    },
  });
  useEffect(() => () => {
    clearTimeout(timer.current);
    if (editor && !editor.isDestroyed) set({ html: editor.getHTML() });
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}>
      <Box title="writing" right={<div className="flex gap-1.5 items-center"><span className="text-[13px] text-muted">{saved}</span><Btn small onClick={onClose}>done</Btn></div>}>
        <input className="w-full bg-transparent font-round font-extrabold text-[26px] outline-none mb-2" placeholder="post title" value={post.title} onChange={(e) => set({ title: e.target.value })} />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-2">
          <Field label="date"><Input type="date" value={post.date} onChange={(e) => set({ date: e.target.value })} /></Field>
          <Field label="mood"><Select value={post.mood} onChange={(e) => set({ mood: e.target.value })}>{MOODS.map((m) => <option key={m} value={m}>{MOOD_EMOJI[m]} {m}</option>)}</Select></Field>
          <Field label="visibility">
            <button onClick={() => set({ isPublic: !post.isPublic })} className="nest-input text-left transition" style={{ background: post.isPublic ? 'var(--sky)' : undefined }}>{post.isPublic ? '🌐 public' : '🔒 private'}</button>
          </Field>
          <Field label="add tag">
            <Input value={tag} onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && tag.trim()) { set({ tags: [...new Set([...post.tags, tag.trim()])] }); setTag(''); } }} placeholder="enter ↵" />
          </Field>
        </div>
        <div className="flex gap-1 flex-wrap mb-2">{post.tags.map((t) => <Tag key={t} onClick={() => set({ tags: post.tags.filter((x) => x !== t) })}>#{t} ✕</Tag>)}</div>
        {editor && <Toolbar editor={editor} />}
        <div className="nest-input prose-nest min-h-64"><EditorContent editor={editor} /></div>
        <div className="flex justify-end mt-2"><Btn small variant="ghost" onClick={() => { if (confirm('Delete this post?')) { update((d) => void (d.posts = d.posts.filter((p) => p.id !== post.id))); onClose(); } }}>🗑 delete</Btn></div>
      </Box>
    </motion.div>
  );
}
