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
    /approved\s+by\s+(OpenAI|Anthropic|Microsoft|Google|MCP|Stripe|Shopify|OpenTelemetry|OTel)/i,
    /(provider|maintainer|standards-body|customer)\s+(approval|endorsement|adoption|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /downstream_execution_performed_by_neura"\s*:\s*true/i,
    /private_payload_stored"\s*:\s*true/i,
    /public_action_authorized"\s*:\s*true/i,
    /github_comment_authorized"\s*:\s*true/i,
    /pr_authorized"\s*:\s*true/i,
    /provider_approval_claimed"\s*:\s*true/i,
    /customer_adoption_claimed"\s*:\s*true/i,
    /Neura\s+executes\s+(the\s+)?(tool|action|downstream)/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

const requiredFiles = [
  "docs/implementation-swat-packet-library.md",
  "examples/implementation-swat/manifest.json",
  "examples/implementation-swat/templates/schema-field-map.md",
  "examples/implementation-swat/templates/acceptance-test-fixtures.md",
  "examples/implementation-swat/templates/receipt-example.md",
  "examples/implementation-swat/templates/pr-scope.md",
  "examples/implementation-swat/templates/maintainer-reply-approval.md",
  "examples/implementation-swat/templates/no-action-readback.md",
  "scripts/verify-implementation-swat-pack.mjs",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["verify:implementation-swat-pack"] !==
  "node scripts/verify-implementation-swat-pack.mjs"
) {
  failures.push("package_missing_verify_implementation_swat_pack_script");
}

const manifest = readJson("examples/implementation-swat/manifest.json");
if (manifest.name !== "implementation-swat-packet-library") failures.push("manifest_wrong_name");
if (manifest.status !== "templates_only") failures.push("manifest_wrong_status");
if (manifest.verify_command !== "npm run verify:implementation-swat-pack") {
  failures.push("manifest_wrong_verify_command");
}

for (const boundaryFlag of [
  "templates_only",
  "public_action_authorized",
  "pr_authorized",
  "github_comment_authorized",
  "email_or_dm_authorized",
  "provider_approval_claimed",
  "customer_adoption_claimed",
  "downstream_execution_performed_by_neura",
  "private_payload_stored",
]) {
  if (!(boundaryFlag in (manifest.boundary ?? {}))) failures.push(`manifest_missing_boundary_${boundaryFlag}`);
}

for (const falseFlag of [
  "public_action_authorized",
  "pr_authorized",
  "github_comment_authorized",
  "email_or_dm_authorized",
  "provider_approval_claimed",
  "customer_adoption_claimed",
  "downstream_execution_performed_by_neura",
  "private_payload_stored",
]) {
  if (manifest.boundary?.[falseFlag] !== false) failures.push(`manifest_boundary_open_${falseFlag}`);
}
if (manifest.boundary?.templates_only !== true) failures.push("manifest_templates_only_not_true");

for (const template of manifest.templates ?? []) {
  requireFile(template.path);
}

const requiredTemplateIds = [
  "schema-field-map",
  "acceptance-test-fixtures",
  "receipt-example",
  "pr-scope",
  "maintainer-reply-approval",
  "no-action-readback",
];
const templateIds = new Set((manifest.templates ?? []).map((template) => template.id));
for (const id of requiredTemplateIds) {
  if (!templateIds.has(id)) failures.push(`manifest_missing_template_${id}`);
}

const requiredLaneIds = [
  "mcp-approval-receipt",
  "agent-io-event-envelope",
  "agent-action-firewall",
  "agentic-commerce-decision-receipt",
  "delegated-authority",
  "otel-agent-flight-recorder",
  "shadow-agent-inventory-stop-receipt",
];
const laneIds = new Set((manifest.lanes ?? []).map((lane) => lane.id));
for (const id of requiredLaneIds) {
  if (!laneIds.has(id)) failures.push(`manifest_missing_lane_${id}`);
}

const docs = read("docs/implementation-swat-packet-library.md");
requireIncludes("docs", docs, [
  "Implementation SWAT Packet Library",
  "ask -> field map -> fixture -> verifier -> example -> exact approval packet -> public action only after approval",
  "npm run verify:implementation-swat-pack",
  "MCP Approval Receipt",
  "Agentic Commerce Decision Receipt",
  "Delegated Authority",
  "OTel / Agent Flight Recorder",
  "Shadow Agent Inventory / stop receipt",
  "This library does not authorize",
]);
rejectUnsafeClaims("docs", docs);

for (const template of manifest.templates ?? []) {
  const text = read(template.path);
  requireIncludes(template.id, text, [
    "Concrete Ask",
    "Verification",
    "Boundary",
    "Approval State",
  ]);
  rejectUnsafeClaims(template.id, text);
}

const readme = read("README.md");
requireIncludes("readme", readme, [
  "Implementation SWAT Packet Library",
  "npm run verify:implementation-swat-pack",
  "docs/implementation-swat-packet-library.md",
]);
rejectUnsafeClaims("readme", readme);

const proofMap = read("docs/current-public-proof-map.md");
requireIncludes("proofMap", proofMap, [
  "Implementation SWAT Packet Library",
  "npm run verify:implementation-swat-pack",
  "schema/test/example/PR-scope templates",
]);
rejectUnsafeClaims("proofMap", proofMap);

if (failures.length > 0) {
  console.error("Implementation SWAT packet library verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Implementation SWAT packet library verification passed.");
