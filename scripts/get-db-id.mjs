import { appendFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export function fetchDatabaseId(databaseName = 'hello_world') {
  const command = `wrangler d1 info ${databaseName} --json`;
  const stdout = execSync(command, { stdio: ['ignore', 'pipe', 'pipe'] });
  const info = JSON.parse(stdout.toString());
  const databaseId = info?.uuid;

  if (!databaseId) {
    throw new Error(`Could not find a database id in the response for "${databaseName}".`);
  }

  return databaseId;
}

function writeGithubEnv(databaseId, variableName) {
  const githubEnvFile = process.env.GITHUB_ENV;

  if (!githubEnvFile) {
    throw new Error('GITHUB_ENV is not set. This option is only available within GitHub Actions.');
  }

  appendFileSync(githubEnvFile, `${variableName}=${databaseId}\n`);
}

function runCli(argv) {
  const args = argv.slice(2);
  const positional = [];
  let githubEnvVariable = null;

  for (const arg of args) {
    if (arg === '--github-env') {
      githubEnvVariable = 'D1_DATABASE_ID';
      continue;
    }

    if (arg.startsWith('--github-env=')) {
      const [, variableName] = arg.split('=');
      githubEnvVariable = variableName || 'D1_DATABASE_ID';
      continue;
    }

    positional.push(arg);
  }

  const [databaseName = 'hello_world'] = positional;

  try {
    const databaseId = fetchDatabaseId(databaseName);

    if (githubEnvVariable) {
      writeGithubEnv(databaseId, githubEnvVariable);
    } else {
      console.log(databaseId);
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
  runCli(process.argv);
}
