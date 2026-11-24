import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { build, createServer } from 'vite';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const publicUrl = 'https://r69shabh.github.io/photoid/';

test('URL-dependent metadata is omitted until the public PhotoID URL is configured', async () => {
  const previous = process.env.VITE_SITE_URL;
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
      } finally {
        await server.close();
      }
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_SITE_URL;
    else process.env.VITE_SITE_URL = previous;
  }
});

test('the Pages build publishes the canonical URL, offers, social card, and crawl files', async () => {
  const previous = process.env.VITE_SITE_URL;
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
  } finally {
    if (previous === undefined) delete process.env.VITE_SITE_URL;
    else process.env.VITE_SITE_URL = previous;
  }
});
