# Neura MCP Provider Runtime Paths

Status: MCP Provider Example Pack v0.4

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
| Claude Messages MCP connector | `anthropic-messages-mcp.mjs` | Your agent already uses Claude Messages and can connect to remote MCP servers | Private live proof passed on May 9 with a project Anthropic API key and controlled Relay sandbox token; sanitized request dry run remains available |
| Claude Code remote HTTP MCP | `claude-code-neura.mcp.example.json` | Your coding-agent runtime reads MCP server config and should call Neura before consequential actions | Private live proof passed on May 9 with local Claude Code and a controlled Relay sandbox token; config template remains available for developer setup |
| Google ADK remote MCP | `google-adk-remote-mcp.py` | Your agent already uses Google ADK and can attach a remote MCP toolset | Source-aligned template; live Google ADK verification requires an ADK runtime, model credentials, and controlled Neura MCP access |
| Microsoft Agent Framework / Foundry MCP | `microsoft-agent-framework-mcp.py` | Your agent runs in Microsoft Agent Framework or Foundry and can use remote MCP tools | Source-aligned template; live Microsoft verification requires an agent runtime or Foundry project connection and controlled Neura MCP access |

## What Developers Get

- one governed decision gate before downstream action
- one Action Card shape across direct and MCP paths
- Decision Receipt, transaction ref, and trace ref
- Agent Passport lookup with safe authority-standing context
- no private payload return from Neura
- no downstream execution by Neura

## Provider Notes

OpenAI Responses remote MCP uses a `type: "mcp"` tool with `server_url`, `authorization`, `allowed_tools`, and explicit approval handling.

Claude Messages MCP uses `mcp_servers`, `authorization_token`, and a `tools` entry of `type: "mcp_toolset"` with only the five Neura tools enabled. Run `npm run example:anthropic-mcp-request` to inspect the exact request shape without exposing secrets.

Google ADK remote MCP uses `McpToolset` with Streamable HTTP connection params, an Authorization header, and a Neura tool filter. The template is source-aligned but not live-verified without a Google ADK runtime and model credentials.

Microsoft Agent Framework uses `MCPStreamableHTTPTool` for remote MCP endpoints with `headers`, `allowed_tools`, and `approval_mode` set on the tool. Foundry Agent Service uses a remote MCP tool definition with `server_url`, `server_label`, `allowed_tools`, and approval posture. The template is source-aligned but not live-verified without a Microsoft agent runtime or Foundry project connection.

A2A discoverability is a separate later story. It is not part of this MCP example pack.

## Claim Boundary

Do claim: Neura has a production-verified protected MCP-compatible Relay surface, private live Claude Messages API proof, private live Claude Code HTTP MCP proof, and source-aligned provider templates for OpenAI Responses, Google ADK, and Microsoft Agent Framework / Foundry.

Do not claim: public MCP token issuance, packaged SDK, official Anthropic listing or provider partnership, downstream execution, broad compatibility with every MCP client, live Google ADK verification, live Microsoft Agent Framework / Foundry verification, or A2A discoverability.
