# Böngészős smoke-szkriptek

[English](README.md) · **Magyar**

## `input.mjs` (`npm run smoke:input`)

Valódi meccset vezérel fej nélküli Chrome-mal (CDP, SwiftShader), és az egérbemenetet ellenőrzi:

1. a húzott keret kijelöli a 3 kezdő falusit;
2. a jobb klikk üres talajra mindegyik kijelölt egységnek utat ad;
3. az egyszeri kattintás pontosan egy falusit jelöl ki;
4. a Ctrl+klikk (az alapértelmezett parancs-gesztus) mozgatja a kijelölést, és megtartja;
5. a sima kattintás üres fűre törli a kijelölést.

Függőséget nem kér (a `scripts/perf/`-fel ellentétben Playwrightot sem).

Előfeltételek: macOS-es Chrome az `/Applications/Google Chrome.app` alatt (vagy `--chrome`),
Node 22+ (beépített `fetch`/`WebSocket`), és külön indított fejlesztői szerver:
`npx vite --port 5196 --strictPort`. A futás kb. 50 másodperc.

Futtatás: `npm run smoke:input -- [--url http://localhost:5196] [--chrome <út>] [--port 9334]`

Kimenet: ellenőrzésenként egy `PASS <ellenőrzés>` / `FAIL <ellenőrzés>` sor. A kilépési kód
0, ha minden ellenőrzés sikeres, különben 1 (a `FAIL server/chrome` is ide tartozik, ha a
szerver nem érhető el, vagy a Chrome 10 s alatt nem indul). A CI-nek nem része.
