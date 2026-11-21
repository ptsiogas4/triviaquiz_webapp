#!/usr/bin/env bash
# Deploy kserolas/ to Cloudflare (Workers static assets, project "xerolas"). Requires `npx wrangler login` once.
# Free plan: static asset requests are free and unlimited. No Worker script, no paid features.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf .cf-dist && mkdir .cf-dist
cp -R kserolas/. .cf-dist/
find .cf-dist -name '*.map' -delete
find .cf-dist -name '*.LICENSE.txt' -delete
cp cloudflare/_headers .cf-dist/
# SPA fallback is handled by not_found_handling in wrangler.jsonc.
npx --yes wrangler@4 deploy
rm -rf .cf-dist
