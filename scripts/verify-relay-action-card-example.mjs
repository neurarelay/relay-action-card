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
const highRiskActionCard = JSON.parse(
  await readFile(join(repoRoot, "examples/core/action-card-high-risk.json"), "utf8"),
);
const readme = await readFile(join(repoRoot, "README.md"), "utf8");

if (!readme.includes("examples/core")) {
  failures.push("top_level_readme_must_name_core_examples");
}

if (!readme.includes("examples/mcp")) {
  failures.push("top_level_readme_must_name_mcp_examples");
}

const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";

const response = await fetch(new URL("/api/resolve", relayBaseUrl), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action_card: actionCard }),
});

const payload = await response.json();
const receipt = payload.decision_receipt;

const highRiskResponse = await fetch(new URL("/api/resolve", relayBaseUrl), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action_card: highRiskActionCard }),
});
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
  high_risk_decision: highRiskReceipt?.decision,
  high_risk_trace_ref: highRiskReceipt?.trace_ref,
  relay_boundary: receipt?.relay_boundary,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
