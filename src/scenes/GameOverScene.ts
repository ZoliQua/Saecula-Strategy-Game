import Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import type { GameOverPlayerRow } from '../game/gameOverStats';
import type { VictoryCause } from '../game/VictoryChecker';
import { GameOver } from '../ui/screens/GameOver';

export interface GameOverData {
  victory: boolean;
  durationMs: number;
  /** How the match was decided (shown as a cause line). */
  cause: VictoryCause;
  /** The player table, in id order. */
  players: GameOverPlayerRow[];
}

/** Thin scene that owns the DOM game-over card (src/ui/screens/GameOver.ts). */
export class GameOverScene extends Phaser.Scene {
  private card: GameOver | null = null;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData): void {
    audio().setMusicScene(data.victory ? 'victory' : 'defeat');
    this.card = new GameOver(data, () => {
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
