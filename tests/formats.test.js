import test from 'node:test';
import assert from 'node:assert/strict';
import { digitalDimensions, layoutSheet, presets, previewDimensions, printDimensions, sheets } from '../src/formats.js';
import { checkOriginalJpeg, jpeg, setDensity } from '../src/exports.js';

test('presets preserve physical and explicit digital sizes', () => {
  assert.deepEqual(Object.fromEntries(presets.map(preset => [preset.id, [
    digitalDimensions(preset) ?? preset.digital?.minPixels ?? null,
    preset.print === false ? null : printDimensions(preset) ?? null,
    [preset.digital?.minKB ?? null, preset.digital?.maxKB ?? null],
  ]])), {
    in: [[630, 810], [413, 531], [null, 250]],
    oci: [[600, 600], [602, 602], [null, 200]],
    'in-evisa': [[600, 600], null, [10, 1000]],
    us: [[600, 600], [600, 600], [54, 240]],
    uk: [[600, 750], [413, 531], [50, 10000]],
    eu: [null, [413, 531], [null, null]],
    ca: [null, null, [null, null]],
    au: [null, [413, 531], [null, null]],
    cn: [[354, 472], null, [40, 120]],
    'cn-print': [null, [390, 567], [null, null]],
    custom: [[413, 531], [413, 531], [null, null]],
  });
  assert.deepEqual(sheets['4x6'].pixels, [1200, 1800]);
  assert.deepEqual(sheets.a4.pixels, [2480, 3508]);
  assert.deepEqual(previewDimensions(presets.find(preset => preset.id === 'uk')), [413, 531]);
  assert.deepEqual(digitalDimensions({ ...presets.at(-1), mm: [40, 60] }), [472, 709]);
});

test('UK originals must meet both pixel minima and the file size window', () => {
  const spec = presets.find(preset => preset.id === 'uk').digital;
  const jpg = size => ({ type: 'image/jpeg', size });
  assert.doesNotThrow(() => checkOriginalJpeg(jpg(50_000), 600, 750, spec));
  assert.doesNotThrow(() => checkOriginalJpeg(jpg(10_000_000), 750, 1000, spec));
  assert.throws(() => checkOriginalJpeg(jpg(50_000), 599, 750, spec), /600 × 750/);
  assert.throws(() => checkOriginalJpeg(jpg(50_000), 600, 749, spec), /600 × 750/);
  assert.throws(() => checkOriginalJpeg(jpg(49_999), 600, 750, spec), /between 50 KB/);
  assert.throws(() => checkOriginalJpeg(jpg(10_000_001), 600, 750, spec), /between 50 KB/);
  assert.throws(() => checkOriginalJpeg({ type: 'image/png', size: 50_000 }, 600, 750, spec), /original JPG/);
});

test('JPEG output honors both byte limits or refuses to save', async () => {
  const canvas = {
    toBlob(callback, type, quality) {
      const bytes = new Uint8Array(Math.round(quality * 200_000));
      bytes.set([255, 216, 255, 217]);
      callback(new Blob([bytes], { type }));
    },
  };
  const jpg = await jpeg(canvas, { minKB: 40, maxKB: 120 });
  assert.ok(jpg.size >= 40_000 && jpg.size <= 120_000);
  assert.ok((await jpeg(canvas, { minKB: 195 })).size >= 195_000);
  await assert.rejects(jpeg(canvas, { minKB: 201 }), /smaller than 201 KB/);
  await assert.rejects(jpeg(canvas, { maxKB: 5 }), /can’t fit/);
});

test('print layout centers photos and rotates when that fits more', () => {
  const india = layoutSheet(sheets['4x6'].pixels, [413, 531]);
  assert.equal(india.count, 6);
  assert.equal(india.left, 172);
  assert.equal(india.top, 73.5);
  const us = layoutSheet(sheets['4x6'].pixels, [600, 600]);
  assert.equal(us.count, 2);
  const canada = layoutSheet(sheets['4x6'].pixels, [591, 827]);
  assert.equal(canada.rotated, false);
  assert.equal(canada.count, 2);
  assert.equal(layoutSheet([900, 1200], [420, 800]).rotated, true);
  assert.equal(layoutSheet(sheets.a4.pixels, [2362, 4000]).count, 0);
});

test('JPEG density is 300 pixels per inch with and without a JFIF header', async () => {
  const raw = new Blob([Uint8Array.of(255, 216, 255, 217)], { type: 'image/jpeg' });
  const dated = await setDensity(raw);
  const same = await setDensity(dated);
  const bytes = new Uint8Array(await same.arrayBuffer());
  assert.equal(same.size, dated.size);
  assert.deepEqual([...bytes.subarray(13, 18)], [1, 1, 44, 1, 44]);
  assert.deepEqual([...bytes.subarray(-2)], [255, 217]);
});
