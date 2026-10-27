import Phaser from 'phaser';
import type { EcsWorld } from '../ecs/world';
import type { FogOfWarData } from '../map/FogOfWarData';
import type { MapData } from '../map/MapData';
import { Hud } from '../ui/HUD';
import { Minimap } from '../ui/Minimap';

const MINIMAP_CSS_SIZE = 204;

/**
 * Runs alongside GameScene and owns the DOM HUD overlay (see
 * src/ui/HUD.ts). The scene itself draws nothing; it only ties the
 * overlay's lifetime and per-frame minimap refresh to the game loop.
 */
export class HUDScene extends Phaser.Scene {
  private hud: Hud | null = null;

  constructor() {
    super({ key: 'HUDScene' });
  }

  create(): void {
    this.hud = new Hud(this.textures);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.hud?.destroy();
      this.hud = null;
    });
  }

  /**
   * Per-frame HUD refresh. An override rather than an UPDATE listener: scene
   * events outlive a stop/relaunch, so a listener added in create() would stack
   * once per game.
   */
  override update(_time: number, deltaMs: number): void {
    this.hud?.update(deltaMs);
  }

  setupMinimap(
    world: EcsWorld,
    mapData: MapData,
    fog: FogOfWarData,
    gameCamera: Phaser.Cameras.Scene2D.Camera,
    onJumpTo: (tx: number, ty: number) => void,
  ): void {
    this.hud?.attachMinimap(new Minimap(MINIMAP_CSS_SIZE, world, mapData, fog, gameCamera, onJumpTo));
  }
}
