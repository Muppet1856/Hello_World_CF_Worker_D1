export default {
  async fetch(request, env, ctx) {
    try {
      const greeting = await env.HELLO_WORLD_DB.prepare(
        "SELECT message FROM greetings ORDER BY id LIMIT 1"
      ).first();

      const message = greeting?.message ?? "Hello World";

      const body = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${env.SITE_TITLE}</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at top, #f4f4f5, #d4d4d8);
      }
      main {
        text-align: center;
        padding: 2rem 3rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.85);
        box-shadow: 0 20px 45px rgba(15, 23, 42, 0.2);
      }
      h1 {
        font-size: clamp(2.5rem, 5vw, 4rem);
        margin: 0 0 0.5rem;
        color: #111827;
      }
      p {
        margin: 0;
        color: #4b5563;
        font-size: 1.125rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${message}</h1>
      <p>This greeting is served from a Cloudflare D1 database.</p>
    </main>
  </body>
</html>`;

      return new Response(body, {
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: "Unable to load greeting",
          details: error instanceof Error ? error.message : String(error),
        }),
        {
          status: 500,
          headers: {
            "content-type": "application/json; charset=UTF-8",
          },
        }
      );
    }
  },
};
