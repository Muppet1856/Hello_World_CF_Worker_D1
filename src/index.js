// Example worker that reads a greeting from D1 with a graceful fallback.
const FALLBACK_NOTE = "This greeting is served from a built-in fallback message.";
const FALLBACK_WARNING =
  "Create a D1 database and bind it as HELLO_WORLD_DB to serve content from D1.";
const DEFAULT_GREETING = "Hello World";
const ERROR_TITLE = "Database unavailable";

function formatDatabaseNote(locationLabel) {
  const trimmedLocation =
    typeof locationLabel === "string" && locationLabel.trim().length > 0
      ? locationLabel.trim()
      : "an unknown location";

  return `This greeting is served from a Cloudflare D1 database utilizing infrastructure in ${trimmedLocation}.`;
}

function describeInfrastructureLocation(request) {
  const cf = request?.cf;

  if (!cf || typeof cf !== "object") {
    return null;
  }

  const { city, region, country, colo } = cf;
  const locationParts = [city, region, country].filter(Boolean);

  if (locationParts.length > 0) {
    return locationParts.join(", ");
  }

  if (colo) {
    return `the ${colo} data center`;
  }

  return null;
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readGreetingFromDatabase(database) {
  if (!database || typeof database.prepare !== "function") {
    console.error("HELLO_WORLD_DB binding is missing or invalid:", {
      hasDatabase: Boolean(database),
      type: database ? typeof database : "undefined",
    });
    throw new Error("The HELLO_WORLD_DB binding is not configured.");
  }

  console.debug("Preparing to read greeting from D1 database");

  const row = await database
    .prepare("SELECT message FROM greetings ORDER BY id LIMIT 1")
    .first();

  if (!row?.message) {
    console.warn("Query for greeting returned no rows.");
    throw new Error("No greeting rows were returned from the database.");
  }

  console.debug("Greeting row retrieved from database:", row);
  return row.message;
}

function resolveFallbackGreeting(env, reason) {
  const fallbackGreeting = env?.DEFAULT_GREETING?.trim() || DEFAULT_GREETING;

  if (reason) {
    console.warn("Falling back to built-in greeting due to:", reason);
  } else {
    console.info("HELLO_WORLD_DB binding not present, using fallback greeting.");
  }

  return {
    message: fallbackGreeting,
    note: FALLBACK_NOTE,
    warning: reason ? `${FALLBACK_WARNING} (${reason})` : FALLBACK_WARNING,
  };
}

async function resolveGreeting(env, locationLabel) {
  if (!env?.HELLO_WORLD_DB) {
    const reason = "The HELLO_WORLD_DB binding is not configured.";
    console.warn("HELLO_WORLD_DB binding not found on env; falling back to default greeting.");
    return resolveFallbackGreeting(env, reason);
  }

  try {
    console.debug("Attempting to read greeting from HELLO_WORLD_DB binding.");
    const message = await readGreetingFromDatabase(env.HELLO_WORLD_DB);
    return { message, note: formatDatabaseNote(locationLabel), warning: null };
  } catch (error) {
    console.warn("Falling back to the built-in greeting:", error);
    const reason = error instanceof Error ? error.message : String(error);
    return resolveFallbackGreeting(env, reason);
  }
}

function renderSuccessHtml(
  message,
  siteTitle,
  note,
  warning,
  requestUrl,
  variableOneValue,
) {
  const safeMessage = escapeHtml(message);
  const safeNote = escapeHtml(note);
  const safeSiteTitle = escapeHtml(siteTitle);
  const safeVariableOneValue = escapeHtml(variableOneValue ?? "(not set)");
  const safeRequestUrl =
    typeof requestUrl === "string" && requestUrl.length > 0
      ? escapeHtml(requestUrl)
      : null;
  const warningHtml = warning
    ? `<p class="warning">${escapeHtml(warning)}</p>`
    : "";
  const requestUrlHtml = safeRequestUrl
    ? `<section class="meta" aria-label="Request details">
        <dl>
          <dt>Request URL</dt>
          <dd><code>${safeRequestUrl}</code></dd>
        </dl>
      </section>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeSiteTitle}</title>
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
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }
      .meta {
        margin-top: 1.75rem;
        padding: 1.25rem 1.5rem;
        border-radius: 1rem;
        background: rgba(148, 163, 184, 0.15);
        text-align: left;
      }
      .meta h2 {
        margin: 0 0 0.75rem;
        font-size: 1rem;
        font-weight: 600;
        color: #374151;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }
      .meta dl {
        margin: 0;
        display: grid;
        grid-template-columns: max-content 1fr;
        column-gap: 1rem;
        row-gap: 0.5rem;
        align-items: start;
      }
      .meta dt {
        font-size: 0.95rem;
        font-weight: 600;
        color: #4b5563;
      }
      .meta dd {
        margin: 0;
        font-size: 0.95rem;
        color: #1f2937;
        word-break: break-word;
      }
      code {
        display: inline-block;
        padding: 0.15rem 0.35rem;
        border-radius: 0.35rem;
        background: rgba(15, 23, 42, 0.08);
        color: #111827;
        font-size: 0.95rem;
      }
      .variable {
        margin-top: 1.25rem;
        font-size: 1.05rem;
        color: #1f2937;
      }
      .warning {
        margin-top: 1rem;
        padding: 0.75rem 1rem;
        border-radius: 0.75rem;
        background: rgba(234, 179, 8, 0.15);
        color: #92400e;
        font-size: 0.95rem;
        line-height: 1.5;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${safeMessage}</h1>
      <p>${safeNote}</p>
      <p class="variable">VARIABLE_1 = <code>${safeVariableOneValue}</code></p>
      ${requestUrlHtml}
      ${warningHtml}
    </main>
  </body>
</html>`;
}

function renderErrorHtml(error, siteTitle) {
  const reason = escapeHtml(error instanceof Error ? error.message : String(error));
  const safeSiteTitle = escapeHtml(siteTitle);

  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${safeSiteTitle} – ${ERROR_TITLE}</title>
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
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
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
    const siteTitle = env?.SITE_TITLE?.trim() || "Hello World";

    try {
      const locationLabel = describeInfrastructureLocation(request);
      const { message, note, warning } = await resolveGreeting(env, locationLabel);
      const body = renderSuccessHtml(
        message,
        siteTitle,
        note,
        warning,
        request?.url ?? null,
        String(env?.VARIABLE_1 ?? "(not set)"),
      );

      return new Response(body, {
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    } catch (error) {
      console.error("Failed to read greeting from D1:", error);
      const body = renderErrorHtml(error, siteTitle);

      return new Response(body, {
        status: 500,
        headers: {
          "content-type": "text/html; charset=UTF-8",
        },
      });
    }
  },
};
