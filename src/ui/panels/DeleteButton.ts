import { HUMAN_PLAYER_ID } from '../../config/constants';
import { refundPercent } from '../../game/refund';
import { hu } from '../../i18n/hu';
import { pressDelete } from '../deleteConfirm';
import { el } from '../dom';
import { settingsStore } from '../settings';
import { icons } from '../icons';
import type { SelectedEntityInfo } from '../store';

/**
 * The selection panel's "Törlés" button for the human's own buildings,
 * in its own row under the panel body. It is one persistent element updated in place (the panel body is
 * rebuilt as a site's progress ticks, which would swallow clicks). The
 * first press arms it, the second deletes (deleteConfirm); a site up to
 * half built shows its refund, which is locked (and paid) once armed.
 */
export class DeleteButton {
  /** The action row under the panel body (in the layout flow, so it never covers the queue). */
  readonly row: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly label: HTMLElement;
  private targetId: number | null = null;
  private shownKey = '';
  /** The refund the button shows now (the HUD's, or the lock while armed). */
  private shownPct = 0;

  constructor() {
    this.label = el('span', {});
    this.button = el('button', { class: 'sel-delete', type: 'button' }, el('span', { html: icons.trash }), this.label);
    this.row = el('div', { class: 'sel-actions' }, this.button);
    this.row.hidden = true;
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.targetId !== null) pressDelete(this.targetId, this.shownPct);
    });
  }

  /** `armedPct`: the refund locked when the delete was armed (shown, and paid, while armed). */
  render(sel: SelectedEntityInfo | null, armedId: number | null, armedPct: number): void {
    const own = sel?.kind === 'building' && sel.ownerId === HUMAN_PLAYER_ID && sel.hp.current > 0;
    this.targetId = own ? sel.id : null;
    const armed = own && armedId === sel.id;
    const pct = armed ? armedPct : own ? refundPercent(sel.constructionProgress ?? null) : 0;
    this.shownPct = pct;
    const last = own && sel.lastTownCenter === true;
    // The tooltip names the key as bound now (the settings card may have moved it) and the fixed ⌫.
    const keyLabel = `${settingsStore.getState().keys.deleteBuilding.label} / ${hu.settings.secondaryKeys.deleteBuilding ?? ''}`;
    const key = own ? `${sel.id}:${pct}:${armed}:${last}:${keyLabel}` : 'none';
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.row.hidden = !own;
    this.button.classList.toggle('armed', armed);
    this.label.textContent = armed ? (last ? hu.hud.deleteConfirmLast : hu.hud.deleteConfirm(pct)) : hu.hud.deleteBuilding(pct);
    this.button.title = hu.hud.deleteTip(pct, keyLabel);
  }
}
