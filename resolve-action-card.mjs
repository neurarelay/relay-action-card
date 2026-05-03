#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const actionCard = JSON.parse(
  await readFile(join(exampleDir, "action-card.v0.1.json"), "utf8"),
);

const RELAY_BASE_URL = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const jsonOutput = process.argv.includes("--json");

const response = await fetch(new URL("/api/resolve", RELAY_BASE_URL), {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action_card: actionCard }),
});

const payload = await response.json();

if (!response.ok || payload.ok !== true) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

const receipt = payload.decision_receipt;
const result = {
  relay: RELAY_BASE_URL,
  input_model: payload.input_model,
  decision: receipt?.decision,
  reason: receipt?.reason,
  trace_ref: receipt?.trace_ref,
  next_step: receipt?.recommended_next_step,
  relay_boundary: receipt?.relay_boundary,
};

if (jsonOutput) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Neura Relay returned a Decision Receipt");
  console.log("");
  console.log(`Relay: ${result.relay}`);
  console.log(`Input: ${result.input_model}`);
  console.log(`Decision: ${result.decision}`);
  console.log(`Reason: ${result.reason}`);
  console.log(`Next step: ${result.next_step}`);
  console.log(`Trace: ${result.trace_ref}`);
  console.log(`Boundary: ${result.relay_boundary}`);
  console.log("");
  console.log("Your app keeps execution ownership. Relay only returns the governed decision before execution.");
}
