-- Audit: find profiles whose stored lifetimeXp is higher than their own data
-- can justify.
--
-- READ-ONLY. Nothing here writes. Run it, look at the output, decide.
--
-- WHY THIS EXISTS. Two bugs let lifetimeXp be inflated before they were fixed
-- in PR #10:
--
--   1. PATCH /api/profile passed the client's whole showcase object through to
--      mergeShowcase, so a request could simply state its own lifetimeXp.
--   2. /u/profile computed career XP from an unfiltered `lists` select. RLS on
--      that table ORs "owner all" with "anyone reads done lists", so the query
--      returned the user's own rows PLUS every other user's finished public
--      lists, and counted them all.
--
-- Both are closed. But the value is a RATCHET — the page only ever writes
-- `max(stored, computed)` — so any row inflated while those bugs were live
-- stays inflated forever. It is the floor used to gate cosmetics, list pinning
-- and theme proposals, which is why it is worth checking rather than assuming.
--
-- WHAT "EARNED" MEANS HERE. Recomputed to match src/lib/gamification.ts:
--
--   films      1 XP each, capped at 20 PER DONE LIST (MAX_XP_PER_LIST)
--   marquee   +10 per done list carrying a theme_slug
--   co-curate  +5 per done list with a non-empty participants array
--   solves    +10 per marquee_solves row with correct = true
--   referrals +15 per referred user who has finished at least one ranking
--
-- Drafts earn nothing: the XP is for sorting films, not for adding them.
--
-- CAVEATS, so a number here is not over-read:
--   * Referrals count profiles.referred_by only. The app ALSO counts people
--     credited via participant_attributions on your lists, so this column can
--     under-count and a small positive delta may be legitimate.
--   * grandfatheredXp() raises a legacy banked value to the floor of the level
--     it used to represent under the old flat-5-XP-per-level curve. An account
--     from before that change can therefore sit legitimately above `earned`.
--
-- So treat a small delta as noise and a large one as the thing you are looking
-- for. Sorted worst-first.

with film_xp as (
  -- Capped per list first, then summed — capping after the sum would let one
  -- 200-film list pay out 200 instead of 20.
  select l.owner_id,
         sum(least(c.n, 20)) as xp
  from lists l
  join lateral (
    select count(*)::int as n from list_movies m where m.list_id = l.id
  ) c on true
  where l.status = 'done'
  group by l.owner_id
),
list_bonus as (
  select owner_id,
         sum(case when theme_slug is not null and theme_slug <> '' then 10 else 0 end) as marquee_xp,
         sum(case when coalesce(array_length(participants, 1), 0) > 0 then 5 else 0 end) as cocuration_xp
  from lists
  where status = 'done'
  group by owner_id
),
solve_xp as (
  select user_id as owner_id, count(*) * 10 as xp
  from marquee_solves
  where correct
  group by user_id
),
referral_xp as (
  -- Only referred users who have actually finished a ranking count.
  select p.referred_by as owner_id, count(*) * 15 as xp
  from profiles p
  where p.referred_by is not null
    and exists (select 1 from lists l where l.owner_id = p.id and l.status = 'done')
  group by p.referred_by
)
select
  pr.id,
  pr.handle,
  coalesce((pr.showcase ->> 'lifetimeXp')::int, 0) as stored_xp,
  coalesce(f.xp, 0) + coalesce(b.marquee_xp, 0) + coalesce(b.cocuration_xp, 0)
    + coalesce(s.xp, 0) + coalesce(r.xp, 0) as earned_xp,
  coalesce((pr.showcase ->> 'lifetimeXp')::int, 0)
    - (coalesce(f.xp, 0) + coalesce(b.marquee_xp, 0) + coalesce(b.cocuration_xp, 0)
       + coalesce(s.xp, 0) + coalesce(r.xp, 0)) as delta,
  coalesce(f.xp, 0)          as film_xp,
  coalesce(b.marquee_xp, 0)  as marquee_xp,
  coalesce(b.cocuration_xp, 0) as cocuration_xp,
  coalesce(s.xp, 0)          as solve_xp,
  coalesce(r.xp, 0)          as referral_xp
from profiles pr
left join film_xp     f on f.owner_id = pr.id
left join list_bonus  b on b.owner_id = pr.id
left join solve_xp    s on s.owner_id = pr.id
left join referral_xp r on r.owner_id = pr.id
where coalesce((pr.showcase ->> 'lifetimeXp')::int, 0)
      > (coalesce(f.xp, 0) + coalesce(b.marquee_xp, 0) + coalesce(b.cocuration_xp, 0)
         + coalesce(s.xp, 0) + coalesce(r.xp, 0))
order by delta desc;

-- If a row needs correcting, this resets one profile's banked XP to its earned
-- value. Run it deliberately, one id at a time — the ratchet means the page
-- will re-bank the correct number on that user's next visit, but it will never
-- lower one by itself.
--
-- update profiles
--    set showcase = jsonb_set(showcase, '{lifetimeXp}', to_jsonb(<earned_xp>::int))
--  where id = '<uuid>';
