#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const expectedDecisions = new Set(["allow", "revise", "human_review", "stop"]);
const expectedScenarios = new Set([
  "authority-scope-allow",
  "indirect-refund-human-review",
  "scope-envelope-violation-stop",
  "valid-reads-then-export-stop",
  "purpose-drift-stop",
  "policy-revision-required",
]);

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
    /Microsoft\s+(built|owns|endorses|approved)\s+(Neura|Relay|this\s+proof)/i,
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
  "docs/authority-path-proof.md",
  "examples/authority-path/run-proof.mjs",
  "scripts/verify-authority-path-proof.mjs",
];
for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
if (
  packageJson.scripts?.["proof:authority-path"] !==
  "node examples/authority-path/run-proof.mjs"
) {
  failures.push("package_missing_proof_authority_path_script");
}
if (
  packageJson.scripts?.["verify:authority-path"] !==
  "node scripts/verify-authority-path-proof.mjs"
) {
  failures.push("package_missing_verify_authority_path_script");
}

const docs = read("docs/authority-path-proof.md");
const readme = read("README.md");

requireIncludes("docs", docs, [
  "Authority Path Proof",
  "Proposed action -> authority path review -> Decision Receipt",
  "npm run proof:authority-path -- --dry-run --json",
  "npm run verify:authority-path",
  "`allow`",
  "`revise`",
  "`human_review`",
  "`stop`",
  "No downstream execution by Neura",
]);
requireIncludes("readme", readme, [
  "Authority Path Proof",
  "npm run proof:authority-path -- --dry-run --json",
  "npm run verify:authority-path",
]);
rejectUnsafeClaims("docs", docs);
rejectUnsafeClaims("readme", readme);

const run = spawnSync(
  "npm",
  [
    "run",
    "proof:authority-path",
    "--",
    "--dry-run",
    "--json",
    "--source=verifier",
    "--campaign=pre_action_authority",
    "--surface=authority_path",
  ],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);
const output = parseJsonOutput(run, "authority_path_proof");

if (output) {
  if (output.ok !== true) failures.push("authority_path_output_not_ok");
  if (output.proof !== "authority-path") failures.push("wrong_proof_name");
  if (output.mode !== "local_dry_run_no_downstream_execution") failures.push("wrong_mode");
  if (output.scenario_count !== 6) failures.push("wrong_scenario_count");
  if (output.receipt_standard !== "neura-decision-receipt-v0.1-draft") {
    failures.push("wrong_receipt_standard");
  }
  if (output.activation_attribution?.neura_source !== "verifier") {
    failures.push("source_attribution_missing");
  }
  for (const decision of expectedDecisions) {
    if ((output.decision_counts?.[decision] ?? 0) < 1) {
      failures.push(`missing_decision_${decision}`);
    }
  }

  const seenScenarios = new Set();
  for (const result of output.results ?? []) {
    seenScenarios.add(result.scenario_id);
    const receipt = result.decision_receipt;
    const card = result.action_card;
    if (!expectedDecisions.has(result.decision)) failures.push(`${result.scenario_id}_bad_decision`);
    if (receipt?.action_card_id !== card?.action_card_id) {
      failures.push(`${result.scenario_id}_receipt_card_mismatch`);
    }
    if (receipt?.proposed_action?.params_hash !== card?.proposed_action?.params_hash) {
      failures.push(`${result.scenario_id}_params_hash_mismatch`);
    }
    for (const field of [
      "authority_path_review",
      "policy_basis",
      "evidence_basis",
      "authority",
      "validity",
      "execution",
      "trace",
      "boundary",
    ]) {
      if (!receipt?.[field]) failures.push(`${result.scenario_id}_receipt_missing_${field}`);
    }
    for (const invalidator of ["authority_path", "scope_envelope", "sequence_context"]) {
      if (!receipt?.validity?.invalid_if_changed?.includes(invalidator)) {
        failures.push(`${result.scenario_id}_missing_invalidator_${invalidator}`);
      }
    }
    if (receipt?.authority?.scope_envelope_checked !== true) {
      failures.push(`${result.scenario_id}_scope_not_checked`);
    }
    if (receipt?.boundary?.downstream_execution_performed_by_neura !== false) {
      failures.push(`${result.scenario_id}_downstream_boundary_open`);
    }
    if (result.capability_added?.neura_output?.includes("Decision Receipt") !== true) {
      failures.push(`${result.scenario_id}_missing_capability_output`);
    }
  }
  for (const scenario of expectedScenarios) {
    if (!seenScenarios.has(scenario)) failures.push(`missing_scenario_${scenario}`);
  }
  for (const flag of [
    "downstream_execution_performed_by_neura",
    "real_customer_data_used",
    "real_payment_touched",
    "real_email_sent",
    "provider_approval_claimed",
    "compliance_certification_claimed",
    "public_action_authorized",
  ]) {
    if (output.boundary?.[flag] !== false) failures.push(`boundary_open_${flag}`);
  }
}

if (failures.length > 0) {
  console.error("Authority Path Proof verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Authority Path Proof verification passed.");
