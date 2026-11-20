#!/bin/sh
# Promote: copy the tested app from next/ to the repo root, where GitHub Pages serves the live app.
# Run only when the owner says "promote". This script does not commit and does not push.
set -eu
cd "$(dirname "$0")/.."

CLASSIC_SHA="bdce8113a263defba5a1ed24e995cb76949eda282aa690f3b777c7fad9409e66"

echo "1/4 Running tests"
node --test

echo "2/4 Checking that classic.html is still the original app"
actual=$(shasum -a 256 classic.html | cut -d' ' -f1)
if [ "$actual" != "$CLASSIC_SHA" ]; then
  echo "classic.html has changed. Nothing was copied."
  exit 1
fi

echo "3/4 Copying next/ app files to the root"
for dir in app vendor assets; do
  mkdir -p "$dir"
  rsync -a --delete "next/$dir/" "$dir/"
done
cp next/index.html index.html
cp next/manifest.webmanifest manifest.webmanifest

echo "4/4 What changed (staged only; nothing is committed or pushed)"
git add -A index.html manifest.webmanifest app vendor assets
git diff --cached --stat
