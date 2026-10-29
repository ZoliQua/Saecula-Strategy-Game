import type Phaser from 'phaser';
import { audio } from '../audio/AudioManager';
import { gameEvents } from '../game/events';
import { hu } from '../i18n/hu';
import type { AgeId } from '../types';
import { el, formatClock, uiRoot } from './dom';
import { dispatchCommand } from './events';
import { icons } from './icons';
import { CommandPanel } from './panels/CommandPanel';
import { ResourceBar } from './panels/ResourceBar';
import { SelectionPanel } from './panels/SelectionPanel';
import { SidePanel } from './panels/SidePanel';
import { WonderTimers } from './panels/WonderTimers';
import type { Minimap } from './Minimap';
import { settingsStore } from './settings';
import { uiStore, type UiStore } from './store';
import './hud.css';

const AGE_NAME: Record<AgeId, string> = {
  1: hu.ages.roman,
  2: hu.ages.medieval,
  3: hu.ages.enlightenment,
};

/**
 * A toast's look: 'alert' (the warm red default), 'ok' (amber, for a
 * success such as a stored save) or 'error' (the alert look plus the
 * error sound: a refused command).
 */
export type ToastTone = 'alert' | 'ok' | 'error';

/** The toast of the HUD on screen, if any (showHudNotice). */
let noticeSink: ((message: string, tone: ToastTone) => void) | null = null;

/** A toast on the in-game HUD from game-side code (save notices); dropped when no HUD is up. */
export function showHudNotice(message: string, tone: ToastTone = 'alert'): void {
  noticeSink?.(message, tone);
}

/**
 * In-game HUD as a DOM overlay above the Phaser canvas. Reads only the
 * Zustand UI store and sends intents through the store / event bus,
 * exactly like the old Phaser HUD did.
 */
export class Hud {
  private readonly root: HTMLElement;
  private readonly resources = new ResourceBar();
  private readonly selection: SelectionPanel;
  private readonly commands: CommandPanel;
  private readonly wonderTimers = new WonderTimers();
  private readonly side = new SidePanel();
  private readonly dockWatch: ResizeObserver | null;
  private readonly ageChip: HTMLElement;
  private readonly clock: HTMLElement;
  private readonly hint: HTMLElement;
  private readonly toasts: HTMLElement;
  private readonly minimapSlot: HTMLElement;
  private readonly unsubscribe: () => void;
  private readonly unsubscribeAge: () => void;
  private readonly unsubscribeResearch: () => void;
  private readonly unsubscribeWonders: () => void;
  private minimap: Minimap | null = null;
  private lastToast = '';
  private lastToastAt = 0;
  private readonly notice = (message: string, tone: ToastTone): void => this.toast(message, tone);

  constructor(textures: Phaser.Textures.TextureManager) {
    this.selection = new SelectionPanel(textures);
    this.commands = new CommandPanel(textures, (m, tone) => this.toast(m, tone));
    this.ageChip = el('span', { class: 'age-chip' });
    this.clock = el('span', {}, '0:00');
    this.hint = el('div', { class: 'glass hint' });
    this.toasts = el('div', { class: 'toasts' });
    this.minimapSlot = el('div');

    const top = el(
      'div',
      { class: 'hud-top' },
      el(
        'div',
        { class: 'glass brand anim-in' },
        el('span', { class: 'brand-mark', html: icons.mark }),
        el('span', { class: 'brand-name' }, hu.title),
        this.ageChip,
        hudButton('home-btn', icons.home, () => dispatchCommand({ type: 'camera-home' }), () => hu.hud.homeTip(settingsStore.getState().keys.home.label), hu.hud.home),
      ),
      this.resources.root,
      el('div', { class: 'glass clock anim-in' }, el('span', { html: icons.clock }), this.clock),
    );
    const minimapCard = el(
      'div',
      { class: 'glass minimap anim-in' },
      el(
        'div',
        { class: 'panel-title' },
        el('span', {}, hu.hud.minimap),
        el(
          'span',
          { class: 'mm-zoom' },
          hudButton('', icons.minus, () => dispatchCommand({ type: 'camera-zoom', dir: -1 }), () => hu.hud.zoomOut),
          hudButton('', icons.plus, () => dispatchCommand({ type: 'camera-zoom', dir: 1 }), () => hu.hud.zoomIn),
        ),
      ),
      this.minimapSlot,
    );
    const bottom = el('div', { class: 'hud-bottom' }, minimapCard, this.selection.root, this.commands.root);
    const right = el('div', { class: 'hud-right' }, this.wonderTimers.root, this.side.root);
    this.root = el('div', { class: 'hud' }, top, right, this.hint, this.toasts, bottom);
    uiRoot().append(this.root);
    // The right column ends above the build panel, however tall its grid grows.
    this.dockWatch = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(() => this.fitDock());
    this.dockWatch?.observe(this.commands.root);
    noticeSink = this.notice;

    this.render(uiStore.getState());
    this.unsubscribe = uiStore.subscribe((s) => this.render(s));
    // Only the human gets the age toast (player 1).
    this.unsubscribeAge = gameEvents.on('ageChanged', ({ playerId, age }) => {
      if (playerId === 1 && (age === 2 || age === 3)) this.toast(hu.hud.ageReached[age]);
    });
    this.unsubscribeResearch = gameEvents.on('researchRejected', ({ playerId }) => {
      if (playerId === 1) this.toast(hu.hud.researchElsewhere, 'error');
    });
    const offCompleted = gameEvents.on('wonderCompleted', ({ playerId }) => {
      this.toast(playerId === 1 ? hu.hud.wonderOwn : hu.hud.wonderEnemy(playerId));
    });
    // Only Wonders the HUD shows a countdown for (not a defeated owner's).
    const offLost = gameEvents.on('wonderLost', ({ entityId }) => {
      if (uiStore.getState().wonders.some((w) => w.entityId === entityId)) this.toast(hu.hud.wonderLost);
    });
    this.unsubscribeWonders = () => {
      offCompleted();
      offLost();
    };
  }

  /** Room the bottom-right build panel takes (its height, the dock margin and a gap), for the right column. */
  private fitDock(): void {
    this.root.style.setProperty('--dock-h', `${this.commands.root.offsetHeight + 14 + 12}px`);
  }

  attachMinimap(minimap: Minimap): void {
    this.minimap?.destroy();
    this.minimap = minimap;
    this.minimapSlot.replaceChildren(minimap.canvas);
  }

  update(deltaMs: number): void {
    this.minimap?.update(deltaMs);
  }

  toast(message: string, tone: ToastTone = 'alert'): void {
    const now = performance.now();
    if (message === this.lastToast && now - this.lastToastAt < 1200) return;
    this.lastToast = message;
    this.lastToastAt = now;
    if (tone === 'error') audio().playSFX('ui_error');
    const t = el('div', { class: tone === 'ok' ? 'toast ok' : 'toast' }, message);
    this.toasts.append(t);
    window.setTimeout(() => t.remove(), 2300);
  }

  private render(state: UiStore): void {
    this.resources.render(state);
    this.selection.render(state);
    this.commands.render(state);
    this.wonderTimers.render(state);
    this.side.render(state);
    this.ageChip.textContent = AGE_NAME[state.currentAge];
    this.clock.textContent = formatClock(state.gameTimeMs);
    if (state.placementBuilding) {
      const base = state.placementBuilding === 'wall' ? hu.hud.wallPlacementHint : hu.hud.placementHint;
      const line = state.wallPreview ? ` · ${hu.hud.wallLineHint(state.wallPreview.segments, state.wallPreview.wood)}` : '';
      this.hint.replaceChildren(el('b', {}, hu.buildings[state.placementBuilding]), ` — ${base}${line}`);
      this.hint.classList.add('show');
    } else {
      this.hint.classList.remove('show');
    }
  }

  destroy(): void {
    if (noticeSink === this.notice) noticeSink = null;
    this.unsubscribe();
    this.unsubscribeAge();
    this.unsubscribeResearch();
    this.unsubscribeWonders();
    this.wonderTimers.destroy();
    this.dockWatch?.disconnect();
    this.side.destroy();
    this.minimap?.destroy();
    this.resources.destroy();
    this.selection.destroy();
    this.commands.destroy();
    this.root.remove();
  }
}

/** A small HUD icon button (with an optional label); its tooltip is read on hover, so it names keys as bound now. */
function hudButton(cls: string, icon: string, onPress: () => void, tip: () => string, label?: string): HTMLButtonElement {
  const button = el('button', { class: cls, type: 'button' }, el('span', { html: icon }), label === undefined ? null : el('span', {}, label));
  button.title = tip();
  button.setAttribute('aria-label', label ?? tip());
  button.addEventListener('mouseenter', () => (button.title = tip()));
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    // A focused button would keep a focus ring and take Space / Enter meant for the game.
    button.blur();
    onPress();
  });
  return button;
}
