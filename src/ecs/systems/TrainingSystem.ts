import type { With } from 'miniplex';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { gridOf, type NavGrid } from '../../map/navGrid';
import { moveLayerOfType } from '../navLayer';
import { bonusesFor, scaleHealth, trainSpeedMultiplier } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import { createUnit } from '../archetypes/createUnit';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';
import { gameEvents } from '../../game/events';
import { tradePostType } from '../../game/trade';

type Trainer = With<
  Entity,
  'position' | 'building' | 'trainingQueue' | 'owner'
>;

/**
 * Advances the front entry of each trainer's training queue. On
 * completion, spawns a fresh unit next to the trainer's footprint
 * and increments the player's population counter.
 */
export class TrainingSystem {
  private readonly world: EcsWorld;
  private readonly mapData: MapData;

  constructor(
    world: EcsWorld,
    mapData: MapData,
    private readonly players: PlayerManager | null = null,
  ) {
    this.world = world;
    this.mapData = mapData;
  }

  update(deltaMs: number): void {
    const dt = deltaMs / 1000;
    const trainers = this.world.with(
      'position',
      'building',
      'trainingQueue',
      'owner',
    );
    for (const trainer of trainers) {
      // A collapsing (dying) building trains nothing; its queue is lost with it.
      if ((trainer as Entity).underConstruction || (trainer as Entity).dying) continue;
      const entry = trainer.trainingQueue.entries[0];
      if (!entry) continue;
      // Conscription (M12) speeds up the barracks, archery range and stable.
      const owner = this.players?.get(trainer.owner.playerId);
      entry.elapsed += dt * (owner ? trainSpeedMultiplier(owner, trainer.building.type) : 1);
      if (entry.elapsed >= entry.totalTime) {
        this.completeEntry(trainer);
      }
    }
  }

  private completeEntry(trainer: Trainer): void {
    const entry = trainer.trainingQueue.entries.shift();
    if (!entry) return;
    const spawn = this.findSpawnTile(trainer, gridOf(this.mapData, moveLayerOfType(entry.unitType)));
    if (!spawn) {
      // No free tile adjacent — push the entry back so the player can
      // try again after clearing space.
      trainer.trainingQueue.entries.unshift({
        ...entry,
        elapsed: entry.totalTime,
      });
      return;
    }
    const unit = createUnit(this.world, {
      type: entry.unitType,
      tile: spawn,
      playerId: trainer.owner.playerId,
    });
    // A trader's routes start from where it was trained (M17).
    if (tradePostType(entry.unitType) && trainer.id !== undefined) this.world.addComponent(unit, 'tradeHome', { buildingId: trainer.id });
    gameEvents.emit('unitTrained', { world: this.world, playerId: trainer.owner.playerId, unitType: entry.unitType });
    // HP is stored state: a new unit gets the owner's HP technology once.
    if (unit.health) scaleHealth(unit.health, bonusesFor(this.players, unit).hpMultiplier);
    // PopulationSystem recomputes current/cap from world state every
    // tick; no need to increment here.
  }

  /** A free tile next to the footprint on the unit's layer (a dock's ships go on the water beside it, M14). */
  private findSpawnTile(trainer: Trainer, grid: NavGrid): TileCoord | null {
    const { width, height } = trainer.building.footprint;
    const candidates: TileCoord[] = [];
    for (let dx = -1; dx <= width; dx++) {
      candidates.push({ tx: trainer.position.tx + dx, ty: trainer.position.ty - 1 });
      candidates.push({ tx: trainer.position.tx + dx, ty: trainer.position.ty + height });
    }
    for (let dy = 0; dy < height; dy++) {
      candidates.push({ tx: trainer.position.tx - 1, ty: trainer.position.ty + dy });
      candidates.push({ tx: trainer.position.tx + width, ty: trainer.position.ty + dy });
    }
    for (const t of candidates) {
      if (grid.isPassable(t.tx, t.ty)) return t;
    }
    return null;
  }
}
