#!/bin/sh
# Point this repo at .githooks (run once per clone, or via npm install prepare).
set -e
cd "$(dirname "$0")/.." || exit 1
if git rev-parse --git-dir >/dev/null 2>&1; then
  git config core.hooksPath .githooks
  echo "core.hooksPath set to .githooks"
else
  echo "Not a git checkout; skipping hooksPath" >&2
fi
