import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css } from '../../palette';
import { disc, lookout, ringBack } from '../english/englishTowers';
import { drumWall } from '../english/roundhouse';
import { needleSpire } from '../kits/needleSpire';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';

/*
 * German age-3 tower (overrides the Georgian family's Martello tower in
 * the kaiserdom family): a round town-wall tower (Wehrturm) — brick
 * drum on a stone footing with stone bands, a corbelled fighting gallery
 * whose posts carry a tall octagonal tiled helm over the archer.
 */

function paintWehrturm(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const z = TOWER_PLATFORM_Z[3];
  p.footShadow();
  drumWall(p, 0.5, 0.5, 0.46, 0, 16, c.ashlar, 'stone');
  drumWall(p, 0.5, 0.5, 0.43, 16, 70, c.brick, 'brick');
  drumWall(p, 0.5, 0.5, 0.44, 70, 74, c.ashlar, 'stone');
  drumWall(p, 0.5, 0.5, 0.43, 74, z - 16, c.brick, 'brick');
  // Corbel course and the overhanging gallery storey.
  drumWall(p, 0.5, 0.5, 0.47, z - 16, z - 12, c.ashlar, 'stone');
  drumWall(p, 0.5, 0.5, 0.48, z - 12, z, c.brick, 'brick');
  const ctx = p.ctx;
  const door = p.p(0.5 + 0.43 * Math.cos(1.25), 0.5 + 0.43 * Math.sin(1.25), 0);
  ctx.fillStyle = css(c.ashlar);
  ctx.fillRect(door[0] - 7, door[1] - 25, 14, 25);
  ctx.fillStyle = css(c.doors.main);
  ctx.fillRect(door[0] - 5, door[1] - 22, 10, 22);
  for (const [a, h] of [[0.4, 52], [1.9, 98], [1.1, 110]] as const) {
    const [wx, wy] = p.p(0.5 + 0.43 * Math.cos(a), 0.5 + 0.43 * Math.sin(a), h);
    ctx.fillStyle = '#1a110c';
    ctx.fillRect(wx - 1.3, wy - 11, 2.6, 11);
  }
  disc(p, 0.5, 0.5, 0.48, z, 0x6c6a64);
  ringBack(p, 0.5, 0.5, 0.48, z, 8, c.brick);
  lookout(p, 0.12, 0.88, z, team, 'tricorn');
  drumWall(p, 0.5, 0.5, 0.48, z, z + 8, c.brick, 'brick');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    if (Math.cos(a) + Math.sin(a) < -0.4) continue;
    post(p, 0.5 + 0.44 * Math.cos(a), 0.5 + 0.44 * Math.sin(a), z + 8, z + 30, 2.2, c.timber);
  }
  needleSpire(p, 0.5, 0.5, 0.5, z + 30, 104, c.roof, 'tile');
  p.flag(0.9, 0.62, z + 8, 26, team, true);
}

/** The German age-3 tower: a Wehrturm with a tall tiled needle helm. */
export function wehrturm(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 210 + 120, paint: (p, team) => paintWehrturm(p, s, team) };
}
