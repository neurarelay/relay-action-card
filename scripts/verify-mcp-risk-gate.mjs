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
    /MCP\s+Risk\s+Gate\s+is\s+(an?\s+)?official\s+MCP\s+(server|gateway|host|provider|listing|registry)/i,
    /(approved|endorsed|listed|partnered)\s+by\s+(OpenAI|Anthropic|MCP|Microsoft|Google|AWS|Cloudflare|Kong|Shopify|Stripe)/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /is\s+compliance\s+certified/i,
    /Neura\s+executes\s+(the\s+)?(tool|downstream)/i,
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

function validateScenario(file, scenario) {
  const call = scenario.mcp_call;
  for (const field of ["mcp_server", "tool_name", "target", "params", "params_hash", "actor", "risk_context", "policy_refs", "evidence_refs", "attribution"]) {
    if (!valuePresent(call?.[field])) failures.push(`${file}_missing_mcp_call_${field}`);
  }
  if (!call?.params_hash?.startsWith("sha256:")) failures.push(`${file}_missing_stable_params_hash`);
  if (!call?.actor?.agent_name || !call?.actor?.runtime) failures.push(`${file}_missing_actor_context`);
  if (!decisions.has(scenario.expected_decision)) failures.push(`${file}_invalid_expected_decision`);
  if (scenario.runtime_instruction !== runtimeMap[scenario.expected_decision]) {
    failures.push(`${file}_runtime_instruction_mismatch`);
  }
}

function validateReceipt(file, receipt, scenario) {
  const call = scenario.mcp_call;
  for (const field of ["receipt_id", "standard", "action_card_id", "decision", "runtime_instruction", "actor", "proposed_action", "risk", "policy_basis", "evidence_basis", "authority", "mcp_binding", "validity", "execution", "trace", "boundary"]) {
    if (!valuePresent(receipt[field])) failures.push(`${file}_receipt_missing_${field}`);
  }
  if (receipt.standard !== "neura-decision-receipt-v0.1-draft") failures.push(`${file}_wrong_standard`);
  if (receipt.decision !== scenario.expected_decision) failures.push(`${file}_decision_mismatch`);
  if (receipt.runtime_instruction !== runtimeMap[receipt.decision]) {
    failures.push(`${file}_runtime_map_mismatch`);
  }
  if (receipt.proposed_action?.action_type !== call.tool_name) failures.push(`${file}_tool_mismatch`);
  if (receipt.proposed_action?.target !== call.target) failures.push(`${file}_target_mismatch`);
  if (receipt.proposed_action?.params_hash !== call.params_hash) failures.push(`${file}_params_hash_mismatch`);
  if (receipt.mcp_binding?.mcp_server !== call.mcp_server) failures.push(`${file}_server_binding_mismatch`);
  if (receipt.mcp_binding?.tool_name !== call.tool_name) failures.push(`${file}_tool_binding_mismatch`);
  if (receipt.mcp_binding?.target !== call.target) failures.push(`${file}_target_binding_mismatch`);
  if (receipt.mcp_binding?.actor !== call.actor.agent_name) failures.push(`${file}_actor_binding_mismatch`);
  if (receipt.mcp_binding?.params_hash !== call.params_hash) failures.push(`${file}_params_binding_mismatch`);

  for (const invalidator of ["mcp_server", "tool_name", "target", "params_hash", "actor"]) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`${file}_missing_invalidator_${invalidator}`);
    }
  }

  if (receipt.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_downstream_boundary_open`);
  }
  if (receipt.boundary?.real_mcp_server_called !== false) failures.push(`${file}_real_mcp_boundary_open`);
  if (receipt.boundary?.provider_approval_claimed !== false) {
    failures.push(`${file}_provider_claim_boundary_open`);
  }
  if (receipt.boundary?.compliance_certification_claimed !== false) {
    failures.push(`${file}_compliance_claim_boundary_open`);
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
  "docs/mcp-risk-gate.md",
  "examples/mcp-risk-gate/run-proof.mjs",
  "scripts/verify-mcp-risk-gate.mjs",
  "schemas/action-card.v0.1.json",
  "schemas/decision-receipt.v0.1.json",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (packageJson.scripts?.["proof:mcp-risk-gate"] !== "node examples/mcp-risk-gate/run-proof.mjs") {
  failures.push("package_missing_proof_mcp_risk_gate_script");
}
if (packageJson.scripts?.["verify:mcp-risk-gate"] !== "node scripts/verify-mcp-risk-gate.mjs") {
  failures.push("package_missing_verify_mcp_risk_gate_script");
}

const docs = read("docs/mcp-risk-gate.md");
const readme = read("README.md");
requireIncludes("docs", docs, [
  "MCP Risk Gate",
  "MCP tool-call intent -> Action Card -> Pre-Action Authority -> Decision Receipt",
  "server, tool, target, actor, or params hash changes",
  "`allow`",
  "`revise`",
  "`human_review`",
  "`stop`",
  "npm run proof:mcp-risk-gate -- --dry-run --json",
  "npm run verify:mcp-risk-gate",
  "does not call a real MCP server",
]);
requireIncludes("readme", readme, [
  "MCP Risk Gate",
  "npm run proof:mcp-risk-gate -- --dry-run --json",
  "npm run verify:mcp-risk-gate",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("readme", readme);

const scenarioFiles = readdirSync(path("examples/mcp-risk-gate/scenarios"))
  .filter((file) => file.endsWith(".json"))
  .sort();
const receiptFiles = readdirSync(path("examples/mcp-risk-gate/receipts"))
  .filter((file) => file.endsWith(".json"))
  .sort();

if (scenarioFiles.length < 6) failures.push("not_enough_mcp_risk_gate_scenarios");
if (JSON.stringify(scenarioFiles) !== JSON.stringify(receiptFiles)) {
  failures.push("scenario_receipt_file_mismatch");
}

const seenDecisions = new Set();
for (const file of scenarioFiles) {
  const scenario = readJson(`examples/mcp-risk-gate/scenarios/${file}`);
  const receipt = readJson(`examples/mcp-risk-gate/receipts/${file}`);
  validateScenario(file, scenario);
  validateReceipt(file, receipt, scenario);
  seenDecisions.add(scenario.expected_decision);
}
for (const decision of decisions) {
  if (!seenDecisions.has(decision)) failures.push(`missing_decision_${decision}`);
}

const run = spawnSync(
  "npm",
  [
    "run",
    "proof:mcp-risk-gate",
    "--",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=pre_action_authority",
    "--surface=mcp_risk_gate",
  ],
  { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
);
const output = parseJsonOutput(run, "mcp_risk_gate_proof");

if (output) {
  if (output.ok !== true) failures.push("proof_output_not_ok");
  if (output.proof !== "mcp-risk-gate") failures.push("wrong_proof_name");
  if (output.mode !== "local_dry_run_mcp_tool_call_no_downstream_execution") {
    failures.push("wrong_proof_mode");
  }
  if (output.scenario_count < 6) failures.push("wrong_output_scenario_count");
  for (const decision of decisions) {
    if ((output.decision_counts?.[decision] ?? 0) < 1) failures.push(`output_missing_${decision}`);
  }
  if (output.activation_attribution?.neura_source !== "verifier") {
    failures.push("source_attribution_missing");
  }
  if (output.boundary?.real_mcp_server_called !== false) failures.push("output_real_mcp_boundary_open");
  if (output.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push("output_downstream_boundary_open");
  }
  for (const result of output.results ?? []) {
    if (result.decision !== result.expected_decision) {
      failures.push(`result_decision_mismatch_${result.scenario_id}`);
    }
    if (result.runtime_instruction !== result.expected_runtime_instruction) {
      failures.push(`result_runtime_instruction_mismatch_${result.scenario_id}`);
    }
    const checks = result.receipt_validity_checks ?? {};
    if (checks.unchanged_call !== true) failures.push(`unchanged_call_not_valid_${result.scenario_id}`);
    for (const key of ["changed_server", "changed_tool", "changed_target", "changed_actor", "changed_params_hash"]) {
      if (checks[key] !== false) failures.push(`${key}_still_valid_${result.scenario_id}`);
    }
    if (result.runtime_route?.runtime_owns_execution_decision !== true) {
      failures.push(`runtime_owner_missing_${result.scenario_id}`);
    }
    if (result.runtime_route?.execution_performed_by_neura !== false) {
      failures.push(`runtime_execution_boundary_open_${result.scenario_id}`);
    }
  }
}

if (failures.length > 0) {
  console.error("MCP Risk Gate verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("MCP Risk Gate verification passed.");
