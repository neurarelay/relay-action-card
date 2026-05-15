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
    "Install @neurarelay/sdk@0.1.1, or run npm run example:relay for the direct public path.",
  );
  process.exit(1);
}

const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const exampleDir = dirname(fileURLToPath(import.meta.url));
const actionCardDir = join(exampleDir, "..", "core", "action-cards");
const jsonOutput = process.argv.includes("--json");
const publicDemoAuthoritySource = "developer_supplied_unverified";

const scenarios = [
  {
    id: "delegated-crm-account-update",
    file: "delegated-crm-account-update.json",
    expectedPublicRoute: "hold_for_registry_backed_authority",
  },
  {
    id: "delegated-wrong-resource",
    file: "delegated-wrong-resource.json",
    expectedPublicRoute: "human_review",
  },
  {
    id: "delegated-wrong-action",
    file: "delegated-wrong-action.json",
    expectedPublicRoute: "stop",
  },
  {
    id: "delegated-expired-authority",
    file: "delegated-expired-authority.json",
    expectedPublicRoute: "human_review",
  },
];

function routeReceiptForDeveloper(receipt) {
  const decision = receipt?.decision ?? null;
  const authority = receipt?.authority_context ?? null;
  const source = authority?.source ?? null;
  const status = authority?.registry_validation_status ?? null;

  if (
    decision === "proceed" &&
    source === "registry_reference_packet" &&
    status === "ready"
  ) {
    return "ready_for_developer_owned_execution";
  }

  if (decision === "proceed") {
    return "hold_for_registry_backed_authority";
  }

  if (decision === "human_review") return "human_review";
  if (decision === "revise") return "revise";
  if (decision === "stop") return "stop";

  return "hold";
}

const relay = createNeuraRelaySdk({ baseUrl: relayBaseUrl });
const activationAttribution = buildRelayAttribution({
  defaultSource: "relay-action-card",
  defaultCampaign: "sdk-authority-routing",
  defaultSurface: "examples/sdk/authority-routing",
});
const results = [];

for (const scenario of scenarios) {
  const actionCard = JSON.parse(
    await readFile(join(actionCardDir, scenario.file), "utf8"),
  );
  const response = await relay.resolve.resolve(
    withRelayAttribution({ action_card: actionCard }, activationAttribution),
  );
  const receipt = response.decision_receipt;
  const authorityContext = receipt?.authority_context ?? null;
  const developerRoute = routeReceiptForDeveloper(receipt);

  results.push({
    id: scenario.id,
    decision: receipt?.decision ?? null,
    developer_route: developerRoute,
    expected_public_route: scenario.expectedPublicRoute,
    receipt_id: receipt?.receipt_id ?? null,
    trace_ref: receipt?.trace_ref ?? null,
    transaction_ref: response.transaction_ledger?.transaction_ref ?? null,
    activation_telemetry: response.activation_telemetry ?? null,
    authority_context: authorityContext
      ? {
          source: authorityContext.source ?? null,
          registry_validation_status:
            authorityContext.registry_validation_status ?? null,
          authority_scope_ref: authorityContext.authority_scope_ref ?? null,
          standing_ref: authorityContext.standing_ref ?? null,
          refs_only: authorityContext.refs_only === true,
        }
      : null,
    boundary: {
      relay_execution: false,
      developer_keeps_execution: true,
      public_api_key_issued: false,
      public_production_mcp_token_issued: false,
      public_a2a_token_issued: false,
      private_payload_returned: false,
    },
  });
}

const proof = {
  ok: true,
  relay: relayBaseUrl,
  package: "@neurarelay/sdk",
  version: "0.1.1",
  activation_attribution: publicAttributionSummary(activationAttribution),
  routing_policy:
    `proceed requires Registry-backed delegated authority before developer-owned execution; ${publicDemoAuthoritySource} demo refs hold for Registry trust`,
  results,
  boundaries: {
    public_api_key_issuance: false,
    public_production_mcp_token_issuance: false,
    public_a2a_token_issuance: false,
    downstream_execution: false,
    private_payload_exposure: false,
    registry_auto_approval: false,
  },
};

if (jsonOutput) {
  console.log(JSON.stringify(proof, null, 2));
} else {
  console.log("Neura SDK stable authority routing proof");
  console.log(`Relay: ${proof.relay}`);
  for (const result of results) {
    console.log("");
    console.log(`Scenario: ${result.id}`);
    console.log(`Decision: ${result.decision}`);
    console.log(`Developer route: ${result.developer_route}`);
    console.log(`Authority source: ${result.authority_context?.source ?? "none"}`);
    console.log(
      `Authority validation: ${
        result.authority_context?.registry_validation_status ?? "none"
      }`,
    );
    console.log(`Trace: ${result.trace_ref}`);
  }
  console.log("");
  console.log("Boundary: Relay returned receipts and refs only; your app keeps execution.");
}
