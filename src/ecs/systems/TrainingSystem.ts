import type { With } from 'miniplex';
import type { TileCoord } from '../../iso/coordinates';
import type { MapData } from '../../map/MapData';
import { bonusesFor, scaleHealth } from '../../game/modifiers';
import type { PlayerManager } from '../../game/PlayerManager';
import { createUnit } from '../archetypes/createUnit';
import type { Entity } from '../components';
import type { EcsWorld } from '../world';

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
      if ((trainer as Entity).underConstruction) continue;
      const entry = trainer.trainingQueue.entries[0];
      if (!entry) continue;
      entry.elapsed += dt;
      if (entry.elapsed >= entry.totalTime) {
        this.completeEntry(trainer);
      }
    }
  }

  private completeEntry(trainer: Trainer): void {
    const entry = trainer.trainingQueue.entries.shift();
    if (!entry) return;
    const spawn = this.findSpawnTile(trainer);
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
    // HP is stored state: a new unit gets the owner's HP technology once.
    if (unit.health) scaleHealth(unit.health, bonusesFor(this.players, unit).hpMultiplier);
    // PopulationSystem recomputes current/cap from world state every
    // tick; no need to increment here.
  }

  private findSpawnTile(trainer: Trainer): TileCoord | null {
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
      if (this.mapData.isPassable(t.tx, t.ty)) return t;
    }
    return null;
  }
}
