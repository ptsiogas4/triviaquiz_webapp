# Static SEO implementation plan

Use static 200 rewrites for the landing and generated category/help pages. Keep the original index.html as the SPA fallback and preserve query strings. Prove this with Wrangler before building content. No Worker runtime or generated game edits.

1. Probe root, /play and unknown routes with curl.
2. Generate nine Greek pages from six local question files, with 18 samples per category, shared CSS and optional platform JS.
3. Prepare assets in .cf-dist through a build-only script used by deployment. Keep original game files intact.
4. Verify every route, metadata, structured data, CSP and output sizes. Document required app source changes and Search Console setup.
5. Commit routing/build integration and content/verification separately. Never push or deploy.
