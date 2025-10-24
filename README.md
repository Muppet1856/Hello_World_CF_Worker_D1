# Cloudflare Workers Hello World with D1

This repository provides a minimal Cloudflare Worker that serves a friendly greeting from a D1 database when the binding is
available and falls back to a built-in message otherwise. It is intended as a starting point for experiments that need a simple
read-only query rather than a fully featured application.

The repo also includes utility scripts and a GitHub Actions workflow that can provision the D1 database, apply migrations, and
deploy preview environments automatically. You can adopt as much or as little of that automation as you need for your own
projects.

## Project structure

```
.
├── .github/workflows/deploy.yml   # CI workflow for preview + production deployments
├── migrations/                    # SQL migrations for the D1 database
│   └── 0001_create_greetings.sql
├── scripts/                       # Helper scripts for provisioning and configuration
│   ├── ensure-db.mjs
│   ├── get-db-id.mjs
│   └── set-db-id.mjs
├── src/
│   ├── README.md
│   └── index.js                   # Worker script that reads from D1 with a fallback message
└── wrangler.toml                  # Local development template with placeholder values
```

## Prerequisites

Before running the worker locally or deploying it through CI, make sure you have:

- A [Cloudflare account](https://dash.cloudflare.com/) with access to the Workers and D1 beta features.
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/install-and-update/) 3.0 or newer installed locally (either
  globally via `npm install -g wrangler` or by running `npx wrangler ...` commands).
- Node.js 18+ if you plan to execute the helper scripts in the `scripts/` directory.

## Local development

1. **Review `wrangler.toml`.** The committed file contains a minimal configuration, including a placeholder D1 binding. Update the
   `name`, `compatibility_date`, and `SITE_TITLE` values if needed. Leave the `database_id` placeholder in place—the helper script
   will replace it once the real database exists.
2. **Create (or reuse) a D1 database.** Run the provisioning helper to create a database named `hello_world`, write its id back to
   `wrangler.toml`, and apply the SQL migrations:

   ```bash
   node scripts/ensure-db.mjs
   ```

   Pass a different database name or Wrangler config by appending arguments, e.g.

   ```bash
   node scripts/ensure-db.mjs my_database --wrangler=./wrangler.toml
   ```

   The command requires Wrangler to be authenticated (run `wrangler login` or set the `CLOUDFLARE_API_TOKEN` and
   `CLOUDFLARE_ACCOUNT_ID` environment variables beforehand).
3. **Run the worker locally.** Once the database id has been written to `wrangler.toml`, start the development server:

   ```bash
   wrangler dev
   ```

   The worker renders the greeting from D1. If the binding is not available it gracefully falls back to the built-in message and
   surfaces a warning on the page.

## GitHub Actions workflow

The `.github/workflows/deploy.yml` file demonstrates how to:

- Generate a preview Worker (and matching D1 database) for every pull request.
- Deploy the `main` branch to production once it is merged.
- Clean up preview Workers and databases when pull requests close.

To use the workflow as-is you need to define the following repository secrets and variables under
**Settings → Secrets and variables → Actions**:

| Name | Type | Purpose |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | API token with permission to manage Workers, routes, and D1 databases. |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Account id that Wrangler uses when calling the Cloudflare API. |
| `WORKER_NAME` | Variable | Base name for the production Worker, e.g. `hello-world-cf-worker-d1`. |
| `BINDING_NAME` | Variable | D1 binding name expected by the Worker (`HELLO_WORLD_DB` unless you update `src/index.js`). |
| `DOMAIN` | Variable (optional) | Custom domain for preview deployments. Leave empty to use `<worker>.workers.dev`. |

Feel free to trim the workflow down to the pieces that match your release process.

## Customising the greeting

- Update the seeded greeting by editing `migrations/0001_create_greetings.sql` and re-running the migration against a fresh
  database, or execute an ad-hoc SQL statement:

  ```bash
  wrangler d1 execute hello_world \
    --command='UPDATE greetings SET message = "Hello from D1" WHERE id = 1;' --remote
  ```

- Supply a fallback greeting without touching the database by setting a `DEFAULT_GREETING` variable in your `wrangler.toml` (or
  through the Cloudflare dashboard). When the D1 binding is unavailable the worker uses that value instead of the default
  "Hello World" string.

## Troubleshooting tips

- If `node scripts/ensure-db.mjs` cannot find a `database_id` entry to replace, double-check that your `wrangler.toml` file
  includes the placeholder binding from the committed template.
- When using the GitHub Actions workflow, confirm that the `WORKER_NAME` and `BINDING_NAME` variables exist; the job will fail
  early if they are missing to make misconfiguration obvious.
