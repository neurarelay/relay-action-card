#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const decisions = ["allow", "revise", "human_review", "stop"];

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
    /(approved|endorsed|partnered)\s+by\s+(OpenAI|Anthropic|MCP|Shopify|Stripe|Microsoft|Google|AWS|ClawHub|OpenClaw)/i,
    /provider\s+(approval|endorsement|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /is\s+compliance\s+certified/i,
    /public\s+token\s+issuance\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /Registry\s+auto-approval\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /downstream_execution_performed_by_neura"\s*:\s*true/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
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
  "docs/agent-action-gateway.md",
  "docs/agent-action-firewall.md",
  "docs/decision-receipt-standard.md",
  "docs/mcp-risk-gate.md",
  "docs/commerceops-fire-drill.md",
  "scripts/run-agent-action-gateway.mjs",
  "scripts/verify-agent-action-gateway.mjs",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["proof:agent-action-gateway"] !==
  "node scripts/run-agent-action-gateway.mjs"
) {
  failures.push("package_missing_proof_agent_action_gateway_script");
}
if (
  packageJson.scripts?.["verify:agent-action-gateway"] !==
  "node scripts/verify-agent-action-gateway.mjs"
) {
  failures.push("package_missing_verify_agent_action_gateway_script");
}

const readme = read("README.md");
const docs = read("docs/agent-action-gateway.md");

requireIncludes("readme", readme, [
  "Agent Action Gateway",
  "https://www.neurarelay.com/agent-action-gateway",
  "npm run proof:agent-action-gateway -- --dry-run --json",
  "npm run verify:agent-action-gateway",
  "Agent Action Firewall",
  "Decision Receipt Standard",
  "MCP Risk Gate",
  "CommerceOps Fire Drill",
  "No downstream execution by Neura",
]);
requireIncludes("docs", docs, [
  "Agent intent -> Action Card -> Agent Action Gateway -> Decision Receipt",
  "npm run proof:agent-action-gateway -- --dry-run --json",
  "npm run verify:agent-action-gateway",
  "Agent Action Firewall",
  "Decision Receipt Standard",
  "MCP Risk Gate",
  "CommerceOps Fire Drill",
  "No downstream execution by Neura",
  "https://www.neurarelay.com/agent-action-gateway",
]);
rejectUnsafeClaims("readme", readme);
rejectUnsafeClaims("docs", docs);

const run = spawnSync(
  "npm",
  [
    "run",
    "proof:agent-action-gateway",
    "--",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=agent_action_gateway",
    "--surface=gateway_ladder",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const output = parseJsonOutput(run, "agent_action_gateway_proof");

if (output) {
  if (output.ok !== true) failures.push("gateway_output_not_ok");
  if (output.proof !== "agent-action-gateway") failures.push("wrong_gateway_proof_name");
  if (output.mode !== "local_dry_run_gateway_ladder_no_downstream_execution") {
    failures.push("wrong_gateway_mode");
  }
  if (output.scenario_count !== 16) failures.push("wrong_gateway_scenario_count");
  if (output.proof_ladder?.length !== 4) failures.push("wrong_gateway_ladder_length");
  for (const step of ["01", "02", "03", "04"]) {
    if (!output.proof_ladder?.some((result) => result.step === step && result.ok === true)) {
      failures.push(`missing_gateway_step_${step}`);
    }
  }
  for (const decision of decisions) {
    if ((output.decision_counts?.[decision] ?? 0) < 1) {
      failures.push(`gateway_missing_decision_${decision}`);
    }
  }
  if (output.activation_attribution?.neura_source !== "verifier") {
    failures.push("gateway_source_attribution_missing");
  }
  for (const flag of [
    "downstream_execution_performed_by_neura",
    "real_mcp_server_called",
    "real_shopify_touched",
    "real_payment_touched",
    "real_fulfillment_touched",
    "real_discount_code_created",
    "real_customer_message_sent",
    "provider_approval_claimed",
    "compliance_certification_claimed",
    "public_action_authorized",
  ]) {
    if (output.boundary?.[flag] !== false) failures.push(`gateway_boundary_open_${flag}`);
  }
}

if (failures.length > 0) {
  console.error("Agent Action Gateway verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Agent Action Gateway verification passed.");
