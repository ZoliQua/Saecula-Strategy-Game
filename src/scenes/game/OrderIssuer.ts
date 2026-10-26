import type { Entity } from '../../ecs/components';
import { clearUnitOrders } from '../../ecs/orders';
import type { SelectionSystem } from '../../ecs/systems/SelectionSystem';
import type { EcsWorld } from '../../ecs/world';
import type { TileCoord } from '../../iso/coordinates';

/** Translates a right-click on a tile into move / attack / gather orders. */
export class OrderIssuer {
  constructor(
    private readonly world: EcsWorld,
    private readonly selection: SelectionSystem,
  ) {}

  issueOrders(tile: TileCoord): void {
    const selectedAll = this.selection.getAllSelected();
    if (selectedAll.length === 0) return;
    const first = selectedAll[0]!;
    const enemy = this.findEnemyAt(tile.tx, tile.ty, first);
    const node = enemy ? null : this.findResourceNodeAt(tile.tx, tile.ty);
    for (const entity of selectedAll) {
      if (entity.owner?.playerId !== 1) continue;
      // Any new right-click order overrides whatever the unit was
      // doing — clear gather state + build command so the villager
      // actually listens.
      clearUnitOrders(this.world, entity);
      if (enemy && entity.attacker) {
        this.world.addComponent(entity, 'attackIntent', {
          targetId: enemy.id ?? 0,
        });
        continue;
      }
      if (node && entity.gatherer) {
        this.world.addComponent(entity, 'gatherIntent', {
          nodeId: node.id ?? 0,
        });
        continue;
      }
      this.world.addComponent(entity, 'moveIntent', { target: tile });
    }
  }

  private findEnemyAt(tx: number, ty: number, actor: Entity): Entity | null {
    const actorPlayer = actor.owner?.playerId;
    if (actorPlayer === undefined) return null;
    const candidates = this.world.with('position', 'owner', 'health');
    for (const c of candidates) {
      if (c.owner.playerId === actorPlayer) continue;
      const b = (c as Entity).building;
      if (b) {
        if (
          tx >= c.position.tx &&
          tx < c.position.tx + b.footprint.width &&
          ty >= c.position.ty &&
          ty < c.position.ty + b.footprint.height
        ) {
          return c;
        }
        continue;
      }
      if (c.position.tx === tx && c.position.ty === ty) return c;
    }
    return null;
  }

  private findResourceNodeAt(tx: number, ty: number): Entity | null {
    const nodes = this.world.with('position', 'resourceNode');
    for (const n of nodes) {
      // Multi-tile building nodes (e.g. farms) match any footprint tile.
      const b = (n as Entity).building;
      if (b) {
        if (
          tx >= n.position.tx &&
          tx < n.position.tx + b.footprint.width &&
          ty >= n.position.ty &&
          ty < n.position.ty + b.footprint.height
        ) {
          return n;
        }
        continue;
      }
      if (n.position.tx === tx && n.position.ty === ty) return n;
    }
    return null;
  }
}
