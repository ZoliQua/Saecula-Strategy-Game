import Phaser from 'phaser';
import { gameConfig } from './config/game';
import { unitArtStats, unitArtTiming } from './iso/art/units/UnitArt';

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  // Dev-only: expose the game instance for preview / console debugging.
  (window as unknown as { __game: Phaser.Game }).__game = game;
  // Dev-only unit art review: __showUnits({ anim: 'walk', zoom: 2 }).
  (window as unknown as { __showUnits: (opts?: object) => void }).__showUnits = (opts = {}) => {
    const showcase = game.scene.getScene('UnitShowcaseScene');
    if (showcase.scene.isActive()) {
      showcase.scene.restart(opts);
      return;
    }
    for (const s of game.scene.getScenes(true)) s.scene.stop();
    game.scene.start('UnitShowcaseScene', opts);
  };
  (window as unknown as { __unitArt: typeof unitArtStats }).__unitArt = unitArtStats;
  (window as unknown as { __unitArtTiming: typeof unitArtTiming }).__unitArtTiming = unitArtTiming;
}
