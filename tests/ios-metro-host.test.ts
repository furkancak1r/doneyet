import { describe, expect, it } from 'vitest';
import {
  parseAvailableSimulators,
  resolveDefaultIosLaunchTarget,
  resolveExpoHostMode,
  resolveLaunchTargetFromArgs
} from '../scripts/ios-metro-host.mjs';

describe('iOS Metro host selection', () => {
  const physicalDevice: {
    kind: 'device';
    name: string;
    udid: string;
  } = {
    kind: 'device',
    name: "Furkan's iPhone",
    udid: '00008110-001240920CC0A01E'
  };

  const simulator: {
    kind: 'simulator';
    name: string;
    udid: string;
    lastBootedAt: string;
  } = {
    kind: 'simulator',
    name: 'iPhone 17 Pro',
    udid: '9357C563-1D79-45F8-BB6D-7FD9301BDDAF',
    lastBootedAt: '2026-01-12T21:17:40Z'
  };

  it('prefers the connected physical device for the default launch target', () => {
    const target = resolveDefaultIosLaunchTarget({
      connectedPhysicalDevices: [physicalDevice],
      simulators: [simulator]
    });

    expect(target).toEqual(physicalDevice);
    expect(resolveExpoHostMode({ targetKind: target?.kind })).toBe('lan');
  });

  it('honors a configured preferred launch target even when a device is connected', () => {
    const target = resolveDefaultIosLaunchTarget({
      connectedPhysicalDevices: [physicalDevice],
      preferredDeviceName: 'iPhone 17 Pro',
      simulators: [simulator]
    });

    expect(target).toEqual(simulator);
    expect(resolveExpoHostMode({ targetKind: target?.kind })).toBe('localhost');
  });

  it('falls back to the connected physical device when no simulator is available', () => {
    const target = resolveDefaultIosLaunchTarget({
      connectedPhysicalDevices: [physicalDevice],
      simulators: []
    });

    expect(target).toEqual(physicalDevice);
    expect(resolveExpoHostMode({ targetKind: target?.kind })).toBe('lan');
  });

  it('falls back to the best available simulator when no physical device is connected', () => {
    const target = resolveDefaultIosLaunchTarget({
      connectedPhysicalDevices: [],
      simulators: [simulator]
    });

    expect(target).toEqual(simulator);
    expect(resolveExpoHostMode({ targetKind: target?.kind })).toBe('localhost');
  });

  it('resolves an explicit simulator target from CLI args', () => {
    const target = resolveLaunchTargetFromArgs(
      ['--simulator', 'iPhone 17 Pro'],
      [physicalDevice],
      [simulator]
    );

    expect(target).toEqual(simulator);
    expect(resolveExpoHostMode({ targetKind: target?.kind })).toBe('localhost');
  });

  it('resolves an explicit device target from CLI args', () => {
    const target = resolveLaunchTargetFromArgs(
      ['--device', "Furkan's iPhone"],
      [physicalDevice],
      [simulator]
    );

    expect(target).toEqual(physicalDevice);
    expect(resolveExpoHostMode({ targetKind: target?.kind })).toBe('lan');
  });

  it('honors explicit host overrides', () => {
    expect(resolveExpoHostMode({ targetKind: 'device', override: 'tunnel' })).toBe('tunnel');
  });

  it('falls back to localhost when the target cannot be identified', () => {
    expect(resolveExpoHostMode({ targetKind: undefined })).toBe('localhost');
  });

  it('normalizes parsed simulators with the simulator kind', () => {
    const simulators = parseAvailableSimulators({
      devices: {
        'com.apple.CoreSimulator.SimRuntime.iOS-26-2': [
          {
            name: 'iPhone 17 Pro',
            udid: '9357C563-1D79-45F8-BB6D-7FD9301BDDAF',
            isAvailable: true,
            lastBootedAt: '2026-01-12T21:17:40Z'
          }
        ]
      }
    });

    expect(simulators).toEqual([
      {
        kind: 'simulator',
        name: 'iPhone 17 Pro',
        udid: '9357C563-1D79-45F8-BB6D-7FD9301BDDAF',
        lastBootedAt: '2026-01-12T21:17:40Z'
      }
    ]);
  });
});
