#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const allowedDecisions = new Set(["allow", "revise", "human_review", "stop"]);
const requiredTopLevel = [
  "receipt_id",
  "standard",
  "created_at",
  "action_card_id",
  "decision",
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
];
const requiredInvalidators = [
  "action_type",
  "target",
  "params_hash",
  "actor",
  "policy_refs",
  "evidence_refs",
  "approval_state",
  "required_authority_role",
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
    /is\s+an\s+industry\s+standard/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /(approved|endorsed|listed|partnered)\s+by\s+(OpenAI|Anthropic|MCP|Shopify|Stripe|Microsoft|AWS|ClawHub|OpenClaw)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /is\s+compliance\s+certified/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /Neura\s+performs\s+(the\s+)?tool/i,
    /production\s+integration\s+(is\s+)?(live|approved|certified)/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function valuePresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function receiptAppliesTo(receipt, candidate) {
  return (
    receipt.validity.valid_for_action_type === candidate.action_type &&
    receipt.validity.valid_for_target === candidate.target &&
    receipt.validity.params_hash === candidate.params_hash &&
    receipt.actor.name === candidate.actor_name &&
    receipt.authority.approval_state === candidate.approval_state
  );
}

function validateReceipt(file, receipt) {
  for (const field of requiredTopLevel) {
    if (!valuePresent(receipt[field])) failures.push(`${file}_missing_${field}`);
  }

  if (receipt.standard !== "neura-decision-receipt-v0.1-draft") {
    failures.push(`${file}_wrong_standard`);
  }
  if (!allowedDecisions.has(receipt.decision)) failures.push(`${file}_invalid_decision`);
  if (!receipt.proposed_action?.params_hash?.startsWith("sha256:")) {
    failures.push(`${file}_missing_params_hash`);
  }
  if (receipt.validity?.params_hash !== receipt.proposed_action?.params_hash) {
    failures.push(`${file}_validity_params_hash_mismatch`);
  }
  if (receipt.validity?.valid_for_action_type !== receipt.proposed_action?.action_type) {
    failures.push(`${file}_validity_action_type_mismatch`);
  }
  if (receipt.validity?.valid_for_target !== receipt.proposed_action?.target) {
    failures.push(`${file}_validity_target_mismatch`);
  }

  for (const invalidator of requiredInvalidators) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`${file}_missing_invalidator_${invalidator}`);
    }
  }

  if (receipt.risk?.consequence_score >= 2) {
    if (!valuePresent(receipt.policy_basis)) failures.push(`${file}_missing_policy_basis`);
    if (!valuePresent(receipt.evidence_basis)) failures.push(`${file}_missing_evidence_basis`);
    if (!valuePresent(receipt.authority?.authority_ref)) failures.push(`${file}_missing_authority_ref`);
  }

  if (receipt.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_downstream_execution_boundary_open`);
  }
  if (receipt.boundary?.real_customer_data_used !== false) {
    failures.push(`${file}_real_data_boundary_open`);
  }
  if (receipt.boundary?.provider_approval_claimed !== false) {
    failures.push(`${file}_provider_claim_boundary_open`);
  }
  if (receipt.boundary?.compliance_certification_claimed !== false) {
    failures.push(`${file}_compliance_claim_boundary_open`);
  }
  if (!receipt.execution?.execution_boundary?.includes("Neura returns a Decision Receipt only")) {
    failures.push(`${file}_missing_execution_boundary_copy`);
  }

  const baseCandidate = {
    action_type: receipt.proposed_action.action_type,
    target: receipt.proposed_action.target,
    params_hash: receipt.proposed_action.params_hash,
    actor_name: receipt.actor.name,
    approval_state: receipt.authority.approval_state,
  };

  if (!receiptAppliesTo(receipt, baseCandidate)) failures.push(`${file}_base_candidate_invalid`);
  if (receiptAppliesTo(receipt, { ...baseCandidate, target: "changed-target" })) {
    failures.push(`${file}_changed_target_still_valid`);
  }
  if (receiptAppliesTo(receipt, { ...baseCandidate, params_hash: "sha256:changed" })) {
    failures.push(`${file}_changed_params_hash_still_valid`);
  }
  if (receiptAppliesTo(receipt, { ...baseCandidate, actor_name: "Changed Agent" })) {
    failures.push(`${file}_changed_actor_still_valid`);
  }
  if (receiptAppliesTo(receipt, { ...baseCandidate, approval_state: "changed" })) {
    failures.push(`${file}_changed_approval_state_still_valid`);
  }
}

const requiredFiles = [
  "docs/decision-receipt-standard.md",
  "schemas/action-card.v0.1.json",
  "schemas/decision-receipt.v0.1.json",
  "examples/decision-receipts/internal-status-lookup-allow.json",
  "examples/decision-receipts/commerceops-discount-revise.json",
  "examples/decision-receipts/frontsmith-website-update-human-review.json",
  "examples/decision-receipts/commerceops-refund-human-review.json",
  "examples/decision-receipts/mcp-risk-gate-tool-call-stop.json",
  "examples/decision-receipts/clinicops-prior-auth-human-review.json",
  "scripts/verify-decision-receipt-standard.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["verify:decision-receipt-standard"] !==
  "node scripts/verify-decision-receipt-standard.mjs"
) {
  failures.push("package_missing_verify_decision_receipt_standard_script");
}

const docs = read("docs/decision-receipt-standard.md");
const readme = read("README.md");
requireIncludes("docs", docs, [
  "Decision Receipt Standard v0.1",
  "Action Card -> Pre-Action Authority -> Decision Receipt",
  "`allow`",
  "`revise`",
  "`human_review`",
  "`stop`",
  "npm run verify:decision-receipt-standard",
  "changed target",
  "changed params hash",
  "changed actor",
  "changed approval state",
  "no-downstream-execution boundary",
]);
requireIncludes("readme", readme, [
  "Pre-Action Authority Proof Foundation",
  "Decision Receipt Standard",
  "npm run verify:decision-receipt-standard",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("readme", readme);

readJson("schemas/action-card.v0.1.json");
readJson("schemas/decision-receipt.v0.1.json");

const receiptDir = path("examples/decision-receipts");
const receiptFiles = readdirSync(receiptDir).filter((file) => file.endsWith(".json")).sort();
if (receiptFiles.length < 6) failures.push("not_enough_decision_receipt_examples");

const decisions = new Set();
for (const file of receiptFiles) {
  const receipt = readJson(`examples/decision-receipts/${file}`);
  decisions.add(receipt.decision);
  validateReceipt(file, receipt);
}

for (const decision of allowedDecisions) {
  if (!decisions.has(decision)) failures.push(`missing_decision_example_${decision}`);
}

if (failures.length > 0) {
  console.error("Decision Receipt Standard verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Decision Receipt Standard verification passed.");
