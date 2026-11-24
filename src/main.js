import './style.css';
import { GUMROAD_URL, PRODUCT_ID } from './config.js';
import { mmToPixels, presets, sheets, targetHead } from './formats.js';
import { activate, isPro } from './license.js';
import { cutout, findFace } from './vision.js';
import { jpeg, makeCanvas, makeSheet, pdf, save, watermark } from './exports.js';

const $ = id => document.getElementById(id);
const preview = $('preview');
const previewCtx = preview.getContext('2d');
const presetSelect = $('preset');
const background = $('background');
const maxKB = $('max-kb');
const status = $('editor-status');
const licenseDialog = $('license-dialog');
const cameraDialog = $('camera-dialog');
const colors = { original: '#fff', white: '#fff', cream: '#f5f1e8', blue: '#dcecff' };

let source;
let foreground;
let maskedSource;
let face;
let stream;
let cameraRequest = 0;
let pro = isPro();
let selection = 0;
let maskRevision = 0;
let manualRevision = 0;
let drag;
const pose = { x: 0.5, y: 0.5, zoom: 1, angle: 0 };

function announce(message, error = false) {
  status.textContent = message;
  status.classList.toggle('error', error);
}

function format() {
  const preset = presets.find(item => item.id === presetSelect.value);
  if (preset.id !== 'custom') return preset;
  const mm = ['width-mm', 'height-mm'].map(id => Number($(id).value));
  return mm.every(value => Number.isFinite(value) && value >= 10 && value <= 200) ? { ...preset, mm } : null;
}

function dimensions(preset) {
  return preset.pixels ?? preset.mm.map(mmToPixels);
}

function paint(ctx, width, height) {
  const useMask = background.value !== 'original' && foreground;
  ctx.fillStyle = useMask ? colors[background.value] : '#fff';
  ctx.fillRect(0, 0, width, height);
  if (!source) return;
  const scale = Math.max(width / source.width, height / source.height) * pose.zoom;
  ctx.save();
  const centerX = source.width * pose.x;
  const centerY = source.height * pose.y;
  ctx.translate(width / 2, height / 2);
  ctx.rotate(pose.angle * Math.PI / 180);
  ctx.scale(scale, scale);
  ctx.drawImage(useMask || source, -centerX, -centerY);
  ctx.restore();
}

function render() {
  const preset = format();
  const [width, height] = dimensions(preset ?? presets.at(-1));
  const ratio = width / height;
  const scale = Math.min(1, 840 / Math.max(width, height));
  const w = Math.round(width * scale);
  const h = Math.round(height * scale);
  if (preview.width !== w || preview.height !== h) {
    preview.width = w;
    preview.height = h;
  }
  $('frame').style.setProperty('--ratio', ratio);
  $('frame').style.setProperty('--frame-max', Math.min(310, 330 * ratio) + 'px');
  const head = targetHead(preset ?? presets.at(-1));
  $('frame').style.setProperty('--crown', (0.48 - head / 2) * 100 + '%');
  $('frame').style.setProperty('--chin', (0.48 + head / 2) * 100 + '%');
  $('metrics').textContent = preset
    ? `${width} × ${height} px · head ${Math.round(preset.head[0] * preset.mm[1])}–${Math.round(preset.head[1] * preset.mm[1])} mm`
    : 'Enter dimensions between 10 and 200 mm';
  $('frame').classList.toggle('has-photo', Boolean(source));
  $('frame').classList.toggle('no-guides', !$('show-guides').checked);
  for (const button of document.querySelectorAll('[data-download]')) button.disabled = !source || !preset;
  paint(previewCtx, w, h);
}

function updateControls() {
  $('zoom').value = pose.zoom;
  $('rotation').value = pose.angle;
  $('zoom-value').value = Math.round(pose.zoom * 100) + '%';
  $('rotation-value').value = pose.angle + '°';
}

function fitPhoto(box) {
  Object.assign(pose, { x: 0.5, y: 0.5, zoom: 1, angle: 0 });
  const preset = format();
  if (box && source && preset) {
    const [width, height] = dimensions(preset);
    const base = Math.max(width / source.width, height / source.height);
    pose.zoom = Math.min(5, Math.max(0.65, height * targetHead(preset) / (box.height * 1.35 * base)));
    pose.x = (box.originX + box.width / 2) / source.width;
    pose.y = (box.originY + box.height * 0.36 + height * 0.02 / (base * pose.zoom)) / source.height;
  }
  updateControls();
  render();
}

async function updateBackground() {
  const revision = ++maskRevision;
  const input = source;
  if (!input || background.value === 'original') {
    render();
    return;
  }
  if (maskedSource === input && foreground) {
    render();
    return;
  }
  announce('Removing the background on your device…');
  try {
    const result = await cutout(input);
    if (revision !== maskRevision || source !== input) return;
    foreground = result;
    maskedSource = input;
    announce('Background replaced. Check edges and confirm your application allows edits.');
  } catch {
    if (revision !== maskRevision || source !== input) return;
    background.value = 'original';
    announce('Background removal isn’t available right now. Your original background was kept.', true);
  }
  render();
}

async function loadPhoto(input) {
  const previousMask = source && foreground;
  const revision = ++selection;
  const edit = manualRevision;
  ++maskRevision;
  try {
    const bitmap = await createImageBitmap(input, { imageOrientation: 'from-image' });
    if (revision !== selection) {
      bitmap.close();
      return;
    }
    const scale = Math.min(1, 2400 / Math.max(bitmap.width, bitmap.height));
    const canvas = makeCanvas(Math.max(1, Math.round(bitmap.width * scale)), Math.max(1, Math.round(bitmap.height * scale)));
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    source = canvas;
  } catch {
    if (revision !== selection) return;
    if (!previousMask) background.value = 'original';
    announce('This image couldn’t be opened. Try a JPG, PNG, or WebP file.', true);
    return;
  }
  foreground = undefined;
  maskedSource = undefined;
  face = undefined;
  fitPhoto();
  announce('Looking for one face… You can adjust the crop anytime.');
  if (background.value !== 'original') void updateBackground();
  try {
    const found = await findFace(source);
    if (revision !== selection) return;
    face = found;
    if (manualRevision === edit && face) fitPhoto(face);
    if (background.value === 'original') {
      announce(face ? 'Face found. Fine-tune the crop against the guides.' : 'Couldn’t isolate one face. Adjust the crop manually.');
    }
  } catch {
    if (revision === selection && background.value === 'original') announce('Auto-framing is unavailable. Adjust the crop manually.');
  }
}

function selectPhoto(file) {
  if (!file) return;
  if (file.size > 35_000_000) {
    announce('Choose an image smaller than 35 MB.', true);
    return;
  }
  void loadPhoto(file);
}

function stopCamera() {
  cameraRequest++;
  stream?.getTracks().forEach(track => track.stop());
  stream = undefined;
  $('video').srcObject = null;
  $('snap').disabled = true;
}

async function openCamera() {
  const request = ++cameraRequest;
  $('camera-status').textContent = 'Waiting for camera permission…';
  cameraDialog.showModal();
  try {
    const granted = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
    if (request !== cameraRequest) {
      granted.getTracks().forEach(track => track.stop());
      return;
    }
    stream = granted;
    $('video').srcObject = granted;
    await $('video').play();
    if (request !== cameraRequest) return;
    $('camera-status').textContent = 'Face the camera with even light and a neutral expression.';
    $('snap').disabled = false;
  } catch {
    if (request !== cameraRequest) return;
    stopCamera();
    $('camera-status').textContent = 'Camera unavailable. Check site permissions or upload a photo instead.';
  }
}

function capture() {
  const video = $('video');
  if (!video.videoWidth || !video.videoHeight) return;
  const still = makeCanvas(video.videoWidth, video.videoHeight);
  still.getContext('2d').drawImage(video, 0, 0);
  stopCamera();
  cameraDialog.close();
  still.toBlob(selectPhoto, 'image/jpeg', 0.96);
}

function updatePro() {
  for (const item of document.querySelectorAll('[data-tier]')) {
    item.textContent = pro ? 'Pro active' : 'Free preview';
  }
  maxKB.disabled = !pro;
  for (const button of document.querySelectorAll('[data-license]')) {
    button.hidden = pro;
  }
}

async function download(kind, button) {
  const preset = format();
  if (!source || !preset) return;
  const paperId = $('paper').value;
  if (!pro && (!preset.free || (kind !== 'digital' && paperId === 'a4'))) {
    announce(!preset.free ? 'This preset is available to preview. Activate Pro to download it.' : 'Activate Pro to export an A4 sheet.', true);
    return;
  }
  const limit = Number(maxKB.value);
  if (pro && kind === 'digital' && !maxKB.validity.valid) {
    maxKB.reportValidity();
    return;
  }
  button.disabled = true;
  try {
    const photo = makeCanvas(...dimensions(preset));
    const ctx = photo.getContext('2d');
    paint(ctx, photo.width, photo.height);
    if (!pro) watermark(ctx, photo.width, photo.height);
    if (kind === 'digital') {
      const blob = await jpeg(photo, pro ? limit : 0);
      save(blob, `photoid-${preset.id}.jpg`);
      announce(`Digital JPG saved · ${(blob.size / 1000).toFixed(1)} KB${pro ? '' : ' · watermarked preview'}.`);
      return;
    }
    const paper = sheets[paperId];
    const { canvas, count } = makeSheet(photo, paper);
    const jpg = await jpeg(canvas);
    const ext = kind === 'pdf' ? 'pdf' : 'jpg';
    save(kind === 'pdf' ? await pdf(jpg, paper) : jpg, `photoid-${preset.id}-${paperId}.${ext}`);
    announce(`${count} photos saved with cut marks. Print at actual size (100%), not “fit to page”.`);
  } catch (error) {
    announce(error.message, true);
  } finally {
    button.disabled = !source || !format();
  }
}

for (const preset of presets) {
  presetSelect.add(new Option(preset.name, preset.id));
}
for (const link of document.querySelectorAll('[data-buy]')) link.href = GUMROAD_URL;
$('checkout-note').hidden = PRODUCT_ID !== 'TODO';
for (const button of document.querySelectorAll('[data-license]')) {
  button.addEventListener('click', () => licenseDialog.showModal());
}
for (const button of document.querySelectorAll('[data-download]')) {
  button.addEventListener('click', () => void download(button.dataset.download, button));
}

$('license-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = $('verify');
  const message = $('license-status');
  const key = $('license-key').value.trim();
  if (!key) {
    message.textContent = 'Enter the license key from your receipt.';
    return;
  }
  button.disabled = true;
  message.textContent = 'Checking with Gumroad…';
  try {
    const remembered = await activate(key);
    pro = true;
    $('license-key').value = '';
    updatePro();
    licenseDialog.close();
    announce(remembered ? 'PhotoID Pro is active on this browser.' : 'Pro is active for this visit only; browser storage is unavailable.');
  } catch (error) {
    message.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});

$('file').addEventListener('change', event => {
  selectPhoto(event.target.files[0]);
  event.target.value = '';
});
const dropZone = $('drop-zone');
dropZone.addEventListener('dragover', event => {
  event.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', event => {
  event.preventDefault();
  dropZone.classList.remove('drag-over');
  selectPhoto(event.dataTransfer.files[0]);
});
$('camera').addEventListener('click', openCamera);
$('snap').addEventListener('click', capture);
cameraDialog.addEventListener('close', stopCamera);

presetSelect.addEventListener('change', () => {
  $('custom-size').hidden = presetSelect.value !== 'custom';
  manualRevision++;
  fitPhoto(face);
});
for (const id of ['width-mm', 'height-mm', 'show-guides']) $(id).addEventListener('input', render);
background.addEventListener('change', () => {
  if (background.value === 'original') announce(source ? 'Original background restored.' : '');
  void updateBackground();
});
for (const [id, key] of [['zoom', 'zoom'], ['rotation', 'angle']]) {
  $(id).addEventListener('input', () => {
    manualRevision++;
    pose[key] = Number($(id).value);
    updateControls();
    render();
  });
}
$('reset').addEventListener('click', () => {
  manualRevision++;
  fitPhoto(face);
});

function pan(dx, dy) {
  const bounds = preview.getBoundingClientRect();
  const scale = Math.max(bounds.width / source.width, bounds.height / source.height) * pose.zoom;
  const angle = pose.angle * Math.PI / 180;
  const clamp = value => Math.max(0, Math.min(1, value));
  pose.x = clamp(pose.x - (dx * Math.cos(angle) + dy * Math.sin(angle)) / (scale * source.width));
  pose.y = clamp(pose.y - (dy * Math.cos(angle) - dx * Math.sin(angle)) / (scale * source.height));
  manualRevision++;
  render();
}

preview.addEventListener('pointerdown', event => {
  if (!source || !event.isPrimary || event.button !== 0) return;
  preview.setPointerCapture(event.pointerId);
  drag = { id: event.pointerId, x: event.clientX, y: event.clientY };
});
preview.addEventListener('pointermove', event => {
  if (!source || drag?.id !== event.pointerId) return;
  pan(event.clientX - drag.x, event.clientY - drag.y);
  drag.x = event.clientX;
  drag.y = event.clientY;
});
preview.addEventListener('lostpointercapture', () => { drag = undefined; });
preview.addEventListener('keydown', event => {
  const directions = { ArrowUp: [0, -8], ArrowDown: [0, 8], ArrowLeft: [-8, 0], ArrowRight: [8, 0] };
  if (!source || !directions[event.key]) return;
  event.preventDefault();
  pan(...directions[event.key]);
});

updatePro();
updateControls();
render();
