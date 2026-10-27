import { describe, expect, it } from 'vitest';
import { xrayCrop } from './xrayCrop';

/** A frame as Phaser stores it: logical box width, and the stored (trimmed) rectangle's left and width in it. */
interface XRayFrame {
  readonly realWidth: number;
  readonly trimX: number;
  readonly cutWidth: number;
}

/*
 * Model of Phaser 3.80's crop of a (possibly trimmed) frame, from
 * Frame.setCropUVs and MultiPipeline.batchSprite: which unflipped box
 * column of the frame's content is drawn at each display position.
 * Positions are relative to the sprite's x, in frame px (display px / k),
 * origin X 0.5 (units).
 */
function drawnColumns(
  frame: XRayFrame,
  req: { x: number; w: number },
  flipX: boolean,
  scaleSign: 1 | -1,
) {
  const rw = frame.realWidth;
  const dox = rw / 2;
  const ss = { x: frame.trimX, r: frame.trimX + frame.cutWidth };
  const x = Math.min(Math.max(req.x, 0), rw);
  let w = Math.min(Math.max(req.w, 0), rw - x);
  w = Math.min(Math.max(w, 0), ss.x + frame.cutWidth - x);
  // No overlap with the stored rectangle: nothing is drawn.
  if (ss.r < x || ss.x > x + w) return [];
  const ix = Math.max(ss.x, x);
  const iw = Math.min(ss.r, x + w) - ix;
  // Texel offset inside the cut (Frame.setCropUVs).
  const t = flipX ? frame.cutWidth - (ix - ss.x) - iw : ix - ss.x;
  // Quad (batchSprite): local x, then flip shift, then the sign of the scale.
  let x0 = -dox + ix;
  if (flipX) x0 += -rw + 2 * dox;
  const sign = (flipX ? -1 : 1) * scaleSign;
  return [0, 0.25, 0.5, 0.75, 1].map((s) => ({
    at: sign * (x0 + s * iw),
    column: ss.x + t + s * iw,
  }));
}

/** Unflipped box column a body sprite shows at display position `p` (frame px from its x). */
const bodyColumn = (frame: XRayFrame, p: number, flipX: boolean) =>
  flipX ? frame.realWidth / 2 - p : p + frame.realWidth / 2;

describe('xrayCrop (silhouettes of packed, trimmed unit frames)', () => {
  // An asymmetric packed frame: logical box 120 px, content at 8..64 (as most mirrored-heading frames are).
  const trimmed: XRayFrame = { realWidth: 120, trimX: 8, cutWidth: 56 };
  const untrimmed: XRayFrame = { realWidth: 120, trimX: 0, cutWidth: 120 };

  for (const frame of [trimmed, untrimmed]) {
    for (const flipX of [false, true]) {
      it(`shows the body's own pixels at the hidden run (${frame === trimmed ? 'trimmed' : 'untrimmed'}, flipX ${flipX})`, () => {
        // Hidden runs (display px / k from the box's left edge); a flipped trimmed frame shows its content at 56..112.
        for (const run of [
          { left: 30, width: 20 },
          { left: 60, width: 20 },
          { left: 50, width: 40 },
        ]) {
          const crop = xrayCrop(frame.realWidth, run.left, run.width, flipX);
          const drawn = drawnColumns(
            frame,
            { x: crop.x, w: crop.width },
            false,
            crop.mirror ? -1 : 1,
          );
          // Content is drawn wherever the run overlaps the frame's stored rectangle on screen.
          const c0 = flipX
            ? frame.realWidth - frame.trimX - frame.cutWidth
            : frame.trimX;
          const overlaps =
            Math.min(run.left + run.width, c0 + frame.cutWidth) >
            Math.max(run.left, c0);
          expect(drawn.length > 0).toBe(overlaps);
          for (const d of drawn) {
            const p = d.at;
            // Every drawn texel is the body's own texel at that display position…
            expect(d.column).toBeCloseTo(bodyColumn(frame, p, flipX));
            // …and inside the hidden run (box-relative position = p + realWidth / 2).
            const boxX = p + frame.realWidth / 2;
            expect(boxX).toBeGreaterThanOrEqual(run.left - 1e-9);
            expect(boxX).toBeLessThanOrEqual(run.left + run.width + 1e-9);
          }
        }
      });
    }
  }

  it("Phaser's own flip + crop misplaces a trimmed frame (why the silhouette mirrors by scale instead)", () => {
    const drawn = drawnColumns(trimmed, { x: 20, w: 20 }, true, 1);
    expect(drawn.length).toBeGreaterThan(0);
    const wrong = drawn.some(
      (d) => Math.abs(d.column - bodyColumn(trimmed, d.at, true)) > 1,
    );
    expect(wrong).toBe(true);
  });

  it("Phaser's own flip + crop misplaces untrimmed frames too, unless the run is centred (the pre-M5 X-ray)", () => {
    // Checked in the browser (Phaser 3.80): flipX + setCrop(30, 0, 20) on an untrimmed 120 px frame draws columns 90..70 at 10..30 px right of x.
    const drawn = drawnColumns(untrimmed, { x: 30, w: 20 }, true, 1);
    expect(drawn).toContainEqual({ at: 10, column: 90 });
    expect(drawn).toContainEqual({ at: 30, column: 70 });
    expect(
      drawn.some(
        (d) => Math.abs(d.column - bodyColumn(untrimmed, d.at, true)) > 1,
      ),
    ).toBe(true);
  });
});
