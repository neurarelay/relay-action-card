#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const decisions = new Set(["allow", "revise", "human_review", "stop"]);
const requiredDecisions = new Set(["human_review", "revise", "stop"]);
const runtimeMap = {
  allow: "continue",
  revise: "continue_with_revision",
  human_review: "pause_for_human_review",
  stop: "do_not_execute",
};
const falseBoundaryFlags = [
  "phi_used",
  "downstream_execution_performed_by_neura",
  "real_provider_system_touched",
  "real_insurer_system_touched",
  "real_ehr_touched",
  "real_scheduling_system_touched",
  "real_patient_message_sent",
  "real_prior_authorization_submitted",
  "hipaa_compliance_claimed",
  "medical_advice_claimed",
  "clinical_accuracy_claimed",
  "provider_approval_claimed",
  "insurer_approval_claimed",
  "compliance_certification_claimed",
];

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
    /ClinicOps\s+Synthetic\s+Proof\s+is\s+(a\s+)?healthcare\s+product/i,
    /ClinicOps\s+Synthetic\s+Proof\s+is\s+(an?\s+)?EHR\s+integration/i,
    /(approved|endorsed|listed|partnered)\s+by\s+(provider|insurer|clinic|hospital|EHR|OpenAI|Anthropic|Microsoft|Google|AWS)/i,
    /HIPAA\s+(certified|compliant|approved)/i,
    /clinical\s+accuracy\s+(certified|approved|confirmed)/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /insurer\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /phi_used"\s*:\s*true/i,
    /real_provider_system_touched"\s*:\s*true/i,
    /real_insurer_system_touched"\s*:\s*true/i,
    /real_ehr_touched"\s*:\s*true/i,
    /real_scheduling_system_touched"\s*:\s*true/i,
    /real_patient_message_sent"\s*:\s*true/i,
    /real_prior_authorization_submitted"\s*:\s*true/i,
    /downstream_execution_performed_by_neura"\s*:\s*true/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function valuePresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function receiptFileFor(scenarioFile) {
  return scenarioFile.replace(/\.json$/, ".receipt.json");
}

function validateScenario(file, scenario) {
  for (const field of [
    "scenario_id",
    "title",
    "action_card_id",
    "actor",
    "system",
    "action_type",
    "target",
    "proposed_change",
    "params_hash",
    "amount_or_value_at_risk",
    "customer_impact",
    "risk",
    "policy_refs",
    "evidence_refs",
    "requested_outcome",
    "synthetic_facts",
    "expected_decision",
    "expected_runtime_instruction",
    "expected_allowed_next_step",
    "expected_blocked_actions",
    "source",
    "campaign",
    "surface",
  ]) {
    if (!valuePresent(scenario[field]) && field !== "expected_blocked_actions") {
      failures.push(`${file}_missing_${field}`);
    }
  }
  if (!scenario.params_hash?.startsWith("sha256:")) failures.push(`${file}_missing_params_hash`);
  if (!decisions.has(scenario.expected_decision)) failures.push(`${file}_invalid_expected_decision`);
  if (scenario.expected_runtime_instruction !== runtimeMap[scenario.expected_decision]) {
    failures.push(`${file}_runtime_instruction_mismatch`);
  }
  if (!Array.isArray(scenario.expected_blocked_actions)) failures.push(`${file}_blocked_actions_not_array`);
  if (scenario.synthetic_data_only !== true) failures.push(`${file}_not_marked_synthetic`);
  if (scenario.surface !== "clinicops_synthetic_proof") failures.push(`${file}_wrong_surface`);
}

function validateReceipt(file, receipt, scenario) {
  for (const field of [
    "receipt_id",
    "standard",
    "created_at",
    "action_card_id",
    "decision",
    "runtime_instruction",
    "decision_reason",
    "actor",
    "proposed_action",
    "risk",
    "policy_basis",
    "evidence_basis",
    "authority",
    "validity",
    "execution",
    "trace",
    "boundary",
  ]) {
    if (!valuePresent(receipt[field])) failures.push(`${file}_receipt_missing_${field}`);
  }
  if (receipt.standard !== "neura-decision-receipt-v0.1-draft") failures.push(`${file}_wrong_standard`);
  if (receipt.action_card_id !== scenario.action_card_id) failures.push(`${file}_action_card_mismatch`);
  if (receipt.decision !== scenario.expected_decision) failures.push(`${file}_decision_mismatch`);
  if (receipt.runtime_instruction !== runtimeMap[receipt.decision]) failures.push(`${file}_runtime_map_mismatch`);
  if (receipt.proposed_action?.action_type !== scenario.action_type) failures.push(`${file}_action_type_mismatch`);
  if (receipt.proposed_action?.target !== scenario.target) failures.push(`${file}_target_mismatch`);
  if (receipt.proposed_action?.params_hash !== scenario.params_hash) failures.push(`${file}_params_hash_mismatch`);
  if (receipt.actor?.name !== scenario.actor?.name) failures.push(`${file}_actor_mismatch`);
  if (receipt.validity?.valid_for_action_type !== scenario.action_type) failures.push(`${file}_validity_action_mismatch`);
  if (receipt.validity?.valid_for_target !== scenario.target) failures.push(`${file}_validity_target_mismatch`);
  if (receipt.validity?.valid_for_actor !== scenario.actor?.name) failures.push(`${file}_validity_actor_mismatch`);
  if (receipt.validity?.params_hash !== scenario.params_hash) failures.push(`${file}_validity_params_mismatch`);
  if (receipt.execution?.allowed_next_step !== scenario.expected_allowed_next_step) {
    failures.push(`${file}_allowed_next_step_mismatch`);
  }
  if (
    JSON.stringify(receipt.execution?.blocked_downstream_actions ?? []) !==
    JSON.stringify(scenario.expected_blocked_actions)
  ) {
    failures.push(`${file}_blocked_actions_mismatch`);
  }
  for (const invalidator of [
    "action_type",
    "target",
    "params_hash",
    "actor",
    "policy_refs",
    "evidence_refs",
    "approval_state",
    "required_authority_role",
  ]) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`${file}_missing_invalidator_${invalidator}`);
    }
  }
  if (receipt.boundary?.synthetic_data_only !== true) failures.push(`${file}_synthetic_boundary_missing`);
  for (const flag of falseBoundaryFlags) {
    if (receipt.boundary?.[flag] !== false) failures.push(`${file}_boundary_open_${flag}`);
  }
}

function parseJsonOutput(result, label) {
  if (result.status !== 0) {
    failures.push(`${label}_failed_${result.status}_${result.stderr || result.stdout}`);
    return null;
  }
  try {
    return JSON.parse(result.stdout.slice(result.stdout.indexOf("{")));
  } catch (error) {
    failures.push(`${label}_invalid_json_${error.message}`);
    return null;
  }
}

const requiredFiles = [
  "docs/clinicops-synthetic-proof.md",
  "examples/clinicops-synthetic-proof/fixtures/cases.json",
  "examples/clinicops-synthetic-proof/fixtures/policies.json",
  "examples/clinicops-synthetic-proof/fixtures/reviewer-roles.json",
  "examples/clinicops-synthetic-proof/fixtures/channels.json",
  "examples/clinicops-synthetic-proof/manifest.json",
  "examples/clinicops-synthetic-proof/run-proof.mjs",
  "scripts/verify-clinicops-synthetic-proof.mjs",
  "schemas/action-card.v0.1.json",
  "schemas/decision-receipt.v0.1.json",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (packageJson.scripts?.["proof:clinicops-synthetic"] !== "node examples/clinicops-synthetic-proof/run-proof.mjs") {
  failures.push("package_missing_proof_clinicops_synthetic_script");
}
if (packageJson.scripts?.["verify:clinicops-synthetic"] !== "node scripts/verify-clinicops-synthetic-proof.mjs") {
  failures.push("package_missing_verify_clinicops_synthetic_script");
}

const docs = read("docs/clinicops-synthetic-proof.md");
const readme = read("README.md");
requireIncludes("docs", docs, [
  "ClinicOps Synthetic Proof",
  "Synthetic ClinicOps intent -> Action Card -> Pre-Action Authority -> Decision Receipt",
  "npm run proof:clinicops-synthetic -- --dry-run --json",
  "npm run verify:clinicops-synthetic",
  "`human_review`",
  "`revise`",
  "`stop`",
  "does not use PHI",
]);
requireIncludes("readme", readme, [
  "ClinicOps Synthetic Proof",
  "npm run proof:clinicops-synthetic -- --dry-run --json",
  "npm run verify:clinicops-synthetic",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("readme", readme);

const cases = readJson("examples/clinicops-synthetic-proof/fixtures/cases.json");
const policies = readJson("examples/clinicops-synthetic-proof/fixtures/policies.json");
const reviewerRoles = readJson("examples/clinicops-synthetic-proof/fixtures/reviewer-roles.json");
const channels = readJson("examples/clinicops-synthetic-proof/fixtures/channels.json");
const manifest = readJson("examples/clinicops-synthetic-proof/manifest.json");
if (!Array.isArray(cases) || cases.length < 1) failures.push("cases_fixture_missing");
if (!cases.every((entry) => entry.boundary?.synthetic_data_only === true)) failures.push("cases_not_synthetic");
for (const policyRef of [
  "clinicops.synthetic.scheduling.policy_check",
  "clinicops.synthetic.patient_message.review_required",
  "clinicops.synthetic.prior_auth.evidence_refs_required",
  "clinicops.synthetic.insurance_follow_up.allowed_channel",
  "clinicops.synthetic.policy_exception.owner_approval_required",
]) {
  if (!policies[policyRef]) failures.push(`policy_missing_${policyRef}`);
}
for (const role of ["qualified_human_reviewer", "clinic_operations_owner", "policy_exception_owner"]) {
  if (!reviewerRoles[role]) failures.push(`reviewer_role_missing_${role}`);
}
for (const channel of [
  "internal_review_queue",
  "synthetic_patient_message",
  "synthetic_insurer_submission",
  "synthetic_clinic_system_write",
]) {
  if (!channels[channel]) failures.push(`channel_missing_${channel}`);
}
if (manifest.proof !== "clinicops-synthetic-proof") failures.push("manifest_wrong_proof");
if (manifest.scenario_count !== 5) failures.push("manifest_wrong_scenario_count");
if (manifest.boundary?.synthetic_data_only !== true) failures.push("manifest_not_synthetic");
for (const flag of falseBoundaryFlags) {
  if (manifest.boundary?.[flag] !== false) failures.push(`manifest_boundary_open_${flag}`);
}

const scenarioFiles = readdirSync(path("examples/clinicops-synthetic-proof/scenarios"))
  .filter((file) => file.endsWith(".json"))
  .sort();
const receiptFiles = readdirSync(path("examples/clinicops-synthetic-proof/receipts"))
  .filter((file) => file.endsWith(".receipt.json"))
  .sort();

if (scenarioFiles.length !== 5) failures.push("wrong_clinicops_scenario_count");
if (receiptFiles.length !== scenarioFiles.length) failures.push("scenario_receipt_count_mismatch");

const seenDecisions = new Set();
for (const file of scenarioFiles) {
  const scenario = readJson(`examples/clinicops-synthetic-proof/scenarios/${file}`);
  const receiptFile = receiptFileFor(file);
  const receipt = readJson(`examples/clinicops-synthetic-proof/receipts/${receiptFile}`);
  validateScenario(file, scenario);
  validateReceipt(receiptFile, receipt, scenario);
  seenDecisions.add(scenario.expected_decision);
  rejectUnsafeClaims(file, JSON.stringify(scenario));
  rejectUnsafeClaims(receiptFile, JSON.stringify(receipt));
}
for (const decision of requiredDecisions) {
  if (!seenDecisions.has(decision)) failures.push(`missing_decision_${decision}`);
}

const run = spawnSync(
  "npm",
  [
    "run",
    "proof:clinicops-synthetic",
    "--",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=pre_action_authority",
    "--surface=clinicops_synthetic_proof",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const output = parseJsonOutput(run, "clinicops_synthetic_proof");

if (output) {
  if (output.ok !== true) failures.push("proof_output_not_ok");
  if (output.proof !== "clinicops-synthetic-proof") failures.push("wrong_proof_name");
  if (output.mode !== "local_dry_run_regulated_synthetic_workflow_no_downstream_execution") {
    failures.push("wrong_proof_mode");
  }
  if (output.scenario_count !== 5) failures.push("wrong_output_scenario_count");
  if (output.receipts_generated !== 5) failures.push("wrong_receipt_count");
  for (const decision of requiredDecisions) {
    if ((output.decision_counts?.[decision] ?? 0) < 1) failures.push(`output_missing_${decision}`);
  }
  if ((output.decision_counts?.allow ?? 0) !== 0) failures.push("unexpected_allow_decision");
  if (output.activation_attribution?.neura_source !== "verifier") failures.push("source_attribution_missing");
  if (output.activation_attribution?.neura_surface !== "clinicops_synthetic_proof") {
    failures.push("surface_attribution_missing");
  }
  if (output.boundary?.synthetic_data_only !== true) failures.push("output_not_synthetic");
  for (const flag of falseBoundaryFlags) {
    if (output.boundary?.[flag] !== false) failures.push(`output_boundary_open_${flag}`);
  }
  if (output.boundary?.public_action_authorized !== false) failures.push("output_public_action_authorized");
  for (const result of output.results ?? []) {
    if (result.decision !== result.expected_decision) failures.push(`${result.scenario_id}_output_decision_mismatch`);
    if (!result.action_card?.action_card_id) failures.push(`${result.scenario_id}_missing_action_card`);
    if (!result.decision_receipt?.receipt_id) failures.push(`${result.scenario_id}_missing_receipt`);
    if (result.clinicops_route?.downstream_actions_executed_in_dry_run !== false) {
      failures.push(`${result.scenario_id}_downstream_action_executed`);
    }
    if (result.clinicops_route?.execution_performed_by_neura !== false) {
      failures.push(`${result.scenario_id}_execution_boundary_open`);
    }
  }
}

if (failures.length > 0) {
  console.error("ClinicOps Synthetic Proof verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("ClinicOps Synthetic Proof verification passed.");
