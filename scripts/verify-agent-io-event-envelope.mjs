#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const requiredEventTypes = new Set([
  "tool.call.proposed",
  "mcp.approval.requested",
  "decision.issued",
  "execution.completed",
]);
const eventPhaseMap = {
  "tool.call.proposed": "pre_action",
  "mcp.approval.requested": "approval",
  "decision.issued": "decision",
  "execution.completed": "post_action",
};
const forbiddenExampleTerms = [
  "password",
  "private_key",
  "secret_access_key",
  "session_cookie",
  "bearer ",
  "api_key_value",
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
    /approved\s+by\s+(OpenAI|Anthropic|Microsoft|Google|MCP|Stripe|Shopify|Cloudflare)/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /is\s+compliance\s+certified/i,
    /Neura\s+executes\s+(the\s+)?(tool|downstream|action)/i,
    /stores\s+all\s+agent\s+payloads/i,
  ];
  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function valuePresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function validateHash(file, label, value) {
  if (valuePresent(value) && !String(value).startsWith("sha256:")) {
    failures.push(`${file}_${label}_must_start_sha256`);
  }
}

function validateBoundary(file, event) {
  if (event.payload?.tier !== "T0") failures.push(`${file}_payload_tier_not_T0`);
  if (event.payload?.redaction_status !== "metadata_refs_hashes_only") {
    failures.push(`${file}_payload_redaction_not_metadata_refs_hashes_only`);
  }
  if (event.payload?.private_payload_stored !== false) failures.push(`${file}_payload_private_storage_open`);
  if (event.boundary?.private_payload_stored !== false) failures.push(`${file}_boundary_private_storage_open`);
  if (event.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_downstream_boundary_open`);
  }
  if (event.boundary?.provider_approval_claimed !== false) {
    failures.push(`${file}_provider_claim_boundary_open`);
  }
  if (event.boundary?.compliance_certification_claimed !== false) {
    failures.push(`${file}_compliance_claim_boundary_open`);
  }
}

function validateEvent(file, event) {
  const required = [
    "standard",
    "event_ref",
    "event_type",
    "event_phase",
    "event_time",
    "event_sequence",
    "tenant_ref",
    "environment",
    "trace_ref",
    "actor",
    "io",
    "payload",
    "boundary",
  ];
  for (const field of required) {
    if (!valuePresent(event[field])) failures.push(`${file}_missing_${field}`);
  }
  if (event.standard !== "neura-agent-io-event-envelope-v0.1-draft") failures.push(`${file}_wrong_standard`);
  if (eventPhaseMap[event.event_type] !== event.event_phase) failures.push(`${file}_phase_mismatch`);
  if (!event.actor?.name || !event.actor?.runtime) failures.push(`${file}_missing_actor_context`);
  if (!event.io?.surface || !event.io?.direction || !event.io?.action_type) {
    failures.push(`${file}_missing_io_context`);
  }
  validateHash(file, "target_hash", event.io?.target_hash);
  validateHash(file, "args_hash", event.io?.args_hash);
  validateHash(file, "summary_hash", event.io?.summary_hash);
  if (typeof event.decision?.risk_class === "number") {
    if (event.decision.risk_class < 0 || event.decision.risk_class > 3) failures.push(`${file}_risk_out_of_range`);
  }
  validateBoundary(file, event);

  const raw = JSON.stringify(event).toLowerCase();
  for (const term of forbiddenExampleTerms) {
    if (raw.includes(term)) failures.push(`${file}_contains_forbidden_payload_term_${term.trim()}`);
  }
}

const requiredFiles = [
  "schemas/agent-io-event-envelope.v0.1.json",
  "docs/agent-io-event-envelope.md",
  "examples/agent-io/tool-call-proposed.example.json",
  "examples/agent-io/mcp-approval-requested.example.json",
  "examples/agent-io/decision-issued.example.json",
  "examples/agent-io/execution-completed.example.json",
  "scripts/verify-agent-io-event-envelope.mjs",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (packageJson.scripts?.["verify:agent-io-event-envelope"] !== "node scripts/verify-agent-io-event-envelope.mjs") {
  failures.push("package_missing_verify_agent_io_event_envelope_script");
}

readJson("schemas/agent-io-event-envelope.v0.1.json");

const docs = read("docs/agent-io-event-envelope.md");
requireIncludes("docs", docs, [
  "Agent I/O Event Envelope",
  "agent intent -> Agent I/O Event -> Action Card -> Decision Receipt -> Traffic Ledger",
  "metadata_refs_hashes_only",
  "private_payload_stored = false",
  "npm run verify:agent-io-event-envelope",
]);
rejectUnsafeClaims("docs", docs);

const eventFiles = readdirSync(path("examples/agent-io"))
  .filter((file) => file.endsWith(".json") && file.includes("example"))
  .filter((file) => !file.includes("approval-receipt"))
  .sort();
const seenRefs = new Set();
const seenEventTypes = new Set();
const seenSequence = [];

for (const file of eventFiles) {
  const event = readJson(`examples/agent-io/${file}`);
  validateEvent(file, event);
  if (seenRefs.has(event.event_ref)) failures.push(`${file}_duplicate_event_ref`);
  seenRefs.add(event.event_ref);
  seenEventTypes.add(event.event_type);
  seenSequence.push(event.event_sequence);
}

for (const eventType of requiredEventTypes) {
  if (!seenEventTypes.has(eventType)) failures.push(`missing_event_type_${eventType}`);
}

const sortedSequence = [...seenSequence].sort((a, b) => a - b);
const expectedSequence = Array.from({ length: sortedSequence.length }, (_, index) => index + 1);
if (JSON.stringify(sortedSequence) !== JSON.stringify(expectedSequence)) failures.push("event_sequence_not_consecutive");

if (failures.length > 0) {
  console.error("Agent I/O Event Envelope verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Agent I/O Event Envelope verification passed.");
