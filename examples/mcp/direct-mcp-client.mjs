#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(exampleDir, "../..");
const defaultActionCardPath = join(
  exampleDir,
  "action-cards",
  "customer-reply.json",
);
const defaultProofActionCardPath = join(
  exampleDir,
  "action-cards",
  "registry-ready-evidence-capture.json",
);

const PROTOCOL_VERSION =
  process.env.NEURA_RELAY_MCP_PROTOCOL_VERSION ?? "2025-11-25";
const MCP_URL =
  process.env.NEURA_RELAY_MCP_URL ??
  new URL("/mcp", process.env.RELAY_BASE_URL ?? "https://www.neurarelay.com")
    .toString();
const TOKEN = process.env.NEURA_RELAY_MCP_ACCESS_TOKEN;

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const jsonOutput = process.argv.includes("--json");
const listToolsOnly = process.argv.includes("--list-tools");
const proofSequence =
  process.argv.includes("--proof") || process.argv.includes("--spine-proof");
const requestedTool = argValue("tool") ?? "resolve_action_card";
const providedActionCardPath = argValue("action-card");
const actionCardPath = resolve(
  repoRoot,
  providedActionCardPath ??
    (proofSequence ? defaultProofActionCardPath : defaultActionCardPath),
);

function relativePath(path) {
  return path.startsWith(`${repoRoot}/`) ? path.slice(repoRoot.length + 1) : path;
}

function print(value) {
  if (jsonOutput) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    for (const [key, item] of Object.entries(value)) {
      const rendered = Array.isArray(item) ? item.join(", ") : item;
      console.log(`${key}: ${rendered}`);
    }
  }
}

function requireToken() {
  if (!TOKEN) {
    console.error(
      "Missing NEURA_RELAY_MCP_ACCESS_TOKEN. The public GitHub path is /api/resolve; protected MCP access is controlled beta.",
    );
    process.exit(1);
  }
}

function compactReceipt(payload) {
  const receipt = payload.decision_receipt ?? payload.receipt ?? {};
  const transaction = payload.transaction ?? {};
  const trace = payload.trace ?? {};

  return {
    ok: payload.ok,
    decision: receipt.decision ?? null,
    receipt_id: receipt.receipt_id ?? null,
    transaction_ref:
      transaction.transaction_ref ?? receipt.transaction_ref ?? null,
    trace_ref: trace.trace_ref ?? receipt.trace_ref ?? null,
    relay_boundary: receipt.relay_boundary ?? payload.relay_boundary ?? null,
    private_payload_returned: payload.private_payload_returned ?? false,
    downstream_execution_performed:
      payload.downstream_execution_performed ?? false,
  };
}

function compactPassport(payload) {
  const passport = payload.agent_passport ?? {};
  const readiness = passport.readiness ?? {};
  const authority = payload.authority_standing ?? {};
  const ownerAuthority = authority.owner_authority ?? {};
  const scope = authority.authority_scope ?? {};
  const standingAudit = authority.standing_audit ?? {};
  const relayReferenceGate = authority.relay_reference_gate ?? {};

  return {
    ok: payload.ok,
    participant_ref: passport.participant_ref ?? null,
    display_name: passport.display_name ?? null,
    owner_ref: passport.owner_ref ?? null,
    capability_version_ref: passport.capability_version_ref ?? null,
    relay_reference_status: readiness.relay_reference_status ?? null,
    authority_reference_status: authority.authority_reference_status ?? null,
    human_authority_mode: ownerAuthority.human_authority_mode ?? null,
    permitted_action_classes: scope.permitted_action_classes ?? [],
    prohibited_action_classes: scope.prohibited_action_classes ?? [],
    external_submission: scope.environment_posture?.external_submission ?? null,
    downstream_execution: scope.environment_posture?.downstream_execution ?? null,
    standing_status: standingAudit.standing_status ?? null,
    total_audit_event_count: standingAudit.total_audit_event_count ?? null,
    registry_standing_is_not_relay_acceptance:
      standingAudit.registry_standing_is_not_relay_acceptance ?? null,
    relay_reference_gate: relayReferenceGate.status ?? null,
    boundaries: authority.boundaries ?? null,
  };
}

function compactTrace(payload) {
  const replay = payload.replay ?? {};

  return {
    ok: payload.ok,
    trace_ref: replay.trace_ref ?? null,
    event_count: replay.event_count ?? null,
    payload_redaction: replay.payload_redaction ?? null,
    private_payload_stored: replay.private_payload_stored ?? null,
  };
}

let rpcId = 1;

async function mcpRequest(body, initialized = true) {
  const headers = {
    accept: "application/json, text/event-stream",
    "content-type": "application/json",
    authorization: `Bearer ${TOKEN}`,
  };

  if (initialized) {
    headers["mcp-protocol-version"] = PROTOCOL_VERSION;
  }

  const response = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (response.status === 202) return { status: 202, payload: null };

  const text = await response.text();
  const payload = text ? JSON.parse(text) : null;

  if (!response.ok || payload?.error) {
    throw new Error(
      JSON.stringify(
        {
          status: response.status,
          error: payload?.error ?? payload,
        },
        null,
        2,
      ),
    );
  }

  return { status: response.status, payload };
}

function toolPayload(response) {
  const result = response?.payload?.result ?? {};
  const structuredContent = result.structuredContent;

  if (structuredContent && typeof structuredContent === "object") {
    return structuredContent;
  }

  const text = result.content?.find?.((item) => item.type === "text")?.text;
  return text ? JSON.parse(text) : {};
}

async function initialize() {
  await mcpRequest(
    {
      jsonrpc: "2.0",
      id: rpcId++,
      method: "initialize",
      params: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {},
        clientInfo: {
          name: "relay-action-card-mcp-example",
          version: "0.2.0",
        },
      },
    },
    false,
  );

  await mcpRequest({
    jsonrpc: "2.0",
    method: "notifications/initialized",
  });
}

async function callTool(name, args) {
  const response = await mcpRequest({
    jsonrpc: "2.0",
    id: rpcId++,
    method: "tools/call",
    params: {
      name,
      arguments: args,
    },
  });

  return toolPayload(response);
}

function passportArgs(actionCard) {
  return {
    agent_ref: argValue("agent-ref") ?? actionCard.agent?.id,
    capability_version_ref:
      argValue("capability-version-ref") ?? actionCard.agent?.capabilityVersion,
  };
}

function toolArgs(name, actionCard) {
  if (name === "validate_action_card" || name === "resolve_action_card") {
    return { action_card: actionCard };
  }

  if (name === "get_decision_receipt") {
    return {
      decision_receipt_id:
        argValue("decision-receipt-id") ?? argValue("receipt-id") ?? undefined,
      transaction_ref: argValue("transaction-ref") ?? undefined,
    };
  }

  if (name === "get_trace_replay") {
    return {
      trace_ref: argValue("trace-ref") ?? undefined,
    };
  }

  if (name === "lookup_agent_passport") {
    return passportArgs(actionCard);
  }

  return {};
}

async function runProofSequence(actionCard) {
  const resolved = await callTool("resolve_action_card", { action_card: actionCard });
  const receiptSummary = compactReceipt(resolved);
  const receipt = await callTool("get_decision_receipt", {
    decision_receipt_id: receiptSummary.receipt_id,
    transaction_ref: receiptSummary.transaction_ref,
  });
  const replay = await callTool("get_trace_replay", {
    trace_ref: receiptSummary.trace_ref,
  });
  const passport = await callTool("lookup_agent_passport", passportArgs(actionCard));
  const passportSummary = compactPassport(passport);

  return {
    mcp_server: MCP_URL,
    proof: "mcp_runtime_to_same_relay_spine",
    action_card_path: relativePath(actionCardPath),
    ok:
      resolved.ok === true &&
      receipt.ok === true &&
      replay.ok === true &&
      passport.ok === true,
    resolve_action_card: receiptSummary,
    get_decision_receipt: compactReceipt(receipt),
    get_trace_replay: compactTrace(replay),
    lookup_agent_passport: passportSummary,
    private_payload_returned: false,
    downstream_execution_performed: false,
    core_path_preserved:
      "Action Card -> Relay -> Decision Receipt -> trace/ledger/Registry context",
    mcp_role: "optional_adapter_not_core_dependency",
  };
}

requireToken();

const actionCard = JSON.parse(await readFile(actionCardPath, "utf8"));

await initialize();

const toolsList = await mcpRequest({
  jsonrpc: "2.0",
  id: rpcId++,
  method: "tools/list",
});
const tools = toolsList.payload.result.tools.map((tool) => tool.name);

if (listToolsOnly) {
  print({
    mcp_server: MCP_URL,
    tools,
  });
  process.exit(0);
}

if (proofSequence) {
  print(await runProofSequence(actionCard));
  process.exit(0);
}

if (!tools.includes(requestedTool)) {
  throw new Error(`Unknown MCP tool requested: ${requestedTool}`);
}

const payload = await callTool(requestedTool, toolArgs(requestedTool, actionCard));

if (requestedTool === "validate_action_card") {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    action_card_path: relativePath(actionCardPath),
    ok: payload.ok,
    validation_status: payload.validation?.status,
    action_type: payload.normalized_action_card?.action_type,
    evidence_ref_count: payload.normalized_action_card?.evidence_ref_count,
    downstream_execution_performed: "false",
  });
} else if (requestedTool === "resolve_action_card") {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    action_card_path: relativePath(actionCardPath),
    ...compactReceipt(payload),
  });
} else if (requestedTool === "get_decision_receipt") {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    ...compactReceipt(payload),
  });
} else if (requestedTool === "get_trace_replay") {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    ...compactTrace(payload),
  });
} else if (requestedTool === "lookup_agent_passport") {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    action_card_path: relativePath(actionCardPath),
    ...compactPassport(payload),
    private_payload_returned: false,
    downstream_execution_performed: false,
  });
} else {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    ok: payload.ok,
  });
}
