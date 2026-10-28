import type { IsoPainter } from '../../isoPainter';
import { css } from '../../palette';
import { R } from '../facade';
import { roundTree } from '../kits/patio';
import { chimney, forgeLight, forgeMouth, goldPile, logPile, plankStack } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet, BuildingArt } from '../types';
import { kitsOf, wallOf } from './courtyardKits';
import { portal, windowAt } from './hispaniaOrnament';
import { block, hip, ridgeBells, roofOver, type Block } from './hispaniaParts';
import { gateway, huerta, noria, palomar, threshingFloor, vineyard, yardWalls } from './hispaniaYard';

/*
 * Workplaces of the courtyard families: a farmstead (olive grove and
 * threshing floor, irrigated huerta with a noria, or vineyard), the
 * timber yard, the mine and the smithy — each a flat-roofed (or, in the
 * Colonial age, low-hipped) whitewashed or brick block in a walled yard
 * entered through the age's gateway.
 */

/** Olive grove: gnarled silvery trees in rows on red earth. */
function oliveGrove(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  p.ground(u0, v0, u1, v1, 0xa0603e);
  for (let v = v0 + 0.2; v < v1; v += 0.36) {
    for (let u = u0 + 0.18; u < u1; u += 0.36) roundTree(p, u, v, 0, 13, 'olive');
  }
}

/**
 * The workplace block's skyline step: a palomar over its back corner, or
 * in the Colonial reading the ridge espadaña alone (the two side by side
 * merge into one lump at zoom 1).
 */
function skyline(p: IsoPainter, s: ArchStyle, b: Block, dovecote: Block, z: number): void {
  if (kitsOf(s).espadanas && s.roof.form === 'hip') ridgeBells(p, s, b, z, 18, 34);
  else palomar(p, s, dovecote, z);
}

function farm(s: ArchStyle): BuildingArt {
  return {
    size: 2,
    maxHeight: 120,
    paint: (p, team) => {
      const k = kitsOf(s);
      const store: Block = [0.15, 0.15, 0.8, 0.62];
      p.footShadow();
      p.ground(0.05, 0.05, 1.95, 1.95, 0x8d6a45);
      block(p, s, store, 0, 28, (w) => portal(p, s, w * 0.55, 12, 19, team, 1), (w) => windowAt(p, s, w * 0.4, -21, 7, 8, R));
      roofOver(p, s, store, 28, 18);
      skyline(p, s, store, [0.15, 0.15, 0.45, 0.42], 28);
      if (k.field === 'olives') {
        oliveGrove(p, 0.12, 0.75, 1.9, 1.9);
        threshingFloor(p, 1.38, 0.42, 0.3);
      } else if (k.field === 'huerta') {
        huerta(p, 0.12, 0.85, 1.9, 1.9);
        noria(p, s, 1.32, 0.48, 24);
      } else {
        vineyard(p, 0.12, 0.85, 1.9, 1.9);
        threshingFloor(p, 1.38, 0.42, 0.26);
      }
      p.flag(1.88, 1.88, 0, 24, team);
    },
  };
}

function lumberCamp(s: ArchStyle): BuildingArt {
  return {
    size: 2,
    maxHeight: 120,
    paint: (p, team) => {
      const shed: Block = [0.2, 0.2, 1.2, 0.95];
      p.footShadow();
      p.ground(0.08, 0.08, 1.92, 1.92, 0x8f7a58);
      block(p, s, shed, 0, 34, (w) => {
        p.ctx.fillStyle = '#20160f';
        p.ctx.fillRect(w * 0.15, -24, w * 0.45, 24);
        windowAt(p, s, w * 0.75, -24, 7, 8, 1);
      });
      // Open sawing shelter against the shed's +u side: posts under a low tile pent.
      roofOver(p, s, shed, 34, 18);
      skyline(p, s, shed, [0.2, 0.2, 0.52, 0.5], 34);
      const ctx = p.ctx;
      for (const v of [0.25, 0.9]) {
        const [x, y] = p.p(1.6, v, 0);
        ctx.fillStyle = css(s.palette.timber);
        ctx.fillRect(x - 1.5, y - 24, 3, 24);
      }
      hip(p, s, [1.2, 0.2, 1.62, 0.95], 24, 10, s.palette.roofAlt, 0.05);
      logPile(p, 1.2, 1.15, 9);
      plankStack(p, 0.3, 1.05, 0.85, 1.35, 10);
      yardWalls(p, s, 0.1, 0.1, 1.9, 1.9, 16, 0.85, 1.4);
      gateway(p, s, 0.85, 1.4, 1.9, 30, team);
    },
  };
}

function miningCamp(s: ArchStyle): BuildingArt {
  return {
    size: 2,
    maxHeight: 120,
    paint: (p, team) => {
      const c = s.palette;
      const house: Block = [0.2, 0.2, 1.1, 1.0];
      p.footShadow();
      p.ground(0.08, 0.08, 1.92, 1.92, 0x8b7f6e);
      block(p, s, house, 0, 32, (w) => portal(p, s, w * 0.4, 12, 20, team, 1), (w) => windowAt(p, s, w * 0.5, -22, 7, 8, R));
      roofOver(p, s, house, 32, 18);
      skyline(p, s, house, [0.2, 0.2, 0.52, 0.5], 32);
      // Shaft collar and a timber windlass on trestles.
      p.box(1.25, 0.3, 1.75, 0.8, 0, 6, { color: c.stone, detail: 'stone' }, 0x2a221c);
      const ctx = p.ctx;
      for (const [u, v] of [[1.3, 0.55], [1.7, 0.55]] as const) {
        const [x, y] = p.p(u, v, 6);
        ctx.strokeStyle = css(c.timber);
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(x - 4, y);
        ctx.lineTo(x, y - 22);
        ctx.lineTo(x + 4, y);
        ctx.stroke();
      }
      const a = p.p(1.3, 0.55, 28);
      const b = p.p(1.7, 0.55, 28);
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
      p.addVolumePoint(1.5, 0.55, 30);
      // Ore heaps and a cart.
      goldPile(p, 1.3, 1.25);
      goldPile(p, 0.55, 1.3);
      p.box(0.95, 1.2, 1.3, 1.45, 4, 14, { color: 0x6b4a2a, detail: 'planks' });
      yardWalls(p, s, 0.1, 0.1, 1.9, 1.9, 16, 0.9, 1.45);
      gateway(p, s, 0.9, 1.45, 1.9, 30, team);
    },
  };
}

function blacksmith(s: ArchStyle): BuildingArt {
  return {
    size: 2,
    maxHeight: 130,
    paint: (p, team) => {
      const forge: Block = [0.22, 0.22, 1.25, 1.1];
      p.footShadow();
      p.ground(0.08, 0.08, 1.92, 1.92, 0x7e7468);
      chimney(p, 0.98, 0.3, 1.18, 0.5, 0, s.roof.form === 'hip' ? 72 : 62, wallOf(s));
      block(p, s, forge, 0, 34, (w) => {
        forgeMouth(p, w * 0.28, 18, 20);
        windowAt(p, s, w * 0.72, -26, 7, 8, 1);
      }, (w) => portal(p, s, w * 0.4, 12, 22, team, R));
      roofOver(p, s, forge, 34, 18);
      ridgeBells(p, s, forge, 34, 18, 34);
      forgeLight(p, 0.6, 1.3);
      // Anvil and quench trough in the yard.
      const [x, y] = p.p(1.5, 1.45, 0);
      const ctx = p.ctx;
      ctx.fillStyle = '#3a3a40';
      ctx.fillRect(x - 8, y - 9, 16, 4);
      ctx.fillRect(x - 3, y - 6, 6, 6);
      p.box(0.4, 1.35, 0.95, 1.5, 0, 8, { color: s.palette.stone }, 0x4a7088);
      yardWalls(p, s, 0.1, 0.1, 1.9, 1.9, 14, 0.95, 1.45);
      gateway(p, s, 0.95, 1.45, 1.9, 28, team);
    },
  };
}

/** The courtyard families' workplaces: farm, timber yard, mine, smithy. */
export function hispaniaWorkArt(s: ArchStyle): AgeArtSet {
  return { farm: farm(s), lumber_camp: lumberCamp(s), mining_camp: miningCamp(s), blacksmith: blacksmith(s) };
}

