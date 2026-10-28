import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { bellRoof } from '../kits/shingleRoof';
import { logPile, plankStack, post } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { footing, haasia, mainRoof, nDoor, nordic, wallBlock, type Block } from './nordicParts';
import { barrels, postMill, shearLegs, tarPit, waterWheel } from './nordicProps';

/*
 * Finnish farm and lumber camp, each trade on the skyline:
 * - farm: a smoke-stained riihi drying barn over rye with hay racks
 *   (age 1); a post mill (age 2); a big gambrel estate barn with its
 *   work-bell cote on the ridge (age 3);
 * - lumber camp: a smoking tar pit with barked tar pines and barrels
 *   (age 1); a sawpit shed under a shear-leg log hoist (age 2); a
 *   board sawmill driven by a water wheel off its mill race (age 3).
 */

/** Rye field in strips with stubble. */
function rye(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, strips: number): void {
  const ctx = p.ctx;
  for (let i = 0; i < strips; i++) {
    const a = v0 + ((v1 - v0) * i) / strips;
    const b = v0 + ((v1 - v0) * (i + 1)) / strips;
    const col = i % 2 === 0 ? 0xbfa052 : 0xa89248;
    p.ground(u0, a + 0.015, u1, b - 0.015, shade(col, 0.85));
    for (let k = 0; k < 12; k++) {
      const [x, y] = p.p(u0 + 0.05 + ((u1 - u0 - 0.1) * k) / 11, (a + b) / 2, 0);
      ctx.strokeStyle = css(shade(col, 0.85 + p.random() * 0.3));
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (p.random() - 0.5) * 2, y - 6 - p.random() * 3);
      ctx.stroke();
    }
  }
}

/** Open bell-cote astride a ridge: four posts with a bell under a little bell roof. */
function bellCote(p: IsoPainter, s: ArchStyle, u: number, v: number, z: number): number {
  const c = s.palette;
  const r = 0.11;
  for (const [du, dv] of [[-1, -1], [1, -1], [-1, 1]] as const) post(p, u + du * r, v + dv * r, z, z + 22, 1.8, c.trim);
  const [x, y] = p.p(u, v, z + 18);
  p.ctx.fillStyle = '#b8903a';
  p.ctx.beginPath();
  p.ctx.moveTo(x - 4, y + 2);
  p.ctx.quadraticCurveTo(x - 4, y - 7, x, y - 7);
  p.ctx.quadraticCurveTo(x + 4, y - 7, x + 4, y + 2);
  p.ctx.fill();
  post(p, u + r, v + r, z, z + 22, 1.8, c.trim);
  const prev = p.material;
  p.material = 'shingle';
  const top = bellRoof(p, u, v, r + 0.04, z + 22, 26, c.roof, { hips: c.trim });
  p.material = prev;
  return top;
}

function farm(s: ArchStyle): BuildingArt {
  const works = nordic(s).works;
  const c = s.palette;
  return {
    size: 2,
    maxHeight: works === 'village' ? 190 : works === 'bruk' ? 175 : 130,
    paint: (p, team) => {
      p.ground(0.05, 0.05, 1.95, 1.95, 0x6f6040);
      if (works === 'village') {
        rye(p, 0.08, 1.0, 1.92, 1.92, 4);
        haasia(p, 1.0, 0.28, 1.86, 0.28, 22);
        p.footShadow();
        postMill(p, s, 0.6, 0.62, 46, team);
        logPile(p, 1.3, 0.85, 3, 0xa88a5a, 0xe2cfa2);
        return;
      }
      rye(p, 0.08, 1.12, 1.92, 1.92, 3);
      p.footShadow();
      if (works === 'bruk') {
        const barn: Block = [0.14, 0.14, 1.4, 0.98];
        footing(p, s, barn, 5);
        wallBlock(p, s, barn, 5, 44, (w) => {
          nDoor(p, s, w * 0.4, 20, 30, c.doors.work, 1);
          p.ctx.fillStyle = css(shade(c.trim, 1));
          p.ctx.fillRect(w * 0.4 - 1, -31, 22, 1.4);
        }, (w, h) => {
          p.ctx.fillStyle = '#1e1610';
          p.ctx.fillRect(w / 2 - 5, -h + 6, 10, 9);
        });
        const ridge = mainRoof(p, s, barn, 44, 'u');
        bellCote(p, s, 0.62, (barn[1] + barn[3]) / 2, ridge - 3);
        p.flag(1.36, 0.12, 0, 30, team);
      } else {
        // The riihi: a tall drying barn, its gable sooted round the smoke vent.
        const riihi: Block = [0.18, 0.18, 1.02, 0.92];
        footing(p, s, riihi, 6);
        wallBlock(p, s, riihi, 6, 50, (w) => nDoor(p, s, w * 0.42, 12, 22, c.doors.work, 1), (w, h) => {
          const g = p.ctx.createLinearGradient(0, -h, 0, -h * 0.3);
          g.addColorStop(0, 'rgba(20,14,10,.6)');
          g.addColorStop(1, 'rgba(20,14,10,0)');
          p.ctx.fillStyle = g;
          p.ctx.fillRect(w * 0.2, -h, w * 0.6, h * 0.7);
          p.ctx.fillStyle = '#120d09';
          p.ctx.fillRect(w / 2 - 4, -h + 5, 8, 6);
        });
        const ridge = mainRoof(p, s, riihi, 50, 'u', { scale: 1.1 });
        p.addSmoke(1.0, 0.55, ridge - 10);
        p.flag(1.86, 0.14, 0, 28, team);
      }
      haasia(p, 0.2, 1.38, 1.8, 1.38, 24);
      haasia(p, 0.2, 1.74, 1.8, 1.74, 24);
    },
  };
}

/** Barked tar pines: tall grey stems scored for tar, a small crown at the top. */
function tarPines(p: IsoPainter, spots: ReadonlyArray<readonly [number, number, number]>): void {
  const ctx = p.ctx;
  for (const [u, v, h] of spots) {
    const [x, y] = p.p(u, v, 0);
    const g = ctx.createLinearGradient(x - 3, 0, x + 3, 0);
    g.addColorStop(0, '#b9a58a');
    g.addColorStop(1, '#6e5e4c');
    ctx.fillStyle = g;
    ctx.fillRect(x - 3, y - h, 6, h);
    p.normalCylinder(x - 3, y - h, 6, h);
    ctx.fillStyle = '#9a5a2e';
    ctx.fillRect(x - 3, y - h + 14, 6, 3);
    ctx.fillStyle = '#2f4a2a';
    ctx.beginPath();
    ctx.ellipse(x, y - h, 9, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#41633a';
    ctx.beginPath();
    ctx.ellipse(x - 2, y - h - 2, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    p.addVolumePoint(u, v, h + 7);
  }
}

function lumber(s: ArchStyle): BuildingArt {
  const works = nordic(s).works;
  const c = s.palette;
  return {
    size: 2,
    maxHeight: works === 'village' ? 170 : works === 'bruk' ? 150 : 140,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.08, 0.08, 1.92, 1.92, 0x857558);
      if (works === 'homestead') {
        tarPines(p, [[0.3, 1.2, 104], [1.75, 0.3, 96]]);
        tarPit(p, 0.74, 0.66, 0.52, 50, shade(c.roof, 0.9));
        const shed: Block = [1.1, 1.0, 1.72, 1.5];
        wallBlock(p, s, shed, 0, 24, undefined, (w) => {
          p.ctx.fillStyle = '#1e160e';
          p.ctx.fillRect(w * 0.25, -20, w * 0.5, 20);
        }, 0.05);
        mainRoof(p, s, shed, 24, 'u');
        barrels(p, 0.35, 1.7, 6);
        logPile(p, 1.2, 1.82, 4, shade(c.darkWood, 0.95), 0xd9b88a);
        p.flag(1.86, 1.86, 0, 26, team);
        return;
      }
      if (works === 'village') {
        const shed: Block = [0.22, 0.25, 1.05, 0.98];
        footing(p, s, shed, 5);
        wallBlock(p, s, shed, 5, 34, (w) => {
          p.ctx.fillStyle = '#1e160e';
          p.ctx.fillRect(w * 0.28, -28, w * 0.44, 28);
        });
        mainRoof(p, s, shed, 34, 'v');
        shearLegs(p, s, 1.42, 0.62, 128);
        logPile(p, 1.25, 1.62, 7, shade(c.darkWood, 0.9), 0xd9b88a);
        plankStack(p, 0.3, 1.35, 0.85, 1.6, 14);
        p.flag(1.88, 1.88, 0, 26, team);
        return;
      }
      // Water sawmill: the mill race, the wheel beside the saw house.
      p.ground(1.12, 0.1, 1.58, 1.92, 0x4a6676);
      const mill: Block = [0.2, 0.22, 1.02, 1.12];
      footing(p, s, mill, 6);
      wallBlock(p, s, mill, 6, 40, (w) => {
        p.ctx.fillStyle = '#1e160e';
        p.ctx.fillRect(w * 0.3, -30, w * 0.4, 30);
      }, (w, h) => {
        p.ctx.fillStyle = '#1e160e';
        p.ctx.fillRect(w / 2 - 4, -h + 10, 8, 9);
      });
      mainRoof(p, s, mill, 40, 'v');
      waterWheel(p, s, 1.35, 0.72, 34, 0.32, 0.6);
      // Log ramp up to the saw floor.
      const ramp = [p.p(0.3, 1.86, 0), p.p(0.75, 1.86, 0), p.p(0.75, 1.12, 22), p.p(0.3, 1.12, 22)];
      p.fillPoly(ramp, css(shade(c.planks, 1.05)));
      p.normals.fill(ramp, p.slope(0, 1, 0.74, 22));
      logPile(p, 1.05, 1.82, 5, shade(0x8a6a48, 0.95), 0xe2c89a);
      p.flag(1.86, 1.86, 0, 26, team);
    },
  };
}

/** Farm and lumber camp of every age. */
export function nordicFieldArt(s: ArchStyle): { farm: BuildingArt; lumber_camp: BuildingArt } {
  return { farm: farm(s), lumber_camp: lumber(s) };
}
