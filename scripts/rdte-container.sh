#!/usr/bin/env bash
set -euo pipefail
# All project commands run inside the same approved tooling container.
evidence=/tmp/evoforge-native-evidence
mkdir "$evidence"
[[ "${EVOFORGE_SOURCE_SHA:-}" =~ ^[a-f0-9]{40}$ ]] || { echo 'Exact source identity required' >&2; exit 2; }
echo "EVOFORGE_NATIVE_QUALIFICATION source=$EVOFORGE_SOURCE_SHA"
printf 'source=%s\n' "$EVOFORGE_SOURCE_SHA" > "$evidence/native-source.txt"
{
  uname -a
  cat /etc/os-release
  node --version
  npm --version
  sha256sum package-lock.json Dockerfile.tooling
} > "$evidence/toolchain.txt"
: > "$evidence/gates.tsv"
gate(){
  local name="$1"; shift
  echo "GATE_START $name"
  local rc=0
  "$@" > "$evidence/$name.log" 2>&1 || rc=$?
  cat "$evidence/$name.log"
  if (( rc != 0 )); then
    printf '%s\tFAIL\t%s\n' "$name" "$rc" >> "$evidence/gates.tsv"
    return "$rc"
  fi
  printf '%s\tPASS\n' "$name" >> "$evidence/gates.tsv"
}
gate install npm ci
gate chromium ./node_modules/.bin/playwright install chromium
gate typecheck npm run typecheck
gate unit npm test
gate build npm run build
gate dist npm run verify:dist
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort > "$evidence/vite.log" 2>&1 &
vite_pid=$!
stop_vite(){ kill "$vite_pid" 2>/dev/null || true; wait "$vite_pid" 2>/dev/null || true; }
trap stop_vite EXIT
./node_modules/.bin/wait-on --timeout 60000 http://127.0.0.1:5173/
gate golden npm run golden:test
stop_vite
trap - EXIT
case "${EVOFORGE_QUALIFICATION_PHASE:-full}" in
 full) gate smoke npm run arena:smoke; echo 'NATIVE_GATES_PASS';;
 container) echo 'CONTAINER_GATES_PASS_AWAITING_NATIVE_SMOKE';;
 *) exit 2;;
esac
