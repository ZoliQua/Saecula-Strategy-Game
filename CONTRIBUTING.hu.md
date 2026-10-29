# Közreműködés a Saeculában

[English](CONTRIBUTING.md) · **Magyar**

Köszönjük, hogy érdekel a Saecula! Hibajelentést, tesztjáték-jegyzetet,
ötletet és pull requestet egyaránt szívesen fogadunk. A részvétellel
elfogadod a [magatartási kódexet](CODE_OF_CONDUCT.hu.md).

## Hibajelentés és ötletek

Nyiss egy [issue-t](https://github.com/ZoliQua/Saecula-Strategy-Game/issues/new/choose),
és válaszd a megfelelő sablont. Hibánál kérjük, írd le:

- mit csináltál, mit vártál, és mi történt helyette;
- a játék verzióját (a főmenü alján), a böngésződet és az operációs rendszert;
- egy képernyőképet, hiba esetén a böngésző konzoljának kimenetét is.

Issue-t angolul és magyarul is írhatsz.

## Scope

A játék terjedelmét a [`CLAUDE.md`](CLAUDE.md) rögzíti (az 1.2 szakasz sorolja
fel, mi *nem* része szándékosan, például a többjátékos mód és a mobil
érintéses irányítás). Nagyobb funkció előtt nyiss egy issue-t, és beszéljük
meg, mielőtt kódolni kezdesz.

## Fejlesztői környezet

```bash
npm install
npm run dev          # http://localhost:5173
```

Pull request előtt mindegyiknek hiba nélkül le kell futnia:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

A folyamatos integráció (CI) minden push és pull request után ugyanezeket
futtatja.

## Konvenciók

- **Nyelv.** A kód, az azonosítók, a kommentek és a commit üzenetek angolok.
  Minden, a játékosnak szóló szöveg magyar, és a `src/i18n/hu.ts`-ben van —
  soha ne írd be közvetlenül egy komponensbe.
- **TypeScript.** `strict` mód; `any` tilos (kivétel: külső könyvtár
  illesztése, kommenttel). Külső adatot (mentés, JSON) `zod`-dal ellenőrizz.
- **Architektúra.** A játékállapot egyetlen forrása az ECS világ; a Phaser
  objektumok csak megjelenítik. A balansz-számok a `src/config/balance.ts`-be
  kerülnek.
- **Fájlok.** Egy fájl egy feladat, legfeljebb kb. 400 sor. Osztály és
  komponens: `PascalCase.ts`, függvénymodul: `camelCase.ts`.
- **Tesztek.** Kötelezők a `CLAUDE.md` 11.1 szakaszában felsorolt modulokhoz
  (koordináták, útkeresés, mentés oda-vissza, migrációk, balansz). Hibajavításnál
  először egy elbukó tesztet írj, utána javíts.
- **Függőségek.** Új külső könyvtár előtt kérdezz egy issue-ban.

## Ágak, commitok és pull requestek

- A `main` mindig a legfrissebb teljes változat. Ebből ágazz le:
  `feat/<név>`, `fix/<név>`, `docs/<név>`, `chore/<név>`.
- [Conventional Commits](https://www.conventionalcommits.org/hu/):
  `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Minden változás pull requesten át kerül a `main`-be. Írd le, mi változott
  és miért; látványbeli változásnál csatolj képernyőképet.
- Ha a változás a játékosnak is látszik, írj egy sort a **[Kiadatlan]**
  szakaszba a `CHANGELOG.md`-ben és a `CHANGELOG.hu.md`-ben is.

## Kiadások

A Saecula [szemantikus verziózást](https://semver.org/lang/hu/) használ. A
verzió a `package.json`-ban van, és a főmenü mutatja. Kiadáskor mindkét
változásnapló frissül, a `main`-re `chore(release): vX.Y.Z` commit kerül,
`vX.Y.Z` tag készül, és a GitHub release a változásnapló szakaszát kapja.

## Közreműködők

Mindenki, aki hozzájárul, szerepel a [`CONTRIBUTORS.md`](CONTRIBUTORS.md)-ben.
Az első pull requestedben nyugodtan add hozzá magad.
