# Cloudflare Workers Hello World with D1

This project deploys a minimal Cloudflare Worker that renders a webpage whose
content is served from a Cloudflare D1 database. The worker requires an active
D1 binding and will surface an error if the database has not been created yet so
that misconfigurations are caught early during deployment.

## Prerequisites

- [Cloudflare account](https://dash.cloudflare.com/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/)
- D1 enabled for your account (beta feature)

## Project structure

```
.
├── migrations/                  # SQL migrations for the D1 database
│   └── 0001_create_greetings.sql
├── src/
│   └── index.js                 # Worker script that reads from D1
├── package.json                 # Scripts for local dev, deploy, and migrations
└── wrangler.toml                # Wrangler configuration and D1 binding
```

## Cloudflare API token

Wrangler authenticates with Cloudflare using an [API token](https://dash.cloudflare.com/profile/api-tokens).
Create a token with the following permissions so it can manage Workers and
D1 databases on your behalf:

1. Visit your Cloudflare dashboard and open **My Profile → API Tokens**.
2. Click **Create Token** and start from the **Edit Cloudflare Workers**
   template (or choose **Create Custom Token**).
3. Ensure the token includes these permissions:
   - **Account · Workers Scripts · Edit** – allows Wrangler to publish the worker.
   - **Account · Workers Routes · Edit** – required when you bind the worker to a route.
   - **Account · D1 Databases · Edit** – allows Wrangler to run migrations and
     create the D1 database when needed.
4. Scope the token to the specific **Account** that owns your worker.
5. Give the token a descriptive name (e.g. `wrangler-deploy`) and save it in a
   secure password manager. You will only be able to copy it once.

Store the token in the `CLOUDFLARE_API_TOKEN` environment variable locally (for
example by using a `.env` file) and in `secrets.CLOUDFLARE_API_TOKEN` when using
GitHub Actions. Wrangler will read the value automatically, and the helper
scripts in this repository expect the same variable.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Ensure the D1 database exists and that its id is recorded in `wrangler.toml`:

   ```bash
   npm run db:ensure
   ```

   The script checks for a database named `hello_world`, creates it if it does
   not exist yet, writes the resulting `database_id` to `wrangler.toml`, and runs
   the initial migration so the `greetings` table is ready. You can target a
   different database name or Wrangler configuration file:

   ```bash
   npm run db:ensure -- my_db
   npm run db:ensure -- my_db --wrangler=../other-project/wrangler.toml
   npm run db:ensure -- --no-migrations       # skip running migrations after creation
   ```

3. Apply migrations locally or to your remote environment as needed:

   ```bash
   # Apply migrations to the local D1 instance used by wrangler dev
   npm run migrate

   # To apply migrations to the production database
   wrangler d1 migrations apply hello_world --remote
   ```

## Local development

Start a local development server with an attached D1 database:

```bash
npm run dev
```

Wrangler will run the worker and automatically expose the D1 database so the
`Hello World` message can be retrieved.

## Deploy

When you're ready to deploy the worker to Cloudflare, run:

```bash
npm run deploy
```

The deployment command first verifies that the D1 database exists (creating it
and applying the initial migration if necessary) and then deploys the worker.
Because the worker requires a D1 binding, the deployment will fail quickly if
credentials are missing or the D1 creation step cannot be completed.

## Customizing the greeting

To change the greeting, update the value in the D1 database. For example:

```bash
wrangler d1 execute hello_world \
  --command='UPDATE greetings SET message = "Hello from D1" WHERE id = 1;'
```

Reload the page and the new greeting will appear instantly.

## Using the database id in GitHub Actions

If you need the database id inside a GitHub Actions workflow—for example to
configure another step—you can rely on the same helper scripts. The command will
query the id and append it to the special environment file that Actions exposes
via `GITHUB_ENV`, and a companion command can then apply the value to
`wrangler.toml`.

```yaml
- name: Export the D1 database id
  run: npm run db:github-env -- --github-env=CF_D1_DATABASE_ID
  env:
    CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
    CF_ACCOUNT_ID: ${{ secrets.CF_ACCOUNT_ID }}

- name: Update wrangler.toml with the id
  run: npm run db:apply-env -- --env=CF_D1_DATABASE_ID
```

Subsequent steps can then read `${{ env.CF_D1_DATABASE_ID }}` or rely on the
updated config file. If you are happy with the default `D1_DATABASE_ID` variable
name you can omit both `--github-env` and `--env`.

This repository also includes an example workflow at
`.github/workflows/apply-d1-id.yml` that wires these steps together for a
manual, `workflow_dispatch`-triggered run.
