import { wallNeighbourMaskBy } from '../../../game/wallNeighbours';
import { wallPiece } from '../../../iso/art/walls/wallPiece';
import type { BuildingType } from '../../../types';

/** What the index needs to know about a building entity. */
export interface JoinCandidate {
  readonly position?: { readonly tx: number; readonly ty: number };
  readonly owner?: { readonly playerId: number };
  readonly building?: { readonly type: BuildingType };
}

/** Walls join walls and towers of the same owner. */
const JOINS: ReadonlySet<BuildingType> = new Set<BuildingType>(['wall', 'tower']);

const key = (tx: number, ty: number): number => ty * 100_000 + tx;

/**
 * Render-side index of wall segments (and towers they join) by tile, so a
 * wall's piece (wallPiece: arms + post) is recomputed only when a
 * neighbour appears or goes: adding or removing one marks the 3×3 around
 * it stale, everything else keeps its cached piece. Rendering only — game
 * logic uses wallNeighbourMask.
 */
export class WallJoinIndex<E extends JoinCandidate> {
  private readonly at = new Map<number, E>();
  private readonly pieces = new Map<E, number>();
  private readonly stale = new Set<number>();

  /** Registers a wall / tower (other types are ignored). */
  add(e: E): void {
    const tile = this.tileOf(e);
    if (tile === null) return;
    this.at.set(key(tile.tx, tile.ty), e);
    this.touch(tile.tx, tile.ty);
  }

  remove(e: E): void {
    this.pieces.delete(e);
    const tile = this.tileOf(e);
    if (tile === null || this.at.get(key(tile.tx, tile.ty)) !== e) return;
    this.at.delete(key(tile.tx, tile.ty));
    this.touch(tile.tx, tile.ty);
  }

  /** The wall's current piece (cached until a neighbour changes). */
  pieceOf(e: E): number {
    const tile = e.position;
    if (!tile) return 0;
    const k = key(tile.tx, tile.ty);
    const cached = this.pieces.get(e);
    if (cached !== undefined && !this.stale.has(k)) return cached;
    const owner = e.owner?.playerId;
    const mask = wallNeighbourMaskBy((tx, ty) => {
      const n = this.at.get(key(tx, ty));
      return n !== undefined && n.owner?.playerId === owner;
    }, tile);
    const piece = wallPiece(mask, tile.tx, tile.ty);
    this.pieces.set(e, piece);
    this.stale.delete(k);
    return piece;
  }

  private tileOf(e: E): { tx: number; ty: number } | null {
    if (!e.position || !e.building || !JOINS.has(e.building.type)) return null;
    return e.position;
  }

  private touch(tx: number, ty: number): void {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) this.stale.add(key(tx + dx, ty + dy));
  }
}
