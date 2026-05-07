#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const exampleDir = dirname(fileURLToPath(import.meta.url));
const actionCard = JSON.parse(
  await readFile(join(exampleDir, "action-cards", "customer-reply.json"), "utf8"),
);

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const NEURA_RELAY_MCP_ACCESS_TOKEN = process.env.NEURA_RELAY_MCP_ACCESS_TOKEN;
const NEURA_RELAY_MCP_URL =
  process.env.NEURA_RELAY_MCP_URL ?? "https://www.neurarelay.com/mcp";
const autoApprove = process.env.OPENAI_AUTO_APPROVE_MCP === "true";

if (!OPENAI_API_KEY || !NEURA_RELAY_MCP_ACCESS_TOKEN) {
  console.error(
    "Set OPENAI_API_KEY and NEURA_RELAY_MCP_ACCESS_TOKEN to verify the OpenAI remote MCP path.",
  );
  process.exit(1);
}

async function createResponse(body) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${OPENAI_API_KEY}`,
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

function findOutput(payload, type) {
  return payload.output?.find?.((item) => item.type === type) ?? null;
}

function summarizeCall(call) {
  let output = call?.output;

  try {
    output = typeof output === "string" ? JSON.parse(output) : output;
  } catch {
    // Keep raw output if the provider returns a non-JSON string.
  }

  return {
    type: call?.type,
    name: call?.name,
    server_label: call?.server_label,
    error: call?.error ?? null,
    ok: output?.ok ?? null,
    receipt_id: output?.decision_receipt?.receipt_id ?? output?.receipt_id ?? null,
    trace_ref: output?.trace?.trace_ref ?? output?.trace_ref ?? null,
    transaction_ref:
      output?.transaction?.transaction_ref ?? output?.transaction_ref ?? null,
    private_payload_returned: output?.private_payload_returned ?? null,
    downstream_execution_performed:
      output?.downstream_execution_performed ?? null,
  };
}

const firstResponse = await createResponse({
  model: process.env.OPENAI_MODEL ?? "gpt-5",
  tools: [
    {
      type: "mcp",
      server_label: "neura_relay",
      server_description:
        "Neura Relay validates and resolves proposed Action Cards before downstream execution.",
      server_url: NEURA_RELAY_MCP_URL,
      authorization: NEURA_RELAY_MCP_ACCESS_TOKEN,
      require_approval: "always",
      allowed_tools: ["validate_action_card", "resolve_action_card"],
    },
  ],
  input: [
    {
      role: "user",
      content: [
        {
          type: "input_text",
          text:
            "Use Neura Relay to validate this Action Card before any downstream execution. " +
            JSON.stringify(actionCard),
        },
      ],
    },
  ],
});

const listTools = findOutput(firstResponse, "mcp_list_tools");
const approvalRequest = findOutput(firstResponse, "mcp_approval_request");
const firstCall = findOutput(firstResponse, "mcp_call");

if (!autoApprove || !approvalRequest) {
  console.log(
    JSON.stringify(
      {
        ok: Boolean(listTools || firstCall),
        stage: approvalRequest ? "approval_required" : "listed_or_called",
        response_id: firstResponse.id,
        mcp_tools_listed: listTools?.tools?.map?.((tool) => tool.name) ?? null,
        approval_request: approvalRequest
          ? {
              id: approvalRequest.id,
              name: approvalRequest.name,
              server_label: approvalRequest.server_label,
            }
          : null,
        mcp_call: firstCall ? summarizeCall(firstCall) : null,
        next_step: approvalRequest
          ? "Set OPENAI_AUTO_APPROVE_MCP=true to approve the Neura MCP tool call in this example."
          : "Inspect the response output for mcp_list_tools or mcp_call details.",
      },
      null,
      2,
    ),
  );
  process.exit(listTools || firstCall ? 0 : 1);
}

const approvedResponse = await createResponse({
  model: process.env.OPENAI_MODEL ?? "gpt-5",
  previous_response_id: firstResponse.id,
  tools: [
    {
      type: "mcp",
      server_label: "neura_relay",
      server_description:
        "Neura Relay validates and resolves proposed Action Cards before downstream execution.",
      server_url: NEURA_RELAY_MCP_URL,
      authorization: NEURA_RELAY_MCP_ACCESS_TOKEN,
      require_approval: "always",
      allowed_tools: ["validate_action_card", "resolve_action_card"],
    },
  ],
  input: [
    {
      type: "mcp_approval_response",
      approve: true,
      approval_request_id: approvalRequest.id,
    },
  ],
});

const approvedCall = findOutput(approvedResponse, "mcp_call");

console.log(
  JSON.stringify(
    {
      ok: Boolean(approvedCall && !approvedCall.error),
      stage: "approved_call_complete",
      response_id: approvedResponse.id,
      mcp_call: summarizeCall(approvedCall),
    },
    null,
    2,
  ),
);

if (!approvedCall || approvedCall.error) {
  process.exit(1);
}
