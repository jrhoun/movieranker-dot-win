-- movieranker.win — upgrade for existing databases (run once in Supabase SQL editor)
-- Safe to re-run? No — run each statement once. Covers everything added after your first setup.

-- 1. List descriptions (optional blurbs on lists)
ALTER TABLE lists ADD COLUMN IF NOT EXISTS description text;

-- 2. Community shortlist theme proposals
create table if not exists shortlist_proposals (
  id text primary key,
  proposer_id uuid references auth.users(id),
  title text not null,
  blurb text,
  movie_ids jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);
alter table shortlist_proposals enable row level security;
create policy "propose own" on shortlist_proposals for insert with check (auth.uid() = proposer_id);
create policy "read own" on shortlist_proposals for select using (auth.uid() = proposer_id);
create policy "anyone reads approved" on shortlist_proposals for select using (status = 'approved');
