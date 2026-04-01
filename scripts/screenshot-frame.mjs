#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const screenshotsDir = path.join(root, 'fastlane', 'screenshots');
const artifactsDir = path.join(root, 'artifacts', 'app-store');
const locales = ['en-US', 'tr'];
const screenshotNames = ['home', 'calendar', 'list-detail', 'task-detail', 'ipad-home'];

const imageTargets = {
  iphone: {
    width: 1242,
    height: 2688
  },
  ipad: {
    width: 2048,
    height: 2732
  }
};

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
  run('bundle', ['config', 'set', 'path', 'vendor/bundle']);

  const check = spawnSync('bundle', ['check'], {
    cwd: root,
    stdio: 'inherit',
    shell: false
  });

  if ((check.status ?? 1) !== 0) {
    run('bundle', ['install']);
  }
}

function resizeScreenshot(sourcePath, destinationPath, width, height) {
  run('sips', ['--resampleHeightWidth', String(height), String(width), sourcePath, '--out', destinationPath]);
}

function normalizeScreenshots() {
  for (const locale of locales) {
    const localeDir = path.join(screenshotsDir, locale);

    for (const screenshotName of screenshotNames) {
      const rawPath = path.join(localeDir, `${screenshotName}.capture.png`);
      const normalizedPath = path.join(localeDir, `${screenshotName}.png`);

      if (!fs.existsSync(rawPath) && fs.existsSync(normalizedPath)) {
        continue;
      }

      if (!fs.existsSync(rawPath)) {
        throw new Error(`Expected raw screenshot is missing: ${rawPath}`);
      }

      const target = screenshotName.startsWith('ipad-') ? imageTargets.ipad : imageTargets.iphone;
      resizeScreenshot(rawPath, normalizedPath, target.width, target.height);
      fs.rmSync(rawPath, { force: true });
    }
  }
}

function copyFramedArtifacts() {
  fs.rmSync(artifactsDir, { recursive: true, force: true });

  for (const locale of locales) {
    const destinationDir = path.join(artifactsDir, locale);
    fs.mkdirSync(destinationDir, { recursive: true });

    for (const screenshotName of screenshotNames) {
      const candidates = [
        path.join(screenshotsDir, 'framed', locale, `${screenshotName}.png`),
        path.join(screenshotsDir, 'framed', locale, `${screenshotName}_framed.png`),
        path.join(screenshotsDir, locale, 'framed', `${screenshotName}.png`),
        path.join(screenshotsDir, locale, 'framed', `${screenshotName}_framed.png`),
        path.join(screenshotsDir, locale, `${screenshotName}_framed.png`)
      ];

      const sourcePath = candidates.find((candidate) => fs.existsSync(candidate));
      if (!sourcePath) {
        throw new Error(`Unable to locate the framed screenshot for ${locale}/${screenshotName}.`);
      }

      fs.copyFileSync(sourcePath, path.join(destinationDir, `${screenshotName}.png`));
    }
  }
}

function main() {
  ensureBundleInstall();
  normalizeScreenshots();
  run('bundle', ['exec', 'fastlane', 'frameit'], {
    cwd: screenshotsDir
  });
  copyFramedArtifacts();
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
