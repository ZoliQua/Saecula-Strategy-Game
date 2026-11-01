// Frame CPU time (M10): main-thread ms from Phaser's pre-step to post-render, per frame. Usage:
//   node scripts/perf/frametime.mjs [--scenario medium4] [--size 1280x720] [--warmup 10] [--seconds 30]
//        [--timescale 4] [--url http://localhost:5173/] [--gpu]
// The match first runs `warmup` game minutes faster (window.__timeScale) so armies exist, then is
// sampled at normal speed. Software GL (the default headless backend) inflates render time: compare
// runs made the same way, or pass --gpu on a machine with a GPU. Without a GPU the game renders a few
// frames a second, so a long warm-up takes very long there: use --warmup 0 (or a small value).
import { devServer, loadPlaywright, openPage, parseArgs, SCENARIOS, startMatch, writeResult } from './lib.mjs';

const args = parseArgs();
const scenario = String(args.scenario ?? 'medium4');
const setup = SCENARIOS[scenario];
if (!setup) throw new Error(`unknown scenario ${scenario} (${Object.keys(SCENARIOS).join(', ')})`);
const [width, height] = String(args.size ?? '1280x720').split('x').map(Number);
const warmupMin = Number(args.warmup ?? 10);
const seconds = Number(args.seconds ?? 30);
const timeScale = Number(args.timescale ?? 4);

const pw = await loadPlaywright();
const server = await devServer(args.url);
const { browser, page, errors } = await openPage(pw, { width, height, gpu: !!args.gpu });
try {
  await startMatch(page, server.url, setup);
  if (warmupMin > 0) {
    await page.evaluate((n) => window.__timeScale?.(n), timeScale);
    for (;;) {
      const min = await page.evaluate(() => window.__game.scene.getScene('GameScene').gameElapsedMs / 60_000);
      if (min >= warmupMin) break;
      console.log(`warming up: ${min.toFixed(1)} / ${warmupMin} game min`);
      await page.waitForTimeout(15_000);
    }
    await page.evaluate(() => window.__timeScale?.(1));
  }
  await page.evaluate(() => {
    const g = window.__game;
    const samples = [];
    let start = 0;
    g.events.on('prestep', () => (start = performance.now()));
    g.events.on('postrender', () => start && samples.push(performance.now() - start));
    window.__frameSamples = samples;
  });
  await page.waitForTimeout(seconds * 1000);
  const r = await page.evaluate(() => {
    const s = [...window.__frameSamples].sort((a, b) => a - b);
    const q = (p) => s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
    const sc = window.__game.scene.getScene('GameScene');
    return {
      frames: s.length,
      avg: s.reduce((a, b) => a + b, 0) / Math.max(1, s.length),
      p95: q(0.95),
      worst: s[s.length - 1] ?? 0,
      entities: sc.world.entities.length,
      gameMinutes: sc.gameElapsedMs / 60_000,
    };
  });
  const round = (x) => Math.round(x * 100) / 100;
  console.log(`${r.frames} frames: avg ${round(r.avg)} ms, p95 ${round(r.p95)} ms, worst ${round(r.worst)} ms; ${r.entities} world entities (resources included) at ${round(r.gameMinutes)} game min`);
  const path = writeResult(`frametime-${scenario}-${width}x${height}`, { scenario, setup, viewport: [width, height], warmupMin, seconds, gpu: !!args.gpu, ...r, errors });
  console.log(`written ${path}`);
  if (errors.length) console.log('page errors:', errors.slice(0, 5));
} finally {
  await browser.close();
  server.stop();
}
