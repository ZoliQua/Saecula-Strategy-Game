import { refundPercent } from '../../game/refund';
import { hu } from '../../i18n/hu';
import { pressDelete } from '../deleteConfirm';
import { el } from '../dom';
import { icons } from '../icons';
import type { SelectedEntityInfo } from '../store';

/** The human's player id (the HUD's convention: SelectionPanel marks every other owner as enemy). */
const HUMAN_ID = 1;

/**
 * The selection panel's "Törlés" button for the human's own buildings.
 * It is one persistent element updated in place (the panel body is
 * rebuilt as a site's progress ticks, which would swallow clicks). The
 * first press arms it, the second deletes (deleteConfirm); a site up to
 * half built shows its refund.
 */
export class DeleteButton {
  readonly root: HTMLButtonElement;
  private readonly label: HTMLElement;
  private targetId: number | null = null;
  private shownKey = '';

  constructor() {
    this.label = el('span', {});
    this.root = el('button', { class: 'sel-delete', type: 'button' }, el('span', { html: icons.trash }), this.label);
    this.root.hidden = true;
    this.root.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.targetId !== null) pressDelete(this.targetId);
    });
  }

  render(sel: SelectedEntityInfo | null, armedId: number | null): void {
    const own = sel?.kind === 'building' && sel.ownerId === HUMAN_ID && sel.hp.current > 0;
    this.targetId = own ? sel.id : null;
    const pct = own ? refundPercent(sel.constructionProgress ?? null) : 0;
    const armed = own && armedId === sel.id;
    const key = own ? `${sel.id}:${pct}:${armed}` : 'none';
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.root.hidden = !own;
    this.root.classList.toggle('armed', armed);
    this.label.textContent = armed ? hu.hud.deleteConfirm(pct) : hu.hud.deleteBuilding(pct);
    this.root.title = hu.hud.deleteTip(pct);
  }
}
