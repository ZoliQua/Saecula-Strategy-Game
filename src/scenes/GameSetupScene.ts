import Phaser from 'phaser';
import { civsInPlay, defaultSetupConfig, type GameSetupConfig } from '../game/GameSetupConfig';
import { UnitArtPrewarm } from '../iso/art/units/UnitArtPrewarm';
import { AVAILABLE_CIVS } from '../config/civs';
import { civPreview, paintNextCivPreview } from '../ui/civPreview';
import { GameSetup } from '../ui/screens/GameSetup';
import type { MainMenuScene } from './MainMenuScene';

/** Shortest "Betöltés…" state, so the card transition never flashes by. */
const MIN_LOADING_MS = 450;
/** Civ previews the menu has not painted yet wait this long past the card's entrance (GameSetup.entranceMs). */
const PREVIEW_SLACK_MS = 80;

/** Reopening the setup card after a failed start: the previous choices and why it failed. */
export interface SetupReturn {
  readonly config: GameSetupConfig;
  readonly notice: string;
}

/** Dev diagnostics: the last pre-warm cost, readable from the console. */
export const prewarmReport = { totalMs: 0, maxStepMs: 0, frames: 0 };

/**
 * Runs on top of MainMenuScene (whose live diorama stays behind the
 * card). Owns the DOM setup card (painting any civ preview the menu
 * has not, one per frame after the card's entrance), then pre-warms unit art (civs in play)
 * while the card fades out and hands the config to GameScene.
 */
export class GameSetupScene extends Phaser.Scene {
  private setup: GameSetup | null = null;
  private prewarm: UnitArtPrewarm | null = null;
  private config: GameSetupConfig | null = null;
  private loadingMs = 0;
  private openMs = 0;
  private previewsShown = false;
  private leaving = false;

  constructor() {
    super({ key: 'GameSetupScene' });
  }

  create(data?: Partial<SetupReturn>): void {
    this.prewarm = null;
    this.config = null;
    this.loadingMs = 0;
    this.openMs = 0;
    this.previewsShown = false;
    this.leaving = false;
    prewarmReport.frames = 0;
    this.setup = new GameSetup(
      data?.config ?? defaultSetupConfig(),
      {
        onStart: (config) => this.beginLoading(config),
        onBack: () => this.close(),
      },
      data?.notice,
    );
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.setup?.destroy();
      this.setup = null;
    });
  }

  private menuScene(): MainMenuScene {
    return this.scene.get('MainMenuScene') as MainMenuScene;
  }

  private close(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.setup?.leave();
    this.menuScene().showMenu();
    this.time.delayedCall(380, () => this.scene.stop());
  }

  /** Paints one missing civ preview per frame and hands every ready one to the card (the menu may have painted some meanwhile). */
  private paintPreview(): void {
    if (this.previewsShown) return;
    const painted = paintNextCivPreview(this.textures);
    for (const civ of AVAILABLE_CIVS) {
      const preview = civPreview(civ);
      if (preview) this.setup?.setPreview(civ, preview);
    }
    this.previewsShown = painted === null;
  }

  private beginLoading(config: GameSetupConfig): void {
    this.config = config;
    this.setup?.setBusy();
    // Only the civs in this match get unit sheets (texture memory budget).
    this.prewarm = new UnitArtPrewarm(this, civsInPlay(config));
  }

  override update(_time: number, delta: number): void {
    this.openMs += delta;
    if (!this.config && !this.leaving && this.openMs >= (this.setup?.entranceMs ?? 0) + PREVIEW_SLACK_MS) this.paintPreview();
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
