import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { crest } from '../facade';
import { lantern, logPile } from '../parts';
import type { ArchStyle } from '../style';
import type { WonderArt } from '../types';
import { WONDER_STAGES } from '../wonder';
import { crane, scaffold } from '../wonderParts';
import { belfry } from './nordicBelfry';
import { nDoor, wallBlock, type Block } from './nordicParts';
import { arm, ARM_WALL, CHURCH_LOG, crossing, type RoofState } from './petajavesiParts';

/*
 * The Finnish Wonder: the Petäjävesi church. A cross plan of unpainted
 * log arms under very steep shingled gables meets at an octagonal log
 * drum, whose steep shingled tent breaks into a small lantern with a
 * bell cap and a cross; a boarded bell tower stands apart by the gate.
 * Stages: stone footings of the cross with log piles; the log walls
 * risen halfway inside scaffolding; full walls under bare board roofs,
 * the drum scaffolded and waiting for its tent, the bell tower's lower
 * stage only, no window lit. The finished art adds the shingles, the
 * tent and lantern, the belfry and the lit windows.
 */

const Z0 = 8;
const C = 2.0;
const HALF = 0.45;
const NEAR = C - HALF;
const FAR = C + HALF;
const BELL: Block = [0.32, 2.78, 0.9, 3.36];

/** Stone footing of the whole cross. */
function footings(p: IsoPainter, s: ArchStyle): void {
  const stone = { color: s.palette.stone, detail: 'fieldstone' as const };
  p.box(0.48, NEAR - 0.02, 3.52, FAR + 0.02, 0, Z0, stone, s.palette.stone);
  p.box(NEAR - 0.02, 0.48, FAR + 0.02, NEAR, 0, Z0, stone, s.palette.stone);
  p.box(NEAR - 0.02, FAR, FAR + 0.02, 3.52, 0, Z0, stone, s.palette.stone);
}

function paintChurch(p: IsoPainter, s: ArchStyle, team: number | null, stage: number): void {
  const done = stage > WONDER_STAGES;
  p.footShadow();
  p.ground(0.05, 0.05, 3.95, 3.95, 0x8c8266);
  footings(p, s);
  if (stage === 1) {
    logPile(p, 0.7, 3.4, 9, shade(CHURCH_LOG, 0.95), 0xd9b88a);
    logPile(p, 3.0, 0.7, 7, shade(CHURCH_LOG, 0.95), 0xd9b88a);
    crane(p, 0.6, 0.6, 120, C, C, 40);
    return;
  }
  const wall = stage === 2 ? Z0 + 34 : ARM_WALL;
  const roof: RoofState = stage === 2 ? 'none' : done ? 'shingled' : 'bare';
  const lit = done;
  // Back arms, the crossing, then the front arms.
  arm(p, s, [0.5, NEAR, NEAR, FAR], Z0, 'u', { wall, roof, lit, left: [0.3, 0.7] });
  arm(p, s, [NEAR, 0.5, FAR, NEAR], Z0, 'v', { wall, roof, lit });
  if (stage >= 3) {
    const top = crossing(p, C, C, 0.52, 130, 196, done, lit);
    if (!done) scaffold(p, C - 0.52, C - 0.52, C + 0.52, C + 0.52, 130, top + 20);
  }
  arm(p, s, [FAR, NEAR, 3.5, FAR], Z0, 'u', { wall, roof, lit, left: [0.35, 0.72], right: [0.5] });
  arm(p, s, [NEAR, FAR, FAR, 3.5], Z0, 'v', { wall, roof, lit, left: [], right: [0.3, 0.7] });
  if (stage >= 3) {
    p.leftFace(NEAR, FAR, 3.5, Z0, (w) => {
      nDoor(p, s, w / 2 - 8, 16, 28, s.palette.doors.main, 1);
      if (team !== null) crest(p.ctx, s, w / 2, -38, 6, team);
    }, ARM_WALL - Z0);
  }
  if (!done) {
    scaffold(p, NEAR, FAR, FAR, 3.5, Z0, wall + 10);
    if (stage === 2) scaffold(p, FAR, NEAR, 3.5, FAR, Z0, wall + 10);
    crane(p, 0.6, 0.6, stage === 2 ? 170 : 230, C, C, wall + 40);
    // The bell tower's lower stage waits for its belfry.
    if (stage === 3) wallBlock(p, s, BELL, 0, 64, undefined, undefined, 0.05);
    return;
  }
  const top = belfry(p, s, BELL, 0, { lower: 64, upper: 34, face: (w) => nDoor(p, s, w / 2 - 6, 12, 22, s.palette.doors.main, 1) });
  if (team !== null) p.flag(0.4, 2.82, top - 46, 30, team, true);
  lantern(p, 2.6, 3.62, 24, 2.6, 3.85);
}

/** The Finnish Wonder (age-3 style): the Petäjävesi church, finished in the team colour, or a construction stage. */
export function petajavesi(s: ArchStyle): WonderArt {
  return {
    size: 4,
    maxHeight: 400,
    paint: (p, team) => paintChurch(p, s, team, WONDER_STAGES + 1),
    // No team colour shows while it is being built.
    paintStage: (p, stage) => paintChurch(p, s, null, stage),
  };
}
