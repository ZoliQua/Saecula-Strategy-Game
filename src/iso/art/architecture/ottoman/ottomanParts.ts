import type { Ctx } from '../../canvas';
import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { R } from '../facade';
import type { Block } from '../kits/lowHip';
import { leadDome } from '../kits/leadDome';
import { octPrism, tentRoof } from '../kits/tentRoof';
import type { ArchStyle } from '../style';

/*
 * Masonry shared by the three Ottoman ages: banded opus mixtum (age 1),
 * coursed honey ashlar with turquoise friezes (age 2) and pale cut
 * limestone (age 3); pointed and round arch heads; the Seljuk portal
 * (pishtaq) face; the kümbet tomb tower.
 */

export type { Block };

/** Face painter in face-local px (x along the face, y up as negative). */
export type Face = (w: number, h: number) => void;

/** Path of a pointed (two-centred) arch, foot at y, x..x+w, total height h. */
export function pointedPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  const spring = y - h + w * 0.62;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, spring);
  ctx.quadraticCurveTo(x, y - h + w * 0.12, x + w / 2, y - h);
  ctx.quadraticCurveTo(x + w, y - h + w * 0.12, x + w, spring);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

/** Path of a round-headed arch, foot at y, x..x+w, total height h. */
export function roundPath(ctx: Ctx, x: number, y: number, w: number, h: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - h + w / 2);
  ctx.arc(x + w / 2, y - h + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(x + w, y);
  ctx.closePath();
}

/** Opus mixtum on a face: bands of five thin brick courses laced through limestone courses. */
export function bandedFace(ctx: Ctx, s: ArchStyle, w: number, h: number, light: number): void {
  const c = s.palette;
  const stoneH = 10;
  const brickH = 8;
  for (let y = 0, row = 0; y < h; row++) {
    const stone = row % 2 === 0;
    const bh = Math.min(stone ? stoneH : brickH, h - y);
    if (stone) {
      ctx.fillStyle = css(shade(c.stone, light));
      ctx.fillRect(0, -y - bh, w, bh);
      ctx.fillStyle = css(shade(c.stone, light * 0.7), 0.6);
      ctx.fillRect(0, -y - bh, w, 0.8);
      for (let x = (row % 4) * 4; x < w; x += 15) ctx.fillRect(x, -y - bh, 0.8, bh);
      ctx.fillStyle = css(shade(c.stone, light * 1.15), 0.5);
      ctx.fillRect(0, -y - bh + 0.8, w, 0.8);
    } else {
      ctx.fillStyle = css(shade(c.brick, light));
      ctx.fillRect(0, -y - bh, w, bh);
      ctx.fillStyle = css(shade(c.trim, light * 0.85), 0.7);
      for (let k = 1.6; k < bh; k += 1.6) ctx.fillRect(0, -y - k, w, 0.55);
    }
    y += bh;
  }
}

/** Coursed ashlar on a face: regular courses with staggered joints, a darker plinth. */
export function ashlarFace(ctx: Ctx, color: number, w: number, h: number, light: number): void {
  ctx.fillStyle = css(shade(color, light * 0.72), 0.45);
  for (let y = 7, row = 0; y < h; y += 7, row++) {
    ctx.fillRect(0, -y, w, 0.7);
    for (let x = (row % 2) * 7; x < w; x += 14) ctx.fillRect(x, -y, 0.7, 7);
  }
  ctx.fillStyle = css(shade(color, light * 0.8));
  ctx.fillRect(0, -5, w, 5);
}

/** Painted frieze band (glazed tile) at face height y. */
export function frieze(ctx: Ctx, w: number, y: number, color: number, light: number, band = 3): void {
  ctx.fillStyle = css(shade(color, light));
  ctx.fillRect(0, y - band, w, band);
  ctx.fillStyle = css(shade(color, light * 1.5), 0.6);
  for (let x = 1; x < w; x += 4) ctx.fillRect(x, y - band + 0.8, 1.6, band - 1.6);
}

/** A block whose two visible faces get `skin`, then the extras. */
export function skinnedBlock(p: IsoPainter, b: Block, z0: number, z1: number, color: number, top: number | undefined, skin: (w: number, h: number, light: number) => void, left?: Face, right?: Face): void {
  const [u0, v0, u1, v1] = b;
  p.box(u0, v0, u1, v1, z0, z1, { color }, top);
  p.leftFace(u0, u1, v1, z0, (w, h) => {
    skin(w, h, 1);
    left?.(w, h);
  }, z1 - z0);
  p.rightFace(v0, v1, u1, z0, (w, h) => {
    skin(w, h, R);
    right?.(w, h);
  }, z1 - z0);
}

/** Opus mixtum block (age 1). */
export function bandedBlock(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, left?: Face, right?: Face, top?: number): void {
  skinnedBlock(p, b, z0, z1, s.palette.brick, top, (w, h, l) => bandedFace(p.ctx, s, w, h, l), left, right);
}

/** Ashlar block (ages 2 and 3), with an optional frieze under its top. */
export function ashlarBlock(p: IsoPainter, s: ArchStyle, b: Block, z0: number, z1: number, left?: Face, right?: Face, top?: number, friezeColor?: number): void {
  const c = s.palette;
  skinnedBlock(p, b, z0, z1, c.ashlar, top, (w, h, l) => {
    ashlarFace(p.ctx, c.ashlar, w, h, l);
    if (friezeColor !== undefined) frieze(p.ctx, w, -h + 6, friezeColor, l);
  }, left, right);
}

/** Flat roof with a coping round its edge (terraces of the courtyard buildings). */
export function terrace(p: IsoPainter, b: Block, z: number, color: number, coping: number): void {
  const [u0, v0, u1, v1] = b;
  p.ground(u0, v0, u1, v1, shade(color, 0.92), z);
  p.box(u0, v1 - 0.05, u1, v1, z, z + 4, { color: coping }, coping);
  p.box(u1 - 0.05, v0, u1, v1 - 0.05, z, z + 4, { color: coping }, coping);
}

/**
 * Seljuk portal face (pishtaq), on a face w wide and h high: a tile-framed
 * rectangle, a carved border, a deep pointed niche with muqarnas rows in
 * its hood and a door at its foot.
 */
export function pishtaqFace(p: IsoPainter, s: ArchStyle, w: number, h: number, light: number, door = true): void {
  const ctx = p.ctx;
  const c = s.palette;
  ashlarFace(ctx, c.ashlar, w, h, light);
  // Turquoise tile frame and a carved inner border.
  const m = Math.max(2.5, w * 0.09);
  ctx.fillStyle = css(shade(c.trim, light));
  ctx.fillRect(m * 0.5, -h + 3, w - m, 3);
  ctx.fillRect(m * 0.5, -h + 3, 2.4, h - 8);
  ctx.fillRect(w - m * 0.5 - 2.4, -h + 3, 2.4, h - 8);
  ctx.fillStyle = css(shade(c.ashlar, light * 1.15));
  ctx.fillRect(m + 1, -h + 8, w - 2 * m - 2, h - 10);
  // The niche.
  const nx = m + 3.5;
  const nw = w - 2 * nx;
  const nh = h - 14;
  ctx.fillStyle = css(shade(c.ashlar, light * 0.42));
  pointedPath(ctx, nx, -2, nw, nh);
  ctx.fill();
  // Muqarnas: rows of small pointed cells in the hood.
  ctx.save();
  pointedPath(ctx, nx, -2, nw, nh);
  ctx.clip();
  const rows = 4;
  for (let r = 0; r < rows; r++) {
    const y = -2 - nh + nw * 0.35 + r * 4.2;
    const cells = 3 + r;
    const cw = nw / cells;
    for (let k = 0; k < cells; k++) {
      ctx.fillStyle = css(shade(c.ashlar, light * (0.78 + 0.08 * ((k + r) % 2))));
      pointedPath(ctx, nx + k * cw + 0.4, y + 3.6, cw - 0.8, 4.4);
      ctx.fill();
    }
  }
  ctx.restore();
  if (door) p.door(w / 2 - nw * 0.3, nw * 0.6, Math.min(26, nh * 0.42), c.doors.main);
}

/**
 * Kümbet: an octagonal ashlar tomb tower of apothem r tiles on (uc, vc)
 * from z0 to z0 + h, blind pointed niches and a tile frieze on its
 * facets, under a conical (sixteen-ish faceted) roof rising `rise`.
 * Returns the apex height.
 */
export function kumbet(p: IsoPainter, s: ArchStyle, uc: number, vc: number, r: number, z0: number, h: number, rise: number, roof = s.palette.roof): number {
  const c = s.palette;
  octPrism(p, uc, vc, r, z0, z0 + h, c.ashlar, 'stone', (w, fh, light) => {
    const ctx = p.ctx;
    ctx.fillStyle = css(shade(c.ashlar, light * 0.62));
    pointedPath(ctx, w * 0.22, -8, w * 0.56, Math.min(fh - 14, fh * 0.62));
    ctx.fill();
    frieze(ctx, w, -fh + 5, c.trim, light, 2.6);
  });
  tentRoof(p, uc, vc, r, z0 + h, rise, roof, { material: 'slate', eave: 0.03 });
  p.addVolumePoint(uc, vc, z0 + h + rise);
  return z0 + h + rise;
}

/** Pointed window in a pale surround (face-local), lit or dark; foot at y. */
export function pointedWindow(p: IsoPainter, surround: number, x: number, y: number, w: number, h: number, light: number, lit = true): void {
  const ctx = p.ctx;
  ctx.fillStyle = css(shade(surround, light * 1.08));
  pointedPath(ctx, x - 1.6, y + 1, w + 3.2, h + 2.6);
  ctx.fill();
  if (lit) p.window(x, y - h, w, h, true);
  else {
    ctx.fillStyle = '#21160e';
    pointedPath(ctx, x, y, w, h);
    ctx.fill();
  }
}

/** A row of small domes (r tiles) standing on z along a line from (u0, v0) to (u1, v1), n of them, back to front. */
export function domeRow(p: IsoPainter, u0: number, v0: number, u1: number, v1: number, n: number, r: number, z: number, color: number, drum: number): void {
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    leadDome(p, u0 + (u1 - u0) * t, v0 + (v1 - v0) * t, r, z, color, { rise: 0.85, drum, seams: 4, alem: r > 0.15 });
  }
}
