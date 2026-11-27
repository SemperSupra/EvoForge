#!/usr/bin/env bash
set -euo pipefail

mode="${1:-}"
shift || true

if [ -z "$mode" ] || { [ "$mode" != "test" ] && [ "$mode" != "update" ]; }; then
  echo "Usage: $0 <test|update> [args to golden script...]" >&2
  echo "Examples:" >&2
  echo "  $0 test" >&2
  echo "  $0 update -- --engine mosaic --version 1.0.0" >&2
  exit 2
fi

# Run everything in the tooling container. System dependencies for Chromium are baked into `Dockerfile.tooling`;
# browser downloads are cached via the Playwright volume.
cmd=(bash -lc)
inner='
set -euo pipefail
npx playwright install chromium
npm run dev -- --host 127.0.0.1 --port 5173 &
DEV_PID=$!
cleanup() { kill "$DEV_PID" >/dev/null 2>&1 || true; }
trap cleanup EXIT
npx wait-on http://127.0.0.1:5173/#golden
'

if [ "$mode" = "test" ]; then
  inner+=$'npm run golden:test\n'
else
  # Forward args to the node script (use `--` after update to pass flags through npm).
  inner+=$'node scripts/golden-update.mjs '$'*\n'
fi

# shellcheck disable=SC2016
exec ./scripts/container-cmd.sh "${cmd[@]}" "$inner" "$@"
