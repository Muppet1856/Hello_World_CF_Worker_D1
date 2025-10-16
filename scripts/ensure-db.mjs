import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { extractDatabaseId, fetchDatabaseId } from './get-db-id.mjs';
import { writeDatabaseIdToConfig } from './set-db-id.mjs';

const DEFAULT_DATABASE_NAME = 'hello_world';
const DEFAULT_WRANGLER_PATH = 'wrangler.toml';

function parseArguments(argv) {
  const args = argv.slice(2);
  const positional = [];
  let wranglerPath = DEFAULT_WRANGLER_PATH;
  let runMigrations = true;

  for (const arg of args) {
    if (arg.startsWith('--wrangler=')) {
      const [, value] = arg.split('=');
      wranglerPath = value || DEFAULT_WRANGLER_PATH;
      continue;
    }

    if (arg === '--wrangler') {
      throw new Error('--wrangler requires a value, e.g. --wrangler=../wrangler.toml');
    }

    if (arg === '--no-migrations') {
      runMigrations = false;
      continue;
    }

    positional.push(arg);
  }

  const [databaseName = DEFAULT_DATABASE_NAME] = positional;

  return { databaseName, wranglerPath, runMigrations };
}

function createDatabase(databaseName) {
  const command = `wrangler d1 create ${databaseName}`;
  const stdout = execSync(command, { stdio: ['ignore', 'pipe', 'inherit'] });
  const text = stdout.toString().trim();

  let databaseId = null;

  if (text) {
    try {
      const response = JSON.parse(text);
      databaseId = extractDatabaseId(response);
    } catch (error) {
      console.warn('Wrangler create output was not JSON. Falling back to querying the API for the database id.');
    }
  }

  if (!databaseId) {
    try {
      databaseId = fetchDatabaseId(databaseName);
    } catch (lookupError) {
      const message = lookupError.stderr?.toString()?.trim() ?? lookupError.message;
      const responseSnippet = text ? `Wrangler response: ${text}\n` : '';
      throw new Error(
        `Created the database but could not determine its id. ${responseSnippet}Lookup error: ${message}`,
      );
    }
  }

  console.log(`Created D1 database "${databaseName}" with id ${databaseId}.`);
  return databaseId;
}

function ensureDatabase(databaseName) {
  try {
    const databaseId = fetchDatabaseId(databaseName);
    console.log(`Found existing D1 database \"${databaseName}\" (id ${databaseId}).`);
    return { databaseId, created: false };
  } catch (error) {
    if (error.stderr) {
      const message = error.stderr.toString().trim();
      console.warn(message);
    } else if (error.message) {
      console.warn(error.message);
    }

    const databaseId = createDatabase(databaseName);
    return { databaseId, created: true };
  }
}

function applyMigrations(databaseName) {
  const command = `wrangler d1 migrations apply ${databaseName} --remote`;
  console.log(`Applying migrations to \"${databaseName}\" ...`);
  execSync(command, { stdio: 'inherit' });
}

function main() {
  const { databaseName, wranglerPath, runMigrations } = parseArguments(process.argv);

  try {
    const { databaseId, created } = ensureDatabase(databaseName);
    writeDatabaseIdToConfig(databaseId, wranglerPath);
    console.log(`Updated ${wranglerPath} with database id ${databaseId}.`);

    if (created && runMigrations) {
      applyMigrations(databaseName);
    }
  } catch (error) {
    if (error.stderr) {
      console.error(error.stderr.toString().trim());
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
