import { refineMatte } from './matte.js';

const ortRoot = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
const weights = 'https://huggingface.co/Xenova/modnet/resolve/fa2fa546052fba4c08921230a26cc69a333fca12/onnx/model.onnx';
let model;

async function loadModel() {
  const ort = await import(/* @vite-ignore */ ortRoot + 'ort.wasm.min.mjs');
  ort.env.wasm.wasmPaths = ortRoot;
  ort.env.wasm.numThreads = 1;
  const cache = await globalThis.caches?.open('photoid-models').catch(() => null);
  let response = await cache?.match(weights).catch(() => null);
  if (!response) {
    response = await fetch(weights, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error('Portrait model download failed');
    if (cache) void cache.put(weights, response.clone()).catch(() => {});
  }
  const session = await ort.InferenceSession.create(await response.arrayBuffer(), { executionProviders: ['wasm'] });
  return { session, Tensor: ort.Tensor };
}

async function makeMatte(image, progress) {
  if (!model) {
    progress('Loading the portrait model on your device…');
    model = loadModel().catch(error => {
      model = undefined;
      throw error;
    });
  }
  const { session, Tensor } = await model;
  progress('Refining hair and edges on your device…');
  const scale = Math.min(512 / Math.min(image.width, image.height), 768 / Math.max(image.width, image.height));
  const w = Math.max(32, Math.round(image.width * scale / 32) * 32);
  const h = Math.max(32, Math.round(image.height * scale / 32) * 32);
  const small = new OffscreenCanvas(w, h);
  const smallCtx = small.getContext('2d', { willReadFrequently: true });
  smallCtx.imageSmoothingQuality = 'high';
  smallCtx.drawImage(image, 0, 0, w, h);
  const rgb = smallCtx.getImageData(0, 0, w, h).data;
  const size = w * h;
  const input = new Float32Array(3 * size);
  for (let i = 0; i < size; i++) {
    for (let c = 0; c < 3; c++) input[c * size + i] = rgb[i * 4 + c] / 127.5 - 1;
  }
  const tensor = new Tensor('float32', input, [1, 3, h, w]);
  const output = await session.run({ [session.inputNames[0]]: tensor });
  const matte = output[session.outputNames[0]];
  const alpha = smallCtx.createImageData(w, h);
  for (let i = 0; i < size; i++) alpha.data[i * 4 + 3] = matte.data[i] * 255;
  matte.dispose();
  tensor.dispose();
  smallCtx.putImageData(alpha, 0, 0);

  const outputScale = Math.min(1, 1600 / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * outputScale));
  const height = Math.max(1, Math.round(image.height * outputScale));
  const full = new OffscreenCanvas(width, height);
  const ctx = full.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(small, 0, 0, width, height);
  const mask = ctx.getImageData(0, 0, width, height).data;
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  const pixels = ctx.getImageData(0, 0, width, height);
  refineMatte(pixels.data, mask, width, height);
  ctx.putImageData(pixels, 0, 0);
  return full.transferToImageBitmap();
}

self.addEventListener('message', async ({ data: { id, image } }) => {
  try {
    const result = await makeMatte(image, progress => self.postMessage({ id, progress }));
    self.postMessage({ id, result }, [result]);
  } catch {
    self.postMessage({ id, failed: true });
  } finally {
    image.close();
  }
});
