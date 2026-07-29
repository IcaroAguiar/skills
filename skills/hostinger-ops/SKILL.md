---
name: hostinger-ops
description: Use when managing Hostinger VPS, hosting, domains, DNS, billing, invoices, Reach, ecommerce, or related automation, especially when Google login or hPanel may select the wrong account.
---

# Hostinger Operations

Use the sanitized REST helper for recurring read-only finance checks and the isolated Hostinger Codex home for interactive operations. Treat hPanel and Chrome as recovery-only surfaces.

## Preconditions

- Do not add Hostinger MCPs back to the default `~/.codex/config.toml`: every Codex context spawns its own copies.
- For interactive Hostinger work, start `codex-hostinger`; its isolated `CODEX_HOME=~/.codex-hostinger` contains the pinned `hostinger-api-mcp@1.4.0` binaries.
- The finance heartbeat must execute only `~/.local/bin/hostinger-finance-readonly`, sourced from `scripts/hostinger_finance_readonly.py`. It is GET-only, fail-closed and emits sanitized JSON.
- Authentication is supplied through the macOS Keychain item `codex-hostinger-api-token` and injected as `HOSTINGER_API_TOKEN` at process start.
- DNS uses `hostinger-dns-mcp` in the validated `1.4.0` package. If a future package version removes that binary, use the DNS tools exposed by `hostinger-domains-mcp` instead.
- Never request, print, paste, commit, or write the API token into a repository, skill, prompt, log, receipt, or chat message.

If the Keychain item is absent, stop and instruct the user to set it locally without sharing the value in chat:

```bash
printf 'Hostinger API token: '
read -r -s token
printf '\n'
security add-generic-password -U -a "$USER" -s "codex-hostinger-api-token" -w "$token"
unset token
```

Restart the relevant Codex session after adding or rotating the token. Do not proceed with an unauthenticated OAuth fallback when the task requires a non-GUI run.

## Account Guard

Before any mutation, perform read-only checks through billing and domains tools:

1. Confirm the authenticated account resolves to the expected owner context, currently `JAMIL SAHELI` when exposed.
2. Confirm currency is BRL when exposed.
3. Confirm active subscriptions and known Star domains, including `plataformastar.com` or `staragency.com.br`.
4. Treat `escritoriostaragency@gmail.com`, USD, or an empty subscription list as the wrong account.

If any guard fails, stop. Do not purchase, renew, change DNS, delete, transfer, or modify billing. Report the observed identity state and request token rotation or account correction.

## Read Workflow

1. For the finance heartbeat, run only `~/.local/bin/hostinger-finance-readonly`. Never fall back to MCP, GUI, browser or ad-hoc REST from that automation.
2. Require `ok=true`, `read_only=true` and `guard_passed=true`; otherwise report only the sanitized block code.
3. For interactive work, use `codex-hostinger` and select the narrowest product MCP: hosting, domains, billing, reach, VPS or ecommerce.
4. Use read-only operations first and avoid storing raw WHOIS, infrastructure responses or unnecessary personal data in session logs.
5. For billing reminders, identify items due on the requested date and return only sanitized fields exposed by the helper. Never renew or pay automatically.

If a direct probe returns HTTP 403 with `browser_signature_banned` or error code `1010`, treat it as a transport/User-Agent block, not as an invalid token. Prefer the MCP transport; for a diagnostic HTTP probe only, use a standard browser User-Agent and keep the operation read-only. Do not rotate a valid token solely because of this error.

## Mutation Workflow

1. State the exact target resource and intended change before calling a mutating tool.
2. Require explicit confirmation for purchases, renewals, payment changes, deletion, transfer, access changes, and production DNS changes.
3. Apply the smallest scoped mutation.
4. Re-read the same resource and verify the resulting state, status, and identifiers.
5. Report the operation, verification result, and any residual risk. Never claim success from an API call without a matching read-back.

## DNS And Domains

- Use `hostinger-domains-mcp` for domain operations and `hostinger-dns-mcp` for DNS operations.
- Preserve existing records unless the user explicitly authorizes replacement.
- Before DNS changes, capture the current record set and target domain.
- After changes, read back the records and, when relevant, verify public DNS resolution.

## Login And Recovery

- Do not use Google login to select an account during normal operations.
- Do not unlink social login, change the account email, or disable 2FA unless the correct BRL account has already been verified and the user explicitly requests it.
- The durable fallback is the API token plus a direct Hostinger password. Establish the password only from the verified account and never before confirming the token works.

## Version And Tooling

- Keep the MCP package pinned to `1.4.0` for deterministic runs.
- Upgrade deliberately: inspect the package changelog, update the pin, run read-only account and product smoke tests, then revalidate the skill and config.
- The validated Hostinger package exposes product-specific servers, including a DNS binary in `1.4.0`.

## Completion Criteria

A Hostinger task is complete only when:

- the account guard passed;
- the requested read or mutation ran through the appropriate MCP;
- the resulting state was read back and verified;
- no secret appeared in output or artifacts; and
- skipped capabilities, API gaps, or residual provider-side work are stated explicitly.
