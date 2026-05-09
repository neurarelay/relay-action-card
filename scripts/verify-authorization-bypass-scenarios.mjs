#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const failures = [];

const scenarios = {
  "authorized-crm-account-update": {
    file: "examples/core/action-cards/authorized-crm-account-update.json",
    mustNotProceed: false,
    expectedTargetInScope: true,
  },
  "blocked-cross-resource-crm-update": {
    file: "examples/core/action-cards/blocked-cross-resource-crm-update.json",
    mustNotProceed: true,
    expectedTargetInScope: false,
  },
  "blocked-payment-without-authority": {
    file: "examples/core/action-cards/blocked-payment-without-authority.json",
    mustNotProceed: true,
    expectedTargetInScope: false,
  },
};

const requiredFiles = [
  "README.md",
  "examples/README.md",
  "examples/core/README.md",
  "examples/core/resolve-action-card.mjs",
  "docs/developer-owned-agent-walkthrough.md",
  "docs/authorization-bypass-scenarios.md",
  ...Object.values(scenarios).map((scenario) => scenario.file),
];

for (const file of requiredFiles) {
  if (!existsSync(join(repoRoot, file))) {
    failures.push(`missing_${file}`);
  }
}

async function readText(file) {
  return readFile(join(repoRoot, file), "utf8");
}

async function readJson(file) {
  return JSON.parse(await readText(file));
}

function requirePhrases(label, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${label}_missing_${phrase.replaceAll(" ", "_")}`);
    }
  }
}

const readme = await readText("README.md");
const examplesReadme = await readText("examples/README.md");
const coreReadme = await readText("examples/core/README.md");
const walkthrough = await readText("docs/developer-owned-agent-walkthrough.md");
const proofDoc = await readText("docs/authorization-bypass-scenarios.md");
const resolver = await readText("examples/core/resolve-action-card.mjs");

requirePhrases("readme", readme, [
  "authorization-bypass scenario proof",
  "authorized-crm-account-update",
  "blocked-cross-resource-crm-update",
  "blocked-payment-without-authority",
]);

requirePhrases("examples_readme", examplesReadme, [
  "authorization-bypass scenario proof",
  "blocked-cross-resource-crm-update",
  "blocked-payment-without-authority",
]);

requirePhrases("core_readme", coreReadme, [
  "Authorization bypass scenarios",
  "must not auto-proceed",
  "authorized-crm-account-update",
]);

requirePhrases("walkthrough", walkthrough, [
  "authority-mismatch scenarios",
  "must not auto-proceed",
  "Registry-backed Agent Passport standing",
]);

requirePhrases("proof_doc", proofDoc, [
  "Action Card -> Relay -> Decision Receipt -> developer-owned execution",
  "blocked authority-mismatch scenarios do not return `proceed`",
  "does not claim a public SDK",
  "public A2A support",
  "open production MCP access",
]);

for (const key of Object.keys(scenarios)) {
  if (!resolver.includes(`"${key}"`)) {
    failures.push(`resolver_missing_${key}`);
  }
}

async function resolveActionCard(actionCard) {
  const response = await fetch(new URL("/api/resolve", relayBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_card: actionCard }),
  });

  return {
    response,
    payload: await response.json(),
  };
}

const scenarioResults = [];

for (const [key, scenario] of Object.entries(scenarios)) {
  const actionCard = await readJson(scenario.file);
  const serialized = JSON.stringify(actionCard);
  const authorityContext = actionCard.context?.authorityContext;
  const allowedTargets = authorityContext?.allowedTargets ?? [];
  const allowedActionTypes = authorityContext?.allowedActionTypes ?? [];
  const targetInScope = allowedTargets.includes(actionCard.proposedAction?.target);
  const actionTypeInScope = allowedActionTypes.includes(actionCard.proposedAction?.type);

  if (actionCard.version !== "0.1") failures.push(`${key}_wrong_version`);
  if (!actionCard.agent?.id) failures.push(`${key}_missing_agent_id`);
  if (!actionCard.agent?.capabilityVersion) {
    failures.push(`${key}_missing_capability_version`);
  }
  if (!authorityContext?.authorityScopeRef) {
    failures.push(`${key}_missing_authority_scope_ref`);
  }
  if (!authorityContext?.standingRef) {
    failures.push(`${key}_missing_standing_ref`);
  }
  if (!Array.isArray(actionCard.context?.evidenceRefs)) {
    failures.push(`${key}_missing_evidence_refs`);
  }
  if (!Array.isArray(actionCard.context?.ruleRefs)) {
    failures.push(`${key}_missing_rule_refs`);
  }
  if (targetInScope !== scenario.expectedTargetInScope) {
    failures.push(`${key}_wrong_target_scope_fixture`);
  }
  if (key === "authorized-crm-account-update" && !actionTypeInScope) {
    failures.push(`${key}_action_type_should_be_in_scope`);
  }
  if (key !== "authorized-crm-account-update" && actionTypeInScope && targetInScope) {
    failures.push(`${key}_blocked_fixture_should_have_authority_mismatch`);
  }
  if (/PRIVATE_|SECRET|TOKEN|API_KEY|PASSWORD/i.test(serialized)) {
    failures.push(`${key}_must_not_include_sensitive_payload`);
  }

  const { response, payload } = await resolveActionCard(actionCard);
  const receipt = payload.decision_receipt;

  if (!response.ok) failures.push(`${key}_http_status_${response.status}`);
  if (payload.ok !== true) failures.push(`${key}_payload_not_ok`);
  if (payload.input_model !== "action_card_v0_1") {
    failures.push(`${key}_wrong_input_model`);
  }
  if (!receipt?.receipt_id) failures.push(`${key}_missing_receipt_id`);
  if (!receipt?.decision) failures.push(`${key}_missing_decision`);
  if (!receipt?.trace_ref) failures.push(`${key}_missing_trace_ref`);
  if (!payload.transaction_ledger?.transaction_ref) {
    failures.push(`${key}_missing_transaction_ref`);
  }
  if (
    receipt?.relay_boundary !==
    "decision_gate_only_developer_keeps_execution"
  ) {
    failures.push(`${key}_wrong_relay_boundary`);
  }
  if (scenario.mustNotProceed && receipt?.decision === "proceed") {
    failures.push(`${key}_must_not_auto_proceed`);
  }

  scenarioResults.push({
    scenario: key,
    decision: receipt?.decision,
    receipt_id: receipt?.receipt_id,
    trace_ref: receipt?.trace_ref,
    transaction_ref: payload.transaction_ledger?.transaction_ref,
    target_in_scope: targetInScope,
    action_type_in_scope: actionTypeInScope,
  });
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      relay: relayBaseUrl,
      scenarios: scenarioResults,
      boundaries: [
        "developer owns execution",
        "blocked authority-mismatch scenarios must not auto-proceed",
        "Registry Agent Passport required for production identity",
        "refs only, no private payloads",
      ],
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) {
  process.exit(1);
}
