#!/usr/bin/env bash
# Deploy truexpanse.com from a clean copy (no repo files), with the Control Center edge function.
#   bash scripts/deploy.sh "what changed"
# 1. rebuilds site-manifest.json  2. copies the public files to a temp folder  3. netlify deploy --prod
# The edge function (netlify/edge-functions/) is bundled from the repo by the Netlify CLI.
set -euo pipefail
cd "$(dirname "$0")/.."
SITE_ID="19fde9c3-f78d-4439-b9b9-2bdab8f3fa27"
OUT="${TMPDIR:-/tmp}/truexpanse-site-dist"
python3 scripts/build-manifest.py
rm -rf "$OUT" && mkdir -p "$OUT"
rsync -a --exclude '.git' --exclude '.netlify' --exclude 'netlify/' --exclude 'scripts/' --exclude 'node_modules' \
  --exclude '*.md' --exclude '*.py' --exclude '.DS_Store' ./ "$OUT"/
test -f "$OUT/index.html" && test -f "$OUT/site-manifest.json" && test -f "$OUT/blog/post-template/index.html"
echo "files to publish: $(find "$OUT" -type f | wc -l | tr -d ' ')"
netlify deploy --prod --dir="$OUT" --site="$SITE_ID" --message "${1:-site update}"
