#!/usr/bin/env bash
set -euo pipefail

clean_contents() {
  local target=$1

  case "$target" in
    /runner/_work/*)
      ;;
    *)
      echo "Refusing to clean an unexpected path: $target" >&2
      return 1
      ;;
  esac

  if [[ -d "$target" ]]; then
    timeout 120s find "$target" -xdev -depth -mindepth 1 -delete
  fi
}

shopt -s nullglob

if [[ -n "${GITHUB_WORKSPACE:-}" ]]; then
  clean_contents "$GITHUB_WORKSPACE"
fi

for workspace_root in /runner/_work/*; do
  workspace_name=${workspace_root##*/}
  if [[ "$workspace_name" != _* ]]; then
    clean_contents "$workspace_root"
  fi
done

clean_contents /runner/_work/_temp
