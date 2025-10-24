# Migrations

This directory is consumed by [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) during CI/CD. The "Apply D1 migrations" step executes every `*.sql` file here against the targeted Cloudflare D1 database in lexicographical order. Replace these placeholder files with the SQL migrations that create and evolve your own schema, or delete them entirely if you manage migrations elsewhere. Leaving the provided sample migration in place will deploy its example table to your database.
