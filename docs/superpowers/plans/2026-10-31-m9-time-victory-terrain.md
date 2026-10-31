# M9 — Time victory and a mid terrain resolution level

Scope: CLAUDE.md §9 M9. Branch `feat/M9-time-victory-terrain`, version 0.4.0.

## Decisions

1. **Victory modes** stay a string union (saves keep their meaning):
   `conquest`, `conquest_wonder` (default), `conquest_time`, `all`.
   Helpers `hasWonderVictory(mode)` / `hasTimeVictory(mode)` replace every
   `=== 'conquest_wonder'` check.
2. **Rule:** at `gameTimeMs >= TIME_VICTORY.limitMs` (3 600 000) the
   standing player with the highest score wins; ties → higher `killValue`,
   then lower player id. Order in one check: conquest, Wonder, time.
3. **VictoryChecker** gains an optional `time` option
   `{ limitMs, now(), scoreOf(id), killValueOf(id) }`; cause `'time'`.
   `decidedWinner` treats `'time'` like `'wonder'` (the winner is known).
4. **HUD:** `uiStore.timeLimit: { remainingMs, leaderId, leaderColor } | null`,
   written by `HudSync` once a second; `TimeLimitClock` panel under the clock,
   `final` class in the last `TIME_VICTORY.holdLeadMs`.
5. **AI:** `AIContext.timeVictory?: { remainingMs, leaderId }`. The leader is
   computed from public scores (the score panel). `ArmyControl.launchWave`
   and the Master flank launch return early when `holdsLead(ctx)`.
6. **Save:** `schemaVersion` 4, `v3ToV4` is the identity (the enum widened);
   tested with a real v3 fixture written by the v3 serializer.
7. **Terrain:** `chunkWants` returns `want: 'full' | 'mid' | 'half' | 'none'`
   plus `keepMid`. Sharp zoom (≥ `midZoom`, 0.97) → full near the view;
   `lodZoom ≤ zoom < midZoom` → mid near the view; below `lodZoom` → half.
   The half ring around the view is unchanged. `ChunkStreamer` treats levels
   as an ordered list (full > mid > half); a sharper texture is dropped only
   once a coarser resident one can replace it (never a hole).
8. **Measurement:** the M5–M8 scripts are not in the repo, so a new script
   (Playwright, dev server, texture manager sum) measures `main` and the
   branch with the same protocol; the delta is what is reported.

## Tasks

1. CLAUDE.md M9 + this plan (docs commit).
2. Victory modes, `TIME_VICTORY`, VictoryChecker, match record cause, schema v4 + migration (tests first).
3. HUD clock, game-over texts, AI hold-lead (tests first).
4. Mid terrain level in `chunkPlan` / `ChunkStreamer` (tests first), browser measurement.
5. CHANGELOG / README (en + hu), CLAUDE status line, `package.json` 0.4.0, PR.
