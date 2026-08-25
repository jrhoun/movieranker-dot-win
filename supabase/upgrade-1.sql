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

-- 3. Profile Era v0 — list visibility (private done lists become owner-only)
ALTER TABLE lists ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'unlisted'
  CHECK (visibility IN ('unlisted','public','private'));
DROP POLICY IF EXISTS "anyone reads done lists" ON lists;
CREATE POLICY "anyone reads done lists" ON lists FOR SELECT USING (
  status = 'done' AND visibility IN ('unlisted','public'));
DROP POLICY IF EXISTS "anyone reads done movies" ON list_movies;
CREATE POLICY "anyone reads done movies" ON list_movies FOR SELECT USING (
  EXISTS (SELECT 1 FROM lists l WHERE l.id = list_id AND l.status = 'done'
    AND l.visibility IN ('unlisted','public')));
