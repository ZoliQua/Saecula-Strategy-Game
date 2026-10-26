import type { BuildingType } from '../../../types';
import { shade } from '../palette';
import { column } from './parts';
import type { BuildingArt } from './types';

const STONE = 0xa49a88;
const TERRACOTTA = 0xb4532f;

/** One look in every age (dedicated art lands in Task 13). */
export const SINGLE_STYLE_ART: Record<Extract<BuildingType, 'tower' | 'wall' | 'wonder'>, BuildingArt> = {
  tower: {
    size: 1,
    maxHeight: 170,
    paint: (p, team) => {
      p.footShadow();
      p.box(0.1, 0.1, 0.9, 0.9, 0, 112, { color: STONE, detail: 'stone' });
      p.leftFace(0.1, 0.9, 0.9, 0, () => {
        p.window(18, -70, 7, 14, true);
        p.window(18, -38, 7, 14, true);
      }, 112);
      // Overhanging fighting platform.
      p.box(0.02, 0.02, 0.98, 0.98, 112, 122, { color: shade(STONE, 0.95) }, STONE);
      p.hipRoof(0.02, 0.02, 0.98, 0.98, 122, 40, TERRACOTTA, 0.1);
      p.flag(0.5, 0.5, 162, 1, team);
    },
  },
  wall: {
    size: 1,
    maxHeight: 70,
    paint: (p) => {
      p.box(0.05, 0.25, 0.95, 0.75, 0, 40, { color: STONE, detail: 'stone' }, shade(STONE, 1.05));
      for (let i = 0; i < 3; i++) {
        const u0 = 0.08 + i * 0.32;
        p.box(u0, 0.25, u0 + 0.18, 0.75, 40, 50, { color: STONE }, shade(STONE, 1.1));
      }
    },
  },
  wonder: {
    size: 4,
    maxHeight: 260,
    paint: (p, team) => {
      p.footShadow();
      p.box(0, 0, 4, 4, 0, 10, { color: 0xd8cdb4, detail: 'stone' }, 0xe5dbc4);
      p.box(0.25, 0.25, 3.75, 3.75, 10, 20, { color: 0xddd2ba, detail: 'stone' }, 0xe9e0cb);
      p.box(0.5, 0.5, 3.5, 3.5, 20, 30, { color: 0xe2d8c1, detail: 'stone' }, 0xeee6d3);
      p.box(0.9, 0.9, 3.1, 3.1, 30, 110, { color: 0xf0e6cf, detail: 'plaster' });
      for (let i = 0; i < 7; i++) {
        column(p, 0.85 + i * 0.37, 3.3, 30, 112, 4.5);
        column(p, 3.3, 3.07 - i * 0.37, 30, 112, 4.5, 0xd6ccb4);
      }
      p.box(0.7, 0.7, 3.4, 3.4, 112, 124, { color: 0xe8dcc0 }, 0xf2e8d2);
      p.gableRoof(0.7, 0.7, 3.4, 3.4, 124, 60, 0xd4a83a, 0xf0e6cf, 'u');
      p.flag(3.35, 3.35, 124, 40, team, true);
    },
  },
};
