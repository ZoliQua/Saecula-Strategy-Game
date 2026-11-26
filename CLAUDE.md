# CLAUDE.md — Saecula, izometrikus történelmi stratégiai játék

> Ez a dokumentum Claude Code számára készült útmutató. A projekt minden
> technikai és tartalmi döntésének itt van a forrása. Ha ellentmondás van
> ezen dokumentum és egy ad-hoc kérés között, **kérdezz rá**, ne döntsd el
> magad. A scope szigorú — ha egy feature nincs itt leírva, nincs benne.

**Név:** **Saecula** (latin: „korszakok, évszázadok”; korábbi munkacím: `IsoRTS`)
**Játékverzió:** 0.9.2 (lásd 7.6 és `CHANGELOG.md`)
**Nyelv:** felhasználói felület magyar, kód és commit üzenetek angol

---

## 1. Projekt áttekintés

Böngészőben futó, egyjátékos, valós idejű történelmi stratégiai játék
(RTS), izometrikus (2.5D) nézettel. A játékos egy népet választ, és a
térképen a többi AI vezérelte népet kell legyőznie katonai és gazdasági
eszközökkel. Inspirációs forrás: Age of Empires 2, de lényegesen
egyszerűbb scope-pal.

### 1.1 Cél (mit akarunk elérni)

- Egyjátékos mód AI ellenfelekkel (max 6 játékos: 1 ember + 5 AI).
- 3 történelmi kor, amelyek között a játékos fejlődhet.
- 8 nép, mindegyik vizuálisan megkülönböztethető építészettel.
- Alapvető RTS hurok: nyersanyaggyűjtés → építés → egységek képzése →
  harc → győzelem.
- Böngészőben, telepítés nélkül játszható.

### 1.2 Nem-cél (mit explicit NEM csinálunk)

- **Multiplayer.** Nincs netkód, nincs szerver, nincs state sync.
- **Mobil touch interfész.** Desktop böngésző + egér + billentyűzet.
  (Reszponzív layout nem prioritás.)
- **Kampány / küldetések / sztori.** ~~Csak skirmish (szabad játék).~~
  Az M13-tól egy rövid, egyjátékos kampány (három küldetés, lásd 9. szekció,
  M13) a skirmish motorjára épül; hosszú sztori, átvezető videó, szerkesztő
  továbbra sincs.
- **Haladó hadviselés.** Nincs formáció, nincs morale rendszer, nincs
  terep-alapú harci bónusz (kezdetben).
- **Moddolhatóság / custom content.** A játékos nem tölt be külső
  erőforrásokat.
- **Online mentés, cloud save.** Csak IndexedDB helyben.

### 1.3 Nem-cél, de jövőbeli bővítés opciók

Ha a MVP stabil, ezek kerülhetnek be később (külön feature branch-ben):
- Kampány mód (M13: három küldetés)
- Tech fa (kutatási fejlesztések)
- Vallási egységek / konverzió
- Tengeri egységek és vízi térképek (M14)
- Mentett játék megosztása linkkel (JSON export/import)

---

## 2. Tech stack

### 2.1 Alaplib / keretrendszer

| Technológia | Verzió | Miért |
|---|---|---|
| **Phaser 3** | `^3.80.0` | 2D játékmotor, izometrikus plugin, kiforrott |
| **TypeScript** | `^5.3` | Szigorú típusos fejlesztés (`strict: true`) |
| **Vite** | `^5.0` | Gyors fejlesztői szerver, kicsi build |
| **Miniplex** | `^2.0` | ECS könyvtár, TS-barát, 3kb |
| **Zustand** | `^4.5` | UI state (HUD, menük) — NEM játékállapot |
| **pathfinding** | `^0.4.18` | A* implementáció kezdéshez |
| **localforage** | `^1.10` | IndexedDB wrapper mentésekhez |
| **zod** | `^3.23` | Mentés és beállítások futásidejű validációja (7.2) |

### 2.2 Dev stack

- **Vitest** — unit testek
- **ESLint** + **Prettier** — kódminőség
- **TypeScript strict mode** — `strict: true`, `noUncheckedIndexedAccess: true`

### 2.3 Kiegészítő döntések

- **NINCS Redux.** A játékállapotot az ECS világ tárolja, a UI állapotot
  Zustand.
- **NINCS backend.** Minden kliensoldalon fut.
- **Asset formátum:** PNG sprite-ok, JSON atlaszok (TexturePacker formátum).
  Audio: OGG.

  ### 2.4 Github és követés

  - Minden nagyobb lépésnél commit és push gitbem majd githubra.
  - Remote repo: https://github.com/ZoliQua/Saecula-Strategy-Game

---

## 3. Izometrikus (2.5D) nézet alapjai

A játék **2D, Phaser 3-mal renderelve, izometrikus vetítéssel**. Ez nem
valódi 3D — minden sprite 2D kép, a "3D illúziót" a vetítés és a
rajzolási sorrend adja.

### 3.1 Koordinátarendszerek

Két koordinátarendszert használunk következetesen:

- **Tile koordináta** `(tx, ty)`: rácscella pozíció, egész számok. Minden
  játéklogika (pathfinding, ütközés, mezőkijelölés) ebben számol.
- **Képernyő koordináta** `(sx, sy)`: pixel pozíció a vászonban. Ebben
  történik a renderelés.

### 3.2 Csempe méret és transzformáció

```
TILE_WIDTH = 64   // rombusz teljes szélessége (pixel)
TILE_HEIGHT = 32  // rombusz teljes magassága (pixel)
```

Konverziós képletek (a `src/iso/coordinates.ts`-ben legyenek
implementálva egyszer, és MINDEN hívó oldal ezt használja):

```typescript
// tile → screen
screenX = (tx - ty) * (TILE_WIDTH / 2)
screenY = (tx + ty) * (TILE_HEIGHT / 2)

// screen → tile (inverz)
tx = (screenX / (TILE_WIDTH / 2) + screenY / (TILE_HEIGHT / 2)) / 2
ty = (screenY / (TILE_HEIGHT / 2) - screenX / (TILE_WIDTH / 2)) / 2
```

Az egér-kattintásból tile pozíciót a fenti inverz képlettel számolunk,
majd `Math.floor`-ral rácshoz illesztjük.

### 3.3 Depth sorting (rajzolási sorrend)

Izometrikus nézetben a "hátrébb" lévő objektumokat előbb kell rajzolni.
Alapszabály: **depth = (tx + ty)**. Nagyobb érték = előrébb van.

Többmezős épületeknél (pl. 3×3-as városháza) a depth-et a legelőrébb
lévő csempe alapján számoljuk, vagy az épületet külön rétegként
kezeljük. A részleteket a `src/iso/depth.ts` kapszulázza.

### 3.4 Sprite-irányok

Minden mozgó egységnek **8 irányú** sprite-ja van: É, ÉK, K, DK, D, DNY,
NY, ÉNY. Az egység pillanatnyi irányát a mozgási vektor alapján
számoljuk, és a megfelelő sprite frame-et választjuk.

Animáció per irány: idle (1-4 frame), walk (6-8 frame), attack (4-6
frame), death (4-8 frame).

### 3.5 Térkép magasság

**MVP-ben minden lapos.** Dombok, lépcsős terep NEM része a kezdeti
scope-nak. Ha később kell, külön milestone-ban.

---

## 4. Tartalmi scope

### 4.1 Történelmi korok

| Kor | Név (magyar) | Időszak (kb.) |
|---|---|---|
| 1 | Római kor | Kr.e. 500 – Kr.u. 500 |
| 2 | Középkor | 500 – 1500 |
| 3 | Felvilágosodás | 1500 – 1800 |

A játékos egy adott korba lép fel a városháza fejlesztésével, ami
nyersanyagba és időbe kerül. Minden korban új egységek és épületek
válnak elérhetővé.

### 4.2 Népek (nations)

Nyolc nép, mindegyiknek **saját építészeti stílusa**:

| Nép | Angol név | Építészeti karakter |
|---|---|---|
| Magyar | Hungarian | Kárpát-medencei, fa és kő, félköríves |
| Angol | English | Tudor, szürke kő, meredek tetők |
| Német | German | Fachwerk, vörös téglás, csúcsos tornyok |
| Francia | French | Gótikus, világos kő, karcsú tornyok |
| Spanyol | Spanish | Mediterrán, fehér vakolat, cserép tető |
| Olasz | Italian | Reneszánsz, árkádok, terrakotta |
| Orosz | Russian | Hagymakupolás, gerenda-ház, fenyő |
| Finn | Finnish | Északi fa, tőzeges tető, zord |

**Minden nép minden kort megél** — azaz a magyar római kora és a magyar
középkora különböző megjelenésű. Összesen tehát: **8 nép × 3 kor = 24
egyedi architekturális készlet.**

⚠️ **Art budget figyelmeztetés:** ez egyedül az épületekre ~240+ sprite.
A MVP fázisban (lásd 9. szekció) csak 2 néppel és 1 korral indulunk.

### 4.3 Népek közötti különbségek

Kezdeti fázisban **csak vizuális** a különbség. Később (stretch goal)
hozzáadhatunk:
- 1-2 egyedi egység / nép (pl. magyar huszár, angol longbowman, finn
  sissi)
- 1 egyedi bónusz / nép (pl. olasz: +10% építési sebesség)
- 1 egyedi épület / nép

A MVP-ben ezek nincsenek, minden nép statisztikailag azonos. Az M8-tól
minden népnek van 1 egyedi egysége és 1 népbónusza (lásd 9. szekció, M8);
egyedi épület továbbra sincs.

### 4.4 Egységek

**Megosztott (minden nép használja) egységek kor szerint:**

Római kor:
- `villager` — Falusi. Gyűjt minden nyersanyagot, épít.
- `scout` — Felderítő. Gyors, gyenge.
- `swordsman` — Kardforgató. Alap közelharci egység.
- `archer` — Íjász. Alap távolsági egység.

Középkor:
- `knight` — Lovag. Erős, gyors közelharci.
- `pikeman` — Lándzsás. Lovasság-ellenes.
- `crossbowman` — Számszeríjász. Erősebb távolsági.
- `monk` — Szerzetes. Nem harcol: gyógyít és ellenséges egységet térít (M11).

Felvilágosodás:
- `musketeer` — Muskétás. Távolsági, új erősségi osztály.
- `cannon` — Ágyú. Épület-romboló, lassú.
- `cavalry` — Lovasság. Gyors mozgó közelharci.

Hajók (M14, a kikötő képzi, csak vízen járnak):
- `fishing_boat` — Halászhajó. Halrajból gyűjt ételt.
- `transport` — Szállítóhajó. Legfeljebb 5 szárazföldi egységet visz.
- `galley` — Gálya. Távolsági hadihajó.
- `frigate` — Fregatt (3. kortól). Ágyús, épület- és hajóromboló.

**Egyedi (nép-specifikus) egységek:** MVP-ben nincsenek. Az M8-ban
népenként egy, amely a nép egyik alap egységét váltja le (lásd M8).

### 4.5 Épületek

**Megosztott épületek:**

- `town_center` — Városháza. Falusikat képez, ide rakjuk a nyersanyagot.
  (3×3 tile)
- `house` — Ház. Emeli a népesség-limitet. (2×2)
- `farm` — Farm. Étel-termelés. (2×2)
- `lumber_camp` — Faraktár. Fa-gyűjtés közelében. (2×2)
- `mining_camp` — Bányászkunyhó. Arany közelében. (2×2)
- `barracks` — Laktanya. Gyalogos egységek képzése. (3×3)
- `archery_range` — Lőtér. Távolsági egységek. (3×3, 2. kortól)
- `stable` — Istálló. Lovas egységek. (3×3, 2. kortól)
- `blacksmith` — Kovácsműhely. Egység-fejlesztések. (2×2, 2. kortól)
- `tower` — Őrtorony. Defenzív. (1×1)
- `wall` — Fal. Defenzív, 1-tile szegmensek.
- `monastery` — Kolostor. `monk` képzése. (3×3, 2. kortól, M11)
- `foundry` — Ágyúöntöde. `cannon` képzése. (3×3, 3. kortól)
- `dock` — Kikötő. Hajókat képez, a halat fogadja. (3×3, a parton, M14)
- `wonder` — Csoda. Győzelmi feltétel (3. kortól, csak 1 építhető). (4×4)

### 4.6 Nyersanyagok

Három nyersanyag (AoE2 vs. mi: nincs külön kő, az arany helyettesíti):

- `food` — Étel. Farmokról, bogyókról, vadról.
- `wood` — Fa. Erdőből.
- `gold` — Arany. Bányából.

### 4.7 Térképméretek

| Méret | Tile-ok | Javasolt játékosszám |
|---|---|---|
| Kicsi | 64 × 64 | 2-3 |
| Közepes | 96 × 96 | 4 |
| Nagy | 128 × 128 | 5-6 |

⚠️ 128×128 felett a performance már kritikus. Ne lépjük túl!

### 4.8 Győzelmi feltételek

Három lehetőség (kezdetben csak az első):

1. **Conquest** (hódítás): minden ellenfél városháza elpusztítva.
2. **Wonder** (csoda): a játékos felépít egy Csodát és megvédi 10 percig.
3. **Time** (idő): 60 perc után a legnagyobb pontszám nyer.

MVP-ben csak a Conquest élvez prioritást.

---

## 5. Architektúra

### 5.1 ECS (Entity Component System)

**Miniplex**-et használunk. Az ECS pattern kulcsfontosságú, mert RTS-ben
sok entitás van és gyakran változó viselkedések.

**Alapelv:** az ECS világ a *játékállapot egyedüli forrása*. Phaser
GameObject-ek csak renderelési proxy-k, logikát NEM tartalmaznak.

#### 5.1.1 Komponensek (alapkészlet)

Minden komponens egy tiszta TS interfész, data-only (no methods):

```typescript
interface Position { tx: number; ty: number }       // tile koord
interface Renderable { textureKey: string; frame: number; depth: number }
interface Sprite { gameObject: Phaser.GameObjects.Sprite }  // Phaser ref
interface Health { current: number; max: number }
interface Owner { playerId: number }                // 0 = Gaia, 1-6 = játékos
interface Unit { type: UnitType; civ: CivId }
interface Building { type: BuildingType; civ: CivId; constructionProgress: number }
interface Movable { speed: number; path: Tile[] | null; facing: Direction }
interface Attacker { damage: number; range: number; cooldownMs: number; lastAttackAt: number }
interface Gatherer { resourceType: ResourceType | null; carrying: number; capacity: number }
interface Selectable { isSelected: boolean }
interface AIControlled { strategy: StrategyId }
interface FogEmitter { sightRange: number }
```

#### 5.1.2 Rendszerek (systems)

Minden rendszer egy tiszta függvény: `(world, deltaMs) => void`.
Futtatási sorrend (ez fontos, determinisztikus legyen):

1. `InputSystem` — egér/billentyű events → intent komponensek
2. `AISystem` — AI játékosok döntései → intent komponensek
3. `PathfindingSystem` — új path-okat számol, ha kell
4. `MovementSystem` — entitásokat mozgat a path mentén
5. `CombatSystem` — támadások, sebzés
6. `GatheringSystem` — nyersanyaggyűjtés logika
7. `ConstructionSystem` — épületek építési progressz
8. `ResourceSystem` — nyersanyag mennyiségek, limit check
9. `FogOfWarSystem` — látótér frissítés
10. `SelectionSystem` — kijelölés állapot
11. `RenderSystem` — ECS → Phaser sprite sync, depth sort
12. `AnimationSystem` — sprite frame váltás
13. `HUDSystem` — HUD adat frissítés a Zustand store-ban

#### 5.1.3 Archetípusok

Entitás-létrehozáshoz használjunk factory függvényeket
(`src/ecs/archetypes/`):

```typescript
createVillager(world, { tx, ty, playerId, civ })
createBuilding(world, { type, tx, ty, playerId, civ })
createResource(world, { type, tx, ty, amount })
```

### 5.2 Phaser jelenet (scene) struktúra

```
BootScene        → minimális, betölti a PreloadScene-hez kellő minimumot
PreloadScene     → asset loading, loading bar
MainMenuScene    → főmenü (új játék, betöltés, beállítások)
GameSetupScene   → játékbeállítások (nép, térkép, AI nehézség)
GameScene        → a tényleges játék (ECS + pálya renderelés)
HUDScene         → overlay a GameScene fölött (HUD, minimap, panels)
PauseScene       → pause menü (az overlay halványítja a GameScene-t)
GameOverScene    → vége képernyő
```

A `GameScene` és `HUDScene` **párhuzamosan futnak** (Phaser scene system
támogatja). A HUDScene olvassa a Zustand store-t; a GameScene frissíti.

### 5.3 State management

Két különálló állapotréteg, tiszta szeparációval:

- **ECS világ** (Miniplex): játékállapot — egységek, épületek,
  térkép-entitások. A rendszerek módosítják.
- **Zustand store** (`src/ui/store.ts`): UI állapot — aktív HUD panel,
  kiválasztott egység adatai a HUD-on, menük. **NEM TARTAL­MAZ**
  hiteles játékállapotot, csak renderelési-UI-állapotot.

Szinkron: minden tick végén a `HUDSystem` kiolvassa az ECS-ből a HUD-hoz
kellő adatokat, és frissíti a Zustand store-t. A HUDScene reagál a
store változásra.

### 5.4 Save/Load formátum

Cél: egy JSON, ami teljesen visszaállítja a játékot. Séma versionelt.

```json
{
  "schemaVersion": 1,
  "createdAt": "2026-04-21T14:30:00Z",
  "gameTimeMs": 1842300,
  "map": {
    "width": 96,
    "height": 96,
    "seed": 42,
    "terrain": "base64-encoded-uint8array"
  },
  "players": [
    {
      "id": 1,
      "isHuman": true,
      "civ": "hungarian",
      "color": "#E24B4A",
      "age": 2,
      "resources": { "food": 342, "wood": 200, "gold": 50 },
      "population": { "current": 23, "cap": 30 },
      "defeated": false
    }
    // ... további játékosok
  ],
  "entities": [
    {
      "id": 12,
      "components": {
        "Position": { "tx": 34, "ty": 21 },
        "Unit": { "type": "villager", "civ": "hungarian" },
        "Owner": { "playerId": 1 },
        "Health": { "current": 25, "max": 25 }
        // ... további komponensek
      }
    }
    // ... további entitások
  ],
  "fogOfWar": {
    "1": "base64-encoded-bitmap"
  },
  "camera": { "tx": 30, "ty": 30, "zoom": 1.0 }
}
```

**Szabályok:**
- `schemaVersion` minden játékmenet-releváns változásnál növekedik.
- Régi verziók betöltése migráló függvényeken keresztül
  (`src/save/migrations/`).
- Mentés `localforage`-be kerül, kulcs: `save:<slotId>`. Max 5 slot.
- Autosave: 5 percenként `save:auto`-ba.

---

## 6. Projekt struktúra

```
Saecula-Strategy-Game/
├── CLAUDE.md                    ← ez a fájl
├── README.md / README.hu.md     ← angol és magyar leírás (tartalmuk egyezik)
├── CHANGELOG.md / CHANGELOG.hu.md
├── CONTRIBUTING.md / CONTRIBUTING.hu.md
├── CODE_OF_CONDUCT.md / CODE_OF_CONDUCT.hu.md
├── CONTRIBUTORS.md
├── LICENSE                      ← MIT
├── .github/                     ← CI (lint, típus, teszt, build), issue- és PR-sablonok
├── package.json
├── tsconfig.json                ← strict: true
├── vite.config.ts
├── index.html
├── public/
│   └── assets/
│       ├── sprites/
│       │   ├── units/{civ}/{unit_type}/{direction}_{anim}.png
│       │   ├── buildings/{civ}/{age}/{building_type}.png
│       │   ├── terrain/
│       │   └── ui/
│       ├── audio/
│       └── data/
│           ├── civs.json        ← nép-specifikus beállítások
│           ├── units.json       ← egység statisztikák
│           ├── buildings.json   ← épület statisztikák
│           └── ages.json        ← kor-specifikus beállítások
└── src/
    ├── main.ts                  ← Phaser inicializáció
    ├── config/
    │   ├── game.ts              ← Phaser config
    │   ├── constants.ts         ← TILE_WIDTH, MAX_PLAYERS, stb.
    │   ├── balance.ts           ← stat konstansok (egyetlen forrás)
    │   ├── civs.ts              ← nép-regiszter (CIV_DEFS: elérhetőség, kor-stílusok, címer)
    │   ├── aiMaster.ts          ← Mesteri AI hangolása
    │   ├── aiPersonality.ts     ← AI-személyiségek
    │   ├── audio.ts             ← hang- és zene-konstansok
    │   └── visual.ts            ← világítás, napszak, árnyék (csak megjelenés)
    ├── scenes/
    │   ├── BootScene.ts
    │   ├── PreloadScene.ts
    │   ├── MainMenuScene.ts
    │   ├── GameSetupScene.ts
    │   ├── GameScene.ts         ← életciklus, bekötés, rendszersorrend
    │   ├── HUDScene.ts
    │   ├── PauseScene.ts
    │   └── game/                ← GameScene segédmodulok (input, építés, bootstrap, rendszerek)
    ├── ecs/
    │   ├── world.ts             ← Miniplex world létrehozás
    │   ├── components/          ← komponens interfészek
    │   ├── systems/             ← rendszer függvények
    │   └── archetypes/          ← entitás factory-k
    ├── game/                    ← Player, PlayerManager, VictoryChecker, technológiák
    ├── iso/
    │   ├── art/                 ← procedurális grafika (terep, épület, egység, dekor)
    │   │   ├── architecture/    ← épület-festők koronként (ArchStyle, stíluscsaládok)
    │   │   │   ├── kits/        ← népek közös díszítő-készletei (favázas rács, lépcsős oromzat, hagymakupola…)
    │   │   │   ├── families/    ← több nép által használt festőcsaládok (tudor, georgian) és közös kellékeik
    │   │   │   ├── english/     ← angol építészet (romano-brit, Tudor/normann, georgiánus, gótikus katedrális)
    │   │   │   ├── german/      ← német (limes, Fachwerk, Backstein, speyeri császári dóm)
    │   │   │   ├── french/      ← francia (gallo-római, loire-i gótika, klasszicizmus, versailles-i palota)
    │   │   │   ├── spanish/     ← spanyol (hispániai udvarház, mudéjar, gyarmati barokk, Alhambra)
    │   │   │   ├── italian/     ← olasz (etruszk-római insula, komuna-tornyok, reneszánsz, firenzei dóm)
    │   │   │   ├── russian/     ← orosz (izba, moszkvai sátortető, péteri barokk, Szent Vazul)
    │   │   │   └── finnish/     ← finn (tőzegtetős faház, gránit, gusztávi, petäjävesi fatemplom)
    │   │   ├── units/           ← egység-rig és -festés; népenkénti megjelenés (alap + felülírás)
    │   │   │   ├── english/     ← angol egységviselet (Szent György-kereszt, sallet, hosszúíj)
    │   │   │   └── <nép>/       ← a többi nép viselete (german, french, spanish, italian, russian, finnish)
    │   │   ├── walls/           ← falstílusok koronként
    │   │   │   ├── kits/        ← népek közös fal-készletei (sáncos cölöpfal, csillagerőd, alapformák)
    │   │   │   ├── english/     ← angol falak (cölöpsánc, normann kőfal, tégla csillagerőd)
    │   │   │   └── <nép>/       ← a többi nép falai (german, french, spanish, italian, russian, finnish)
    │   │   └── lighting/        ← világítási szerződés (normal map-ek, fény, árnyék)
    │   ├── coordinates.ts       ← tile ↔ screen konverzió
    │   ├── depth.ts             ← rajzolási sorrend
    │   └── picking.ts           ← egérrel tile választás
    ├── map/
    │   ├── TileMap.ts
    │   ├── generator.ts         ← véletlen térkép generátor
    │   ├── generators/          ← térképsablonok (template-enként egy generátor)
    │   └── pathfinding.ts       ← A* wrapper
    ├── ai/
    │   ├── AIPlayer.ts
    │   ├── perception.ts        ← az AI látószöge (amit a játékos is látna)
    │   ├── economy.ts           ← AI gazdasági számítások
    │   ├── strategies/          ← AI stratégia modulok
    │   └── decisions/           ← döntési függvények
    ├── ui/
    │   ├── store.ts             ← Zustand UI store
    │   ├── HUD.ts
    │   ├── Minimap.ts
    │   ├── panels/
    │   └── screens/             ← főmenü, játék vége (DOM overlay)
    ├── campaign/                ← küldetések, célok, kampány-előrehaladás (M13)
    ├── save/
    │   ├── schema.ts            ← TS típusok a save-hez
    │   ├── serializer.ts        ← ECS → JSON
    │   ├── deserializer.ts      ← JSON → ECS
    │   ├── storage.ts           ← localforage wrapper
    │   └── migrations/          ← verzió-migrációk
    ├── stats/                   ← pontszám, meccs-statisztika, játéknapló (IndexedDB)
    ├── audio/
    │   ├── AudioManager.ts      ← hangkezelő: zene, SFX, hangerő-csatornák, pozicionális hang
    │   ├── sfx/                 ← procedurális hangeffektek (szintézis, katalógus, hangkorlát)
    │   └── music/               ← generatív, koronkénti zene (zeneszerző, sorrendező, rendező)
    ├── i18n/
    │   └── hu.ts                ← magyar szövegek
    └── types/
        └── index.ts             ← globális típusok (CivId, UnitType, stb.)

docs/                            ← tervek és specifikációk (plans/specs)
scripts/perf/                    ← mérőszkriptek (textúra-memória, képkockaidő; Playwright, M10)
scripts/smoke/                   ← böngészős smoke-szkriptek (fej nélküli Chrome, CDP; függőség nélkül, 0.9.1)
```

---

## 7. Kódolási konvenciók

### 7.1 Nyelv

- **Kód, fájlnevek, azonosítók, commit üzenetek:** angolul.
- **UI szövegek, játékbeli feliratok, hibaüzenetek a játékosnak:**
  magyarul, a `src/i18n/hu.ts`-ben centralizálva. **Sose** hardcode-olj
  magyar szöveget JSX-be / komponensbe.

### 7.2 TypeScript

- `strict: true` kötelező.
- `any` használata tilos, kivétel: 3rd party lib interop, kommentelve.
- Runtime validáció külső adatra (save fájl, JSON): használjunk `zod`-ot.
- Preferált: `type` az unionokra, `interface` a komponensekre /
  objektum-alakra.

### 7.3 Fájlnevek

- Komponensek, osztályok: `PascalCase.ts` (`TileMap.ts`, `GameScene.ts`).
- Függvény-modulok, utilok: `camelCase.ts` (`coordinates.ts`, `pathfinding.ts`).
- Egy default export = fájlnév egyezik a névvel.

### 7.4 Kommentelés

- Publikus függvényeknek JSDoc, ha nem triviális.
- Magyarázó kommentek angolul. Magyar kommentek csak magyar szövegekre
  vonatkozólag.

### 7.5 Git

- Branch: `main` (alapértelmezett, mindent tartalmaz) + feature branchek
  (`feat/pathfinding`, `fix/depth-sort`), mindig a `main`-ből indítva.
- Commit: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- Minden feature branch PR-ban megy main-be (még ha szólómunka is).

### 7.6 Verziózás és a név

- **Név:** a játék neve **Saecula**; a felhasználónak látható minden helyen
  (cím, főmenü, HUD, export-fájlnév, dokumentumok) ez szerepel, a `hu.title`
  az egyetlen forrás a UI-ban.
- **Belső tároló-kulcsok maradnak** (`isorts` IndexedDB, `isorts.settings.v1`
  localStorage): átnevezésük elveszítené a játékosok mentéseit, beállításait
  és meccsnaplóját. Nem láthatók, ezért nem nevezzük át őket.
- **SemVer** (`MAJOR.MINOR.PATCH`), 1.0 előtt: új milestone vagy nagyobb
  funkciócsomag → MINOR, csak javítás → PATCH. A jelenlegi verzió **0.9.2**.
- A verzió egyetlen forrása a `package.json` `version` mezője; a játék a
  `src/config/version.ts` `APP_VERSION`-jén át mutatja (főmenü lábléc).
- Kiadáskor: `CHANGELOG.md` és `CHANGELOG.hu.md` frissítése (Keep a Changelog
  formátum), `package.json` verzió, `chore(release): vX.Y.Z` commit a
  `main`-en, `vX.Y.Z` git tag és GitHub release a changelog szakaszával.
- A dokumentumok angolul és magyarul is megvannak (`*.md` és `*.hu.md`);
  változáskor mindkettőt frissíteni kell.

---

## 8. Asset pipeline

### 8.1 Sprite előállítás

**MVP-ben placeholder art.** Kraftpix, Itch.io, OpenGameArt ingyenes
sprite packek. A végleges art külön milestone.

**Vizuális átdolgozás (feat/visual-overhaul):** ingyenes (CC0) asset
packok és AI által generált grafika (csempék, épületek, egységek) is
használható. Jelenleg minden grafika procedurálisan, kódból generált
(`src/iso/art/`), külső bináris asset nincs. Ha külső asset kerül be,
a licence a `public/assets/CREDITS.md`-ben rögzítendő. A UI irány:
sötét, meleg tónusú üveg panelek (DOM overlay a canvas fölött),
borostyán kiemelőszín, Inter + Cinzel betűk, dinamikus (animált)
megjelenés.

**Világítás:** a világ grafikája Phaser Light2D-vel van megvilágítva,
procedurálisan generált normal map-ekkel. Lassú napszak-ciklus és vetett
árnyékok adnak mélységet a képnek.

### 8.2 TexturePacker atlaszok

Minden sprite csoport egy atlaszba:
- `units_{civ}.png` + `units_{civ}.json`
- `buildings_{civ}_{age}.png` + JSON
- `terrain.png` + JSON
- `ui.png` + JSON

A preload-ban Phaser `load.atlas()` tölti be.

### 8.3 Sprite-ok mérete (irányelvek)

- Csempe: 64×32
- Egység: ~48×64 (magasabb mint széles, mert az egység "áll" a csempén)
- Épület: változó, de a csempe-rács többszöröse. Pl. 3×3-as épület →
  192×192 vagy magasabb, mert a tető "benyúlik" a csempéken túl.

### 8.4 Civ-variáció stratégia (fontos!)

240+ épület-sprite kézi rajzolása reálisan nem fér bele. Három opció:

1. **Palette swap:** egy alap sprite + szín-változat per nép. Olcsó,
   de gyenge vizuális megkülönböztetés.
2. **Decoration overlay:** alap sprite + nép-specifikus dekoráció
   overlay (zászló, címer, tető-cserép variáns). Közepes költség.
3. **Full custom per civ per age:** teljes egyedi art. Legszebb, de
   gigantikus munka.

**Javaslat:** MVP-ben (1) palette swap + (2) egyszerű overlay. A (3)
stretch goal.

**M4 döntés:** a nép-regiszter TypeScriptben van (`src/config/civs.ts`,
`CIV_DEFS`), nem `civs.json`-ban (típusos, nincs loader / zod felület). Az
angol nép a palette swap + overlay fölött saját sziluetteket is kap, ahol
olcsó (lásd 9. szekció, M4).

---

## 9. Fejlesztési fázisok (milestones)

Ez a projekt **túl nagy** ahhoz, hogy egyben elkészüljön. Fázisokra
bontjuk, minden fázis végén játszható (vagy legalább futó) build.

### M0 — Foundation (engine hello world)
- Vite + TS + Phaser 3 + Miniplex setup
- Üres izometrikus térkép renderelése (64×64 csempe, grass only)
- Kamera scroll (WASD + szélső egér)
- Koordináta konverzió tesztekkel
- Egy "villager" sprite pathfinding nélküli mozgatása kattintásra

### M1 — Single civ, single age vertical slice
- **1 nép** (magyar), **1 kor** (Római)
- Nyersanyagok: fa, arany, étel — lerakható a térképre
- Villager tud fát vágni, bányászni, farmot építeni
- Városháza + 3 alap épület (ház, laktanya, farm)
- Alapegységek: villager, swordsman, archer
- A* pathfinding
- Minimális HUD: nyersanyag count, selection panel
- 1 játékos (ember), nincs AI még

### M2 — Combat és második játékos (dummy AI)
- Támadási rendszer (CombatSystem)
- Health bar, halál animáció
- 1 AI ellenfél, primitív "random build + attack" stratégiával
- Fog of war alapverzió
- Conquest győzelem-feltétel

### M3 — Teljes 1 nép, 3 kor
- Továbbra is csak magyar nép, de mind a 3 kor
- Age-up logika (városháza → upgrade)
- Középkor és felvilágosodás épületek, egységek
- Továbbfejlesztett AI (age-up-ot is csinál)

### M4 — Multi-civ support (2 nép)
- Második nép (angol), palette swap + overlay
- Civ választó a GameSetupScene-ben
- Architektúra-rendszer: a nép-regiszter (`src/config/civs.ts`, `CIV_DEFS`)
  adja meg népenként és koronként az építészeti stílust, a fal-stílust és az
  egység-kinézetet (nem `civs.json`).
- Tervezési döntések (részletek: `docs/superpowers/plans/2026-10-27-m4-multi-civ.md`):
  - Palette swap + overlay fölött saját sziluettek (tetőhajlás, oromzat,
    kémény, favázas szerkezet, tornyok); a magyar kinézet pixelre azonos marad.
  - Angol korok: római kori brit (szürke kő, meredek nád/pala), Tudor/normann
    (favázas emelet, meredek cseréptető, téglakémények), georgiánus (vörös
    tégla, fehér ablakok, palatető); csoda: gótikus katedrális; falak: cölöpsánc
    → szürke kőfal → tégla bástya.
  - Egységek: azonos váz és felszerelés; a nép a színpalettát, a címert és
    néhány sisak/pajzs változatot határozza meg. A csapatszín-maszk marad a
    tulajdonos jelölése.
  - Ki melyik nép: az ember a beállításban választ (Magyar / Angol); az AI
    népe „Vegyes” (alapértelmezés, mag alapján keverve) / Magyar / Angol,
    a `GameSetupConfig`-ban tárolva.
  - Textúra-keret: csak a meccsen szereplő népek grafikája készül el, és
    csak az marad memóriában; a nép-függő textúra-kulcsok `~c<nép>` szegmenst
    kapnak. A ≤ 256 MB GPU keret továbbra is köt.

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
- Új nép felvételének ellenőrzőlistája (megosztott festőt csak opcionális
  kapcsolóval érint: egy közös család új, alapból kikapcsolt `StyleKits`
  mezőt kaphat, ha a magyar, az angol és a korábbi népek rögzítései
  változatlanok maradnak):
  1. `src/types/index.ts`: a `CivId` unió; `src/config/civs.ts`: az
     id-uniók (`ArchStyleId`, `WallStyleId`, `UnitLookId`) és a nép
     `CIV_DEFS` sora (`available: true` csak akkor, ha a nép teljesen kész).
  2. `src/iso/art/architecture/<nép>/`: stílusok (`dropHiddenGlows: true`),
     festők, Csoda, címer-töltet; egy-egy sor a `registry.ts`-ben és a
     `charges.ts`-ben; saját festőcsaládnál egy `ArchFamily` tag és a család
     készlet-interfésze (pl. `CourtyardKits`) a `style.ts`-ben. A legalább
     két nép által használt festő a `architecture/kits/` mappába kerül.
  3. `src/iso/art/walls/<nép>/`: falstílusok; egy sor a `wallStyles.ts`-ben.
  4. `src/iso/art/units/<nép>/`: kinézet, felszerelés, anyagok; egy-egy sor
     a `looks.ts`-ben és a `gearRegistry.ts`-ben, és a nép felszerelés- és
     töltet-táblái a `src/iso/art/registryIds.test.ts` forráslistáiban.
  5. `src/i18n/hu.ts`: a nép neve és egysoros leírása.
  6. Rögzítő tesztek (draw-log hash) a nép mappáiban épületre, falra és
     egységre (`pinBuildings` / `pinWalls` / `pinUnits`,
     `src/iso/art/testing/pinnedArt.testkit.ts`); a magyar, az angol és a
     korábbi népek rögzítései változatlanok maradnak. A
     `src/config/civSurface.test.ts` őrzi, hogy népazonosító csak a fenti
     fájlokban szerepel, az `allCivsGlows.test.ts`, hogy nincs takart
     ablakfény.
- Ágak: a belépő feladatok a `feat/M5-eight-civs` ágon; népenként külön ág
  (`feat/M5-<nép>`), mindig az előző nép ágának végéről (egymásra épülő
  ágak); a zárófeladat a `feat/M5-eight-civs` ágon fut, a finn ágra
  előretekerve.
- Keret (10.): ≤ 256 MB textúra-memória (csak textúrák, WebGL framebufferek
  nélkül) a legrosszabb elérhető esetben: 128×128 Szigetek, 6 játékos,
  6 különböző nép; minden további nép legfeljebb ~1 s betöltési többletet
  okoz.
- **Állapot: kész (2026-10-28).** Mind a 8 nép játszható (`available: true`).
  Mérve: 6 különböző nép 242,3 MB, a hat legnehezebb nép 247,5 MB, az M4
  két népes eset 160,6 MB; képkocka-CPU p95 7,4 ms (96×96, 4 játékos,
  4 nép); népenként +0,3–0,5 s betöltés; bundle 0,64 MB gzip. Őrzi a
  `src/ai/strategies/eightCivs.sim.test.ts` és a `src/iso/art/allCivsArt.test.ts`.

### M6 — Polish és jövőbeli bővítések
- Mentés/betöltés (5.4): `src/save/` (séma, szerializáló, visszatöltő,
  tároló, migrációk), `schemaVersion` 1, zod-validáció; 5 kézi hely
  (`save:1`…`save:5`) és automatikus mentés 5 játékpercenként
  (`save:auto`). A mentés az ECS-en kívüli állapotot is tartalmazza
  (játékosok, köd, kamera, óra, napszak, az AI-k belső állapota és
  véletlengenerátora); textúrát soha. Sérült vagy újabb verziójú mentés
  magyar hibaüzenetet ad, sosem omlik össze.
- Szünet menü (Esc, `PauseScene`): folytatás, mentés, betöltés,
  beállítások, kilépés a főmenübe; a játékidő áll.
- Audio, procedurálisan, külső fájl nélkül (`src/audio/`): `AudioManager`
  (PROGRAM_TERV 12.4), SFX-katalógus (12.3), pozicionális hang (10 tile-on
  túl és ködben néma), egyidejű hangok korlátja, generatív koronkénti zene
  (menü, két nyugodt hangulat 3 s áttűnéssel, harci zene a kamera közelében
  zajló harcra, 10 s után vissza, győzelmi és vereség-zárás). Hang csak az
  első felhasználói mozdulat után. A hangkulcsok fájlnév-szerűek: később
  CC0 OGG cserélheti őket a hívók módosítása nélkül.
- Beállítások (főmenüből és a szünetből): fő-, zene-, SFX- és
  értesítés-hangerő 0–100 %, némítás, a kamera-billentyűk átállítása (az
  Esc és a nyilak fixek), alapértelmezés visszaállítása; `localStorage`.
- Csoda-győzelem (4.8 #2): a kész Csodát 10 percig megtartó játékos nyer.
  Beállítás: „Hódítás” / „Hódítás vagy Csoda” (alapértelmezett). A HUD
  minden álló Csoda visszaszámlálóját mutatja; az AI (Közepestől) épít
  Csodát, és az ellenséges Csodát elsőként támadja.
- AI: új „Mesteri” szint a Nehéz fölött (jobb gazdasági időzítés, korábbi
  korváltás, vegyes sereg, többirányú támadás, csalás nélkül) és
  AI-személyiségek (rohamozó / gazdálkodó / védekező), a magból
  választva; a játék végi statisztika mutatja őket.
- Nem része: időgyőzelem, oktató mód, további nyelvek, kampány,
  multiplayer, egyedi egységek és népbónuszok.
- Keret (10.): ≤ 256 MB textúra-memória (distinct6, heavy6), ≤ 226 MB a
  twoCivM4 esetben, 60 FPS 96×96-on 4 játékossal, < 2 MB gzip csomag. A 256 MB-ot
  1280×720-as nézetben, 1,2-es és 0,5-ös nagyításon mérjük (az M4–M5 protokoll);
  a 0,65–1,0 nagyítási sávban a terep-gyorsítótár kb. 13 MB-tal többet tart
  (mérve 6 néppel 256,9–264,2 MB), nagy, nagy felbontású (hi-DPI) ablakon még
  többet — egy köztes terep-felbontási szint későbbi feladat.
- **Állapot (2026-10-29):** kész — mentés és betöltés (automatikus mentéssel),
  szünet menü, beállítások, procedurális hang és zene, Csoda-győzelem, Mesteri
  AI és személyiségek. Mérve — textúra-memória (1280×720-as nézet): 6 különböző
  nép 245,9 MB, a hat legnehezebb nép 243,5 MB, az M4 két népes eset 158,5 MB, a
  betöltött 6 népes mentés (1,2,3,1,2,3. kor) csúcsa 250,8 MB; a teljes
  böngészőablakban (1728×963): képkocka-CPU p95 6,5 ms hanggal (96×96, 4 játékos),
  egy 128×128-as, 6 játékosos mentés betöltése ~8 s; nézetmérettől függetlenül:
  legfeljebb 292 entitás (6 játékos), bundle 0,71 MB gzip, a fenti mentés 0,44 MB
  JSON, mentése ~6–11 ms.

### M7 — Playtest-javítások és kezelhetőség
Az első teljes játék (2026-10-29) hibalistája és kérései. Ág: `feat/M7-playtest`.
- **Beragadó egységek (hiba):** egység sosem kerülhet tartósan járhatatlan
  mezőre. Épületalap lerakásakor a területén álló egységek a legközelebbi
  szabad mezőre lépnek; a mozgó egység, amelynek következő lépése közben
  járhatatlanná vált, újratervez; a járhatatlan mezőről induló útkeresés
  előbb kilép a legközelebbi szabad mezőre. A két egymás melletti falusi
  beragadását reprodukálni kell, és meg kell keresni a valódi okát. Egy hosszú
  AI-szimuláció őrzi, hogy egyetlen egység sem ragad be.
- **Segítség az építésben:** a kijelölt falusi jobb klikkje (vagy a beállított
  parancs-gesztusa) a saját félkész épületre építésre küldi.
- **Környezetfüggő kurzor:** a kurzor jelzi, mit tesz a kijelölt egység,
  ha a mezőre küldöd: mozgás, fa (fejsze), arany (csákány), étel (kosár),
  építés (kalapács), támadás (kard), tiltott hely. Saját SVG kurzorok, külső
  fájl nélkül.
- **Érintőpad és egér:** két ujjas húzás a térképet mozgatja, csippentés
  (pinch, a böngészőben `ctrlKey` görgetés) nagyít; az egérgörgő nagyít.
  A beállításban: „Görgetés”: automatikus / nagyítás / mozgatás.
- **Irányítás a beállításokban:** a beállítás két lapra oszlik: „Hang” és
  „Irányítás”. Az Irányításban: a parancs gesztusa (a jobb klikk mindig él,
  mellé választható: Ctrl+klikk, alapértelmezett / Cmd+klikk / Alt+klikk /
  nincs), a görgetés módja és az átállítható billentyűk (a kamera mellett: haza,
  pontszám-panel, falusi-panel, fejlődési fa, épület törlése).
- **Épület törlése:** a kijelölt saját épület törölhető (gomb a kijelölés
  panelen, `Delete` billentyű, megerősítéssel). Félkész épületnél, legfeljebb 50 %
  készültségig a költség egy része visszajár: `round((1 − p) × 80)` százalék, ahol
  `p` a készültség (0 % → 80 %, 49 % → 41 %, 50 % → 40 %), erőforrásonként
  kerekítve. 50 % fölött és kész épületnél nincs visszatérítés.
- **Fejlődési fa:** a szünet menü „Fejlődési fa” pontja korok szerint mutatja,
  mi mikor válik elérhetővé (épületek, egységek és melyik épület képzi őket,
  fejlesztések, a korváltás ára); a játékos jelenlegi kora kiemelve.
- **Jobb oldali panel (váltható):** „Pontszám” nézet — minden játékos
  pontszáma, élőben (AoE-szokás: az ellenfelek pontszáma is látszik);
  „Falusiak” nézet — hány falusi gyűjt ételt, fát, aranyat, hány épít, hány
  tétlen; egy sorra kattintva azok a falusiak kijelölődnek. A felső sáv
  népesség-számlálójára kattintva a panel a Falusiak nézetre vált.
  Pontszám = összegyűjtött nyersanyag / 10 + elpusztított ellenséges egységek
  és épületek ára / 10 + álló, kész saját épületek ára / 10 + korbónusz
  (középkor 300, felvilágosodás 800). A mentés a statisztikát is tartalmazza
  (`schemaVersion` 2, migrációval).
- **Kamera-gombok:** „Haza” gomb (és billentyű): a nézetet a saját
  városházára igazítja, ismételt nyomásra a következő városházára lép. A
  térkép-panelen nagyító és kicsinyítő gomb.
- **Játéknapló és statisztika:** minden befejezett (győzelem, vereség vagy
  kilépés) meccs összefoglalója a helyi IndexedDB-be kerül (`isorts` /
  `matches`, legfeljebb 200, a legrégebbi esik ki): beállítás, időtartam,
  eredmény, játékosonkénti végső pontszám és bontása, percenkénti
  idővonal. Főmenü „Statisztika” képernyő: korábbi meccsek, összesítések
  (győzelmi arány, átlagos hossz, nép és nehézség szerint), JSON export.
  Csak helyben, szerver nincs.
- **Zene:** dinamikusabb — ritmikus réteg, a hangerő és a sűrűség a játék
  intenzitásával nő, változatosabb frázisok és tempó.
- Nem része: épületjavítás, egyedi egységek, multiplayer, online statisztika.
- Keret (10.): az M6 keretei változatlanok.
- **Állapot (2026-10-29):** kész — beragadó egységek javítása, segítség az
  építésben, környezetfüggő kurzor, érintőpad és irányítás-beállítások,
  épülettörlés visszatérítéssel, fejlődési fa, jobb oldali panel (pontszám,
  falusiak), kamera-gombok, játéknapló és statisztika, dinamikusabb zene.
  Mérve — textúra-memória (1280×720-as nézet): 6 különböző nép 245,9 MB, a hat
  legnehezebb nép 243,5 MB, az M4 két népes eset 158,5 MB, a betöltött 6 népes
  mentés csúcsa 250,8 MB (mind azonos az M6-tal); a teljes böngészőablakban
  (1728×963): képkocka-CPU p95 7,1–8,0 ms hanggal (96×96, 4 játékos; ugyanabban
  a terhelt munkamenetben az M6 kódja 7,4–7,9 ms, tehát nincs visszaesés), egy
  128×128-as, 6 játékosos mentés betöltése ~8 s; nézetmérettől függetlenül:
  legfeljebb 329 entitás (6 játékos), bundle 0,73 MB gzip, a fenti mentés
  0,44 MB JSON (`schemaVersion` 2), mentése ~6–15 ms; a hosszú AI-szimulációk
  (`src/ai/strategies`) 25 s alatt futnak le.

### M8 — Egyedi egységek és népbónuszok
A 4.3 első két pontja. Ág: `feat/M8-unique-units`. Változat: 0.3.0.
- **Leváltás, nem bővítés:** minden nép egyedi egysége a nép egyik alap
  egységét váltja le — ugyanabban az épületben, ugyanabban a korban képzik,
  és az a nép az alap egységet nem képezheti. Népenként így 10 egységlap
  marad, a textúra-keret (10.) nem nő. Az AI a hadsereg-keverékben az alap
  egység helyett a nép saját változatát képzi.
- **Egyedi egységek** (új `UnitType`, saját statisztika a `balance.ts`-ben,
  saját kinézet a nép `units/<nép>/` mappájában, legalább egy erős sziluett-jel):

  | Nép | Egység (`UnitType`) | Leváltja | Kor | Szerep |
  |---|---|---|---|---|
  | Magyar | Huszár (`hussar`) | `knight` | 2 | gyorsabb, olcsóbb, könnyebb páncél; portyázó |
  | Angol | Hosszúíjász (`longbowman`) | `crossbowman` | 2 | +2 lőtáv, kicsit lassabb képzés |
  | Német | Landsknecht (`landsknecht`) | `pikeman` | 2 | kétkezes kard, több HP és támadás, lovasság elleni bónusz marad, aranyba kerül |
  | Francia | Királyi muskétás (`mousquetaire`) | `musketeer` | 3 | erősebb lövés, gyorsabb |
  | Spanyol | Konkvisztádor (`conquistador`) | `cavalry` | 3 | morion sisak, nagy páncél |
  | Olasz | Légiós (`legionary`) | `swordsman` | 1 | scutum, nagy védelem nyíl ellen |
  | Orosz | Kozák (`cossack`) | `scout` | 1 | papaha, saska; erősebb, végig hasznos portyázó |
  | Finn | Sissi (`sissi`) | `archer` | 1 | gyorsabb, nagyobb látótáv, kicsit kisebb lőtáv |

  Az egyedi egység az alap egység osztályaiba tartozik (lovas, gyalogos,
  nyíl-egység), így a fejlesztések és a bónuszsebzések rá is hatnak. Új
  képesség (roham, rejtőzés stb.) nincs.
- **Népbónuszok** (állandó, a meglévő fejlesztés-hatásokkal egy úton
  számolva, `src/game/modifiers.ts`):
  magyar — lovas egységek +10 % sebesség; angol — farm +15 % étel;
  német — épületek +15 % HP; francia — istállóban képzett egységek +15 % HP;
  spanyol — aranygyűjtés +25 % (0.9.1-től; előtte +15 %); olasz — építés +15 % gyorsabb;
  orosz — fagyűjtés +15 %; finn — gyalogság +10 % sebesség.
- **UI:** a nép-választó, a fejlődési fa és a képző gombok a nép egyedi
  egységét mutatják; a nép-választó egy sorban a bónuszt is. Minden szöveg
  a `hu.ts`-ben.
- **Mentés:** `schemaVersion` 3, migrációval (a régi mentés egységei
  megmaradnak, akkor is, ha a népük azóta mást képez).
- **Tesztek:** rögzítő tesztek (draw-log hash) az új egységkinézetekre;
  a régi kinézetek rögzítései változatlanok; egy hosszú AI-szimuláció őrzi,
  hogy mind a 8 nép AI-ja képzi a saját egységét és az alapot nem.
- Nem része: egyedi épületek, új egység-képességek, népenként második
  egyedi egység.
- Keret (10.): az M7 keretei változatlanok.
- **Állapot (2026-10-30):** kész — nyolc egyedi egység (a leváltott alap egység
  helyett), nyolc népbónusz, az AI saját egységet képez, nép-választó, fejlődési
  fa és képző gombok az egyedi egységgel, `schemaVersion` 3 migrációval. Mérve —
  textúra-memória (a teljes 1728×963-as böngészőablakban, 1,2-es és 0,5-ös
  nagyítás; népenként a saját lista): 6 különböző nép 248,7 MB, a hat legnehezebb
  nép 246,6 MB, az M4 két népes eset 161,4 MB (M7: 245,9 / 243,5 / 158,5 MB; a
  különbség jórészt a nagyobb nézet terep-gyorsítótára: 25,7–25,9 MB a 23,1 MB
  helyett), az egységlapok száma változatlan (60); képkocka-CPU p95 7,9–8,1 ms
  hanggal (96×96, 4 játékos; M7: 7,1–8,0 ms); bundle 0,74 MB gzip (M7: 0,73 MB).
  Böngésző-smoke: magyar huszár az istállóban, olasz légiós a laktanyában
  képezhető és harcol, a fejlődési fa „egyedi” jelvényt mutat, a v2 (M7) mentés
  hibátlanul betöltődik.

### M9 — Időgyőzelem és köztes terep-felbontás
A 4.8 harmadik pontja és az M6-ban nyitva hagyott terep-memória. Ág:
`feat/M9-time-victory-terrain`. Változat: 0.4.0.
- **Időgyőzelem (4.8 #3):** 60 játékperc (`TIME_VICTORY.limitMs` a
  `balance.ts`-ben) után a legnagyobb pontszámú, még talpon lévő játékos nyer
  (pontszám: M7). Holtversenynél a több elpusztított ellenséges érték
  (`killValue`), majd a kisebb játékos-azonosító dönt. A hódítás és a Csoda
  az időkorlát előtt továbbra is nyerhet; ha ugyanabban a pillanatban több
  feltétel teljesül, a hódítás, majd a Csoda, majd az idő a sorrend.
- **Beállítás:** a győzelmi mód négy értékű: „Hódítás” / „Hódítás vagy
  Csoda” (alapértelmezett, változatlan) / „Hódítás vagy idő” / „Mind”
  (hódítás, Csoda vagy idő). A `VictoryMode` unió bővül; a meglévő értékek
  jelentése nem változik.
- **HUD:** időkorlátos meccsen a felső óra alatt egy üveg sáv mutatja a hátralévő
  időt és az éllovas színét; az utolsó 5 percben kiemelve. A játék vége képernyő
  saját okot („Idő”) és szöveget kap, a játéknapló is „time” okot tárol.
- **AI:** az AI pontszám-adatot csak abból kap, amit a játékos is lát (a
  pontszám-panel nyilvános, M7). Időkorlátos meccsen az utolsó 5 percben
  (`TIME_VICTORY.holdLeadMs`) a pontszámban vezető AI nem indít új támadó
  hullámot (megtartja a seregét, nem veszít pontot); a többi AI változatlan.
- **Mentés:** `schemaVersion` 4, migrációval (a `VictoryMode` enum bővül, a régi
  mentés változatlanul betöltődik).
- **Köztes terep-felbontás:** a terep-darabok (`ChunkStreamer`) a teljes és a fél
  felbontás között egy háromnegyedes (`mid`) szintet is kapnak. A
  `TERRAIN_STREAM.lodZoom` (0,65) és `midZoom` (0,97) közötti nagyításon a nézetben
  lévő darabok a háromnegyedes textúrát kapják a teljes helyett (ugyanaz a
  texel/képpont arány, amit a fél felbontás 0,65-ön már elfogad). A terep sosem
  üres: a cserék sorrendje továbbra is „előbb az új, utána a régi elengedése”.
- **Tesztek:** `VictoryChecker` (időkorlát, holtverseny, sorrend, legyőzött
  játékos kizárva), `chunkWants` (három szint, hiszterézis), `ChunkStreamer`
  (szintváltás lyuk nélkül), v3 → v4 migráció valódi v3 mentéssel, AI-döntés
  (vezető AI nem indít hullámot az utolsó percekben).
- Nem része: választható időkorlát, döntetlen eredmény, csapatok.
- Keret (10.): az M8 keretei; a 0,65–1,0 nagyítási sáv terep-többlete
  (M6: ~13 MB) legalább a felére csökken, mérve ugyanazzal a szkripttel a `main`
  és az ág között.
- **Állapot (2026-11-01):** kész — időgyőzelem (beállítás, HUD-óra, játék vége,
  játéknapló, vezető AI visszafogása), `schemaVersion` 4 migrációval, háromnegyedes
  terep-szint. Mérve (új szkript, Playwright + swiftshader, 128×128 Szigetek,
  6 játékos, a nézet négy pontján a legrosszabb érték; a textúra-kezelő összege,
  ezért a régi M5–M8-as számokkal nem, csak egymással összevethető): a terep a
  0,65–0,9-es sávban 1280×720-on 49,2 → 33,0 MB (a sáv többlete a 1,2-es és 0,5-ös
  nagyításhoz képest ~22 → ~9 MB), 1728×963-on 75,0 → 44,6 MB (~44 → ~14 MB);
  1,0-s nagyításon (a sáv fölött) változatlan. JS-bundle 0,69 MB gzip. A teljes
  tesztcsomag zöld, kivéve 40 rögzítő (art-hash) tesztet, amely a `main`-en is
  ugyanígy bukik Node 22-n (a CI Node 26-on fut).

### M10 — Mentés megosztása és mérőszkriptek
Az 1.3 „Mentett játék megosztása (JSON export/import)” pontja, és a mérések
reprodukálhatósága. Ág: `feat/M10-save-share-perf`. Változat: 0.5.0.
- **Export:** a betöltési lista (főmenü és szünet) minden használható mentése
  mellett egy „Exportálás” gomb: a mentés JSON-fájlként letöltődik
  (`saecula-mentes-<hely>-<dátum>.json`), az aktuális `schemaVersion`-nel
  (régebbi mentés migrálva). Szerver, link-rövidítő nincs: a fájlt a játékos
  maga küldi tovább.
- **Import:** a betöltési lista „Importálás fájlból” gombja egy JSON-fájlt
  olvas be, ugyanazzal az ellenőrzéssel, mint a tárolt mentést (migráció, zod,
  konzisztencia), és azonnal betölti a meccset. Nem ír mentési helyre (a
  játékos utána elmentheti). Legfeljebb `SAVE_SHARE.maxBytes` (16 MB) méretű
  fájlt fogad el. Hibás, túl nagy, újabb verziójú vagy olvashatatlan fájlnál
  magyar hibaüzenet, sosem omlik össze.
- **Mérőszkriptek:** új top-level `scripts/perf/` mappa (Node + Playwright, a
  fejlesztői szerverrel, a `window.__game` hookon át): `texmem.mjs` (textúra-
  memória forgatókönyvenként és nagyításonként, a nézet több pontján a
  legrosszabb érték; a terep külön), `frametime.mjs` (képkocka-CPU átlag / p95 /
  legrosszabb). `npm run perf:texmem` / `npm run perf:frame`; az eredmény JSON a
  `scripts/perf/results/` alá (gitignore). A szkriptek nem részei a buildnek és a
  teszteknek.
- **Tesztek:** az export–import oda-vissza azonossága, a méretkorlát, a sérült és
  újabb verziójú fájl, a fájlnév; a letöltés-segéd közös a statisztika
  exportjával.
- Nem része: online megosztás, mentés URL-ben, felhőmentés (1.2).
- Keret (10.): az M9 keretei változatlanok.
- **Állapot (2026-11-01):** kész — export (soronkénti gomb, a fájl az aktuális
  `schemaVersion`-nel), import (fájlválasztó, 16 MB-os korlát, magyar hibaüzenetek,
  azonnali betöltés), közös letöltés-segéd, `scripts/perf/` (`texmem.mjs`,
  `frametime.mjs`, `npm run perf:texmem` / `perf:frame`). A Playwright nem lett
  függőség: a szkriptek dinamikusan töltik be, hiányában telepítési útmutatót írnak.
  Böngésző-smoke: mentés → export (98 KB-os fájl) → hibás fájl importja magyar
  üzenettel → a jó fájl importja betölti a meccset, konzolhiba nélkül.

### M11 — Vallási egységek
Az 1.3 „Vallási egységek / konverzió” pontja. Ág: `feat/M11-religious-units`
(az M10 ágára épül). Változat: 0.6.0.
- **Szerzetes (`monk`, Szerzetes):** új alap egység minden népnek (a
  `BaseUnitType` bővül; népenként 11 egységlap). 2. kortól, a Kolostorban
  képzik, aranyba kerül, nem harcol (nincs `attacker`), egyik osztályba sem
  tartozik (lovas, gyalogos, nyíl), így fejlesztések és népbónuszok nem hatnak rá.
- **Kolostor (`monastery`, Kolostor):** új épület, 3×3, 2. kortól, csak
  szerzetest képez. Minden nép a saját építészeti stílusának palettájával
  kapja (egy közös, palettavezérelt festő a `architecture/` alatt, a
  `foundryArt` mintájára: templomhajó harangtoronnyal és kerengővel); egy
  család később saját festőt kaphat.
- **Gyógyítás:** a nem mozgó, nem térítő szerzetes automatikusan gyógyítja a
  `MONK.healRange` sugarú körben a legsérültebb saját egységet
  (`MONK.healPerSec`). Épületet nem gyógyít.
- **Térítés:** a kijelölt szerzetes jobb klikkje (vagy parancs-gesztusa) egy
  ellenséges egységre térítést indít: a szerzetes `MONK.convertRange`
  távolságra megy, majd `MONK.convertTimeMs` ideig térít; ha a cél kilép a
  távolságból, a szerzetes követi. Siker esetén az egység a szerzetes
  tulajdonosáé lesz (parancsai törlődnek, a népe szerinti kinézete marad), a
  szerzetes pedig `MONK.rechargeMs` ideig nem téríthet újra. Szerzetest és
  épületet nem lehet téríteni. A térítés pontszámban úgy számít, mint egy
  elpusztított egység (a térítőnek `killValue`, az áldozatnak elveszett egység).
- **UI:** térítés-kurzor, a szerzetes térítés és gyógyítás közben „munka”
  animációt játszik, a kijelölés-panel a szerzetes szerepét mutatja; a
  fejlődési fa a Kolostort és a Szerzetest automatikusan mutatja. Hang:
  egy procedurális térítés-hang. Minden szöveg a `hu.ts`-ben.
- **AI (Közepestől):** a 2. korban Kolostort épít és néhány
  (`armyByAge`-nél külön, kis számú) szerzetest képez; a szerzetesek a
  sereggel mozognak, gyógyítanak, és a közelükbe érő ellenséges egységet
  térítik. A könnyű AI nem képez szerzetest.
- **Mentés:** `schemaVersion` 5, migrációval; új komponensek: `convertIntent`,
  `converter` (feltöltődés), `originCiv` (a térített egység eredeti népe a
  kinézethez).
- **Tesztek:** gyógyítás, térítés (távolság, követés, megszakadás, feltöltődés,
  tiltott célok, tulajdonosváltás, pontszám), AI-szimuláció (a Közepes AI képez
  szerzetest és térít), mentés oda-vissza az új komponensekkel, v4 → v5 migráció
  valódi v4 mentéssel, minden nép és kor kolostora és szerzetese megfesthető,
  determinisztikus és nincs takart ablakfénye. A régi népek rögzítő hash-ei
  változatlanok; az új grafikához hash-rögzítés nem készül, mert a hash a
  Node-verziótól függ (a CI Node 26-on fut, a felhős munkamenet Node 22-n).
- Nem része: épület-térítés, szerzetes-fejlesztések (kutatás), ereklyék,
  templom, vallási győzelem, népenkénti szerzetes-kinézet.
- Keret (10.): az M9 keretei; a népenkénti 11. egységlap a textúra-memóriát a
  `scripts/perf/texmem.mjs` mérése szerint legfeljebb néhány MB-tal növeli.
- **Állapot (2026-11-01):** kész — szerzetes és kolostor mind a 8 népnek (közös,
  palettavezérelt kolostor-festő, csuklyás szerzetes pásztorbottal), gyógyítás,
  térítés (parancs, kurzor, értesítés, harangszó, pontszám), AI `MonkPlay`
  (Közepestől; a kolostor a kor katonai épületei után, a szerzetes csak az
  ágyú-takarékosság fölötti aranyból), `schemaVersion` 5 migrációval. Mérve
  (`scripts/perf/texmem.mjs`, distinct6, 1280×720, az M10 ágához képest): a nem
  terep-textúrák +1,0 MB (117,6 → 118,6 MB), csúcs 143,6 MB (M10: 142,0 MB; a terep
  ugyanazzal a szkripttel ±3 MB-ot ingadozik). A vegyes népes három-kori
  szimuláció emberi helye a Közepes 2-es magra került (a söprés a teszt
  megjegyzésében). Böngésző-smoke: a betöltött mentésben a szerzetes gyógyít
  (11 → 31 HP) és áttérít egy francia lovagot, konzolhiba nélkül.

### M12 — Bővített fejlődési fa
Az 1.3 „Tech fa (kutatási fejlesztések)” pontja. Ág: `feat/M12-tech-tree` (az M11
ágára épül). Változat: 0.7.0.
- **Tíz új technológia** (a `TECH_BALANCE`-ben, a meglévő `TechEffect` úton;
  egyedi épület vagy egység nincs):

  | Technológia (`TechId`) | Magyar név | Épület | Kor | Előfeltétel | Hatás |
  |---|---|---|---|---|---|
  | `wheelbarrow` | Talicska | városháza | 2 | — | falusiak +10 % sebesség |
  | `treadmill_crane` | Taposókerekes daru | városháza | 2 | — | építés +20 % gyorsabb |
  | `husbandry` | Lótenyésztés | istálló | 2 | — | lovasság +10 % sebesség |
  | `cavalry_armor` | Lovas vértezet | istálló | 3 | `cavalry_training` | lovasság +15 % életerő |
  | `forced_march` | Erőltetett menet | laktanya | 3 | `infantry_march` | gyalogság +10 % sebesség |
  | `conscription` | Sorozás | laktanya | 3 | — | laktanya, lőtér, istálló +25 % gyorsabb képzés |
  | `chemistry` | Kémia | kovácsműhely | 3 | — | lőfegyveres egységek (muskétás, ágyú és egyedi változataik) +1 távolsági támadás |
  | `sanctity` | Szentség | kolostor | 2 | — | szerzetesek +50 % életerő |
  | `fervor` | Buzgóság | kolostor | 2 | — | szerzetesek +15 % sebesség |
  | `illumination` | Megvilágosodás | kolostor | 3 | — | a térítés utáni feltöltődés fele annyi ideig tart |

- **Új hatás-fajták** (`src/game/modifiers.ts`): `villagerSpeed`, `monkSpeed`,
  `monkHp`, `gunpowderAttack`, `trainSpeed`, `convertRecharge`; a többi a meglévő
  (`buildSpeed`, `cavalrySpeed`, `cavalryHp`, `infantrySpeed`). Az életerő-bónusz a
  meglévő egységekre a kutatáskor egyszer, az újakra képzéskor hat (mint eddig).
- **UI:** a képző épületek kutatás-gombjai és a fejlődési fa az új
  technológiákat automatikusan mutatják; a kolostor is kutatóhely lesz. Minden
  szöveg a `hu.ts`-ben.
- **AI:** a Közepes, Nehéz és Mesteri AI kutatási sorrendje a végén kibővül az új
  technológiákkal (a szerzetes-fejlesztések csak kolostorral).
- **Mentés:** `schemaVersion` 6, migrációval (a `TechId` enum bővül).
- **Tesztek:** minden új hatás (módosító-függvények), a kutatáskori életerő-skálázás,
  a gyorsabb képzés és feltöltődés, mentés oda-vissza, v5 → v6 migráció valódi v5
  mentéssel, az AI-szimulációk.
- Nem része: új épület, új egység, egyedi (népenkénti) technológia, tech-fa
  szerkesztő.
- Keret (10.): az M11 keretei változatlanok (nincs új textúra).
- **Állapot (2026-11-01):** kész — tíz új technológia hat új hatás-fajtával, a
  kolostor kutatóhely, a fejlődési fa és a parancspanelek mutatják őket,
  `schemaVersion` 6 migrációval. Az AI a régi kutatási sorrendjét és
  tartalékát változatlanul tartja; az új technológiákat külön listából
  (`extraTechPriority`), csak a sereg ágyú-takarékossága fölötti aranyból
  kutatja. A vegyes népes három-kori szimuláció emberi helye a Közepes 5-ös
  magra került (a söprés a teszt megjegyzésében). Böngésző-smoke: a fejlődési fa
  és a kolostor kutatás-gombjai az új technológiákkal, konzolhiba nélkül.

### M13 — Kampány (három küldetés)
Az 1.3 „Kampány mód” pontja; az 1.2 nem-célja ennyiben módosul. Ág:
`feat/M13-campaign` (az M12 ágára épül). Változat: 0.8.0. A scope-ot a
tulajdonos 2026-11-01-én jóváhagyta (a teljesített küldetés újrajátszható).
- **Mit jelent itt a kampány:** a skirmish motorján futó, előre beállított
  küldetések (rögzített térképsablon, méret, mag, népek, AI-nehézség, győzelmi
  mód, kezdő nyersanyag és kor), mindegyik **célokkal** (pl. „Lépj a
  középkorba”, „Építs kolostort”, „Tarts ki 20 percig”), magyar
  **eligazítással** a küldetés előtt és **zárószöveggel** utána. Új térkép-
  vagy egységtípus, szkriptelt átvezető, párbeszéd-rendszer nincs.
- **Három küldetés**, sorban feloldva:
  1. *Az első kolostor* — magyar, kicsi Mezőség, 1 Könnyű AI. Célok: lépj a
     középkorba; építs kolostort; képezz 2 szerzetest.
  2. *A határ őrei* — angol, közepes Erődítmény, 2 Közepes AI. Célok: tarts ki
     20 percig (a városháza álljon); építs 4 őrtornyot.
  3. *Csodák kora* — olasz, közepes Szigetek, 2 Nehéz AI, a felvilágosodásból
     indulva. Cél: nyerd meg a meccset (hódítás vagy Csoda).
  A győzelem: minden elsődleges cél teljesült; a vereség: a városháza(k)
  elvesztése (és a 2. küldetésben a 20 perc előtti bukás).
- **Felépítés:** új top-level mappa `src/campaign/` (küldetés-definíciók,
  tiszta cél-kiértékelők, előrehaladás-tároló), a `GameSetupConfig` opcionális
  `mission` mezővel; a `VictoryChecker` új oka: `mission`. A célok állapota a
  mentésbe kerül (`schemaVersion` 7, migrációval).
- **UI:** főmenü „Kampány” gomb → küldetéslista (zárt / elérhető / teljesített)
  → eligazítás → játék; a HUD-on célpanel (pipálva); a játék vége képernyő a
  küldetés zárószövegét mutatja. Az előrehaladás `localStorage`-ban
  (`isorts.campaign.v1`), sérült adatnál alapállapot.
- **Tesztek:** a cél-kiértékelők, az előrehaladás-tároló, a küldetések
  beállításai (érvényes `GameSetupConfig`, játszható térkép), mentés
  oda-vissza küldetéssel, v6 → v7 migráció, és küldetésenként egy fej nélküli
  szimuláció, hogy a célok elérhetők (AI vezérelte emberi hellyel).
- Nem része: küldetés-szerkesztő, egyedi térképek, szkriptelt események,
  szinkronhang, nehézségi szint választása küldetésenként.
- Keret (10.): az M12 keretei változatlanok.
- **Állapot (2026-11-01):** kész — `src/campaign/` (három küldetés, tiszta
  cél-kiértékelők, rögzülő `ObjectiveTracker`, `localStorage`-előrehaladás),
  főmenü „Kampány” → küldetéslista → eligazítás → játék, HUD-célpanel
  értesítéssel, `mission` győzelmi ok, zárószöveg a játék vége képernyőn,
  `schemaVersion` 7 migrációval. A küldetés hódítással is megnyerhető (az is
  győzelem). Az új küldetés kezdőállapota (kor, korváltó technológiák, többlet-
  nyersanyag) a UI store-ba is átkerül, mert az ember nyersanyaga játék közben ott
  él. Szimulációk: mind a három küldetés magja játszható térképet ad; az 1.
  küldetés céljait egy Közepes AI 30 percen belül teljesíti; a 2. küldetésben egy
  Nehéz AI kitart 20 percig két Közepes ellen (a tornyokat a teszt helyezi el,
  mert az AI nem épít tornyot); a 3. küldetésben mindenki a felvilágosodásban
  indul. A 3. küldetés megnyerhetőségét szimuláció nem ellenőrzi. Böngésző-smoke:
  kampánylista (teljesített / elérhető / zárolt), eligazítás, indítás, célpanel,
  konzolhiba nélkül.

### M14 — Tengeri egységek és vízi térképek
Az 1.3 „Tengeri egységek és vízi térképek” pontja. Ág: `feat/M14-naval` (a
`main`-ből, a 0.8.1 után). Változat: 0.9.0. A scope-ot a tulajdonos
2026-11-01-én jóváhagyta (szállítóhajó is legyen; a hajók: halászhajó,
gálya, fregatt).
- **Vízi mozgás:** a hajók csak vízen járnak (`TERRAIN.water`), a szárazföldi
  egységek csak szárazon. Az útkeresés réteget kap (`land` / `water`): a
  `findPath` és társai a mozgás rétegének járhatóságát használják, a közös
  útkeresési keret (10.) mindkettőre vonatkozik. Épület vízre nem kerül.
- **Kikötő (`dock`, Kikötő):** új épület, 3×3, 1. kortól; szárazföldön áll,
  legalább egy oldala vízzel határos. Hajókat képez, a halászhajó ide viszi a
  halat. Minden nép a saját stílusának palettájával kapja (egy közös,
  palettavezérelt festő, a kolostor mintájára).
- **Hal (`fish`):** új nyersanyag-lelőhely vízi mezőn (étel); a térképgenerátor
  a víz széléhez és nyílt vízre helyezi.
- **Hajók** (új `BaseUnitType`-ok, statisztika a `balance.ts`-ben, új osztály:
  `naval`; minden népnek azonosak, a nép a hajótest és a díszítés színét adja,
  a vitorla csapatszínű):

  | Hajó (`UnitType`) | Magyar név | Kor | Szerep |
  |---|---|---|---|
  | `fishing_boat` | Halászhajó | 1 | halból ételt gyűjt, a kikötőbe viszi |
  | `transport` | Szállítóhajó | 1 | legfeljebb 5 szárazföldi egységet visz; nem harcol |
  | `galley` | Gálya | 1 | távolsági (nyíl), hajó és part menti egység ellen |
  | `frigate` | Fregatt | 3 | ágyús, épület- és hajórombolás, lassú |

- **Szállítás:** a kijelölt szárazföldi egységek jobb klikkje (vagy
  parancs-gesztusa) egy saját szállítóhajóra beszállást indít: az egységek a
  hajóhoz legközelebbi parti mezőre mennek, ott eltűnnek a hajóban (`cargo`
  komponens a hajón; a rakomány nem látszik, nem harcol, nem gyógyul). A
  kijelölt szállítóhajó jobb klikkje egy parti mezőre kiszállítást indít: a hajó
  a parthoz megy, a rakomány a legközelebbi szabad szárazföldi mezőkre lép. A
  kijelölés-panel mutatja a rakományt és egy „Kirakodás” gombot. Elsüllyedt
  hajóval a rakomány is elvész (pontszámban elvesztett egységek). A népesség a
  rakományt is számolja.
- **Harc:** a hajók egymást és a partközeli szárazföldi egységeket,
  épületeket a lőtávjukon belül támadják; a szárazföldi távolsági egységek és a
  tornyok a hajókat. Közelharci egység hajót nem támadhat. A szerzetes hajót nem
  téríthet.
- **Térképek:** két új sablon: „Beltenger” (közepes, középen nagy tó, körbe
  szárazon is járható) és „Szigetvilág” (minden játékos saját szigeten, a
  szigetek között csak víz: szállítás nélkül nem lehet szárazföldön támadni). A
  meglévő „Szigetek” (szirtek és hidak) változatlan.
- **AI (Közepestől):** ha a bázisa közelében elég víz van, kikötőt épít,
  halászhajókat képez, a korához illő hajóhadat tart (gálya, a 3. kortól
  fregatt), a látott ellenséges hajókat és a part menti célokat támadja.
  „Szigetvilágon” szállítóhajóval partra teszi a támadó hullámot (berakodás a
  saját parton, kirakodás az ellenfél szigetének legközelebbi szabad partján).
  A könnyű AI csak halászik.
- **UI:** hajó-kurzorok (beszállás, kirakodás, halászat), a fejlődési fa a
  kikötőt és a hajókat automatikusan mutatja, a minimap a hajókat. Hang:
  procedurális vitorla-, evező- és ágyúhang. Minden szöveg a `hu.ts`-ben.
- **Mentés:** `schemaVersion` 9, migrációval; új komponens: `cargo` (a hajóban
  lévő egységek teljes állapota).
- **Tesztek:** rétegzett útkeresés (hajó nem megy szárazra, egység nem megy
  vízre), kikötő-elhelyezés, halászat, beszállás / kirakodás / elsüllyedés,
  hajóharc (ki kit támadhat), népesség a rakománnyal, mentés oda-vissza
  rakománnyal, v8 → v9 migráció valódi v8 mentéssel, a két új sablon játszható
  (minden játékosnak van kikötőhelye és hala), AI-szimuláció: a Közepes AI
  „Szigetvilágon” partra szállít és megtámadja az ellenfelet; „Beltengeren”
  halászik és hajóhadat épít.
- Nem része: kereskedelmi hajó, tűzhajó, sekély gázló, vízi fal, tengeri
  technológiák, népenkénti hajókinézet, hajó-formáció.
- Keret (10.): az M13 keretei; a négy hajó népenként négy új egységlapot jelent,
  ezt a `scripts/perf/texmem.mjs`-szel mérjük (6 különböző nép), a ≤ 256 MB
  textúra-keret köt; ha nem fér bele, a hajólapok koronként vagy csak vízi
  térképen készülnek.
- **Állapot (2026-11-01):** kész — vízi réteg (`map/navGrid`, `ecs/navLayer`), négy
  hajó és a kikötő (népenkénti hajótest-paletta, közös, palettavezérelt
  kikötő-festő), halrajok (`TERRAIN.fish`), halászat, tengeri harc, szállítás
  (`TransportSystem`: beszállás, kirakodás, elsüllyedés, népesség), kurzorok,
  „Kirakodás” gomb, hajóhangok, Beltenger és Szigetvilág sablon (kikötőhely és
  hal minden kezdőhelynek, a validálás ellenőrzi), AI `NavalPlay` és
  `LandingControl` (Közepestől; a Könnyű csak halászik), `schemaVersion` 9
  migrációval. Az AI népek hajólapjai igény szerint készülnek. Mérve
  (`scripts/perf/texmem.mjs`, distinct6, 1280×720, ugyanazzal a szkripttel a
  `main`-en és az ágon): csúcs 148,2 → 150,0 MB, a nem terep-textúrák +5,3 MB.
  Szimulációk: Beltengeren a Közepes AI kikötőt épít, halászik és gályákat tart;
  Szigetvilágon ~21 perc alatt partra száll a másik szigeten. Böngésző-smoke:
  kikötő az építési menüben, hajóképzés, halászat, beszállás, átkelés és
  kirakodás, konzolhiba nélkül.

### 0.9.1 — Egyensúly-ellenőrzés (javító kiadás)
Ág: `fix/0.9.1-balance` (a `main`-ből, a 0.9.0 után). Változat: 0.9.1. A régi
`feat/M9-playtest` ág (v0.3.0-ra épült, sosem került a `main`-be) mérőeszközeinek
átvétele a mai kódra, és az egyensúly újramérése az M11–M14 után.
- **Mérőeszközök:** (1) egyenlő költségű párviadal (`src/ai/testing/unitDuel.ts`,
  1500 nyersanyag oldalanként, népbónusz és fejlesztés nélkül, CI-ben fut):
  (a) minden egyedi egység a leváltott alap egység közelében marad
  (|eredmény| ≤ a keret fele), (b) és kikap az alap egység minden szárazföldi
  ellenegységétől (falusi, ágyú, szerzetes és hajó nélkül); (2) körmérkőzés-
  szimuláció (`src/ai/strategies/civBalance.sim.test.ts`), csak `BALANCE=1`
  mellett: 64×64-es rét, 1v1, minden rendezett népár magonként; népenkénti
  győzelmi arányt ír ki.
- **Cél:** Nehéz szinten minden nép 40–60 % (magok 3, 7, 11, 19; népenként
  56 meccs), Mesteri szinten 35–65 % (magok 3, 7; népenként 28 meccs), egy meccs
  tűréssel: `[alsó × meccs − 1, felső × meccs + 1]`.
- **Hangolás:** csak a `balance.ts` számai, és csak annyi, amennyit a mérés
  megkövetel; kiindulópont a régi ág értékei (kozák, légiós, landsknecht,
  spanyol aranygyűjtés). A változott számokat idéző szövegek (M8) is frissülnek.
- **Böngészős bemenet-smoke:** `npm run smoke:input` (`scripts/smoke/`) — fej
  nélküli Chrome-ban, valódi (CDP) egéreseményekkel ellenőrzi a húzással
  kijelölést, a jobb klikkes parancsot, a kattintásos kijelölést, a Ctrl+klikkes
  parancsot és a kijelölés törlését. Futó fejlesztői szervert kér (alapból az
  5196-os port), a CI-ben nem fut. Új függőség nincs (Node beépített
  `WebSocket`/`fetch`; a `scripts/perf/` Playwrightját nem használja).
- Nem része: új egység vagy képesség, a hosszúíjász hangolása, a mentési séma
  változása (`schemaVersion` 9 marad), a régi ág köztes terep-szintje (a `main`
  M9-e már tartalmazza), új AI-viselkedés.
- Keret (10.): az M14 keretei változatlanok.
- **Állapot (2026-11-08):** kész — párviadal-teszt, körmérkőzés-szimuláció,
  bemenet-smoke (`npm run smoke:input` 5/5 PASS a mai felületen), mentési teszt a
  mai maximum fölötti életerővel mentett egységre. A párviadal népbónusz nélkül
  fut, és mindkét oldalról számol (`fairDuel`: a két sorrend átlaga, mert az aréna
  kezdőállása nem szimmetrikus). Kiinduló mérés (0.9.0): a kozák veri a
  kardforgatót (+90, a felderítő −528), a landsknecht–lándzsás +698 (a keret fele
  750, belefér); Nehéz szinten orosz 42/56 (75 %), spanyol
  20/56 (36 %), magyar 33/56, a többi 25–28/56; Mesteri szinten 10–15,5/28 (mind
  sávon belül). Hangolás: kozák életerő 60 → 50, támadás 6 → 5; spanyol aranygyűjtés +15 % → **+25 %** (csak a kozákkal a
  spanyol 21/56 marad, sávon kívül). A régi ág légiós-vágása (45 → 40) nem kell:
  a Nehéz eredményt nem mozdítja, a légiós a párviadal-szabályokon belül van. A régi
  ág landsknecht-vágása (70 → 68) sem kell: egyetlen meccset sem változtat, és a
  70 életerős landsknecht a kétoldali párviadalban belefér.
  Végeredmény — Nehéz: magyar 34/56 (61 %, egy meccs tűrésen belül), angol 24,5,
  német 25,5, francia 25,5, spanyol 26, olasz 30, orosz 32, finn 26,5; Mesteri:
  magyar 10,5/28, angol 14,5, német 15,5, francia 15,5, spanyol 15, olasz 10,5,
  orosz 15, finn 15,5. Párviadal: kozák–kardforgató −575, kozák–felderítő +152,
  landsknecht–lándzsás +698. A körmérkőzés kb. 8–9 (Nehéz) és 6 (Mesteri) perc. A szerzetes-szimuláció
  (`monks.sim.test.ts`) népe rögzített (magyar): a 3-as mag kevert sorsolása spanyol
  AI-t adott, amelynek két szerzetese a +25 % arannyal 40 perc fölé csúszott.

### 0.9.2 — Apró javítások
Ág: `fix/0.9.2-small-fixes` (a `main`-ből, a 0.9.1 után). Változat: 0.9.2.
- **Szigetvilág-generálás:** a 64×64-es, 6 játékosos „Szigetvilág” a 273-as
  magon `MapGenerationError`-t dob (800 magból 1). Javítás után minden kezdőhely
  a saját szigetén áll, a szigetek továbbra sem érnek össze; a több magos
  generátorteszt ezt a magot is lefedi.
- **Szállítóhajó-leírás:** a `hu.unitRoles.transport` szövegében a befogadóképesség
  (5) nem beírt szám, hanem a `NAVAL` konstansból származik.
- **Közepes AI szerzetesei:** a 3-as magon a spanyol, a német és a francia
  Közepes AI nem képez két szerzetest 40 percen belül (a sereg előbb elkölti az
  aranyat). A gyökérok megkeresése, minimális AI-változtatás (hangolás az AI
  konfigurációjában), és a `monks.sim.test.ts` ismét több népet fed le (legalább
  magyar, spanyol, német, francia).
- **Vízi körmérkőzés:** a `civBalance.sim.test.ts` kap egy kérésre futó vízi
  mérést (`BALANCE=water`: Beltenger, Nehéz, kevesebb mag, kb. 11 perc), amely
  népenkénti győzelmi arányt ír ki. A `balance.ts` nem változik; ha egy nép
  messze a 35–65 % sávon kívül esik, azt jelentjük, a tulajdonos dönt.
- Nem része: új funkció, a rajzrögzítő tesztek Linux-javítása, a mentési séma
  változása (`schemaVersion` 9 marad).
- Keret (10.): az M14 keretei változatlanok.
- **Állapot (2026-11-08):** kész. Szigetvilág: a 64×64-es, 6 játékosos térkép
  első próbálkozásra 800 magból 304 helyett 4-szer érvénytelen, és egyik mag sem
  fogy ki az újrapróbálkozásokból (előtte 273, 451, 573, 775). Okok: a kezdő
  aranyér véletlen próbái egy kis sziget rossz oldalára mutattak (most, ha mind
  elhibázza, a teljes gyűrűt végigpásztázza, véletlen húzás nélkül), a parthoz
  simuló aranyér egyik mezőjét víz zárta körül (a Szigetvilágon a kezdő aranyér
  nem érinti a vizet), az erdős kis szigeten nem jutott hely a külső aranyérnek
  (a sziget peremének fái kivágódnak, és újra próbálja), és a kikötőhely-készítő
  csak a 3×3-as hely sarkát tartotta távol a városházától (most az egészet).
  **Ugyanaz a mag más térképet ad, mint a 0.9.1-ben** a 64×64-es, 6 játékosos
  Szigetvilágon és néhány 64×64-es, 6 játékosos Beltengeren (a part menti
  aranyér-szabály, a külső aranyér újrapróbálása és az egész 3×3-as kikötőhely
  szabálya miatt), ritkán egy 64×64-es, 6 játékosos Véletlen térképen is (a
  gyűrű-pásztázás miatt; az 1–100-as magok között egy sem). Minden más sablon, és
  minden sablon 64×64/2, 64×64/3, 96×96/4, 96×96/6 és 128×128/6 térképe bitre
  azonos (mérve: az 1–100. mag, 128×128-on az 1–40. mag terep-hash-e a 0.9.1 és az ág
  kódjával). A mentéseket
  nem érinti: a mentés a terepet tárolja. Szállítóhajó-szöveg a
  `NAVAL.transportCapacity`-ből. Szerzetes: a gyökérok, hogy a szerzetes csak az
  ágyú-takarékosság fölötti aranyból és a sereg *után* képezhetett, a muskétások
  pedig minden többletet elköltöttek; a 64×64-es rét aranya 32 perc körül elfogy.
  `AI_MEDIUM.monks.beforeArmy` (igaz): a szerzetes a sereg előtt képződik,
  továbbra is csak a takarékosság fölötti aranyból; a Nehéz és a Mesteri
  változatlan (`beforeArmy: false`), így a 0.9.1-es körmérkőzés érvényes. A 3, 5
  és 11-es magon mind a 8 nép két szerzetese 19–25 perc alatt kész; a
  `monks.sim.test.ts` a magyar, spanyol, német és francia népet futtatja. A
  `threeAges.sim.test.ts` emberi helyének Közepes RNG-je 12 → 7 (a söprés a teszt
  megjegyzésében). A kódáttekintő megfigyelése: ugyanebben a söprésben a Közepes
  emberi hely ágyút képző aránya 5/10-ről 3/10-re esett a szerzetes-előrehozás
  után (kis minta).
  Vízi körmérkőzés (`BALANCE=water`: Nehéz, 96×96 Beltenger, magok 3 és 7,
  népenként 28 meccs, kb. 11 perc) és ellenőrző mérés ugyanígy 96×96-os réten
  (kb. 10 perc; nem a tárolóban, egyszeri futás):

  | Nép | Beltenger 96×96 | Rét 96×96 |
  |---|---|---|
  | magyar | 11/28 (39 %) | 18/28 (64 %) |
  | angol | 16 (57 %) | 12,5 (45 %) |
  | német | 18 (64 %) | 14,5 (52 %) |
  | francia | 16 (57 %) | 14,5 (52 %) |
  | spanyol | 14 (50 %) | 13,5 (48 %) |
  | olasz | **2 (7 %)** | 15 (54 %) |
  | orosz | **19 (68 %)** | 9,5 (34 %) |
  | finn | 16 (57 %) | 14,5 (52 %) |

  Döntetlen: 6, illetve 5. Az olasz a 96×96-os réten sávon belül van, tehát nem
  a térképméret és valószínűleg nem a statisztikái okozzák a Beltengeren mért
  2/28-at: a gyanú az AI vízi térképes játéka (hajók, nyitás). A réten erős a
  helyhatás (az olasz AI-helyről 13/14, emberi helyről 2/14), a Beltengeren
  mindkét helyről kikap. Az orosz 68 % / 34 % kilengése két maggal térkép- és
  mintazaj. A `balance.ts` nem változott.
  **Az olasz 2/28 kivizsgálása (2026-11-09):** zaj, korrelált mintákkal, nem olasz
  hiba. Egy nép egy magon és helyen szinte ugyanazt a meccset játssza mind a hét
  ellenfele ellen, így a 28 meccs csak kb. 4 független minta. Négy új magon
  (11, 19, 23, 29; népenként 56 meccs) az olasz 21/56 (38 %), és az angol lóg ki
  (42,5/56, 76 %). Páros mérés (olasz és francia ugyanabban a helyzetben, német és
  spanyol ellenféllel, 31–70. mag, mindkét hely, népenként 160 meccs): olasz
  81,5/160 (51 %), francia 73/160 (46 %). A valódi ok a Nehéz AI vízi nyitása: a
  két nyitó portya mindkét gazdaságot letarolja, és az nyer, akinek addigra van
  kikötője. A kikötő 10 falusit vár (`navy.minVillagers`), a portya előtti
  visszatartás (`holdsVillagers`) viszont 9-nél megállítja a falusi-képzést; az
  olasz +15 % építés csak az időzítést tolja el ezen a késélen. A nyitás az M15-be
  kerül.

**Becsült munkaóra szólóban, parttime (heti ~10-15h):**
- M0-M1: 4-6 hét
- M2: 3-4 hét
- M3: 3-4 hét
- M4-M5: 6-10 hét
- M6: 4-6 hét

**Teljes MVP (M0-M3): kb. 2-3 hónap.** Ez optimista becslés.

---

## 10. Performance budget

Browser RTS nehéz. Tartsuk be:

- **Max entitás szám** egyszerre: 500 (tesztelve: ~200 már kényelmes,
  300 felett érdemes profilozni)
- **Rajzolt csempe** egyszerre: csak a kamera által látható (viewport
  culling kötelező)
- **Pathfinding hívás** max: 5 / frame (queue-ba tesszük a többit)
- **Frame rate cél:** 60 FPS közép térképen (96×96), 4 játékossal
- **Bundle size cél:** < 2 MB gzip (Phaser 3 maga ~1 MB)

Profilozáshoz Chrome DevTools Performance tab. Phaser Debug Plugin
fejlesztési módban.

---

## 11. Tesztelés

### 11.1 Unit tesztek (Vitest)

Kötelező tesztek:
- `src/iso/coordinates.ts` — oda-vissza konverzió helyes
- `src/map/pathfinding.ts` — ismert bemeneteken ismert kimenet
- `src/save/serializer.ts` + `deserializer.ts` — round-trip azonosság
- `src/save/migrations/` — minden migráció tesztelve
- Balance / stat függvények (damage formula, stb.)

### 11.2 Integrációs tesztek

MVP-ben elegendő a manuális "smoke test": új játék → villager épít
házat → egység képződik → megtámad másikat → meghal. Ha ez OK, a fő
hurok él. A 0.9.1-től a bemenet (kijelölés, parancs) gépi smoke-ja:
`npm run smoke:input` (futó fejlesztői szerver mellett, `scripts/smoke/`).

### 11.3 Playtesting

M1 után heti egy 30 perces playtest session saját magaddal. Jegyzeteld,
mi idegesítő / érthetetlen.

---

## 12. Működési megállapodások Claude Code-dal

### 12.1 Amikor új feature-t implementál Claude Code

- **Minden új feature branch-ben.** `feat/<feature-name>`.
- **Megnyitás előtt tisztázni a scope-ot.** Ha kétséges, kérdezzen.
- **Tesztet ír azokhoz a modulokhoz, amelyek a 11.1-ben szerepelnek.**
- **A kód illeszkedjen a projekt struktúrához.** Ne hozzon létre új
  top-level mappát CLAUDE.md update nélkül.
- **NEM ír hardcode-olt magyar szöveget.** Minden UI szöveg `i18n/hu.ts`-be.

### 12.2 Amikor refactorál

- Megjeleníti a változás indokát PR leírásban.
- Futtatja a teljes teszt suite-ot.
- Ha az API-t töri, frissíti a többi hívót ugyanabban a PR-ban.

### 12.3 Amikor bug-ot javít

- Először írjon egy failing tesztet, aminél reprodukálódik a bug.
- Aztán javítsa. A teszt legyen passing.
- Commit message: `fix: <concise description>`

### 12.4 Amikor nem biztos valamiben

**Kérdezzen, ne döntsön egyedül.** Ez különösen fontos:
- Ha egy feature scope-ja nincs itt tisztázva.
- Ha egy 3rd party libet akar behúzni, ami nincs a tech stackben.
- Ha az architektúrától eltérne.
- Ha performance vs. olvashatóság tradeoff-ot kell kiszámolni.

### 12.5 Amit Claude Code NE csináljon

- Ne terjessze ki a scope-ot (pl. "amíg itt vagyok, hozzáadom a
  multiplayert is").
- Ne cseréljen le 3rd party libet anélkül, hogy egyeztetne.
- Ne írjon ki hardcode-olt konstansokat, ami a `config/balance.ts`-be
  való.
- Ne hagyja ki a tesztet azzal az indokkal, hogy "ez egyszerű".
- Ne commit-oljon 500 soros fájlokat egyetlen funkciónak — bontsa fel.

---

## 13. Verziókövetés ennek a dokumentumnak

Ez a CLAUDE.md **élő dokumentum**. Ha a scope változik, FIRST update
CLAUDE.md, THEN írj kódot. Minden változás git-ben kommitolva, clear
üzenettel.

Következő frissítés várhatóan: M0 befejezése után (retro + scope
verification).

---

*Utolsó frissítés: 2026-11-08. Zoli projekt — Saecula, v0.9.2.*
