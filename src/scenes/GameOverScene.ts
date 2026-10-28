import Phaser from 'phaser';
import type { VictoryCause } from '../game/VictoryChecker';
import { GameOver } from '../ui/screens/GameOver';

export interface GameOverData {
  victory: boolean;
  durationMs: number;
  /** How the match was decided (shown as a cause line). */
  cause: VictoryCause;
}

/** Thin scene that owns the DOM game-over card (src/ui/screens/GameOver.ts). */
export class GameOverScene extends Phaser.Scene {
  private card: GameOver | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    this.card = new GameOver(data.victory, data.durationMs, data.cause, () => {
      this.scene.stop('GameScene');
      this.scene.stop('HUDScene');
      this.scene.start('MainMenuScene');
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.card?.destroy();
      this.card = null;
    });
  }
}
