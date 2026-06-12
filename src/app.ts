import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyStatic from "@fastify/static";

// Resolve <repo>/public relative to this file so it works from both `tsx`
// (src/) and the compiled output (dist/) — both sit one level under the root.
const here = dirname(fileURLToPath(import.meta.url));
const publicDir = join(here, "..", "public");

/**
 * Build and configure the Fastify application.
 *
 * Kept as a factory (rather than a top-level singleton) so tests can spin up
 * an isolated instance via `app.inject(...)` without binding a real port, and
 * so future engineers can compose/extend the app before it starts listening.
 *
 * The app serves the Tally single-page client from `public/` (the same static
 * assets that ship to GitHub Pages) and exposes a JSON health endpoint.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV === "production",
  });

  // JSON health/hello endpoint — used by the smoke test and future readiness checks.
  app.get("/healthz", async () => {
    return { status: "ok", message: "Hello, world!" };
  });

  // Serve the Tally client. `index.html` is returned for `/`; compiled JS,
  // CSS, and any other assets are served from the same directory.
  app.register(fastifyStatic, {
    root: publicDir,
    index: ["index.html"],
  });

  return app;
}
