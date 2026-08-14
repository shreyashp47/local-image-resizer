# Contributing

Thanks for helping improve Local Image Resizer. Every change stays 100%
client-side — no servers, no uploads, no analytics.

## Setup

```bash
npm install
npm run dev
```

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run lint` | ESLint (must pass, zero warnings) |
| `npm run test` | Unit tests (Vitest) |
| `npm run test:e2e` | E2E tests (Playwright, chromium + webkit) |
| `npm run build` | Typecheck + production build to `dist/` |
| `npm run format` | Prettier formatting |

## Working on an issue

1. Issues are numbered steps; work on one at a time.
2. Create a branch: `git checkout -b step-XX-description`.
3. Implement + verify: `npm run lint && npm run test && npm run build`.
4. Run E2E tests that touch your feature.
5. Open a PR against `main`. CI runs lint, tests, build, and E2E automatically.
6. Every PR gets an automatic Cloudflare Pages preview URL.

## Testing notes

- Unit tests cover the pure logic (geometry, presets, settings, processing).
  New geometry/math must live in testable functions with tests.
- E2E fixtures are generated in the browser at runtime — never commit binary
  test assets.
- Never add a dependency loaded from a CDN at runtime: it breaks the offline
  and privacy guarantees. Bundle everything.

## Privacy contract

Any PR that would cause image data to leave the browser (fetch/XHR with image
payloads, analytics beacons, external image processors) will be rejected.
