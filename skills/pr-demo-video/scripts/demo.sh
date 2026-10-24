#!/usr/bin/env bash
# pr-demo-video runner. Usage:
#   demo.sh new    <run-dir> --cwd <repo-or-app-dir> --playwright "<command that runs the project's playwright>"
#   demo.sh login  <run-dir>              # once, off camera; writes .auth.json (0600)
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
   cd "$PW_CWD" && "${args[@]}" test -c "$run/playwright.config.ts")
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
    cwd=""; playwright=""
    while [ $# -gt 0 ]; do
      case "$1" in
        --cwd) cwd="$2"; shift 2;;
        --playwright) playwright="$2"; shift 2;;
        *) echo "unknown option $1" >&2; exit 2;;
      esac
    done
    [ -n "$cwd" ] && [ -n "$playwright" ] || { echo "--cwd and --playwright are required" >&2; exit 2; }
    mkdir -p "$run/scenes"
    cp "$here/harness/"{harness.ts,overlay.ts,playwright.config.ts,login.spec.ts,record.spec.ts,diagnostics.cjs} "$run/"
    [ -f "$run/project.ts" ] || cp "$here/harness/project.template.ts" "$run/project.ts"
    [ -f "$run/scenes/index.ts" ] || cp "$here/harness/scenes/index.ts" "$run/scenes/index.ts"
    cp "$here/harness/scenes/_template.ts" "$run/scenes/_template.ts"
    python3 - "$playwright" "$run/playwright.args" <<'PYARGS'
import shlex, sys
words = shlex.split(sys.argv[1])
if not words: raise SystemExit('empty Playwright command')
with open(sys.argv[2], 'wb') as f:
    for word in words: f.write(word.encode() + b'\0')
PYARGS
    printf 'PW_CWD=%q\n' "$cwd" > "$run/run.env"
    echo "run ready: $run (fill project.ts, then: demo.sh login $run)"
    ;;
  login)
    load; DEMO_STEP=login pw
    test -f "$run/.auth.json" && chmod 600 "$run/.auth.json" && echo "session stored (not printed)"
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
