#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const actionCard = JSON.parse(
  await readFile(join(repoRoot, "action-card.v0.1.json"), "utf8"),
);

const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";

const response = await fetch(new URL("/api/resolve", relayBaseUrl), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action_card: actionCard }),
});

const payload = await response.json();
const receipt = payload.decision_receipt;
const failures = [];

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

const result = {
  ok: failures.length === 0,
  relay: relayBaseUrl,
  input_model: payload.input_model,
  decision: receipt?.decision,
  trace_ref: receipt?.trace_ref,
  relay_boundary: receipt?.relay_boundary,
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
