-- Curator Roulette lists are not weekly Marquees.
--
-- WHAT WENT WRONG. `launchMicroPackSession` (src/lib/curator-roulette.ts) used
-- to stamp its sessions with `themeSlug: <pack slug>` and `curated: true`, and
-- `POST /api/lists` persisted both as `lists.theme_slug` / `lists.curated`.
-- But `theme_slug` means weekly-Marquee provenance everywhere it is read:
--
--   * src/lib/career-xp.ts   `isMarquee: theme_slug is set` → MARQUEE_COMPLETION_XP
--                             paid for a spin of the reel, and the list counted
--                             toward `marqueeWeeks` (Season Ticket, The Programmer).
--   * src/lib/marquee-title.ts masked the saved list as "Weekly Marquee #N" on
--                             profiles and in the Community Spotlight.
--   * src/app/(site)/l/[id]   rendered the connection game under a "What connects
--                             these films?" heading for a pack that has no puzzle.
--
-- The source is fixed in code (packs now save with theme_slug NULL, curated
-- false). This repairs the rows saved before the fix.
--
-- SAFE TO RE-RUN. The slug list is the static set of micro packs in
-- src/lib/curator-roulette.ts; none of them is, or can become, a weekly theme
-- slug (weekly themes live in src/lib/shortlist-themes.ts and in
-- shortlist_proposals). Keep this list in step if packs are added.
--
-- XP NOTE. Career XP is derived from rows, so the Marquee bonus these lists
-- earned disappears on the next read. The lifetime ratchet
-- (`profiles.showcase.lifetimeXp`, see src/lib/career-xp.ts) means nobody is
-- demoted by this — a peak already banked stays banked. That is the ratchet
-- working as designed, not something to correct here.

update public.lists
set theme_slug = null,
    curated = false
where theme_slug in (
  'a24-gems',
  'cyberpunk-90s',
  'noir-classics',
  'oscar-snubs',
  'paranoia-70s',
  'studio-ghibli'
);
