#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
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

function run(command, args) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

const requiredFiles = [
  ".github/workflows/openclaw-action-receipt-kit.yml",
  "CHANGELOG.md",
  "docs/openclaw-action-receipt-pack.md",
  "examples/openclaw/README.md",
  "examples/openclaw/action-receipt-kit.manifest.json",
  "examples/openclaw/run-action-receipt-kit.mjs",
  "skills/openclaw/neura-action-card/SKILL.md",
  "skills/openclaw/neura-action-card/templates/openclaw-action-card.v0.1.json",
  "skills/openclaw/neura-before-send/SKILL.md",
  "skills/openclaw/neura-file-change-review/SKILL.md",
  "skills/openclaw/neura-browser-action-review/SKILL.md",
  "skills/openclaw/neura-shell-command-review/SKILL.md",
  "skills/openclaw/neura-memory-write-review/SKILL.md",
  "skills/openclaw/neura-data-export-review/SKILL.md",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = readJson("package.json");
const expectedScripts = {
  "openclaw:dry-run": "node examples/openclaw/run-action-receipt-kit.mjs --dry-run",
  "openclaw:receipts": "node examples/openclaw/run-action-receipt-kit.mjs",
  "test:openclaw-kit": "node --test tests/openclaw-action-receipt-kit.test.mjs",
  "test:openclaw-kit:e2e": "node --test tests/openclaw-action-receipt-kit.e2e.mjs",
  "test:openclaw-kit:all":
    "npm run test:openclaw-kit && npm run test:openclaw-kit:e2e",
  "verify:openclaw-action-receipt-kit": "node scripts/verify-openclaw-action-receipt-kit.mjs",
};
for (const [script, command] of Object.entries(expectedScripts)) {
  if (packageJson.scripts?.[script] !== command) {
    failures.push(`package_script_${script}_expected_${command}`);
  }
}

const manifest = readJson("examples/openclaw/action-receipt-kit.manifest.json");
const requiredFamilies = new Set([
  "outbound_message",
  "file_edit",
  "file_delete",
  "browser_submit",
  "shell_command",
  "workflow_transition",
  "memory_write",
  "data_export",
]);
const manifestFamilies = new Set(manifest.examples?.map((example) => example.family));
if (manifest.version !== "0.1-rc") failures.push("manifest_wrong_version");
if (manifest.status !== "local_release_candidate") failures.push("manifest_wrong_status");
if (manifest.official_openclaw_or_clawhub_claim !== false) {
  failures.push("manifest_official_openclaw_claim_true");
}
for (const family of requiredFamilies) {
  if (!manifestFamilies.has(family)) failures.push(`manifest_missing_family_${family}`);
}
for (const [key, value] of Object.entries(manifest.boundaries ?? {})) {
  if (key === "refs_only") {
    if (value !== true) failures.push("manifest_refs_only_not_true");
  } else if (value !== false) {
    failures.push(`manifest_boundary_${key}_not_false`);
  }
}

const docs = read("docs/openclaw-action-receipt-pack.md");
requireIncludes("docs", docs, [
  "OpenClaw Action Receipt Kit",
  "OpenClaw Action Receipt Pack v0.1",
  ".github/workflows/openclaw-action-receipt-kit.yml",
  "CHANGELOG.md",
  "npm run openclaw:dry-run",
  "npm run openclaw:receipts",
  "npm run verify:openclaw-action-receipt-kit",
  "npm run test:openclaw-kit",
  "npm run test:openclaw-kit:e2e",
  "memory write",
  "data export",
  "not an official OpenClaw, ClawHub",
  "does not execute downstream actions by Neura",
]);
rejectUnsafe("docs", docs);

const changelog = read("CHANGELOG.md");
requireIncludes("changelog", changelog, [
  "OpenClaw Action Receipt Kit v0.1 RC",
  "eight refs-only Action Card families",
  "npm run openclaw:dry-run",
  "npm run openclaw:receipts",
  "npm run verify:openclaw-action-receipt-kit",
  "GitHub Actions CI",
  "no official OpenClaw or ClawHub",
]);
rejectUnsafe("changelog", changelog);

const workflow = read(".github/workflows/openclaw-action-receipt-kit.yml");
requireIncludes("workflow", workflow, [
  "OpenClaw Action Receipt Kit",
  "pull_request:",
  "push:",
  "workflow_dispatch:",
  "npm run test:openclaw-kit",
  "npm run verify:openclaw-action-receipt-kit",
  "npm run verify:openclaw-action-receipt-pack",
  "npm run openclaw:dry-run -- --json",
  "npm run test:openclaw-kit:e2e",
  "npm run openclaw:receipts -- --json",
]);
rejectUnsafe("workflow", workflow);

const readme = read("README.md");
requireIncludes("readme", readme, [
  "Release-candidate snapshot",
  "CHANGELOG.md",
  "CI now runs the local kit contract",
  "npm run openclaw:dry-run",
  "npm run openclaw:receipts",
  "npm run verify:openclaw-action-receipt-kit",
  "npm run test:openclaw-kit",
  "npm run test:openclaw-kit:e2e",
  "openclaw-memory-write",
  "openclaw-data-export",
  "Action Receipt Kit",
]);
rejectUnsafe("readme", readme);

const openclawReadme = read("examples/openclaw/README.md");
requireIncludes("examples_readme", openclawReadme, [
  "Action Receipt Kit",
  "npm run openclaw:dry-run",
  "npm run openclaw:receipts",
  "npm run test:openclaw-kit",
  "npm run test:openclaw-kit:e2e",
  "memory-write.json",
  "data-export.json",
]);
rejectUnsafe("examples_readme", openclawReadme);

const runner = read("examples/openclaw/run-action-receipt-kit.mjs");
requireIncludes("runner", runner, [
  "@neurarelay/sdk",
  "--dry-run",
  "--only=",
  "decision_gate_only_developer_keeps_execution",
  "Your system keeps execution ownership",
]);
rejectUnsafe("runner", runner);

const coreRunner = read("examples/core/resolve-action-card.mjs");
requireIncludes("core_runner", coreRunner, [
  "openclaw-memory-write",
  "openclaw-data-export",
]);

const skillFiles = [
  "skills/openclaw/neura-action-card/SKILL.md",
  "skills/openclaw/neura-before-send/SKILL.md",
  "skills/openclaw/neura-file-change-review/SKILL.md",
  "skills/openclaw/neura-browser-action-review/SKILL.md",
  "skills/openclaw/neura-shell-command-review/SKILL.md",
  "skills/openclaw/neura-memory-write-review/SKILL.md",
  "skills/openclaw/neura-data-export-review/SKILL.md",
];
for (const file of skillFiles) {
  const text = read(file);
  requireIncludes(file, text, ["---", "name:", "description:", "Decision Receipt"]);
  requireIncludes(file, text, ["not an official OpenClaw or ClawHub", "Do not"]);
  rejectUnsafe(file, text);
}

const actionCardDir = path("examples/openclaw/action-cards");
const actionCardFiles = existsSync(actionCardDir)
  ? readdirSync(actionCardDir).filter((file) => file.endsWith(".json")).sort()
  : [];
const manifestPaths = new Set(manifest.examples.map((example) => example.path));
for (const example of manifest.examples) requireFile(example.path);

for (const file of actionCardFiles) {
  const relative = `examples/openclaw/action-cards/${file}`;
  const text = read(relative);
  rejectUnsafe(relative, text);
  const card = JSON.parse(text);
  if (!manifestPaths.has(relative)) failures.push(`${relative}_missing_from_manifest`);
  if (card.version !== "0.1") failures.push(`${file}_wrong_version`);
  if (!card.agent?.id || !card.agent?.capabilityVersion) failures.push(`${file}_missing_agent_refs`);
  if (!card.proposedAction?.type || !card.proposedAction?.target) {
    failures.push(`${file}_missing_proposed_action`);
  }
  if (!card.affectedObject) failures.push(`${file}_missing_affected_object`);
  if (card.context?.requestedOutcome !== "decision_receipt") {
    failures.push(`${file}_missing_decision_receipt_outcome`);
  }
  if (!Array.isArray(card.context?.evidenceRefs) || card.context.evidenceRefs.length === 0) {
    failures.push(`${file}_missing_evidence_refs`);
  }
  if (!Array.isArray(card.context?.ruleRefs) || card.context.ruleRefs.length === 0) {
    failures.push(`${file}_missing_rule_refs`);
  }
  if (!card.context?.authorityContext?.allowedActions?.includes(card.proposedAction?.type)) {
    failures.push(`${file}_authority_does_not_cover_action`);
  }
  if (!card.context?.authorityContext?.allowedResources?.includes(card.proposedAction?.target)) {
    failures.push(`${file}_authority_does_not_cover_target`);
  }
}

const dryRun = run("node", [
  "examples/openclaw/run-action-receipt-kit.mjs",
  "--dry-run",
  "--json",
]);
if (dryRun.status !== 0) {
  failures.push(`dry_run_failed_${dryRun.stderr || dryRun.stdout}`);
} else {
  const payload = JSON.parse(dryRun.stdout);
  if (payload.mode !== "dry_run" || payload.count !== manifest.examples.length) {
    failures.push("dry_run_wrong_payload");
  }
  if (!payload.results.every((result) => result.relay_call_skipped === true)) {
    failures.push("dry_run_must_skip_relay_calls");
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-action-receipt-kit",
      manifest: "examples/openclaw/action-receipt-kit.manifest.json",
      one_command: manifest.one_command,
      families: [...requiredFamilies],
      examples: manifest.examples.map((example) => example.path),
      skills: skillFiles,
      boundaries: manifest.boundaries,
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
