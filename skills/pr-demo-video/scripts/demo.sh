#!/usr/bin/env bash
# pr-demo-video runner. Usage:
#   demo.sh new    <run-dir> --cwd <repo-or-app-dir> --playwright "<command that runs the project's playwright>" [--kit <dir>]
#   demo.sh login  <run-dir> [persona]    # once, off camera; writes .auth.json or .auth-<persona>.json (0600)
#   demo.sh keep   <run-dir> [scene-id…]  # saves project.ts, the Playwright command and the named scenes in the kit
#   demo.sh scene  <run-dir> <scene-id> [--fast]   # one scene alone: prepare + play, no video
#   demo.sh record <run-dir> [--fast]     # all scenes in order, recorded
#   demo.sh post   <run-dir>              # mp4, contact sheet, one frame per scene
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
cmd="${1:?command}"; run="${2:?run dir}"; shift 2
case "$run" in /*) ;; *) echo "run dir must be absolute" >&2; exit 2;; esac

load() {
  # shellcheck disable=SC1091
  source "$run/run.env"
  export DEMO_RUN_DIR="$run"
  [ -z "${DEMO_KIT:-}" ] || export DEMO_KIT DEMO_AUTH_DIR="$DEMO_KIT"
}
pw() {
  # Parse configured command words once; run paths are always separate arguments.
  local args=() word
  while IFS= read -r -d '' word; do args+=("$word"); done < "$run/playwright.args"
  # External run files import the project's test package, including in login.
  local module_path
  module_path="$(python3 - "$PW_CWD" "${args[@]}" <<'PYMODULE'
import os, subprocess, sys
cwd, words = sys.argv[1], sys.argv[2:]
probe = "require.resolve('@playwright/test/package.json', { paths: [process.cwd()] })"
def root(found):
    return os.path.dirname(os.path.dirname(os.path.dirname(found.strip())))
def run(prefix):
    return subprocess.check_output(prefix + ['node', '-p', probe], cwd=cwd, text=True, stderr=subprocess.DEVNULL)
try:
    # Plain node from --cwd: npm, yarn, a local bin path and npx installs.
    print(root(run([])))
except (OSError, subprocess.CalledProcessError):
    # Workspace launchers (pnpm/yarn ... exec playwright) keep the package
    # inside one workspace; resolve through the same launcher, never install.
    if len(words) >= 3 and words[0] in ('pnpm', 'yarn') and words[-1] == 'playwright' and 'exec' in words:
        try:
            print(root(run(words[:-1])))
            raise SystemExit(0)
        except (OSError, subprocess.CalledProcessError):
            pass
    raise SystemExit('Cannot resolve the project @playwright/test from --cwd; pass --cwd at the package that depends on it, or a "pnpm|yarn ... exec playwright" launcher.')
PYMODULE
)" || return 1
  (export NODE_PATH="$module_path${NODE_PATH:+:$NODE_PATH}"
   cd "$PW_CWD" && browser_lane "${args[@]}" test -c "$run/playwright.config.ts")
}
# Recordings take their own lane; HEAVY_SLOT lets them through a queue that wraps the package manager.
browser_lane() {
  command -v lockf >/dev/null 2>&1 || { HEAVY_SLOT=browser "$@"; return; }
  local state="${XDG_STATE_HOME:-$HOME/.local/state}/demo-browser" slots="${DEMO_BROWSER_SLOTS:-2}"
  local marker started waited level i rc
  mkdir -p "$state"; marker="$state/.acq.$$"; started=$(date +%s)
  while :; do
    waited=$(( $(date +%s) - started ))
    level=$(sysctl -n kern.memorystatus_level 2>/dev/null || echo 100)
    if [ "$level" -lt 25 ] && [ "$waited" -lt 300 ]; then sleep 5; continue; fi
    for ((i = 0; i < slots; i++)); do
      rm -f "$marker"
      # A busy slot exits 75 without running; the marker tells that from the command exiting 75.
      lockf -s -k -t 0 "$state/slot.$i" /bin/sh -c ': > "$0"; HEAVY_SLOT=browser "$@"' "$marker" "$@" && rc=0 || rc=$?
      if [ -f "$marker" ]; then rm -f "$marker"; return "$rc"; fi
    done
    if [ "$waited" -ge 600 ]; then HEAVY_SLOT=browser "$@"; return; fi
    sleep 2
  done
}
execute() {
  local report="$1" status=0
  rm -f "$report"
  # Playwright can echo source lines and unsanitized exceptions. Only the
  # sanitized report is printed; raw runner output is discarded.
  pw >/dev/null 2>&1 || status=$?
  node "$run/diagnostics.cjs" "$report" || { [ "$status" -ne 0 ] || status=1; }
  return "$status"
}

case "$cmd" in
  new)
    cwd=""; playwright=""; kit=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --cwd) cwd="$2"; shift 2;;
        --playwright) playwright="$2"; shift 2;;
        --kit) kit="$2"; shift 2;;
        *) echo "unknown option $1" >&2; exit 2;;
      esac
    done
    case "$kit" in ''|/*) ;; *) echo "kit dir must be absolute" >&2; exit 2;; esac
    mkdir -p "$run/scenes"
    if [ -n "$kit" ]; then
      mkdir -p "$kit/scenes"; chmod 700 "$kit"
      [ -f "$run/project.ts" ] || [ ! -f "$kit/project.ts" ] || cp "$kit/project.ts" "$run/project.ts"
      for kept in "$kit/scenes/"*.ts; do [ ! -f "$kept" ] || cp "$kept" "$run/scenes/"; done
    fi
    [ -n "$playwright" ] || [ ! -f "$kit/playwright.args" ] || cp "$kit/playwright.args" "$run/playwright.args"
    [ -n "$cwd" ] && { [ -n "$playwright" ] || [ -f "$run/playwright.args" ]; } || { echo "--cwd and --playwright are required (a kit remembers --playwright)" >&2; exit 2; }
    cp "$here/harness/"{harness.ts,overlay.ts,probe.ts,access.ts,playwright.config.ts,login.spec.ts,record.spec.ts,diagnostics.cjs} "$run/"
    [ -f "$run/project.ts" ] || cp "$here/harness/project.template.ts" "$run/project.ts"
    [ -f "$run/scenes/index.ts" ] || cp "$here/harness/scenes/index.ts" "$run/scenes/index.ts"
    cp "$here/harness/scenes/_template.ts" "$run/scenes/_template.ts"
    [ -z "$playwright" ] || python3 - "$playwright" "$run/playwright.args" <<'PYARGS'
import shlex, sys
words = shlex.split(sys.argv[1])
if not words: raise SystemExit('empty Playwright command')
with open(sys.argv[2], 'wb') as f:
    for word in words: f.write(word.encode() + b'\0')
PYARGS
    printf 'PW_CWD=%q\nDEMO_KIT=%q\n' "$cwd" "$kit" > "$run/run.env"
    echo "run ready: $run (fill project.ts, then: demo.sh login $run)"
    ;;
  login)
    load; persona="${1:-}"
    case "$persona" in *[!a-z0-9-]*) echo "invalid persona" >&2; exit 2;; esac
    DEMO_STEP=login DEMO_PERSONA="$persona" pw
    stored="${DEMO_AUTH_DIR:-$run}/.auth${persona:+-$persona}.json"
    test -f "$stored" && chmod 600 "$stored" && echo "session stored (not printed)"
    ;;
  keep)
    load; [ -n "${DEMO_KIT:-}" ] || { echo "this run has no kit: create it with --kit" >&2; exit 2; }
    cp "$run/project.ts" "$run/playwright.args" "$DEMO_KIT/"
    for id in "$@"; do
      case "$id" in ''|*[!a-zA-Z0-9_-]*) echo "invalid scene id" >&2; exit 2;; esac
      cp "$run/scenes/$id.ts" "$DEMO_KIT/scenes/"
    done
    echo "kit updated: $DEMO_KIT"
    ;;
  scene)
    load; id="${1:?scene id}"; fast=0; [ "${2:-}" = "--fast" ] && fast=1
    case "$id" in ''|*[!a-zA-Z0-9_-]*) echo "invalid scene id" >&2; exit 2;; esac
    DEMO_SCENE="$id" DEMO_FAST="$fast" execute "$run/report-$id.json"
    ;;
  record)
    load; fast=0; [ "${1:-}" = "--fast" ] && fast=1
    DEMO_FAST="$fast" execute "$run/report.json"
    ;;
  post)
    python3 "$here/post.py" "$run"
    ;;
  *) echo "unknown command $cmd" >&2; exit 2;;
esac
