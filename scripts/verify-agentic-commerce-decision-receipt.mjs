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
    /approved\s+by\s+(Stripe|Shopify|OpenAI|Anthropic|Microsoft|Google|MCP)/i,
    /(Stripe|Shopify)\s+(integration|partnership|endorsement|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /real_payment_touched"\s*:\s*true/i,
    /real_customer_data_used"\s*:\s*true/i,
    /real_customer_message_sent"\s*:\s*true/i,
    /downstream_execution_performed_by_neura"\s*:\s*true/i,
    /Neura\s+processes\s+payments/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function valuePresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function validateReceipt(receipt) {
  for (const field of [
    "receipt_id",
    "standard",
    "created_at",
    "action_card_id",
    "decision",
    "runtime_instruction",
    "proposed_action",
    "commerce_binding",
    "risk",
    "policy_basis",
    "evidence_basis",
    "authority",
    "validity",
    "execution",
    "trace",
    "payload",
    "boundary",
  ]) {
    if (!valuePresent(receipt[field])) failures.push(`receipt_missing_${field}`);
  }

  if (receipt.standard !== "neura-decision-receipt-v0.1-draft") failures.push("receipt_wrong_standard");
  if (receipt.decision !== "human_review") failures.push("receipt_wrong_decision");
  if (receipt.runtime_instruction !== "pause_for_human_review") failures.push("receipt_wrong_runtime_instruction");
  if (receipt.proposed_action?.action_type !== "refund_order") failures.push("receipt_wrong_action_type");
  if (!receipt.proposed_action?.params_hash?.startsWith("sha256:")) failures.push("receipt_missing_params_hash");
  if (receipt.commerce_binding?.args_hash !== receipt.proposed_action?.params_hash) {
    failures.push("receipt_commerce_binding_args_hash_mismatch");
  }
  if (receipt.validity?.params_hash !== receipt.proposed_action?.params_hash) {
    failures.push("receipt_validity_params_hash_mismatch");
  }

  for (const field of [
    "merchant_ref",
    "economic_action_type",
    "commerce_surface",
    "tool_name",
    "target_ref",
    "customer_ref",
    "amount_class",
    "currency",
    "args_hash",
  ]) {
    if (!valuePresent(receipt.commerce_binding?.[field])) failures.push(`receipt_commerce_binding_missing_${field}`);
  }

  for (const invalidator of [
    "action_type",
    "target",
    "params_hash",
    "actor",
    "merchant_ref",
    "customer_ref",
    "amount_class",
    "currency",
    "policy_refs",
    "evidence_refs",
    "approval_state",
  ]) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`receipt_missing_invalidator_${invalidator}`);
    }
  }

  if (receipt.payload?.tier !== "T0") failures.push("receipt_payload_tier_not_T0");
  if (receipt.payload?.redaction_status !== "metadata_refs_hashes_only") {
    failures.push("receipt_payload_redaction_not_refs_only");
  }
  if (receipt.payload?.private_payload_stored !== false) failures.push("receipt_private_payload_open");

  for (const falseFlag of [
    "downstream_execution_performed_by_neura",
    "real_customer_data_used",
    "real_shopify_touched",
    "real_payment_touched",
    "real_fulfillment_touched",
    "real_discount_code_created",
    "real_customer_message_sent",
    "private_payload_stored",
    "provider_approval_claimed",
    "compliance_certification_claimed",
  ]) {
    if (receipt.boundary?.[falseFlag] !== false) failures.push(`receipt_boundary_open_${falseFlag}`);
  }

  if (receipt.boundary?.synthetic_data_only !== true) failures.push("receipt_not_synthetic");

  const serialized = JSON.stringify(receipt).toLowerCase();
  for (const forbiddenTerm of [
    "card_number",
    "payment_method_id",
    "customer@example",
    "session_cookie",
    "api_key",
    "bearer ",
    "secret",
  ]) {
    if (serialized.includes(forbiddenTerm)) failures.push(`receipt_contains_forbidden_term_${forbiddenTerm.trim()}`);
  }
}

function decisionReceiptAllows(receipt, candidate) {
  if (receipt.decision !== "allow") return false;
  if (receipt.payload?.private_payload_stored !== false) return false;
  if (receipt.boundary?.downstream_execution_performed_by_neura !== false) return false;

  const binding = receipt.commerce_binding ?? {};

  return (
    receipt.proposed_action?.action_type === candidate.action_type &&
    receipt.proposed_action?.target === candidate.target &&
    receipt.proposed_action?.params_hash === candidate.params_hash &&
    binding.merchant_ref === candidate.merchant_ref &&
    binding.customer_ref === candidate.customer_ref &&
    binding.amount_class === candidate.amount_class &&
    binding.currency === candidate.currency
  );
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
  "docs/agentic-commerce-decision-receipt.md",
  "docs/commerceops-fire-drill.md",
  "docs/agent-io-event-envelope.md",
  "docs/mcp-approval-receipt-kit.md",
  "examples/agentic-commerce-decision-receipt/manifest.json",
  "examples/agentic-commerce-decision-receipt/refund-over-threshold.decision-receipt.example.json",
  "examples/agentic-commerce-decision-receipt/run-proof.mjs",
  "examples/commerceops-fire-drill/run-proof.mjs",
  "schemas/decision-receipt.v0.1.json",
  "schemas/agent-io-event-envelope.v0.1.json",
  "schemas/mcp-approval-receipt.v0.1.json",
  "scripts/verify-agentic-commerce-decision-receipt.mjs",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["proof:agentic-commerce-decision-receipt"] !==
  "node examples/agentic-commerce-decision-receipt/run-proof.mjs"
) {
  failures.push("package_missing_proof_agentic_commerce_decision_receipt_script");
}
if (
  packageJson.scripts?.["verify:agentic-commerce-decision-receipt"] !==
  "node scripts/verify-agentic-commerce-decision-receipt.mjs"
) {
  failures.push("package_missing_verify_agentic_commerce_decision_receipt_script");
}

const docs = read("docs/agentic-commerce-decision-receipt.md");
const readme = read("README.md");
requireIncludes("docs", docs, [
  "Agentic Commerce Decision Receipt",
  "commerce agent intent -> Agent I/O Event -> Action Card -> Decision Receipt",
  "npm run proof:agentic-commerce-decision-receipt -- --dry-run --json",
  "npm run verify:agentic-commerce-decision-receipt",
  "metadata_refs_hashes_only",
  "private_payload_stored = false",
  "does not touch Stripe",
]);
requireIncludes("readme", readme, [
  "Agentic Commerce Decision Receipt",
  "npm run proof:agentic-commerce-decision-receipt -- --dry-run --json",
  "npm run verify:agentic-commerce-decision-receipt",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("readme", readme);

const manifest = readJson("examples/agentic-commerce-decision-receipt/manifest.json");
if (manifest.proof !== "agentic-commerce-decision-receipt") failures.push("manifest_wrong_proof");
if (manifest.source_proof !== "commerceops-fire-drill") failures.push("manifest_wrong_source_proof");
for (const decision of ["allow", "revise", "human_review", "stop"]) {
  if (!manifest.decisions_required?.includes(decision)) failures.push(`manifest_missing_decision_${decision}`);
}
for (const falseFlag of [
  "real_payment_touched",
  "real_shopify_touched",
  "real_customer_data_used",
  "real_customer_message_sent",
  "downstream_execution_performed_by_neura",
  "provider_approval_claimed",
  "compliance_certification_claimed",
]) {
  if (manifest.boundary?.[falseFlag] !== false) failures.push(`manifest_boundary_open_${falseFlag}`);
}

const receipt = readJson("examples/agentic-commerce-decision-receipt/refund-over-threshold.decision-receipt.example.json");
validateReceipt(receipt);

const baseCandidate = {
  action_type: receipt.proposed_action.action_type,
  target: receipt.proposed_action.target,
  params_hash: receipt.proposed_action.params_hash,
  merchant_ref: receipt.commerce_binding.merchant_ref,
  customer_ref: receipt.commerce_binding.customer_ref,
  amount_class: receipt.commerce_binding.amount_class,
  currency: receipt.commerce_binding.currency,
};

if (decisionReceiptAllows(receipt, baseCandidate)) {
  failures.push("human_review_receipt_must_not_authorize_execution");
}

const allowedReceipt = {
  ...receipt,
  decision: "allow",
  runtime_instruction: "continue",
  authority: { ...receipt.authority, approval_state: "approved" },
};
if (!decisionReceiptAllows(allowedReceipt, baseCandidate)) {
  failures.push("approved_matching_candidate_not_authorized");
}
for (const [label, patch] of Object.entries({
  changed_action: { action_type: "create_payment_link" },
  changed_target: { target: "order_ref_hash_changed" },
  changed_args: { params_hash: "sha256:changed" },
  changed_merchant: { merchant_ref: "merchant_ref_changed" },
  changed_customer: { customer_ref: "customer_ref_changed" },
  changed_amount: { amount_class: "refund_under_250_usd" },
  changed_currency: { currency: "EUR" },
})) {
  if (decisionReceiptAllows(allowedReceipt, { ...baseCandidate, ...patch })) {
    failures.push(`${label}_still_authorized`);
  }
}

const proofResult = parseJsonOutput(
  spawnSync("node", ["examples/agentic-commerce-decision-receipt/run-proof.mjs", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
  "agentic_commerce_proof",
);
if (proofResult) {
  if (proofResult.proof !== "agentic-commerce-decision-receipt") failures.push("proof_wrong_name");
  if (proofResult.decision !== "human_review") failures.push("proof_wrong_decision");
  if (proofResult.boundary?.downstream_execution_performed_by_neura !== false) failures.push("proof_execution_boundary_open");
}

const commerceOpsResult = parseJsonOutput(
  spawnSync("node", ["examples/commerceops-fire-drill/run-proof.mjs", "--dry-run", "--json"], {
    cwd: repoRoot,
    encoding: "utf8",
  }),
  "commerceops_source_proof",
);
if (commerceOpsResult) {
  for (const decision of ["allow", "revise", "human_review", "stop"]) {
    if (!commerceOpsResult.decisions_covered?.includes(decision)) {
      failures.push(`commerceops_source_missing_decision_${decision}`);
    }
  }
  if (commerceOpsResult.boundary?.real_payment_touched !== false) failures.push("commerceops_payment_boundary_open");
  if (commerceOpsResult.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push("commerceops_execution_boundary_open");
  }
}

if (failures.length > 0) {
  console.error("Agentic Commerce Decision Receipt verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Agentic Commerce Decision Receipt verification passed.");
