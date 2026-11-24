export const DPI = 300;
export const mmToPixels = mm => Math.round(mm / 25.4 * DPI);

export const presets = [
  {
    id: 'in', name: 'India passport · 35 × 45 mm', mm: [35, 45], head: [0.80, 0.85], free: true,
    digital: { pixels: [630, 810], maxKB: 250 },
    notice: 'For Passport Seva workflows that ask you to upload. Take the photo against a white background; do not retouch it. Some offices take your photo in person.',
    guide: 'https://mportal.passportindia.gov.in/pdf/Guidelines_for_ICAO_Compliant_Photographs_for_Passport_Applications.pdf',
  },
  {
    id: 'oci', name: 'India OCI · 51 × 51 mm', mm: [51, 51], head: [0.80, 0.85],
    digital: { pixels: [600, 600], maxKB: 200 }, backgrounds: ['cream', 'blue'],
    notice: 'Use a plain light-coloured background, not white. Check your mission’s OCI photo and upload rules.',
    guide: 'https://www.eoiparis.gov.in/page/OCI_Services_Guidelines/',
  },
  {
    id: 'in-evisa', name: 'India e-Visa · online', head: [0.65, 0.75],
    digital: { pixels: [600, 600], minKB: 10, maxKB: 1000 },
    notice: 'For the e-Visa portal, not Passport Seva or OCI. Take a square, full-face photo against a plain white background.',
    guide: 'https://www.indianvisaonline.gov.in/evisa/',
  },
  {
    id: 'us', name: 'US visa digital / passport print', mm: [50.8, 50.8], head: [0.50, 0.69], headCenter: 0.42, free: true,
    digital: { pixels: [600, 600], minKB: 54, maxKB: 240 },
    notice: 'Use a plain white or off-white background and no retouching. For US passport renewal online, upload your original photo to the government portal instead.',
    guide: 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html',
  },
  {
    id: 'uk', name: 'UK passport · original JPG / 35 × 45 mm print', mm: [35, 45], head: [29 / 45, 34 / 45],
    digital: { minPixels: [600, 750], minKB: 50, maxKB: 10000 },
    notice: 'Online: use an unedited photo of your head, shoulders and upper body, at least 600 × 750 px and 50 KB–10 MB. Save Original JPG keeps it unchanged. The preview crop is for print only.',
    guide: 'https://www.gov.uk/photos-for-passports',
  },
  {
    id: 'eu', name: 'Schengen visa · 35 × 45 mm print', mm: [35, 45], head: [0.70, 0.80],
    notice: 'Print layout only. There is no single digital upload size for all Schengen applications; follow your consulate’s instructions.',
    guide: 'https://home-affairs.ec.europa.eu/policies/schengen/schengen-visas/applying-schengen-visa_en',
  },
  {
    id: 'ca', name: 'Canada passport · studio required', mm: [50, 70], head: [31 / 70, 36 / 70], print: false,
    notice: 'Reference only. Canada requires a commercial photographer or studio for passport photos and does not accept home prints or altered digital files.',
    guide: 'https://www.canada.ca/en/immigration-refugees-citizenship/services/canadian-passports/photos.html',
  },
  {
    id: 'au', name: 'Australia passport · 35 × 45 mm print', mm: [35, 45], head: [32 / 45, 36 / 45],
    notice: 'Print layout only. Use unretouched photos on glossy paper of at least 200 gsm. For online renewal, get a photo code from your photo provider.',
    guide: 'https://www.passports.gov.au/PhotoGuidelines',
  },
  {
    id: 'cn', name: 'China visa · online', head: [28 / 48, 33 / 48], headCenter: 0.41,
    digital: { pixels: [354, 472], minKB: 40, maxKB: 120 }, backgrounds: ['white', 'cream'],
    notice: 'Use a white or near-white background. At 354 × 472 px, check the centre’s eye position and face width diagram; the on-screen head-height lines are only a guide.',
    guide: 'https://bio.visaforchina.cn/KUL3_EN/upload/20231123/4b89d0c364d44f778f85d6fd76d93475.pdf',
  },
  {
    id: 'cn-print', name: 'China visa · 33 × 48 mm print', mm: [33, 48], head: [28 / 48, 33 / 48], headCenter: 0.40, backgrounds: ['white', 'cream'],
    notice: 'Print layout only. Use a near-white background and leave 3–5 mm between the crown and the top edge.',
    guide: 'https://bio.visaforchina.cn/KUL3_EN/upload/20231123/4b89d0c364d44f778f85d6fd76d93475.pdf',
  },
  {
    id: 'custom', name: 'Custom dimensions', mm: [35, 45], head: [0.65, 0.75],
    digital: {}, backgrounds: ['white', 'cream', 'blue'],
  },
];

export const printDimensions = preset => preset.mm?.map(mmToPixels);
export const digitalDimensions = preset => !preset.digital || preset.digital.minPixels
  ? undefined
  : preset.digital.pixels ?? printDimensions(preset);
export const previewDimensions = preset => digitalDimensions(preset) ?? printDimensions(preset);

export const sheets = {
  '4x6': { mm: [101.6, 152.4], pixels: [1200, 1800] },
  a4: { mm: [210, 297], pixels: [2480, 3508] },
};

export const targetHead = preset => (preset.head[0] + preset.head[1]) / 2;
export const headCenter = preset => preset.headCenter ?? 0.48;

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
