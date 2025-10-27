# Cloudflare Worker + D1 starter with end-to-end automation

[![GitHub Release](https://img.shields.io/github/v/release/Muppet1856/Hello_World_CF_Worker_D1)](https://github.com/Muppet1856/Hello_World_CF_Worker_D1/releases) [![GitHub License](https://img.shields.io/github/license/Muppet1856/Hello_World_CF_Worker_D1)](https://github.com/Muppet1856/Hello_World_CF_Worker_D1/blob/main/LICENSE) [![GitHub Issues or Pull Requests](https://img.shields.io/github/issues/Muppet1856/Hello_World_CF_Worker_D1)](https://github.com/Muppet1856/Hello_World_CF_Worker_D1/issues) <!-- PREVIEW_BADGE_START -->[![Preview](https://img.shields.io/badge/preview-codex-add-blank-deleteme-test-file-purple?link=https://codex-add-blank-deleteme-test-file-hello-world.zellen.workers.dev)](https://codex-add-blank-deleteme-test-file-hello-world.zellen.workers.dev)<!-- PREVIEW_BADGE_END -->

This template bundles a minimal Worker that reads from a Cloudflare D1 database **and** the automation needed to provision, migrate, deploy, and clean up that infrastructure. Use it to study or adopt the workflows that keep preview and production environments in sync with your GitHub branches.

## What ships in this repository?

| Area | What it demonstrates |
| --- | --- |
| Worker implementation (`src/index.js`) | See <a href="src/">`src/README.md`</a> for notes on replacing the demo Worker with your own implementation. |
| Database migrations (`migrations/*.sql`) | Applies schema changes (sample `greetings` table included) through Wrangler so every deployment runs against known migrations. |
| Deployment workflow (`.github/workflows/deploy.yml`) | Creates or reuses the target Worker and D1 database, applies SQL migrations, deploys preview environments for pull requests, deploys `main` to production, and comments the preview URL back on the PR. |
| Cleanup workflow (`.github/workflows/cleanup.yml`) | Deletes the preview Worker + D1 database when a pull request closes or a branch is deleted so environments do not pile up. |

## How the workflows operate

### Deploy (`.github/workflows/deploy.yml`)

The deploy workflow reacts to every push and pull request:

1. **Detects the environment** – `DEPLOY` is blank for production (pushes to `main`), `pr-<number>` for PRs, and a sanitized branch name for other pushes.
2. **Generates `wrangler.toml` on the fly** – The production job writes the file from scratch, injects the Worker name, dynamically adds a D1 binding once the database is located or created, and auto-discovers any configured custom domain (falling back to the account's `workers.dev` subdomain when none exists).
3. **Provisions D1** – Uses Wrangler CLI to list existing databases, create preview databases as needed, and export `DB_NAME`/`DB_ID` for downstream steps.
4. **Runs migrations** – Executes every SQL file under `migrations/` with `wrangler d1 execute` and verifies that tables were created successfully.
5. **Deploys and reports** – Publishes through `cloudflare/wrangler-action`, captures the generated preview URL, and comments it on the pull request.

Key repository configuration expected by the workflow:

| Name | Type | Description |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Token with Workers Scripts, Workers Routes, and D1 Databases access. |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Numeric Cloudflare account id. |
| `WORKER_NAME` | Variable | Base Worker name (e.g. `hello-world-cf-worker-d1`). |
| `BINDING_NAME` | Variable | D1 binding name used by the Worker (`HELLO_WORLD_DB` by default). |
| `USE_PRODUCTION_DB_ON_PREVIEW` | Variable (optional) | When `true`, previews reuse the production database; otherwise previews get isolated databases. |

### Cleanup (`.github/workflows/cleanup.yml`)

Closing a pull request or deleting a branch runs the cleanup workflow. It mirrors the branch sanitization logic from the deploy job, then:

1. Authenticates against the Cloudflare API using the same secrets.
2. Deletes the preview Worker whose name matches `<sanitized-branch>-<WORKER_NAME>` if it exists.
3. Removes the associated preview D1 database through Wrangler so D1 instance limits are not exhausted.

## Running the Worker locally

1. Install [Wrangler 4](https://developers.cloudflare.com/workers/wrangler/install-and-update/) (the workflows pin that version).
2. Create a `.env` file with your `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, and any Worker variables (`SITE_TITLE`, `DEFAULT_GREETING`, etc.).
3. Provision a database with `npx wrangler d1 create <db-name>` and add the binding to a local `wrangler.toml` (see the generated version in CI for reference).
4. Apply migrations locally via `npx wrangler d1 execute <db-name> --file=migrations/0001_create_greetings.sql`.
5. Run `npx wrangler dev` to test the Worker with the bound database.

## Troubleshooting

- Ensure `WORKER_NAME` and `BINDING_NAME` are defined as repository variables; both workflows fail fast if they are missing.
- If database creation fails due to plan limits, the deploy workflow surfaces the Cloudflare error and stops before deploying.
- Preview cleanups require the same Cloudflare API token scopes as deployments. Verify the token includes D1 management access if preview databases linger after PR closure.
