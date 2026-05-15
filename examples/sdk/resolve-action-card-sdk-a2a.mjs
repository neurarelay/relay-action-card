#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let createNeuraRelaySdk;

try {
  ({ createNeuraRelaySdk } = await import("@neurarelay/sdk"));
} catch {
  console.error(
    "Install @neurarelay/sdk@0.1.0, or run npm run example:a2a for the no-SDK protected A2A shape.",
  );
  process.exit(1);
}

const exampleDir = dirname(fileURLToPath(import.meta.url));
const actionCardPath = join(exampleDir, "..", "core", "action-card.json");
const actionCard = JSON.parse(await readFile(actionCardPath, "utf8"));
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const relayA2aAccessToken =
  process.env.RELAY_A2A_ACCESS_TOKEN ?? process.env.NEURA_RELAY_INTERNAL_ACCESS_KEY ?? "";

const publicRelay = createNeuraRelaySdk({
  baseUrl: relayBaseUrl,
});

const agentCard = await publicRelay.a2a.getAgentCard();

if (!relayA2aAccessToken) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        relay: relayBaseUrl,
        agent_card: {
          name: agentCard.name,
          version: agentCard.version,
          interface_url: agentCard.url,
          skill_ids: agentCard.skills?.map((skill) => skill.id) ?? [],
          protected_execution: true,
        },
        protected_a2a: {
          skipped: true,
          reason: "missing_RELAY_A2A_ACCESS_TOKEN",
        },
        boundary: {
          public_discovery: true,
          protected_execution: true,
          public_a2a_token_issuance: false,
          downstream_execution: false,
          private_payload_exposure: false,
        },
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

const protectedRelay = createNeuraRelaySdk({
  baseUrl: relayBaseUrl,
  headers: {
    Authorization: `Bearer ${relayA2aAccessToken}`,
  },
});

const taskResponse = await protectedRelay.a2a.sendActionCard(actionCard, {
  id: "relay-action-card-sdk-a2a-proof",
});
const task = taskResponse.result;
const artifactData = task?.artifacts
  ?.flatMap((artifact) => artifact.parts ?? [])
  ?.find((part) => part.kind === "data")
  ?.data;
const serialized = JSON.stringify(taskResponse);

console.log(
  JSON.stringify(
    {
      ok: true,
      relay: relayBaseUrl,
      agent_card: {
        name: agentCard.name,
        version: agentCard.version,
        interface_url: agentCard.url,
        skill_ids: agentCard.skills?.map((skill) => skill.id) ?? [],
        protected_execution: true,
      },
      a2a: {
        jsonrpc: taskResponse.jsonrpc,
        task_kind: task?.kind,
        task_state: task?.status?.state,
      },
      decision_receipt: {
        decision: artifactData?.decision_receipt?.decision,
        receipt_id: artifactData?.decision_receipt?.receipt_id,
        trace_ref: artifactData?.trace_ref,
        transaction_ref: artifactData?.transaction_ref,
      },
      boundary: {
        payload_posture: artifactData?.payload_posture,
        private_payload_returned: serialized.includes("PRIVATE_"),
        public_a2a_token_issuance: false,
        downstream_execution: artifactData?.downstream_execution,
      },
    },
    null,
    2,
  ),
);
