import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutSheet, mmToPixels, presets, sheets } from '../src/formats.js';
import { setDensity } from '../src/exports.js';

test('presets preserve physical and explicit digital sizes', () => {
  assert.deepEqual(presets.map(preset => preset.pixels ?? preset.mm.map(mmToPixels)), [
    [413, 531], [600, 600], [600, 600], [413, 531], [413, 531],
    [591, 827], [413, 531], [390, 567], [413, 531],
  ]);
  assert.deepEqual(sheets['4x6'].pixels, [1200, 1800]);
  assert.deepEqual(sheets.a4.pixels, [2480, 3508]);
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
