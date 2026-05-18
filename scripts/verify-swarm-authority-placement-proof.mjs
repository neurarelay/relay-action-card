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
    /official\s+(Ruflo|OpenClaw|ClawHub|MCP|OpenAI|Anthropic|A2A)\s+(integration|listing|approval|endorsement|partnership)/i,
    /(Ruflo|OpenClaw|ClawHub|MCP|OpenAI|Anthropic|A2A)\s+(approved|endorsed|listed|partnered|validated)\b/i,
    /provider\s+(approval|listing|endorsement|partnership)\s+(exists|is claimed|is live)/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /Neura\s+dispatches\s+(the\s+)?worker/i,
    /Neura\s+writes\s+(the\s+)?memory/i,
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
  "docs/swarm-authority-placement-proof.md",
  "examples/swarm-authority-placement/run-proof.mjs",
  "scripts/verify-swarm-authority-placement-proof.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
expectEqual(
  "package_script_proof_swarm_authority_placement",
  packageJson.scripts?.["proof:swarm-authority-placement"],
  "node examples/swarm-authority-placement/run-proof.mjs",
);
expectEqual(
  "package_script_verify_swarm_authority_placement",
  packageJson.scripts?.["verify:swarm-authority-placement-proof"],
  "node scripts/verify-swarm-authority-placement-proof.mjs",
);

const docs = read("docs/swarm-authority-placement-proof.md");
requireIncludes("docs", docs, [
  "Ruflo-style / swarm-runtime pattern only",
  "not a Ruflo integration",
  "swarm proposal / consensus / broadcast / worker dispatch / memory write",
  "runtime-bound Action Card",
  "Relay Decision Receipt",
  "receipt_ref / trace_ref",
  "runtime-owned",
  "before consensus proposal",
  "proposal/result metadata",
  "before broadcast / dispatch",
  "before worker tool execution",
  "before memory write / federation message",
  "npm run proof:swarm-authority-placement -- --dry-run --json",
  "npm run verify:swarm-authority-placement-proof",
  "no downstream execution by Neura",
  "no private payload persistence",
  "no provider approval, listing, endorsement, integration, or partnership claim",
]);
rejectUnsafeClaims("docs", docs);

const runner = read("examples/swarm-authority-placement/run-proof.mjs");
requireIncludes("runner", runner, [
  "deriveActionCardFromSwarmEnvelope",
  "swarm_stage_envelope_captured",
  "action_card_derived_from_swarm_runtime_envelope",
  "valid_only_for_exact_swarm_stage: true",
  "runtime_owns_execution_decision: true",
  "execution_performed_by_neura: false",
  "downstream_execution_by_neura: false",
  "private_payload_persisted: false",
  "official_ruflo_integration_claim: false",
]);
rejectUnsafeClaims("runner", runner);

const firstRun = run("npm", ["run", "proof:swarm-authority-placement", "--", "--dry-run", "--json"]);
const secondRun = run("npm", ["run", "proof:swarm-authority-placement", "--", "--dry-run", "--json"]);
const output = parseJsonOutput(firstRun, "proof_command");
parseJsonOutput(secondRun, "proof_command_second_run");

if (firstRun.stdout !== secondRun.stdout) failures.push("proof_output_not_deterministic");

if (output) {
  expectEqual("proof_output_ok", output.ok, true);
  expectEqual("proof_name", output.proof, "swarm-authority-placement-proof");
  expectEqual("proof_mode", output.mode, "local_dry_run_swarm_runtime_pattern_no_downstream_execution");
  expectEqual("proof_count", output.count, 5);

  requireIncludes("proof_pattern", (output.pattern ?? []).join(" -> "), [
    "swarm proposal / consensus / broadcast / worker dispatch / memory write",
    "runtime-bound Action Card",
    "Relay Decision Receipt",
    "receipt_ref / trace_ref",
    "runtime-owned proceed / revise / stop / human_review route",
  ]);

  const expectedPlacements = [
    "before_consensus_proposal",
    "proposal_result_metadata",
    "before_broadcast_dispatch",
    "before_worker_tool_execution",
    "before_memory_write_or_federation_message",
  ];
  if (JSON.stringify(output.placements) !== JSON.stringify(expectedPlacements)) {
    failures.push("proof_placements_changed");
  }

  const expectedBindingFields = [
    "call_ref",
    "swarm_ref",
    "coordinator_ref",
    "runtime_ref",
    "placement",
    "stage_ref",
    "proposal_ref",
    "consensus_ref",
    "broadcast_ref",
    "worker_ref",
    "tool_ref",
    "memory_ref",
    "federation_ref",
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
    "before-consensus-proposal": "revise",
    "proposal-result-metadata": "proceed",
    "before-broadcast-dispatch": "human_review",
    "before-worker-tool-execution": "stop",
    "before-memory-federation": "human_review",
  };
  const seenResults = new Map((output.results ?? []).map((result) => [result.scenario, result]));

  for (const [scenario, decision] of Object.entries(expectedDecisions)) {
    const result = seenResults.get(scenario);
    if (!result) {
      failures.push(`missing_result_${scenario}`);
      continue;
    }

    const envelope = result.swarm_runtime_envelope;
    const actionCard = result.action_card;
    const receipt = result.decision_receipt;
    const route = result.runtime_owned_route;

    for (const field of expectedBindingFields) {
      if (envelope?.[field] === undefined) failures.push(`${scenario}_missing_envelope_${field}`);
    }

    if (!expectedPlacements.includes(result.placement)) failures.push(`${scenario}_unexpected_placement`);
    if (!/^sha256:[0-9a-f]{64}$/.test(envelope?.params_hash ?? "")) {
      failures.push(`${scenario}_bad_params_hash`);
    }

    expectEqual(`${scenario}_envelope_refs_only`, envelope?.refs_only, true);
    expectEqual(`${scenario}_envelope_params_hash_only`, envelope?.params_hash_only, true);
    expectEqual(`${scenario}_envelope_private_payload`, envelope?.private_payload_persisted, false);
    expectEqual(`${scenario}_envelope_downstream_execution`, envelope?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_envelope_runtime_execution`, envelope?.runtime_execution_performed_in_dry_run, false);

    expectEqual(`${scenario}_derived_from`, actionCard?.derived_from, "swarm_runtime_invocation_envelope");
    expectEqual(`${scenario}_derived_call_ref`, actionCard?.derived_from_call_ref, envelope?.call_ref);
    expectEqual(`${scenario}_action_refs_only`, actionCard?.refs_only, true);
    expectEqual(`${scenario}_action_target_ref`, actionCard?.proposed_action?.target_ref, envelope?.target_ref);
    expectEqual(`${scenario}_action_params_hash`, actionCard?.proposed_action?.params_hash, envelope?.params_hash);
    expectEqual(`${scenario}_binding_params_hash`, actionCard?.swarm_binding?.params_hash, envelope?.params_hash);
    expectEqual(`${scenario}_binding_valid_exact`, actionCard?.swarm_binding?.valid_only_for_exact_swarm_stage, true);

    expectEqual(`${scenario}_receipt_decision`, receipt?.decision, decision);
    expectEqual(`${scenario}_receipt_route`, receipt?.route, decision);
    expectEqual(`${scenario}_receipt_refs_only`, receipt?.refs_only, true);
    expectEqual(`${scenario}_receipt_private_payload`, receipt?.private_payload_persisted, false);
    expectEqual(`${scenario}_receipt_downstream_execution`, receipt?.downstream_execution_by_neura, false);
    expectEqual(`${scenario}_receipt_binding_exact`, receipt?.binding?.valid_only_for_exact_swarm_stage, true);
    expectEqual(`${scenario}_receipt_binding_hash`, receipt?.binding?.envelope_hash, actionCard?.swarm_binding?.envelope_hash);
    expectEqual(`${scenario}_receipt_call_ref`, receipt?.binding?.call_ref, envelope?.call_ref);

    if (!/^receipt_ref_swarm_authority_[0-9a-f]{16}$/.test(receipt?.receipt_ref ?? "")) {
      failures.push(`${scenario}_bad_receipt_ref`);
    }
    if (!/^trace_ref_swarm_authority_[0-9a-f]{16}$/.test(receipt?.trace_ref ?? "")) {
      failures.push(`${scenario}_bad_trace_ref`);
    }
    if (!/^relay_txn_swarm_authority_[0-9a-f]{16}$/.test(receipt?.transaction_ref ?? "")) {
      failures.push(`${scenario}_bad_transaction_ref`);
    }

    expectEqual(`${scenario}_route_owner`, route?.route_owner, "swarm_runtime");
    expectEqual(`${scenario}_route_receipt_ref`, route?.receipt_ref, receipt?.receipt_ref);
    expectEqual(`${scenario}_route_trace_ref`, route?.trace_ref, receipt?.trace_ref);
    expectEqual(`${scenario}_route_recheck`, route?.swarm_runtime_must_recheck_binding_before_execution, true);
    expectEqual(`${scenario}_route_runtime_owns`, route?.runtime_owns_execution_decision, true);
    expectEqual(`${scenario}_route_worker_dry_run`, route?.worker_dispatched_in_dry_run, false);
    expectEqual(`${scenario}_route_tool_dry_run`, route?.tool_executed_in_dry_run, false);
    expectEqual(`${scenario}_route_memory_dry_run`, route?.memory_written_in_dry_run, false);
    expectEqual(`${scenario}_route_federation_dry_run`, route?.federation_message_sent_in_dry_run, false);
    expectEqual(`${scenario}_route_neura_execution`, route?.execution_performed_by_neura, false);
    expectEqual(`${scenario}_boundary_exact`, result.boundaries?.receipt_valid_only_for_exact_swarm_stage, true);
    expectEqual(`${scenario}_boundary_runtime_owned`, result.boundaries?.runtime_owned_execution, true);
    expectEqual(`${scenario}_boundary_ruflo_claim`, result.boundaries?.official_ruflo_integration_claim, false);
    expectEqual(`${scenario}_boundary_provider_claim`, result.boundaries?.provider_listing_or_partnership_claim, false);
  }

  expectEqual("root_pattern_only", output.boundaries?.ruflo_style_swarm_runtime_pattern_only, true);
  expectEqual("root_ruflo_claim_boundary", output.boundaries?.official_ruflo_integration_claim, false);
  expectEqual("root_ruflo_listing_boundary", output.boundaries?.ruflo_listing_or_approval_claim, false);
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
      verifier: "swarm-authority-placement-proof",
      command: "npm run proof:swarm-authority-placement -- --dry-run --json",
      placements: [
        "before_consensus_proposal",
        "proposal_result_metadata",
        "before_broadcast_dispatch",
        "before_worker_tool_execution",
        "before_memory_write_or_federation_message",
      ],
      boundaries: [
        "Ruflo-style / swarm-runtime pattern only",
        "deterministic local dry-run output",
        "Action Card derived from swarm runtime envelope",
        "receipt_ref and trace_ref are shaped and stage-bound",
        "runtime owns execution",
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
