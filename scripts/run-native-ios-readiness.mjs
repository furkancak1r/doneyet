const DEFAULT_MAX_ATTEMPTS = 60;
const DEFAULT_POLL_INTERVAL_MS = 1000;
const BUNDLE_ROOT = '.expo/.virtual-metro-entry';
const SNIPPET_LENGTH = 180;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function summarizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, SNIPPET_LENGTH);
}

function describeFetchError(error) {
  return error instanceof Error ? error.message : String(error);
}

export function getMetroStatusUrl(port) {
  return `http://127.0.0.1:${port}/status`;
}

export function getExpoIosBundleUrl(port) {
  const params = new URLSearchParams({
    platform: 'ios',
    dev: 'true',
    minify: 'false'
  });

  return `http://127.0.0.1:${port}/${BUNDLE_ROOT}.bundle?${params.toString()}`;
}

export async function waitForExpoIosBundleReady({
  port,
  fetchImpl = fetch,
  maxAttempts = DEFAULT_MAX_ATTEMPTS,
  pollIntervalMs = DEFAULT_POLL_INTERVAL_MS,
  sleepImpl = sleep
}) {
  const statusUrl = getMetroStatusUrl(port);
  const bundleUrl = getExpoIosBundleUrl(port);
  let lastStatusFailure = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(statusUrl);
      const statusText = await response.text();

      if (statusText.trim() === 'packager-status:running') {
        lastStatusFailure = null;
        break;
      }

      lastStatusFailure = `Unexpected Metro status response: "${summarizeText(statusText)}"`;
    } catch (error) {
      lastStatusFailure = `Request failed: ${describeFetchError(error)}`;
    }

    await sleepImpl(pollIntervalMs);
  }

  if (lastStatusFailure !== null) {
    throw new Error(`Metro bundler did not become ready on port ${port}. Status URL: ${statusUrl}. ${lastStatusFailure}`);
  }

  let lastBundleFailure = null;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const response = await fetchImpl(bundleUrl);

      if (response.status === 200) {
        await response.arrayBuffer();
        return { statusUrl, bundleUrl };
      }

      const snippet = summarizeText(await response.text());
      lastBundleFailure = `HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}${snippet ? ` — ${snippet}` : ''}`;
    } catch (error) {
      lastBundleFailure = `Request failed: ${describeFetchError(error)}`;
    }

    await sleepImpl(pollIntervalMs);
  }

  throw new Error(
    `Expo iOS bundle did not become ready on port ${port}. Bundle URL: ${bundleUrl}. Last bundle response: ${lastBundleFailure ?? 'No response captured.'}`
  );
}
