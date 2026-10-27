import {
  AVAILABLE_CIVS,
  AVAILABLE_DIFFICULTIES,
  AVAILABLE_TEMPLATES,
  DIFFICULTIES,
  exceedsRecommendedAi,
  mapTiles,
  MAP_SIZES,
  MAP_SIZE_IDS,
  MAX_AI,
  MAX_SEED,
  MIN_AI,
  playerCount,
  randomSeed,
  withSetup,
  type GameSetupConfig,
} from '../../game/GameSetupConfig';
import { MAP_TEMPLATES } from '../../map/generator';
import { hu } from '../../i18n/hu';
import { CIV_IDS } from '../../config/civs';
import { el, uiRoot } from '../dom';
import { Segmented, type SegmentItem } from './Segmented';
import '../hud.css';
import '../screens.css';
import '../setup.css';

const ARROW = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 8h10M9 4l4 4-4 4"/></svg>`;
const BACK = `<svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 8H3M7 4 3 8l4 4"/></svg>`;
const DICE = `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1" fill="currentColor"/><circle cx="15.5" cy="8.5" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="8.5" cy="15.5" r="1" fill="currentColor"/><circle cx="15.5" cy="15.5" r="1" fill="currentColor"/></svg>`;


export interface GameSetupHandlers {
  onStart: (config: GameSetupConfig) => void;
  onBack: () => void;
}

/**
 * Game setup card: map template / size, AI count, difficulty, civ and
 * seed. Options that are not implemented yet are shown disabled with a
 * "hamarosan" tag. Lives over the main menu's live diorama.
 */
export class GameSetup {
  private readonly root: HTMLElement;
  private readonly card: HTMLElement;
  private config: GameSetupConfig;
  private readonly aiSeg: Segmented<string>;
  private readonly sizeSeg: Segmented<string>;
  private readonly diffSeg: Segmented<string>;
  private readonly seedInput: HTMLInputElement;
  private readonly aiHint: HTMLElement;
  private readonly summary: HTMLElement;
  private readonly startBtn: HTMLButtonElement;
  private readonly backBtn: HTMLButtonElement;
  private readonly civChips: HTMLButtonElement[] = [];
  private readonly templateChips: HTMLButtonElement[] = [];
  private busy = false;
  private teardown = 0;
  private readonly onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && !this.busy) this.handlers.onBack();
  };

  constructor(
    initial: GameSetupConfig,
    private readonly handlers: GameSetupHandlers,
    /** Shown above the actions, e.g. why the last start failed. */
    notice?: string,
  ) {
    this.config = initial;
    const t = hu.setup;
    let row = 0;
    const delay = () => `animation-delay:${(0.18 + row++ * 0.07).toFixed(2)}s`;

    const templateGrid = el('div', { class: 'tpl-grid', role: 'radiogroup', 'aria-label': t.template });
    for (const id of MAP_TEMPLATES) {
      const available = AVAILABLE_TEMPLATES.includes(id);
      const chip = el(
        'button',
        { class: 'civ-chip tpl-chip', type: 'button', role: 'radio', 'aria-checked': available && this.config.template === id, disabled: !available },
        el('span', { class: 'civ-name' }, t.templates[id].name),
        el('span', { class: available ? 'tpl-desc' : 'soon' }, available ? t.templates[id].desc : t.comingSoon),
      );
      if (available) chip.addEventListener('click', () => this.change({ template: id }));
      chip.dataset['tpl'] = id;
      this.templateChips.push(chip);
      templateGrid.append(chip);
    }
    const sizeItems: SegmentItem<string>[] = MAP_SIZE_IDS.map((id) => ({
      value: id,
      label: t.sizes[id],
      sub: `${MAP_SIZES[id].tiles}×${MAP_SIZES[id].tiles}`,
    }));
    this.sizeSeg = new Segmented('size', t.size, sizeItems, this.config.mapSize, (v) => this.change({ mapSize: v as GameSetupConfig['mapSize'] }));
    const aiItems: SegmentItem<string>[] = [];
    for (let n = MIN_AI; n <= MAX_AI; n++) aiItems.push({ value: String(n), label: String(n) });
    this.aiSeg = new Segmented('ai', t.opponents, aiItems, String(this.config.aiCount), (v) => this.change({ aiCount: Number(v) }));
    const diffItems: SegmentItem<string>[] = DIFFICULTIES.map((id) => ({
      value: id,
      label: t.difficulties[id],
      disabled: !AVAILABLE_DIFFICULTIES.includes(id),
    }));
    this.diffSeg = new Segmented('difficulty', t.difficulty, diffItems, this.config.difficulty, (v) =>
      this.change({ difficulty: v as GameSetupConfig['difficulty'] }),
    );

    this.aiHint = el('div', { class: 'setup-hint', 'aria-live': 'polite' });

    const civGrid = el('div', { class: 'civ-grid', role: 'radiogroup', 'aria-label': t.civ });
    for (const id of CIV_IDS) {
      const available = AVAILABLE_CIVS.includes(id);
      const chip = el(
        'button',
        { class: 'civ-chip', type: 'button', role: 'radio', 'aria-checked': available && this.config.civ === id, disabled: !available },
        el('span', { class: 'civ-name' }, hu.civs[id]),
        available ? null : el('span', { class: 'soon' }, t.comingSoon),
      );
      if (available) chip.addEventListener('click', () => this.change({ civ: id }));
      chip.dataset['civ'] = id;
      this.civChips.push(chip);
      civGrid.append(chip);
    }

    this.seedInput = el('input', {
      class: 'seed-input',
      type: 'text',
      inputmode: 'numeric',
      maxlength: String(MAX_SEED).length,
      autocomplete: 'off',
      spellcheck: false,
      'aria-label': t.seed,
    });
    this.seedInput.addEventListener('input', () => {
      const digits = this.seedInput.value.replace(/\D/g, '');
      this.seedInput.value = digits;
      if (digits) this.config = withSetup(this.config, { seed: Number(digits) });
    });
    this.seedInput.addEventListener('blur', () => this.syncSeed());
    this.seedInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.start();
    });
    const reroll = el('button', { class: 'icon-btn', type: 'button', title: t.reroll, 'aria-label': t.reroll, html: DICE });
    reroll.addEventListener('click', () => {
      this.change({ seed: randomSeed() });
      reroll.classList.remove('spin');
      void reroll.offsetWidth;
      reroll.classList.add('spin');
    });

    this.summary = el('div', { class: 'setup-summary' });
    this.backBtn = el('button', { class: 'btn btn-ghost btn-back', type: 'button' }, el('span', { class: 'arrow', html: BACK }), el('span', {}, t.back));
    this.backBtn.addEventListener('click', () => this.handlers.onBack());
    this.startBtn = el('button', { class: 'btn btn-primary btn-start', type: 'button' }, el('span', { class: 'label' }, t.start), el('span', { class: 'arrow', html: ARROW }));
    this.startBtn.addEventListener('click', () => this.start());

    const field = (label: string, control: Node, extra?: Node) =>
      el('div', { class: 'setup-row e-up', style: delay() }, el('div', { class: 'setup-label' }, label), el('div', { class: 'setup-control' }, control, extra));

    this.card = el(
      'section',
      { class: 'glass setup-card', role: 'dialog', 'aria-label': t.title },
      el(
        'header',
        { class: 'setup-head' },
        el('div', { class: 'eyebrow e-up', style: 'animation-delay:.08s' }, t.eyebrow),
        el('h2', { class: 'setup-title e-up', style: 'animation-delay:.14s' }, t.title),
        el('p', { class: 'setup-sub e-up', style: 'animation-delay:.2s' }, t.subtitle),
      ),
      el(
        'div',
        { class: 'setup-body' },
        field(t.template, templateGrid),
        field(t.size, this.sizeSeg.root),
        field(t.opponents, this.aiSeg.root, this.aiHint),
        field(t.difficulty, this.diffSeg.root),
        field(t.civ, civGrid),
        field(t.seed, el('div', { class: 'seed-row' }, this.seedInput, reroll), el('div', { class: 'setup-hint' }, t.seedHint)),
      ),
      notice ? el('div', { class: 'setup-notice', role: 'alert' }, notice) : null,
      el(
        'footer',
        { class: 'setup-foot e-up', style: delay() },
        this.summary,
        el('div', { class: 'setup-actions' }, this.backBtn, this.startBtn),
      ),
    );
    this.root = el('div', { class: 'screen setup enter' }, this.card);
    uiRoot().append(this.root);
    window.addEventListener('keydown', this.onKey);
    this.refresh();
    // Drop the entrance class once it has played so nothing re-animates.
    this.teardown = window.setTimeout(() => this.root.classList.remove('enter'), 1800);
    // Start button takes focus so Enter launches and arrows reach the groups with Tab.
    this.startBtn.focus({ preventScroll: true });
  }

  /** Swaps the card for a "Betöltés…" state; controls stop accepting input. */
  setBusy(): void {
    this.busy = true;
    this.root.classList.add('busy');
    this.card.setAttribute('aria-busy', 'true');
    const label = this.startBtn.querySelector('.label');
    if (label) label.textContent = hu.setup.loading;
    for (const b of this.card.querySelectorAll('button, input')) (b as HTMLButtonElement).disabled = true;
  }

  /** Plays the exit animation. */
  leave(): void {
    this.root.classList.add('leaving');
  }

  destroy(): void {
    window.clearTimeout(this.teardown);
    window.removeEventListener('keydown', this.onKey);
    this.root.remove();
  }

  private start(): void {
    if (this.busy) return;
    this.syncSeed();
    this.handlers.onStart(this.config);
  }

  private change(partial: Partial<GameSetupConfig>): void {
    if (this.busy) return;
    this.config = withSetup(this.config, partial);
    this.refresh();
  }

  private syncSeed(): void {
    this.config = withSetup(this.config, {});
    this.seedInput.value = String(this.config.seed);
  }

  private refresh(): void {
    const c = this.config;
    this.sizeSeg.set(c.mapSize);
    this.aiSeg.set(String(c.aiCount));
    this.diffSeg.set(c.difficulty);
    for (const chip of this.templateChips) chip.setAttribute('aria-checked', String(chip.dataset['tpl'] === c.template));
    for (const chip of this.civChips) chip.setAttribute('aria-checked', String(chip.dataset['civ'] === c.civ));
    if (document.activeElement !== this.seedInput) this.seedInput.value = String(c.seed);
    const crowded = exceedsRecommendedAi(c);
    this.aiHint.textContent = crowded ? hu.setup.opponentsCrowded : `${hu.setup.opponentsOk}: ${MAP_SIZES[c.mapSize].recommendedAi}`;
    this.aiHint.classList.toggle('warn', crowded);
    this.summary.textContent = hu.setup.summary(playerCount(c), mapTiles(c));
  }
}
