import { describe, expect, it } from 'vitest';
import { columnCover, hiddenRect, type PlacedCover } from './coverage';

/** A w×h alpha mask from rows of '#' (opaque) and '.' (clear). */
function mask(rows: string[]): { alpha: (x: number, y: number) => number; w: number; h: number } {
  return { alpha: (x, y) => (rows[y]?.[x] === '#' ? 255 : 0), w: rows[0]?.length ?? 0, h: rows.length };
}

describe('columnCover', () => {
  it('records the first and last opaque row of every column, -1 for empty columns', () => {
    const m = mask(['.#..', '.##.', '..#.', '....']);
    const c = columnCover(m.alpha, m.w, m.h);
    expect([...c.top]).toEqual([-1, 0, 1, -1]);
    expect([...c.bottom]).toEqual([-1, 1, 2, -1]);
  });
});

describe('hiddenRect', () => {
  // A 10 px wide block covering y 50..100 (scale 1), like a rock in front of a unit's legs.
  const rock = columnCover(mask(Array.from({ length: 50 }, () => '##########')).alpha, 10, 50);
  const at = (left: number, top: number, depth: number, flipX = false): PlacedCover => ({ cover: rock, left, top, scale: 1, flipX, depth });
  const unit = { left: 0, top: 40, right: 10, bottom: 80 };

  it('is the part of the unit rect behind the occluder, with the occluder depth', () => {
    expect(hiddenRect(unit, [at(0, 50, 7)], 2, 4)).toEqual({ left: 0, top: 50, right: 10, bottom: 80, depth: 7 });
  });

  it('is null when nothing covers enough of the unit', () => {
    expect(hiddenRect(unit, [], 2, 4)).toBeNull();
    expect(hiddenRect(unit, [at(0, 78, 7)], 2, 4)).toBeNull();
    expect(hiddenRect(unit, [at(20, 50, 7)], 2, 4)).toBeNull();
  });

  it('crops to the covered columns and keeps the conservative (lowest) top', () => {
    const r = hiddenRect(unit, [at(4, 50, 7), at(-4, 60, 9)], 2, 4);
    expect(r).toEqual({ left: 0, top: 60, right: 10, bottom: 80, depth: 9 });
    const half = hiddenRect(unit, [at(6, 50, 7)], 2, 4);
    expect(half).toEqual({ left: 6, top: 50, right: 10, bottom: 80, depth: 7 });
  });

  it('reads mirrored covers from the far side', () => {
    const m = mask(['#.', '##', '##']);
    const c = columnCover(m.alpha, 2, 3);
    const placed: PlacedCover = { cover: c, left: 0, top: 0, scale: 10, flipX: true, depth: 3 };
    // Flipped, the tall column (x 0..1 in art) is drawn on the right half.
    expect(hiddenRect({ left: 10, top: 0, right: 20, bottom: 30 }, [placed], 2, 4)).toEqual({ left: 10, top: 0, right: 20, bottom: 30, depth: 3 });
    expect(hiddenRect({ left: 0, top: 0, right: 10, bottom: 30 }, [placed], 2, 4)).toEqual({ left: 0, top: 10, right: 10, bottom: 30, depth: 3 });
  });
});
