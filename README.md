# Tessera

A quiet, local-first habit tracker. One GitHub-style heatmap per habit, a journal note for any
day, and your data never leaves your browser.

> **Status**: under construction — v1 in progress.

Every day is a small tile; a year of showing up becomes the full mosaic. Tessera is a free,
open-source alternative to paid heatmap habit trackers.

## Why Tessera

- **Local-first** — everything lives in your browser (IndexedDB). No account, no server, no
  analytics, nothing to pay for.
- **GitHub-style heatmaps** — log a count per day; cells shade with intensity, scaled to your
  own history or a daily target you choose.
- **Journal notes** — attach a note to any day, including days you didn't do the habit.
- **No streaks** — no guilt mechanics, no points, no gamification. Just an honest picture of
  what you did.
- **Installable PWA** — works fully offline, lives on your phone's home screen.
- **Portable data** — one-click JSON export and import.

## Development

```bash
npm install
npm run dev     # start the dev server
npm run check   # typecheck + lint + format check + tests
```

Requires Node 22+. See [CONTRIBUTING.md](CONTRIBUTING.md) for more.

## License

[MIT](LICENSE)
