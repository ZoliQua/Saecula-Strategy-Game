import { describe, expect, it } from 'vitest';
import { hillTiles } from '../../../game/hill';
import type { TileCoord } from '../../../iso/coordinates';
import { dashes, hillOutline } from './ring';

const CENTRE = { tx: 20, ty: 30 };

function inside(p: TileCoord, pts: readonly TileCoord[]): boolean {
  let hit = false;
  pts.forEach((a, i) => {
    const b = pts[(i + 1) % pts.length]!;
    if (a.ty > p.ty !== b.ty > p.ty && p.tx < ((b.tx - a.tx) * (p.ty - a.ty)) / (b.ty - a.ty) + a.tx) hit = !hit;
  });
  return hit;
}

describe('hill ring (M19)', () => {
  it('encloses exactly the zone: every tile centre of it and none round it', () => {
    const ring = hillOutline(CENTRE);
    const zone = new Set([...hillTiles(CENTRE)].map((t) => `${t.tx},${t.ty}`));
    for (let ty = CENTRE.ty - 5; ty <= CENTRE.ty + 5; ty++) {
      for (let tx = CENTRE.tx - 5; tx <= CENTRE.tx + 5; tx++) expect(inside({ tx, ty }, ring), `${tx},${ty}`).toBe(zone.has(`${tx},${ty}`));
    }
  });

  it('dashes alternate with gaps all the way round', () => {
    const square = [{ tx: 0, ty: 0 }, { tx: 4, ty: 0 }, { tx: 4, ty: 4 }, { tx: 0, ty: 4 }];
    const cut = dashes(square, 1, 1);
    expect(cut).toHaveLength(8);
    expect(cut[0]).toEqual([{ tx: 0, ty: 0 }, { tx: 1, ty: 0 }]);
    expect(cut[7]).toEqual([{ tx: 0, ty: 2 }, { tx: 0, ty: 1 }]);
  });

  it('a dash follows a corner', () => {
    const cut = dashes([{ tx: 0, ty: 0 }, { tx: 4, ty: 0 }, { tx: 4, ty: 4 }, { tx: 0, ty: 4 }], 2, 1);
    expect(cut[1]).toEqual([{ tx: 3, ty: 0 }, { tx: 4, ty: 0 }, { tx: 4, ty: 1 }]);
  });
});
