#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const failures = [];

const scenarios = {
  "delegated-crm-account-update": {
    file: "examples/core/action-cards/delegated-crm-account-update.json",
    expectedDecision: "proceed",
    expectedReason: "active, unexpired, and scoped",
  },
  "delegated-wrong-resource": {
    file: "examples/core/action-cards/delegated-wrong-resource.json",
    expectedDecision: ["human_review", "stop"],
    expectedReason: "outside the delegated authority scope",
  },
  "delegated-wrong-action": {
    file: "examples/core/action-cards/delegated-wrong-action.json",
    expectedDecision: "stop",
    expectedReason: "outside the delegated action set",
  },
  "delegated-expired-authority": {
    file: "examples/core/action-cards/delegated-expired-authority.json",
    expectedDecision: "human_review",
    expectedReason: "just-in-time approval is required",
  },
};

const requiredFiles = [
  "README.md",
  "examples/README.md",
  "examples/core/README.md",
  "examples/core/resolve-action-card.mjs",
  "docs/agentic-consent-delegated-authority.md",
  ...Object.values(scenarios).map((scenario) => scenario.file),
];

for (const file of requiredFiles) {
  if (!existsSync(join(repoRoot, file))) failures.push(`missing_${file}`);
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

function expectedDecisionIncludes(expected, actual) {
  return Array.isArray(expected) ? expected.includes(actual) : expected === actual;
}

const readme = await readText("README.md");
const examplesReadme = await readText("examples/README.md");
const coreReadme = await readText("examples/core/README.md");
const proofDoc = await readText("docs/agentic-consent-delegated-authority.md");
const resolver = await readText("examples/core/resolve-action-card.mjs");
const packageJson = JSON.parse(await readText("package.json"));

requirePhrases("readme", readme, [
  "Agentic consent / delegated authority proof",
  "delegated-crm-account-update",
  "delegated-expired-authority",
]);

requirePhrases("examples_readme", examplesReadme, [
  "delegated authority",
  "verify:delegated-authority-scenarios",
]);

requirePhrases("core_readme", coreReadme, [
  "Delegated authority scenarios",
  "delegated-wrong-action",
]);

requirePhrases("proof_doc", proofDoc, [
  "Can this agent, under this delegated authority context, perform this action on this resource now?",
  "Decision Receipt",
  "refs_only: true",
  "authority_context.source",
  "developer_supplied_unverified",
  "registry_reference_packet",
  "no public API keys",
  "no downstream execution by Neura",
]);

for (const key of Object.keys(scenarios)) {
  if (!resolver.includes(`"${key}"`)) failures.push(`resolver_missing_${key}`);
}

if (
  packageJson.scripts?.["verify:delegated-authority-scenarios"] !==
  "node scripts/verify-delegated-authority-scenarios.mjs"
) {
  failures.push("package_script_missing_delegated_authority_verifier");
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
  const authority = actionCard.context?.authorityContext;
  const serialized = JSON.stringify(actionCard);

  if (actionCard.version !== "0.1") failures.push(`${key}_wrong_version`);
  if (!authority?.delegatedBy) failures.push(`${key}_missing_delegated_by`);
  if (!authority?.actingAgent) failures.push(`${key}_missing_acting_agent`);
  if (!authority?.authorityScope) failures.push(`${key}_missing_authority_scope`);
  if (!Array.isArray(authority?.allowedActions)) {
    failures.push(`${key}_missing_allowed_actions`);
  }
  if (!Array.isArray(authority?.allowedResources)) {
    failures.push(`${key}_missing_allowed_resources`);
  }
  if (!authority?.expiresAt) failures.push(`${key}_missing_expires_at`);
  if (!authority?.revocationStatus) failures.push(`${key}_missing_revocation_status`);
  if (!Array.isArray(authority?.policyRefs)) failures.push(`${key}_missing_policy_refs`);
  if (/PRIVATE_|SECRET|TOKEN|API_KEY|PASSWORD/i.test(serialized)) {
    failures.push(`${key}_must_not_include_sensitive_payload`);
  }

  const { response, payload } = await resolveActionCard(actionCard);
  const receipt = payload.decision_receipt;
  const authorityContext = receipt?.authority_context;

  if (!response.ok) failures.push(`${key}_http_status_${response.status}`);
  if (payload.ok !== true) failures.push(`${key}_payload_not_ok`);
  if (!receipt?.receipt_id) failures.push(`${key}_missing_receipt_id`);
  if (!receipt?.trace_ref) failures.push(`${key}_missing_trace_ref`);
  if (!payload.transaction_ledger?.transaction_ref) {
    failures.push(`${key}_missing_transaction_ref`);
  }
  if (!expectedDecisionIncludes(scenario.expectedDecision, receipt?.decision)) {
    failures.push(`${key}_unexpected_decision_${receipt?.decision}`);
  }
  if (!receipt?.reason?.includes(scenario.expectedReason)) {
    failures.push(`${key}_reason_missing_delegated_authority_detail`);
  }
  if (authorityContext?.refs_only !== true) failures.push(`${key}_authority_not_refs_only`);
  if (
    !["registry_reference_packet", "developer_supplied_unverified"].includes(
      authorityContext?.source,
    )
  ) {
    failures.push(`${key}_authority_source_missing`);
  }
  if (authorityContext?.source !== "developer_supplied_unverified") {
    failures.push(`${key}_demo_authority_must_remain_developer_supplied`);
  }
  if (!authorityContext?.registry_validation_status) {
    failures.push(`${key}_registry_validation_status_missing`);
  }
  if (!authorityContext?.allowed_actions?.length) {
    failures.push(`${key}_missing_receipt_allowed_actions`);
  }
  if (!authorityContext?.allowed_resources?.length) {
    failures.push(`${key}_missing_receipt_allowed_resources`);
  }
  if (
    receipt?.relay_boundary !==
    "decision_gate_only_developer_keeps_execution"
  ) {
    failures.push(`${key}_wrong_relay_boundary`);
  }

  scenarioResults.push({
    scenario: key,
    decision: receipt?.decision,
    receipt_id: receipt?.receipt_id,
    trace_ref: receipt?.trace_ref,
    transaction_ref: payload.transaction_ledger?.transaction_ref,
    authority_context: authorityContext
      ? {
          decision: authorityContext.decision,
          revocation_status: authorityContext.revocation_status,
          source: authorityContext.source,
          registry_validation_status: authorityContext.registry_validation_status,
          refs_only: authorityContext.refs_only,
        }
      : null,
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
        "delegated authority is refs-only",
        "expired or changed authority requires just-in-time review",
        "no private payloads",
      ],
      failures,
    },
    null,
    2,
  ),
);

if (failures.length > 0) process.exit(1);
