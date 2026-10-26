import type Phaser from 'phaser';
import type { FogOfWarData } from '../../map/FogOfWarData';
import type { EcsWorld } from '../world';
import { BuildingEmitters } from './buildingFx/BuildingEmitters';
import { BuildingFires } from './buildingFx/BuildingFires';
import { Collapses } from './buildingFx/Collapses';
import { HammerDust } from './buildingFx/HammerDust';

/**
 * Cosmetic building effects, read from the ECS (never written): damage
 * states (cracks, soot, smoke, fire with flickering light), the collapse
 * of destroyed buildings with their lingering rubble, and hammer dust
 * from builders. Runs after RenderSystem so it can pose the building
 * sprites it positioned this frame.
 */
export class BuildingFxSystem {
  private readonly fx: BuildingEmitters;
  private readonly fires: BuildingFires;
  private readonly collapses: Collapses;
  private readonly hammer: HammerDust;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly world: EcsWorld,
  ) {
    this.fx = new BuildingEmitters(scene);
    this.fires = new BuildingFires(scene, world, this.fx);
    this.collapses = new Collapses(scene, world, this.fx, this.fires);
    this.hammer = new HammerDust(scene, world, this.fx);
  }

  setFogContext(fog: FogOfWarData): void {
    this.collapses.setFogContext(fog);
  }

  update(deltaMs: number): void {
    const now = this.scene.time.now;
    this.fires.update(this.world, now);
    this.collapses.update(now, deltaMs);
    this.hammer.update(this.world, now);
  }

  destroy(): void {
    this.hammer.destroy();
    this.collapses.destroy();
    this.fires.destroy();
    this.fx.destroy();
  }
}
