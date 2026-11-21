# Local verification

Verified on 2026-11-21 using Wrangler 4.166.0, invoked as:

```sh
bash cloudflare/prepare.sh
npx --yes wrangler@4 dev --ip 127.0.0.1 --port 8787
node seo/verify.mjs
```

The initial routing probe used only a temporary root marker and two 200 rewrites, before implementing content. Root served the marker and the requested game routes served the original game shell, all with 200.

Final results: 48 successful shell/page checks, repeating these 24 URLs with ordinary curl and `Sec-Fetch-Mode: navigate`. The verifier compares each response body with its expected file, not just its title.

| URL | Status | HTML served |
| --- | --- | --- |
| `/` | 200 | Generated landing |
| `/play` | 200 | Original game index |
| `/auth/callback?code=seo-test` | 200 | Original game index |
| `/join/CODE` | 200 | Original game index |
| `/i/CODE` | 200 | Original game index |
| `/daily` | 200 | Original game index |
| `/d/2026-11-21` | 200 | Original game index |
| `/blitz` | 200 | Original game index |
| `/quick/test` | 200 | Original game index |
| `/quick` | 200 | Original game index |
| `/settings` | 200 | Original game index |
| `/account` | 200 | Original game index |
| `/online` | 200 | Original game index |
| `/unknown-seo-test` | 200 | Original game index |
| `/index.html` | 200 | Original game index |
| `/?source=pwa` | 200 | Generated landing; app manifest change documented |
| `/erotiseis/istoria/` | 200 | Generated Ιστορία |
| `/erotiseis/geografia/` | 200 | Generated Γεωγραφία |
| `/erotiseis/athlitika/` | 200 | Generated Αθλητικά |
| `/erotiseis/tainies/` | 200 | Generated Ταινίες |
| `/erotiseis/epistimi/` | 200 | Generated Επιστήμη |
| `/erotiseis/mythologia/` | 200 | Generated Μυθολογία |
| `/pos-paizetai/` | 200 | Generated how-to |
| `/syxnes-erotiseis/` | 200 | Generated FAQ |

Other verified checks:

- 108 sample questions, exactly 18 per category, answers in native details/summary elements.
- JSON.parse of every JSON-LD block, breadcrumb presence, FAQ structured answers matching visible text.
- Greek lang, one H1 per page, canonical URLs, external executable scripts, no inline styles or event handlers.
- Every local href/src in the generated pages returns 200, including legal pages, images, CSS, platform JS and /play.
- Root, game and category responses retain enforced CSP and no-cache; hashed SEO assets receive immutable one-year caching.
- Robots permits all crawling and points to the generated sitemap. Sitemap includes all nine SEO pages.
- Node syntax checks, shell syntax checks and git diff whitespace checks pass.
- No generated game files were modified. No bank files, secrets or generated distribution directories were staged.

Sizes for this build:

| Output | Bytes |
| --- | ---: |
| Nine HTML pages | 82,911 |
| Compressed hero JPEG (960 x 504) | 83,294 |
| Entire SEO distribution | 171,412 |
| Sum of individually gzipped SEO files | 108,408 |

The gzip figure is a local estimate, not a measured Cloudflare transfer size. Reused game assets and remotely served fonts are excluded from the added SEO distribution size.

Limits: these checks prove HTTP routing and static content. They do not execute the compiled Kotlin app, exercise real OAuth, test existing PWA installations or run Lighthouse. Follow APP_CHANGES.md in the current app source before release, especially home routing, installed start URL and service-worker navigation caching. No deployment was run.
