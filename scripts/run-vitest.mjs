import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const sourceRoot = process.cwd();
const tempRoot = '/tmp/doneyet-tests';
const sourceNodeModules = resolve(sourceRoot, 'node_modules');
const destinationNodeModules = resolve(tempRoot, 'node_modules');
const passthroughArgs = process.argv.slice(2);
const explicitTestFilesOnly =
  passthroughArgs.length > 0 &&
  passthroughArgs.every((arg) => arg.endsWith('.test.ts') || arg.endsWith('.test.tsx'));

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

if (existsSync(sourceNodeModules)) {
  if (/[?#]/.test(sourceRoot)) {
    const cloneResult = spawnSync('cp', ['-cR', sourceNodeModules, destinationNodeModules], {
      stdio: 'inherit'
    });

    if ((cloneResult.status ?? 1) !== 0) {
      rmSync(destinationNodeModules, { recursive: true, force: true });

      const copyResult = spawnSync('cp', ['-R', sourceNodeModules, destinationNodeModules], {
        stdio: 'inherit'
      });

      if ((copyResult.status ?? 1) !== 0) {
        process.exit(copyResult.status ?? 1);
      }
    }
  } else {
    symlinkSync(sourceNodeModules, destinationNodeModules, 'dir');
  }
}

const runCommand = (command, args, env = {}) =>
  spawnSync(command, args, {
    cwd: tempRoot,
    stdio: 'inherit',
    env: {
      ...process.env,
      CI: '1',
      ...env
    }
  });

const discoverTests = (pattern) => {
  const result = spawnSync('rg', ['--files', 'tests', '-g', pattern], {
    cwd: tempRoot,
    encoding: 'utf8'
  });

  if ((result.status ?? 1) !== 0) {
    return [];
  }

  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
};

const vitestTargets =
  passthroughArgs.length === 0
    ? discoverTests('*.test.ts')
    : explicitTestFilesOnly
      ? passthroughArgs.filter((arg) => arg.endsWith('.test.ts'))
      : [];

const jestTargets =
  passthroughArgs.length === 0
    ? discoverTests('*.test.tsx')
    : explicitTestFilesOnly
      ? passthroughArgs.filter((arg) => arg.endsWith('.test.tsx'))
      : [];

if (vitestTargets.length > 0) {
  const vitestResult = runCommand('node', ['./node_modules/vitest/vitest.mjs', 'run', ...vitestTargets]);

  if ((vitestResult.status ?? 1) !== 0) {
    process.exit(vitestResult.status ?? 1);
  }
}

if (jestTargets.length > 0) {
  const nodeOptions = ['--experimental-vm-modules'];
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0] ?? '0', 10);

  if (nodeMajor >= 22) {
    nodeOptions.push(`--localstorage-file=${resolve(tempRoot, '.jest-localstorage')}`);
  }

  const jestResult = runCommand(
    'node',
    [...nodeOptions, './node_modules/jest/bin/jest.js', '--config', './jest.config.js', '--runInBand', ...jestTargets]
  );

  if ((jestResult.status ?? 1) !== 0) {
    process.exit(jestResult.status ?? 1);
  }
}

if (passthroughArgs.length > 0 && !explicitTestFilesOnly) {
  const legacyResult = runCommand('node', ['./node_modules/vitest/vitest.mjs', 'run', ...passthroughArgs]);

  process.exit(legacyResult.status ?? 1);
}

process.exit(0);
