import { HILL } from '../config/balance';
import type { CivId } from '../types';
import type { HillState } from './hill';
import { playerColor, type Player } from './Player';
import type { PlayerManager } from './PlayerManager';
import type { TileCoord } from '../iso/coordinates';

/* The public face of King of the Hill (M19): what the marker, the minimap and the HUD show. */

export type HillStatus = 'empty' | 'held' | 'contested';

/** The hill at a glance: `color` is the holder's, null while nobody holds it. */
export interface HillLook {
  readonly status: HillStatus;
  readonly color: number | null;
}

/** One team's clock. */
export interface HillClockRow {
  readonly team: number;
  /** Who stands for the team: its lowest-id standing player (its lowest id once all are out). */
  readonly playerId: number;
  readonly civ: CivId;
  readonly color: number;
  /** The human's team. */
  readonly own: boolean;
  readonly holder: boolean;
  /** Nobody of the team stands: its clock can win nothing. */
  readonly out: boolean;
  /** Time left to HILL.holdMs. */
  readonly remainingMs: number;
}

export interface HillClocksInfo extends HillLook {
  readonly centre: TileCoord;
  /** Who holds it, seen from the human's team. */
  readonly holder: 'own' | 'other' | null;
  readonly teams: boolean;
  /** The treaty: presence shows, the clocks stand still. */
  readonly waiting: boolean;
  /** Leading first, the teams that are out last. */
  readonly rows: readonly HillClockRow[];
}

function teamLead(players: Pick<PlayerManager, 'all'>, team: number): Player | undefined {
  const members = players.all().filter((p) => p.team === team);
  return members.find((p) => !p.defeated) ?? members[0];
}

export function hillLook(hill: Pick<HillState, 'holderTeam' | 'contested'>, players: Pick<PlayerManager, 'all'>): HillLook {
  if (hill.contested) return { status: 'contested', color: null };
  const lead = hill.holderTeam === null ? undefined : teamLead(players, hill.holderTeam);
  return lead ? { status: 'held', color: playerColor(lead.id) } : { status: 'empty', color: null };
}

/** The HUD's hill: every team with a clock, plus the human's and the holder's. Public, whatever the fog. */
export function hillClocks(hill: HillState, players: PlayerManager, waiting: boolean): HillClocksInfo {
  const look = hillLook(hill, players);
  const ownTeam = players.human()?.team;
  const holderTeam = look.status === 'held' ? hill.holderTeam : null;
  const rows: HillClockRow[] = [];
  for (const team of new Set(players.all().map((p) => p.team))) {
    const held = hill.heldMs[team] ?? 0;
    const own = team === ownTeam;
    if (held <= 0 && !own && team !== holderTeam) continue;
    const lead = teamLead(players, team);
    if (!lead) continue;
    rows.push({
      team,
      playerId: lead.id,
      civ: lead.civ,
      color: playerColor(lead.id),
      own,
      holder: team === holderTeam,
      out: lead.defeated,
      remainingMs: Math.max(0, HILL.holdMs - held),
    });
  }
  rows.sort((a, b) => Number(a.out) - Number(b.out) || a.remainingMs - b.remainingMs || a.team - b.team);
  return {
    ...look,
    centre: { tx: hill.centre.tx, ty: hill.centre.ty },
    holder: holderTeam === null ? null : holderTeam === ownTeam ? 'own' : 'other',
    teams: players.hasTeams(),
    waiting,
    rows,
  };
}

/** Whether two snapshots show the same (the HUD updates only on change). */
export function sameHillClocks(a: HillClocksInfo | null, b: HillClocksInfo | null): boolean {
  if (a === null || b === null) return a === b;
  return (
    a.status === b.status &&
    a.color === b.color &&
    a.holder === b.holder &&
    a.waiting === b.waiting &&
    a.centre.tx === b.centre.tx &&
    a.centre.ty === b.centre.ty &&
    a.rows.length === b.rows.length &&
    a.rows.every((r, i) => {
      const q = b.rows[i];
      return q !== undefined && q.team === r.team && q.playerId === r.playerId && q.holder === r.holder && q.out === r.out && q.remainingMs === r.remainingMs;
    })
  );
}
