import { HW, type IsoPainter } from '../../isoPainter';
import { paintWindow, type WindowLook } from '../../isoProps';
import { css, shade } from '../../palette';
import type { ArchStyle } from '../style';
import { coneRoof, drumWall, type DrumDetail } from './drum';

/*
 * Pepperpot kit (poivrière): the candle-snuffer cone of slate on a round
 * turret — Loire château corner towers, stair turrets, dovecotes. Styles
 * switch it on with kits.pepperpots; the families that have a turret
 * spot (keep corners, stair towers, yard dovecotes) call `turret` there.
 * The cone is a faceted coneRoof with slate courses, a moulded eave band
 * and a lead finial (épi) with a gilt knop.
 */

/** Whether the style raises pepperpot turrets in its families' turret spots. */
export function hasPepperpots(s: ArchStyle): boolean {
  return s.kits?.pepperpots === true;
}

/** Extra canvas height (art px) a family adds for a pepperpot of `px` when the style has them. */
export function pepperpotRoom(s: ArchStyle, px: number): number {
  return hasPepperpots(s) ? px : 0;
}

/** Lead finial (épi): a turned spike with a gilt knop above (x, y) canvas px. */
export function epi(p: IsoPainter, x: number, y: number, size: number): void {
  const ctx = p.ctx;
  ctx.fillStyle = '#3c4048';
  ctx.beginPath();
  ctx.moveTo(x - size * 0.35, y + 1);
  ctx.lineTo(x, y - size * 3.2);
  ctx.lineTo(x + size * 0.35, y + 1);
  ctx.fill();
  const g = ctx.createRadialGradient(x - 0.6, y - size * 1.3, 0.2, x, y - size * 1.1, size * 0.7);
  g.addColorStop(0, '#fff2b8');
  g.addColorStop(1, '#a87a22');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y - size * 1.1, size * 0.5, 0, Math.PI * 2);
  ctx.fill();
  p.normalCylinder(x - size * 0.5, y - size * 3.2, size, size * 3.2);
}

/**
 * Pepperpot cap: a slate cone of base radius `r` tiles on (uc, vc) at
 * height z rising `rise` art px, with a stone eave band and a finial.
 * Returns the apex height (art px).
 */
export function pepperpot(p: IsoPainter, uc: number, vc: number, r: number, z: number, rise: number, color: number, band: number): number {
  drumWall(p, uc, vc, r - 0.015, z - 4, z, band, 'ashlar');
  const prev = p.material;
  p.material = 'slate';
  const apex = coneRoof(p, uc, vc, r, z - 1, rise, color, 'slate');
  p.material = prev;
  // A bright lead flashing line at the eave catches the light.
  const ctx = p.ctx;
  ctx.strokeStyle = css(shade(color, 1.5), 0.55);
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let k = 0; k <= 16; k++) {
    const a = -Math.PI / 4 + (k / 16) * Math.PI;
    const [x, y] = p.p(uc + r * Math.cos(a), vc + r * Math.sin(a), z - 1);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  epi(p, apex[0], apex[1], Math.max(2.2, Math.min(4.2, r * 14)));
  return z - 1 + rise;
}

export interface TurretOpts {
  /** Drum texture; default dressed ashlar. */
  readonly detail?: DrumDetail;
  /** Window heights (art px above z0) of small lights on the visible face; each glows at dusk. */
  readonly lights?: readonly number[];
  /** Window look of the lights (the style's window by default). */
  readonly look?: WindowLook;
  /** Cone rise as a multiple of the turret's diameter in art px (candle-snuffer ≈ 2.2). */
  readonly steep?: number;
  /** Corbelled (machicolated) top: the drum oversails on a corbel course under the cone. */
  readonly corbels?: boolean;
  /** Heights (art px above z0) of projecting string courses (a dovecote's rat ledge). */
  readonly bands?: readonly number[];
  /** Team pennant on the finial. */
  readonly team?: number;
}

/** Diameter of a turret of radius r in canvas px (a circle of r tiles projects to r·√2·HW). */
function diameter(r: number): number {
  return r * 2 * Math.SQRT2 * HW;
}

/**
 * Round turret with a pepperpot cap: drum from z0 to z1 in `stone`,
 * optional corbel course and lights, cone in `slate`. Returns the apex
 * height (art px) for a flag or weathervane.
 */
export function turret(p: IsoPainter, s: ArchStyle, uc: number, vc: number, r: number, z0: number, z1: number, opts: TurretOpts = {}): number {
  const c = s.palette;
  const stone = c.ashlar;
  drumWall(p, uc, vc, r, z0, z1, stone, opts.detail ?? 'ashlar');
  for (const b of opts.bands ?? []) drumWall(p, uc, vc, r + 0.025, z0 + b, z0 + b + 3, shade(stone, 1.06), 'ashlar');
  const ctx = p.ctx;
  const look = opts.look ?? c.window;
  for (const [i, h] of (opts.lights ?? []).entries()) {
    const a = 0.55 + i * 0.5;
    const [x, y] = p.p(uc + r * Math.cos(a), vc + r * Math.sin(a), z0 + h);
    const w = Math.max(3, r * 22);
    paintWindow(ctx, x - w / 2, y - w * 1.9, w, w * 1.9, true, look);
    p.addGlow(x, y - w, w * 1.3);
  }
  let top = z1;
  if (opts.corbels) {
    drumWall(p, uc, vc, r + 0.02, z1, z1 + 3, shade(stone, 0.86), 'ashlar');
    // Corbel teeth under the oversailing parapet.
    for (let k = 0; k < 9; k++) {
      const a = -Math.PI / 4 + ((k + 0.5) / 9) * Math.PI;
      const [x, y] = p.p(uc + (r + 0.025) * Math.cos(a), vc + (r + 0.025) * Math.sin(a), z1 + 3);
      ctx.fillStyle = css(shade(stone, 0.62));
      ctx.fillRect(x - 1, y, 2, 3);
    }
    drumWall(p, uc, vc, r + 0.04, z1 + 3, z1 + 12, stone, 'ashlar');
    top = z1 + 12;
  }
  const rr = r + (opts.corbels ? 0.06 : 0.03);
  const apex = pepperpot(p, uc, vc, rr, top, diameter(rr) * (opts.steep ?? 2.2), c.roofAlt, shade(stone, 0.92));
  if (opts.team !== undefined) p.flag(uc, vc, apex + 6, 14, opts.team);
  return apex;
}

/** Yard dovecote (pigeonnier): a round tower with a rat ledge, a flight hole that glows at dusk and a pepperpot cap. */
export function dovecote(p: IsoPainter, s: ArchStyle, uc: number, vc: number, r: number, h: number, team?: number): number {
  return turret(p, s, uc, vc, r, 0, h, { lights: [h * 0.62], bands: [h * 0.42], steep: 1.9, ...(team === undefined ? {} : { team }) });
}
