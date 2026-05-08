#!/usr/bin/env python3
"""
Google ADK remote MCP template for Neura Relay.

Status: source-aligned template, not live-verified in this repo.

Use this when a Google ADK agent needs to call Neura Relay's protected
Streamable HTTP MCP endpoint before a downstream tool action becomes real.

Required at runtime:
- Google ADK installed in the agent project
- a Google model/API configuration for the ADK agent
- NEURA_RELAY_MCP_ACCESS_TOKEN issued by Neura

Neura boundary:
- Action Card in
- Decision Receipt, transaction ref, trace ref, and Registry context out
- developer-owned app keeps downstream execution
- no public MCP token issuance
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


def neura_mcp_connection_params():
    """Return Google ADK Streamable HTTP params for Neura's protected MCP endpoint."""

    if not NEURA_RELAY_MCP_ACCESS_TOKEN:
        raise RuntimeError(
            "Set NEURA_RELAY_MCP_ACCESS_TOKEN before building the Neura ADK MCP toolset."
        )

    from google.adk.tools.mcp_tool.mcp_session_manager import (
        StreamableHTTPConnectionParams,
    )

    return StreamableHTTPConnectionParams(
        url=NEURA_RELAY_MCP_URL,
        headers={"Authorization": f"Bearer {NEURA_RELAY_MCP_ACCESS_TOKEN}"},
    )


def build_neura_mcp_toolset():
    """Build an ADK McpToolset filtered to the five Neura MCP tools."""

    from google.adk.tools.mcp_tool import McpToolset

    return McpToolset(
        connection_params=neura_mcp_connection_params(),
        tool_filter=ALLOWED_NEURA_TOOLS,
    )


def build_root_agent():
    """Create a minimal ADK agent that can govern proposed actions through Neura."""

    from google.adk.agents import LlmAgent

    return LlmAgent(
        model=os.getenv("GOOGLE_ADK_MODEL", "gemini-flash-latest"),
        name="neura_governed_action_agent",
        instruction=(
            "Before a consequential tool action, create or validate an Action Card, "
            "call Neura Relay through MCP, and continue only from the Decision Receipt. "
            "Do not execute downstream actions inside Neura."
        ),
        tools=[build_neura_mcp_toolset()],
    )


# ADK projects commonly expose root_agent from agent.py.
# This template avoids importing ADK during static verification unless explicitly requested.
root_agent = build_root_agent() if os.getenv("NEURA_ADK_BUILD_ROOT_AGENT") == "true" else None


def print_source_aligned_config() -> None:
    print(
        json.dumps(
            {
                "status": "source_aligned_template",
                "provider": "google_adk",
                "mcp_transport": "streamable_http",
                "mcp_url": NEURA_RELAY_MCP_URL,
                "authorization_header": "Bearer ${NEURA_RELAY_MCP_ACCESS_TOKEN}",
                "allowed_tools": ALLOWED_NEURA_TOOLS,
                "live_verification": "pending_google_adk_runtime_and_neura_controlled_access",
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

    print(
        "This is a Google ADK source-aligned template. Run it inside a Google ADK "
        "project after setting NEURA_RELAY_MCP_ACCESS_TOKEN, then import root_agent "
        "or set NEURA_ADK_BUILD_ROOT_AGENT=true.",
        file=sys.stderr,
    )
    raise SystemExit(1)
