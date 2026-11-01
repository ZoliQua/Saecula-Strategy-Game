import { hu } from '../../i18n/hu';
import { el } from '../dom';
import type { ObjectiveRowInfo, UiStore } from '../store';

const CHECK = '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';

/** The right side of an objective row: a progress count, or nothing. */
export function objectiveCount(row: ObjectiveRowInfo): string | null {
  return row.counted && !row.done ? hu.campaign.progress(row.have, row.need) : null;
}

/**
 * A campaign mission's objectives (M13) at the top of the HUD's right
 * column: the mission title and one row per objective, ticked when done.
 * Hidden outside the campaign. Re-rendered only when the store's
 * objectives object changes (CampaignRunner publishes once a second).
 */
export class ObjectivesPanel {
  readonly root: HTMLElement;
  private readonly title: HTMLElement;
  private readonly list: HTMLElement;
  private shown: UiStore['objectives'] = null;

  constructor() {
    this.title = el('div', { class: 'objectives-title' });
    this.list = el('ul', { class: 'objectives-list' });
    this.root = el(
      'section',
      { class: 'glass objectives anim-in', 'aria-label': hu.campaign.objectivesTitle },
      el('div', { class: 'panel-title' }, hu.campaign.objectivesTitle),
      this.title,
      this.list,
    );
  }

  render(state: UiStore): void {
    const o = state.objectives;
    if (o === this.shown) return;
    this.shown = o;
    this.root.classList.toggle('show', o !== null);
    if (!o) return;
    this.title.textContent = o.title;
    this.list.replaceChildren(
      ...o.rows.map((row) => {
        const count = objectiveCount(row);
        return el(
          'li',
          { class: row.done ? 'objective done' : 'objective' },
          el('span', { class: 'objective-mark', html: row.done ? CHECK : '' }),
          el('span', { class: 'objective-text' }, row.text),
          count ? el('span', { class: 'objective-count' }, count) : null,
        );
      }),
    );
  }

  destroy(): void {
    this.root.remove();
  }
}
