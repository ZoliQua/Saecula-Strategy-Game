import type { UnitType } from '../../../../types';
import type { UnitLook } from '../looks';
import { M } from '../materials';
import { HUNGARIAN_M } from './hungarianMaterials';

const H = HUNGARIAN_M;

/**
 * Hungarian unit looks (M8): the base look is the Hungarian look, so
 * only the unique unit overrides it. The hussar (in the knight's slot)
 * rides unarmoured: tall fur kalpag with a heron plume, team dolman
 * under white frogging, a team pelisse slung over the shoulder, sabre,
 * yellow boots, and a grey horse under a team saddle cloth (the
 * Hungarian light cavalry rides a dark bay, the scout a bay).
 */
export const HUNGARIAN_LOOKS: Readonly<Partial<Record<UnitType, UnitLook>>> = {
  hussar: {
    kind: 'rider',
    human: {
      hat: 'kalpag',
      body: H.dolman,
      skirt: { mat: H.dolman, length: 3 },
      sleeves: H.dolman,
      legs: H.breeches,
      boots: H.csizma,
      highBoots: true,
      belt: H.sash,
      back: 'mente',
      weapon: 'sabre',
    },
    horse: { coat: M.horse.grey, mane: M.horse.lightMane, saddleCloth: true },
  },
};
