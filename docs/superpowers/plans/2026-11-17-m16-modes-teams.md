# M16 — Teams and game modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fixed teams (human + allied AIs vs enemy AIs), a treaty timer, starting-resource presets and a game-speed setting, saved in schema 10.

**Architecture:** One diplomacy module (`src/game/diplomacy.ts`) decides enemy/ally from player teams derived from the setup; every enemy-semantic check calls it, own-only checks stay. Teams feed shared fog, AI target choice (per-AI `enemyPlayerId` picked at run time), team victory and HUD marks. Treaty is a match-wide clock checked by combat, towers, projectiles, conversion, AI wave launches and player orders.

**Tech Stack:** TypeScript strict, Phaser 3, Miniplex ECS, Vitest, zod saves.

**Spec:** CLAUDE.md §9 "M16 — Csapatok és játékmódok" (Hungarian; the binding scope). Codebase map: `.superpowers/sdd/2026-11-17-m16-modes-teams/codemap.md`.

## Global Constraints

- Hungarian UI text only in `src/i18n/hu.ts`; code, identifiers, comments, commits in English.
- Stat numbers only in `src/config/balance.ts` (`TREATY`, `START_RESOURCES`, `GAME_SPEEDS`).
- TS `strict`, no `any`; zod for saved data; `SCHEMA_VERSION` becomes 10 with a `v9ToV10` migration and a real v9 fixture for `allVersions.test.ts`.
- Defaults reproduce today's game exactly: `allies: 0`, `treatyMin: 0`, `startResources: 'normal'` (food 200, wood 200, gold 100), `speed: 1`. With defaults, existing sims, snapshot and pinned tests must stay unchanged.
- Gaia (player 0) is never an ally and its current targeting rules do not change.
- Campaign missions always run with defaults.
- Never touch the dev server on port 5173; browser checks use port 5196.
- Conventional commits; each task ends with a green `npx tsc --noEmit -p .`, eslint on touched files and its tests.

## Review Focus

- A 2-team match where an allied AI's army meets the human's army: nothing attacks, nothing converts, towers stay silent — test in Task 2.
- Defeat of the human while allies still stand ends the match as a defeat; the last enemy falling with the human alive is a victory even if an ally fell — test in Task 4.
- Treaty ending mid-fight: units with dropped intents must be able to attack again after it ends (no sticky "can't attack" flag) — test in Task 5.
- A v9 save loads into schema 10 with defaults and plays on — test in Task 1.
- Game speed 2× must not double camera scroll or audio pitch; autosave still every 5 game minutes — test in Task 6.

---

### Task 1: Setup fields, balance constants, schema 10, setup UI

**Files:**
- Modify: `src/game/GameSetupConfig.ts`, `src/config/balance.ts`, `src/save/schema.ts`, `src/save/migrations/index.ts`, `src/ui/screens/GameSetup.ts`, `src/i18n/hu.ts`, `src/game/Player.ts` (createPlayer resources), `src/ui/store.ts` (INITIAL resources), `src/scenes/game/MatchStart.ts`, `src/ai/testing/headlessMatch.ts`
- Create: `src/save/migrations/v9ToV10.ts`, `src/save/migrations/v9ToV10.test.ts`, `src/save/migrations/fixtures/v9-092.json` (a real v9 save: generate it from the current code BEFORE bumping the version, the way earlier fixtures were made — see `src/save/savedMatch.testkit.ts`)
- Modify: `src/save/migrations/allVersions.test.ts` (add the v9 fixture)

**Interfaces:**
- Produces: `GameSetupConfig` gains `allies: number` (0..aiCount−1, clamped by `withSetup`), `treatyMin: 0 | 10 | 20`, `startResources: 'normal' | 'high' | 'deathmatch'`, `speed: 1 | 1.5 | 2`.
- Produces in balance.ts: `START_RESOURCES: Record<'normal'|'high'|'deathmatch', {food:number; wood:number; gold:number}>` with normal = 200/200/100, high = 2000/2000/1500, deathmatch = 20000/20000/20000; `TREATY = { minutes: [0, 10, 20] as const }`; `GAME_SPEEDS = [1, 1.5, 2] as const`.
- Produces: `startResourcesFor(setup): Resources` used by both `createPlayers` path and the UI store reset (the human's stock lives in the UI store; a new skirmish must start the store from the setup, not from `INITIAL`).
- Headless: `HeadlessMatchOptions` gains optional `allies`, `treatyMin`, `startResources`, `speed` passed into the match setup.

- [ ] Write a failing test that `withSetup` clamps `allies` to `aiCount − 1` and defaults the new fields; that `startResourcesFor` returns the three presets.
- [ ] Generate and commit the v9 fixture with the unchanged code; then write `v9ToV10.test.ts`: the v9 fixture migrates to 10 with `allies 0, treatyMin 0, startResources 'normal', speed 1`.
- [ ] Implement fields, constants, zod schema (keep `.strict()` and the compile-time exactness check), migration registration, `SCHEMA_VERSION = 10`, starting resources from the setup for every player and the UI store.
- [ ] Setup screen: four new rows (segmented controls, the existing `Segmented`/`ChipGroup` components): "Szövetségesek" (0..aiCount−1; hidden or disabled when aiCount = 1), "Fegyverszünet" (Nincs / 10 perc / 20 perc), "Kezdő nyersanyag" (Normál / Magas / Halálmeccs), "Sebesség" (1× / 1,5× / 2×). All strings in `hu.ts`.
- [ ] Run the save, setup and full fast test set; commit `feat: M16 setup fields, starting resources and schema 10`.

### Task 2: Diplomacy core, shared vision, display marks

**Files:**
- Create: `src/game/diplomacy.ts`, `src/game/diplomacy.test.ts`
- Modify (enemy-semantic call sites from the codemap §1): `src/ecs/systems/CombatSystem.ts`, `src/ecs/systems/TowerCombatSystem.ts`, `src/ecs/systems/ProjectileSystem.ts`, `src/game/breach.ts`, `src/game/convert.ts`, `src/scenes/game/OrderIssuer.ts` (`findEnemyAt`), `src/ai/perception.ts` (`isHostile`), `src/stats/MatchStats.ts` (no killValue for allies), `src/ecs/systems/SelectionSystem.ts` (ring), `src/ui/Minimap.ts`, `src/ui/panels/SelectionPanel.ts`, `src/ecs/systems/FogOfWarSystem.ts`, `src/game/Player.ts` / `src/game/PlayerManager.ts` (team per player)
- Tests next to each touched system.

**Interfaces:**
- Produces: `Player.team: number` (human team = 1 for players 1..1+allies, else 2; with `allies 0` every player's team is its own id so today's "everyone is hostile" holds). `PlayerManager.teamOf(id): number`.
- Produces: `diplomacy.ts`: `areEnemies(players: TeamLookup, a: number, b: number): boolean` (false if a === b, either is 0 → keep today's Gaia semantics exactly per call site: pass-through where the old check treated Gaia as hostile), `areAllies(players, a, b): boolean` (same team, both non-zero, a !== b counts as ally). `TeamLookup = { teamOf(id: number): number }`. Systems receive the lookup from the runner (no module-level global).
- `FogOfWarSystem` gains an optional `sharedWith: (ownerId) => boolean` (default: owner === viewer) so allies' emitters stamp the viewer's fog; human and AI fogs both use it.
- Display: allies get a distinct selection ring and selection-panel label (`hu.ts`: "Szövetséges"), and are always drawn on the minimap like own units.

- [ ] Failing tests: `areEnemies`/`areAllies` table (0 allies: all hostile; 1 ally: 1↔2 allies, 1↔3 enemies; Gaia); combat drops an attack intent on an ally; a tower ignores an ally in range; splash does not hurt allies; `canConvert` refuses an ally; `findEnemyAt` ignores an ally; perception does not list allied units as threats; killing an ally adds no killValue; an allied unit's sight reveals the human's fog.
- [ ] Implement; every replaced site keeps its Gaia behaviour (read each site; the codemap notes which ones count Gaia as a target).
- [ ] With `allies: 0` the full test suite including sims and pinned/snapshot tests is unchanged.
- [ ] Commit `feat: M16 diplomacy — allies never fight, share vision`.

### Task 3: AI target choice in teams

**Files:**
- Modify: `src/scenes/game/SystemRunner.ts` (per-AI `enemyPlayerId`), `src/ai/testing/headlessMatch.ts` (same rule when `allies > 0`, `enemyOf` still overrides), `src/ai/ArmyControl.ts` (`targetsEnemy` comment and logic), `src/ai/decisions/combat.ts` (`pickAttackTarget`: a Wonder target only if its owner is an enemy)
- Create: `src/ai/targetPlayer.ts` + test, `src/ai/strategies/teams.sim.test.ts`

**Interfaces:**
- Produces: `chooseEnemyPlayer(players, me: number, world): number | undefined` — for a player on the human's team: the standing enemy-team player whose town centre is nearest to `me`'s town centre (re-evaluated each AI decision; a defeated target is replaced); for an enemy-team AI with `allies > 0`: the human (player 1) while standing, else the nearest standing human-team player; with `allies 0`: the human (today's behaviour, byte-identical).

- [ ] Failing unit test of `chooseEnemyPlayer` (nearest, replacement after defeat, allies 0 → human).
- [ ] Sim test: 96×96 meadow, 3 AIs + AI-driven human, `allies: 1`, Medium: within 40 game minutes the allied AI's units deal damage to an enemy-team AI and the match is decided for one team (or both teams have lost buildings to the other); no damage ever between allies (instrument via the combat event or HP bookkeeping).
- [ ] Implement; with `allies 0` all existing sims unchanged.
- [ ] Commit `feat: M16 allied AIs attack the enemy team`.

### Task 4: Team victory, game over, score panel

**Files:**
- Modify: `src/game/VictoryChecker.ts`, `src/game/timeVictory.ts`, `src/game/gameOverStats.ts`, `src/scenes/game/HudSync.ts`, `src/ui/store.ts` (`ScoreRowInfo.team` / `ally` flag), `src/ui/panels/ScoreView.ts`, `src/ui/screens/gameOverView.ts`, `src/i18n/hu.ts`, the score panel CSS
- Tests: `VictoryChecker.test.ts`, `timeVictory.test.ts`, `gameOverView.test.ts`

**Interfaces:**
- Conquest: victory when every enemy-team player is defeated; defeat when the human is defeated (allies standing or not). Wonder: a held Wonder of any human-team player is a victory, of an enemy-team player a defeat. Time: the team with the higher summed score of standing players wins (tie: higher summed killValue, then the team containing the lower player id). With `allies 0` results are identical to today (each player its own team).
- Game over rows and the score panel mark allies (a small "Szövetséges" chip) and the human's team.

- [ ] Failing tests for each rule above, including the two Review Focus cases.
- [ ] Implement; commit `feat: M16 team victory and allied marks in the HUD`.

### Task 5: Treaty

**Files:**
- Create: `src/game/treaty.ts` + test
- Modify: `CombatSystem`, `TowerCombatSystem`, `ProjectileSystem`, `convert.ts` / `MonkSystem`, `src/ai/ArmyControl.ts` (`launchWave` gate), `src/ai/PressureControl.ts`, `src/ai/HarassControl.ts`, `src/ai/strategies/MediumStrategy.ts` (`tryLanding`), `src/ai/strategies/EasyStrategy.ts`, `OrderIssuer.ts` (attack → move + notice), HUD clock (`src/ui/HUD.ts` or the time-victory bar module), `hu.ts`, `src/save` only if treaty state is not derivable (it is derivable from `setup.treatyMin` and game time: do not save extra state)

**Interfaces:**
- Produces: `treatyActive(setup, gameTimeMs): boolean`, `treatyLeftMs(setup, gameTimeMs): number`; systems get a `() => boolean` from the runner.
- During treaty between different teams: attack intents are dropped, towers do not fire, projectiles do not damage, no conversion, AI launches nothing offensive (defence of its own base still runs but cannot damage — intents are dropped anyway), player attack order becomes a move with notice `hu.treaty.blocked`. HUD shows "Fegyverszünet: mm:ss" under the clock; at the end a notice `hu.treaty.ended`. Gaia stays attackable.

- [ ] Failing tests: combat/tower/projectile/convert blocked during treaty and allowed right after it (Review Focus); AI does not launch a wave before the end; sim: 64×64 meadow, Hard vs AI-driven human, `treatyMin 10`: zero damage between players before 10:00 and an attack wave within 6 minutes after.
- [ ] Implement; commit `feat: M16 treaty timer`.

### Task 6: Game speed

**Files:**
- Modify: `src/scenes/GameScene.ts` (`timeScale` = setup speed × dev scale; camera on real delta), `src/scenes/game/devTools.ts`, `src/scenes/game/SystemRunner.ts` (camera update with real delta if it lives there)
- Tests: a unit test of the delta split helper (create `src/scenes/game/gameClock.ts`: `gameDelta(realDelta, speed, devScale)`), autosave still on the game clock (existing `MatchSave` tests extended)

- [ ] Failing test, implement, browser check on 5196 that 2× advances `gameElapsedMs` about twice as fast as real time while camera scroll speed is unchanged.
- [ ] Commit `feat: M16 game speed`.

### Task 7: Docs, changelog, measurements, browser smoke

- [ ] CHANGELOG.md + CHANGELOG.hu.md under [Unreleased]; README.md + README.hu.md feature list (teams, treaty, starting resources, speed).
- [ ] CLAUDE.md M16 "Állapot" line with measurements: full suite count, the two M16 sims, a browser smoke on 5196 (setup rows visible and start a 2v2 with treaty 10 and 2×; allied units ringed as allies; treaty countdown; no console errors; screenshot), texmem distinct6 unchanged (no new textures), bundle size.
- [ ] Commit `docs: M16 status, changelog and readme`.
