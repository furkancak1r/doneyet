import { spawnSync } from 'node:child_process';

const VALID_EXPO_HOST_MODES = new Set(['localhost', 'lan', 'tunnel']);

/**
 * @typedef {{ kind: 'device'; name: string; udid: string }} ConnectedPhysicalDevice
 * @typedef {{ kind: 'simulator'; name: string; udid: string; lastBootedAt: string | null }} AvailableSimulator
 * @typedef {ConnectedPhysicalDevice | AvailableSimulator} IosLaunchTarget
 * @typedef {{
 *   connectedPhysicalDevices?: ConnectedPhysicalDevice[];
 *   preferredDeviceName?: string;
 *   simulators?: AvailableSimulator[];
 * }} ResolveDefaultIosLaunchTargetOptions
 * @typedef {{
 *   targetKind?: string;
 *   override?: string;
 * }} ResolveExpoHostModeOptions
 */

export function listConnectedPhysicalDevices() {
  const result = spawnSync('xcrun', ['xctrace', 'list', 'devices'], {
    encoding: 'utf8',
    shell: false
  });

  if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
    return [];
  }

  return parseXctraceDevices(result.stdout).physicalDevices;
}

export function listAvailableSimulators() {
  const result = spawnSync('xcrun', ['simctl', 'list', 'devices', 'available', '--json'], {
    encoding: 'utf8',
    shell: false
  });

  if (result.error || result.status !== 0 || typeof result.stdout !== 'string') {
    return [];
  }

  return parseAvailableSimulators(result.stdout);
}

/**
 * @param {string | Record<string, unknown>} payload
 * @returns {AvailableSimulator[]}
 */
export function parseAvailableSimulators(payload) {
  try {
    const parsed = typeof payload === 'string' ? JSON.parse(payload) : payload;
    const simulators = [];

    for (const runtimeDevices of Object.values(parsed.devices ?? {})) {
      if (!Array.isArray(runtimeDevices)) {
        continue;
      }

      for (const device of runtimeDevices) {
        if (!device || typeof device.name !== 'string' || typeof device.udid !== 'string') {
          continue;
        }

        if (device.isAvailable === false) {
          continue;
        }

        simulators.push({
          kind: 'simulator',
          name: device.name,
          udid: device.udid,
          lastBootedAt: typeof device.lastBootedAt === 'string' ? device.lastBootedAt : null
        });
      }
    }

    return simulators;
  } catch {
    return [];
  }
}

/**
 * @param {ResolveDefaultIosLaunchTargetOptions} [options]
 * @returns {IosLaunchTarget | null}
 */
export function resolveDefaultIosLaunchTarget({
  connectedPhysicalDevices = [],
  preferredDeviceName,
  simulators = []
} = {}) {
  const preferred = resolveTargetByNameOrUdid(preferredDeviceName, connectedPhysicalDevices, simulators);
  if (preferred) {
    return preferred;
  }

  if (connectedPhysicalDevices.length > 0) {
    return connectedPhysicalDevices[0];
  }

  const defaultSimulator = pickDefaultSimulator(simulators);
  if (defaultSimulator) {
    return defaultSimulator;
  }

  return null;
}

/**
 * @param {string[]} args
 * @param {ConnectedPhysicalDevice[]} connectedPhysicalDevices
 * @param {AvailableSimulator[]} simulators
 * @returns {IosLaunchTarget | null}
 */
export function resolveLaunchTargetFromArgs(args, connectedPhysicalDevices, simulators) {
  const explicitTarget = findExplicitTargetArg(args, connectedPhysicalDevices, simulators);
  return explicitTarget ?? null;
}

/**
 * @param {ResolveExpoHostModeOptions} [options]
 * @returns {'localhost' | 'lan' | 'tunnel'}
 */
export function resolveExpoHostMode({ targetKind, override } = {}) {
  const normalizedOverride = normalizeExpoHostMode(override);

  if (normalizedOverride) {
    return normalizedOverride;
  }

  return targetKind === 'device' ? 'lan' : 'localhost';
}

function findExplicitTargetArg(args, connectedPhysicalDevices, simulators) {
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--simulator') {
      const simulatorName = readNextValue(args, index + 1);
      if (simulatorName) {
        return resolveTargetByNameOrUdid(simulatorName, [], simulators) ?? {
          kind: 'simulator',
          name: simulatorName,
          udid: null
        };
      }

      return pickDefaultSimulator(simulators);
    }

    if (arg === '--device') {
      const deviceName = readNextValue(args, index + 1);
      if (deviceName) {
        return resolveTargetByNameOrUdid(deviceName, connectedPhysicalDevices, []) ?? {
          kind: 'device',
          name: deviceName,
          udid: null
        };
      }

      return connectedPhysicalDevices[0] ?? null;
    }

    if (arg === '--udid') {
      const udid = readNextValue(args, index + 1);
      if (!udid) {
        return null;
      }

      return resolveTargetByNameOrUdid(udid, connectedPhysicalDevices, simulators) ?? null;
    }
  }

  return null;
}

function pickDefaultSimulator(simulators) {
  if (simulators.length === 0) {
    return null;
  }

  const iPhoneSimulator = simulators.find((simulator) => simulator.name.toLowerCase().includes('iphone'));
  return iPhoneSimulator ?? simulators.find((simulator) => simulator.lastBootedAt) ?? simulators[0];
}

function resolveTargetByNameOrUdid(identifier, connectedPhysicalDevices, simulators) {
  if (typeof identifier !== 'string' || identifier.trim() === '') {
    return null;
  }

  const normalized = identifier.trim();
  const physicalMatch = connectedPhysicalDevices.find((device) => device.name === normalized || device.udid === normalized);
  if (physicalMatch) {
    return physicalMatch;
  }

  const simulatorMatch = simulators.find((simulator) => simulator.name === normalized || simulator.udid === normalized);
  if (simulatorMatch) {
    return simulatorMatch;
  }

  return null;
}

function readNextValue(args, nextIndex) {
  const nextValue = args[nextIndex];
  if (typeof nextValue !== 'string' || nextValue.startsWith('-')) {
    return null;
  }

  return nextValue;
}

function normalizeExpoHostMode(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return VALID_EXPO_HOST_MODES.has(normalized) ? normalized : null;
}

function parseXctraceDevices(output) {
  const physicalDevices = [];
  const lines = output.split(/\r?\n/);

  let inDevicesSection = false;
  let inSimulatorsSection = false;
  let deviceLineIndex = 0;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (line === '== Devices ==') {
      inDevicesSection = true;
      inSimulatorsSection = false;
      deviceLineIndex = 0;
      continue;
    }

    if (line === '== Simulators ==') {
      inDevicesSection = false;
      inSimulatorsSection = true;
      continue;
    }

    if (!inDevicesSection || inSimulatorsSection || line === '') {
      continue;
    }

    const match = line.match(/^(.*) \(([^()]+)\)$/);
    if (!match) {
      continue;
    }

    if (deviceLineIndex === 0) {
      deviceLineIndex += 1;
      continue;
    }

    physicalDevices.push({
      kind: 'device',
      name: match[1].trim(),
      udid: match[2].trim()
    });
    deviceLineIndex += 1;
  }

  return { physicalDevices };
}
