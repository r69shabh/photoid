const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function refineMatte(data, mask, width, height) {
  const original = data.slice();
  const offsets = [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  const foreground = [0, 0, 0];
  const background = [0, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const pixel = i * 4;
      let alpha = mask[pixel + 3] / 255;
      if (alpha <= 0.015 || alpha >= 0.985) {
        data[pixel + 3] = alpha <= 0.015 ? 0 : 255;
        continue;
      }
      foreground.fill(0);
      background.fill(0);
      let foregroundWeight = 0;
      let backgroundWeight = 0;
      for (const radius of [3, 7, 13]) {
        const weight = 1 / radius;
        for (const [dx, dy] of offsets) {
          const sx = x + dx * radius;
          const sy = y + dy * radius;
          if (sx < 0 || sx >= width || sy < 0 || sy >= height) continue;
          const sample = (sy * width + sx) * 4;
          const opacity = mask[sample + 3];
          if (opacity < 24 || opacity > 231) {
            const color = opacity < 24 ? background : foreground;
            for (let c = 0; c < 3; c++) color[c] += original[sample + c] * weight;
            if (opacity < 24) backgroundWeight += weight;
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
          alpha += clamp(colorAlpha - alpha, -0.23, 0.23) * 0.65;
        }
        const prior = 0.08 * (1 - alpha);
        for (let c = 0; c < 3; c++) {
          const unmixed = (alpha * (data[pixel + c] - (1 - alpha) * background[c]) + prior * foreground[c])
            / (alpha * alpha + prior);
          data[pixel + c] = data[pixel + c] * 0.20 + clamp(unmixed, 0, 255) * 0.80;
        }
      }
      data[pixel + 3] = alpha * 255;
    }
  }
  return data;
}
