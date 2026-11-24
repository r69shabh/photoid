# PhotoID

PhotoID makes passport and visa photos in the browser. Photos and camera frames are processed on the device. There is no API server or analytics. MediaPipe fetches its WASM and model assets on demand; a connection is needed for uncached models and Gumroad activation, but manual cropping and exports don't depend on the models.

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
2. Deploy `dist/` as static files. The included workflow uses the `/photoid/` GitHub Pages project path and requires **Settings → Pages → Source → GitHub Actions**. Review GitHub Pages' usage limits before using it commercially. The Pages workflow defaults to the project URL; override it with the `VITE_SITE_URL` repository Actions variable set to the full PhotoID URL, including `/photoid/`. Outside the workflow, set the same environment variable before `npm run build`; leaving it unset omits the absolute social image tag.
3. Verify purchasing and activating a real key before announcing launch. Successful activation is cached locally for convenience; the static code is not a tamper-proof entitlement system and does not recheck refunds once a browser has activated.

Formatting guides are starting points, not declarations of compliance; the application authority’s current requirements take precedence. Use the original background if digital edits are prohibited. Print at actual size and measure the result.
