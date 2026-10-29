# PROGRAM_TERV.md — Saecula részletes fejlesztési terv

> Ez a dokumentum a CLAUDE.md kiegészítése. A CLAUDE.md rögzíti, **mit**
> építünk (scope + architektúra). Ez a dokumentum rögzíti, **hogyan** és
> **milyen sorrendben** építjük (taskok, stat táblák, algoritmusok).
>
> Claude Code-nak: ezt a dokumentumot task-szinten kövesd. Minden task egy
> különálló Claude Code session-ben elvégezhető. A task végén ellenőrizd
> az acceptance criteria pontokat. Ha valami nem illik, kérdezz vissza.

**Név:** Saecula (korábbi munkacím: IsoRTS)
**Tervezett időkeret:** 5-8 hónap part-time
**Utolsó frissítés:** 2026-04-21

---

## Tartalomjegyzék

1. [Áttekintés és munkamódszer](#1-áttekintés-és-munkamódszer)
2. [M0 — Foundation (engine indítás)](#2-m0--foundation-engine-indítás)
3. [M1 — Egy nép, egy kor vertical slice](#3-m1--egy-nép-egy-kor-vertical-slice)
4. [M2 — Harci rendszer és első AI](#4-m2--harci-rendszer-és-első-ai)
5. [M3 — Három kor komplett](#5-m3--három-kor-komplett)
6. [M4-M6 — Bővítés és polírozás](#6-m4-m6--bővítés-és-polírozás)
7. [Egység statisztikák — teljes táblázat](#7-egység-statisztikák)
8. [Épület statisztikák — teljes táblázat](#8-épület-statisztikák)
9. [Technológiai fejlesztések (tech fa)](#9-technológiai-fa)
10. [AI rendszer — 3 nehézségi szint](#10-ai-rendszer)
11. [Térkép sablonok és generátor](#11-térkép-sablonok-és-generátor)
12. [Audio rendszer](#12-audio-rendszer)
13. [Interface kontrakt-ok (típusok)](#13-interface-kontraktok)

---

## 1. Áttekintés és munkamódszer

### 1.1 Milestone struktúra

| Milestone | Cél | Becsült munkaóra | Taskok száma |
|---|---|---|---|
| M0 | Foundation, engine alapok | 20-30h | 8 |
| M1 | 1 nép, 1 kor vertical slice | 60-80h | 18 |
| M2 | Harci rendszer, első AI | 50-70h | 14 |
| M3 | 3 kor komplett | 50-70h | 14 |
| M4 | Multi-civ support (2 nép) | 40-60h | 10 |
| M5 | Skálázás 8 népre | 80-120h | kb. 20 (ism.) |
| M6 | Polish, audio, mentés | 60-80h | 15 |

### 1.2 Task formátum

Minden task így néz ki:

```
### Mx.y — Task címe
**Függőség:** Mx.y-1, Mx.z
**Becsült idő:** 2h
**Létrehozott fájlok:** path/to/file.ts
**Módosított fájlok:** path/to/other.ts
**Leírás:** Mit kell csinálni.
**Acceptance criteria:**
- Mérhető feltétel 1
- Mérhető feltétel 2
**Tesztek:** Milyen tesztet kell írni.
```

### 1.3 Hogyan hajtson végre Claude Code egy taskot

1. **Olvasd el a teljes task leírást + függőségeket** mielőtt kódot írnál.
2. **Ha a task kontextusa nem egyértelmű, kérdezz** a konkrét pontról.
3. **Készíts új branch-et:** `feat/Mx.y-rovid-nev`
4. **Implementáld** a task-ot.
5. **Írj teszteket** a "Tesztek" szakasz szerint.
6. **Futtasd le a teljes suite-ot:** `npm test`, `npm run typecheck`,
   `npm run lint`.
7. **Ellenőrizd az acceptance criteria-t.**
8. **Commit-olj conventional commits formátumban.**
9. **Nyiss PR-t, leírja a változást és a verifikációt.**

### 1.4 Merge szabályok

- M0-M3-ban minden task külön commit legyen, de egyben merge-elhetjük.
- M4-től felfelé PR / branch workflow.
- Sose merge-elj olyan taskot, ami bukott tesztekkel jön.

### 1.5 Ha stuck vagy

Ha Claude Code 2 iterációs körben nem tud haladni egy taskban:
1. Álljon meg.
2. Írja le pontosan, mi nem megy, mit próbált.
3. Várjon emberi input-ra.

Ne csináljon mágikus workaround-okat. Inkább kérdezzen.

---

## 2. M0 — Foundation (engine indítás)

**Cél:** Egy futó Phaser jelenet, amiben egy izometrikus térkép látszik,
a kamera mozgatható, és egy villager sprite egy kattintott mezőre
átugrik (pathfinding nélkül még).

**Acceptance at end of milestone:**
- `npm run dev` megnyit egy böngészőt, ahol 64×64-es izometrikus rács
  látszik.
- WASD vagy szélső egér mozgatja a kamerát.
- Egy villager sprite látszik egy csempén.
- Bal kattintásra másik csempére "pattan" (azonnali teleport).
- Nincs JS error a konzolban.

### M0.1 — Projekt inicializálás

**Függőség:** —
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `package.json`
- `tsconfig.json`
- `vite.config.ts`
- `index.html`
- `src/main.ts`
- `.gitignore`
- `.eslintrc.cjs`
- `.prettierrc`
- `README.md`

**Leírás:**
Hozz létre egy Vite + TypeScript projektet Phaser 3-mal. Telepítsd a
CLAUDE.md 2.1-ben felsorolt függőségeket:
- `phaser@^3.80.0`
- `miniplex@^2.0`
- `zustand@^4.5`
- `pathfinding@^0.4.18`
- `localforage@^1.10`
- dev: `typescript@^5.3`, `vitest`, `eslint`, `prettier`, `@types/node`

`tsconfig.json` beállítások:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    "lib": ["ES2022", "DOM"]
  }
}
```

**Acceptance criteria:**
- `npm run dev` elindul port 5173-on, betölti index.html-t
- Phaser a DOM-ba rajzol egy fekete canvas-t
- `npm run build` hibátlan build-et készít
- `npm run typecheck` sikeres

**Tesztek:** egy trivial `sum.test.ts` Vitest-hez, csak annyira, hogy a
test runner fusson.

---

### M0.2 — Jelenet-struktúra felállítása

**Függőség:** M0.1
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/config/game.ts`
- `src/config/constants.ts`
- `src/scenes/BootScene.ts`
- `src/scenes/PreloadScene.ts`
- `src/scenes/MainMenuScene.ts`
- `src/scenes/GameScene.ts`

**Leírás:**
- `constants.ts`-ben definiáld: `TILE_WIDTH=64`, `TILE_HEIGHT=32`,
  `MAX_PLAYERS=6`, `DEFAULT_MAP_SIZE=64`.
- `game.ts`-ben Phaser config: 1280×720, `Phaser.AUTO`, dark
  background-color, scene lista.
- BootScene: üres, azonnal vált PreloadScene-re.
- PreloadScene: egyelőre placeholder, 1s után MainMenuScene.
- MainMenuScene: egy gomb "Új játék", ami GameScene-re vált.
- GameScene: egyelőre csak szöveg: "GameScene aktív".

**Acceptance criteria:**
- Egymást követő jelenetek rendesen váltanak.
- "Új játék" gomb GameScene-be visz.
- Nincs memória-leak scene-váltáskor (egyszerű ellenőrzés:
  DevTools Memory).

**Tesztek:** még nincs.

---

### M0.3 — Izometrikus koordináta modul

**Függőség:** M0.2
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/iso/coordinates.ts`
- `src/iso/coordinates.test.ts`

**Leírás:**
Implementáld a tile ↔ screen konverziót (CLAUDE.md 3.2).

```typescript
// src/iso/coordinates.ts
export interface TileCoord { tx: number; ty: number }
export interface ScreenCoord { sx: number; sy: number }

export function tileToScreen(t: TileCoord): ScreenCoord { ... }
export function screenToTile(s: ScreenCoord): TileCoord { ... }
export function screenToTileFloor(s: ScreenCoord): TileCoord { ... }
```

**Acceptance criteria:**
- `tileToScreen({tx:0, ty:0}) === {sx:0, sy:0}` (origó)
- `tileToScreen({tx:1, ty:0}) === {sx:32, sy:16}`
- `tileToScreen({tx:0, ty:1}) === {sx:-32, sy:16}`
- Oda-vissza konverzió: `screenToTile(tileToScreen(t)) === t` (±1 pixel
  tűréshatár)

**Tesztek:**
- Minimum 20 teszt-eset, különböző térkép-pozíciókon.
- Edge case: negatív koordináták.
- Round-trip teszt minden oda-vissza konverzióra.

---

### M0.4 — Üres izometrikus térkép renderelés

**Függőség:** M0.3
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/map/TileMap.ts`
- `public/assets/sprites/terrain/grass.png` (placeholder 64×32 rombusz)

**Módosított fájlok:**
- `src/scenes/GameScene.ts`
- `src/scenes/PreloadScene.ts`

**Leírás:**
A GameScene-be rajzolj egy 64×64-es grid-et, minden csempe a fűs
rombusz placeholder. Használd a Phaser `Group`-ot a csempékhez, de
rendeld őket depth-sortolva (CLAUDE.md 3.3).

A placeholder grass.png-t generáld egy egyszerű szkripttel, vagy
rajzold kézzel 64×32 átlátszó PNG-be egy zöld rombuszt.

**Acceptance criteria:**
- 64×64 = 4096 csempe látszik rombusz alakban.
- A rombuszok szépen illeszkednek (nincs rés, nincs átfedés).
- A térkép közepe kb. a képernyő közepén jelenik meg.
- FPS > 60 ezen a térképméreten.

**Tesztek:** nincs (vizuális ellenőrzés).

---

### M0.5 — Kamera irányítás

**Függőség:** M0.4
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/scenes/systems/CameraController.ts`

**Módosított fájlok:**
- `src/scenes/GameScene.ts`

**Leírás:**
- WASD vagy nyílgombok mozgatják a kamerát.
- Szélső-egér scroll (screen edge pan), 5 pixel margin zónán belül.
- Egér-kerék zoom (0.5× – 2.0× között).
- A kamera nem mehet a térkép határain túl.

**Acceptance criteria:**
- Minden input-mód működik.
- Zoom középre zoomol (nem a képernyő origójára).
- Térképhatáron túl nem látszik nagy üres szürke.

**Tesztek:** nincs (manuális).

---

### M0.6 — Egér-kattintás → tile kiválasztása

**Függőség:** M0.3, M0.5
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/iso/picking.ts`
- `src/iso/picking.test.ts`

**Módosított fájlok:**
- `src/scenes/GameScene.ts`

**Leírás:**
Implementáld a screenToTile inverz konverziót, figyelembe véve a
kamera pozícióját és zoom-ját. Amikor a játékos kattint, jelöld ki
vizuálisan azt a csempét (pl. sárga kontúr overlay).

**Acceptance criteria:**
- Kattintás bármely csempére — a helyes csempe jelölődik ki.
- Kamera eltolás után is pontos.
- Zoom alatt is pontos.
- Térképen kívüli kattintásra nincs highlight.

**Tesztek:**
- 10+ eset különböző kamera pozícióval és zoom-mal.

---

### M0.7 — Miniplex ECS setup + első entitás

**Függőség:** M0.6
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/ecs/world.ts`
- `src/ecs/components/Position.ts`
- `src/ecs/components/Renderable.ts`
- `src/ecs/components/Sprite.ts`
- `src/ecs/archetypes/villager.ts`
- `src/ecs/systems/RenderSystem.ts`

**Módosított fájlok:**
- `src/scenes/GameScene.ts`

**Leírás:**
- Hozz létre egy Miniplex world-öt GameScene-ben.
- Definiáld az alap komponenseket (CLAUDE.md 5.1.1 első 3 darab).
- `createVillager` archetype egy sprite-ot hoz létre és hozzárendeli
  az entitáshoz.
- RenderSystem minden frame-ben szinkronizálja a Position → Sprite
  képernyő-pozíciót.
- Placeholder villager sprite: egyszerű kör vagy pálcika-ember, 32×48.

**Acceptance criteria:**
- A villager sprite a (10, 10) csempén látszik.
- Ha kódból módosítod a Position-t, a sprite átkerül a megfelelő
  helyre.

**Tesztek:**
- `createVillager` létrehozza a komponenseket helyesen.

---

### M0.8 — Kattintás → villager "ugrik" (teleport)

**Függőség:** M0.7
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/ecs/components/Selectable.ts`
- `src/ecs/components/MoveIntent.ts`
- `src/ecs/systems/InputSystem.ts`
- `src/ecs/systems/MoveIntentSystem.ts`

**Leírás:**
- Bal kattintás a villagerre → kijelölve.
- Jobb kattintás egy mezőre (ha van kijelölt egység) → MoveIntent
  létrejön, a MoveIntentSystem azonnal beállítja a Position-t a
  célmezőre (még nincs pathfinding, csak teleport).

**Acceptance criteria:**
- Villager kijelölhető és mozgatható.
- MS0 cél elérve: Foundation kész.

**Tesztek:** nincs.

---

## 3. M1 — Egy nép, egy kor vertical slice

**Cél:** 1 emberi játékos (magyar, Római kor), 1 térképen, pathfinding
működik, nyersanyag-gyűjtés működik, építhető 4-5 épület, 3 egység
típus. Még nincs ellenfél, nincs harc.

**Acceptance at end of milestone:**
- Új játék: térkép betöltődik, a játékosnak van egy városházája és 3
  villagere.
- A villagerek tudnak fát vágni, ételt gyűjteni (farmról), aranyat
  bányászni.
- Új villager képezhető (ételbe kerül).
- Építhető: ház, laktanya, farm, faraktár, bányászkunyhó.
- Laktanyából képezhető: kardforgató, íjász.
- HUD mutatja a nyersanyag-mennyiséget és a populációt.
- A kijelölt entitás info-ja a HUD panelen megjelenik.

### M1.1 — Zustand UI store + alap HUD

**Függőség:** M0.8
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/ui/store.ts`
- `src/ui/HUD.ts`
- `src/scenes/HUDScene.ts`
- `src/i18n/hu.ts`

**Módosított fájlok:**
- `src/config/game.ts` (HUDScene hozzáadása)

**Leírás:**
- Zustand store: `resources`, `population`, `selectedEntity`,
  `currentAge`.
- HUDScene overlayként fut a GameScene felett.
- HUD elemek: top bar (nyersanyagok, pop, kor), bottom panel
  (selection info, építési opciók).
- Minden szöveg i18n/hu.ts-ből.

**Acceptance criteria:**
- Top bar látszik, alapértelmezett értékekkel.
- Bottom panel üres kijelölés nélkül.
- Kijelölt villager → bottom panel mutatja a nevet és HP-t.

---

### M1.2 — Pálya adat struktúra

**Függőség:** M1.1
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/map/TerrainTypes.ts`
- `src/map/MapData.ts`

**Módosított fájlok:**
- `src/map/TileMap.ts`

**Leírás:**
- Terrain típusok: `grass`, `forest`, `gold_mine`, `berries`, `water`,
  `cliff`.
- `MapData` class: `width`, `height`, `tiles[]` (2D tömb), `getTile(tx, ty)`,
  `setTile(tx, ty, terrain)`, `isPassable(tx, ty)`.
- Forest és gold_mine nem átjárhatók, de lehet rajtuk "dolgozni"
  (villager megy a mellette lévő cellába).

**Acceptance criteria:**
- MapData helyes getters/setters.
- 64×64 pálya 4-féle terrain-nal látszik (manuálisan feltöltve).

**Tesztek:**
- MapData unit tesztek.

---

### M1.3 — Terrain sprite-ok

**Függőség:** M1.2
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `public/assets/sprites/terrain/forest.png`
- `public/assets/sprites/terrain/gold_mine.png`
- `public/assets/sprites/terrain/berries.png`
- `public/assets/sprites/terrain/water.png`

**Módosított fájlok:**
- `src/scenes/PreloadScene.ts`
- `src/map/TileMap.ts`

**Leírás:**
Placeholder sprite-ok (kraftpix/opengameart). A TileMap olvassa be a
MapData-ból és renderelje a megfelelő terrain sprite-ot.

**Acceptance criteria:**
- Pálya manuálisan beállított terrain-mixszel megjelenik.

---

### M1.4 — Térkép generátor: Mezőség sablon

**Függőség:** M1.3
**Becsült idő:** 5h

**Létrehozott fájlok:**
- `src/map/generator.ts`
- `src/map/generators/meadow.ts`
- `src/map/generator.test.ts`

**Leírás:**
Implementáld az első térkép sablont: "Mezőség" (lásd 11.1). Adott
seed-ből determinisztikus output.

**Acceptance criteria:**
- Ugyanarra a seed-re mindig ugyanaz a pálya.
- A pálya közepe nyílt grass.
- Fás területek a térkép szélén.
- 1 arany-lelőhely játékos kezdőhelyenként.
- 4-6 bogyós bokor játékos kezdőhelyenként.

**Tesztek:**
- Determinizmus: ugyanaz a seed → ugyanaz a kimenet (legalább 5x).
- Invariánsok: minden játékos kezdőhelye passable, van legalább 1
  arany a közelében.

---

### M1.5 — Pathfinding (A*)

**Függőség:** M1.2
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/map/pathfinding.ts`
- `src/map/pathfinding.test.ts`

**Leírás:**
Wrapper a `pathfinding` npm library fölé. Bemenet: MapData + start tile
+ cél tile. Kimenet: tile[] path, vagy null ha nincs út.

```typescript
export function findPath(
  map: MapData,
  start: TileCoord,
  goal: TileCoord
): TileCoord[] | null
```

**Acceptance criteria:**
- Helyes út két pont között akadályok nélkül.
- Helyes út erdő körül.
- null, ha a cél körbezárt.

**Tesztek:**
- Min. 10 teszt-eset, beleértve akadályokat.

---

### M1.6 — Mozgási rendszer (MovementSystem)

**Függőség:** M0.7, M1.5
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/ecs/components/Movable.ts`
- `src/ecs/systems/MovementSystem.ts`
- `src/ecs/systems/PathfindingSystem.ts`

**Módosított fájlok:**
- `src/ecs/systems/MoveIntentSystem.ts`
- `src/ecs/archetypes/villager.ts`

**Leírás:**
- Movable komponens: `speed`, `path`, `pathIndex`, `facing`.
- PathfindingSystem: ha MoveIntent, számol path-ot (egyszer), átírja
  Movable-ba.
- MovementSystem: minden frame-ben a path mentén interpolál. Amikor
  eléri a path végét, MoveIntent törlése.
- A mozgási irány (facing) az aktuális és előző pozíció alapján.

**Acceptance criteria:**
- Kattintás esetén a villager simán elmegy a célig.
- Ha útközben új cél jön, újraszámol path-ot.
- Ha nem lehet elérni, ott marad.

---

### M1.7 — 8 irányú sprite animáció

**Függőség:** M1.6
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `public/assets/sprites/units/hungarian/villager/*.png` (walk + idle)
- `src/ecs/components/Animation.ts`
- `src/ecs/systems/AnimationSystem.ts`

**Leírás:**
- Villagerhez 8 irány × 2 animáció (idle, walk), 4-6 frame/animáció.
- Animation komponens: `currentAnim`, `currentFrame`, `frameTimer`.
- AnimationSystem: movable alapján választ animációt, frame léptet.

**Acceptance criteria:**
- Villager a mozgás irányának megfelelően néz.
- Mozgás közben walk animáció, áll idle.
- Max 2 frame tűrés a pozíció-animáció sync-ben.

---

### M1.8 — Depth sorting

**Függőség:** M1.7
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/iso/depth.ts`
- `src/iso/depth.test.ts`

**Módosított fájlok:**
- `src/ecs/systems/RenderSystem.ts`

**Leírás:**
Rendezd a sprite-okat `(tx + ty) * 1000 + pixelOffsetY` alapján. A
RenderSystem minden frame-ben frissíti a Phaser `depth` property-t.

**Acceptance criteria:**
- Villager egy fa mögé menve eltakart lesz.
- Fáról elmenve előrébb kerül.
- Nincs z-fighting (villogás).

---

### M1.9 — Nyersanyag entitások

**Függőség:** M1.4
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/ecs/components/Resource.ts`
- `src/ecs/archetypes/resource.ts`

**Leírás:**
- Resource komponens: `type` (wood/food/gold), `amount`, `maxAmount`.
- Tree, gold_mine, berry_bush entitások.
- Amikor a `amount === 0`, az entitás megszűnik és a tile visszavált
  grass-re.

**Acceptance criteria:**
- Új játékkor a térkép tartalmazza a nyersanyag entitásokat.

---

### M1.10 — Nyersanyag-gyűjtés (GatheringSystem)

**Függőség:** M1.9, M1.6
**Becsült idő:** 5h

**Létrehozott fájlok:**
- `src/ecs/components/Gatherer.ts`
- `src/ecs/components/GatherIntent.ts`
- `src/ecs/systems/GatheringSystem.ts`

**Leírás:**
- Jobb kattintás egy fára kijelölt villagerrel → GatherIntent.
- Villager odamegy, majd "dolgozik" (pl. 2 mp-enként +1 fa a
  "carrying"-be).
- Amikor carrying=capacity (10), visszamegy a legközelebbi
  raktárba/városházába és lerakja.
- Majd visszamegy a fához, ha a fa még van.

**Acceptance criteria:**
- Teljes gyűjtési ciklus (fa → raktár → fa) működik.
- Ha a fa elfogyott, legközelebbi másik fához megy.
- Ha nincs több fa sehol, megáll.

---

### M1.11 — Városháza + nyersanyag raktározás

**Függőség:** M1.10
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/ecs/components/Building.ts`
- `src/ecs/components/ResourceDropoff.ts`
- `src/ecs/archetypes/townCenter.ts`
- `public/assets/sprites/buildings/hungarian/roman/town_center.png`

**Leírás:**
- Town Center entitás, 3×3 footprint.
- ResourceDropoff komponens, elfogad minden típust.
- Lerakott nyersanyag → Player.resources-be kerül.

**Acceptance criteria:**
- Villager lerak a városházán és növekszik a player resources count.
- HUD-on látszik a változás.

---

### M1.12 — Épületépítés rendszer

**Függőség:** M1.11
**Becsült idő:** 6h

**Létrehozott fájlok:**
- `src/ecs/components/UnderConstruction.ts`
- `src/ecs/components/BuildIntent.ts`
- `src/ecs/systems/ConstructionSystem.ts`
- `src/ui/panels/BuildPanel.ts`

**Leírás:**
- BuildPanel: gombok az építhető épületekre.
- Gomb megnyomása → placement mód (kurzor mutatja az épület
  ghost-ját).
- Kattintás → ha elég resource és a hely szabad: entitás létrehozva
  UnderConstruction state-ben.
- Villager hozzárendelhető az építéshez → constructionProgress +=
  delta * 0.1.
- Amikor 100%: UnderConstruction törlődik, az épület aktívvá válik.

**Acceptance criteria:**
- Ház építhető (30 wood, 25 sec).
- Több villager gyorsabban épít (1 fő = 25s, 3 fő = ~8s).
- Építés közben az épület félkész sprite-ja látszik (50% opacity).

---

### M1.13 — További épületek: ház, farm, faraktár, bányászkunyhó

**Függőség:** M1.12
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/ecs/archetypes/building.ts` (generikus factory)
- Sprite-ok mindegyikhez (placeholder)
- `public/assets/data/buildings.json` (lásd 8. szakasz)

**Leírás:**
- Generikus épület archetípus, amely `buildings.json`-ból olvassa a
  stats-okat.
- Farm termel ételt: villager rááll, "gyűjt" belőle (mint egy
  nyersanyag-entitásból), de a farm automatikusan regenerálódik.
- Faraktár, bányászkunyhó = raktár közelebbi nyersanyaghoz.

**Acceptance criteria:**
- Mind a 4 új épület megépíthető és működik.
- Faraktár közelébe tett villager oda rakja le a fát (gyorsabb, mint
  a városházhoz).

---

### M1.14 — Egységképzés

**Függőség:** M1.12
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/ecs/components/TrainingQueue.ts`
- `src/ecs/systems/TrainingSystem.ts`
- `src/ui/panels/TrainPanel.ts`

**Leírás:**
- Városház selection → TrainPanel villager gombbal.
- Gomb megnyomása → nyersanyagot levon, hozzáad a TrainingQueue-hoz.
- TrainingSystem minden frame lépteti a queue-t (deltaMs).
- Amikor a training time elért, új entitás jön létre a városház
  mellett.
- Max 5 elem queue-ban.

**Acceptance criteria:**
- Villager képezhető (50 étel, 25 sec).
- Queue-ban többen állnak, sorban készülnek el.
- Ha nincs elég nyersanyag, gomb disabled.

---

### M1.15 — Populációs limit

**Függőség:** M1.14
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/ecs/components/PopulationCost.ts`

**Módosított fájlok:**
- `src/ecs/systems/TrainingSystem.ts`
- `src/ui/HUD.ts`

**Leírás:**
- Minden egységnek van populációs költsége (1).
- Player.populationCap: városház = +5, minden ház = +5, max 200.
- Ha pop elérte a capet, újabb egység nem képezhető.

**Acceptance criteria:**
- Cap elérése esetén a train gomb disabled.
- Új ház építése emeli a capet.

---

### M1.16 — Laktanya + kardforgató + íjász

**Függőség:** M1.14
**Becsült idő:** 4h

**Létrehozott fájlok:**
- Sprite-ok: `swordsman`, `archer` (8 irány, idle/walk animáció)
- `public/assets/data/units.json` (lásd 7. szakasz)

**Leírás:**
- Barracks épület képezi őket.
- Egységek nem tudnak dolgozni (nem gyűjtenek).
- Stats a units.json-ből.

**Acceptance criteria:**
- Laktanya megépítve → swordsman és archer képezhető.
- Mind a 3 egység típus képes mozogni a pályán.

---

### M1.17 — Villager helyes init új játékkor

**Függőség:** M1.4, M1.11
**Becsült idő:** 2h

**Módosított fájlok:**
- `src/scenes/GameScene.ts`

**Leírás:**
Új játék indulásakor:
- Térkép generálódik.
- Player 1 kap: 1 Town Center, 3 villager körülötte.
- Player 1 kezdő resources: 200 food, 200 wood, 100 gold.

**Acceptance criteria:**
- Minden új játék így indul.

---

### M1.18 — Smoke test & polish

**Függőség:** M1.17
**Becsült idő:** 3h

**Leírás:**
Teljes M1 hurok lejátszása:
1. Új játék.
2. Villager fát vág.
3. Házat épít.
4. Farmra képez villagert.
5. Laktanya épül.
6. Kardforgató képződik.

Fixáld a talált buglit, refactor szükség szerint.

**Acceptance criteria:**
- A fenti end-to-end folyamat lejátszható, hiba nélkül.
- MS1 cél elérve.

---

## 4. M2 — Harci rendszer és első AI

**Cél:** Két játékos, 1 ember + 1 AI. A harc működik. Fog of war van.
Győzelmi feltétel (Conquest) implementálva.

### M2.1 — Multi-player data model

**Függőség:** M1.18
**Becsült idő:** 3h

**Létrehozott fájlok:**
- `src/game/Player.ts`
- `src/game/PlayerManager.ts`

**Módosított fájlok:**
- `src/ecs/components/Owner.ts` (már létezik, frissítés)

**Leírás:**
- Player class: `id`, `isHuman`, `civ`, `color`, `resources`, `age`,
  `defeated`.
- PlayerManager: játékosok listája, ki a human, kik az AI-k.
- Owner komponens minden entitáson → playerId.

---

### M2.2 — AI player 0-szintű (random actions)

**Függőség:** M2.1
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/ai/AIPlayer.ts`
- `src/ai/strategies/NullStrategy.ts`

**Leírás:**
Első verzió: az AI player csak random nyersanyagot gyűjt (villagerek
randomly fákra vagy bányákra mennek). Nem épít, nem harcol. Csak azt
teszteljük, hogy a 2 játékos párhuzamosan működik-e.

**Acceptance criteria:**
- Új játék 2 játékossal indul.
- AI villagerek mozognak, gyűjtenek.

---

### M2.3 — Kombat komponensek és rendszer

**Függőség:** M2.1
**Becsült idő:** 5h

**Létrehozott fájlok:**
- `src/ecs/components/Health.ts`
- `src/ecs/components/Attacker.ts`
- `src/ecs/components/AttackIntent.ts`
- `src/ecs/components/CombatTarget.ts`
- `src/ecs/systems/CombatSystem.ts`

**Leírás:**
- Attack intent: jobb kattintás ellenséges entitásra.
- Egység odamegy (range-en belülre).
- CombatSystem: cooldown-ként sebez.
- Sebzés formula (CLAUDE.md nem írja le, itt pontosítom):
  - `damage = max(1, attack - defense)`
  - Melee attack vs melee armor, pierce attack vs pierce armor.
- Health 0 alatt → entitás deleted.

**Acceptance criteria:**
- 2 egység egymást támadja, az egyik meghal.
- HP bar látszik a kijelölt entitáson.

---

### M2.4 — HP bar render

**Függőség:** M2.3
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/ecs/systems/HealthBarSystem.ts`

**Leírás:**
Minden entitás, aminek Health komponense van, kap egy vékony HP
bart fölötte. Zöld, amíg > 50%, sárga 25-50%, vörös < 25%.

**Acceptance criteria:**
- HP bar követi az entitás pozícióját.
- Szín-változás a HP szerint.

---

### M2.5 — Halál animáció és cleanup

**Függőség:** M2.3
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/ecs/components/Dying.ts`
- `src/ecs/systems/DeathSystem.ts`
- Halál sprite-ok (4-6 frame)

**Leírás:**
- Entitás halálakor nem törlődik azonnal, hanem kap egy Dying
  komponenst.
- Death animáció lejátszódik (kb. 1 sec).
- Utána törlődik az entitás.

**Acceptance criteria:**
- Meghalt egység animáción keresztül eltűnik.
- Nincs memória-leak.

---

### M2.6 — Támadási animáció

**Függőség:** M2.3
**Becsült idő:** 3h

**Leírás:**
Az attack animáció (4-6 frame) lejátszódik amikor az egység támad.
Archer esetén nyíl-projectile is megjelenik.

**Létrehozott fájlok:**
- `src/ecs/components/Projectile.ts`
- `src/ecs/systems/ProjectileSystem.ts`

**Acceptance criteria:**
- Swordsman támadáskor kardot lendít.
- Archer nyilat lő, a nyíl projectileként mozog a cél felé.

---

### M2.7 — Fog of war alapok

**Függőség:** M2.1
**Becsült idő:** 5h

**Létrehozott fájlok:**
- `src/ecs/components/FogEmitter.ts`
- `src/ecs/systems/FogOfWarSystem.ts`
- `src/map/FogOfWarData.ts`

**Leírás:**
- Minden tile-nak 3 állapota per player: unexplored, explored, visible.
- Player entitásai sight range-gel "kivilágítanak" tile-okat (visible).
- Amint kilépnek, visible → explored (sötétebb, de nem fekete).
- A FOW egy overlay réteg a csempéken: fekete quad unexplored-on,
  szürke explored-on.

**Acceptance criteria:**
- A térkép sötéten indul, csak a villagerek körül világos.
- Egység mozgásakor a FOW követi.
- Explored területen a terrain látszik, de egységek nem.

---

### M2.8 — Ellenséges látás szabály

**Függőség:** M2.7
**Becsült idő:** 2h

**Módosított fájlok:**
- `src/ecs/systems/RenderSystem.ts`
- `src/ecs/systems/FogOfWarSystem.ts`

**Leírás:**
Ellenséges entitások (más playerId) csak akkor látszanak, ha a tile
visible állapotban van a player számára. Explored tile-on, ha ellenség
van, nem látszik.

**Acceptance criteria:**
- AI villagere csak akkor látszik, ha a player egysége a közelében van.
- Felderítés után, ha az egység visszamegy, az ellenség eltűnik.

---

### M2.9 — Easy AI (gazdasági + alap katonai)

**Függőség:** M2.2, M2.7
**Becsült idő:** 8h

**Létrehozott fájlok:**
- `src/ai/strategies/EasyStrategy.ts`
- `src/ai/actions/BuildOrder.ts`
- `src/ai/actions/GatherOrder.ts`

**Leírás:**
A "Könnyű" AI szint implementálása (lásd 10.1). Alapvetően:
- 3 villager fát vág, 1 ételt gyűjt (alapból).
- Amint van 100 wood: építs házat.
- Amint van 150 wood: építs laktanyát.
- 3 percenként 1 swordsman-t próbál képezni.
- Ha 5 katonája van, támadást indít a játékos ellen (vak útvonal).

**Acceptance criteria:**
- Az AI fejlődik, épít, és kb. 10 perc után támad.
- Elvesztheti a város-központot, vagy megnyerheti a játékot.

---

### M2.10 — Conquest győzelmi feltétel

**Függőség:** M2.3
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/game/VictoryChecker.ts`

**Leírás:**
Ha egy játékos elveszti az utolsó Town Center-ét, `defeated = true`.
Ha csak 1 player marad `defeated = false`, az nyert.

Győzelem / vereség esetén Game Over scene.

**Acceptance criteria:**
- Ha a player lerombolja az AI Town Center-ét, "Győzelem" képernyő.
- Fordítva: "Vereség" képernyő.

---

### M2.11 — Game Over scene

**Függőség:** M2.10
**Becsült idő:** 2h

**Létrehozott fájlok:**
- `src/scenes/GameOverScene.ts`

**Leírás:**
Egyszerű képernyő: "Győztél!" / "Vesztettél!" + "Vissza a főmenübe"
gomb + "Statisztika" (játékidő, egységek képezve, épületek építve,
nyersanyag gyűjtve).

**Acceptance criteria:**
- Game Over után visszajuthat a főmenübe.

---

### M2.12 — Selection: multi-select és csoport

**Függőség:** M1.1
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/ecs/systems/SelectionSystem.ts`

**Leírás:**
- Bal egér drag → kiválasztási boxelt kirajzol.
- Felengedéskor minden saját egységet kijelöl, ami bent van.
- Ctrl+szám → csoport létrehozás.
- Szám → csoport kijelölése.
- Ctrl+kattintás → egyetlen unit hozzáadása a selectionhöz.

**Acceptance criteria:**
- Drag-select 10 egységre működik.
- Csoport (1-9) működik.

---

### M2.13 — Minimap

**Függőség:** M2.7
**Becsült idő:** 5h

**Létrehozott fájlok:**
- `src/ui/Minimap.ts`

**Leírás:**
- Jobb-alsó sarokban 200×200 minimap.
- Terrain, épületek (saját, ellenséges), egységek színezve.
- FOW rétegelve.
- Bal kattintás a minimapon → kamera oda ugrik.

**Acceptance criteria:**
- Minimap frissül real-time.
- Kattintás teleportálja a kamerát.

---

### M2.14 — M2 smoke test

**Függőség:** M2.13
**Becsült idő:** 3h

**Leírás:**
End-to-end teszt:
1. Új játék.
2. AI ellenféllel.
3. Gazdasági fejlődés.
4. Katonai képzés.
5. Támadás vagy védekezés.
6. Győzelem / vereség.

**Acceptance criteria:**
- Egy teljes játék lejátszható hiba nélkül.
- MS2 cél elérve.

---

## 5. M3 — Három kor komplett

**Cél:** A magyar nép mindhárom korára (Római, Középkor, Felvilágosodás)
teljes content. Age-up logika. Tech fa alap. Közepes AI.

### M3.1 — Age-up rendszer

**Függőség:** M2.14
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/ecs/components/AgeUpResearch.ts`
- `src/ecs/systems/AgeUpSystem.ts`

**Leírás:**
- Városházán extra gomb: "Feudalizmus" (Középkorba lépés), kezdeti
  költség 500 food 300 gold, idő 120s.
- Research közben a Town Center másik dolgot nem csinálhat.
- Kész → player.age növekedik → új épületek és egységek elérhetők.

**Acceptance criteria:**
- Age 1 → 2 research fut le.
- Age 2 új content-je elérhető.

---

### M3.2 — Középkor épületek

**Függőség:** M3.1
**Becsült idő:** 4h

**Létrehozott fájlok:**
- Sprite-ok: `archery_range`, `stable`, `blacksmith`, `tower`
- Adat: `buildings.json` frissítés

**Leírás:**
Új épületek sprite-jai + elérhetővé válnak 2. korban.

**Acceptance criteria:**
- Middle age-be érve, ezek építhetők.

---

### M3.3 — Középkor egységek

**Függőség:** M3.2
**Becsült idő:** 4h

**Létrehozott fájlok:**
- Sprite-ok: `knight`, `pikeman`, `crossbowman`
- Adat: `units.json` frissítés

**Leírás:**
3 új egység: lovag (stable), lándzsás (laktanya), számszeríjász
(lőtér).

**Acceptance criteria:**
- Mindhárom egység képezhető és harcol.

---

### M3.4 — Falak és őrtornyok

**Függőség:** M3.2
**Becsült idő:** 4h

**Létrehozott fájlok:**
- `src/ecs/archetypes/wall.ts`
- `src/ecs/systems/TowerCombatSystem.ts`

**Leírás:**
- Fal: 1-tile szegmens, akadály, HP: 300, nincs támadás.
- Torony: 1-tile, HP: 500, támadás range 5, auto-attack nearest enemy.

**Acceptance criteria:**
- Fal építhető, blokkolja az utat.
- Torony önállóan lő ellenséges egységekre.

---

### M3.5 — Felvilágosodás age-up

**Függőség:** M3.1
**Becsült idő:** 2h

**Leírás:**
Újabb age-up: "Felvilágosodás", 800 food + 500 gold, 180s.

**Acceptance criteria:**
- Age 2 → 3 működik.

---

### M3.6 — Felvilágosodás egységek és épületek

**Függőség:** M3.5
**Becsült idő:** 5h

**Létrehozott fájlok:**
- Sprite-ok: `musketeer`, `cannon`, `cavalry`, `wonder`

**Leírás:**
- Musketeer: laktanyából.
- Cannon: új épület "Ágyú-öntöde" (foundry).
- Cavalry: stable-ből.
- Wonder: különleges, 4×4, 2000 food + 2000 wood + 1000 gold.

**Acceptance criteria:**
- Mind elérhető és működik.

---

### M3.7 — Tech fejlesztések: Kovácsműhely

**Függőség:** M3.2
**Becsült idő:** 5h

**Létrehozott fájlok:**
- `src/ecs/components/Research.ts`
- `src/ecs/systems/ResearchSystem.ts`
- `src/game/Technologies.ts`

**Leírás:**
Implementáld a kovácsműhely fejlesztéseit (lásd 9. szakasz). Research
logika: ha kész, globálisan módosítja az egységek statjait.

**Acceptance criteria:**
- Penge élesítés I kutatva → minden swordsman damage +1.
- HUD-on a bonuszok láthatóak selectkor.

---

### M3.8 — Tech fejlesztések: Gyűjtő-bonuszok

**Függőség:** M3.7
**Becsült idő:** 4h

**Leírás:**
Lumber camp, mining camp, farm-specifikus fejlesztések.

**Acceptance criteria:**
- Minden fejlesztés kutatható és hat.

---

### M3.9 — Tech fejlesztések: Egyéb

**Függőség:** M3.8
**Becsült idő:** 4h

**Leírás:**
Populáció (ház bonusz), felderítő upgrade, egyéb (lásd 9. szakasz).

---

### M3.10 — Medium AI (közepes szint)

**Függőség:** M3.1, M3.7
**Becsült idő:** 10h

**Létrehozott fájlok:**
- `src/ai/strategies/MediumStrategy.ts`
- `src/ai/decisions.ts`

**Leírás:**
A közepes szintű AI (10.2) implementálása: age-up, build order,
kombinált haderő, counter unit képzés.

**Acceptance criteria:**
- Medium AI ellen közepes játékos küzdhet, de nem triviális.

---

### M3.11 — Hard AI (nehéz szint)

**Függőség:** M3.10
**Becsült idő:** 12h

**Leírás:**
Nehéz szint (10.3): resource bonus, gyors age-up, stratégiák
váltogatása, scouting.

**Acceptance criteria:**
- Hard AI legyőzése kihívás.

---

### M3.12 — AI nehézség választás

**Függőség:** M3.11
**Becsült idő:** 2h

**Módosított fájlok:**
- `src/scenes/GameSetupScene.ts`

**Leírás:**
GameSetup-ban választható: Könnyű / Közepes / Nehéz.

**Acceptance criteria:**
- Mindhárom szint választható és a játékban a megfelelő stratégia fut.

---

### M3.13 — További térkép sablonok

**Függőség:** M1.4
**Becsült idő:** 12h

**Létrehozott fájlok:**
- `src/map/generators/wilderness.ts`
- `src/map/generators/islands.ts`
- `src/map/generators/fortress.ts`
- `src/map/generators/random.ts`

**Leírás:**
A másik 3 sablon (11. szakasz) + véletlen generátor.

**Acceptance criteria:**
- Mind a 4 sablon + random választható.
- Minden pálya érvényes és játszható.

---

### M3.14 — M3 smoke test

**Függőség:** M3.13
**Becsült idő:** 3h

**Leírás:**
Teljes 3-korszakos játék hard AI ellen.

---

## 6. M4-M6 — Bővítés és polírozás

Ezeket a milestone-okat taszk-szinten majd M3 befejezése után
bontjuk le részletesen. A scope itt csak áttekintő.

### M4 — Második nép (angol)

- `civs.json` struktúra kialakítása
- Angol sprite-ok (palette swap + overlay)
- Civ-specifikus bónuszok (később)
- GameSetup civ selector
- M4 smoke test

### M5 — Többi 6 nép

- Iteratívan: német, francia, spanyol, olasz, orosz, finn
- Civ-specifikus egyedi egységek (1/civ)
- Civ bónuszok

### M6 — Polish

- Audio rendszer (12. szakasz)
- Mentés/betöltés (lásd CLAUDE.md 5.4)
- Több AI nehézség / személyiség
- Wonder győzelem
- Beállítások menü (hangerő, billentyű mapping)
- Tutorial?
- Localization stub (ha nemcsak magyar lesz)

---

## 7. Egység statisztikák

Az értékek `public/assets/data/units.json`-ben tárolva. Ez a
dokumentum-szintű igazság-forrás.

### 7.1 Stat mezők magyarázata

| Mező | Jelentés |
|---|---|
| HP | Health Points |
| Melee ATK | Közelharci támadás |
| Pierce ATK | Távolsági / átütő támadás |
| Melee DEF | Közelharci páncél |
| Pierce DEF | Távolsági páncél |
| Range | Támadási távolság tile-ban (0 = közelharc) |
| Speed | Tile/sec |
| LOS | Látótávolság (sight range) |
| Cost | food / wood / gold |
| Train time | sec |

### 7.2 Római kor (Age 1)

| Egység | HP | M.ATK | P.ATK | M.DEF | P.DEF | Range | Speed | LOS | Cost | Train |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| Villager | 25 | 3 | 0 | 0 | 0 | 0 | 0.9 | 4 | 50/0/0 | 25s |
| Scout | 45 | 4 | 0 | 0 | 2 | 0 | 1.5 | 8 | 80/0/0 | 30s |
| Swordsman | 40 | 6 | 0 | 0 | 1 | 0 | 0.9 | 4 | 60/0/20 | 21s |
| Archer | 30 | 0 | 4 | 0 | 0 | 4 | 0.96 | 6 | 0/25/45 | 35s |

### 7.3 Középkor (Age 2)

| Egység | HP | M.ATK | P.ATK | M.DEF | P.DEF | Range | Speed | LOS | Cost | Train |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| Knight | 100 | 10 | 0 | 2 | 2 | 0 | 1.35 | 4 | 60/0/75 | 30s |
| Pikeman | 55 | 4* | 0 | 0 | 0 | 0 | 1.0 | 3 | 35/25/0 | 22s |
| Crossbowman | 35 | 0 | 5 | 0 | 0 | 5 | 0.96 | 7 | 0/25/45 | 27s |

*Pikeman: +22 bonus vs cavalry (total 26 damage).

### 7.4 Felvilágosodás (Age 3)

| Egység | HP | M.ATK | P.ATK | M.DEF | P.DEF | Range | Speed | LOS | Cost | Train |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---|---:|
| Musketeer | 60 | 0 | 7 | 0 | 1 | 6 | 1.0 | 7 | 60/0/20 | 21s |
| Cannon | 50 | 0 | 40** | 0 | 0 | 8 | 0.6 | 7 | 0/65/275 | 46s |
| Cavalry | 120 | 12 | 0 | 2 | 2 | 0 | 1.5 | 5 | 70/0/75 | 30s |

**Cannon: AOE damage 1-tile sugarú körben.

### 7.5 Egység balance megjegyzések

- **Kő-papír-olló:** Pikeman → Cavalry/Knight → Archer/Crossbowman → Knight.
  A Musketeer minden ellen közepes (generalist).
- **Villager nem harcias.** Csak vészhelyzetben harcoljon (3 damage). AI
  nem használja harci célra.
- **Scout** csak felderítésre való. Gyenge harcban, de nagy LOS és
  gyorsaság.

---

## 8. Épület statisztikák

`public/assets/data/buildings.json`-ban tárolva.

### 8.1 Stat mezők

| Mező | Jelentés |
|---|---|
| HP | Épület hit points |
| Footprint | Tile méret (pl. 3×3) |
| Cost | food / wood / gold |
| Build time | sec (1 villagerrel) |
| Age | Melyik kortól érhető el |
| Produces | Milyen egységeket képez (ha termelő) |

### 8.2 Összes épület

| Épület | HP | Foot | Cost | Build | Age | Megjegyzés |
|---|---:|---|---|---:|---:|---|
| Town Center | 2400 | 3×3 | 0/275/100 | 150s | 1 | Pop +5, képez: villager |
| House | 500 | 2×2 | 0/30/0 | 25s | 1 | Pop +5 |
| Farm | 400 | 2×2 | 60/0/0 | 15s | 1 | 175 food regenerable |
| Lumber Camp | 800 | 2×2 | 0/100/0 | 35s | 1 | Wood dropoff |
| Mining Camp | 800 | 2×2 | 0/100/0 | 35s | 1 | Gold dropoff |
| Barracks | 1200 | 3×3 | 0/175/0 | 50s | 1 | Képez: sworsdman, archer, pikeman, musketeer |
| Archery Range | 1200 | 3×3 | 0/175/0 | 50s | 2 | Képez: archer, crossbowman |
| Stable | 1200 | 3×3 | 0/175/0 | 50s | 2 | Képez: knight, cavalry |
| Blacksmith | 1200 | 2×2 | 0/150/0 | 40s | 2 | Tech fejlesztések |
| Foundry | 1500 | 3×3 | 0/175/100 | 60s | 3 | Képez: cannon |
| Tower | 850 | 1×1 | 0/50/125 | 80s | 2 | Auto-attack, range 5 |
| Wall | 300 | 1×1 | 0/5/0 | 6s | 1 | Nincs attack |
| Wonder | 4800 | 4×4 | 2000/2000/1000 | 600s | 3 | Győzelmi épület |

### 8.3 Megjegyzések

- **Town Center** csak 1 építhető, kivéve ha a 2. kortól upgrade-velt.
  (MVP-ben: csak 1 darab összesen.)
- **Farm** regenerálódik a nyersanyaga automatikusan, 3/sec wood
  kapacitáson belül.
- **Tower** auto-range 5, cooldown 2s, damage 5 pierce.
- **Wonder** felépítés után elindul a 10 perces timer. Ha lebomlik, a
  timer reset.

---

## 9. Technológiai fa

### 9.1 Kovácsműhely (Blacksmith)

| Research | Kor | Effect | Cost | Time |
|---|---:|---|---|---:|
| Penge élesítése I | 2 | +1 Melee ATK (minden melee unit) | 100/50/0 | 40s |
| Penge élesítése II | 3 | +1 további Melee ATK | 200/100/0 | 60s |
| Nyilak élesítése I | 2 | +1 Pierce ATK (archer, crossbow, musketeer) | 100/50/0 | 40s |
| Nyilak élesítése II | 3 | +1 további Pierce ATK | 200/100/0 | 60s |
| Páncél I | 2 | +1 Melee DEF | 100/0/0 | 40s |
| Páncél II | 3 | +1 további Melee DEF | 150/0/50 | 60s |
| Pajzs I | 2 | +1 Pierce DEF | 0/100/0 | 40s |
| Pajzs II | 3 | +1 további Pierce DEF | 0/150/50 | 60s |

### 9.2 Lumber Camp

| Research | Kor | Effect | Cost | Time |
|---|---:|---|---|---:|
| Kettős fűrész | 1 | +10% fa gyűjtési sebesség | 100/50/0 | 30s |
| Kétember fűrész | 2 | +15% fa gyűjtés (kumulatív) | 200/150/0 | 50s |
| Gőzfűrész | 3 | +20% fa gyűjtés | 300/200/100 | 60s |

### 9.3 Mining Camp

| Research | Kor | Effect | Cost | Time |
|---|---:|---|---|---:|
| Arany-bányászat I | 1 | +15% arany gyűjtési sebesség | 100/0/0 | 30s |
| Arany-bányászat II | 2 | +15% arany gyűjtés (kumulatív) | 200/0/50 | 50s |
| Mély-bányászat | 3 | +20% arany gyűjtés | 300/100/100 | 60s |

### 9.4 Farm (Mill equivalent)

| Research | Kor | Effect | Cost | Time |
|---|---:|---|---|---:|
| Vetésforgó | 1 | +15% étel gyűjtési sebesség farmokról | 75/0/0 | 30s |
| Ekés szántás | 2 | +15% étel gyűjtés (kumulatív) | 125/75/0 | 50s |
| Gépesített aratás | 3 | +20% étel gyűjtés | 200/150/100 | 60s |

### 9.5 Ház (populáció)

| Research | Kor | Effect | Cost | Time |
|---|---:|---|---|---:|
| Kézműves céhek | 2 | Minden ház +2 pop cap | 100/100/0 | 45s |

### 9.6 Town Center (age-up)

| Research | Kor | Effect | Cost | Time |
|---|---:|---|---|---:|
| Feudalizmus | 1→2 | Age 2 unlock | 500/0/300 | 120s |
| Felvilágosodás | 2→3 | Age 3 unlock | 800/0/500 | 180s |

### 9.7 Laktanya fejlesztések

| Research | Kor | Effect | Cost | Time |
|---|---:|---|---|---:|
| Gyaloglósulás | 2 | Gyalogosok +10% speed | 150/0/50 | 45s |
| Lovas kiképzés | 2 | Lovasok +10% HP | 150/0/50 | 45s |

### 9.8 Tech fa megjegyzések

- Minden research **egyszer** kutatható (nem ismétlődik).
- Cost és effect multiplikatívak: +10% és +15% = +1.1 × 1.15 = +26.5%.
- Az "Effect" globálisan alkalmazódik a player összes megfelelő
  entitására.

---

## 10. AI rendszer

### 10.1 Könnyű (Easy) szint

**Jellemzés:** Tanulóknak. Lassan reagál, ritkán támad. Emberi
játékosnak első lépésben legyőzhető.

**Paraméterek:**
- Döntési ciklus: 20-30 sec
- Build order szigorúság: random (80%-ban tartja, 20%-ban random
  épít)
- Age-up: 50% esély, hogy egyáltalán megpróbálja (és késedelemmel)
- Villager arány: 50% (a többi warrior)
- Első támadás: 8-15 perc random
- Resource bonus: 0% (vanilla)
- Scouting: nem használ scoutot

**Döntési fa:**
```
every 25s:
  if villagers < 8: train villager
  elif houses < (pop/5 + 2): build house
  elif no barracks: build barracks
  elif military < 5: train swordsman
  elif has 8+ military and not attacked yet: attack nearest enemy TC
  else: idle
```

**Acceptance:** 40% win rate egy kezdő ember játékos ellen.

### 10.2 Közepes (Medium) szint

**Jellemzés:** Átlagos, kompetens ellenfél. Age-upol, kombinál
egységeket, reagál a védekezésre.

**Paraméterek:**
- Döntési ciklus: 10-15 sec
- Build order: preset (optimal opening a korokra)
- Age-up: mindig, optimálisan (amint lehet)
- Villager arány: 60% (dinamikusan a katonai helyzethez)
- Első támadás: 5-8 perc
- Resource bonus: 0%
- Scouting: 1 scout folyamatosan térképet felderít
- Counter-unit production: felderítés alapján (ha ellenfélnek sok
  archerje van, pikeman helyett swordsman + lovas)

**Build order (alap):**
```
Age 1 (0-5 perc):
  1. 4 villager fára, 2 ételre
  2. Ház (30 pop cap elérésig)
  3. Lumber camp fák közelébe
  4. 8 villager → étel, 4 → fa, 2 → arany
  5. Laktanya
  6. Age 2 research

Age 2 (5-12 perc):
  7. Archery range + stable
  8. Blacksmith + tech research folyamatosan
  9. Kombinált hadsereg: 40% lovag, 40% crossbowman, 20% pikeman
  10. Támadás, ha 12+ egység

Age 3 (12+ perc):
  11. Foundry
  12. Musketeer + cannon kombinált
  13. Wonder, ha player technikailag előzte
```

**Acceptance:** 50% win rate közepes ember játékos ellen.

### 10.3 Nehéz (Hard) szint

**Jellemzés:** Agresszív, okos. Scouting-et aktívan használ, gyors age-up.

**Paraméterek:**
- Döntési ciklus: 3-5 sec
- Build order: optimális, agresszív
- Age-up: ASAP
- Villager arány: 65% kezdetben, 50%-ra csökken war-phase-ben
- Első támadás: 3-5 perc (early pressure)
- Resource bonus: **+20% gyűjtési sebesség** (handicap, mert az AI
  nem tudja maximálisan kihasználni a gazdaságot)
- Scouting: 2 scout, folyamatos felderítés
- Counter-unit: dinamikus a játékos hadseregétől függően
- Harass: 1-2 kisebb támadás a villagerek ellen

**Stratégiai váltás:**
- Ha a játékos aggresszív: turtle (tornyok, falak)
- Ha a játékos passzív: rush
- Ha a játékos fejleszt: tech rush

**Acceptance:** 70% win rate közepes ember játékos ellen. Haladó
játékosnak kihívás.

### 10.4 AI megvalósítási részletek

**Common infrastructure:**
- `src/ai/AIPlayer.ts`: base class
- `src/ai/strategies/BaseStrategy.ts`: abstract
- `src/ai/decisions/`: reusable döntési függvények (évezhetőek több
  stratégiában is)
- `src/ai/perception.ts`: FOW alapon mit "lát" az AI
- `src/ai/economy.ts`: gazdasági állapot számítás

**Perception:**
Az AI csak azt látja, ami az ő FOW-jában van. **Nem csalhat** (hard
szintnél sem). A resource bonus a gyűjtési sebességre vonatkozik, nem a
látásra.

**Debugging:**
Dev-módban toggle: AI thoughts overlay (aktuális stratégia, build
queue, döntések log).

---

## 11. Térkép sablonok és generátor

### 11.1 Mezőség (Meadow)

- **Stílus:** AoE2 "Arabia"-szerű.
- **Alap terrain:** 90% grass, 10% elszórt fa-klaszter.
- **Nyersanyagok:**
  - Minden játékos kezdőhelyén: 1 arany-lelőhely, 4-6 bogyós bokor,
    1 fás erdő (10-15 fa) a közelben.
  - Térkép közepén: 2-3 "jutalmazó" arany-lelőhely és erdő (senki
    földje).
- **Játékos elhelyezés:** Egyenletesen elosztva a térkép szélén.
- **Stratégia ajánlott:** Agresszív, mert a nyílt terep kedvez a
  támadásoknak.

### 11.2 Vadon (Wilderness)

- **Stílus:** AoE2 "Black Forest"-szerű.
- **Alap terrain:** 40% grass, 60% erdős (összefüggő erdő-foltok).
- **Nyersanyagok:** Sok fa mindenhol, ritkább arany.
- **Struktúra:** Az erdők keskeny "utakat" hagynak a játékosok között
  (kb. 3-4 tile széles).
- **Stratégia ajánlott:** Turtling, defensive.

### 11.3 Szigetek (Islands)

- **Stílus:** AoE2 "Continents"-szerű, de víz helyett járhatatlan
  szikla.
- **Alap terrain:** 60% grass (szigetek), 40% szikla/dune (nem passable).
- **Struktúra:** 2-3 nagy "sziget", keskeny hidakkal (1-2 tile) vagy
  teljesen izolálva.
- **Nyersanyagok:** Minden sziget önfenntartó.
- **Stratégia ajánlott:** Defensive, mivel a hidak könnyen védhetők.

### 11.4 Erődítmény (Fortress)

- **Stílus:** AoE2 "Arena"-szerű.
- **Alap terrain:** 80% grass.
- **Struktúra:** Minden játékos **előre kész** kőfallal körülvett
  kezdőzónában indul (kapukkal). Középen nagy nyílt terület.
- **Nyersanyagok:** A falon belül mind van, középen extra kincs.
- **Stratégia ajánlott:** Tech-boom-attack (késői agresszió).

### 11.5 Véletlen generátor (Random)

Egy egyszerű Perlin-noise alapú pálya. Kevésbé stratégiailag
kiegyensúlyozott, de változatos.

**Algoritmus:**
1. Perlin noise 2D, scale 0.1.
2. Érték < 0.3 → water (csak akadályként)
3. 0.3 – 0.5 → grass
4. 0.5 – 0.7 → forest
5. > 0.7 → gold_mine seed (ritka)
6. Játékos elhelyezés: 4-6 legnagyobb összefüggő grass régió szélén.
7. Nyersanyag-pótlás: minden játékos mellé 1 arany és néhány bogyó.

**Acceptance:** Minden generált pálya játszható (minden játékoshoz el
lehet jutni pathfindinggel).

### 11.6 Szélesebb megjegyzések

- **Seed:** minden generátor determinisztikus seed-ből dolgozik.
- **Validáció:** generálás után automatikus ellenőrzés: mindenki
  mindenkihez eljuthat, nincs állatkert (unwinnable) pozíció.
- **Retry:** ha a validáció bukik, új seed-del újrapróbálja (max 5x),
  utána error.

---

## 12. Audio rendszer

### 12.1 Tech stack

- **Lib:** Phaser beépített audio rendszere (elegendő).
- **Formátum:** OGG (minden modern böngésző támogatja).
- **Source:** freesound.org, OpenGameArt, kenney.nl (CC0-ás
  placeholder).

### 12.2 Zene

3-féle:
- `music_menu.ogg` — főmenü, ~2 perc loop
- `music_gameplay_1.ogg` — normál játék, ~3 perc
- `music_gameplay_2.ogg` — alternatív, ~3 perc
- `music_combat.ogg` — amikor a játékos harcban van, ~2 perc
- `music_victory.ogg` — győzelem jingle, ~15 sec
- `music_defeat.ogg` — vereség jingle, ~15 sec

**Logika:**
- Menu = music_menu loop.
- Gameplay = gameplay_1 vagy _2 random váltogatás, crossfade 3 sec.
- Combat zene: ha a kamera közelében (5 tile) aktív harc van,
  crossfade combat-re. Ha 10 sec nincs harc, vissza normálra.

### 12.3 SFX kategóriák

**UI hangok:**
- `ui_click.ogg` — bármi gomb
- `ui_panel_open.ogg` — panel megnyitás
- `ui_error.ogg` — nem lehetséges akció (nincs elég resource, stb.)

**Egység hangok:**
- `unit_select.ogg` — egység kijelölés
- `unit_move.ogg` — move parancs
- `unit_attack.ogg` — attack parancs
- `unit_die.ogg` — egység halála
- Egység-specifikus (opt): `villager_chop.ogg`, `archer_shoot.ogg`, stb.

**Épület hangok:**
- `building_start.ogg` — építés kezdete
- `building_complete.ogg` — építés befejezve
- `building_damage.ogg` — épület sebzést kap
- `building_destroyed.ogg` — épület lerombolva

**Gyűjtés:**
- `gather_wood.ogg` — fa vágás
- `gather_gold.ogg` — bányászat
- `gather_food.ogg` — farm munka
- `resource_deposit.ogg` — lerakás

**Értesítések (notification):**
- `notification_age_up.ogg` — age-up lehetséges
- `notification_attacked.ogg` — támadás alatt vagy
- `notification_research_complete.ogg` — research kész
- `notification_wonder.ogg` — ellenfél wonder-t épít

### 12.4 AudioManager architektúra

```typescript
// src/audio/AudioManager.ts
class AudioManager {
  playMusic(track: MusicTrack, fadeIn?: number): void
  playSFX(sfx: SFXKey, volume?: number, position?: TileCoord): void
  setMasterVolume(v: number): void
  setMusicVolume(v: number): void
  setSFXVolume(v: number): void
  muteAll(): void
  unmuteAll(): void
}
```

**Pozicionális SFX:** ha az SFX egy konkrét tile-on történt, és a
kamera messze van, halkabban hallatszik. 10 tile-nál messzebb 0 volume.

### 12.5 Implementálási task-ok (M6-ban)

1. M6.1 — AudioManager skeleton + menü zene
2. M6.2 — Gameplay zene crossfade
3. M6.3 — Unit SFX minden akcióra
4. M6.4 — Building SFX
5. M6.5 — Notifications
6. M6.6 — Volume control UI (beállítások menü)
7. M6.7 — Pozicionális audio

### 12.6 Volume controls (beállítások menü)

- Master: 0-100%
- Music: 0-100%
- SFX: 0-100%
- Notifications: 0-100% (külön, mert a játékos halkan akarhat zenét
  de értesítést még hallani)

A beállítások `localStorage`-be mentődnek (nem IndexedDB-be, mert UI
state, nem játékállapot).

---

## 13. Interface kontraktok

Ez a szekció dokumentálja a kritikus TS típusokat, amelyeket a
modulok egymás közti kommunikációra használnak. **Új kódot úgy kell
írni, hogy ezeket a kontraktokat ne törje.** Ha szükség van
változtatni, először a PROGRAM_TERV.md-t kell frissíteni.

### 13.1 Komponens típusok (src/ecs/components/)

```typescript
// Position.ts — tile koordináta, nem pixel!
export interface Position { tx: number; ty: number }

// Renderable.ts
export interface Renderable {
  textureKey: string
  frame: number
  depth: number      // rajzolási sorrend, számoltan
  tint?: number
}

// Sprite.ts — Phaser object proxy
export interface Sprite {
  gameObject: Phaser.GameObjects.Sprite
}

// Health.ts
export interface Health { current: number; max: number }

// Owner.ts
export interface Owner { playerId: number }  // 0 = Gaia, 1-6 = player

// Unit.ts
export interface Unit {
  type: UnitType       // 'villager' | 'swordsman' | ...
  civ: CivId           // 'hungarian' | 'english' | ...
}

// Building.ts
export interface Building {
  type: BuildingType
  civ: CivId
  constructionProgress: number  // 0-100
  producesQueue: UnitType[]     // training queue
}

// Movable.ts
export interface Movable {
  speed: number
  path: TileCoord[] | null
  pathIndex: number
  facing: Direction  // 0-7
}

// Attacker.ts
export interface Attacker {
  meleeDmg: number
  pierceDmg: number
  range: number
  cooldownMs: number
  lastAttackAt: number
}

// Gatherer.ts
export interface Gatherer {
  resourceType: ResourceType | null
  carrying: number
  capacity: number
  targetEntityId: number | null
}
```

### 13.2 System signature

Minden rendszer egy pure function:

```typescript
type System = (world: World, deltaMs: number, gameState: GameState) => void
```

Rendszerek **NEM** hoznak létre Phaser gameobject-et direkt. Azt csak
a RenderSystem teszi.

### 13.3 Map data interface

```typescript
// src/map/MapData.ts
export class MapData {
  readonly width: number
  readonly height: number

  getTile(tx: number, ty: number): TileData
  setTile(tx: number, ty: number, terrain: TerrainType): void
  isPassable(tx: number, ty: number): boolean
  getNeighbors(tx: number, ty: number): TileCoord[]
}

export interface TileData {
  terrain: TerrainType
  resourceEntityId: number | null
  buildingEntityId: number | null
}
```

### 13.4 AI strategy interface

```typescript
// src/ai/strategies/BaseStrategy.ts
export abstract class BaseStrategy {
  abstract tick(player: Player, world: World, gameState: GameState): void
  abstract getDecisionCycleMs(): number
  abstract getName(): string
}
```

### 13.5 Save interface

```typescript
// src/save/schema.ts
export interface SaveData {
  schemaVersion: number
  createdAt: string
  gameTimeMs: number
  map: SaveMap
  players: SavePlayer[]
  entities: SaveEntity[]
  fogOfWar: Record<number, string>  // base64 per player
  camera: { tx: number; ty: number; zoom: number }
}

// ... ld. CLAUDE.md 5.4
```

### 13.6 Zustand UI store

```typescript
// src/ui/store.ts
interface UIStore {
  // Read-only view of game state
  resources: { food: number; wood: number; gold: number }
  population: { current: number; cap: number }
  currentAge: 1 | 2 | 3
  selectedEntities: number[]  // entity IDs
  hoveredEntity: number | null

  // Menu state
  activePanel: 'build' | 'train' | 'research' | null
  placementGhost: { type: BuildingType; valid: boolean } | null

  // Actions
  setActivePanel(panel: UIStore['activePanel']): void
  setPlacementGhost(ghost: UIStore['placementGhost']): void
}
```

**Szabály:** a UIStore **readonly** a játékállapotra. A HUDSystem
minden tickben frissíti. A HUD komponensek csak olvassák.

---

## Melléklet: Tervezett fájlszám becslés

| Mappa | Becsült fájl |
|---|---:|
| src/ecs/components | ~20 |
| src/ecs/systems | ~15 |
| src/ecs/archetypes | ~10 |
| src/scenes | 8 |
| src/iso | 3 |
| src/map | ~10 |
| src/ai | ~15 |
| src/ui | ~15 |
| src/save | 6 |
| src/audio | 3 |
| src/config | 3 |
| src/i18n | 1 |
| src/types | 2 |
| **Total** | **~110 src fájl** |

Plusz: test fájlok (~30-40), asset data JSON-ok (~10), sprite-ok (~500+).

---

*Utolsó frissítés: 2026-04-21. A dokumentum részletes M4-M6 bontása
M3 befejezésekor készül el.*
