#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function parseJson(label, text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    fail(`${label}_not_json_${error.message}`);
    return null;
  }
}

const exampleResult = run("python3", ["examples/crewai/guardrail_receipt_ref.py", "--json"]);
if (exampleResult.status !== 0) {
  fail(`example_failed_${exampleResult.stderr || exampleResult.stdout}`);
}

const payload = exampleResult.status === 0 ? parseJson("crewai_guardrail_receipt_ref", exampleResult.stdout) : null;

if (payload) {
  const metadata = payload.guardrail_decision?.metadata ?? {};
  const topLevelDecision = payload.guardrail_decision_top_level ?? {};
  const topLevelMetadata = topLevelDecision.metadata ?? {};
  const receipt = payload.pre_action_receipt ?? {};
  const bind = receipt.binds_to ?? {};
  const action = payload.attempted_action ?? {};
  const boundaries = payload.boundaries ?? {};
  const split = payload.conceptual_split ?? {};
  const shapes = payload.example_shapes ?? {};

  assert(payload.ok === true, "payload_not_ok");
  assert(payload.example === "crewai_guardrail_receipt_ref_dual_shape", "wrong_example_id");
  assert(payload.guardrail_decision?.allow === false, "guardrail_should_suspend_not_allow");
  assert(payload.guardrail_decision?.reason?.includes("human review"), "guardrail_reason_missing_review");
  assert(topLevelDecision.allow === false, "top_level_guardrail_should_suspend_not_allow");
  assert(topLevelDecision.reason?.includes("human review"), "top_level_guardrail_reason_missing_review");
  assert(metadata.guardrail_result === "suspend", "guardrail_result_not_suspend");
  assert(topLevelMetadata.guardrail_result === "suspend", "top_level_guardrail_result_not_suspend");
  assert(metadata.receipt_ref === receipt.receipt_ref, "metadata_receipt_ref_not_bound_to_receipt");
  assert(topLevelDecision.receipt_ref === receipt.receipt_ref, "top_level_receipt_ref_not_bound_to_receipt");
  assert(topLevelDecision.receipt_ref === metadata.receipt_ref, "receipt_ref_shapes_not_equivalent");
  assert(metadata.receipt_ref === "decision_receipt_ref:crewai_guardrail_email_send_001", "unexpected_receipt_ref");
  assert(metadata.receipt_scope === "pre_action_decision_record", "metadata_receipt_scope_wrong");
  assert(topLevelMetadata.receipt_scope === "pre_action_decision_record", "top_level_metadata_receipt_scope_wrong");
  assert(metadata.action_hash === action.action_hash, "metadata_action_hash_not_bound");
  assert(topLevelMetadata.action_hash === action.action_hash, "top_level_metadata_action_hash_not_bound");
  assert(shapes.metadata_receipt_ref === 'GuardrailDecision.metadata["receipt_ref"]', "metadata_shape_missing");
  assert(shapes.top_level_receipt_ref === "GuardrailDecision.receipt_ref", "top_level_shape_missing");

  assert(split.guardrail_result === "allow / deny / suspend", "split_guardrail_result_missing");
  assert(
    split.pre_action_receipt === "decision recorded against specific inputs before execution",
    "split_pre_action_receipt_missing",
  );
  assert(
    split.post_action_artifact === "action execution evidence, if emitted later by the developer runtime",
    "split_post_action_artifact_missing",
  );
  assert(
    payload.runtime_preservation?.includes("preserve it through traces/callbacks"),
    "runtime_preservation_missing",
  );

  assert(action.tool_name === "email.send", "action_tool_name_missing");
  assert(action.tool_input_ref?.startsWith("tool_input_ref:"), "action_tool_input_ref_missing");
  assert(action.action_hash?.startsWith("action_hash:"), "action_hash_missing");
  assert(action.timestamp === "2026-05-14T15:35:00Z", "action_timestamp_missing");
  assert(Array.isArray(action.policy_refs) && action.policy_refs.length > 0, "action_policy_refs_missing");
  assert(Array.isArray(action.evidence_refs) && action.evidence_refs.length > 0, "action_evidence_refs_missing");
  assert(Array.isArray(action.authority_refs) && action.authority_refs.length > 0, "action_authority_refs_missing");

  assert(bind.tool_name === action.tool_name, "receipt_tool_name_not_bound");
  assert(bind.tool_input_ref === action.tool_input_ref, "receipt_tool_input_ref_not_bound");
  assert(bind.action_hash === action.action_hash, "receipt_action_hash_not_bound");
  assert(bind.timestamp === action.timestamp, "receipt_timestamp_not_bound");
  assert(JSON.stringify(bind.policy_refs) === JSON.stringify(action.policy_refs), "receipt_policy_refs_not_bound");
  assert(JSON.stringify(bind.evidence_refs) === JSON.stringify(action.evidence_refs), "receipt_evidence_refs_not_bound");
  assert(JSON.stringify(bind.authority_refs) === JSON.stringify(action.authority_refs), "receipt_authority_refs_not_bound");

  assert(receipt.execution_attempted === false, "receipt_must_not_execute");
  assert(receipt.proves_execution === false, "receipt_must_not_prove_execution");
  assert(receipt.execution_owner === "developer_runtime", "receipt_execution_owner_wrong");

  assert(boundaries.crewai_approval_or_integration_claim === false, "crewai_claim_boundary_changed");
  assert(boundaries.downstream_execution === false, "downstream_execution_boundary_changed");
  assert(boundaries.public_token_or_api_key_issuance === false, "token_issuance_boundary_changed");
  assert(boundaries.private_payload_exposure === false, "private_payload_boundary_changed");
  assert(boundaries.pre_action_receipt_proves_execution === false, "execution_proof_boundary_changed");
}

const readme = readFileSync(join(repoRoot, "examples/crewai/README.md"), "utf8");
const examplesReadme = readFileSync(join(repoRoot, "examples/README.md"), "utf8");

for (const required of [
  'GuardrailDecision.metadata["receipt_ref"]',
  "GuardrailDecision.receipt_ref",
  "optional top-level",
  "guardrail result = allow / deny / suspend",
  "pre-action receipt = decision recorded against specific inputs before execution",
  "post-action artifact = action execution evidence",
  "If `receipt_ref` exists, a framework/runtime should preserve it through traces/callbacks",
  "not a CrewAI integration, approval, listing, endorsement, or partnership claim",
  "does not execute downstream actions",
  "does not execute downstream actions, issue public tokens or API keys, expose private payloads, or claim that a pre-action receipt proves execution",
]) {
  assert(readme.includes(required), `readme_missing_${required}`);
}

assert(examplesReadme.includes("CrewAI-style guardrail receipt refs"), "examples_readme_missing_lane");
assert(examplesReadme.includes("verify:crewai-guardrail-receipt-ref"), "examples_readme_missing_verifier");

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "crewai-guardrail-receipt-ref",
      checked_files: [
        "examples/crewai/guardrail_receipt_ref.py",
        "examples/crewai/README.md",
        "examples/README.md",
        "package.json",
      ],
      example_shape: payload
        ? {
            guardrail_decision_metadata_receipt_ref: payload.guardrail_decision.metadata.receipt_ref,
            guardrail_decision_top_level_receipt_ref: payload.guardrail_decision_top_level.receipt_ref,
            shapes: payload.example_shapes,
            receipt_binds_to: payload.pre_action_receipt.binds_to,
            conceptual_split: payload.conceptual_split,
            runtime_preservation: payload.runtime_preservation,
            boundaries: payload.boundaries,
          }
        : null,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
