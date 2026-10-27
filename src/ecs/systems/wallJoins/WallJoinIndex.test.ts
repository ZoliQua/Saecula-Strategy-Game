import { describe, expect, it } from 'vitest';
import { WALL_E, WALL_N, WALL_S, WALL_W } from '../../../game/wallNeighbours';
import { pieceArms, pieceHasPost } from '../../../iso/art/walls/wallPiece';
import type { BuildingType } from '../../../types';
import { WallJoinIndex, type JoinCandidate } from './WallJoinIndex';

const wall = (tx: number, ty: number, playerId = 1, type: BuildingType = 'wall'): JoinCandidate => ({
  position: { tx, ty },
  owner: { playerId },
  building: { type },
});

describe('WallJoinIndex', () => {
  it('drops a rhythm post when its neighbour turns into an end, two tiles from the removed wall', () => {
    const index = new WallJoinIndex<JoinCandidate>();
    const run = [2, 3, 4, 5, 6].map((x) => wall(x, 5));
    for (const w of run) index.add(w);
    const rhythm = run[2]!; // tx 4: a rhythm post on a straight run
    expect(pieceHasPost(index.pieceOf(rhythm))).toBe(true);
    // (2,5) is outside (4,5)'s 3×3, but its removal makes (3,5) an end post right beside the rhythm post.
    index.remove(run[0]!);
    expect(pieceHasPost(index.pieceOf(rhythm))).toBe(false);
  });

  it('joins same-owner neighbours and updates when one is added', () => {
    const index = new WallJoinIndex<JoinCandidate>();
    const a = wall(5, 5);
    index.add(a);
    expect(pieceArms(index.pieceOf(a))).toBe(0);
    index.add(wall(6, 5));
    expect(pieceArms(index.pieceOf(a))).toBe(WALL_E);
  });

  it('un-joins when a neighbour is removed', () => {
    const index = new WallJoinIndex<JoinCandidate>();
    const a = wall(5, 5);
    const n = wall(5, 4);
    index.add(a);
    index.add(n);
    expect(pieceArms(index.pieceOf(a))).toBe(WALL_N);
    index.remove(n);
    expect(pieceArms(index.pieceOf(a))).toBe(0);
  });

  it('ignores other owners and non-joining buildings, joins towers', () => {
    const index = new WallJoinIndex<JoinCandidate>();
    const a = wall(5, 5);
    index.add(a);
    index.add(wall(6, 5, 2));
    index.add(wall(4, 5, 1, 'house'));
    index.add(wall(5, 6, 1, 'tower'));
    expect(pieceArms(index.pieceOf(a))).toBe(WALL_S);
  });

  it('keeps cached pieces of walls away from the change', () => {
    const index = new WallJoinIndex<JoinCandidate>();
    const run = [wall(1, 1), wall(2, 1), wall(3, 1)];
    run.forEach((w) => index.add(w));
    const far = wall(10, 10);
    index.add(far);
    expect(pieceArms(index.pieceOf(run[1]!))).toBe(WALL_E | WALL_W);
    expect(pieceHasPost(index.pieceOf(far))).toBe(true);
  });

  it('a whole ring indexed before any piece is read joins every segment on its first read (preset fortress walls)', () => {
    const index = new WallJoinIndex<JoinCandidate>();
    const ring: JoinCandidate[] = [];
    for (let t = 0; t <= 4; t++) ring.push(wall(t, 0), wall(t, 4));
    for (let t = 1; t <= 3; t++) ring.push(wall(0, t), wall(4, t));
    ring.forEach((w) => index.add(w));
    const at = (tx: number, ty: number) => ring.find((w) => w.position!.tx === tx && w.position!.ty === ty)!;
    expect(pieceArms(index.pieceOf(at(0, 0)))).toBe(WALL_E | WALL_S);
    expect(pieceArms(index.pieceOf(at(2, 0)))).toBe(WALL_E | WALL_W);
    expect(pieceArms(index.pieceOf(at(4, 4)))).toBe(WALL_N | WALL_W);
    expect(pieceArms(index.pieceOf(at(4, 2)))).toBe(WALL_N | WALL_S);
  });
});
