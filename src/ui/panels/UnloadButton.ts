import { NAVAL } from '../../config/balance';
import { HUMAN_PLAYER_ID } from '../../config/constants';
import { hu } from '../../i18n/hu';
import { el } from '../dom';
import { dispatchCommand } from '../events';
import type { SelectedEntityInfo } from '../store';

/**
 * The selection panel's "Kirakodás" button for the human's own loaded
 * transport (M14): one persistent element updated in place, like the
 * delete button. A press puts the cargo ashore beside the transport.
 */
export class UnloadButton {
  readonly row: HTMLElement;
  private readonly button: HTMLButtonElement;
  private targetId: number | null = null;
  private shownKey = '';

  constructor() {
    this.button = el('button', { class: 'sel-delete sel-unload', type: 'button', title: hu.hud.unloadTip }, el('span', {}, hu.hud.unload));
    this.row = el('div', { class: 'sel-actions' }, this.button);
    this.row.hidden = true;
    this.button.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.targetId !== null) dispatchCommand({ type: 'unload-transport', unitId: this.targetId });
    });
  }

  render(sel: SelectedEntityInfo | null): void {
    const loaded = sel?.kind === 'unit' && sel.ownerId === HUMAN_PLAYER_ID && (sel.cargo ?? 0) > 0;
    this.targetId = loaded ? sel.id : null;
    const key = loaded ? `${sel.id}:${sel.cargo}` : 'none';
    if (key === this.shownKey) return;
    this.shownKey = key;
    this.row.hidden = !loaded;
  }
}

/** The cargo line of a transport's stats: aboard / capacity. */
export function cargoLine(aboard: number): string {
  return `${aboard} / ${NAVAL.transportCapacity}`;
}
