const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function personGate({ alpha, width, height }) {
  const radius = Math.max(2, Math.max(width, height) * 0.009);
  const distance = new Float32Array(alpha.length).fill(radius);
  const visited = new Uint8Array(alpha.length);
  const queue = new Int32Array(alpha.length);
  const offsets = [-1, 1, -width, width];
  let largest = [];
  for (let i = 0; i < alpha.length; i++) {
    if (visited[i] || alpha[i] < 217) continue;
    let end = 1;
    queue[0] = i;
    visited[i] = 1;
    for (let j = 0; j < end; j++) {
      const pixel = queue[j];
      const x = pixel % width;
      for (const offset of offsets) {
        if ((offset === -1 && x === 0) || (offset === 1 && x + 1 === width)) continue;
        const neighbor = pixel + offset;
        if (neighbor < 0 || neighbor >= alpha.length || visited[neighbor] || alpha[neighbor] < 217) continue;
        visited[neighbor] = 1;
        queue[end++] = neighbor;
      }
    }
    if (end > largest.length) largest = queue.slice(0, end);
  }
  if (!largest.length) throw new Error('No confident person region');
  for (const pixel of largest) distance[pixel] = 0;
  const diagonal = Math.SQRT2;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (x) distance[i] = Math.min(distance[i], distance[i - 1] + 1);
      if (!y) continue;
      distance[i] = Math.min(distance[i], distance[i - width] + 1);
      if (x) distance[i] = Math.min(distance[i], distance[i - width - 1] + diagonal);
      if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i - width + 1] + diagonal);
    }
  }
  for (let y = height - 1; y >= 0; y--) {
    for (let x = width - 1; x >= 0; x--) {
      const i = y * width + x;
      if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i + 1] + 1);
      if (y + 1 === height) continue;
      distance[i] = Math.min(distance[i], distance[i + width] + 1);
      if (x) distance[i] = Math.min(distance[i], distance[i + width - 1] + diagonal);
      if (x + 1 < width) distance[i] = Math.min(distance[i], distance[i + width + 1] + diagonal);
    }
  }
  return Uint8ClampedArray.from(distance, value => {
    const t = 1 - value / radius;
    return 255 * t * t * (3 - 2 * t);
  });
}

export function refineMatte(data, mask, width, height) {
  const original = data.slice();
  const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  const foreground = [0, 0, 0];
  const background = [0, 0, 0];
  const unmixed = [0, 0, 0];
  const radii = [3, 7, 13, 23];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const pixel = i * 4;
      let alpha = mask[pixel + 3] / 255;
      if (alpha <= 0.015 || alpha === 1) {
        data[pixel + 3] = alpha <= 0.015 ? 0 : 255;
        continue;
      }
      foreground.fill(0);
      background.fill(0);
      let foregroundWeight = 0;
      let backgroundWeight = 0;
      for (const radius of radii) {
        const weight = 1 / radius;
        for (const [dx, dy] of offsets) {
          const sx = x + dx * radius;
          const sy = y + dy * radius;
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          const sample = (sy * width + sx) * 4;
          const opacity = mask[sample + 3];
          if (opacity < 8 || opacity > 250) {
            const color = opacity < 8 ? background : foreground;
            for (let c = 0; c < 3; c++) color[c] += original[sample + c] * weight;
            if (opacity < 8) backgroundWeight += weight;
            else foregroundWeight += weight;
          }
        }
      }
      if (foregroundWeight && backgroundWeight) {
        let projection = 0;
        let contrast = 0;
        for (let c = 0; c < 3; c++) {
          foreground[c] /= foregroundWeight;
          background[c] /= backgroundWeight;
          const delta = foreground[c] - background[c];
          projection += (data[pixel + c] - background[c]) * delta;
          contrast += delta * delta;
        }
        if (contrast > 900) {
          const colorAlpha = clamp(projection / contrast, 0, 1);
          alpha -= Math.max(0, alpha - colorAlpha) * 0.90;
        }
        const prior = 0.30 * (1 - alpha);
        let brightness = 0;
        for (let c = 0; c < 3; c++) {
          unmixed[c] = (alpha * (data[pixel + c] - (1 - alpha) * background[c]) + prior * foreground[c])
            / (alpha * alpha + prior);
          brightness += (unmixed[c] - foreground[c]) / 3;
        }
        const chroma = alpha ** 3;
        for (let c = 0; c < 3; c++) {
          const neutral = foreground[c] + clamp(brightness, -35, 35);
          data[pixel + c] = neutral + (unmixed[c] - neutral) * chroma;
        }
      }
      data[pixel + 3] = alpha * 255;
    }
  }
  return data;
}
