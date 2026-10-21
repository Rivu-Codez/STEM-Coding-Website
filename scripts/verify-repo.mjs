import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const requiredFiles = [
  'README.md',
  'supabase/config.toml',
  'supabase/functions/analyze-mistake/index.ts',
  'login.html',
  'PhysicsSim/index.html',
  'RoboMaze/index.html',
  'RoboMaze/creator.html',
];

export function collectMigrationNumbers(migrationDirectory) {
  return fs.readdirSync(migrationDirectory)
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .map((name) => Number(name.split('_', 1)[0]))
    .sort((a, b) => a - b);
}

export function verifyRepository(repositoryRoot = root) {
  const errors = [];

  for (const relativePath of requiredFiles) {
    if (!fs.existsSync(path.join(repositoryRoot, relativePath))) {
      errors.push(`Missing required file: ${relativePath}`);
    }
  }

  const migrationDirectory = path.join(repositoryRoot, 'supabase', 'migrations');
  const migrationNumbers = collectMigrationNumbers(migrationDirectory);
  const expectedNumbers = Array.from({ length: migrationNumbers.length }, (_, index) => index + 1);

  if (migrationNumbers.length === 0) {
    errors.push('No numbered SQL migrations were found.');
  } else if (migrationNumbers.some((number, index) => number !== expectedNumbers[index])) {
    errors.push(`Migration numbers must be contiguous from 001. Found: ${migrationNumbers.join(', ')}`);
  }

  const functionDirectory = path.join(repositoryRoot, 'supabase', 'functions', 'analyze-mistake');
  const functionSource = fs.readdirSync(functionDirectory)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => fs.readFileSync(path.join(functionDirectory, name), 'utf8'))
    .join('\n');
  for (const requiredState of [
    'AI_SUCCESS',
    'AI_RATE_LIMITED',
    'AI_TEMPORARILY_UNAVAILABLE',
    'AI_INVALID_RESPONSE',
  ]) {
    if (!functionSource.includes(requiredState)) {
      errors.push(`Edge Function is missing tutor state: ${requiredState}`);
    }
  }

  const sourceFiles = ['js', 'supabase/functions'].flatMap((relativeDirectory) => {
    const directory = path.join(repositoryRoot, relativeDirectory);
    if (!fs.existsSync(directory)) return [];
    const files = [];
    const visit = (currentDirectory) => {
      for (const entry of fs.readdirSync(currentDirectory, { withFileTypes: true })) {
        const currentPath = path.join(currentDirectory, entry.name);
        if (entry.isDirectory()) visit(currentPath);
        else if (/\.(js|ts)$/.test(entry.name)) files.push(currentPath);
      }
    };
    visit(directory);
    return files;
  });

  const secretPattern = /service_role|SUPABASE_SERVICE_ROLE_KEY|GEMINI_API_KEY\s*=/i;
  for (const file of sourceFiles) {
    if (secretPattern.test(fs.readFileSync(file, 'utf8'))) {
      errors.push(`Potential secret name found in source: ${path.relative(repositoryRoot, file)}`);
    }
  }

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const errors = verifyRepository();
  if (errors.length > 0) {
    console.error(errors.join('\n'));
    process.exitCode = 1;
  } else {
    console.log('Repository verification passed.');
  }
}
