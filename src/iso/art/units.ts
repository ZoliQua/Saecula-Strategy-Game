import type { UnitType } from '../../types';
import { ellipse, makeCanvas, softShadow, type Ctx } from './canvas';
import { css, shade } from './palette';

/** Frame size at art resolution (2×). */
export const UNIT_FRAME_W = 80;
export const UNIT_FRAME_H = 84;
const FEET_Y = 72;
/** Sprite origin Y so the feet land on the tile centre. */
export const UNIT_ORIGIN_Y = FEET_Y / UNIT_FRAME_H;

/** Frame indices inside each unit strip. */
export const UNIT_FRAMES = { idle: 0, walkA: 1, walkB: 2, attack: 3 } as const;
const FRAME_COUNT = 4;

const OUTLINE = 'rgba(28,18,10,.85)';
const SKIN = 0xe9b48c;

type Gear =
  | 'tool'
  | 'sword'
  | 'bow'
  | 'spear'
  | 'pike'
  | 'crossbow'
  | 'musket'
  | 'lance';

interface FootSoldier {
  kind: 'foot';
  hat: 'straw' | 'hood' | 'galea' | 'kettle' | 'tricorne' | 'cap';
  gear: Gear;
  shield?: boolean;
  trousers: number;
  armor?: number;
}

interface Rider {
  kind: 'rider';
  hat: 'galea' | 'cap' | 'plume';
  gear: Gear;
  horse: number;
  barding: boolean;
}

interface Gun {
  kind: 'cannon';
}

type UnitLook = FootSoldier | Rider | Gun;

const LOOKS: Record<UnitType, UnitLook> = {
  villager: { kind: 'foot', hat: 'straw', gear: 'tool', trousers: 0x6b4f33 },
  scout: { kind: 'rider', hat: 'cap', gear: 'spear', horse: 0xa0703f, barding: false },
  swordsman: { kind: 'foot', hat: 'galea', gear: 'sword', shield: true, trousers: 0x5a4632, armor: 0xb8b2a4 },
  archer: { kind: 'foot', hat: 'hood', gear: 'bow', trousers: 0x4f5a35 },
  knight: { kind: 'rider', hat: 'plume', gear: 'lance', horse: 0xe6ddd0, barding: true },
  pikeman: { kind: 'foot', hat: 'kettle', gear: 'pike', trousers: 0x5a4632, armor: 0xa9a49a },
  crossbowman: { kind: 'foot', hat: 'kettle', gear: 'crossbow', trousers: 0x4a4a52 },
  musketeer: { kind: 'foot', hat: 'tricorne', gear: 'musket', trousers: 0x3a3a44 },
  cannon: { kind: 'cannon' },
  cavalry: { kind: 'rider', hat: 'galea', gear: 'sword', horse: 0x5e3b22, barding: false },
};

/** Paints the 4-frame strip for a unit in a team colour. */
export function paintUnitStrip(type: UnitType, team: number): HTMLCanvasElement {
  const { canvas, ctx } = makeCanvas(UNIT_FRAME_W * FRAME_COUNT, UNIT_FRAME_H);
  const look = LOOKS[type];
  for (let f = 0; f < FRAME_COUNT; f++) {
    ctx.save();
    ctx.translate(f * UNIT_FRAME_W, 0);
    if (look.kind === 'foot') paintFoot(ctx, look, team, f);
    else if (look.kind === 'rider') paintRider(ctx, look, team, f);
    else paintCannon(ctx, team, f);
    ctx.restore();
  }
  return canvas;
}

function outlined(ctx: Ctx, fill: string | CanvasGradient, width = 1.5): void {
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = width;
  ctx.lineJoin = 'round';
  ctx.stroke();
}

function limb(ctx: Ctx, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  ctx.lineCap = 'round';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = w + 2.5;
  ctx.beginPath();
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = w;
  ctx.stroke();
}

function head(ctx: Ctx, x: number, y: number, hat: FootSoldier['hat'] | Rider['hat'], team: number): void {
  ellipse(ctx, x, y, 6.5, 7);
  const g = ctx.createRadialGradient(x - 2, y - 3, 1, x, y, 8);
  g.addColorStop(0, css(shade(SKIN, 1.1)));
  g.addColorStop(1, css(shade(SKIN, 0.8)));
  outlined(ctx, g);
  ctx.fillStyle = '#2a1a10';
  ctx.fillRect(x + 2.5, y - 1.5, 1.6, 2);
  switch (hat) {
    case 'straw':
      ellipse(ctx, x, y - 4, 11, 3.5);
      outlined(ctx, '#e1c06a');
      ellipse(ctx, x, y - 7, 5.5, 4);
      outlined(ctx, '#d4ae52');
      break;
    case 'hood':
      ctx.beginPath();
      ctx.arc(x - 0.5, y - 1, 8, Math.PI * 0.95, Math.PI * 2.05);
      ctx.lineTo(x - 7, y + 6);
      ctx.closePath();
      outlined(ctx, css(shade(team, 0.7)));
      break;
    case 'galea':
    case 'plume':
      ctx.beginPath();
      ctx.arc(x, y - 1.5, 7.2, Math.PI, Math.PI * 2);
      ctx.lineTo(x + 7.2, y + 1);
      ctx.lineTo(x - 7.2, y + 3);
      ctx.closePath();
      outlined(ctx, '#c9c3b5');
      ctx.beginPath();
      ctx.moveTo(x - 6, y - 8);
      ctx.quadraticCurveTo(x, y - 17, x + 6, y - 8);
      ctx.lineTo(x + 3, y - 7);
      ctx.quadraticCurveTo(x, y - 12, x - 3, y - 7);
      ctx.closePath();
      outlined(ctx, hat === 'plume' ? css(shade(team, 1.1)) : '#b8362a', 1.2);
      break;
    case 'kettle':
      ellipse(ctx, x, y - 3.5, 10, 3);
      outlined(ctx, '#a6a296');
      ctx.beginPath();
      ctx.arc(x, y - 4, 6.5, Math.PI, Math.PI * 2);
      outlined(ctx, '#bdb9ad');
      break;
    case 'tricorne':
      ctx.beginPath();
      ctx.moveTo(x - 10, y - 4);
      ctx.lineTo(x, y - 12);
      ctx.lineTo(x + 10, y - 4);
      ctx.quadraticCurveTo(x, y - 1, x - 10, y - 4);
      outlined(ctx, '#23222a');
      ctx.fillStyle = '#e8c35a';
      ctx.fillRect(x - 1, y - 10, 2, 5);
      break;
    case 'cap':
      ctx.beginPath();
      ctx.arc(x, y - 2.5, 7, Math.PI, Math.PI * 2);
      ctx.lineTo(x + 10, y - 2);
      ctx.closePath();
      outlined(ctx, css(shade(team, 0.85)));
      break;
  }
}

function paintFoot(ctx: Ctx, look: FootSoldier, team: number, f: number): void {
  const cx = 40;
  const swing = f === 1 ? 1 : f === 2 ? -1 : 0;
  const bob = f === 1 || f === 2 ? -1 : 0;
  const attack = f === 3;
  softShadow(ctx, cx, FEET_Y, 15, 5.5, 0.45);

  const hipY = 56 + bob;
  const shoulderY = 39 + bob;
  const trousers = css(look.trousers);
  // Legs (back leg first).
  limb(ctx, cx + 2, hipY, cx + 3 - swing * 5, FEET_Y - 2, 5, css(shade(look.trousers, 0.8)));
  limb(ctx, cx - 2, hipY, cx - 2 + swing * 5, FEET_Y - 2, 5, trousers);
  for (const fx of [cx + 3 - swing * 5, cx - 2 + swing * 5]) {
    ellipse(ctx, fx + 1.5, FEET_Y - 1, 4, 2.4);
    outlined(ctx, '#3a2618', 1.2);
  }

  // Back arm.
  const backHand: [number, number] = attack ? [cx + 12, shoulderY + 6] : [cx + 6 - swing * 4, shoulderY + 14];
  limb(ctx, cx + 5, shoulderY + 2, backHand[0], backHand[1], 4.2, css(shade(team, 0.65)));

  if (look.gear === 'bow' || look.gear === 'musket' || look.gear === 'crossbow') {
    // Quiver / bandolier on the back.
    ctx.save();
    ctx.translate(cx - 7, shoulderY + 4);
    ctx.rotate(-0.35);
    ctx.beginPath();
    ctx.rect(-3, -6, 6, 16);
    outlined(ctx, '#6b4526', 1.2);
    ctx.restore();
  }

  // Torso: tunic in team colour, optional armour.
  ctx.beginPath();
  ctx.moveTo(cx - 8, shoulderY);
  ctx.lineTo(cx + 8, shoulderY);
  ctx.lineTo(cx + 9, hipY + 3);
  ctx.lineTo(cx - 9, hipY + 3);
  ctx.closePath();
  const tg = ctx.createLinearGradient(cx - 9, 0, cx + 9, 0);
  tg.addColorStop(0, css(shade(team, 1.15)));
  tg.addColorStop(1, css(shade(team, 0.72)));
  outlined(ctx, tg);
  if (look.armor !== undefined) {
    ctx.beginPath();
    ctx.moveTo(cx - 7.5, shoulderY + 1);
    ctx.lineTo(cx + 7.5, shoulderY + 1);
    ctx.lineTo(cx + 7, hipY - 4);
    ctx.lineTo(cx - 7, hipY - 4);
    ctx.closePath();
    const ag = ctx.createLinearGradient(cx - 8, 0, cx + 8, 0);
    ag.addColorStop(0, css(shade(look.armor, 1.25)));
    ag.addColorStop(1, css(shade(look.armor, 0.7)));
    outlined(ctx, ag, 1.2);
    ctx.strokeStyle = css(shade(look.armor, 0.6), 0.8);
    ctx.lineWidth = 1;
    for (let y = shoulderY + 6; y < hipY - 4; y += 4) {
      ctx.beginPath();
      ctx.moveTo(cx - 7, y);
      ctx.lineTo(cx + 7, y);
      ctx.stroke();
    }
  }
  ctx.fillStyle = '#4a2e18';
  ctx.fillRect(cx - 8.5, hipY - 2, 17, 3);
  ctx.fillStyle = '#e8c35a';
  ctx.fillRect(cx - 1.5, hipY - 2, 3, 3);

  head(ctx, cx + 1, shoulderY - 8, look.hat, team);

  // Front arm + gear.
  const hand: [number, number] = attack ? [cx + 14, shoulderY - 2] : [cx - 4 + swing * 4, shoulderY + 15];
  gear(ctx, look.gear, hand, attack, team);
  limb(ctx, cx - 5, shoulderY + 2, hand[0], hand[1], 4.4, css(shade(team, 0.95)));
  ellipse(ctx, hand[0], hand[1], 2.6, 2.6);
  outlined(ctx, css(SKIN), 1);

  if (look.shield) {
    ellipse(ctx, cx - 10, shoulderY + 12, 7, 11);
    const sg = ctx.createLinearGradient(cx - 17, 0, cx - 3, 0);
    sg.addColorStop(0, css(shade(team, 1.2)));
    sg.addColorStop(1, css(shade(team, 0.65)));
    outlined(ctx, sg, 1.6);
    ellipse(ctx, cx - 10, shoulderY + 12, 2.6, 2.6);
    outlined(ctx, '#e8c35a', 1);
  }
}

function gear(ctx: Ctx, kind: Gear, [hx, hy]: [number, number], attack: boolean, team: number): void {
  ctx.save();
  ctx.translate(hx, hy);
  ctx.lineCap = 'round';
  const shaft = (len: number, angle: number, color: string, w = 2.2): void => {
    ctx.save();
    ctx.rotate(angle);
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = w + 2;
    ctx.beginPath();
    ctx.moveTo(0, len * 0.25);
    ctx.lineTo(0, -len * 0.75);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.stroke();
    ctx.restore();
  };
  switch (kind) {
    case 'tool': {
      shaft(22, attack ? 1.1 : 0.25, '#8a5a32');
      ctx.rotate(attack ? 1.1 : 0.25);
      ctx.beginPath();
      ctx.moveTo(-6, -16);
      ctx.quadraticCurveTo(0, -20, 6, -15);
      ctx.lineTo(0, -15);
      ctx.closePath();
      outlined(ctx, '#b9b6ae', 1.2);
      break;
    }
    case 'sword': {
      ctx.rotate(attack ? 1.2 : 0.35);
      ctx.beginPath();
      ctx.rect(-1.6, -20, 3.2, 18);
      outlined(ctx, '#e4e6ea', 1.1);
      ctx.fillStyle = '#c9a240';
      ctx.fillRect(-4.5, -3, 9, 2.5);
      break;
    }
    case 'spear':
    case 'pike':
    case 'lance': {
      const len = kind === 'pike' ? 52 : kind === 'lance' ? 46 : 34;
      const ang = attack ? 1.25 : 0.12;
      shaft(len, ang, '#8a5a32', 2);
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.moveTo(0, -len * 0.75 - 7);
      ctx.lineTo(2.6, -len * 0.75);
      ctx.lineTo(-2.6, -len * 0.75);
      ctx.closePath();
      outlined(ctx, '#d6d8dc', 1);
      if (kind === 'lance') {
        ctx.fillStyle = css(team);
        ctx.fillRect(0, -len * 0.75 + 2, 8, 5);
      }
      break;
    }
    case 'bow': {
      ctx.rotate(attack ? -0.1 : 0.2);
      ctx.beginPath();
      ctx.arc(-6, -6, 15, -1.0, 1.0);
      ctx.strokeStyle = OUTLINE;
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.strokeStyle = '#9a6a3a';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      ctx.strokeStyle = 'rgba(240,235,220,.9)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.moveTo(-6 + 15 * Math.cos(-1), -6 + 15 * Math.sin(-1));
      ctx.lineTo(attack ? -10 : -6 + 15 * Math.cos(1) - 3, attack ? -6 : -6 + 15 * Math.sin(1) - 6);
      ctx.lineTo(-6 + 15 * Math.cos(1), -6 + 15 * Math.sin(1));
      ctx.stroke();
      break;
    }
    case 'crossbow':
    case 'musket': {
      const ang = attack ? -1.45 : -0.5;
      ctx.rotate(ang);
      ctx.beginPath();
      ctx.rect(-2, -26, 4, 30);
      outlined(ctx, kind === 'musket' ? '#5a3a22' : '#7a5030', 1.2);
      if (kind === 'musket') {
        ctx.fillStyle = '#4a4a50';
        ctx.fillRect(-1.2, -34, 2.4, 14);
      } else {
        ctx.strokeStyle = '#5a3a22';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.arc(0, -16, 10, Math.PI * 1.15, Math.PI * 1.85);
        ctx.stroke();
      }
      break;
    }
  }
  ctx.restore();
}

function paintRider(ctx: Ctx, look: Rider, team: number, f: number): void {
  const cx = 40;
  const gallop = f === 1 ? 1 : f === 2 ? -1 : 0;
  softShadow(ctx, cx, FEET_Y, 25, 7, 0.45);
  const bodyY = 54 - Math.abs(gallop);
  const horse = look.horse;
  // Legs.
  const legs: Array<[number, number]> = [
    [cx - 13, -gallop * 5],
    [cx - 8, gallop * 4],
    [cx + 9, gallop * 5],
    [cx + 14, -gallop * 4],
  ];
  legs.forEach(([x, dx], i) => {
    limb(ctx, x, bodyY + 3, x + dx, FEET_Y - 1, 3.6, css(shade(horse, i % 2 ? 0.75 : 0.9)));
  });
  // Tail.
  ctx.beginPath();
  ctx.moveTo(cx - 18, bodyY - 4);
  ctx.quadraticCurveTo(cx - 28, bodyY + 2 + gallop * 2, cx - 24, bodyY + 12);
  ctx.lineWidth = 4;
  ctx.strokeStyle = css(shade(horse, 0.45));
  ctx.stroke();
  // Body.
  ellipse(ctx, cx, bodyY, 19, 9);
  const hg = ctx.createLinearGradient(0, bodyY - 9, 0, bodyY + 9);
  hg.addColorStop(0, css(shade(horse, 1.15)));
  hg.addColorStop(1, css(shade(horse, 0.7)));
  outlined(ctx, hg);
  if (look.barding) {
    ctx.beginPath();
    ctx.moveTo(cx - 17, bodyY - 3);
    ctx.lineTo(cx + 15, bodyY - 3);
    ctx.lineTo(cx + 13, bodyY + 10);
    ctx.lineTo(cx - 15, bodyY + 10);
    ctx.closePath();
    outlined(ctx, css(team), 1.2);
    ctx.fillStyle = '#e8c35a';
    ctx.fillRect(cx - 15, bodyY + 8, 28, 2);
  }
  // Neck + head.
  ctx.beginPath();
  ctx.moveTo(cx + 11, bodyY - 5);
  ctx.lineTo(cx + 19, bodyY - 22);
  ctx.lineTo(cx + 27, bodyY - 18);
  ctx.lineTo(cx + 28, bodyY - 13);
  ctx.lineTo(cx + 21, bodyY - 12);
  ctx.lineTo(cx + 18, bodyY + 2);
  ctx.closePath();
  outlined(ctx, css(shade(horse, 0.95)));
  ctx.fillStyle = css(shade(horse, 0.4));
  ctx.beginPath();
  ctx.moveTo(cx + 12, bodyY - 6);
  ctx.lineTo(cx + 18, bodyY - 22);
  ctx.lineTo(cx + 16, bodyY - 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#1a120c';
  ctx.fillRect(cx + 23, bodyY - 18, 1.6, 1.6);

  // Rider.
  const seatY = bodyY - 8;
  limb(ctx, cx + 1, seatY + 2, cx + 3, seatY + 14, 4.4, '#4a3a2a');
  ctx.beginPath();
  ctx.moveTo(cx - 6, seatY - 16);
  ctx.lineTo(cx + 6, seatY - 16);
  ctx.lineTo(cx + 7, seatY + 2);
  ctx.lineTo(cx - 7, seatY + 2);
  ctx.closePath();
  const tg = ctx.createLinearGradient(cx - 7, 0, cx + 7, 0);
  tg.addColorStop(0, css(shade(team, 1.15)));
  tg.addColorStop(1, css(shade(team, 0.7)));
  outlined(ctx, tg);
  head(ctx, cx + 1, seatY - 23, look.hat, team);
  const attack = f === 3;
  const hand: [number, number] = attack ? [cx + 13, seatY - 14] : [cx + 8, seatY - 6];
  gear(ctx, look.gear, hand, attack, team);
  limb(ctx, cx + 2, seatY - 14, hand[0], hand[1], 4, css(shade(team, 0.9)));
}

function paintCannon(ctx: Ctx, team: number, f: number): void {
  const cx = 40;
  const recoil = f === 3 ? -4 : 0;
  softShadow(ctx, cx, FEET_Y - 2, 24, 7, 0.45);
  // Trail.
  ctx.beginPath();
  ctx.moveTo(cx - 22 + recoil, FEET_Y - 3);
  ctx.lineTo(cx + 4 + recoil, FEET_Y - 16);
  ctx.lineTo(cx + 8 + recoil, FEET_Y - 12);
  ctx.lineTo(cx - 20 + recoil, FEET_Y);
  ctx.closePath();
  outlined(ctx, '#6b4526');
  // Barrel.
  ctx.save();
  ctx.translate(cx + recoil, FEET_Y - 20);
  ctx.rotate(-0.22);
  ctx.beginPath();
  ctx.moveTo(-14, -5.5);
  ctx.lineTo(24, -4);
  ctx.lineTo(24, 4);
  ctx.lineTo(-14, 5.5);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, -6, 0, 6);
  bg.addColorStop(0, '#e2bd6e');
  bg.addColorStop(0.5, '#b07f34');
  bg.addColorStop(1, '#6e4c1e');
  outlined(ctx, bg);
  ctx.fillStyle = '#5a3e18';
  ctx.fillRect(4, -5, 2.5, 10);
  ctx.fillRect(18, -4.5, 2.5, 9);
  ctx.restore();
  // Wheel with team-coloured hub.
  const spin = f * 0.5;
  ellipse(ctx, cx + 2 + recoil, FEET_Y - 10, 11, 11);
  outlined(ctx, '#7a5030', 2);
  ctx.strokeStyle = '#4a2e18';
  ctx.lineWidth = 1.6;
  for (let i = 0; i < 6; i++) {
    const a = spin + (i * Math.PI) / 3;
    ctx.beginPath();
    ctx.moveTo(cx + 2 + recoil, FEET_Y - 10);
    ctx.lineTo(cx + 2 + recoil + Math.cos(a) * 10, FEET_Y - 10 + Math.sin(a) * 10);
    ctx.stroke();
  }
  ellipse(ctx, cx + 2 + recoil, FEET_Y - 10, 3, 3);
  outlined(ctx, css(team), 1);
  if (f === 3) {
    const g = ctx.createRadialGradient(cx + 30, FEET_Y - 28, 0, cx + 30, FEET_Y - 28, 12);
    g.addColorStop(0, 'rgba(255,240,180,.95)');
    g.addColorStop(1, 'rgba(255,140,40,0)');
    ctx.fillStyle = g;
    ctx.fillRect(cx + 16, FEET_Y - 42, 28, 28);
  }
}
