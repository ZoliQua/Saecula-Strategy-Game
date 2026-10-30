# M8 — Unique Units and Civ Bonuses Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every nation gets one unique unit that replaces one of its base units, and one permanent civ bonus, without growing the texture budget.

**Architecture:** `UnitType` splits into `BaseUnitType` (the 10 shared units) and `UniqueUnitType` (8 new ones). A unique unit has its own row in `UNIT_BALANCE` with `replaces: BaseUnitType`; `src/game/civUnits.ts` maps a civ's base roster to its real roster. Civ bonuses are `TechEffect`s that `modifiers.ts` folds in next to researched techs, so every existing use-time hook applies them. The AI keeps reasoning in base types and maps to the civ's variant only when it trains.

**Tech Stack:** TypeScript strict, Phaser 3, Miniplex, Vitest, zod (save).

**Spec:** `CLAUDE.md` §9 M8 (commit 5da9036), with §4.3/§4.4; art rules in §9 M5 (silhouette per nation, pins, civ surface).

## Global Constraints

- Branch `feat/M8-unique-units`; conventional commits; English code, Hungarian UI text only in `src/i18n/hu.ts`.
- No stat literals outside `src/config/balance.ts` (the bonus fractions included).
- Civ ids may appear only in the files `src/config/civSurface.test.ts` allows, plus the civ's own `<civ>/` folders. Unique-unit ids are not civ ids.
- Hungarian, English and earlier nations' existing pins (buildings, walls, the 10 base units per civ) stay byte-identical.
- Budget (§10, M7 frames): ≤ 256 MB textures for distinct6/heavy6 at 1280×720, zoom 1.2 and 0.5; ≤ 226 MB twoCivM4; < 2 MB gzip; 60 FPS on 96×96 with 4 players.
- Unique units have no new mechanics: only stats, the existing anti-cavalry bonus, the projectile kinds that already exist.
- Version 0.3.0 at release (§7.6).

## Review Focus

1. **A save from v0.2.0 with units the civ can no longer train** (Hungarian knights): it must load, the knights live, fight and render (on-demand sheet), and the barracks/stable panels offer only the civ roster. → Task 7 test `loads a v2 save whose civ now trains a unique unit instead`.
2. **The AI never trains a replaced base unit** — not via counters, not via the "defend with pikemen" path, not via raiders. → Task 4 test `no AI path queues a replaced base type` plus the sim invariant.
3. **German building HP and the construction HP ramp:** a German site under construction must reach exactly `round(base × 1.15)` HP when it finishes and must never exceed `max`; a deleted German site refunds the same as anyone's. → Task 2 test `German site finishes at the boosted max`.
4. **Bonuses before any research:** `modifiers.ts` short-circuits on an empty researched set today; a fresh Hungarian scout-class unit must already be 10 % faster at minute 0. → Task 2 test `civ bonus applies with no technology researched`.
5. **Class membership of unique units:** blacksmith upgrades, the cavalry-HP tech, infantry march and pikeman-style anti-cavalry damage must reach the unique units exactly as they reach their base unit. → Task 1 test `unique unit belongs to its base unit's classes`.

---

## File Structure

- `src/types/index.ts` — `BaseUnitType`, `UniqueUnitType`, `UnitType` union.
- `src/config/balance.ts` — 8 new `UNIT_BALANCE` rows with `replaces`; class lists extended; `ANTI_CAVALRY_UNITS`; `CIV_BONUS` fractions; projectiles.
- `src/config/civs.ts` — `CivDef.uniqueUnit: UniqueUnitType`, `CivDef.bonus: TechEffect`.
- `src/game/civUnits.ts` (new) — roster mapping helpers.
- `src/game/technologies.ts` — four new `TechEffect` kinds.
- `src/game/modifiers.ts` — civ effects folded in; `buildingHpMultiplier`, `buildSpeedMultiplier`.
- `src/game/damage.ts`, `src/ecs/archetypes/building.ts`, `src/ecs/systems/ConstructionSystem.ts` and their callers.
- `src/ecs/queueUnit.ts`, `src/ecs/systems/selectedInfo.ts`, `src/scenes/GameScene.ts` — civ-aware training.
- `src/ai/**` — base-type normalisation, civ mapping at train time.
- `src/iso/art/units/**` — unique looks per civ folder (new `hungarian/` folder), gear, `WALK_CYCLE_TILES`, `BASE_UNIT_LOOKS` keyed by base types; `src/scenes/game/artLoadPlan.ts` paints the civ roster.
- `src/i18n/hu.ts`, `src/ui/screens/CivPicker.ts`, `src/ui/screens/techTreeModel.ts` (+ `TechTree.ts`).
- `src/save/schema.ts`, `src/save/migrations/v2ToV3.ts` (new).
- Docs: `CHANGELOG*.md`, `README*.md` (feature list), `package.json` version, CLAUDE.md M8 status.

---

### Task 1: Unit types, balance rows and the civ roster

**Files:**
- Modify: `src/types/index.ts`, `src/config/balance.ts`, `src/config/civs.ts`, `src/ecs/archetypes/unit.ts` (spec map still covers every type)
- Create: `src/game/civUnits.ts`, `src/game/civUnits.test.ts`
- Test: `src/config/balance.test.ts` (create if absent, else extend)

**Interfaces:**
- Produces:
  - `type BaseUnitType = 'villager'|'scout'|'swordsman'|'archer'|'knight'|'pikeman'|'crossbowman'|'musketeer'|'cannon'|'cavalry'`
  - `type UniqueUnitType = 'hussar'|'longbowman'|'landsknecht'|'mousquetaire'|'conquistador'|'legionary'|'cossack'|'sissi'`
  - `type UnitType = BaseUnitType | UniqueUnitType`; `BASE_UNIT_TYPES: readonly BaseUnitType[]` (the order above) in `types/index.ts`.
  - `UnitBalance.replaces?: BaseUnitType` (set exactly on unique rows).
  - `ANTI_CAVALRY_UNITS: readonly UnitType[] = ['pikeman', 'landsknecht']` (replaces the hard-coded `'pikeman'` in `damage.ts`; rename `PIKEMAN_CAVALRY_BONUS` → `ANTI_CAVALRY_BONUS`, value 22).
  - `CIV_BONUS = { cavalrySpeed: 0.1, farmFood: 0.15, buildingHp: 0.15, stableHp: 0.15, goldGather: 0.15, buildSpeed: 0.15, woodGather: 0.15, infantrySpeed: 0.1 } as const` in `balance.ts` (no civ ids).
  - `CivDef.uniqueUnit: UniqueUnitType` (Task 2 adds `bonus`).
  - In `civUnits.ts`: `baseUnitType(t: UnitType): BaseUnitType`; `isUniqueUnit(t: UnitType): t is UniqueUnitType`; `civUnitType(civ: CivId, base: BaseUnitType): UnitType`; `civUnitTypes(civ: CivId): UnitType[]` (10 entries, `BASE_UNIT_TYPES` order, replaced slot swapped); `canCivTrain(civ: CivId, t: UnitType): boolean`.

Stats (copy exactly; `trainers` and `age` are the replaced unit's, `popCost` 1, cooldown of the base unit's class):

| type | replaces | hp | melee | pierce | mDef | pDef | range | speed | los | cost F/W/G | train s |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hussar | knight | 85 | 9 | 0 | 1 | 2 | 1 | 1.55 | 6 | 70/0/40 | 25 |
| longbowman | crossbowman | 35 | 0 | 5 | 0 | 0 | 7 | 0.96 | 8 | 0/35/40 | 32 |
| landsknecht | pikeman | 70 | 7 | 0 | 1 | 0 | 1 | 1.0 | 4 | 50/20/25 | 24 |
| mousquetaire | musketeer | 65 | 0 | 9 | 0 | 1 | 6 | 1.1 | 7 | 60/0/35 | 22 |
| conquistador | cavalry | 130 | 12 | 0 | 4 | 4 | 1 | 1.4 | 5 | 80/0/90 | 32 |
| legionary | swordsman | 45 | 7 | 0 | 1 | 3 | 1 | 0.9 | 4 | 60/0/30 | 23 |
| cossack | scout | 60 | 6 | 0 | 0 | 2 | 1 | 1.55 | 8 | 85/0/15 | 30 |
| sissi | archer | 32 | 0 | 4 | 0 | 0 | 3 | 1.15 | 8 | 0/30/40 | 32 |

Civ → unique unit: hungarian hussar, english longbowman, german landsknecht, french mousquetaire, spanish conquistador, italian legionary, russian cossack, finnish sissi.
Classes: `CAVALRY_CLASS` += hussar, conquistador, cossack; `INFANTRY_CLASS` += longbowman, landsknecht, mousquetaire, legionary, sissi; `ARROW_UNITS` += longbowman, mousquetaire, sissi. `UNIT_PROJECTILE`: longbowman/sissi `arrow`, mousquetaire `bullet`.

- [ ] **Step 1: Write failing tests** — `civUnits.test.ts`: `civUnitTypes('hungarian')` contains `'hussar'` and not `'knight'`, length 10; every civ's roster has exactly one unique type and it equals `CIV_DEFS[civ].uniqueUnit`; `canCivTrain('english','longbowman')` true, `canCivTrain('hungarian','longbowman')` false, `canCivTrain('english','crossbowman')` false, `canCivTrain('english','knight')` true; the 8 unique units are pairwise distinct and replace 8 distinct base types; `baseUnitType('sissi') === 'archer'`. `balance.test.ts`: `unique unit belongs to its base unit's classes` (for each unique type, membership in CAVALRY_CLASS / INFANTRY_CLASS / ARROW_UNITS / ANTI_CAVALRY_UNITS equals its base's, `age` and `trainers` equal, `UNIT_PROJECTILE` presence equal).
- [ ] **Step 2: Run** `npx vitest run src/game/civUnits.test.ts src/config/balance.test.ts` — FAIL (module missing).
- [ ] **Step 3: Implement** the types, rows, class lists, `civs.ts` field and `civUnits.ts`. `damage.ts` uses `ANTI_CAVALRY_UNITS`. Fix every compile error from widened `Record<UnitType, …>` maps outside `src/iso/art` (i18n gets placeholders only if needed to compile — Task 6 writes the real text; prefer doing the real `hu.units` / `hu.unitRoles` entries now: Huszár/Portyázó könnyűlovas, Hosszúíjász/Nagy lőtávú íjász, Landsknecht/Lovasság-ellenes zsoldos, Királyi muskétás/Elit lőfegyveres, Konkvisztádor/Páncélos lovas, Légiós/Nyílálló gyalogos, Kozák/Portyázó lovas, Sissi/Gyors portyázó íjász). Art maps are Task 5; until then `BASE_UNIT_LOOKS`/`WALK_CYCLE_TILES` may be typed `Record<BaseUnitType, …>` with `unitLook`/walk lookups going through `baseUnitType` — that is the final design, do it now.
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — all green (art pins unchanged).
- [ ] **Step 5: Commit** `feat: add unique unit types and the civ roster`.

### Task 2: Civ bonuses

**Files:**
- Modify: `src/game/technologies.ts`, `src/game/modifiers.ts`, `src/config/civs.ts`, `src/ecs/archetypes/building.ts`, `src/ecs/systems/ConstructionSystem.ts`, callers `src/scenes/game/BuildPlacement.ts`, `src/scenes/game/GameBootstrap.ts`, `src/ecs/archetypes/wall.ts`, `src/ai/strategies/BaseStrategy.ts`, `src/scenes/game/SystemRunner.ts`, `src/ai/testing/headlessMatch.ts`
- Test: `src/game/modifiers.test.ts`, `src/ecs/systems/ConstructionSystem.test.ts` (extend existing)

**Interfaces:**
- Consumes: `CIV_BONUS`, `CivDef`.
- Produces:
  - New `TechEffect` kinds: `{ kind: 'cavalrySpeed'; bonus }`, `{ kind: 'stableHp'; bonus }` (units whose base trainers include `'stable'`), `{ kind: 'buildingHp'; bonus }`, `{ kind: 'buildSpeed'; bonus }`.
  - `CivDef.bonus: TechEffect`: hungarian cavalrySpeed 0.1; english gather food 0.15; german buildingHp 0.15; french stableHp 0.15; spanish gather gold 0.15; italian buildSpeed 0.15; russian gather wood 0.15; finnish infantrySpeed 0.1 (values via `CIV_BONUS`).
  - `Researched` gains `readonly civ?: CivId`; the effect cache = `[CIV_DEFS[civ].bonus, ...techEffects]` when `civ` is set. Remove the `researched.size === 0` early returns (keep the hot paths allocation-free through the cache).
  - `buildingHpMultiplier(player: Researched): number`, `buildSpeedMultiplier(player: Researched): number`.
  - `CreateBuildingOptions.hpMultiplier?: number` (default 1): `max = round(spec.maxHp × m)`.
  - `ConstructionSystem` constructor gains a 4th param `players: PlayerManager | null = null`; each builder adds `dt × buildSpeedMultiplier(owner)`.

- [ ] **Step 1: Failing tests** — `civ bonus applies with no technology researched` (Hungarian, empty set: `unitBonuses(p,'scout').speedMultiplier === 1.1`, also `'hussar'`; `'archer'` 1); Finnish `'sissi'` and `'swordsman'` speed 1.1, `'knight'` 1; French `'knight'` and `'conquistador'` hpMultiplier 1.15, `'scout'` 1 (scout trains at barracks); English `gatherMultiplier(p,'food') === 1.15` and stacks with `crop_rotation` multiplicatively; German `buildingHpMultiplier === 1.15`, others 1; Italian `buildSpeedMultiplier === 1.15`; a player without `civ` behaves exactly as before. ConstructionSystem: `German site finishes at the boosted max` (house: max `round(500×1.15)=575`, current never above max during the ramp, equals max at completion); `Italian builder finishes 15 % sooner` (house 25 s → done after `25/1.15` s ± one tick, not before).
- [ ] **Step 2: Run** the two test files — FAIL.
- [ ] **Step 3: Implement.** Every `createBuilding` caller passes `hpMultiplier: buildingHpMultiplier(owner)` (owner from its PlayerManager; Gaia/none → 1). `SystemRunner` and `headlessMatch` pass `players` to `ConstructionSystem`. Make sure the `Player` objects passed to modifiers carry `civ` (Player already has it).
- [ ] **Step 4: Run** `npx tsc --noEmit && npx vitest run` — green; existing AI sims still pass (they now include bonuses).
- [ ] **Step 5: Commit** `feat: add a permanent bonus per civ`.

### Task 3: Civ-aware training (rules and HUD)

**Files:**
- Modify: `src/ecs/queueUnit.ts`, `src/scenes/GameScene.ts:272`, `src/ai/strategies/BaseStrategy.ts:222`, `src/ecs/systems/selectedInfo.ts:84-87`, all `queueUnit(` test callers
- Test: `src/ecs/queueUnit.test.ts`, `src/ecs/systems/selectedInfo.test.ts` (extend)

**Interfaces:**
- Produces: `queueUnit(trainer: Entity, type: UnitType, owner: { readonly age: AgeId; readonly civ: CivId }, account?: TrainAccount): QueueUnitResult`; new reason `'civ-locked'` (checked right after `'wrong-trainer'`). `info.trainable` = the civ roster filtered by trainer (`civUnitTypes(civ)` order).

- [ ] **Step 1: Failing tests** — `queueUnit(stable, 'knight', {age:2, civ:'hungarian'})` → `{ok:false, reason:'civ-locked'}`; `'hussar'` same owner → ok; `'hussar'` for english → `'civ-locked'`; a Hungarian stable's `trainable` is `['hussar', 'cavalry']` (never `'knight'`); English barracks lists `archer` and not `longbowman` (longbowman trains at archery_range only).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement**; add `hu` reason text for `'civ-locked'` next to the other queue-reason strings if the UI maps reasons to text.
- [ ] **Step 4: Run** full suite — green.
- [ ] **Step 5: Commit** `feat: train each civ's own roster`.

### Task 4: AI uses the civ roster

**Files:**
- Modify: `src/ai/decisions/army.ts` (`countByType`, sightings loop), `src/ai/perception.ts:135,207,219`, `src/ai/decisions/stance.ts:67`, `src/ai/strategies/BaseStrategy.ts` (`train`, `trainersFor`), `MediumStrategy.ts:287-322`, `HardStrategy.ts:232,251`, `PressureControl.ts:100`, any other `unit.unitType` / queue `unitType` read under `src/ai/`
- Test: `src/ai/strategies/civRoster.test.ts` (new), `src/ai/strategies/eightCivs.sim.test.ts` (extend)

**Interfaces:**
- Consumes: `baseUnitType`, `civUnitType`, `canCivTrain`.
- Rule: AI decisions are in `BaseUnitType`. Every AI read of an entity's or queue entry's `unitType` goes through `baseUnitType`; sightings and own counts are keyed by base type; `train(ctx, view, type)` takes a `BaseUnitType` and queues `civUnitType(ctx.player.civ, type)`; `trainersFor` resolves the same mapping. Candidate lists (`MediumStrategy` `allowed`, Hard raider list) iterate `BASE_UNIT_TYPES`.

- [ ] **Step 1: Failing tests** — `civRoster.test.ts`: a Hungarian AI's `train(…, 'knight')` queues a `hussar` at a stable; `countByType([hussar, knight])` → `{ knight: 2 }`; a sighting of 5 `conquistador` counts as cavalry for counters (mix weights pikeman → queued as `landsknecht` for a German AI); `no AI path queues a replaced base type`: run each strategy (Easy/Medium/Hard/Master) headless for every civ for 12 game minutes with age-up forced to 3 at start (existing headless helpers) and assert no queue entry ever is `CIV_DEFS[civ].uniqueUnit`'s `replaces`. Sim extension in `eightCivs.sim.test.ts`: in the existing 8-civ match, every civ's trained types ⊆ `civUnitTypes(civ)`, and the three age-1 unique units (legionary, cossack, sissi) are trained by their civ.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Grep check after: `grep -rn "unitType ===\|unitType !==\|\.unitType)" src/ai` — every hit is wrapped in `baseUnitType` or is a deliberate exact-type check with a comment.
- [ ] **Step 4: Run** full suite incl. sims (`npx vitest run src/ai`) — green; sims stay within their previous wall time (+20 %).
- [ ] **Step 5: Commit** `feat: AI trains its civ's unique unit`.

### Task 5: Unique unit art — infrastructure + hungarian, english, german, french

**Files:**
- Modify: `src/iso/art/units/looks.ts` (`BASE_UNIT_LOOKS: Record<BaseUnitType, UnitLook>`, `unitLook` falls back to the base of `baseUnitType(type)`; `LOOK_OVERRIDES.hungarian = HUNGARIAN_LOOKS`), `layout.ts` (`WALK_CYCLE_TILES` keyed by base type, looked up through `baseUnitType`), `gearRegistry.ts`, `src/scenes/game/artLoadPlan.ts` (paint `civUnitTypes(civ)` instead of all types; AI-only civs: the age-1 entries of that roster; age-up jobs: that age's roster entries), `src/iso/art/testing/pinnedArt.testkit.ts` (+ `pinUniqueUnit(civ, type, {pixels, geometry})`), `src/config/civSurface.test.ts` only if the new `units/hungarian/` folder needs listing (it should not: civ folders are allowed).
- Create: `src/iso/art/units/hungarian/hungarianLooks.ts`, `hungarianGear.ts`, `hungarianUniquePinned.test.ts`; in each of `english/`, `german/`, `french/`: the unique look added to `<civ>Looks.ts`, new gear in `<civ>Gear.ts`, `<civ>UniquePinned.test.ts`.
- Test: `src/scenes/game/artLoadPlan.test.ts` (extend), `src/iso/art/units/uniqueLooks.test.ts` (new)

Looks (each must read as its nation at zoom ~1.0 and differ in silhouette from that civ's own other units; team colour stays the owner mark on body/coat/shield/caparison; reuse existing weapon kinds so poses come for free):
- **hussar** (rider, `sabre`): tall fur *kalpag* with a feather plume; dolman with white frogging (crossBelts) in team colour; light horse with saddle cloth; no armour.
- **longbowman** (foot, `bow` + English longbow style): padded jack, brimmed *kettle* war hat, arrows tucked in the belt instead of a back quiver — must differ from the English archer.
- **landsknecht** (foot, `pike`): huge slashed beret with ostrich plumes; slashed, puffed two-tone sleeves (team + white); no back plate.
- **mousquetaire** (foot, `musket`): wide-brimmed plumed cavalier hat; team-colour *casaque* with a white cross; bandolier.
- Measure: after painting, sheet byte size of each unique unit within +15 % of the base unit it replaces for that civ (record numbers in the commit message).

- [ ] **Step 1: Failing tests** — `uniqueLooks.test.ts`: for every civ, `LOOK_OVERRIDES[CIV_DEFS[civ].unitLook][CIV_DEFS[civ].uniqueUnit]` is defined (fails for the 4 civs of Task 5b until then — mark those 4 with `it.todo` here, Task 5b turns them on); the look `kind` matches the base's kind (rider/foot); `artLoadPlan.test.ts`: `prewarmUnitTypes('hungarian','hungarian')` contains `'hussar'` not `'knight'`; an AI-only Italian civ prewarms `'legionary'` (age 1) and not `'swordsman'`; `ageUpArtJobs('hungarian', 2, …)` paints `hussar`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** infrastructure, then the four looks and gear.
- [ ] **Step 4: Visual check** — render each of the four unique units for its civ next to that civ's base unit it replaces and the civ's other units, at zoom 1.0 and 1.5, 8 headings, idle/walk/attack/death, with two team colours; save to `.superpowers/sdd/2026-10-30-m8-unique-units/shots/task-5/`; look at every image and fix anything that reads wrong (clipping, floating gear, team colour lost, silhouette not distinct).
- [ ] **Step 5: Record pins** for the four unique units with `pinUniqueUnit`; run `npx vitest run src/iso/art` — all existing pins unchanged, new ones green.
- [ ] **Step 6: Commit** `feat: unique unit art for the Hungarian, English, German and French`.

### Task 5b: Unique unit art — spanish, italian, russian, finnish

**Files:** as Task 5 for `spanish/`, `italian/`, `russian/`, `finnish/`; turn the four `it.todo`s in `uniqueLooks.test.ts` into tests.

Looks:
- **conquistador** (rider, `lance` or `sabre` — whichever pose reads better): crested steel *morion*, breastplate, team-colour sleeves and caparison.
- **legionary** (foot, `gladius`): lorica segmentata, galea with a transverse crest, large curved rectangular scutum in team colour with a winged-thunderbolt emblem — must differ from the Italian swordsman.
- **cossack** (rider, `sabre`): tall fur *papakha*, long team-colour *cherkeska* coat with cartridge loops (gazyri), small fast horse.
- **sissi** (foot, `bow`): white hooded snow cloak over fur, team colour on the tunic/sash, short bow — must differ from the Finnish archer.

- [ ] **Step 1:** Turn on the four tests — FAIL.
- [ ] **Step 2:** Implement looks and gear.
- [ ] **Step 3: Visual check** as Task 5 Step 4 into `shots/task-5b/`.
- [ ] **Step 4: Record pins**; `npx vitest run src/iso/art` — existing pins unchanged.
- [ ] **Step 5: Commit** `feat: unique unit art for the Spanish, Italian, Russian and Finnish`.

### Task 6: UI — civ picker, tech tree, panels

**Files:**
- Modify: `src/i18n/hu.ts`, `src/ui/screens/CivPicker.ts`, `src/ui/screens/techTreeModel.ts:73,111`, `src/ui/screens/TechTree.ts`
- Test: `src/ui/screens/techTreeModel.test.ts`, `src/ui/screens/CivPicker.test.ts` (extend or create)

**Interfaces:**
- Produces: `hu.setup.civBonus: Record<CivId, string>` (one line each: „Lovas egységek +10% sebesség”, „Farmok +15% étel”, „Épületek +15% életerő”, „Istállói egységek +15% életerő”, „Aranygyűjtés +15%”, „Építés +15% gyorsabb”, „Fagyűjtés +15%”, „Gyalogság +10% sebesség”); `hu.setup.uniqueUnit: (unit: string, replaced: string) => string` → `Egyedi egység: ${unit} (a ${replaced} helyett)`. The picker caption shows desc, the unique-unit line and the bonus line; the screen-reader text includes both. `techTreeModel(civ, age, researched)` lists `civUnitTypes(civ)`; a unique unit is marked (`unique: true`) and the tree shows a small "egyedi" badge (`hu.techTree.unique = 'egyedi'`).

- [ ] **Step 1: Failing tests** — tech tree for `'russian'` contains `cossack`, not `scout`, `cossack.unique === true`; picker caption for `'french'` contains „Királyi muskétás” and „Istállói egységek +15% életerő”.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** (style the badge with the existing amber accent tokens). **Step 4: Run** full suite + `npx eslint src` — green; check the picker and tech tree in the browser (dev server) and save a screenshot to `shots/task-6/`.
- [ ] **Step 5: Commit** `feat: show each civ's unique unit and bonus`.

### Task 7: Save schema 3

**Files:**
- Modify: `src/save/schema.ts` (`SCHEMA_VERSION = 3`), `src/save/migrations/index.ts`
- Create: `src/save/migrations/v2ToV3.ts`, `v2ToV3.test.ts`, a v2 fixture in `src/save/migrations/fixtures/` (Hungarian player with knights and a stable)

**Interfaces:** `v2ToV3: Migration` — identity reshaping (the unit-type enum only widened); documents why in its comment.

- [ ] **Step 1: Failing tests** — `v2ToV3` returns the data unchanged; `migrate(v2fixture)` → version 3 and parses; `loads a v2 save whose civ now trains a unique unit instead`: restore the fixture headlessly, the knights exist with their HP, the stable's `trainable` is the Hungarian roster; round-trip of a save containing all 8 unique units is identical.
- [ ] **Step 2–4:** Run (FAIL) → implement → full suite green.
- [ ] **Step 5: Commit** `feat: save schema 3 for unique units`.

### Task 8: Budget, smoke test, release docs

**Files:** `CLAUDE.md` (M8 status line with measurements), `CHANGELOG.md`, `CHANGELOG.hu.md` (`[0.3.0]` section + compare links), `README.md`, `README.hu.md` (feature bullets), `package.json` (`0.3.0`), `src/config/version.test.ts` if it pins the version.

- [ ] **Step 1: Measure** with the M6/M7 protocol (`docs/superpowers/plans/2026-10-28-m6-polish.md`, texture-memory section): distinct6, heavy6, twoCivM4 at 1280×720 zoom 1.2 and 0.5; frame-CPU p95 on 96×96 with 4 players; `npm run build` gzip size. All within the Global Constraints; if not, stop and report.
- [ ] **Step 2: Smoke** in the browser: start as each of two civs (Hungarian, Italian), check the train buttons show the unique unit, train one, fight; load an old v0.2.0 save. Screenshots to `shots/task-8/`.
- [ ] **Step 3:** Full verification: `npx tsc --noEmit && npx eslint src && npx vitest run && npm run build`.
- [ ] **Step 4:** Docs and version 0.3.0 (both languages, Keep a Changelog).
- [ ] **Step 5: Commit** `docs: record M8 and prepare 0.3.0`; push; open the PR into `main`.
