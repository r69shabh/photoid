import { guides, homeFaq } from './seo-content.js';

const escapeHtml = value => value.replace(/[&<>"']/g, character => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[character]);

const jsonLd = data => JSON.stringify(data).replaceAll('<', '\\u003c');
const tag = (tag, attrs, children) => ({ tag, attrs, children, injectTo: 'head' });
const schema = data => tag('script', { type: 'application/ld+json' }, jsonLd(data));
const meta = (key, name, content) => tag('meta', { [key]: name, content: escapeHtml(content) });
const canonical = url => tag('link', { rel: 'canonical', href: escapeHtml(url) });
const imageAlt = 'PhotoID passport photos at home, with digital JPGs and print sheets';

const faqSchema = items => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: items.map(([name, text]) => ({
    '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text },
  })),
});

const questions = items => items.map(([question, answer]) =>
  `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`
).join('\n');

const guideLinks = (prefix, current) => guides.filter(guide => guide !== current).map(({ slug, label }) =>
  `<li><a href="${prefix}${slug}/">${escapeHtml(label)}</a></li>`
).join('\n');

function socialTags(url, site) {
  const image = new URL('og.png', site).href;
  return [
    canonical(url),
    meta('property', 'og:url', url),
    meta('property', 'og:image', image),
    meta('property', 'og:image:width', '1200'),
    meta('property', 'og:image:height', '630'),
    meta('property', 'og:image:alt', imageAlt),
    meta('name', 'twitter:image', image),
    meta('name', 'twitter:image:alt', imageAlt),
  ];
}

function renderTag({ tag, attrs, children }) {
  const start = `<${tag}${Object.entries(attrs).map(([key, value]) => ` ${key}="${value}"`).join('')}>`;
  return children === undefined ? start : `${start}${children}</${tag}>`;
}

const guideUrl = (guide, site) => new URL(`${guide.slug}/`, site).href;

function renderGuide(guide, site) {
  const { preset, title, description, facts, steps, faq, sources } = guide;
  const url = site && guideUrl(guide, site);
  const editor = preset ? `../?preset=${preset}#editor` : '../#editor';
  const fullTitle = `${title} | PhotoID`;
  const tags = [
    meta('name', 'description', description),
    meta('property', 'og:type', 'article'),
    meta('property', 'og:site_name', 'PhotoID'),
    meta('property', 'og:title', fullTitle),
    meta('property', 'og:description', description),
    meta('name', 'twitter:card', 'summary_large_image'),
    meta('name', 'twitter:title', fullTitle),
    meta('name', 'twitter:description', description),
    ...(url ? [
      ...socialTags(url, site),
      schema({
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: title,
        description,
        url,
        mainEntityOfPage: url,
        author: { '@type': 'Organization', name: 'PhotoID', url: site.href },
      }),
      schema(faqSchema(faq)),
    ] : []),
  ];
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#f6f7f0">
  <title>${escapeHtml(fullTitle)}</title>
  ${tags.map(renderTag).join('\n  ')}
  <link rel="icon" href="../mark.svg" type="image/svg+xml">
  <link rel="stylesheet" href="../guide.css">
</head>
<body>
  <header class="shell">
    <a class="brand" href="../"><img src="../mark.svg" alt="" width="35" height="35">PhotoID</a>
    <a href="../#guides">All photo guides</a>
  </header>
  <main class="shell">
    <article>
      <h1>${escapeHtml(title)}</h1>
      <p class="intro">${escapeHtml(description)}</p>
      <a class="button" href="${editor}">Open the PhotoID editor</a>
      <h2>Photo specifications</h2>
      <dl>${facts.map(([name, value]) => `<dt>${escapeHtml(name)}</dt><dd>${escapeHtml(value)}</dd>`).join('\n')}</dl>
      <h2>How to use PhotoID</h2>
      <ol>${steps.map(step => `<li>${escapeHtml(step)}</li>`).join('\n')}</ol>
      <h2>Frequently asked questions</h2>
      ${questions(faq)}
      <h2>Official guidance</h2>
      <ul>${sources.map(([label, href]) => `<li><a href="${escapeHtml(href)}">${escapeHtml(label)}</a></li>`).join('\n')}</ul>
    </article>
    <nav aria-labelledby="related">
      <h2 id="related">More photo guides</h2>
      <ul>${guideLinks('../', guide)}</ul>
    </nav>
  </main>
  <footer class="shell"><p>PhotoID is independent and not affiliated with any government.</p></footer>
</body>
</html>
`;
}

export function seoPages({ base, site, application, google, bing }) {
  return {
    name: 'photoid-site-metadata',
    transformIndexHtml(html) {
      return {
        html: html
          .replace('<!-- photoid-guide-links -->', guideLinks('./'))
          .replace('<!-- photoid-home-faq -->', questions(homeFaq)),
        tags: [
          ...(site ? [...socialTags(site.href, site), schema(application), schema(faqSchema(homeFaq))] : []),
          ...(google ? [meta('name', 'google-site-verification', google)] : []),
          ...(bing ? [meta('name', 'msvalidate.01', bing)] : []),
        ],
      };
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url.split('?')[0];
        const guide = guides.find(({ slug }) => path === `${base}${slug}/`);
        if (!guide) return next();
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(renderGuide(guide, site));
      });
    },
    generateBundle() {
      for (const guide of guides) {
        this.emitFile({ type: 'asset', fileName: `${guide.slug}/index.html`, source: renderGuide(guide, site) });
      }
      if (!site) return;
      const sitemap = new URL('sitemap.xml', site).href;
      const urls = [site.href, ...guides.map(guide => guideUrl(guide, site))];
      this.emitFile({
        type: 'asset',
        fileName: 'robots.txt',
        source: `User-agent: *\nAllow: /\nSitemap: ${sitemap}\n`,
      });
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(url => `  <url><loc>${escapeHtml(url)}</loc></url>`).join('\n')}\n</urlset>\n`,
      });
    },
  };
}
