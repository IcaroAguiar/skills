import assert from "node:assert/strict";
import { cooldownKey } from "./lib/ledger.mjs";
import { nativeReviewFallback } from "./lib/policy.mjs";

const front = {
  name: "fixture",
  providers: {
    codex: { kind: "codex", bin: "/fixture/codex", model: "gpt-model-a", t3: { providerInstanceId: "codex-corp", model: "gpt-model-a" } },
    claude: { kind: "claude", bin: "/fixture/claude", model: "claude-sonnet-5-5" },
  },
  roles: { review: ["codex", "claude"] },
};
const limited = { status: "limit", until: "2999-01-01T00:00:00Z" };
const authorModel = "gpt-model-a";
const cooled = new Map([[cooldownKey("fixture", "claude"), limited]]);
const route = nativeReviewFallback(front, { authorModel, cooled });
assert.equal(route.providerInstanceId, "codex-corp");
assert.equal(route.model, authorModel);
assert.equal(route.freshContext, true);
assert.equal(route.effort, "high");
assert.equal(nativeReviewFallback(front, { authorModel }), null, "available peer keeps priority");
assert.equal(nativeReviewFallback(front, { authorModel, cooled: new Map([...cooled, [cooldownKey("fixture", "codex"), limited]]) }), null, "limited owning account is not bypassed");
assert.equal(nativeReviewFallback(front, { cooled }), null, "human or unspecified author follows the normal chain");
assert.equal(nativeReviewFallback({ ...front, roles: { review: ["claude"] } }, { authorModel, cooled }), null, "cannot use another front's account");
assert.equal(nativeReviewFallback({ ...front, providers: { ...front.providers, codex: { ...front.providers.codex, t3: undefined } } }, { authorModel, cooled }), null, "requires an explicit runtime account");
console.log("native review fallback: 6 contract scenarios passed (no model calls)");
