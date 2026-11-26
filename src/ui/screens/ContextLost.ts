import { hu } from '../../i18n/hu';
import type { ContextLostState } from '../../scenes/game/contextGuard';
import { el, uiRoot } from '../dom';
import '../hud.css';
import '../screens.css';

/**
 * Full-screen card after the WebGL context was lost (1.0 safeguard). The
 * canvas cannot draw any more, so this is DOM only. `onReload(resume)`
 * reloads the page; `resume` asks the menu to load the autosave.
 */
export class ContextLost {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly button: HTMLButtonElement;
  private state: ContextLostState = 'saving';

  constructor(private readonly onReload: (resume: boolean) => void) {
    this.body = el('p', { class: 'loading-body' });
    this.button = el('button', { class: 'btn btn-primary', type: 'button' }) as HTMLButtonElement;
    this.button.addEventListener('click', () => {
      if (this.state !== 'saving') this.onReload(this.state !== 'noMatch');
    });
    this.root = el(
      'div',
      { class: 'screen loading context-lost', role: 'alertdialog', 'aria-modal': 'true', 'aria-live': 'assertive' },
      el(
        'div',
        { class: 'glass loading-card' },
        el('div', { class: 'loading-kicker' }, hu.contextLost.kicker),
        el('h2', { class: 'loading-title' }, hu.contextLost.title),
        el('p', { class: 'loading-body' }, hu.contextLost.cause),
        this.body,
        this.button,
      ),
    );
    uiRoot().append(this.root);
    // The card is the only thing left to use: no key may reach the game, the HUD or a pause card behind it
    // (Esc would resume a paused match). Window capture runs before every other key listener.
    const swallow = (e: KeyboardEvent): void => {
      e.stopImmediatePropagation();
      e.preventDefault();
      if (e.type === 'keydown' && (e.key === 'Enter' || e.key === ' ')) this.button.click();
    };
    window.addEventListener('keydown', swallow, true);
    window.addEventListener('keyup', swallow, true);
  }

  set(state: ContextLostState): void {
    this.state = state;
    const t = hu.contextLost;
    this.body.textContent = t[state];
    this.button.textContent = state === 'noMatch' ? t.reload : t.resume;
    this.button.disabled = state === 'saving';
    if (!this.button.disabled) this.button.focus();
  }
}
