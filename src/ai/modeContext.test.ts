import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEcsWorld } from '../ecs/world';
import { createHill } from '../ecs/archetypes/hill';
import { createPlayers } from '../game/PlayerManager';
import { MapData } from '../map/MapData';
import { aiModeContext } from './modeContext';

describe('what the AIs are told of the mode (M19)', () => {
  it('nothing outside the two modes', () => {
    expect(aiModeContext(createEcsWorld(), createPlayers('hungarian', ['english']), false)).toEqual({});
  });

  it('that it is Regicide', () => {
    expect(aiModeContext(createEcsWorld(), createPlayers('hungarian', ['english']), true)).toEqual({ regicide: true });
  });

  it("the hill's public state and the teams still standing", () => {
    const world = createEcsWorld();
    const players = createPlayers('hungarian', ['english', 'german']);
    createHill(world, new MapData(32, 32), { tx: 16, ty: 16 });
    players.get(3)!.defeated = true;
    const { hill } = aiModeContext(world, players, false);
    expect(hill).toMatchObject({ centre: { tx: 16, ty: 16 }, heldMs: {}, holderTeam: null, contested: false });
    expect([...hill!.standingTeams]).toEqual([1, 2]);
  });

  // SystemRunner needs a live scene, so its wiring is pinned in the source (as SystemRunner.hill.test.ts does).
  it('the live runner hands it to every AI, as the headless match does', () => {
    const live = readFileSync(new URL('../scenes/game/SystemRunner.ts', import.meta.url), 'utf8');
    const headless = readFileSync(new URL('./testing/headlessMatch.ts', import.meta.url), 'utf8');
    expect(live).toContain('...aiModeContext(this.world, this.players, this.regicide)');
    expect(headless).toContain('...aiModeContext(world, players, regicide)');
  });
});
