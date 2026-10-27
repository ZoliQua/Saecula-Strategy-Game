import type { CivId, UnitType } from '../../../types';
import { cannonFall, drawCannon } from './cannon';
import { Figure } from './figure';
import { bitPoint, drawHorse, horseFall } from './horse';
import { drawHuman } from './humanoid';
import { PAINTED_HEADINGS, type UnitAnim } from './layout';
import { unitLook } from './looks';
import { M } from './materials';
import { fallAngle, footPose } from './poses';
import { primBounds } from './primitives';
import { riderPose } from './riderPoses';
import { applyPoint, compose, headingBasis, IDENTITY, rotationAbout, translation, type Xform } from './rigMath';

/** Rig px → art px: figures are modelled at 1, painted a little larger to read at game zoom. */
const RIG_SCALE = 1.15;
/** The field gun is modelled small; painted bigger so it reads as heavy artillery. */
const CANNON_SCALE = 1.55;

/** Builds the posed 3D figure of `type` in a civ's look for one heading row and animation frame. */
export function buildFigure(type: UnitType, civ: CivId, slot: number, anim: UnitAnim, i: number): Figure {
  const dir = PAINTED_HEADINGS[slot] ?? 'SE';
  const look = unitLook(type, civ);
  const fig = new Figure(headingBasis(dir), look.kind === 'cannon' ? CANNON_SCALE : RIG_SCALE);
  if (look.kind === 'cannon') {
    if (anim === 'death') fig.place(cannonFall(i));
    drawCannon(fig, anim, i, look.barrel);
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

/** Extent (art px) of one frame's figure around its feet point: left / right of it, below / above it (view space, y up). */
export interface FrameExtent {
  readonly left: number;
  readonly right: number;
  readonly below: number;
  readonly above: number;
}

/** View-space extent of one frame (heading row `slot`, animation frame `i`) of a type in a civ's look; the feet point is always inside. */
export function frameBounds(type: UnitType, civ: CivId, slot: number, anim: UnitAnim, i: number): FrameExtent {
  let x0 = 0;
  let x1 = 0;
  let y0 = 0;
  let y1 = 0;
  for (const p of buildFigure(type, civ, slot, anim, i).prims) {
    const b = primBounds(p);
    x0 = Math.min(x0, b.x0);
    x1 = Math.max(x1, b.x1);
    y0 = Math.min(y0, b.y0);
    y1 = Math.max(y1, b.y1);
  }
  return { left: -x0, right: x1, below: -y0, above: y1 };
}

/** View-space bounds (art px, y up) of every frame a type paints in a civ's look. */
export function figureBounds(type: UnitType, civ: CivId, anims: readonly UnitAnim[], frames: Readonly<Record<UnitAnim, number>>) {
  let x = 0;
  let below = 0;
  let above = 0;
  for (let slot = 0; slot < PAINTED_HEADINGS.length; slot++) {
    for (const anim of anims) {
      for (let i = 0; i < frames[anim]; i++) {
        const b = frameBounds(type, civ, slot, anim, i);
        x = Math.max(x, b.left, b.right);
        below = Math.max(below, b.below);
        above = Math.max(above, b.above);
      }
    }
  }
  return { halfWidth: x, below, above };
}
