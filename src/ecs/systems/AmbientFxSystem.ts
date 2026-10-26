import Phaser from 'phaser';
import { tileToScreen } from '../../iso/coordinates';
import { BUILDING_LIGHT, FX_KEYS } from '../../iso/textures';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

const FX_DEPTH = 8_500;
const SMOKE_EVERY_MS = 420;

/**
 * Purely cosmetic particles: chimney smoke and drifting pollen motes in
 * the camera view (combat effects live in CombatFxSystem, building
 * damage / collapse / hammer dust in BuildingFxSystem). Reads the ECS,
 * never writes it.
 */
export class AmbientFxSystem {
  private readonly smoke: Phaser.GameObjects.Particles.ParticleEmitter;
  private readonly motes: Phaser.GameObjects.Particles.ParticleEmitter;
  private smokeTimer = 0;
  private fog: FogOfWarData | null = null;
  private viewerPlayerId = 1;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
  ) {
    this.smoke = scene.add
      .particles(0, 0, FX_KEYS.smoke, {
        emitting: false,
        lifespan: { min: 2600, max: 3600 },
        speedX: { min: 4, max: 14 },
        speedY: { min: -22, max: -14 },
        scale: { start: 0.25, end: 1.1 },
        alpha: { start: 0.55, end: 0 },
        rotate: { min: 0, max: 360 },
      })
      .setDepth(FX_DEPTH);
    this.motes = scene.add
      .particles(0, 0, FX_KEYS.mote, {
        frequency: 160,
        lifespan: 7000,
        speedX: { min: 4, max: 16 },
        speedY: { min: -8, max: 3 },
        scale: { min: 0.25, max: 0.6 },
        alpha: { start: 0, end: 0, ease: (t: number) => Math.sin(t * Math.PI) * 0.7 },
        blendMode: Phaser.BlendModes.ADD,
        emitZone: { type: 'random', source: new Phaser.Geom.Rectangle(0, 0, 1, 1), quantity: 1 },
      })
      .setDepth(FX_DEPTH + 2);
  }

  setFogContext(fog: FogOfWarData, viewerPlayerId: number): void {
    this.fog = fog;
    this.viewerPlayerId = viewerPlayerId;
  }

  update(delta: number): void {
    this.smokeTimer += delta;
    const emitSmoke = this.smokeTimer >= SMOKE_EVERY_MS;
    if (emitSmoke) this.smokeTimer = 0;

    for (const e of this.world.with('building', 'position')) {
      if (!emitSmoke || e.dying || e.underConstruction || !this.isSeen(e)) continue;
      const anchor = frontCorner(e);
      // Chimney tops are recorded by the painter per age style (front-corner relative).
      const key = e.sprite?.texture.key;
      for (const [dx, dy] of (key && BUILDING_LIGHT.get(key)?.smoke) || []) {
        this.smoke.emitParticleAt(anchor.sx + dx, anchor.sy + dy);
      }
    }

    const view = this.scene.cameras.main.worldView;
    const zone = this.motes.emitZones[0] as unknown as { source: Phaser.Geom.Rectangle } | undefined;
    zone?.source.setTo(view.x - 100, view.y, view.width + 100, view.height);
  }

  private isSeen(e: Entity): boolean {
    if (!this.fog || !e.position) return true;
    if (e.owner?.playerId === this.viewerPlayerId) return true;
    return this.fog.isVisible(e.position.tx, e.position.ty);
  }

  destroy(): void {
    this.smoke.destroy();
    this.motes.destroy();
  }
}

function frontCorner(e: Entity): { sx: number; sy: number } {
  const b = e.building!;
  const p = tileToScreen({
    tx: e.position!.tx + b.footprint.width - 1,
    ty: e.position!.ty + b.footprint.height - 1,
  });
  return { sx: p.sx, sy: p.sy + 16 };
}
