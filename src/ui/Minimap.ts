import type Phaser from 'phaser';
import { TILE_HEIGHT, TILE_WIDTH } from '../config/constants';
import type { EcsWorld } from '../ecs/world';
import { PLAYER_COLORS } from '../game/Player';
import { css } from '../iso/art/palette';
import { FOG_EXPLORED, FOG_UNEXPLORED, type FogOfWarData } from '../map/FogOfWarData';
import type { MapData } from '../map/MapData';
import { TERRAIN, type TerrainId } from '../map/TerrainTypes';

const REBUILD_INTERVAL_MS = 500;

const TERRAIN_COLOR: Record<TerrainId, number> = {
  [TERRAIN.grass]: 0x5f8f3c,
  [TERRAIN.forest]: 0x2c4c26,
  [TERRAIN.gold_mine]: 0xe2b84a,
  [TERRAIN.berries]: 0xc4505a,
  [TERRAIN.water]: 0x2f6f9a,
  [TERRAIN.cliff]: 0x6a6460,
};

/**
 * Isometric overview drawn on a DOM canvas. Tiles, fog, units and
 * buildings are repainted twice a second; the camera frustum is
 * redrawn every frame. Clicking or dragging jumps the main camera.
 */
export class Minimap {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly base: HTMLCanvasElement;
  private readonly size: number;
  private readonly dpr: number;
  private readonly scale: number;
  private readonly offsetX: number;
  private readonly offsetY: number;
  private readonly minWorldX: number;
  private elapsed = Number.MAX_SAFE_INTEGER;
  private dragging = false;

  constructor(
    sizeCss: number,
    private readonly world: EcsWorld,
    private readonly mapData: MapData,
    private readonly fog: FogOfWarData | null,
    private readonly camera: Phaser.Cameras.Scene2D.Camera,
    private readonly onJumpTo: (tx: number, ty: number) => void,
  ) {
    this.size = sizeCss;
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = Math.round(sizeCss * this.dpr);
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas context unavailable');
    this.ctx = ctx;
    this.base = document.createElement('canvas');
    this.base.width = this.base.height = this.canvas.width;

    const W = mapData.width;
    const H = mapData.height;
    this.minWorldX = -(H - 1) * (TILE_WIDTH / 2) - TILE_WIDTH / 2;
    const worldWidth = (W + H) * (TILE_WIDTH / 2);
    const worldHeight = (W + H) * (TILE_HEIGHT / 2);
    this.scale = Math.min(sizeCss / worldWidth, sizeCss / worldHeight) * 0.96;
    this.offsetX = (sizeCss - worldWidth * this.scale) / 2;
    this.offsetY = (sizeCss - worldHeight * this.scale) / 2;

    this.canvas.addEventListener('pointerdown', this.onPointer);
    this.canvas.addEventListener('pointermove', this.onPointer);
    window.addEventListener('pointerup', this.onUp);
  }

  private readonly onPointer = (e: PointerEvent): void => {
    if (e.type === 'pointerdown') this.dragging = true;
    if (!this.dragging) return;
    const r = this.canvas.getBoundingClientRect();
    const mx = ((e.clientX - r.left) / r.width) * this.size;
    const my = ((e.clientY - r.top) / r.height) * this.size;
    const wx = (mx - this.offsetX) / this.scale + this.minWorldX;
    const wy = (my - this.offsetY) / this.scale - TILE_HEIGHT / 2;
    const tx = (wx / (TILE_WIDTH / 2) + wy / (TILE_HEIGHT / 2)) / 2;
    const ty = (wy / (TILE_HEIGHT / 2) - wx / (TILE_WIDTH / 2)) / 2;
    const clamp = (v: number, max: number) => Math.max(0, Math.min(max - 1, Math.round(v)));
    this.onJumpTo(clamp(tx, this.mapData.width), clamp(ty, this.mapData.height));
  };

  private readonly onUp = (): void => {
    this.dragging = false;
  };

  private toMini(sx: number, sy: number): [number, number] {
    return [
      ((sx - this.minWorldX) * this.scale + this.offsetX) * this.dpr,
      ((sy + TILE_HEIGHT / 2) * this.scale + this.offsetY) * this.dpr,
    ];
  }

  update(deltaMs: number): void {
    this.elapsed += deltaMs;
    if (this.elapsed >= REBUILD_INTERVAL_MS) {
      this.rebuild();
      this.elapsed = 0;
    }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.drawImage(this.base, 0, 0);
    const view = this.camera.worldView;
    const [x0, y0] = this.toMini(view.x, view.y);
    const [x1, y1] = this.toMini(view.right, view.bottom);
    ctx.strokeStyle = 'rgba(255,207,143,.95)';
    ctx.lineWidth = 1.5 * this.dpr;
    ctx.strokeRect(x0, y0, x1 - x0, y1 - y0);
  }

  private rebuild(): void {
    const ctx = this.base.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, this.base.width, this.base.height);
    const hw = TILE_WIDTH / 2;
    const hh = TILE_HEIGHT / 2;
    const dw = hw * this.scale * this.dpr;
    const dh = hh * this.scale * this.dpr;
    const diamond = (cx: number, cy: number) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy - dh);
      ctx.lineTo(cx + dw, cy);
      ctx.lineTo(cx, cy + dh);
      ctx.lineTo(cx - dw, cy);
      ctx.closePath();
      ctx.fill();
    };
    for (let ty = 0; ty < this.mapData.height; ty++) {
      for (let tx = 0; tx < this.mapData.width; tx++) {
        const fogState = this.fog?.get(tx, ty);
        const [cx, cy] = this.toMini((tx - ty) * hw, (tx + ty) * hh);
        if (fogState === FOG_UNEXPLORED) {
          ctx.fillStyle = '#0f1218';
        } else {
          const c = TERRAIN_COLOR[this.mapData.getTile(tx, ty)];
          ctx.fillStyle = css(c, fogState === FOG_EXPLORED ? 0.55 : 1);
        }
        diamond(cx, cy);
      }
    }
    for (const e of this.world.with('owner', 'position')) {
      if (!e.unit && !e.building) continue;
      const own = e.owner.playerId === 1;
      if (!own && this.fog && !this.fog.isVisible(e.position.tx, e.position.ty)) continue;
      const color = PLAYER_COLORS[(e.owner.playerId - 1) % PLAYER_COLORS.length] ?? 0xffffff;
      const b = e.building;
      const tx = e.position.tx + (b ? (b.footprint.width - 1) / 2 : 0);
      const ty = e.position.ty + (b ? (b.footprint.height - 1) / 2 : 0);
      const [cx, cy] = this.toMini((tx - ty) * hw, (tx + ty) * hh);
      const r = (b ? 3.2 : 1.8) * this.dpr;
      ctx.fillStyle = css(color);
      ctx.strokeStyle = 'rgba(0,0,0,.6)';
      ctx.lineWidth = this.dpr;
      ctx.beginPath();
      if (b) ctx.rect(cx - r, cy - r, r * 2, r * 2);
      else ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.onPointer);
    this.canvas.removeEventListener('pointermove', this.onPointer);
    window.removeEventListener('pointerup', this.onUp);
    this.canvas.remove();
  }
}
