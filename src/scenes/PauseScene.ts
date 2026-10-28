import Phaser from 'phaser';
import { gameEvents } from '../game/events';
import { hu } from '../i18n/hu';
import type { SaveStorage, SlotId } from '../save/storage';
import { createPauseBackdrop, PauseMenu } from '../ui/screens/PauseMenu';
import { SaveSlots } from '../ui/screens/SaveSlots';
import { slotRows } from '../ui/screens/slotRows';
import type { SaveOutcome } from './game/MatchSave';
import { startFromSlot } from './game/MatchStart';

/** What GameScene hands the pause (PauseWiring.openPause). */
export interface PauseData {
  /** Saves the running match (MatchSave.saveTo). */
  save: (slot: SlotId) => Promise<SaveOutcome>;
  storage: SaveStorage;
}

/** The exit animation before the game runs again (pause.css `.leaving`). */
const LEAVE_MS = 180;

/**
 * The Esc pause: GameScene and HUDScene are paused (game time, AI and
 * autosave stop) under a dimmed backdrop with one card at a time, the
 * pause menu or a save / load slot list. Resume runs both again; load
 * and quit stop them instead.
 */
export class PauseScene extends Phaser.Scene {
  private backdrop: HTMLElement | null = null;
  private menu: PauseMenu | null = null;
  private slots: SaveSlots | null = null;
  private leaving = false;
  private pause!: PauseData;

  constructor() {
    super({ key: 'PauseScene' });
  }

  create(data: PauseData): void {
    this.leaving = false;
    this.pause = data;
    this.scene.pause('GameScene');
    this.scene.pause('HUDScene');
    this.scene.bringToTop();
    this.backdrop = createPauseBackdrop();
    this.showMenu();
    gameEvents.emit('pauseChanged', { paused: true });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.clearCard();
      this.backdrop?.remove();
      this.backdrop = null;
      gameEvents.emit('pauseChanged', { paused: false });
    });
  }

  private clearCard(): void {
    this.menu?.destroy();
    this.menu = null;
    this.slots?.destroy();
    this.slots = null;
  }

  private showMenu(): void {
    this.clearCard();
    this.menu = new PauseMenu({
      onResume: () => this.resumeGame(),
      onSave: () => this.showSlots('save'),
      onLoad: () => this.showSlots('load'),
      // Settings arrive with Task 7; the button stays disabled until then.
      onSettings: () => {},
      onQuit: () => this.quit(),
    });
  }

  /** The slot list; it shows placeholders until the slots have been read. */
  private showSlots(mode: 'save' | 'load'): void {
    this.clearCard();
    const { storage } = this.pause;
    const slots: SaveSlots = new SaveSlots(mode, [], {
      onPick: (slot): Promise<void> => (mode === 'save' ? this.saveTo(slots, slot) : this.loadFrom(slots, slot)),
      onBack: () => this.showMenu(),
    });
    this.slots = slots;
    void storage.list().then((summaries) => {
      if (this.slots === slots) slots.setRows(slotRows(summaries, mode));
    });
  }

  private async saveTo(slots: SaveSlots, slot: SlotId): Promise<void> {
    const { save, storage } = this.pause;
    const result = await save(slot);
    if (this.slots !== slots) return;
    slots.setRows(slotRows(await storage.list(), 'save'));
    if (result.ok) slots.notice(hu.save.saved, 'ok');
    else slots.notice(result.reason === 'unavailable' ? hu.save.errors.unavailable : hu.save.errors.saveFailed, 'error');
  }

  /** Loads over the paused match: GameScene restarts on the save (startFromSlot), and the pause goes. */
  private async loadFrom(slots: SaveSlots, slot: SlotId): Promise<void> {
    const { storage } = this.pause;
    const started = await startFromSlot(this.scene.get('GameScene'), storage, slot, (message) => slots.notice(message, 'error'));
    if (started) {
      this.scene.stop();
      return;
    }
    // The slot changed since the list was read: show it as it is now.
    if (this.slots === slots) slots.setRows(slotRows(await storage.list(), 'load'));
  }

  private resumeGame(): void {
    if (this.leaving) return;
    this.leaving = true;
    this.menu?.leave();
    this.backdrop?.classList.add('leaving');
    this.time.delayedCall(LEAVE_MS, () => {
      this.scene.resume('GameScene');
      this.scene.resume('HUDScene');
      this.scene.stop();
    });
  }

  private quit(): void {
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.start('MainMenuScene');
  }
}
