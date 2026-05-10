#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const defaultActionCardPath = join(exampleDir, "action-card.json");
const examplePaths = {
  "support-reply": "examples/core/action-cards/support-reply.json",
  "account-api-write": "examples/core/action-cards/account-api-write.json",
  "refund-exception": "examples/core/action-cards/refund-exception.json",
  "data-export": "examples/core/action-cards/data-export.json",
  "payment-release": "examples/core/action-cards/payment-release.json",
  "workflow-state-change": "examples/core/action-cards/workflow-state-change.json",
  "authorized-crm-account-update": "examples/core/action-cards/authorized-crm-account-update.json",
  "blocked-cross-resource-crm-update": "examples/core/action-cards/blocked-cross-resource-crm-update.json",
  "blocked-payment-without-authority": "examples/core/action-cards/blocked-payment-without-authority.json",
  "delegated-crm-account-update": "examples/core/action-cards/delegated-crm-account-update.json",
  "delegated-wrong-resource": "examples/core/action-cards/delegated-wrong-resource.json",
  "delegated-wrong-action": "examples/core/action-cards/delegated-wrong-action.json",
  "delegated-expired-authority": "examples/core/action-cards/delegated-expired-authority.json",
  "high-risk": "examples/core/action-card-high-risk.json",
};

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

if (process.argv.includes("--list-examples")) {
  console.log(Object.keys(examplePaths).join("\n"));
  process.exit(0);
}

const selectedExample = argValue("example");
if (selectedExample && !examplePaths[selectedExample]) {
  console.error(`Unknown example: ${selectedExample}`);
  console.error(`Available examples: ${Object.keys(examplePaths).join(", ")}`);
  process.exit(1);
}

const actionCardPath = selectedExample
  ? resolve(repoRoot, examplePaths[selectedExample])
  : argValue("action-card")
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
  receipt_id: receipt?.receipt_id,
  decision: receipt?.decision,
  reason: receipt?.reason,
  decision_factors: factorSummary,
  trace_ref: receipt?.trace_ref,
  transaction_ref: payload.transaction_ledger?.transaction_ref,
  next_step: receipt?.recommended_next_step,
  relay_boundary: receipt?.relay_boundary,
  authority_context: receipt?.authority_context ?? null,
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
  console.log(`Receipt: ${result.receipt_id}`);
  if (result.transaction_ref) {
    console.log(`Transaction: ${result.transaction_ref}`);
  }
  if (result.authority_context) {
    console.log(`Authority context: ${result.authority_context.reason}`);
    console.log(
      `Authority source: ${result.authority_context.source ?? "not_returned"}`,
    );
    console.log(
      `Registry authority validation: ${
        result.authority_context.registry_validation_status ?? "not_returned"
      }`,
    );
  }
  console.log(`Next step: ${result.next_step}`);
  console.log(`Trace: ${result.trace_ref}`);
  console.log(`Boundary: ${result.relay_boundary}`);
  console.log("");
  console.log("Your system keeps execution ownership. Relay only returns the governed decision before execution.");
}
