import type Phaser from 'phaser';
import type { SaveStorage, SlotId } from '../../save/storage';
import { onKeyAction } from './KeyActions';
import type { PauseData } from '../PauseScene';
import type { SaveOutcome } from './MatchSave';

/**
 * Opens the pause (PauseScene) over the running match, once: an idle
 * Esc in GameScene (PointerInput's `onIdleEscape`). PauseScene pauses
 * GameScene and HUDScene itself.
 */
export function openPause(
  scene: Phaser.Scene,
  save: (slot: SlotId) => Promise<SaveOutcome>,
  storage: SaveStorage,
  onQuit: () => void,
  card?: PauseData['card'],
): void {
  if (scene.scene.isActive('PauseScene') || !scene.scene.isActive()) return;
  scene.scene.launch('PauseScene', { save, storage, onQuit, ...(card ? { card } : {}) } satisfies PauseData);
}

/**
 * Wires the pause's ways in: the `techTree` key opens it straight on the
 * tech tree card. `onQuit` runs on "Kilépés a főmenübe" (the match log).
 * Returns the plain opener (the idle Esc).
 */
export function wirePause(scene: Phaser.Scene, save: (slot: SlotId) => Promise<SaveOutcome>, storage: SaveStorage, onQuit: () => void): () => void {
  onKeyAction(scene, 'techTree', (e) => {
    if (!e.repeat) openPause(scene, save, storage, onQuit, 'techTree');
  });
  return () => openPause(scene, save, storage, onQuit);
}
