export const FOG_UNEXPLORED = 0;
export const FOG_EXPLORED = 1;
export const FOG_VISIBLE = 2;

export type FogState = 0 | 1 | 2;

/**
 * Per-tile fog state for a single player. Uint8Array-backed so a
 * 128x128 map is 16 KB and serialises cheaply into save files.
 *
 * Renderers should watch `revision` and full-repaint when it bumps —
 * we don't track per-tile dirty sets because the whole layer repaints
 * in ~1 ms via a single Phaser Graphics batch.
 */
export class FogOfWarData {
  public readonly width: number;
  public readonly height: number;
  private readonly states: Uint8Array;
  public revision = 0;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.states = new Uint8Array(width * height);
  }

  get(tx: number, ty: number): FogState {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) {
      return FOG_UNEXPLORED as FogState;
    }
    return this.states[ty * this.width + tx] as FogState;
  }

  isVisible(tx: number, ty: number): boolean {
    return this.get(tx, ty) === FOG_VISIBLE;
  }

  /** Drops visible tiles back to explored before the next scan. */
  dimVisibleToExplored(): void {
    for (let i = 0; i < this.states.length; i++) {
      if (this.states[i] === FOG_VISIBLE) {
        this.states[i] = FOG_EXPLORED;
      }
    }
  }

  markVisible(tx: number, ty: number): void {
    if (tx < 0 || ty < 0 || tx >= this.width || ty >= this.height) return;
    this.states[ty * this.width + tx] = FOG_VISIBLE;
  }

  /** Replaces every tile state with saved `states` (copied) and bumps `revision`. */
  load(states: Uint8Array): void {
    if (states.length !== this.states.length) {
      throw new RangeError(`Fog states (${states.length}) do not match ${this.width}x${this.height}`);
    }
    this.states.set(states);
    this.revision++;
  }

  /** Expose raw buffer for save-file serialisation. */
  raw(): Readonly<Uint8Array> {
    return this.states;
  }
}
