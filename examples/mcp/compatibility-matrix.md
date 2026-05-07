# Neura MCP Compatibility Matrix

Status: MCP Provider Example Pack v0.3

Neura is protocol-first. MCP is an optional adapter for MCP-capable runtimes that need to route proposed actions through Relay before downstream execution.

| Surface | Status | What is verified |
| --- | --- | --- |
| Neura Relay MCP server | Production verified | Protected `/mcp`, initialize, `tools/list`, `tools/call`, auth rejection, validation, resolution, receipt lookup, trace replay, Agent Passport lookup with `authority_standing`, no private payload leakage |
| Direct MCP JSON-RPC client | Live verified | `examples/mcp/direct-mcp-client.mjs` covers all five Neura MCP tools and can run a proof sequence through resolve, receipt lookup, trace replay, and Agent Passport lookup |
| OpenAI Responses remote MCP | Source-aligned template prepared | `examples/mcp/openai-responses-remote-mcp.mjs` follows the OpenAI remote MCP shape with `server_url`, `authorization`, all five `allowed_tools`, approval request handling, and optional approval response; live OpenAI client verification is pending until `OPENAI_API_KEY` is available |
| Anthropic Claude Messages MCP | Source-aligned template prepared | `examples/mcp/anthropic-messages-mcp.mjs` follows the Claude Messages MCP connector shape with `mcp_servers`, `authorization_token`, `mcp_toolset`, five enabled Neura tool configs, and `mcp-client-2025-11-20`; live Claude client verification is pending until `ANTHROPIC_API_KEY` is available |
| Claude Code remote HTTP MCP | Config template prepared | `examples/mcp/claude-code-neura.mcp.example.json` follows the Claude Code HTTP MCP configuration shape with bearer-token header; live Claude Code verification depends on local client setup |
| Google ADK MCP | Planned | Pending a verified Google ADK example |
| Microsoft Agent Framework / Foundry MCP | Planned | Pending a verified Microsoft example |
| A2A discoverability | Separate later story | Not part of MCP Provider Example Pack v0.3 |

## Claim Boundary

- Do claim: Neura Relay has a production-verified protected MCP-compatible tool surface.
- Do claim: MCP-capable runtimes can route Action Cards to Neura before downstream execution when they have controlled access.
- Do claim: Neura returns a Decision Receipt, trace replay refs, Registry status, and safe authority-standing context without downstream execution.
- Do not claim: public token issuance, official ecosystem partnership, broad compatibility with every MCP client, packaged SDK, hosted agents, or downstream execution.

## Verification Notes

- OpenAI Responses remote MCP source alignment checked against the official OpenAI MCP and connectors guide.
- Claude Messages MCP source alignment checked against the official Anthropic MCP connector guide.
- Claude Code remote HTTP MCP source alignment checked against the official Claude Code MCP guide.
- Google ADK and Microsoft Agent Framework were researched for later rollout, but runnable examples are intentionally not included in v0.3.
- The current repository can verify direct Neura MCP JSON-RPC calls when `NEURA_RELAY_MCP_ACCESS_TOKEN` is present.
- Live OpenAI or Claude client verification requires provider credentials and controlled Neura MCP access in the local verification environment.
