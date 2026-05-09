# Neura MCP Compatibility Matrix

Status: MCP Provider Example Pack v0.4

Neura is protocol-first. MCP is an optional adapter for MCP-capable runtimes that need to route proposed actions through Relay before downstream execution.

| Surface | Status | What is verified |
| --- | --- | --- |
| Neura Relay MCP server | Production verified | Protected `/mcp`, initialize, `tools/list`, `tools/call`, auth rejection, validation, resolution, receipt lookup, trace replay, Agent Passport lookup with `authority_standing`, no private payload leakage |
| Direct MCP JSON-RPC client | Live verified | `examples/mcp/direct-mcp-client.mjs` covers all five Neura MCP tools and can run a proof sequence through resolve, receipt lookup, trace replay, and Agent Passport lookup |
| OpenAI Responses remote MCP | Source-aligned template prepared | `examples/mcp/openai-responses-remote-mcp.mjs` follows the OpenAI remote MCP shape with `server_url`, `authorization`, all five `allowed_tools`, approval request handling, and optional approval response; live OpenAI client verification is pending until `OPENAI_API_KEY` is available |
| Anthropic Claude Messages MCP | Private live provider proof passed | `examples/mcp/anthropic-messages-mcp.mjs` follows the Claude Messages MCP connector shape with `mcp_servers`, `authorization_token`, `mcp_toolset`, five enabled Neura tool configs, and `mcp-client-2025-11-20`; `npm run example:anthropic-mcp-request` prints a sanitized request for review; May 9 live proof used a project Anthropic API key and controlled Relay sandbox token to return a Decision Receipt plus trace ref with no private payload return and no downstream execution |
| Claude Code remote HTTP MCP | Private live client proof passed | `examples/mcp/claude-code-neura.mcp.example.json` follows the Claude Code HTTP MCP configuration shape with bearer-token header; May 9 live proof used local Claude Code and a controlled Relay sandbox token to return a Decision Receipt plus trace and transaction refs with no private payload return and no downstream execution |
| Google ADK MCP | Source-aligned template prepared | `examples/mcp/google-adk-remote-mcp.py` follows the Google ADK remote MCP shape with `McpToolset`, Streamable HTTP connection params, Authorization header, and a five-tool Neura allowlist; live Google ADK verification is pending until ADK runtime credentials and controlled Neura MCP access are available |
| Microsoft Agent Framework / Foundry MCP | Source-aligned template prepared | `examples/mcp/microsoft-agent-framework-mcp.py` follows Microsoft Agent Framework remote MCP with `MCPStreamableHTTPTool` and Foundry's remote MCP tool shape with `server_url`, `server_label`, `allowed_tools`, and approval posture; live Microsoft verification is pending until the agent runtime/project connection and controlled Neura MCP access are available |
| A2A discoverability | Separate later story | Not part of MCP Provider Example Pack v0.4 |

## Claim Boundary

- Do claim: Neura Relay has a production-verified protected MCP-compatible tool surface.
- Do claim: MCP-capable runtimes can route Action Cards to Neura before downstream execution when they have controlled access.
- Do claim: Neura returns a Decision Receipt, trace replay refs, Registry status, and safe authority-standing context without downstream execution.
- Do not claim: public token issuance, official Anthropic listing, official ecosystem partnership, broad compatibility with every MCP client, packaged SDK, hosted agents, or downstream execution.

## Verification Notes

- OpenAI Responses remote MCP source alignment checked against the official OpenAI MCP and connectors guide.
- Claude Messages MCP source alignment checked against the official Anthropic MCP connector guide.
- Claude Code remote HTTP MCP source alignment checked against the official Claude Code MCP guide.
- Google ADK remote MCP source alignment checked against the official Google ADK MCP tools guide.
- Microsoft Agent Framework / Foundry MCP source alignment checked against the official Microsoft Agent Framework and Foundry MCP guides.
- The current repository can verify direct Neura MCP JSON-RPC calls, auth rejection, exact tool listing, receipt lookup, trace replay, Agent Passport lookup, and blocked-action routing when `NEURA_RELAY_MCP_ACCESS_TOKEN` is present.
- Live OpenAI client verification still requires provider credentials and controlled Neura MCP access in the local verification environment. Claude Messages API and Claude Code HTTP MCP private live proofs passed on May 9. Neither proof creates an Anthropic listing, approval, partnership, public production MCP token issuance, or public API-key issuance.
