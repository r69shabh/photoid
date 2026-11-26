export const homeFaq = [
  ['What passport and visa photo sizes can I make?', 'Digital JPGs and print layouts have different requirements. The editor shows the supported downloads and official guidance when you choose a format. For online UK passport applications it can save an eligible original JPG unchanged. PhotoID does not produce Canadian passport photos. Free India passport and US crop exports are watermarked; Pro removes the watermark from supported exports.'],
  ['Where does my photo go?', 'Nowhere. Your browser handles the photo, camera, crop, background and exports. Automatic framing and background removal download models, not your image. Gumroad only receives the key when you activate Pro.'],
  ['Will my application accept the photo?', 'PhotoID does not certify eligibility. Check the official requirements beside your format before editing, printing or buying. Some applications only accept originals or studio photos. Do not submit a watermarked preview or use a custom crop to bypass those requirements.'],
  ['How do I print at the right size?', 'Pick the paper size in PhotoID and in your print dialog, then choose Actual size or 100%. Turn off “Fit to page.” Measure one cut rectangle before printing further copies.'],
  ['How do I unlock Pro?', 'Buy once on Gumroad. Paste the license key from your receipt above; activation is stored in this browser. On a new browser or after clearing site data, enter the same key again.'],
];

const usPassport = 'https://travel.state.gov/en/passports/apply/help/photos.html';
const ukPrint = 'https://www.gov.uk/photos-for-passports/photo-requirements';

export const guides = [
  {
    slug: 'us-passport-photo-2x2',
    preset: 'us',
    label: 'US passport photo · 2 × 2 in',
    title: 'US Passport Photo 2×2: Size, Print & Online Renewal',
    description: 'Check US passport photo dimensions, head size and paper rules. Lay out a 2×2-inch print or learn when to upload your unedited original.',
    facts: [
      ['Paper application', '2 × 2 inches (51 × 51 mm, rounded). Measure 1 to 1⅜ inches (25–35 mm) from the bottom of the chin to the top of the head.'],
      ['Original photo', 'Use a recent color photo (last six months) on a plain white or off-white background. Face the camera, keep both eyes open and remove glasses unless an exception applies. Do not retouch or replace the background.'],
      ['Online passport renewal', 'Upload your original, unedited photo to the State Department’s renewal application, not the PhotoID crop. The government’s application can reposition or crop it.'],
    ],
    steps: [
      'For a paper application, start with an unaltered photo already taken against the correct background. Open the US preset and check framing with the crown and chin guides.',
      'Keep the original background. For print layout, choose 4 × 6 in and download a Print JPG or PDF. The free US export is watermarked; do not submit a watermarked copy.',
      'Print at Actual size (100%) on matte or glossy photo-quality paper. Measure the cut photo and head before submitting.',
    ],
    faq: [
      ['Is a 600 × 600 pixel JPG a US passport photo?', 'PhotoID’s US digital crop is 600 × 600 pixels, the minimum pixel size in the State Department’s US visa digital-image guidance. It is not the correct upload workflow for US passport renewal online; use your original there.'],
      ['Can I print a 2×2 passport photo on 4×6 paper?', 'Yes, the paper is the carrier sheet. Print at 100% without Fit to page, then cut and measure a 2 × 2 inch square.'],
    ],
    sources: [
      ['US Department of State: paper passport photos', usPassport],
      ['US Department of State: online renewal uploads', 'https://travel.state.gov/en/passports/renew-replace/online/upload-digital-photo.html'],
      ['US Department of State: visa digital image requirements', 'https://travel.state.gov/content/travel/en/us-visas/visa-information-resources/photos/digital-image-requirements.html'],
    ],
  },
  {
    slug: 'uk-passport-photo-size',
    preset: 'uk',
    label: 'UK passport photo · digital or 35 × 45 mm',
    title: 'UK Passport Photo Size: Digital Pixels & 35×45 mm Print',
    description: 'Compare UK passport photo sizes: an unedited digital photo of at least 600×750 pixels online, or a 35×45 mm photo for paper applications.',
    facts: [
      ['Digital application', 'At least 600 × 750 pixels and 50 KB to 10 MB. Use an unaltered photo against a plain light-coloured background. If you take it yourself, include your head, shoulders and upper body so the application can crop it.'],
      ['Paper application', 'Two identical 35 × 45 mm photos. Crown to chin must be 29–34 mm, against plain cream or light grey. Use borderless white photographic paper and professional-standard printing.'],
      ['Pose and lighting', 'Look straight at the camera with a neutral expression, mouth closed and eyes visible. Retake the photo if there are shadows or the background is unsuitable.'],
    ],
    steps: [
      'For an online application, open the UK preset and choose Save Original JPG if starting with an eligible JPG. This saves your file unchanged; the editor preview crop is for printing only.',
      'For a paper application, use a correctly lit original and check the guides for the 35 × 45 mm print layout. UK print downloads require Pro.',
      'Use a professional-quality print at 100%, cut two photos and measure them before applying.',
    ],
    faq: [
      ['Should I crop my UK digital passport photo to 35 × 45 mm?', 'No. 35 × 45 mm is for paper photos. For online applications do not crop your own photo; the application handles the crop.'],
      ['Is a 2 × 2 inch photo the right size for a UK passport?', 'No. Use 35 × 45 mm for a paper application or follow the separate digital requirements when applying online.'],
    ],
    sources: [
      ['GOV.UK: digital passport photos', 'https://www.gov.uk/photos-for-passports'],
      ['GOV.UK: printed passport photos', ukPrint],
    ],
  },
  {
    slug: 'schengen-visa-photo-size',
    preset: 'eu',
    label: 'Schengen visa photo · 35 × 45 mm print',
    title: 'Schengen Visa Photo Size: 35×45 mm Print Guide',
    description: 'Check whether your Schengen visa office wants a 35×45 mm photo, how much of the frame your face should fill, and which background to use.',
    facts: [
      ['Printed size', '35 × 45 mm is used by some Schengen visa offices. For example, the German Embassy in Dhaka specifies this size, a white background and 70–80% face coverage for its tourist visa checklist.'],
      ['Face and background', 'France-Visas specifies a recent (at most six months old), straight-on photo with 70–80% face coverage and an even, plain light-coloured background. Follow your own office for the exact background shade and paper requirements.'],
      ['Digital submission', 'This PhotoID preset makes a print layout only. Use the pixel dimensions and file format from your application portal if it asks for an upload.'],
    ],
    steps: [
      'Find the photo instructions from the consulate handling your application. If it asks for a 35 × 45 mm print and allows a print you prepare, take a new photo against the required background.',
      'Open the Schengen preset, use the guides to check framing and export a print sheet with Pro. Keep your original background so the photo shows natural edges and skin tone.',
      'Print at Actual size on photo-quality paper, using a print service if your office requires higher-resolution or professional printing. Measure the cut photo before your appointment.',
    ],
    faq: [
      ['Is the background always white for a Schengen visa photo?', 'No. Some offices specify white, while others specify a plain light-coloured background. Use the colour in your own application checklist.'],
      ['Are Schengen and UK passport photos interchangeable?', 'Not necessarily. Even when both prints are 35 × 45 mm, face framing, background shade and submission rules may differ.'],
    ],
    sources: [
      ['European Commission: applying for a Schengen visa', 'https://home-affairs.ec.europa.eu/policies/schengen/schengen-visas/applying-schengen-visa_en'],
      ['France-Visas: photograph instructions (PDF)', 'https://www.france-visas.gouv.fr/documents/d/france-visas/iso_iec_fv_visa_photograph_requirements_en'],
      ['German Embassy in Dhaka: tourist visa checklist (PDF)', 'https://dhaka.diplo.de/resource/blob/2691324/95ea03064452d139100eb2a188e819d7/p-06-2026-vfs-requirements-for-tourist-visa-data.pdf'],
    ],
  },
  {
    slug: 'india-passport-photo-size',
    preset: 'in',
    label: 'India passport photo · 630 × 810 px upload',
    title: 'India Passport Photo Size: 630×810 px & 35×45 mm',
    description: 'Check Passport Seva’s 630×810 pixel photo guidance, face coverage and white background rules, plus 35×45 mm prints where requested.',
    facts: [
      ['Digital upload', 'Passport Seva’s published photo guidance specifies a 630 × 810 pixel colour photo, with the face occupying 80–85% of the photo.'],
      ['Printed photo', 'Some overseas missions ask for 35 × 45 mm prints. Check the mission or appointment checklist before printing: not every passport process asks applicants to supply a photo.'],
      ['Background and pose', 'Take the photo against white with even lighting, looking straight at the camera. Keep the face and upper shoulders visible. Passport Seva asks for a photo unaltered by computer software.'],
    ],
    steps: [
      'Check whether your application asks for an upload, prints or an in-person capture. If it requires an unaltered file, capture the photo to the stated specifications and use the original rather than an edited export.',
      'Open the India passport preset to check 630 × 810 pixel framing. Keep your real white background; retake the photo if there are shadows or the background is wrong.',
      'If your mission allows a print you prepare, use the preset’s 35 × 45 mm print layout. The editor’s free India exports are watermarked and for preview, not submission.',
    ],
    faq: [
      ['Is the Indian passport photo the same as the OCI photo?', 'No. The Passport Seva guidance describes a rectangular photo on white. OCI generally asks for a square photo on a plain light background that is not white.'],
      ['Is 630 × 810 pixels the same size as a 35 × 45 mm print?', 'They share the same proportions, but pixels describe the upload and millimetres describe the print. Follow the specification for your submission method.'],
    ],
    sources: [
      ['Passport Seva: photograph guidelines (PDF)', 'https://mportal.passportindia.gov.in/pdf/Guidelines_for_ICAO_Compliant_Photographs_for_Passport_Applications.pdf'],
      ['High Commission of India, Kigali: passport services', 'https://www.hcikigali.gov.in/passport.php'],
    ],
  },
  {
    slug: 'oci-photo-requirements',
    preset: 'oci',
    label: 'OCI photo · square JPG up to 200 KB',
    title: 'OCI Photo Requirements: Square JPG, Size & Background',
    description: 'Prepare an OCI photo: check the 51×51 mm reference, 200–900 pixel square JPG range, 200 KB limit and non-white background rule.',
    facts: [
      ['Physical size and framing', 'The OCI portal says no smaller than 51 × 51 mm and about 80% face coverage. Show the head and shoulders from the front, with the full face centred and no border.'],
      ['Digital upload', 'A square JPG or JPEG, from 200 × 200 to 900 × 900 pixels and no more than 200 KB. Check your mission for any additional photo or signature instructions.'],
      ['Background', 'Use a plain light-coloured background that is not white. Taking the original against a suitable wall avoids visible editing around hair or shoulders.'],
    ],
    steps: [
      'Take the photo with even light, then open the OCI preset and fit the face inside the square guides.',
      'Keep your original background if it already meets your mission’s rule. Avoid background editing if your mission asks for an unaltered photo.',
      'With Pro, download the 600 × 600 Digital JPG (the preset targets the 200 KB limit). Check the saved file before uploading it to the OCI portal.',
    ],
    faq: [
      ['Does OCI accept a white photo background?', 'The official OCI portal specifies a plain light-coloured background that is not white. Do not reuse a passport photo with a white backdrop.'],
      ['Is there one required pixel size for the OCI photo?', 'No. The OCI portal accepts square images from 200 × 200 to 900 × 900 pixels and a maximum file size of 200 KB.'],
    ],
    sources: [
      ['Government of India OCI portal: photograph specifications', 'https://ociservices.gov.in/onlineOCI/faq'],
      ['Embassy of India in Paris: OCI guidelines', 'https://www.eoiparis.gov.in/page/OCI_Services_Guidelines/'],
    ],
  },
  {
    slug: 'print-passport-photos-4x6',
    label: 'Print passport photos on 4 × 6 paper',
    title: 'How to Print Passport Photos on 4×6 Paper at Actual Size',
    description: 'Make a 4×6 passport photo print sheet, turn off scaling, and measure your cut photos. Use the country’s real photo dimensions, not the paper size.',
    facts: [
      ['Paper versus photo', 'A 4 × 6 inch sheet (101.6 × 152.4 mm) holds photos for cutting. It is not the submission size. For example, US paper passport photos are 2 × 2 inches, while UK paper photos are 35 × 45 mm.'],
      ['File to send', 'PhotoID’s 4 × 6 layout is 1200 × 1800 pixels (300 pixels per inch at actual size). Use Print JPG for photo labs that take images, or Print PDF for a print dialog with an Actual size setting.'],
      ['When not to print', 'Skip this workflow for digital-only submissions, studio-only photos, or when your authority specifies print quality your provider cannot achieve. Use photo-quality paper of the required finish.'],
    ],
    steps: [
      'Choose the exact document preset, not a generic passport photo size. Adjust the framing guides to match the official instructions.',
      'Set Print paper to 4 × 6 in, then choose Print JPG or Print PDF. Do not use Digital JPG as the sheet. Do not submit a watermarked test export.',
      'Select 4 × 6 paper and Actual size or 100%; turn off Fit to page and any automatic enlargement from borderless printing. Ask a photo lab for an unscaled, uncropped print.',
      'Cut one rectangle on the guide marks and measure its width and height with a ruler. If it is off, fix the print settings before printing the rest.',
    ],
    faq: [
      ['Why did my passport photo print too small or too large?', 'The print dialog or photo lab may have resized the sheet. Choose 4 × 6 paper, disable Fit to page and photo auto-cropping, then measure a test print.'],
      ['How many passport photos fit on a 4×6 sheet?', 'It depends on each photo’s size and the spacing needed for cut marks. The editor reports how many images it placed after you download a sheet.'],
    ],
    sources: [
      ['US Department of State: size and photo-quality paper', usPassport],
      ['GOV.UK: printed passport photos', ukPrint],
    ],
  },
];
