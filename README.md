# Cloudflare Workers Hello World with D1

![Release badge](https://img.shields.io/github/v/release/cloudflare/Hello_World_CF_Worker_D1?display_name=tag&label=Release&sort=semver)

This repository provides a minimal Cloudflare Worker that serves a friendly greeting from a D1 database when the binding is
available and falls back to a built-in message otherwise. It is intended as a starting point for experiments that need a simple
read-only query rather than a fully featured application.

The repo also includes a GitHub Actions workflow that can provision the D1 database, apply migrations, and deploy preview
environments automatically. You can adopt as much or as little of that automation as you need for your own projects.

## Project structure

```
.
├── .github/workflows/deploy.yml   # CI workflow for preview + production deployments
├── migrations/                    # SQL migrations for the D1 database
│   └── 0001_create_greetings.sql
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
- A Cloudflare API token and account id so Wrangler can authenticate requests (see the next section).

## Cloudflare credentials

Wrangler (and the automation in this repository) authenticate with Cloudflare using an API token that is scoped to your
account. You will also need the numeric account id so Wrangler can address the correct account when creating the D1 database.

## Release metadata

- The current template release is **v1.0.0** and is displayed in the Worker response for quick verification.
- The `SITE_RELEASE` variable defined in `wrangler.toml` (or injected via the Cloudflare dashboard) controls which release
  string appears on the website. When you publish a GitHub release, set `SITE_RELEASE` to the Git tag (for example
  `GITHUB_REF_NAME` within a GitHub Actions release workflow) so the worker, README badge above, and release page stay aligned.

### Create an API token

1. Visit **My Profile → API Tokens** in the Cloudflare dashboard and choose **Create Token**.
2. Start from the **Edit Cloudflare Workers** template (or create a custom token) and ensure it has these permissions:
   - **Account · Workers Scripts · Edit** – allows Wrangler to publish the worker.
   - **Account · Workers Routes · Edit** – required when binding the worker to routes.
   - **Account · D1 Databases · Edit** – allows Wrangler to provision the database and run migrations.
3. Scope the token to the account that owns your worker, give it a descriptive name, and save it somewhere secure. You will only
   be able to copy the value once.
4. Store the token in the `CLOUDFLARE_API_TOKEN` environment variable locally (a `.env` file works well) and in the
   `CLOUDFLARE_API_TOKEN` secret inside GitHub Actions.

### Locate your account id

1. Open the Cloudflare dashboard and copy the **Account ID** displayed on the **Overview** page for the account that owns your
   worker.
2. Alternatively, run `wrangler whoami --json` and copy the `account_id` property from the output.
3. Store the id in the `CLOUDFLARE_ACCOUNT_ID` environment variable locally and add it as the
   `CLOUDFLARE_ACCOUNT_ID` secret in GitHub Actions so the workflow can authenticate API requests.

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

- If the deploy workflow cannot find a `database_id` entry to replace, double-check that your `wrangler.toml` file includes the
  placeholder binding from the committed template.
- When using the GitHub Actions workflow, confirm that the `WORKER_NAME` and `BINDING_NAME` variables exist; the job will fail
  early if they are missing to make misconfiguration obvious.
