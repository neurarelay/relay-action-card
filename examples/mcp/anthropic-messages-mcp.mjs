#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const actionCard = JSON.parse(
  await readFile(join(exampleDir, "action-cards", "customer-reply.json"), "utf8"),
);

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const NEURA_RELAY_MCP_ACCESS_TOKEN = process.env.NEURA_RELAY_MCP_ACCESS_TOKEN;
const NEURA_RELAY_MCP_URL =
  process.env.NEURA_RELAY_MCP_URL ?? "https://www.neurarelay.com/mcp";
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-opus-4-7";
const ANTHROPIC_MCP_BETA =
  process.env.ANTHROPIC_MCP_BETA ?? "mcp-client-2025-11-20";

if (!ANTHROPIC_API_KEY || !NEURA_RELAY_MCP_ACCESS_TOKEN) {
  console.error(
    "Set ANTHROPIC_API_KEY and NEURA_RELAY_MCP_ACCESS_TOKEN to verify the Claude Messages MCP path.",
  );
  process.exit(1);
}

async function createMessage(body) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": ANTHROPIC_MCP_BETA,
    },
    body: JSON.stringify(body),
  });

  const payload = await response.json();

  if (!response.ok) {
    console.error(JSON.stringify(payload, null, 2));
    process.exit(1);
  }

  return payload;
}

function summarizeContent(content = []) {
  const toolUses = content
    .filter((item) => item.type === "mcp_tool_use")
    .map((item) => ({
      id: item.id,
      name: item.name,
      server_name: item.server_name,
      input_keys: item.input ? Object.keys(item.input) : [],
    }));

  const toolResults = content
    .filter((item) => item.type === "mcp_tool_result")
    .map((item) => {
      const text = item.content?.find?.((part) => part.type === "text")?.text;
      let parsed = null;

      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = null;
      }

      return {
        tool_use_id: item.tool_use_id,
        is_error: item.is_error ?? false,
        ok: parsed?.ok ?? null,
        decision:
          parsed?.decision_receipt?.decision ?? parsed?.decision ?? null,
        receipt_id:
          parsed?.decision_receipt?.receipt_id ?? parsed?.receipt_id ?? null,
        trace_ref: parsed?.trace?.trace_ref ?? parsed?.trace_ref ?? null,
        private_payload_returned: parsed?.private_payload_returned ?? null,
        downstream_execution_performed:
          parsed?.downstream_execution_performed ?? null,
      };
    });

  return { tool_uses: toolUses, tool_results: toolResults };
}

const response = await createMessage({
  model: ANTHROPIC_MODEL,
  max_tokens: 1200,
  messages: [
    {
      role: "user",
      content:
        "Use Neura Relay to validate this Action Card before any downstream execution. " +
        "If the Action Card is valid, resolve it and summarize only the safe receipt, trace, and transaction refs. " +
        JSON.stringify(actionCard),
    },
  ],
  mcp_servers: [
    {
      type: "url",
      url: NEURA_RELAY_MCP_URL,
      name: "neura-relay",
      authorization_token: NEURA_RELAY_MCP_ACCESS_TOKEN,
    },
  ],
  tools: [
    {
      type: "mcp_toolset",
      mcp_server_name: "neura-relay",
      default_config: {
        enabled: false,
      },
      configs: {
        validate_action_card: { enabled: true },
        resolve_action_card: { enabled: true },
        get_decision_receipt: { enabled: true },
        get_trace_replay: { enabled: true },
        lookup_agent_passport: { enabled: true },
      },
    },
  ],
});

const summary = summarizeContent(response.content);

console.log(
  JSON.stringify(
    {
      ok: summary.tool_uses.length > 0 || summary.tool_results.length > 0,
      response_id: response.id,
      model: response.model,
      stop_reason: response.stop_reason,
      ...summary,
      boundary: {
        neura_mcp_access: "controlled",
        downstream_execution_performed_by_neura: false,
      },
    },
    null,
    2,
  ),
);

if (summary.tool_uses.length === 0 && summary.tool_results.length === 0) {
  process.exit(1);
}
