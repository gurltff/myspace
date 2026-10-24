# StudyNest ✿

A personal study companion for B.Sc. Physics (Hons): semesters & syllabus, a rule-based study planner,
PYQ bank with OCR, paper-pattern analysis, numerical value changer, similar-question generator,
practice papers with PDF export, practicals, Leitner flashcards, a mastery-score tutor dashboard and a blog.

**No AI anywhere** — every "smart" feature is plain rules and algorithms in [`src/lib`](src/lib), covered by Vitest tests.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for all rule-based logic
npm run build      # production build in dist/
```

Demo data (one Mechanics subject with syllabus, 2 PYQs, 1 experiment, flashcards, a post) loads on first visit.
Settings → "start fresh" clears it.

## Storage modes

| mode | when | where data lives |
| --- | --- | --- |
| offline (default) | no env variables | this browser (localStorage + IndexedDB for files) |
| synced | Supabase env variables set | Supabase Postgres (RLS: only you) + Storage, cached locally |

### Supabase setup (optional)

1. Create a project at supabase.com.
2. SQL editor → run [`supabase/schema.sql`](supabase/schema.sql) (tables, RLS policies, private storage bucket).
3. Authentication → Providers → Email: enabled.
4. Copy `.env.example` to `.env.local` and fill in:
   ```
   VITE_SUPABASE_URL=https://xxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
5. Restart `npm run dev`. The app now asks you to log in; public Ramble posts appear at `/blog` for anyone.

## Deploy

**Netlify:** `netlify.toml` is included (build `npm run build`, publish `dist`, SPA redirect). Add the two
`VITE_SUPABASE_*` variables in Site settings → Environment variables if you use Supabase.

**Vercel:** framework preset "Vite", build `npm run build`, output `dist`, add a rewrite of `/(.*)` → `/index.html`.

## Where things are

```
src/lib/         rule-based logic (+ lib.test.ts)
  syllabus.ts    unit/topic parser with split & undo
  questions.ts   PYQ splitter: Q1 / 1. / (a) / (i), marks, sections, "attempt any five"
  tagging.ts     keyword topic suggestion
  repeats.ts     Jaccard repeat detection ("Frequently Asked ×N")
  pattern.ts     paper pattern & weightage analysis
  numerical.ts   quantity detection, variants, sig-figs, math.js answers
  stems.ts       question stems, topic groups, similar questions
  paperGen.ts    weighted practice-paper selection
  planner.ts     study plan, revision window, rescheduling
  leitner.ts     5-box spaced repetition
  mastery.ts     mastery score, nudges, streak
  observations.ts  practical observation tables
  extract.ts     pdf.js text + Tesseract OCR (assets self-hosted in /tesseract)
src/store/       data model, local persistence, Supabase sync, seed data
src/pages/       Dashboard, Subjects & Plan, PYQs & Papers, Practicals, Assessment, Ramble, Blog, Settings
```
