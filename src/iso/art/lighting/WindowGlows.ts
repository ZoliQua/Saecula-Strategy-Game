import Phaser from 'phaser';
import type { GlowPoint } from './normalLayer';

const GLOW_KEY = 'fx_window_glow';
/** Glow sprite diameter relative to the window size. */
const GLOW_SPREAD = 2.6;

type Host = Phaser.GameObjects.Sprite | Phaser.GameObjects.Image;

interface Entry {
  readonly host: Host;
  readonly sprites: Phaser.GameObjects.Image[];
  readonly points: readonly GlowPoint[];
  readonly isLit: () => boolean;
  readonly phase: number;
}

function ensureGlowTexture(scene: Phaser.Scene): void {
  if (scene.textures.exists(GLOW_KEY)) return;
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  g.addColorStop(0, 'rgba(255,214,140,1)');
  g.addColorStop(0.25, 'rgba(255,170,80,.55)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(GLOW_KEY, canvas);
}

/**
 * Warm additive glows over painted windows, faded in by the sky's glow
 * level (dusk/night). Glow points come from IsoPainter.window() in
 * texture px; each follows its host sprite (pull model).
 */
export class WindowGlows {
  private readonly entries = new Set<Entry>();

  constructor(private readonly scene: Phaser.Scene) {
    ensureGlowTexture(scene);
  }

  add(host: Host, points: readonly GlowPoint[], isLit: () => boolean = () => true): () => void {
    if (points.length === 0) return () => undefined;
    const sprites = points.map(() =>
      this.scene.add.image(0, 0, GLOW_KEY).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
    );
    const e: Entry = { host, sprites, points, isLit, phase: Math.random() * 10 };
    this.entries.add(e);
    return () => {
      this.entries.delete(e);
      for (const s of sprites) s.destroy();
    };
  }

  update(timeMs: number, level: number): void {
    for (const e of this.entries) {
      const h = e.host;
      const show = level > 0.02 && h.active && h.visible && !h.isCropped && e.isLit();
      e.points.forEach((p, i) => {
        const s = e.sprites[i];
        if (!s) return;
        s.setVisible(show);
        if (!show) return;
        const flicker = 0.88 + 0.12 * Math.sin(timeMs * 0.004 + e.phase + i * 1.7) * Math.sin(timeMs * 0.0113 + i);
        s.setPosition(h.x + (p.x - h.displayOriginX) * h.scaleX, h.y + (p.y - h.displayOriginY) * h.scaleY);
        s.setScale((p.r * GLOW_SPREAD * Math.abs(h.scaleX)) / 64);
        s.setAlpha(level * flicker * h.alpha);
        s.setDepth(h.depth + 0.05);
      });
    }
  }

  destroy(): void {
    for (const e of this.entries) for (const s of e.sprites) s.destroy();
    this.entries.clear();
  }
}
