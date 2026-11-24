import type { IsoPainter } from '../../isoPainter';
import { css, mix, shade } from '../../palette';
import { cornice, R } from '../facade';
import { steppedGableRoof, steppedOutline } from '../kits/steppedGable';
import { beam } from '../landmarkProps';
import { barrel, sacks } from '../market';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { treadwheelCrane } from './treadwheelCrane';

/*
 * German landmark (M17): the Hanza-kontor, a Hanseatic merchants'
 * warehouse of the Lübeck / Stralsund kind. A tall Backstein storehouse
 * turns its crow-stepped brick gable to the quay: four storeys of loading
 * doors stacked over an arched gateway, a hoist beam under the crown
 * lifting a bale, blind lancet niches in the gable; its long side shows
 * rows of windows between brick pilaster strips under a corbel frieze. On
 * the quay stand a timber treadwheel crane (treadwheelCrane.ts), crates,
 * barrels and sacks. The brick, trim and roof follow the age style (the
 * Fachwerk red of the Középkor, the dark Backstein of the Felvilágosodás);
 * the gable is always stepped brick, whatever the style's gables.
 */

const STORE: readonly [number, number, number, number] = [0.3, 0.3, 1.55, 2.15];
/** Storey lines of the warehouse (art px): plinth, then four floors to the eave. */
const FLOORS = [12, 40, 66, 92, 118] as const;
const EAVE = 118;
const RISE = 66;
const CRATE = 0x9a6c3c;

/** The quay's brick paving. */
function quay(p: IsoPainter, s: ArchStyle): void {
  const ctx = p.ctx;
  const c = s.palette;
  const pave = shade(mix(c.stone, 0x8e8478, 0.5), 1.05);
  p.ground(0.05, 0.05, 2.95, 2.95, pave);
  ctx.strokeStyle = css(shade(pave, 0.78), 0.45);
  ctx.lineWidth = 0.9;
  for (let t = 0.2; t < 2.95; t += 0.2) {
    const a = p.p(t, 0.05, 0);
    const b = p.p(t, 2.95, 0);
    ctx.beginPath();
    ctx.moveTo(a[0], a[1]);
    ctx.lineTo(b[0], b[1]);
    ctx.stroke();
  }
  // A granite kerb along the front (the quay edge).
  p.box(0.05, 2.82, 2.95, 2.95, 0, 4, { color: shade(c.stone, 0.9) }, c.stone);
  p.box(2.82, 0.05, 2.95, 2.82, 0, 4, { color: shade(c.stone, 0.9) }, c.stone);
}

/** String courses at every storey line and a corbel frieze of small arches under the eave (face-local). */
function storeyLines(ctx: CanvasRenderingContext2D, w: number, trim: number, brick: number, light: number): void {
  for (const y of FLOORS.slice(1, -1)) cornice(ctx, w, y - FLOORS[0], trim, light, 3);
  const top = EAVE - FLOORS[0];
  ctx.fillStyle = css(shade(brick, light * 0.62));
  for (let x = 2; x < w - 4; x += 7) {
    ctx.beginPath();
    ctx.moveTo(x, -top + 10);
    ctx.arc(x + 3, -top + 10, 3, Math.PI, 0);
    ctx.lineTo(x + 6, -top + 8);
    ctx.lineTo(x, -top + 8);
    ctx.fill();
  }
  cornice(ctx, w, top - 5, trim, light, 4);
}

/** A loading door with a trim surround (face-local, x centre, y the sill above the face base). */
function loadingDoor(ctx: CanvasRenderingContext2D, x: number, y: number, h: number, s: ArchStyle, light: number): void {
  const c = s.palette;
  ctx.fillStyle = css(shade(c.trim, light));
  ctx.fillRect(x - 8, -y - h - 2, 16, h + 3);
  ctx.fillStyle = css(shade(c.doors.work, light));
  ctx.fillRect(x - 6.5, -y - h, 13, h);
  ctx.fillStyle = css(shade(c.doors.work, light * 0.6));
  ctx.fillRect(x - 0.5, -y - h, 1, h);
  ctx.fillRect(x - 6.5, -y - h / 2, 13, 1);
}

/** The gable end (+v face): a gateway, loading doors stacked up the middle, two windows a floor. */
function gableFace(p: IsoPainter, s: ArchStyle) {
  const c = s.palette;
  return (w: number) => {
    const ctx = p.ctx;
    storeyLines(ctx, w, c.trim, c.brick, 1);
    // Pilaster strips at the corners.
    ctx.fillStyle = css(shade(c.brick, 0.8));
    ctx.fillRect(0, -(EAVE - FLOORS[0]), 4, EAVE - FLOORS[0]);
    ctx.fillRect(w - 4, -(EAVE - FLOORS[0]), 4, EAVE - FLOORS[0]);
    // Ground floor: the arched gateway.
    ctx.fillStyle = css(c.trim);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 11, 0);
    ctx.lineTo(w / 2 - 11, -17);
    ctx.arc(w / 2, -17, 11, Math.PI, 0);
    ctx.lineTo(w / 2 + 11, 0);
    ctx.fill();
    ctx.fillStyle = css(c.doors.main);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 8.5, 0);
    ctx.lineTo(w / 2 - 8.5, -17);
    ctx.arc(w / 2, -17, 8.5, Math.PI, 0);
    ctx.lineTo(w / 2 + 8.5, 0);
    ctx.fill();
    for (const x of [w * 0.17, w * 0.83]) p.window(x - 3.5, -22, 7, 12, true);
    // Upper floors: a loading door in the middle, a window each side.
    for (let f = 1; f < FLOORS.length - 1; f++) {
      const base = (FLOORS[f] ?? 0) - FLOORS[0];
      loadingDoor(ctx, w / 2, base + 3, 18, s, 1);
      for (const x of [w * 0.2, w * 0.8]) p.window(x - 3.5, -base - 19, 7, 14, true);
    }
  };
}

/** The long side (+u face): five bays of windows a floor between pilaster strips. */
function sideFace(p: IsoPainter, s: ArchStyle) {
  const c = s.palette;
  return (w: number) => {
    const ctx = p.ctx;
    storeyLines(ctx, w, c.trim, c.brick, R);
    const bays = 6;
    ctx.fillStyle = css(shade(c.brick, R * 0.82));
    for (let i = 0; i <= bays; i++) ctx.fillRect((w / bays) * i - 2, -(EAVE - FLOORS[0]), 4, EAVE - FLOORS[0]);
    for (let f = 0; f < FLOORS.length - 1; f++) {
      const base = (FLOORS[f] ?? 0) - FLOORS[0];
      for (let i = 0; i < bays; i++) {
        const x = (w / bays) * (i + 0.5);
        if (f === 0 && i !== 1 && i !== 5) loadingDoor(ctx, x, 0, 18, s, R);
        else p.window(x - 3, -base - 19, 6, 12, true);
      }
    }
  };
}

/**
 * Brick dressing of the front gable (face-local), clipped to its stepped
 * outline: courses, blind lancet niches rising under the steps, a round
 * blind window and the hoist hatch under the crown.
 */
function brickGable(ctx: CanvasRenderingContext2D, w: number, rise: number, s: ArchStyle): void {
  const c = s.palette;
  ctx.save();
  ctx.beginPath();
  steppedOutline(w, rise).forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = css(shade(c.brick, 0.72), 0.4);
  for (let y = 4; y < rise + 12; y += 4.4) ctx.fillRect(0, -y, w, 0.7);
  const niches = 5;
  const pitch = w / niches;
  for (let i = 0; i < niches; i++) {
    const cx = pitch * (i + 0.5);
    const top = rise * (1 - Math.abs(cx - w / 2) / (w / 2)) - 4;
    if (top < 12) continue;
    ctx.fillStyle = css(shade(c.trim, 0.92));
    ctx.beginPath();
    ctx.moveTo(cx - 3.2, -4);
    ctx.lineTo(cx - 3.2, -top + 3.2);
    ctx.arc(cx, -top + 3.2, 3.2, Math.PI, 0);
    ctx.lineTo(cx + 3.2, -4);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = 'rgba(30,18,12,.3)';
    ctx.fillRect(cx - 3.2, -top + 3.2, 1.1, top - 7.2);
  }
  // The hoist hatch under the crown.
  ctx.fillStyle = css(shade(c.trim, 1));
  ctx.fillRect(w / 2 - 5.5, -rise * 0.78 + 1, 11, 13);
  ctx.fillStyle = css(c.doors.work);
  ctx.fillRect(w / 2 - 4, -rise * 0.78 + 2.5, 8, 11);
  ctx.restore();
}

function warehouse(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = STORE;
  p.box(u0 - 0.03, v0 - 0.03, u1 + 0.03, v1 + 0.03, 0, FLOORS[0], { color: shade(c.stone, 0.9), detail: 'stone' }, c.stone);
  p.box(u0, v0, u1, v1, FLOORS[0], EAVE, { color: c.brick, detail: 'brick' });
  p.leftFace(u0, u1, v1, FLOORS[0], gableFace(p, s), EAVE - FLOORS[0]);
  p.rightFace(v0, v1, u1, FLOORS[0], sideFace(p, s), EAVE - FLOORS[0]);
  // The stepped brick gable over the quay, whatever the style's own gables.
  const stepped: ArchStyle = { ...s, kits: { ...s.kits, steppedGables: 'wall' } };
  p.material = 'tile';
  steppedGableRoof(p, stepped, u0, v0, u1, v1, EAVE, RISE, c.roof, c.brick, 'v', (w, rise) => brickGable(p.ctx, w, rise, s));
  // Hoist beam under the crown, its rope and a bale on the hook.
  const um = (u0 + u1) / 2;
  const hz = EAVE + RISE * 0.78;
  beam(p, [um, v1, hz], [um, v1 + 0.36, hz], c.timber, 3.6);
  beam(p, [um, v1 + 0.34, hz - 1], [um, v1 + 0.34, EAVE - 14], 0xcdb47c, 1);
  p.box(um - 0.08, v1 + 0.26, um + 0.08, v1 + 0.42, EAVE - 30, EAVE - 14, { color: 0xb89a66 }, 0xc8aa76);
  // The Hanseatic pennant on the crown.
  p.flag(um, v1, EAVE + RISE + 10, 26, team, true);
}

/** A stack of crates (back to front). */
function crates(p: IsoPainter, u: number, v: number): void {
  p.box(u, v, u + 0.24, v + 0.24, 0, 14, { color: CRATE, detail: 'planks' }, shade(CRATE, 1.1));
  p.box(u + 0.26, v + 0.04, u + 0.48, v + 0.26, 0, 13, { color: shade(CRATE, 0.9), detail: 'planks' }, CRATE);
  p.box(u + 0.08, v + 0.06, u + 0.3, v + 0.28, 14, 26, { color: shade(CRATE, 1.08), detail: 'planks' }, shade(CRATE, 1.15));
}

function paintKontor(p: IsoPainter, s: ArchStyle, team: number): void {
  p.footShadow();
  quay(p, s);
  crates(p, 1.85, 0.35);
  barrel(p, 2.55, 0.5);
  barrel(p, 2.72, 0.62);
  warehouse(p, s, team);
  sacks(p, 1.9, 1.15);
  crates(p, 2.1, 1.3);
  treadwheelCrane(p, s, 2.28, 1.98, team);
  barrel(p, 1.25, 2.5);
  barrel(p, 1.45, 2.6);
  barrel(p, 1.35, 2.75);
  crates(p, 0.4, 2.45);
  sacks(p, 1.75, 2.72);
}

/** The German landmark: the Hanseatic Kontor, in the age style's palette. */
export function hanseKontorArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: EAVE + RISE + 50 + s.headroom, paint: (p, team) => paintKontor(p, s, team) };
}
