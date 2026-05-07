# Neura MCP Provider Runtime Paths

Status: MCP Provider Example Pack v0.3

Neura stays protocol-first. The direct public path remains:

```text
Action Card -> Relay -> Decision Receipt -> developer-owned execution
```

MCP is an optional protected adapter for runtimes that already support MCP tools.

## Start With These Paths

| Developer path | File | Use when | Verification status |
| --- | --- | --- | --- |
| Direct Neura MCP client | `direct-mcp-client.mjs` | You want to prove the five protected Neura MCP tools without another provider in the loop | Live verified with `NEURA_RELAY_MCP_ACCESS_TOKEN` |
| OpenAI Responses remote MCP | `openai-responses-remote-mcp.mjs` | Your agent already uses the Responses API and can attach remote MCP tools | Source-aligned template; live OpenAI verification requires `OPENAI_API_KEY` |
| Claude Messages MCP connector | `anthropic-messages-mcp.mjs` | Your agent already uses Claude Messages and can connect to remote MCP servers | Source-aligned template; live Claude verification requires `ANTHROPIC_API_KEY` |
| Claude Code remote HTTP MCP | `claude-code-neura.mcp.example.json` | Your coding-agent runtime reads MCP server config and should call Neura before consequential actions | Config template; live client verification depends on local Claude Code setup |

## What Developers Get

- one governed decision gate before downstream action
- one Action Card shape across direct and MCP paths
- Decision Receipt, transaction ref, and trace ref
- Agent Passport lookup with safe authority-standing context
- no private payload return from Neura
- no downstream execution by Neura

## Provider Notes

OpenAI Responses remote MCP uses a `type: "mcp"` tool with `server_url`, `authorization`, `allowed_tools`, and explicit approval handling.

Claude Messages MCP uses `mcp_servers`, `authorization_token`, and a `tools` entry of `type: "mcp_toolset"` with only the five Neura tools enabled.

Google ADK is not included as runnable code in v0.3. The source-aligned pattern is ADK `McpToolset` with Streamable HTTP connection params and an Authorization header, but it should wait until the rollout targets Google ADK developers directly.

Microsoft Agent Framework is not included as runnable code in v0.3. The source-aligned pattern is `MCPStreamableHTTPTool` for remote MCP endpoints, with authenticated endpoint headers supplied at runtime. It should wait until the rollout targets Microsoft/Azure agent developers directly.

A2A discoverability is a separate later story. It is not part of this MCP example pack.

## Claim Boundary

Do claim: Neura has a production-verified protected MCP-compatible Relay surface and source-aligned provider templates for OpenAI Responses and Claude Messages.

Do not claim: public MCP token issuance, packaged SDK, official provider partnership, downstream execution, broad compatibility with every MCP client, Google ADK support, Microsoft Agent Framework support, or A2A discoverability.
