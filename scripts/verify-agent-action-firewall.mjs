#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const decisions = new Set(["allow", "revise", "human_review", "stop"]);

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
    /is\s+a\s+network\s+firewall/i,
    /is\s+an\s+endpoint\s+firewall/i,
    /provider\s+(approval|endorsement|listing|partnership)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /(approved|endorsed|listed|partnered)\s+by\s+(OpenAI|Anthropic|MCP|Shopify|Stripe|Microsoft|AWS|ClawHub|OpenClaw)/i,
    /compliance\s+(certification|approval)\s+(exists|is\s+live|is\s+active|is\s+confirmed)/i,
    /is\s+compliance\s+certified/i,
    /Neura\s+executes\s+(the\s+)?downstream/i,
    /Neura\s+performs\s+(the\s+)?tool/i,
    /Shopify\s+(integration|approved|endorsed|partnered|listed)/i,
  ];

  for (const pattern of forbidden) {
    if (pattern.test(text)) failures.push(`${label}_unsafe_claim_${pattern.source}`);
  }
}

function valuePresent(value) {
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null && value !== "";
}

function validateActionCard(file, card) {
  const required = [
    "action_card_id",
    "standard",
    "created_at",
    "actor",
    "proposed_action",
    "risk",
    "policy_refs",
    "evidence_refs",
    "authority_context",
    "execution_boundary",
    "trace",
    "boundary",
  ];
  for (const field of required) {
    if (!valuePresent(card[field])) failures.push(`${file}_action_card_missing_${field}`);
  }
  if (card.standard !== "neura-action-card-v0.1-draft") {
    failures.push(`${file}_wrong_action_card_standard`);
  }
  if (!card.proposed_action?.params_hash?.startsWith("sha256:")) {
    failures.push(`${file}_action_card_missing_params_hash`);
  }
  if (card.execution_boundary?.no_downstream_execution_by_neura !== true) {
    failures.push(`${file}_action_card_downstream_boundary_open`);
  }
  if (card.boundary?.synthetic_data_only !== true) failures.push(`${file}_action_card_not_synthetic`);
  if (card.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_action_card_neura_execution_boundary_open`);
  }
}

function validateReceipt(file, receipt, actionCard, expectedDecision) {
  const required = [
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
  for (const field of required) {
    if (!valuePresent(receipt[field])) failures.push(`${file}_receipt_missing_${field}`);
  }
  if (receipt.standard !== "neura-decision-receipt-v0.1-draft") {
    failures.push(`${file}_wrong_receipt_standard`);
  }
  if (receipt.action_card_id !== actionCard.action_card_id) {
    failures.push(`${file}_receipt_action_card_mismatch`);
  }
  if (receipt.decision !== expectedDecision) failures.push(`${file}_wrong_decision`);
  if (!decisions.has(receipt.decision)) failures.push(`${file}_invalid_decision`);
  if (receipt.proposed_action?.action_type !== actionCard.proposed_action?.action_type) {
    failures.push(`${file}_receipt_action_type_mismatch`);
  }
  if (receipt.proposed_action?.target !== actionCard.proposed_action?.target) {
    failures.push(`${file}_receipt_target_mismatch`);
  }
  if (receipt.proposed_action?.params_hash !== actionCard.proposed_action?.params_hash) {
    failures.push(`${file}_receipt_params_hash_mismatch`);
  }
  if (receipt.validity?.params_hash !== receipt.proposed_action?.params_hash) {
    failures.push(`${file}_receipt_validity_hash_mismatch`);
  }
  for (const invalidator of ["target", "params_hash", "actor", "approval_state"]) {
    if (!receipt.validity?.invalid_if_changed?.includes(invalidator)) {
      failures.push(`${file}_missing_receipt_invalidator_${invalidator}`);
    }
  }
  if (receipt.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push(`${file}_receipt_downstream_boundary_open`);
  }
  if (receipt.boundary?.real_customer_data_used !== false) {
    failures.push(`${file}_receipt_real_data_boundary_open`);
  }
  if (receipt.boundary?.provider_approval_claimed !== false) {
    failures.push(`${file}_receipt_provider_claim_boundary_open`);
  }
  if (receipt.boundary?.compliance_certification_claimed !== false) {
    failures.push(`${file}_receipt_compliance_claim_boundary_open`);
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
  "docs/agent-action-firewall.md",
  "examples/agent-action-firewall/run-proof.mjs",
  "scripts/verify-agent-action-firewall.mjs",
  "schemas/action-card.v0.1.json",
  "schemas/decision-receipt.v0.1.json",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["proof:agent-action-firewall"] !==
  "node examples/agent-action-firewall/run-proof.mjs"
) {
  failures.push("package_missing_proof_agent_action_firewall_script");
}
if (
  packageJson.scripts?.["verify:agent-action-firewall"] !==
  "node scripts/verify-agent-action-firewall.mjs"
) {
  failures.push("package_missing_verify_agent_action_firewall_script");
}

const docs = read("docs/agent-action-firewall.md");
const readme = read("README.md");
requireIncludes("docs", docs, [
  "Agent Action Firewall",
  "Action Card -> Agent Action Firewall -> Decision Receipt",
  "`allow`",
  "`revise`",
  "`human_review`",
  "`stop`",
  "npm run proof:agent-action-firewall -- --dry-run --json",
  "npm run verify:agent-action-firewall",
  "no downstream execution by Neura",
]);
requireIncludes("readme", readme, [
  "Agent Action Gateway Proof Foundation",
  "Agent Action Firewall",
  "npm run proof:agent-action-firewall -- --dry-run --json",
  "npm run verify:agent-action-firewall",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("readme", readme);

const scenarioFiles = readdirSync(path("examples/agent-action-firewall/scenarios"))
  .filter((file) => file.endsWith(".json"))
  .sort();
const receiptFiles = readdirSync(path("examples/agent-action-firewall/receipts"))
  .filter((file) => file.endsWith(".json"))
  .sort();

if (scenarioFiles.length !== 4) failures.push("wrong_firewall_scenario_count");
if (receiptFiles.length !== 4) failures.push("wrong_firewall_receipt_count");
if (JSON.stringify(scenarioFiles) !== JSON.stringify(receiptFiles)) {
  failures.push("scenario_receipt_file_mismatch");
}

const seenDecisions = new Set();
for (const file of scenarioFiles) {
  const scenario = readJson(`examples/agent-action-firewall/scenarios/${file}`);
  const receipt = readJson(`examples/agent-action-firewall/receipts/${file}`);
  seenDecisions.add(scenario.expected_decision);
  validateActionCard(file, scenario.action_card);
  validateReceipt(file, receipt, scenario.action_card, scenario.expected_decision);
}

for (const decision of decisions) {
  if (!seenDecisions.has(decision)) failures.push(`missing_firewall_decision_${decision}`);
}

const run = spawnSync(
  "npm",
  [
    "run",
    "proof:agent-action-firewall",
    "--",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=agent_action_gateway",
    "--surface=agent_action_firewall",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const output = parseJsonOutput(run, "firewall_proof");

if (output) {
  if (output.ok !== true) failures.push("firewall_output_not_ok");
  if (output.proof !== "agent-action-firewall") failures.push("firewall_wrong_proof_name");
  if (output.mode !== "local_dry_run_no_downstream_execution") failures.push("firewall_wrong_mode");
  if (output.scenario_count !== 4) failures.push("firewall_wrong_output_scenario_count");
  for (const decision of decisions) {
    if (output.decision_counts?.[decision] !== 1) {
      failures.push(`firewall_output_wrong_${decision}_count`);
    }
  }
  if (output.activation_attribution?.neura_source !== "verifier") {
    failures.push("firewall_source_attribution_missing");
  }
  if (output.boundary?.downstream_execution_performed_by_neura !== false) {
    failures.push("firewall_output_downstream_boundary_open");
  }
  for (const result of output.results ?? []) {
    if (result.decision !== result.expected_decision) {
      failures.push(`firewall_result_decision_mismatch_${result.scenario_id}`);
    }
    if (result.firewall_route?.runtime_owns_execution_decision !== true) {
      failures.push(`firewall_result_runtime_owner_missing_${result.scenario_id}`);
    }
    if (result.firewall_route?.downstream_execution_by_neura !== false) {
      failures.push(`firewall_result_downstream_boundary_open_${result.scenario_id}`);
    }
    if (result.decision_receipt?.boundary?.downstream_execution_performed_by_neura !== false) {
      failures.push(`firewall_result_receipt_boundary_open_${result.scenario_id}`);
    }
  }
}

if (failures.length > 0) {
  console.error("Agent Action Firewall verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Agent Action Firewall verification passed.");
