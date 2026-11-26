import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chromium } from 'playwright-core';
import { GUMROAD_URL, PRODUCT_ID } from '../src/config.js';

const { CHROME_BIN, PHOTOID_SAMPLE, PHOTOID_EVIDENCE } = process.env;
const url = process.env.PHOTOID_URL ?? 'http://localhost:4173/photoid/';
assert.ok(PHOTOID_SAMPLE, 'Set PHOTOID_SAMPLE to a portrait image file');
const browser = await chromium.launch({
  executablePath: CHROME_BIN,
  args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'],
});
const page = await browser.newPage({ viewport: { width: 1280, height: 1060 }, permissions: ['camera'] });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const status = () => page.locator('#editor-status').textContent();

async function download(kind) {
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.locator('[data-download="' + kind + '"]').click(),
  ]);
  const bytes = await readFile(await file.path());
  if (PHOTOID_EVIDENCE) await writeFile(join(PHOTOID_EVIDENCE, file.suggestedFilename()), bytes);
  return bytes;
}

async function inspectImage(jpg, coordinates) {
  return page.evaluate(async ({ data, coordinates }) => {
    const image = await createImageBitmap(await (await fetch('data:image/jpeg;base64,' + data)).blob());
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(image, 0, 0);
    return {
      size: [image.width, image.height],
      colors: coordinates.map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3))),
    };
  }, { data: jpg.toString('base64'), coordinates });
}

async function screenshot(name) {
  if (PHOTOID_EVIDENCE) await page.screenshot({ path: join(PHOTOID_EVIDENCE, name) });
}

try {
  const noScripts = await browser.newPage({ javaScriptEnabled: false });
  await noScripts.goto(url);
  await noScripts.getByRole('link', { name: 'UK passport photo · digital or 35 × 45 mm' }).click();
  assert.match(noScripts.url(), /\/uk-passport-photo-size\/$/);
  assert.ok(await noScripts.getByRole('heading', { name: /UK Passport Photo Size/ }).isVisible());
  assert.match(await noScripts.locator('dl').textContent(), /600 × 750 pixels/);
  const editorLink = await noScripts.getByRole('link', { name: 'Open the PhotoID editor' }).getAttribute('href');
  await noScripts.close();
  await page.goto(new URL(editorLink, new URL('uk-passport-photo-size/', url)).href);
  assert.equal(await page.locator('#preset').inputValue(), 'uk');
  await page.goto(new URL('?preset=unknown#editor', url).href);
  assert.equal(await page.locator('#preset').inputValue(), 'in');
  console.log('The UK guide renders without JavaScript and links to the preselected editor; unknown presets use the default.');

  await page.goto(url);
  await page.locator('#file').setInputFiles(PHOTOID_SAMPLE);
  await page.waitForFunction(() => document.querySelector('#editor-status').textContent.startsWith('Face found.'), { }, { timeout: 40000 });
  console.log(await status());
  assert.match(await page.locator('#metrics').textContent(), /630 × 810 px · 35 × 45 mm print/);

  assert.ok(await page.locator('#background').isDisabled(), 'Passport Seva prohibits retouching');
  await page.locator('#preset').selectOption('custom');
  await page.locator('#background').selectOption('blue');
  await page.waitForFunction(() => document.querySelector('#editor-status').textContent.startsWith('Background replaced.'), { }, { timeout: 40000 });
  assert.doesNotMatch(await status(), /simple mode/);
  const [corner, face] = await page.locator('#preview').evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    return [[8, 8], [206, 238]].map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3)));
  });
  assert.deepEqual(corner, [220, 236, 255]);
  assert.notDeepEqual(face, corner);
  await screenshot('photoid-landing.png');
  if (PHOTOID_EVIDENCE) await page.locator('#editor').screenshot({ path: join(PHOTOID_EVIDENCE, 'photoid-editor.png') });
  console.log('Light-blue background was applied and the portrait remained visible.');

  await page.locator('#preset').selectOption('in');
  assert.equal(await page.locator('#background').inputValue(), 'original');
  const digital = await download('digital');
  const photo = await inspectImage(digital, [[622, 803]]);
  assert.deepEqual(photo.size, [630, 810]);
  assert.ok(digital.length <= 250000);
  assert.ok(photo.colors[0][0] < 100 && photo.colors[0][2] < 100, 'Watermark rectangle is dark');
  assert.deepEqual([...digital.subarray(13, 18)], [1, 1, 44, 1, 44]);
  console.log('Watermarked India digital JPG: 630 × 810, ≤250 KB, at 300 DPI.');

  const sheet = await download('sheet');
  const sheetImage = await inspectImage(sheet, [[10, 10], [577, 600]]);
  assert.deepEqual(sheetImage.size, [1200, 1800]);
  assert.deepEqual(sheetImage.colors[0], [255, 255, 255]);
  assert.ok(sheetImage.colors[1][0] < 100 && sheetImage.colors[1][2] < 100, 'Tiles carry the watermark');
  assert.deepEqual([...sheet.subarray(13, 18)], [1, 1, 44, 1, 44]);
  assert.match(await status(), /6 photos saved with cut marks/);

  const pdf = await download('pdf');
  const mediaBox = pdf.toString('latin1').match(/\/MediaBox \[([^\]]+)\]/)?.[1];
  assert.deepEqual(mediaBox?.split(' ').map(value => Math.round(Number(value))), [0, 0, 288, 432]);
  console.log('Watermarked 4 × 6 in JPG and PDF: six photos, 300 DPI raster.');

  const upsell = page.locator('#upsell-actions');
  const buy = upsell.getByRole('link', { name: 'Get Pro ₹99' });
  const enterLicense = upsell.getByRole('button', { name: 'Enter license', exact: true });
  assert.equal(await upsell.isVisible(), false);
  await page.locator('#paper').selectOption('a4');
  assert.match(await status(), /Activate Pro to export an A4 sheet/);
  assert.ok(await buy.isVisible());
  assert.ok(await enterLicense.isVisible());
  assert.equal(await buy.getAttribute('href'), GUMROAD_URL);
  assert.equal(await buy.getAttribute('target'), '_blank');
  await page.locator('#paper').selectOption('4x6');
  assert.equal(await upsell.isVisible(), false);
  await page.getByRole('button', { name: 'Max KB PRO' }).press('Enter');
  assert.match(await status(), /Activate Pro to set a JPG file size limit/);
  assert.ok(await buy.isVisible());
  assert.ok(await enterLicense.isVisible());
  await page.locator('#paper').selectOption('a4');
  await page.getByRole('button', { name: 'Max KB PRO' }).click();
  await page.locator('[data-download="sheet"]').click();
  assert.match(await status(), /Activate Pro to export an A4 sheet/);
  assert.ok(await buy.isVisible());
  assert.ok(await enterLicense.isVisible());
  console.log('A4 selection, Max KB, and blocked A4 download each show Gumroad and license actions.');

  await enterLicense.click();
  await page.locator('#license-key').fill('INVALID-TEST-KEY');
  const [licenseResponse] = await Promise.all([
    page.waitForResponse('https://api.gumroad.com/v2/licenses/verify'),
    page.locator('#verify').click(),
  ]);
  const licenseBody = licenseResponse.request().postData();
  assert.ok(licenseBody.includes('product_id=' + encodeURIComponent(PRODUCT_ID) + '&'));
  console.log('Gumroad browser response:', licenseResponse.status(), licenseResponse.headers()['access-control-allow-origin']);
  await page.waitForFunction(() => document.querySelector('#license-status').textContent.includes('Check the PhotoID license key in your Gumroad receipt.'));
  console.log(await page.locator('#license-status').textContent());
  await screenshot('photoid-license-error.png');
  await page.getByRole('button', { name: 'Close license dialog' }).click();

  await page.locator('#camera').click();
  await page.waitForFunction(() => !document.querySelector('#snap').disabled);
  await page.locator('#snap').click();
  await page.waitForFunction(() => !document.querySelector('#camera-dialog').open &&
    document.querySelector('#video').srcObject === null);
  console.log('Camera preview, capture and stream release passed with a fake device.');
  assert.deepEqual(errors, []);

  await page.evaluate(id => localStorage.setItem('photoid-pro', id), PRODUCT_ID);
  await page.reload();
  const fixture = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1500;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(canvas.width, canvas.height);
    let seed = 1953;
    for (let i = 0; i < image.data.length; i += 4) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      image.data.set([seed >>> 24, (seed >>> 16) & 255, (seed >>> 8) & 255, 255], i);
    }
    ctx.putImageData(image, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
  });
  const original = Buffer.from(fixture, 'base64');
  await page.locator('#file').setInputFiles({ name: 'texture.jpg', mimeType: 'image/jpeg', buffer: original });
  await page.waitForFunction(() => document.querySelector('#frame').classList.contains('has-photo'));
  for (const [id, size, min, max] of [
    ['in', [630, 810], 0, 250], ['oci', [600, 600], 0, 200], ['in-evisa', [600, 600], 10, 1000],
    ['us', [600, 600], 54, 240], ['uk', [1200, 1500], 50, 10000],
    ['cn', [354, 472], 40, 120], ['custom', [413, 531], 0, Infinity],
  ]) {
    await page.locator('#preset').selectOption(id);
    const jpg = await download('digital');
    assert.deepEqual((await inspectImage(jpg, [])).size, size, id);
    assert.ok(jpg.length >= min * 1000 && jpg.length <= max * 1000, id);
    if (id === 'uk') assert.deepEqual(jpg, original, 'UK download must be byte-identical to the upload');
  }
  for (const id of ['eu', 'ca', 'au', 'cn-print']) {
    await page.locator('#preset').selectOption(id);
    assert.ok(await page.locator('[data-download="digital"]').isDisabled(), id);
    assert.ok(await page.locator('#preset-guide').isVisible(), id);
  }
  console.log('Every digital preset exports the expected dimensions and file size; the UK JPG is unchanged. Unsupported digital exports are disabled.');
  assert.deepEqual(errors, []);

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, hasTouch: true });
  await mobile.route(url => /\/portrait\.worker(?:-[^/]+)?\.js$/.test(url.pathname), route => route.abort());
  await mobile.goto(url);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  if (PHOTOID_EVIDENCE) await mobile.screenshot({ path: join(PHOTOID_EVIDENCE, 'photoid-mobile.png') });
  console.log('Mobile layout at 390px has no horizontal overflow.');
  await mobile.locator('#file').setInputFiles(PHOTOID_SAMPLE);
  await mobile.waitForFunction(() => document.querySelector('#editor-status').textContent.startsWith('Face found.'));
  await mobile.locator('#preset').selectOption('custom');
  await mobile.locator('#background').selectOption('white');
  await mobile.waitForFunction(() => document.querySelector('#editor-status').textContent.startsWith('Background replaced with simple mode.'));
  console.log('MediaPipe fallback works when the portrait worker cannot load.');
} finally {
  await browser.close();
}
