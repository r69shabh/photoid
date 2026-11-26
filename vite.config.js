import { defineConfig, loadEnv } from 'vite';
import { GUMROAD_URL } from './src/config.js';
import { seoPages } from './seo-pages.js';

const base = '/photoid/';

function publicUrl(value) {
  if (!value) return;
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) {
    throw new Error('VITE_SITE_URL must be the public HTTP(S) URL of the app, without credentials, a query, or a fragment.');
  }
  if (!url.pathname.endsWith('/')) url.pathname += '/';
  return url;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());
  const site = publicUrl(env.VITE_SITE_URL?.trim());
  return {
    base,
    plugins: [seoPages({
      base,
      site,
      google: env.VITE_GOOGLE_SITE_VERIFICATION?.trim(),
      bing: env.VITE_BING_SITE_VERIFICATION?.trim(),
      application: site && {
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        additionalType: 'https://schema.org/WebApplication',
        name: 'PhotoID',
        applicationCategory: 'MultimediaApplication',
        operatingSystem: 'Web',
        url: site.href,
        offers: [
          { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'INR', url: site.href },
          { '@type': 'Offer', name: 'Pro (lifetime)', price: '99', priceCurrency: 'INR', url: GUMROAD_URL },
        ],
      },
    })],
  };
});
