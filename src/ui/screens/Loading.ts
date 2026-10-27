import { hu } from '../../i18n/hu';
import { el, uiRoot } from '../dom';
import '../hud.css';
import '../screens.css';

/** Full-screen card with a progress bar while the game map is baked. */
export class Loading {
  private readonly root: HTMLElement;
  private readonly fill: HTMLElement;

  constructor() {
    this.fill = el('div', { class: 'loading-fill' });
    this.root = el(
      'div',
      { class: 'screen loading' },
      el(
        'div',
        { class: 'glass loading-card' },
        el('div', { class: 'loading-kicker' }, hu.mapLoading.kicker),
        el('h2', { class: 'loading-title' }, hu.mapLoading.title),
        el('p', { class: 'loading-body' }, hu.mapLoading.body),
        el('div', { class: 'loading-track' }, this.fill),
      ),
    );
    uiRoot().append(this.root);
  }

  /** Progress 0..1. */
  set(progress: number): void {
    this.fill.style.width = `${Math.round(Math.min(1, Math.max(0, progress)) * 100)}%`;
  }

  destroy(): void {
    this.root.remove();
  }
}
