import { TOWER_PLATFORM_Z } from '../../../config/visual';
import type { IsoPainter } from '../isoPainter';
import { shade } from '../palette';
import { cornice, crest, quoins, R } from './facade';
import { helm } from './roofs';
import type { ArchStyle } from './style';
import { archer, brazier, parapet, type Headgear } from './towerParts';
import type { BuildingArt } from './types';

/** Platform contents between the parapets: the archer and the fire basket. */
function lookout(p: IsoPainter, u0: number, u1: number, z: number, team: number, hat: Headgear): void {
  p.ground(u0, u0, u1, u1, 0x8c8478, z);
  brazier(p, u0 + 0.2, u1 - 0.18, z, 1.25, 1.35);
  archer(p, u1 - 0.24, u0 + 0.3, z, team, hat);
}

/** Age 1 family (Római kor): dressed-stone watchtower with arched windows and an open crenellated top. */
export function romanTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 200 + s.headroom,
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[1];
      const wall = { color: c.ashlar, detail: 'stone' as const };
      p.footShadow();
      p.box(0.1, 0.1, 0.9, 0.9, 0, 12, { color: shade(c.ashlar, 0.88), detail: 'stone' }, c.ashlar);
      p.box(0.15, 0.15, 0.85, 0.85, 12, z, wall);
      const face = (light: number) => (w: number) => {
        p.window(w / 2 - 4, -z + 34, 8, 15, true);
        p.window(w / 2 - 3.5, -62, 7, 13, true);
        cornice(p.ctx, w, z - 22, c.trim, light, 4);
        if (light === 1) p.door(w / 2 - 6, 12, 22, c.doors.main);
      };
      p.leftFace(0.15, 0.85, 0.85, 12, face(1), z - 12);
      p.rightFace(0.15, 0.85, 0.85, 12, face(R), z - 12);
      // Projecting platform on stone brackets.
      p.box(0.1, 0.1, 0.9, 0.9, z - 6, z, { color: shade(c.ashlar, 1.05) }, c.ashlar);
      parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'back');
      lookout(p, 0.1, 0.9, z, team, 'galea');
      parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'front');
      p.flag(0.16, 0.16, z + 16, 30, team);
    },
  };
}

/** Age 2 family (Középkor): battered fieldstone keep-tower, timber hoarding, stair turret with a roofed cone. */
export function medievalTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 230 + s.headroom,
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[2];
      const wall = { color: c.stone, detail: 'fieldstone' as const };
      p.footShadow();
      p.box(0.08, 0.08, 0.92, 0.92, 0, 18, { color: shade(c.stone, 0.85), detail: 'fieldstone' }, c.stone);
      p.box(0.13, 0.13, 0.87, 0.87, 18, z - 18, wall);
      const slits = (w: number) => {
        p.ctx.fillStyle = '#18120d';
        for (const y of [-40, -80]) {
          p.ctx.fillRect(w / 2 - 1.5, y, 3, 14);
          p.ctx.fillRect(w / 2 - 4, y + 5, 8, 2.5);
        }
      };
      p.leftFace(0.13, 0.87, 0.87, 18, (w) => {
        slits(w);
        p.door(w / 2 - 6, 12, 20, 0x4a2e16);
      }, z - 36);
      p.rightFace(0.13, 0.87, 0.87, 18, slits, z - 36);
      // Timber hoarding (gallery) carrying the fighting platform.
      p.box(0.07, 0.07, 0.93, 0.93, z - 18, z, { color: c.timber, detail: 'planks' }, c.timber);
      const loops = (w: number) => {
        p.ctx.fillStyle = '#140d08';
        for (let x = 5; x < w - 6; x += 12) p.ctx.fillRect(x, -13, 5, 7);
      };
      p.leftFace(0.07, 0.93, 0.93, z - 18, loops, 18);
      p.rightFace(0.07, 0.93, 0.93, z - 18, loops, 18);
      parapet(p, 0.07, 0.07, 0.93, 0.93, z, wall, 'back');
      // Stair turret at the back corner, rising above the platform.
      helm(p, 0.25, 0.25, z, [[0, 0.13], [24, 0.13]], c.stone, false);
      helm(p, 0.25, 0.25, z + 24, [[0, 0.17], [6, 0.15], [30, 0.04], [36, 0.01]], c.roof);
      lookout(p, 0.07, 0.93, z, team, 'kettle');
      parapet(p, 0.07, 0.07, 0.93, 0.93, z, wall, 'front');
      p.flag(0.25, 0.25, z + 60, 18, team);
    },
  };
}

/** Age 3 family (Felvilágosodás): rusticated base, rendered shaft with quoins and a crest, balustraded top. */
export function baroqueTower(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 1,
    maxHeight: 220 + s.headroom,
    paint: (p, team) => {
      const z = TOWER_PLATFORM_Z[3];
      p.footShadow();
      p.box(0.1, 0.1, 0.9, 0.9, 0, 34, { color: c.stone, detail: 'stone' }, c.stone);
      p.box(0.14, 0.14, 0.86, 0.86, 34, z - 8, { color: c.plaster, detail: 'plaster' });
      const face = (light: number, front: boolean) => (w: number, h: number) => {
        if (s.ornaments.quoins) quoins(p.ctx, w, h, c.trim, light);
        p.window(w / 2 - 4.5, -h + 26, 9, 16, true);
        if (front) crest(p.ctx, s, w / 2, -38, 7, team);
        else p.window(w / 2 - 4, -44, 8, 12, true);
      };
      p.leftFace(0.14, 0.86, 0.86, 34, face(1, true), z - 42);
      p.rightFace(0.14, 0.86, 0.86, 34, face(R, false), z - 42);
      p.leftFace(0.1, 0.9, 0.9, 0, (w) => p.door(w / 2 - 6, 12, 24, 0x4a2a14), 34);
      p.box(0.08, 0.08, 0.92, 0.92, z - 8, z, { color: c.trim }, c.trim);
      const trim = { color: c.trim };
      parapet(p, 0.08, 0.08, 0.92, 0.92, z, trim, 'back', 0);
      lookout(p, 0.08, 0.92, z, team, 'tricorn');
      parapet(p, 0.08, 0.08, 0.92, 0.92, z, trim, 'front', 0);
      // Corner urn finial with a verdigris flame.
      helm(p, 0.12, 0.12, z + 16, [[0, 0.04], [5, 0.06], [8, 0.03], [13, 0.005]], c.metal, false);
      p.flag(0.88, 0.12, z + 16, 26, team);
    },
  };
}
