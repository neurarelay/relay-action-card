#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];
const coreFiles = [
  "examples/core/README.md",
  "examples/core/action-card.json",
  "examples/core/action-cards/support-reply.json",
  "examples/core/action-cards/refund-exception.json",
  "examples/core/action-cards/data-export.json",
  "examples/core/action-cards/payment-release.json",
  "examples/core/action-card-high-risk.json",
  "examples/core/decision-receipt.example.json",
  "examples/core/resolve-action-card.mjs",
];

for (const file of coreFiles) {
  if (!existsSync(join(repoRoot, file))) {
    failures.push(`missing_${file}`);
  }
}

const actionCard = JSON.parse(
  await readFile(join(repoRoot, "examples/core/action-card.json"), "utf8"),
);
const actionCardExamples = [
  "examples/core/action-cards/support-reply.json",
  "examples/core/action-cards/refund-exception.json",
  "examples/core/action-cards/data-export.json",
  "examples/core/action-cards/payment-release.json",
];
const actionCards = await Promise.all(
  actionCardExamples.map(async (file) => ({
    file,
    actionCard: JSON.parse(await readFile(join(repoRoot, file), "utf8")),
  })),
);
const highRiskActionCard = JSON.parse(
  await readFile(join(repoRoot, "examples/core/action-card-high-risk.json"), "utf8"),
);
const readme = await readFile(join(repoRoot, "README.md"), "utf8");
const coreReadme = await readFile(
  join(repoRoot, "examples/core/README.md"),
  "utf8",
);

if (!readme.includes("examples/core")) {
  failures.push("top_level_readme_must_name_core_examples");
}

if (!readme.includes("examples/mcp")) {
  failures.push("top_level_readme_must_name_mcp_examples");
}

for (const phrase of [
  "Get Your First Receipt In 5 Minutes",
  "Open Relay Developer Workspace",
  "decision_gate_only_developer_keeps_execution",
  "npm run example:relay -- --example=support-reply --json",
  "https://www.neurarelay.com/developers/workspace",
  "transaction_ref",
]) {
  if (!readme.includes(phrase)) {
    failures.push(`top_level_readme_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const phrase of [
  "First Receipt Path",
  "Action Card -> Relay -> Decision Receipt -> trace ref",
  "receipt, trace, transaction refs, and Registry readiness context",
]) {
  if (!coreReadme.includes(phrase)) {
    failures.push(`core_readme_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const [index, { file, actionCard: example }] of actionCards.entries()) {
  if (example.version !== "0.1") failures.push(`${file}_wrong_version`);
  if (!example.agent?.id) failures.push(`${file}_missing_agent_id`);
  if (!example.agent?.owner) failures.push(`${file}_missing_agent_owner`);
  if (!example.agent?.capability) failures.push(`${file}_missing_capability`);
  if (!example.agent?.capabilityVersion) {
    failures.push(`${file}_missing_capability_version`);
  }
  if (!example.proposedAction?.type) failures.push(`${file}_missing_action_type`);
  if (!example.proposedAction?.summary) failures.push(`${file}_missing_summary`);
  if (!example.proposedAction?.target) failures.push(`${file}_missing_target`);
  if (!example.affectedObject) failures.push(`${file}_missing_affected_object`);
  if (!Array.isArray(example.context?.evidenceRefs)) {
    failures.push(`${file}_missing_evidence_refs`);
  }
  if (!Array.isArray(example.context?.ruleRefs)) {
    failures.push(`${file}_missing_rule_refs`);
  }
  if (!example.context?.riskCategory) failures.push(`${file}_missing_risk_category`);
  if (JSON.stringify(example).includes("PRIVATE_")) {
    failures.push(`${file}_must_not_include_private_payload`);
  }
  if (index === 0 && JSON.stringify(example) !== JSON.stringify(actionCard)) {
    failures.push("default_action_card_must_match_support_reply_example");
  }
}

const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";

async function resolveActionCard(card) {
  const response = await fetch(new URL("/api/resolve", relayBaseUrl), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action_card: card }),
  });

  return {
    response,
    payload: await response.json(),
  };
}

const { response, payload } = await resolveActionCard(actionCard);

const exampleResults = [];
for (const { file, actionCard: example } of actionCards) {
  const { response: exampleResponse, payload: examplePayload } =
    await resolveActionCard(example);
  const exampleReceipt = examplePayload.decision_receipt;

  if (!exampleResponse.ok) failures.push(`${file}_http_status_${exampleResponse.status}`);
  if (examplePayload.ok !== true) failures.push(`${file}_payload_not_ok`);
  if (examplePayload.input_model !== "action_card_v0_1") {
    failures.push(`${file}_wrong_input_model`);
  }
  if (!exampleReceipt?.receipt_id) failures.push(`${file}_missing_receipt_id`);
  if (!exampleReceipt?.decision) failures.push(`${file}_missing_decision`);
  if (!exampleReceipt?.trace_ref) failures.push(`${file}_missing_trace_ref`);
  if (!examplePayload.transaction_ledger?.transaction_ref) {
    failures.push(`${file}_missing_transaction_ref`);
  }
  if (
    exampleReceipt?.relay_boundary !==
    "decision_gate_only_developer_keeps_execution"
  ) {
    failures.push(`${file}_wrong_relay_boundary`);
  }

  exampleResults.push({
    file,
    decision: exampleReceipt?.decision,
    receipt_id: exampleReceipt?.receipt_id,
    trace_ref: exampleReceipt?.trace_ref,
    transaction_ref: examplePayload.transaction_ledger?.transaction_ref,
  });
}

const highRiskResult = await fetch(new URL("/api/resolve", relayBaseUrl), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action_card: highRiskActionCard }),
});
const receipt = payload.decision_receipt;
const highRiskResponse = highRiskResult;
const highRiskPayload = await highRiskResponse.json();
const highRiskReceipt = highRiskPayload.decision_receipt;

if (!response.ok) failures.push(`http_status_${response.status}`);
if (payload.ok !== true) failures.push("payload_not_ok");
if (payload.input_model !== "action_card_v0_1") failures.push("wrong_input_model");
if (!receipt?.receipt_id) failures.push("missing_receipt_id");
if (!receipt?.decision) failures.push("missing_decision");
if (!receipt?.reason) failures.push("missing_reason");
if (!receipt?.recommended_next_step) failures.push("missing_recommended_next_step");
if (!receipt?.trace_ref) failures.push("missing_trace_ref");
if (!payload.transaction_ledger?.transaction_ref) failures.push("missing_transaction_ref");
if (receipt?.relay_boundary !== "decision_gate_only_developer_keeps_execution") {
  failures.push("wrong_relay_boundary");
}
if (!highRiskResponse.ok) failures.push(`high_risk_http_status_${highRiskResponse.status}`);
if (highRiskPayload.ok !== true) failures.push("high_risk_payload_not_ok");
if (
  highRiskReceipt?.decision !== "stop" &&
  highRiskReceipt?.decision !== "human_review"
) {
  failures.push("high_risk_must_not_auto_proceed");
}
if (
  highRiskReceipt?.relay_boundary !==
  "decision_gate_only_developer_keeps_execution"
) {
  failures.push("high_risk_wrong_relay_boundary");
}

const result = {
  ok: failures.length === 0,
  relay: relayBaseUrl,
  input_model: payload.input_model,
  decision: receipt?.decision,
  decision_factors: receipt?.decision_factors
    ? {
        identity: receipt.decision_factors.identity_check?.status,
        authority: receipt.decision_factors.authority_check?.status,
        evidence: receipt.decision_factors.evidence_check?.status,
        policy: receipt.decision_factors.policy_check?.status,
        risk: receipt.decision_factors.risk_check?.status,
      }
    : null,
  trace_ref: receipt?.trace_ref,
  transaction_ref: payload.transaction_ledger?.transaction_ref,
  examples: exampleResults,
  high_risk_decision: highRiskReceipt?.decision,
  high_risk_trace_ref: highRiskReceipt?.trace_ref,
  relay_boundary: receipt?.relay_boundary,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
