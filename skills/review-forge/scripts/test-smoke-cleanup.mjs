#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, mkdtempSync, readdirSync, rmdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const smoke = join(scriptDir, "smoke-review-toolbelt.mjs");
const parent = mkdtempSync(join(tmpdir(), "review-forge-smoke-cleanup-"));

function removeOwnedTree(path) {
  let stat;
  try {
    stat = lstatSync(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  if (stat.isDirectory() && !stat.isSymbolicLink()) {
    for (const entry of readdirSync(path)) removeOwnedTree(join(path, entry));
    rmdirSync(path);
    return;
  }
  unlinkSync(path);
}

function run(root, extraEnv = {}) {
  try {
    execFileSync(process.execPath, [smoke], {
      encoding: "utf8",
      env: { ...process.env, REVIEW_FORGE_SMOKE_ROOT: root, ...extraEnv },
      stdio: ["ignore", "pipe", "pipe"],
    });
    return true;
  } catch {
    return false;
  }
}

try {
  const successRoot = join(parent, "success");
  if (!run(successRoot)) throw new Error("smoke success path failed");
  if (existsSync(successRoot)) throw new Error("smoke success path leaked its owned temporary root");

  const failureRoot = join(parent, "failure");
  if (run(failureRoot, { REVIEW_FORGE_SMOKE_FAIL_AFTER_SETUP: "1" })) throw new Error("injected smoke failure unexpectedly passed");
  if (existsSync(failureRoot)) throw new Error("smoke failure path leaked its owned temporary root");
  console.log("PASS smoke-cleanup success-and-failure");
} finally {
  removeOwnedTree(parent);
}
