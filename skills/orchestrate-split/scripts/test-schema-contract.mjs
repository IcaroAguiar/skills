#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(fs.readFileSync(path.resolve(here, "../references/run.schema.json"), "utf8"));
const approval = schema.$defs.completionReceipt.allOf.find((branch) => branch.if?.properties?.kind?.const === "CODE_REVIEW_APPROVAL");
const allowedMode = approval?.then?.properties?.candidate?.properties?.mode?.const;

assert.equal(allowedMode, "commit", "CODE_REVIEW_APPROVAL must require a committed candidate");
assert.notEqual(allowedMode, "index", "CODE_REVIEW_APPROVAL must reject index candidates");
assert.notEqual(allowedMode, "worktree", "CODE_REVIEW_APPROVAL must reject worktree candidates");
console.log("PASS orchestrate-split schema contract");
