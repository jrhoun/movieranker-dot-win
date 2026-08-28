-- Upgrade 2: server-side record of weekly-marquee connection ATTEMPTS.
--
-- Fixes two defects at once:
--
-- 1. The 'codebreaker' achievement was unearnable: the solve count lived only in
--    browser localStorage, which server components cannot read and anyone can
--    edit from the console.
--
-- 2. The quiz was brute-forceable. The connection game offers four options, so a
--    client that simply POSTed guessIndex 0,1,2,3 was guaranteed a "solve". The
--    primary key below is the fix: the FIRST attempt for a (user, theme) is the
--    only one that can ever be recorded, right or wrong. `correct` is therefore
--    the honest outcome of one shot, which is exactly what the badge claims.
--
-- Run each statement once against the live DB.

create table if not exists marquee_solves (
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_slug text not null,
  -- The outcome of the user's single attempt. A wrong guess and a peek both
  -- record `false` and still consume the attempt.
  correct boolean not null default false,
  attempted_at timestamptz not null default now(),
  primary key (user_id, theme_slug)
);

-- Brings a table created by an earlier draft of this file up to date. The
-- create policy statements below are NOT idempotent — re-running this file on a
-- database that already has the policies will error on the first one. Drop them
-- first if you need to re-apply.
alter table marquee_solves add column if not exists correct boolean not null default false;
alter table marquee_solves add column if not exists attempted_at timestamptz not null default now();

alter table marquee_solves enable row level security;

-- A user may record and read only their own attempts. No cross-user reads: the
-- profile pages only ever need the viewer's own or the profile owner's count,
-- and a public count is not required by any achievement.
--
-- NOTE: there is deliberately no UPDATE and no DELETE policy. Without them RLS
-- denies both, so a client cannot overwrite a wrong first attempt with a right
-- one, nor delete the row to buy a second try. The one-attempt rule is enforced
-- by the database, not by the route handler.
create policy "insert own solve" on marquee_solves for insert
  with check (auth.uid() = user_id);

create policy "read own solves" on marquee_solves for select
  using (auth.uid() = user_id);
