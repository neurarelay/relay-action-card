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
  "examples/core/action-cards/account-api-write.json",
  "examples/core/action-cards/refund-exception.json",
  "examples/core/action-cards/data-export.json",
  "examples/core/action-cards/payment-release.json",
  "examples/core/action-cards/workflow-state-change.json",
  "examples/core/action-card-high-risk.json",
  "examples/core/decision-receipt.example.json",
  "examples/core/resolve-action-card.mjs",
  "examples/sdk/README.md",
  "examples/sdk/resolve-action-card-sdk.mjs",
  "examples/sdk/resolve-action-card-sdk-a2a.mjs",
  "examples/a2a/README.md",
  "examples/a2a/resolve-action-card-a2a.mjs",
  "docs/developer-owned-agent-walkthrough.md",
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
  "examples/core/action-cards/account-api-write.json",
  "examples/core/action-cards/refund-exception.json",
  "examples/core/action-cards/data-export.json",
  "examples/core/action-cards/payment-release.json",
  "examples/core/action-cards/workflow-state-change.json",
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
const examplesReadme = await readFile(join(repoRoot, "examples/README.md"), "utf8");
const sdkReadme = await readFile(join(repoRoot, "examples/sdk/README.md"), "utf8");
const sdkExample = await readFile(
  join(repoRoot, "examples/sdk/resolve-action-card-sdk.mjs"),
  "utf8",
);
const sdkA2AExample = await readFile(
  join(repoRoot, "examples/sdk/resolve-action-card-sdk-a2a.mjs"),
  "utf8",
);
const packageJson = JSON.parse(await readFile(join(repoRoot, "package.json"), "utf8"));

if (!readme.includes("examples/core")) {
  failures.push("top_level_readme_must_name_core_examples");
}

if (!readme.includes("examples/mcp")) {
  failures.push("top_level_readme_must_name_mcp_examples");
}

if (!readme.includes("examples/sdk")) {
  failures.push("top_level_readme_must_name_sdk_examples");
}

for (const phrase of [
  "Get Your First Receipt In 5 Minutes",
  "Open Relay Developer Workspace",
  "decision_gate_only_developer_keeps_execution",
  "npm run example:relay -- --example=support-reply --json",
  "https://www.neurarelay.com/developers/workspace",
  "https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew",
  "transaction_ref",
  "docs/developer-owned-agent-walkthrough.md",
  "examples/sdk/README.md",
  "account-api-write",
  "workflow-state-change",
]) {
  if (!readme.includes(phrase)) {
    failures.push(`top_level_readme_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const phrase of [
  "SDK alpha",
  "@neurarelay/sdk",
  "public npm alpha",
  "SDK client -> Action Card -> Relay -> Decision Receipt",
  "npm run example:sdk",
]) {
  if (!examplesReadme.includes(phrase) && !readme.includes(phrase)) {
    failures.push(`sdk_public_docs_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const phrase of [
  "A2A Protected Client Proof",
  "examples/a2a",
  "npm run example:a2a -- --agent-card-only",
  "RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json",
  "no public A2A token issuance",
]) {
  if (!readme.includes(phrase)) {
    failures.push(`a2a_public_docs_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const phrase of [
  "published npm alpha",
  "createNeuraRelaySdk",
  "relay.mcp.resolveActionCard",
  "relay.a2a.sendActionCard",
  "npm run example:sdk:a2a",
  "does not issue public API keys",
]) {
  if (!sdkReadme.includes(phrase)) {
    failures.push(`sdk_readme_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const phrase of [
  'await import("@neurarelay/sdk")',
  "npm run example:relay",
  "createNeuraRelaySdk",
  "decision_receipt",
  "relay_boundary",
]) {
  if (!sdkExample.includes(phrase)) {
    failures.push(`sdk_example_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

for (const phrase of [
  'await import("@neurarelay/sdk")',
  "RELAY_A2A_ACCESS_TOKEN",
  "publicRelay.a2a.getAgentCard()",
  "protectedRelay.a2a.sendActionCard",
  "decision_receipt",
  "downstream_execution",
  "public_a2a_token_issuance: false",
]) {
  if (!sdkA2AExample.includes(phrase)) {
    failures.push(`sdk_a2a_example_missing_${phrase.replaceAll(" ", "_")}`);
  }
}

if (packageJson.scripts?.["example:sdk:a2a"] !== "node examples/sdk/resolve-action-card-sdk-a2a.mjs") {
  failures.push("package_json_missing_example_sdk_a2a");
}

for (const phrase of [
  "First Receipt Path",
  "Action Card -> Relay -> Decision Receipt -> trace ref",
  "Decision Receipt, Registry status, and trace replay",
  "Registry Agent Passport before Relay can validate identity",
  "https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew",
  "API write",
  "workflow state change",
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
