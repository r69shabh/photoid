# PhotoID

PhotoID makes passport and visa photos in the browser. Photos and camera frames are processed on the device. There is no API server or analytics. Automatic framing and background replacement fetch their runtimes and models on demand. Detailed background replacement uses MediaPipe to find the person and Apache-2.0 MODNet in a Web Worker to refine their outline. MODNet weights are cached when browser storage is available. If detailed matting is unavailable, the editor can use the MediaPipe mask alone. Manual cropping and exports don't depend on the models.

See [third-party notices](public/third-party-notices.txt) for bundled dependencies.

## Run locally

```sh
npm ci
npm run dev
npm test
npm run build
```

Open `/photoid/` on the URL Vite prints. For an end-to-end test, run `npm run preview` with a built app and set `CHROME_BIN` to your Chrome executable and `PHOTOID_SAMPLE` to a local portrait. The test uses [Pete Souza’s public-domain portrait of Barack Obama](https://commons.wikimedia.org/wiki/File:President_Barack_Obama.jpg). Screenshots, when requested, are saved to `PHOTOID_EVIDENCE` (an existing directory).

## Launch setup

1. Publish the Gumroad listing with license keys enabled. Set the price to match the site, then set both the checkout URL and Gumroad product ID in `src/config.js`. These are public identifiers, not secrets. The placeholder configuration does not unlock Pro.
2. Deploy `dist/` as static files. The included workflow uses the `/photoid/` GitHub Pages project path and requires **Settings → Pages → Source → GitHub Actions**. Review GitHub Pages' usage limits before using it commercially. The Pages workflow defaults to the project URL; override it with the `VITE_SITE_URL` repository Actions variable set to the full PhotoID URL, including `/photoid/`. Outside the workflow, set the same environment variable before `npm run build` to generate canonical and social URLs, structured data, `robots.txt` and `sitemap.xml` for that site. On a GitHub Pages project path, discovery of `robots.txt` by crawlers requires the shared domain root; submit the project sitemap URL directly instead.
3. Verify purchasing and activating a real key before announcing launch. Successful activation is cached locally for convenience; the static code is not a tamper-proof entitlement system and does not recheck refunds once a browser has activated.

Formatting guides are starting points, not declarations of compliance; the application authority’s current requirements take precedence. Use the original background if digital edits are prohibited. Print at actual size and measure the result.

## Verify ownership and submit the sitemap (free)

Only a site owner with access to the repository and webmaster accounts can complete verification. No paid tools, DNS changes, analytics, or GitHub Pages root access are needed.

1. After merging, sign in to [Google Search Console](https://search.google.com/search-console/). Choose **Add property → URL prefix**, enter `https://r69shabh.github.io/photoid/` (including the final slash), and select **HTML tag**. Copy just the `content` value from `google-site-verification`, not the whole tag.
2. In the GitHub repository go to **Settings → Secrets and variables → Actions → Variables → New repository variable**. Name it `VITE_GOOGLE_SITE_VERIFICATION` and paste that value. If you prefer manual Bing verification instead of importing from Google, add the same project URL in [Bing Webmaster Tools](https://www.bing.com/webmasters/), choose **HTML Meta Tag**, and save the `msvalidate.01` content value as another Actions variable, `VITE_BING_SITE_VERIFICATION`.
3. In **Actions → Deploy PhotoID → Run workflow**, choose `main` and wait for the Pages deploy to succeed. An Actions variable change does not deploy the site by itself. Confirm the tag(s) are in the live homepage’s HTML source, click **Verify** in the corresponding console(s) and keep the variables set after verification.
4. In the verified Google property, open **Sitemaps** and submit `sitemap.xml` (`https://r69shabh.github.io/photoid/sitemap.xml`). Optionally inspect the home page and priority guides in **URL inspection → Request indexing**. Then add PhotoID to Bing via **Import from Google Search Console** (no second token required) if you didn’t verify manually. Check Bing’s **Sitemaps** report and submit the full sitemap URL if it wasn’t imported.

The project’s `/photoid/robots.txt` does not replace the host’s root `/robots.txt`. Submit the sitemap directly in both consoles; successful submission does not guarantee indexing or ranking.
