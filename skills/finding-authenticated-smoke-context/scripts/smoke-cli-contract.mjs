#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const home = process.env.HOME;
const candidates = [
  "codex-smoke-context",
  home ? join(home, ".local", "bin", "codex-smoke-context") : null,
].filter(Boolean);

const cli = candidates.find((candidate) => {
  if (candidate.includes("/")) return existsSync(candidate);
  try {
    execFileSync("which", [candidate], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return true;
  } catch {
    return false;
  }
});

if (!cli) {
  console.error("FAIL codex-smoke-context not found in PATH or $HOME/.local/bin");
  process.exit(1);
}

const helpOutput = execFileSync(cli, ["--help"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

for (const expected of ["--json doctor", "inspect", "save-credential", "Never prints credential values"]) {
  if (!helpOutput.includes(expected)) {
    console.error(`FAIL help output missing: ${expected}`);
    process.exit(1);
  }
}

const doctorOutput = execFileSync(cli, ["--json", "doctor"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});
const doctor = JSON.parse(doctorOutput);
if (doctor.command !== "doctor" || doctor.values_redacted !== true || typeof doctor.ok !== "boolean" || !doctor.summary) {
  console.error("FAIL doctor JSON contract is incomplete");
  process.exit(1);
}

const output = execFileSync(cli, [
  "inspect",
  "--repo",
  ".",
  "--target",
  "local",
  "--app",
  "web",
  "--json",
], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const payload = JSON.parse(output);
const requiredKeys = [
  "command",
  "repo",
  "project",
  "app",
  "target",
  "credential_status",
  "values_redacted",
  "blockers",
];

for (const key of requiredKeys) {
  if (!(key in payload)) {
    console.error(`FAIL missing key: ${key}`);
    process.exit(1);
  }
}

if (payload.command !== "inspect") {
  console.error(`FAIL unexpected command: ${payload.command}`);
  process.exit(1);
}

if (payload.values_redacted !== true) {
  console.error("FAIL values_redacted must be true");
  process.exit(1);
}

if (JSON.stringify(payload).match(/password=|token=|secret=|cookie=/i)) {
  console.error("FAIL output appears to contain secret-bearing key/value text");
  process.exit(1);
}

const badCommand = "bad-token=SHOULD_NOT_APPEAR";
try {
  execFileSync(cli, [badCommand, "--json"], {
    cwd: process.cwd(),
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  console.error("FAIL bad command unexpectedly succeeded");
  process.exit(1);
} catch (error) {
  const stderr = error.stderr?.toString() || "";
  const parsed = JSON.parse(stderr);
  if (parsed.values_redacted !== true || parsed.error?.message?.includes("SHOULD_NOT_APPEAR")) {
    console.error("FAIL JSON error output was not safely redacted");
    process.exit(1);
  }
}

const tempRoot = mkdtempSync(join(tmpdir(), "codex-smoke-context-contract-"));
const repo = join(tempRoot, "repo");
mkdirSync(repo);
const source = join(tempRoot, "source.env");
const destination = join(tempRoot, "web-a.env");
const registry = join(tempRoot, "registry.json");
writeFileSync(source, "SMOKE_USERNAME=user@example.com\nSMOKE_PASSWORD=contract-test\n", { mode: 0o600 });

execFileSync(cli, [
  "--json",
  "save-credential",
  "--repo",
  repo,
  "--target",
  "local",
  "--project",
  "contract-project",
  "--app",
  "web-a",
  "--source-file",
  source,
  "--destination",
  destination,
  "--registry",
  registry,
], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
});

const webA = JSON.parse(execFileSync(cli, [
  "--json",
  "inspect",
  "--repo",
  repo,
  "--target",
  "local",
  "--project",
  "contract-project",
  "--app",
  "web-a",
  "--registry",
  registry,
], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}));

const webB = JSON.parse(execFileSync(cli, [
  "--json",
  "inspect",
  "--repo",
  repo,
  "--target",
  "local",
  "--project",
  "contract-project",
  "--app",
  "web-b",
  "--registry",
  registry,
], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
}));

if (webA.credential_status !== "found" || webB.credential_status !== "missing") {
  console.error("FAIL app-scoped save/inspect credential boundary regressed");
  process.exit(1);
}

console.log("codex-smoke-context inspect contract passed with values redacted");
