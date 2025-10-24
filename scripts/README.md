# Scripts

The utilities in this directory support the demo project and assume you have the Cloudflare Wrangler CLI installed and
configured. They are intentionally lightweight so you can either adapt them to your needs or replace them entirely.

- `ensure-db.mjs` – Creates (or reuses) a D1 database, writes its id into `wrangler.toml`, and applies migrations found in
  `migrations/`. The script expects `wrangler.toml` to contain a `[[d1_databases]]` entry with a placeholder `database_id` value.
- `get-db-id.mjs` – Helper used by the other scripts to resolve an existing database id via `wrangler d1 list`.
- `set-db-id.mjs` – Updates the placeholder `database_id` in `wrangler.toml` either from an environment variable or by looking up
  the database directly.

If you keep any of these helpers, audit the behaviour carefully before using them in production workflows.
