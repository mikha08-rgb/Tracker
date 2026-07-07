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
  `toISOString()` or `new Date(isoString)` for calendar dates — see the rules at the top of
  `src/lib/dates.ts`. CI runs the test suite in three timezones (UTC, New York, Kiritimati) to
  catch UTC leaks.
- **Service worker**: disabled in dev. Verify PWA behavior with `npm run build && npm run preview`.
  If a stale service worker from a preview build ever shadows the dev server, unregister it via
  DevTools → Application → Service Workers.
- **User-chosen colors** can never be Tailwind class names (the compiler can't see dynamic
  strings) — pass them as inline `style`.
- **Dependencies**: we keep them minimal on purpose. Prefer hand-rolling small things over adding
  a package.
