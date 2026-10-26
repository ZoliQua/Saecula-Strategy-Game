import Phaser from 'phaser';
import { FX_KEYS } from '../../../iso/textures';

/** Combat particles draw over the world like the ambient FX (AmbientFxSystem). */
const FX_DEPTH = 8_500;

type Emitter = Phaser.GameObjects.Particles.ParticleEmitter;
type Config = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig;

/** Unit direction in screen px. */
export interface Dir {
  readonly x: number;
  readonly y: number;
}

/**
 * The particle emitters behind every combat effect (Phaser pools the
 * particles themselves). Each method is one recipe: where and how many
 * particles a musket shot, a cannon blast, a sword blow, a falling body
 * throws out. Coordinates are world px.
 */
export class CombatEmitters {
  private readonly gunSmoke: Emitter;
  private readonly blastSmoke: Emitter;
  private readonly dust: Emitter;
  private readonly kickDust: Emitter;
  private readonly scuffDust: Emitter;
  private readonly debris: Emitter;
  private readonly embers: Emitter;
  private readonly sparks: Emitter;
  private readonly glow: Emitter;
  private readonly all: Emitter[];

  constructor(scene: Phaser.Scene) {
    const make = (key: string, cfg: Config, depth = FX_DEPTH): Emitter =>
      scene.add.particles(0, 0, key, { emitting: false, ...cfg }).setDepth(depth);
    this.gunSmoke = make(FX_KEYS.gunSmoke, {
      lifespan: { min: 2400, max: 3600 },
      speedX: { min: -5, max: 11 },
      speedY: { min: -14, max: -4 },
      scale: { start: 0.3, end: 1.25 },
      alpha: { start: 0.72, end: 0, ease: 'Quad.easeIn' },
      rotate: { min: 0, max: 360 },
    });
    this.blastSmoke = make(FX_KEYS.gunSmoke, {
      lifespan: { min: 2600, max: 4200 },
      speedX: { min: -14, max: 14 },
      speedY: { min: -30, max: -12 },
      scale: { start: 0.45, end: 1.6 },
      alpha: { start: 0.8, end: 0 },
      rotate: { min: 0, max: 360 },
      tint: [0x5a524b, 0x6e655c, 0x48413b],
    });
    this.dust = make(FX_KEYS.dust, {
      lifespan: { min: 600, max: 1100 },
      speed: { min: 8, max: 30 },
      angle: { min: 190, max: 350 },
      scale: { start: 0.45, end: 1.35 },
      alpha: { start: 0.55, end: 0 },
    });
    this.scuffDust = make(FX_KEYS.dust, {
      lifespan: { min: 350, max: 550 },
      speedX: { min: -22, max: 22 },
      speedY: { min: -10, max: -2 },
      scaleX: { start: 0.3, end: 0.8 },
      scaleY: { start: 0.2, end: 0.45 },
      alpha: { start: 0.5, end: 0 },
    });
    this.kickDust = make(FX_KEYS.dust, {
      lifespan: { min: 700, max: 1300 },
      // A ring flattened onto the iso ground plane (half as tall as wide).
      speedX: { min: -95, max: 95 },
      speedY: { min: -42, max: 42 },
      scaleY: { start: 0.5, end: 1.0 },
      scaleX: { start: 0.8, end: 1.9 },
      alpha: { start: 0.65, end: 0 },
    });
    this.debris = make(FX_KEYS.debris, {
      lifespan: { min: 650, max: 1050 },
      speed: { min: 70, max: 170 },
      angle: { min: 205, max: 335 },
      gravityY: 420,
      rotate: { start: 0, end: 540 },
      scale: { min: 0.6, max: 1.25 },
      alpha: { start: 1, end: 0.2 },
    });
    this.embers = make(FX_KEYS.spark, {
      lifespan: { min: 380, max: 750 },
      speed: { min: 60, max: 170 },
      angle: { min: 200, max: 340 },
      gravityY: 220,
      scale: { start: 0.7, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    }, FX_DEPTH + 1);
    this.sparks = make(FX_KEYS.spark, {
      lifespan: { min: 180, max: 360 },
      speed: { min: 40, max: 110 },
      angle: { min: 190, max: 350 },
      gravityY: 260,
      scale: { start: 0.6, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    }, FX_DEPTH + 1);
    this.glow = make(FX_KEYS.glow, {
      lifespan: 200,
      scale: { start: 0.9, end: 1.5 },
      alpha: { start: 0.9, end: 0 },
      blendMode: Phaser.BlendModes.ADD,
    }, FX_DEPTH + 2);
    this.all = [this.gunSmoke, this.blastSmoke, this.dust, this.kickDust, this.scuffDust, this.debris, this.embers, this.sparks, this.glow];
  }

  /** Musket: a jet of white smoke along the aim, a few sparks. (x, y) = muzzle. */
  musketShot(x: number, y: number, d: Dir): void {
    for (let i = 0; i < 6; i++) this.gunSmoke.emitParticleAt(x + d.x * i * 5, y + d.y * i * 5 - i);
    this.sparks.emitParticleAt(x + d.x * 4, y + d.y * 4, 3);
  }

  /** Cannon: big smoke bank, glow, recoil dust kicked up at the carriage (gx, gy). */
  cannonShot(x: number, y: number, d: Dir, gx: number, gy: number): void {
    for (let i = 0; i < 8; i++) this.gunSmoke.emitParticleAt(x + d.x * i * 4, y + d.y * i * 4 - i);
    this.glow.emitParticleAt(x + d.x * 6, y + d.y * 6);
    this.embers.emitParticleAt(x + d.x * 8, y + d.y * 8, 4);
    for (let i = 0; i < 7; i++) this.dust.emitParticleAt(gx - d.x * 8 + (Math.random() - 0.5) * 26, gy - 2 + (Math.random() - 0.5) * 8);
  }

  /** Shell impact: flash, embers, flying dirt, dust ring, a lingering dark smoke column. */
  blast(x: number, y: number): void {
    this.glow.emitParticleAt(x, y - 12, 2);
    this.embers.emitParticleAt(x, y - 10, 10);
    this.debris.emitParticleAt(x, y - 4, 16);
    this.kickDust.emitParticleAt(x, y, 12);
    for (let i = 0; i < 5; i++) this.blastSmoke.emitParticleAt(x + (Math.random() - 0.5) * 22, y - 14 - i * 6);
  }

  /** Weapon contact: bright sparks. */
  strike(x: number, y: number): void {
    this.sparks.emitParticleAt(x, y, 9);
  }

  /** Small dust kick (a shot landing in the dirt, a body taking a hit). */
  puff(x: number, y: number, count = 3): void {
    this.dust.emitParticleAt(x, y, count);
  }

  /** Feet scuffing the ground as a unit staggers from a hit. */
  scuff(x: number, y: number): void {
    this.scuffDust.emitParticleAt(x, y, 2);
  }

  /** A body hitting the ground. */
  bodyFall(x: number, y: number): void {
    for (let i = 0; i < 5; i++) this.dust.emitParticleAt(x + (Math.random() - 0.5) * 18, y - 2 + (Math.random() - 0.5) * 6);
  }

  destroy(): void {
    for (const e of this.all) e.destroy();
  }
}
