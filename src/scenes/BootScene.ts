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
      bindUiSounds(uiRoot(), audio());
      uiSoundsBound = true;
    }
    this.scene.start('PreloadScene');
  }
}
