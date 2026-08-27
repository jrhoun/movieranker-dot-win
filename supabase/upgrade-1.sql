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
drop policy if exists "propose own" on shortlist_proposals;
create policy "propose own" on shortlist_proposals for insert with check (auth.uid() = proposer_id);
drop policy if exists "read own" on shortlist_proposals;
create policy "read own" on shortlist_proposals for select using (auth.uid() = proposer_id);
drop policy if exists "anyone reads approved" on shortlist_proposals;
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

-- 4. Profile handles — new table + policies, no ALTERs. Run once.
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  visibility text not null default 'private' check (visibility in ('private','public')),
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
drop policy if exists "read any" on profiles;
create policy "read any" on profiles for select using (true);
drop policy if exists "write own" on profiles;
create policy "write own" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);

-- 5. Profile showcase curation (pinned achievements max 3 + one featured ranking).
-- Shape: { "achievementKeys": ["first_premiere"], "favoriteListId": "abc" }.
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS showcase jsonb NOT NULL DEFAULT '{}';

-- 6. Real Participants — account-to-participant-chip attributions. Brand-new
-- table + policies, no ALTERs. Run once (see schema.sql canonical block).
create table if not exists participant_attributions (
  id bigint generated always as identity primary key,
  list_id text not null references lists(id) on delete cascade,
  display_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);
alter table participant_attributions enable row level security;
drop policy if exists "claim own on readable lists" on participant_attributions;
create policy "claim own on readable lists" on participant_attributions for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from lists l where l.id = list_id
        and (l.owner_id = auth.uid()
             or (l.status = 'done' and l.visibility in ('unlisted','public')))
    )
  );
drop policy if exists "read via list" on participant_attributions;
create policy "read via list" on participant_attributions for select using (
  exists (
    select 1 from lists l where l.id = list_id
      and (l.owner_id = auth.uid()
           or (l.status = 'done' and l.visibility in ('unlisted','public')))
  )
);
drop policy if exists "remove own claim" on participant_attributions;
create policy "remove own claim" on participant_attributions for delete
  using (auth.uid() = user_id);

-- 7. Curated Lock Mode — themed lists from Tonight's Shortlist.
ALTER TABLE lists ADD COLUMN IF NOT EXISTS theme_slug text;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS curated boolean NOT NULL DEFAULT false;

-- 8. Atomic list creation RPC (drop and replace to ensure current columns are mapped)
create or replace function save_list(
  p_id text, p_title text, p_description text,
  p_participants text[], p_status text, p_movies jsonb
) returns void
language plpgsql
security invoker
as $$
begin
  insert into lists (id, owner_id, title, description, participants, status)
  values (p_id, auth.uid(), p_title, p_description, p_participants, p_status);

  insert into list_movies
    (list_id, tmdb_id, title, poster_path, release_year, elo, comparisons, parked, final_rank)
  select
    p_id, tmdb_id, title, poster_path, release_year,
    coalesce(elo, 1000), coalesce(comparisons, 0),
    coalesce(parked, false), final_rank
  from jsonb_to_recordset(p_movies) as x(
    tmdb_id int, title text, poster_path text, release_year int,
    elo real, comparisons int, parked boolean, final_rank int
  );
end;
$$;

-- 9. Referral tracking (stores which user referred this profile).
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES auth.users(id);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);
