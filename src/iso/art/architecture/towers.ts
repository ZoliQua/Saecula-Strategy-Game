import { TOWER_PLATFORM_Z } from '../../../config/visual';
import type { AgeId } from '../../../types';
import type { IsoPainter } from '../isoPainter';
import { shade } from '../palette';
import { OCHRE, PLINTH, VERDIGRIS, WHITE_TRIM } from './baroqueParts';
import { cornice, crest, quoins } from './facade';
import { FIELD, OAK, R, SHINGLE } from './medievalPalette';
import { helm } from './roofs';
import { archer, brazier, parapet, type Headgear } from './towerParts';
import type { BuildingArt } from './types';

const TRAVERTINE = 0xc9bea6;

/** Platform contents between the parapets: the archer and the fire basket. */
function lookout(p: IsoPainter, u0: number, u1: number, z: number, team: number, hat: Headgear): void {
  p.ground(u0, u0, u1, u1, 0x8c8478, z);
  brazier(p, u0 + 0.2, u1 - 0.18, z, 1.25, 1.35);
  archer(p, u1 - 0.24, u0 + 0.3, z, team, hat);
}

/** Age 1 (Római kor): travertine watchtower with arched windows and an open crenellated top. */
const ROMAN_TOWER: BuildingArt = {
  size: 1,
  maxHeight: 200,
  paint: (p, team) => {
    const z = TOWER_PLATFORM_Z[1];
    const wall = { color: TRAVERTINE, detail: 'stone' as const };
    p.footShadow();
    p.box(0.1, 0.1, 0.9, 0.9, 0, 12, { color: shade(TRAVERTINE, 0.88), detail: 'stone' }, TRAVERTINE);
    p.box(0.15, 0.15, 0.85, 0.85, 12, z, wall);
    const face = (light: number) => (w: number) => {
      p.window(w / 2 - 4, -z + 34, 8, 15, true);
      p.window(w / 2 - 3.5, -62, 7, 13, true);
      cornice(p.ctx, w, z - 22, WHITE_TRIM, light, 4);
      if (light === 1) p.door(w / 2 - 6, 12, 22, 0x5a3518);
    };
    p.leftFace(0.15, 0.85, 0.85, 12, face(1), z - 12);
    p.rightFace(0.15, 0.85, 0.85, 12, face(R), z - 12);
    // Projecting platform on stone brackets.
    p.box(0.1, 0.1, 0.9, 0.9, z - 6, z, { color: shade(TRAVERTINE, 1.05) }, TRAVERTINE);
    parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'back');
    lookout(p, 0.1, 0.9, z, team, 'galea');
    parapet(p, 0.1, 0.1, 0.9, 0.9, z, wall, 'front');
    p.flag(0.16, 0.16, z + 16, 30, team);
  },
};

/** Age 2 (Középkor): battered fieldstone keep-tower, timber hoarding, stair turret with a shingle cone. */
const MEDIEVAL_TOWER: BuildingArt = {
  size: 1,
  maxHeight: 230,
  paint: (p, team) => {
    const z = TOWER_PLATFORM_Z[2];
    const wall = { color: FIELD, detail: 'fieldstone' as const };
    p.footShadow();
    p.box(0.08, 0.08, 0.92, 0.92, 0, 18, { color: shade(FIELD, 0.85), detail: 'fieldstone' }, FIELD);
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
    p.box(0.07, 0.07, 0.93, 0.93, z - 18, z, { color: OAK, detail: 'planks' }, OAK);
    const loops = (w: number) => {
      p.ctx.fillStyle = '#140d08';
      for (let x = 5; x < w - 6; x += 12) p.ctx.fillRect(x, -13, 5, 7);
    };
    p.leftFace(0.07, 0.93, 0.93, z - 18, loops, 18);
    p.rightFace(0.07, 0.93, 0.93, z - 18, loops, 18);
    parapet(p, 0.07, 0.07, 0.93, 0.93, z, wall, 'back');
    // Stair turret at the back corner, rising above the platform.
    helm(p, 0.25, 0.25, z, [[0, 0.13], [24, 0.13]], FIELD, false);
    helm(p, 0.25, 0.25, z + 24, [[0, 0.17], [6, 0.15], [30, 0.04], [36, 0.01]], SHINGLE);
    lookout(p, 0.07, 0.93, z, team, 'kettle');
    parapet(p, 0.07, 0.07, 0.93, 0.93, z, wall, 'front');
    p.flag(0.25, 0.25, z + 60, 18, team);
  },
};

/** Age 3 (Felvilágosodás): rusticated base, ochre shaft with quoins and a crest, balustraded top. */
const BAROQUE_TOWER: BuildingArt = {
  size: 1,
  maxHeight: 220,
  paint: (p, team) => {
    const z = TOWER_PLATFORM_Z[3];
    p.footShadow();
    p.box(0.1, 0.1, 0.9, 0.9, 0, 34, { color: PLINTH, detail: 'stone' }, PLINTH);
    p.box(0.14, 0.14, 0.86, 0.86, 34, z - 8, { color: OCHRE, detail: 'plaster' });
    const face = (light: number, front: boolean) => (w: number, h: number) => {
      quoins(p.ctx, w, h, WHITE_TRIM, light);
      p.window(w / 2 - 4.5, -h + 26, 9, 16, true);
      if (front) crest(p.ctx, w / 2, -38, 7, team);
      else p.window(w / 2 - 4, -44, 8, 12, true);
    };
    p.leftFace(0.14, 0.86, 0.86, 34, face(1, true), z - 42);
    p.rightFace(0.14, 0.86, 0.86, 34, face(R, false), z - 42);
    p.leftFace(0.1, 0.9, 0.9, 0, (w) => p.door(w / 2 - 6, 12, 24, 0x4a2a14), 34);
    p.box(0.08, 0.08, 0.92, 0.92, z - 8, z, { color: WHITE_TRIM }, WHITE_TRIM);
    const trim = { color: WHITE_TRIM };
    parapet(p, 0.08, 0.08, 0.92, 0.92, z, trim, 'back', 0);
    lookout(p, 0.08, 0.92, z, team, 'tricorn');
    parapet(p, 0.08, 0.08, 0.92, 0.92, z, trim, 'front', 0);
    // Corner urn finial with a verdigris flame.
    helm(p, 0.12, 0.12, z + 16, [[0, 0.04], [5, 0.06], [8, 0.03], [13, 0.005]], VERDIGRIS, false);
    p.flag(0.88, 0.12, z + 16, 26, team);
  },
};

/** Tower art per age style. */
export const TOWER_ART: Record<AgeId, BuildingArt> = { 1: ROMAN_TOWER, 2: MEDIEVAL_TOWER, 3: BAROQUE_TOWER };
