import test from 'node:test';
import assert from 'node:assert/strict';
import { personGate, refineMatte } from '../src/matte.js';

test('the person gate allows a soft border but discards isolated low-confidence background', () => {
  const width = 700;
  const height = 7;
  const alpha = new Uint8ClampedArray(width * height).fill(100);
  alpha[3 * width + 20] = 255;
  alpha[3 * width + 21] = 255;
  alpha[3 * width + 300] = 255;
  const gate = personGate({ alpha, width, height });
  assert.equal(gate[3 * width + 21], 255);
  assert.ok(gate[3 * width + 24] > 0 && gate[3 * width + 24] < 255);
  assert.equal(gate[3 * width + 28], 0);
  assert.equal(gate[3 * width + 200], 0);
  assert.equal(gate[3 * width + 300], 0);
});

test('nearby background color is removed from translucent pixels without binarizing the matte', () => {
  const width = 31;
  const height = 9;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const mask = new Uint8ClampedArray(pixels.length);
  const foreground = [30, 40, 50];
  const edge = [125, 140, 150];
  const background = [220, 240, 250];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      pixels.set([...(x < 15 ? foreground : x === 15 ? edge : background), 255], i);
      mask[i + 3] = x < 15 ? 255 : x === 15 ? 128 : 0;
    }
  }
  const i = (4 * width + 15) * 4;
  refineMatte(pixels, mask, width, height);
  assert.deepEqual([...pixels.subarray(i - 4, i)], [...foreground, 255]);
  assert.equal(pixels[i + 7], 0);
  assert.ok(pixels[i + 3] > 120 && pixels[i + 3] < 136);
  assert.ok(pixels[i] < 60 && pixels[i + 1] < 65 && pixels[i + 2] < 75);
});

test('background-colored pixels outside dark hair lose opacity even when the model predicts a halo', () => {
  const width = 31;
  const height = 9;
  const pixels = new Uint8ClampedArray(width * height * 4);
  const mask = new Uint8ClampedArray(pixels.length);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      pixels.set(x < 15 ? [30, 27, 24, 255] : [241, 237, 232, 255], i);
      mask[i + 3] = x < 15 ? 255 : x === 15 ? 155 : 0;
    }
  }
  refineMatte(pixels, mask, width, height);
  assert.ok(pixels[(4 * width + 15) * 4 + 3] <= 16);
});
