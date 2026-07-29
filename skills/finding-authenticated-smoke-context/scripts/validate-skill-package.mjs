#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = dirname(dirname(fileURLToPath(import.meta.url)));
const skillPath = join(skillDir, "SKILL.md");
const openaiPath = join(skillDir, "agents", "openai.yaml");
const pressureTestsPath = join(skillDir, "references", "pressure-tests.md");
const text = readFileSync(skillPath, "utf8");
const openai = readFileSync(openaiPath, "utf8");
const pressureTests = readFileSync(pressureTestsPath, "utf8");

const checks = [
  ["frontmatter has continuous-verb name", /^---\nname:\s*finding-authenticated-smoke-context\n[\s\S]*?\n---/m],
  ["frontmatter has trigger-rich description", /description:.*Finding approved smoke context.*authenticated browser smoke.*codex-smoke-context.*credential lookup.*401\/403.*already-running app\/API/i],
  ["defines trigger", /## Trigger[\s\S]*Do not stop at `login required`/],
  ["requires cli help and doctor", /codex-smoke-context --help[\s\S]*codex-smoke-context --json doctor/],
  ["documents app-scoped credential saves", /Credentials saved with `--app` are scoped to that app/],
  ["uses canonical CLI inspect", /codex-smoke-context inspect --repo \. --target <local\|dev\|staging\|prod> --app <app-name> --json/],
  ["documents app discovery fallback", /try `web` first[\s\S]*codex-smoke-context list --repo \./],
  ["uses portable fallback", /\$HOME\/\.local\/bin\/codex-smoke-context inspect/],
  ["hardens non-interactive source file", /private temp directory, `chmod 600` the source file before saving/],
  ["guards prod save", /--allow-prod-save[\s\S]*explicit user approval/],
  ["defines source precedence", /## Source Precedence[\s\S]*Never reuse credentials across repository/],
  ["links pressure tests", /references\/pressure-tests\.md/],
  ["forbids secret values", /Forbidden:[\s\S]*password, token, cookie, OTP, API key, private key/],
  ["treats storageState as secret-bearing", /Playwright `storageState`, cookies, localStorage, sessionStorage/],
  ["requires unsafe cli output stop", /`values_redacted` is not `true`, stop and report unsafe CLI output/],
  ["documents redacted json errors", /JSON `error\.code` and `error\.message`/],
  ["requires login failure classification", /invalid credential, wrong environment, app\/auth bug/],
  ["requires closeout evidence", /credential source status with values redacted[\s\S]*residual risk/],
];

let failed = 0;
for (const [name, pattern] of checks) {
  if (!pattern.test(text)) {
    failed += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

const mode = statSync(skillPath).mode & 0o777;
if ((mode & 0o022) !== 0) {
  failed += 1;
  console.error(`FAIL SKILL.md should not be group/world writable: ${mode.toString(8)}`);
} else {
  console.log(`PASS SKILL.md permissions: ${mode.toString(8)}`);
}

if (!/allow_implicit_invocation:\s*true/.test(openai)) {
  failed += 1;
  console.error("FAIL agents/openai.yaml must allow implicit invocation");
} else {
  console.log("PASS agents/openai.yaml implicit invocation");
}

if (!/authenticated browser smoke, login screenshots, real UI QA, credential lookup/.test(openai)) {
  failed += 1;
  console.error("FAIL agents/openai.yaml default prompt must include core triggers");
} else {
  console.log("PASS agents/openai.yaml trigger prompt");
}

if (!/asks for credentials before lookup/.test(pressureTests) || !/stops at "login required\.?"/.test(pressureTests)) {
  failed += 1;
  console.error("FAIL pressure tests must cover premature credential asks and login-required stops");
} else {
  console.log("PASS pressure tests cover common auto-invocation failures");
}

if (failed > 0) process.exit(1);
console.log("finding-authenticated-smoke-context skill package validation passed");
