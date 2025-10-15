const DATABASE_NOTE = "This greeting is served from a Cloudflare D1 database.";
const ERROR_TITLE = "Database unavailable";

async function readGreetingFromDatabase(database) {
  if (!database || typeof database.prepare !== "function") {
    throw new Error("The HELLO_WORLD_DB binding is not configured.");
  }

  const row = await database
    .prepare("SELECT message FROM greetings ORDER BY id LIMIT 1")
    .first();

  if (!row?.message) {
    throw new Error("No greeting rows were returned from the database.");
  }

  return row.message;
}

function renderSuccessHtml(message, siteTitle) {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${siteTitle}</title>
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
      <p>${DATABASE_NOTE}</p>
    </main>
  </body>
</html>`;
}

function renderErrorHtml(error, siteTitle) {
  const reason = error instanceof Error ? error.message : String(error);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${siteTitle} – ${ERROR_TITLE}</title>
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
        background: radial-gradient(circle at top, #fee2e2, #fecaca);
      }
      main {
        text-align: center;
        padding: 2rem 3rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.92);
        box-shadow: 0 20px 45px rgba(153, 27, 27, 0.2);
      }
      h1 {
        font-size: clamp(2.5rem, 5vw, 4rem);
        margin: 0 0 0.75rem;
        color: #991b1b;
      }
      p {
        margin: 0;
        color: #b91c1c;
        font-size: 1.125rem;
      }
      code {
        display: inline-block;
        margin-top: 0.75rem;
        padding: 0.25rem 0.5rem;
        border-radius: 0.5rem;
        background: rgba(153, 27, 27, 0.1);
        color: #7f1d1d;
        font-size: 0.95rem;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${ERROR_TITLE}</h1>
      <p>The worker could not reach the D1 database.</p>
      <code>${reason}</code>
    </main>
  </body>
</html>`;
}

export default {
  async fetch(request, env) {
    try {
      const message = await readGreetingFromDatabase(env.HELLO_WORLD_DB);
      const body = renderSuccessHtml(message, env.SITE_TITLE);

      return new Response(body, {
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    } catch (error) {
      console.error("Failed to read greeting from D1:", error);
      const body = renderErrorHtml(error, env.SITE_TITLE);

      return new Response(body, {
        status: 500,
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    }
  },
};
