#!/usr/bin/env bash
set -euo pipefail

clean_contents() {
  local target=$1

  case "$target" in
    /runner/_work/*|/runner/_work/.pnpm-store|/runner/_work/_update|/root/.npm/_cacache|/root/.npm/_logs|/var/lib/pullfrog|/tmp/pullfrog-*)
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

clean_pullfrog_temp_dirs() {
  local target

  while IFS= read -r -d '' target; do
    clean_contents "$target"
    rmdir "$target"
  done < <(find /tmp -xdev -mindepth 1 -maxdepth 1 -type d -name 'pullfrog-*' -print0)
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
clean_contents /runner/_work/.pnpm-store
clean_contents /runner/_work/_update
clean_pullfrog_temp_dirs
clean_contents /root/.npm/_cacache
clean_contents /root/.npm/_logs
clean_contents /var/lib/pullfrog
