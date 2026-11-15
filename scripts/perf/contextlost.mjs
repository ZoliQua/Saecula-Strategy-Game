// Lost WebGL context safeguard (1.0): starts a match, forces a context loss
// (WEBGL_lose_context), checks the card, that the autosave slot holds the
// match, and that "reload and continue" resumes it. Usage:
//   node scripts/perf/contextlost.mjs [--url http://localhost:5196/] [--shot card.png]
import { devServer, loadPlaywright, openPage, parseArgs, startMatch } from './lib.mjs';

const args = parseArgs();
const pw = await loadPlaywright();
const server = await devServer(args.url);
const { browser, page, errors } = await openPage(pw, { width: 1280, height: 720 });
const check = (ok, what) => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${what}`);
  if (!ok) process.exitCode = 1;
};
try {
  await startMatch(page, server.url, { template: 'meadow', mapSize: 'small', aiCount: 1, civ: 'hungarian', aiCivs: 'mixed', seed: 77, difficulty: 'easy', victory: 'conquest' });
  await page.evaluate(() => window.__timeScale?.(8));
  await page.waitForTimeout(4000);
  const { before, matchId } = await page.evaluate(() => {
    const sc = window.__game.scene.getScene('GameScene');
    return { before: sc.gameElapsedMs, matchId: sc.matchId };
  });
  await page.evaluate(() => window.__game.renderer.gl.getExtension('WEBGL_lose_context').loseContext());
  await page.waitForSelector('.context-lost button:not([disabled])', { timeout: 15_000 });
  const card = await page.evaluate(() => ({
    text: document.querySelector('.context-lost')?.textContent ?? '',
    paused: window.__game.scene.getScene('GameScene').scene.isPaused(),
  }));
  if (args.shot) await page.waitForTimeout(1000);
  if (args.shot) await page.screenshot({ path: String(args.shot) });
  check(card.text.includes('elmentettük'), 'the card says the match was saved');
  check(card.paused, 'the match is stopped');
  await page.click('.context-lost button');
  await page.waitForFunction(
    () => {
      const s = window.__game?.scene.getScene('GameScene');
      return !!s && s.sys.isActive() && s.bake === null && !!s.tileMap;
    },
    null,
    { timeout: 120_000 },
  );
  const after = await page.evaluate(() => ({
    ms: window.__game.scene.getScene('GameScene').gameElapsedMs,
    matchId: window.__game.scene.getScene('GameScene').matchId,
    flag: sessionStorage.getItem('isorts.resume.v1'),
    card: !!document.querySelector('.context-lost'),
  }));
  check(Math.abs(after.ms - before) < 60_000 && after.ms > 0, `resumed at ${Math.round(after.ms / 1000)} s (lost at ≥ ${Math.round(before / 1000)} s)`);
  check(after.matchId === matchId, 'the same match was loaded (match id)');
  check(after.flag === null, 'the resume request was used up');
  check(!after.card, 'no card after the reload');
  check(errors.length === 0, `no page errors${errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''}`);
} finally {
  await browser.close();
  server.stop();
}
