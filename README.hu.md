<div align="center">

# ⬢ Saecula

**Izometrikus, történelmi, valós idejű stratégiai játék a böngésződben.**
Három kor · nyolc nép · AI ellenfelek — Rómától a felvilágosodásig.

[![Verzió](https://img.shields.io/badge/verzi%C3%B3-0.2.0-f5a857)](CHANGELOG.hu.md)
[![CI](https://github.com/ZoliQua/Saecula-Strategy-Game/actions/workflows/ci.yml/badge.svg)](https://github.com/ZoliQua/Saecula-Strategy-Game/actions/workflows/ci.yml)
[![Licenc: MIT](https://img.shields.io/badge/licenc-MIT-blue)](LICENSE)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6)
![Phaser](https://img.shields.io/badge/Phaser-3.80-8e44ad)

[English](README.md) · **Magyar**

![A Saecula főmenüje](docs/images/main-menu.jpg)

</div>

---

## A játékról

A *Saecula* (latinul „korszakok, évszázadok”) egyjátékos skirmish RTS az
*Age of Empires II* szellemében, szándékosan kisebb terjedelemben. Válassz
népet, gyűjts ételt, fát és aranyat, építs várost, képezz sereget, és vezesd
a népedet három történelmi koron át — miközben legfeljebb öt AI ellenfél
ugyanezt próbálja.

Minden, amit látsz és hallasz, **kódból készül**: a terep, az épületek, az
egységek, a fények, a hangeffektek és az alkalmazkodó zene. Külső kép- vagy
hangfájl nincs a játékban.

A játék felülete **magyar**; a kód angol, a dokumentáció angol és magyar.

## Jellemzők

- 🏛️ **Három kor** — római kor, középkor, felvilágosodás. Minden kor új
  épületeket és egységeket hoz, és a város a korváltáskor láthatóan átalakul.
- 🛡️ **Nyolc nép** — magyar, angol, német, francia, spanyol, olasz, orosz és
  finn. Minden népnek koronként saját építészete, falai, egységviselete és
  saját Csodája van (Speyer, Versailles, Alhambra, Firenze, Szent Vazul,
  Petäjävesi…).
- ⚔️ **Tíz egységtípus** — falusi, felderítő, kardforgató, íjász, lovag,
  lándzsás, számszeríjász, muskétás, ágyú és könnyűlovas.
- 🤖 **AI ellenfelek** — négy nehézségi szint (Könnyűtől Mesteriig) és három
  személyiség (rohamozó, gazdálkodó, védekező), csalás nélkül.
- 🗺️ **Öt térképtípus** — Mezőség, Vadon, Szigetek, Erődítmény és Véletlen,
  három méretben (64², 96², 128²), 2–6 játékosra.
- 🏆 **Két győzelmi feltétel** — hódítás, vagy egy Csoda megtartása tíz percig.
- 🌗 **Élő világ** — dinamikus 2D fények normal map-ekkel, napszakváltás,
  vetett árnyékok, háborús köd, építési és összeomlási animációk.
- 🎵 **Procedurális hang** — térbeli hangeffektek és koronkénti generatív
  zene, amely a játék intenzitásával együtt erősödik.
- 💾 **Mentés és betöltés** — öt mentési hely és ötpercenkénti automatikus
  mentés, mind helyben (IndexedDB).
- 📊 **Pontszám és statisztika** — élő pontszámtábla, falusi-áttekintés,
  fejlődési fa, és meccsnapló győzelmi aránnyal, nép és nehézség szerinti
  bontással, JSON-exporttal.
- ⌨️ **Testreszabható irányítás** — átállítható billentyűk, érintőpad-támogatás
  (két ujjas mozgatás, csippentéses nagyítás) és környezetfüggő kurzorok.

## Képek

| | |
|---|---|
| ![Spanyol város a felvilágosodás korában](docs/images/spanish-town.jpg) | ![A játék HUD-ja az élő pontszámtáblával](docs/images/hud.jpg) |
| Spanyol város a felvilágosodás korában | A HUD az élő pontszámtáblával |

![Egy Csoda négy építési szakasza](docs/images/wonder-stages.jpg)
<p align="center"><em>Egy Csoda épülése szakaszról szakaszra</em></p>

## Gyors kezdés

[Node.js](https://nodejs.org/) 20 vagy újabb kell hozzá.

```bash
git clone https://github.com/ZoliQua/Saecula-Strategy-Game.git
cd Saecula-Strategy-Game
npm install
npm run dev        # → http://localhost:5173
```

| Parancs | Mit csinál |
|---|---|
| `npm run dev` | Fejlesztői szerver azonnali újratöltéssel |
| `npm run build` | Típusellenőrzés és éles build a `dist/` mappába |
| `npm run preview` | Az éles build helyi kiszolgálása |
| `npm test` | Egység- és szimulációs tesztek (Vitest) |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript, szigorú módban |

## Irányítás

| Művelet | Alapértelmezés |
|---|---|
| Kijelölés | Bal klikk, vagy keret húzása |
| Parancs (mozgás, gyűjtés, építés, támadás) | Jobb klikk, vagy Ctrl + bal klikk |
| Kamera mozgatása | `W` `A` `S` `D`, nyilak, képernyőszél, két ujjas húzás |
| Nagyítás | Egérgörgő, csippentés, vagy a térkép `+` / `−` gombja |
| Ugrás a városházára | `H`, vagy a „Haza” gomb |
| Pontszám / falusiak panel | `Tab` / `V` |
| Fejlődési fa | `T`, vagy a szünet menü |
| A kijelölt épület törlése | `Delete` vagy `Backspace` |
| Szünet menü | `Esc` |

Az `Esc` és a nyilak kivételével mindez átállítható a
**Beállítások → Irányítás** menüben.

## Technológia

| | |
|---|---|
| Motor | [Phaser 3](https://phaser.io/) (WebGL, Light2D) |
| Nyelv | TypeScript (`strict`, `noUncheckedIndexedAccess`) |
| Build | Vite |
| Játékállapot | [Miniplex](https://github.com/hmans/miniplex) ECS |
| UI-állapot | Zustand (vanilla), DOM-alapú felület |
| Útkeresés | `pathfinding` (A\*) |
| Tárolás és validáció | localforage (IndexedDB), zod |
| Tesztek | Vitest |

A játék egyetlen hiteles állapota az ECS világ; a Phaser objektumok csak
megjelenítik. A teljes architektúra, a scope és a konvenciók a
[`CLAUDE.md`](CLAUDE.md)-ben vannak.

## Állapot és ütemterv

A Saecula jelenlegi verziója **0.2.0**. Az egyes verziók tartalmát a
[változásnapló](CHANGELOG.hu.md) sorolja fel.

| Mérföldkő | Tartalom | Állapot |
|---|---|---|
| M0–M3 | Motor, gazdaság, harc, AI, három kor | ✅ 0.1.0 |
| M4–M5 | Nyolc nép saját építészettel | ✅ 0.2.0 |
| M6 | Mentés, hang, Csoda-győzelem, Mesteri AI | ✅ 0.2.0 |
| M7 | Playtest-javítások, irányítás, pontszám, statisztika | ✅ 0.2.0 |
| Következő | A tesztjátékok alapján | 🔜 |

Tudatosan nem része: többjátékos mód, mobil érintéses irányítás, kampány.

## Dokumentumok

- [`CHANGELOG.hu.md`](CHANGELOG.hu.md) — változásnapló
- [`CONTRIBUTING.hu.md`](CONTRIBUTING.hu.md) — hogyan járulhatsz hozzá
- [`CODE_OF_CONDUCT.hu.md`](CODE_OF_CONDUCT.hu.md) — közösségi irányelvek
- [`CONTRIBUTORS.md`](CONTRIBUTORS.md) — a játék készítői
- [`CLAUDE.md`](CLAUDE.md) — scope és architektúra
- [`PROGRAM_TERV.md`](PROGRAM_TERV.md) — részletes fejlesztési terv

## Közreműködés

Hibajelentést, ötletet és pull requestet szívesen fogadunk. Előtte olvasd el a
[`CONTRIBUTING.hu.md`](CONTRIBUTING.hu.md)-t, és tartsd be a
[magatartási kódexet](CODE_OF_CONDUCT.hu.md).

## Licenc

A Saecula az [MIT licenc](LICENSE) alatt érhető el © 2026 Dul Zoltán.
(A licenc jogilag kötelező szövege angol.)

A játék az [Inter](https://rsms.me/inter/) és a
[Cinzel](https://fonts.google.com/specimen/Cinzel) betűtípust a Google
Fonts-ról tölti be; mindkettő SIL Open Font License 1.1 licenc alatt áll.
