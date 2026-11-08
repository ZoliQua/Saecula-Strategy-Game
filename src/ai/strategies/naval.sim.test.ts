import { describe, expect, it } from 'vitest';
import { createBuilding } from '../../ecs/archetypes/building';
import { isShoreSite } from '../../game/shore';
import { createRng } from '../../map/random';
import { createHeadlessMatch } from '../testing/headlessMatch';
import { MediumStrategy } from './MediumStrategy';

const MIN = 60_000;
const SIM_TIMEOUT_MS = 400_000;

/*
 * M14: on Beltenger a Medium AI builds a dock, fishes and keeps a fleet; on
 * Szigetvilág (every start on its own island) a Medium AI lands its army on
 * the other island from transports.
 */
describe('Medium AI navy (M14)', () => {
  it(
    'Beltenger: builds a dock, fishes (a school runs down) and keeps galleys',
    () => {
      const match = createHeadlessMatch({
        seed: 5,
        size: 96,
        template: 'inland_sea',
        aiCount: 1,
        strategy: () => new MediumStrategy(createRng(5 * 31 + 2)),
        difficulty: () => 'medium',
      });
      const own = (type: string) => match.world.entities.filter((e) => e.unit?.unitType === type && e.owner?.playerId === 2 && !e.dying);
      const fished = () => match.world.entities.some((e) => e.resourceNode?.sea && e.resourceNode.amount < e.resourceNode.maxAmount);
      let doneAt = Infinity;
      match.run(30 * MIN, 100, (t) => {
        if (own('fishing_boat').length === 0 || own('galley').length === 0 || !fished()) return;
        doneAt = t;
        return true;
      });
      expect(match.world.entities.some((e) => e.building?.type === 'dock' && e.owner?.playerId === 2)).toBe(true);
      expect(doneAt, 'fishing boats at work and a galley within 30 min').toBeLessThan(30 * MIN);
    },
    SIM_TIMEOUT_MS,
  );

  it(
    'Szigetvilág: a Medium AI lands an army on the other island',
    () => {
      const match = createHeadlessMatch({
        seed: 2,
        size: 96,
        template: 'archipelago',
        aiCount: 1,
        strategy: () => new MediumStrategy(createRng(2 * 31 + 2)),
        difficulty: () => 'medium',
      });
      // Player 1's island: the tiles nearer to its start than to player 2's.
      const tc1 = match.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 1)!;
      const tc2 = match.world.entities.find((e) => e.building?.type === 'town_center' && e.owner?.playerId === 2)!;
      const onEnemyIsland = (p: { tx: number; ty: number }) =>
        Math.hypot(p.tx - tc1.position!.tx, p.ty - tc1.position!.ty) < Math.hypot(p.tx - tc2.position!.tx, p.ty - tc2.position!.ty) &&
        match.map.isPassable(p.tx, p.ty);
      // The (passive) human has a dock on its shore facing the AI, as a real player on islands would:
      // the AI's galleys find it while they explore the sea.
      const map = match.map;
      let site: { tx: number; ty: number } | null = null;
      let best = Infinity;
      for (let ty = 1; ty < map.height - 3; ty++) {
        for (let tx = 1; tx < map.width - 3; tx++) {
          if (!onEnemyIsland({ tx, ty }) || !isShoreSite(map, { tx, ty }, 3, 3)) continue;
          let free = true;
          for (let y = 0; y < 3; y++) for (let x = 0; x < 3; x++) free &&= map.isBuildable(tx + x, ty + y);
          const d = Math.hypot(tx - tc2.position!.tx, ty - tc2.position!.ty);
          if (free && d < best) {
            best = d;
            site = { tx, ty };
          }
        }
      }
      createBuilding(match.world, { type: 'dock', origin: site!, playerId: 1, mapData: map });
      let landedAt = Infinity;
      match.run(45 * MIN, 100, (t) => {
        const landed = match.world.entities.some((e) => e.unit && e.owner?.playerId === 2 && !e.dying && e.position && e.unit.unitType !== 'fishing_boat' && onEnemyIsland(e.position));
        if (!landed) return;
        landedAt = t;
        return true;
      });
      expect(match.world.entities.some((e) => e.unit?.unitType === 'transport' && e.owner?.playerId === 2) || landedAt < Infinity).toBe(true);
      expect(landedAt, 'AI units ashore on the enemy island within 45 min').toBeLessThan(45 * MIN);
      // The landed wave fights on there: it is not called home across the sea.
      match.run(3 * MIN, 100);
      const ashore = match.world.entities.filter((e) => e.unit && e.owner?.playerId === 2 && !e.dying && e.position && e.attacker && onEnemyIsland(e.position));
      expect(ashore.length + match.stats.of(2).killValue).toBeGreaterThan(0);
      const headed = (u: (typeof ashore)[number]) => u.moveIntent?.target ?? u.movable?.path.at(-1);
      expect(ashore.every((u) => !headed(u) || onEnemyIsland(headed(u)!))).toBe(true);
    },
    SIM_TIMEOUT_MS,
  );
});
