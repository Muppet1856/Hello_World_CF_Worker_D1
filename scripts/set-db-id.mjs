import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { fetchDatabaseId } from './get-db-id.mjs';

function updateWranglerToml(databaseId, wranglerPath) {
  const absolutePath = resolve(wranglerPath);
  const original = readFileSync(absolutePath, 'utf8');

  let replacements = 0;
  const updated = original.replace(/(database_id\s*=\s*")[^"]+(")/g, (match, prefix, suffix) => {
    replacements += 1;
    return `${prefix}${databaseId}${suffix}`;
  });

  if (replacements === 0) {
    throw new Error(`Could not find any database_id entries in ${absolutePath}.`);
  }

  writeFileSync(absolutePath, updated);
}

function readDatabaseIdFromEnv(variableName) {
  const value = process.env[variableName];

  if (!value) {
    throw new Error(`Environment variable ${variableName} is not set or empty.`);
  }

  return value.trim();
}

function parseArguments(argv) {
  const args = argv.slice(2);
  const positional = [];
  let envVar = null;
  let wranglerPath = null;

  for (const arg of args) {
    if (arg === '--env') {
      envVar = 'D1_DATABASE_ID';
      continue;
    }

    if (arg.startsWith('--env=')) {
      const [, value] = arg.split('=');
      envVar = value || 'D1_DATABASE_ID';
      continue;
    }

    if (arg.startsWith('--wrangler=')) {
      const [, value] = arg.split('=');
      wranglerPath = value || 'wrangler.toml';
      continue;
    }

    positional.push(arg);
  }

  const [databaseName = 'hello_world', positionalWranglerPath] = positional;

  return {
    databaseName,
    wranglerPath: wranglerPath ?? positionalWranglerPath ?? 'wrangler.toml',
    envVar,
  };
}

function main() {
  const { databaseName, wranglerPath, envVar } = parseArguments(process.argv);

  try {
    const databaseId = envVar ? readDatabaseIdFromEnv(envVar) : fetchDatabaseId(databaseName);
    updateWranglerToml(databaseId, wranglerPath);

    if (envVar) {
      console.log(`Updated ${wranglerPath} with database id from $${envVar}.`);
    } else {
      console.log(`Updated ${wranglerPath} with database id ${databaseId}.`);
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
