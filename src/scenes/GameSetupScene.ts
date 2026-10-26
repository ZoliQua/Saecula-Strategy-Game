import Phaser from 'phaser';
import { defaultSetupConfig, type GameSetupConfig } from '../game/GameSetupConfig';
import { UnitArtPrewarm } from '../iso/art/units/UnitArtPrewarm';
import { GameSetup } from '../ui/screens/GameSetup';
import type { MainMenuScene } from './MainMenuScene';

/** Shortest "Betöltés…" state, so the card transition never flashes by. */
const MIN_LOADING_MS = 450;

/** Dev diagnostics: the last pre-warm cost, readable from the console. */
export const prewarmReport = { totalMs: 0, maxStepMs: 0, frames: 0 };

/**
 * Runs on top of MainMenuScene (whose live diorama stays behind the
 * card). Owns the DOM setup card, then pre-warms unit art while the
 * card fades out and hands the config to GameScene.
 */
export class GameSetupScene extends Phaser.Scene {
  private setup: GameSetup | null = null;
  private prewarm: UnitArtPrewarm | null = null;
  private config: GameSetupConfig | null = null;
  private loadingMs = 0;
  private leaving = false;

  constructor() {
    super({ key: 'GameSetupScene' });
  }

  create(): void {
    this.prewarm = null;
    this.config = null;
    this.loadingMs = 0;
    this.leaving = false;
    prewarmReport.frames = 0;
    this.setup = new GameSetup(defaultSetupConfig(), {
      onStart: (config) => this.beginLoading(config),
      onBack: () => this.close(),
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.setup?.destroy();
      this.setup = null;
    });
  }

  private menuScene(): MainMenuScene {
    return this.scene.get('MainMenuScene') as MainMenuScene;
  }

  private close(): void {
    this.setup?.leave();
    this.menuScene().showMenu();
    this.time.delayedCall(380, () => this.scene.stop());
  }

  private beginLoading(config: GameSetupConfig): void {
    this.config = config;
    this.setup?.setBusy();
    this.prewarm = new UnitArtPrewarm(this);
  }

  override update(_time: number, delta: number): void {
    if (!this.config || this.leaving) return;
    this.loadingMs += delta;
    // One unit type per frame: the card animation keeps running between steps.
    if (this.prewarm) {
      prewarmReport.frames++;
      if (this.prewarm.step()) {
        prewarmReport.totalMs = this.prewarm.totalMs;
        prewarmReport.maxStepMs = this.prewarm.maxStepMs;
        this.prewarm = null;
      }
    }
    if (this.prewarm || this.loadingMs < MIN_LOADING_MS) return;
    this.leaving = true;
    const config = this.config;
    this.setup?.leave();
    this.menuScene().fadeOutThen(() => {
      this.scene.stop('MainMenuScene');
      this.scene.start('GameScene', config);
    });
  }
}
