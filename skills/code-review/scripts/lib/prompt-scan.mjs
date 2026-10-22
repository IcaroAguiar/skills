// Every prompt is scanned with gitleaks once, before any provider sees it. A leak
// stops the dispatch, so a fallback can never carry a credential to a provider the
// harness guard does not watch (agy, Cursor). A clean prompt's hash rides in the
// environment, so the guard's name heuristic, which blocks code such as
// `password: creds.password`, defers to gitleaks for that exact prompt.
// Contract: ../../references/providers.md.

import { createHash } from "node:crypto";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readJson, run } from "./repo.mjs";

export const PROMPT_HASH_ENV = "AGENT_REVIEW_PROMPT_SHA256";
const GITLEAKS = process.env.AGENT_REVIEW_GITLEAKS || "gitleaks";
const verdicts = new Map();
// --ignore-gitleaks-allow: the prompt is untrusted input; a `gitleaks:allow` comment in it must not clear itself.

// The guard hashes the prompt it receives, stripped, the same way.
export function promptHash(prompt) {
  return createHash("sha256").update(prompt.trim(), "utf8").digest("hex");
}

// { status: "clean" } or { status: "secret", error } (a leak, or no scanner to prove there is none).
export async function scanPrompt(prompt) {
  const hash = promptHash(prompt);
  // The promise is cached, so T1's parallel lenses share one scan.
  if (!verdicts.has(hash)) verdicts.set(hash, gitleaks(prompt));
  return verdicts.get(hash);
}

async function gitleaks(prompt) {
  const scratch = mkdtempSync(join(tmpdir(), "review-scan-"));
  const report = join(scratch, "report.json");
  try {
    const result = await run(GITLEAKS, ["stdin", "--no-banner", "--redact", "--ignore-gitleaks-allow", "--report-format", "json", "--report-path", report, "--exit-code", "0"], { input: prompt, timeoutMs: 60_000 });
    const leaks = result.code === 0 ? readJson(() => readFileSync(report, "utf8")) : null;
    if (!Array.isArray(leaks)) return { status: "secret", error: `gitleaks could not scan the prompt (exit ${result.code}); nothing was sent. Install gitleaks (or set AGENT_REVIEW_GITLEAKS) and retry` };
    if (!leaks.length) return { status: "clean" };
    const where = leaks.slice(0, 5).map((leak) => `${leak.RuleID} at prompt line ${leak.StartLine}`).join(", ");
    return { status: "secret", error: `gitleaks found ${leaks.length} possible secret(s) in the prompt (${where}); nothing was sent. Redact the value (a fake fixture too) and retry` };
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
}
