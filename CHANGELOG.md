# Changelog

**English** · [Magyar](CHANGELOG.hu.md)

All notable changes to Saecula are recorded here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project
uses [Semantic Versioning](https://semver.org/). Before 1.0, a new milestone
or larger feature set raises the minor version and a release with only fixes
raises the patch version.

## [Unreleased]

Nothing yet.

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

[Unreleased]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/ZoliQua/Saecula-Strategy-Game/releases/tag/v0.1.0
