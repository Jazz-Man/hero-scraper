#!/usr/bin/env bash

# check if we have better-sqlite3
if [ -d "./node_modules/better-sqlite3" ]; then
  cd ./node_modules/better-sqlite3
  bun --bun install --no-summary
  bun pm trust --all
  bun node-gyp clean
  bun node-gyp rebuild --release
fi