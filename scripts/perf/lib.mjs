// Shared helpers of the perf scripts (M10): dev server, browser, match start, texture tally.
// Runs against the Vite dev server (window.__game is exposed in dev only).
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
export const RESULTS = join(ROOT, 'scripts', 'perf', 'results');

/** Match setups the scripts measure (GameSetupConfig fields; see src/game/GameSetupConfig.ts). */
export const SCENARIOS = {
  /** The texture budget's worst case: 128×128 Islands, 6 players, a mixed draw of civs. */
  distinct6: { template: 'islands', mapSize: 'large', aiCount: 5, civ: 'hungarian', aiCivs: 'mixed', seed: 4242, difficulty: 'easy', victory: 'all' },
  /** The M4 two-civ case. */
  twoCiv: { template: 'meadow', mapSize: 'medium', aiCount: 3, civ: 'hungarian', aiCivs: 'english', seed: 4242, difficulty: 'easy', victory: 'conquest_wonder' },
  /** The frame-rate target (CLAUDE.md §10): 96×96, 4 players. */
  medium4: { template: 'meadow', mapSize: 'medium', aiCount: 3, civ: 'hungarian', aiCivs: 'mixed', seed: 4242, difficulty: 'hard', victory: 'conquest_wonder' },
  /** The naval worst case (M14): 128×128 Archipelago, 6 Hard players; texmem --ships gives every civ its ship sheets, frametime --warmup 20 reaches the entity peak. */
  naval6: { template: 'archipelago', mapSize: 'large', aiCount: 5, civ: 'hungarian', aiCivs: 'mixed', seed: 4242, difficulty: 'hard', victory: 'all' },
};

/** `--name value` / `--flag` arguments. */
export function parseArgs(argv = process.argv.slice(2)) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith('--')) out[a.slice(2)] = true;
    else out[a.slice(2)] = (i++, next);
  }
  return out;
}

/** Playwright from the project, or a global install on NODE_PATH (CommonJS resolution). */
export async function loadPlaywright() {
  try {
    return await import('playwright');
  } catch {
    /* not a project dependency: try NODE_PATH */
  }
  try {
    return createRequire(import.meta.url)('playwright');
  } catch {
    console.error('Playwright is not installed. Install it for this run:\n  npm i --no-save playwright && npx playwright install chromium');
    process.exit(2);
  }
}

/** Starts `vite` on `port` unless `url` is given; returns the URL and a stop function. */
export async function devServer(url, port = 5199) {
  if (url) return { url, stop: () => undefined };
  const child = spawn('npx', ['vite', '--port', String(port), '--strictPort'], { cwd: ROOT, stdio: ['ignore', 'pipe', 'pipe'] });
  const target = `http://localhost:${port}/`;
  const deadline = Date.now() + 60_000;
  for (;;) {
    try {
      if ((await fetch(target)).ok) break;
    } catch {
      /* not up yet */
    }
    if (Date.now() > deadline) throw new Error(`vite did not start on ${target}`);
    await new Promise((r) => setTimeout(r, 500));
  }
  return { url: target, stop: () => child.kill() };
}

/** A headless Chromium page at `width`×`height`; `gpu` keeps the default GL backend instead of SwiftShader. */
export async function openPage(pw, { width, height, gpu = false }) {
  const args = gpu ? [] : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'];
  const browser = await pw.chromium.launch({ args });
  const page = await browser.newPage({ viewport: { width, height } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  return { browser, page, errors };
}

/** Opens the game, waits for the main menu, then starts GameScene on `setup` and waits until the match runs. */
export async function startMatch(page, url, setup) {
  await page.goto(url);
  await page.waitForFunction(() => !!window.__game && window.__game.scene.isActive('MainMenuScene'), null, { timeout: 120_000 });
  await page.waitForTimeout(1000);
  const t0 = Date.now();
  await page.evaluate((s) => {
    const g = window.__game;
    for (const scene of g.scene.getScenes(true)) scene.scene.stop();
    g.scene.start('GameScene', s);
  }, setup);
  await page.waitForFunction(
    () => {
      const s = window.__game.scene.getScene('GameScene');
      return !!s && s.sys.isActive() && s.bake === null && !!s.tileMap;
    },
    null,
    { timeout: 300_000 },
  );
  return Date.now() - t0;
}

/**
 * Gives every player one ship of each naval type on the sea nearest its town
 * centre, so every civ's ship sheets are painted and stay resident (an AI
 * civ's ships are painted on demand, M14). Returns the civs in the match.
 */
export async function spawnShips(page) {
  return page.evaluate(async () => {
    const { createUnit } = await import('/src/ecs/archetypes/createUnit.ts');
    const { isSea } = await import('/src/map/TerrainTypes.ts');
    const sc = window.__game.scene.getScene('GameScene');
    const map = sc.mapData;
    const taken = new Set();
    const civs = [];
    for (const p of sc.players.all()) {
      civs.push(p.civ);
      const tc = sc.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === p.id);
      if (!tc) continue;
      let placed = 0;
      for (let r = 1; r < 40 && placed < 4; r++) {
        for (let dy = -r; dy <= r && placed < 4; dy++) {
          for (let dx = -r; dx <= r && placed < 4; dx++) {
            if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
            const tx = tc.position.tx + dx;
            const ty = tc.position.ty + dy;
            if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height || taken.has(`${tx},${ty}`) || !isSea(map.getTile(tx, ty))) continue;
            taken.add(`${tx},${ty}`);
            createUnit(sc.world, { type: ['fishing_boat', 'transport', 'galley', 'frigate'][placed], tile: { tx, ty }, playerId: p.id });
            placed++;
          }
        }
      }
    }
    return civs;
  });
}

/**
 * The texture budget (CLAUDE.md §10, MB; textures only): 256 on a land map,
 * 400 on a map with sea, where ships can be built (1.0 decision, 2026-11-13).
 */
export const TEXTURE_BUDGET_MB = { land: 256, water: 400 };

/** Whether the running match's map has sea (any water or fish tile): its texture budget is the water one. */
export async function hasSea(page) {
  return page.evaluate(async () => {
    const { isSea } = await import('/src/map/TerrainTypes.ts');
    const map = window.__game.scene.getScene('GameScene').mapData;
    for (let ty = 0; ty < map.height; ty++) for (let tx = 0; tx < map.width; tx++) if (isSea(map.getTile(tx, ty))) return true;
    return false;
  });
}

/** Centres the camera on a map fraction (fx, fy) at `zoom`. */
export async function aim(page, zoom, fx, fy) {
  await page.evaluate(
    ([z, x, y]) => {
      const sc = window.__game.scene.getScene('GameScene');
      const cam = sc.cameras.main;
      const tx = sc.mapData.width * x;
      const ty = sc.mapData.height * y;
      cam.setZoom(z);
      cam.centerOn((tx - ty) * 32, (tx + ty) * 16);
    },
    [zoom, fx, fy],
  );
}

/**
 * Texture memory as the texture manager holds it: width × height × 4 of
 * every source and data source (normal maps), in MB; terrain chunks of
 * the running map separately, and stream counts per resolution level.
 */
export async function textureTally(page) {
  return page.evaluate(() => {
    const g = window.__game;
    const sc = g.scene.getScene('GameScene');
    const chunks = sc.tileMap.chunks;
    const mine = chunks.slots[0]?.keys.full.replace(/_\d+$/, '_') ?? 'terrain_chunk_';
    let all = 0;
    let terrain = 0;
    for (const key of g.textures.getTextureKeys()) {
      const t = g.textures.get(key);
      let bytes = 0;
      for (const s of [...t.source, ...(t.dataSource ?? [])]) bytes += (s.width || 0) * (s.height || 0) * 4;
      if (key.startsWith('terrain_chunk_') && !key.startsWith(mine)) continue;
      all += bytes;
      if (key.startsWith(mine)) terrain += bytes;
    }
    const st = chunks.stats();
    const mb = (b) => Math.round((b / 1048576) * 10) / 10;
    return { totalMB: mb(all), terrainMB: mb(terrain), chunks: { full: st.full, mid: st.mid ?? 0, half: st.half } };
  });
}

/** Writes `data` as JSON under scripts/perf/results/ and returns the path. */
export function writeResult(name, data) {
  mkdirSync(RESULTS, { recursive: true });
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const path = join(RESULTS, `${name}-${stamp}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2));
  return path;
}
