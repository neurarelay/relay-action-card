#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deriveStructuredResultTrustDecision } from "../examples/lib/structured-result-trust.mjs";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const expectedFixtureCount = 6;

function filePath(file) {
  return join(repoRoot, file);
}

function read(file) {
  return readFileSync(filePath(file), "utf8");
}

function readJson(file) {
  return JSON.parse(read(file));
}

function requireFile(file) {
  if (!existsSync(filePath(file))) failures.push(`missing_${file}`);
}

function validateReceipt(file, receipt) {
  const required = [
    "standard",
    "receipt_ref",
    "trace_ref",
    "operation_ref",
    "result_ref",
    "producer",
    "contract",
    "generation",
    "semantic_checks",
    "trust",
    "downstream",
    "payload",
    "boundary",
  ];
  for (const field of required) {
    if (receipt[field] === undefined || receipt[field] === null || receipt[field] === "") {
      failures.push(`${file}_missing_${field}`);
    }
  }

  if (receipt.standard !== "neura-structured-result-trust-receipt-v0.1-draft") {
    failures.push(`${file}_wrong_standard`);
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(receipt.contract?.schema_digest ?? "")) {
    failures.push(`${file}_invalid_schema_digest`);
  }
  if (!/^sha256:[a-f0-9]{64}$/.test(receipt.payload?.result_digest ?? "")) {
    failures.push(`${file}_invalid_result_digest`);
  }
  if (receipt.generation?.attempts_used > receipt.generation?.max_attempts) {
    failures.push(`${file}_attempts_exceed_cap`);
  }
  if (receipt.generation?.validation_failures >= receipt.generation?.attempts_used) {
    failures.push(`${file}_validation_failures_not_less_than_attempts`);
  }
  if (receipt.generation?.retry_exhausted !== (receipt.generation?.attempts_used === receipt.generation?.max_attempts)) {
    failures.push(`${file}_retry_exhaustion_mismatch`);
  }
  if (receipt.semantic_checks?.status === "not_run" && receipt.semantic_checks?.check_refs?.length !== 0) {
    failures.push(`${file}_not_run_semantic_checks_have_refs`);
  }
  if (receipt.semantic_checks?.status !== "not_run" && receipt.semantic_checks?.check_refs?.length === 0) {
    failures.push(`${file}_semantic_checks_missing_refs`);
  }
  if (receipt.payload?.tier !== "T0") failures.push(`${file}_payload_tier_not_T0`);
  if (receipt.payload?.redaction_status !== "metadata_refs_hashes_only") {
    failures.push(`${file}_payload_redaction_not_refs_only`);
  }
  if (receipt.payload?.private_payload_stored !== false) failures.push(`${file}_private_payload_stored`);

  const closedBoundaryFields = [
    "downstream_execution_performed_by_neura",
    "private_payload_stored",
    "provider_approval_claimed",
    "provider_integration_claimed",
    "customer_adoption_claimed",
  ];
  for (const field of closedBoundaryFields) {
    if (receipt.boundary?.[field] !== false) failures.push(`${file}_boundary_open_${field}`);
  }

  const decision = deriveStructuredResultTrustDecision(receipt);
  if (receipt.trust?.asserted_state !== decision.state) {
    failures.push(`${file}_trust_expected_${decision.state}_got_${receipt.trust?.asserted_state}`);
  }
  if (receipt.downstream?.asserted_route !== decision.route) {
    failures.push(`${file}_route_expected_${decision.route}_got_${receipt.downstream?.asserted_route}`);
  }
  if (receipt.downstream?.override_required !== decision.overrideRequired) {
    failures.push(`${file}_override_requirement_mismatch`);
  }
}

const requiredFiles = [
  "schemas/structured-result-trust-receipt.v0.1.json",
  "docs/structured-result-trust-receipt.md",
  "examples/lib/structured-result-trust.mjs",
  "scripts/verify-structured-result-trust-receipt.mjs",
  "tests/structured-result-trust-receipt.test.mjs",
];
for (const file of requiredFiles) requireFile(file);

readJson("schemas/structured-result-trust-receipt.v0.1.json");

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["verify:structured-result-trust-receipt"] !==
  "node scripts/verify-structured-result-trust-receipt.mjs"
) {
  failures.push("package_missing_structured_result_trust_verifier");
}

const docs = read("docs/structured-result-trust-receipt.md");
for (const phrase of [
  "Structured Result Trust Receipt",
  "syntax-valid is not the same as trustworthy",
  "npm run verify:structured-result-trust-receipt",
  "No downstream execution by Neura",
]) {
  if (!docs.includes(phrase)) failures.push(`docs_missing_${phrase}`);
}

const fixtureFiles = readdirSync(filePath("examples/structured-result-trust"))
  .filter((file) => file.endsWith(".example.json"))
  .sort();

if (fixtureFiles.length !== expectedFixtureCount) {
  failures.push(`expected_${expectedFixtureCount}_fixtures_got_${fixtureFiles.length}`);
}

const seenReceiptRefs = new Set();
const seenStates = new Set();
for (const file of fixtureFiles) {
  const receipt = readJson(`examples/structured-result-trust/${file}`);
  validateReceipt(file, receipt);
  if (seenReceiptRefs.has(receipt.receipt_ref)) failures.push(`${file}_duplicate_receipt_ref`);
  seenReceiptRefs.add(receipt.receipt_ref);
  seenStates.add(receipt.trust.asserted_state);
}

for (const state of ["trusted", "recovered", "degraded", "rejected", "unknown"]) {
  if (!seenStates.has(state)) failures.push(`missing_trust_state_${state}`);
}

if (failures.length > 0) {
  console.error("Structured Result Trust Receipt verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Structured Result Trust Receipt verification passed (${fixtureFiles.length} fixtures).`);
