import Phaser from 'phaser';
import { BootScene } from '../scenes/BootScene';
import { GameSetupScene } from '../scenes/GameSetupScene';
import { GameOverScene } from '../scenes/GameOverScene';
import { GameScene } from '../scenes/GameScene';
import { HUDScene } from '../scenes/HUDScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { PauseScene } from '../scenes/PauseScene';
import { PreloadScene } from '../scenes/PreloadScene';
import { ISO_LIGHT_PIPELINE, IsoLightPipeline } from '../iso/art/lighting/IsoLightPipeline';
import { GAME_HEIGHT, GAME_WIDTH } from './constants';
import { MAX_LIGHTS } from './visual';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL, // Light2D needs WebGL (no Canvas fallback)
  parent: 'game',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  backgroundColor: '#090c12',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: '100%',
    height: '100%',
  },
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: false,
    maxLights: MAX_LIGHTS,
  },
  // Phaser constructs config pipelines with the Game (its typings say config).
  pipeline: { [ISO_LIGHT_PIPELINE]: IsoLightPipeline } as unknown as Phaser.Types.Core.PipelineConfig,
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
  autoFocus: false,
  scene: [
    BootScene,
    PreloadScene,
    MainMenuScene,
    GameSetupScene,
    GameScene,
    HUDScene,
    PauseScene,
    GameOverScene,
  ],
};
