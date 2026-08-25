-- movieranker.win v1 schema. Run manually in the Supabase dashboard SQL editor.

create table lists (
  id text primary key,
  owner_id uuid not null references auth.users(id),
  title text not null,
  description text,
  participants text[] not null default '{}',
  status text not null default 'draft',
  created_at timestamptz not null default now()
);
create table list_movies (
  id bigint generated always as identity primary key,
  list_id text not null references lists(id) on delete cascade,
  tmdb_id int not null, title text not null, poster_path text, release_year int,
  elo real not null default 1000, comparisons int not null default 0,
  parked boolean not null default false, final_rank int
);
create unique index list_movies_list_tmdb_unique on list_movies (list_id, tmdb_id);
alter table lists add constraint lists_status_check check (status in ('draft','ranking','done'));
-- List visibility: unlisted (default; direct link only), public, private (owner-only even when done).
alter table lists add column if not exists visibility text not null default 'unlisted'
  check (visibility in ('unlisted','public','private'));
alter table lists enable row level security;
create policy "owner all" on lists for all using (auth.uid() = owner_id);
alter table list_movies enable row level security;
create policy "owner via list" on list_movies for all using (
  exists (select 1 from lists l where l.id = list_id and l.owner_id = auth.uid())
);
-- Private done lists stay owner-only; unlisted/public done lists are readable by link.
create policy "anyone reads done lists" on lists for select using (
  status = 'done' and visibility in ('unlisted','public')
);
create policy "anyone reads done movies" on list_movies for select using (
  exists (
    select 1 from lists l
    where l.id = list_id and l.status = 'done' and l.visibility in ('unlisted','public')
  )
);

-- Atomic list creation: inserts the list and its movies in one transaction.
-- SECURITY INVOKER so RLS applies to the caller. NOTE: re-run this RPC after
-- any future schema change (drop/recreate below).
create or replace function save_list(
  p_id text, p_title text, p_description text,
  p_participants text[], p_status text, p_movies jsonb
) returns void
language plpgsql
security invoker
-- No `set search_path = ''`: that idiom is for SECURITY DEFINER functions;
-- here it would break the unqualified lists/list_movies references at runtime.
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

-- For existing databases:
-- ALTER TABLE lists ADD COLUMN description text;
-- Then re-run the save_list RPC above (drop/recreate) so POSTs can set it.
--
-- Profile Era v0 — list visibility. Run each statement once (see upgrade-1.sql):
-- ALTER TABLE lists ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'unlisted'
--   CHECK (visibility IN ('unlisted','public','private'));
-- DROP POLICY IF EXISTS "anyone reads done lists" ON lists;
-- CREATE POLICY "anyone reads done lists" ON lists FOR SELECT USING (
--   status = 'done' AND visibility IN ('unlisted','public'));
-- DROP POLICY IF EXISTS "anyone reads done movies" ON list_movies;
-- CREATE POLICY "anyone reads done movies" ON list_movies FOR SELECT USING (
--   EXISTS (SELECT 1 FROM lists l WHERE l.id = list_id AND l.status = 'done'
--     AND l.visibility IN ('unlisted','public')));

-- Community theme proposals for "Tonight's Shortlist" (added after v1).
-- Safe to run on existing databases: brand-new table + policies, no ALTERs.
create table shortlist_proposals (
  id text primary key,
  proposer_id uuid references auth.users(id),
  title text not null,
  blurb text,
  movie_ids jsonb not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz default now()
);
alter table shortlist_proposals enable row level security;
create policy "propose own" on shortlist_proposals for insert
  with check (auth.uid() = proposer_id);
create policy "read own" on shortlist_proposals for select
  using (auth.uid() = proposer_id);
create policy "anyone reads approved" on shortlist_proposals for select
  using (status = 'approved');
-- Approve/reject happens via /api/admin/proposals (OWNER_EMAIL-gated, server-side);
-- no SQL policy grants updates.

-- Real Participants (#5): links a signed-in user to a participant chip.
-- One attribution per user per list (unique). RLS insert mirrors the lists
-- read policy: drafts = owner only, done+unlisted/public = anyone with the link.
create table participant_attributions (
  id bigint generated always as identity primary key,
  list_id text not null references lists(id) on delete cascade,
  display_name text not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);
alter table participant_attributions enable row level security;
create policy "claim own on readable lists" on participant_attributions for insert
  with check (
    auth.uid() = user_id and exists (
      select 1 from lists l where l.id = list_id
        and (l.owner_id = auth.uid()
             or (l.status = 'done' and l.visibility in ('unlisted','public')))
    )
  );
create policy "read via list" on participant_attributions for select using (
  exists (
    select 1 from lists l where l.id = list_id
      and (l.owner_id = auth.uid()
           or (l.status = 'done' and l.visibility in ('unlisted','public')))
  )
);
create policy "remove own claim" on participant_attributions for delete
  using (auth.uid() = user_id);

-- Profile handles ("Premiere Night" profiles). New table — no ALTERs, so this
-- block is safe to run on existing databases (run once; see upgrade-1.sql §4).
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  handle text unique not null,
  visibility text not null default 'private' check (visibility in ('private','public')),
  -- Showcase curation: { achievementKeys: string[] (max 3), favoriteListId: text|null }.
  -- Validated app-side; favoriteListId must reference an owned public done list to render.
  showcase jsonb not null default '{}',
  created_at timestamptz not null default now()
);
alter table profiles enable row level security;
create policy "read any" on profiles for select using (true);
create policy "write own" on profiles for all
  using (auth.uid() = id) with check (auth.uid() = id);
