import type { IsoPainter } from '../../isoPainter';
import { shade } from '../../palette';
import { R } from '../facade';
import { logBox } from '../kits/logWall';
import { turfRoof } from '../kits/turfRoof';
import { lantern, logPile, post } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { flagstaff, nDoor, nordic, nWindow, type Block } from './nordicParts';
import { stoneStack } from './nordicProps';
import { bench, birch, jetty, pond, reeds, rowboat, steamWisp, whisks, woodshed } from './saunaParts';

/*
 * Finnish landmark (M17): the Szauna, a lakeside log sauna. A low log
 * cabin on a granite footing, its stone stove venting through a stack
 * of boulders over the ridge, stands on the shore of a pond: a plank
 * deck before the steaming door runs out into the water as a jetty with
 * a ladder. Birch whisks (vihta) hang on the wall over the bench and its
 * bucket, firewood fills an open woodshed and a pile by the path, a
 * rowboat lies by the jetty and birches lean over the water.
 * The Középkor sauna is an old smoke sauna under rounded turf, the
 * Felvilágosodás one wears the age's red-painted logs under shingles.
 */

const SAUNA: Block = [0.3, 0.36, 1.66, 1.36];
const WALL = 44;
const TURF = 0x6f8a3e;

function cabin(p: IsoPainter, s: ArchStyle): number {
  const c = s.palette;
  const [u0, v0, u1, v1] = SAUNA;
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, 6, { color: c.stone, detail: 'fieldstone' }, c.stone);
  logBox(p, u0, v0, u1, v1, 6, 6 + WALL, c.darkWood, 0.07);
  const top = 6 + WALL;
  p.leftFace(u0, u1, v1, 6, (w, h) => {
    nWindow(p, s, w * 0.62, -h + 17, 9, 7, 1);
    whisks(p.ctx, w * 0.18, -h + 8, 3, 1);
  }, WALL);
  p.rightFace(v0, v1, u1, 6, (w) => {
    nDoor(p, s, w * 0.36, 12, 25, c.doors.main, R);
  }, WALL);
  const half = (v1 - v0) / 2;
  if (nordic(s).roofs === 'shingle' || nordic(s).roofs === 'turf') {
    return turfRoof(p, u0, v0, u1, v1, top, Math.round(46 * half), 'u', { turf: TURF, gable: c.darkWood, bark: c.trim, overhang: 0.1 });
  }
  const prev = p.material;
  p.material = 'shingle';
  const rise = Math.round(80 * half);
  p.gableRoof(u0, v0, u1, v1, top, rise, c.roof, c.darkWood, 'u', 0.1);
  p.material = prev;
  return top + rise;
}

function paintSauna(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x7f8a52);
  p.ground(0.2, 0.2, 1.75, 1.6, 0x8a7d5c);
  pond(p, 2.08, 2.15, 0.74, 0.68);
  reeds(p, 1.42, 2.3);
  reeds(p, 2.7, 1.52, 6);
  birch(p, 2.58, 0.4, 92);
  birch(p, 2.08, 0.24, 78);
  birch(p, 2.78, 0.98, 70);
  const ridge = cabin(p, s);
  stoneStack(p, s, 0.72, (SAUNA[1] + SAUNA[3]) / 2, ridge - 8, 22, 0.1);
  // Steam from the half-open door.
  const [dx, dy] = p.p(SAUNA[2] + 0.02, 1.06, 32);
  steamWisp(p.ctx, dx, dy, 26, 8);
  // The deck before the door and the jetty out into the pond.
  p.box(SAUNA[2], 0.74, 2.1, 1.2, 0, 4, { color: c.planks, detail: 'planks' }, shade(c.planks, 1.1));
  rowboat(p, 2.3, 2.3, c.planks);
  jetty(p, 1.84, 2.1, 1.2, 2.55, 5, c.planks);
  post(p, 1.86, 1.22, 4, 30, 1.6, c.timber);
  lantern(p, 1.86, 1.22, 30, 1.9, 1.5);
  bench(p, 0.45, 1.0, 1.5, c.planks);
  woodshed(p, [0.22, 1.72, 0.92, 2.2], 30, c.timber, c.roof);
  logPile(p, 1.2, 1.92, 6, 0x7a5434, 0xd9b88a);
  flagstaff(p, 1.15, 2.6, 0, 84, team);
  birch(p, 0.36, 2.66, 80);
}

/** The Finnish landmark: the lakeside Szauna, in the age style's palette. */
export function saunaArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 170 + s.headroom, paint: (p, team) => paintSauna(p, s, team) };
}
