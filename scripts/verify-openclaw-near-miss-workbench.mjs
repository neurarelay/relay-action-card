#!/usr/bin/env node

import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { dirname } from "node:path";
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
    "executes downstream actions by Neura",
    "real_email_send\": true",
    "real_browser_submit\": true",
    "real_file_delete\": true",
    "real_shell_execution\": true",
    "real_deployment\": true",
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

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const requiredFiles = [
  ".gitignore",
  "README.md",
  "docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png",
  "docs/assets/openclaw-near-miss-workbench/near-miss-workbench-mobile.png",
  "docs/openclaw-near-miss-workbench.md",
  "examples/openclaw/README.md",
  "examples/openclaw/near-miss-workbench/scenarios.json",
  "examples/openclaw/run-near-miss-workbench.mjs",
  "scripts/verify-openclaw-near-miss-workbench.mjs",
  "tests/openclaw-near-miss-workbench.test.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
const expectedScripts = {
  "openclaw:workbench": "node examples/openclaw/run-near-miss-workbench.mjs",
  "verify:openclaw-workbench": "node scripts/verify-openclaw-near-miss-workbench.mjs",
  "test:openclaw-workbench": "node --test tests/openclaw-near-miss-workbench.test.mjs",
};
for (const [script, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[script] !== command) {
    failures.push(`package_script_${script}_expected_${command}`);
  }
}

if (!read(".gitignore").includes("artifacts/")) failures.push("gitignore_missing_artifacts");

const model = readJson("examples/openclaw/near-miss-workbench/scenarios.json");
if (model.name !== "neura-openclaw-near-miss-workbench") failures.push("model_wrong_name");
if (model.status !== "local_visual_workbench") failures.push("model_wrong_status");
if (model.official_openclaw_or_clawhub_claim !== false) {
  failures.push("model_official_openclaw_claim_true");
}

const requiredJourneyIds = new Set([
  "customer-data-exfiltration",
  "production-deployment",
  "expired-delegated-authority",
]);
const journeyIds = new Set(model.journeys?.map((journey) => journey.id));
for (const id of requiredJourneyIds) {
  if (!journeyIds.has(id)) failures.push(`missing_journey_${id}`);
}

const decisions = new Set();
const serializedModel = JSON.stringify(model);
rejectUnsafe("model", serializedModel);

for (const journey of model.journeys ?? []) {
  if (!journey.steps || journey.steps.length < 3) failures.push(`journey_too_short_${journey.id}`);
  for (const step of journey.steps ?? []) {
    decisions.add(step.decision);
    for (const key of [
      "id",
      "title",
      "family",
      "proposed_action",
      "target_ref",
      "affected_object_ref",
      "risk_class",
      "authority_status",
      "policy_status",
      "evidence_status",
      "decision",
      "route",
      "why",
      "safe_next_step",
    ]) {
      if (!step[key]) failures.push(`step_${journey.id}_${step.id}_missing_${key}`);
    }
    if (!String(step.target_ref).includes("_ref:")) {
      failures.push(`step_${journey.id}_${step.id}_target_not_ref`);
    }
  }
}
for (const decision of ["proceed", "human_review", "revise", "stop"]) {
  if (!decisions.has(decision)) failures.push(`missing_decision_${decision}`);
}

for (const [key, value] of Object.entries(model.boundaries ?? {})) {
  if (key === "refs_only" || key === "safe_local_projection") {
    if (value !== true) failures.push(`boundary_${key}_not_true`);
  } else if (value !== false) {
    failures.push(`boundary_${key}_not_false`);
  }
}

const docs = read("docs/openclaw-near-miss-workbench.md");
requireIncludes("docs", docs, [
  "OpenClaw Near-Miss Workbench v0.1",
  "assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png",
  "docs/assets/openclaw-near-miss-workbench/",
  "Customer Data Exfiltration Near-Miss",
  "Production Deployment Near-Miss",
  "Expired Delegated Authority Near-Miss",
  "what the agent was about to do",
  "what Neura caught",
  "Decision Receipt route",
  "developer-owned next step",
  "npm run openclaw:proof",
  "npm run openclaw:workbench",
  "npm run verify:openclaw-workbench",
  "npm run test:openclaw-workbench",
  "safe local projection",
  "not an official OpenClaw or ClawHub",
]);
rejectUnsafe("docs", docs);

const readme = read("README.md");
requireIncludes("readme", readme, [
  "docs/openclaw-developer-journey.md",
  "docs/openclaw-near-miss-workbench.md",
  "docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png",
  "OpenClaw Developer Journey Proof",
  "Repository Map",
  "examples/openclaw/",
  "near-miss-workbench/",
  "docs/assets/openclaw-near-miss-workbench/",
  "what the agent was about to do",
  "what Neura caught",
  "receipt route",
  "developer-owned next step",
  "npm run openclaw:proof",
  "npm run openclaw:proof -- --live",
  "npm run openclaw:workbench",
  "artifacts/openclaw-near-miss-workbench/report.html",
  "npm run verify:openclaw-workbench",
]);
rejectUnsafe("readme", readme);

const examplesReadme = read("examples/openclaw/README.md");
requireIncludes("examples_readme", examplesReadme, [
  "Near-Miss Workbench",
  "npm run openclaw:workbench",
  "artifacts/openclaw-near-miss-workbench/report.html",
  "docs/assets/openclaw-near-miss-workbench/",
  "agent intent",
  "what Neura catches",
  "receipt route",
  "developer-owned next step",
]);
rejectUnsafe("examples_readme", examplesReadme);

const outDir = mkdtempSync(join(tmpdir(), "neura-openclaw-workbench-"));
const generated = run("node", [
  "examples/openclaw/run-near-miss-workbench.mjs",
  `--out=${outDir}`,
  "--json",
]);
if (generated.status !== 0) {
  failures.push(`workbench_generation_failed_${generated.stderr || generated.stdout}`);
} else {
  const payload = JSON.parse(generated.stdout);
  if (payload.ok !== true) failures.push("workbench_generation_not_ok");
  if (payload.count?.journeys !== 3) failures.push("workbench_wrong_journey_count");
  if (payload.count?.decisions?.stop < 2) failures.push("workbench_missing_stop_weight");
}

for (const file of ["report.html", "report.md", "report.json"]) {
  const generatedPath = join(outDir, file);
  if (!existsSync(generatedPath)) failures.push(`generated_missing_${file}`);
}
if (existsSync(join(outDir, "report.html"))) {
  const html = readFileSync(join(outDir, "report.html"), "utf8");
  requireIncludes("generated_html", html, [
    "OpenClaw Near-Miss Workbench",
    "Receipt before execution",
    "Customer Data Exfiltration Near-Miss",
    "Production Deployment Near-Miss",
    "Expired Delegated Authority Near-Miss",
    "What the agent was about to do",
    "What Neura caught",
    "Receipt route",
    "Developer next step",
    "scenario-cards",
    "proof-line",
    "Safe local projection",
  ]);
  rejectUnsafe("generated_html", html);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-near-miss-workbench",
      journeys: Array.from(journeyIds),
      decisions: Array.from(decisions).sort(),
      boundaries: model.boundaries,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
