import { DPI, layoutSheet } from './formats.js';

export function makeCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export function watermark(ctx, width, height) {
  const size = Math.max(10, Math.round(width / 23));
  ctx.save();
  ctx.font = 'bold ' + size + 'px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const inset = Math.round(width / 26);
  const label = 'PhotoID';
  const box = ctx.measureText(label).width + 2 * inset;
  ctx.fillStyle = 'rgba(16,32,21,.83)';
  ctx.fillRect(width - box, height - size - inset * 2, box, size + inset * 2);
  ctx.fillStyle = '#fff';
  ctx.fillText(label, width - box + inset, height - inset - size / 2);
  ctx.restore();
}

export function makeSheet(photo, paper) {
  const canvas = makeCanvas(...paper.pixels);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const { w, h, cols, rows, left, top, gap, rotated, count } =
    layoutSheet(paper.pixels, [photo.width, photo.height]);
  if (!count) throw new Error('This photo won’t fit on the selected paper. Try a larger sheet or a smaller size.');
  ctx.strokeStyle = '#596460';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = Math.round(left + col * (w + gap));
      const y = Math.round(top + row * (h + gap));
      if (rotated) {
        ctx.save();
        ctx.translate(x + w, y);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(photo, 0, 0);
        ctx.restore();
      } else {
        ctx.drawImage(photo, x, y);
      }
      for (const [dx, dy] of [[0, 0], [w, 0], [0, h], [w, h]]) {
        const cx = x + dx;
        const cy = y + dy;
        const sx = dx ? 1 : -1;
        const sy = dy ? 1 : -1;
        ctx.moveTo(cx + 2 * sx, cy);
        ctx.lineTo(cx + 11 * sx, cy);
        ctx.moveTo(cx, cy + 2 * sy);
        ctx.lineTo(cx, cy + 11 * sy);
      }
    }
  }
  ctx.stroke();
  return { canvas, count };
}

function encode(canvas, quality) {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('The browser could not encode this JPEG.')),
    'image/jpeg',
    quality,
  ));
}

export async function setDensity(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const hasJfif = bytes[2] === 0xff && bytes[3] === 0xe0 &&
    [74, 70, 73, 70, 0].every((value, i) => bytes[6 + i] === value);
  if (hasJfif) {
    bytes.set([1, DPI >> 8, DPI & 255, DPI >> 8, DPI & 255], 13);
    return new Blob([bytes], { type: 'image/jpeg' });
  }
  const jfif = new Uint8Array([255, 224, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, DPI >> 8, DPI & 255, DPI >> 8, DPI & 255, 0, 0]);
  return new Blob([bytes.subarray(0, 2), jfif, bytes.subarray(2)], { type: 'image/jpeg' });
}

export async function jpeg(canvas, targetKB) {
  let candidate = await setDensity(await encode(canvas, 0.95));
  if (!targetKB || candidate.size <= targetKB * 1000) return candidate;
  const limit = targetKB * 1000;
  let low = 0.05;
  let high = 0.95;
  candidate = await setDensity(await encode(canvas, low));
  if (candidate.size > limit) throw new Error('This photo can’t fit that KB limit at its current dimensions. Try a higher limit.');
  for (let i = 0; i < 8; i++) {
    const mid = (low + high) / 2;
    const attempt = await setDensity(await encode(canvas, mid));
    if (attempt.size <= limit) {
      candidate = attempt;
      low = mid;
    } else {
      high = mid;
    }
  }
  return candidate;
}

export async function pdf(jpg, paper) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: paper.mm });
  doc.addImage(new Uint8Array(await jpg.arrayBuffer()), 'JPEG', 0, 0, ...paper.mm);
  return doc.output('blob');
}

export function save(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
