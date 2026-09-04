-- Milestone 3: Community Upvoting System (R3)
-- Adds list_upvotes table, unique constraints, RLS policies, upvotes_count column on lists, and atomic counter trigger.

create table if not exists list_upvotes (
  id bigint generated always as identity primary key,
  list_id text not null references lists(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (list_id, user_id)
);

create index if not exists idx_list_upvotes_list_id on list_upvotes(list_id);
create index if not exists idx_list_upvotes_user_id on list_upvotes(user_id);

alter table lists add column if not exists upvotes_count int not null default 0;
create index if not exists idx_lists_trending on lists(visibility, status, upvotes_count desc, created_at desc);

alter table list_upvotes enable row level security;

-- Read policy: Anyone can see upvotes for readable done lists or lists they own
create policy "anyone reads upvotes for readable lists" on list_upvotes
  for select using (
    exists (
      select 1 from lists l
      where l.id = list_id
        and (l.owner_id = auth.uid() or (l.status = 'done' and l.visibility in ('unlisted','public')))
    )
  );

-- Insert policy: Authenticated users can upvote readable done lists
create policy "authenticated users upvote readable done lists" on list_upvotes
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from lists l
      where l.id = list_id
        and l.status = 'done'
        and l.visibility in ('unlisted', 'public')
    )
  );

-- Delete policy: Authenticated users can remove their own upvote
create policy "authenticated users remove own upvote" on list_upvotes
  for delete using (auth.uid() = user_id);

-- Trigger for atomic upvotes_count maintenance
create or replace function update_list_upvote_count()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update lists set upvotes_count = upvotes_count + 1 where id = NEW.list_id;
  elsif (TG_OP = 'DELETE') then
    update lists set upvotes_count = greatest(0, upvotes_count - 1) where id = OLD.list_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_list_upvotes_count on list_upvotes;
create trigger trg_list_upvotes_count
after insert or delete on list_upvotes
for each row execute function update_list_upvote_count();
