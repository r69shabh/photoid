export const DPI = 300;
export const mmToPixels = mm => Math.round(mm / 25.4 * DPI);

export const presets = [
  { id: 'in', name: 'India · 35 × 45 mm', mm: [35, 45], head: [0.70, 0.80], free: true },
  { id: 'oci', name: 'India / OCI · 2 × 2 in', mm: [50.8, 50.8], pixels: [600, 600], head: [0.50, 0.69] },
  { id: 'us', name: 'US passport / visa · 2 × 2 in', mm: [50.8, 50.8], pixels: [600, 600], head: [0.50, 0.69], free: true },
  { id: 'uk', name: 'UK · 35 × 45 mm', mm: [35, 45], head: [29 / 45, 34 / 45] },
  { id: 'eu', name: 'Schengen · 35 × 45 mm', mm: [35, 45], head: [32 / 45, 36 / 45] },
  { id: 'ca', name: 'Canada · 50 × 70 mm', mm: [50, 70], head: [31 / 70, 36 / 70] },
  { id: 'au', name: 'Australia · 35 × 45 mm', mm: [35, 45], head: [32 / 45, 36 / 45] },
  { id: 'cn', name: 'China visa · 33 × 48 mm', mm: [33, 48], head: [28 / 48, 33 / 48] },
  { id: 'custom', name: 'Custom dimensions', mm: [35, 45], head: [0.65, 0.75] },
];

export const sheets = {
  '4x6': { mm: [101.6, 152.4], pixels: [1200, 1800] },
  a4: { mm: [210, 297], pixels: [2480, 3508] },
};

export const targetHead = preset => (preset.head[0] + preset.head[1]) / 2;

export function layoutSheet(page, photo, gap = 30, margin = 36) {
  const [width, height] = page;
  const options = [photo, [photo[1], photo[0]]].map(([w, h], index) => {
    const cols = Math.max(0, Math.floor((width - 2 * margin + gap) / (w + gap)));
    const rows = Math.max(0, Math.floor((height - 2 * margin + gap) / (h + gap)));
    return { w, h, cols, rows, rotated: Boolean(index), count: cols * rows };
  });
  const result = options[1].count > options[0].count ? options[1] : options[0];
  const { w, h, cols, rows } = result;
  return {
    ...result,
    left: (width - cols * w - (cols - 1) * gap) / 2,
    top: (height - rows * h - (rows - 1) * gap) / 2,
    gap,
  };
}
