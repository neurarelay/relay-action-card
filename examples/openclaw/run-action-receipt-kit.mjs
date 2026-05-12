#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const manifestPath = join(exampleDir, "action-receipt-kit.manifest.json");
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const dryRun = process.argv.includes("--dry-run");
const jsonOutput = process.argv.includes("--json");
const listOnly = process.argv.includes("--list");
const onlyUsage = "--only=<id>";

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

function publicReceipt(receipt, response) {
  return {
    input_model: response.input_model,
    receipt_id: receipt?.receipt_id,
    decision: receipt?.decision,
    reason: receipt?.reason,
    trace_ref: receipt?.trace_ref,
    transaction_ref: response.transaction_ledger?.transaction_ref,
    next_step: receipt?.recommended_next_step,
    relay_boundary: receipt?.relay_boundary,
    authority_source: receipt?.authority_context?.source ?? null,
    registry_validation_status:
      receipt?.authority_context?.registry_validation_status ?? null,
    authority_decision_engine:
      receipt?.authority_decision_engine
        ? {
            authority_status: receipt.authority_decision_engine.authority_graph?.status,
            risk_class: receipt.authority_decision_engine.risk?.class,
            policy_status:
              receipt.authority_decision_engine.policy_evidence?.policy?.status,
            evidence_status:
              receipt.authority_decision_engine.policy_evidence?.evidence?.status,
            confidence_band:
              receipt.authority_decision_engine.confidence_scoring
                ?.confidence_band,
            precedent_status:
              receipt.authority_decision_engine.receipt_precedent?.status,
          }
        : null,
  };
}

const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
const only = argValue("only");
const examples = only
  ? manifest.examples.filter((example) => example.id === only)
  : manifest.examples;

if (listOnly) {
  const output = manifest.examples.map((example) => ({
    id: example.id,
    family: example.family,
    path: example.path,
  }));
  console.log(jsonOutput ? JSON.stringify(output, null, 2) : output.map((item) => item.id).join("\n"));
  process.exit(0);
}

if (only && examples.length === 0) {
  console.error(`Unknown OpenClaw kit example: ${only}. Use ${onlyUsage}.`);
  console.error(`Available examples: ${manifest.examples.map((example) => example.id).join(", ")}`);
  process.exit(1);
}

let createNeuraRelaySdk = null;
if (!dryRun) {
  try {
    ({ createNeuraRelaySdk } = await import("@neurarelay/sdk"));
  } catch {
    console.error("Install dependencies with npm install before running live receipts.");
    process.exit(1);
  }
}

const relay = createNeuraRelaySdk
  ? createNeuraRelaySdk({ baseUrl: relayBaseUrl })
  : null;
const results = [];

for (const example of examples) {
  const actionCardPath = join(repoRoot, example.path);
  const actionCard = JSON.parse(await readFile(actionCardPath, "utf8"));

  if (dryRun) {
    results.push({
      id: example.id,
      family: example.family,
      action_card_path: example.path,
      proposed_action: actionCard.proposedAction.type,
      target: actionCard.proposedAction.target,
      requested_outcome: actionCard.context.requestedOutcome,
      refs_only: true,
      relay_call_skipped: true,
    });
    continue;
  }

  const response = await relay.resolve.resolve({ action_card: actionCard });
  const receipt = response.decision_receipt;

  if (!receipt?.receipt_id || !receipt?.trace_ref) {
    throw new Error(`Relay response missing receipt or trace for ${example.id}`);
  }
  if (receipt.relay_boundary !== "decision_gate_only_developer_keeps_execution") {
    throw new Error(`Relay boundary changed for ${example.id}`);
  }

  results.push({
    id: example.id,
    family: example.family,
    action_card_path: example.path,
    ...publicReceipt(receipt, response),
  });
}

const output = {
  ok: true,
  kit: manifest.name,
  version: manifest.version,
  mode: dryRun ? "dry_run" : "live_receipts",
  relay: dryRun ? null : relayBaseUrl,
  count: results.length,
  results,
  boundaries: manifest.boundaries,
};

if (jsonOutput) {
  console.log(JSON.stringify(output, null, 2));
} else {
  console.log(`Neura OpenClaw Action Receipt Kit (${output.mode})`);
  console.log("");
  for (const result of results) {
    console.log(`${result.id} [${result.family}]`);
    console.log(`  Action Card: ${result.action_card_path}`);
    if (dryRun) {
      console.log(`  Proposed action: ${result.proposed_action}`);
      console.log("  Relay call: skipped");
    } else {
      console.log(`  Decision: ${result.decision}`);
      console.log(`  Receipt: ${result.receipt_id}`);
      console.log(`  Trace: ${result.trace_ref}`);
      console.log(`  Transaction: ${result.transaction_ref}`);
      console.log(`  Boundary: ${result.relay_boundary}`);
    }
  }
  console.log("");
  console.log("Your system keeps execution ownership. Neura only returns the pre-action Decision Receipt.");
}
