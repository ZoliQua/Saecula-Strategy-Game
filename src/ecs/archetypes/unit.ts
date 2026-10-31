import { gameSpeed, UNIT_BALANCE, type UnitBalance } from '../../config/balance';
import type { BuildingType, UnitType } from '../../types';

export interface UnitSpec {
  readonly type: UnitType;
  readonly cost: { food: number; wood: number; gold: number };
  readonly trainTime: number;
  /** Buildings that can train this unit. */
  readonly trainers: readonly BuildingType[];
  readonly populationCost: number;
  readonly maxHp: number;
  /** Tiles per second (table speed x SPEED_SCALE). */
  readonly speed: number;
  /** Total displayed attack (melee + pierce); 0 = can't fight. */
  readonly damage: number;
  /** Tile range for attacks; 1 = melee. */
  readonly range: number;
  readonly textureKey: string;
  /** Full stat block from config/balance.ts. */
  readonly balance: UnitBalance;
}

const TEXTURE_KEYS: Record<UnitType, string> = {
  villager: 'villager_placeholder',
  scout: 'unit_scout',
  swordsman: 'unit_swordsman',
  archer: 'unit_archer',
  knight: 'unit_knight',
  pikeman: 'unit_pikeman',
  crossbowman: 'unit_crossbowman',
  musketeer: 'unit_musketeer',
  cannon: 'unit_cannon',
  cavalry: 'unit_cavalry',
  hussar: 'unit_hussar',
  longbowman: 'unit_longbowman',
  landsknecht: 'unit_landsknecht',
  mousquetaire: 'unit_mousquetaire',
  conquistador: 'unit_conquistador',
  legionary: 'unit_legionary',
  cossack: 'unit_cossack',
  sissi: 'unit_sissi',
};

function toSpec(type: UnitType): UnitSpec {
  const b = UNIT_BALANCE[type];
  return {
    type,
    cost: b.cost,
    trainTime: b.trainTime,
    trainers: b.trainers,
    populationCost: b.popCost,
    maxHp: b.hp,
    speed: gameSpeed(b.speed),
    damage: b.meleeAtk + b.pierceAtk,
    range: b.range,
    textureKey: TEXTURE_KEYS[type],
    balance: b,
  };
}

export const UNIT_SPECS: Record<UnitType, UnitSpec> = Object.fromEntries(
  (Object.keys(UNIT_BALANCE) as UnitType[]).map((t) => [t, toSpec(t)]),
) as Record<UnitType, UnitSpec>;
