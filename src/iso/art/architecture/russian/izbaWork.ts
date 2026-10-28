import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import { logBox } from '../kits/logWall';
import { tentRoof } from '../kits/tentRoof';
import { chimney, forgeLight, forgeMouth, goldPile, logPile, post } from '../parts';
import type { ArchStyle } from '../style';
import type { AgeArtSet, BuildingArt } from '../types';
import { footing, izbaWindow, logBlock, logTown, plankGable, poleFence, stog, type Block } from './izbaParts';
import { bloomery, logStack, rockMound, smokeHood, stripField, tentHeadframe, tentMill, trestle, windlass } from './izbaProps';

/*
 * Russian log-town workplaces. Age 1: a two-storey overhung log granary
 * over rye and flax strips with haystacks on poles; a log shed with a
 * sawing trestle and a tall seasoning log stack; an ore hut by a rocky
 * mound with a windlass headframe and a clay bloomery; a log smithy
 * venting through a tapering daub smoke hood. Age 2 adds each trade's own tall cue: a
 * tent-roofed windmill, an unfinished log crib (srub) with its gin
 * pole, a tent-roofed shaft headframe, and a brick stack under a
 * tented smoke hood.
 */

const BARN: Block = [0.22, 0.2, 0.95, 0.78];
const SHED: Block = [0.24, 0.3, 1.1, 1.05];
const HUT: Block = [1.12, 0.26, 1.8, 0.86];
const SMITHY: Block = [0.34, 0.34, 1.32, 1.26];

function farm(s: ArchStyle): BuildingArt {
  const tents = logTown(s).tents;
  return {
    size: 2,
    maxHeight: tents ? 220 : 150,
    paint: (p, team) => {
      p.ground(0.05, 0.05, 1.95, 1.95, 0x6e5a3a);
      stripField(p, 0.08, 0.95, 1.92, 1.92, 4);
      if (tents) tentMill(p, s, 0.6, 0.55, 0.3, 80, 58, team);
      else {
        p.footShadow();
        // Granary (ambar) on short stone pads.
        for (const [u, v] of [[BARN[0], BARN[3]], [BARN[2], BARN[3]], [BARN[2], BARN[1]]] as const) p.box(u - 0.04, v - 0.04, u + 0.04, v + 0.04, 0, 6, { color: s.palette.stone }, s.palette.stone);
        // Two-storey northern granary: the upper storey overhangs the lower.
        logBlock(p, s, BARN, 6, 34, (w) => p.door(w * 0.55, 13, 22, s.palette.doors.work));
        const up: Block = [BARN[0] - 0.06, BARN[1] - 0.06, BARN[2] + 0.06, BARN[3] + 0.06];
        logBlock(p, s, up, 34, 60, (w) => {
          p.ctx.fillStyle = '#1e160e';
          p.ctx.fillRect(w * 0.45, -18, 9, 10);
        });
        plankGable(p, s, up, 60, 46, 'u', { horse: false, window: false });
        p.flag(1.9, 0.12, 0, 26, team);
      }
      stog(p, 1.35, 0.35, 13, 40);
      stog(p, 1.68, 0.7, 12, 36);
      poleFence(p, 0.06, 1.94, 1.94, 1.94, 10);
    },
  };
}

function lumber(s: ArchStyle): BuildingArt {
  const tents = logTown(s).tents;
  const c = s.palette;
  return {
    size: 2,
    maxHeight: tents ? 175 : 130,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.1, 0.1, 1.9, 1.9, 0x8a7a5a);
      if (tents) {
        // An unfinished log crib (srub) with a gin pole.
        const crib: Block = [1.2, 0.2, 1.8, 0.8];
        logBox(p, ...crib, 0, 64, c.darkWood);
        p.ground(crib[0] + 0.02, crib[1] + 0.02, crib[2] - 0.02, crib[3] - 0.02, 0x3a2a1c, 64);
        // Rafters already standing on the crib.
        for (const t of [0.15, 0.5, 0.85]) {
          const [ax0, ay0] = p.p(crib[0] + (crib[2] - crib[0]) * t, crib[1], 64);
          const [ax1, ay1] = p.p(crib[0] + (crib[2] - crib[0]) * t, (crib[1] + crib[3]) / 2, 104);
          const [ax2, ay2] = p.p(crib[0] + (crib[2] - crib[0]) * t, crib[3], 64);
          p.ctx.strokeStyle = css(shade(c.timber, 1.1));
          p.ctx.lineWidth = 3;
          p.ctx.beginPath();
          p.ctx.moveTo(ax0, ay0);
          p.ctx.lineTo(ax1, ay1);
          p.ctx.lineTo(ax2, ay2);
          p.ctx.stroke();
        }
        p.addVolumePoint((crib[0] + crib[2]) / 2, (crib[1] + crib[3]) / 2, 104);
        post(p, 1.88, 0.16, 0, 120, 3, c.timber);
        const [ax, ay] = p.p(1.88, 0.16, 116);
        const [bx, by] = p.p(1.5, 0.5, 70);
        p.ctx.strokeStyle = '#3a2a1a';
        p.ctx.lineWidth = 1;
        p.ctx.beginPath();
        p.ctx.moveTo(ax, ay);
        p.ctx.lineTo(bx, by);
        p.ctx.stroke();
        p.addVolumePoint(1.88, 0.16, 120);
      }
      footing(p, s, SHED, 6);
      logBlock(p, s, SHED, 6, 40, (w) => {
        p.ctx.fillStyle = '#1e160e';
        p.ctx.fillRect(w * 0.3, -30, w * 0.42, 30);
      }, (w, h) => izbaWindow(p, s, w * 0.4, -h + 12, 8, 9, R, false));
      plankGable(p, s, SHED, 40, 50, 'v');
      trestle(p, s, 1.45, 1.05, 1.55);
      logPile(p, 0.3, 1.75, 7, shade(c.darkWood, 0.9), 0xd9b07a);
      logPile(p, 1.0, 1.82, 5, shade(c.darkWood, 0.9), 0xd9b07a);
      if (!tents) logStack(p, s, 1.22, 0.24, 1.78, 0.62, 56);
      p.flag(1.86, 1.86, 0, 26, team);
    },
  };
}

function mining(s: ArchStyle): BuildingArt {
  const tents = logTown(s).tents;
  const c = s.palette;
  return {
    size: 2,
    maxHeight: tents ? 150 : 120,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.1, 0.1, 1.9, 1.9, 0x837a68);
      if (tents) {
        rockMound(p, 0.5, 0.5, 0.36, 22);
        tentHeadframe(p, s, 0.4, 0.62, 0.92, 1.14, 64, 48);
      } else {
        rockMound(p, 0.62, 0.62, 0.5, 40);
        // Timbered adit into the mound.
        const [x, y] = p.p(0.82, 1.08, 0);
        p.ctx.fillStyle = css(c.timber);
        p.ctx.fillRect(x - 11, y - 22, 22, 22);
        p.ctx.fillStyle = '#120c08';
        p.ctx.fillRect(x - 8, y - 19, 16, 19);
        windlass(p, s, 0.95, 0.82, 1.22, 72);
      }
      footing(p, s, HUT, 6);
      logBlock(p, s, HUT, 6, 36, (w) => p.door(w * 0.5, 12, 22, c.doors.work), (w, h) => izbaWindow(p, s, w * 0.35, -h + 12, 8, 9, R, false));
      plankGable(p, s, HUT, 36, 42, 'v', { horse: !tents });
      bloomery(p, 1.6, 1.2, tents ? 30 : 38);
      p.box(1.0, 1.4, 1.3, 1.68, 4, 16, { color: 0x4a4440, detail: 'planks' }, 0x4a4440);
      goldPile(p, 1.15, 1.54);
      p.flag(1.88, 1.0, 0, 28, team);
    },
  };
}

function smithy(s: ArchStyle): BuildingArt {
  const tents = logTown(s).tents;
  const c = s.palette;
  return {
    size: 2,
    maxHeight: tents ? 175 : 130,
    paint: (p: IsoPainter, team: number) => {
      p.footShadow();
      p.ground(0.1, 0.1, 1.9, 1.9, 0x7f776a);
      const stackTop = tents ? 132 : 112;
      // Age 1 vents the forge through a broad tapering daub hood; age 2 through a brick stack.
      if (tents) chimney(p, 0.86, 0.42, 1.12, 0.68, 0, stackTop, { color: c.brick, detail: 'brick' });
      else smokeHood(p, s, 0.66, 0.26, 1.3, 0.86, 0, stackTop);
      if (tents) {
        // Tented smoke hood (dymnik) on four little posts over the stack.
        for (const [u, v] of [[0.84, 0.66], [1.14, 0.66], [1.14, 0.4]] as const) post(p, u, v, stackTop, stackTop + 9, 1.2, 0x3a3530);
        tentRoof(p, 0.99, 0.55, 0.17, stackTop + 9, 30, c.roofAlt, { material: 'tile', eave: 0.02 });
      }
      const top0 = footing(p, s, SMITHY, tents ? 20 : 6, undefined, (w) => forgeMouth(p, w * 0.3, 24, 18));
      logBlock(p, s, SMITHY, top0, top0 + 30, (w) => {
        if (!tents) p.door(w * 0.55, 13, 24, c.doors.work);
        else izbaWindow(p, s, w * 0.5, -22, 8, 9, 1, false);
      }, tents ? undefined : (w) => forgeMouth(p, w * 0.3, 24, 26));
      plankGable(p, s, SMITHY, top0 + 30, 44, 'v', { horse: false });
      if (tents) p.leftFace(SMITHY[0], SMITHY[2], SMITHY[3], 0, (w) => p.door(w * 0.55, 13, 18, c.doors.work), 20);
      forgeLight(p, 1.55, 0.8);
      const [x, y] = p.p(1.62, 1.35, 0);
      const ctx = p.ctx;
      ctx.fillStyle = '#5a3b20';
      ctx.fillRect(x - 5, y - 9, 10, 9);
      ctx.fillStyle = '#34343a';
      ctx.fillRect(x - 9, y - 13, 18, 4.5);
      ctx.fillRect(x - 3, y - 10, 6, 2);
      logPile(p, 0.3, 1.78, 5, shade(c.darkWood, 0.9), 0xd9b07a);
      p.flag(1.88, 1.88, 0, 26, team);
    },
  };
}

/** The log-town workplaces of ages 1-2. */
export function izbaWorkArt(s: ArchStyle): AgeArtSet {
  return { farm: farm(s), lumber_camp: lumber(s), mining_camp: mining(s), blacksmith: smithy(s) };
}
