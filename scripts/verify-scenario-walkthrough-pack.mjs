#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const files = {
  readme: "README.md",
  examplesReadme: "examples/README.md",
  coreReadme: "examples/core/README.md",
  walkthrough: "docs/developer-owned-agent-walkthrough.md",
  resolver: "examples/core/resolve-action-card.mjs",
};

const scenarioFiles = {
  "account-api-write": "examples/core/action-cards/account-api-write.json",
  "support-reply": "examples/core/action-cards/support-reply.json",
  "payment-release": "examples/core/action-cards/payment-release.json",
  "workflow-state-change": "examples/core/action-cards/workflow-state-change.json",
};

for (const file of [...Object.values(files), ...Object.values(scenarioFiles)]) {
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

const readme = await readText(files.readme);
const examplesReadme = await readText(files.examplesReadme);
const coreReadme = await readText(files.coreReadme);
const walkthrough = await readText(files.walkthrough);
const resolver = await readText(files.resolver);

function requirePhrases(label, text, phrases) {
  for (const phrase of phrases) {
    if (!text.includes(phrase)) {
      failures.push(`${label}_missing_${phrase.replaceAll(" ", "_")}`);
    }
  }
}

requirePhrases("walkthrough", walkthrough, [
  "Neura does not host your agent.",
  "Your agent -> Action Card -> Relay -> Decision Receipt -> your app routes execution",
  "API write",
  "Customer notification",
  "Financial or operational commitment",
  "Workflow state change",
  "production, create a Registry Agent Passport",
  "Relay does not create the Agent Passport",
  "host your agent",
  "execute the downstream action",
  "Do not send private payloads",
]);

requirePhrases("readme", readme, [
  "developer-owned agent flow",
  "account-api-write",
  "workflow-state-change",
  "A CRM/account update before an API write",
  "A workflow transition before state changes",
]);

requirePhrases("examples_readme", examplesReadme, [
  "account-api-write.json",
  "workflow-state-change.json",
  "developer-owned agent flow",
]);

requirePhrases("core_readme", coreReadme, [
  "API write",
  "customer notification",
  "financial or operational commitment",
  "workflow state change",
]);

for (const key of Object.keys(scenarioFiles)) {
  if (!resolver.includes(`"${key}"`)) {
    failures.push(`resolver_missing_${key}`);
  }
}

const expected = {
  "account-api-write": {
    type: "update_customer_account_record",
    risk: "account_state_change",
  },
  "support-reply": {
    type: "send_customer_reply",
    risk: "customer_communication",
  },
  "payment-release": {
    type: "release_partner_payment",
    risk: "payment",
  },
  "workflow-state-change": {
    type: "advance_workflow_state",
    risk: "workflow_state_change",
  },
};

for (const [key, file] of Object.entries(scenarioFiles)) {
  const actionCard = await readJson(file);
  const expectation = expected[key];

  if (actionCard.version !== "0.1") failures.push(`${key}_wrong_version`);
  if (!actionCard.agent?.id) failures.push(`${key}_missing_agent_id`);
  if (!actionCard.agent?.capabilityVersion) {
    failures.push(`${key}_missing_capability_version`);
  }
  if (actionCard.proposedAction?.type !== expectation.type) {
    failures.push(`${key}_wrong_action_type`);
  }
  if (actionCard.context?.riskCategory !== expectation.risk) {
    failures.push(`${key}_wrong_risk_category`);
  }
  if (!Array.isArray(actionCard.context?.evidenceRefs)) {
    failures.push(`${key}_missing_evidence_refs`);
  }
  if (!Array.isArray(actionCard.context?.ruleRefs)) {
    failures.push(`${key}_missing_rule_refs`);
  }
  if (JSON.stringify(actionCard).includes("PRIVATE_")) {
    failures.push(`${key}_must_not_include_private_payload`);
  }
}

console.log(
  JSON.stringify(
    {
      ok: failures.length === 0,
      scenarios: Object.keys(scenarioFiles),
      walkthrough: files.walkthrough,
      boundaries: [
        "developer owns agent and execution",
        "Registry Agent Passport required for production identity",
        "Relay returns Decision Receipt only",
        "no private payloads",
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
