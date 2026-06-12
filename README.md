# app

The engineering foundation for the company's products: a minimal but real
**TypeScript + [Fastify](https://fastify.dev/)** web service that serves a
hello-world HTML page and a JSON health endpoint. It exists to give every future
product a clean, tested, lintable starting point with CI already wired up.

## Stack

| Concern         | Choice                                           |
| --------------- | ------------------------------------------------ |
| Language        | TypeScript (ES2022, ESM / NodeNext)              |
| Runtime         | Node.js (>= 20; CI runs 22)                      |
| HTTP server     | Fastify 5                                        |
| Tests           | Vitest                                           |
| Lint / format   | ESLint 9 (flat config) + Prettier                |
| CI              | GitHub Actions (lint → typecheck → build → test) |
| Package manager | npm                                              |

> **Frontend:** intentionally deferred. The server returns a real HTML page and
> a JSON endpoint, so we have both a "page" and an "endpoint" without committing
> the still-undecided product to a specific SPA framework. Adding Vite + React/Vue
> later is a clean, reversible follow-up.

## Requirements

- Node.js >= 20 (CI uses 22)
- npm (ships with Node)

## Install

```bash
npm install
```

## Run

Development (auto-reloads on change, no build step):

```bash
npm run dev
```

Production (compile to `dist/`, then run):

```bash
npm run build
npm start
```

Then open <http://localhost:3000/> for the hello-world page, or hit the JSON
endpoint:

```bash
curl http://localhost:3000/healthz
# {"status":"ok","message":"Hello, world!"}
```

The port and host can be overridden with the `PORT` and `HOST` environment
variables (defaults: `3000` and `0.0.0.0`).

## Test

```bash
npm test
```

Runs the Vitest suite once (including the smoke test in
[`test/smoke.test.ts`](test/smoke.test.ts)). Use `npm run test:watch` for the
interactive watcher.

## Lint & format

```bash
npm run lint          # ESLint
npm run typecheck     # tsc --noEmit
npm run format        # Prettier (write)
npm run format:check  # Prettier (check only)
```

## Project layout

```
.
├─ src/
│  ├─ app.ts        # buildApp(): configures the Fastify instance (routes)
│  └─ server.ts     # entrypoint: starts the HTTP server
├─ test/
│  └─ smoke.test.ts # smoke test using Fastify's app.inject() (no real port)
├─ .github/workflows/ci.yml
├─ eslint.config.js
├─ tsconfig.json
└─ package.json
```

## How CI maps to local commands

CI (`.github/workflows/ci.yml`) runs exactly what you can run locally:
`npm ci` → `npm run lint` → `npm run typecheck` → `npm run build` → `npm test`.
