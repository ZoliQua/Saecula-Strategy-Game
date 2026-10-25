import type { UnitType } from '../../../types';
import { cannonFall, drawCannon } from './cannon';
import { Figure } from './figure';
import { bitPoint, drawHorse, horseFall } from './horse';
import { drawHuman } from './humanoid';
import { PAINTED_HEADINGS, type UnitAnim } from './layout';
import { UNIT_LOOKS } from './looks';
import { M } from './materials';
import { fallAngle, footPose } from './poses';
import { primBounds } from './primitives';
import { riderPose } from './riderPoses';
import { applyPoint, compose, headingBasis, IDENTITY, rotationAbout, translation, type Xform } from './rigMath';

/** Rig px → art px: figures are modelled at 1, painted a little larger to read at game zoom. */
const RIG_SCALE = 1.15;
/** The field gun is modelled small; painted bigger so it reads as heavy artillery. */
const CANNON_SCALE = 1.55;

/** Builds the posed 3D figure of `type` for one heading row and animation frame. */
export function buildFigure(type: UnitType, slot: number, anim: UnitAnim, i: number): Figure {
  const dir = PAINTED_HEADINGS[slot] ?? 'SE';
  const look = UNIT_LOOKS[type];
  const fig = new Figure(headingBasis(dir), look.kind === 'cannon' ? CANNON_SCALE : RIG_SCALE);
  if (look.kind === 'cannon') {
    if (anim === 'death') fig.place(cannonFall(i));
    drawCannon(fig, anim, i);
    return fig;
  }
  if (look.kind === 'foot') {
    const fall = anim === 'death' ? footFall(i) : IDENTITY;
    fig.place(fall);
    drawHuman(fig, look.human, footPose(look.human.weapon, anim, i));
    return fig;
  }
  const fall = anim === 'death' ? horseFall(i) : IDENTITY;
  fig.place(fall);
  const body = drawHorse(fig, look.horse, anim, i);
  fig.place(compose(fall, body));
  const pose = riderPose(look.human.weapon, anim, i);
  drawHuman(fig, look.human, pose);
  if (anim !== 'death') {
    // Reins from the left hand to the bit.
    fig.place(fall);
    fig.capsule(applyPoint(body, pose.handL), bitPoint(body, anim, i), 0.35, M.darkLeather);
  }
  return fig;
}

/** Backward fall about the heels, lifted so the back rests on the ground. */
function footFall(i: number): Xform {
  const a = fallAngle(i);
  return compose(translation([0, 0, 4.2 * Math.sin(a)]), rotationAbout([-2.5, 0, 0], [0, 1, 0], -a));
}

/** View-space bounds (art px, y up) of every frame a type paints. */
export function figureBounds(type: UnitType, anims: readonly UnitAnim[], frames: Readonly<Record<UnitAnim, number>>) {
  let x = 0;
  let y0 = 0;
  let y1 = 0;
  for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
    for (const anim of anims) {
      for (let i = 0; i < frames[anim]; i++) {
        for (const p of buildFigure(type, slot, anim, i).prims) {
          const b = primBounds(p);
          x = Math.max(x, -b.x0, b.x1);
          y0 = Math.min(y0, b.y0);
          y1 = Math.max(y1, b.y1);
        }
      }
    }
  }
  return { halfWidth: x, below: -y0, above: y1 };
}
