#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appStoreMetadataRoot = path.join(root, 'fastlane', 'metadata');
const appStoreScreenshotsRoot = path.join(root, 'fastlane', 'screenshots');
const playStoreMetadataRoot = path.join(appStoreMetadataRoot, 'android');
const iconSourcePath = path.join(root, 'assets', 'icon.png');

const localePlan = [
  {
    sourceLocale: 'en-US',
    targetLocale: 'en-US'
  },
  {
    sourceLocale: 'tr',
    targetLocale: 'tr-TR'
  }
];

const screenshotPlan = [
  { sourceName: 'home.png', targetName: '01-home.png' },
  { sourceName: 'task-detail.png', targetName: '02-task-detail.png' }
];

function ensureDir(targetPath) {
  fs.mkdirSync(targetPath, { recursive: true });
}

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n').trim();
}

function writeText(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${text.trim()}\n`, 'utf8');
}

function truncateAtWord(value, limit) {
  if (value.length <= limit) {
    return value;
  }

  const sliced = value.slice(0, limit);
  const lastSpace = sliced.lastIndexOf(' ');
  const candidate = lastSpace > Math.floor(limit * 0.6) ? sliced.slice(0, lastSpace) : sliced;
  return candidate.trim();
}

function sanitizeSingleLine(value) {
  return value.replace(/\s+/g, ' ').trim();
}

function buildPlayTitle(sourceTitle) {
  return truncateAtWord(sanitizeSingleLine(sourceTitle), 30);
}

function buildShortDescription(sourceSubtitle) {
  return truncateAtWord(sanitizeSingleLine(sourceSubtitle), 80);
}

function buildFullDescription(sourceDescription, targetLocale) {
  const headingReplacements =
    targetLocale === 'tr-TR'
      ? new Map([['GÖRÜŞ ve hisset', 'GÖRÜNÜM']])
      : new Map();

  const lines = sourceDescription
    .split('\n')
    .map((line) => line.trimEnd())
    .map((line) => {
      if (line.startsWith('■ ')) {
        const heading = line.slice(2).trim();
        return headingReplacements.get(heading) ?? heading;
      }

      if (line.startsWith('• ')) {
        return `- ${line.slice(2).trim()}`;
      }

      return line;
    });

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

function copyFile(sourcePath, destinationPath) {
  ensureDir(path.dirname(destinationPath));
  fs.copyFileSync(sourcePath, destinationPath);
}

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
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

function stageLocaleMetadata({ sourceLocale, targetLocale }) {
  const sourceDir = path.join(appStoreMetadataRoot, sourceLocale);
  const destinationDir = path.join(playStoreMetadataRoot, targetLocale);

  const title = buildPlayTitle(readText(path.join(sourceDir, 'name.txt')));
  const shortDescription = buildShortDescription(readText(path.join(sourceDir, 'subtitle.txt')));
  const fullDescription = buildFullDescription(readText(path.join(sourceDir, 'description.txt')), targetLocale);
  const changelog = readText(path.join(sourceDir, 'whats_new.txt'));

  writeText(path.join(destinationDir, 'title.txt'), title);
  writeText(path.join(destinationDir, 'short_description.txt'), shortDescription);
  writeText(path.join(destinationDir, 'full_description.txt'), fullDescription);
  writeText(path.join(destinationDir, 'changelogs', 'default.txt'), changelog);

  const imagesDir = path.join(destinationDir, 'images');
  const phoneScreenshotsDir = path.join(imagesDir, 'phoneScreenshots');
  ensureDir(phoneScreenshotsDir);

  for (const screenshot of screenshotPlan) {
    copyFile(
      path.join(appStoreScreenshotsRoot, sourceLocale, screenshot.sourceName),
      path.join(phoneScreenshotsDir, screenshot.targetName)
    );
  }
}

function stageIcon() {
  const targetIconPath = path.join(playStoreMetadataRoot, 'en-US', 'images', 'icon.png');
  ensureDir(path.dirname(targetIconPath));
  run('sips', ['--resampleHeightWidth', '512', '512', iconSourcePath, '--out', targetIconPath]);

  for (const { targetLocale } of localePlan) {
    if (targetLocale === 'en-US') {
      continue;
    }

    copyFile(targetIconPath, path.join(playStoreMetadataRoot, targetLocale, 'images', 'icon.png'));
  }
}

function main() {
  fs.rmSync(playStoreMetadataRoot, { recursive: true, force: true });
  ensureDir(playStoreMetadataRoot);

  for (const locale of localePlan) {
    stageLocaleMetadata(locale);
  }

  stageIcon();
}

try {
  main();
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
