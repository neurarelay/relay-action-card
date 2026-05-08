#!/usr/bin/env python3
"""
Microsoft Agent Framework / Foundry MCP template for Neura Relay.

Status: source-aligned template, not live-verified in this repo.

Use this when a Microsoft Agent Framework or Foundry-backed agent needs
to connect to Neura Relay as a remote MCP server before downstream execution.

Required at runtime:
- Microsoft Agent Framework / Foundry project dependencies
- model/provider credentials for the chosen Microsoft agent runtime
- NEURA_RELAY_MCP_ACCESS_TOKEN issued by Neura

Neura boundary:
- Relay returns Decision Receipts and refs
- Relay does not execute downstream actions
- Registry identity remains separate
- controlled MCP access is not public self-serve token issuance
"""

from __future__ import annotations

import json
import os
import sys
from typing import Final, Optional

NEURA_RELAY_MCP_URL: Final[str] = os.getenv(
    "NEURA_RELAY_MCP_URL",
    "https://www.neurarelay.com/mcp",
)
NEURA_RELAY_MCP_ACCESS_TOKEN: Final[Optional[str]] = os.getenv(
    "NEURA_RELAY_MCP_ACCESS_TOKEN",
)

ALLOWED_NEURA_TOOLS: Final[list[str]] = [
    "validate_action_card",
    "resolve_action_card",
    "get_decision_receipt",
    "get_trace_replay",
    "lookup_agent_passport",
]


def neura_mcp_headers() -> dict[str, str]:
    """Return authenticated headers for Microsoft Agent Framework MCP calls."""

    if not NEURA_RELAY_MCP_ACCESS_TOKEN:
        raise RuntimeError("Set NEURA_RELAY_MCP_ACCESS_TOKEN before connecting to Neura MCP.")

    return {"Authorization": f"Bearer {NEURA_RELAY_MCP_ACCESS_TOKEN}"}


async def run_agent_framework_template(prompt: str) -> str:
    """
    Minimal Microsoft Agent Framework shape using MCPStreamableHTTPTool.

    Run this only inside an Agent Framework project with the selected chat client
    configured. The default prompt asks the agent to govern a proposed action with
    Neura before execution.
    """

    from agent_framework import ChatAgent, MCPStreamableHTTPTool
    from agent_framework.openai import OpenAIChatClient

    async with (
        MCPStreamableHTTPTool(
            name="Neura Relay MCP",
            url=NEURA_RELAY_MCP_URL,
            headers=neura_mcp_headers(),
            allowed_tools=ALLOWED_NEURA_TOOLS,
            approval_mode="always_require",
            description=(
                "Validate and resolve Action Cards through Neura Relay before "
                "downstream execution. Use only the five approved Neura MCP tools."
            ),
        ) as neura_mcp,
        ChatAgent(
            chat_client=OpenAIChatClient(),
            name="NeuraGovernedActionAgent",
            instructions=(
                "Use Neura Relay MCP to validate or resolve proposed Action Cards. "
                "Only summarize Decision Receipt, transaction, trace, and Registry refs. "
                "Do not execute downstream actions."
            ),
        ) as agent,
    ):
        result = await agent.run(prompt)
        return str(result)


def foundry_mcp_tool_definition_shape() -> dict:
    """
    Return the Foundry remote MCP tool shape to copy into a Foundry agent setup.

    Foundry Agent Service uses server_url, server_label, allowed_tools, and
    require_approval for remote MCP endpoints. Store real auth in a project
    connection rather than hard-coding secrets.
    """

    return {
        "type": "mcp",
        "server_label": "neura_relay",
        "server_url": NEURA_RELAY_MCP_URL,
        "allowed_tools": ALLOWED_NEURA_TOOLS,
        "require_approval": "always",
        "project_connection_id": "store_neura_mcp_token_in_foundry_connection",
    }


def print_source_aligned_config() -> None:
    print(
        json.dumps(
            {
                "status": "source_aligned_template",
                "provider": "microsoft_agent_framework_foundry",
                "agent_framework_tool": "MCPStreamableHTTPTool",
                "agent_framework_auth": {
                    "headers": "Authorization: Bearer ${NEURA_RELAY_MCP_ACCESS_TOKEN}",
                    "allowed_tools": ALLOWED_NEURA_TOOLS,
                    "approval_mode": "always_require",
                },
                "foundry_tool_shape": foundry_mcp_tool_definition_shape(),
                "authorization": "environment_header_or_foundry_project_connection",
                "live_verification": "pending_microsoft_agent_runtime_and_neura_controlled_access",
                "neura_boundary": {
                    "core_path": "Action Card -> Relay -> Decision Receipt -> trace/ledger/Registry context",
                    "mcp_role": "optional_adapter_not_core_dependency",
                    "downstream_execution_by_neura": False,
                    "public_token_issuance": False,
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    if "--print-config" in sys.argv:
        print_source_aligned_config()
        raise SystemExit(0)

    prompt = (
        "Validate this proposed Action Card with Neura Relay before any downstream "
        "execution, then summarize only safe Decision Receipt and trace refs."
    )
    import asyncio

    print(asyncio.run(run_agent_framework_template(prompt)))
