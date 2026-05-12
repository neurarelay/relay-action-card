#!/usr/bin/env node

import { spawnSync } from "node:child_process";
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

function rejectUnsafe(label, text) {
  const forbidden = [
    "approved by OpenClaw",
    "partnered with OpenClaw",
    "listed on ClawHub",
    "official ClawHub listing",
    "official OpenAI approval",
    "official Anthropic approval",
    "enables public API key issuance",
    "enables public production MCP token issuance",
    "enables public A2A token issuance",
    "enables unprotected A2A execution",
    "executes downstream actions by Neura",
    "PRIVATE_KEY",
    "SECRET",
    "PASSWORD",
    "token_value",
    "private_payload_value",
    "rawMessageBody",
    "rawFileContents",
    "rawBrowserFormValues",
    "rawShellCommand",
  ];
  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_${phrase}`);
  }
}

const requiredFiles = [
  "README.md",
  "CHANGELOG.md",
  "docs/openclaw-action-receipt-pack.md",
  "docs/openclaw-developer-journey.md",
  "docs/openclaw-near-miss-workbench.md",
  "examples/openclaw/README.md",
  "examples/openclaw/run-developer-journey-proof.mjs",
  "scripts/verify-openclaw-developer-journey.mjs",
  "tests/openclaw-developer-journey.test.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
const expectedScripts = {
  "openclaw:proof": "node examples/openclaw/run-developer-journey-proof.mjs",
  "verify:openclaw-developer-journey":
    "node scripts/verify-openclaw-developer-journey.mjs",
  "test:openclaw-developer-journey":
    "node --test tests/openclaw-developer-journey.test.mjs",
};
for (const [script, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[script] !== command) {
    failures.push(`package_script_${script}_expected_${command}`);
  }
}

const journeyDoc = read("docs/openclaw-developer-journey.md");
requireIncludes("docs/openclaw-developer-journey.md", journeyDoc, [
  "OpenClaw Developer Journey Proof",
  "npm run openclaw:proof",
  "npm run openclaw:proof -- --live",
  "artifacts/openclaw-near-miss-workbench/report.html",
  "what the agent was about to do",
  "what Neura caught",
  "the receipt route",
  "developer-owned next step",
  "beforeAction(preflightAction)",
  "official OpenClaw or ClawHub integration",
  "public API-key issuance",
  "downstream execution by Neura",
  "private payload exposure",
]);
rejectUnsafe("docs/openclaw-developer-journey.md", journeyDoc);

const readme = read("README.md");
requireIncludes("README.md", readme, [
  "docs/openclaw-developer-journey.md",
  "npm run openclaw:proof",
  "npm run openclaw:proof -- --live",
  "OpenClaw Developer Journey Proof",
]);
rejectUnsafe("README.md", readme);

const openclawReadme = read("examples/openclaw/README.md");
requireIncludes("examples/openclaw/README.md", openclawReadme, [
  "npm run openclaw:proof",
  "npm run openclaw:proof -- --live",
  "docs/openclaw-developer-journey.md",
]);
rejectUnsafe("examples/openclaw/README.md", openclawReadme);

const packDoc = read("docs/openclaw-action-receipt-pack.md");
requireIncludes("docs/openclaw-action-receipt-pack.md", packDoc, [
  "docs/openclaw-developer-journey.md",
  "npm run openclaw:proof",
]);
rejectUnsafe("docs/openclaw-action-receipt-pack.md", packDoc);

const runner = read("examples/openclaw/run-developer-journey-proof.mjs");
requireIncludes("runner", runner, [
  "run-near-miss-workbench.mjs",
  "run-action-receipt-kit.mjs",
  "run-preflight-adapter.mjs",
  "verify-openclaw-action-receipt-kit.mjs",
  "verify-openclaw-preflight-adapter.mjs",
  "openclaw-developer-journey",
  "local_plus_live_receipts",
  "developer_owned_execution",
  "refs_only",
]);
rejectUnsafe("runner", runner);

const proofRun = spawnSync(
  process.execPath,
  ["examples/openclaw/run-developer-journey-proof.mjs", "--json"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (proofRun.status !== 0) {
  failures.push("openclaw_proof_local_failed");
  if (proofRun.stderr) failures.push(`openclaw_proof_stderr_${proofRun.stderr.slice(-500)}`);
} else {
  const proof = JSON.parse(proofRun.stdout);
  if (proof.ok !== true) failures.push("openclaw_proof_not_ok");
  if (proof.mode !== "local_only") failures.push("openclaw_proof_wrong_default_mode");
  if (proof.live_summary?.enabled !== false) failures.push("openclaw_proof_live_not_skipped");
  if (proof.local_summary?.dry_run_fixtures !== 8) {
    failures.push("openclaw_proof_missing_eight_fixtures");
  }
  if (proof.local_summary?.journeys !== 3) failures.push("openclaw_proof_missing_journeys");
  if (proof.artifacts?.workbench_html !== "artifacts/openclaw-near-miss-workbench/report.html") {
    failures.push("openclaw_proof_wrong_workbench_artifact");
  }
  if (proof.boundaries?.developer_owned_execution !== true) {
    failures.push("openclaw_proof_developer_boundary_not_true");
  }
  for (const [key, value] of Object.entries(proof.boundaries ?? {})) {
    if (["developer_owned_execution", "refs_only"].includes(key)) {
      if (value !== true) failures.push(`openclaw_proof_boundary_${key}_not_true`);
    } else if (value !== false) {
      failures.push(`openclaw_proof_boundary_${key}_not_false`);
    }
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-developer-journey",
      command: "npm run openclaw:proof",
      live_command: "npm run openclaw:proof -- --live",
      artifact: "artifacts/openclaw-near-miss-workbench/report.html",
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
