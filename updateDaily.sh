#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required to run this script."
  exit 1
fi

echo "Updating Mastodon historical data..."
node updateData.js

if [[ -n $(git status -s historicalData.js) ]]; then
  echo "Committing new data to Git..."
  git add historicalData.js
  git commit -m "chore: daily data update"
  
  echo "Pushing data to GitHub..."
  # Safely pull any upstream changes first, then push
  git pull --rebase --autostash || true
  git push
else
  echo "No new data to commit."
fi

echo "Fixing web file permissions..."
chmod 644 *.js *.html *.css || true

echo "Update complete."
