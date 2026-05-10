#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

let createNeuraRelaySdk;

try {
  ({ createNeuraRelaySdk } = await import("@neurarelay/sdk"));
} catch {
  console.error(
    "Install dependencies first with npm install, or use npm run example:relay for the public direct path.",
  );
  process.exit(1);
}

const args = new Set(process.argv.slice(2));
const jsonOutput = args.has("--json");
const agentCardOnly = args.has("--agent-card-only");
const relayBaseUrl = process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com";
const idempotencyKey = "relay-action-card-a2a-v1-proof";
const accessToken =
  process.env.RELAY_A2A_ACCESS_TOKEN ??
  process.env.NEURA_RELAY_INTERNAL_ACCESS_KEY ??
  "";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const actionCardPath = join(exampleDir, "..", "core", "action-card.json");
const actionCard = JSON.parse(await readFile(actionCardPath, "utf8"));
const repoPackage = JSON.parse(await readFile(join(exampleDir, "..", "..", "package.json"), "utf8"));
const sdkVersion = repoPackage.dependencies?.["@neurarelay/sdk"] ?? "unknown";
const boundary = {
  access_model: "controlled_bearer_or_relay_developer_session",
  public_discovery: true,
  protected_execution: true,
  unprotected_a2a_execution: false,
  public_a2a_token_issuance: false,
  public_api_key_issuance: false,
  token_value_returned: false,
  downstream_execution: false,
  private_payload_returned: false,
};

function fail(message, details = {}) {
  const payload = {
    ok: false,
    error: message,
    ...details,
  };

  if (jsonOutput) {
    console.error(JSON.stringify(payload, null, 2));
  } else {
    console.error(message);
  }

  process.exit(1);
}

function createRelay(headers = undefined) {
  return createNeuraRelaySdk({
    baseUrl: relayBaseUrl,
    headers,
  });
}

function extractArtifactData(response) {
  const artifact = response?.result?.artifacts?.find((item) =>
    item?.parts?.some((part) => part?.kind === "data" && part?.data),
  );
  const dataPart = artifact?.parts?.find((part) => part?.kind === "data" && part?.data);
  return dataPart?.data ?? null;
}

const discoveryRelay = createRelay();
// Same SDK call shape developers use directly: relay.a2a.getAgentCard()
const agentCard = await discoveryRelay.a2a.getAgentCard();

if (agentCardOnly) {
  const summary = {
    ok: true,
    relay: relayBaseUrl,
    sdk: {
      package: "@neurarelay/sdk",
      version: sdkVersion,
    },
    agent_card: {
      name: agentCard.name,
      version: agentCard.version,
      interface_url: agentCard.supportedInterfaces?.[0]?.url,
      skill_ids: agentCard.skills?.map((skill) => skill.id) ?? [],
      protected_execution: Boolean(agentCard.securityRequirements?.length),
    },
    boundary,
  };

  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

if (!accessToken) {
  fail("RELAY_A2A_ACCESS_TOKEN is required for protected A2A message/send.", {
    relay: relayBaseUrl,
    sdk: {
      package: "@neurarelay/sdk",
      version: sdkVersion,
    },
    agent_card: {
      name: agentCard.name,
      version: agentCard.version,
      interface_url: agentCard.supportedInterfaces?.[0]?.url,
      skill_ids: agentCard.skills?.map((skill) => skill.id) ?? [],
    },
    boundary,
  });
}

const relay = createRelay({
  Authorization: `Bearer ${accessToken}`,
  "Idempotency-Key": idempotencyKey,
});
let response;

try {
  response = await relay.a2a.sendActionCard(actionCard, {
    id: "relay-action-card-a2a-proof",
  });
} catch (error) {
  fail("Relay A2A protected call failed.", {
    relay: relayBaseUrl,
    status: error?.status,
    response: error?.responseBody,
    boundary,
  });
}

if (response.error) {
  fail("Relay A2A returned JSON-RPC error.", {
    relay: relayBaseUrl,
    code: response.error.code,
    message: response.error.message,
  });
}

const data = extractArtifactData(response);
const receipt = data?.decision_receipt;
const expectedDownstreamBoundary = "developer_owned_not_performed_by_relay";

if (!receipt?.receipt_id || !data?.trace_ref || !data?.transaction_ref) {
  fail("Relay A2A response did not include receipt, trace, and transaction refs.", {
    relay: relayBaseUrl,
    response,
  });
}

const summary = {
  ok: true,
  relay: relayBaseUrl,
  sdk: {
    package: "@neurarelay/sdk",
    version: sdkVersion,
  },
  agent_card: {
    name: agentCard.name,
    version: agentCard.version,
    interface_url: agentCard.supportedInterfaces?.[0]?.url,
    skill_ids: agentCard.skills?.map((skill) => skill.id) ?? [],
  },
  a2a: {
    jsonrpc: response.jsonrpc,
    task_id: response.result?.id,
    context_id: response.result?.contextId,
    task_kind: response.result?.kind,
    task_state: response.result?.status?.state,
    skill_id: data.skill_id,
  },
  runtime_contract: {
    version:
      response.result?.metadata?.runtime_contract?.version ??
      data.runtime_contract?.version,
    access_model:
      response.result?.metadata?.runtime_contract?.access_model ??
      data.runtime_contract?.access_model,
    output_shape:
      response.result?.metadata?.runtime_contract?.output_shape ??
      data.runtime_contract?.output_shape,
  },
  registry_trust: {
    required_for_production_identity_validation:
      data.registry_trust?.required_for_production_identity_validation,
    posture: data.registry_trust?.posture ?? null,
    registry_context_available: data.registry_trust?.registry_context_available,
  },
  idempotency: {
    key_ref: response.result?.metadata?.idempotency?.key_ref ?? null,
    raw_key_returned: response.result?.metadata?.idempotency?.raw_key_returned ?? false,
  },
  decision_receipt: {
    receipt_id: receipt.receipt_id,
    decision: receipt.decision,
    trace_ref: data.trace_ref,
    transaction_ref: data.transaction_ref,
    relay_boundary: data.relay_boundary,
  },
  boundary: {
    ...boundary,
    payload_posture: data.payload_posture,
    downstream_execution: data.downstream_execution,
    private_payload_returned: JSON.stringify(response).includes("PRIVATE_"),
    idempotency_key_returned: JSON.stringify(response).includes(idempotencyKey),
  },
};

if (summary.boundary.private_payload_returned) {
  fail("Relay A2A response included a forbidden private payload marker.", summary);
}

if (summary.boundary.idempotency_key_returned) {
  fail("Relay A2A response included the raw idempotency key.", summary);
}

if (summary.boundary.downstream_execution !== expectedDownstreamBoundary) {
  fail("Relay A2A response did not preserve developer-owned execution.", summary);
}

if (jsonOutput) {
  console.log(JSON.stringify(summary, null, 2));
} else {
  console.log("Neura Relay A2A returned a protected Decision Receipt task");
  console.log("");
  console.log(`Relay: ${summary.relay}`);
  console.log(`SDK: ${summary.sdk.package}@${summary.sdk.version}`);
  console.log(`Agent Card: ${summary.agent_card.name} ${summary.agent_card.version}`);
  console.log(`Skill: ${summary.a2a.skill_id}`);
  console.log(`Task: ${summary.a2a.task_id}`);
  console.log(`State: ${summary.a2a.task_state}`);
  console.log(`Runtime: ${summary.runtime_contract.version}`);
  console.log(`Access: ${summary.runtime_contract.access_model}`);
  console.log(`Idempotency ref: ${summary.idempotency.key_ref}`);
  console.log(`Decision: ${summary.decision_receipt.decision}`);
  console.log(`Receipt: ${summary.decision_receipt.receipt_id}`);
  console.log(`Trace: ${summary.decision_receipt.trace_ref}`);
  console.log(`Transaction: ${summary.decision_receipt.transaction_ref}`);
  console.log(`Boundary: ${summary.decision_receipt.relay_boundary}`);
  console.log(`Payload: ${summary.boundary.payload_posture}`);
  console.log(`Execution: ${summary.boundary.downstream_execution}`);
}
