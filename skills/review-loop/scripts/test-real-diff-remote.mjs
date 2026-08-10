#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

if (!process.argv.includes("--network")) {
  console.error("Usage: test-real-diff-remote.mjs --network");
  console.error("This explicit test fetches GitHub and verifies the public Flask discovery artifact.");
  process.exit(1);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const validator = resolve(scriptDirectory, "validate-real-diff-corpus.mjs");
const example = resolve(scriptDirectory, "..", "templates", "real-diff-corpus.example.json");
const result = spawnSync(process.execPath, [validator, example, "--verify-remote"], { encoding: "utf8" });
process.stdout.write(result.stdout);
process.stderr.write(result.stderr);
if (result.status !== 0) process.exit(result.status ?? 1);
