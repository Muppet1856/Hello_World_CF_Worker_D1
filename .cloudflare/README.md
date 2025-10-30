# `.cloudflare` directory

This folder mirrors the structure that Cloudflare's dashboard and Wrangler create when you download an environment template for a Worker project. It is safe to commit to source control so teammates can reuse the same configuration.

## Files

- `vars.json` – Stores Worker [plain-text environment variables](https://developers.cloudflare.com/workers/configuration/environment-variables/#plaintext-strings). The automation in this repository reads the file when running `npx wrangler deploy` so the values are available to the Worker both locally and in CI.

## Editing instructions

1. Update the JSON object in `vars.json` with any additional key/value pairs that your Worker needs (string values only).
2. Keep secrets out of this file. Use Wrangler's encrypted secrets store (`wrangler secret put`) for anything sensitive.
3. After editing, re-run `npx wrangler deploy` or trigger the **Deploy to Cloudflare Worker with D1** GitHub Action so the new variables are published.

For details on using these variables in your Worker code, see the "Passing variables from `.cloudflare/vars.json`" section in the repository's main `README.md`.
