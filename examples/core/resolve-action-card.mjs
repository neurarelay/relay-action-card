#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const defaultActionCardPath = join(exampleDir, "action-card.json");

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const actionCardPath = argValue("action-card")
  ? resolve(repoRoot, argValue("action-card"))
  : defaultActionCardPath;
const actionCard = JSON.parse(
  await readFile(actionCardPath, "utf8"),
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
const factors = receipt?.decision_factors;
const factorSummary = factors
  ? [
      `identity ${factors.identity_check?.status ?? "unknown"}`,
      `authority ${factors.authority_check?.status ?? "unknown"}`,
      `evidence ${factors.evidence_check?.status ?? "unknown"}`,
      `policy ${factors.policy_check?.status ?? "unknown"}`,
      `risk ${factors.risk_check?.status ?? "unknown"}`,
    ].join(" - ")
  : null;
const result = {
  relay: RELAY_BASE_URL,
  action_card_path: actionCardPath.replace(`${repoRoot}/`, ""),
  input_model: payload.input_model,
  decision: receipt?.decision,
  reason: receipt?.reason,
  decision_factors: factorSummary,
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
  if (result.decision_factors) {
    console.log(`Decision factors: ${result.decision_factors}`);
  }
  console.log(`Next step: ${result.next_step}`);
  console.log(`Trace: ${result.trace_ref}`);
  console.log(`Boundary: ${result.relay_boundary}`);
  console.log("");
  console.log("Your system keeps execution ownership. Relay only returns the governed decision before execution.");
}
