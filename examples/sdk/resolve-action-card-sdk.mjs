#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRelayAttribution,
  publicAttributionSummary,
  withRelayAttribution,
} from "../lib/activation-attribution.mjs";

let createNeuraRelaySdk;

try {
  ({ createNeuraRelaySdk } = await import("@neurarelay/sdk"));
} catch {
  console.error(
    "Install @neurarelay/sdk@0.1.0, or run npm run example:relay for the public direct path.",
  );
  process.exit(1);
}

const exampleDir = dirname(fileURLToPath(import.meta.url));
const actionCardPath = join(exampleDir, "..", "core", "action-card.json");
const actionCard = JSON.parse(await readFile(actionCardPath, "utf8"));
const relay = createNeuraRelaySdk({
  baseUrl: process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com",
});
const activationAttribution = buildRelayAttribution({
  defaultSource: "relay-action-card",
  defaultCampaign: "sdk-receipt-example",
  defaultSurface: "examples/sdk/resolve-action-card-sdk",
});

const response = await relay.resolve.resolve(
  withRelayAttribution({ action_card: actionCard }, activationAttribution),
);
const receipt = response.decision_receipt;

console.log(
  JSON.stringify(
    {
      input_model: response.input_model,
      receipt_id: receipt?.receipt_id,
      decision: receipt?.decision,
      trace_ref: receipt?.trace_ref,
      transaction_ref: response.transaction_ledger?.transaction_ref,
      activation_attribution: publicAttributionSummary(activationAttribution),
      activation_telemetry: response.activation_telemetry ?? null,
      authority_context_source: receipt?.authority_context?.source ?? null,
      registry_validation_status:
        receipt?.authority_context?.registry_validation_status ?? null,
      relay_boundary: receipt?.relay_boundary,
    },
    null,
    2,
  ),
);
