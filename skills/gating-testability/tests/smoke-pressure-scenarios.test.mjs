import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const pressureTests = readFileSync(join(root, "references/pressure-tests.md"), "utf8");
const gateStatusBlocked = "BLOCKED";
const scenarioExpectations = [
  {
    name: "targeted-only microservice change blocks final proof",
    mustInclude: ["Targeted-Only", "full relevant service suite", gateStatusBlocked],
  },
  {
    name: "UI source inspection is insufficient",
    mustInclude: ["UI Change", "rendered browser evidence", gateStatusBlocked],
  },
  {
    name: "bugfix requires regression evidence",
    mustInclude: ["Bugfix Without Regression", "deterministic regression test"],
  },
  {
    name: "auth boundary needs negative evidence",
    mustInclude: ["Auth Boundary", "wrong-tenant", "negative evidence"],
  },
  {
    name: "flaky rerun preserves failure signature",
    mustInclude: ["Flaky", "first failing signature", gateStatusBlocked],
  },
  {
    name: "contract change needs consumer evidence",
    mustInclude: ["Contract Change", "provider/consumer contract"],
  },
];

for (const expectation of scenarioExpectations) {
  for (const requiredText of expectation.mustInclude) {
    assert.equal(
      pressureTests.includes(requiredText),
      true,
      `${expectation.name}: missing "${requiredText}"`,
    );
  }
}

process.stdout.write("PASS: pressure scenarios enforce expected outcomes\n");
