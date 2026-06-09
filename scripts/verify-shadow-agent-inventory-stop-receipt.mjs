#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
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
    /Neura\s+(shuts\s+down|kills|disables|revokes|quarantines)\s+(customer\s+)?agents/i,
    /Neura\s+performs\s+(the\s+)?(shutdown|kill\s*switch|quarantine|credential\s+revocation)/i,
    /kill\s*switch\s+(is\s+)?(live|active|enabled|performed\s+by\s+Neura)/i,
    /customer_runtime_shutdown_performed_by_neura"\s*:\s*true/i,
    /downstream_execution_performed_by_neura"\s*:\s*true/i,
    /private_payload_stored"\s*:\s*true/i,
    /real_customer_data_used"\s*:\s*true/i,
    /provider_approval_claimed"\s*:\s*true/i,
    /customer_adoption_claimed"\s*:\s*true/i,
    /compliance_certification_claimed"\s*:\s*true/i,
    /(provider|customer|standards-body)\s+(approval|endorsement|adoption|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function valuePresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function validateRefsOnlyPayload(label, object) {
  const serialized = JSON.stringify(object).toLowerCase();
  for (const forbiddenTerm of [
    "card_number",
    "payment_method_id",
    "customer@example",
    "session_cookie",
    "api_key",
    "bearer ",
    "secret",
    "password",
    "raw_prompt",
    "raw_tool_args",
  ]) {
    if (serialized.includes(forbiddenTerm)) failures.push(`${label}_contains_forbidden_term_${forbiddenTerm.trim()}`);
  }
}

function validateFinding(file, finding) {
  for (const field of [
    "finding_id",
    "finding_type",
    "observed_at",
    "title",
    "agent_ref",
    "runtime_ref",
    "owner_ref",
    "policy_refs",
    "evidence_refs",
    "traffic_summary",
    "risk",
    "recommended_decision",
    "stop_receipt_required",
    "boundary",
  ]) {
    if (!valuePresent(finding[field]) && typeof finding[field] !== "boolean") {
      failures.push(`${file}_finding_missing_${field}`);
    }
  }

  if (!["known_governed_agent", "stale_authority_agent", "shadow_agent_detected"].includes(finding.finding_type)) {
    failures.push(`${file}_finding_type_unknown`);
  }
  if (!["allow", "stop"].includes(finding.recommended_decision)) failures.push(`${file}_finding_bad_decision`);
  if (finding.traffic_summary?.private_payload_stored !== false) failures.push(`${file}_finding_private_payload_open`);
  if (finding.traffic_summary?.redaction_status !== "metadata_refs_hashes_only") {
    failures.push(`${file}_finding_redaction_not_refs_only`);
  }
  if (finding.boundary?.synthetic_data_only !== true) failures.push(`${file}_finding_not_synthetic`);
  if (finding.boundary?.private_payload_stored !== false) failures.push(`${file}_finding_boundary_private_payload_open`);
  if (finding.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_finding_downstream_boundary_open`);
  }
  if (finding.boundary?.customer_runtime_shutdown_performed_by_neura !== false) {
    failures.push(`${file}_finding_shutdown_boundary_open`);
  }
  validateRefsOnlyPayload(file, finding);
}

function validateReceipt(file, receipt, findingsById) {
  for (const field of [
    "receipt_id",
    "standard",
    "receipt_type",
    "created_at",
    "finding_id",
    "decision",
    "runtime_instruction",
    "decision_reason",
    "inventory",
    "risk",
    "authority",
    "recommendation",
    "execution",
    "validity",
    "trace",
    "payload",
    "boundary",
  ]) {
    if (!valuePresent(receipt[field])) failures.push(`${file}_receipt_missing_${field}`);
  }

  const finding = findingsById.get(receipt.finding_id);
  if (!finding) failures.push(`${file}_receipt_missing_matching_finding`);
  if (finding && finding.stop_receipt_required !== true) failures.push(`${file}_receipt_for_non_stop_finding`);
  if (receipt.standard !== "neura-decision-receipt-v0.1-draft") failures.push(`${file}_wrong_standard`);
  if (receipt.receipt_type !== "shadow_agent_stop_receipt") failures.push(`${file}_wrong_receipt_type`);
  if (receipt.decision !== "stop") failures.push(`${file}_wrong_decision`);
  if (receipt.runtime_instruction !== "customer_runtime_stop_or_quarantine") {
    failures.push(`${file}_wrong_runtime_instruction`);
  }

  for (const field of [
    "agent_ref",
    "runtime_ref",
    "owner_ref",
    "agent_identity_status",
    "observed_action_classes",
    "source_refs",
    "private_payload_stored",
    "redaction_status",
  ]) {
    if (!valuePresent(receipt.inventory?.[field]) && typeof receipt.inventory?.[field] !== "boolean") {
      failures.push(`${file}_inventory_missing_${field}`);
    }
  }
  if (receipt.inventory?.private_payload_stored !== false) failures.push(`${file}_inventory_private_payload_open`);
  if (receipt.inventory?.redaction_status !== "metadata_refs_hashes_only") {
    failures.push(`${file}_inventory_redaction_not_refs_only`);
  }

  if (!valuePresent(receipt.recommendation?.recommended_customer_runtime_action)) {
    failures.push(`${file}_missing_customer_runtime_recommendation`);
  }
  if (receipt.recommendation?.neura_performed_shutdown !== false) {
    failures.push(`${file}_recommendation_claims_neura_shutdown`);
  }
  if (receipt.execution?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_execution_downstream_boundary_open`);
  }
  if (receipt.execution?.customer_runtime_owns_shutdown !== true) {
    failures.push(`${file}_execution_customer_runtime_not_owner`);
  }
  if (receipt.payload?.private_payload_stored !== false) failures.push(`${file}_payload_private_open`);
  if (receipt.payload?.redaction_status !== "metadata_refs_hashes_only") {
    failures.push(`${file}_payload_redaction_not_refs_only`);
  }

  for (const invalidator of [
    "agent_ref",
    "runtime_ref",
    "owner_ref",
    "authority_refs",
    "policy_refs",
    "observed_action_classes",
    "approval_state",
    "params_hash",
  ]) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`${file}_missing_invalidator_${invalidator}`);
    }
  }

  for (const falseFlag of [
    "private_payload_stored",
    "real_customer_data_used",
    "downstream_execution_performed_by_neura",
    "customer_runtime_shutdown_performed_by_neura",
    "provider_approval_claimed",
    "customer_adoption_claimed",
    "compliance_certification_claimed",
    "public_action_authorized",
  ]) {
    if (receipt.boundary?.[falseFlag] !== false) failures.push(`${file}_boundary_open_${falseFlag}`);
  }
  if (receipt.boundary?.synthetic_data_only !== true) failures.push(`${file}_receipt_not_synthetic`);
  validateRefsOnlyPayload(file, receipt);
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
  "docs/shadow-agent-inventory-stop-receipt.md",
  "examples/shadow-agent-inventory/manifest.json",
  "examples/shadow-agent-inventory/findings/governed-support-agent.json",
  "examples/shadow-agent-inventory/findings/stale-authority-crm-agent.json",
  "examples/shadow-agent-inventory/findings/unknown-data-export-agent.json",
  "examples/shadow-agent-inventory/receipts/stale-authority-crm-agent.stop-receipt.json",
  "examples/shadow-agent-inventory/receipts/unknown-data-export-agent.stop-receipt.json",
  "examples/shadow-agent-inventory/run-proof.mjs",
  "scripts/verify-shadow-agent-inventory-stop-receipt.mjs",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["proof:shadow-agent-inventory"] !==
  "node examples/shadow-agent-inventory/run-proof.mjs"
) {
  failures.push("package_missing_proof_shadow_agent_inventory_script");
}
if (
  packageJson.scripts?.["verify:shadow-agent-inventory-stop-receipt"] !==
  "node scripts/verify-shadow-agent-inventory-stop-receipt.mjs"
) {
  failures.push("package_missing_verify_shadow_agent_inventory_script");
}

const docs = read("docs/shadow-agent-inventory-stop-receipt.md");
requireIncludes("docs", docs, [
  "Shadow Agent Inventory / Stop Receipt",
  "traffic refs -> inventory finding -> stop recommendation receipt -> customer-runtime shutdown or quarantine",
  "npm run proof:shadow-agent-inventory -- --dry-run --json",
  "npm run verify:shadow-agent-inventory-stop-receipt",
  "metadata_refs_hashes_only",
  "customer runtime owns shutdown",
  "Neura does not shut down agents",
]);
rejectUnsafeClaims("docs", docs);

const manifest = readJson("examples/shadow-agent-inventory/manifest.json");
if (manifest.name !== "shadow-agent-inventory-stop-receipt") failures.push("manifest_wrong_name");
if (manifest.status !== "synthetic_service_framing") failures.push("manifest_wrong_status");
if (manifest.proof_command !== "npm run proof:shadow-agent-inventory -- --dry-run --json") {
  failures.push("manifest_wrong_proof_command");
}
if (manifest.verify_command !== "npm run verify:shadow-agent-inventory-stop-receipt") {
  failures.push("manifest_wrong_verify_command");
}
for (const findingType of ["known_governed_agent", "stale_authority_agent", "shadow_agent_detected"]) {
  if (!manifest.finding_types?.includes(findingType)) failures.push(`manifest_missing_finding_type_${findingType}`);
}
for (const falseFlag of [
  "private_payload_stored",
  "real_customer_data_used",
  "downstream_execution_performed_by_neura",
  "customer_runtime_shutdown_performed_by_neura",
  "provider_approval_claimed",
  "customer_adoption_claimed",
  "compliance_certification_claimed",
  "public_action_authorized",
  "pr_authorized",
  "github_comment_authorized",
  "email_or_dm_authorized",
]) {
  if (manifest.boundary?.[falseFlag] !== false) failures.push(`manifest_boundary_open_${falseFlag}`);
}
if (manifest.boundary?.synthetic_data_only !== true) failures.push("manifest_not_synthetic");

const findingFiles = readdirSync(path("examples/shadow-agent-inventory/findings"))
  .filter((file) => file.endsWith(".json"))
  .sort();
const receiptFiles = readdirSync(path("examples/shadow-agent-inventory/receipts"))
  .filter((file) => file.endsWith(".json"))
  .sort();
if (findingFiles.length !== 3) failures.push("wrong_finding_count");
if (receiptFiles.length !== 2) failures.push("wrong_stop_receipt_count");

const findingsById = new Map();
for (const file of findingFiles) {
  const finding = readJson(`examples/shadow-agent-inventory/findings/${file}`);
  findingsById.set(finding.finding_id, finding);
  validateFinding(file, finding);
}

const requiredFindingTypes = new Set(["known_governed_agent", "stale_authority_agent", "shadow_agent_detected"]);
for (const findingType of [...requiredFindingTypes]) {
  if (![...findingsById.values()].some((finding) => finding.finding_type === findingType)) {
    failures.push(`missing_finding_type_${findingType}`);
  }
}
const stopFindings = [...findingsById.values()].filter((finding) => finding.stop_receipt_required);
if (stopFindings.length !== receiptFiles.length) failures.push("stop_finding_receipt_count_mismatch");

for (const file of receiptFiles) {
  const receipt = readJson(`examples/shadow-agent-inventory/receipts/${file}`);
  validateReceipt(file, receipt, findingsById);
}

const run = spawnSync(
  "npm",
  ["run", "proof:shadow-agent-inventory", "--", "--dry-run", "--json"],
  {
    cwd: repoRoot,
    encoding: "utf8",
  },
);
const runOutput = parseJsonOutput(run, "proof_run");
if (runOutput) {
  if (runOutput.proof !== "shadow-agent-inventory-stop-receipt") failures.push("proof_run_wrong_proof");
  if (runOutput.finding_count !== 3) failures.push("proof_run_wrong_finding_count");
  if (runOutput.stop_receipt_count !== 2) failures.push("proof_run_wrong_stop_receipt_count");
  if (runOutput.boundary?.customer_runtime_shutdown_performed_by_neura !== false) {
    failures.push("proof_run_shutdown_boundary_open");
  }
  if (runOutput.boundary?.private_payload_stored !== false) failures.push("proof_run_private_payload_open");
}

const readme = read("README.md");
requireIncludes("readme", readme, [
  "Shadow Agent Inventory / Stop Receipt",
  "npm run proof:shadow-agent-inventory -- --dry-run --json",
  "npm run verify:shadow-agent-inventory-stop-receipt",
]);
rejectUnsafeClaims("readme", readme);

const proofMap = read("docs/current-public-proof-map.md");
requireIncludes("proofMap", proofMap, [
  "Shadow Agent Inventory / Stop Receipt",
  "npm run proof:shadow-agent-inventory -- --dry-run --json",
  "stop recommendation receipts",
]);
rejectUnsafeClaims("proofMap", proofMap);

const swatDocs = read("docs/implementation-swat-packet-library.md");
const swatManifest = read("examples/implementation-swat/manifest.json");
requireIncludes("swatDocs", swatDocs, [
  "Shadow Agent Inventory / stop receipt",
  "npm run verify:shadow-agent-inventory-stop-receipt",
]);
requireIncludes("swatManifest", swatManifest, [
  "shadow-agent-inventory-stop-receipt",
  "npm run verify:shadow-agent-inventory-stop-receipt",
]);
rejectUnsafeClaims("swatDocs", swatDocs);
rejectUnsafeClaims("swatManifest", swatManifest);

if (failures.length > 0) {
  console.error("Shadow Agent Inventory / Stop Receipt verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Shadow Agent Inventory / Stop Receipt verification passed.");
