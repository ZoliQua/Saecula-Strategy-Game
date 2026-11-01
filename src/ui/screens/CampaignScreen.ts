import { audio } from '../../audio/AudioManager';
import { MISSION_IDS, MISSIONS, type MissionId } from '../../campaign/missions';
import { objectiveText } from '../../campaign/objectiveText';
import type { MissionStatus } from '../../campaign/progress';
import { hu } from '../../i18n/hu';
import { el, uiRoot } from '../dom';
import { bindModalKeys, GLYPHS } from './modalKeys';
import '../hud.css';
import '../screens.css';
import '../pause.css';
import '../campaign.css';

export interface CampaignHandlers {
  /** An available or completed mission was started from its briefing. */
  onStart(id: MissionId): void;
  onBack(): void;
}

/**
 * The campaign card (M13) over the main menu's diorama: the mission list
 * (locked / available / completed) and, for a chosen mission, its briefing
 * with the objectives and a start button. Esc goes back from the briefing
 * to the list, and from the list to the menu.
 */
export class CampaignScreen {
  private readonly root: HTMLElement;
  private readonly body: HTMLElement;
  private readonly unbindKeys: () => void;
  private briefing: MissionId | null = null;

  constructor(
    private readonly status: (id: MissionId) => MissionStatus,
    private readonly handlers: CampaignHandlers,
  ) {
    audio().playSFX('ui_panel_open');
    this.body = el('div', { class: 'campaign-body' });
    const card = el(
      'div',
      { class: 'glass slots-card campaign-card', role: 'dialog', 'aria-modal': 'true', 'aria-label': hu.campaign.title },
      el(
        'div',
        { class: 'pause-head' },
        el('div', { class: 'eyebrow pause-kicker' }, hu.campaign.kicker),
        el('h2', { class: 'pause-title' }, hu.campaign.title),
        el('div', { class: 'pause-ornament', 'aria-hidden': 'true' }, el('span', {}), el('i', {}), el('span', {})),
      ),
      this.body,
    );
    this.root = el('div', { class: 'screen pause-layer slots-layer' }, card);
    uiRoot().append(this.root);
    this.unbindKeys = bindModalKeys(card, () => (this.briefing ? this.showList() : this.handlers.onBack()));
    this.showList();
  }

  leave(): void {
    this.root.classList.add('leaving');
    this.root.inert = true;
    this.unbindKeys();
  }

  destroy(): void {
    this.unbindKeys();
    this.root.remove();
  }

  private backButton(onClick: () => void): HTMLElement {
    const back = el('button', { class: 'btn btn-ghost btn-back slots-back', type: 'button' }, el('span', { class: 'arrow', html: GLYPHS.back }), el('span', {}, hu.common.back));
    back.addEventListener('click', onClick);
    return back;
  }

  private showList(): void {
    this.briefing = null;
    const rows = MISSION_IDS.map((id, i) => {
      const st = this.status(id);
      const t = hu.campaign.missions[id];
      const row = el(
        'button',
        { class: `slot-row campaign-row ${st}`, type: 'button', style: `--i:${i}`, disabled: st === 'locked', 'data-mission': id, title: st === 'locked' ? hu.campaign.lockedHint : t.title },
        el('span', { class: 'slot-badge' }, String(i + 1)),
        el('span', { class: 'slot-text' }, el('span', { class: 'slot-title' }, t.title), el('span', { class: 'slot-detail' }, t.place)),
        el('span', { class: `campaign-status ${st}` }, hu.campaign.status[st]),
      );
      row.addEventListener('click', () => this.showBriefing(id));
      return row;
    });
    const back = this.backButton(() => this.handlers.onBack());
    this.body.replaceChildren(
      el('p', { class: 'campaign-intro' }, hu.campaign.intro),
      el('div', { class: 'slots-list entering' }, ...rows),
      el('div', { class: 'slots-foot' }, back, el('span', { class: 'pause-foot' }, el('kbd', {}, 'Esc'), el('span', {}, hu.common.back))),
    );
    (this.body.querySelector<HTMLElement>('.campaign-row:not([disabled])') ?? back).focus({ preventScroll: true });
  }

  private showBriefing(id: MissionId): void {
    if (this.status(id) === 'locked') return;
    audio().playSFX('ui_click');
    this.briefing = id;
    const t = hu.campaign.missions[id];
    const n = MISSION_IDS.indexOf(id) + 1;
    const start = el(
      'button',
      { class: 'btn btn-primary campaign-start', type: 'button' },
      el('span', {}, this.status(id) === 'completed' ? hu.campaign.replay : hu.campaign.start),
      el('span', { class: 'arrow', html: GLYPHS.arrow }),
    );
    start.addEventListener('click', () => this.handlers.onStart(id));
    this.body.replaceChildren(
      el(
        'article',
        { class: 'campaign-briefing anim-in' },
        el('div', { class: 'campaign-number' }, hu.campaign.missionNumber(n)),
        el('h3', { class: 'campaign-title' }, t.title),
        el('div', { class: 'campaign-place' }, t.place),
        el('p', { class: 'campaign-text' }, t.briefing),
        el('div', { class: 'panel-title' }, hu.campaign.objectivesTitle),
        el('ul', { class: 'campaign-objectives' }, ...MISSIONS[id].objectives.map((o) => el('li', {}, objectiveText(o)))),
      ),
      el('div', { class: 'slots-foot' }, this.backButton(() => this.showList()), start),
    );
    start.focus({ preventScroll: true });
  }
}
