const strongEnforcementModes = new Set([
  "native_strict",
  "tool_strict",
  "posthoc_json_schema",
]);

export function deriveStructuredResultTrustDecision(receipt) {
  const { contract, generation, semantic_checks: semanticChecks } = receipt;

  if (!contract.channel_preserved) {
    return { state: "rejected", route: "stop", overrideRequired: true };
  }

  if (contract.validation_passed === false || generation.final_acceptance === "rejected") {
    return { state: "rejected", route: "stop", overrideRequired: true };
  }

  if (contract.enforcement_mode === "none" || contract.validation_engine === "none") {
    return { state: "unknown", route: "stop", overrideRequired: true };
  }

  if (semanticChecks.status === "failed") {
    return { state: "degraded", route: "stop", overrideRequired: true };
  }

  if (contract.enforcement_mode === "shape_only") {
    return { state: "degraded", route: "human_review", overrideRequired: true };
  }

  const recovered = generation.attempts_used > 1 || generation.validation_failures > 0;
  if (recovered) {
    if (
      !generation.retry_exhausted &&
      contract.validation_passed === true &&
      semanticChecks.status === "passed" &&
      strongEnforcementModes.has(contract.enforcement_mode)
    ) {
      return { state: "recovered", route: "allow", overrideRequired: false };
    }
    return { state: "degraded", route: "human_review", overrideRequired: true };
  }

  if (
    contract.validation_passed === true &&
    semanticChecks.status === "passed" &&
    strongEnforcementModes.has(contract.enforcement_mode)
  ) {
    return { state: "trusted", route: "allow", overrideRequired: false };
  }

  return { state: "unknown", route: "stop", overrideRequired: true };
}
