import assert from 'node:assert/strict';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const { CHROME_BIN, PHOTOID_URL, PHOTOID_BASELINE_URL, PHOTOID_FIXTURES, PHOTOID_EVIDENCE } = process.env;
assert.ok(PHOTOID_URL && PHOTOID_BASELINE_URL && PHOTOID_FIXTURES && PHOTOID_EVIDENCE);
const portraits = [
  ['obama', 'President_Barack_Obama.jpg'],
  ['trump', 'Donald_Trump_official_portrait.jpg'],
  ['jemison', 'jemison.jpg'],
  ['williams', 'williams.jpg'],
  ['epps', 'epps.jpg'],
];
const browser = await chromium.launch({ executablePath: CHROME_BIN });
const sheet = await browser.newPage({ viewport: { width: 1720, height: 930 } });

async function renderPortrait(page, url, filepath, color) {
  await page.goto(url);
  await page.locator('#file').setInputFiles(filepath);
  await page.waitForFunction(() => !document.querySelector('#editor-status').textContent.startsWith('Looking for') &&
    document.querySelector('#frame').classList.contains('has-photo'), {}, { timeout: 40000 });
  await page.locator('#zoom').evaluate(slider => {
    slider.value = Math.max(Number(slider.min), Number(slider.value) * 0.72);
    slider.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const start = performance.now();
  await page.locator('#background').selectOption(color);
  await page.waitForFunction(() => document.querySelector('#editor-status').textContent.startsWith('Background replaced'), {}, { timeout: 50000 });
  const milliseconds = Math.round(performance.now() - start);
  assert.doesNotMatch(await page.locator('#editor-status').textContent(), /simple mode/);
  const preview = await page.locator('#preview').evaluate(canvas => ({
    url: canvas.toDataURL(), width: canvas.width, height: canvas.height,
  }));
  return { ...preview, milliseconds };
}

async function compare(before, after, title, filename) {
  assert.deepEqual([before.width, before.height], [after.width, after.height]);
  await sheet.setContent('<style>body{margin:0;background:#f2f5ef}canvas{display:block}</style><canvas width="1720" height="930"></canvas>');
  await sheet.locator('canvas').evaluate(async (canvas, { before, after, title }) => {
    const ctx = canvas.getContext('2d');
    ctx.font = 'bold 24px system-ui';
    ctx.fillStyle = '#183f31';
    ctx.fillText(title + ' · 2× crop', 24, 34);
    for (const [column, image] of [before, after].entries()) {
      const x = 24 + 846 * column;
      const bitmap = await createImageBitmap(await (await fetch(image.url)).blob());
      ctx.font = 'bold 19px system-ui';
      ctx.fillText(column === 0 ? 'BEFORE · original MODNet cutout' : 'AFTER · MediaPipe guard + MODNet cleanup', x, 66);
      ctx.font = '16px system-ui';
      const width = bitmap.width;
      ctx.fillText('Hair / crown', x, 94);
      ctx.drawImage(bitmap, 0, 0, width, 198, x, 105, width * 2, 396);
      ctx.fillText('Shoulders', x, 528);
      ctx.drawImage(bitmap, 0, bitmap.height - 183, width, 183, x, 539, width * 2, 366);
      bitmap.close();
    }
  }, { before, after, title });
  await sheet.screenshot({ path: join(PHOTOID_EVIDENCE, filename) });
}

try {
  for (const viewport of ['desktop', 'mobile']) {
    const mobile = viewport === 'mobile';
    const options = { viewport: { width: mobile ? 390 : 1280, height: 900 }, isMobile: mobile, hasTouch: mobile };
    const baseline = await browser.newPage(options);
    const candidate = await browser.newPage(options);
    if (mobile) for (const page of [baseline, candidate]) {
      const cdp = await page.context().newCDPSession(page);
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    }
    for (const [name, file] of portraits) {
      const filepath = join(PHOTOID_FIXTURES, file);
      const before = await renderPortrait(baseline, PHOTOID_BASELINE_URL, filepath, 'white');
      const after = await renderPortrait(candidate, PHOTOID_URL, filepath, 'white');
      await compare(before, after, name + ' · ' + viewport + ' · white', viewport + '-' + name + '-2x.png');
      console.log(viewport, name, 'before=' + before.milliseconds + 'ms', 'after=' + after.milliseconds + 'ms');
      if (name === 'jemison' || name === 'epps') {
        const beforeBlue = await renderPortrait(baseline, PHOTOID_BASELINE_URL, filepath, 'blue');
        const afterBlue = await renderPortrait(candidate, PHOTOID_URL, filepath, 'blue');
        await compare(beforeBlue, afterBlue, name + ' · ' + viewport + ' · light blue', viewport + '-' + name + '-blue-2x.png');
      }
    }
    const blue = await renderPortrait(candidate, PHOTOID_URL, join(PHOTOID_FIXTURES, portraits[0][1]), 'blue');
    assert.ok(blue.width > 0);
    assert.equal(await candidate.evaluate(() => document.documentElement.scrollWidth), options.viewport.width);
    await candidate.locator('#editor').screenshot({ path: join(PHOTOID_EVIDENCE, viewport + '-editor-light-blue.png') });
    await baseline.close();
    await candidate.close();
  }
} finally {
  await browser.close();
}
