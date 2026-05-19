#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function path(file) {
  return join(repoRoot, file);
}

function read(file) {
  return readFileSync(path(file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function readSection(text, startHeading, nextHeading) {
  const startIndex = text.indexOf(startHeading);
  if (startIndex === -1) return "";
  const endIndex = text.indexOf(nextHeading, startIndex + startHeading.length);
  return endIndex === -1 ? text.slice(startIndex) : text.slice(startIndex, endIndex);
}

function requireFile(file) {
  if (!existsSync(path(file))) failures.push(`missing_${file}`);
}

function requireIncludes(label, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) failures.push(`${label}_missing_${phrase}`);
  }
}

function rejectUnsafeClaims(label, text) {
  const forbidden = [
    /official\s+(OpenClaw|ClawHub|MCP|ADK|OpenAI|Anthropic|A2A|Google|Cisco|Outshift|AGNTCY|xAI|Grok|CrewAI)\s+(integration|listing|approval|endorsement|partnership)/i,
    /(OpenClaw|ClawHub|MCP|ADK|OpenAI|Anthropic|A2A|Google|Cisco|Outshift|AGNTCY|xAI|Grok|CrewAI)\s+(approved|endorsed|listed|partnered|validated)\b/i,
    /provider\s+(approval|listing|endorsement|partnership)\s+(exists|is claimed|is live)/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /Neura\s+performs\s+(the\s+)?tool/i,
    /full\s+runtime\s+taint[\s-]?tracking\s+(is\s+)?(solved|claimed|guaranteed)/i,
    /public\s+(token|API-key)\s+issuance\s+(is\s+)?(enabled|available|live)/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseJsonOutput(result, label) {
  if (result.status !== 0) {
    failures.push(`${label}_failed_${result.status}_${result.stderr || result.stdout}`);
    return null;
  }

  try {
    return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
  } catch (error) {
    failures.push(`${label}_not_json_${error.message}`);
    return null;
  }
}

function collectExactKeys(value, keys = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectExactKeys(item, keys);
  } else if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      keys.push(key);
      collectExactKeys(nested, keys);
    }
  }
  return keys;
}

function expectEqual(label, actual, expected) {
  if (actual !== expected) failures.push(`${label}_expected_${expected}_got_${actual}`);
}

const requiredFiles = [
  "README.md",
  "docs/flow-aware-authority-gate-proof.md",
  "examples/flow-aware-authority/run-proof.mjs",
  "scripts/verify-flow-aware-authority-gate.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
expectEqual(
  "package_script_proof_flow_gate",
  packageJson.scripts?.["proof:flow-aware-authority"],
  "node examples/flow-aware-authority/run-proof.mjs",
);
expectEqual(
  "package_script_verify_flow_gate",
  packageJson.scripts?.["verify:flow-aware-authority-gate"],
  "node scripts/verify-flow-aware-authority-gate.mjs",
);

const readme = read("README.md");
requireIncludes("readme", readme, [
  "Flow-Aware Authority Gate: Security Depth Proof",
  "npm run proof:flow-aware-authority -- --dry-run --json",
  "npm run verify:flow-aware-authority-gate",
  "docs/flow-aware-authority-gate-proof.md",
  "source refs, transformation refs, sink/destination refs",
  "authority freshness/scope refs",
  "tool side-effect refs",
  "exact-call `params_hash`",
  "20 deterministic dry-run scenarios",
  "SQL/base64/public-sink",
  "indirect prompt injection",
  "tool poisoning",
  "excessive agency",
  "secret leakage",
  "memory poisoning",
  "cross-tenant leaks",
  "browser submits",
  "package publishes",
  "permission changes",
  "workflow state changes",
  "deployment changes",
  "multi-agent handoff loss",
  "stale authority",
  "hidden tool side effects",
  "allowed tool / forbidden data movement",
  "no downstream execution by Neura",
  "no private payload persistence",
  "no provider/listing/partnership claim",
  "no full runtime taint-tracking claim",
  "no claim that all possible scenarios are covered",
]);
rejectUnsafeClaims(
  "readme_flow_section",
  readSection(readme, "## Flow-Aware Authority Gate: Security Depth Proof", "## Package Reality: Start Here"),
);

const docs = read("docs/flow-aware-authority-gate-proof.md");
requireIncludes("docs", docs, [
  "Flow-Aware Authority Gate Proof v0.1",
  "Status: public dry-run proof",
  "source refs",
  "transformation refs",
  "sink/destination refs",
  "purpose and authority refs",
  "Flow-Aware Action Card",
  "Decision Receipt",
  "developer-owned execution",
  "transformations preserve sensitivity by default",
  "Reversible obfuscation such as base64 is still the same data",
  "npm run proof:flow-aware-authority -- --dry-run --json",
  "npm run verify:flow-aware-authority-gate",
  "sql-confidential-base64-reddit",
  "markdown-image-url-exfiltration",
  "poisoned-tool-output-send-payment-link",
  "tool-poisoned-schema-shadow",
  "excessive-agency-bulk-action-plan",
  "secret-ref-to-public-log",
  "browser-submit-missing-field-refs",
  "memory-write-private-note-no-retention",
  "memory-poisoning-untrusted-context",
  "package-publish-missing-provenance",
  "permission-change-without-security-review",
  "workflow-transition-missing-rollback",
  "cross-tenant-export-wrong-recipient",
  "stale-authority-after-revocation",
  "hidden-tool-side-effect-webhook",
  "ocr-screenshot-confidential-to-chat",
  "embedding-confidential-shared-vector-store",
  "multi-agent-handoff-loses-labels",
  "approved-aggregate-internal-dashboard",
  "production-deploy-complete-refs",
  "changed sink",
  "changed transformation",
  "changed source labels",
  "changed destination trust",
  "tool poisoning",
  "excessive agency",
  "secret leakage",
  "memory poisoning",
  "permission change",
  "workflow state change",
  "stale authority",
  "hidden tool side effects",
  "no downstream execution by Neura",
  "no private payload persistence",
  "no provider approval, listing, endorsement, integration, or partnership claim",
  "no full runtime taint-tracking claim",
  "no public token issuance, provider submission, website update, public GitHub comment, or package publish",
  "no claim that all possible scenarios are covered",
]);
rejectUnsafeClaims("docs", docs);

const runner = read("examples/flow-aware-authority/run-proof.mjs");
requireIncludes("runner", runner, [
  "deriveActionCardFromFlow",
  "flow_aware_runtime_invocation_envelope",
  "source_transformation_sink_refs_bound",
  "transformations_preserve_sensitivity_by_default: true",
  "reversible_obfuscation_is_not_declassification: true",
  "fail_closed_when_flow_refs_missing: true",
  "runtime_must_recheck_flow_binding_before_execution: true",
  "private_payload_persisted: false",
  "downstream_execution_by_neura: false",
  "full_runtime_taint_tracking_claim: false",
  "all_possible_scenarios_claim: false",
]);
rejectUnsafeClaims("runner", runner);

const firstRun = run("npm", ["run", "proof:flow-aware-authority", "--", "--dry-run", "--json"]);
const secondRun = run("npm", ["run", "proof:flow-aware-authority", "--", "--dry-run", "--json"]);
const output = parseJsonOutput(firstRun, "proof_command");
parseJsonOutput(secondRun, "proof_command_second_run");

if (firstRun.stdout !== secondRun.stdout) failures.push("proof_output_not_deterministic");

if (output) {
  expectEqual("proof_output_ok", output.ok, true);
  expectEqual("proof_name", output.proof, "flow-aware-authority-gate-proof");
  expectEqual("proof_mode", output.mode, "local_dry_run_flow_gate_no_downstream_execution");
  expectEqual("proof_count", output.count, 20);
  requireIncludes("proof_pattern", (output.pattern ?? []).join(" -> "), [
    "runtime/tool invocation",
    "source refs",
    "transformation refs",
    "sink/destination refs",
    "purpose and authority refs",
    "Flow-Aware Action Card",
    "Decision Receipt",
    "developer-owned execution",
  ]);

  const expectedBindingFields = [
    "call_ref",
    "actor_ref",
    "runtime_ref",
    "tool_ref",
    "action_ref",
    "target_ref",
    "source_refs",
    "transformations",
    "sink_ref",
    "destination_trust",
    "purpose_ref",
    "authority_refs",
    "tool_side_effect_refs",
    "data_labels",
    "params_hash",
    "policy_refs",
    "evidence_refs",
    "source",
    "campaign",
    "surface",
  ];

  if (JSON.stringify(output.binding_fields) !== JSON.stringify(expectedBindingFields)) {
    failures.push("proof_binding_fields_changed");
  }

  const forbiddenKeys = new Set([
    "params",
    "payload",
    "privatePayload",
    "rawPayload",
    "raw_params",
    "token",
    "access_token",
    "secret",
    "password",
    "email",
    "body",
    "content",
    "messageBody",
    "fileContents",
    "formValues",
    "rawCommand",
  ]);
  for (const key of collectExactKeys(output)) {
    if (forbiddenKeys.has(key)) failures.push(`proof_forbidden_key_${key}`);
  }

  const serializedOutput = JSON.stringify(output);
  for (const unsafe of [
    "customer@example.com",
    "PRIVATE_",
    "SECRET",
    "PASSWORD",
    "access_token",
    "token_value",
    "rawCustomerData",
    "rawPolicyDocument",
    "fileContents",
    "formValues",
  ]) {
    if (serializedOutput.includes(unsafe)) failures.push(`proof_unsafe_value_${unsafe}`);
  }

  const expectedDecisions = {
    "sql-confidential-base64-reddit": "stop",
    "markdown-image-url-exfiltration": "stop",
    "poisoned-tool-output-send-payment-link": "stop",
    "tool-poisoned-schema-shadow": "stop",
    "excessive-agency-bulk-action-plan": "stop",
    "secret-ref-to-public-log": "stop",
    "browser-submit-missing-field-refs": "revise",
    "memory-write-private-note-no-retention": "revise",
    "memory-poisoning-untrusted-context": "stop",
    "package-publish-missing-provenance": "stop",
    "permission-change-without-security-review": "stop",
    "workflow-transition-missing-rollback": "revise",
    "cross-tenant-export-wrong-recipient": "stop",
    "stale-authority-after-revocation": "stop",
    "hidden-tool-side-effect-webhook": "stop",
    "ocr-screenshot-confidential-to-chat": "stop",
    "embedding-confidential-shared-vector-store": "human_review",
    "multi-agent-handoff-loses-labels": "human_review",
    "approved-aggregate-internal-dashboard": "proceed",
    "production-deploy-complete-refs": "stop",
  };

  const seenResults = new Map((output.results ?? []).map((result) => [result.scenario, result]));
  for (const [scenario, decision] of Object.entries(expectedDecisions)) {
    const result = seenResults.get(scenario);
    if (!result) {
      failures.push(`missing_result_${scenario}`);
      continue;
    }

    const envelope = result.flow_invocation_envelope;
    const actionCard = result.action_card;
    const receipt = result.decision_receipt;
    const route = result.runtime_owned_route;
    const flowGate = receipt?.flow_gate;

    for (const field of expectedBindingFields) {
      if (envelope?.[field] === undefined) failures.push(`${scenario}_missing_envelope_${field}`);
    }

    if (!/^sha256:[0-9a-f]{64}$/.test(envelope?.params_hash ?? "")) {
      failures.push(`${scenario}_bad_params_hash`);
    }
    expectEqual(`${scenario}_envelope_refs_only`, envelope?.refs_only, true);
    expectEqual(`${scenario}_envelope_params_hash_only`, envelope?.params_hash_only, true);
    expectEqual(`${scenario}_envelope_private_payload`, envelope?.private_payload_persisted, false);
    expectEqual(`${scenario}_envelope_downstream_execution`, envelope?.downstream_execution_by_neura, false);

    expectEqual(`${scenario}_derived_from`, actionCard?.derived_from, "flow_aware_runtime_invocation_envelope");
    expectEqual(`${scenario}_derived_call_ref`, actionCard?.derived_from_call_ref, envelope?.call_ref);
    expectEqual(`${scenario}_action_refs_only`, actionCard?.refs_only, true);
    expectEqual(`${scenario}_action_tool_ref`, actionCard?.proposed_action?.tool_ref, envelope?.tool_ref);
    expectEqual(`${scenario}_action_target_ref`, actionCard?.proposed_action?.target_ref, envelope?.target_ref);
    expectEqual(`${scenario}_action_params_hash`, actionCard?.proposed_action?.params_hash, envelope?.params_hash);
    expectEqual(`${scenario}_flow_sink_ref`, actionCard?.flow_authority?.sink_ref, envelope?.sink_ref);
    expectEqual(`${scenario}_flow_purpose_ref`, actionCard?.flow_authority?.purpose_ref, envelope?.purpose_ref);
    expectEqual(`${scenario}_flow_binding_exact`, actionCard?.flow_authority?.valid_only_for_exact_flow, true);

    expectEqual(`${scenario}_receipt_decision`, receipt?.decision, decision);
    expectEqual(`${scenario}_receipt_route`, receipt?.route, decision);
    expectEqual(`${scenario}_receipt_refs_only`, receipt?.refs_only, true);
    expectEqual(`${scenario}_receipt_private_payload`, receipt?.private_payload_persisted, false);
    expectEqual(`${scenario}_receipt_downstream_execution`, receipt?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_receipt_binding_exact`, receipt?.binding?.valid_only_for_exact_flow, true);
    expectEqual(`${scenario}_receipt_binding_hash`, receipt?.binding?.envelope_hash, actionCard?.flow_authority?.envelope_hash);
    expectEqual(`${scenario}_receipt_call_ref`, receipt?.binding?.call_ref, envelope?.call_ref);

    if (!/^receipt_ref_flow_gate_[0-9a-f]{16}$/.test(receipt?.receipt_ref ?? "")) {
      failures.push(`${scenario}_bad_receipt_ref`);
    }
    if (!/^trace_ref_flow_gate_[0-9a-f]{16}$/.test(receipt?.trace_ref ?? "")) {
      failures.push(`${scenario}_bad_trace_ref`);
    }
    if (!/^relay_txn_flow_gate_[0-9a-f]{16}$/.test(receipt?.transaction_ref ?? "")) {
      failures.push(`${scenario}_bad_transaction_ref`);
    }

    expectEqual(`${scenario}_flow_gate_refs_only`, flowGate?.refs_only, true);
    expectEqual(
      `${scenario}_preserve_sensitivity`,
      flowGate?.transformations_preserve_sensitivity_by_default,
      true,
    );
    expectEqual(
      `${scenario}_reversible_not_declassification`,
      flowGate?.reversible_obfuscation_is_not_declassification,
      true,
    );
    expectEqual(`${scenario}_fail_closed_missing_refs`, flowGate?.fail_closed_when_flow_refs_missing, true);

    expectEqual(`${scenario}_route_owner`, route?.route_owner, "developer_runtime");
    expectEqual(`${scenario}_route_receipt_ref`, route?.receipt_ref, receipt?.receipt_ref);
    expectEqual(`${scenario}_route_trace_ref`, route?.trace_ref, receipt?.trace_ref);
    expectEqual(`${scenario}_route_recheck`, route?.runtime_must_recheck_flow_binding_before_execution, true);
    expectEqual(`${scenario}_route_runtime_owns`, route?.runtime_owns_execution_decision, true);
    expectEqual(`${scenario}_route_dry_run_execution`, route?.downstream_tool_executed_in_dry_run, false);
    expectEqual(`${scenario}_route_neura_execution`, route?.execution_performed_by_neura, false);
    expectEqual(`${scenario}_trace_private_payload`, result.trace?.private_payload_persisted, false);
    expectEqual(`${scenario}_trace_downstream_execution`, result.trace?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_boundary_exact`, result.boundaries?.receipt_valid_only_for_exact_flow, true);
    expectEqual(`${scenario}_boundary_runtime_owned`, result.boundaries?.runtime_owned_execution, true);
    expectEqual(`${scenario}_boundary_provider_claim`, result.boundaries?.provider_listing_or_partnership_claim, false);
    expectEqual(`${scenario}_boundary_taint_claim`, result.boundaries?.full_runtime_taint_tracking_claim, false);
    expectEqual(`${scenario}_boundary_all_scenarios_claim`, result.boundaries?.all_possible_scenarios_claim, false);
  }

  const sqlScenario = seenResults.get("sql-confidential-base64-reddit");
  expectEqual("sql_scenario_failure_class", sqlScenario?.failure_class, "reversible_obfuscation_exfiltration");
  expectEqual(
    "sql_scenario_reversible_detected",
    sqlScenario?.decision_receipt?.flow_gate?.checks?.reversible_transform_detected,
    true,
  );
  expectEqual(
    "sql_scenario_destination_blocked",
    sqlScenario?.decision_receipt?.flow_gate?.checks?.destination_allows_effective_data_class,
    false,
  );

  const requiredFailureClasses = [
    "reversible_obfuscation_exfiltration",
    "covert_exfiltration_channel",
    "indirect_prompt_injection_to_external_action",
    "tool_poisoning_schema_or_metadata",
    "excessive_agency_scope_creep",
    "secret_leakage_to_untrusted_sink",
    "browser_submit_missing_field_value_refs",
    "memory_write_missing_retention_scope",
    "memory_poisoning_persistent_context",
    "supply_chain_release_needs_manual_review",
    "cross_tenant_boundary_violation",
    "unauthorized_data_to_public_or_external_sink",
    "lost_or_missing_flow_labels",
    "permission_change_without_security_review",
    "workflow_state_change_missing_rollback",
    "stale_or_revoked_authority",
    "hidden_tool_side_effects",
    "privacy_sensitive_flow_needs_review",
    "flow_authorized",
    "critical_runtime_change_needs_human_release",
  ];
  for (const failureClass of requiredFailureClasses) {
    if (!(output.failure_classes ?? []).includes(failureClass)) {
      failures.push(`missing_failure_class_${failureClass}`);
    }
  }

  expectEqual("decision_count_stop", output.decisions?.stop, 14);
  expectEqual("decision_count_revise", output.decisions?.revise, 3);
  expectEqual("decision_count_human_review", output.decisions?.human_review, 2);
  expectEqual("decision_count_proceed", output.decisions?.proceed, 1);

  const checks = new Map((output.binding_checks ?? []).map((check) => [check.scenario, check]));
  const unchanged = checks.get("unchanged-flow");
  const changedSink = checks.get("changed-sink");
  const changedTransform = checks.get("changed-transformation");
  const changedSourceLabels = checks.get("changed-source-labels");
  const changedDestinationTrust = checks.get("changed-destination-trust");

  expectEqual("unchanged_applicable", unchanged?.applicable, true);
  if ((unchanged?.changed_fields ?? []).length !== 0) failures.push("unchanged_changed_fields_not_empty");

  expectEqual("changed_sink_applicable", changedSink?.applicable, false);
  if (!(changedSink?.changed_fields ?? []).includes("sink_ref")) {
    failures.push("changed_sink_missing_sink_ref");
  }

  expectEqual("changed_transform_applicable", changedTransform?.applicable, false);
  if (!(changedTransform?.changed_fields ?? []).includes("transformations")) {
    failures.push("changed_transform_missing_transformations");
  }

  expectEqual("changed_source_labels_applicable", changedSourceLabels?.applicable, false);
  if (!(changedSourceLabels?.changed_fields ?? []).includes("data_labels")) {
    failures.push("changed_source_labels_missing_data_labels");
  }

  expectEqual("changed_destination_trust_applicable", changedDestinationTrust?.applicable, false);
  if (!(changedDestinationTrust?.changed_fields ?? []).includes("destination_trust")) {
    failures.push("changed_destination_trust_missing_destination_trust");
  }

  expectEqual("root_private_payload_boundary", output.boundaries?.private_payload_persisted, false);
  expectEqual("root_downstream_boundary", output.boundaries?.downstream_execution_by_neura, false);
  expectEqual("root_runtime_owned_boundary", output.boundaries?.runtime_owned_execution, true);
  expectEqual("root_provider_claim_boundary", output.boundaries?.provider_listing_or_partnership_claim, false);
  expectEqual("root_taint_claim_boundary", output.boundaries?.full_runtime_taint_tracking_claim, false);
  expectEqual("root_all_scenarios_boundary", output.boundaries?.all_possible_scenarios_claim, false);
  expectEqual("root_public_distribution_boundary", output.boundaries?.public_distribution_action, false);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "flow-aware-authority-gate",
      command: "npm run proof:flow-aware-authority -- --dry-run --json",
      scenarios: [
        "sql-confidential-base64-reddit",
        "markdown-image-url-exfiltration",
        "poisoned-tool-output-send-payment-link",
        "tool-poisoned-schema-shadow",
        "excessive-agency-bulk-action-plan",
        "secret-ref-to-public-log",
        "browser-submit-missing-field-refs",
        "memory-write-private-note-no-retention",
        "memory-poisoning-untrusted-context",
        "package-publish-missing-provenance",
        "permission-change-without-security-review",
        "workflow-transition-missing-rollback",
        "cross-tenant-export-wrong-recipient",
        "stale-authority-after-revocation",
        "hidden-tool-side-effect-webhook",
        "ocr-screenshot-confidential-to-chat",
        "embedding-confidential-shared-vector-store",
        "multi-agent-handoff-loses-labels",
        "approved-aggregate-internal-dashboard",
        "production-deploy-complete-refs",
      ],
      boundaries: [
        "deterministic local dry-run output",
        "source transformation sink purpose and authority are bound",
        "receipt invalidates on changed source labels, transform, sink, or destination trust",
        "reversible obfuscation does not declassify sensitive data",
        "no private payload persistence",
        "no downstream execution by Neura",
        "no provider/listing/endorsement/partnership claim",
        "no all-scenarios guarantee",
      ],
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
