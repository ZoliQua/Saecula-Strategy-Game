# M17 — Trade and one landmark per nation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A market (resource exchange with per-player prices, trains trade carts), trade carts and trade ships that earn gold between two friendly markets/docks, and one landmark building per nation with its own art and effect, saved in schema 11.

**Architecture:** `market` and `landmark` are new BuildingTypes; `trade_cart` and `trade_ship` new BaseUnitTypes. The landmark is ONE type whose name, painter and effect come from the nation (`CivDef.landmark` in `config/civs.ts`, painters registered in `architecture/registry.ts`). A `TradeSystem` drives the market-to-market loop (modelled on the gathering loop). Landmark effects reuse existing systems: forts widen the tower checks, the sauna reuses an extracted heal helper, the mint adds a per-player gold trickle, and four new modifier kinds join `modifiers.ts`, active only while the owner has a finished landmark.

**Tech Stack:** TypeScript strict, Phaser 3, Miniplex ECS, Vitest, zod saves; procedural canvas art (`src/iso/art/`).

**Spec:** CLAUDE.md §9 "M17 — Kereskedelem és népenkénti egyedi épület" (Hungarian, binding). Codebase map: `.superpowers/sdd/2026-11-22-m17-trade-landmarks/codemap.md`.

## Global Constraints

- Hungarian UI text only in `src/i18n/hu.ts`; code, identifiers, comments, commits in English.
- Stat numbers only in `src/config/balance.ts` (`MARKET`, `TRADE`, `LANDMARK`, the two buildings in `BUILDING_BALANCE`, the two units in `UNIT_BALANCE`).
- Civ ids appear only in the files `src/config/civSurface.test.ts` allows (the civ → landmark map lives in `config/civs.ts` and `architecture/registry.ts`; landmark painters in `iso/art/architecture/<civ>/`).
- TS `strict`, no `any`; `SCHEMA_VERSION` 11 with `v10ToV11` and a REAL v10 fixture generated with the code before the bump; `allVersions.test.ts` covers it.
- Existing matches without markets/landmarks must play exactly as before: existing sims, snapshot and pinned art tests unchanged (new art gets unpinned determinism tests like `religiousArt.test.ts` / `navalArt.test.ts`, because draw-log hashes differ between Node versions).
- Texture budget: land ≤ 256 MB, sea ≤ 400 MB (`scripts/perf/texmem.mjs`); cart and landmark sheets painted on demand; the trade ship reuses the transport sheet.
- Visual quality matters (owner's priority): the art style matches the existing procedural architecture and units (light normal maps, palette from `ArchStyle`, team colour where specified, window glows only where visible).
- Never touch the dev server on port 5173; browser checks on 5196.

## Review Focus

- A trade cart whose target market is destroyed (or becomes an enemy's after conversion) stops cleanly and does not loop or crash — test in Task 2.
- Two own markets closer than `TRADE.minDistance`: the route is refused with a Hungarian notice — test in Task 2.
- Market price never leaves its bounds after many trades, and the human can't buy with insufficient gold (UI store wallet) — test in Task 1.
- A second landmark is refused (UI greyed, AI never builds two), and a landmark's modifier stops when it is destroyed — test in Task 3.
- A v10 save loads into schema 11 and plays on — test in Task 1.

---

### Task 1: Market building, exchange, schema 11

**Files:** `src/types/index.ts`, `src/config/balance.ts` (`market` in BUILDING_BALANCE: age 2, 3×3; `MARKET`), `src/ecs/archetypes/building.ts` (TEXTURE_KEYS), `src/iso/art/architecture/market.ts` (new shared palette painter: market hall with arcade, stalls with striped awnings, crates and barrels; style follows `monastery.ts`/`dock.ts`), `architecture/registry.ts`, `iso/art/buildings.ts` lists, `src/game/market.ts` (+test: `marketBuy`, `marketSell`, price update, bounds, fee), `src/save/schema.ts` (Player market prices), `src/save/migrations/v10ToV11.ts` (+test, + real v10 fixture, allVersions), `src/ui/panels/` market buttons in the selection/command panel, `src/scenes/GameScene.ts` command wiring, `src/i18n/hu.ts`, `ui/panels/CommandPanel.ts` (market in the villager build menu), tech tree.

**Interfaces:**
- Produces: `MARKET = { lot: 100, startPrice: { food: 100, wood: 100 }, step: 0.03, minPrice: 20, maxPrice: 300, sellFee: 0.3 }` (price = gold per lot; buy pays price, sell receives price × (1 − fee); each buy raises that resource's price by `step` × price, each sell lowers it; clamp).
- Produces: `Player.marketPrices: { food: number; wood: number }` (saved; default `MARKET.startPrice`), `marketBuy(player, wallet, resource)`, `marketSell(player, wallet, resource)` returning `{ ok: boolean; reason?: 'gold' | 'resource' }`, `marketRateMultiplier(player)` hook (identity until Task 3 adds Bankház).
- Commands: `{ type: 'market-buy' | 'market-sell', marketId, resource }` through the existing command bus (human uses `uiWallet`).

- [ ] Generate the real v10 fixture first with the unchanged code; failing tests for exchange math, bounds, fee, insufficient funds, migration.
- [ ] Implement; market art paints for every civ and age (determinism + no hidden glow test, unpinned); build menu, panel buttons with current price ("Vétel: 100 étel — 112 arany"), tech tree entry.
- [ ] Commit `feat: M17 market and resource exchange (schema 11)`.

### Task 2: Trade cart and trade ship

**Files:** `src/types/index.ts`, `balance.ts` (`trade_cart`: age 2, trainer market, land; `trade_ship`: age 2, trainer dock, naval; `TRADE = { goldPerTile, allyBonus, minDistance }`), `ecs/archetypes/unit.ts` (TEXTURE_KEYS: `trade_ship` → the transport's key), `createUnit.ts`, new component `tradeRoute { homeId, targetId, toTarget: boolean }` in `ecs/components` + `save/schema.ts`, new `src/ecs/systems/TradeSystem.ts` (+test), system order in `SystemRunner` and the headless match, `OrderIssuer` (right-click a friendly market/dock with carts/ships selected → route; refused with notice if too close or not friendly), cursor, selection panel route line, `iso/art/units/` new wagon look kind + cart painter (horse-drawn covered wagon; canvas cover team colour, wood/iron from the civ palette; anims idle/walk/death like the transport), `layout.ts` `unitAnims`/`WALK_CYCLE_TILES`, `i18n/hu.ts`.

**Interfaces:**
- Gold per arrival = `round(TRADE.goldPerTile × distance(homeMarket, targetMarket) × (ally ? 1 + TRADE.allyBonus : 1) × tradeGoldMultiplier(owner))` (`tradeGoldMultiplier` identity until Task 3). Distance in tiles between building origins (Chebyshev or Euclidean — pick one, document).
- Credit gold through one helper (human: UI store wallet; AI: Player.resources) and count it as gathered in MatchStats.
- The cart walks to a tile adjacent to the target's footprint (reuse `findAdjacentToFootprint`), then turns back toward home; ships use the water layer and a shore tile next to the dock.
- Treaty/teams: trading with an ally is allowed during a treaty; trade with a non-ally is never possible.

- [ ] Failing tests: shuttle and gold, ally bonus, too-close refusal, destroyed target stops the cart (Review Focus), converted target market stops it, ship route between two docks, save round trip with a route.
- [ ] Implement; cart art for every civ (determinism, unpinned); trade ship shares the transport sheet (verify in a test that its texture key equals the transport's and its anims match).
- [ ] Commit `feat: M17 trade carts and trade ships`.

### Task 3: Landmark framework and effects

**Files:** `types/index.ts` (`landmark`), `balance.ts` (`landmark` BUILDING_BALANCE: age 2, 3×3; `LANDMARK = { fort: {...attack, hp}, mintGoldPerMin, saunaHealPerSec, saunaRange, dockTrainSpeed, tradeGold, researchSpeed, marketRate }`; `UNIQUE_BUILDINGS` gains `landmark`), `config/civs.ts` (`CivDef.landmark: LandmarkEffect` for the 8 civs as in CLAUDE.md), `game/technologies.ts` + `game/modifiers.ts` (new kinds `tradeGold`, `researchSpeed`, `marketRate`, `dockTrainSpeed`, applied only while the owner has a finished landmark), `ResearchSystem.ts` (research speed), `TrainingSystem` (dock train speed), `TowerCombatSystem.ts` / `CombatSystem.ts` / `CombatFxSystem.ts` (widen the `'tower'` checks to "tower or fort landmark"), extracted heal helper from `MonkSystem` used by a new `LandmarkSystem.ts` (sauna heal + mint trickle with a saved per-player carry), `hu.ts` (`landmarks: Record<CivId, { name, role }>`), build menu label and tech tree showing only the own nation's landmark, `artLoadPlan.ts` (only the match's civs' landmark art; AI civs' in the background), `iso/art/buildings.ts` (sizes per civ: every civ paints a landmark — fix the `DEFAULT_CIV`-only `ALL_TYPES` sizing).
- Until Task 4/5 land, each civ's landmark uses a temporary shared painter (a plain keep) so the framework is testable; Tasks 4–5 replace it per civ.

**Interfaces:**
- Produces: `LandmarkEffect = { kind: 'fort' } | { kind: 'mint' } | { kind: 'sauna' } | { kind: 'modifier'; effect: TechEffect }`; `landmarkOf(civ)`; `hasActiveLandmark(world, playerId)`.

- [ ] Failing tests: one per player (human + AI path), modifier active only while finished and standing (Review Focus), fort shoots enemies in range (and respects treaty/teams), sauna heals own units in range only, mint trickle per minute (human and AI wallets), research and dock speed, market rate effect on Task 1 math.
- [ ] Implement; commit `feat: M17 landmark framework and effects`.

### Task 4: Landmark art — Hungarian, English, German, French

Painters in `iso/art/architecture/<civ>/` registered for all of the civ's age styles (palette changes by age; the silhouette is the landmark's):
- Hungarian **Végvár**: a palisaded stone frontier castle — square keep with a wooden gallery (hurdling), a low curtain wall, a corner bastion, the Hungarian banner.
- English **Királyi hajógyár**: a slipway with a ship's ribbed hull under construction, a timber crane, a brick storehouse, rope coils.
- German **Hanza-kontor**: a tall brick stepped-gable warehouse (Backstein) with a hoist beam and loading doors, a crane wheel.
- French **Akadémia**: a classical academy — columned portico, a dome with an observatory cupola, symmetric wings.
Each: determinism + no hidden glow test (unpinned), a screenshot sheet of the four civs × ages saved under the SDD folder for review.

- [ ] Commit `feat: M17 landmark art for the Hungarian, English, German and French`.

### Task 5: Landmark art — Spanish, Italian, Russian, Finnish

- Spanish **Pénzverde**: a whitewashed mint with a tiled roof, an arcaded courtyard, a chimney for the furnace, a coin press.
- Italian **Bankház**: a Renaissance palazzo — rusticated ground floor, arched windows, a heavy cornice, a loggia.
- Russian **Osztrog**: a log fortress — sharpened palisade, a tall timber watchtower with a tent roof, a gate tower.
- Finnish **Szauna**: a lakeside log sauna with a turf/shingle roof, a stone stove chimney with steam, a jetty, birch whisks.
Same tests and screenshot sheet.

- [ ] Commit `feat: M17 landmark art for the Spanish, Italian, Russian and Finnish`.

### Task 6: AI

**Files:** `config/aiMedium.ts` / `aiHard.ts` (market + landmark in the age-2 build list after military; selling rule thresholds; `trade.carts`), a new `src/ai/TradePlay.ts` (+test) modelled on `MonkPlay`/`NavalPlay`: build market and landmark, sell surplus (e.g. food or wood > 1000 while gold < 200) at most once per N seconds, train up to `trade.carts` carts only if an allied market exists ≥ `TRADE.minDistance` away and route them there. Easy AI: nothing. Sim: 96×96 meadow, Medium, 40 min — market and landmark built; in a 2v2 with allies the allied AI runs at least one trade cart that earns gold. Existing sims stay green (if an AI change moves a seed-sensitive sim, re-sweep and document as house style).

- [ ] Commit `feat: M17 AI builds markets and landmarks, sells surplus, trades with allies`.

### Task 7: Docs, changelog, measurements, browser smoke

- [ ] CHANGELOG (EN/HU) [Unreleased], README (EN/HU) features, CLAUDE.md M17 "Állapot" with: full suite, sims, texmem distinct6 and naval6 --ships (with a landmark and carts for every civ — extend `spawnShips`-style helper if needed), bundle, browser smoke on 5196 (market exchange buttons, a cart route earning gold, the human's landmark built and its effect visible, screenshots), no console errors.
- [ ] Commit `docs: M17 status, changelog and readme`.
