# CLAUDE.md — Izometrikus történelmi stratégiai játék

> Ez a dokumentum Claude Code számára készült útmutató. A projekt minden
> technikai és tartalmi döntésének itt van a forrása. Ha ellentmondás van
> ezen dokumentum és egy ad-hoc kérés között, **kérdezz rá**, ne döntsd el
> magad. A scope szigorú — ha egy feature nincs itt leírva, nincs benne.

**Munkacím:** `IsoRTS` (a végleges név később eldől)
**Verzió:** 0.1 — kezdeti scope dokumentum
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
- **Kampány / küldetések / sztori.** Csak skirmish (szabad játék).
- **Haladó hadviselés.** Nincs formáció, nincs morale rendszer, nincs
  terep-alapú harci bónusz (kezdetben).
- **Moddolhatóság / custom content.** A játékos nem tölt be külső
  erőforrásokat.
- **Online mentés, cloud save.** Csak IndexedDB helyben.

### 1.3 Nem-cél, de jövőbeli bővítés opciók

Ha a MVP stabil, ezek kerülhetnek be később (külön feature branch-ben):
- Kampány mód
- Tech fa (kutatási fejlesztések)
- Vallási egységek / konverzió
- Tengeri egységek és vízi térképek
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
  - Remote repo: https://github.com/ZoliQua/Strategy-Game

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

A MVP-ben ezek nincsenek, minden nép statisztikailag azonos.

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

Felvilágosodás:
- `musketeer` — Muskétás. Távolsági, új erősségi osztály.
- `cannon` — Ágyú. Épület-romboló, lassú.
- `cavalry` — Lovasság. Gyors mozgó közelharci.

**Egyedi (nép-specifikus) egységek:** MVP-ben nincsenek. Későbbi fázis.

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
- `foundry` — Ágyúöntöde. `cannon` képzése. (3×3, 3. kortól)
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
IsoRTS/
├── CLAUDE.md                    ← ez a fájl
├── README.md
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
│       ├── stats/                   ← pontszám, meccs-statisztika, játéknapló (IndexedDB)
    ├── audio/
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
    ├── save/
    │   ├── schema.ts            ← TS típusok a save-hez
    │   ├── serializer.ts        ← ECS → JSON
    │   ├── deserializer.ts      ← JSON → ECS
    │   ├── storage.ts           ← localforage wrapper
    │   └── migrations/          ← verzió-migrációk
    ├── audio/
    │   ├── AudioManager.ts      ← hangkezelő: zene, SFX, hangerő-csatornák, pozicionális hang
    │   ├── sfx/                 ← procedurális hangeffektek (szintézis, katalógus, hangkorlát)
    │   └── music/               ← generatív, koronkénti zene (zeneszerző, sorrendező, rendező)
    ├── i18n/
    │   └── hu.ts                ← magyar szövegek
    └── types/
        └── index.ts             ← globális típusok (CivId, UnitType, stb.)

docs/                            ← tervek és specifikációk (plans/specs)
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

- Branch: `main` + feature branchek (`feat/pathfinding`, `fix/depth-sort`).
- Commit: conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- Minden feature branch PR-ban megy main-be (még ha szólómunka is).

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
hurok él.

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

*Utolsó frissítés: 2026-10-29. Zoli projekt, `IsoRTS` munkacím.*
