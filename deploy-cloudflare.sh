#!/usr/bin/env bash
# Deploy kserolas/ to Cloudflare Pages (project "xerolas"). Requires `npx wrangler login` once.
# Free plan: static asset requests are free and unlimited. No paid features are used.
set -euo pipefail
cd "$(dirname "$0")"
OUT=$(mktemp -d)
cp -R kserolas/. "$OUT/"
find "$OUT" -name '*.map' -delete
find "$OUT" -name '*.LICENSE.txt' -delete
cp cloudflare/_headers cloudflare/_redirects "$OUT/"
npx --yes wrangler@4 pages deploy "$OUT" --project-name xerolas --branch main --commit-dirty=true
rm -rf "$OUT"
