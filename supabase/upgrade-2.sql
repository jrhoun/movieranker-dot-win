-- Upgrade 2: server-side record of solved weekly-marquee connections.
-- Fixes the 'codebreaker' achievement, which was unearnable because the solve
-- count lived only in browser localStorage (unreadable by server components and
-- editable from the console). Run each statement once against the live DB.

create table if not exists marquee_solves (
  user_id uuid not null references auth.users(id) on delete cascade,
  theme_slug text not null,
  solved_at timestamptz not null default now(),
  primary key (user_id, theme_slug)
);

alter table marquee_solves enable row level security;

-- A user may record and read only their own solves. No cross-user reads: the
-- profile pages only ever need the viewer's own or the profile owner's count,
-- and a public count is not required by any achievement.
create policy "insert own solve" on marquee_solves for insert
  with check (auth.uid() = user_id);

create policy "read own solves" on marquee_solves for select
  using (auth.uid() = user_id);
