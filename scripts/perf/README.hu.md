# Mérőszkriptek

[English](README.md) · **Magyar**

Megismételhető mérések a teljesítmény-kerethez (CLAUDE.md 10.). A szkriptek
fej nélküli Chromiumban, Playwrighttal vezérlik a játékot a Vite fejlesztői
szerverén (a `window.__game` csak fejlesztői módban létezik). Nem részei a
buildnek és a teszteknek.

A Playwright nem függősége a projektnek. Ha hiányzik, a futtatáshoz
telepítsd:

```sh
npm i --no-save playwright && npx playwright install chromium
```

## Textúra-memória

```sh
npm run perf:texmem -- --scenario distinct6 --size 1280x720
```

A szkript elindít egy meccset, majd minden nagyításon
(`--zooms 1.2,1,0.9,0.8,0.7,0.65,0.5`) a térkép négy pontját bejárja, és a
legrosszabb összeget tartja meg. Minden textúra a képével és a normal
mapjével együtt szélesség × magasság × 4 bájtnak számít. A terep-darabok
külön is szerepelnek, azzal együtt, hogy hány van teljes, háromnegyedes és
fél felbontásban a memóriában.

A csúcsot a szkript a textúra-kerettel veti össze: szárazföldi térképen
256 MB, tengeres térképen (ahol hajó építhető) 400 MB (CLAUDE.md 10.).
`WITHIN` vagy `OVER` sort ír, túllépésnél 1-es kóddal lép ki. A vízi
legrosszabb esethez a `--ships` előbb minden játékosnak ad egy-egy hajót
minden típusból, így minden nép hajólapjai elkészülnek:

```sh
npm run perf:texmem -- --scenario naval6 --ships
```

## Képkockaidő

```sh
npm run perf:frame -- --scenario medium4 --warmup 10 --seconds 30 --gpu
```

A szkript képkockánként méri a fő szál idejét a Phaser pre-step és
post-render eseménye között, és megadja az átlagot, a p95-öt és a
legrosszabb értéket. Előtte `--warmup` játékpercet gyorsítva (`--timescale`)
futtat, hogy legyenek seregek.

`--gpu` nélkül a Chromium SwiftShaderrel (szoftveres GL) renderel. Ez
lassú, kevés a képkocka, ezért az ilyen méréseket csak egymással vesd
össze, és `--warmup 0` vagy kis érték kell.

## Elvesztett WebGL-kontextus

```sh
node scripts/perf/contextlost.mjs [--shot kartya.png]
```

Az 1.0-s biztosítékot ellenőrzi: elindít egy kis meccset, elveszíti a
WebGL-kontextust (`WEBGL_lose_context`), és megnézi, hogy megjelenik-e a
kártya, a meccs megáll és elmentődik-e, és az „Újratöltés és folytatás”
ugyanazt a meccset tölti-e be. Ellenőrzésenként `PASS` / `FAIL` sort ír,
hibánál 1-es kóddal lép ki.

## Kapcsolók

| Kapcsoló | Jelentés |
|---|---|
| `--scenario` | `distinct6` (128×128 Szigetek, 6 játékos), `twoCiv` (96×96, magyar + angol), `medium4` (96×96, 4 játékos), `naval6` (128×128 Szigetvilág, 6 Nehéz játékos) |
| `--size` | Nézetméret, például `1728x963` |
| `--url` | Már futó fejlesztői szerver használata, ahelyett hogy az 5199-es porton indítana egyet |
| `--gpu` | A Chromium alapértelmezett GL-motorja |
| `--ships` | csak a texmem: mérés előtt minden játékosnak egy-egy hajó minden típusból |

Az eredmény JSON-ként a `scripts/perf/results/` alá kerül (a git figyelmen kívül hagyja).
