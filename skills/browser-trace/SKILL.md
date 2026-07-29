---
name: browser-trace
description: Capture observable Chrome DevTools Protocol network traffic into a .o11y/<run>/ browser trace that can be consumed by the sibling browser-to-api skill.
compatibility: "Requires Node 24+ or another Node runtime with global WebSocket, plus a Chrome/Chromium target running with remote debugging enabled. Optional: browse CLI for driving browser flows and browse network on for response bodies."
allowed-tools: Bash, Read, Grep
---

# Browser Trace

Capture Chrome DevTools Protocol network events into a local `.o11y/<run>/` directory.
This skill is designed to feed `browser-to-api`, which consumes:

```text
.o11y/<run>/cdp/network/requests.jsonl
.o11y/<run>/cdp/network/responses.jsonl
```

## Safety

- Capture only flows the user explicitly authorizes.
- Do not use real sensitive identifiers unless the user explicitly provides and approves them.
- For Receita Web/Fiscal Desk, prefer manual supervised capture, a clean ephemeral browser/profile, no CAPTCHA solving, no stealth escalation, no proxy rotation and no persistent cookies/session.
- Stop immediately on CAPTCHA, portal blocking, bot-defense challenges, or unexpected credential/session prompts.

## Workflow

```bash
TARGET=9222
RUN=receita-web-safe-preflight
node ~/.agents/skills/browser-trace/scripts/start-capture.mjs "$TARGET" "$RUN"
# drive the browser flow manually or with browse; optional response bodies:
# browse network on
# ...manual flow...
# cp -r "$(browse network path | jq -r .path)" ".o11y/$RUN/cdp/network/bodies/"
# browse network off
node ~/.agents/skills/browser-trace/scripts/stop-capture.mjs "$RUN"
node ~/.agents/skills/browser-trace/scripts/bisect-cdp.mjs "$RUN"
node ~/.agents/skills/browser-to-api/scripts/discover.mjs --run ".o11y/$RUN" --origins www8.receita.fazenda.gov.br
```

## Scripts

- `start-capture.mjs <target-port|debugger-url> <run>` starts a background capture daemon.
- `stop-capture.mjs <run>` stops the daemon and leaves JSONL files in place.
- `bisect-cdp.mjs <run>` validates/counts the captured network buckets and writes `summary.json`.

`O11Y_ROOT` can override `.o11y`.
