# Tally

A fast, **no-login daily task & habit tracker** for the web. Plan today, check
things off, and keep daily habit streaks going — state is saved in your browser,
so there's no account and no setup.

> **Live:** _set after the first GitHub Pages deploy_ — see [Deploy](#deploy).

Tally is app #1 built on the company's engineering foundation
(**TypeScript + [Fastify](https://fastify.dev/)**). It's intentionally tight:
tasks, habits with streaks, and local persistence — no accounts, sync, or
backend.

## Features

- **Tasks** — add, edit (double-click or ✎), complete, and delete today's tasks;
  completed tasks are visibly struck through and sink to the bottom.
- **Habits** — track a small set of daily habits, mark them done/undone for
  today, and watch the 🔥 streak grow. A streak counts consecutive completed
  days and stays alive on a new day until you either extend or miss it.
- **Persistence** — everything is saved to `localStorage` and survives reloads.
  No login, no server-side state.

## Architecture

Tally is a **static, client-side single-page app**. All domain logic lives in
pure, unit-tested TypeScript; the DOM layer is a thin renderer over it.

| Concern       | Choice                                                           |
| ------------- | ---------------------------------------------------------------- |
| Language      | TypeScript (ES2022, ESM)                                         |
| Client        | Vanilla TS → native ES modules (no framework, no bundler)        |
| Persistence   | Browser `localStorage` (versioned key `tally.state.v1`)          |
| Local server  | Fastify 5 — serves the same `public/` assets + a JSON `/healthz` |
| Tests         | Vitest (pure logic + a server smoke test)                        |
| Lint / format | ESLint 9 (flat config) + Prettier                                |
| CI            | GitHub Actions (lint → typecheck → build → test)                 |
| Deploy        | GitHub Actions → GitHub Pages (static, free, no secrets)         |

The Fastify server isn't required to run Tally in production (Pages serves the
static files directly), but it's retained as the local dev server and the
foundation future products will build on.

```
.
├─ src/
│  ├─ app.ts          # buildApp(): Fastify — serves public/ + /healthz
│  ├─ server.ts       # entrypoint: starts the HTTP server
│  └─ web/
│     ├─ core.ts      # pure domain logic: tasks, habits, streaks, persistence
│     └─ main.ts      # DOM + localStorage layer (browser only)
├─ public/
│  ├─ index.html      # the single page (committed)
│  ├─ styles.css      # styles (committed)
│  └─ *.js            # compiled from src/web by `build:web` (generated, gitignored)
├─ test/
│  ├─ tally.test.ts   # unit tests for the pure core logic
│  └─ smoke.test.ts   # server smoke test via app.inject()
├─ .github/workflows/ # ci.yml (checks) + pages.yml (deploy)
├─ tsconfig.json      # server build (Node)
└─ tsconfig.web.json  # browser build (DOM → public/)
```

## Requirements

- Node.js >= 20 (CI uses 22)
- npm (ships with Node)

## Install

```bash
npm install
```

## Run locally

```bash
npm run dev     # builds the browser bundle, then serves with auto-reload
```

Then open <http://localhost:3000/>. The port/host can be overridden with the
`PORT` and `HOST` environment variables (defaults `3000` / `0.0.0.0`).

For a production-style run:

```bash
npm run build   # build:server (dist/) + build:web (public/*.js)
npm start
```

## Test, lint, typecheck

```bash
npm test            # Vitest (unit + smoke)
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit for both server and browser configs
npm run format      # Prettier (write)
```

CI (`.github/workflows/ci.yml`) runs exactly what you can run locally:
`npm ci` → `npm run lint` → `npm run typecheck` → `npm run build` → `npm test`.

## Deploy

Pushing to `main` triggers `.github/workflows/pages.yml`, which builds the
browser bundle and publishes `public/` to **GitHub Pages**. To enable it on a
fresh repo: in **Settings → Pages**, set the source to **GitHub Actions** (done
once). The live URL then appears on the Actions run and in the Pages settings.

## Out of scope (v1)

Accounts/login, multi-device sync, mobile-native, sharing, reminders, and
analytics are deliberately deferred — the obvious extension path once the
pipeline is proven.
