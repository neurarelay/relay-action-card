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
const requestedTool = argValue("tool") ?? "resolve_action_card";
const actionCardPath = resolve(
  repoRoot,
  argValue("action-card") ?? defaultActionCardPath,
);

function print(value) {
  if (jsonOutput) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    for (const [key, item] of Object.entries(value)) {
      console.log(`${key}: ${item}`);
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
          version: "0.1.0",
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
    tools: tools.join(", "),
  });
  process.exit(0);
}

if (!tools.includes(requestedTool)) {
  throw new Error(`Unknown MCP tool requested: ${requestedTool}`);
}

const payload = await callTool(requestedTool, { action_card: actionCard });

if (requestedTool === "validate_action_card") {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    ok: payload.ok,
    validation_status: payload.validation?.status,
    action_type: payload.normalized_action_card?.action_type,
    evidence_ref_count: payload.normalized_action_card?.evidence_ref_count,
    downstream_execution_performed: "false",
  });
} else if (requestedTool === "resolve_action_card") {
  const receiptId = payload.decision_receipt?.receipt_id;
  const traceRef = payload.trace?.trace_ref;
  const transactionRef = payload.transaction?.transaction_ref;

  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    ok: payload.ok,
    decision: payload.decision_receipt?.decision,
    receipt_id: receiptId,
    transaction_ref: transactionRef,
    trace_ref: traceRef,
    private_payload_returned: payload.private_payload_returned,
    downstream_execution_performed: payload.downstream_execution_performed,
    relay_boundary: payload.decision_receipt?.relay_boundary,
  });
} else {
  print({
    mcp_server: MCP_URL,
    tool: requestedTool,
    ok: payload.ok,
  });
}
