#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
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

function rejectUnsafe(label, text) {
  const forbidden = [
    "approved by OpenClaw",
    "partnered with OpenClaw",
    "listed on ClawHub",
    "official ClawHub listing",
    "official OpenClaw listing",
    "official OpenAI approval",
    "official Anthropic approval",
    "OpenAI partnership",
    "Anthropic partnership",
    "Claude partnership",
    "enables public API key issuance",
    "enables public production MCP token issuance",
    "enables public A2A token issuance",
    "enables unprotected A2A execution",
    "executes downstream actions by Neura",
    "full Authority Decision Engine is complete",
    "PRIVATE_KEY",
    "SECRET",
    "PASSWORD",
    "token_value",
    "private_payload_value",
    "rawMessageBody",
    "rawFileContents",
    "rawBrowserFormValues",
    "rawShellCommand",
    "\"body\"",
    "\"content\"",
    "\"messageBody\"",
    "\"fileContents\"",
    "\"formValues\"",
    "\"rawCommand\"",
    "\"token\"",
    "\"secret\"",
    "\"password\"",
  ];
  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_${phrase}`);
  }
}

function runNode(args) {
  return spawnSync(process.execPath, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "docs/openclaw-developer-journey.md",
  "docs/openclaw-severe-scenario-proof-pack.md",
  "examples/openclaw/README.md",
  "examples/openclaw/run-developer-journey-proof.mjs",
  "examples/openclaw/run-severe-scenario-proof.mjs",
  "examples/openclaw/severe-scenario-proof/scenario.json",
  "scripts/verify-openclaw-severe-scenario-proof.mjs",
  "tests/openclaw-severe-scenario-proof.test.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
const expectedScripts = {
  "openclaw:severe-proof": "node examples/openclaw/run-severe-scenario-proof.mjs",
  "verify:openclaw-severe-proof":
    "node scripts/verify-openclaw-severe-scenario-proof.mjs",
  "test:openclaw-severe-proof": "node --test tests/openclaw-severe-scenario-proof.test.mjs",
};
for (const [script, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[script] !== command) {
    failures.push(`package_script_${script}_expected_${command}`);
  }
}

const model = readJson("examples/openclaw/severe-scenario-proof/scenario.json");
if (model.name !== "OpenClaw Severe End-to-End Proof Pack") failures.push("model_wrong_name");
if (model.mode !== "safe_local_projection") failures.push("model_wrong_mode");
rejectUnsafe("model", JSON.stringify(model));

if (model.checkpoints?.length !== 5) failures.push("model_wrong_checkpoint_count");
const decisions = new Set(model.checkpoints?.map((checkpoint) => checkpoint.decision));
for (const decision of ["human_review", "revise", "stop"]) {
  if (!decisions.has(decision)) failures.push(`model_missing_decision_${decision}`);
}
const riskClasses = new Set(model.checkpoints?.map((checkpoint) => checkpoint.risk_class));
for (const riskClass of ["critical", "high"]) {
  if (!riskClasses.has(riskClass)) failures.push(`model_missing_risk_${riskClass}`);
}

for (const checkpoint of model.checkpoints ?? []) {
  for (const key of [
    "id",
    "phase",
    "family",
    "title",
    "proposed_action",
    "summary",
    "target_ref",
    "affected_object_ref",
    "risk_class",
    "decision",
    "route",
    "authority_status",
    "policy_status",
    "evidence_status",
    "confidence_band",
    "what_neura_catches",
    "developer_next_step",
  ]) {
    if (!checkpoint[key] && checkpoint[key] !== 0) {
      failures.push(`checkpoint_${checkpoint.id ?? "unknown"}_missing_${key}`);
    }
  }
  if (!String(checkpoint.target_ref).includes("_ref:")) {
    failures.push(`checkpoint_${checkpoint.id}_target_not_ref`);
  }
  if (!String(checkpoint.affected_object_ref).includes("_ref:")) {
    failures.push(`checkpoint_${checkpoint.id}_affected_not_ref`);
  }
  if (!["critical", "high"].includes(checkpoint.risk_class)) {
    failures.push(`checkpoint_${checkpoint.id}_risk_not_severe_enough`);
  }
}

for (const [key, value] of Object.entries(model.boundaries ?? {})) {
  if (["developer_owned_execution", "refs_only", "safe_local_projection"].includes(key)) {
    if (value !== true) failures.push(`boundary_${key}_not_true`);
  } else if (value !== false) {
    failures.push(`boundary_${key}_not_false`);
  }
}

const docs = read("docs/openclaw-severe-scenario-proof-pack.md");
requireIncludes("docs/openclaw-severe-scenario-proof-pack.md", docs, [
  "OpenClaw Severe Scenario Proof Pack",
  "Agent intent -> checkpoints -> Action Cards -> Decision Receipts -> developer-owned next step",
  "npm run openclaw:severe-proof",
  "npm run openclaw:severe-proof -- --live --json",
  "npm run verify:openclaw-severe-proof",
  "npm run test:openclaw-severe-proof",
  "npm run verify:openclaw-developer-journey",
  "artifacts/openclaw-severe-scenario-proof/report.html",
  "Export customer account dataset",
  "Submit exported data to external vendor portal",
  "Delete local working copy before audit handoff",
  "official OpenClaw or ClawHub integration",
  "private payload exposure",
]);
rejectUnsafe("docs/openclaw-severe-scenario-proof-pack.md", docs);

const readme = read("README.md");
requireIncludes("README.md", readme, [
  "docs/openclaw-severe-scenario-proof-pack.md",
  "npm run openclaw:severe-proof",
  "npm run verify:openclaw-severe-proof",
  "npm run test:openclaw-severe-proof",
  "artifacts/openclaw-severe-scenario-proof/report.html",
]);
rejectUnsafe("README.md", readme);

const examplesReadme = read("examples/openclaw/README.md");
requireIncludes("examples/openclaw/README.md", examplesReadme, [
  "Severe Scenario Proof Pack",
  "severe-scenario-proof/scenario.json",
  "npm run openclaw:severe-proof",
  "artifacts/openclaw-severe-scenario-proof/report.html",
]);
rejectUnsafe("examples/openclaw/README.md", examplesReadme);

const journeyDoc = read("docs/openclaw-developer-journey.md");
requireIncludes("docs/openclaw-developer-journey.md", journeyDoc, [
  "Severe Scenario Proof Pack",
  "npm run openclaw:severe-proof",
  "artifacts/openclaw-severe-scenario-proof/report.html",
  "customer account data, external vendor portal, completion update, file deletion, and workflow close",
]);
rejectUnsafe("docs/openclaw-developer-journey.md", journeyDoc);

const runner = read("examples/openclaw/run-severe-scenario-proof.mjs");
requireIncludes("runner", runner, [
  "openclaw-severe-scenario-proof",
  "severe-scenario-proof/scenario.json",
  "decision_gate_only_developer_keeps_execution",
  "developer_owned_next_step",
  "local_plus_live_receipts",
]);
rejectUnsafe("runner", runner);

const outDir = mkdtempSync(join(tmpdir(), "neura-openclaw-severe-proof-"));
const proofRun = runNode([
  "examples/openclaw/run-severe-scenario-proof.mjs",
  `--out=${outDir}`,
  "--json",
]);

if (proofRun.status !== 0) {
  failures.push("severe_proof_run_failed");
  if (proofRun.stderr) failures.push(`severe_proof_stderr_${proofRun.stderr.slice(-500)}`);
} else {
  const proof = JSON.parse(proofRun.stdout);
  if (proof.ok !== true) failures.push("severe_proof_not_ok");
  if (proof.proof !== "openclaw-severe-scenario-proof") failures.push("severe_proof_wrong_id");
  if (proof.mode !== "safe_local_projection") failures.push("severe_proof_wrong_default_mode");
  if (proof.count?.checkpoints !== 5) failures.push("severe_proof_wrong_checkpoint_count");
  if (proof.count?.decisions?.stop !== 2) failures.push("severe_proof_wrong_stop_count");
  if (proof.count?.decisions?.human_review !== 2) {
    failures.push("severe_proof_wrong_human_review_count");
  }
  if (proof.count?.decisions?.revise !== 1) failures.push("severe_proof_wrong_revise_count");
  if (!proof.files?.html?.endsWith("report.html")) failures.push("severe_proof_missing_html");
  if (!existsSync(join(outDir, "report.html"))) failures.push("severe_proof_html_not_written");
  if (!existsSync(join(outDir, "report.md"))) failures.push("severe_proof_markdown_not_written");
  if (!existsSync(join(outDir, "report.json"))) failures.push("severe_proof_json_not_written");

  const generated = readFileSync(join(outDir, "report.html"), "utf8");
  requireIncludes("generated_html", generated, [
    "OpenClaw Severe Scenario Proof Pack",
    "What Neura catches",
    "Developer-owned next step",
    "No execution",
    "local_severe_receipt_ref:2:submit_external_portal",
  ]);
  rejectUnsafe("generated_html", generated);

  for (const [key, value] of Object.entries(proof.boundaries ?? {})) {
    if (["developer_owned_execution", "refs_only", "safe_local_projection"].includes(key)) {
      if (value !== true) failures.push(`proof_boundary_${key}_not_true`);
    } else if (value !== false) {
      failures.push(`proof_boundary_${key}_not_false`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-severe-scenario-proof",
      command: "npm run openclaw:severe-proof",
      artifact: "artifacts/openclaw-severe-scenario-proof/report.html",
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
