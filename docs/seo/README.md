# Greek static SEO layer

The hosting bundle stays untouched. `seo/build.mjs` generates nine Greek HTML pages and small shared assets in ignored `seo/dist/`. `cloudflare/prepare.sh` copies the game to ignored `.cf-dist/`, overlays the SEO output and copies the existing security headers. `deploy-cloudflare.sh` calls this preparation before its existing deploy command. Do not run that deployment script for a preview.

## Regenerate and preview

```sh
node seo/build.mjs
# Optional alternate question-bank directory, absolute or relative to cwd:
SEO_QUESTIONS_DIR=/path/to/composeResources/files bash cloudflare/prepare.sh
# Or use the default local bank directory:
bash cloudflare/prepare.sh
npx --yes wrangler@4 dev --ip 127.0.0.1 --port 8787
# In another terminal:
node seo/verify.mjs
```

Default banks: `../../hybrid/TriviaQuiz/composeApp/src/commonMain/composeResources/files`, resolved relative to this repository. Six explicit files are read locally, validated and sampled deterministically: the first 18 unique question texts per category. Only the selected question text and correct answer appear in public HTML. Missing or invalid banks fail the build instead of publishing invented content. No full bank is copied into the SEO output. The existing game distribution retains its own bundled resources.

Generated routes:

- `/`
- `/erotiseis/istoria/`
- `/erotiseis/geografia/`
- `/erotiseis/athlitika/`
- `/erotiseis/tainies/`
- `/erotiseis/epistimi/`
- `/erotiseis/mythologia/`
- `/pos-paizetai/`
- `/syxnes-erotiseis/`

## Routing design and evidence

Cloudflare `_redirects` supports static 200 rewrites: [official documentation](https://developers.cloudflare.com/workers/static-assets/redirects/). A root-only rewrite serves `/seo-home.html`. Explicit rewrites serve the category/help directory index files, since `html_handling` remains `none`. `/play` rewrites to the original `/index.html`. Existing `single-page-application` fallback still serves that original game index for every unmatched path, including nested deep links. URLs and query strings are preserved. There is no catch-all rewrite that could intercept game assets, and no Worker script or paid feature is introduced.

Before building the content, a temporary root marker and `/play` rewrite were tested with `npx --yes wrangler@4 dev` and curl: root returned the marker, while all requested game routes returned the game shell with 200. The final repeatable check is `node seo/verify.mjs`: it uses curl both with and without `Sec-Fetch-Mode: navigate`, compares game HTML byte for byte with `kserolas/index.html`, and compares SEO responses with their generated files. See `VERIFICATION.md` for final results. It validates shell delivery, not compiled game interactions.

## Content and styling

`seo/build.mjs` owns category metadata, Greek introductions, modes, shared layout and FAQ copy. Edit its data and templates, then regenerate. To add a page, call `page()` before the sitemap/redirect generation. Its route, rewrite, sitemap entry and verification are derived automatically. To add a category, add a tuple to `categories` and a matching bank with `category`, `questions`, `question`, `choices`, and `correct_answer`. Update the verification's expected sample count if category counts change.

`seo/site.css` reuses the shell's teal `#14B8C8`, ink `#15123A`, spark `#FF6B3D`, gold `#FFC53D`, background `#F4FBFC`, and Commissioner/Inter typography. All style and executable script content is external. JSON-LD is an inert `application/ld+json` data block, parsed by the verification script; it is not executable code and does not require unsafe-inline permission. Existing CSP rules remain unchanged. No framework, ads, game bundle or Wasm is loaded by SEO pages.

`seo/platform.js` uses the shell's Android/iOS/iPad platform detection. Google Play is hidden unless Android is detected; iOS gets an installation hint. With JavaScript disabled, web play and all questions remain available. Only the landing loads this script.

`seo/assets/game-preview.jpg` is a compressed 960 x 504 derivative of the existing `kserolas/og-image.png`, not a fabricated screenshot. The hero has explicit dimensions and loads eagerly because it is above the fold; there are no below-the-fold content images to lazy-load. Asset filenames contain content hashes and receive immutable one-year caching. All generated HTML receives no-cache. The SEO asset rule detaches the earlier overlapping cache value before setting immutable caching, as required by [Cloudflare header matching](https://developers.cloudflare.com/workers/static-assets/headers/). Existing game cache rules and enforced security headers are retained.

To refresh the image on macOS:

```sh
sips -s format jpeg -s formatOptions 78 -Z 960 kserolas/og-image.png --out seo/assets/game-preview.jpg
node seo/build.mjs
```

Equivalent JPEG export tools can be used on other platforms. The generator itself needs only Node, with no dependencies or network access. Fonts use the shell's existing Google Fonts service with swap and system fallbacks.

`pages.json` is a small generated build inventory, not a question bank. `sitemap.xml` replaces the game distribution's sitemap in the prepared output and lists all nine canonical SEO pages. `robots.txt` allows crawling and points to it. No invented modification dates are emitted. Legal links keep pointing to the existing `/legal/privacy.html` and `/legal/terms.html`.

## App integration before release

Read [APP_CHANGES.md](APP_CHANGES.md) for exact shell, PWA and service-worker changes needed in the app repository. The hosting HTTP routing is verified independently; current production Kotlin home handling is not available in the local question-source checkout. No app-source or bundle files were changed here.

## Google Search Console owner checklist

1. Add the Domain property `xerolasgame.gr` in Google Search Console.
2. Copy Google's verification TXT value into Cloudflare DNS for the root domain (`@`), then click Verify in Search Console. DNS TXT records have no proxy setting. Keep the verification record.
3. After the owner releases the site, submit `https://xerolasgame.gr/sitemap.xml` under Sitemaps.
4. Inspect `/` and one category URL. Run the live URL test, check the rendered page and Google-selected canonical, then request indexing.
5. Check Page Indexing and Core Web Vitals after Google has collected data. Validate FAQ syntax using Google's Rich Results Test; valid markup does not guarantee a FAQ rich result for a game site.

No DNS changes, Search Console submissions, push or deployment are performed by this build.
