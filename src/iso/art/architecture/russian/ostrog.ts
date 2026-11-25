import type { IsoPainter } from '../../isoPainter';
import { css, mix, shade } from '../../palette';
import { R } from '../facade';
import { onionDome } from '../kits/onionDome';
import { octPrism, tentRoof } from '../kits/tentRoof';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { wellHouse } from './hillfort';
import { logStack } from './izbaProps';
import { finialPole, izbaWindow, logBlock, logTown, oblam, plankGable, stakeRow, stoneBlock, TOWER_ONION, type Block } from './izbaParts';

/*
 * Russian landmark (M17): the Osztrog, a log fortress of the Siberian
 * frontier after the ostrogs of Yakutsk, Bratsk and Ilimsk. A ring of
 * tall sharpened stakes (tyn) closes the yard; in its back corner rises
 * the great watchtower — a log shaft, an overhanging fighting gallery
 * (oblam), an octagon and a tall timber tent roof (shatyor) flying the
 * owner's flag. A gate tower with an overhanging gallery and its own
 * tent breaks the front, a smaller corner tower holds the front corner,
 * and inside stand the voevoda's log blockhouse, a well-house and a log
 * stack. The Muscovy age gives the gate a white-stone storey and an
 * onion; the Petrine one keeps it all timber under painted roofs.
 */

const TOWER: Block = [0.24, 0.24, 0.9, 0.9];
const GATE: Block = [1.12, 2.42, 1.78, 2.92];
const CORNER: Block = [2.4, 2.4, 2.9, 2.9];
const HOUSE: Block = [1.45, 0.5, 2.6, 1.3];
const WALL = 34;
const TOWER_TOP = 118;

/** Tent cover: the age's shingle, or the Petrine painted plank green. */
const tentColor = (s: ArchStyle): number => (logTown(s).tents ? s.palette.roofAlt : s.palette.roof);

function slit(p: IsoPainter, w: number, y: number, xs: readonly number[]): void {
  p.ctx.fillStyle = '#17110b';
  for (const x of xs) p.ctx.fillRect(w * x - 1.5, y, 3, 11);
}

function watchtower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  logBlock(p, s, TOWER, 0, TOWER_TOP, (w, h) => {
    slit(p, w, -h + 22, [0.3, 0.7]);
    slit(p, w, -h + 64, [0.5]);
  }, (w, h) => {
    slit(p, w, -h + 22, [0.5]);
    slit(p, w, -h + 64, [0.3, 0.7]);
  }, 0.07);
  const g = oblam(p, s, TOWER, TOWER_TOP, 20, 0.09);
  const prev = p.material;
  p.material = 'shingle';
  p.hipRoof(g[0], g[1], g[2], g[3], TOWER_TOP + 20, 10, tentColor(s), 0.05);
  p.material = prev;
  const uc = (TOWER[0] + TOWER[2]) / 2;
  const vc = (TOWER[1] + TOWER[3]) / 2;
  const z = TOWER_TOP + 26;
  // The lookout octagon: open arches for the watch.
  octPrism(p, uc, vc, 0.27, z, z + 20, c.darkWood, 'logs', (w, h, light) => {
    p.ctx.fillStyle = css(shade(0x1b140e, light));
    p.ctx.fillRect(w / 2 - w * 0.22, -h + 4, w * 0.44, h - 8);
  });
  const apex = tentRoof(p, uc, vc, 0.27, z + 20, 92, tentColor(s), { material: 'shingle', eave: 0.06, ribs: shade(c.board, 1.05), lights: true });
  finialPole(p, uc, vc, apex - 2);
  p.flag(uc, vc, apex + 6, 30, team, true);
}

function blockhouse(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  p.box(HOUSE[0] - 0.02, HOUSE[1] - 0.02, HOUSE[2] + 0.02, HOUSE[3] + 0.02, 0, 6, { color: c.stone, detail: 'fieldstone' }, c.stone);
  logBlock(p, s, HOUSE, 6, 48, (w, h) => {
    for (const x of [0.56, 0.8]) izbaWindow(p, s, w * x - 4, -h + 15, 8, 10, 1);
  }, (w, h) => {
    izbaWindow(p, s, w * 0.3 - 4, -h + 15, 8, 10, R);
    p.door(w * 0.62, 12, 24, c.doors.main);
  });
  plankGable(p, s, HOUSE, 48, 34, 'u', { window: true });
}

/** A square log tower with a gallery and a tent or hip: the gate (with its passage) or the corner tower. */
function sideTower(p: IsoPainter, s: ArchStyle, b: Block, h: number, team: number, gate: boolean): void {
  const c = s.palette;
  const k = logTown(s);
  const stone = gate && k.masonry === 'whiteStone' ? 50 : 0;
  const passage = (w: number) => {
    const ctx = p.ctx;
    ctx.fillStyle = '#1a120c';
    ctx.fillRect(w / 2 - 11, -30, 22, 30);
    ctx.fillStyle = css(c.doors.gate);
    ctx.fillRect(w / 2 - 11, -28, 6, 28);
    ctx.fillRect(w / 2 + 5, -28, 6, 28);
    // The icon over the gate in a team-coloured frame.
    ctx.fillStyle = css(team);
    ctx.fillRect(w / 2 - 6, -46, 12, 13);
    ctx.fillStyle = '#e8c86a';
    ctx.fillRect(w / 2 - 4, -44, 8, 9);
    ctx.fillStyle = '#5a3a24';
    ctx.beginPath();
    ctx.arc(w / 2, -41.5, 2.2, 0, Math.PI * 2);
    ctx.fill();
  };
  if (stone) {
    stoneBlock(p, s, b, 0, stone, gate ? passage : undefined);
    logBlock(p, s, b, stone, h, undefined, (w, hh) => slit(p, w, -hh + 14, [0.5]), 0.06);
  } else {
    logBlock(p, s, b, 0, h, (w, hh) => {
      if (gate) passage(w);
      slit(p, w, -hh + 14, gate ? [0.2, 0.8] : [0.5]);
    }, (w, hh) => slit(p, w, -hh + 14, [0.5]), 0.06);
  }
  const g = oblam(p, s, b, h, 16, 0.07);
  const uc = (b[0] + b[2]) / 2;
  const vc = (b[1] + b[3]) / 2;
  if (gate) {
    const prev = p.material;
    p.material = 'shingle';
    p.hipRoof(g[0], g[1], g[2], g[3], h + 16, 8, tentColor(s), 0.05);
    p.material = prev;
    let top = tentRoof(p, uc, vc, 0.22, h + 22, 54, tentColor(s), { material: 'shingle', eave: 0.06, ribs: shade(c.board, 1.05) });
    if (k.onions) top = onionDome(p, uc, vc, TOWER_ONION * 0.85, top - 5, { color: c.metal });
    else finialPole(p, uc, vc, top - 2);
    p.addVolumePoint(uc, vc, top);
  } else {
    const prev = p.material;
    p.material = 'shingle';
    p.hipRoof(g[0], g[1], g[2], g[3], h + 16, 30, tentColor(s), 0.06);
    p.material = prev;
    finialPole(p, uc, vc, h + 46);
    p.flag(uc, vc, h + 46, 18, team);
  }
}

function paintOstrog(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const logs = c.darkWood;
  const earth = mix(0x7d6646, c.stone, 0.25);
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, shade(earth, 0.85));
  p.ground(0.22, 0.22, 2.78, 2.78, earth);
  // The back stretches of the stake ring.
  stakeRow(p, 0.9, 0.17, 2.85, 0.17, 0, WALL, logs);
  stakeRow(p, 0.17, 0.9, 0.17, 2.85, 0, WALL, logs);
  watchtower(p, s, team);
  blockhouse(p, s);
  logStack(p, s, 0.55, 1.35, 0.95, 1.6, 18);
  wellHouse(p, s, 0.8, 1.95);
  // The front stretches, the gate tower in the front one, the corner tower last.
  stakeRow(p, 0.2, 2.83, 1.12, 2.83, 0, WALL, logs);
  sideTower(p, s, GATE, 72, team, true);
  stakeRow(p, 2.83, 0.2, 2.83, 2.4, 0, WALL, logs);
  stakeRow(p, 1.78, 2.83, 2.4, 2.83, 0, WALL, logs);
  sideTower(p, s, CORNER, 56, team, false);
}

/** The Russian landmark: the Osztrog log fortress, in the age style's palette. */
export function ostrogArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: TOWER_TOP + 26 + 20 + 92 + 50 + s.headroom, paint: (p, team) => paintOstrog(p, s, team) };
}
