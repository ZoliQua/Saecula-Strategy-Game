import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { sentryBox, railFence } from '../baroqueParts';
import { archedOpening, cornice, crest, R } from '../facade';
import { atticRoof } from '../kits/atticParapet';
import { chimney, forgeLight, forgeMouth, lantern, target } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import type { Block } from './biskupinParts';
import { anvil, bowRack } from './workParts';

/*
 * Zamość workshops (Polish age 3, M22): the barracks, archery range,
 * stable and smithy of the ideal Renaissance town, which until M22 were
 * the shared baroque layouts under attics. Each is a block rendered in
 * its own colour, as on the Zamość market, its ground floor opening in a
 * round-arched arcade, its roof hidden behind a crested attic:
 * - barracks: the ochre arsenal with a square corner tower under its own
 *   attic, a red-and-white sentry box on the drill yard;
 * - archery range: a green open loggia and a rose garden pavilion over
 *   the shooting field with its targets;
 * - stable: a blue stall hall of arched doors with a taller gate
 *   pavilion in the middle of its front;
 * - smithy: an apricot arcaded house, one arch the glowing forge, a
 *   tall brick stack through the attic.
 * Sizes and height budgets are those of the baroque painters they replace.
 */

/** Painted neighbours' renders, as on the Zamość market. */
const OCHRE = 0xe2bf6a;
const GREEN = 0x9fbf98;
const BLUE = 0x9db8cc;
const ROSE = 0xd89c94;

const ATTIC_RISE = 26;
const PAVING = 0xc2b49a;

type Face = (w: number, h: number) => void;

/** A rendered block with a stone plinth, faces painted by `left` / `right`, under a crested attic in its own colour; returns the attic top. */
function block(p: IsoPainter, s: ArchStyle, b: Block, wall: number, colour: number, left?: Face, right?: Face): number {
  const c = s.palette;
  const [u0, v0, u1, v1] = b;
  p.box(u0 - 0.02, v0 - 0.02, u1 + 0.02, v1 + 0.02, 0, 6, { color: c.stone, detail: 'stone' }, c.stone);
  p.box(u0, v0, u1, v1, 6, wall, { color: colour, detail: 'plaster' });
  const face = (light: number, draw?: Face): Face => (w, h) => {
    // Rusticated quoins at both corners, white like the attic.
    if (s.ornaments.quoins) {
      p.ctx.fillStyle = css(shade(c.trim, light * 0.96));
      for (let y = 2; y < h - 6; y += 9) {
        const k = (y / 9) % 2 ? 5 : 8;
        p.ctx.fillRect(0, -y - 6, k, 6);
        p.ctx.fillRect(w - k, -y - 6, k, 6);
      }
    }
    cornice(p.ctx, w, h - 4, c.trim, light, 4);
    draw?.(w, h);
  };
  p.leftFace(u0, u1, v1, 6, face(1, left), wall - 6);
  p.rightFace(v0, v1, u1, 6, face(R, right), wall - 6);
  const tinted: ArchStyle = { ...s, palette: { ...c, plaster: colour } };
  atticRoof(p, tinted, u0, v0, u1, v1, wall, ATTIC_RISE, c.roof);
  return wall + 23;
}

/**
 * Round-arched arcade of `n` bays along a face (face-local; y measured
 * from the plinth top): open arches `h` high, white archivolts, and a
 * string cornice above. `fill` paints inside bay i (door, light, forge).
 */
function arcade(p: IsoPainter, s: ArchStyle, w: number, light: number, n: number, h: number, fill?: (i: number, x: number, bw: number) => void): void {
  const ctx = p.ctx;
  const bay = w / n;
  for (let i = 0; i < n; i++) {
    const x = bay * i;
    const r = bay / 2 - 3;
    ctx.fillStyle = '#21160d';
    ctx.beginPath();
    ctx.moveTo(x + 3, 0);
    ctx.lineTo(x + 3, -h + r);
    ctx.arc(x + bay / 2, -h + r, r, Math.PI, 0);
    ctx.lineTo(x + bay - 3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = css(shade(s.palette.trim, light));
    ctx.lineWidth = 1.6;
    ctx.stroke();
    fill?.(i, x + 3, bay - 6);
  }
  cornice(ctx, w, h + 4, s.palette.trim, light, 3);
}

/** A row of white-framed casements at height y (face-local), one per bay; `lit` picks the ones that show light. */
function casements(p: IsoPainter, s: ArchStyle, w: number, light: number, n: number, y: number, ww = 8, wh = 12, lit: (i: number) => boolean = () => true): void {
  const bay = w / n;
  for (let i = 0; i < n; i++) {
    const x = bay * (i + 0.5);
    p.ctx.fillStyle = css(shade(s.palette.trim, light));
    p.ctx.fillRect(x - ww / 2 - 1.5, y - wh - 1.5, ww + 3, wh + 3.5);
    if (lit(i)) p.window(x - ww / 2, y - wh, ww, wh);
    else {
      p.ctx.fillStyle = '#2a2420';
      p.ctx.fillRect(x - ww / 2, y - wh, ww, wh);
    }
  }
}

function paving(p: IsoPainter, u0: number, v0: number, u1: number, v1: number): void {
  const ctx = p.ctx;
  p.ground(u0, v0, u1, v1, PAVING);
  ctx.strokeStyle = 'rgba(90,80,64,.2)';
  ctx.lineWidth = 1;
  for (let t = 0.3; t < 2.95; t += 0.25) {
    for (const [a, b] of [[p.p(Math.min(t, u1), v0, 0), p.p(Math.min(t, u1), v1, 0)], [p.p(u0, Math.min(t, v1), 0), p.p(u1, Math.min(t, v1), 0)]] as const) {
      ctx.beginPath();
      ctx.moveTo(a[0], a[1]);
      ctx.lineTo(b[0], b[1]);
      ctx.stroke();
    }
  }
}

function paintBarracks(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  paving(p, 0.05, 0.05, 2.95, 2.95);
  // The arsenal: an ochre block, arcaded below, a row of casements above.
  // Its first bay hides behind the corner tower, so it shows no light.
  block(p, s, [0.3, 0.3, 2.7, 1.4], 66, OCHRE, (w, h) => {
    arcade(p, s, w, 1, 6, 28, (i, x, bw) => {
      if (i === 3) p.door(x + 2, bw - 4, 20, c.doors.main);
      else if (i > 0) p.window(x + bw / 2 - 3, -14, 6, 9);
    });
    casements(p, s, w, 1, 6, -h + 16, 8, 13, (i) => i > 0);
    crest(p.ctx, s, w * 0.583, -h + 30, 6, team);
  }, (w, h) => {
    arcade(p, s, w, R, 3, 28);
    casements(p, s, w, R, 3, -h + 16, 8, 13);
  });
  // The square corner tower, its own crested attic high over the yard.
  block(p, s, [0.26, 1.6, 0.8, 2.14], 108, shade(OCHRE, 0.94), (w, h) => {
    archedOpening(p.ctx, w / 2 - 8, 16, 26, c.trim, 0x22170e, 1);
    p.door(w / 2 - 7, 14, 22, c.doors.gate);
    casements(p, s, w, 1, 1, -h + 46, 9, 14);
    casements(p, s, w, 1, 1, -h + 20, 9, 14);
  }, (w, h) => {
    casements(p, s, w, R, 1, -h + 46, 9, 14);
    casements(p, s, w, R, 1, -h + 20, 9, 14);
  });
  p.flag(0.53, 1.87, 131, 18, team, true);
  // The drill yard: a red-and-white sentry box, lanterns at the arcade.
  sentryBox(p, 1.9, 2.3, 0xf2ece0, '#b8352a');
  lantern(p, 1.1, 1.42, 30, 1.1, 1.65);
  lantern(p, 2.3, 1.42, 30, 2.3, 1.65);
}

function paintRange(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x93a46a);
  paving(p, 0.15, 0.2, 1.8, 1.4);
  // The shooting loggia: a green block open in a tall arcade.
  block(p, s, [0.3, 0.3, 1.7, 1.15], 48, GREEN, (w) => {
    arcade(p, s, w, 1, 4, 32);
  }, (w) => arcade(p, s, w, R, 2, 32, (i, x, bw) => {
    if (i === 1) p.window(x + bw / 2 - 3, -18, 6, 10);
  }));
  // A rose garden pavilion at the head of the field.
  block(p, s, [2.06, 0.3, 2.56, 0.8], 40, ROSE, (w) => arcade(p, s, w, 1, 1, 26), (w) => arcade(p, s, w, R, 1, 26));
  for (const v of [1.3, 1.9, 2.5]) target(p, 2.55, v);
  bowRack(p, 1.6, 1.6, 2.1, c.timber);
  railFence(p, 0.2, 2.85, 2.1, 2.85, 12);
  lantern(p, 1.7, 1.0, 32, 1.88, 1.0);
  p.flag(0.4, 2.55, 0, 40, team, true);
}

function paintStable(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0xa8986e);
  paving(p, 0.15, 0.2, 2.75, 1.75);
  // The stall hall: a blue block of arched stall doors.
  block(p, s, [0.3, 0.3, 2.6, 1.55], 50, BLUE, (w, h) => {
    arcade(p, s, w, 1, 7, 30, (i, x, bw) => {
      if (i === 3) return;
      ctx.fillStyle = css(shade(c.doors.gate, 1.05));
      ctx.fillRect(x + 1, -14, bw - 2, 14);
    });
    // Oculi of the hay loft.
    const bay = w / 7;
    for (let i = 0; i < 7; i++) {
      if (i === 3) continue;
      ctx.fillStyle = css(c.trim);
      ctx.beginPath();
      ctx.arc(bay * (i + 0.5), -h + 9, 3.6, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2a2420';
      ctx.beginPath();
      ctx.arc(bay * (i + 0.5), -h + 9, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }, (w) => arcade(p, s, w, R, 3, 30, (i, x, bw) => {
    if (i === 1) p.window(x + bw / 2 - 3, -18, 6, 10);
  }));
  // The gate pavilion: taller, in the town's apricot, the owner's arms over the gate.
  block(p, s, [1.18, 1.55, 1.72, 1.86], 72, c.plaster, (w, h) => {
    archedOpening(ctx, w / 2 - 11, 22, 34, c.trim, 0x22170e, 1);
    p.door(w / 2 - 9, 18, 26, c.doors.gate);
    crest(ctx, s, w / 2, -h + 18, 7, team);
  }, (w, h) => casements(p, s, w, R, 1, -h + 22, 7, 12));
  // Paddock rails, a trough and hay.
  railFence(p, 0.3, 2.85, 2.85, 2.85, 13);
  railFence(p, 2.85, 2.85, 2.85, 1.95, 13);
  p.box(2.0, 2.15, 2.6, 2.3, 0, 7, { color: c.ashlar }, 0x4f7f9a);
  for (const u of [0.5, 0.86]) p.box(u, 2.1, u + 0.32, 2.42, 0, 13, { color: 0xd9b55a }, 0xe8c873);
  p.flag(2.8, 0.25, 0, 40, team, true);
}

function paintSmithy(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  paving(p, 0.08, 0.08, 1.92, 1.92);
  chimney(p, 1.46, 0.22, 1.66, 0.42, 0, 118, { color: c.stack, detail: 'brick' });
  // The smithy: an apricot arcaded house, its second arch the forge.
  block(p, s, [0.24, 0.48, 1.42, 1.48], 52, c.plaster, (w, h) => {
    arcade(p, s, w, 1, 2, 30, (i, x, bw) => {
      if (i === 0) p.door(x + 2, bw - 4, 22, c.doors.work);
      else forgeMouth(p, x + 2, bw - 4, 22);
    });
    casements(p, s, w, 1, 2, -h + 14, 8, 11, (i) => i === 1);
  }, (w, h) => {
    arcade(p, s, w, R, 2, 30);
    casements(p, s, w, R, 2, -h + 14, 7, 11, (i) => i === 0);
  });
  forgeLight(p, 1.1, 1.75);
  anvil(p, 1.25, 1.62);
  lantern(p, 0.3, 1.5, 30, 0.3, 1.7);
  p.flag(1.84, 0.2, 0, 30, team);
}

export function zamoscBarracks(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 190 + s.headroom, paint: (p, team) => paintBarracks(p, s, team) };
}

export function zamoscRange(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 150 + s.headroom, paint: (p, team) => paintRange(p, s, team) };
}

export function zamoscStable(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 160 + s.headroom, paint: (p, team) => paintStable(p, s, team) };
}

export function zamoscSmithy(s: ArchStyle): BuildingArt {
  return { size: 2, maxHeight: 140 + s.headroom, paint: (p, team) => paintSmithy(p, s, team) };
}
