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

if (!OPENAI_API_KEY || !NEURA_RELAY_MCP_ACCESS_TOKEN) {
  console.error(
    "Set OPENAI_API_KEY and NEURA_RELAY_MCP_ACCESS_TOKEN to run this template.",
  );
  process.exit(1);
}

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${OPENAI_API_KEY}`,
  },
  body: JSON.stringify({
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
              "Validate this Action Card with Neura Relay before any downstream execution. " +
              JSON.stringify(actionCard),
          },
        ],
      },
    ],
  }),
});

const payload = await response.json();

if (!response.ok) {
  console.error(JSON.stringify(payload, null, 2));
  process.exit(1);
}

console.log(JSON.stringify(payload, null, 2));
