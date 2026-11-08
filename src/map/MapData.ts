import type { TileCoord } from '../iso/coordinates';
import { isInsideMap } from '../iso/coordinates';
import { isPassable, TERRAIN, type TerrainId } from './TerrainTypes';

/**
 * Flat 2D grid of terrain ids. Tile `(tx, ty)` lives at
 * `tiles[ty * width + tx]`. `tiles` is a `Uint8Array` so the whole
 * map serialises cheaply into save files (CLAUDE.md 5.4).
 */
export class MapData {
  public readonly width: number;
  public readonly height: number;
  private readonly tiles: Uint8Array;
  private readonly blocked: Uint8Array;
  private waterRev = 0;

  constructor(width: number, height: number, fill: TerrainId = TERRAIN.grass) {
    this.width = width;
    this.height = height;
    this.tiles = new Uint8Array(width * height);
    this.blocked = new Uint8Array(width * height);
    if (fill !== 0) this.tiles.fill(fill);
  }

  /**
   * A map from saved raw arrays (`getRawTiles` / `getRawBlocked`), copied.
   * Throws RangeError when an array does not hold `width * height` tiles.
   */
  static fromRaw(width: number, height: number, tiles: Uint8Array, blocked: Uint8Array): MapData {
    const size = width * height;
    if (tiles.length !== size || blocked.length !== size) {
      throw new RangeError(`Raw map arrays (${tiles.length}, ${blocked.length}) do not match ${width}x${height}`);
    }
    const map = new MapData(width, height, TERRAIN.grass);
    map.tiles.set(tiles);
    map.blocked.set(blocked);
    return map;
  }

  getTile(tx: number, ty: number): TerrainId {
    if (!isInsideMap({ tx, ty }, this.width, this.height)) {
      throw new RangeError(
        `Tile (${tx}, ${ty}) is outside map ${this.width}x${this.height}`,
      );
    }
    return this.tiles[ty * this.width + tx] as TerrainId;
  }

  setTile(tx: number, ty: number, terrain: TerrainId): void {
    if (!isInsideMap({ tx, ty }, this.width, this.height)) {
      throw new RangeError(
        `Tile (${tx}, ${ty}) is outside map ${this.width}x${this.height}`,
      );
    }
    const idx = ty * this.width + tx;
    const was = this.tiles[idx];
    if (was === terrain) return;
    if (was === TERRAIN.water || terrain === TERRAIN.water) this.waterRev++;
    this.tiles[idx] = terrain;
  }

  /**
   * Bumped whenever open water changes (a tile turns to or from water, or a
   * water tile is blocked or freed), so water-layer caches (waterBodies)
   * know to rebuild.
   */
  get waterRevision(): number {
    return this.waterRev;
  }

  isPassable(tx: number, ty: number): boolean {
    if (!isInsideMap({ tx, ty }, this.width, this.height)) return false;
    const idx = ty * this.width + tx;
    if (this.blocked[idx] === 1) return false;
    return isPassable(this.tiles[idx] as TerrainId);
  }

  /**
   * Free grass a building may cover: walkable and not a resource. Berry
   * bushes are walkable, but a building on one would bury the bush.
   */
  isBuildable(tx: number, ty: number): boolean {
    return this.isPassable(tx, ty) && this.tiles[ty * this.width + tx] === TERRAIN.grass;
  }

  setBlocked(tx: number, ty: number, blocked: boolean): void {
    if (!isInsideMap({ tx, ty }, this.width, this.height)) return;
    const idx = ty * this.width + tx;
    const value = blocked ? 1 : 0;
    if (this.blocked[idx] === value) return;
    if (this.tiles[idx] === TERRAIN.water) this.waterRev++;
    this.blocked[idx] = value;
  }

  isBlocked(tx: number, ty: number): boolean {
    if (!isInsideMap({ tx, ty }, this.width, this.height)) return true;
    return this.blocked[ty * this.width + tx] === 1;
  }

  /** Raw backing array, intended for renderers and save serialisation. */
  getRawTiles(): Readonly<Uint8Array> {
    return this.tiles;
  }

  /** Raw blocked mask (1 = a building or wall stands there), for save serialisation. */
  getRawBlocked(): Readonly<Uint8Array> {
    return this.blocked;
  }

  forEachTile(
    fn: (tile: TileCoord, terrain: TerrainId) => void,
  ): void {
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        fn({ tx, ty }, this.tiles[ty * this.width + tx] as TerrainId);
      }
    }
  }
}
