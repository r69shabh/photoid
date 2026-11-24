import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, process.cwd()).VITE_SITE_URL?.trim();
  if (!siteUrl) return { base: '/photoid/' };

  const url = new URL(siteUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_SITE_URL must be the public HTTP(S) URL of the app, without credentials, a query, or a fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';

  return {
    base: '/photoid/',
    plugins: [{
      name: 'photoid-site-metadata',
      transformIndexHtml() {
        return [{
          tag: 'meta',
          attrs: { property: 'og:image', content: new URL('og.png', url).href.replaceAll('&', '&amp;') },
          injectTo: 'head',
        }];
      },
    }],
  };
});
