#!/usr/bin/env bash

find . -type d -name '*node_modules*' -exec rm -rfv {} +
rm bun.lock 2> /dev/null || true
bun --bun install --no-summary
bun pm trust --all 2> /dev/null || true

git add bun.lock

if [ -d "./node_modules/better-sqlite3" ]; then
  cd ./node_modules/better-sqlite3
  bun --bun install --no-summary
  bun pm trust --all 2> /dev/null || true
  bun add --dev node-gyp --trust
  bun node-gyp clean
  bun node-gyp rebuild --release
fi
