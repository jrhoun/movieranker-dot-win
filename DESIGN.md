---
name: "movieranker-dot-win"
colors:
  background: "--color-bg -> var(--bg) #0d0d10"
  surface: "--color-surface"
  text: "--color-text"
  primary: "--color-accent"
---

# Design System: movieranker-dot-win

## Visual Theme & Atmosphere

- [observed] Existing first-party theme, shared component, and page sources define the current visual baseline.
- [user-directed 2026-08-24] Theater model: velvet curtain lives on stage moments; dark house carries the content.
- Burgundy velvet-curtain gradient treatment (base #800020 family) ONLY on stage moments: home hero band, finalizing/celebration screen, auth pages. Never behind dense content or poster grids.
- Content surfaces (lists, vote stage, profile, trays) stay near-black (#0d0d10 family) so poster art pops and text stays crisp.
- Accent amber #f5a524 retained - warm-family harmony with burgundy.

### Curtain Treatment (signature)
- Single reusable utility (.bg-curtain in globals.css): layered gradients modeled on "stage drapes" - top valence shadow (linear-gradient 180deg rgba(0,0,0,.75) -> transparent 35%), warm radial ambient light upper-center, repeating vertical folds (#33000a / #66001a / #a8323e cycle), inset boundary shadow.
- Fold width ~20-45px; opacity tuned for text contrast; posters never sit directly on fold crests without a surface card between.

## Space & Usability Principles
- No empty vastness: every screen has an intentional focal composition inside max-width containers (~max-w-5xl content; wider for vote stage); secondary content (stats, metadata, participant chips) fills supporting roles rather than floating in whitespace.
- One primary action per view, visually dominant; destructive/rare actions quieter.
- Labels over icons wherever meaning is not universal; plain language throughout.
- Sections breathe in consistent vertical rhythm; related controls grouped in surface cards.

## Color Palette & Roles

- [observed] `--color-bg: var(--bg)`
- [observed] `--color-surface: var(--surface)`
- [observed] `--color-surface-raised: var(--surface-raised)`
- [observed] `--color-accent: var(--accent)`
- [observed] `--color-accent-red: var(--accent-red)`
- [observed] `--color-text: var(--text)`
- [observed] `--color-muted: var(--muted)`
- [observed] `--surface: #17171c`

## Typography Rules

- [inferred confidence=low] Typography hierarchy is not explicit; infer only from representative rendered surfaces.
- [inferred confidence=medium] Reuse the existing font stack and derive hierarchy from shared components before introducing new sizes.

## Component Stylings

- [observed] `src/components/CandidateTray.tsx`
- [observed] `src/components/MatchupStage.tsx`
- [observed] `src/components/MoviePosterCard.tsx`
- [observed] `src/components/ParkedStrip.tsx`
- [observed] `src/components/SaveGateSheet.tsx`
- [observed] `src/components/SearchPanel.tsx`
- [observed] `src/components/ShareButton.tsx`
- [observed] `src/components/SignInLink.tsx`
- [inferred confidence=medium] Prefer existing primitives and variants over page-local replacements.

## Layout Principles

- [inferred confidence=low] No named spacing tokens were detected; confirm the base spacing rhythm.
- [observed] Representative page: `src/app/(site)/page.tsx`
- [observed] Representative page: `src/app/(site)/l/[id]/page.tsx`
- [observed] Representative page: `src/app/(site)/login/page.tsx`
- [observed] Representative page: `src/app/(site)/u/me/page.tsx`
- [observed] Representative page: `src/app/r/play/page.tsx`
- [observed] Representative page: `src/components/list/ListViews.tsx`
- [inferred confidence=medium] Match the density and alignment rhythm of representative pages.

## Motion & Interaction

- [inferred confidence=low] No motion token was detected; keep transitions restrained until interaction evidence is available.
- [inferred confidence=medium] Preserve visible hover, focus, pressed, loading, and reduced-motion behavior from existing primitives.

## Accessibility

- [inferred confidence=medium] Preserve semantic controls, keyboard focus visibility, and non-color state cues present in existing primitives.
- [inferred confidence=low] Contrast, touch targets, text scaling, and reduced-motion behavior require runtime verification.

## Source Evidence & Confidence

- [observed] path: `src/app/globals.css`
  sha256: `8efc0c52a1ef51cdc981391fed697c4b84119f2425d81a0111b781c4b0f30f65`
  confidence: high
- [observed] path: `src/app/layout.tsx`
  sha256: `523cfb4d9c182c6d083de40f29654229dde3d5450739a29a7790fe869beb48cc`
  confidence: high
- [observed] path: `src/app/(site)/layout.tsx`
  sha256: `c5157831339a748ea686d17a23591cfff686cb705f1a4e729d848510a3203521`
  confidence: high
- [observed] path: `src/app/(site)/page.tsx`
  sha256: `2ab17eace9117642abd1657cbe5344d192474f29a566d3f98c9f0aae8f52179f`
  confidence: high
- [observed] path: `src/app/(site)/l/[id]/not-found.tsx`
  sha256: `564b12952526941eae104a52fa0ed90fbab028d19cd6be016b406dd2bf706705`
  confidence: high
- [observed] path: `src/app/(site)/l/[id]/page.tsx`
  sha256: `9795882e90b62284fef3ed11160d5c034601a269070f6879699ab3f031492df9`
  confidence: high
- [observed] path: `src/app/(site)/login/page.tsx`
  sha256: `47ba939dc3b37175e0fcde57e2a0cc15f53226d11c9e5b8b547e3307311e3ce1`
  confidence: high
- [observed] path: `src/app/(site)/u/me/page.tsx`
  sha256: `238588213ed20031ff2442986f9582005dd3f1b6b56b3f0f7310cfe1cf17bfe6`
  confidence: high
- [observed] path: `src/app/r/play/page.tsx`
  sha256: `113673f9043e5b7a47463aba507b94a266364fc1a4f9ef74cb5137df4161abbf`
  confidence: high
- [observed] path: `src/app/r/play/play-room.tsx`
  sha256: `3da44b2c2d26b8c1d03aa0b5d709aa855d05117f8e45bfe049af1013e933ade9`
  confidence: high
- [observed] path: `src/components/CandidateTray.tsx`
  sha256: `127e36f29226a650b8a4a5d535e2b4ad31fadfc48d76b148c28355cf69c88388`
  confidence: high
- [observed] path: `src/components/MatchupStage.tsx`
  sha256: `0decc12db22024c569a0eb07dd1f73dc0366c029c9718d913e8f17f13bd72090`
  confidence: high
- [observed] path: `src/components/MoviePosterCard.tsx`
  sha256: `9e81e107244a8b038fa0714361e4bd222aa2489a79e8aacfadc232260514a2c1`
  confidence: high
- [observed] path: `src/components/ParkedStrip.tsx`
  sha256: `1d78eab31aa41c1b03c6c456e17687920c9842d829e8114955cfd58a6a2989be`
  confidence: high
- [observed] path: `src/components/SaveGateSheet.tsx`
  sha256: `0426582113e13ece7d0254058b24d90a3a0edda2b3b9831cfc44a3292071566e`
  confidence: high
- [observed] path: `src/components/SearchPanel.tsx`
  sha256: `2c943b65d2e857aa63a2b8355550436387dfef2c614254acbcdebbc5959f689e`
  confidence: high
- [observed] path: `src/components/ShareButton.tsx`
  sha256: `3adcc7ab6a938fae646cfa03893d97771ad85bf2f9aad348dcf4ca0615a21b15`
  confidence: high
- [observed] path: `src/components/SignInLink.tsx`
  sha256: `9de71acadb116abd71ffbd86bc16481fdaae87de530cc9d64b962d93bf79cafd`
  confidence: high
- [observed] path: `src/components/SiteHeader.tsx`
  sha256: `57cec8519f5e06a814032145161c1382bf130a9f9d98048771aa5aba797574bf`
  confidence: high
- [observed] path: `src/components/Tabs.tsx`
  sha256: `ecf782c55fc072df63290a261aab61a620bba86ad13e0854d1081b23cdb19102`
  confidence: high
- [observed] path: `src/components/list/ListViews.tsx`
  sha256: `b576ee861482224c3a33dfb8ec4e6b1aca669afd0378aabade418df896bcf231`
  confidence: high
- [observed] path: `src/components/list/MoviePoster.tsx`
  sha256: `541bffaf331b2eca0c83e5b2acc6f375a5a25dd5822d70f142952570edf09132`
  confidence: high
- [observed] path: `src/components/list/OwnerControls.tsx`
  sha256: `81993032ffa41f55f20c8c08ae1384255894ad54956baaceafed91b0224b15fd`
  confidence: high
- [observed] path: `src/components/list/RowsView.tsx`
  sha256: `2295b22582aaeccfe96ee64d9fa252e48e28faa59f85932081bbc1a752e6cb5e`
  confidence: high
- [observed] path: `src/components/list/StackedView.tsx`
  sha256: `73ed2cd5222af0cdae0a76ff74e8287a9c578d1024c31e3c5d9906d3ea6768d1`
  confidence: high
- [observed] path: `src/components/list/ViewToggle.tsx`
  sha256: `4bc74d45800530700a125788858a0e232428b4f4ceb6f479f7a02805018e5933`
  confidence: high
- [observed] path: `src/components/profile/ListCard.tsx`
  sha256: `f05d90546d68e0f405ad70bbb81ca53307d169c982a7580d848ed80c0fb6d2a8`
  confidence: high

## Known Gaps & Exceptions

- [inferred confidence=medium] Semantic intent inferred from implementation must be reviewed before this draft becomes project authority.
- [observed] Shape token `--radius: var(--radius)`
- [observed] Shape token `--radius: 12px`
