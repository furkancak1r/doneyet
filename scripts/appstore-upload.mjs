#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const KEY_ID = 'FYJ34WGVJD';
const ISSUER_ID = '8132fb88-e0ca-4469-b209-c2953ea074a4';
const KEY_PATH = '/Users/furkancakir/.appstoreconnect/private_keys/AuthKey_FYJ34WGVJD.p8';
const APP_ID = '6761344539';

const LOCALES = ['en-US', 'tr'];

const SCREENSHOT_TYPES = {
  'home.png': 'APP_IPHONE_65_HOME',
  'calendar.png': 'APP_IPHONE_65_HOME',
  'list-detail.png': 'APP_IPHONE_65_HOME',
  'task-detail.png': 'APP_IPHONE_65_HOME',
  'ipad-home.png': 'APP_IPAD_WALLPAPER'
};

function base64urlEncode(data) {
  return Buffer.from(data).toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function createJWT() {
  const keyContent = fs.readFileSync(KEY_PATH);
  const keyObj = crypto.createPrivateKey(keyContent);
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: 'ES256', kid: KEY_ID, typ: 'JWT' };
  const payload = { iss: ISSUER_ID, iat: now, exp: now + 600, aud: 'appstoreconnect-v1' };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const signingInput = headerB64 + '.' + payloadB64;

  const sigDer = crypto.sign(null, Buffer.from(signingInput), keyObj);

  let idx = 0;
  idx++;
  const seqLen = sigDer[idx++];
  idx++;
  const rLen = sigDer[idx++];
  let r = sigDer.subarray(idx, idx + rLen);
  idx += rLen;
  idx++;
  const sLen = sigDer[idx++];
  let s = sigDer.subarray(idx, idx + sLen);

  if (r.length === 33 && r[0] === 0x00) r = r.subarray(1);
  if (s.length === 33 && s[0] === 0x00) s = s.subarray(1);

  const rPadded = Buffer.alloc(32);
  const sPadded = Buffer.alloc(32);
  const rCopyOffset = Math.max(0, 32 - r.length);
  const sCopyOffset = Math.max(0, 32 - s.length);
  r.copy(rPadded, rCopyOffset);
  s.copy(sPadded, sCopyOffset);

  const rawSig = Buffer.concat([rPadded, sPadded]);
  const sigB64 = base64urlEncode(rawSig);
  return signingInput + '.' + sigB64;
}

async function apiRequest(method, apiPath, body = null) {
  const token = createJWT();
  const url = new URL(`https://api.appstoreconnect.apple.com/v1${apiPath}`);

  return new Promise((resolve, reject) => {
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', (e) => { console.error(`   Request error: ${e.message}`); reject(e); });
    req.setTimeout(120000, () => { console.error(`   Timeout for ${method} ${apiPath}`); req.destroy(); reject(new Error('Timeout')); });
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function uploadImageData(imageBuffer, filename, locale, screenshotType) {
  const token = createJWT();
  const fileSize = imageBuffer.length;

  const uploadRes = await new Promise((resolve, reject) => {
    const body = JSON.stringify({
      data: {
        attributes: { fileSize: String(fileSize), fileName: filename, locale, screenshotType },
        relationships: { app: { data: { id: APP_ID, type: 'apps' } } },
        type: 'uploads'
      }
    });

    const options = {
      hostname: 'uploads.itable.apple.com',
      port: 443,
      path: '/v1/uploads',
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body)
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(body);
    req.end();
  });

  if (uploadRes.status !== 200 && uploadRes.status !== 201) {
    throw new Error(`Upload request failed: ${uploadRes.status} ${JSON.stringify(uploadRes.data)}`);
  }

  const uploadUrl = uploadRes.data.data.attributes.url;
  const uploadToken = uploadRes.data.data.token;

  await new Promise((resolve, reject) => {
    const options = {
      hostname: new URL(uploadUrl).hostname,
      port: 443,
      path: new URL(uploadUrl).pathname,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': fileSize
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) resolve({ status: res.statusCode });
        else reject(new Error(`Binary upload failed: ${res.statusCode} ${data}`));
      });
    });
    req.on('error', reject);
    req.setTimeout(60000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.write(imageBuffer);
    req.end();
  });

  return { uploadUrl, uploadToken };
}

function readMetadataFile(locale, filename) {
  const filePath = path.join(root, 'fastlane', 'metadata', locale, filename);
  if (!fs.existsSync(filePath)) return '';
  return fs.readFileSync(filePath, 'utf8').trim();
}

async function getOrCreateAppInfoLocalization(locale, appInfoId) {
  const listRes = await apiRequest('GET', `/apps/${APP_ID}/appInfoLocalizations?fields[appInfoLocalizations]=locale,appInfo&filter[locale]=${locale}&limit=1`);
  
  if (listRes.status === 200 && listRes.data.data && listRes.data.data.length > 0) {
    return listRes.data.data[0];
  }

  const name = readMetadataFile(locale, 'name.txt') || 'DoneYet?';
  const subtitle = readMetadataFile(locale, 'subtitle.txt');
  const attrs = { locale, name };
  if (subtitle) attrs.subtitle = subtitle;

  const createRes = await apiRequest('POST', '/appInfoLocalizations', {
    data: {
      attributes: attrs,
      relationships: { appInfo: { data: { id: appInfoId, type: 'appInfos' } } },
      type: 'appInfoLocalizations'
    }
  });

  if (createRes.status === 201 || createRes.status === 200) {
    return createRes.data.data;
  }

  throw new Error(`Failed to create localization ${locale}: ${createRes.status} ${JSON.stringify(createRes.data)}`);
}

async function updateLocalization(localizationId, locale) {
  const name = readMetadataFile(locale, 'name.txt');
  const subtitle = readMetadataFile(locale, 'subtitle.txt');
  const description = readMetadataFile(locale, 'description.txt');
  const keywords = readMetadataFile(locale, 'keywords.txt');
  const promotionalText = readMetadataFile(locale, 'promotional_text.txt');
  const supportUrl = readMetadataFile(locale, 'support_url.txt');
  const marketingUrl = readMetadataFile(locale, 'marketing_url.txt');
  const privacyUrl = readMetadataFile(locale, 'privacy_url.txt');

  const attrs = { locale };
  if (name) attrs.name = name;
  if (subtitle) attrs.subtitle = subtitle;
  if (description) attrs.description = description;
  if (keywords) attrs.keywords = keywords;
  if (promotionalText) attrs.promotional_text = promotionalText;
  if (supportUrl) attrs.support_url = supportUrl;
  if (marketingUrl) attrs.marketing_url = marketingUrl;
  if (privacyUrl) attrs.privacy_url = privacyUrl;

  const res = await apiRequest('PATCH', `/appInfoLocalizations/${localizationId}`, {
    data: {
      id: localizationId,
      attributes: attrs,
      type: 'appInfoLocalizations'
    }
  });

  if (res.status === 200 || res.status === 201) {
    console.log(`  [${locale}] Metadata updated`);
  } else {
    console.log(`  [${locale}] Metadata update failed: ${res.status} ${JSON.stringify(res.data.errors?.[0] || res.data)}`);
  }
}

async function getScreenshotSet(localizationId, screenshotType) {
  const res = await apiRequest('GET', `/appInfoLocalizations/${localizationId}/appScreenshotSets?fields[appScreenshotSets]=screenshotType&filter[screenshotType]=${encodeURIComponent(screenshotType)}&limit=1`);
  
  if (res.status === 200 && res.data.data && res.data.data.length > 0) {
    return res.data.data[0];
  }
  return null;
}

async function createScreenshotSet(localizationId, screenshotType) {
  const res = await apiRequest('POST', '/appScreenshotSets', {
    data: {
      attributes: { screenshotType },
      relationships: { appInfoLocalization: { data: { id: localizationId, type: 'appInfoLocalizations' } } },
      type: 'appScreenshotSets'
    }
  });

  if (res.status === 201 || res.status === 200) {
    return res.data.data;
  }
  throw new Error(`Failed to create screenshot set: ${res.status} ${JSON.stringify(res.data)}`);
}

async function uploadScreenshot(localizationId, screenshotSetId, imageBuffer, filename, locale, screenshotType) {
  const { uploadToken } = await uploadImageData(imageBuffer, filename, locale, screenshotType);

  const res = await apiRequest('POST', `/appScreenshotSets/${screenshotSetId}/appScreenshots`, {
    data: {
      attributes: { fileSize: String(imageBuffer.length), screenshotType, locale, fileName: filename, uploadToken },
      relationships: { appScreenshotSet: { data: { id: screenshotSetId, type: 'appScreenshotSets' } } },
      type: 'appScreenshots'
    }
  });

  if (res.status === 201 || res.status === 200) {
    console.log(`  [${locale}] ${filename}: OK`);
  } else {
    console.log(`  [${locale}] ${filename}: FAILED (${res.status}) ${JSON.stringify(res.data.errors?.[0] || res.data)}`);
  }
}

async function main() {
  console.log('=== App Store Connect Publishing ===\n');

  console.log('1. Testing API access...');
  try {
    const token = createJWT();
    console.error('JWT created OK, length:', token.length);
  } catch (e) {
    console.error('JWT creation failed:', e.message);
    return;
  }
  
  const appRes = await apiRequest('GET', `/apps/${APP_ID}`);
  if (appRes.status !== 200) {
    console.error(`API access failed: ${appRes.status}`);
    return;
  }
  console.log(`   App: ${appRes.data.data?.attributes?.name} (${appRes.data.data?.attributes?.bundleId})`);
  console.error('   App response structure:', JSON.stringify(appRes.data).slice(0, 200));

  const appInfoRes = await apiRequest('GET', `/apps/${APP_ID}/appInfos`);
  if (appInfoRes.status !== 200 || !appInfoRes.data.data?.length) {
    console.error('Could not fetch app info');
    return;
  }
  const appInfoId = appInfoRes.data.data[0].id;
  console.log(`   App Info ID: ${appInfoId}`);

  console.log('\n2. Checking existing localizations...');
  const locRes = await apiRequest('GET', `/apps/${APP_ID}/appInfoLocalizations`);
  if (locRes.status === 200 && locRes.data.data) {
    locRes.data.data.forEach(loc => {
      console.log(`   - ${loc.attributes.locale}`);
    });
  }

  console.log('\n3. Processing localizations...');
  for (const locale of LOCALES) {
    console.log(`\n  [${locale}]`);

    let localization;
    try {
      localization = await getOrCreateAppInfoLocalization(locale, appInfoId);
      console.log(`  [${locale}] Localization ID: ${localization.id}`);
    } catch (e) {
      console.error(`  [${locale}] Error: ${e.message}`);
      continue;
    }

    await updateLocalization(localization.id, locale);
  }

  console.log('\n4. Checking screenshots...');
  const screenshotsDir = path.join(root, 'fastlane', 'screenshots');
  for (const locale of LOCALES) {
    console.log(`\n  [${locale}]`);
    const localeDir = path.join(screenshotsDir, locale);
    if (!fs.existsSync(localeDir)) {
      console.log(`  [${locale}] Screenshot directory not found: ${localeDir}`);
      continue;
    }

    for (const [filename, screenshotType] of Object.entries(SCREENSHOT_TYPES)) {
      const screenshotPath = path.join(localeDir, filename);
      if (!fs.existsSync(screenshotPath)) {
        console.log(`  [${locale}] ${filename}: NOT FOUND`);
        continue;
      }

      const localization = await getOrCreateAppInfoLocalization(locale, appInfoId);
      let screenshotSet = await getScreenshotSet(localization.id, screenshotType);
      if (!screenshotSet) {
        screenshotSet = await createScreenshotSet(localization.id, screenshotType);
      }

      const imageBuffer = fs.readFileSync(screenshotPath);
      await uploadScreenshot(localization.id, screenshotSet.id, imageBuffer, filename, locale, screenshotType);
    }
  }

  console.log('\n=== Done ===');
  console.log('Note: Changes may take a few minutes to appear in App Store Connect.');
}

main().catch(console.error);
