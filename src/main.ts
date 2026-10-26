import Phaser from 'phaser';
import { gameConfig } from './config/game';
import { gameEvents } from './game/events';
import { unitArtStats, unitArtTiming } from './iso/art/units/UnitArt';

const game = new Phaser.Game(gameConfig);

if (import.meta.env.DEV) {
  // Dev-only: expose the game instance for preview / console debugging.
  (window as unknown as { __game: Phaser.Game }).__game = game;
  // Dev-only unit art review: __showUnits({ anim: 'walk', zoom: 2 }).
  // The showcase is loaded only here, so it never reaches production bundles.
  (window as unknown as { __showUnits: (opts?: object) => Promise<void> }).__showUnits = async (opts = {}) => {
    if (!game.scene.getScene('UnitShowcaseScene')) {
      const { UnitShowcaseScene } = await import('./scenes/UnitShowcaseScene');
      game.scene.add('UnitShowcaseScene', UnitShowcaseScene, false);
    }
    const showcase = game.scene.getScene('UnitShowcaseScene');
    if (showcase.scene.isActive()) {
      showcase.scene.restart(opts);
      return;
    }
    for (const s of game.scene.getScenes(true)) s.scene.stop();
    game.scene.start('UnitShowcaseScene', opts);
  };
  // Dev-only building art review: __showBuildings({ ages: [1, 2, 3], zoom: 0.6, phase: 0.7 }).
  (window as unknown as { __showBuildings: (opts?: object) => Promise<void> }).__showBuildings = async (opts = {}) => {
    if (!game.scene.getScene('BuildingShowcaseScene')) {
      const { BuildingShowcaseScene } = await import('./scenes/BuildingShowcaseScene');
      game.scene.add('BuildingShowcaseScene', BuildingShowcaseScene, false);
    }
    const showcase = game.scene.getScene('BuildingShowcaseScene');
    if (showcase.scene.isActive()) {
      showcase.scene.restart(opts);
      return;
    }
    for (const s of game.scene.getScenes(true)) s.scene.stop();
    game.scene.start('BuildingShowcaseScene', opts);
  };
  // Dev-only: force a player's age in a running game (plays the age-up transformation).
  (window as unknown as { __forceAge: (playerId: number, age: 1 | 2 | 3) => void }).__forceAge = (playerId, age) => {
    // GameScene keeps its PlayerManager private; this console hook reads it untyped.
    const scene = game.scene.getScene('GameScene') as unknown as { players?: { get(id: number): { age: number } | undefined } };
    const player = scene.players?.get(playerId);
    if (!player) return;
    player.age = age;
    gameEvents.emit('ageChanged', { playerId, age });
  };
  (window as unknown as { __unitArt: typeof unitArtStats }).__unitArt = unitArtStats;
  (window as unknown as { __prewarm: () => unknown }).__prewarm = () => import('./scenes/GameSetupScene').then((m) => ({ ...m.prewarmReport }));
  (window as unknown as { __unitArtTiming: typeof unitArtTiming }).__unitArtTiming = unitArtTiming;
}
