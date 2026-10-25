import Phaser from 'phaser';
import { GameOver } from '../ui/screens/GameOver';

export interface GameOverData {
  victory: boolean;
  durationMs: number;
}

/** Thin scene that owns the DOM game-over card (src/ui/screens/GameOver.ts). */
export class GameOverScene extends Phaser.Scene {
  private card: GameOver | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    this.card = new GameOver(data.victory, data.durationMs, () => {
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
