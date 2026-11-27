#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -eq 0 ]; then
  echo "Usage: $0 <npm args...>" >&2
  echo "Example: $0 test" >&2
  exit 2
fi

exec docker compose -f docker-compose.tooling.yml run --rm --build tooling npm "$@"
