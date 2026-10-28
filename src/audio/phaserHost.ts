import type Phaser from 'phaser';
import type { AudioHost } from './AudioManager';

/** No WebAudio (or Phaser fell back to HTML5 / no audio): a silent manager. */
export const NO_AUDIO: AudioHost = { context: null, locked: () => false, onUnlocked: () => {} };

/** The Phaser sound manager as a host, when it runs on WebAudio. */
export function phaserHost(sound: Phaser.Sound.BaseSoundManager): AudioHost {
  const web = sound as Phaser.Sound.BaseSoundManager & { context?: BaseAudioContext };
  const context = web.context;
  if (!context || typeof context.createBufferSource !== 'function') return NO_AUDIO;
  return {
    context,
    locked: () => sound.locked,
    onUnlocked: (cb) => {
      if (!sound.locked) cb();
      else sound.once('unlocked', cb);
    },
  };
}
