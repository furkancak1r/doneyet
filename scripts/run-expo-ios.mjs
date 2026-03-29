import { cpSync, existsSync, mkdirSync, readdirSync, rmSync, symlinkSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = process.cwd();
const tempRoot = '/tmp/doneyet-expo-ios';

const passthroughArgs = process.argv.slice(2);

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });

for (const entry of readdirSync(sourceRoot, { withFileTypes: true })) {
  if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.expo' || entry.name === '.expo-shared') {
    continue;
  }

  cpSync(join(sourceRoot, entry.name), join(tempRoot, entry.name), { recursive: true });
}

const sourceNodeModules = resolve(sourceRoot, 'node_modules');
const destinationNodeModules = resolve(tempRoot, 'node_modules');
if (existsSync(sourceNodeModules)) {
  symlinkSync(sourceNodeModules, destinationNodeModules, 'dir');
}

const result = spawnSync('npx', ['expo', 'run:ios', ...passthroughArgs], {
  cwd: tempRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: process.env.CI ?? '0'
  }
});

process.exit(result.status ?? 1);
