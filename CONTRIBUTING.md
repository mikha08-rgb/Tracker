# Contributing

Thanks for your interest in Tessera!

## Setup

```bash
npm install
npm run dev
```

Requires Node 22+.

## Before opening a PR

```bash
npm run check   # typecheck + oxlint + prettier check + vitest
```

`npm run format` fixes formatting issues.

## Things to know

- **Dates**: habit days are _local_ calendar dates stored as `'YYYY-MM-DD'` strings. Never use
  `toISOString()` or `new Date(isoString)` for calendar dates — the rules live at the top of
  [`src/lib/dates.ts`](src/lib/dates.ts). CI runs the test suite under three timezones
  (UTC, New York, Kiritimati/UTC+14) to catch UTC leaks.
- **Data access**: components never touch Dexie directly. Every query and mutation goes through
  [`src/data/repo.ts`](src/data/repo.ts) — that module is also the seam where optional sync
  could be added someday.
- **Service worker**: disabled in dev. Verify PWA behavior with `npm run build && npm run preview`.
  If a stale service worker from a preview build ever shadows the dev server, unregister it via
  DevTools → Application → Service Workers.
- **User-chosen colors** can never be Tailwind class names (the compiler can't see dynamic
  strings) — pass them as inline `style`. Static structure stays in Tailwind classes.
- **Icons**: app icons regenerate from `public/favicon.svg` with `npm run generate:icons`.
- **Dependencies**: kept deliberately minimal (four runtime deps). Prefer hand-rolling small
  things over adding a package; expect pushback on new dependencies in review.
- **Testing**: pure logic (`src/lib/`, `src/data/`) is thoroughly unit-tested; components get a
  few behavior tests. E2E tests are welcome future work.
