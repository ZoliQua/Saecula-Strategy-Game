# M18 — Tutorial, building repair, colour-blind team colours Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Villagers repair damaged buildings (human and Medium+ AI), a colour-blind team palette in a new "Megjelenítés" settings tab, and a step-by-step tutorial mission at the top of the campaign list; saves in schema 12.

**Architecture:** Repair is a new `repairIntent` driven by a `RepairSystem` modelled on `ConstructionSystem` (rate from build time and build-speed modifiers, cost drained continuously from the owner's wallet). The palette is one `playerColor(id)` function reading the active setting, replacing every direct `PLAYER_COLORS[...]` lookup. The tutorial is a `MissionDef` with `sequential: true`, two new objective kinds (`gathered`, `repaired`) and per-objective hints in `hu.ts`.

**Tech Stack:** TypeScript strict, Phaser 3, Miniplex ECS, Vitest, zod saves.

**Spec:** CLAUDE.md §9 "M18 — Kezelhetőség: oktató mód, épületjavítás, színtévesztő-barát színek" (Hungarian, binding).

## Global Constraints

- Hungarian UI text only in `src/i18n/hu.ts`; code, identifiers, comments, commits in English.
- Stat numbers only in `src/config/balance.ts` (`REPAIR = { speed: 1, costFraction: 0.5 }`) and AI tuning in `src/config/aiMedium.ts` (`repair: { belowHpFraction: 0.6, safeRadius: 12, maxVillagers: 2 }`; Hard/Master inherit, Easy none).
- TS `strict`, no `any`; `SCHEMA_VERSION` 12 with `v11ToV12` and a REAL v11 fixture generated with the unchanged code before the bump; `allVersions.test.ts` covers it.
- Matches without repairs must play as before: existing sims, snapshots and pinned art unchanged, except seed-sensitive sims moved by the AI repair (re-sweep, document in the test comment, house style). Land round-robin bands (0.9.1) must still hold.
- No new textures (texture budget unchanged); the hammer cursor already exists for building — reuse it.
- Never touch the dev server on port 5173; browser checks on 5196.

## Review Focus

- A repairing villager whose target is destroyed, converted, becomes an enemy's or reaches full HP stops cleanly (idle, no loop) — Task 2.
- The wallet runs dry mid-repair: repair stops, one Hungarian notice (not one per frame), no negative resources (human UI wallet and AI Player.resources) — Task 2.
- Several villagers on one building never overshoot max HP or overcharge — Task 2.
- Loading a save keeps the human's colours on the current palette and the minimap/score/HUD swatches match the unit/building paint — Task 1.
- Sequential objectives: a later objective met early (e.g. 6 villagers before the house) is not shown as done until its turn, then completes immediately — Task 4.

---

### Task 1: Colour-blind palette and the "Megjelenítés" settings tab

**Files:** `src/game/Player.ts` (`PLAYER_COLORS` stays the default; add `CB_PLAYER_COLORS` = Okabe–Ito `[0xe69f00, 0x56b4e9, 0x009e73, 0xf0e442, 0x0072b2, 0xd55e00]` and `playerColor(id: number): number` reading the active palette via a setter `setTeamPalette(p: TeamPalette)`), every direct `PLAYER_COLORS[...]` caller (`ui/format.ts`, `ui/Minimap.ts`, `iso/buildingTextures.ts teamColor`, `ui/thumbnails.ts`, `ui/civPreview.ts` default arguments), `src/ui/settings.ts` (zod settings gain `teamPalette: 'default' | 'colorblind'`, default `'default'`, old stored settings parse), `src/ui/screens/SettingsScreen.ts` + new `SettingsDisplayTab.ts` (third tab "Megjelenítés"), `settingsView.ts`, match start and save load apply the palette before players/textures are created (`MatchStart` / deserializer: saved `color` is ignored for display and re-derived), `hu.ts`.

**Interfaces:**
- Produces: `type TeamPalette = 'default' | 'colorblind'`, `playerColor(id)`, `setTeamPalette(p)`.

- [ ] Failing tests: both palettes have 6 distinct colours; `playerColor` follows the setter; settings round trip with and without `teamPalette`; a loaded save's players get the active palette's colours.
- [ ] Implement; tab with a two-option segmented control and a one-line note ("a következő meccstől érvényes").
- [ ] Commit `feat: M18 colour-blind team palette`.

### Task 2: Building repair (human), schema 12

**Files:** `src/ecs/components.ts` (`repairIntent?: { targetId: number; costCarry: Resources }`), `src/config/balance.ts` (`REPAIR`), new `src/ecs/systems/RepairSystem.ts` (+test) in `SystemRunner` after `ConstructionSystem` and in the headless match, `src/scenes/game/OrderIssuer.ts` (villager right-click on own or allied finished building with hp < max → repair; under construction stays "build"), cursor (hammer), `src/stats/MatchStats.ts` (`repairsDone` counter per player, saved, default 0; incremented when a building reaches full HP through repair), `src/save/schema.ts` + `serializer`/`deserializer`, `src/save/migrations/v11ToV12.ts` (+test, real v11 fixture first, allVersions), `hu.ts` (notice "Elfogyott a nyersanyag a javításhoz.", role line in the selection panel "Javít").

**Interfaces:**
- Rate per villager: `maxHp / buildTimeMs × REPAIR.speed × buildSpeedMultiplier(owner)` HP per ms (use the same modifier function construction uses).
- Cost: repairing `h` HP costs `cost × REPAIR.costFraction × h / maxHp` per resource; accumulate fractions in `costCarry`, charge whole units; the human pays from the UI wallet, AI from `Player.resources` (reuse the wallet helpers `ecs/research` exports). A villager repairs an ally's building with its own owner's resources.
- Produces: `canRepair(world, villager, target, teams): boolean`, `startRepair(villager, target)`.

- [ ] Generate the v11 fixture with the unchanged code; failing tests: rate (one and three villagers, never above max), cost and carry, wallet runs dry (stop + single notice), target destroyed/converted/enemy/full stops, under-construction and Gaia/enemy/ship refused, allied building allowed, Italian bonus speeds it, save round trip mid-repair, migration.
- [ ] Implement; commit `feat: M18 villagers repair buildings (schema 12)`.

### Task 3: AI repairs

**Files:** `src/config/aiMedium.ts` (`repair`), a new `src/ai/RepairPlay.ts` (+test) modelled on `MonkPlay`/`TradePlay`, called from Medium (Hard/Master inherit), uses perception only (no cheating): own finished building below `belowHpFraction`, no seen enemy within `safeRadius` of it, at most `maxVillagers` repairing at once (town center first, then by lowest HP fraction), takes idle villagers first then gatherers nearest to it; stops when safe condition fails. Easy: nothing.

- [ ] Failing tests: picks the TC first, respects maxVillagers, does not repair with an enemy near, Easy never repairs, does not repair when the wallet cannot pay.
- [ ] Implement; run all sims, re-sweep moved seeds (house style); land round-robin `BALANCE=1` (Hard and Master) still in band — record results.
- [ ] Commit `feat: M18 AI repairs damaged buildings`.

### Task 4: Tutorial mission

**Files:** `src/campaign/objectives.ts` (kinds `{ kind: 'gathered'; resource: ResourceType; amount: number }` and `{ kind: 'repaired'; count: number }`; `ObjectiveContext` gains `gatheredBy: Resources` and `repairsDone: number`), `src/stats/MatchStats.ts` (`gatheredBy` per type, saved, default zeros), `src/campaign/missions.ts` (`MissionDef.sequential?: boolean`; new `TUTORIAL_ID = 'tutorial'` def — meadow small, 1 Easy AI, `treatyMin: 20`, hungarian vs english, fixed seed, objectives in CLAUDE.md order; `start.damagedHouse: true` → a finished house next to the TC at 50 % HP), `missionStart.ts`, `ObjectiveTracker.ts` (sequential: objective i is judged only after 0..i−1 are done), `ui/panels/ObjectivesPanel.ts` (sequential: done ones + the current with its hint line), `src/campaign/progress.ts` (tutorial done flag; does not unlock or lock campaign missions), `src/ui/screens/CampaignScreen.ts` (tutorial as the first row, always available), `hu.ts` (`campaign.tutorial`: title, briefing, closing, one hint per step; hints name the command gesture from the controls setting).

- [ ] Failing tests: new objective kinds' progress; sequential tracker (early completion waits its turn, then completes in the same tick); tutorial setup valid and its map playable; damaged house at start; campaign list order; progress flag; headless sim: a Medium AI in the human slot reaches every step within 30 min with the test performing the repair step.
- [ ] Implement; commit `feat: M18 step-by-step tutorial mission`.

### Task 5: Docs, measurements, browser smoke

- [ ] CHANGELOG (EN/HU) [Unreleased], README (EN/HU) roadmap row, CLAUDE.md M18 "Állapot": full suite, sims, round-robin results, texmem distinct6 (unchanged expectation), bundle, browser smoke on 5196 (tutorial steps with hints, repair of a damaged house with resources draining, colour-blind palette in a match, screenshots), no console errors.
- [ ] Commit `docs: M18 status, changelog and readme`.
