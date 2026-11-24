const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';
const modelRoot = 'https://storage.googleapis.com/mediapipe-models/';
let runtime;
let detector;
let segmenter;
let worker;
let sequence = 0;
const jobs = new Map();

function getRuntime() {
  return runtime ??= import('@mediapipe/tasks-vision').then(async vision => ({
    vision,
    files: await vision.FilesetResolver.forVisionTasks(wasmUrl),
  })).catch(error => {
    runtime = undefined;
    throw error;
  });
}

export async function findFace(canvas) {
  detector ??= getRuntime().then(({ vision, files }) => vision.FaceDetector.createFromOptions(files, {
    baseOptions: { modelAssetPath: modelRoot + 'face_detector/blaze_face_short_range/float16/latest/blaze_face_short_range.tflite' },
    minDetectionConfidence: 0.55,
  })).catch(error => {
    detector = undefined;
    throw error;
  });
  const { detections } = (await detector).detect(canvas);
  return detections.length === 1 ? detections[0].boundingBox : null;
}

async function personMask(canvas) {
  segmenter ??= getRuntime().then(({ vision, files }) => vision.ImageSegmenter.createFromOptions(files, {
    baseOptions: { modelAssetPath: modelRoot + 'image_segmenter/selfie_segmenter/float16/latest/selfie_segmenter.tflite' },
    outputCategoryMask: false,
    outputConfidenceMasks: true,
  })).catch(error => {
    segmenter = undefined;
    throw error;
  });
  let result;
  (await segmenter).segment(canvas, ({ confidenceMasks }) => {
    const mask = confidenceMasks.at(-1);
    if (!mask) throw new Error('No portrait mask');
    result = { alpha: Uint8ClampedArray.from(mask.getAsFloat32Array(), value => value * 255),
      width: mask.width, height: mask.height };
  });
  if (!result) throw new Error('No portrait mask');
  return result;
}

function basicCutout(canvas, { alpha, width, height }) {
  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = width;
  maskCanvas.height = height;
  const maskCtx = maskCanvas.getContext('2d');
  const rgba = maskCtx.createImageData(width, height);
  for (let i = 0; i < alpha.length; i++) {
    rgba.data[i * 4 + 3] = (alpha[i] - 255 * 0.18) / 0.64;
  }
  maskCtx.putImageData(rgba, 0, 0);
  const result = document.createElement('canvas');
  result.width = canvas.width;
  result.height = canvas.height;
  const ctx = result.getContext('2d');
  ctx.drawImage(canvas, 0, 0);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
  return result;
}

function mattingWorker() {
  if (worker) return worker;
  worker = new Worker(new URL('./portrait.worker.js', import.meta.url), { type: 'module' });
  worker.addEventListener('message', ({ data: { id, progress, result, failed } }) => {
    const job = jobs.get(id);
    if (progress) {
      job?.progress(progress);
      return;
    }
    jobs.delete(id);
    if (failed) job?.reject(new Error('Portrait matting failed'));
    else job?.resolve(result);
  });
  worker.addEventListener('error', () => {
    worker.terminate();
    worker = undefined;
    for (const job of jobs.values()) job.reject(new Error('Portrait worker unavailable'));
    jobs.clear();
  });
  return worker;
}

export async function cutout(canvas, progress) {
  const person = await personMask(canvas);
  try {
    const image = await createImageBitmap(canvas);
    const id = ++sequence;
    const result = await new Promise((resolve, reject) => {
      try {
        const portrait = mattingWorker();
        jobs.set(id, { progress, resolve, reject });
        portrait.postMessage({ id, image, person }, [image]);
      } catch (error) {
        jobs.delete(id);
        image.close();
        reject(error);
      }
    });
    const foreground = document.createElement('canvas');
    foreground.width = canvas.width;
    foreground.height = canvas.height;
    foreground.getContext('2d').drawImage(result, 0, 0, canvas.width, canvas.height);
    result.close();
    return { foreground, basic: false };
  } catch {
    progress('Detailed matting unavailable. Trying simple background removal…');
    return { foreground: basicCutout(canvas, person), basic: true };
  }
}
