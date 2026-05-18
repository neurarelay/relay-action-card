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
    /official\s+(OpenClaw|ClawHub|MCP|ADK|OpenAI|Anthropic|A2A|Google|Cisco|Outshift|AGNTCY)\s+(integration|listing|approval|endorsement|partnership)/i,
    /(OpenClaw|ClawHub|MCP|ADK|OpenAI|Anthropic|A2A|Google|Cisco|Outshift|AGNTCY)\s+(approved|endorsed|listed|partnered|validated)\b/i,
    /provider\s+(approval|listing|endorsement|partnership)\s+(exists|is claimed|is live)/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /Neura\s+performs\s+(the\s+)?tool/i,
    /full\s+data-flow\s+provenance\s+(is\s+)?(solved|claimed|guaranteed)/i,
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
  "docs/runtime-bound-action-card-proof.md",
  "examples/runtime-binding/run-proof.mjs",
  "scripts/verify-runtime-bound-action-card-proof.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
expectEqual(
  "package_script_proof_runtime_binding",
  packageJson.scripts?.["proof:runtime-binding"],
  "node examples/runtime-binding/run-proof.mjs",
);
expectEqual(
  "package_script_verify_runtime_binding",
  packageJson.scripts?.["verify:runtime-bound-action-card-proof"],
  "node scripts/verify-runtime-bound-action-card-proof.mjs",
);

const docs = read("docs/runtime-bound-action-card-proof.md");
requireIncludes("docs", docs, [
  "actual runtime/tool invocation",
  "derived Action Card",
  "Relay Decision Receipt",
  "receipt valid only for that exact call",
  "runtime-owned",
  "npm run proof:runtime-binding -- --dry-run --json",
  "npm run verify:runtime-bound-action-card-proof",
  "call_ref",
  "actor_ref",
  "runtime_ref",
  "tool_ref",
  "target_ref",
  "params_hash",
  "policy_context_ref",
  "evidence_refs",
  "source",
  "campaign",
  "surface",
  "unchanged invocation",
  "changed target",
  "changed tool/action",
  "changed params hash",
  "high-risk call",
  "no downstream execution by Neura",
  "no private payload persistence",
  "no provider approval, listing, endorsement, integration, or partnership claim",
  "no full data-flow provenance claim",
]);
rejectUnsafeClaims("docs", docs);

const runner = read("examples/runtime-binding/run-proof.mjs");
requireIncludes("runner", runner, [
  "deriveActionCardFromInvocation",
  "runtime_tool_invocation_captured",
  "action_card_derived_from_invocation_envelope",
  "receipt_valid_only_for_exact_invocation: true",
  "runtime_must_recheck_binding_before_execution: true",
  "execution_performed_by_neura: false",
  "downstream_execution_by_neura: false",
  "private_payload_persisted: false",
  "full_data_flow_provenance_claim: false",
]);
rejectUnsafeClaims("runner", runner);

const firstRun = run("npm", ["run", "proof:runtime-binding", "--", "--dry-run", "--json"]);
const secondRun = run("npm", ["run", "proof:runtime-binding", "--", "--dry-run", "--json"]);
const output = parseJsonOutput(firstRun, "proof_command");
parseJsonOutput(secondRun, "proof_command_second_run");

if (firstRun.stdout !== secondRun.stdout) failures.push("proof_output_not_deterministic");

if (output) {
  expectEqual("proof_output_ok", output.ok, true);
  expectEqual("proof_name", output.proof, "runtime-bound-action-card-proof");
  expectEqual("proof_mode", output.mode, "local_dry_run_runtime_binding_no_downstream_execution");
  expectEqual("proof_count", output.count, 4);
  requireIncludes("proof_pattern", (output.pattern ?? []).join(" -> "), [
    "actual runtime/tool invocation",
    "derived Action Card",
    "Relay Decision Receipt",
    "receipt valid only for that exact call",
    "runtime-owned proceed / revise / stop / human_review route",
  ]);

  const expectedBindingFields = [
    "call_ref",
    "actor_ref",
    "runtime_ref",
    "tool_ref",
    "action_ref",
    "target_ref",
    "params_hash",
    "policy_context_ref",
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
    "email",
  ]);
  for (const key of collectExactKeys(output)) {
    if (forbiddenKeys.has(key)) failures.push(`proof_forbidden_key_${key}`);
  }

  const serializedOutput = JSON.stringify(output);
  for (const unsafe of [
    "customer@example.com",
    "PRIVATE_",
    "SECRET",
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
    "repo-search-proceed": "proceed",
    "issue-comment-revise": "revise",
    "package-publish-human-review": "human_review",
    "deployment-promote-stop": "stop",
  };

  const seenResults = new Map((output.results ?? []).map((result) => [result.scenario, result]));
  for (const [scenario, decision] of Object.entries(expectedDecisions)) {
    const result = seenResults.get(scenario);
    if (!result) {
      failures.push(`missing_result_${scenario}`);
      continue;
    }

    const envelope = result.runtime_invocation_envelope;
    const actionCard = result.action_card;
    const receipt = result.decision_receipt;
    const route = result.runtime_owned_route;

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

    expectEqual(`${scenario}_derived_from`, actionCard?.derived_from, "runtime_invocation_envelope");
    expectEqual(`${scenario}_derived_call_ref`, actionCard?.derived_from_call_ref, envelope?.call_ref);
    expectEqual(`${scenario}_action_refs_only`, actionCard?.refs_only, true);
    expectEqual(`${scenario}_action_tool_ref`, actionCard?.proposed_action?.tool_ref, envelope?.tool_ref);
    expectEqual(`${scenario}_action_target_ref`, actionCard?.proposed_action?.target_ref, envelope?.target_ref);
    expectEqual(`${scenario}_action_params_hash`, actionCard?.proposed_action?.params_hash, envelope?.params_hash);
    expectEqual(`${scenario}_binding_params_hash`, actionCard?.invocation_binding?.params_hash, envelope?.params_hash);
    expectEqual(`${scenario}_binding_valid_exact`, actionCard?.invocation_binding?.valid_only_for_exact_invocation, true);

    expectEqual(`${scenario}_receipt_decision`, receipt?.decision, decision);
    expectEqual(`${scenario}_receipt_route`, receipt?.route, decision);
    expectEqual(`${scenario}_receipt_refs_only`, receipt?.refs_only, true);
    expectEqual(`${scenario}_receipt_private_payload`, receipt?.private_payload_persisted, false);
    expectEqual(`${scenario}_receipt_downstream_execution`, receipt?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_receipt_binding_exact`, receipt?.binding?.valid_only_for_exact_invocation, true);
    expectEqual(`${scenario}_receipt_binding_hash`, receipt?.binding?.envelope_hash, actionCard?.invocation_binding?.envelope_hash);
    expectEqual(`${scenario}_receipt_call_ref`, receipt?.binding?.call_ref, envelope?.call_ref);

    if (!/^receipt_ref_runtime_binding_[0-9a-f]{16}$/.test(receipt?.receipt_ref ?? "")) {
      failures.push(`${scenario}_bad_receipt_ref`);
    }
    if (!/^trace_ref_runtime_binding_[0-9a-f]{16}$/.test(receipt?.trace_ref ?? "")) {
      failures.push(`${scenario}_bad_trace_ref`);
    }
    if (!/^relay_txn_runtime_binding_[0-9a-f]{16}$/.test(receipt?.transaction_ref ?? "")) {
      failures.push(`${scenario}_bad_transaction_ref`);
    }

    expectEqual(`${scenario}_route_owner`, route?.route_owner, "developer_runtime");
    expectEqual(`${scenario}_route_receipt_ref`, route?.receipt_ref, receipt?.receipt_ref);
    expectEqual(`${scenario}_route_trace_ref`, route?.trace_ref, receipt?.trace_ref);
    expectEqual(`${scenario}_route_recheck`, route?.runtime_must_recheck_binding_before_execution, true);
    expectEqual(`${scenario}_route_runtime_owns`, route?.runtime_owns_execution_decision, true);
    expectEqual(`${scenario}_route_dry_run_execution`, route?.downstream_tool_executed_in_dry_run, false);
    expectEqual(`${scenario}_route_neura_execution`, route?.execution_performed_by_neura, false);
    expectEqual(`${scenario}_trace_private_payload`, result.trace?.private_payload_persisted, false);
    expectEqual(`${scenario}_trace_downstream_execution`, result.trace?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_boundary_exact`, result.boundaries?.receipt_valid_only_for_exact_invocation, true);
    expectEqual(`${scenario}_boundary_runtime_owned`, result.boundaries?.runtime_owned_execution, true);
    expectEqual(`${scenario}_boundary_provider_claim`, result.boundaries?.provider_listing_or_partnership_claim, false);
    expectEqual(`${scenario}_boundary_full_provenance`, result.boundaries?.full_data_flow_provenance_claim, false);
  }

  const checks = new Map((output.binding_checks ?? []).map((check) => [check.scenario, check]));
  const unchanged = checks.get("unchanged-invocation");
  const changedTarget = checks.get("changed-target");
  const changedToolAction = checks.get("changed-tool-action");
  const changedParamsHash = checks.get("changed-params-hash");
  const highRisk = checks.get("high-risk-call");

  expectEqual("unchanged_applicable", unchanged?.applicable, true);
  if ((unchanged?.changed_fields ?? []).length !== 0) failures.push("unchanged_changed_fields_not_empty");

  expectEqual("changed_target_applicable", changedTarget?.applicable, false);
  if (!(changedTarget?.changed_fields ?? []).includes("target_ref")) {
    failures.push("changed_target_missing_target_ref");
  }

  expectEqual("changed_tool_action_applicable", changedToolAction?.applicable, false);
  if (!(changedToolAction?.changed_fields ?? []).includes("tool_ref")) {
    failures.push("changed_tool_action_missing_tool_ref");
  }
  if (!(changedToolAction?.changed_fields ?? []).includes("action_ref")) {
    failures.push("changed_tool_action_missing_action_ref");
  }

  expectEqual("changed_params_hash_applicable", changedParamsHash?.applicable, false);
  if (!(changedParamsHash?.changed_fields ?? []).includes("params_hash")) {
    failures.push("changed_params_hash_missing_params_hash");
  }

  if (!["human_review", "stop"].includes(highRisk?.decision)) {
    failures.push(`high_risk_wrong_decision_${highRisk?.decision}`);
  }
  expectEqual("high_risk_applicable_to_own_receipt", highRisk?.applicable, true);
  expectEqual("high_risk_dry_run_execution", highRisk?.downstream_tool_executed_in_dry_run, false);
  expectEqual("high_risk_neura_execution", highRisk?.execution_performed_by_neura, false);

  expectEqual("root_private_payload_boundary", output.boundaries?.private_payload_persisted, false);
  expectEqual("root_downstream_boundary", output.boundaries?.downstream_execution_by_neura, false);
  expectEqual("root_runtime_owned_boundary", output.boundaries?.runtime_owned_execution, true);
  expectEqual("root_provider_claim_boundary", output.boundaries?.provider_listing_or_partnership_claim, false);
  expectEqual("root_public_distribution_boundary", output.boundaries?.public_distribution_action, false);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "runtime-bound-action-card-proof",
      command: "npm run proof:runtime-binding -- --dry-run --json",
      scenarios: [
        "repo-search-proceed",
        "issue-comment-revise",
        "package-publish-human-review",
        "deployment-promote-stop",
      ],
      boundaries: [
        "deterministic local dry-run output",
        "Action Card derived from invocation envelope",
        "receipt invalidates on changed target, tool/action, or params hash",
        "high-risk call routes to human_review or stop",
        "no private payload persistence",
        "no downstream execution by Neura",
        "no provider/listing/endorsement/partnership claim",
      ],
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
