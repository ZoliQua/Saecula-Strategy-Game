import { SCORE_BALANCE } from '../config/balance';
import type { EcsWorld } from '../ecs/world';
import { gameEvents } from '../game/events';
import { houseBonus } from '../game/modifiers';
import type { PlayerManager } from '../game/PlayerManager';
import { computePopulation } from '../game/population';
import type { AgeId } from '../types';
import { score, victimValue } from './score';

/** One player's running match statistics (M7 Decision 8). */
export interface PlayerMatchStats {
  /** Resources delivered, all types summed. */
  gathered: number;
  /** Cost of the enemy units and buildings this player destroyed. */
  killValue: number;
  unitsTrained: number;
  unitsLost: number;
  buildingsBuilt: number;
  /** Buildings destroyed by an enemy (a voluntary delete is not a loss). */
  buildingsLost: number;
  /** Game time each later age was reached at, in order (age 2, then 3). */
  ageUpAtMs: number[];
}

/** A timeline point: every player's score and population, in player id order. */
export interface TimelineSample {
  tMs: number;
  scores: number[];
  pops: number[];
}

/** What a save keeps of the statistics (JSON-safe). */
export interface MatchStatsSnapshot {
  /** By player id in decimal. */
  players: Record<string, PlayerMatchStats>;
  timeline: TimelineSample[];
}

/** Fresh counters. */
export function zeroStats(): PlayerMatchStats {
  return { gathered: 0, killValue: 0, unitsTrained: 0, unitsLost: 0, buildingsBuilt: 0, buildingsLost: 0, ageUpAtMs: [] };
}

const copyStats = (s: PlayerMatchStats): PlayerMatchStats => ({ ...s, ageUpAtMs: [...s.ageUpAtMs] });

/**
 * The match statistics of every player: counted from the stats events
 * of this match's world (gameEvents, while attached), the players' ages
 * (read each update) and a score / population sample every
 * SCORE_BALANCE.sampleMs of game time. Kill credit goes to the killer's
 * owner; Gaia victims and a player's own losses give none.
 */
export class MatchStats {
  private readonly byId = new Map<number, PlayerMatchStats>();
  private samples: TimelineSample[] = [];
  private clockMs: number;
  private nextSampleMs: number;
  /** The age each player was last seen in (ages reached before a load are not re-dated). */
  private readonly seenAge = new Map<number, AgeId>();

  /** `startMs`: the match clock now (a loaded save's game time). */
  constructor(
    private readonly world: EcsWorld,
    private readonly players: PlayerManager,
    startMs = 0,
  ) {
    this.clockMs = startMs;
    this.nextSampleMs = (Math.floor(startMs / SCORE_BALANCE.sampleMs) + 1) * SCORE_BALANCE.sampleMs;
    for (const p of players.all()) {
      this.byId.set(p.id, zeroStats());
      this.seenAge.set(p.id, p.age);
    }
  }

  /** Starts counting this world's events; returns the unsubscribe. */
  attach(): () => void {
    const mine = (w: EcsWorld): boolean => w === this.world;
    const offs = [
      gameEvents.on('resourcesDelivered', (e) => {
        if (mine(e.world)) this.edit(e.playerId, (s) => (s.gathered += e.amount));
      }),
      gameEvents.on('unitTrained', (e) => {
        if (mine(e.world)) this.edit(e.playerId, (s) => s.unitsTrained++);
      }),
      gameEvents.on('buildingCompleted', (e) => {
        if (mine(e.world)) this.edit(e.playerId, (s) => s.buildingsBuilt++);
      }),
      gameEvents.on('entityKilled', (e) => {
        if (!mine(e.world) || e.victimOwnerId === 0) return;
        this.edit(e.victimOwnerId, (s) => (e.buildingType ? s.buildingsLost++ : s.unitsLost++));
        if (e.killerId !== null && e.killerId !== e.victimOwnerId && e.killerId !== 0) {
          this.edit(e.killerId, (s) => (s.killValue += victimValue(e)));
        }
      }),
    ];
    return () => offs.forEach((off) => off());
  }

  /** Advances the match clock: dates age-ups and takes the timeline samples that fall due. */
  update(deltaMs: number): void {
    this.clockMs += deltaMs;
    for (const p of this.players.all()) {
      const seen = this.seenAge.get(p.id) ?? p.age;
      if (p.age > seen) for (let a = seen; a < p.age; a++) this.edit(p.id, (s) => s.ageUpAtMs.push(this.clockMs));
      this.seenAge.set(p.id, p.age);
    }
    while (this.clockMs >= this.nextSampleMs) {
      this.samples.push(this.sample(this.nextSampleMs));
      this.nextSampleMs += SCORE_BALANCE.sampleMs;
    }
  }

  /** `playerId`'s counters (zeroed for an unknown id). */
  of(playerId: number): Readonly<PlayerMatchStats> {
    return this.byId.get(playerId) ?? zeroStats();
  }

  /** `playerId`'s score now. */
  scoreOf(playerId: number): number {
    const p = this.players.get(playerId);
    return p ? score(p, this.of(playerId), this.world) : 0;
  }

  /** Score and population samples, oldest first. */
  get timeline(): readonly TimelineSample[] {
    return this.samples;
  }

  snapshot(): MatchStatsSnapshot {
    const players: Record<string, PlayerMatchStats> = {};
    for (const [id, s] of this.byId) players[String(id)] = copyStats(s);
    return { players, timeline: this.samples.map((t) => ({ tMs: t.tMs, scores: [...t.scores], pops: [...t.pops] })) };
  }

  /** Replaces the counters and timeline with a saved snapshot (deep-copied). */
  restore(snapshot: MatchStatsSnapshot): void {
    for (const [id, s] of Object.entries(snapshot.players)) this.byId.set(Number(id), copyStats(s));
    this.samples = snapshot.timeline.map((t) => ({ tMs: t.tMs, scores: [...t.scores], pops: [...t.pops] }));
  }

  private edit(playerId: number, change: (s: PlayerMatchStats) => void): void {
    // Only the match's players are counted (a save keys its stats by them).
    const s = this.byId.get(playerId);
    if (s) change(s);
  }

  private sample(tMs: number): TimelineSample {
    const all = this.players.all();
    const owners = this.world.with('owner');
    return {
      tMs,
      scores: all.map((p) => this.scoreOf(p.id)),
      pops: all.map((p) => computePopulation(owners, p.id, houseBonus(p)).current),
    };
  }
}
