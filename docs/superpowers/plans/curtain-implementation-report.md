# Curtain Implementation Report

Design-polish round implementing DESIGN.md's Curtain Treatment and Space & Usability quick wins. Branch `master`, base HEAD `b243c3d`.

## Changes

### 1. `src/app/globals.css` — `.bg-curtain` utility

Layered backgrounds per the Curtain Treatment spec (top layer first):

1. Top valence shadow: `linear-gradient(180deg, rgba(0,0,0,.75), transparent 35%)`
2. Warm radial ambient light: `radial-gradient(ellipse at 50% 0%, rgba(255,150,150,.2), rgba(0,0,0,.6))`
3. Vertical velvet folds: `repeating-linear-gradient(90deg, #33000a 0px, #66001a 20px, #a8323e 45px, #66001a 70px, #33000a 90px)` — fold cycle ~90px with 20–45px transitions, matching the ~20–45px fold-width guidance

Plus inset boundary shadow: `inset 0 0 120px rgba(0,0,0,.55)`.

Reduced motion: the treatment is entirely static gradients — no keyframes or animations were added, so it is identical for `prefers-reduced-motion` users by construction; no override needed.

### 2. Stage-moment applications

- **Home hero band** (`src/app/(site)/page.tsx`): `<header>` restructured as a full-bleed curtain band above the existing max-w-5xl content column. Hero title + subtitle sit on a surface scrim (`bg-bg/60`, ring, subtle blur) so text never lands on fold crests; the amber H1 additionally gets a drop shadow. CTA prominence unchanged — CTAs live below the band on dark house.
- **Celebration / stable screen** (`src/app/r/play/play-room.tsx`): `bg-curtain` applied to the stable-state section as backdrop behind the podium preview. Podium already sits in a `bg-surface` card. Supporting muted copy ("Sharpen settles them…", "No close calls left", "Sharpening…") moved onto pill-shaped surface chips (`bg-surface` + ring) to satisfy the contrast rule; buttons remain on accent/surface-raised.
- **Login** (`src/app/(site)/login/page.tsx`): `bg-curtain` applied to `<main>` as page backdrop. The auth card already floats on a `bg-surface` panel — all card text (including muted) sits on that surface, not the curtain.

### 3. Contrast audit (rule: no muted text directly over curtains)

| Surface | Text treatment | Compliant |
| --- | --- | --- |
| Hero scrim | muted subtitle on `bg-bg/60` scrim; bold amber H1 + drop shadow | yes |
| Celebration section | all muted strings on surface cards/chips; buttons on accent/surface-raised | yes |
| Login | every text node inside the `bg-surface` auth card | yes |

No `text-muted` remains directly on curtain background anywhere.

### 4. Space & Usability quick wins (these three files only)

- Home: hero focal composition centered inside the same `max-w-5xl` container as the rest of the page; one dominant action below (Start ranking).
- Play room celebration: podium card (`max-w-md`) is the intentional focal point; secondary actions grouped beneath.
- Login: single centered `max-w-md` focal card; one primary action (Sign in), alternatives visually quieter.

## Untouched surfaces

Lists, profile, vote stage (MatchupStage content), trays, header — all stay dark house per DESIGN.md.

## Verification

- `tsc --noEmit`: clean
- `eslint`: clean
- `vitest run`: **96/96 passed** (10 files)
- `next build`: passes
- No live API calls made; `.env.local` never read.
