import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'vite';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');

test('site metadata is omitted until the public PhotoID URL is configured', async () => {
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
      } finally {
        await server.close();
      }
    }
  } finally {
    if (previous === undefined) delete process.env.VITE_SITE_URL;
    else process.env.VITE_SITE_URL = previous;
  }
});
