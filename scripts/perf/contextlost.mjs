// Lost WebGL context safeguard (1.0). Usage:
//   node scripts/perf/contextlost.mjs [--url http://localhost:5196/] [--shot card.png]
// 1. A running match with the pause menu open loses its context: the card says it was saved, Esc does not
//    resume the match, and "reload and continue" loads the same match.
// 2. The context is lost again while that saved match is loading (terrain bake): it still resumes.
import { devServer, loadPlaywright, openPage, parseArgs, startMatch } from './lib.mjs';

const args = parseArgs();
const pw = await loadPlaywright();
const server = await devServer(args.url);
const { browser, page, errors } = await openPage(pw, { width: 1280, height: 720 });
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) process.exitCode = 1;
};
const scene = () => page.evaluate(() => {
  const sc = window.__game?.scene.getScene('GameScene');
  return sc ? { ms: sc.gameElapsedMs, matchId: sc.matchId, paused: sc.scene.isPaused(), baking: sc.bake !== null, running: sc.sys.isActive() && sc.bake === null && !!sc.tileMap } : null;
});
const loseContext = () => page.evaluate(() => window.__game.renderer.gl.getExtension('WEBGL_lose_context').loseContext());
const cardText = () => page.evaluate(() => document.querySelector('.context-lost')?.textContent ?? '');
const resumed = () => page.waitForFunction(() => {
  const s = window.__game?.scene.getScene('GameScene');
  return !!s && s.sys.isActive() && s.bake === null && !!s.tileMap;
}, null, { timeout: 120_000 });

try {
  // 1. Pause menu open, then the loss.
  await startMatch(page, server.url, { template: 'meadow', mapSize: 'small', aiCount: 1, civ: 'hungarian', aiCivs: 'mixed', seed: 77, difficulty: 'easy', victory: 'conquest' });
  await page.evaluate(() => window.__timeScale?.(8));
  await page.waitForTimeout(4000);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(800);
  const pausedMenu = await page.evaluate(() => window.__game.scene.isActive('PauseScene'));
  check(pausedMenu, 'the pause menu is open');
  const before = await scene();
  await loseContext();
  await page.waitForSelector('.context-lost button:not([disabled])', { timeout: 15_000 });
  if (args.shot) {
    // Headless software GL repaints the page late after the loss: an early shot can show the frame before the card.
    await page.waitForTimeout(3000);
    await page.screenshot({ path: String(args.shot) });
  }
  check((await cardText()).includes('elmentettük'), 'the card says the match was saved');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.waitForTimeout(3000);
  const held = await scene();
  check(held.ms === before.ms, `Esc does not resume the match (clock ${Math.round(before.ms)} → ${Math.round(held.ms)} ms)`);
  await page.click('.context-lost button');
  await resumed();
  const after = await scene();
  check(after.matchId === before.matchId, 'the same match was loaded (match id)');
  check(Math.abs(after.ms - before.ms) < 1000, `resumed at the lost moment (${Math.round(after.ms)} ms)`);
  check(await page.evaluate(() => sessionStorage.getItem('isorts.resume.v1') === null && !document.querySelector('.context-lost')), 'the request is used up and the card is gone');

  // 2. Lost again while the saved match loads.
  await page.evaluate(() => void window.__game.scene.getScene('GameScene').loadSlot('auto'));
  await page.waitForFunction(() => window.__game.scene.getScene('GameScene').bake !== null, null, { timeout: 30_000 });
  await loseContext();
  await page.waitForSelector('.context-lost button:not([disabled])', { timeout: 15_000 });
  check((await cardText()).includes('elmentettük'), 'a loss during loading keeps the resume');
  await page.click('.context-lost button');
  await resumed();
  const again = await scene();
  check(again.matchId === before.matchId, 'the same match resumed after the second loss');
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
} finally {
  await browser.close();
  server.stop();
}
