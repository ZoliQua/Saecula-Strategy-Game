import { HUMAN_PLAYER_ID } from '../../config/constants';
import { refundPercent } from '../../game/refund';
import { hu } from '../../i18n/hu';
import { pressDelete } from '../deleteConfirm';
import { el } from '../dom';
import { icons } from '../icons';
import type { SelectedEntityInfo } from '../store';

/** Label of the delete key in the tooltip (Task 3 passes the bound key's label). */
const DELETE_KEY_LABEL = 'Delete';

/**
 * The selection panel's "Törlés" button for the human's own buildings,
 * in its own row under the panel body. It is one persistent element updated in place (the panel body is
 * rebuilt as a site's progress ticks, which would swallow clicks). The
 * first press arms it, the second deletes (deleteConfirm); a site up to
 * half built shows its refund.
 */
export class DeleteButton {
  /** The action row under the panel body (in the layout flow, so it never covers the queue). */
  readonly row: HTMLElement;
  private readonly button: HTMLButtonElement;
  private readonly label: HTMLElement;
  private targetId: number | null = null;
  private shownKey = '';

  constructor() {
    this.label = el('span', {});
    this.button = el('button', { class: 'sel-delete', type: 'button' }, el('span', { html: icons.trash }), this.label);
    this.row = el('div', { class: 'sel-actions' }, this.button);
    this.row.hidden = true;
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.targetId !== null) pressDelete(this.targetId);
    });
  }

  render(sel: SelectedEntityInfo | null, armedId: number | null): void {
    const own = sel?.kind === 'building' && sel.ownerId === HUMAN_PLAYER_ID && sel.hp.current > 0;
    this.targetId = own ? sel.id : null;
    const pct = own ? refundPercent(sel.constructionProgress ?? null) : 0;
    const armed = own && armedId === sel.id;
    const last = own && sel.lastTownCenter === true;
    const key = own ? `${sel.id}:${pct}:${armed}:${last}` : 'none';
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.row.hidden = !own;
    this.button.classList.toggle('armed', armed);
    this.label.textContent = armed ? (last ? hu.hud.deleteConfirmLast : hu.hud.deleteConfirm(pct)) : hu.hud.deleteBuilding(pct);
    this.button.title = hu.hud.deleteTip(pct, DELETE_KEY_LABEL);
  }
}
