-- Achievements / Triumphs (R4): make `profiles.showcase` a SERVER-WRITTEN column,
-- and give a settled list a frozen, narrow record of how it was settled.
--
-- Companion to docs/superpowers/specs/2026-09-03-achievements-triumphs-and-cosmetics-design.md
-- (revised 2026-09-04). That spec's §9.1 used to claim "Zero Database Migrations
-- Required". This file is the migration it needed.
--
-- ===========================================================================
-- DEPLOY ORDERING — READ THIS FIRST
-- ===========================================================================
--
-- PART A (revoke + RPC) MUST BE APPLIED **BEFORE** THE APP CODE THAT USES THE
-- RPC SHIPS, AND THE APP CODE MUST SHIP **BEFORE** ANYONE RELIES ON SHOWCASE
-- WRITES AGAIN. The window between the two is a window in which showcase writes
-- FAIL, and they fail QUIETLY at two of the three call sites:
--
--   1. src/app/(site)/u/profile/page.tsx ~line 300 fires the lifetime-XP ratchet
--      as a floating `void supabase.from("profiles").update({ showcase })` with
--      no error handling at all. After the revoke it returns 42501 and nothing
--      anywhere looks at the result. The user's banked XP silently stops
--      ratcheting; because the ratchet is `max(stored, computed)` the damage is
--      not permanent, but it is invisible.
--   2. src/app/api/profile/route.ts ~line 402 sends `visibility` and `showcase`
--      in ONE `.update(update)`. After the revoke that statement fails as a
--      whole, so a visibility toggle that happens to travel with a showcase
--      patch also stops working. This one at least surfaces as a 500.
--
-- Therefore the correct order is:
--
--   1. Apply PART A of this file to the database.  (Writes start failing.)
--   2. Ship the app code that routes every showcase write through
--      `set_profile_showcase` (see the CALL SITES list at the bottom).
--   3. Only then build anything that depends on showcase-backed rewards.
--
-- Step 2 needs `SUPABASE_SERVICE_ROLE_KEY` set in the deploy environment — see
-- the note on the grant below. Today that variable is optional (only account
-- deletion and the admin routes touch it). After this migration it is REQUIRED
-- for ordinary profile customisation. Set it before step 1.
--
-- PART B (settle facts) and PART C (own-upvote reads) are independent of Part A
-- and of each other. Part B is only needed by the achievements described in the
-- spec's §3.3; Part C only by `film_club_patron`. Applying them early is
-- harmless: both are additive and no code reads them until it is written.
--
-- Every statement below is idempotent (`if not exists` / `or replace` /
-- `drop ... if exists` before `create`), so the file may be re-run. Run it
-- against the live DB the way the other files here are run: paste into the
-- Supabase dashboard SQL editor.
--
-- NOTE: supabase/schema.sql is a run-manually reference document and is NOT
-- edited by this migration. The changes it needs to absorb, whenever someone
-- next reconciles it, are listed under SCHEMA.SQL RECONCILIATION at the bottom.


-- ===========================================================================
-- PART A.1 — Revoke client UPDATE on profiles.showcase
-- ===========================================================================
--
-- WHY. supabase/schema.sql grants:
--
--     create policy "write own" on profiles for all
--       using (auth.uid() = id) with check (auth.uid() = id);
--
-- and the browser holds a real authenticated PostgREST client
-- (src/lib/supabase/client.ts). So any signed-in user can, from devtools,
-- run the equivalent of
--
--     supabase.from("profiles").update({ showcase: { lifetimeXp: 999999 } })
--                              .eq("id", myOwnId)
--
-- and RLS is satisfied, because it IS their own row. Every guard in
-- /api/profile — the `delete clientShowcase.lifetimeXp` strip, `validateClaims`,
-- `validateEquipPatch`, the MIN_PIN_LIST_LEVEL gate, the `taglineText` strip —
-- defends the API path only. None of it is in the way of this.
--
-- That hole is already known to have been exploited by accident rather than
-- malice: supabase/audit-lifetime-xp.sql exists precisely because two earlier
-- bugs inflated `lifetimeXp`, and it documents that the value is a RATCHET, so
-- "any row inflated while those bugs were live stays inflated forever". The
-- Triumphs design moves `claimedAchievements` (which pays XP, hence career
-- level, hence MIN_PROPOSAL_LEVEL and MIN_PIN_LIST_LEVEL), `unopenedCanisters`
-- (a counter that mints loot rolls) and `unlockedStubStyles` into the same
-- self-writable blob. `POST /api/profile/canister/open` cannot be a gate on a
-- counter the client can simply overwrite.
--
-- Column-level privileges compose with RLS and are checked BEFORE it, so this
-- closes the direct-PostgREST path without touching a single policy.
--
-- ---------------------------------------------------------------------------
-- THE ONE THING THAT IS EASY TO GET WRONG HERE
-- ---------------------------------------------------------------------------
-- You cannot revoke a column privilege out from under a TABLE-level grant.
-- PostgreSQL's REVOKE reference is explicit about it:
--
--     "if a role has been granted privileges on a table, then revoking the
--      same privileges from individual columns will have no effect."
--
-- Supabase's bootstrap grants table-level UPDATE on everything in `public` to
-- `anon`, `authenticated` and `service_role`. So the naive
--
--     revoke update (showcase) on profiles from authenticated;   -- DOES NOTHING
--
-- is a no-op that reports success. The working form is: revoke the table-level
-- privilege, then grant back, per column, exactly what the client still needs.
--
-- ROLE NAMES. This project uses the stock Supabase roles. No policy in
-- schema.sql, upgrade-1/2/3.sql or 20260902_list_upvotes.sql carries a `to <role>`
-- clause, so every policy applies to PUBLIC and role separation here comes from
-- the JWT-mapped roles only: `anon` (unauthenticated visitors),
-- `authenticated` (signed-in users, which is what both the browser client and
-- the cookie-based server client in src/lib/supabase/server.ts run as) and
-- `service_role` (src/lib/supabase/admin.ts, RLS-exempt). `anon` is revoked
-- alongside `authenticated` even though RLS already denies it every profiles
-- write: fail-closed costs nothing here, and this file should not depend on a
-- policy elsewhere staying correct.

revoke update on table public.profiles from anon, authenticated;

-- Granted back, one column at a time. Anything NOT listed here — `showcase`
-- today, and every column added to `profiles` in future — is server-write-only
-- by default, which is the direction this table should fail in.
--
--   handle       POST /api/profile upserts it (src/app/api/profile/route.ts:119).
--   referred_by  same upsert, first claim only.
--   visibility   PATCH /api/profile (src/app/api/profile/route.ts:402).
--   id           PostgREST renders `.upsert(payload, { onConflict: "id" })` as
--                INSERT ... ON CONFLICT (id) DO UPDATE SET id = excluded.id, ...
--                — every payload column lands in the SET list, `id` included,
--                so the UPDATE privilege is genuinely required for the upsert to
--                plan. Harmless: the "write own" policy's `with check
--                (auth.uid() = id)` means the only value that satisfies it is
--                the one already there.
--   created_at   deliberately absent. Nothing writes it.
grant update (id, handle, visibility, referred_by) on table public.profiles
  to authenticated;


-- ===========================================================================
-- PART A.2 — The server-side write path that replaces it
-- ===========================================================================
--
-- SECURITY DEFINER, following the conventions and cautions in schema.sql.
--
-- ON `set search_path = ''`. schema.sql's `save_list` carries this comment:
--
--     "No `set search_path = ''`: that idiom is for SECURITY DEFINER functions;
--      here it would break the unqualified lists/list_movies references at
--      runtime."
--
-- This function IS a SECURITY DEFINER function, so the idiom applies, and the
-- price of it is that every reference must be schema-qualified. `public.profiles`
-- below is qualified for exactly that reason; `pg_catalog` is always implicitly
-- searched, so the jsonb/size builtins need nothing. Do not "tidy" the qualifier
-- away — with an empty search_path the function stops resolving and starts
-- raising 42P01 at runtime, not at create time.
--
-- ON THE p_user_id ARGUMENT. It is an explicit parameter rather than `auth.uid()`
-- because the intended caller is `service_role`, which carries no end-user JWT
-- and for whom `auth.uid()` is NULL. Passing the id in also makes "whose
-- showcase am I writing" a visible, reviewable argument at every call site
-- instead of an ambient property of the client — which matters more than usual
-- here, because `supabaseAdmin()` bypasses RLS wholesale and a mis-scoped
-- `.eq("id", ...)` would be a cross-user write.
--
-- WHAT THIS FUNCTION DELIBERATELY DOES NOT DO. It does not validate the CONTENT
-- of the showcase — not ownership of an equipped cosmetic, not the poster-claim
-- allowance, not the pin-level gate, not the achievement tier being claimed.
-- All of that stays in TypeScript, in /api/profile and its siblings, where the
-- catalogue and the XP curve live. Re-implementing any of it in SQL would
-- create a second definition of rules that src/lib/career-xp.ts exists to keep
-- singular. What this function guarantees is narrower and structural: a well-
-- formed, size-bounded JSON object, written to exactly one existing row, by one
-- named, greppable code path.

create or replace function public.set_profile_showcase(
  p_user_id uuid,
  p_showcase jsonb
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_showcase jsonb;
begin
  if p_user_id is null then
    raise exception 'set_profile_showcase: p_user_id is required'
      using errcode = '22023';
  end if;

  -- `parseShowcase` in src/lib/public-profile.ts rejects arrays and non-objects
  -- on read; rejecting them on write too means a malformed row can never be
  -- stored in the first place, and a reader's null-return path stays a
  -- defensive branch rather than a state the DB can actually produce.
  if p_showcase is null or jsonb_typeof(p_showcase) <> 'object' then
    raise exception 'set_profile_showcase: showcase must be a JSON object'
      using errcode = '22023';
  end if;

  -- A ceiling, not a budget. The largest showcase the current design can
  -- produce is a few hundred bytes (3 pinned keys, an equipped block, a claim
  -- map, an avatarClaims list bounded by claimAllowance). 16 kB is far above
  -- that and far below "someone is using my profile row as object storage".
  if pg_column_size(p_showcase) > 16384 then
    raise exception 'set_profile_showcase: showcase exceeds 16 kB'
      using errcode = '54000';
  end if;

  update public.profiles
     set showcase = p_showcase
   where id = p_user_id
  returning showcase into v_showcase;

  -- Mirrors the API's own contract: a profiles row exists only once a handle is
  -- claimed, and /api/profile already answers 409 "claim a handle first" for
  -- this case. Raising rather than silently matching zero rows means the
  -- floating, unchecked ratchet write cannot fail invisibly for a NEW reason.
  if not found then
    raise exception 'set_profile_showcase: no profile row for %', p_user_id
      using errcode = 'P0002';
  end if;

  return v_showcase;
end;
$$;

-- EXECUTE IS DELIBERATELY *NOT* GRANTED TO `authenticated`.
--
-- Granting it there would reopen the exact hole Part A.1 closes: a devtools
-- `supabase.rpc("set_profile_showcase", { p_user_id: myId, p_showcase: {...} })`
-- is the revoked UPDATE with extra steps. Nothing in `showcase` is safe for a
-- client to author — not `lifetimeXp` (career level, and the pin/proposal
-- gates), not `avatarClaims` (unions on merge, so an unchecked claim is
-- permanent), not `equipped` (ownership is recomputed server-side from the
-- user's own finished lists), not `favoriteListId` (MIN_PIN_LIST_LEVEL plus an
-- ownership check), and not the three new reward fields. The column is
-- server-only, full stop.
--
-- Postgres grants EXECUTE on new functions to PUBLIC by default, and Supabase's
-- bootstrap additionally grants it to anon/authenticated, so both revokes are
-- load-bearing and must precede the grant.
revoke all on function public.set_profile_showcase(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.set_profile_showcase(uuid, jsonb)
  to service_role;

comment on function public.set_profile_showcase(uuid, jsonb) is
  'Sole write path for profiles.showcase. service_role only; content validation '
  'lives in TypeScript (/api/profile and siblings). See '
  'supabase/migrations/20260904_showcase_server_writes.sql.';

-- REJECTED ALTERNATIVE, recorded so it is not re-proposed: an argument-free,
-- `authenticated`-callable `bump_profile_lifetime_xp()` that recomputes career
-- XP in SQL from the caller's own lists / marquee_solves / referrals and
-- ratchets it. It would be forge-proof and would remove the service-role
-- dependency entirely, and the SQL already exists in draft form in
-- supabase/audit-lifetime-xp.sql. It is rejected because it would put a second
-- copy of the XP curve and the XP-source rules in the database — the precise
-- duplication src/lib/career-xp.ts's header says four divergent copies of this
-- calculation once caused. If that dependency ever becomes intolerable, revisit
-- it as a deliberate trade, not as a convenience.


-- ===========================================================================
-- PART B — Settle facts: what a list can prove about how it was settled
-- ===========================================================================
--
-- INDEPENDENT OF PART A. Needed only by the secret achievements the spec's §3.3
-- keeps ("Clean Sweep", "Midnight Screening"). Safe to apply early; nothing
-- reads these columns until the code that writes them ships.
--
-- WHY. src/lib/gamification.ts's header states the system's invariant: "every XP
-- source must be re-derivable from data we already query. Anything that cannot
-- be is not an XP source." Three of the spec's four proposed secrets failed that
-- test, because the facts they need are never persisted:
-- `PlaySession.history` (the win/loss record) lives in localStorage and dies
-- there; `list_movies` stores `elo` and `comparisons` but no matrix; and `lists`
-- has `created_at` but no settle time and no timezone.
--
-- These two columns are the narrowest thing that fixes it.
--
-- TRUST PROPERTIES, STATED PLAINLY. `settle_facts` is CLIENT-ASSERTED. The
-- browser is the only party that ever saw the duel history, so the server
-- cannot recompute these values; it can only decide whether to believe them.
-- What the design buys is not authenticity but a much smaller trust surface
-- than a mutable counter in a JSONB blob:
--
--   * bound to a real row — facts exist only alongside a `lists` row the user
--     genuinely owns, with genuine `list_movies`, at genuine `status = 'done'`;
--   * frozen — write-once, enforced by the trigger below, so there is no
--     retry, no re-roll, and no editing yesterday's list into a better one;
--   * bounded — an allowlisted key set and a 2 kB cap, so it cannot grow into
--     a general-purpose client scratchpad;
--   * NOT self-timestamping — `settled_at` is overwritten with server `now()`
--     regardless of what the client sends, so a backdated clock cannot mint
--     "Midnight Screening". Only `tzOffsetMinutes` is taken on faith, which is
--     unavoidable: the server does not know the user's timezone.
--
-- WHY A TRIGGER RATHER THAN RLS OR SECURITY DEFINER. Write-once is a statement
-- about the relationship between OLD and NEW, and an RLS UPDATE policy cannot
-- express one: `using` sees only the old row, `with check` only the new, and
-- neither can reference the other. A SECURITY DEFINER RPC could enforce it, but
-- only for callers that go through the RPC — a direct `.update({ settle_facts })`
-- from devtools would sail past it, and unlike `showcase` these columns are
-- meant to be written by the ordinary owner-scoped path (the same follow-up
-- UPDATE that POST /api/lists already uses for `visibility` and `theme_slug`,
-- which is why `save_list`'s signature does not change and does not need
-- re-running). A trigger is the only mechanism that holds for every writer,
-- including a future one nobody has thought of yet. It runs SECURITY INVOKER
-- with no `set search_path`, matching `save_list`'s reasoning in schema.sql:
-- that idiom belongs to SECURITY DEFINER functions.

alter table public.lists add column if not exists settled_at timestamptz;
alter table public.lists add column if not exists settle_facts jsonb;

comment on column public.lists.settled_at is
  'Server time the ranking was settled. Write-once; always overwritten with '
  'now() by lists_freeze_settle_facts(). Distinct from created_at.';
comment on column public.lists.settle_facts is
  'Client-asserted, write-once, allowlisted facts about the settling session. '
  'See supabase/migrations/20260904_showcase_server_writes.sql Part B.';

-- Partial: the vast majority of rows never carry facts, and the only queries
-- that want them are "show me my settled lists that have facts".
create index if not exists idx_lists_settled_at
  on public.lists (owner_id, settled_at desc)
  where settled_at is not null;

create or replace function public.lists_freeze_settle_facts()
returns trigger
language plpgsql
security invoker
as $$
declare
  -- Every key the achievements in the spec's §3.3 actually consume. Anything
  -- else is rejected rather than stored, so this column cannot quietly become
  -- the votes table the project decided not to build (see
  -- docs/superpowers/plans/social-gamification-proposals.md #2, which reached
  -- the same conclusion about persisting individual votes).
  allowed text[] := array[
    'schema',            -- int, currently 1. Lets a reader refuse facts it does not understand.
    'filmCount',         -- int, films in the settled roster. Cross-checkable against list_movies.
    'duels',             -- int, completed head-to-heads.
    'elapsedMs',         -- int, first duel to settle.
    'tzOffsetMinutes',   -- int, Date#getTimezoneOffset() at settle. The one value taken on faith.
    'localHour',         -- int 0-23, settle hour in the user's own zone.
    'undefeatedTmdbId',  -- int|null, the film that won every duel it played, if any.
    'minReleaseYear',    -- int|null, oldest film in the roster.
    'maxReleaseYear'     -- int|null, newest film in the roster.
  ];
  bad_key text;
begin
  if tg_op = 'INSERT' then
    -- `save_list` never sets these, but RLS's "owner all" policy permits a
    -- direct client INSERT into `lists`, so the INSERT path needs the same
    -- validation as the UPDATE path or it becomes the way around it.
    if new.settle_facts is not null then
      if new.status <> 'done' then
        raise exception 'lists.settle_facts may only be written on a settled (done) list'
          using errcode = '22023';
      end if;
      if jsonb_typeof(new.settle_facts) <> 'object' then
        raise exception 'lists.settle_facts must be a JSON object'
          using errcode = '22023';
      end if;
      if pg_column_size(new.settle_facts) > 2048 then
        raise exception 'lists.settle_facts exceeds 2 kB'
          using errcode = '54000';
      end if;
      select k into bad_key
        from jsonb_object_keys(new.settle_facts) as k
       where k <> all (allowed)
       limit 1;
      if bad_key is not null then
        raise exception 'lists.settle_facts carries an unrecognised key: %', bad_key
          using errcode = '22023';
      end if;
      new.settled_at := now();
    elsif new.settled_at is not null then
      new.settled_at := now();
    end if;
    return new;
  end if;

  -- UPDATE. Write-once in both directions.
  if old.settle_facts is not null then
    if new.settle_facts is distinct from old.settle_facts then
      raise exception 'lists.settle_facts is write-once (list %)', old.id
        using errcode = '25006';
    end if;
  elsif new.settle_facts is not null then
    if new.status <> 'done' then
      raise exception 'lists.settle_facts may only be written on a settled (done) list'
        using errcode = '22023';
    end if;
    if jsonb_typeof(new.settle_facts) <> 'object' then
      raise exception 'lists.settle_facts must be a JSON object'
        using errcode = '22023';
    end if;
    if pg_column_size(new.settle_facts) > 2048 then
      raise exception 'lists.settle_facts exceeds 2 kB'
        using errcode = '54000';
    end if;
    select k into bad_key
      from jsonb_object_keys(new.settle_facts) as k
     where k <> all (allowed)
     limit 1;
    if bad_key is not null then
      raise exception 'lists.settle_facts carries an unrecognised key: %', bad_key
        using errcode = '22023';
    end if;
  end if;

  -- settled_at is server time, always, and never moves once set.
  if old.settled_at is not null then
    if new.settled_at is distinct from old.settled_at then
      raise exception 'lists.settled_at is write-once (list %)', old.id
        using errcode = '25006';
    end if;
  elsif new.settled_at is not null or new.settle_facts is not null then
    new.settled_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists trg_lists_freeze_settle_facts on public.lists;
create trigger trg_lists_freeze_settle_facts
before insert or update on public.lists
for each row execute function public.lists_freeze_settle_facts();


-- ===========================================================================
-- PART C — Let a user read their own upvotes
-- ===========================================================================
--
-- INDEPENDENT OF PARTS A AND B. Needed only by the `film_club_patron` evolving
-- achievement ("community upvotes CAST"), whose count must be stable.
--
-- The existing select policy on `list_upvotes` (20260902_list_upvotes.sql) is
-- scoped to the LIST, not the voter: a row is readable while its list is owned
-- by the reader or is done+unlisted/public. So an upvote you cast on a list
-- whose owner later flips it to `private`, or deletes... — deletion cascades, so
-- that case is genuinely gone and should not count — but a list turned private
-- silently disappears from your own count, and a tier you had already earned
-- appears to un-earn itself. An achievement that walks backwards for reasons
-- the user cannot see is worse than no achievement.
--
-- RLS policies are PERMISSIVE and OR together, so this widens reads by exactly
-- one case (your own rows) and changes nothing else. It leaks no list content:
-- the row is (list_id, user_id, created_at) and the reader is the voter.

drop policy if exists "read own upvotes" on public.list_upvotes;
create policy "read own upvotes" on public.list_upvotes
  for select using (auth.uid() = user_id);


-- ===========================================================================
-- CALL SITES THAT MUST MIGRATE TO THE RPC
-- ===========================================================================
--
-- Found with: grep -rn 'from("profiles")' src/ --include=*.ts --include=*.tsx
-- and filtering to statements that write. There are 27 `from("profiles")`
-- expressions in the codebase; 24 are pure reads and are unaffected by Part A.
-- The three writers are:
--
--   1. src/app/(site)/u/profile/page.tsx:300-302  — MUST MIGRATE.
--          .from("profiles").update({ showcase: nextShowcase }).eq("id", ...)
--      The lifetime-XP ratchet, fired from a SERVER COMPONENT using the user's
--      own cookie session client, unawaited (`void`) and unchecked. This is the
--      caller the revoke breaks silently. Replace with a service-role call to
--      set_profile_showcase(user.id, nextShowcase). Keep it off the render path
--      but stop swallowing the outcome — the ratchet floor gates cosmetics, list
--      pinning and theme proposals, so a permanently failing write is worth a
--      server log line at minimum.
--
--   2. src/app/api/profile/route.ts:402-403  — MUST MIGRATE, AND MUST SPLIT.
--          .from("profiles").update(update).eq("id", ...).select("id")
--      `update` may carry `visibility`, `showcase`, or both (assembled at lines
--      ~148 and ~390). After the revoke the combined statement fails whenever
--      `showcase` is present. Split it: `visibility` stays on this owner-scoped
--      `.update()` (still granted); `showcase` goes through
--      set_profile_showcase. Note the existing 409 "claim a handle first" branch
--      depends on `.select("id")` returning no row — the RPC raises P0002 for
--      the same condition, so that branch must key off the raised error instead
--      of a null result.
--
--   3. src/app/api/profile/route.ts:119-120  — NO CHANGE NEEDED.
--          .from("profiles").upsert(profilePayload, { onConflict: "id" })
--      Payload is { id, handle, referred_by? }. INSERT privilege is untouched,
--      and all three columns are in the column-level UPDATE grant above, so the
--      ON CONFLICT DO UPDATE still plans. Listed here so a future reader does
--      not have to re-derive that it is safe.
--
-- NEW CALL SITES THE SPEC ADDS (must use the RPC from day one; they cannot be
-- written any other way once Part A is applied):
--
--   4. POST /api/profile/achievements/claim  — writes showcase.claimedAchievements.
--   5. POST /api/profile/canister/open       — writes showcase.unopenedCanisters
--                                              and any granted cosmetic ids.
--
-- Suggested shape for 1/2/4/5, so there is one place to review rather than
-- four: a `writeShowcase(userId, showcase)` helper next to `reconcileCareerXp`
-- in src/lib/career-xp.ts (or a new src/lib/profile-write.ts), holding the
-- `supabaseAdmin()` import so no route or page acquires it directly.
--
-- Also verified as unaffected: nothing writes `profiles` from
-- src/lib/referrals.ts (both `from("profiles")` calls there are selects),
-- src/lib/shortlist.ts, src/lib/trending.ts, src/components/SiteHeader.tsx,
-- src/app/r/play/play-room.tsx, or any of the admin routes.


-- ===========================================================================
-- SCHEMA.SQL RECONCILIATION
-- ===========================================================================
--
-- supabase/schema.sql is a run-manually reference doc and is intentionally NOT
-- edited by this migration. When someone next brings it up to date, it needs:
--
--   * The `profiles` block (schema.sql:139-153): a note under the `showcase`
--     column that it is server-write-only, and the two grant/revoke statements
--     from Part A.1. The `showcase` column comment there still describes only
--     `{ achievementKeys, favoriteListId }` and says "Validated app-side" — true
--     but now incomplete, since a privilege, not just app code, stands in front
--     of it.
--   * `set_profile_showcase` (Part A.2), placed near `save_list` so the two
--     SECURITY INVOKER / SECURITY DEFINER examples and their opposing
--     `set search_path` advice sit together.
--   * The `lists` table (schema.sql:3-11): `settled_at` and `settle_facts`
--     columns, and `lists_freeze_settle_facts` + its trigger (Part B).
--   * The `list_upvotes` block (schema.sql:179-200): the "read own upvotes"
--     policy (Part C).
--
-- `save_list` does NOT need re-running: its signature is unchanged, and settle
-- facts arrive via the follow-up owner UPDATE that POST /api/lists already
-- performs for `visibility` / `theme_slug` / `curated`.
