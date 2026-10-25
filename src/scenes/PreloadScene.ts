import Phaser from 'phaser';
import { hu } from '../i18n/hu';
import { UNIT_SPECS } from '../ecs/archetypes/unit';
import { paintAllUnitArt, unitArt } from '../iso/art/units/UnitArt';
import { generateArt } from '../iso/textures';

/**
 * Paints all procedural art. Painting is synchronous, so we draw the
 * loading label first and give the browser one frame to show it.
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  create(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2, hu.loading.toUpperCase(), {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: '12px',
        color: '#f5a857',
        letterSpacing: 4,
      })
      .setOrigin(0.5);
    this.time.delayedCall(60, () => {
      generateArt(this);
      // Villagers are on screen from the first frame of the menu and the
      // game: paint them now (this also warms up the unit rasterizer).
      const villager = unitArt(this, 'villager', UNIT_SPECS.villager.textureKey, true);
      if (villager) paintAllUnitArt(this, villager);
      this.scene.start('MainMenuScene');
    });
  }
}
