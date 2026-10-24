import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Box, Bar, Btn, Empty, PageTitle, Stagger, Item, Tag } from '../components/ui';
import { Hero } from '../components/Hero';
import { useStore, update, markStudied } from '../store/store';
import { activeSubjects, avgMastery, buildNudges, cardsDue, topicMastery } from '../store/derive';
import { behindBy } from '../lib/planner';
import { streak } from '../lib/mastery';
import { diffDays, prettyDate, ymd } from '../lib/dates';

function Countdown({ label, date, color }: { label: string; date: string; color: string }) {
  const d = diffDays(ymd(), date);
  return (
    <motion.div whileHover={{ scale: 1.04, rotate: -1 }} className="flex items-center gap-2 border-2 border-line rounded-xl px-2 py-1 bg-panel2">
      <div className="w-12 h-12 rounded-lg border-2 border-line grid place-items-center font-bubble text-[18px]" style={{ background: color, color: '#3e3a2e' }}>{d}</div>
      <div className="leading-tight text-[15px]">
        <div className="font-bold">{label}</div>
        <div className="text-muted">{d === 0 ? 'today!!' : `${d} day${d === 1 ? '' : 's'} · ${prettyDate(date)}`}</div>
      </div>
    </motion.div>
  );
}

export default function Dashboard() {
  const s = useStore((x) => x);
  const today = ymd();
  const subs = activeSubjects(s);
  const mastery = topicMastery(s, today);
  const tasks = s.planTasks.filter((t) => t.date === today);
  const due = cardsDue(s, today);
  const nudges = buildNudges(s, today);
  const st = streak(s.studyDays, today);
  const topicsLive = s.topics.filter((t) => subs.some((x) => x.id === t.subjectId));
  const weakest = topicsLive.filter((t) => mastery[t.id] !== null).sort((a, b) => mastery[a.id]! - mastery[b.id]!).slice(0, 5);
  const overdue = topicsLive.filter((t) => !t.lastRevised || diffDays(t.lastRevised, today) > 7).slice(0, 6);
  const name = (id: string) => s.topics.find((t) => t.id === id)?.name ?? '?';
  const sub = (id: string) => s.subjects.find((x) => x.id === id);
  const countdowns = subs
    .flatMap((x) => [
      x.examDate && { label: `${x.name} exam`, date: x.examDate, color: x.color },
      x.practicalDate && { label: `${x.name} practical`, date: x.practicalDate, color: 'var(--lilac)' },
    ])
    .filter((c): c is { label: string; date: string; color: string } => !!c && c.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));

  const toggle = (id: string) => {
    update((d) => {
      const t = d.planTasks.find((x) => x.id === id)!;
      t.done = !t.done;
      const topic = d.topics.find((x) => x.id === t.topicId);
      if (t.done && topic) topic.lastRevised = today;
    });
    markStudied();
  };

  return (
    <div className="space-y-4">
      <Box className="pt-4">
        <PageTitle>WELCOME BACK {s.settings.name.toUpperCase()} !!</PageTitle>
        <p className="text-[17px] mb-3">
          disclaimer!! this is your study nest. {tasks.length ? <>you have <b>{tasks.filter((t) => !t.done).length}</b> task{tasks.length === 1 ? '' : 's'} left today</> : 'no tasks planned for today'}
          {due.length ? <> and <b>{due.length}</b> flashcard{due.length === 1 ? '' : 's'} due</> : null}. take it slow, sip some water and have fun ♡
        </p>
        <Hero>
          <div className="flex flex-wrap gap-2">
            <span className="nest-tag bg-panel">🔥 {st}-day streak</span>
            {countdowns[0] && <span className="nest-tag bg-panel">⏳ {countdowns[0].label} in {diffDays(today, countdowns[0].date)}d</span>}
          </div>
        </Hero>
      </Box>

      <div className="grid gap-4 md:grid-cols-2">
        <Box title="today's tasks" delay={0.05} right={<Link to="/subjects/plan"><Btn small variant="ghost">plan →</Btn></Link>}>
          {tasks.length ? (
            <Stagger className="space-y-1.5">
              {tasks.map((t) => (
                <Item key={t.id}>
                  <label className="flex items-start gap-2 cursor-pointer group">
                    <input type="checkbox" className="checkbox mt-0.5" checked={t.done} onChange={() => toggle(t.id)} />
                    <span className={`flex-1 transition-all ${t.done ? 'line-through text-muted' : ''}`}>
                      {name(t.topicId)}
                      <span className="text-[13px] text-muted"> · {sub(t.subjectId)?.name} · {t.hours}h {t.kind === 'revision' ? '· revision ↻' : ''}</span>
                    </span>
                  </label>
                </Item>
              ))}
            </Stagger>
          ) : (
            <Empty>no tasks today ✿ <Link className="underline" to="/subjects/plan">make a plan</Link></Empty>
          )}
          <hr className="nest-divider my-2" />
          <div className="flex items-center justify-between">
            <span><b>{due.length}</b> flashcards due</span>
            <Link to="/assessment"><Btn small variant="pink">review ♡</Btn></Link>
          </div>
        </Box>

        <Box title="countdowns" delay={0.1}>
          <div className="space-y-2">
            {countdowns.length ? countdowns.slice(0, 4).map((c) => <Countdown key={c.label} {...c} />) : <Empty>add exam dates in subjects</Empty>}
          </div>
        </Box>

        <Box title="weakest topics" delay={0.15}>
          {weakest.length ? (
            <Stagger className="space-y-2">
              {weakest.map((t) => (
                <Item key={t.id} className="text-[16px]">
                  <div className="flex justify-between gap-2"><span className="truncate">{t.name}</span><b>{mastery[t.id]}%</b></div>
                  <Bar value={mastery[t.id]} color={mastery[t.id]! < 40 ? 'var(--pink)' : 'var(--butter)'} />
                </Item>
              ))}
            </Stagger>
          ) : <Empty>no data yet — take a quiz!</Empty>}
        </Box>

        <Box title="overdue for revision" delay={0.2}>
          {overdue.length ? (
            <div className="flex flex-wrap gap-1.5">
              {overdue.map((t) => (
                <Tag key={t.id} color={sub(t.subjectId)?.color} title={t.lastRevised ? `last revised ${prettyDate(t.lastRevised)}` : 'never revised'}>
                  {t.name} {t.lastRevised ? `· ${diffDays(t.lastRevised, today)}d` : '· new'}
                </Tag>
              ))}
            </div>
          ) : <Empty>everything is fresh ✨</Empty>}
        </Box>
      </div>

      <Box title="subject mastery & plan progress" delay={0.25}>
        {subs.length ? (
          <div className="space-y-3">
            {subs.map((x) => {
              const ids = s.topics.filter((t) => t.subjectId === x.id).map((t) => t.id);
              const m = avgMastery(ids, mastery);
              const b = behindBy(s.planTasks.filter((t) => t.subjectId === x.id), today);
              const pTasks = s.planTasks.filter((t) => t.subjectId === x.id);
              const done = pTasks.filter((t) => t.done).length;
              return (
                <div key={x.id}>
                  <div className="flex justify-between flex-wrap gap-1 text-[16px]">
                    <b>{x.name}</b>
                    <span className="text-muted text-[14px]">
                      mastery {m === null ? 'not started' : m + '%'} · plan {done}/{pTasks.length} · {b.days ? <span className="text-[#c0606f]">behind by {b.days}d</span> : 'on track ✓'}
                    </span>
                  </div>
                  <Bar value={m} color={x.color} />
                </div>
              );
            })}
          </div>
        ) : <Empty>no subjects yet — <Link to="/subjects" className="underline">add one</Link></Empty>}
      </Box>

      <div className="lg:hidden">
        <Box title="chatbox" delay={0.3}>
          <ul className="space-y-1.5 text-[16px]">{nudges.map((n) => <li key={n}>🐱 {n}</li>)}</ul>
        </Box>
      </div>

      <div className="grid md:grid-cols-[1fr_1.3fr] gap-4">
        <Box title="site updates" delay={0.3}>
          <div className="border-l-4 border-sage pl-3 space-y-2 text-[15px] max-h-56 overflow-y-auto nest-scroll">
            {s.posts.slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4).map((p) => (
              <div key={p.id}><div className="text-muted text-[13px]">{prettyDate(p.date)}</div><Link to="/ramble" className="hover:underline">{p.title}</Link></div>
            ))}
            {s.generatedPapers.slice(-2).map((p) => (
              <div key={p.id}><div className="text-muted text-[13px]">{prettyDate(p.createdAt.slice(0, 10))}</div>generated “{p.title}”{p.scored !== undefined ? ` — scored ${p.scored}/${p.totalMarks}` : ''}</div>
            ))}
          </div>
        </Box>
        <Box delay={0.35}>
          <p className="text-[17px]">
            ELLO! it's me, {s.settings.name}! welcome to my lil corner of the internet :D this nest holds my syllabus, PYQs, practicals and rambles. it makes plans and papers with plain old rules (no AI here!) and tracks what i'm weak at.
          </p>
          <p className="font-bubble text-[22px] mt-3 text-sage-dark" style={{ animation: 'bob 3s ease-in-out infinite', display: 'inline-block' }}>enjoy your stay !!</p>
        </Box>
      </div>
    </div>
  );
}
