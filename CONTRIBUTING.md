# Contributing to Saecula

**English** · [Magyar](CONTRIBUTING.hu.md)

Thank you for your interest in Saecula! Bug reports, playtest notes, ideas and
pull requests are all welcome. By taking part you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).

## Reporting a bug or suggesting an idea

Open an [issue](https://github.com/ZoliQua/Saecula-Strategy-Game/issues/new/choose)
and pick the matching template. For a bug, please include:

- what you did, what you expected, and what happened instead;
- the game version (bottom of the main menu), your browser and your OS;
- a screenshot, and the browser console output if there is an error.

Issues may be written in English or Hungarian.

## Scope

The scope of the game is fixed in [`CLAUDE.md`](CLAUDE.md) (section 1.2 lists
what is deliberately *not* part of it, such as multiplayer and mobile touch
controls). For a larger feature, please open an issue to discuss it before you
start coding.

## Development setup

```bash
npm install
npm run dev          # http://localhost:5173
```

Before you open a pull request, all of these must pass:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

Continuous integration runs the same checks on every push and pull request.

## Conventions

- **Language.** Code, identifiers, comments and commit messages are in
  English. Every player-facing text is Hungarian and lives in
  `src/i18n/hu.ts` — never hard-code it in a component.
- **TypeScript.** `strict` mode; no `any` (except third-party interop, with a
  comment). Validate external data (saves, JSON) with `zod`.
- **Architecture.** The ECS world is the only source of game state; Phaser
  objects only render it. Balance numbers go in `src/config/balance.ts`.
- **Files.** Keep files focused and under ~400 lines. `PascalCase.ts` for
  classes and components, `camelCase.ts` for function modules.
- **Tests.** Required for the modules in `CLAUDE.md` section 11.1
  (coordinates, pathfinding, save round-trip, migrations, balance). For a bug
  fix, first write a test that fails, then fix it.
- **Dependencies.** Please ask in an issue before adding a third-party
  library.

## Branches, commits and pull requests

- `main` always holds the latest complete version. Branch from it:
  `feat/<name>`, `fix/<name>`, `docs/<name>`, `chore/<name>`.
- Use [Conventional Commits](https://www.conventionalcommits.org/):
  `feat:`, `fix:`, `refactor:`, `docs:`, `test:`, `chore:`.
- Every change reaches `main` through a pull request. Describe what changed
  and why, and add screenshots for visual changes.
- If your change is visible to players, add a line under **[Unreleased]** in
  both `CHANGELOG.md` and `CHANGELOG.hu.md`.

## Releases

Saecula uses [Semantic Versioning](https://semver.org/). The version lives in
`package.json` and is shown in the main menu. A release updates both
changelogs, commits `chore(release): vX.Y.Z` on `main`, tags `vX.Y.Z`, and
publishes a GitHub release with the changelog section.

## Contributors

Everyone who contributes is listed in [`CONTRIBUTORS.md`](CONTRIBUTORS.md).
Add yourself in your first pull request if you like.
