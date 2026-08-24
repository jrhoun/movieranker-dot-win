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
alter table lists enable row level security;
create policy "owner all" on lists for all using (auth.uid() = owner_id);
alter table list_movies enable row level security;
create policy "owner via list" on list_movies for all using (
  exists (select 1 from lists l where l.id = list_id and l.owner_id = auth.uid())
);
create policy "anyone reads done lists" on lists for select using (status = 'done');
create policy "anyone reads done movies" on list_movies for select using (
  exists (select 1 from lists l where l.id = list_id and l.status = 'done')
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
