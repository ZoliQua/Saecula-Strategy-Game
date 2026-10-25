import type { TileCoord } from '../../iso/coordinates';
import { BUILDING_SPECS, createBuilding } from '../../ecs/archetypes/building';
import { UNIT_SPECS } from '../../ecs/archetypes/unit';
import type { Entity } from '../../ecs/components';
import type { AIContext, AIStrategy } from '../AIPlayer';

const ATTACK_READY_COUNT = 4;
// Thresholds leave some headroom above the build cost.
const HOUSE_MIN_WOOD = BUILDING_SPECS.house.cost.wood + 70;
const BARRACKS_MIN_WOOD = BUILDING_SPECS.barracks.cost.wood;
const TRAIN_COOLDOWN_MS = 3_000;
const REPLAN_INTERVAL_MS = 1_500;

/**
 * Economy-first AI with a simple win condition push:
 *   - Idle villagers get sent to the nearest wood / food / gold node.
 *   - When the AI has 100+ wood it builds a house near the TC.
 *   - When it has 150+ wood it builds a barracks.
 *   - Barracks trains swordsmen (1 at a time, 3s cooldown between
 *     queue pushes) up to 4; when ready the AI pushes the stack at
 *     the human town centre.
 *
 * All resource / pop bookkeeping uses the Player.resources object —
 * the UI store only tracks the human. The AI never touches uiStore.
 */
export class EasyStrategy implements AIStrategy {
  readonly name = 'easy';

  private lastPlanMs = -REPLAN_INTERVAL_MS;
  private lastTrainMs = -TRAIN_COOLDOWN_MS;
  private builtHouse = false;
  private builtBarracks = false;
  private attacking = false;

  update(ctx: AIContext, _deltaMs: number): void {
    if (ctx.timeMs - this.lastPlanMs < REPLAN_INTERVAL_MS) return;
    this.lastPlanMs = ctx.timeMs;

    this.assignGatherers(ctx);
    this.manageBuildings(ctx);
    this.manageTraining(ctx);
    this.maybeAttack(ctx);
  }

  private assignGatherers(ctx: AIContext): void {
    const villagers = [...ctx.world.with('gatherer', 'owner', 'position')]
      .filter((v) => v.owner.playerId === ctx.player.id);
    const woodNodes = [...ctx.world.with('resourceNode', 'position')]
      .filter((n) => n.resourceNode.type === 'wood');
    const foodNodes = [...ctx.world.with('resourceNode', 'position')]
      .filter((n) => n.resourceNode.type === 'food');

    for (const v of villagers) {
      if (v.gatherer.targetNodeId !== undefined) continue;
      if (v.gatherIntent) continue;
      // 3 woodcutters, 1 food-gatherer baseline.
      const idx = villagers.indexOf(v);
      const wantFood = idx === 3;
      const source = wantFood && foodNodes.length > 0 ? foodNodes : woodNodes;
      if (source.length === 0) continue;
      const nearest = nearestByManhattan(source, v.position);
      if (!nearest) continue;
      ctx.world.addComponent(v as Entity, 'gatherIntent', {
        nodeId: nearest.id ?? 0,
      });
    }
  }

  private manageBuildings(ctx: AIContext): void {
    const resources = ctx.player.resources;
    const tc = [...ctx.world.with('building', 'owner', 'position')]
      .find((b) => b.owner.playerId === ctx.player.id && b.building.type === 'town_center');
    if (!tc) return;

    if (!this.builtHouse && resources.wood >= HOUSE_MIN_WOOD) {
      const spot = this.findBuildSpot(ctx, tc.position, 2);
      if (spot) {
        this.startBuild(ctx, 'house', spot);
        this.builtHouse = true;
      }
    }
    if (!this.builtBarracks && resources.wood >= BARRACKS_MIN_WOOD) {
      const spot = this.findBuildSpot(ctx, tc.position, 3);
      if (spot) {
        this.startBuild(ctx, 'barracks', spot);
        this.builtBarracks = true;
      }
    }
  }

  private manageTraining(ctx: AIContext): void {
    if (ctx.timeMs - this.lastTrainMs < TRAIN_COOLDOWN_MS) return;
    const barracks = [...ctx.world.with('trainingQueue', 'building', 'owner')]
      .find((b) => b.owner.playerId === ctx.player.id && b.building.type === 'barracks');
    if (!barracks) return;
    if (barracks.trainingQueue.entries.length >= 3) return;
    const resources = ctx.player.resources;
    const cost = UNIT_SPECS.swordsman.cost;
    if (
      resources.food < cost.food ||
      resources.gold < cost.gold
    ) {
      return;
    }
    resources.food -= cost.food;
    resources.gold -= cost.gold;
    barracks.trainingQueue.entries.push({
      unitType: 'swordsman',
      elapsed: 0,
      totalTime: UNIT_SPECS.swordsman.trainTime,
    });
    this.lastTrainMs = ctx.timeMs;
  }

  private maybeAttack(ctx: AIContext): void {
    const swords = [...ctx.world.with('attacker', 'owner', 'position')]
      .filter((s) => s.owner.playerId === ctx.player.id && s.unit?.unitType === 'swordsman');
    if (!this.attacking && swords.length < ATTACK_READY_COUNT) return;
    this.attacking = true;
    const enemyTC = [...ctx.world.with('building', 'owner', 'position')]
      .find((b) => b.owner.playerId !== ctx.player.id && b.building.type === 'town_center');
    if (!enemyTC) return;
    for (const s of swords) {
      if ((s as Entity).attackIntent) continue;
      ctx.world.addComponent(s as Entity, 'attackIntent', {
        targetId: enemyTC.id ?? 0,
      });
    }
  }

  private startBuild(
    ctx: AIContext,
    type: 'house' | 'barracks',
    origin: TileCoord,
  ): void {
    const spec = BUILDING_SPECS[type].cost;
    if (ctx.player.resources.wood < spec.wood) return;
    ctx.player.resources.wood -= spec.wood;
    const site = createBuilding(ctx.world, {
      type,
      origin,
      playerId: ctx.player.id,
      mapData: ctx.mapData,
      underConstruction: true,
    });
    // Assign any two nearby idle villagers to the site.
    const builders = [...ctx.world.with('gatherer', 'owner', 'position')]
      .filter((v) => v.owner.playerId === ctx.player.id)
      .slice(0, 2);
    for (const v of builders) {
      if (v.buildCommand) continue;
      ctx.world.addComponent(v as Entity, 'buildCommand', { targetId: site.id ?? 0 });
    }
  }

  private findBuildSpot(
    ctx: AIContext,
    anchor: TileCoord,
    size: number,
  ): TileCoord | null {
    const maxRadius = 6;
    for (let r = 2; r <= maxRadius; r++) {
      for (let dx = -r; dx <= r; dx++) {
        for (let dy = -r; dy <= r; dy++) {
          if (Math.abs(dx) !== r && Math.abs(dy) !== r) continue;
          const origin = { tx: anchor.tx + dx, ty: anchor.ty + dy };
          if (this.canPlace(ctx, origin, size, size)) return origin;
        }
      }
    }
    return null;
  }

  private canPlace(
    ctx: AIContext,
    origin: TileCoord,
    w: number,
    h: number,
  ): boolean {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        if (!ctx.mapData.isPassable(origin.tx + dx, origin.ty + dy)) {
          return false;
        }
      }
    }
    return true;
  }
}

function nearestByManhattan<T extends { position: TileCoord }>(
  list: readonly T[],
  from: TileCoord,
): T | undefined {
  let best: T | undefined;
  let bestDist = Infinity;
  for (const item of list) {
    const d = Math.abs(item.position.tx - from.tx) + Math.abs(item.position.ty - from.ty);
    if (d < bestDist) {
      bestDist = d;
      best = item;
    }
  }
  return best;
}
