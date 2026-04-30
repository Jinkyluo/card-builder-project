#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

VERSION="$(node -p "require('./package.json').version")"
COMMIT="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
STAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
OUT_NAME="card-studio-v${VERSION}-source.zip"
OUT_PATH="delivery/${OUT_NAME}"
TMPZIP="delivery/.packaging-temp.zip"

mkdir -p delivery

{
  echo "package_version=${VERSION}"
  echo "git_commit=${COMMIT}"
  echo "built_utc=${STAMP}"
} > delivery/BUILD_INFO.txt

rm -f "${OUT_PATH}" "${TMPZIP}"

zip -r "${TMPZIP}" . \
  -x ".git/*" \
  -x "node_modules/*" \
  -x ".next/*" \
  -x "coverage/*" \
  -x "*.tsbuildinfo" \
  -x ".DS_Store" \
  -x "*/.DS_Store" \
  -x "delivery/*.zip" \
  -x "delivery/.packaging-temp.zip" \
  -x "card-builder-project.zip"

mv "${TMPZIP}" "${OUT_PATH}"

echo "Wrote ${OUT_PATH} ($(du -h "${OUT_PATH}" | awk '{print $1}'))"
