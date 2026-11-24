import { beforeEach, describe, expect, it } from 'vitest';
import { LANDMARK, MARKET, TOWER_ATTACK } from '../../config/balance';
import { gameEvents } from '../../game/events';
import { hasActiveLandmark, isShootingBuilding } from '../../game/landmarks';
import { buyPrice, marketBuy, marketSell, sellPrice } from '../../game/market';
import { researchSpeedMultiplier, trainSpeedMultiplier } from '../../game/modifiers';
import { createPlayers } from '../../game/PlayerManager';
import { tradeGoldMultiplier } from '../../game/trade';
import { MapData } from '../../map/MapData';
import { TERRAIN } from '../../map/TerrainTypes';
import type { CivId } from '../../types';
import { resetUiStore, uiStore } from '../../ui/store';
import { createBuilding } from '../archetypes/building';
import { createUnit } from '../archetypes/createUnit';
import { playerWallet } from '../research';
import { createEcsWorld } from '../world';
import { CombatSystem } from './CombatSystem';
import { ConstructionSystem } from './ConstructionSystem';
import { LandmarkSystem } from './LandmarkSystem';
import { ResearchSystem } from './ResearchSystem';
import { TowerCombatSystem } from './TowerCombatSystem';
import { TrainingSystem } from './TrainingSystem';

/** Human (1) of `human`'s civ and AIs (2..) of `ais`; `allies` as the setup's (M16). */
function setup(human: CivId, ais: CivId[] = ['english'], allies = 0) {
  const map = new MapData(40, 40, TERRAIN.grass);
  const world = createEcsWorld();
  const players = createPlayers(human, ais, undefined, allies);
  const landmarks = new LandmarkSystem(world, players);
  const landmarkOf = (playerId: number, underConstruction = false, tx = 10, ty = 10) =>
    createBuilding(world, { type: 'landmark', origin: { tx, ty }, playerId, mapData: map, underConstruction });
  return { map, world, players, landmarks, landmarkOf };
}

beforeEach(() => resetUiStore());

describe('landmark activity (M17)', () => {
  it('a modifier holds only while the landmark stands finished: not as a site, not once destroyed', () => {
    const { world, players, landmarks, landmarkOf, map } = setup('german');
    const german = players.get(1)!;
    const site = landmarkOf(1, true);
    landmarks.update(16);
    expect(hasActiveLandmark(world, 1)).toBe(false);
    expect(german.landmarkActive).toBe(false);
    expect(tradeGoldMultiplier(german)).toBe(1);

    // Finished by its builder (one villager beside the footprint, the last second of work).
    const builder = createUnit(world, { type: 'villager', tile: { tx: 9, ty: 10 }, playerId: 1 });
    world.addComponent(builder, 'buildCommand', { targetId: site.id! });
    site.underConstruction!.elapsed = site.underConstruction!.totalTime - 0.5;
    new ConstructionSystem(world, map, undefined, players).update(1000);
    expect(site.underConstruction).toBeUndefined();
    landmarks.update(16);
    expect(german.landmarkActive).toBe(true);
    expect(tradeGoldMultiplier(german)).toBeCloseTo(1 + LANDMARK.tradeGold);

    // Destroyed (collapsing): the bonus is gone at once.
    world.addComponent(site, 'dying', { ttlMs: 1000 });
    landmarks.update(16);
    expect(hasActiveLandmark(world, 1)).toBe(false);
    expect(tradeGoldMultiplier(german)).toBe(1);
    // Removed from the world entirely: still none.
    world.remove(site);
    landmarks.update(16);
    expect(german.landmarkActive).toBe(false);
  });

  it("only the owner's civ effect applies: an English landmark speeds the English dock, nobody else's", () => {
    const { players, landmarks, landmarkOf } = setup('english', ['german']);
    landmarkOf(1);
    landmarkOf(2, false, 20, 20);
    landmarks.update(16);
    const english = players.get(1)!;
    const german = players.get(2)!;
    expect(trainSpeedMultiplier(english, 'dock')).toBeCloseTo(1 + LANDMARK.dockTrainSpeed);
    expect(trainSpeedMultiplier(english, 'barracks')).toBe(1);
    expect(trainSpeedMultiplier(german, 'dock')).toBe(1);
    expect(tradeGoldMultiplier(german)).toBeCloseTo(1 + LANDMARK.tradeGold);
    expect(tradeGoldMultiplier(english)).toBe(1);
  });

  it('the French Akadémia makes research 25 % faster', () => {
    const { world, map, players, landmarks, landmarkOf } = setup('french');
    const smith = createBuilding(world, { type: 'blacksmith', origin: { tx: 20, ty: 20 }, playerId: 1, mapData: map });
    world.addComponent(smith, 'research', { techId: 'armor_1', elapsed: 0, totalTime: 10 });
    const research = new ResearchSystem(world, players);
    research.update(1000);
    expect(smith.research!.elapsed).toBeCloseTo(1);
    landmarkOf(1);
    landmarks.update(16);
    expect(researchSpeedMultiplier(players.get(1)!)).toBeCloseTo(1 + LANDMARK.researchSpeed);
    research.update(1000);
    expect(smith.research!.elapsed).toBeCloseTo(2 + LANDMARK.researchSpeed);
  });

  it('the English Királyi hajógyár trains at the dock 33 % faster (other trainers unchanged)', () => {
    const map = new MapData(40, 40, TERRAIN.grass);
    for (let ty = 0; ty < 40; ty++) for (let tx = 30; tx < 40; tx++) map.setTile(tx, ty, TERRAIN.water);
    const world = createEcsWorld();
    const players = createPlayers('english', ['german']);
    const landmarks = new LandmarkSystem(world, players);
    const dock = createBuilding(world, { type: 'dock', origin: { tx: 27, ty: 10 }, playerId: 1, mapData: map });
    const barracks = createBuilding(world, { type: 'barracks', origin: { tx: 10, ty: 20 }, playerId: 1, mapData: map });
    dock.trainingQueue!.entries.push({ unitType: 'fishing_boat', elapsed: 0, totalTime: 100 });
    barracks.trainingQueue!.entries.push({ unitType: 'swordsman', elapsed: 0, totalTime: 100 });
    createBuilding(world, { type: 'landmark', origin: { tx: 10, ty: 10 }, playerId: 1, mapData: map });
    landmarks.update(16);
    new TrainingSystem(world, map, players).update(1000);
    expect(dock.trainingQueue!.entries[0]!.elapsed).toBeCloseTo(1 + LANDMARK.dockTrainSpeed);
    expect(barracks.trainingQueue!.entries[0]!.elapsed).toBeCloseTo(1);
  });

  it('the Italian Bankház halves the sell fee and slows the price move (Task 1 market math)', () => {
    const { world, players, landmarks, landmarkOf } = setup('italian');
    const italian = players.get(1)!;
    italian.resources = { food: 1000, wood: 1000, gold: 1000 };
    const wallet = playerWallet(italian);
    const plainWallet = playerWallet(players.get(2)!);
    expect(sellPrice(italian, 'food')).toBe(Math.round(100 * (1 - MARKET.sellFee)));
    landmarkOf(1);
    landmarks.update(16);
    expect(sellPrice(italian, 'food')).toBe(Math.round(100 * (1 - MARKET.sellFee * LANDMARK.marketRate.feeMul)));
    expect(marketBuy(italian, wallet, 'wood').ok).toBe(true);
    expect(italian.marketPrices.wood).toBeCloseTo(100 * (1 + MARKET.step * LANDMARK.marketRate.stepMul));
    expect(marketSell(italian, wallet, 'food').ok).toBe(true);
    expect(italian.marketPrices.food).toBeCloseTo(100 * (1 - MARKET.step * LANDMARK.marketRate.stepMul));
    // Another civ's player keeps the base terms.
    const english = players.get(2)!;
    expect(marketBuy(english, plainWallet, 'wood').ok).toBe(true);
    expect(english.marketPrices.wood).toBeCloseTo(100 * (1 + MARKET.step));
    expect(buyPrice(english, 'food')).toBe(100);
    // The Bankház falls: base terms again.
    world.remove(world.entities.find((e) => e.building?.type === 'landmark')!);
    landmarks.update(16);
    expect(sellPrice(italian, 'wood')).toBe(Math.round(italian.marketPrices.wood * (1 - MARKET.sellFee)));
  });
});

describe('fort landmarks (Végvár, Osztrog)', () => {
  const fortScene = (civ: CivId, allies = 0, treaty = false) => {
    const s = setup(civ, ['english', 'german'], allies);
    const fort = s.landmarkOf(1);
    const towers = new TowerCombatSystem(s.world, () => null, s.players, () => treaty);
    const combat = new CombatSystem(s.world, s.map, s.players, undefined, () => treaty);
    return { ...s, fort, towers, combat };
  };

  it('a finished Hungarian fort gains the fort attacker and shoots the nearest enemy in range, from its centre', () => {
    const { world, landmarks, fort, towers, combat } = fortScene('hungarian');
    landmarks.update(16);
    expect(fort.attacker?.pierceAtk).toBe(LANDMARK.fort.pierce);
    expect(fort.attacker?.range).toBe(LANDMARK.fort.range);
    expect(LANDMARK.fort.pierce).toBeGreaterThan(TOWER_ATTACK.pierce);
    expect(LANDMARK.fort.range).toBeGreaterThan(TOWER_ATTACK.range);
    expect(isShootingBuilding(fort)).toBe(true);
    // Centre (11, 11): 7 tiles east is in range, 8 is not.
    const far = createUnit(world, { type: 'swordsman', tile: { tx: 19, ty: 11 }, playerId: 3 });
    towers.update(300);
    expect(fort.attackIntent).toBeUndefined();
    const near = createUnit(world, { type: 'swordsman', tile: { tx: 18, ty: 11 }, playerId: 3 });
    towers.update(300);
    expect(fort.attackIntent?.targetId).toBe(near.id);
    expect(far.id).not.toBe(near.id);
    combat.update(16);
    const shot = world.entities.find((e) => e.projectile);
    expect(shot?.projectile?.kind).toBe('arrow');
    expect(shot?.projectile?.from).toEqual({ x: 11, y: 11 });
    expect(shot?.projectile?.payload.pierceAtk).toBe(LANDMARK.fort.pierce);
  });

  it('the Russian Osztrog is a fort too; a non-fort landmark never shoots', () => {
    const russian = fortScene('russian');
    russian.landmarks.update(16);
    expect(russian.fort.attacker).toBeDefined();
    const french = fortScene('french');
    french.landmarks.update(16);
    expect(french.fort.attacker).toBeUndefined();
    expect(isShootingBuilding(french.fort)).toBe(false);
    createUnit(french.world, { type: 'swordsman', tile: { tx: 13, ty: 11 }, playerId: 3 });
    french.towers.update(300);
    expect(french.fort.attackIntent).toBeUndefined();
  });

  it('a fort under construction does not shoot', () => {
    const s = setup('hungarian', ['english']);
    const site = s.landmarkOf(1, true);
    s.landmarks.update(16);
    createUnit(s.world, { type: 'swordsman', tile: { tx: 14, ty: 11 }, playerId: 2 });
    new TowerCombatSystem(s.world, () => null, s.players).update(300);
    expect(site.attacker).toBeUndefined();
    expect(site.attackIntent).toBeUndefined();
  });

  it('respects teams (an ally is never a target) and the treaty (no target while it holds)', () => {
    const allied = fortScene('hungarian', 1);
    allied.landmarks.update(16);
    createUnit(allied.world, { type: 'swordsman', tile: { tx: 14, ty: 11 }, playerId: 2 });
    allied.towers.update(300);
    expect(allied.fort.attackIntent).toBeUndefined();
    const enemy = createUnit(allied.world, { type: 'swordsman', tile: { tx: 15, ty: 11 }, playerId: 3 });
    allied.towers.update(300);
    expect(allied.fort.attackIntent?.targetId).toBe(enemy.id);

    const truce = fortScene('hungarian', 0, true);
    truce.landmarks.update(16);
    createUnit(truce.world, { type: 'swordsman', tile: { tx: 14, ty: 11 }, playerId: 3 });
    truce.towers.update(300);
    expect(truce.fort.attackIntent).toBeUndefined();
  });
});

describe('Finnish Szauna', () => {
  it('heals every own wounded land unit within range, and nobody else', () => {
    const { world, map, players, landmarks, landmarkOf } = setup('finnish', ['english', 'german'], 1);
    landmarkOf(1);
    const unit = (tx: number, ty: number, playerId = 1, type: 'swordsman' | 'galley' = 'swordsman') => {
      const u = createUnit(world, { type, tile: { tx, ty }, playerId });
      u.health!.current = 10;
      return u;
    };
    const a = unit(9, 9);
    const b = unit(16, 12); // 4 tiles east of the footprint (10..12)
    const out = unit(17, 12); // 5 tiles
    const ally = unit(14, 10, 2);
    const enemy = unit(14, 11, 3);
    const house = createBuilding(world, { type: 'house', origin: { tx: 7, ty: 13 }, playerId: 1, mapData: map });
    house.health!.current = 100;
    for (let i = 0; i < 10; i++) landmarks.update(100); // 1 s
    expect(a.health!.current).toBe(10 + LANDMARK.sauna.healPerSec);
    expect(b.health!.current).toBe(10 + LANDMARK.sauna.healPerSec);
    expect(out.health!.current).toBe(10);
    expect(ally.health!.current).toBe(10);
    expect(enemy.health!.current).toBe(10);
    expect(house.health!.current).toBe(100);
    expect(players.get(1)!.landmarkCarry).toBeLessThan(1);
  });

  it('heals nothing while unfinished, and never above the maximum', () => {
    const { world, landmarks, landmarkOf } = setup('finnish');
    const site = landmarkOf(1, true);
    const u = createUnit(world, { type: 'swordsman', tile: { tx: 9, ty: 9 }, playerId: 1 });
    u.health!.current = u.health!.max - 1;
    landmarks.update(5000);
    expect(u.health!.current).toBe(u.health!.max - 1);
    world.removeComponent(site, 'underConstruction');
    landmarks.update(5000);
    expect(u.health!.current).toBe(u.health!.max);
  });
});

describe('Spanish Pénzverde', () => {
  it('credits LANDMARK.mintGoldPerMin gold per minute as gathered income: the human into the UI wallet', () => {
    const { players, landmarks, landmarkOf } = setup('spanish');
    const human = players.get(1)!;
    const goldBefore = uiStore.getState().resources.gold;
    const playerBefore = human.resources.gold;
    let delivered = 0;
    const off = gameEvents.on('resourcesDelivered', (e) => {
      if (e.playerId === 1) delivered += e.amount;
    });
    landmarkOf(1);
    for (let i = 0; i < 600; i++) landmarks.update(100); // one minute
    off();
    expect(uiStore.getState().resources.gold - goldBefore).toBe(LANDMARK.mintGoldPerMin);
    expect(human.resources.gold - playerBefore).toBe(LANDMARK.mintGoldPerMin);
    expect(delivered).toBe(LANDMARK.mintGoldPerMin);
  });

  it('an AI mint fills Player.resources; fractions carry over (saved landmarkCarry), nothing unfinished', () => {
    const { world, players, landmarks, landmarkOf } = setup('hungarian', ['spanish']);
    const ai = players.get(2)!;
    const site = landmarkOf(2, true);
    landmarks.update(60_000);
    expect(ai.resources.gold).toBe(100);
    world.removeComponent(site, 'underConstruction');
    landmarks.update(1000); // 0.5 gold
    expect(ai.resources.gold).toBe(100);
    expect(ai.landmarkCarry).toBeCloseTo(0.5);
    landmarks.update(1000);
    expect(ai.resources.gold).toBe(101);
    expect(ai.landmarkCarry).toBeCloseTo(0);
    landmarks.update(58_000);
    expect(ai.resources.gold).toBe(100 + LANDMARK.mintGoldPerMin);
  });
});
