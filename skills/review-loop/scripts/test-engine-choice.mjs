#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const configurator = join(scriptDir, "configure-review-engines.mjs");
const root = mkdtempSync(join(tmpdir(), "review-loop-engine-choice-"));
const candidate = join(root, "candidate");
const protectedDirectory = join(root, "protected");
const output = join(protectedDirectory, "engine-choice.json");
mkdirSync(candidate);
mkdirSync(protectedDirectory);
process.on("exit", () => rmSync(root, { recursive: true, force: true }));

const baseArgs = [
  configurator,
  "--harness", "codex",
  "--reviewer-id", "review-profile",
  "--reviewer-model", "review-model",
  "--reviewer-reasoning", "high",
  "--fixer-id", "fix-profile",
  "--fixer-model", "fix-model",
  "--fixer-reasoning", "max",
  "--candidate-root", candidate,
];

function run(extraArgs = []) {
  try {
    return { ok: true, output: execFileSync(process.execPath, [...baseArgs, ...extraArgs], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) };
  } catch (error) {
    return { ok: false, output: `${error.stdout?.toString() ?? ""}${error.stderr?.toString() ?? ""}` };
  }
}

const first = run(["--output", output]);
if (!first.ok) throw new Error(`first explicit configuration failed: ${first.output}`);
const choice = JSON.parse(readFileSync(output, "utf8"));
if (choice.source !== "explicit-user-choice" || choice.reviewer.modelId !== "review-model" || choice.fixer.modelId !== "fix-model") {
  throw new Error("explicit reviewer/fixer tuples were not preserved exactly");
}
if ((statSync(output).mode & 0o777) !== 0o600) throw new Error("engine choice must be private mode 0600");

const overwrite = run(["--output", output]);
if (overwrite.ok || !overwrite.output.includes("engine choice already exists")) throw new Error("existing choice must not be replaced automatically");
const replaced = run(["--output", output, "--replace"]);
if (!replaced.ok) throw new Error(`explicit replacement failed: ${replaced.output}`);

const candidateOutput = join(candidate, "engine-choice.json");
const untrusted = run(["--output", candidateOutput]);
if (untrusted.ok || !untrusted.output.includes("outside the candidate repository")) throw new Error("candidate-local choice must be rejected");
if (readFileSync(output, "utf8").includes(root)) throw new Error("persisted choice leaked local paths");

console.log("PASS engine-choice");
