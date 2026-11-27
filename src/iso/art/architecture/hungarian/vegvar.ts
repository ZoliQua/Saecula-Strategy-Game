import type { IsoPainter, WallStyle } from '../../isoPainter';
import { css, mix, shade } from '../../palette';
import { coneRoof, drumWall } from '../kits/drum';
import { stakes } from '../landmarkProps';
import { archedOpening, cornice, R } from '../facade';
import type { RoofMaterial } from '../../roofCover';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';

/*
 * Hungarian landmark (M17): the Végvár, a frontier castle of the Ottoman
 * wars (Eger, Drégely, Szigetvár). A square fieldstone keep crowned by a
 * jettied timber hurdling gallery under a steep roof stands in a yard of
 * low stone curtain walls topped with an oak palisade (palánk); a gate
 * tower with a timber fighting storey breaks the front wall and a round
 * gun bastion (rondella) holds the front corner. The keep flies the team
 * banner. Every Hungarian age paints it in its own palette: the fieldstone
 * and shingle of the Középkor, the pale stone and red tile of the
 * Felvilágosodás.
 */

/** Keep: walls to KEEP_TOP, hurdling gallery to GALLERY_TOP, roof RISE above. */
const KEEP: readonly [number, number, number, number] = [0.5, 0.45, 1.6, 1.55];
const KEEP_TOP = 128;
const GALLERY_TOP = 150;
const KEEP_RISE = 48;
/** The curtain walls' height and the palisade standing on them. */
const CURTAIN = 26;
const PALISADE = 13;
/** Gate tower: stone to GATE_TOP, the timber fighting storey above. */
const GATE_TOP = 56;
const GATE_TIMBER = 16;
/** The rondella at the front corner. */
const BASTION = { u: 2.44, v: 2.44, r: 0.43, h: 40 } as const;

/** Roof cover: oak shingle in the fieldstone ages, red tile in the baroque one. */
const cover = (s: ArchStyle): RoofMaterial => s.roof.material ?? (s.family === 'baroque' ? 'tile' : 'shingle');

/** Battered stone plinth, fieldstone walls, then the arrow slits and lit arched windows of each visible face. */
function keep(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = KEEP;
  const wall: WallStyle = { color: c.stone, detail: 'fieldstone' };
  p.box(u0 - 0.06, v0 - 0.06, u1 + 0.06, v1 + 0.06, 0, 16, { color: shade(c.stone, 0.86), detail: 'fieldstone' }, c.stone);
  p.box(u0, v0, u1, v1, 16, KEEP_TOP, wall);
  const face = (light: number, front: boolean) => (w: number, h: number) => {
    const ctx = p.ctx;
    // Ashlar quoins at the corners.
    ctx.fillStyle = css(shade(c.ashlar, light));
    for (let y = 2, i = 0; y < h - 4; y += 8, i++) {
      const qw = i % 2 ? 6 : 10;
      ctx.fillRect(0, -y - 7, qw, 7);
      ctx.fillRect(w - qw, -y - 7, qw, 7);
    }
    cornice(ctx, w, 46, c.ashlar, light, 3);
    // Slits low, round-arched windows (félköríves) high.
    ctx.fillStyle = '#17110c';
    for (const x of [w * 0.3, w * 0.7]) {
      ctx.fillRect(x - 1.4, -40, 2.8, 13);
      ctx.fillRect(x - 3.5, -35, 7, 2.2);
    }
    for (const x of front ? [w * 0.28, w * 0.72] : [w * 0.5]) {
      p.window(x - 4, -h + 18, 8, 15, true);
    }
    p.window(w * 0.5 - 4, -h + 52, 8, 13, true);
  };
  p.leftFace(u0, u1, v1, 16, face(1, true), KEEP_TOP - 16);
  p.rightFace(v0, v1, u1, 16, face(R, false), KEEP_TOP - 16);
}

/** The jettied timber hurdling gallery on brackets, its loopholes, the steep roof and the banner. */
function gallery(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const [u0, v0, u1, v1] = KEEP;
  const o = 0.1;
  // Brackets (diagonal struts) under the overhang on the two visible faces.
  const strut = (draw: (f: (w: number, h: number) => void) => void) =>
    draw((w) => {
      ctx.strokeStyle = css(shade(c.timber, 0.9));
      ctx.lineWidth = 2.6;
      for (let x = 6; x < w - 2; x += 14) {
        ctx.beginPath();
        ctx.moveTo(x, -10);
        ctx.lineTo(x + 6, 0);
        ctx.stroke();
      }
    });
  strut((f) => p.leftFace(u0, u1, v1, KEEP_TOP - 10, f, 10));
  strut((f) => p.rightFace(v0, v1, u1, KEEP_TOP - 10, f, 10));
  const boards: WallStyle = { color: c.board, detail: 'planks' };
  p.box(u0 - o, v0 - o, u1 + o, v1 + o, KEEP_TOP, GALLERY_TOP, boards, c.board);
  const loops = (light: number) => (w: number, h: number) => {
    ctx.fillStyle = css(shade(c.timber, light * 0.9));
    ctx.fillRect(0, -3, w, 3);
    ctx.fillRect(0, -h, w, 2.5);
    for (let x = 4; x < w; x += 13) ctx.fillRect(x, -h, 2, h);
    ctx.fillStyle = '#120c08';
    for (let x = 8.5; x < w - 4; x += 13) ctx.fillRect(x, -h + 8, 4, 7);
  };
  p.leftFace(u0 - o, u1 + o, v1 + o, KEEP_TOP, loops(1), GALLERY_TOP - KEEP_TOP);
  p.rightFace(v0 - o, v1 + o, u1 + o, KEEP_TOP, loops(R), GALLERY_TOP - KEEP_TOP);
  p.material = cover(s);
  p.hipRoof(u0 - o, v0 - o, u1 + o, v1 + o, GALLERY_TOP, KEEP_RISE * s.roof.pitch, c.roof, 0.08);
  const top = GALLERY_TOP + KEEP_RISE * s.roof.pitch;
  p.flag((u0 + u1) / 2, (v0 + v1) / 2, top - 2, 32, team, true);
}

/** A run of curtain wall from (u0, v0) to (u1, v1), its coping and the palisade on its outer edge. */
function curtain(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, outer: 'u' | 'v'): void {
  const c = s.palette;
  p.box(u0, v0, u1, v1, 0, CURTAIN, { color: c.stone, detail: 'fieldstone' }, shade(c.stone, 0.95));
  const at = outer === 'v' ? v0 + 0.05 : u0 + 0.05;
  if (outer === 'v') stakes(p, u0 + 0.03, at, u1 - 0.03, at, CURTAIN, PALISADE, c.timber);
  else stakes(p, at, v0 + 0.03, at, v1 - 0.03, CURTAIN, PALISADE, c.timber);
}

/** Front curtain stakes stand on the wall's outer (front) edge. */
function frontCurtain(p: IsoPainter, s: ArchStyle, u0: number, v0: number, u1: number, v1: number, axis: 'u' | 'v'): void {
  const c = s.palette;
  p.box(u0, v0, u1, v1, 0, CURTAIN, { color: c.stone, detail: 'fieldstone' }, shade(c.stone, 0.95));
  if (axis === 'u') stakes(p, u0 + 0.03, v1 - 0.05, u1 - 0.03, v1 - 0.05, CURTAIN, PALISADE, c.timber);
  else stakes(p, u1 - 0.05, v0 + 0.03, u1 - 0.05, v1 - 0.03, CURTAIN, PALISADE, c.timber);
}

/** A plank barracks shed against the back wall. */
function shed(p: IsoPainter, s: ArchStyle): void {
  const c = s.palette;
  const [u0, v0, u1, v1] = [1.85, 0.42, 2.45, 1.0];
  p.box(u0, v0, u1, v1, 0, 30, { color: c.planks, detail: 'planks' });
  p.leftFace(u0, u1, v1, 0, (w) => {
    p.door(w * 0.2, 10, 18, c.doors.work);
    p.door(w * 0.62, 7, 9, c.shutter);
  }, 30);
  p.material = cover(s);
  p.gableRoof(u0, v0, u1, v1, 30, 18, c.roof, c.planks, 'u', 0.08);
}

/** The gate tower: stone arch with the gate leaves, a jettied timber storey with the team banner, a hipped cap. */
function gateTower(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const [u0, v0, u1, v1] = [0.98, 2.42, 1.62, 2.96];
  p.box(u0, v0, u1, v1, 0, GATE_TOP, { color: c.stone, detail: 'fieldstone' });
  p.leftFace(u0, u1, v1, 0, (w) => {
    archedOpening(ctx, w / 2 - 11, 22, 32, c.ashlar, 0x1a120c, 1);
    ctx.fillStyle = css(c.doors.gate);
    ctx.fillRect(w / 2 - 9, -21, 18, 21);
    ctx.fillStyle = css(shade(c.doors.gate, 0.6));
    for (let x = w / 2 - 6; x < w / 2 + 9; x += 4) ctx.fillRect(x, -21, 0.9, 21);
    ctx.fillStyle = '#2b2622';
    for (const y of [-6, -15]) ctx.fillRect(w / 2 - 9, y, 18, 1.5);
  }, GATE_TOP);
  p.rightFace(v0, v1, u1, 0, (w) => {
    ctx.fillStyle = '#17110c';
    ctx.fillRect(w / 2 - 1.4, -38, 2.8, 12);
  }, GATE_TOP);
  const o = 0.07;
  p.box(u0 - o, v0 - o, u1 + o, v1 + o, GATE_TOP, GATE_TOP + GATE_TIMBER, { color: c.board, detail: 'planks' }, c.board);
  p.leftFace(u0 - o, u1 + o, v1 + o, GATE_TOP, (w, h) => {
    ctx.fillStyle = css(shade(c.timber, 0.9));
    for (let x = 3; x < w; x += 12) ctx.fillRect(x, -h, 2, h);
    ctx.fillStyle = '#120c08';
    for (let x = 7; x < w - 3; x += 12) ctx.fillRect(x, -h + 5, 3.5, 6);
    // The team banner hung over the gate (swallow-tailed).
    ctx.fillStyle = css(team);
    ctx.beginPath();
    ctx.moveTo(w / 2 - 6, -h + 2);
    ctx.lineTo(w / 2 + 6, -h + 2);
    ctx.lineTo(w / 2 + 6, -h + 26);
    ctx.lineTo(w / 2, -h + 21);
    ctx.lineTo(w / 2 - 6, -h + 26);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = css(shade(team, 0.65));
    ctx.fillRect(w / 2 + 4, -h + 2, 2, 22);
  }, GATE_TIMBER);
  p.material = cover(s);
  p.hipRoof(u0 - o, v0 - o, u1 + o, v1 + o, GATE_TOP + GATE_TIMBER, 22 * s.roof.pitch, c.roof, 0.06);
}

/** The round gun bastion: a battered stone drum with gun ports and a low conical roof. */
function rondella(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  const { u, v, r, h } = BASTION;
  drumWall(p, u, v, r + 0.04, 0, 10, shade(c.stone, 0.86), 'stone');
  drumWall(p, u, v, r, 10, h, c.stone, 'stone');
  // Moulded string course and gun ports on the visible half.
  for (let k = 0; k <= 4; k++) {
    const a = -Math.PI / 4 + 0.35 + (k / 4) * (Math.PI - 0.7);
    const [x, y] = p.p(u + (r + 0.01) * Math.cos(a), v + (r + 0.01) * Math.sin(a), 22);
    ctx.fillStyle = css(shade(c.ashlar, 0.9));
    ctx.beginPath();
    ctx.ellipse(x, y, 5, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#120c08';
    ctx.beginPath();
    ctx.ellipse(x, y, 3, 2.4, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = css(shade(c.ashlar, 0.95));
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  for (let k = 0; k <= 24; k++) {
    const a = -Math.PI / 4 + (k / 24) * Math.PI;
    const [x, y] = p.p(u + r * Math.cos(a), v + r * Math.sin(a), 12);
    if (k === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // Timber parapet band under the roof.
  drumWall(p, u, v, r + 0.02, h, h + 7, c.board, 'daub');
  coneRoof(p, u, v, r + 0.08, h + 7, 30 * s.roof.pitch, c.roof, 'slate');
  p.flag(u, v, h + 7 + 30 * s.roof.pitch - 2, 16, team);
}

function paintVegvar(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  p.footShadow();
  // Beaten-earth yard on a grassy rampart.
  const earth = mix(c.stone, 0x8a7656, 0.55);
  p.ground(0.05, 0.05, 2.95, 2.95, shade(earth, 0.8));
  p.ground(0.35, 0.35, 2.7, 2.7, earth);
  // Back curtains (the stakes on their outer edge), the barracks shed, the keep.
  curtain(p, s, 0.12, 0.12, 2.86, 0.38, 'v');
  curtain(p, s, 0.12, 0.38, 0.38, 2.6, 'u');
  shed(p, s);
  keep(p, s);
  gallery(p, s, team);
  // Front curtains with the gate tower, then the rondella at the front corner.
  frontCurtain(p, s, 2.6, 0.38, 2.86, 2.1, 'v');
  frontCurtain(p, s, 0.12, 2.6, 1.0, 2.86, 'u');
  frontCurtain(p, s, 1.6, 2.6, 2.1, 2.86, 'u');
  gateTower(p, s, team);
  rondella(p, s, team);
}

/** The Hungarian landmark: the Végvár frontier castle, in the age style's palette. */
export function vegvarArt(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: GALLERY_TOP + KEEP_RISE * s.roof.pitch + 50 + s.headroom, paint: (p, team) => paintVegvar(p, s, team) };
}
