import type { BuildingType } from '../../types';
import { ellipse } from './canvas';
import { IsoPainter } from './isoPainter';
import type { LitArt } from './lighting/normalLayer';
import { css, shade } from './palette';

const STONE = 0xa49a88;
const PLASTER = 0xe8d6ad;
const TERRACOTTA = 0xb4532f;
const TIMBER = 0x8a5a32;
const DARK_WOOD = 0x5e3b20;
const THATCH = 0xc49a4a;

type Painter = (p: IsoPainter, team: number) => void;

interface BuildingArt {
  readonly size: number;
  readonly maxHeight: number;
  readonly paint: Painter;
}

/** Column with a cylindrical gradient, standing at ground point (u,v). */
function column(p: IsoPainter, u: number, v: number, z0: number, z1: number, r = 4, color = 0xeee4cc): void {
  const ctx = p.ctx;
  const [x, yb] = p.p(u, v, z0);
  const yt = yb - (z1 - z0);
  const g = ctx.createLinearGradient(x - r, 0, x + r, 0);
  g.addColorStop(0, css(shade(color, 1.1)));
  g.addColorStop(0.55, css(shade(color, 0.92)));
  g.addColorStop(1, css(shade(color, 0.62)));
  ctx.fillStyle = g;
  ctx.fillRect(x - r, yt, r * 2, yb - yt);
  p.normalCylinder(x - r - 1.5, yt - 2, r * 2 + 3, yb - yt + 3);
  ctx.fillStyle = css(shade(color, 0.85));
  ctx.fillRect(x - r - 1.5, yt - 2, r * 2 + 3, 3);
  ctx.fillRect(x - r - 1.5, yb - 2, r * 2 + 3, 3);
}

function logPile(p: IsoPainter, u: number, v: number, count: number): void {
  const ctx = p.ctx;
  const [x0, y0] = p.p(u, v, 0);
  let i = 0;
  for (let row = 0; i < count; row++) {
    for (let k = 0; k < 4 - row && i < count; k++, i++) {
      const x = x0 + k * 9 + row * 4.5;
      const y = y0 - row * 8 - k * 0.5;
      ctx.fillStyle = css(0x7a4e2a);
      ctx.fillRect(x - 20, y - 4, 20, 8);
      ellipse(ctx, x, y, 4.5, 4.2);
      ctx.fillStyle = '#d9b07a';
      ctx.fill();
      ctx.strokeStyle = '#7a4e2a';
      ctx.lineWidth = 1;
      ctx.stroke();
      ellipse(ctx, x, y, 1.6, 1.4);
      ctx.stroke();
    }
  }
}

function goldPile(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  for (let i = 0; i < 9; i++) {
    const nx = x + (p.random() - 0.5) * 16;
    const ny = y - p.random() * 7;
    ellipse(ctx, nx, ny, 3.2, 2.4);
    ctx.fillStyle = i % 3 === 0 ? '#fff1a6' : '#e3b23c';
    ctx.fill();
  }
}

function target(p: IsoPainter, u: number, v: number): void {
  const ctx = p.ctx;
  const [x, y] = p.p(u, v, 0);
  ctx.fillStyle = '#5e3b20';
  ctx.fillRect(x - 1.5, y - 22, 3, 22);
  const rings = ['#f2ead6', '#c0392b', '#f2ead6', '#c0392b'];
  rings.forEach((c, i) => {
    ellipse(ctx, x, y - 24, 9 - i * 2.2, 10 - i * 2.4);
    ctx.fillStyle = c;
    ctx.fill();
  });
}

const BASE_ART: Record<Exclude<BuildingType, 'foundry'>, BuildingArt> = {
  town_center: {
    size: 3,
    maxHeight: 236,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xb9ae97);
      // Back tower first (painter's order).
      p.box(0.2, 0.2, 1.05, 1.05, 0, 136, { color: STONE, detail: 'stone' });
      p.leftFace(0.2, 1.05, 1.05, 0, () => p.window(20, -124, 8, 14, true), 136);
      p.hipRoof(0.2, 0.2, 1.05, 1.05, 136, 40, TERRACOTTA);
      p.flag(0.625, 0.625, 176, 28, team, true);
      p.box(0.3, 0.3, 2.7, 2.7, 0, 12, { color: STONE, detail: 'stone' }, STONE);
      p.box(0.45, 0.45, 2.55, 2.55, 12, 76, { color: PLASTER, detail: 'plaster' });
      p.leftFace(0.45, 2.55, 2.55, 12, () => {
        p.door(58, 20, 32);
        p.window(16, -50, 11, 16, true);
        p.window(104, -50, 11, 16, true);
      }, 64);
      p.rightFace(0.45, 2.55, 2.55, 12, () => {
        p.window(22, -50, 11, 16, true);
        p.window(62, -50, 11, 16, true);
        p.window(102, -50, 11, 16, true);
      }, 64);
      p.hipRoof(0.45, 0.45, 2.55, 2.55, 76, 44, TERRACOTTA, 0.14);
      // Portico columns along the front-left face.
      for (const u of [0.75, 1.25, 1.75, 2.25]) column(p, u, 2.8, 12, 58, 3.4);
      p.box(0.55, 2.66, 2.45, 2.94, 58, 66, { color: 0xd8ccb0 }, 0xe6dcc4);
      // Entrance steps.
      p.box(1.2, 2.94, 1.8, 3.0, 0, 6, { color: 0xc9bea6 }, 0xd8ccb0);
    },
  },
  house: {
    size: 2,
    maxHeight: 110,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.15, 0.15, 1.85, 1.85, 0xa99f88);
      p.box(0.3, 0.35, 1.7, 1.65, 0, 40, { color: PLASTER, detail: 'plaster' });
      p.leftFace(0.3, 1.7, 1.65, 0, () => {
        p.ctx.fillStyle = css(TIMBER);
        p.ctx.fillRect(0, -40, 89.6, 3);
        p.ctx.fillRect(0, -22, 89.6, 2.5);
        p.door(56, 15, 25, shade(team, 0.75));
        p.window(16, -33, 11, 11);
      }, 40);
      p.rightFace(0.35, 1.65, 1.7, 0, () => {
        p.ctx.fillStyle = css(shade(TIMBER, 0.8));
        p.ctx.fillRect(0, -40, 83.2, 3);
        p.window(32, -31, 12, 12);
      }, 40);
      // Chimney sits on the back slope, so paint it before the roof.
      p.box(0.55, 0.55, 0.8, 0.8, 30, 92, { color: STONE, detail: 'stone' }, 0x3a3530);
      p.gableRoof(0.3, 0.35, 1.7, 1.65, 40, 38, TERRACOTTA, PLASTER, 'u');
    },
  },
  farm: {
    size: 2,
    maxHeight: 40,
    paint: (p, team) => {
      const ctx = p.ctx;
      p.ground(0.05, 0.05, 1.95, 1.95, 0x6e4a2a);
      // Furrows + sprouting crops.
      for (let i = 0; i < 9; i++) {
        const v = 0.15 + i * 0.2;
        const a = p.p(0.12, v, 0);
        const b = p.p(1.88, v, 0);
        ctx.strokeStyle = 'rgba(40,24,10,.55)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(a[0], a[1]);
        ctx.lineTo(b[0], b[1]);
        ctx.stroke();
        for (let k = 0; k < 11; k++) {
          const [x, y] = p.p(0.2 + k * 0.16, v + 0.08, 0);
          ctx.strokeStyle = k % 2 ? '#c7b24a' : '#9dbb45';
          ctx.lineWidth = 1.4;
          for (let s = -1; s <= 1; s++) {
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + s * 2.5, y - 7 - p.random() * 3);
            ctx.stroke();
          }
        }
      }
      // Fence posts along the visible front edges.
      for (let t = 0.05; t <= 1.96; t += 0.3) {
        for (const [u, v] of [[t, 1.95], [1.95, t]] as const) {
          const [x, y] = p.p(u, v, 0);
          ctx.fillStyle = '#6b4526';
          ctx.fillRect(x - 1.2, y - 10, 2.4, 10);
        }
      }
      p.flag(1.95, 1.95, 0, 22, team);
    },
  },
  lumber_camp: {
    size: 2,
    maxHeight: 100,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
      p.box(0.25, 0.25, 1.15, 1.6, 0, 38, { color: DARK_WOOD, detail: 'logs' });
      p.gableRoof(0.25, 0.25, 1.15, 1.6, 38, 32, 0x6b4a2a, DARK_WOOD, 'v');
      logPile(p, 1.25, 1.75, 9);
      p.flag(1.8, 0.4, 0, 30, team);
      // Chopping stump with axe.
      const [x, y] = p.p(1.6, 1.1, 0);
      ellipse(p.ctx, x, y - 6, 7, 3.5);
      p.ctx.fillStyle = '#d9b07a';
      p.ctx.fill();
      p.ctx.fillStyle = '#7a4e2a';
      p.ctx.fillRect(x - 7, y - 6, 14, 6);
    },
  },
  mining_camp: {
    size: 2,
    maxHeight: 100,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.1, 0.1, 1.9, 1.9, 0x8b8070);
      p.box(0.25, 0.25, 1.4, 1.2, 0, 36, { color: STONE, detail: 'stone' });
      p.gableRoof(0.25, 0.25, 1.4, 1.2, 36, 30, 0x5d5a55, STONE, 'u');
      // Mine cart.
      p.box(0.9, 1.35, 1.5, 1.75, 6, 22, { color: 0x6b4a2a, detail: 'planks' });
      goldPile(p, 1.25, 1.55);
      const ctx = p.ctx;
      for (const u of [1.0, 1.4]) {
        const [x, y] = p.p(u, 1.75, 6);
        ellipse(ctx, x, y, 4.5, 5);
        ctx.fillStyle = '#2a1c10';
        ctx.fill();
      }
      p.flag(1.85, 0.35, 0, 30, team);
    },
  },
  barracks: {
    size: 3,
    maxHeight: 140,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xa89c84);
      p.box(0.3, 0.3, 2.7, 1.9, 0, 18, { color: STONE, detail: 'stone' });
      p.box(0.3, 0.3, 2.7, 1.9, 18, 54, { color: PLASTER, detail: 'plaster' });
      p.leftFace(0.3, 2.7, 1.9, 18, () => {
        for (let i = 0; i < 5; i++) p.window(14 + i * 30, -28, 9, 13, true);
      }, 36);
      p.rightFace(0.3, 1.9, 2.7, 0, () => {
        p.door(30, 24, 34, 0x4a2e18);
        // Team banners either side of the gate.
        for (const bx of [12, 66]) {
          p.ctx.fillStyle = css(team);
          p.ctx.fillRect(bx, -50, 10, 22);
          p.ctx.fillStyle = '#e8c35a';
          p.ctx.fillRect(bx, -50, 10, 2.5);
        }
      }, 54);
      p.gableRoof(0.3, 0.3, 2.7, 1.9, 54, 40, 0x9c3b28, PLASTER, 'u');
      // Training yard: dummies + weapon rack.
      const ctx = p.ctx;
      for (const u of [0.8, 1.6, 2.4]) {
        const [x, y] = p.p(u, 2.5, 0);
        ctx.fillStyle = '#6b4526';
        ctx.fillRect(x - 1.5, y - 26, 3, 26);
        ctx.fillRect(x - 9, y - 20, 18, 3);
        ellipse(ctx, x, y - 29, 4.5, 4.5);
        ctx.fillStyle = '#d6b57a';
        ctx.fill();
      }
      p.flag(2.8, 2.8, 0, 40, team, true);
    },
  },
  archery_range: {
    size: 3,
    maxHeight: 120,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
      p.box(0.25, 0.25, 1.5, 1.2, 0, 40, { color: TIMBER, detail: 'planks' });
      p.gableRoof(0.25, 0.25, 1.5, 1.2, 40, 30, 0x2f4f7a, TIMBER, 'u');
      for (const [u, v] of [[2.5, 0.6], [2.5, 1.4], [2.5, 2.2]] as const) target(p, u, v);
      p.flag(0.4, 2.6, 0, 36, team, true);
    },
  },
  stable: {
    size: 3,
    maxHeight: 130,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xa3946a);
      p.box(0.3, 0.3, 2.7, 2.0, 0, 46, { color: 0x7a4a2a, detail: 'planks' });
      p.leftFace(0.3, 2.7, 2.0, 0, () => {
        for (let i = 0; i < 4; i++) p.door(10 + i * 38, 18, 26, 0x4a2e18);
      }, 46);
      p.gableRoof(0.3, 0.3, 2.7, 2.0, 46, 42, THATCH, 0x7a4a2a, 'u');
      // Hay bales.
      for (const u of [0.6, 1.0]) p.box(u, 2.25, u + 0.35, 2.6, 0, 14, { color: 0xd9b55a }, 0xe8c873);
      p.flag(2.8, 2.8, 0, 36, team);
    },
  },
  blacksmith: {
    size: 2,
    maxHeight: 120,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
      p.box(1.1, 0.3, 1.45, 0.65, 0, 96, { color: STONE, detail: 'stone' }, 0x2a2420);
      p.box(0.3, 0.3, 1.7, 1.5, 0, 38, { color: 0x8d8170, detail: 'brick' });
      p.leftFace(0.3, 1.7, 1.5, 0, () => {
        const ctx = p.ctx;
        const g = ctx.createRadialGradient(46, -14, 1, 46, -14, 20);
        g.addColorStop(0, '#ffcf6a');
        g.addColorStop(1, 'rgba(255,120,40,0)');
        ctx.fillStyle = '#1e1410';
        ctx.fillRect(34, -26, 24, 26);
        ctx.fillStyle = g;
        ctx.fillRect(26, -34, 40, 34);
      }, 38);
      p.hipRoof(0.3, 0.3, 1.7, 1.5, 38, 30, 0x4d4842);
      const [x, y] = p.p(1.3, 1.75, 0);
      p.ctx.fillStyle = '#3a3a40';
      p.ctx.fillRect(x - 8, y - 9, 16, 4);
      p.ctx.fillRect(x - 3, y - 6, 6, 6);
      p.flag(1.85, 1.85, 0, 26, team);
    },
  },
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


// Foundry reuses the blacksmith painting (on a 3x3 footprint) until it gets its own art.
const ART: Record<BuildingType, BuildingArt> = {
  ...BASE_ART,
  foundry: { ...BASE_ART.blacksmith, size: 3 },
};

export const BUILDING_ART_SIZES: Record<BuildingType, number> = Object.fromEntries(
  Object.entries(ART).map(([k, v]) => [k, v.size]),
) as Record<BuildingType, number>;

/**
 * Paints a building for a team colour (albedo, normals, shadow volume,
 * glows). Team variants pass withNormals=false and share the base map.
 */
export function paintBuilding(type: BuildingType, team: number, withNormals = true): LitArt {
  const art = ART[type];
  const p = new IsoPainter(art.size, art.size, art.maxHeight, type.length * 977);
  art.paint(p, team);
  return p.result(withNormals);
}

/** Foundation stones + scaffolding shown while a site is being built. */
export function paintConstructionSite(size: number): LitArt {
  const p = new IsoPainter(size, size, 40 + size * 20, size * 31);
  const ctx = p.ctx;
  p.ground(0.1, 0.1, size - 0.1, size - 0.1, 0x9b8a6a);
  for (let i = 0; i < size * 10; i++) {
    const [x, y] = p.p(0.2 + p.random() * (size - 0.4), 0.2 + p.random() * (size - 0.4), 0);
    ellipse(ctx, x, y, 3 + p.random() * 3, 2 + p.random() * 1.5);
    ctx.fillStyle = css(shade(0xb0a48c, 0.8 + p.random() * 0.4));
    ctx.fill();
  }
  // Scaffolding poles at the corners.
  for (const [u, v] of [[0.2, 0.2], [size - 0.2, 0.2], [0.2, size - 0.2], [size - 0.2, size - 0.2]] as const) {
    const [x, y] = p.p(u, v, 0);
    ctx.fillStyle = '#7a5530';
    ctx.fillRect(x - 1.5, y - 30 - size * 12, 3, 30 + size * 12);
  }
  const s = size - 0.2;
  for (const z of [16, 34 + size * 6]) {
    for (const [a, b] of [[[0.2, s], [s, s]], [[s, s], [s, 0.2]]] as const) {
      const pa = p.p(a[0], a[1], z);
      const pb = p.p(b[0], b[1], z);
      ctx.strokeStyle = '#8a6238';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(pa[0], pa[1]);
      ctx.lineTo(pb[0], pb[1]);
      ctx.stroke();
    }
  }
  return p.result();
}
