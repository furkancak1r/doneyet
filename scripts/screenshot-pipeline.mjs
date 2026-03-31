#!/usr/bin/env node
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(scriptName, args) {
  const result = spawnSync('node', [path.join(root, 'scripts', scriptName), ...args], {
    cwd: root,
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    throw new Error(`${scriptName} failed with exit code ${result.status ?? 1}`);
  }
}

try {
  const args = process.argv.slice(2);
  run('screenshot-capture.mjs', args);
  run('screenshot-frame.mjs', []);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
