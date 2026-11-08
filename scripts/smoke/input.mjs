// Headless-Chrome input smoke: drag-select, right-click move, click select,
// Ctrl+click command and click-to-deselect against a running dev server.
// Usage: node scripts/smoke/input.mjs [--url http://localhost:5196] [--chrome <path>] [--port 9334]
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const arg = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const URL_ = arg('url', 'http://localhost:5196');
const CHROME = arg(
  'chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
);
const PORT = Number(arg('port', '9334'));
const CTRL = 2; // CDP modifier bit for Ctrl (the default command gesture)

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const profile = mkdtempSync(join(tmpdir(), 'saecula-smoke-'));
let chrome = null;
let ws = null;
let failed = false;

// Kills Chrome, waits for it to exit (it still writes to the profile), then removes the profile.
async function cleanup() {
  try {
    ws?.close();
  } catch {
    /* already closed */
  }
  if (chrome && chrome.exitCode === null) {
    const exited = new Promise((r) => chrome.once('exit', r));
    chrome.kill();
    await Promise.race([exited, sleep(5000)]);
  }
  rmSync(profile, {
    recursive: true,
    force: true,
    maxRetries: 10,
    retryDelay: 200,
  });
}
// Conventional exit codes: 128 + signal number (SIGINT 2 -> 130, SIGTERM 15 -> 143).
for (const [sig, code] of [
  ['SIGINT', 130],
  ['SIGTERM', 143],
]) {
  process.on(sig, async () => {
    await cleanup();
    process.exit(code);
  });
}

function report(name, ok, detail = '') {
  if (!ok) failed = true;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? `: ${detail}` : ''}`);
}

let dying = false;
async function fatal(reason) {
  if (dying) return;
  dying = true;
  console.log(`FAIL server/chrome: ${reason}`);
  await cleanup();
  process.exit(1);
}

// Whole-run watchdog: a hung page or socket must not leave Chrome running.
setTimeout(() => void fatal('timed out after 180 s'), 180_000).unref();

async function startBrowser() {
  if (typeof WebSocket !== 'function') return fatal('Node 22+ required');
  try {
    const res = await fetch(URL_);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (e) {
    return fatal(`${URL_} not reachable (${e.message})`);
  }
  // A stale Chrome on the debugging port would be attached to instead of ours.
  const inUse = await fetch(`http://127.0.0.1:${PORT}/json/version`).then(
    () => true,
    () => false,
  );
  if (inUse) return fatal(`debugging port ${PORT} in use`);
  chrome = spawn(
    CHROME,
    [
      '--headless=new',
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      '--window-size=1600,900',
      '--enable-unsafe-swiftshader',
      '--use-angle=swiftshader',
      '--mute-audio',
    ],
    { stdio: 'ignore' },
  );
  chrome.on(
    'error',
    (e) => void fatal(`chrome failed to start (${e.message})`),
  );
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const targets = await (
        await fetch(`http://127.0.0.1:${PORT}/json/list`)
      ).json();
      const page = targets.find((t) => t.type === 'page');
      if (page) return page.webSocketDebuggerUrl;
    } catch {
      /* not up yet */
    }
    await sleep(250);
  }
  return fatal('chrome did not start within 10 s');
}

const wsUrl = await startBrowser();
let id = 0;
const pending = new Map();
const rejectAll = (reason) => {
  for (const [, p] of pending) p.reject(new Error(reason));
  pending.clear();
};
const send = (method, params = {}) =>
  new Promise((resolve, reject) => {
    const i = ++id;
    pending.set(i, { resolve, reject });
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expr) => {
  const r = await send('Runtime.evaluate', {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.error) throw new Error(r.error.message);
  if (r.result.exceptionDetails)
    throw new Error(JSON.stringify(r.result.exceptionDetails));
  return r.result.result.value;
};
const mouse = (type, x, y, extra = {}) =>
  send('Input.dispatchMouseEvent', { type, x, y, ...extra });

async function click(x, y, button = 'left', modifiers = 0) {
  const bits = button === 'right' ? 2 : 1;
  await mouse('mouseMoved', x, y, { modifiers });
  await mouse('mousePressed', x, y, {
    button,
    buttons: bits,
    clickCount: 1,
    modifiers,
  });
  await mouse('mouseReleased', x, y, {
    button,
    buttons: 0,
    clickCount: 1,
    modifiers,
  });
  await sleep(400);
}

async function drag(x0, y0, x1, y1) {
  await mouse('mouseMoved', x0, y0);
  await mouse('mousePressed', x0, y0, {
    button: 'left',
    buttons: 1,
    clickCount: 1,
  });
  for (let i = 1; i <= 8; i++) {
    await mouse(
      'mouseMoved',
      x0 + ((x1 - x0) * i) / 8,
      y0 + ((y1 - y0) * i) / 8,
      { button: 'left', buttons: 1 },
    );
    await sleep(60);
  }
  await mouse('mouseReleased', x1, y1, {
    button: 'left',
    buttons: 0,
    clickCount: 1,
  });
  await sleep(500);
}

const GAME = `window.__game.scene.getScene('GameScene')`;
const selected = () =>
  ev(
    `${GAME}.world.entities.filter(e=>e.selectable?.selected).map(e=>e.unit?.unitType??e.building?.type)`,
  );
const selectedPaths = () =>
  ev(
    `${GAME}.world.entities.filter(e=>e.selectable?.selected).map(e=>e.movable?.path?.length??0)`,
  );
// Stops every unit through the game's own order helper (world.removeComponent keeps Miniplex's
// query indexes right; a bare `delete` would leave the entity in the moveIntent query).
const clearPaths = () =>
  ev(
    `(async()=>{const {clearUnitOrders}=await import('/src/ecs/orders.ts');const g=${GAME};
    for(const e of [...g.world.entities]){if(!e.movable)continue;clearUnitOrders(g.world,e);e.movable.path=[];e.movable.progress=0;}
    return 1})()`,
  );
const selectedEntities = () =>
  ev(
    `${GAME}.world.entities.filter(e=>e.selectable?.selected).map(e=>({type:e.unit?.unitType??e.building?.type,owner:e.owner?.playerId}))`,
  );

try {
  ws = new WebSocket(wsUrl);
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && pending.has(d.id)) {
      pending.get(d.id).resolve(d);
      pending.delete(d.id);
    }
  };
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = () => reject(new Error('devtools socket error'));
  });
  ws.onerror = () => rejectAll('devtools socket error');
  ws.onclose = () => rejectAll('devtools socket closed');
  await send('Page.navigate', { url: URL_ });
  await sleep(9000);
  await ev(
    `window.__game.scene.getScene('MainMenuScene').scene.launch('GameSetupScene'); 1`,
  );
  await sleep(1500);
  await ev(
    `(()=>{const s=window.__game.scene.getScene('GameSetupScene'); s.beginLoading({...s.config, template:'meadow', mapSize:'small', aiCount:1, difficulty:'easy', civ:'hungarian', aiCivs:'hungarian', seed:3, victory:'conquest'}); return 1})()`,
  );
  let ready = false;
  for (let i = 0; i < 120 && !ready; i++) {
    await sleep(1000);
    ready = await ev(`!!${GAME}?.runner`);
  }
  if (!ready) throw new Error('match did not load within 120 s');
  await sleep(3000);

  const villagerPoints = () =>
    ev(`(async()=>{const {tileToScreen}=await import('/src/iso/coordinates.ts');const g=${GAME};const cam=g.cameras.main;const c=window.__game.canvas.getBoundingClientRect();const k=c.width/window.__game.canvas.width;
    const vs=g.world.entities.filter(e=>e.unit?.unitType==='villager'&&e.owner?.playerId===1);
    const pts=vs.map(e=>{const s=tileToScreen(e.position);return {x:c.left+(s.sx-cam.worldView.x)*cam.zoom*k,y:c.top+(s.sy-cam.worldView.y)*cam.zoom*k}});
    return {n:vs.length,pts}})()`);
  const bounds = (pts) => {
    const xs = pts.map((p) => p.x);
    const ys = pts.map((p) => p.y);
    return {
      x0: Math.min(...xs) - 40,
      y0: Math.min(...ys) - 60,
      x1: Math.max(...xs) + 40,
      y1: Math.max(...ys) + 30,
    };
  };
  const info = await villagerPoints();
  let { x0, y0, x1, y1 } = bounds(info.pts);
  // A verified free target: passable, unblocked grass with no entity within 1.5 tiles, on
  // screen and outside the villagers' drag box, searched in rings around the villagers.
  const empty = await ev(`(async()=>{const {tileToScreen}=await import('/src/iso/coordinates.ts');const g=${GAME};const map=g.mapData;const cam=g.cameras.main;
    const c=window.__game.canvas.getBoundingClientRect();const k=c.width/window.__game.canvas.width;
    const toClient=(t)=>{const s=tileToScreen(t);return {x:c.left+(s.sx-cam.worldView.x)*cam.zoom*k,y:c.top+(s.sy-cam.worldView.y)*cam.zoom*k}};
    const vs=g.world.entities.filter(e=>e.unit?.unitType==='villager'&&e.owner?.playerId===1);
    const cx=Math.round(vs.reduce((a,e)=>a+e.position.tx,0)/vs.length), cy=Math.round(vs.reduce((a,e)=>a+e.position.ty,0)/vs.length);
    const box=${JSON.stringify({ x0, y0, x1, y1 })};
    const near=(tx,ty)=>g.world.entities.some(e=>e.position&&Math.abs(e.position.tx-(tx+0.5))<1.5&&Math.abs(e.position.ty-(ty+0.5))<1.5);
    for(let r=4;r<=12;r++)for(let dy=-r;dy<=r;dy++)for(let dx=-r;dx<=r;dx++){
      if(Math.max(Math.abs(dx),Math.abs(dy))!==r)continue;const tx=cx+dx,ty=cy+dy;
      if(!map.isBuildable(tx,ty)||!map.isBuildable(tx-1,ty)||!map.isBuildable(tx,ty-1)||near(tx,ty))continue;
      const p=toClient({tx:tx+0.5,ty:ty+0.5});
      if(p.x<c.left+40||p.x>c.right-40||p.y<c.top+80||p.y>c.bottom-160)continue;
      if(p.x>box.x0-20&&p.x<box.x1+20&&p.y>box.y0-20&&p.y<box.y1+20)continue;
      return {x:p.x,y:p.y,tx,ty};
    }
    return null})()`);
  if (!empty) throw new Error('no free grass tile near the villagers');

  // 1. Drag a box around the villagers.
  await drag(x0, y0, x1, y1);
  let sel = await selected();
  report(
    'drag-select',
    info.n === 3 && sel.length === 3 && sel.every((t) => t === 'villager'),
    `${sel.length} of ${info.n} villagers selected`,
  );

  // 2. Right-click on empty ground sets paths.
  await click(empty.x, empty.y, 'right');
  let paths = await selectedPaths();
  report(
    'right-click move',
    paths.length > 0 && paths.every((n) => n > 0),
    `path lengths ${JSON.stringify(paths)}`,
  );

  // 3. Single click on one villager.
  await clearPaths();
  // Villagers wander after the right-click: re-read where they are now.
  const now3 = await villagerPoints();
  const p = now3.pts[0];
  await click(p.x, p.y - 10);
  const picked = await selectedEntities();
  report(
    'click-select',
    picked.length === 1 &&
      picked[0].type === 'villager' &&
      picked[0].owner === 1,
    `selected ${JSON.stringify(picked)}`,
  );

  // 4. Re-select all, then Ctrl+click (default command gesture) on empty ground.
  ({ x0, y0, x1, y1 } = bounds((await villagerPoints()).pts));
  await drag(x0, y0, x1, y1);
  const before = (await selected()).length;
  await click(empty.x, empty.y, 'left', CTRL);
  paths = await selectedPaths();
  const after = (await selected()).length;
  report(
    'ctrl-click move',
    before === 3 &&
      after === before &&
      paths.length > 0 &&
      paths.every((n) => n > 0),
    `selected ${before} -> ${after}, path lengths ${JSON.stringify(paths)}`,
  );

  // 5. Plain left click on empty grass deselects.
  await click(empty.x, empty.y);
  sel = await selected();
  report(
    'click-empty deselects',
    sel.length === 0,
    `${sel.length} still selected`,
  );
} catch (e) {
  report('run', false, e.message);
} finally {
  await cleanup();
}
process.exit(failed ? 1 : 0);
