import { TOWER_PLATFORM_Z } from '../../../../../config/visual';
import { css, shade } from '../../../palette';
import { drumWall } from '../../kits/drum';
import type { ArchStyle } from '../../style';
import { disc, lookout, ringBack, towerLine as line } from '../../towerParts';
import type { BuildingArt } from '../../types';

type Pt = readonly [number, number];

/*
 * Georgian-family tower: a round brick Martello tower with a raised
 * door and a gun platform at TOWER_PLATFORM_Z.
 */

/** Age 3: round Martello tower — battered brick drum, stone cordon, raised door and ladder, gun platform. */
export function georgianTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 210,
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[3];
      const ctx = p.ctx;
      p.footShadow();
      // Battered drum: stone footing, brick in three set-back lifts with stone cordons.
      drumWall(p, 0.5, 0.5, 0.49, 0, 16, c.ashlar, 'stone');
      drumWall(p, 0.5, 0.5, 0.47, 16, 54, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.475, 54, 58, c.ashlar, 'stone');
      drumWall(p, 0.5, 0.5, 0.45, 58, 100, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.455, 100, 104, c.ashlar, 'stone');
      drumWall(p, 0.5, 0.5, 0.43, 104, z - 6, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.46, z - 6, z, c.ashlar, 'stone');
      // Raised door on the lit side with a timber ladder; two small windows.
      const door = p.p(0.5 + 0.47 * Math.cos(1.2), 0.5 + 0.47 * Math.sin(1.2), 64);
      ctx.fillStyle = css(c.ashlar);
      ctx.fillRect(door[0] - 7, door[1] - 24, 14, 25);
      ctx.fillStyle = css(c.doors.main);
      ctx.fillRect(door[0] - 5, door[1] - 21, 10, 21);
      // Machicolation box over the door.
      ctx.fillStyle = css(shade(c.ashlar, 0.95));
      ctx.fillRect(door[0] - 9, door[1] - 40, 18, 9);
      ctx.fillStyle = 'rgba(30,22,16,.6)';
      for (const dx of [-6, -1, 4]) ctx.fillRect(door[0] + dx, door[1] - 31, 2.5, 3);
      const ladder: Pt[][] = [];
      for (const dx of [-4, 4]) ladder.push([[door[0] + dx, door[1]], [door[0] + dx + 8, door[1] + 64]]);
      for (const l of ladder) line(p, l[0]!, l[1]!, c.timber, 1.6);
      for (let k = 6; k < 64; k += 7) line(p, [door[0] - 4 + k * 0.125, door[1] + k], [door[0] + 4 + k * 0.125, door[1] + k], c.timber, 1.2);
      p.normals.cylinderStroke(ladder, 2, door[0] - 4, 14);
      for (const a of [0.35, 1.9]) {
        const [wx, wy] = p.p(0.5 + 0.43 * Math.cos(a), 0.5 + 0.43 * Math.sin(a), 124);
        ctx.fillStyle = css(c.ashlar);
        ctx.fillRect(wx - 4, wy - 13, 8, 14);
        const g = ctx.createLinearGradient(0, wy - 11, 0, wy);
        g.addColorStop(0, css(c.window.glassTop));
        g.addColorStop(1, css(c.window.glassBottom));
        ctx.fillStyle = g;
        ctx.fillRect(wx - 2.5, wy - 11, 5, 10);
        p.addGlow(wx, wy - 6, 8);
      }
      // Gun platform: far parapet, the archer and brazier, the near parapet ring.
      disc(p, 0.5, 0.5, 0.46, z, 0x6c6a64);
      ringBack(p, 0.5, 0.5, 0.46, z, 12, c.brick);
      lookout(p, 0.12, 0.88, z, team, 'tricorn');
      // Traversing gun on the platform, its muzzle over the parapet.
      const g0 = p.p(0.45, 0.5, z + 6);
      const g1 = p.p(0.95, 0.62, z + 18);
      line(p, g0, g1, 0x2c2a28, 5);
      line(p, [g0[0], g0[1] - 1.5], [g1[0], g1[1] - 1.5], 0x5a5856, 1.5);
      p.normals.cylinderStroke([[g0, g1]], 5, g0[0], g1[0] - g0[0]);
      drumWall(p, 0.5, 0.5, 0.46, z, z + 12, c.brick, 'brick');
      drumWall(p, 0.5, 0.5, 0.475, z + 12, z + 15, c.ashlar, 'stone');
      p.flag(0.22, 0.3, z + 12, 34, team, true);
    },
  };
}
