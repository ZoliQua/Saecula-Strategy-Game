# Perf scripts

**English** · [Magyar](README.hu.md)

Reproducible measurements for the performance budget (CLAUDE.md §10). The
scripts drive the game in headless Chromium through Playwright against the
Vite dev server (`window.__game` exists in dev only). They are not part of
the build or the test suite.

Playwright is not a project dependency. If it is missing, install it for the
run:

```sh
npm i --no-save playwright && npx playwright install chromium
```

## Texture memory

```sh
npm run perf:texmem -- --scenario distinct6 --size 1280x720
```

The script starts a match, then visits four map points at every zoom
(`--zooms 1.2,1,0.9,0.8,0.7,0.65,0.5`) and keeps the worst total. Each
texture counts as width × height × 4 bytes for its image and its normal map.
Terrain chunks are also listed separately, with how many are resident at
full, mid and half resolution.

The peak is checked against the texture budget: 256 MB on a land map and
400 MB on a map with sea, where ships can be built (CLAUDE.md §10). The
script prints `WITHIN` or `OVER` and exits with code 1 when over. For the
naval worst case, `--ships` first gives every player one ship of each type,
so every civ's ship sheets are painted:

```sh
npm run perf:texmem -- --scenario naval6 --ships
```

## Frame time

```sh
npm run perf:frame -- --scenario medium4 --warmup 10 --seconds 30 --gpu
```

The script measures main-thread time from Phaser's pre-step to post-render
for each frame and reports the average, p95 and worst value. It first runs
`--warmup` game minutes at `--timescale` speed, so that armies exist.

Without `--gpu`, Chromium renders with SwiftShader (software GL). That makes
rendering slow and frames rare, so only compare such runs with each other,
and use `--warmup 0` or a small value.

## Lost WebGL context

```sh
node scripts/perf/contextlost.mjs [--shot card.png]
```

Checks the 1.0 safeguard: it starts a small match, forces a WebGL context
loss (`WEBGL_lose_context`), and checks that the card appears, the match is
stopped and saved, and "Reload and continue" loads the same match. It prints
`PASS` / `FAIL` per check and exits with code 1 on a failure.

## Options

| Option | Meaning |
|---|---|
| `--scenario` | `distinct6` (128×128 Islands, 6 players), `twoCiv` (96×96, Hungarian + English), `medium4` (96×96, 4 players), `naval6` (128×128 Archipelago, 6 Hard players) |
| `--size` | Viewport, for example `1728x963` |
| `--url` | Use an already running dev server instead of starting one on port 5199 |
| `--gpu` | Keep Chromium's default GL backend |
| `--ships` | texmem only: one ship of each type per player before measuring |

Results are written as JSON to `scripts/perf/results/` (git-ignored).
