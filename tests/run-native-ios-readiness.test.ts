import { describe, expect, it, vi } from 'vitest';
import { getExpoIosBundleUrl, getMetroStatusUrl, waitForExpoIosBundleReady } from '../scripts/run-native-ios-readiness.mjs';

describe('run-native-ios readiness', () => {
  it('waits for the Expo iOS bundle after Metro reports running', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('packager-status:running', { status: 200, statusText: 'OK' }))
      .mockResolvedValueOnce(new Response('Bundling...', { status: 404, statusText: 'Not Found' }))
      .mockResolvedValueOnce(new Response('__expo_bundle__', { status: 200, statusText: 'OK' }));
    const sleepImpl = vi.fn(async () => {});

    const result = await waitForExpoIosBundleReady({
      port: 8081,
      fetchImpl,
      sleepImpl,
      maxAttempts: 3,
      pollIntervalMs: 1
    });

    expect(result).toEqual({
      statusUrl: getMetroStatusUrl(8081),
      bundleUrl: getExpoIosBundleUrl(8081)
    });
    expect(fetchImpl).toHaveBeenNthCalledWith(1, getMetroStatusUrl(8081));
    expect(fetchImpl).toHaveBeenNthCalledWith(2, getExpoIosBundleUrl(8081));
    expect(fetchImpl).toHaveBeenNthCalledWith(3, getExpoIosBundleUrl(8081));
    expect(sleepImpl).toHaveBeenCalledTimes(1);
  });

  it('surfaces the last bundle response when the iOS bundle never becomes ready', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(new Response('packager-status:running', { status: 200, statusText: 'OK' }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'Bundle is still compiling' }), {
          status: 503,
          statusText: 'Service Unavailable'
        })
      );
    const sleepImpl = vi.fn(async () => {});

    await expect(
      waitForExpoIosBundleReady({
        port: 8081,
        fetchImpl,
        sleepImpl,
        maxAttempts: 1,
        pollIntervalMs: 1
      })
    ).rejects.toThrow(
      `Expo iOS bundle did not become ready on port 8081. Bundle URL: ${getExpoIosBundleUrl(8081)}. Last bundle response: HTTP 503 Service Unavailable`
    );

    await expect(
      waitForExpoIosBundleReady({
        port: 8081,
        fetchImpl: vi
          .fn()
          .mockResolvedValueOnce(new Response('packager-status:running', { status: 200, statusText: 'OK' }))
          .mockResolvedValueOnce(
            new Response(JSON.stringify({ error: 'Bundle is still compiling' }), {
              status: 503,
              statusText: 'Service Unavailable'
            })
          ),
        sleepImpl,
        maxAttempts: 1,
        pollIntervalMs: 1
      })
    ).rejects.toThrow('Bundle is still compiling');
  });
});
