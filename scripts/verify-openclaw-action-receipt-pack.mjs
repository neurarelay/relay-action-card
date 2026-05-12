#!/usr/bin/env node

import { existsSync, readdirSync, readFileSync } from "node:fs";
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
  ];
  for (const phrase of forbidden) {
    if (text.includes(phrase)) failures.push(`${label}_unsafe_${phrase}`);
  }
}

const requiredFiles = [
  "docs/openclaw-action-receipt-pack.md",
  "examples/openclaw/README.md",
  "skills/openclaw/neura-action-card/SKILL.md",
  "skills/openclaw/neura-action-card/templates/openclaw-action-card.v0.1.json",
  "skills/openclaw/neura-before-send/SKILL.md",
  "skills/openclaw/neura-file-change-review/SKILL.md",
  "skills/openclaw/neura-browser-action-review/SKILL.md",
  "skills/openclaw/neura-shell-command-review/SKILL.md",
];

for (const file of requiredFiles) requireFile(file);

const packageJson = JSON.parse(read("package.json"));
if (
  packageJson.scripts?.["verify:openclaw-action-receipt-pack"] !==
  "node scripts/verify-openclaw-action-receipt-pack.mjs"
) {
  failures.push("package_script_missing_openclaw_action_receipt_pack");
}

const docs = read("docs/openclaw-action-receipt-pack.md");
requireIncludes("docs", docs, [
  "OpenClaw Action Receipt Pack v0.1",
  "Action Card -> Relay Decision Receipt",
  "not an official OpenClaw, ClawHub, OpenAI, Codex, Anthropic, Claude, MCP, or A2A integration, listing, approval, or partnership",
  "npm run verify:openclaw-action-receipt-pack",
  "does not execute downstream actions by Neura",
]);
rejectUnsafe("docs", docs);

const readme = read("README.md");
requireIncludes("readme", readme, [
  "docs/openclaw-action-receipt-pack.md",
  "examples/openclaw/action-cards",
  "skills/openclaw/neura-action-card",
  "openclaw-send-message",
  "openclaw-shell-command",
]);

const skillFiles = [
  "skills/openclaw/neura-action-card/SKILL.md",
  "skills/openclaw/neura-before-send/SKILL.md",
  "skills/openclaw/neura-file-change-review/SKILL.md",
  "skills/openclaw/neura-browser-action-review/SKILL.md",
  "skills/openclaw/neura-shell-command-review/SKILL.md",
];

for (const file of skillFiles) {
  const text = read(file);
  requireIncludes(file, text, ["---", "name:", "description:", "Decision Receipt"]);
  requireIncludes(file, text, ["not an official OpenClaw or ClawHub", "Do not"]);
  rejectUnsafe(file, text);
}

const template = JSON.parse(
  read("skills/openclaw/neura-action-card/templates/openclaw-action-card.v0.1.json"),
);
if (template.version !== "0.1") failures.push("template_wrong_version");
if (!template.agent?.id || !template.agent?.capabilityVersion) {
  failures.push("template_missing_agent_refs");
}
if (!template.context?.authorityContext?.allowedActions?.length) {
  failures.push("template_missing_authority_allowed_actions");
}
if (!Array.isArray(template.context?.evidenceRefs)) {
  failures.push("template_missing_evidence_refs");
}

const runner = read("examples/core/resolve-action-card.mjs");
requireIncludes("runner", runner, [
  "openclaw-send-message",
  "openclaw-edit-file",
  "openclaw-delete-file",
  "openclaw-browser-submit",
  "openclaw-shell-command",
  "openclaw-workflow-state-change",
]);

const actionCardDir = path("examples/openclaw/action-cards");
const actionCardFiles = existsSync(actionCardDir)
  ? readdirSync(actionCardDir).filter((file) => file.endsWith(".json")).sort()
  : [];

const expectedTypes = new Set([
  "message.send",
  "file.edit",
  "file.delete",
  "browser.submit_form",
  "shell.run_command",
  "workflow.update_state",
]);
const seenTypes = new Set();
const disallowedCardKeys = new Set([
  "body",
  "content",
  "messageBody",
  "fileContents",
  "formValues",
  "command",
  "rawCommand",
  "token",
  "secret",
  "password",
]);

for (const file of actionCardFiles) {
  const relative = `examples/openclaw/action-cards/${file}`;
  const text = read(relative);
  rejectUnsafe(relative, text);
  const card = JSON.parse(text);
  if (card.version !== "0.1") failures.push(`${file}_wrong_version`);
  if (!card.agent?.id || !card.agent?.capabilityVersion) failures.push(`${file}_missing_agent_refs`);
  if (!card.proposedAction?.type || !card.proposedAction?.target) {
    failures.push(`${file}_missing_proposed_action`);
  } else {
    seenTypes.add(card.proposedAction.type);
  }
  if (!card.affectedObject) failures.push(`${file}_missing_affected_object`);
  if (card.context?.requestedOutcome !== "decision_receipt") {
    failures.push(`${file}_missing_requested_decision_receipt`);
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
  if (!Array.isArray(card.context?.authorityContext?.allowedResources)) {
    failures.push(`${file}_missing_allowed_resources`);
  }

  const serialized = JSON.stringify(card);
  for (const key of disallowedCardKeys) {
    if (serialized.includes(`"${key}"`)) failures.push(`${file}_contains_${key}`);
  }
}

for (const type of expectedTypes) {
  if (!seenTypes.has(type)) failures.push(`missing_action_type_${type}`);
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      verifier: "openclaw-action-receipt-pack",
      skills: skillFiles.map((file) => dirname(file)),
      examples: actionCardFiles.map((file) => `examples/openclaw/action-cards/${file}`),
      boundaries: {
        official_openclaw_or_clawhub_claim: false,
        official_provider_integration_claim: false,
        public_api_key_issuance: false,
        public_production_mcp_token_issuance: false,
        public_a2a_token_issuance: false,
        unprotected_a2a_execution: false,
        downstream_execution_by_neura: false,
        private_payload_exposure: false,
        registry_auto_approval: false,
        full_authority_engine_completion_claim: false,
      },
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
