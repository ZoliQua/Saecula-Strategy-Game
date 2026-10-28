import type Phaser from 'phaser';
import type { SaveStorage, SlotId } from '../../save/storage';
import type { PauseData } from '../PauseScene';
import type { SaveOutcome } from './MatchSave';

/**
 * Opens the pause (PauseScene) over the running match, once: an idle
 * Esc in GameScene (PointerInput's `onIdleEscape`). PauseScene pauses
 * GameScene and HUDScene itself.
 */
export function openPause(scene: Phaser.Scene, save: (slot: SlotId) => Promise<SaveOutcome>, storage: SaveStorage): void {
  if (scene.scene.isActive('PauseScene') || !scene.scene.isActive()) return;
  scene.scene.launch('PauseScene', { save, storage } satisfies PauseData);
}
