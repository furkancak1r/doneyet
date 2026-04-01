#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { listAvailableSimulators } from './ios-metro-host.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const flowsDir = path.join(root, '.maestro', 'flows');
const maestroOutputRoot = path.join(root, 'fastlane');
const screenshotRoot = path.join(root, 'fastlane', 'screenshots');

const devicePlan = {
  iphone: {
    simulatorName: 'iPhone 17 Pro Max',
    flow: path.join(flowsDir, 'capture-iphone.yaml')
  },
  ipad: {
    simulatorName: 'iPad Pro 13-inch (M5)',
    flow: path.join(flowsDir, 'capture-ipad.yaml')
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

function parseOptions(argv) {
  const locales = [];
  let target = 'all';

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === '--locale') {
      const value = argv[index + 1];
      if (value) {
        locales.push(value);
        index += 1;
      }
      continue;
    }

    if (arg.startsWith('--locale=')) {
      locales.push(arg.slice('--locale='.length));
      continue;
    }

    if (arg === '--device') {
      const value = argv[index + 1];
      if (value === 'iphone' || value === 'ipad' || value === 'all') {
        target = value;
        index += 1;
      }
      continue;
    }

    if (arg.startsWith('--device=')) {
      const value = arg.slice('--device='.length);
      if (value === 'iphone' || value === 'ipad' || value === 'all') {
        target = value;
      }
    }
  }

  return {
    locales: locales.length > 0 ? locales : ['en-US', 'tr'],
    target
  };
}

function ensureTool(name) {
  const result = spawnSync('which', [name], {
    cwd: root,
    encoding: 'utf8',
    shell: false
  });

  if ((result.status ?? 1) !== 0) {
    throw new Error(`${name} is not installed or not available on PATH.`);
  }
}

function resolveSimulatorUdid(name) {
  const simulator = listAvailableSimulators().find((candidate) => candidate.name === name);
  if (!simulator?.udid) {
    throw new Error(`Simulator "${name}" is not available.`);
  }

  return simulator.udid;
}

function ensureLocaleDir(locale) {
  fs.mkdirSync(path.join(screenshotRoot, locale), { recursive: true });
}

function cleanRawCaptures(locale) {
  const localeDir = path.join(screenshotRoot, locale);
  if (!fs.existsSync(localeDir)) {
    return;
  }

  for (const entry of fs.readdirSync(localeDir)) {
    if (entry.endsWith('.capture.png') || entry.endsWith('.png') || entry.endsWith('.jpg')) {
      fs.rmSync(path.join(localeDir, entry), { force: true });
    }
  }
}

function launchAppBuild(simulatorName) {
  run('npm', ['run', 'ios', '--', '--simulator', simulatorName], {
    cwd: root
  });
}

function prepareApp(udid) {
  run('maestro', ['test', '--device', udid, path.join(flowsDir, 'prepare-app.yaml')], {
    cwd: root
  });
}

function seedApp(udid, locale) {
  run('xcrun', ['simctl', 'openurl', udid, `doneyet://debug/screenshot-seed?locale=${encodeURIComponent(locale)}`], {
    cwd: root
  });
}

function captureFlow(udid, locale, flowPath) {
  run(
    'maestro',
    [
      'test',
      '--device',
      udid,
      '--test-output-dir',
      maestroOutputRoot,
      '-e',
      `LOCALE=${locale}`,
      flowPath
    ],
    {
      cwd: root
    }
  );
}

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function main() {
  const { locales, target } = parseOptions(process.argv.slice(2));
  const deviceKeys = target === 'all' ? ['iphone', 'ipad'] : [target];

  ensureTool('maestro');
  ensureTool('xcrun');

  fs.mkdirSync(screenshotRoot, { recursive: true });

  for (const locale of locales) {
    ensureLocaleDir(locale);
    cleanRawCaptures(locale);
  }

  for (const deviceKey of deviceKeys) {
    const plan = devicePlan[deviceKey];
    const udid = resolveSimulatorUdid(plan.simulatorName);

    launchAppBuild(plan.simulatorName);

    for (const locale of locales) {
      prepareApp(udid);
      seedApp(udid, locale);
      await wait(5000);
      captureFlow(udid, locale, plan.flow);
    }
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
