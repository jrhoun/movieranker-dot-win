-- Feedback table for user bug reports, feature ideas, and general feedback.
-- Writes happen via service-role admin client; RLS is enabled with no anon/public policies.

create table if not exists public.feedback (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  category text not null check (category in ('bug', 'idea', 'other')),
  message text not null,
  email text,
  user_id uuid references auth.users(id) on delete set null,
  page_url text,
  user_agent text
);

create index if not exists idx_feedback_created_at on public.feedback(created_at desc);

alter table public.feedback enable row level security;
