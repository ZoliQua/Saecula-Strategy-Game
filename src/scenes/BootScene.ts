import Phaser from 'phaser';
import { audio, initAudio } from '../audio/AudioManager';
import { bindUiSounds } from '../audio/uiSounds';
import { uiRoot } from '../ui/dom';

let uiSoundsBound = false;

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    // Audio on Phaser's WebAudio context; it stays silent until the first user gesture.
    initAudio(this.game);
    if (!uiSoundsBound) {
      // Resolved per click, so a manager replaced by initAudio (dev HMR) is the one that plays.
      bindUiSounds(uiRoot(), { playSFX: (key, volume, position) => audio().playSFX(key, volume, position) });
      uiSoundsBound = true;
    }
    this.scene.start('PreloadScene');
  }
}
