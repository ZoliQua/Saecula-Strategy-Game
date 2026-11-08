# Browser smoke scripts

**English** · [Magyar](README.hu.md)

## `input.mjs` (`npm run smoke:input`)

Drives a real match in headless Chrome (CDP, SwiftShader) and checks mouse input:

1. a drag box selects the 3 starting villagers;
2. a right-click on empty ground (a free grass tile, checked in the map data) gives each
   selected unit a path;
3. a single click selects exactly one villager, your own;
4. Ctrl+click (the default command gesture) moves the selection and keeps it;
5. a plain click on empty grass clears the selection.

It needs no dependency (unlike `scripts/perf/`, it does not use Playwright).

Prerequisites: macOS Chrome at `/Applications/Google Chrome.app` (or pass `--chrome`),
Node 22+ (global `fetch`/`WebSocket`), and a running dev server, started separately:
`npx vite --port 5196 --strictPort`. The run takes about 50 s.

Run: `npm run smoke:input -- [--url http://localhost:5196] [--chrome <path>] [--port 9334]`

Output: one `PASS <check>` / `FAIL <check>` line per check. Exit code 0 when every
check passes, 1 otherwise (130 on Ctrl+C, 143 on SIGTERM) (including `FAIL server/chrome` when the server is not
reachable or Chrome does not start within 10 s). Not part of CI.
