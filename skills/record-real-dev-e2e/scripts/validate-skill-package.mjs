#!/usr/bin/env node
import { readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = dirname(dirname(fileURLToPath(import.meta.url)));
const skill = readFileSync(join(skillDir, "SKILL.md"), "utf8");
const openai = readFileSync(join(skillDir, "agents", "openai.yaml"), "utf8");
const pressure = readFileSync(join(skillDir, "references", "pressure-tests.md"), "utf8");
const installAudit = readFileSync(join(skillDir, "scripts", "audit-global-install.mjs"), "utf8");

const checks = [
  ["frontmatter", /^---\nname: record-real-dev-e2e\ndescription: .+\n---/],
  ["real proof standard", /Real environment[\s\S]*Real interaction[\s\S]*Visible causality[\s\S]*Disclosed setup[\s\S]*Bounded claims/],
  ["neutral labels", /`Teste 1`[\s\S]*`Teste Automatizado`/],
  ["natural interaction", /GUI or mobile:[\s\S]*CLI:[\s\S]*API:/],
  ["observable human pacing", /cursor visible[\s\S]*plausible paths[\s\S]*natural, purposeful pace[\s\S]*long idle pauses/],
  ["agnostic scope", /independent of product domain, repository layout, framework, feature type, interaction medium, or delivery channel/],
  ["generic evidence matrix", /Superficie A[\s\S]*Superficie B/],
  ["conditional time branch", /Handle time-dependent features when required[\s\S]*branch is not applicable/],
  ["global clock guard", /Never change the global clock of the machine, runtime host, shared server, container, or database/],
  ["secret boundary", /Never expose passwords, tokens, cookies, storage state/],
  ["identity masking", /Always mask or crop email addresses, names, avatars, organization identifiers/],
  ["auth fallback", /reuse an approved authenticated session[\s\S]*ask the user to authenticate in the selected application outside the capture/],
  ["artifact verification", /nonblank frames[\s\S]*interaction indicator appropriate to the surface[\s\S]*delivery constraints when applicable[\s\S]*target channel requires it[\s\S]*manifest matches/],
  ["generic time transition", /expected transition, side effect, expiration, schedule, or unchanged boundary/],
  ["optional negative path", /negative or edge path when meaningful/],
  ["agnostic manifest", /Alvo: <ambiente, dispositivo ou runtime>[\s\S]*caminho secundario, negativo ou N\/A[\s\S]*checks aplicaveis ou N\/A[\s\S]*canal solicitado e status de acesso/],
  ["channel-neutral delivery", /pull request, issue, document, chat attachment, shared storage, or local artifact[\s\S]*intended audience can access/],
  ["implicit invocation", /allow_implicit_invocation:\s*true/],
  ["pressure naming guard", /visible labels remain neutral, such as `Teste 1` or `Teste Automatizado`/],
  ["pressure background capture", /application-owned, browser-owned, emulator, or device capture is preferred/],
  ["pressure mobile", /device or emulator capture shows taps or state transitions appropriate to mobile/],
  ["pressure API", /supported real client or consumer path shows sanitized request intent/],
  ["pressure public flow", /authentication is marked not applicable/],
  ["pressure local delivery", /exact local path with no remote attachment requirement/],
  ["pressure human pacing", /pointer or touch indicator remains visible[\s\S]*plausible paths[\s\S]*overall pace is purposeful/],
  ["pressure install audit", /node scripts\/audit-global-install\.mjs/],
  ["global install auditor", /Global install audit passed/],
];

const combinedGuidance = `${skill}\n${openai}\n${pressure}`;
for (const domainTerm of ["Admin", "Member", "Membro", "Tetra", "periodicidade", "enrollment"]) {
  checks.push([`agnostic term guard: ${domainTerm}`, new RegExp(`^(?![\\s\\S]*\\b${domainTerm}\\b)[\\s\\S]*$`, "i")]);
}

let failed = 0;
for (const [name, pattern] of checks) {
  const source = name.startsWith("agnostic term guard") ? combinedGuidance : name === "global install auditor" ? installAudit : name.startsWith("pressure") ? pressure : name === "implicit invocation" ? openai : skill;
  if (!pattern.test(source)) {
    failed += 1;
    console.error(`FAIL ${name}`);
  } else {
    console.log(`PASS ${name}`);
  }
}

for (const path of ["SKILL.md", "agents/openai.yaml", "references/pressure-tests.md"]) {
  const mode = statSync(join(skillDir, path)).mode & 0o777;
  if ((mode & 0o022) !== 0) {
    failed += 1;
    console.error(`FAIL unsafe permissions ${path}: ${mode.toString(8)}`);
  }
}

if (failed > 0) process.exit(1);
console.log("record-real-dev-e2e skill package validation passed");
