import Phaser from 'phaser';
import { gameEvents } from '../game/events';
import { hu } from '../i18n/hu';
import type { SaveStorage, SlotId } from '../save/storage';
import type { BuildingType, UnitType } from '../types';
import { createPauseBackdrop, PauseMenu } from '../ui/screens/PauseMenu';
import { SaveSlots } from '../ui/screens/SaveSlots';
import { SettingsScreen } from '../ui/screens/SettingsScreen';
import { slotRows } from '../ui/screens/slotRows';
import { TechTree } from '../ui/screens/TechTree';
import { techTreeModel } from '../ui/screens/techTreeModel';
import { uiStore } from '../ui/store';
import { buildingThumbnail, unitThumbnail } from '../ui/thumbnails';
import type { SaveOutcome } from './game/MatchSave';
import { startFromSlot } from './game/MatchStart';

/** What GameScene hands the pause (PauseWiring.openPause). */
export interface PauseData {
  /** Saves the running match (MatchSave.saveTo). */
  save: (slot: SlotId) => Promise<SaveOutcome>;
  storage: SaveStorage;
  /** Runs when the player leaves the match: "Kilépés a főmenübe", or a load over it (the match log's 'abandoned' record). */
  onAbandon: () => void;
  /** The card to open on (the `techTree` key); default the pause menu. */
  card?: 'techTree';
}

/** The exit animation before the game runs again (pause.css `.leaving`). */
const LEAVE_MS = 180;

/**
 * The Esc pause: GameScene and HUDScene are paused (game time, AI and
 * autosave stop) under a dimmed backdrop with one card at a time, the
 * pause menu, a save / load slot list, the tech tree or the settings. Resume runs both again; load
 * and quit stop them instead.
 */
export class PauseScene extends Phaser.Scene {
  private backdrop: HTMLElement | null = null;
  private menu: PauseMenu | null = null;
  private slots: SaveSlots | null = null;
  private settings: SettingsScreen | null = null;
  private tree: TechTree | null = null;
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
    if (data.card === 'techTree') this.showTechTree();
    else this.showMenu();
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
    this.settings?.destroy();
    this.settings = null;
    this.tree?.destroy();
    this.tree = null;
  }

  private showMenu(): void {
    this.clearCard();
    this.menu = new PauseMenu({
      onResume: () => this.resumeGame(),
      onSave: () => this.showSlots('save'),
      onLoad: () => this.showSlots('load'),
      onTechTree: () => this.showTechTree(),
      onSettings: () => this.showSettings(),
      onQuit: () => this.quit(),
    });
    this.menu.setSettingsEnabled(true);
  }

  /** The settings card over the paused game; back (or Esc) returns to the pause card. */
  private showSettings(): void {
    this.clearCard();
    this.settings = new SettingsScreen(() => this.showMenu());
  }

  /**
   * The tech tree of the human's age and civ (pictures in the current
   * age's style, as the command panel paints them); back returns to the
   * pause card, also when the T key opened it.
   */
  private showTechTree(): void {
    this.clearCard();
    const ui = uiStore.getState();
    const model = techTreeModel(ui.civ, ui.currentAge, new Set(ui.researchedTechs));
    const pictures = {
      building: (type: BuildingType) => buildingThumbnail(this.textures, type, ui.currentAge, ui.civ),
      unit: (type: UnitType) => unitThumbnail(type, ui.civ),
    };
    this.tree = new TechTree(model, pictures, () => this.showMenu());
  }

  /** The slot list; it shows placeholders until the slots have been read. */
  private showSlots(mode: 'save' | 'load'): void {
    this.clearCard();
    const { storage } = this.pause;
    const handlers = {
      onPick: (slot: SlotId): Promise<void> => (mode === 'save' ? this.saveTo(slots, slot) : this.loadFrom(slots, slot)),
      onBack: () => this.showMenu(),
    };
    // A load from the pause replaces the running match: it asks first.
    const slots: SaveSlots = new SaveSlots(mode, [], handlers, { confirmLoad: mode === 'load' });
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
    const started = await startFromSlot(this.scene.get('GameScene'), storage, slot, (message) => slots.notice(message, 'error'), this.pause.onAbandon);
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
    this.pause.onAbandon();
    this.scene.stop('GameScene');
    this.scene.stop('HUDScene');
    this.scene.start('MainMenuScene');
  }
}
