import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { archedOpening, crest, R } from '../facade';
import { torch } from '../parts';
import type { ArchStyle } from '../style';
import { styledGable, styledHip } from '../styledRoofs';
import type { BuildingArt } from '../types';
import { arcadeStorey, cornice, weathering } from './romanesqueParts';

/*
 * German age-1 town centre: a twin of Trier's Porta Nigra — a gate hall
 * of weathered red sandstone whose two passages open between two
 * taller towers, three and four storeys of arcades between half-columns,
 * the towers capped with steep shingle hips and the team flags, the
 * eagle crest over the gates and torches at the passages.
 */

type Block = readonly [u0: number, v0: number, u1: number, v1: number];

const LEFT_TOWER: Block = [0.3, 0.75, 1.1, 1.65];
const HALL: Block = [1.1, 0.85, 1.9, 1.45];
const RIGHT_TOWER: Block = [1.9, 0.75, 2.7, 1.65];
/** Storey tops (art px): the hall has a gate storey and two arcades, the towers one arcade more. */
const HALL_STOREYS = [38, 66, 94] as const;
const TOWER_STOREYS = [34, 62, 90, 118, 146] as const;
const TOWER_ROOF = 46;
/** Blackened Trier sandstone: the style's ashlar darkened by centuries of soot. */
const SOOT = 0.8;

/** Arcaded storeys on a face above a ground storey of height `ground` (face-local). */
function storeys(p: IsoPainter, s: ArchStyle, w: number, h: number, tops: readonly number[], light: number): void {
  const stone = shade(s.palette.ashlar, SOOT);
  for (let i = 1; i < tops.length; i++) arcadeStorey(p, w, tops[i - 1]!, tops[i]!, stone, light, i === tops.length - 1, 13);
  cornice(p.ctx, w, tops[0]!, stone, light);
  weathering(p, w, h, 0.42);
}

/** One gate tower: plinth, four storeys (slit windows below), steep shingle hip, team flag. */
function tower(p: IsoPainter, s: ArchStyle, [u0, v0, u1, v1]: Block, team: number): void {
  const c = s.palette;
  const top = TOWER_STOREYS[TOWER_STOREYS.length - 1]!;
  const stone = shade(c.ashlar, SOOT);
  p.box(u0 - 0.04, v0 - 0.04, u1 + 0.04, v1 + 0.04, 0, 8, { color: shade(stone, 0.85), detail: 'stone' }, stone);
  p.box(u0, v0, u1, v1, 8, top, { color: stone, detail: 'stone' });
  const face = (light: number) => (w: number, h: number) => {
    storeys(p, s, w, h, TOWER_STOREYS.map((t) => t - 8), light);
    p.ctx.fillStyle = '#1a110c';
    for (const x of [w * 0.3, w * 0.7]) p.ctx.fillRect(x - 1.3, -22, 2.6, 11);
  };
  p.leftFace(u0, u1, v1, 8, face(1), top - 8);
  p.rightFace(v0, v1, u1, 8, face(R), top - 8);
  styledHip(p, s, u0, v0, u1, v1, top, TOWER_ROOF, c.roof, 0.06);
  p.flag((u0 + u1) / 2, (v0 + v1) / 2, top + TOWER_ROOF * s.roof.pitch - 4, 26, team, true);
}

/** The gate hall between the towers: two passages, the eagle crest, two arcades, a shingle gable. */
function hall(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = HALL;
  const top = HALL_STOREYS[HALL_STOREYS.length - 1]!;
  const stone = shade(c.ashlar, SOOT);
  p.box(u0, v0, u1, v1, 0, top, { color: stone, detail: 'stone' });
  p.leftFace(u0, u1, v1, 0, (w, h) => {
    storeys(p, s, w, h, HALL_STOREYS, 1);
    for (const x of [w * 0.27, w * 0.73]) {
      archedOpening(p.ctx, x - 8, 16, 30, shade(stone, 1.12), 0x150d09);
      p.ctx.fillStyle = css(shade(c.doors.gate, 0.9));
      p.ctx.fillRect(x - 8, -14, 16, 14);
    }
    crest(p.ctx, s, w / 2, -31, 6, team);
  }, top);
  styledGable(p, s, u0, v0, u1, v1, top, 18, c.roof, stone, 'u', 0.04);
}

/** The German age-1 town centre (overrides the Roman family's). */
export function portaNigra(s: ArchStyle): BuildingArt {
  const c = s.palette;
  return {
    size: 3,
    maxHeight: 250,
    paint: (p, team) => {
      p.footShadow();
      p.ground(0.05, 0.05, 2.95, 2.95, 0xa89a82);
      // Paved road through the gate and the forecourt.
      p.ground(1.2, 1.45, 1.8, 2.95, 0x8f8574);
      for (let v = 1.55; v < 2.95; v += 0.12) {
        const a = p.p(1.2, v, 0);
        const b = p.p(1.8, v, 0);
        p.ctx.strokeStyle = 'rgba(40,30,22,.35)';
        p.ctx.lineWidth = 0.8;
        p.ctx.beginPath();
        p.ctx.moveTo(a[0], a[1]);
        p.ctx.lineTo(b[0], b[1]);
        p.ctx.stroke();
      }
      tower(p, s, LEFT_TOWER, team);
      hall(p, s, team);
      tower(p, s, RIGHT_TOWER, team);
      torch(p, 1.15, 1.45, 30, 1.2, 1.8);
      torch(p, 1.85, 1.45, 30, 1.8, 1.8);
      // Milestone and a stack of dressed blocks by the road.
      p.box(0.7, 2.2, 0.82, 2.32, 0, 16, { color: c.ashlar, detail: 'stone' }, c.ashlar);
      p.box(2.2, 2.2, 2.6, 2.45, 0, 7, { color: shade(c.ashlar, 1.05), detail: 'stone' }, c.ashlar);
      p.box(2.25, 2.25, 2.5, 2.42, 7, 13, { color: shade(c.ashlar, 0.95), detail: 'stone' }, c.ashlar);
    },
  };
}
