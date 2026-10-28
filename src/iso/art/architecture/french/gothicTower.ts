import { TOWER_PLATFORM_Z } from '../../../../config/visual';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { drumWall } from '../kits/drum';
import { pepperpot } from '../kits/pepperpot';
import { post } from '../parts';
import type { ArchStyle } from '../style';
import { disc, lookout, ringBack } from '../towerParts';
import type { BuildingArt } from '../types';

/*
 * French age-2 tower: a round tuffeau tower on a battered foot with
 * arrow loops, a corbelled machicolation under the fighting platform,
 * and a candle-snuffer slate cone on posts over the archer.
 */

const R0 = 0.4;

function paintGothicTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const stone = c.ashlar;
  const z = TOWER_PLATFORM_Z[2];
  const ctx = p.ctx;
  p.footShadow();
  drumWall(p, 0.5, 0.5, R0 + 0.06, 0, 18, shade(stone, 0.86), 'ashlar');
  drumWall(p, 0.5, 0.5, R0, 18, z - 16, stone, 'ashlar');
  drumWall(p, 0.5, 0.5, R0 + 0.01, 64, 67, shade(stone, 1.08), 'ashlar');
  // Cross-shaped arrow loops and the door.
  for (const [a, h] of [[0.5, 46], [1.6, 90], [1.0, 100]] as const) {
    const [x, y] = p.p(0.5 + R0 * Math.cos(a), 0.5 + R0 * Math.sin(a), h);
    ctx.fillStyle = '#1a140f';
    ctx.fillRect(x - 1.2, y - 13, 2.4, 13);
    ctx.fillRect(x - 3.5, y - 8, 7, 1.8);
  }
  const door = p.p(0.5 + R0 * Math.cos(1.3), 0.5 + R0 * Math.sin(1.3), 18);
  ctx.fillStyle = css(shade(stone, 1.1));
  ctx.beginPath();
  ctx.moveTo(door[0] - 7, door[1]);
  ctx.lineTo(door[0] - 7, door[1] - 16);
  ctx.quadraticCurveTo(door[0] - 7, door[1] - 26, door[0], door[1] - 29);
  ctx.quadraticCurveTo(door[0] + 7, door[1] - 26, door[0] + 7, door[1] - 16);
  ctx.lineTo(door[0] + 7, door[1]);
  ctx.fill();
  ctx.fillStyle = css(c.doors.main);
  ctx.fillRect(door[0] - 4.5, door[1] - 18, 9, 18);
  // Machicolation: corbel course and the oversailing parapet drum.
  drumWall(p, 0.5, 0.5, R0 + 0.02, z - 16, z - 12, shade(stone, 0.8), 'ashlar');
  for (let k = 0; k < 11; k++) {
    const a = -Math.PI / 4 + ((k + 0.5) / 11) * Math.PI;
    const [x, y] = p.p(0.5 + (R0 + 0.04) * Math.cos(a), 0.5 + (R0 + 0.04) * Math.sin(a), z - 12);
    ctx.fillStyle = 'rgba(26,20,15,.7)';
    ctx.fillRect(x - 1.4, y, 2.8, 4);
  }
  drumWall(p, 0.5, 0.5, R0 + 0.06, z - 12, z, stone, 'ashlar');
  disc(p, 0.5, 0.5, R0 + 0.05, z, 0x77706a);
  ringBack(p, 0.5, 0.5, R0 + 0.06, z, 10, stone);
  lookout(p, 0.14, 0.86, z, team, 'kettle');
  drumWall(p, 0.5, 0.5, R0 + 0.06, z, z + 10, stone, 'ashlar');
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    if (Math.cos(a) + Math.sin(a) < -0.4) continue;
    post(p, 0.5 + (R0 + 0.02) * Math.cos(a), 0.5 + (R0 + 0.02) * Math.sin(a), z + 10, z + 30, 2.4, c.timber);
  }
  const apex = pepperpot(p, 0.5, 0.5, R0 + 0.1, z + 30, 118, c.roofAlt, shade(stone, 0.92));
  p.flag(0.5, 0.5, apex + 8, 16, team, true);
}

/** The French age-2 tower: round, machicolated, under a tall pepperpot. */
export function gothicTower(s: ArchStyle): BuildingArt {
  return { size: 1, maxHeight: 220 + s.headroom, paint: (p, team) => paintGothicTower(p, s, team) };
}
