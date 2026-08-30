-- Upgrade 3: give an approved community theme an explicit week to run in.
--
-- Fixes a live defect, and adds the scheduling control that defect made
-- necessary.
--
-- THE DEFECT. `tonightsShortlist` built its pool as
-- [...curated, ...approvedProposals] and picked `pool[weekIndex % pool.length]`.
-- Approving a proposal therefore changed pool.length, which re-mapped EVERY
-- week to a different theme — including the one currently running. Measured
-- against the real data: approving a single proposal changed the live theme
-- mid-week and all twelve of the next twelve weeks.
--
-- That is not cosmetic. A user part-way through ranking this week's Marquee
-- would see the theme swap under them, and the `theme_slug` stamped on their
-- list would stop matching the live theme — which is what marquee completion,
-- the weekly connection quiz, and several achievements are keyed on.
--
-- THE FIX. Curated themes now rotate on their own fixed-length array, so the
-- rotation is stable forever. A community proposal appears only in the week it
-- has been explicitly scheduled for, where it takes precedence over the
-- curated pick. Approving something no longer changes what is on screen; a
-- separate, deliberate act does.
--
-- `scheduled_week` is an ISO-week index from weeksSinceUtcEpoch() (Monday
-- anchored), not a date — the same integer the rotation already runs on, so
-- there is no timezone or off-by-one seam between scheduling and display.
-- NULL means approved but not yet scheduled, which is the resting state.
--
-- Safe to deploy the code before running this: the reader retries without the
-- column and treats every proposal as unscheduled.
--
-- Run each statement once against the live DB.

alter table shortlist_proposals
  add column if not exists scheduled_week int;

-- One theme per week. A partial index so the many NULLs (approved but not yet
-- scheduled) do not collide with each other.
create unique index if not exists shortlist_proposals_scheduled_week_unique
  on shortlist_proposals (scheduled_week)
  where scheduled_week is not null;
