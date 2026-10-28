import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import {
  buildingRequiredAge,
  isTechAvailable,
  techRequiredAge,
  unitRequiredAge,
} from '../../game/availability';
import { TECH_SPECS } from '../../game/technologies';
import { hu } from '../../i18n/hu';
import type { AgeId, BuildingType, ResourceType, Resources, TechId, UnitType } from '../../types';
import { el } from '../dom';
import { dispatchCommand } from '../events';
import { icons } from '../icons';
import { uiStore, type UiStore } from '../store';
import { buildingThumbnail, unitThumbnail } from '../thumbnails';

const AGE_NAME: Record<AgeId, string> = {
  1: hu.ages.roman,
  2: hu.ages.medieval,
  3: hu.ages.enlightenment,
};

export const BUILDABLE_BY_VILLAGER: readonly BuildingType[] = [
  'house',
  'farm',
  'lumber_camp',
  'mining_camp',
  'barracks',
  'archery_range',
  'stable',
  'blacksmith',
  'tower',
  'wall',
  'foundry',
  'wonder',
];

type Cost = Readonly<Resources>;

interface Command {
  readonly id: string;
  readonly name: string;
  readonly role: string;
  readonly image: string;
  readonly cost: Cost;
  readonly pop: number;
  /** Age needed before the command unlocks (greyed with a hint until then). */
  readonly requiredAge?: AgeId;
  /** Research / build duration in seconds, shown in the tooltip. */
  readonly time?: number;
  /** Extra reason the command can't run right now (building busy, ...). */
  readonly busy?: (state: UiStore) => string | null;
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
    private readonly toast: (msg: string, tone: 'error') => void,
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
      const locked = c.requiredAge !== undefined && c.requiredAge > state.currentAge;
      btn.classList.toggle('locked', locked);
      const lock = btn.querySelector<HTMLElement>('.tip-lock');
      if (lock) lock.textContent = locked && c.requiredAge ? `${AGE_NAME[c.requiredAge]} ${hu.hud.ageRequired}` : '';
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
        signature: `build:${state.currentAge}`,
        commands: BUILDABLE_BY_VILLAGER.map((type) => this.buildCommand(type, state.currentAge)),
      };
    }
    if (sel?.kind === 'building' && sel.ownerId === 1 && sel.constructionProgress === undefined) {
      const units = sel.trainable ?? [];
      const techs = (sel.researchable ?? []).filter(
        (t) => !state.researchedTechs.includes(t),
      );
      if (units.length === 0 && techs.length === 0) {
        return { title: hu.hud.commands, signature: 'none', commands: [] };
      }
      const id = sel.id;
      return {
        title: techs.length > 0 ? hu.hud.commands : hu.hud.train,
        signature: `building:${id}:${state.currentAge}:${units.join(',')}:${techs.join(',')}`,
        commands: [
          ...units.map((u) => this.trainCommand(id, u)),
          ...techs.map((t) => this.researchCommand(id, t)),
        ],
      };
    }
    return { title: hu.hud.commands, signature: 'none', commands: [] };
  }

  private buildCommand(type: BuildingType, age: AgeId): Command {
    const spec = BUILDING_SPECS[type];
    return {
      id: type,
      name: hu.buildings[type],
      role: hu.buildingRoles[type],
      image: buildingThumbnail(this.textures, type, age, uiStore.getState().civ),
      cost: spec.cost,
      pop: 0,
      requiredAge: buildingRequiredAge(type),
      time: spec.buildTime,
      busy: (state) => (state.uniqueBuilt.includes(type) ? hu.hud.uniqueBuilt : null),
      run: () => uiStore.getState().setPlacementBuilding(type),
    };
  }

  private trainCommand(trainerId: number, unitType: UnitType): Command {
    const spec = UNIT_SPECS[unitType];
    return {
      id: unitType,
      name: hu.units[unitType],
      role: hu.unitRoles[unitType],
      image: unitThumbnail(unitType, uiStore.getState().civ),
      cost: spec.cost,
      pop: spec.populationCost,
      requiredAge: unitRequiredAge(unitType),
      time: spec.trainTime,
      busy: (state) =>
        state.selectedEntity?.kind === 'building' && state.selectedEntity.research
          ? hu.hud.researchBusy
          : null,
      run: () => dispatchCommand({ type: 'queue-unit', trainerId, unitType }),
    };
  }

  private researchCommand(buildingId: number, techId: TechId): Command {
    const spec = TECH_SPECS[techId];
    return {
      id: techId,
      name: hu.techs[techId].name,
      role: hu.techs[techId].role,
      image: buildingThumbnail(this.textures, spec.building, uiStore.getState().currentAge, uiStore.getState().civ),
      cost: spec.cost,
      pop: 0,
      requiredAge: techRequiredAge(techId),
      time: spec.time,
      busy: (state) => {
        const sel = state.selectedEntity;
        if (sel?.kind !== 'building') return null;
        if (sel.research) return hu.hud.researchRunning;
        if ((sel.queue?.length ?? 0) > 0) return hu.hud.trainingBusy;
        const progress = { age: state.currentAge, researched: new Set(state.researchedTechs) };
        return isTechAvailable(techId, progress) ? null : hu.hud.ageRequired;
      },
      run: () => dispatchCommand({ type: 'research', buildingId, techId }),
    };
  }

  /** Reason the command can't run right now, or null. */
  private blocker(state: UiStore, c: Command): string | null {
    if (c.requiredAge !== undefined && c.requiredAge > state.currentAge) {
      return `${AGE_NAME[c.requiredAge]} ${hu.hud.ageRequired}`;
    }
    const busy = c.busy?.(state);
    if (busy) return busy;
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
        el('div', { class: 'costs' }, ...costs, c.time ? el('span', { class: 'cost time' }, `${c.time} ${hu.hud.seconds}`) : null),
        el('div', { class: 'tip-lock' }),
      ),
    );
    btn.addEventListener('click', () => {
      const reason = this.blocker(uiStore.getState(), c);
      if (reason) {
        this.toast(reason, 'error');
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
