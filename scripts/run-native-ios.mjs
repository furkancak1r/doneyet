#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const iosDir = path.join(root, 'ios');
const workspacePath = path.join(iosDir, 'DoneYet.xcworkspace');
const podfilePath = path.join(iosDir, 'Podfile');

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: 'inherit',
    shell: false
  });

  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }

  if (typeof result.status === 'number' && result.status !== 0) {
    process.exit(result.status);
  }
}

const extraArgs = process.argv.slice(2);
const wantsHelp = extraArgs.includes('--help') || extraArgs.includes('-h');

function startBackground(command, args, options = {}) {
  const child = spawn(command, args, {
    cwd: options.cwd ?? root,
    env: { ...process.env, ...(options.env ?? {}) },
    stdio: 'ignore',
    detached: true,
    shell: false
  });

  child.unref();
  return child;
}

function ensureNativeProject() {
  if (existsSync(workspacePath) && existsSync(podfilePath)) {
    return;
  }

  console.log('Native iOS project not found. Generating it with Expo prebuild...');
  run('npx', ['expo', 'prebuild', '--platform', 'ios', '--clean', '--no-install']);
}

function installPods() {
  console.log('Installing CocoaPods...');
  run('pod', ['install', '--repo-update', '--ansi'], { cwd: iosDir });
}

function startMetro() {
  console.log('Starting Metro bundler in the background...');
  startBackground('npx', ['react-native', 'start', '--port', '8081', '--host', '0.0.0.0', '--reset-cache'], {
    cwd: root
  });
}

async function waitForMetro() {
  const endpoint = 'http://127.0.0.1:8081/status';
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(endpoint);
      const status = await response.text();
      if (status.trim() === 'packager-status:running') {
        return;
      }
    } catch {
      // Keep waiting until Metro is ready.
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error('Metro bundler did not become ready on port 8081.');
}

function launchNativeBuild() {
  if (wantsHelp) {
    run('npx', ['react-native', 'run-ios', '--help'], { cwd: root });
    return;
  }

  const deviceName = process.env.IOS_DEVICE_NAME || 'iPhone';
  const args = ['react-native', 'run-ios', '--device', deviceName, '--no-packager', '--port', '8081', ...extraArgs];
  run('npx', args, { cwd: root });
}

if (wantsHelp) {
  launchNativeBuild();
  process.exit(0);
}

ensureNativeProject();
installPods();
startMetro();
await waitForMetro();
launchNativeBuild();
