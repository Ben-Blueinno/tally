import Fastify, { type FastifyInstance } from "fastify";

/**
 * Build and configure the Fastify application.
 *
 * Kept as a factory (rather than a top-level singleton) so tests can spin up
 * an isolated instance via `app.inject(...)` without binding a real port, and
 * so future engineers can compose/extend the app before it starts listening.
 */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV === "production",
  });

  // Hello-world page — a real, browser-renderable HTML response.
  app.get("/", async (_request, reply) => {
    reply.type("text/html; charset=utf-8");
    return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hello, world!</title>
  </head>
  <body>
    <main>
      <h1>Hello, world!</h1>
      <p>The engineering foundation is up and running.</p>
      <p>Health endpoint: <a href="/healthz">/healthz</a></p>
    </main>
  </body>
</html>
`;
  });

  // JSON health/hello endpoint — used by the smoke test and future readiness checks.
  app.get("/healthz", async () => {
    return { status: "ok", message: "Hello, world!" };
  });

  return app;
}
