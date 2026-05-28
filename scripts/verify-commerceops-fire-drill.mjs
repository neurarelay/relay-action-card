#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const decisions = new Set(["allow", "revise", "human_review", "stop"]);
const runtimeMap = {
  allow: "continue",
  revise: "continue_with_revision",
  human_review: "pause_for_human_review",
  stop: "do_not_execute",
};

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
    /CommerceOps\s+Fire\s+Drill\s+is\s+(a\s+)?Shopify\s+app/i,
    /CommerceOps\s+Fire\s+Drill\s+is\s+(a\s+)?Stripe\s+integration/i,
    /(approved|endorsed|listed|partnered)\s+by\s+(Shopify|Stripe|Klaviyo|Gorgias|OpenAI|Anthropic|Microsoft|Google|AWS|Kong)/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /real_shopify_touched"\s*:\s*true/i,
    /real_payment_touched"\s*:\s*true/i,
    /real_fulfillment_touched"\s*:\s*true/i,
    /real_customer_message_sent"\s*:\s*true/i,
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
  if (!Array.isArray(scenario.expected_blocked_actions)) {
    failures.push(`${file}_blocked_actions_not_array`);
  }
  if (scenario.synthetic_data_only !== true) failures.push(`${file}_not_marked_synthetic`);
  if (scenario.surface !== "commerceops_fire_drill") failures.push(`${file}_wrong_surface`);
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
  if (receipt.runtime_instruction !== runtimeMap[receipt.decision]) {
    failures.push(`${file}_runtime_map_mismatch`);
  }
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
  for (const invalidator of ["action_type", "target", "params_hash", "actor", "policy_refs", "evidence_refs", "approval_state"]) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`${file}_missing_invalidator_${invalidator}`);
    }
  }
  for (const flag of [
    "synthetic_data_only",
    "downstream_execution_performed_by_neura",
    "real_shopify_touched",
    "real_payment_touched",
    "real_fulfillment_touched",
    "real_discount_code_created",
    "real_customer_message_sent",
    "provider_approval_claimed",
    "compliance_certification_claimed",
  ]) {
    if (!(flag in receipt.boundary)) failures.push(`${file}_boundary_missing_${flag}`);
  }
  if (receipt.boundary.synthetic_data_only !== true) failures.push(`${file}_synthetic_boundary_closed`);
  for (const falseFlag of [
    "downstream_execution_performed_by_neura",
    "real_shopify_touched",
    "real_payment_touched",
    "real_fulfillment_touched",
    "real_discount_code_created",
    "real_customer_message_sent",
    "provider_approval_claimed",
    "compliance_certification_claimed",
  ]) {
    if (receipt.boundary[falseFlag] !== false) failures.push(`${file}_boundary_open_${falseFlag}`);
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
  "docs/commerceops-fire-drill.md",
  "examples/commerceops-fire-drill/fixtures/merchant.json",
  "examples/commerceops-fire-drill/fixtures/orders.json",
  "examples/commerceops-fire-drill/fixtures/policies.json",
  "examples/commerceops-fire-drill/manifest.json",
  "examples/commerceops-fire-drill/run-proof.mjs",
  "scripts/verify-commerceops-fire-drill.mjs",
  "schemas/action-card.v0.1.json",
  "schemas/decision-receipt.v0.1.json",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["proof:commerceops-fire-drill"] !==
  "node examples/commerceops-fire-drill/run-proof.mjs"
) {
  failures.push("package_missing_proof_commerceops_fire_drill_script");
}
if (
  packageJson.scripts?.["verify:commerceops-fire-drill"] !==
  "node scripts/verify-commerceops-fire-drill.mjs"
) {
  failures.push("package_missing_verify_commerceops_fire_drill_script");
}

const docs = read("docs/commerceops-fire-drill.md");
const readme = read("README.md");
requireIncludes("docs", docs, [
  "CommerceOps Fire Drill",
  "Commerce agent intent -> Action Card -> Pre-Action Authority -> Decision Receipt",
  "npm run proof:commerceops-fire-drill -- --dry-run --json",
  "npm run verify:commerceops-fire-drill",
  "`allow`",
  "`revise`",
  "`human_review`",
  "`stop`",
  "does not touch Shopify",
]);
requireIncludes("readme", readme, [
  "CommerceOps Fire Drill",
  "npm run proof:commerceops-fire-drill -- --dry-run --json",
  "npm run verify:commerceops-fire-drill",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("readme", readme);

const merchant = readJson("examples/commerceops-fire-drill/fixtures/merchant.json");
const orders = readJson("examples/commerceops-fire-drill/fixtures/orders.json");
const policies = readJson("examples/commerceops-fire-drill/fixtures/policies.json");
for (const field of [
  "merchant_id",
  "merchant_name",
  "owner_role",
  "support_role",
  "refund_threshold_usd",
  "discount_limit_percent",
  "high_value_order_threshold_usd",
]) {
  if (!valuePresent(merchant[field])) failures.push(`merchant_missing_${field}`);
}
if (merchant.synthetic_data_only !== true) failures.push("merchant_not_synthetic");
if (!Array.isArray(orders) || orders.length < 6) failures.push("orders_fixture_too_small");
for (const policyRef of [
  "commerceops.synthetic.tracking_reply.allowed",
  "commerceops.synthetic.refunds.threshold",
  "commerceops.synthetic.discounts.limit",
  "commerceops.synthetic.address_change.verification",
  "commerceops.synthetic.fulfillment.cancellation_release",
  "commerceops.synthetic.customer_promises.evidence_required",
]) {
  if (!policies[policyRef]) failures.push(`policy_missing_${policyRef}`);
}

const scenarioFiles = readdirSync(path("examples/commerceops-fire-drill/scenarios"))
  .filter((file) => file.endsWith(".json"))
  .sort();
const receiptFiles = readdirSync(path("examples/commerceops-fire-drill/receipts"))
  .filter((file) => file.endsWith(".receipt.json"))
  .sort();

if (scenarioFiles.length < 6) failures.push("not_enough_commerceops_scenarios");
if (receiptFiles.length !== scenarioFiles.length) failures.push("scenario_receipt_count_mismatch");

const seenDecisions = new Set();
for (const file of scenarioFiles) {
  const scenario = readJson(`examples/commerceops-fire-drill/scenarios/${file}`);
  const receiptFile = receiptFileFor(file);
  const receipt = readJson(`examples/commerceops-fire-drill/receipts/${receiptFile}`);
  validateScenario(file, scenario);
  validateReceipt(receiptFile, receipt, scenario);
  seenDecisions.add(scenario.expected_decision);
  rejectUnsafeClaims(file, JSON.stringify(scenario));
  rejectUnsafeClaims(receiptFile, JSON.stringify(receipt));
}
for (const decision of decisions) {
  if (!seenDecisions.has(decision)) failures.push(`missing_decision_${decision}`);
}

const run = spawnSync(
  "npm",
  [
    "run",
    "proof:commerceops-fire-drill",
    "--",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=pre_action_authority",
    "--surface=commerceops_fire_drill",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const output = parseJsonOutput(run, "commerceops_fire_drill_proof");

if (output) {
  if (output.ok !== true) failures.push("proof_output_not_ok");
  if (output.proof !== "commerceops-fire-drill") failures.push("wrong_proof_name");
  if (output.mode !== "local_dry_run_commerce_agent_no_downstream_execution") {
    failures.push("wrong_proof_mode");
  }
  if (output.scenario_count !== 6) failures.push("wrong_output_scenario_count");
  if (output.receipts_generated !== 6) failures.push("wrong_receipt_count");
  for (const decision of decisions) {
    if ((output.decision_counts?.[decision] ?? 0) < 1) failures.push(`output_missing_${decision}`);
  }
  if (output.activation_attribution?.neura_source !== "verifier") failures.push("source_attribution_missing");
  if (output.activation_attribution?.neura_surface !== "commerceops_fire_drill") {
    failures.push("surface_attribution_missing");
  }
  for (const flag of [
    "downstream_execution_performed_by_neura",
    "real_shopify_touched",
    "real_payment_touched",
    "real_fulfillment_touched",
    "real_discount_code_created",
    "real_customer_message_sent",
    "provider_approval_claimed",
    "compliance_certification_claimed",
    "public_action_authorized",
  ]) {
    if (output.boundary?.[flag] !== false) failures.push(`output_boundary_open_${flag}`);
  }
  for (const result of output.results ?? []) {
    if (result.decision !== result.expected_decision) failures.push(`${result.scenario_id}_output_decision_mismatch`);
    if (!result.action_card?.action_card_id) failures.push(`${result.scenario_id}_missing_action_card`);
    if (!result.decision_receipt?.receipt_id) failures.push(`${result.scenario_id}_missing_receipt`);
    if (result.commerce_route?.downstream_actions_executed_in_dry_run !== false) {
      failures.push(`${result.scenario_id}_downstream_action_executed`);
    }
    if (result.commerce_route?.execution_performed_by_neura !== false) {
      failures.push(`${result.scenario_id}_execution_boundary_open`);
    }
  }
}

if (failures.length > 0) {
  console.error("CommerceOps Fire Drill verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("CommerceOps Fire Drill verification passed.");
