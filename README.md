# Cloudflare Workers Hello World with D1

This repository is intentionally structured so you can fork it and bootstrap
your own Worker + D1 project on Cloudflare's infrastructure with minimal
changes. It demonstrates how to provision the required database, bind it to a
Worker, and automate deployments through GitHub Actions so you can focus on the
application logic rather than the initial setup.

The ready-to-deploy configuration is especially handy for vibe-coding
experiments with AI assistants such as ChatGPT-Codex, where you want to
prototype dynamic sites quickly and then ship them through the same automated
pipeline. By forking the repo, running the documented scripts, and letting your
assistant iterate on the Worker, you can move from idea to hosted experience in
minutes without pausing to wire up infrastructure.

This project deploys a minimal Cloudflare Worker that renders a webpage whose
content can be served from a Cloudflare D1 database when available. If the D1
binding has not been created yet, the worker falls back to a built-in greeting
so that deployments still succeed while clearly indicating that the database is
missing.

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

## Available npm scripts

These helper scripts wrap the Wrangler CLI so you can bootstrap the D1 database
and deploy the worker with a single command. Run them with `npm run <script>`:

| Script | Description |
| --- | --- |
| `dev` | Start a local development server that serves the built-in greeting. |
| `build` | Ensure the D1 database exists and write its id to `wrangler.toml`. |
| `deploy` | Publish the worker without requiring a D1 binding. |
| `deploy:d1` | Create the database if needed, run migrations, and deploy with the D1 binding. |
| `migrate` | Apply SQL migrations to the local development database. |
| `db:ensure` | Create or verify the D1 database outside of the build process. |
| `db:id` | Print the current D1 database id that Wrangler will use. |
| `db:set-id` | Update `wrangler.toml` with a provided database id. |
| `db:github-env` | Export the database id to the `GITHUB_ENV` file in CI workflows. |
| `db:apply-env` | Read a database id from the environment and persist it to `wrangler.toml`. |

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

## Cloudflare account id

Most deployment and database commands also need your **Account ID** so they can
target the correct Cloudflare account. You can obtain and store it as follows:

1. Visit the Cloudflare dashboard, pick the account in the top-left account
   switcher, and copy the **Account ID** shown on the **Overview** page. The ID
   is a 32-character hexadecimal string.
2. Alternatively, run `wrangler whoami --json` and copy the `account_id` and
   `user_id` properties from the output. The `account_id` is required by the
   scripts in this project, and the `user_id` is handy when you need to audit
   API activity inside the Cloudflare dashboard.
3. Save the account id in the `CLOUDFLARE_ACCOUNT_ID` environment variable (for
   example in a `.env` file) and add it to `secrets.CLOUDFLARE_ACCOUNT_ID` in
   GitHub Actions so the provided npm scripts and workflows can authenticate API
   requests for your D1 database. Store the user id somewhere secure alongside
   your token so you can reference it later if needed.

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. (Optional) Ensure the D1 database exists and that its id is recorded in
   `wrangler.toml`. You can do this explicitly or rely on the standard build
   command, which runs the same helper behind the scenes:

   ```bash
   npm run build
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

Start a local development server with the built-in greeting:

```bash
npm run dev
```

Wrangler will run the worker without a D1 binding. To attach D1, run the dev
server with the `d1` environment after configuring the binding:

```bash
wrangler dev --env d1
```

When the binding is present, the greeting is read from the D1 database.

## Deploy

When you're ready to deploy the worker to Cloudflare without a database, run:

```bash
npm run deploy
```

The worker will serve the built-in greeting if D1 is not available. To deploy
with D1, first create the database (see step 2) and then run:

```bash
npm run deploy:d1
```

This command verifies that the D1 database exists (creating it and applying the
initial migration if necessary) and then deploys the worker with the
`HELLO_WORLD_DB` binding.

## GitHub Actions deployment workflow

Automated deployments are handled by [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).
The workflow publishes production builds whenever commits land on `main` and
creates preview environments for open pull requests. Preview builds reuse the
Worker code from the branch, spin up an isolated D1 database that mirrors the
schema from the `migrations/` directory, and post the resulting URL to the pull
request for easy testing.

When a pull request is closed, the companion cleanup job removes the temporary
Worker and its database so you do not run into D1 instance limits. Production
deployments continue to use the Worker name provided in the repository
configuration.

### Required repository configuration

The workflow relies on a mix of GitHub secrets and repository variables. Add
the following entries in **Settings → Secrets and variables → Actions** before
enabling it:

| Name | Type | Description |
| --- | --- | --- |
| `CLOUDFLARE_API_TOKEN` | Secret | Token with permission to manage Workers, routes, and D1 databases. |
| `CLOUDFLARE_ACCOUNT_ID` | Secret | Cloudflare account identifier used when talking to the API. |
| `WORKER_NAME` | Variable | Base name for the Worker and production D1 database (for example `hello-world-cf-worker-d1`). |
| `BINDING_NAME` | Variable | The D1 binding name that should be written to `wrangler.toml` (use `HELLO_WORLD_DB` to match the worker code). |
| `DOMAIN` | Variable (optional) | Custom domain used for preview routes. Leave unset to use the default `<worker>.workers.dev` domain. |

You can also define plain variables such as `DEFAULT_GREETING` and `SITE_TITLE`
if you want the automated deployments to expose the same configuration values
as your production Worker. They will be available as environment variables
inside the Worker runtime.

### Cloudflare Git integration

Cloudflare's Git integration remains disabled for this repository. The
automatic cloning performed by Cloudflare's deployment pipeline conflicts with
our need to generate `wrangler.toml` dynamically during CI and manual deploys.
Keeping the integration inactive prevents Cloudflare from attempting to clone
the repository on its own, which previously caused builds to fail before the
configuration file could be written. Continue triggering deployments through
the provided npm scripts or the GitHub Actions workflow so the configuration
can be constructed on the fly before Wrangler runs.

## Configure the Cloudflare environment

The worker can run without a D1 binding, but the deployment scripts in this
repository will create the database (if missing) and add the binding to
`wrangler.toml` automatically. When the first request succeeds you will see the
default "This greeting is served from a built-in fallback message." copy on the
page. That "working without" style message confirms that the Worker executed
successfully even though the database is still being created or bound; it will
disappear on the next deploy once D1 is reachable.

To align your Cloudflare dashboard with that automated configuration:

1. **Create (or reuse) the Worker.** In the Cloudflare dashboard open
   **Workers & Pages → Workers**, click **Create**, and choose **Create Worker**.
   Give it a name that matches the `name` you plan to write into `wrangler.toml`
   (by default `hello-world-cf-worker-d1`). Deploy once so the worker exists in
   your account.
2. **Add the production environment variables.** With the worker selected open
   **Settings → Variables & Secrets**. Add the following plain-text variables so
   they match what the worker expects:
   - `DEFAULT_GREETING` – optional. Overrides the fallback greeting when the D1
     database is unavailable. If omitted the default remains "Hello World".

   Repeat the same configuration in GitHub so CI builds inherit the variable.
   In your repository choose **Settings → Secrets and variables → Actions → New
   variable**, give it the name `DEFAULT_GREETING`, and provide the value that
   should be available to production deployments. GitHub exposes plain-text
   variables to Actions workflows, allowing the helper scripts to mirror the
   Cloudflare dashboard configuration when they generate `wrangler.toml` on the
   fly.
3. **Confirm the D1 binding.** The helper scripts update `wrangler.toml` with a
   `HELLO_WORLD_DB` binding before every deploy, so you do not need to add it
   manually in the dashboard. After your first deployment, revisit the worker’s
   **Settings → D1 Databases** tab to confirm the binding appears automatically
   and is linked to the database that was created for you.
4. **(Optional) Create additional environments.** If you plan to run `wrangler
   dev --env d1` or deploy a staging build, add an environment (for example `d1`)
   from the **Environments** tab. Repeat the same variable configuration for
   that environment; the automated deployment process will ensure the binding is
   present there as well.
5. **Verify access tokens and account id.** Ensure the API token and account id
   documented earlier are configured as secrets (`CLOUDFLARE_API_TOKEN`) and
   plain variables (`CLOUDFLARE_ACCOUNT_ID`) in any CI platform that will run
   the deployment scripts.

Once these steps are complete the next deployment triggered through the npm
scripts or your automation will provision the D1 database (if needed), attach
the binding, and serve content from D1 as soon as the greeting row exists.

## Customizing the greeting

To change the greeting, either update the value in the D1 database or adjust the
`DEFAULT_GREETING` variable in `wrangler.toml`. For example, to edit the D1
record:

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
