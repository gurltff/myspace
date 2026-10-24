-- StudyNest — Supabase setup. Run this once in the Supabase SQL editor.
-- All study data is stored as one JSON document per user, protected by Row Level Security.

create table if not exists public.user_snapshots (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.user_snapshots enable row level security;
create policy "own snapshot - read"   on public.user_snapshots for select using (auth.uid() = user_id);
create policy "own snapshot - insert" on public.user_snapshots for insert with check (auth.uid() = user_id);
create policy "own snapshot - update" on public.user_snapshots for update using (auth.uid() = user_id);

-- Ramble posts marked public: anyone can read, only the author can write.
create table if not exists public.public_posts (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  author text,
  title text,
  html text,
  date date,
  mood text,
  tags text[] default '{}'
);
alter table public.public_posts enable row level security;
create policy "public posts - read"   on public.public_posts for select using (true);
create policy "public posts - insert" on public.public_posts for insert with check (auth.uid() = user_id);
create policy "public posts - delete" on public.public_posts for delete using (auth.uid() = user_id);

-- Private bucket for uploaded PYQs and circuit images: users/<uid>/<file>
insert into storage.buckets (id, name, public) values ('studynest', 'studynest', false) on conflict do nothing;
create policy "own files - read"   on storage.objects for select using (bucket_id = 'studynest' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files - insert" on storage.objects for insert with check (bucket_id = 'studynest' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "own files - delete" on storage.objects for delete using (bucket_id = 'studynest' and (storage.foldername(name))[1] = auth.uid()::text);
