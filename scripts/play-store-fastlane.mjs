#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    throw result.error;
  }

  if ((result.status ?? 0) !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed with exit code ${result.status ?? 1}`);
  }
}

function ensureBundleInstall() {
  const check = spawnSync('bundle', ['check'], {
    cwd: root,
    stdio: 'inherit',
    shell: false
  });

  if ((check.status ?? 1) !== 0) {
    run('bundle', ['install']);
  }
}

function resolveAabPath() {
  if (process.env.ANDROID_AAB_PATH) {
    return process.env.ANDROID_AAB_PATH;
  }

  const downloadsDir = path.join(os.homedir(), 'Downloads');
  const candidates = fs
    .readdirSync(downloadsDir)
    .filter((entry) => /^DoneYet-android-production-.*\.aab$/i.test(entry))
    .map((entry) => {
      const filePath = path.join(downloadsDir, entry);
      return {
        filePath,
        modifiedAt: fs.statSync(filePath).mtimeMs
      };
    })
    .sort((left, right) => right.modifiedAt - left.modifiedAt);

  if (candidates.length === 0) {
    throw new Error('No Android AAB found. Set ANDROID_AAB_PATH or place a DoneYet production AAB in ~/Downloads.');
  }

  return candidates[0].filePath;
}

function main() {
  const lane = process.argv[2];
  if (!lane) {
    throw new Error('Expected a fastlane lane name, for example: play_validate');
  }

  run('node', [path.join(root, 'scripts', 'play-store-prepare.mjs')]);
  ensureBundleInstall();

  const aabPath = resolveAabPath();
  run('bundle', ['exec', 'fastlane', 'android', lane, `aab_path:${aabPath}`]);
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
