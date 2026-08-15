# Helper contract

## JSON envelope

With `--json`, stdout contains `{"ok":true,"command":"doctor","data":{},"warnings":[]}`. Errors use a nonzero exit and `{"ok":false,"command":"run","error":{"code":"PREFLIGHT_FAILED","message":"Preflight failed","details":[]}}`.

Diagnostics go to stderr. The helper never accepts credentials as arguments and never prints environment values.

## Setup

`setup --json [--canonical-core PATH] [--replace-links]` installs live references for the global core, custom agent, and helper. It refuses broken global skill links and conflicting targets. Use `--replace-links` only to repoint existing symbolic links after a verified catalogue refresh; regular files remain protected.

## Dispatch and run

Validate packets against `dispatch.schema.json`. Allowed paths are repository-relative exact files or directory prefixes; absolute paths, `..`, and `.git` are rejected. The helper also verifies repository identity, base ancestry, branch, and clean start. `run` performs preflight, injects the declarative rules into Antigravity's built-in coding agent, and invokes `agy` with sandbox, `accept-edits`, package auto-approval, selected model, JSON output, and `receipt.schema.json`. Direct selection of the Markdown custom profile is intentionally avoided on `agy` 1.1.13 because its execution toolset is read-only in a real forward test. The default print timeout is five minutes and can be narrowed with `--timeout`.

After execution, the helper independently compares changed paths, branch, HEAD, cleanliness, commit authority, and the receipt's push/PR claims against the dispatch. It refuses a handoff on any mismatch and leaves the checkout intact for controller audit. A valid handoff stores package/conversation IDs, requested model, checkout evidence, changed paths, quota, token usage, and the executor receipt.

Use `--dry-run` to validate and print the redacted invocation without spending quota or changing files.

## Resume

`resume` requires a conversation ID and a packet for the same package. It keeps the same agent and model unless the controller explicitly records a new route.

## Exit codes

- `0`: success;
- `2`: invalid arguments or JSON;
- `3`: preflight or policy failure;
- `4`: `agy` execution failure;
- `5`: invalid executor receipt.
