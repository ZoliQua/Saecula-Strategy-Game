import Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH } from '../config/constants';
import { FOG_UNEXPLORED, type FogOfWarData } from './FogOfWarData';
import { fogAlphaTarget, stepFogAlpha } from './fogAlpha';

const FOG_DEPTH = 10_000;
/** Canvas pixels per tile. */
const RES = 4;
/** Unexplored border (tiles) so blur never bleeds transparency inward. */
const PAD = 3;
const REDRAW_INTERVAL_MS = 60;
const FOG_RGB = '9,12,18';

/**
 * Soft fog of war. Per-tile alpha lives in a small canvas (RES px per
 * tile) that is blurred and then projected onto the iso grid with a
 * rotate(45°) + squash(0.5) transform, giving smooth feathered edges
 * instead of a tile staircase. Alpha eases towards the scanner's state
 * so revealed land fades in rather than popping.
 */
export class FogLayer {
  private readonly container: Phaser.GameObjects.Container;
  private readonly texture: Phaser.Textures.CanvasTexture;
  private readonly raw: HTMLCanvasElement;
  private readonly rawCtx: CanvasRenderingContext2D;
  private readonly current: Float32Array;
  private readonly target: Float32Array;
  private sinceRedraw = REDRAW_INTERVAL_MS;
  private settled = false;
  private hasTarget = false;
  private static seq = 0;

  constructor(
    scene: Phaser.Scene,
    private readonly width: number,
    private readonly height: number,
  ) {
    const cw = (width + PAD * 2) * RES;
    const ch = (height + PAD * 2) * RES;
    const key = `fog_layer_${FogLayer.seq++}`;
    const tex = scene.textures.createCanvas(key, cw, ch);
    if (!tex) throw new Error('Could not create fog texture');
    this.texture = tex;
    this.raw = document.createElement('canvas');
    this.raw.width = cw;
    this.raw.height = ch;
    const ctx = this.raw.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.rawCtx = ctx;
    this.current = new Float32Array(width * height).fill(1);
    this.target = new Float32Array(width * height).fill(1);

    const image = scene.add.image(0, 0, key).setOrigin(0, 0);
    image.setAngle(45);
    image.setScale(((TILE_WIDTH / 2) * Math.SQRT2) / RES);
    // Canvas pixel (0,0) is tile (-PAD-0.5, -PAD-0.5).
    this.container = scene.add
      .container(0, -(2 * PAD + 1) * (TILE_HEIGHT / 2), [image])
      .setScale(1, 0.5)
      .setDepth(FOG_DEPTH);
  }

  setTarget(fog: FogOfWarData): void {
    const raw = fog.raw();
    let changed = !this.hasTarget;
    for (let i = 0; i < raw.length; i++) {
      const t = fogAlphaTarget(raw[i] ?? FOG_UNEXPLORED);
      if (this.target[i] !== t) {
        this.target[i] = t;
        changed = true;
      }
    }
    if (!this.hasTarget) {
      // First scan: snap so the game doesn't open with a fade-in.
      this.current.set(this.target);
      this.hasTarget = true;
    }
    if (changed) this.settled = false;
  }

  update(delta: number): void {
    if (this.settled) return;
    const moving = stepFogAlpha(this.current, this.target, delta);
    this.sinceRedraw += delta;
    if (this.sinceRedraw >= REDRAW_INTERVAL_MS || !moving) {
      this.redraw();
      this.sinceRedraw = 0;
    }
    if (!moving) this.settled = true;
  }

  private redraw(): void {
    const ctx = this.rawCtx;
    const cw = this.raw.width;
    const ch = this.raw.height;
    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = `rgba(${FOG_RGB},1)`;
    ctx.fillRect(0, 0, cw, ch);
    for (let ty = 0; ty < this.height; ty++) {
      for (let tx = 0; tx < this.width; tx++) {
        const a = this.current[ty * this.width + tx] ?? 1;
        if (a >= 0.999) continue;
        const x = (tx + PAD) * RES;
        const y = (ty + PAD) * RES;
        ctx.clearRect(x, y, RES, RES);
        if (a > 0.001) {
          ctx.fillStyle = `rgba(${FOG_RGB},${a.toFixed(3)})`;
          ctx.fillRect(x, y, RES, RES);
        }
      }
    }
    const out = this.texture.getContext();
    out.clearRect(0, 0, cw, ch);
    out.filter = 'blur(3px)';
    out.drawImage(this.raw, 0, 0);
    out.filter = 'none';
    this.texture.refresh();
  }

  destroy(): void {
    this.container.destroy(true);
    this.texture.destroy();
  }
}

