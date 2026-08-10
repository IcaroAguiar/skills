export function findingCategory(finding, isTestFile) {
  // The collector has useful deterministic *signals*, but it does not adjudicate
  // product context. A high/medium severity is therefore never a merge blocker on
  // its own. A trusted review receipt or an explicitly calibrated detector may add
  // a `gateCategory: "blocking"` disposition after that separate decision.
  if (finding.gateCategory === "blocking" && finding.adjudicated === true) return "blocking";
  if (finding.severity === "high" || finding.severity === "medium" || finding.rule) return "review-signal";
  return "informational";
}

export function normalizedGateSummary(findings, runtimeRequirements, questions, isTestFile) {
  const summary = {
    blocking: 0,
    "review-signal": 0,
    "runtime-required": runtimeRequirements.length,
    "user-input-checkpoint": questions.length,
    informational: 0,
  };
  for (const finding of findings) {
    const category = findingCategory(finding, isTestFile);
    summary[category] = (summary[category] || 0) + 1;
  }
  return summary;
}
