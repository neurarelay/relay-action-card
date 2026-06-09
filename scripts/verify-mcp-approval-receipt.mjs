#!/usr/bin/env node

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
    /approved\s+by\s+(OpenAI|Anthropic|Microsoft|Google|MCP|Stripe|Shopify|Cloudflare)/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /is\s+compliance\s+certified/i,
    /Neura\s+executes\s+(the\s+)?(tool|downstream|action)/i,
    /real\s+MCP\s+server\s+called:\s+true/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function valuePresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function validateReceipt(file, receipt) {
  const required = [
    "approval_receipt_id",
    "standard",
    "created_at",
    "approval_request_id",
    "decision_receipt_id",
    "mcp_binding",
    "approval",
    "validity",
    "execution",
    "trace",
    "payload",
    "boundary",
  ];
  for (const field of required) {
    if (!valuePresent(receipt[field])) failures.push(`${file}_missing_${field}`);
  }
  if (receipt.standard !== "neura-mcp-approval-receipt-v0.1-draft") failures.push(`${file}_wrong_standard`);
  if (!receipt.mcp_binding?.args_hash?.startsWith("sha256:")) failures.push(`${file}_missing_args_hash`);
  for (const invalidator of [
    "tenant_ref",
    "environment",
    "mcp_server_ref",
    "tool_name",
    "target_ref",
    "args_hash",
    "actor_ref",
    "policy_refs",
    "evidence_refs",
    "approval_state",
  ]) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`${file}_missing_invalidator_${invalidator}`);
    }
  }
  if (receipt.payload?.tier !== "T0") failures.push(`${file}_payload_tier_not_T0`);
  if (receipt.payload?.redaction_status !== "metadata_refs_hashes_only") {
    failures.push(`${file}_payload_redaction_not_metadata_refs_hashes_only`);
  }
  if (receipt.payload?.private_payload_stored !== false) failures.push(`${file}_payload_private_storage_open`);
  if (receipt.boundary?.private_payload_stored !== false) failures.push(`${file}_boundary_private_storage_open`);
  if (receipt.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_downstream_boundary_open`);
  }
  if (receipt.boundary?.real_mcp_server_called !== false) failures.push(`${file}_real_mcp_boundary_open`);
  if (receipt.boundary?.provider_approval_claimed !== false) failures.push(`${file}_provider_claim_boundary_open`);
  if (receipt.boundary?.compliance_certification_claimed !== false) {
    failures.push(`${file}_compliance_claim_boundary_open`);
  }
}

function approvalAuthorizes(receipt, candidate, nowIso) {
  const binding = receipt.mcp_binding ?? {};
  const approval = receipt.approval ?? {};
  const validity = receipt.validity ?? {};
  const now = Date.parse(nowIso);
  const expires = Date.parse(validity.valid_until);

  if (approval.state !== "approved") return false;
  if (!Number.isFinite(expires) || now > expires) return false;
  if (validity.one_shot && validity.consumed_at) return false;
  if (receipt.payload?.private_payload_stored !== false) return false;
  if (receipt.boundary?.downstream_execution_performed_by_neura !== false) return false;
  if (receipt.boundary?.real_mcp_server_called !== false) return false;

  return (
    binding.tenant_ref === candidate.tenant_ref &&
    binding.environment === candidate.environment &&
    binding.mcp_server_ref === candidate.mcp_server_ref &&
    binding.tool_name === candidate.tool_name &&
    binding.target_ref === candidate.target_ref &&
    binding.args_hash === candidate.args_hash &&
    binding.actor_ref === candidate.actor_ref
  );
}

const requiredFiles = [
  "schemas/mcp-approval-receipt.v0.1.json",
  "docs/mcp-approval-receipt-kit.md",
  "examples/agent-io/mcp-approval-receipt-approved.example.json",
  "scripts/verify-mcp-approval-receipt.mjs",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (packageJson.scripts?.["verify:mcp-approval-receipt"] !== "node scripts/verify-mcp-approval-receipt.mjs") {
  failures.push("package_missing_verify_mcp_approval_receipt_script");
}

readJson("schemas/mcp-approval-receipt.v0.1.json");

const docs = read("docs/mcp-approval-receipt-kit.md");
requireIncludes("docs", docs, [
  "MCP Approval Receipt Kit",
  "MCP tool call proposed",
  "changed args",
  "one-shot",
  "expired approval",
  "metadata_refs_hashes_only",
  "private_payload_stored = false",
  "npm run verify:mcp-approval-receipt",
]);
rejectUnsafeClaims("docs", docs);

const receipt = readJson("examples/agent-io/mcp-approval-receipt-approved.example.json");
validateReceipt("mcp-approval-receipt-approved.example.json", receipt);

const baseCandidate = {
  tenant_ref: receipt.mcp_binding.tenant_ref,
  environment: receipt.mcp_binding.environment,
  mcp_server_ref: receipt.mcp_binding.mcp_server_ref,
  tool_name: receipt.mcp_binding.tool_name,
  target_ref: receipt.mcp_binding.target_ref,
  args_hash: receipt.mcp_binding.args_hash,
  actor_ref: receipt.mcp_binding.actor_ref,
};

if (!approvalAuthorizes(receipt, baseCandidate, "2026-06-09T16:04:00Z")) {
  failures.push("base_candidate_not_authorized");
}

const changedCases = {
  changed_tenant: { tenant_ref: "tenant_ref_changed" },
  changed_environment: { environment: "production" },
  changed_server: { mcp_server_ref: "mcp_server_ref_changed" },
  changed_tool: { tool_name: "refund_order_changed" },
  changed_target: { target_ref: "order_ref_hash_changed" },
  changed_args: { args_hash: "sha256:changed" },
  changed_actor: { actor_ref: "registry_agent_ref_changed" },
};

for (const [label, patch] of Object.entries(changedCases)) {
  if (approvalAuthorizes(receipt, { ...baseCandidate, ...patch }, "2026-06-09T16:04:00Z")) {
    failures.push(`${label}_still_authorized`);
  }
}

if (approvalAuthorizes(receipt, baseCandidate, "2026-06-09T16:09:00Z")) {
  failures.push("expired_receipt_still_authorized");
}

const consumedReceipt = {
  ...receipt,
  validity: { ...receipt.validity, consumed_at: "2026-06-09T16:04:30Z" },
};
if (approvalAuthorizes(consumedReceipt, baseCandidate, "2026-06-09T16:05:00Z")) {
  failures.push("consumed_one_shot_still_authorized");
}

const pendingReceipt = {
  ...receipt,
  approval: { ...receipt.approval, state: "pending" },
};
if (approvalAuthorizes(pendingReceipt, baseCandidate, "2026-06-09T16:04:00Z")) {
  failures.push("pending_approval_authorized");
}

if (failures.length > 0) {
  console.error("MCP Approval Receipt verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("MCP Approval Receipt verification passed.");
