import type { IsoPainter } from '../../isoPainter';
import { css, shade } from '../../palette';
import { crest, R } from '../facade';
import { forgeLight, forgeMouth } from '../parts';
import type { ArchStyle } from '../style';
import type { BuildingArt } from '../types';
import { block, brickWall, cornicione, lowHip, type Block } from './italianParts';
import { loggia } from './loggia';
import { fumaiolo } from './rinascParts';

/*
 * Italian foundry: a gun foundry of the Arsenale. Two long brick casting
 * halls under low tile roofs, each with flared Venetian chimneys over
 * its furnaces, and the water gate's Renaissance arch (after the Porta
 * Magna) in white stone with the arms on its pediment; a bronze gun on
 * its carriage and shot in the yard.
 */

const BACK: Block = [0.3, 0.25, 2.75, 1.0];
const SIDE: Block = [0.25, 1.0, 1.0, 2.75];
const GATE: Block = [1.55, 2.35, 2.45, 2.75];

function hallFace(p: IsoPainter, light: number, forge: boolean) {
  return (w: number, h: number) => {
    const ctx = p.ctx;
    const n = Math.max(2, Math.round(w / 28));
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.5) * w) / n - 7;
      ctx.fillStyle = css(shade(0xe9dfca, light));
      ctx.fillRect(x - 2, -h + 6, 18, 18);
      ctx.fillStyle = css(shade(0x2a1d14, light));
      ctx.beginPath();
      ctx.arc(x + 7, -h + 15, 6, 0, Math.PI * 2);
      ctx.fill();
    }
    if (forge) forgeMouth(p, w * 0.42, 24, 22);
  };
}

function paintArsenale(p: IsoPainter, s: ArchStyle, team: number): void {
  const c = s.palette;
  const ctx = p.ctx;
  p.footShadow();
  p.ground(0.05, 0.05, 2.95, 2.95, 0x9c9282);
  fumaiolo(p, s, 1.0, 0.45, 40, 96);
  fumaiolo(p, s, 2.2, 0.45, 40, 96);
  block(p, BACK, 0, 50, brickWall(s), hallFace(p, 1, true), hallFace(p, R, false));
  lowHip(p, s, BACK, 50, 26, c.roof, 0.06);
  fumaiolo(p, s, 0.45, 1.6, 40, 90);
  block(p, SIDE, 0, 46, brickWall(s), hallFace(p, 1, false), hallFace(p, R, true));
  lowHip(p, s, SIDE, 46, 24, c.roof, 0.06);
  // The gate: a white stone arch on paired piers, an attic and a pediment with the arms.
  const o = { wall: { color: 0xe9dfca, detail: 'stone' as const }, trim: c.trim, bays: [1, 1] as const, pier: 0.1, band: 5 };
  loggia(p, GATE, 0, 52, 'back', o);
  loggia(p, GATE, 0, 52, 'front', o);
  cornicione(p, GATE, 52, 6, 0.04, 0xe9dfca);
  const prev = p.material;
  p.material = 'tile';
  p.gableRoof(GATE[0] - 0.02, GATE[1], GATE[2] + 0.02, GATE[3], 58, 20, 0xe9dfca, 0xe9dfca, 'v', 0.02, (w, rise) => crest(ctx, s, w / 2, -rise * 0.38, 5, team));
  p.material = prev;
  // Gun on its carriage and a pile of shot.
  p.box(1.5, 1.45, 2.1, 1.7, 4, 12, { color: c.timber }, c.board);
  const a = p.p(1.45, 1.57, 16);
  const b = p.p(2.25, 1.57, 15);
  ctx.strokeStyle = '#8a6a2a';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(a[0], a[1]);
  ctx.lineTo(b[0], b[1]);
  ctx.stroke();
  for (const [u, v] of [[2.5, 1.5], [2.58, 1.58], [2.5, 1.62], [2.54, 1.55]] as const) {
    const [x, y] = p.p(u, v, 3);
    ctx.fillStyle = '#2c2a28';
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  forgeLight(p, 1.6, 1.15);
  p.flag(2.85, 2.85, 0, 40, team, true);
}

/** The Italian foundry: Arsenale casting halls behind a Renaissance gate. */
export function arsenale(s: ArchStyle): BuildingArt {
  return { size: 3, maxHeight: 180, paint: (p, team) => paintArsenale(p, s, team) };
}
