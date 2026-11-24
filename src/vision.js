const wasmUrl = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm';
const modelRoot = 'https://storage.googleapis.com/mediapipe-models/';
let runtime;
let detector;
let segmenter;

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

export async function cutout(canvas) {
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
    const alpha = mask.getAsFloat32Array();
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = mask.width;
    maskCanvas.height = mask.height;
    const maskCtx = maskCanvas.getContext('2d');
    const rgba = maskCtx.createImageData(mask.width, mask.height);
    for (let i = 0; i < alpha.length; i++) {
      rgba.data[i * 4 + 3] = Math.round(255 * Math.max(0, Math.min(1, (alpha[i] - 0.18) / 0.64)));
    }
    maskCtx.putImageData(rgba, 0, 0);
    result = document.createElement('canvas');
    result.width = canvas.width;
    result.height = canvas.height;
    const ctx = result.getContext('2d');
    ctx.drawImage(canvas, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
  });
  if (!result) throw new Error('No portrait mask');
  return result;
}
