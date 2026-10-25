import type Phaser from 'phaser';
import { BUILDING_SPECS } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import { hu } from '../../i18n/hu';
import { decorKeys } from '../../iso/textures';
import { el } from '../dom';
import { dispatchCommand } from '../events';
import { icons, type IconName } from '../icons';
import type { SelectedEntityInfo, UiStore } from '../store';
import { thumbnail } from '../thumbnails';

const RESOURCE_PORTRAIT: Record<'food' | 'wood' | 'gold', string> = {
  food: decorKeys.bush(0),
  wood: decorKeys.tree(1),
  gold: decorKeys.gold(0),
};

/** Bottom-centre card describing the primary selection. */
export class SelectionPanel {
  readonly root: HTMLElement;
  private readonly portrait: HTMLElement;
  private readonly body: HTMLElement;
  private identity = '';
  private bodyKey = '';

  constructor(private readonly textures: Phaser.Textures.TextureManager) {
    this.portrait = el('div', { class: 'portrait empty' });
    this.body = el('div', { class: 'sel-body' });
    this.root = el('div', { class: 'glass selection anim-in' }, this.portrait, this.body);
  }

  render(state: UiStore): void {
    const sel = state.selectedEntity;
    const identity = sel ? `${sel.kind}:${sel.id}` : 'none';
    if (identity !== this.identity) {
      this.identity = identity;
      this.setPortrait(sel);
    }
    // Only rebuild when the shown data changes, so clicks on queue items
    // aren't lost to a re-render between pointerdown and click.
    const key = `${JSON.stringify(sel)}#${state.selectionCount}`;
    if (key === this.bodyKey) return;
    this.bodyKey = key;
    this.body.replaceChildren(...this.bodyFor(sel, state.selectionCount));
  }

  private setPortrait(sel: SelectedEntityInfo | null): void {
    this.portrait.replaceChildren();
    this.portrait.classList.toggle('empty', !sel);
    if (!sel) return;
    const src =
      sel.kind === 'unit'
        ? thumbnail(this.textures, UNIT_SPECS[sel.unitType].textureKey, 0)
        : sel.kind === 'building'
          ? thumbnail(this.textures, BUILDING_SPECS[sel.buildingType].textureKey)
          : thumbnail(this.textures, RESOURCE_PORTRAIT[sel.resourceType]);
    if (src) this.portrait.append(el('img', { src, alt: '' }));
  }

  private bodyFor(sel: SelectedEntityInfo | null, count: number): Node[] {
    if (!sel) {
      return [
        el('div', { class: 'sel-head' }, el('span', { class: 'sel-name' }, hu.hud.noSelection)),
        el('p', { class: 'sel-hint' }, hu.hud.noSelectionHint),
        el('p', { class: 'sel-hint', style: 'color:var(--ink-3)' }, hu.hud.controls),
      ];
    }
    if (sel.kind === 'resource') {
      return [
        head(hu.resourceNodes[sel.resourceType], hu.resources[sel.resourceType]),
        bar(sel.amount, sel.maxAmount, hu.hud.amount, 'build'),
        stats([[sel.resourceType, hu.resources[sel.resourceType], `${sel.amount}`]]),
      ];
    }
    const enemy = sel.ownerId !== 1;
    const more = count > 1 ? `+${count - 1} ${hu.hud.selectedMore}` : undefined;
    if (sel.kind === 'unit') {
      const spec = UNIT_SPECS[sel.unitType];
      const rows: Array<[IconName, string, string]> = [
        ['sword', hu.hud.attack, `${spec.damage}`],
        ['range', hu.hud.range, `${spec.range}`],
        ['speed', hu.hud.speed, `${spec.speed}`],
      ];
      if (sel.carrying) rows.push([sel.carrying.type, hu.hud.carrying, `${sel.carrying.amount}`]);
      return [
        head(hu.units[sel.unitType], hu.unitRoles[sel.unitType], enemy, more),
        bar(sel.hp.current, sel.hp.max, hu.hud.hp),
        stats(rows),
      ];
    }
    const nodes: Node[] = [head(hu.buildings[sel.buildingType], hu.buildingRoles[sel.buildingType], enemy, more)];
    if (sel.constructionProgress !== undefined) {
      nodes.push(bar(Math.round(sel.constructionProgress * 100), 100, hu.hud.underConstruction, 'build', '%'));
    } else {
      nodes.push(bar(sel.hp.current, sel.hp.max, hu.hud.hp));
    }
    if (sel.queue && sel.queue.length > 0) nodes.push(this.queue(sel.id, sel.queue));
    return nodes;
  }

  private queue(trainerId: number, queue: NonNullable<Extract<SelectedEntityInfo, { kind: 'building' }>['queue']>): Node {
    const row = el('div', { class: 'queue' }, el('span', { class: 'panel-title' }, hu.hud.queue));
    queue.forEach((entry, index) => {
      const fill = el('span', { class: 'q-fill', style: `height:${Math.round(entry.progress * 100)}%` });
      const item = el(
        'div',
        { class: 'q-item', title: hu.units[entry.unitType] },
        fill,
        el('img', { src: thumbnail(this.textures, UNIT_SPECS[entry.unitType].textureKey, 0), alt: '' }),
      );
      item.addEventListener('click', () => dispatchCommand({ type: 'cancel-queue', trainerId, index }));
      row.append(item);
    });
    return row;
  }

  destroy(): void {
    this.root.remove();
  }
}

function head(name: string, role: string, enemy = false, more?: string): Node {
  return el(
    'div',
    { class: 'sel-head' },
    el('span', { class: 'sel-name' }, name),
    el('span', { class: 'sel-role' }, role),
    enemy ? el('span', { class: 'sel-tag enemy' }, hu.hud.enemy) : more ? el('span', { class: 'sel-tag' }, more) : null,
  );
}

function bar(current: number, max: number, label: string, variant?: 'build', suffix = ''): Node {
  const pct = max > 0 ? Math.max(0, Math.min(1, current / max)) : 0;
  const cls = variant ?? (pct > 0.5 ? '' : pct > 0.25 ? 'mid' : 'low');
  return el(
    'div',
    { class: 'hp' },
    el('span', {}, label),
    el('span', { class: `hp-bar ${cls}` }, el('i', { style: `width:${pct * 100}%` })),
    el('b', {}, suffix ? `${current}${suffix}` : `${current} / ${max}`),
  );
}

function stats(rows: Array<[IconName, string, string]>): Node {
  return el(
    'div',
    { class: 'stats' },
    ...rows.map(([icon, label, value]) =>
      el('span', { class: 'stat', title: label }, el('span', { html: icons[icon] }), el('span', {}, label), el('b', {}, value)),
    ),
  );
}
