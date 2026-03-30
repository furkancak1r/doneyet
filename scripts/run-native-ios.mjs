#!/usr/bin/env node
import { existsSync } from 'node:fs';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  listAvailableSimulators,
  listConnectedPhysicalDevices,
  resolveDefaultIosLaunchTarget,
  resolveExpoHostMode,
  resolveLaunchTargetFromArgs
} from './ios-metro-host.mjs';
import { waitForExpoIosBundleReady } from './run-native-ios-readiness.mjs';

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
const connectedPhysicalDevices = listConnectedPhysicalDevices();
const availableSimulators = listAvailableSimulators();
const explicitLaunchTarget = resolveLaunchTargetFromArgs(extraArgs, connectedPhysicalDevices, availableSimulators);
const defaultLaunchTarget = resolveDefaultIosLaunchTarget({
  connectedPhysicalDevices,
  preferredDeviceName: process.env.IOS_DEVICE_NAME,
  simulators: availableSimulators
});
const launchTarget = explicitLaunchTarget ?? defaultLaunchTarget;
const metroHostMode = resolveExpoHostMode({
  targetKind: launchTarget?.kind,
  override: process.env.IOS_METRO_HOST_MODE
});
const defaultMetroPort = Number(process.env.IOS_METRO_PORT || 8081);
let metroPortPlan = { needsServer: true, port: defaultMetroPort };

if (!wantsHelp) {
  metroPortPlan = await prepareMetroPort(defaultMetroPort, metroHostMode);
}

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

function getListeningPids(port) {
  const result = spawnSync('lsof', ['-nP', `-iTCP:${port}`, '-sTCP:LISTEN', '-t'], {
    cwd: root,
    encoding: 'utf8',
    shell: false
  });

  if (result.error || typeof result.stdout !== 'string') {
    return [];
  }

  return result.stdout
    .trim()
    .split(/\s+/)
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value > 0);
}

function getProcessCommand(pid) {
  const result = spawnSync('ps', ['-p', String(pid), '-o', 'command='], {
    cwd: root,
    encoding: 'utf8',
    shell: false
  });

  if (result.error || typeof result.stdout !== 'string') {
    return '';
  }

  return result.stdout.trim();
}

function commandBelongsToCurrentProject(command) {
  return command.includes('expo start') && command.includes(root);
}

function commandUsesHostMode(command, hostMode) {
  if (hostMode === 'localhost') {
    return command.includes('--localhost') || command.includes('--host localhost');
  }

  if (hostMode === 'lan') {
    return command.includes('--lan') || command.includes('--host lan');
  }

  if (hostMode === 'tunnel') {
    return command.includes('--tunnel') || command.includes('--host tunnel');
  }

  return false;
}

function killProcesses(pids) {
  for (const pid of pids) {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // Ignore processes that already exited between lookup and kill.
    }
  }
}

async function waitForPortToClear(port) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (getListeningPids(port).length === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const remainingPids = getListeningPids(port);
  if (remainingPids.length > 0) {
    killProcesses(remainingPids);
  }

  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (getListeningPids(port).length === 0) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Port ${port} is still in use.`);
}

async function prepareMetroPort(startPort, hostMode) {
  for (let port = startPort; port < startPort + 6; port += 1) {
    const listeningPids = getListeningPids(port);
    if (listeningPids.length === 0) {
      return { needsServer: true, port };
    }

    const commands = listeningPids.map(getProcessCommand).filter(Boolean);
    if (commands.length > 0 && commands.every(commandBelongsToCurrentProject)) {
      const matchingHost = commands.some((command) => commandUsesHostMode(command, hostMode));
      if (matchingHost) {
        return { needsServer: false, port };
      }

      console.log(`Stopping the existing Expo dev server on port ${port} so we can restart it in ${hostMode} mode...`);
      killProcesses(listeningPids);
      await waitForPortToClear(port);
      return { needsServer: true, port };
    }
  }

  throw new Error(`No free Metro port found starting from ${startPort}.`);
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
  if (!metroPortPlan.needsServer) {
    console.log(`Reusing existing Expo dev server on port ${metroPortPlan.port} (${metroHostMode})...`);
    return;
  }

  console.log(`Starting Expo dev server in the background (${metroHostMode}) on port ${metroPortPlan.port}...`);
  startBackground('npx', ['expo', 'start', '--dev-client', '--host', metroHostMode, '--port', String(metroPortPlan.port), '--clear'], {
    cwd: root
  });
}

async function waitForMetro() {
  await waitForExpoIosBundleReady({ port: metroPortPlan.port });
}

function launchNativeBuild() {
  if (wantsHelp) {
    run('npx', ['react-native', 'run-ios', '--help'], { cwd: root });
    return;
  }

  const defaultTargetArgs = explicitLaunchTarget
    ? []
    : launchTarget?.kind === 'simulator' && launchTarget.udid
      ? ['--udid', launchTarget.udid]
      : launchTarget?.kind === 'device' && launchTarget.udid
        ? ['--udid', launchTarget.udid]
        : launchTarget?.kind === 'simulator' && launchTarget.name
          ? ['--simulator', launchTarget.name]
          : launchTarget?.kind === 'device' && launchTarget.name
            ? ['--device', launchTarget.name]
            : [];

  const args = ['react-native', 'run-ios', ...defaultTargetArgs, '--no-packager', '--port', String(metroPortPlan.port), ...extraArgs];
  run('npx', args, {
    cwd: root,
    env: {
      RCT_METRO_PORT: String(metroPortPlan.port)
    }
  });
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
