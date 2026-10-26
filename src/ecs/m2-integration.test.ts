import { beforeEach, describe, expect, it } from 'vitest';
import { AIPlayer } from '../ai/AIPlayer';
import { EasyStrategy } from '../ai/strategies/EasyStrategy';
import { createPlayer } from '../game/Player';
import { PlayerManager } from '../game/PlayerManager';
import { VictoryChecker } from '../game/VictoryChecker';
import { FogOfWarData } from '../map/FogOfWarData';
import { MapData } from '../map/MapData';
import { createRng } from '../map/random';
import { TERRAIN } from '../map/TerrainTypes';
import { resetUiStore, uiStore } from '../ui/store';
import { createBuilding } from './archetypes/building';
import { createResourceNode } from './archetypes/resource';
import { createUnit } from './archetypes/createUnit';
import { createVillager } from './archetypes/villager';
import { CombatSystem } from './systems/CombatSystem';
import { ConstructionSystem } from './systems/ConstructionSystem';
import { DeathSystem } from './systems/DeathSystem';
import { FogOfWarSystem } from './systems/FogOfWarSystem';
import { GatheringSystem } from './systems/GatheringSystem';
import { MovementSystem } from './systems/MovementSystem';
import { PathfindingSystem } from './systems/PathfindingSystem';
import { PopulationSystem } from './systems/PopulationSystem';
import { TrainingSystem } from './systems/TrainingSystem';
import { createEcsWorld } from './world';

function createRig() {
  const map = new MapData(30, 30, TERRAIN.grass);
  const world = createEcsWorld();
  const fog = new FogOfWarData(30, 30);
  const players = new PlayerManager([
    createPlayer({ id: 1, isHuman: true }),
    createPlayer({ id: 2 }),
  ]);
  const victory = new VictoryChecker(world, players);

  const systems = {
    pathfinding: new PathfindingSystem(world, map),
    gathering: new GatheringSystem(world, map, players),
    construction: new ConstructionSystem(world, map),
    training: new TrainingSystem(world, map),
    combat: new CombatSystem(world, map),
    movement: new MovementSystem(world),
    death: new DeathSystem(world, map),
    population: new PopulationSystem(world, 1),
    fog: new FogOfWarSystem(world, fog, 1),
  };

  const tick = (ms: number) => {
    systems.pathfinding.update();
    systems.gathering.update(ms);
    systems.construction.update(ms);
    systems.training.update(ms);
    systems.combat.update(ms);
    systems.movement.update(ms);
    systems.death.update(ms);
    systems.population.update();
    systems.fog.update(ms);
  };

  const run = (totalMs: number, stepMs = 200) => {
    const steps = Math.ceil(totalMs / stepMs);
    for (let i = 0; i < steps; i++) tick(stepMs);
  };

  return { map, world, fog, players, victory, systems, tick, run };
}

describe('integration — M2 combat + AI loop', () => {
  beforeEach(() => {
    resetUiStore();
  });

  it('human swordsman kills AI villager and VictoryChecker stays playing', () => {
    const { map, world, victory } = createRig();
    // Seed both sides with TCs + one unit in combat range.
    createBuilding(world, {
      type: 'town_center',
      origin: { tx: 2, ty: 2 },
      playerId: 1,
      mapData: map,
    });
    createBuilding(world, {
      type: 'town_center',
      origin: { tx: 20, ty: 20 },
      playerId: 2,
      mapData: map,
    });
    const sword = createUnit(world, {
      type: 'swordsman',
      tile: { tx: 5, ty: 5 },
      playerId: 1,
    });
    const foe = createUnit(world, {
      type: 'villager',
      tile: { tx: 6, ty: 5 },
      playerId: 2,
    });
    world.addComponent(sword, 'attackIntent', { targetId: foe.id! });

    const rig = createRig();
    void rig; // separate from the shared one above

    // Just exercise the combat + death path here (no need for a fresh rig).
    // For this test we'll drive directly with fresh systems bound to
    // the same world/map.
    const combat = new CombatSystem(world, map);
    const death = new DeathSystem(world, map);
    for (let i = 0; i < 50; i++) {
      combat.update(200);
      death.update(200);
    }
    expect(world.entities.find((e) => e.id === foe.id)).toBeUndefined();
    expect(victory.check().kind).toBe('playing');
  });

  it('destroying the AI town centre triggers victory', () => {
    const { map, world, victory } = createRig();
    const humanTc = createBuilding(world, {
      type: 'town_center',
      origin: { tx: 2, ty: 2 },
      playerId: 1,
      mapData: map,
    });
    const aiTc = createBuilding(world, {
      type: 'town_center',
      origin: { tx: 20, ty: 20 },
      playerId: 2,
      mapData: map,
    });
    aiTc.health!.current = 0;
    world.addComponent(aiTc, 'dying', { ttlMs: 0 });
    // Run the death system to remove the entity.
    new DeathSystem(world, map).update(100);

    const result = victory.check();
    expect(result.kind).toBe('victory');
    void humanTc;
  });

  it('EasyStrategy builds economy over time', () => {
    const { map, world, players, tick } = createRig();
    createBuilding(world, {
      type: 'town_center',
      origin: { tx: 4, ty: 4 },
      playerId: 2,
      mapData: map,
    });
    for (let i = 0; i < 4; i++) {
      createVillager(world, { tile: { tx: 3 + i, ty: 8 }, playerId: 2 });
    }
    // Plenty of trees within reach.
    for (let i = 0; i < 8; i++) {
      map.setTile(10 + i, 6, TERRAIN.forest);
      createResourceNode(world, { tile: { tx: 10 + i, ty: 6 }, type: 'wood' });
    }
    const player = players.get(2)!;
    player.resources = { food: 50, wood: 80, gold: 200 };
    // Seeded: Easy's 20% random builds made this test flaky (a random lumber camp spends the wood).
    const ai = new AIPlayer(player, new EasyStrategy(createRng(1)));

    for (let i = 0; i < 150; i++) {
      ai.update({ world, mapData: map }, 200);
      tick(200);
    }
    expect(player.resources.wood).toBeGreaterThan(80);
    const houses = world.entities.filter(
      (e) => e.building?.type === 'house' && e.owner?.playerId === 2,
    );
    expect(
      houses.length + (player.resources.wood >= 100 ? 1 : 0),
    ).toBeGreaterThan(0);
  });

  it('fog marks friendly home area visible and enemy area unexplored initially', () => {
    const { world, fog, systems, map } = createRig();
    createBuilding(world, {
      type: 'town_center',
      origin: { tx: 2, ty: 2 },
      playerId: 1,
      mapData: map,
    });
    createBuilding(world, {
      type: 'town_center',
      origin: { tx: 20, ty: 20 },
      playerId: 2,
      mapData: map,
    });
    systems.fog.update(300);
    expect(fog.isVisible(3, 3)).toBe(true); // own TC area
    expect(fog.isVisible(21, 21)).toBe(false); // enemy TC area
    expect(uiStore.getState().resources.wood).toBe(200);
  });
});
