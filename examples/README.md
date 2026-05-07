# Neura Developer Examples

This folder has two lanes.

| Lane | Folder | Use when |
| --- | --- | --- |
| Core Relay | `core` | You want the public Neura path: send an Action Card to Relay and receive a Decision Receipt |
| Optional MCP | `mcp` | Your agent runtime can call MCP tools and Neura has issued controlled MCP access |

The core path is the default:

```text
Action Card -> Relay -> Decision Receipt -> trace
```

The MCP path is only an adapter:

```text
MCP runtime -> protected Neura MCP tool -> same Relay decision spine
```

## Structure

```text
examples/
  core/
    action-card.json
    action-card-high-risk.json
    action-cards/
      support-reply.json
      refund-exception.json
      data-export.json
      payment-release.json
    resolve-action-card.mjs
  mcp/
    action-cards/
      customer-reply.json
      crm-update.json
      refund-review.json
      deploy-change.json
      registry-ready-evidence-capture.json
      blocked-funds-transfer.json
    provider-runtime-paths.md
    direct-mcp-client.mjs
    openai-responses-remote-mcp.mjs
    anthropic-messages-mcp.mjs
    claude-code-neura.mcp.example.json
    agent-passport-authority-standing.example.json
```

`examples/mcp/action-cards` contains Action Cards used as inputs to MCP tool calls. It is not a separate protocol and it does not replace `examples/core`.

## Fast Checks

Run the public core path:

```bash
npm run example:relay
```

List and run the public Action Card examples:

```bash
npm run example:relay -- --list-examples
npm run example:relay -- --example=refund-exception
npm run example:relay -- --example=data-export
npm run example:relay -- --example=payment-release
```

Run the high-risk core example:

```bash
npm run example:relay -- --example=high-risk
```

Run the protected MCP proof sequence after Neura issues access:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

Neura returns governed proof before execution. Your system still owns the agent, private payloads, workflow, and final downstream action.
