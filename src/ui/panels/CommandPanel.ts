import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { hu } from '../../i18n/hu';
import type { BuildingType, ResourceType, Resources, UnitType } from '../../types';
import { el } from '../dom';
import { dispatchCommand } from '../events';
import { icons } from '../icons';
import { uiStore, type UiStore } from '../store';
import { thumbnail } from '../thumbnails';

export const BUILDABLE_BY_VILLAGER: readonly BuildingType[] = [
  'house',
  'farm',
  'lumber_camp',
  'mining_camp',
  'barracks',
];

type Cost = Readonly<Resources>;

interface Command {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly image: string;
  readonly cost: Cost;
  readonly pop: number;
  readonly run: () => void;
}

/** First resource the player is short of, if any. */
export function missingResource(have: Resources, cost: Cost): ResourceType | null {
  for (const r of ['food', 'wood', 'gold'] as const) {
    if (have[r] < cost[r]) return r;
  }
  return null;
}

/** Bottom-right grid of build / train buttons for the selection. */
export class CommandPanel {
  readonly root: HTMLElement;
  private readonly grid: HTMLElement;
  private readonly title: HTMLElement;
  private signature = '';
  private commands: Command[] = [];
  private buttons: HTMLButtonElement[] = [];

  constructor(
    private readonly textures: Phaser.Textures.TextureManager,
    private readonly toast: (msg: string) => void,
  ) {
    this.title = el('div', { class: 'panel-title' }, hu.hud.commands);
    this.grid = el('div', { class: 'cmd-grid' });
    this.root = el('div', { class: 'glass commands anim-in' }, this.title, this.grid);
  }

  render(state: UiStore): void {
    const { title, commands, signature } = this.commandsFor(state);
    if (signature !== this.signature) {
      this.signature = signature;
      this.commands = commands;
      this.title.textContent = title;
      this.buttons = commands.map((c) => this.button(c));
      this.grid.replaceChildren(
        ...(this.buttons.length > 0 ? this.buttons : [el('div', { class: 'cmd-empty' }, '—')]),
      );
    }
    this.commands.forEach((c, i) => {
      const ok = this.blocker(state, c) === null;
      const btn = this.buttons[i];
      if (!btn) return;
      btn.classList.toggle('disabled', !ok);
      btn.querySelectorAll<HTMLElement>('.cost').forEach((node) => {
        const r = node.dataset.res as ResourceType;
        node.classList.toggle('short', state.resources[r] < c.cost[r]);
      });
    });
  }

  private commandsFor(state: UiStore): { title: string; commands: Command[]; signature: string } {
    const sel = state.selectedEntity;
    if (sel?.kind === 'unit' && sel.ownerId === 1 && sel.unitType === 'villager') {
      return {
        title: hu.hud.build,
        signature: 'build',
        commands: BUILDABLE_BY_VILLAGER.map((type) => this.buildCommand(type)),
      };
    }
    if (
      sel?.kind === 'building' &&
      sel.ownerId === 1 &&
      sel.constructionProgress === undefined &&
      sel.trainable &&
      sel.trainable.length > 0
    ) {
      const trainerId = sel.id;
      return {
        title: hu.hud.train,
        signature: `train:${trainerId}:${sel.trainable.join(',')}`,
        commands: sel.trainable.map((u) => this.trainCommand(trainerId, u)),
      };
    }
    return { title: hu.hud.commands, signature: 'none', commands: [] };
  }

  private buildCommand(type: BuildingType): Command {
    const spec = BUILDING_SPECS[type];
    return {
      id: type,
      name: hu.buildings[type],
      role: hu.buildingRoles[type],
      image: thumbnail(this.textures, spec.textureKey),
      cost: spec.cost,
      pop: 0,
      run: () => uiStore.getState().setPlacementBuilding(type),
    };
  }

  private trainCommand(trainerId: number, unitType: UnitType): Command {
    const spec = UNIT_SPECS[unitType];
    return {
      id: unitType,
      name: hu.units[unitType],
      role: hu.unitRoles[unitType],
      image: thumbnail(this.textures, spec.textureKey, 0),
      cost: spec.cost,
      pop: spec.populationCost,
      run: () => dispatchCommand({ type: 'queue-unit', trainerId, unitType }),
    };
  }

  /** Reason the command can't run right now, or null. */
  private blocker(state: UiStore, c: Command): string | null {
    const short = missingResource(state.resources, c.cost);
    if (short) return hu.hud.notEnough[short];
    if (c.pop > 0 && state.population.current + c.pop > state.population.cap) return hu.hud.populationFull;
    return null;
  }

  private button(c: Command): HTMLButtonElement {
    const costs = (['food', 'wood', 'gold'] as const)
      .filter((r) => c.cost[r] > 0)
      .map((r) => el('span', { class: 'cost', 'data-res': r }, el('span', { html: icons[r] }), String(c.cost[r])));
    const btn = el(
      'button',
      { class: 'cmd', type: 'button', 'aria-label': c.name },
      el('img', { src: c.image, alt: '' }),
      el(
        'span',
        { class: 'tip' },
        el('div', { class: 'tip-name' }, c.name),
        el('div', { class: 'tip-role' }, c.role),
        el('div', { class: 'costs' }, ...costs),
      ),
    );
    btn.addEventListener('click', () => {
      const reason = this.blocker(uiStore.getState(), c);
      if (reason) {
        this.toast(reason);
        return;
      }
      c.run();
    });
    return btn;
  }

  destroy(): void {
    this.root.remove();
  }
}
