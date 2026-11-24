import { defineConfig, loadEnv } from 'vite';
import { GUMROAD_URL } from './src/config.js';

const imageAlt = 'PhotoID passport photos at home, with digital JPGs and print sheets';

export default defineConfig(({ mode }) => {
  const siteUrl = loadEnv(mode, process.cwd()).VITE_SITE_URL?.trim();
  if (!siteUrl) return { base: '/photoid/' };

  const url = new URL(siteUrl);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_SITE_URL must be the public HTTP(S) URL of the app, without credentials, a query, or a fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  const site = url.href;
  const image = new URL('og.png', url).href;
  const sitemap = new URL('sitemap.xml', url).href;
  const escapeAmpersands = value => value.replaceAll('&', '&amp;');
  const application = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'PhotoID',
    applicationCategory: 'MultimediaApplication',
    operatingSystem: 'Web',
    url: site,
    offers: [
      { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'INR', url: site },
      { '@type': 'Offer', name: 'Pro (lifetime)', price: '99', priceCurrency: 'INR', url: GUMROAD_URL },
    ],
  };

  return {
    base: '/photoid/',
    plugins: [{
      name: 'photoid-site-metadata',
      transformIndexHtml() {
        const meta = (key, name, content) => ({
          tag: 'meta', attrs: { [key]: name, content }, injectTo: 'head',
        });
        return [
          { tag: 'link', attrs: { rel: 'canonical', href: escapeAmpersands(site) }, injectTo: 'head' },
          meta('property', 'og:url', escapeAmpersands(site)),
          meta('property', 'og:image', escapeAmpersands(image)),
          meta('property', 'og:image:width', '1200'),
          meta('property', 'og:image:height', '630'),
          meta('property', 'og:image:alt', imageAlt),
          meta('name', 'twitter:image', escapeAmpersands(image)),
          meta('name', 'twitter:image:alt', imageAlt),
          {
            tag: 'script',
            attrs: { type: 'application/ld+json' },
            children: JSON.stringify(application),
            injectTo: 'head',
          },
        ];
      },
      generateBundle() {
        this.emitFile({
          type: 'asset',
          fileName: 'robots.txt',
          source: `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`,
        });
        this.emitFile({
          type: 'asset',
          fileName: 'sitemap.xml',
          source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${escapeAmpersands(site)}</loc></url>\n</urlset>\n`,
        });
      },
    }],
  };
});
