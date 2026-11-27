import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build, createServer } from 'vite';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const publicUrl = 'https://r69shabh.github.io/photoid/';
const verification = ['VITE_GOOGLE_SITE_VERIFICATION', 'VITE_BING_SITE_VERIFICATION'];

function verificationEnv(google, bing) {
  const previous = verification.map(key => process.env[key]);
  [google, bing].forEach((value, index) => { process.env[verification[index]] = value; });
  return () => verification.forEach((key, index) => {
    if (previous[index] === undefined) delete process.env[key];
    else process.env[key] = previous[index];
  });
}

test('URL-dependent metadata is omitted until the public PhotoID URL is configured', async () => {
  const previous = process.env.VITE_SITE_URL;
  const restoreVerification = verificationEnv('', '');
  try {
    for (const [siteUrl, expectedImage] of [
      ['', null],
      ['https://photos.example/photoid', 'https://photos.example/photoid/og.png'],
    ]) {
      process.env.VITE_SITE_URL = siteUrl;
      const server = await createServer({ server: { middlewareMode: true, watch: null, ws: false } });
      try {
        const output = await server.transformIndexHtml('/index.html', html);
        assert.equal(server.config.base, '/photoid/');
        const image = output.match(/<meta property="og:image" content="([^"]+)"[^>]*>/)?.[1] ?? null;
        assert.equal(image, expectedImage);
        const canonical = output.match(/<link rel="canonical" href="([^"]+)"[^>]*>/)?.[1] ?? null;
        assert.equal(canonical, siteUrl ? siteUrl + '/' : null);
        assert.match(output, /<meta name="google-site-verification" content="mnigM1COSWrqxQG5yYZ5Kj1iodg6heR5xX-OeBJxucM">/);
        assert.doesNotMatch(output, /msvalidate\.01/);
      } finally {
        await server.close();
      }
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_SITE_URL;
    else process.env.VITE_SITE_URL = previous;
    restoreVerification();
  }
});

test('the Pages build publishes the canonical URL, offers, social card, and crawl files', async () => {
  const previous = process.env.VITE_SITE_URL;
  const restoreVerification = verificationEnv(' google-test-token ', 'bing-test-token');
  process.env.VITE_SITE_URL = publicUrl;
  try {
    const { output } = await build({ build: { write: false }, logLevel: 'silent' });
    const asset = name => output.find(file => file.fileName === name)?.source;
    const page = asset('index.html');
    assert.ok(page.includes(`<meta property="og:url" content="${publicUrl}">`));
    assert.ok(page.includes(`<meta name="twitter:image" content="${publicUrl}og.png">`));
    const data = JSON.parse(page.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(data['@type'], 'SoftwareApplication');
    assert.equal(data.url, publicUrl);
    assert.deepEqual(data.offers.map(({ price, priceCurrency, url }) => [price, priceCurrency, url]), [
      ['0', 'INR', publicUrl],
      ['99', 'INR', 'https://rishabhgusain.gumroad.com/l/gvbxs'],
    ]);
    assert.match(asset('robots.txt'), /^Sitemap: https:\/\/r69shabh\.github\.io\/photoid\/sitemap\.xml$/m);
    assert.ok(asset('sitemap.xml').includes(`<loc>${publicUrl}</loc>`));
    assert.match(page, /<meta name="google-site-verification" content="google-test-token">/);
    assert.match(page, /<meta name="msvalidate\.01" content="bing-test-token">/);

    const entries = [
      ['us-passport-photo-2x2', 'us', /25–35 mm/],
      ['uk-passport-photo-size', 'uk', /29–34 mm/],
      ['schengen-visa-photo-size', 'eu', /70–80%/],
      ['india-passport-photo-size', 'in', /630 × 810 pixel/],
      ['oci-photo-requirements', 'oci', /200 × 200 to 900 × 900 pixels/],
      ['print-passport-photos-4x6', null, /1200 × 1800 pixels/],
    ];
    const guidePages = [];
    for (const [slug, preset, fact] of entries) {
      const guide = asset(`${slug}/index.html`);
      const url = `${publicUrl}${slug}/`;
      assert.ok(page.includes(`href="./${slug}/"`));
      assert.ok(guide.includes(`<link rel="canonical" href="${url}">`));
      assert.ok(guide.includes(`<meta property="og:url" content="${url}">`));
      assert.match(guide, /<meta name="twitter:title" content="[^"]+">/);
      assert.match(guide, /<meta name="description" content="[^"]+">/);
      assert.match(guide, fact);
      assert.ok(guide.includes(`href="../${preset ? `?preset=${preset}` : ''}#editor"`));
      assert.doesNotMatch(guide, /<script\b(?! type="application\/ld\+json")|google-site-verification|msvalidate\.01/);
      guidePages.push(guide);
    }
    assert.deepEqual([...asset('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]), [
      publicUrl, ...entries.map(([slug]) => `${publicUrl}${slug}/`),
    ]);
    const pages = [page, ...guidePages];
    assert.equal(new Set(pages.map(html => html.match(/<title>([^<]+)<\/title>/)[1])).size, pages.length);
    for (const html of pages) {
      const structuredData = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
        .map(match => JSON.parse(match[1]));
      const faq = structuredData.find(data => data['@type'] === 'FAQPage');
      assert.deepEqual(faq.mainEntity.map(item => [item.name, item.acceptedAnswer.text]),
        [...html.matchAll(/<summary>([^<]+)<\/summary><p>([^<]+)<\/p>/g)].map(match => match.slice(1)));
      assert.ok(faq.mainEntity.length >= 2);
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_SITE_URL;
    else process.env.VITE_SITE_URL = previous;
    restoreVerification();
  }
});
