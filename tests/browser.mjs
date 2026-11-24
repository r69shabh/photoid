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
  await page.goto(url);
  await page.locator('#file').setInputFiles(PHOTOID_SAMPLE);
  await page.waitForFunction(() => document.querySelector('#editor-status').textContent.startsWith('Face found.'), { }, { timeout: 40000 });
  console.log(await status());
  assert.match(await page.locator('#metrics').textContent(), /413 × 531 px/);

  await page.locator('#background').selectOption('blue');
  await page.waitForFunction(() => document.querySelector('#editor-status').textContent.startsWith('Background replaced.'), { }, { timeout: 40000 });
  const [corner, face] = await page.locator('#preview').evaluate(canvas => {
    const ctx = canvas.getContext('2d');
    return [[8, 8], [206, 238]].map(([x, y]) => Array.from(ctx.getImageData(x, y, 1, 1).data.slice(0, 3)));
  });
  assert.deepEqual(corner, [220, 236, 255]);
  assert.notDeepEqual(face, corner);
  await screenshot('photoid-landing.png');
  if (PHOTOID_EVIDENCE) await page.locator('#editor').screenshot({ path: join(PHOTOID_EVIDENCE, 'photoid-editor.png') });
  console.log('Light-blue background was applied and the portrait remained visible.');

  const digital = await download('digital');
  const photo = await inspectImage(digital, [[8, 8], [405, 525]]);
  assert.deepEqual(photo.size, [413, 531]);
  assert.ok(photo.colors[0][2] > 245);
  assert.ok(photo.colors[1][0] < 100 && photo.colors[1][2] < 100, 'Watermark rectangle is dark');
  assert.deepEqual([...digital.subarray(13, 18)], [1, 1, 44, 1, 44]);
  console.log('Watermarked digital JPG: 413 × 531 at 300 DPI.');

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

  const mobile = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, deviceScaleFactor: 1, hasTouch: true });
  await mobile.goto(url);
  assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth), 390);
  if (PHOTOID_EVIDENCE) await mobile.screenshot({ path: join(PHOTOID_EVIDENCE, 'photoid-mobile.png') });
  console.log('Mobile layout at 390px has no horizontal overflow.');
} finally {
  await browser.close();
}
