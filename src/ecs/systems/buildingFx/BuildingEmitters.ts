import Phaser from 'phaser';
import { FX_KEYS } from '../../../iso/textures';

/** Building effects draw over the world like the other particles (AmbientFxSystem, CombatEmitters). */
const FX_DEPTH = 8_500;

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
type Config = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

/**
 * Particle recipes for damaged, burning and collapsing buildings and
 * for builders at work (Phaser pools the particles). World px.
 */
export class BuildingEmitters {
  private readonly lightSmoke: Emitter;
  private readonly heavySmoke: Emitter;
  private readonly embers: Emitter;
  private readonly cloud: Emitter;
  private readonly ring: Emitter;
  private readonly debris: Emitter;
  private readonly hammer: Emitter;
  private readonly chips: Emitter;
  private readonly all: Emitter[];

  constructor(scene: Phaser.Scene) {
    const make = (key: string, cfg: Config, depth = FX_DEPTH): Emitter =>
      scene.add.particles(0, 0, key, { emitting: false, ...cfg }).setDepth(depth);
    this.lightSmoke = make(FX_KEYS.smoke, {
      lifespan: { min: 2600, max: 3800 },
      speedX: { min: 3, max: 12 },
      speedY: { min: -20, max: -12 },
      scale: { start: 0.3, end: 1.2 },
      alpha: { start: 0.42, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0x9a948c, 0xb4aea6, 0x868079],
    });
    this.heavySmoke = make(FX_KEYS.gunSmoke, {
      lifespan: { min: 3200, max: 4800 },
      speedX: { min: 6, max: 20 },
      speedY: { min: -38, max: -22 },
      accelerationX: 4,
      scale: { start: 0.6, end: 2 },
      alpha: { start: 0.55, end: 0, ease: 'Quad.easeIn' },
      rotate: { min: 0, max: 360 },
      tint: [0x2b2522, 0x3a332e, 0x221d1a, 0x4a3f36],
    });
    this.embers = make(FX_KEYS.spark, {
      lifespan: { min: 900, max: 1700 },
      speedX: { min: -16, max: 22 },
      speedY: { min: -70, max: -34 },
      gravityY: -8,
      scale: { start: 0.42, end: 0 },
      alpha: { start: 1, end: 0.2 },
      blendMode: Phaser.BlendModes.ADD,
    }, FX_DEPTH + 1);
    this.cloud = make(FX_KEYS.gunSmoke, {
      lifespan: { min: 1800, max: 3200 },
      speedX: { min: -26, max: 26 },
      speedY: { min: -26, max: -6 },
      scale: { start: 0.5, end: 2.2 },
      alpha: { start: 0.75, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0xb8a688, 0xa39377, 0xc7b89c, 0x8d7f69],
    });
    this.ring = make(FX_KEYS.dust, {
      lifespan: { min: 900, max: 1600 },
      // A ring flattened onto the iso ground plane (half as tall as wide).
      speedX: { min: -110, max: 110 },
      speedY: { min: -50, max: 50 },
      scaleX: { start: 1, end: 2.6 },
      scaleY: { start: 0.6, end: 1.4 },
      alpha: { start: 0.7, end: 0 },
    });
    this.debris = make(FX_KEYS.debris, {
      lifespan: { min: 500, max: 900 },
      speedX: { min: -60, max: 60 },
      speedY: { min: -70, max: 10 },
      gravityY: 520,
      rotate: { start: 0, end: 480 },
      scale: { min: 0.7, max: 1.5 },
      alpha: { start: 1, end: 0.4 },
    });
    this.hammer = make(FX_KEYS.dust, {
      lifespan: { min: 450, max: 800 },
      speedX: { min: -30, max: 30 },
      speedY: { min: -26, max: -6 },
      scale: { start: 0.4, end: 1.15 },
      alpha: { start: 0.85, end: 0 },
      // Greyer than the sandy site plate so the puffs read against it.
      tint: [0xb0a48e, 0x9c917e, 0xc4b9a4],
    });
    this.chips = make(FX_KEYS.debris, {
      lifespan: { min: 300, max: 520 },
      speedX: { min: -40, max: 40 },
      speedY: { min: -60, max: -25 },
      gravityY: 380,
      rotate: { start: 0, end: 360 },
      scale: { min: 0.35, max: 0.6 },
      tint: [0xc89a5c, 0xa77a44, 0xb0a594],
    });
    this.all = [this.lightSmoke, this.heavySmoke, this.embers, this.cloud, this.ring, this.debris, this.hammer, this.chips];
  }

  /** A thin grey wisp from a damaged roof. */
  smolder(x: number, y: number): void {
    this.lightSmoke.emitParticleAt(x + (Math.random() - 0.5) * 6, y);
  }

  /** Thick black smoke rolling off a fire; `size` scales the plume. */
  fireSmoke(x: number, y: number, size: number): void {
    const n = size > 0.8 ? 2 : 1;
    for (let i = 0; i < n; i++) this.heavySmoke.emitParticleAt(x + (Math.random() - 0.5) * 10 * size, y - Math.random() * 6);
  }

  /** Sparks lifting off the flames. */
  fireEmbers(x: number, y: number, count: number): void {
    this.embers.emitParticleAt(x + (Math.random() - 0.5) * 10, y, count);
  }

  /** The building gives way: a dust ring along the ground and a billowing cloud. `span` = footprint width px. */
  collapseBurst(x: number, y: number, span: number): void {
    this.ring.emitParticleAt(x, y, Math.round(8 + span / 10));
    for (let i = 0; i < 6 + span / 24; i++) {
      this.cloud.emitParticleAt(x + (Math.random() - 0.5) * span * 0.8, y - Math.random() * span * 0.25);
    }
  }

  /** Dust rolling out at the base while it sinks. */
  collapseDust(x: number, y: number, span: number): void {
    this.cloud.emitParticleAt(x + (Math.random() - 0.5) * span, y - Math.random() * span * 0.2);
  }

  /** Masonry and beams breaking off the sinking top edge. */
  collapseDebris(x: number, y: number, span: number): void {
    this.debris.emitParticleAt(x + (Math.random() - 0.5) * span * 0.7, y);
  }

  /** A builder's tool striking the site. */
  hammerStrike(x: number, y: number, dust: number): void {
    this.hammer.emitParticleAt(x, y, dust);
    if (Math.random() < 0.5) this.chips.emitParticleAt(x, y - 2, 2);
  }

  destroy(): void {
    for (const e of this.all) e.destroy();
  }
}
