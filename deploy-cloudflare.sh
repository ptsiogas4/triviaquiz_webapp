#!/usr/bin/env bash
# Deploy kserolas/ to Cloudflare (Workers static assets, project "xerolas"). Requires `npx wrangler login` once.
# Free plan: static asset requests are free and unlimited. No Worker script, no paid features.
set -euo pipefail
cd "$(dirname "$0")"
bash cloudflare/prepare.sh
npx --yes wrangler@4 deploy
rm -rf .cf-dist
