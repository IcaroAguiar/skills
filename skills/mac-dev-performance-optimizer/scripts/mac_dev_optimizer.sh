#!/usr/bin/env bash
set -Eeuo pipefail

home="${HOME:-/Users/icaroaguiar}"
workspace="/Users/icaroaguiar/Documents/Codex/2026-05-18/precisamos-limpar-a-memoria-do-meu"
codex_maintenance="$workspace/tools/run_codex_maintenance_when_closed.sh"

mode="${1:-report}"
shift || true

yes=0
close_chrome=0
restart_monitors=0

while (($#)); do
  case "$1" in
    --yes) yes=1 ;;
    --close-chrome) close_chrome=1 ;;
    --restart-monitors) restart_monitors=1 ;;
    -h|--help) mode="help" ;;
    *) printf 'Unknown option: %s\n' "$1" >&2; exit 2 ;;
  esac
  shift
done

section() {
  printf '\n## %s\n' "$1"
}

confirm() {
  if ((yes)); then
    return 0
  fi
  printf 'Refusing to mutate without --yes: %s\n' "$*" >&2
  return 1
}

exists() {
  [[ -e "$1" ]]
}

safe_rm() {
  local path
  for path in "$@"; do
    [[ -e "$path" ]] || continue
    printf 'remove: %s\n' "$path"
    confirm "$path" || continue
    rm -rf "$path"
  done
}

app_running() {
  pgrep -x "$1" >/dev/null 2>&1
}

chrome_running() {
  pgrep -fl '/Applications/Google Chrome.app|Chrome Helper' >/dev/null 2>&1
}

report_processes() {
  section "Process Pressure"
  if ps -axo pid,ppid,%cpu,rss,comm >/tmp/mac-dev-opt-ps.$$ 2>/dev/null; then
    awk '
      BEGIN { printf "%-16s %5s %8s %10s\n", "group", "count", "cpu", "rss_mb" }
      /\/Google Chrome\.app\// || /Chrome Helper/ { c["Chrome"]++; cpu["Chrome"] += $3; rss["Chrome"] += $4 }
      /Codex|codex/ { c["Codex"]++; cpu["Codex"] += $3; rss["Codex"] += $4 }
      /Docker/ { c["Docker"]++; cpu["Docker"] += $3; rss["Docker"] += $4 }
      /Stats|CodexBar/ { c["Stats/CodexBar"]++; cpu["Stats/CodexBar"] += $3; rss["Stats/CodexBar"] += $4 }
      /node|pnpm|vite|next|turbo/ { c["Node/dev"]++; cpu["Node/dev"] += $3; rss["Node/dev"] += $4 }
      /WhatsApp/ { c["WhatsApp"]++; cpu["WhatsApp"] += $3; rss["WhatsApp"] += $4 }
      END { for (k in c) printf "%-16s %5d %8.1f %10.0f\n", k, c[k], cpu[k], rss[k] / 1024 }
    ' /tmp/mac-dev-opt-ps.$$
    rm -f /tmp/mac-dev-opt-ps.$$
  else
    printf 'ps-blocked: rerun outside sandbox for live process metrics.\n'
  fi
}

report() {
  section "Disk"
  df -h /System/Volumes/Data 2>/dev/null || true

  section "Memory"
  memory_pressure 2>/dev/null | sed -n '1,40p' || true
  vm_stat 2>/dev/null | sed -n '1,25p' || true

  section "AI App State"
  du -sh \
    "$home/.codex" \
    "$home/.local/share/opencode" \
    "$home/Library/Application Support/Codex" \
    "$home/Library/Application Support/Claude" \
    "$home/Library/Application Support/Cursor" \
    "$home/Library/Application Support/Zed" \
    "$home/Library/Application Support/Google/Chrome" \
    "$home/Library/Application Support/Docker Desktop" \
    2>/dev/null | sort -hr || true

  section "Caches"
  du -sh \
    "$home/Library/Caches" \
    "$home/.cache" \
    "$home/.cache/codex-runtimes" \
    "$home/.local/share" \
    "$home/.local/share/uv" \
    "$home/.local/share/uv/tools" \
    "$home/.local/share/pnpm" \
    "$home/Library/pnpm/store" \
    2>/dev/null | sort -hr || true

  section "Chrome Models And Policy"
  defaults read com.google.Chrome GenAILocalFoundationalModelSettings 2>/dev/null | sed 's/^/GenAILocalFoundationalModelSettings=/' || true
  defaults read com.google.Chrome HighEfficiencyModeEnabled 2>/dev/null | sed 's/^/HighEfficiencyModeEnabled=/' || true
  defaults read com.google.Chrome MemorySaverModeSavings 2>/dev/null | sed 's/^/MemorySaverModeSavings=/' || true
  defaults read com.google.Chrome BackgroundModeEnabled 2>/dev/null | sed 's/^/BackgroundModeEnabled=/' || true
  find "$home/Library/Application Support/Google/Chrome" -maxdepth 1 \
    \( -name 'OptGuideOnDeviceModel' -o -name 'OptGuideOnDeviceClassifierModel' -o -name 'optimization_guide_model_store' -o -name 'OnDeviceHeadSuggestModel' -o -name 'WasmTtsEngine' \) \
    -print -exec du -sh {} \; 2>/dev/null || true

  section "Large node_modules"
  find "$home/dev" -maxdepth 4 -type d -name node_modules -prune -print0 2>/dev/null \
    | xargs -0 du -sh 2>/dev/null \
    | sort -hr \
    | head -30 || true

  section "Largest Dev Roots"
  du -sh "$home/dev" "$home/dev"/* "$home/dev"/*/* 2>/dev/null \
    | sort -hr \
    | head -40 || true

  section "Launch Agents"
  find "$home/Library/LaunchAgents" -maxdepth 1 -type f \( -name 'local.tetra.*.plist' -o -iname '*docker*' -o -iname '*cleanmymac*' \) -print 2>/dev/null || true
  launchctl print-disabled "gui/$(id -u)" 2>/dev/null | sed -n '1,120p' || true

  section "Docker"
  docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Image}}' 2>/dev/null || true
  docker system df 2>/dev/null || true

  report_processes
}

apply_chrome_policies() {
  section "Apply Chrome Policies"
  defaults write com.google.Chrome GenAILocalFoundationalModelSettings -int 1
  defaults write com.google.Chrome HighEfficiencyModeEnabled -bool true
  defaults write com.google.Chrome MemorySaverModeSavings -int 2
  defaults write com.google.Chrome BackgroundModeEnabled -bool false
  printf 'Chrome policies applied.\n'
}

close_chrome_if_requested() {
  if ((close_chrome)) && chrome_running; then
    section "Close Chrome"
    osascript -e 'tell application "Google Chrome" to quit' || true
    sleep 5
  fi
}

clean_chrome_when_closed() {
  section "Chrome Regenerable Cleanup"
  if chrome_running; then
    printf 'skip: Chrome is running. Pass --close-chrome to quit first.\n'
    return 0
  fi
  safe_rm \
    "$home/Library/Application Support/Google/Chrome/OptGuideOnDeviceModel" \
    "$home/Library/Application Support/Google/Chrome/OptGuideOnDeviceClassifierModel" \
    "$home/Library/Application Support/Google/Chrome/optimization_guide_model_store" \
    "$home/Library/Application Support/Google/Chrome/OnDeviceHeadSuggestModel" \
    "$home/Library/Application Support/Google/Chrome/WasmTtsEngine" \
    "$home/Library/Application Support/Google/Chrome/component_crx_cache" \
    "$home/Library/Application Support/Google/Chrome/BrowserMetrics" \
    "$home/Library/Application Support/Google/Chrome/GraphiteDawnCache" \
    "$home/Library/Application Support/Google/Chrome/GrShaderCache" \
    "$home/Library/Application Support/Google/Chrome/ShaderCache" \
    "$home/Library/Application Support/Google/Chrome/Crashpad"
}

clean_app_caches() {
  section "App And System Regenerable Caches"
  safe_rm \
    "$home/Library/Application Support/Google/GoogleUpdater/crx_cache" \
    "$home/Library/Application Support/Spotify/PersistentCache/Update/temp" \
    "$home/Library/Application Support/Spotify/PersistentCache/Update/spotify-autoupdate-1.2.89.539.gfb3c63a3-817.tbz" \
    "$home/Library/Application Support/discord/Cache" \
    "$home/Library/Application Support/discord/logs" \
    "$home/Library/Application Support/discord/GPUCache" \
    "$home/Library/Application Support/discord/DawnGraphiteCache" \
    "$home/Library/Application Support/discord/DawnWebGPUCache" \
    "$home/Library/Application Support/discord/Code Cache" \
    "$home/Library/Caches/com.apple.textunderstandingd" \
    "$home/Library/Caches/com.apple.python" \
    "$home/Library/Caches/GeoServices" \
    "$home/Library/Caches/Google" \
    "$home/Library/Caches/Homebrew" \
    "$home/Library/Caches/bun" \
    "$home/Library/Caches/typescript" \
    "$home/Library/Caches/claude-cli-nodejs"
}

fix_stats_updater() {
  section "Stats Updater Check"
  if pgrep -fl 'stats-updater|--dmg-path .*Stats.dmg' >/dev/null 2>&1; then
    printf 'Stats updater wrapper detected.\n'
    confirm "restart Stats" || return 0
    osascript -e 'tell application "Stats" to quit' || true
    sleep 3
    open -a "Stats" || true
  else
    printf 'ok: no Stats updater wrapper detected.\n'
  fi
}

restart_monitors_if_requested() {
  ((restart_monitors)) || return 0
  section "Restart Monitors"
  osascript -e 'tell application "Stats" to quit' || true
  pkill -x CodexBar 2>/dev/null || true
  sleep 3
  open -a "Stats" || true
  open -a "CodexBar" || true
}

pnpm_prune() {
  section "pnpm Store Prune"
  if command -v pnpm >/dev/null 2>&1; then
    pnpm store prune || true
  else
    printf 'skip: pnpm not found.\n'
  fi
}

docker_prune() {
  section "Docker Prune Without Volumes"
  confirm "docker prune images/build cache/containers without volumes" || return 1
  docker system prune -af || true
  docker builder prune -af || true
  docker image prune -af || true
  printf 'Docker volumes were not pruned.\n'
}

remove_dormant_node_modules() {
  section "Dormant node_modules"
  local repos=(
    "$home/dev/star/bluefit-mvp"
    "$home/dev/pessoal/tatiane-aguiar"
    "$home/dev/pessoal/meu-portfolio"
    "$home/dev/tetra/tetra-metrics"
    "$home/dev/tetra/tetra-mobile-release"
    "$home/dev/star/daniele-site"
    "$home/dev/star/rosana-site"
    "$home/dev/star/niedh"
    "$home/dev/star/masterclass-patriciadomingos"
  )
  local repo
  confirm "remove conservative dormant node_modules list" || return 1
  for repo in "${repos[@]}"; do
    [[ -d "$repo/node_modules" ]] || continue
    if [[ -n "$(git -C "$repo" status --porcelain 2>/dev/null || true)" ]]; then
      printf 'skip dirty repo: %s\n' "$repo"
      continue
    fi
    if pgrep -fl "$repo" >/dev/null 2>&1; then
      printf 'skip active process: %s\n' "$repo"
      continue
    fi
    printf 'remove node_modules: %s\n' "$repo"
    rm -rf "$repo/node_modules"
  done
}

archive_tetra_launchagents() {
  section "Archive Tetra LaunchAgents"
  local src="$home/Library/LaunchAgents"
  local dst="$home/Library/LaunchAgents.disabled/tetra-$(date +%Y%m%d-%H%M%S)"
  confirm "archive local.tetra.* launch agents" || return 1
  mkdir -p "$dst"
  find "$src" -maxdepth 1 -type f -name 'local.tetra.*.plist' -print0 2>/dev/null \
    | while IFS= read -r -d '' plist; do
        launchctl bootout "gui/$(id -u)" "$plist" 2>/dev/null || true
        mv "$plist" "$dst/"
      done
  printf 'archived to: %s\n' "$dst"
}

codex_final_cut() {
  section "Codex Final Cut"
  if pgrep -x Codex >/dev/null 2>&1 || pgrep -fl '/Applications/Codex.app' >/dev/null 2>&1; then
    printf 'blocked: Codex is running. Close Codex first, then rerun this mode.\n'
    return 1
  fi
  if [[ ! -x "$codex_maintenance" ]]; then
    printf 'blocked: maintenance script not executable: %s\n' "$codex_maintenance"
    return 1
  fi
  "$codex_maintenance"
}

apply_safe() {
  apply_chrome_policies
  close_chrome_if_requested
  clean_chrome_when_closed
  clean_app_caches
  fix_stats_updater
  pnpm_prune
  restart_monitors_if_requested
  report
}

help_text() {
  cat <<'USAGE'
Usage:
  mac_dev_optimizer.sh report
  mac_dev_optimizer.sh apply-safe --yes [--close-chrome] [--restart-monitors]
  mac_dev_optimizer.sh docker-prune --yes
  mac_dev_optimizer.sh remove-dormant-node-modules --yes
  mac_dev_optimizer.sh archive-tetra-launchagents --yes
  mac_dev_optimizer.sh codex-final-cut

Defaults protect Postgres, Docker volumes, browser profiles, cookies, history,
sessions, editor User folders, active/dirty repos, and Codex while open.
USAGE
}

case "$mode" in
  report) report ;;
  apply-safe) apply_safe ;;
  docker-prune) docker_prune ;;
  remove-dormant-node-modules) remove_dormant_node_modules ;;
  archive-tetra-launchagents) archive_tetra_launchagents ;;
  codex-final-cut) codex_final_cut ;;
  help|-h|--help) help_text ;;
  *) printf 'Unknown mode: %s\n' "$mode" >&2; help_text >&2; exit 2 ;;
esac
