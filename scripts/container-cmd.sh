#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <command...>" >&2
  echo "Example: $0 npx playwright install chromium" >&2
  exit 2
fi

exec docker compose -f docker-compose.tooling.yml run --rm --build tooling "$@"
