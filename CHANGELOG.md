# Changelog

**English** · [Magyar](CHANGELOG.hu.md)

All notable changes to Saecula are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/). Before 1.0, a new milestone
or larger feature set raises the minor version and a release with only fixes
raises the patch version.

## [Unreleased]

### Added

- **Market:** a new age-2 building. Buy or sell 100 food or wood for gold;
  each trade moves that resource's price, and selling costs a fee. It trains
  trade carts.
- **Trade carts and trade ships:** send them between two of your own or an
  ally's markets (docks for ships) at least 20 tiles apart; each arrival pays
  gold by distance, more toward an ally. A trade ship looks like a transport.
- **Landmarks:** every nation can raise one landmark from age 2 with its own
  art and effect — Hungarian Végvár and Russian Osztrog shoot like strong
  towers, the English Royal Dockyard trains ships faster, the German Hanseatic
  Kontor raises trade gold, the French Academy speeds up research (not
  age-ups), the Spanish Mint makes gold, the Italian Bank improves market
  rates, and the Finnish Sauna heals nearby units.
- The Medium, Hard and Master AIs build a market and their landmark, sell
  surplus for gold, and trade with an ally's market.
- Saves move to version 11.

- **Teams:** choose up to `AI count − 1` allied AIs on the setup card. Allies
  never fight or convert each other, share their vision, and win or lose as a
  team (conquest, Wonder and time victory count the team). Allied AIs attack
  the enemy team; the score panel and the game-over card mark allies.
- **Treaty:** an optional 10- or 20-minute treaty. Until it ends, players of
  different teams cannot hurt or convert each other, the AIs launch no attack,
  and an attack order becomes a move. A countdown shows under the clock.
- **Starting resources:** normal (200 food, 200 wood, 100 gold), high or
  deathmatch.
- **Game speed:** 1×, 1.5× or 2× game time; camera scrolling stays at real
  speed.
- Saves move to version 10; older saves load with the new options at their
  defaults.

- **Lost graphics safeguard:** if the browser takes back the game's graphics
  memory (a lost WebGL context), the running match stops and is saved to
  the autosave slot, a card explains what happened, and "Reload and
  continue" picks the match up where it stopped.

### Changed

- **Texture budget:** 256 MB on land maps as before, 400 MB on maps with sea,
  where every nation's ships may be on screen (owner's decision).

### Fixed

- **Medium, Hard and Master AIs on water maps** found their dock at 8
  villagers instead of 10. The opening raid's hold stopped villager training
  at about 9, so the dock came only after the raids, and water games were
  decided by who happened to have one.

### For developers

- A test loads, plays on and re-saves a real save of every save version
  (1–9).
- Perf scripts: the `naval6` scenario (128×128 Szigetvilág, six players),
  `--ships`, the per-map texture budget check and `contextlost.mjs`.

## [0.9.2] — 2026-11-08

Small fixes.

### Fixed

- **Szigetvilág** (archipelago) on a small map with six players no longer
  fails to generate on some seeds (e.g. 273): every start's gold lodes now
  find room on its island, and dock sites keep clear of the town centre.
  Islands still never join. The same seed now gives a different map than
  in 0.9.1 for six-player Szigetvilág on 64×64, some six-player Beltenger
  maps on 64×64 and, rarely, a six-player Véletlen (random) map on 64×64.
  All other templates, and every template's 64×64 two- and three-player,
  96×96 four- and six-player and 128×128 six-player maps, are unchanged.
  Saves are not affected (they store the terrain).
- The **Medium AI** gets its two monks in time with every nation: it trains
  them ahead of its army (still only from gold its cannon savings leave).
  Hard and Master AIs are unchanged.
- The transport ship's description takes its capacity from the game's
  settings instead of a typed-in number.

### Added

- For developers: an opt-in round-robin of Hard AIs on a water map
  (`BALANCE=water`, 96×96 Beltenger) that reports each nation's win rate.

## [0.9.1] — 2026-11-08

Balance check of the unique units and nations after M11–M14.

### Changed

- The **Cossack** (Russian) has 50 HP instead of 60 and attack 5 instead
  of 6: at equal cost it no longer beats the swordsman, the scout's
  counter, and Russian AIs no longer win three games in four. It stays a
  fast raider.
- The **Spanish** gold-gathering bonus is +25 % instead of +15 %; Spain
  was the weakest nation in AI-against-AI games.
- Saves from 0.9.0 load as before: a Cossack saved at 60 HP keeps its
  60 HP (a test now guards this); newly trained Cossacks have 50.

### Added

- Balance checks for developers: an equal-cost duel test (in CI) that
  keeps every unique unit near the unit it replaces and beaten by that
  unit's counters, and an opt-in round-robin of AI matches between all
  eight nations (`BALANCE=1`) that reports each nation's win rate.
- `npm run smoke:input`: a dependency-free headless-Chrome check of
  drag-select, click-select, right-click and Ctrl+click commands against
  a running dev server (`scripts/smoke/`).

### Fixed

- A unit ordered again onto the same transport walks to it anew instead of
  standing still.
- A transport unloading beside both banks of a strait, or near its target
  but beside only the far bank, puts its units on the land the target is
  on (it sails on to that bank first).
- A ship no longer drops an attack the moment its target steps briefly out
  of reach from the water (a villager walking inland and back); it gives up
  only after the target has stayed out of reach for a while.
- Ships find the water they can sail to without re-scanning the whole sea
  each time, which removes frame spikes on large water maps with many idle
  ships.
- The map generator's dock sites follow the same shore minimum as dock
  placement.

## [0.9.0] — 2026-11-01

Ships and water maps (M14 milestone).

### Added

- Four ships, trained at the new **dock** (built on the shore, one side
  along open water): the **fishing boat** fishes fish schools and brings
  the food to the dock; the **transport** carries up to five land units;
  the **galley** shoots ships and the shore; the **frigate** (Enlightenment)
  batters ships and buildings. Every nation paints its hulls in its own
  colours; the sails show the owner's colour.
- **Transports**: right-click an own transport with land units selected to
  board it (it comes to meet them); right-click land with a loaded
  transport to put the units ashore there, or press **Kirakodás**. A sunk
  transport takes its cargo down with it.
- Ships move on water only. Melee units cannot attack a ship and monks
  cannot convert one; archers, towers and other ships can.
- **Fish schools** on the water, and two new map types: **Beltenger**
  (inland sea: a lake in the middle, walkable all round) and
  **Szigetvilág** (archipelago: every player on an island of their own;
  armies cross only by transport). Every start gets a dock site and fish.
- The AI builds a dock where it has water, fishes, keeps a fleet of galleys
  (and frigates) and, on islands, lands its army from transports.
- Cursors for boarding and unloading, and ship sounds.
- Saves are schema version 9 (older saves load as before).

### Fixed

- **Szigetvilág**: on a small map with five or six players, neighbouring
  islands no longer join into one land; a large map with two or three
  players is no longer all forest and generates again.
- A transport unloading in a narrow strait puts its units only on the shore
  it sailed for, never on the far bank.
- The unload cursor shows over any land a loaded transport would unload on,
  also where a unit or a resource stands.
- AI ships no longer chase targets on water they cannot reach (a lake behind
  the land), and a ship gives up an attack on a target out of its reach.
- Hard and Master AI raids no longer set out for villagers across the sea.

## [0.8.1] — 2026-11-01

Fixes from the code review of 0.4.0–0.8.0.

### Fixed

- A unit converted by your monk no longer stays under the AI's control;
  the AI used to keep ordering it and overrode your commands.
- A monk sent toward a target it cannot reach (for example across water)
  now gives up at once and stays put, instead of re-planning its route
  every frame, which wasted the shared path-finding budget. An AI monk
  leaves such a target alone for a minute.
- An AI attack wave, flank or raid now drops units converted away from it.
- A unit caught under a new foundation finds its way by whichever side
  leads to its goal; a monk there no longer gives up a target it could
  reach from the other side.
- A saved game keeps which targets an AI monk has given up on. Saves are
  now schema version 8; 0.8.0 cannot open them, older saves load as before.
- Right-clicking an enemy with a recharging monk now walks the monk there,
  as the cursor shows, instead of losing the order.
- The Enlightenment-age mission loads the art of the age it starts in,
  instead of age-1 art that is never shown and the real art on demand in
  the first seconds.
- Winning an imported save of a still-locked mission no longer completes
  it out of order.
- A mission's map that cannot be generated no longer turns the skirmish
  setup card into a hidden mission.
- The campaign objectives panel no longer redraws the whole HUD every
  second.

## [0.8.0] — 2026-11-01

A three-mission campaign (milestone M13).

### Added

- **Campaign** in the main menu. Three missions on fixed maps and
  line-ups, unlocked in order; completed missions can be replayed.
  1. *Az első kolostor* (Hungarians, one easy opponent): reach the Middle
     Ages, build a monastery and train two monks.
  2. *A határ őrei* (English, Fortress map, two medium opponents, starting
     in the Middle Ages): hold out for 20 minutes and build four towers.
  3. *Csodák kora* (Italians, Islands, two hard opponents, starting in the
     Enlightenment with a full treasury): win the match by conquest or a
     Wonder.
- Each mission opens with a Hungarian briefing that lists its objectives.
- During play, an objectives panel on the HUD ticks each objective off and
  a notice appears for each one met.
- A mission is won when all its objectives are met, or by conquest. It is
  lost when your town centre falls. The game-over card shows the mission's
  closing text.
- Progress is kept in the browser.

### Changed

- Save `schemaVersion` is now 7: a mission in progress keeps its
  objectives. Older saves load through an automatic migration.

## [0.7.0] — 2026-11-01

A larger tech tree (milestone M12).

### Added

- **Ten new technologies:**
  - Town centre: wheelbarrow (villagers +10% speed) and treadmill crane
    (building 20% faster).
  - Stable: husbandry (cavalry +10% speed) and cavalry armour (cavalry +15%
    HP).
  - Barracks: forced march (infantry another +10% speed) and conscription
    (barracks, archery range and stable train 25% faster).
  - Blacksmith: chemistry (+1 ranged attack for musketeers and cannons).
  - Monastery: sanctity (monks +50% HP), fervor (monks +15% speed) and
    illumination (half the wait after a conversion).
- The command panels and the tech tree show them, and the monastery becomes
  a research building.
- The Medium, Hard and Master AIs research them once nothing from their main
  list can start, and only from gold their army is not saving.

### Changed

- Save `schemaVersion` is now 6. Older saves load through an automatic
  migration.

## [0.6.0] — 2026-11-01

Monks and monasteries (milestone M11).

### Added

- **Monk** for every nation, from the Middle Ages, trained at the new
  **Monastery** (3×3) for gold. A monk does not fight:
  - While it stands, it heals the most wounded own unit nearby.
  - Right-clicking an enemy unit with it starts a **conversion**. The monk
    walks into range and prays for six seconds, and the unit then joins
    you. It keeps its own nation's look, and its old orders are dropped.
    Afterwards the monk needs 20 seconds before it can convert again.
  - Monks and buildings cannot be converted.
  - A conversion scores like a kill.
- Each nation's monastery is drawn in its own architecture: palette, roof
  and, for onion-domed styles, an onion. It has a nave, a bell tower, a
  cloister and a dormitory.
- A convert cursor, a soft bell sound, and notices when one of your units
  is converted or an enemy unit joins you.
- Medium, Hard and Master AIs build a monastery in the Middle Ages and keep
  two monks. The monks follow the army, heal it, and convert enemy units
  that come close.

### Changed

- Save `schemaVersion` is now 5. Older saves load through an automatic
  migration.

## [0.5.0] — 2026-11-01

Shareable saves and measurement scripts (milestone M10).

### Added

- **Save sharing**: in the load list (main menu and pause) every usable save
  has an export button that downloads it as a JSON file. An “Import from
  file” button loads such a file at once. The file is checked exactly like a
  stored save (an older one is migrated). A file that is too large (over
  16 MB), damaged, not a save, or written by a newer version gives a
  Hungarian message, and nothing is loaded.
- **Perf scripts** in `scripts/perf/`: `npm run perf:texmem` measures
  texture memory per zoom, `npm run perf:frame` measures frame time
  (Playwright on the dev server; see `scripts/perf/README.md`).

## [0.4.0] — 2026-11-01

Time victory and lighter terrain textures when zoomed out (milestone M9).

### Added

- **Time victory**: after 60 minutes of game time, the standing player with
  the highest score wins. Ties go to the player who destroyed more enemy
  value, then to the lower player number. Conquest and the Wonder can still
  win before the time limit.
- The victory setting has four options: Conquest, Conquest or Wonder (the
  default, as before), Conquest or time, and All.
- In a timed match, the HUD shows the time left and the current leader. In
  the last five minutes the clock is highlighted and a notice appears. The
  game-over screen and the match log show the new cause, “Time”.
- In the last five minutes, an AI that leads on score launches no new
  attack wave.

### Changed

- When zoomed out between 0.65 and 0.97, the terrain near the view uses a
  three-quarter resolution texture instead of the full one. It looks as
  sharp on screen as half resolution already does at 0.65. Measured on a
  128×128 Islands map with six players, the terrain uses 49 → 33 MB at
  1280×720 and 75 → 45 MB at 1728×963 in that zoom range.
- Save `schemaVersion` is now 4. Older saves load through an automatic
  migration and keep their victory setting.

## [0.3.0] — 2026-10-30

Every nation now fields a unique unit and carries a permanent bonus
(milestone M8).

### Added

- **Unique units**: each nation replaces one of its base units with its own
  version, trained in the same building and age: Hungarian hussar (replaces
  the knight), English longbowman (crossbowman), German landsknecht
  (pikeman), French mousquetaire (musketeer), Spanish conquistador
  (cavalry), Italian legionary (swordsman), Russian cossack (scout) and
  Finnish sissi (archer). Each has its own stats and a distinctive
  silhouette. A nation cannot train the unit it replaced, so the texture
  budget does not grow. The AI trains its nation's own unit.
- **Nation bonuses**: Hungarian mounted units +10% speed, English farms +15%
  food, German buildings +15% HP, French stable-trained units +15% HP,
  Spanish gold gathering +15%, Italian construction 15% faster, Russian wood
  gathering +15%, Finnish infantry +10% speed.
- The nation picker, the tech tree (with a “unique” badge) and the training
  buttons show each nation's unique unit; the picker also shows the bonus.

### Changed

- Save `schemaVersion` is now 3. Older saves load through an automatic
  migration, and their units are kept even if their nation now trains
  something else.

## [0.2.0] — 2026-10-29

The first release under the name **Saecula**: eight nations, saving, sound,
and the fixes from the first full playtest.

### Added

- **Eight nations** (milestones M4–M5): English, German, French, Spanish,
  Italian, Russian and Finnish join the Hungarians. Each nation has its own
  architecture in each of the three ages, its own walls, unit gear, coat of
  arms and Wonder. Nations differ visually only.
- Nation picker for the player and the AI (“Mixed” by default).
- **Save and load** (M6): five slots and an autosave every five game minutes
  in IndexedDB; versioned, validated save files with migrations; clear
  messages for damaged or newer saves.
- **Pause menu** with save, load, settings and quit.
- **Procedural audio**: positional sound effects, a voice limit, and
  generative music per age with calm, battle, victory and defeat moods.
- **Settings**: master, music, effects and notification volume, mute, and
  rebindable camera keys.
- **Wonder victory**: hold a finished Wonder for ten minutes. The AI builds
  Wonders and attacks enemy ones first.
- **Master AI** difficulty and three AI personalities (rusher, economist,
  defender).
- **Contextual cursors** for move, gather (axe, pick, basket), build, attack
  and forbidden targets (M7).
- **Trackpad support**: two-finger pan and pinch zoom, with a scroll-mode
  setting (auto, zoom, pan).
- **Controls tab** in the settings: command gesture (Ctrl, Cmd, Alt or none
  next to right click) and rebindable keys for Home, scoreboard, villager
  panel, tech tree and delete.
- **Delete buildings** with confirmation; a site up to 50 % built refunds
  `round((1 − progress) × 80)` % of its cost, and queued units and research
  are refunded too.
- **Tech tree** showing what each age unlocks.
- **Side panel** with a live scoreboard for every player and a villager
  overview; clicking a row selects those villagers.
- **Camera buttons**: Home (cycles through your town centres) and map zoom.
- **Match log and statistics** screen: every finished match is stored
  locally, with win rate, average length, per-nation and per-difficulty
  breakdowns and JSON export.
- The game version is shown in the main menu.
- Project documents in English and Hungarian: README, changelog,
  contributing guide, code of conduct, contributors list; MIT license;
  continuous integration and issue and pull request templates.

### Changed

- The game is now called **Saecula** (previously the working title IsoRTS).
  Internal storage keys keep the old name so existing saves, settings and
  match logs survive.
- Music is more dynamic: a rhythm layer, density and volume that follow the
  intensity of play, more varied phrases and tempo.
- The save format is `schemaVersion` 2 (it now carries match statistics);
  version 1 saves are migrated automatically.

### Fixed

- Villagers no longer get stuck when a building foundation is placed on
  them, or when they stand next to each other; a builder can always reach
  the site.
- Several villagers can work on one construction site, and an unfinished
  building can be joined later.
- Hidden enemies under the fog of war no longer change the cursor or accept
  orders.
- A pinch over the interface no longer zooms the whole browser page.

## [0.1.0] — 2026-10-27

The playable MVP (milestones M0–M3) with the visual overhaul.

### Added

- Isometric map renderer, camera (keys, screen edge, zoom) and tile
  coordinate system.
- Economy: food, wood and gold; villagers gather, build and farm.
- Buildings: town centre, house, farm, lumber camp, mining camp, barracks,
  archery range, stable, blacksmith, tower, wall, foundry and Wonder.
- Units across three ages: villager, scout, swordsman, archer, knight,
  pikeman, crossbowman, musketeer, cannon and cavalry.
- A\* pathfinding, combat with health bars and death animations, fog of war.
- AI opponents with three difficulty levels that build, age up and attack.
- Age advancement through the Roman era, the Middle Ages and the
  Enlightenment, with blacksmith upgrades.
- Conquest victory; game setup for nation, map type, map size, opponents and
  difficulty; game-over screen with statistics.
- Map templates: Meadow, Wilderness, Islands, Fortress, Random.
- Visual overhaul: procedurally generated terrain, buildings and units, 2D
  lighting with normal maps, a day–night cycle, cast shadows, and a warm
  glass-panel interface.

[Unreleased]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.9.2...HEAD
[0.9.2]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.8.1...v0.9.0
[0.8.1]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.8.0...v0.8.1
[0.8.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/releases/tag/v0.1.0
