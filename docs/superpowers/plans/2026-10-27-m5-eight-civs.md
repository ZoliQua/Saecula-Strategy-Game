# M5: Eight Civilisations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the six remaining civs (German, French, Spanish, Italian, Russian, Finnish) playable, each with its own three age styles, Wonder, walls and unit look, on an art pipeline whose texture memory and load time hold with 6 distinct civs in one match.

**Architecture:** Two entry tasks first: a texture budget that scales to N civs (age-aware prewarm, no invisible bases, packed unit sheets, per-age wall keeping) and a closed extension surface (gear and charge registries, a civ-isolation test, setup UI for 8 civs). Then each civ adds data and painters only: registry rows plus `<civ>/` folders under `architecture/`, `walls/` and `units/`. A civ rides an existing painter family through `ArchStyle` + shared kits where its silhouette allows (proved first with German), and gets a bespoke family where it does not.

**Tech Stack:** Phaser 3.80 (WebGL, Light2D), TypeScript strict, Vite, Vitest, Miniplex, Zustand vanilla.

**Spec:** `CLAUDE.md` §4.2, §4.3, §8.4, §9 M5 (as rewritten in Task 0), §10; the M4 final review `.superpowers/sdd/2026-10-27-m4-multi-civ/final-review.md` (I1, I4, M4, M6, M7, M8, Recommendations 1–3); the lighting contract `docs/superpowers/lighting-contract.md`.

**Workspace:** `.superpowers/sdd/2026-10-27-m5-eight-civs/` (controller creates it; copy of the lighting contract; `shots/task-N/`; measurement scripts copied from `.superpowers/sdd/2026-10-27-m4-multi-civ/shots/task-8/`).

## Design Decisions (controller rulings — binding)

1. **Visual only** (CLAUDE.md §4.3). PROGRAM_TERV.md's M5 lines on unique units and civ bonuses are out of M5. CLAUDE.md is the scope authority; they stay a later stretch goal.
2. **Civs and order:** German, French, Spanish, Italian, Russian, Finnish. Each gets 3 age styles (Roman-era, medieval and Enlightenment readings of its §4.2 character), its own Wonder, a wall style per age (wall kits may be reused with civ materials where cheap) and a unit look (palette, heraldry, and at least one strong silhouette cue per age: headgear, shield or weapon style). Each civ must be recognisable **by silhouette** at zoom ~1.0, not only by palette.
3. **Wonders:** German Romanesque imperial cathedral (Speyer, two tower pairs); French Baroque palace (Versailles); Spanish Moorish palace with courtyard arcades and a tower (Alhambra); Italian Renaissance domed cathedral with campanile (Florence); Russian onion-domed cathedral (St Basil's); Finnish wooden cross-plan church with a shingled tent roof (Petäjävesi). None may echo the English Gothic cathedral or the Hungarian baroque basilica.
4. **Simplified art pipeline:** for each civ and age, choose either (a) an existing family + `ArchStyle` + kits (cheap) or (b) a bespoke family (where the silhouette demands it). German proves the cheap path first. A painter used by two or more civs moves to `src/iso/art/architecture/kits/`. Extracting kits from English must not change English pixels (pins stay green). Painter budget per civ: about 2,500 lines for a cheap civ, about 4,000 for a bespoke one (English was about 4,700).
5. **Entry gates** (M4 review I1, I4, M1, M6, M7, M8): Task 1 sets the N-civ art budget and Task 2 the civ extension surface. No civ art is written before both are done.
6. **Variety over caps:** the default "Vegyes" draw keeps dealing distinct civs. A distinct-civ cap is a fallback only, and only with controller sign-off on Task 1's measured numbers.
7. **Per civ, two tasks:** (a) architecture for 3 ages, Wonder and crest charge; (b) walls, unit look, i18n and making the civ `available: true` (the setup picker and the mixed AI pool). A civ becomes available only in its (b) task.
8. **Branching** (CLAUDE.md M5 "civ-enként külön branch"; branches are stacked because there is no `main` yet):
   - Tasks 0–2 run on `feat/M5-eight-civs`.
   - Each civ runs on `feat/M5-<civ>`, created from the previous branch head: german from eight-civs, french from german, spanish from french, italian from spanish, russian from italian, finnish from russian.
   - Task 15 fast-forwards `feat/M5-eight-civs` to `feat/M5-finnish` and runs there.
9. **Hungarian and English stay pixel-identical:** their existing building, wall and unit pins stay green. Every civ added in M5 is pinned in its own tasks and stays pinned for the rest of M5.

## Global Constraints

These bind every task. Reviewers check them.

1. **Stack:** Phaser 3.80 with `type: Phaser.WEBGL` (no Canvas fallback); TypeScript strict (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`); Vite, Vitest, Miniplex ECS, Zustand vanilla store. **No new npm dependencies.**
2. **Language:** code, identifiers, comments and commits in English. Every player-visible string lives in `src/i18n/hu.ts`.
3. **Architecture:** the ECS world is the single source of game truth; Phaser objects are render proxies; Zustand holds UI state only. Civs differ in art only: no civ id may appear in `src/ecs`, `src/ai`, `src/game` or `src/config/balance.ts`.
4. **Balance values** live in `src/config/balance.ts` and `aiBalance.ts` / `aiMedium.ts` / `aiHard.ts`. M5 adds none.
5. **Art is procedural** (`src/iso/art/`) and follows `docs/superpowers/lighting-contract.md`, including the M4 amendments: normal maps (half size for units and painted buildings); half-resolution unit team masks whose frames and UVs are sized against the albedo; shadow casters; building shadows drawn through the rock cut; window glows; team mask. Any new texture-px data must go through `trimLitArt`.
6. **Files stay under ~400 lines.** `any` is forbidden.
7. **Tests:** pure logic gets Vitest tests. `npm run lint`, `npm test`, `npx tsc --noEmit` and `npm run build` pass at the end of every task. The Hungarian, English and earlier-M5-civ pins (`*Pinned.test.ts`, `hungarian*.test.ts`) pass unchanged in every task.
8. **Performance budget:**
   - **Frame CPU:** p95 ≤ 16.7 ms on 96×96, 4 players, mid-game. Measure ms, not FPS.
   - **GPU texture memory:** ≤ 256 MB in the reachable worst case. The figure counts **textures only** (each source and data-source image once, at its real size); WebGL framebuffers (camera, Light2D targets, stencil) are not counted. The worst case is 128×128 Islands, 6 players, **6 distinct civs**, owners spread over ages 1,2,3,1,2,3, all 10 unit types per civ, plus the terrain zoom-out peak.
   - **No regression:** the M4 two-civ scenario stays ≤ 226.0 MB.
   - **Bundle:** < 2 MB gzip.
   - **Load time** (focused tab): each distinct civ beyond the first adds ≤ ~1 s. The 1-civ and 2-civ loads do not regress (M4: 2.11 s and 2.55 s on 96×96 with 3 AIs).
9. **Visual direction:** warm dark glass DOM UI (amber `#f5a857`, Inter + Cinzel); a living, animated world.
10. **Commits:** conventional commits on the task's branch (Decision 8). Do not push; the controller pushes.
11. **Visual verification:** `npm run dev`, then open `http://localhost:5173/`; `window.__game` is available in dev. Graphics tasks are checked in the browser with screenshots in `shots/task-N/`, not by tests alone. Each art task shoots:
    - its civ beside Hungarian, English and every earlier M5 civ, at noon (phase 0.45) and dusk (phase 0.7), zoom 1.0;
    - the black silhouette sheet from Task 2.

    The reviewer must be able to name the civ from the silhouette sheet alone, for the town centre and the house of each age.

## Review Focus

1. **Default 6-civ draw, then an AI ages up and trains at once.** When "Vegyes" with 5 AIs on Nagy/Szigetek deals 6 distinct civs, and an AI-only civ ages up and trains a later-age unit before its background sheet is painted, the unit must still be visible (first idle frames painted on demand) and memory must stay ≤ 256 MB. Tests in Task 1.
2. **Shared civ, base owner defeated or aged up first.** When two players share a civ and the player whose colour the base was painted in is defeated or ages up first, the other's variant keeps a valid normal map, and no albedo is kept in the colour of a non-player. Test in Task 1.
3. **Team colour against same-colour heraldry.** When the team colour matches a civ's heraldry (red teams on Spanish, Russian or German red; blue teams on French or Finnish blue), ownership must still read. Each (b) task tests that every unit type's team-mask coverage is ≥ 0.8 × that of the Hungarian type, and that building team banners are present.
4. **Age-up wave, collapse/fire FX and Wonder stages on new art.** Glows, volume and smoke anchors must stay inside the trimmed canvas, and every stage must paint. Each (a) task has a structural test.
5. **Setup with 8 civ cards and 9 "Ellenfelek népe" options, keyboard only, at 1280×720.** Arrow navigation reaches every option, focus is never hidden under the sticky footer, and the Start button stays visible. Tests and shots in Tasks 2 and 15.

---

### Task 0: CLAUDE.md first (§9 M5, §6 tree)

**Branch:** `feat/M5-eight-civs`. **Files:** Modify `CLAUDE.md` (§6 tree, §9 M5, footer date).

- [ ] **Step 1: Replace §9 "M5 — Skálázás teljes 8 népre" with this text, verbatim:**

```markdown
### M5 — Skálázás teljes 8 népre
- A maradék hat nép, ebben a sorrendben: német, francia, spanyol, olasz,
  orosz, finn. **Csak vizuális különbség** (4.3): egyedi egységek és
  népbónuszok NEM részei az M5-nek (a PROGRAM_TERV.md erről szóló M5 sorai
  későbbi stretch goal-ok).
- Népenként: 3 kor építészeti stílusa (a 4.2 karakter római kori,
  középkori és felvilágosodás kori értelmezése), saját Csoda, koronként
  saját falstílus (olcsó esetben meglévő fal-készlet a nép anyagaival),
  saját egység-kinézet (paletta, címer, koronként legalább egy erős
  sziluett-jel: fejfedő, pajzs vagy fegyver-változat). Minden nép
  **sziluettben** is felismerhető legyen játék-zoomon (~1,0), ne csak
  színben.
- Csodák: német — román stílusú császári dóm két toronypárral (Speyer);
  francia — barokk palota (Versailles); spanyol — mór palota árkádos
  udvarral és toronnyal (Alhambra); olasz — reneszánsz kupolás dóm
  kampanilével (Firenze); orosz — hagymakupolás székesegyház (Szent
  Vazul); finn — fa kereszt-alaprajzú templom zsindelyes sátortetővel
  (Petäjävesi).
- Egyszerűsített art pipeline: népenként és koronként döntünk — meglévő
  festőcsalád `ArchStyle` paraméterekkel és díszítő-készletekkel (olcsó),
  vagy saját család, ahol a sziluett megköveteli (orosz hagymakupola, finn
  tőzeg- és zsindelytető, spanyol lapos tető és udvar, olasz árkád és
  kupola). Az olcsó utat a német nép bizonyítja először. A legalább két
  nép által használt festő a `src/iso/art/architecture/kits/` mappába
  kerül.
- Belépő feladatok az új népek előtt: (1) N-nép textúra-keret — a csak AI
  népek egységlapjai koronként készülnek (a későbbi korok lapjai a
  háttérsorban, a tulajdonos korváltásakor), láthatatlan alap-albedó nincs,
  az egységlapok képkockánként tömörítve, a falak csak a használt korokban
  maradnak; (2) bővítési felület — sisak/pajzs/fegyver és címer-töltet
  regiszterben (a közös `gear.ts` nem importál népet), a nép-előnézetből
  csak a data URL marad, és egy teszt őrzi, hogy népazonosító csak a
  megengedett fájlokban szerepel.
- Új nép felvételének ellenőrzőlistája (megosztott festőt nem érint):
  1. `src/config/civs.ts`: az id-uniók (`ArchStyleId`, `WallStyleId`,
     `UnitLookId`) és a nép `CIV_DEFS` sora (`available: true` csak akkor,
     ha a nép teljesen kész).
  2. `src/iso/art/architecture/<nép>/`: stílusok, festők, Csoda,
     címer-töltet; egy-egy sor a `registry.ts`-ben és a `charges.ts`-ben.
  3. `src/iso/art/walls/<nép>/`: falstílusok; egy sor a `wallStyles.ts`-ben.
  4. `src/iso/art/units/<nép>/`: kinézet, felszerelés, anyagok; egy-egy sor
     a `looks.ts`-ben és a `gearRegistry.ts`-ben.
  5. `src/i18n/hu.ts`: a nép neve és egysoros leírása.
  6. Rögzítő tesztek (draw-log hash) a nép mappáiban épületre, falra és
     egységre; a magyar, az angol és a korábbi népek rögzítései
     változatlanok maradnak.
- Ágak: a belépő feladatok a `feat/M5-eight-civs` ágon; népenként külön ág
  (`feat/M5-<nép>`), mindig az előző nép ágának végéről (egymásra épülő
  ágak); a zárófeladat a `feat/M5-eight-civs` ágon fut, a finn ágra
  előretekerve.
- Keret (10.): ≤ 256 MB textúra-memória (csak textúrák, WebGL framebufferek
  nélkül) a legrosszabb elérhető esetben: 128×128 Szigetek, 6 játékos,
  6 különböző nép; minden további nép legfeljebb ~1 s betöltési többletet
  okoz.
```

- [ ] **Step 2: Extend the §6 tree.**
  - Under `architecture/`, add `kits/` ("népek közös díszítő-készletei (favázas rács, lépcsős oromzat, hagymakupola…)").
  - Add one line per new civ folder, with a short Hungarian gloss of its character, in the same style as the `english/` lines:
    - `german/`, `french/`, `spanish/`, `italian/`, `russian/` and `finnish/` under `architecture/`, `units/` and `walls/`.
  - Set the footer date to 2026-10-27.
- [ ] **Step 3: Commit.** Run `git add CLAUDE.md && git commit -m "docs: CLAUDE.md M5 scope, civ-addition checklist and per-civ art folders"`.

---

### Task 1: N-civ art budget (6 distinct civs ≤ 256 MB textures)

**Branch:** `feat/M5-eight-civs`.

**Spec:** M4 review I1, M8, Recommendation 1; Global Constraint 8; Decision 6.

**Files:**
- Modify: `src/config/civs.ts` (DEV stub flag).
- Modify: `src/scenes/game/artLoadPlan.ts`. Move `BackgroundArt` into a new `src/scenes/game/backgroundArt.ts` if the file would pass 400 lines.
- Modify: `src/iso/art/units/UnitArtPrewarm.ts` and `src/scenes/GameSetupScene.ts:88-92`.
- Modify: `src/iso/art/artKeys.ts`, `src/iso/buildingTextures.ts`.
- Modify: `src/iso/art/units/sheet.ts`, `UnitArt.ts`, and `layout.ts` (per-frame bounds).
- Modify: `src/scenes/GameScene.ts:112-123` and `src/scenes/game/SystemRunner.ts:92,136` (owners, age-up jobs, keep-walls).
- Tests: `artLoadPlan.test.ts`, `artKeys.test.ts`, `releaseStaleBuildingArt.test.ts`, new `src/iso/art/units/sheetPacking.test.ts`, `hungarianUnits.test.ts` and `english/englishUnitsPinned.test.ts` (pin split, see Step 6).
- Workspace: `shots/task-1/tex-memory.js` and `load-time.js`, which gain the `distinct6` scenario.

**Interfaces (Produces):**
- `DEV_ALL_CIVS: boolean` in `civs.ts`. It is true only when `import.meta.env.DEV` and `location.search` has `civs=all`; guard `typeof location`. When it is true, `AVAILABLE_CIVS` is `CIV_IDS`, and upcoming civs are stubs painted with Hungarian art under their own `~c<civ>` keys. Tasks 2 and 15 use it for UI shots before the art exists.
- `prewarmUnitTypes(civ: CivId, human: CivId): UnitType[]`. The human's civ gets every type. An AI-only civ gets the types with `UNIT_BALANCE[type].age === 1`.
- `ageUpArtJobs(civ: CivId, age: AgeId, paint: ArtPainters): Array<() => void>`. It returns jobs for the unit sheets of the types whose age is `age`, and for the civ's common wall pieces of `age + 1` (if age < 3).
- `ArtPainters` becomes `{ building(type, civ, owner: number): void; wall(piece, age, civ): void; unit(type, civ): void }`.
- `planArtLoad(human: CivId, owners: ReadonlyMap<CivId, number>, paint: ArtPainters): ArtLoadPlan`. The map is civ → base owner: the human's id for the human civ, otherwise the lowest player id of that civ.
- `BackgroundArt.enqueue(jobs: ReadonlyArray<() => void>): void`. Jobs are appended and duplicates are allowed; painters are cache hits.
- `teamArtKey(key: string, playerId: number, baseOwner = 1): string`. It returns `key` when `playerId === baseOwner`, otherwise `${key}@p${playerId}`, including `@p1`. `parseBuildingArtKey` accepts `@p1`.
- `buildingTexture(host, type, age, playerId, civ)` keeps its signature. The base is painted in the colour of the civ's base owner, set by `setBuildingBaseOwners(owners: ReadonlyMap<CivId, number>)`; the default owner is 1, which covers the menu and previews.
- `rebaseCivArt(host, owners, inUse): number` frees, at match start, each civ base (and its variants) that was painted for a player who is not that civ's base owner.
- `keepWallKeys(civAges: ReadonlyMap<CivId, ReadonlySet<AgeId>>): Set<string>` replaces the fixed `commonWallPieceKeys([1,2,3], civs)` keep set. The kept ages are the ages occupied by some owner of the civ, plus the next age. It is recomputed on `gameEvents.on('ageChanged')`.
- `FrameRect { x; y; w; h; ox; oy }` in `sheet.ts`: the per-frame packed rect plus its offset inside the logical frame box. `SheetGeometry.frames: readonly FrameRect[]` is indexed by frame number. `UnitArt` registers each frame with Phaser `Frame.setTrim(blockW, blockH, ox, oy, w, h)`, so origin and feet line do not move. All rect edges are multiples of `UNIT_SHADOW_DOWNSCALE` (even, for the half mask and normal).

- [ ] **Step 1: Baseline first.** Copy the M4 `tex-memory.js` and `load-time.js` into `shots/task-1/`.
  - Add a `distinct6` scenario: `?civs=all`, 128×128 Islands, human Hungarian plus 5 AIs dealt `german, french, spanish, italian, russian`, owners spread over ages 1,2,3,1,2,3, all 10 unit types per civ, and the terrain zoom-out peak.
  - Re-measure `mixed2` (the M4 scenario) too.
  - Record both JSONs in `shots/task-1/baseline.json`. The expected `distinct6` figure is about 500 MB, with units about 300 MB.
- [ ] **Step 2: Failing tests (artLoadPlan.test.ts).** `recordingPainters(log)` is a test-local `ArtPainters` that pushes `'building <type> <civ> <owner>'`, `'wall <piece> <age> <civ>'` and `'unit <type> <civ>'`.

```ts
it('AI-only civs prewarm only age-1 unit types', () => {
  expect(prewarmUnitTypes('english', 'hungarian').sort()).toEqual(['archer', 'scout', 'swordsman', 'villager']);
  expect(prewarmUnitTypes('hungarian', 'hungarian')).toHaveLength(10);
});
it('age-up jobs paint that age’s unit sheets and the next age’s wall pieces', () => {
  const log: string[] = [];
  ageUpArtJobs('english', 2, recordingPainters(log)).forEach((j) => j());
  expect(log.filter((l) => l.startsWith('unit')).sort()).toEqual(['unit crossbowman english', 'unit knight english', 'unit pikeman english']);
  expect(log.some((l) => l.startsWith('wall') && l.includes(' 3 english'))).toBe(true);
});
it('bases are painted for each civ’s base owner', () => {
  const log: string[] = [];
  planArtLoad('hungarian', new Map([['hungarian', 1], ['english', 3]]), recordingPainters(log)).critical.forEach((j) => j());
  expect(log).toContain('building house english 3');
  expect(log.filter((l) => l.startsWith('building') && l.endsWith('english 1'))).toEqual([]);
});
```

  - In `artKeys.test.ts`: `teamArtKey('k', 3, 3) === 'k'` and `teamArtKey('k', 1, 3) === 'k@p1'`, and they round-trip through `parseBuildingArtKey`.
  - In `releaseStaleBuildingArt.test.ts` (Review Focus 2): civ base owner 3 is defeated (no sprite shows the base) while player 5's `@p5` variant is in use. The base must stay, so the variant's normal map survives. `rebaseCivArt` must free a base whose recorded owner is not the civ's base owner, and only when it is not in use.
- [ ] **Step 3: Run `npx vitest run src/scenes/game src/iso`.** Expected: the new tests FAIL (missing exports).
- [ ] **Step 4: Implement levers 1 and 2.**
  - **Lever 1 (age-aware prewarm):**
    - `UnitArtPrewarm` takes `Array<[UnitType, CivId]>` built from `prewarmUnitTypes`.
    - GameScene listens to `ageChanged`. For an AI-only civ, it calls `backgroundArt.enqueue(ageUpArtJobs(...))` once per (civ, age).
    - `unitArt` on a sheet that is not prewarmed still paints its first idle frames synchronously, which is the existing lazy path. Add a test that pins this (Review Focus 1).
  - **Lever 2 (no invisible base):** add `setBuildingBaseOwners` and `teamArtKey` with `baseOwner`, a recorded owner per base key, and `rebaseCivArt` run once after the players are created.
- [ ] **Step 5: Run the tests.** Expected: PASS.
- [ ] **Step 6: Lever 3, per-frame packed unit sheets (Hungarian and English pixels unchanged).**
  - Split each unit pin into `pixelsHash` and `geometryHash`. `pixelsHash` covers the figure prims, materials and frame-local raster pixels of every frame. `geometryHash` covers sheet size and rects.
  - Record both at the current HEAD, before any packing change, and commit (`test: split unit pins into frame pixels and sheet geometry`).
  - Then change packing in `sheet.ts`:
    - `frameBounds(type, civ, slot, anim, i)` in `rig.ts` gives each frame's own content box, using the same PAD and contact-shadow rule as today.
    - Shelf-pack every frame, tallest first.
    - `sheetPacking.test.ts` asserts that no two rects overlap; that every rect lies inside the sheet; that every frame's rasterized coverage lies inside its rect; that rect edges are multiples of `UNIT_SHADOW_DOWNSCALE`; and that packed area ≤ 0.6 × the M4 block area for every type. Print the ratios.
  - `pixelsHash` must stay byte-identical. Re-record only `geometryHash`, in the same commit, with the reason in the message.
  - `UnitArt.register` and `refresh` use the rects. The mask and normal keep the albedo-sized frames with divisor 2, per the lighting contract.
- [ ] **Step 7: Lever 4, walls only for used ages.**
  - Replace `keepWalls` with `keepWallKeys`, recomputed on `ageChanged`.
  - Background wall jobs at start cover only age 2 of each civ. Later ages come from `ageUpArtJobs`.
  - Test: `keepWallKeys(new Map([['english', new Set([1])]]))` holds age-1 and age-2 English pieces and no age-3 piece.
- [ ] **Step 8: Re-measure.** Run `distinct6`, `mixed2`, and load for 1, 2 and 6 civs (96×96, 3 AIs, focused tab, 2 runs each). Write `shots/task-1/after.json`.
  - **Pass condition:** Global Constraint 8. That is, `distinct6` reachable ≤ 256 MB with the terrain peak; `mixed2` ≤ 226.0 MB; 6-civ load − 1-civ load ≤ 5 s; 2-civ load ≤ 2.55 s + 10 %.
  - **If `distinct6` is still over:** stop, write the per-category numbers in the report and ask the controller. The only pre-approved next lever is a distinct-civ cap in "Vegyes" at the largest k that fits; it needs controller sign-off (Decision 6) and goes into CLAUDE.md §9 M5.
- [ ] **Step 9: Browser checks.**
  - Run a `?civs=all` 6-civ game, then `__forceAge` an AI to 2 and spawn a knight at once: it must be visible within the first frame.
  - Shots: `shots/task-1/units-packed-vs-m4-zoom2.jpg` and `team-colour-1-6.jpg`.
  - Run full checks.
- [ ] **Step 10: Commit** each lever separately, for example `perf: AI-only civs prewarm age-1 unit sheets; later ages paint on age-up`, `perf: civ building bases painted in their owner's colour (no invisible base)`, `perf: unit sheets packed per frame`, `perf: wall pieces kept only for ages a civ's owners can show`.

---

### Task 2: Civ extension surface (registries, isolation test, 8-civ setup UI)

**Branch:** `feat/M5-eight-civs`.

**Spec:** M4 review I4, M6, M7, Recommendation 2; Decision 9.

**Files:**
- Create: `src/iso/art/units/gearRegistry.ts`. Optionally `src/iso/art/units/baseGear.ts`, which receives the base hat and shield painters from `gear.ts`.
- Create: `src/iso/art/architecture/charges.ts` and `src/config/civSurface.test.ts`.
- Rename: `src/iso/art/testing/recordingCanvas.ts` to `recordingCanvas.testkit.ts`.
- Create: `src/iso/art/testing/pinnedArt.testkit.ts`.
- Modify:
  - `gear.ts:1-90,215-235`, `humanoid.ts:22,38,41-42,122`;
  - `english/englishGear.ts`, `facade.ts:116-145`, `style.ts:94-103`;
  - `src/ui/civPreview.ts`, `src/ui/screens/CivPicker.ts`, `src/ui/screens/GameSetup.ts` (the "Ellenfelek népe" field), `src/ui/setup.css`;
  - `src/scenes/MainMenuScene.ts:44-60`, `src/i18n/hu.ts:15`;
  - `src/scenes/BuildingShowcaseScene.ts` and `UnitShowcaseScene.ts` (silhouette mode);
  - `CLAUDE.md` §9 M5 (only if the checklist's file names changed).

**Interfaces (Produces):**
- `HatPainter = (fig: Figure, hc: V3, axes: Axes) => void`.
- `HatDef = { draw: HatPainter; coversHead: boolean }`. `coversHead` replaces the `greatHelm`/`hood` test in `humanoid.ts:122`.
- `ShieldPainter = (fig: Figure, hand: V3, T: Xform) => void`.
- `BackItemPainter = (fig, …) => void`, with the same arguments as today's quiver/bolts code.
- `WeaponStyleDef = { kind: WeaponKind; draw(fig: Figure, w: WeaponPose, d: V3, side: V3): void }`.
- `HATS`, `SHIELDS`, `BACK_ITEMS` and `WEAPON_STYLES` in `gearRegistry.ts`. Each is assembled as `{ ...BASE_X, ...ENGLISH_X }`, and each later civ adds one spread.
- `HatKind = keyof typeof HATS`, and likewise `ShieldKind`, `BackItem` and `WeaponStyle`.
- `drawHat`, `drawShield` and `drawWeapon` become lookups. `gear.ts` imports no civ module.
- `CHARGES: Record<string, ChargePainter>` in `charges.ts` (`ChargePainter = (ctx, x, y, s) => void`), with `CrestCharge = keyof typeof CHARGES`. `facade.ts crest()` looks charges up there.
- `pinBuildings(civ, expected)`, `pinWalls(civ, expected)` and `pinUnits(civ, expected)` in `pinnedArt.testkit.ts`. They hold the shared bodies of today's English pin tests, so each civ's pins are ~30 lines. English pins are rewritten onto them with the same hashes.
- `menuDioramaCivs(visit: number): [CivId, CivId]`. It returns `[MENU_CIV, the visit-th available civ other than MENU_CIV]`, cycling through the pool; `visit` is a module counter incremented by `MainMenuScene.create`.
- `hu.menu.civCount(available: number, upcoming: number): string`. It gives `'8 nép'` when `upcoming === 0`, otherwise `'N nép · M hamarosan'`.
- Setting `?silhouette=1` in `__showBuildings(opts)` and `__showUnits(opts)` (`silhouette: true`) tints every sprite black at full alpha, for the silhouette sheet in Global Constraint 11.

- [ ] **Step 1: Write the failing `civSurface.test.ts`.**
  - It reads `src/**/*.ts` (not tests or testkits) with `node:fs` and finds the civ-id string literals `'hungarian' | 'english' | 'german' | 'french' | 'spanish' | 'italian' | 'russian' | 'finnish'`.
  - These may appear only in an allowlist:
    - `types/index.ts`, `config/civs.ts`, `i18n/hu.ts`;
    - `architecture/registry.ts`, `architecture/charges.ts`, `walls/wallStyles.ts`, `units/looks.ts`, `units/gearRegistry.ts`;
    - files under a `/<civ>/` folder;
    - the Hungarian style and wall files that exist today (`hungarianStyles.ts`, `wallStyles.ts`).
  - The test also asserts that `gear.ts` and `facade.ts` import nothing from a `/<civ>/` folder.
  - Expected first run: FAIL on `gear.ts` (it imports `english/englishGear`).
- [ ] **Step 2: Build the registries.**
  - Implement `gearRegistry.ts` and `charges.ts`, and move the English entries into `englishGear.ts`, which exports `ENGLISH_HATS`, `ENGLISH_SHIELDS` and `ENGLISH_WEAPON_STYLES`, and `english/englishCharge.ts`.
  - Run `npx vitest run src/config/civSurface.test.ts src/iso/art`. Expected: PASS, and all Hungarian and English pins unchanged.
- [ ] **Step 3: Pin testkit and rename.** Add `pinnedArt.testkit.ts`, port the English and Hungarian pin tests onto it (same hashes) and rename the recording canvas.
- [ ] **Step 4: `ArchFamily` vs `ArchStyleId` (M7): keep them separate.**
  - M5 civs ride families under their own style ids (e.g. style `fachwerk` on family `tudor`).
  - Document the split in `style.ts`.
  - Add a `style.test.ts` case: every registered style's family exists in `ARCH_FAMILIES`, and every bespoke family's painted volume fits its canvas whatever `headroom` is.
- [ ] **Step 5: Civ previews keep data URLs only (M6).**
  - In `civPreview.test.ts`, use a fake TextureManager. After `paintNextCivPreview`, the town-centre texture is removed when it did not exist before the call, and kept when it existed (the menu diorama shows it).
  - Implement it. A failed preview shows a static placeholder and stops the shimmer.
- [ ] **Step 6: Setup UI for 8 civs.**
  - `CivPicker` lays out 8 cards in a 4×2 grid that fits the card's column at 1280×720 and 1400×900. "Hamarosan" chips stay for unavailable civs, with contrast ≥ 4.5:1. The card's accessible name is the civ name only, and the description goes in `aria-describedby`.
  - "Ellenfelek népe" becomes a radiogroup of compact chips: Vegyes plus each available civ. It wraps onto two rows, and arrow navigation comes from `radioNav`.
  - Test: `radioNav` with 9 enabled options visits all 9 in order and wraps (Review Focus 5).
  - Shots with `?civs=all`: `shots/task-2/setup-8civs-1280x720.jpg` and `-1400x900.jpg`, both with keyboard focus on the last AI chip.
- [ ] **Step 7: Menu diorama and civ-count copy.**
  - Test `menuDioramaCivs` (it cycles and never returns MENU_CIV twice) and `civCount`.
  - Wire both. `hu.menu.features` uses `civCount`.
- [ ] **Step 8: Silhouette showcase mode.** Add the mode, then take `shots/task-2/silhouette-hu-en-ages1-3.jpg` (zoom 1.0) as the reference sheet for every civ task.
- [ ] **Step 9: Checklist and checks.** Compare the CLAUDE.md §9 M5 checklist with the actual file names and amend it if needed. Run full checks.
- [ ] **Step 10: Commit** in two commits: `refactor: gear and crest-charge registries; shared painters import no civ` and `feat(ui): setup and menu scale to eight civs; previews keep data URLs only`.

---

## Per-civ task contract (Tasks 3–14)

Every civ runs two tasks on its own branch (Decision 8). The table after this section gives each civ's art. The contract below gives the files, interfaces and steps once; each civ task lists only what differs.

**(a) Architecture task**

**Files:**
- Create in `src/iso/art/architecture/<civ>/`:
  - `<civ>Styles.ts` (three `ArchStyle`s with a non-zero `seedSalt` unique across civs, and the `charge` id);
  - painter files per bespoke family or override (`<family>.ts`, `<family>Work.ts`, parts);
  - `<wonder>.ts` plus parts;
  - `<civ>Charge.ts`;
  - `<civ>Art.test.ts` and `<civ>Pinned.test.ts`.
- Kits used by two or more civs go into `architecture/kits/`.
- Modify: `config/civs.ts` (`ArchStyleId` members and the civ's `architecture`; still `available: false`), `architecture/registry.ts` (rows), `style.ts` (an `ArchFamily` member for each bespoke family) and `architecture/charges.ts` (a spread).

**Interfaces:**
- Consumes `ArchStyle`, `ARCH_FAMILIES`, `CHARGES`, `pinBuildings` and the silhouette showcase.
- Produces the civ's style ids, which are listed per civ below.

**Steps:**
- [ ] **Step 1: Failing `<civ>Art.test.ts`.** For each type in `town_center, house, farm, lumber_camp, mining_camp, barracks, archery_range, stable, blacksmith, foundry, tower, wall, wonder` and each age 1–3, `paintBuilding(type, TEAM, age, '<civ>')` must:
  - paint;
  - have a volume that fits its canvas;
  - after `trimLitArt`, keep every glow, volume point and smoke anchor inside the canvas (Review Focus 4);
  - have at least one glow on the town centre and the house;
  - use the team colour somewhere (a recorded `fillStyle` equals the team css).

  The Wonder must paint every `wonderStage` and its final art. The test fails on the missing style ids.
- [ ] **Step 2: Styles and registry rows.** Write the styles and registry rows (the cheap path rides an existing family). Expected: structural tests PASS on the inherited layouts.
- [ ] **Step 3: Painters.** Write the bespoke painters and overrides from the civ's table row, then the Wonder with its stages, then the charge.
- [ ] **Step 4: Browser shots** into `shots/task-N/`:
  - `__showBuildings({ ages:[1,2,3], civs:[hungarian, english, …earlier M5 civs, <civ>], zoom:1.0, phase })` at noon and at dusk;
  - the same with `silhouette: true`;
  - the Wonder's stages;
  - an in-play town at ages 1→3 via `__forceAge` with `?civs=all`, with the age-up wave mid-flight.

  Iterate until the silhouette sheet names the civ.
- [ ] **Step 5: Pins.** Record `<civ>Pinned.test.ts` via `pinBuildings` at the final art. Run every pin plus the full checks.
- [ ] **Step 6: Commit** `feat: <civ> architecture (ages 1-3) and <wonder> Wonder`. Kit extractions get their own `refactor:` commit first, with English pins green.

**(b) Walls, units and availability task**

**Files:**
- Create:
  - `walls/<civ>/<civ>Walls.ts` (+ parts) and `<civ>WallsPinned.test.ts`;
  - `units/<civ>/<civ>Looks.ts`, `<civ>Gear.ts`, `<civ>Materials.ts`, `<civ>Units.test.ts` and `<civ>UnitsPinned.test.ts`.
- Modify:
  - `config/civs.ts` (`WallStyleId` and `UnitLookId` members; `wallStyle`, `unitLook`, `heraldry`; `available: true`);
  - `walls/wallStyles.ts`, `units/looks.ts` and `units/gearRegistry.ts` (one spread each);
  - `i18n/hu.ts` (refine `civDesc.<civ>` to match the art).

**Interfaces:**
- Consumes `WallAgeStyle` / `wallKit`, `UnitLook` and the gear registries.
- Produces nothing new for later tasks beyond the registry rows.

**Steps:**
- [ ] **Step 1: Failing `<civ>Units.test.ts`.**
  - **Cue rule:** for each age a, at least one unit type with `UNIT_BALANCE[type].age === a` has a `hat`, `shield` or `weaponStyle` that differs from the same type in every other registered look (Hungarian, English and earlier M5 civs).
  - **Team readability** (Review Focus 3): for every type, team-mask coverage summed over the idle frames is ≥ 0.8 × the Hungarian type's coverage.
  - Every type rasterizes in all 5 painted headings.
- [ ] **Step 2: Failing wall test** (in `<civ>Walls.test.ts`, the pattern of `englishWalls.test.ts`): every common wall piece × age paints and has a volume inside its canvas, and the join pieces line up (`wallJoin` rules).
- [ ] **Step 3: Implement.** Write the looks, gear, walls and registry rows; set `available: true` and refine the `hu.ts` description. `assignCivs` tests already cover the larger pool; add one case in which 5 AIs over a pool of ≥ 6 get 5 distinct civs.
- [ ] **Step 4: Browser shots.**
  - `__showUnits({ civs:[all registered], headings: 8 })` in idle and walk, team colours 1–6, plus the silhouette mode.
  - Walls of ages 1–3 beside the other civs' walls, at noon and dusk.
  - The setup card with the civ's live preview.
  - A short real game as this civ against `Vegyes`.
- [ ] **Step 5: Pins.** Record the unit and wall pins. Run every pin plus the full checks. Measure load with this civ added (`load-time.js`, 1 civ vs this civ + 1): the extra must be ≤ ~1 s.
- [ ] **Step 6: Commit** `feat: <civ> walls and unit look; <civ> playable`.

### Per-civ art table

"Cheap" means riding an existing family with `ArchStyle` and kits. "Bespoke" means a new `ArchFamily` that may spread an existing family's layouts. Each **Cue** is the silhouette the reviewer must see on the silhouette sheet.

| Civ | Age 1 | Age 2 | Age 3 | Wonder | Walls 1 / 2 / 3 | Units: palette · charge · cues by age |
|---|---|---|---|---|---|---|
| German | **Cheap**, `roman` family, style `limes`: red sandstone, half-timber upper storeys, steep (pitch ≈ 1.35) shingle. Override: town centre as a Porta Nigra twin-tower gate hall. Cue: twin gate towers + steep shingle. | **Cheap**, `tudor` family, style `fachwerk`: red-ochre framing with K-braces and Mann figures on cream, plain red tile, no tall stacks. New kits: `steppedGable`, `needleSpire`. Cue: stepped gables + slate needle spires. | **Cheap**, `georgian` family, style `backstein`: dark Backstein brick, cream trim, steep red tile, stepped gables, green copper spire on the town centre. Cue: stepped brick gables vs Georgian hips. | Speyer-like Kaiserdom: red sandstone nave, two tower pairs with rhomboid helms, octagonal crossing tower, dwarf galleries. | Limes palisade with square timber watchtowers (bank_palisade kit, civ timber) / Backstein curtain with needle-capped piers / star fort kit in red sandstone. | Black–gold–red · black eagle on gold (`eagle`) · A1 oval Germanic board shield with boss · A2 feathered slashed Landsknecht beret (pikeman, crossbowman) · A3 spiked leather helm (musketeer, cavalry; stylised, readability over period accuracy). |
| French | **Cheap**, `roman` family, style `gallo_roman`: pale limestone, blue-grey slate, pitch ≈ 1.2. Override: town centre as a Maison Carrée temple-forum. Cue: temple portico + slate. | **Bespoke** `gothic_fr` (spreads `medieval`): pale ashlar, round corner towers with conical slate "pepperpot" caps (kit `pepperpot`), lancets; town centre = Loire château keep with four turrets. Cue: candle-snuffer cones. | **Cheap**, `baroque` family, style `classicisme`: pale limestone, blue-black slate mansards, tall chimneys, oeil-de-boeuf dormers; kit `pavilionRoof` (tall truncated hip) on the town centre and barracks. Cue: tall pavilion roofs (vs Hungarian ochre mansard). | Versailles-like palace: long wings round a cour d'honneur, central pavilion, gilded gate and railing, parterre. | Murus gallicus (timber-laced stone, beam ends) / limestone curtain with pepperpot piers / Vauban star fort (kit) in pale limestone with grass glacis. | Blue–gold–white · fleur-de-lis (`fleur_de_lis`) · A1 long Gaulish body shield + wheel-crested helm · A2 pointed "hounskull" visored bascinet (knight, pikeman) · A3 bicorne (musketeer) + horsehair-crest cuirassier helm (cavalry). |
| Spanish | **Bespoke** `hispania`: whitewashed flat-roofed courtyard houses with parapets, low terracotta on halls; town centre = forum behind an aqueduct arcade. Cue: flat roofs + patios. | **Bespoke** `mudejar` (spreads `hispania` layouts): brick Mudéjar towers with horseshoe arches and glazed-tile bands; town centre = Castilian keep (torre del homenaje) with bartizans. Cue: square keep + horseshoe arches. | `mudejar` layouts, style `colonial`: whitewash, ochre plateresque portals, low terracotta hips, espadaña bell gables, iron balconies. Cue: espadañas. | Alhambra-like palace: arcaded court with fountain (Court of the Lions), Comares tower, reflecting pool, red-ochre walls. | Celtiberian dry stone / ochre rammed-earth (tapial) with stepped pyramidal merlons / whitewashed bastion with domed garitas on the piers. | Red–gold–dark red · Castile castle (`castle`) · A1 small round caetra + falcata (weapon style) · A2 heart-shaped adarga (knight, pikeman) · A3 crested morion (musketeer, pikeman). |
| Italian | **Cheap+** `roman` family + kit `insula`, style `etruria`: 3-storey brick insulae with arched tabernae, low terracotta; town centre = arcaded basilica. Cue: tall arcaded blocks (vs Hungarian single-storey villas). | **Bespoke** `comune`: brick tower-houses (San Gimignano), swallowtail (Ghibelline) merlons, loggias; town centre = Palazzo Pubblico with a slender Mangia-like tower. Cue: tower skyline. | **Bespoke** `rinascimento`: rusticated palazzi with heavy cornices, arcaded loggias, low terracotta hips, small lantern domes. Cue: flat cornice blocks + arcades + small domes. | Florence-like cathedral: octagonal ribbed terracotta dome with lantern, white/green/pink marble bands, free-standing campanile. | Servian ashlar (opus quadratum) / brick with swallowtail merlons / trace italienne bastion (star fort kit) in brick with a stone cordon. | Green–white–red · tricolour pales (`tricolore`) · A1 Samnite triple-feather helm · A2 barbute + Genoese pavise (crossbowman, back item) · A3 wide-brim plumed hat (musketeer). |
| Russian | **Bespoke** `izba`: log cabins with steep plank roofs and carved gable boards; town centre = log hillfort tower on an earth rampart. Cue: log walls + steep plank gables. | `izba` layouts + kits `onionDome`, `tentRoof` (shatyor), style `muscovy`: white stone and log; town centre = kremlin tower with a tent roof and onion. Cue: onions + tent roofs. | **Cheap**, `baroque` family + `onionDome`, style `petrine`: turquoise/white plaster, white columns, gold onions on the town centre and barracks. Cue: gold onions + turquoise. | St Basil's-like cathedral: cluster of striped and spiral onion domes round a central tent spire. | Log palisade on a rampart / log-crib (gorodnya) wall with tent-roofed timber towers / whitewashed brick with green tented towers. | White–blue–red · St Andrew's saltire (`saltire`) · A1 pointed spangenhelm with aventail · A2 tall shishak + red teardrop shield · A3 fur-trimmed Streltsy kolpak with a long kaftan skirt (musketeer) and a berdysh back item. |
| Finnish | **Bespoke** `nordic`: low log huts with green turf roofs, small bark kota, aittas on stilts; town centre = turf-roofed longhouse hall. Cue: turf roofs (darker and lower than English thatch cones). | `nordic` layouts, style `greystone`: red-ochre (punamulta) logs, shingle roofs; town centre = grey granite castle hall; separate wooden bell tower (kellotapuli). Cue: granite hall + bell tower. | `nordic` layouts, style `gustavian`: falu-red board houses with white corners, shingled mansards; yellow-ochre manor town centre. Cue: red boards + white corners. | Petäjävesi-like church: log cross plan, steep shingled tent roof with lantern, separate bell tower. | Dry-stone hill-fort heap / grey granite boulder curtain with shingle-capped round towers / granite bastion with turf top (star fort kit). | White–blue–grey · Nordic cross (`nordic_cross`) · A1 fur cap + round lime-wood shield · A2 conical nasal helm · A3 Hakkapeliitta lobster-pot (zischägge) helm (cavalry) + karvalakki fur hat (musketeer). |

**Distinctness checks the reviewer runs** (silhouette sheet, zoom 1.0):
- German age 2 against English Tudor: no jetties, no tall stacks, stepped gables.
- French age 3 against Hungarian baroque: slate, pale stone, pavilion roofs.
- Italian age 1 against Hungarian Roman: storeys and arcades.
- Russian age 3 against Hungarian baroque: onions.
- Finnish age 1 against English age 1: low turf against tall thatch cones.

Any civ that fails a check is not done.

### Task 3: German architecture (cheap path proof)

**Branch:** `feat/M5-german`, created from `feat/M5-eight-civs` at Task 2's head. **Contract:** (a) above, with the German row.

- [ ] **Step 0: Extract the shared kits first** (`refactor:` commit, English pins green):
  - `english/halfTimber.ts` becomes `kits/halfTimber.ts`, with a pattern param `'tudor' | 'alemannic'`;
  - the chimney stack and jetty helpers become `kits/`.
- Style ids: `limes`, `fachwerk`, `backstein`. Bespoke code is limited to the Porta Nigra town-centre override, the `steppedGable` and `needleSpire` kits, and the Kaiserdom.
- Report: lines of painter code added, for the cheap path's cost record. The report must also say whether the cheap path read as German on the silhouette sheet; if not, which families need bespoke overrides for later civs.

### Task 4: German walls, units, availability

**Branch:** `feat/M5-german`. **Contract:** (b), with the German row. Wall ids: `limes_palisade`, `backstein_curtain`, `sandstone_fort`. Look id: `german`.

### Task 5: French architecture

**Branch:** `feat/M5-french`, created from `feat/M5-german`. **Contract:** (a). Style ids: `gallo_roman`, `gothic_fr`, `classicisme`. Family: `gothic_fr`. Kits: `pepperpot`, `pavilionRoof`.

### Task 6: French walls, units, availability

**Branch:** `feat/M5-french`. **Contract:** (b). Wall ids: `murus_gallicus`, `pepperpot_curtain`, `vauban`. Look id: `french`.

### Task 7: Spanish architecture

**Branch:** `feat/M5-spanish`, created from `feat/M5-french`. **Contract:** (a). Style ids: `hispania`, `mudejar`, `colonial`. Families: `hispania`, `mudejar`. The courtyard (patio) is a kit, because the Alhambra reuses it.

### Task 8: Spanish walls, units, availability

**Branch:** `feat/M5-spanish`. **Contract:** (b). Wall ids: `celtiberian`, `tapial`, `garita_bastion`. Look id: `spanish`.

### Task 9: Italian architecture

**Branch:** `feat/M5-italian`, created from `feat/M5-spanish`. **Contract:** (a). Style ids: `etruria`, `comune`, `rinascimento`. Families: `comune`, `rinascimento`. Kits: `insula`, `arcade` (shared with the Spanish courtyard if it fits), `swallowtail` (shared with the wall).

### Task 10: Italian walls, units, availability

**Branch:** `feat/M5-italian`. **Contract:** (b). Wall ids: `servian`, `ghibelline`, `trace_italienne`. Look id: `italian`. `pavise` is a new back item in `BACK_ITEMS`.

### Task 11: Russian architecture

**Branch:** `feat/M5-russian`, created from `feat/M5-italian`. **Contract:** (a). Style ids: `rus_gord`, `muscovy`, `petrine`. Family: `izba`. Kits: `onionDome`, `tentRoof`, `logWall`. The Finnish tasks reuse `logWall`.

### Task 12: Russian walls, units, availability

**Branch:** `feat/M5-russian`. **Contract:** (b). Wall ids: `rus_palisade`, `gorodnya`, `kremlin`. Look id: `russian`. `berdysh` is a back item.

### Task 13: Finnish architecture

**Branch:** `feat/M5-finnish`, created from `feat/M5-russian`. **Contract:** (a). Style ids: `finnic`, `greystone`, `gustavian`. Family: `nordic`. Kits: `turfRoof`, `shingleRoof`, and `logWall` from Task 11.

### Task 14: Finnish walls, units, availability

**Branch:** `feat/M5-finnish`. **Contract:** (b). Wall ids: `hillfort`, `granite_curtain`, `granite_bastion`. Look id: `finnish`. After this task no civ is `available: false`.

---

### Task 15: Eight-civ smoke, performance and setup UI

**Branch:** `feat/M5-eight-civs`, fast-forwarded to `feat/M5-finnish` (`git checkout feat/M5-eight-civs && git merge --ff-only feat/M5-finnish`).

**Spec:** CLAUDE.md §9 M5; Global Constraint 8; Review Focus 1 and 5.

**Files:**
- Create: `src/ai/strategies/eightCivs.sim.test.ts` and `src/iso/art/allCivsArt.test.ts`.
- Modify: `src/ui/screens/CivPicker.ts` and `setup.css` (if the shots require it); `CLAUDE.md` §9 M5 (status line; distinct-civ cap note only if Task 1 adopted one).

**Steps:**
- [ ] **Step 1: Write `allCivsArt.test.ts`.** For every civ in `CIV_IDS`, every age, every building type and every unit type, the art paints; every civ has `available: true`; and `ARCH_STYLES`, `WALL_STYLE_BY_ID` and the look overrides hold an entry for every id that `CIV_DEFS` names. It must pass at once; it guards future edits.
- [ ] **Step 2: Write `eightCivs.sim.test.ts`.** It has two headless 96×96 matches with the `threeAges.sim.test.ts` target rules, so that all 8 civs appear across the two runs:
  - Run A: human slot Hungarian (Medium), with AIs german Hard, french Easy, spanish Medium, italian Easy and russian Easy.
  - Run B: human slot english (Medium), with AIs finnish Hard and the rest Easy.

  Each run asserts that the civs are as requested; that no exception is thrown; that there are ≤ 500 entities; that the Medium and Hard sides reach age 3 before 30 min; and that both runs see foundries and cannons. Run `npx vitest run src/ai/strategies/eightCivs.sim.test.ts`. Expected: PASS. Report the run times.
- [ ] **Step 3: Browser smoke** (real UI, dev aids disclosed as in M4 Task 8): the human plays Russian against 5 "Vegyes" AIs on Nagy/Szigetek (a 6 distinct civ draw; choose a seed that gives one).
  - Steps: build, train, fight, age up to 3, foundry, cannon, Wonder placed.
  - Shots: each age's town; a mixed battle with at least 4 civs on screen; and each new civ's Wonder in play via `__forceAge` + spawn.
  - There must be no console errors.
- [ ] **Step 4: Measure Global Constraint 8.** Use the workspace scripts and write `shots/task-15/*.json`:
  - frame CPU (avg/p95/worst) on 96×96 with 4 players of 4 distinct civs;
  - `distinct6` with real art, and `mixed2`;
  - load for 1, 2 and 6 civs;
  - bundle gzip.

  Fix hot spots until every figure holds. Real art can exceed Task 1's stub figures; if it does, apply Task 1's levers before anything else.
- [ ] **Step 5: Setup UI.**
  - There are no "hamarosan" chips; the menu feature line reads "8 nép".
  - 8 cards with live previews and 9 "Ellenfelek népe" options fit at 1400×900 and 1280×720, with the Start button in view and focus never under the sticky footer.
  - Keyboard-only shots: `setup-1280x720-kbd.jpg` and `setup-1400x900.jpg`.
  - The preview paint stays spread at one per frame, and the menu stays smooth (frame-time trace while the 8 previews paint, no frame over 50 ms).
- [ ] **Step 6: Full checks and CLAUDE.md.** Run the full checks. Update the CLAUDE.md §9 M5 status (and the footer date), then commit: `test: eight-civ headless matches and art sweep`, `perf: …` (if any) and `docs: M5 complete`.
