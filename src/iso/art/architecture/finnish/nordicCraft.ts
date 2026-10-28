import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { turfMound } from '../kits/turfRoof';
import { octPrism, tentRoof } from '../kits/tentRoof';
import { chimney, forgeLight, forgeMouth, goldPile, logPile, post } from '../parts';
import type { ArchStyle } from '../style';
import { towerLine } from '../towerParts';
import type { BuildingArt } from '../types';
import { footing, kota, mainRoof, nDoor, nordic, wallBlock, type Block } from './nordicParts';
import { bloomery, headframe, stoneFurnace, stoneStack } from './nordicProps';

/*
 * Finnish mining camp and smithy, each trade on the skyline:
 * - mining camp: a clay bloomery smelting bog iron beside its ore heap
 *   and a bark kota (age 1); a granite stone furnace with its charging
 *   bridge (age 2); a whim house under a round shingle cone beside a
 *   timber headframe over the shaft (age 3);
 * - smithy: a turf-roofed log forge venting through a stack of piled
 *   fieldstones (age 1); a red log forge with a dressed granite stack
 *   (age 2); a boarded hammer forge with a tall brick stack and its
 *   trip hammer (age 3).
 */

const ORE = 0x7a4a2c;
/** Dark grey waste rock hauled up the shaft. */
const WASTE = 0x5a5650;

function mining(s: ArchStyle): BuildingArt {
  const works = nordic(s).works;
  const c = s.palette;
  return {
    size: 2,
    maxHeight: works === 'bruk' ? 190 : works === 'village' ? 180 : 140,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.08, 0.08, 1.92, 1.92, 0x7d7464);
      if (works === 'homestead') {
        // Bog pool the ore is raked from.
        p.ctx.fillStyle = 'rgba(52,44,30,.85)';
        const [bx, by] = p.p(0.45, 1.55, 0);
        p.ctx.beginPath();
        p.ctx.ellipse(bx, by, 24, 10, 0, 0, Math.PI * 2);
        p.ctx.fill();
        turfMound(p, 0.5, 0.5, 0.32, 20, ORE);
        // A stocky clay shaft furnace beside a tall kota: the pair peaks over the yard.
        kota(p, 1.5, 0.48, 0.3, 76, c.roofAlt);
        bloomery(p, 1.12, 1.0, 100, 22);
        goldPile(p, 1.55, 1.6);
        p.flag(1.88, 1.88, 0, 26, team);
        return;
      }
      if (works === 'village') {
        turfMound(p, 0.45, 1.45, 0.3, 16, ORE);
        const furnace: Block = [0.85, 0.5, 1.5, 1.15];
        const h = stoneFurnace(p, s, furnace, 95);
        // The timber charging house on the furnace top, where the bridge arrives.
        const house: Block = [furnace[0] + 0.12, furnace[1] + 0.12, furnace[2] - 0.12, furnace[3] - 0.12];
        wallBlock(p, s, house, h, h + 24, (w) => nDoor(p, s, w / 2 - 5, 10, 16, c.doors.work, 1), undefined, 0.04);
        const top = mainRoof(p, s, house, h + 24, 'u', { overhang: 0.05 });
        p.addSmoke(1.17, 0.82, top);
        const shed: Block = [0.15, 0.2, 0.6, 0.95];
        wallBlock(p, s, shed, 0, 24, undefined, undefined, 0.05);
        mainRoof(p, s, shed, 24, 'v', { overhang: 0.06 });
        goldPile(p, 1.6, 1.6);
        p.flag(1.88, 1.88, 0, 26, team);
        return;
      }
      // Whim house: horses walk the round house to wind the shaft rope.
      turfMound(p, 1.55, 0.42, 0.3, 26, WASTE);
      octPrism(p, 0.66, 0.68, 0.44, 0, 32, c.darkWood, 'plain', (w, h, light) => {
        p.ctx.fillStyle = css(shade(c.darkWood, light * 0.7), 0.55);
        for (let x = 3; x < w; x += 4.5) p.ctx.fillRect(x, -h, 0.8, h);
        p.ctx.fillStyle = css(shade(c.trim, light));
        p.ctx.fillRect(0, -h, w, 2.4);
      });
      tentRoof(p, 0.66, 0.68, 0.44, 32, 44, c.roof, { material: 'shingle', eave: 0.06 });
      headframe(p, s, 1.38, 1.3, 0.22, 128);
      // Boarded shaft-house hood round the headframe's upper half.
      const hood: Block = [1.2, 1.12, 1.56, 1.48];
      wallBlock(p, s, hood, 70, 100, (w, h) => {
        p.ctx.fillStyle = '#18120d';
        p.ctx.fillRect(w / 2 - 4, -h + 8, 8, 10);
      });
      mainRoof(p, s, hood, 100, 'u', { overhang: 0.05 });
      towerLine(p, p.p(1.38, 1.3, 138), p.p(0.66, 0.68, 52), 0x2a2622, 0.9);
      p.box(1.0, 1.62, 1.22, 1.8, 3, 13, { color: 0x5a4a3a, detail: 'planks' }, 0x5a4a3a);
      goldPile(p, 1.11, 1.71);
      p.flag(1.88, 0.2, 0, 28, team);
    },
  };
}

/** Trip hammer: a helve on its frame beside the forge, its head over the anvil block. */
function tripHammer(p: IsoPainter, s: ArchStyle, u: number, v: number): void {
  const c = s.palette;
  for (const dv of [-0.1, 0.1]) post(p, u, v + dv, 0, 34, 3, c.timber);
  towerLine(p, p.p(u - 0.36, v, 30), p.p(u + 0.34, v, 22), shade(c.timber, 1.05), 4);
  p.box(u + 0.28, v - 0.06, u + 0.4, v + 0.06, 12, 24, { color: 0x3a3836 }, 0x4a4846);
  p.box(u + 0.26, v - 0.08, u + 0.42, v + 0.08, 0, 9, { color: 0x5a4a3a, detail: 'planks' }, 0x4a4846);
  p.addVolumePoint(u, v, 34);
}

function smithy(s: ArchStyle): BuildingArt {
  const works = nordic(s).works;
  const c = s.palette;
  const forge: Block = [0.3, 0.32, 1.3, 1.22];
  return {
    size: 2,
    maxHeight: works === 'bruk' ? 175 : works === 'village' ? 160 : 140,
    paint: (p: IsoPainter, team: number) => {
      p.footShadow();
      p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
      const stackTop = works === 'bruk' ? 134 : works === 'village' ? 116 : 98;
      if (works === 'homestead') stoneStack(p, s, 1.46, 0.48, 0, stackTop, 0.15);
      else if (works === 'village') chimney(p, 1.36, 0.36, 1.6, 0.6, 0, stackTop, { color: c.ashlar, detail: 'stone' });
      else {
        chimney(p, 1.38, 0.34, 1.6, 0.56, 0, stackTop, { color: c.brick, detail: 'brick' });
        // White band and cap of the brick stack.
        p.box(1.36, 0.32, 1.62, 0.58, stackTop - 16, stackTop - 10, { color: c.stack }, c.stack);
      }
      const z0 = footing(p, s, forge, 5);
      const wall = works === 'homestead' ? 28 : 34;
      wallBlock(p, s, forge, z0, z0 + wall, (w) => nDoor(p, s, w * 0.56, 13, 22, c.doors.work, 1), (w) => forgeMouth(p, w * 0.3, 20, 20));
      mainRoof(p, s, forge, z0 + wall, 'v');
      forgeLight(p, 1.55, 0.8);
      if (works === 'bruk') tripHammer(p, s, 1.55, 1.5);
      else {
        const [x, y] = p.p(1.62, 1.4, 0);
        const ctx = p.ctx;
        ctx.fillStyle = '#5a3b20';
        ctx.fillRect(x - 5, y - 9, 10, 9);
        ctx.fillStyle = '#34343a';
        ctx.fillRect(x - 9, y - 13, 18, 4.5);
        ctx.fillRect(x - 3, y - 10, 6, 2);
      }
      logPile(p, 0.3, 1.78, 5, shade(c.darkWood, 0.9), 0xd9b88a);
      p.flag(1.88, 1.88, 0, 26, team);
    },
  };
}

/** Mining camp and smithy of every age. */
export function nordicCraftArt(s: ArchStyle): { mining_camp: BuildingArt; blacksmith: BuildingArt } {
  return { mining_camp: mining(s), blacksmith: smithy(s) };
}
