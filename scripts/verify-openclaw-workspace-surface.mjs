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
    "official OpenClaw OS integration",
    "official OpenUI integration",
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

const requiredFiles = [
  "README.md",
  "docs/openclaw-developer-journey.md",
  "docs/openclaw-os-decision-receipt-surface.md",
  "examples/openclaw/README.md",
  "examples/openclaw/run-workspace-decision-surface.mjs",
  "examples/openclaw/workspace-surface/scenarios.json",
  "scripts/verify-openclaw-workspace-surface.mjs",
  "tests/openclaw-workspace-surface.test.mjs",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
const expectedScripts = {
  "openclaw:workspace-proof": "node examples/openclaw/run-workspace-decision-surface.mjs",
  "verify:openclaw-workspace-surface":
    "node scripts/verify-openclaw-workspace-surface.mjs",
  "test:openclaw-workspace-surface": "node --test tests/openclaw-workspace-surface.test.mjs",
};
for (const [script, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[script] !== command) {
    failures.push(`package_script_${script}_expected_${command}`);
  }
}

const model = readJson("examples/openclaw/workspace-surface/scenarios.json");
if (model.name !== "neura-openclaw-os-decision-receipt-surface") failures.push("model_wrong_name");
if (model.status !== "local_workspace_surface") failures.push("model_wrong_status");
if (model.official_openclaw_os_openui_openclaw_or_clawhub_claim !== false) {
  failures.push("model_official_claim_true");
}
rejectUnsafe("model", JSON.stringify(model));

const requiredActionIds = [
  "generated-app-deploy",
  "artifact-publish",
  "scheduled-cron-action",
  "workflow-monitor-intervention",
  "session-memory-write",
  "browser-direct-control",
  "shell-file-operation",
];
const actionIds = model.actions?.map((action) => action.id) ?? [];
for (const id of requiredActionIds) {
  if (!actionIds.includes(id)) failures.push(`missing_action_${id}`);
}

const decisions = new Set();
const surfaces = new Set();
for (const action of model.actions ?? []) {
  decisions.add(action.decision);
  surfaces.add(action.surface);
  for (const key of [
    "id",
    "title",
    "surface",
    "workspace_context",
    "proposed_action",
    "action_summary",
    "target_ref",
    "affected_object_ref",
    "risk_class",
    "authority_status",
    "policy_status",
    "evidence_status",
    "decision",
    "route",
    "authority_engine_posture",
    "readiness_path",
    "developer_owned_next_step",
  ]) {
    if (!action[key] && action[key] !== "") failures.push(`action_${action.id}_missing_${key}`);
  }
  if (!String(action.target_ref).includes("_ref:")) failures.push(`action_${action.id}_target_not_ref`);
  if (!String(action.affected_object_ref).includes("_ref:")) {
    failures.push(`action_${action.id}_affected_not_ref`);
  }
  if (!Array.isArray(action.missing_refs)) failures.push(`action_${action.id}_missing_refs_not_array`);
}

for (const decision of ["proceed", "human_review", "revise", "stop"]) {
  if (!decisions.has(decision)) failures.push(`missing_decision_${decision}`);
}
for (const surface of [
  "generated_app",
  "artifact",
  "cron",
  "workflow_monitor",
  "session_memory",
  "direct_control",
  "shell_file",
]) {
  if (!surfaces.has(surface)) failures.push(`missing_surface_${surface}`);
}

for (const [key, value] of Object.entries(model.boundaries ?? {})) {
  if (key === "refs_only" || key === "safe_local_projection") {
    if (value !== true) failures.push(`boundary_${key}_not_true`);
  } else if (value !== false) {
    failures.push(`boundary_${key}_not_false`);
  }
}

const docs = read("docs/openclaw-os-decision-receipt-surface.md");
requireIncludes("docs/openclaw-os-decision-receipt-surface.md", docs, [
  "OpenClaw OS Decision Receipt Surface v0.1",
  "Persistent workspace action -> Action Card -> Authority Decision Engine posture -> Decision Receipt -> developer-owned execution",
  "npm run openclaw:workspace-proof",
  "npm run verify:openclaw-workspace-surface",
  "npm run test:openclaw-workspace-surface",
  "artifacts/openclaw-workspace-decision-surface/report.html",
  "Generated app",
  "Artifact",
  "Cron",
  "Workflow monitor",
  "Session memory",
  "Browser direct control",
  "Shell and file",
  "not an official OpenClaw OS, OpenUI, OpenClaw, or ClawHub",
  "downstream execution by Neura",
]);
rejectUnsafe("docs/openclaw-os-decision-receipt-surface.md", docs);

const readme = read("README.md");
requireIncludes("README.md", readme, [
  "OpenClaw OS Decision Receipt Surface",
  "docs/openclaw-os-decision-receipt-surface.md",
  "npm run openclaw:workspace-proof",
  "npm run verify:openclaw-workspace-surface",
  "artifacts/openclaw-workspace-decision-surface/report.html",
  "workspace-surface/",
  "run-workspace-decision-surface.mjs",
  "verify-openclaw-workspace-surface.mjs",
  "openclaw-workspace-surface.test.mjs",
]);
rejectUnsafe("README.md", readme);

const examplesReadme = read("examples/openclaw/README.md");
requireIncludes("examples/openclaw/README.md", examplesReadme, [
  "Workspace Decision Receipt Surface",
  "workspace-surface/scenarios.json",
  "npm run openclaw:workspace-proof",
  "artifacts/openclaw-workspace-decision-surface/report.html",
]);
rejectUnsafe("examples/openclaw/README.md", examplesReadme);

const journeyDoc = read("docs/openclaw-developer-journey.md");
requireIncludes("docs/openclaw-developer-journey.md", journeyDoc, [
  "OpenClaw OS Decision Receipt Surface",
  "npm run openclaw:workspace-proof",
  "generated apps, artifacts, crons, workflow monitors, memory, browser control, shell, and file operations",
]);
rejectUnsafe("docs/openclaw-developer-journey.md", journeyDoc);

const runner = read("examples/openclaw/run-workspace-decision-surface.mjs");
requireIncludes("runner", runner, [
  "openclaw-workspace-decision-surface",
  "workspace-surface/scenarios.json",
  "Authority Decision Engine posture",
  "developer_owned_next_step",
  "decision_gate_only_developer_keeps_execution",
]);
rejectUnsafe("runner", runner);

const proofRun = spawnSync(
  process.execPath,
  ["examples/openclaw/run-workspace-decision-surface.mjs", "--json"],
  {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  },
);

if (proofRun.status !== 0) {
  failures.push("workspace_surface_proof_failed");
  if (proofRun.stderr) failures.push(`workspace_surface_stderr_${proofRun.stderr.slice(-500)}`);
} else {
  const proof = JSON.parse(proofRun.stdout);
  if (proof.ok !== true) failures.push("workspace_surface_not_ok");
  if (proof.count?.actions !== 7) failures.push("workspace_surface_wrong_action_count");
  if (proof.count?.decisions?.stop !== 2) failures.push("workspace_surface_wrong_stop_count");
  if (proof.files?.html && !proof.files.html.endsWith("artifacts/openclaw-workspace-decision-surface/report.html")) {
    failures.push("workspace_surface_wrong_html_artifact");
  }
  for (const [key, value] of Object.entries(proof.boundaries ?? {})) {
    if (key === "refs_only" || key === "safe_local_projection") {
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
      verifier: "openclaw-workspace-surface",
      command: "npm run openclaw:workspace-proof",
      artifact: "artifacts/openclaw-workspace-decision-surface/report.html",
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
