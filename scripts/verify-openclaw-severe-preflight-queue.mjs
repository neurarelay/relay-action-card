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
  "docs/openclaw-severe-preflight-queue.md",
  "docs/openclaw-severe-scenario-proof-pack.md",
  "examples/openclaw/README.md",
  "examples/openclaw/run-developer-journey-proof.mjs",
  "examples/openclaw/run-severe-preflight-queue.mjs",
  "examples/openclaw/severe-scenario-proof/scenario.json",
  "scripts/verify-openclaw-developer-journey.mjs",
  "scripts/verify-openclaw-severe-preflight-queue.mjs",
  "tests/openclaw-developer-journey.test.mjs",
  "tests/openclaw-severe-preflight-queue.test.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
const expectedScripts = {
  "openclaw:severe-preflight": "node examples/openclaw/run-severe-preflight-queue.mjs",
  "verify:openclaw-severe-preflight":
    "node scripts/verify-openclaw-severe-preflight-queue.mjs",
  "test:openclaw-severe-preflight":
    "node --test tests/openclaw-severe-preflight-queue.test.mjs",
};
for (const [script, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[script] !== command) {
    failures.push(`package_script_${script}_expected_${command}`);
  }
}

const model = readJson("examples/openclaw/severe-scenario-proof/scenario.json");
if (model.checkpoints?.length !== 5) failures.push("model_wrong_checkpoint_count");
rejectUnsafe("model", JSON.stringify(model));

const docs = read("docs/openclaw-severe-preflight-queue.md");
requireIncludes("docs/openclaw-severe-preflight-queue.md", docs, [
  "OpenClaw Severe Preflight Queue",
  "preflight action -> adapter.beforeAction -> Action Card -> Decision Receipt route -> developer-owned execution decision",
  "npm run openclaw:severe-preflight",
  "npm run openclaw:severe-preflight -- --live --json",
  "npm run verify:openclaw-severe-preflight",
  "npm run test:openclaw-severe-preflight",
  "artifacts/openclaw-severe-preflight-queue/transcript.html",
  "execution attempted as `false`",
  "official OpenClaw or ClawHub integration",
  "real computer-use execution",
]);
rejectUnsafe("docs/openclaw-severe-preflight-queue.md", docs);

const readme = read("README.md");
requireIncludes("README.md", readme, [
  "docs/openclaw-severe-preflight-queue.md",
  "npm run openclaw:severe-preflight",
  "npm run verify:openclaw-severe-preflight",
  "npm run test:openclaw-severe-preflight",
  "artifacts/openclaw-severe-preflight-queue/transcript.html",
]);
rejectUnsafe("README.md", readme);

const examplesReadme = read("examples/openclaw/README.md");
requireIncludes("examples/openclaw/README.md", examplesReadme, [
  "Severe Preflight Queue",
  "run-severe-preflight-queue.mjs",
  "npm run openclaw:severe-preflight",
  "artifacts/openclaw-severe-preflight-queue/transcript.html",
]);
rejectUnsafe("examples/openclaw/README.md", examplesReadme);

const journeyDoc = read("docs/openclaw-developer-journey.md");
requireIncludes("docs/openclaw-developer-journey.md", journeyDoc, [
  "Severe Preflight Queue",
  "npm run openclaw:severe-preflight",
  "artifacts/openclaw-severe-preflight-queue/transcript.html",
  "adapter.beforeAction(preflightAction)",
]);
rejectUnsafe("docs/openclaw-developer-journey.md", journeyDoc);

const runner = read("examples/openclaw/run-severe-preflight-queue.mjs");
requireIncludes("runner", runner, [
  "createNeuraPreflightAdapter",
  "adapter.beforeAction",
  "openclaw-severe-preflight-queue",
  "severe-scenario-proof/scenario.json",
  "execution_attempted: false",
  "real_computer_use_execution",
]);
rejectUnsafe("runner", runner);

const outDir = mkdtempSync(join(tmpdir(), "neura-openclaw-severe-preflight-"));
const proofRun = runNode([
  "examples/openclaw/run-severe-preflight-queue.mjs",
  `--out=${outDir}`,
  "--json",
]);

if (proofRun.status !== 0) {
  failures.push("severe_preflight_run_failed");
  if (proofRun.stderr) failures.push(`severe_preflight_stderr_${proofRun.stderr.slice(-500)}`);
} else {
  const proof = JSON.parse(proofRun.stdout);
  if (proof.ok !== true) failures.push("severe_preflight_not_ok");
  if (proof.proof !== "openclaw-severe-preflight-queue") failures.push("wrong_proof_id");
  if (proof.mode !== "dry_run") failures.push("wrong_default_mode");
  if (proof.count?.actions !== 5) failures.push("wrong_action_count");
  if (proof.count?.dry_run_adapter_gates !== 5) failures.push("wrong_dry_run_count");
  if (proof.count?.live_receipts !== 0) failures.push("live_receipts_not_zero");
  if (proof.count?.expected_decisions?.stop !== 2) failures.push("wrong_stop_count");
  if (proof.count?.expected_decisions?.human_review !== 2) failures.push("wrong_human_review_count");
  if (proof.count?.expected_decisions?.revise !== 1) failures.push("wrong_revise_count");
  if (!proof.files?.html?.endsWith("transcript.html")) failures.push("missing_html_output");
  if (!existsSync(join(outDir, "transcript.html"))) failures.push("html_not_written");
  if (!existsSync(join(outDir, "transcript.md"))) failures.push("markdown_not_written");
  if (!existsSync(join(outDir, "transcript.json"))) failures.push("json_not_written");

  const generated = JSON.parse(readFileSync(join(outDir, "transcript.json"), "utf8"));
  if (generated.queue?.length !== 5) failures.push("generated_queue_wrong_length");
  for (const row of generated.queue ?? []) {
    if (row.execution_attempted !== false) failures.push(`row_${row.id}_execution_attempted`);
    if (row.execution_owner !== "developer_runtime") failures.push(`row_${row.id}_wrong_owner`);
    if (row.adapter_result?.mode !== "dry_run") failures.push(`row_${row.id}_not_dry_run`);
    if (row.adapter_result?.route !== "relay_receipt_required_before_execution") {
      failures.push(`row_${row.id}_wrong_adapter_route`);
    }
    if (row.action_card?.version !== "0.1") failures.push(`row_${row.id}_wrong_card_version`);
    if (!String(row.action_card?.proposedAction?.target).includes("_ref:")) {
      failures.push(`row_${row.id}_target_not_ref`);
    }
    rejectUnsafe(`row_${row.id}`, JSON.stringify(row.preflight_action));
    rejectUnsafe(`row_${row.id}_action_card`, JSON.stringify(row.action_card));
  }

  const html = readFileSync(join(outDir, "transcript.html"), "utf8");
  requireIncludes("generated_html", html, [
    "OpenClaw Severe Preflight Queue",
    "Adapter preflight",
    "Receipt route",
    "Execution attempted",
    "false",
  ]);
  rejectUnsafe("generated_html", html);

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
      verifier: "openclaw-severe-preflight-queue",
      command: "npm run openclaw:severe-preflight",
      artifact: "artifacts/openclaw-severe-preflight-queue/transcript.html",
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
