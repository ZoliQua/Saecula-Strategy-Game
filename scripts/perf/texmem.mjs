// Texture memory per zoom (M10). Usage:
//   node scripts/perf/texmem.mjs [--scenario distinct6|twoCiv|medium4|naval6] [--size 1280x720]
//        [--zooms 1.2,1,0.8,0.65,0.5] [--settle 2500] [--url http://localhost:5173/] [--gpu] [--ships]
// At every zoom the camera visits four map points; the worst total is kept.
// --ships gives every player one ship of each type first (spawnShips; the naval worst case).
// The peak is checked against the budget: 256 MB on a land map, 400 MB on a map with sea (CLAUDE.md §10).
import { aim, devServer, hasSea, loadPlaywright, openPage, parseArgs, SCENARIOS, spawnShips, startMatch, TEXTURE_BUDGET_MB, textureTally, writeResult } from './lib.mjs';

const args = parseArgs();
const scenario = String(args.scenario ?? 'distinct6');
const setup = SCENARIOS[scenario];
if (!setup) throw new Error(`unknown scenario ${scenario} (${Object.keys(SCENARIOS).join(', ')})`);
const [width, height] = String(args.size ?? '1280x720').split('x').map(Number);
const zooms = String(args.zooms ?? '1.2,1,0.9,0.8,0.7,0.65,0.5').split(',').map(Number);
const settle = Number(args.settle ?? 2500);
const POINTS = [[0.5, 0.5], [0.3, 0.6], [0.7, 0.4], [0.5, 0.75]];

const pw = await loadPlaywright();
const server = await devServer(args.url);
const { browser, page, errors } = await openPage(pw, { width, height, gpu: !!args.gpu });
try {
  const loadMs = await startMatch(page, server.url, setup);
  await page.waitForTimeout(3000);
  const sea = await hasSea(page);
  const budgetMB = sea ? TEXTURE_BUDGET_MB.water : TEXTURE_BUDGET_MB.land;
  const civs = args.ships ? await spawnShips(page) : null;
  if (civs) {
    console.log(`ships for ${civs.join(', ')}`);
    await page.waitForTimeout(5000);
  }
  const rows = [];
  for (const zoom of zooms) {
    let worst = null;
    for (const [fx, fy] of POINTS) {
      await aim(page, zoom, fx, fy);
      await page.waitForTimeout(settle);
      const t = await textureTally(page);
      if (!worst || t.totalMB > worst.totalMB) worst = t;
    }
    rows.push({ zoom, ...worst });
    console.log(`zoom ${zoom.toFixed(2)}  total ${worst.totalMB.toFixed(1)} MB  terrain ${worst.terrainMB.toFixed(1)} MB  chunks ${JSON.stringify(worst.chunks)}`);
  }
  const peak = rows.reduce((a, b) => (b.totalMB > a.totalMB ? b : a));
  const withinBudget = peak.totalMB <= budgetMB;
  console.log(`peak ${peak.totalMB} MB at zoom ${peak.zoom}; match start ${(loadMs / 1000).toFixed(1)} s`);
  console.log(`${withinBudget ? 'WITHIN' : 'OVER'} the ${sea ? 'water' : 'land'} map budget of ${budgetMB} MB`);
  if (!withinBudget) process.exitCode = 1;
  const path = writeResult(`texmem-${scenario}-${width}x${height}`, { scenario, setup, ships: !!args.ships, civs, sea, budgetMB, withinBudget, viewport: [width, height], loadMs, rows, peak, errors });
  console.log(`written ${path}`);
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
} finally {
  await browser.close();
  server.stop();
}
