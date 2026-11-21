#!/usr/bin/env bash
# Build only. No network, upload or deployment.
set -euo pipefail
cd "$(dirname "$0")/.."
node seo/build.mjs
rm -rf .cf-dist
mkdir .cf-dist
cp -R kserolas/. .cf-dist/
find .cf-dist -name '*.map' -delete
find .cf-dist -name '*.LICENSE.txt' -delete
cp -R seo/dist/. .cf-dist/
cp cloudflare/_headers .cf-dist/
