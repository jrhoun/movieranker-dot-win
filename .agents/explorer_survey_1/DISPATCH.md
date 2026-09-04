## 2026-09-02T22:20:45Z
You are Explorer 1 for the Phase 0 Survey of movieranker.win.
Your working directory is: /home/jrhoun/projects/movieranker-dot-win/.agents/explorer_survey_1/
You MUST read: /home/jrhoun/projects/movieranker-dot-win/.agents/ORIGINAL_REQUEST.md

Your mission is to explore and analyze the existing codebase for:
1. R1: Matchup Dueling UI and state management:
   - Where pairwise voting duel is rendered and state managed (e.g. components, hooks, ranking algorithms, quicksort/merge/Elo/Bradley-Terry or pairwise state).
   - How votes, "Haven't seen" (skips), and "Undo" actions are currently handled and routed.
   - Keyboard event handling: where to attach blitz controls (ArrowLeft/A, ArrowRight/D, Space for Haven't seen, Z for undo) and ensure input/form element focus bypasses keyboard shortcuts.
   - TMDB integration: how movie metadata, posters, and details are fetched, cached, and displayed; how movie `tagline` is currently stored or fetched from TMDB API or local DB/cache, and where to render it below poster cards.
   - Web Audio synthesizer: how audio could be implemented via Web Audio API (vintage clicks, mechanical projector sound, subtle chimes), state persistence for opt-in/mute preference (localStorage), and UI toggle.
   - Win streak tracking: how matchup winners are tracked across consecutive duels to detect 3+ win streaks and display an understated gold laurel badge.
2. R4: "Lights Down" cinema focus mode:
   - How the duel stage UI is structured, surrounding header/footer/background elements, and how an optional toggleable "Lights Down" mode can dim the surroundings to full theater blackness under warm spotlights.
