import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = process.cwd();
const tempRoot = '/tmp/doneyet-vitest';

rmSync(tempRoot, { recursive: true, force: true });
mkdirSync(tempRoot, { recursive: true });

const rsyncResult = spawnSync(
  'rsync',
  ['-a', '--delete', '--exclude', 'node_modules', '--exclude', '.git', '--exclude', '.expo', '--exclude', '.expo-shared', '--exclude', 'ios', './', `${tempRoot}/`],
  {
    cwd: sourceRoot,
    stdio: 'inherit'
  }
);

if ((rsyncResult.status ?? 1) !== 0) {
  process.exit(rsyncResult.status ?? 1);
}

const sourceNodeModules = resolve(sourceRoot, 'node_modules');
const destinationNodeModules = resolve(tempRoot, 'node_modules');
if (existsSync(sourceNodeModules)) {
  symlinkSync(sourceNodeModules, destinationNodeModules, 'dir');
}

const result = spawnSync('npx', ['vitest', 'run', ...process.argv.slice(2)], {
  cwd: tempRoot,
  stdio: 'inherit',
  env: {
    ...process.env,
    CI: '1'
  }
});

process.exit(result.status ?? 1);
