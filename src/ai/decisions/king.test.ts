import { describe, expect, it } from 'vitest';
import { AI_KING } from '../../config/aiBalance';
import { chebyshev, type TileCoord } from '../../iso/coordinates';
import { MapData } from '../../map/MapData';
import { clearance, kingRefuge, type KingThreat } from './king';

const TC = { position: { tx: 14, ty: 14 }, footprint: { width: 3, height: 3 } };
const melee = (tx: number, ty: number): KingThreat => ({ position: { tx, ty }, range: 1 });

function field(): MapData {
  const map = new MapData(40, 40);
  for (let ty = 14; ty < 17; ty++) for (let tx = 14; tx < 17; tx++) map.setBlocked(tx, ty, true);
  return map;
}

const refuge = (map: MapData, at: TileCoord, threats: KingThreat[], heading: TileCoord | null = null) =>
  kingRefuge(map, at, heading, TC, threats, AI_KING);

describe('kingRefuge (M19)', () => {
  it('stands while nothing threatens it', () => {
    expect(refuge(field(), { tx: 13, ty: 15 }, [])).toBeNull();
    expect(refuge(field(), { tx: 13, ty: 15 }, [melee(13 - AI_KING.alarm - 3, 15)])).toBeNull();
  });

  it('steps to a safer tile at home', () => {
    const at = { tx: 13, ty: 15 };
    const threats = [melee(11, 15)];
    const to = refuge(field(), at, threats)!;
    expect(clearance(to, threats, AI_KING.safe)).toBeGreaterThanOrEqual(clearance(at, threats, AI_KING.safe) + AI_KING.margin);
    expect(Math.max(14 - to.tx, 0, to.tx - 16, 14 - to.ty, to.ty - 16)).toBeLessThanOrEqual(AI_KING.homeRadius);
  });

  it('keeps clear of a shooter by its range', () => {
    expect(clearance({ tx: 0, ty: 0 }, [{ position: { tx: 7, ty: 0 }, range: 6 }], AI_KING.safe)).toBe(1);
    expect(refuge(field(), { tx: 13, ty: 15 }, [{ position: { tx: 5, ty: 15 }, range: 6 }])).not.toBeNull();
  });

  it('is deterministic', () => {
    const threats = [melee(15, 12), melee(12, 18)];
    expect(refuge(field(), { tx: 13, ty: 15 }, threats)).toEqual(refuge(field(), { tx: 13, ty: 15 }, threats));
  });

  it('holds on to a refuge it walks to unless another is clearly safer', () => {
    const at = { tx: 13, ty: 15 };
    const threats = [melee(11, 15)];
    expect(refuge(field(), at, threats, refuge(field(), at, threats))).toBeNull();
  });

  it('never goes back to the tile it left while the threats stand still', () => {
    for (const threat of [melee(11, 15), melee(15, 11), melee(19, 19), melee(13, 13)]) {
      const map = field();
      let at: TileCoord = { tx: 13, ty: 15 };
      const visited = [at];
      for (let i = 0; i < 10; i++) {
        const to = refuge(map, at, [threat]);
        if (!to) break;
        expect(visited).not.toContainEqual(to);
        visited.push(to);
        at = to;
      }
      expect(refuge(map, at, [threat])).toBeNull();
      expect(visited.length).toBeLessThanOrEqual(3);
    }
  });

  it('never hides in a dead end, nor in a pocket it cannot walk to', () => {
    const map = field();
    const at = { tx: 13, ty: 15 };
    const threats = [melee(11, 15)];
    const open = refuge(map, at, threats)!;
    // The spot it would pick becomes a one-way niche.
    for (const [dx, dy] of [[1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) map.setBlocked(open.tx + dx, open.ty + dy, true);
    expect(refuge(map, at, threats)).not.toEqual(open);
    map.setBlocked(open.tx - 1, open.ty, true);
    expect(refuge(map, at, threats)).not.toEqual(open);
  });

  it('does not walk through the attacker', () => {
    const map = new MapData(40, 40);
    // A corridor: the only way to the far side is past the attacker.
    for (let tx = 0; tx < 40; tx++) for (let ty = 0; ty < 40; ty++) if (ty < 14 || ty > 16 || tx < 11) map.setBlocked(tx, ty, true);
    const to = refuge(map, { tx: 13, ty: 15 }, [melee(17, 15)]);
    expect(to === null || chebyshev(to, { tx: 17, ty: 15 }) >= 4).toBe(true);
    expect(to === null || to.tx <= 13).toBe(true);
  });

  it('stands when it has nowhere to go', () => {
    const map = field();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]] as const) map.setBlocked(13 + dx, 15 + dy, true);
    expect(refuge(map, { tx: 13, ty: 15 }, [melee(11, 15)])).toBeNull();
  });
});
