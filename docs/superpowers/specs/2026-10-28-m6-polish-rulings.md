# M6 — Polish: scope rulings

Spec: CLAUDE.md §9 M6 (binding), §4.8, §5.2–5.4, §7.2, §10, §11.1; PROGRAM_TERV.md §6 M6, §10 (AI), §12 (audio), §13.5.
The user authorised running milestones back to back without asking
("Ha megvagy majd folytasd a következő fázissal. Nem kell engedélyt kérned
külön."), so these are controller rulings, each with its cost if wrong.
Quality bar from the user: the game must look and feel polished and
dynamic; UI text Hungarian in `src/i18n/hu.ts`; warm glass DOM UI
(amber `#f5a857`, Inter + Cinzel).

## In scope

1. **Save / load (CLAUDE.md §5.4, §11.1).** New `src/save/` (`schema.ts`,
   `serializer.ts`, `deserializer.ts`, `storage.ts`, `migrations/`) exactly
   as CLAUDE.md §6 lists. JSON per §5.4, `schemaVersion` 1, `localforage`
   keys `save:<slot>` (5 manual slots) and `save:auto` (every 5 min of game
   time). Everything needed to resume deterministically: ECS entities and
   components, players (resources, age, techs, pop, defeated), map, fog,
   camera, game clock, AI strategy state and RNG state, wonder timers.
   Textures are never saved: art is re-planned from the loaded match.
   Runtime validation with **zod** (CLAUDE.md §7.2 mandates zod for save
   files, so adding the dependency is sanctioned by the spec). Round-trip
   and migration tests are mandatory. UI: save/load from the pause menu,
   "Betöltés" on the main menu, slot list with time, civ, age, map, game
   time, and an overwrite confirmation inside the glass UI (no browser
   dialogs). Corrupt or newer-version saves show a Hungarian error, never
   crash.
   — Cost if wrong: a save format change later needs a migration (that is
   what migrations are for).

2. **Pause menu (CLAUDE.md §5.2 PauseScene).** If the game has no proper
   pause overlay yet, add one (Esc): continue, save, load, settings, quit
   to menu; game time stops.

3. **Audio (PROGRAM_TERV §12), procedural, no external files.** Phaser's
   WebAudio sound system with buffers synthesised at boot / in the
   background (OfflineAudioContext), like the art is procedural.
   `src/audio/` (new folder → CLAUDE.md §6 update first): `AudioManager`
   with the §12.4 API, SFX catalogue (§12.3: UI, unit, building, gather,
   notifications), positional SFX (§12.4: fades to 0 beyond 10 tiles from
   the camera centre), music (menu, two gameplay moods with 3 s crossfade,
   combat when fighting near the camera with 10 s fallback, victory and
   defeat stingers) as generative, era-flavoured pieces (per age
   instrumentation is welcome). Concurrency caps so 200 units fighting do
   not produce a wall of noise. Audio starts only after the first user
   gesture (browser autoplay rules). Ruling: no OGG downloads now — the
   rest of the game is procedural, it keeps the bundle small and needs no
   asset licences; the AudioManager keys are file-shaped so CC0 OGG files
   can replace any synthesised sound later without touching callers.
   — Cost if wrong: music quality below recorded tracks; swap-in path
   exists.

4. **Settings (CLAUDE.md §9 M6).** Settings screen from main menu and
   pause: master / music / SFX / notification volume (0–100 %), mute,
   key remapping for the game's keyboard actions (camera, hotkeys, Esc
   stays fixed), reset to defaults. Stored in `localStorage` (UI state,
   PROGRAM_TERV §12.6), wrapped in try/catch.

5. **Wonder victory (CLAUDE.md §4.8 #2).** A completed Wonder held for
   10 minutes wins. Setup gets a victory option: "Hódítás" (conquest only)
   / "Hódítás vagy Csoda" (default). HUD shows every standing Wonder's
   countdown (owner colour); destroying it stops the clock. AI: builds a
   Wonder when it can afford it (Medium/Hard), and treats an enemy Wonder
   as a priority attack target. Notification + sound when any Wonder is
   finished. Saved in the save file.

6. **More AI difficulty (CLAUDE.md §9 M6).** Keep easy / medium / hard,
   add one level above Hard ("Mesteri": better economy timings, earlier
   age-ups, mixed armies, multi-prong attacks, no cheating resources),
   and AI personalities (e.g. rusher / boomer / turtle) chosen per AI by
   seed, shown on the game-over stats. Determinism and the existing sim
   tests stay; add a sim test per new level / personality (bounded time,
   explicit timeouts).

7. **Closing task.** Browser smoke (save → reload page → load → continue;
   settings persist; audio plays after a click; wonder victory reachable
   with dev aids), idle load re-measure for hu and hu+en (M5 parked:
   machine load was too high, compare against M4 2.11 s / 2.55 s), memory
   and frame budgets unchanged (≤ 256 MB distinct6/heavy6, ≤ 226 MB
   twoCivM4), bundle < 2 MB gzip, CLAUDE.md M6 status line.

## Out of scope

Time victory (§4.8 #3), tutorial, localization beyond the Hungarian stub,
campaign, multiplayer, unique units / civ bonuses, mobile. Main-branch /
PR creation (no `main` branch exists; that is the user's call).
