# Neura Developer Examples

This folder has two lanes.

| Lane | Folder | Use when |
| --- | --- | --- |
| Core Relay | `core` | You want the public Neura path: send an Action Card to Relay and receive a Decision Receipt |
| Optional MCP | `mcp` | Your agent runtime can call MCP tools with a Workspace sandbox token or controlled production access |

The core path is the default:

```text
Action Card -> Relay -> Decision Receipt -> trace
```

The MCP path is only an adapter:

```text
MCP runtime -> protected Neura MCP tool -> same Relay decision spine
```

For MCP-capable runtimes, start here when you need a protected tool-call governance example rather than a standalone SDK. The examples show how to validate or resolve an Action Card before developer-owned execution.

## Structure

```text
examples/
  core/
    action-card.json
    action-card-high-risk.json
    action-cards/
      support-reply.json
      account-api-write.json
      refund-exception.json
      data-export.json
      payment-release.json
      workflow-state-change.json
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
    google-adk-remote-mcp.py
    microsoft-agent-framework-mcp.py
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
npm run example:relay -- --example=account-api-write
npm run example:relay -- --example=refund-exception
npm run example:relay -- --example=data-export
npm run example:relay -- --example=payment-release
npm run example:relay -- --example=workflow-state-change
```

Run the high-risk core example:

```bash
npm run example:relay -- --example=high-risk
```

Run the protected MCP proof sequence after copying a sandbox token from Relay Workspace or after Neura issues production/private access:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

Inspect the source-aligned Google ADK and Microsoft templates:

```bash
npm run example:google-adk-mcp
npm run example:microsoft-mcp
```

Neura returns governed proof before execution. Your system still owns the agent, private payloads, workflow, and final downstream action.

The demo Action Cards include a demo Agent Passport. Production agents need a Registry Agent Passport before Relay can validate identity, capability, version, and standing. Create the production Agent Passport at [Neura Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew).

## Production Path

```text
Run demo Action Card -> create Registry Agent Passport -> send production Action Card to Relay -> store Decision Receipt and trace ref
```

Registry is required for production identity. Relay uses the Agent Passport refs; Relay does not create or approve the Agent Passport.

For the end-to-end developer-owned agent flow, see [`../docs/developer-owned-agent-walkthrough.md`](../docs/developer-owned-agent-walkthrough.md).

## Feedback And Controlled Access

Open a first-receipt feedback issue after you run the public example and receive safe refs:

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=first-receipt-feedback.yml
```

Request controlled MCP access only after you have an MCP-capable runtime and a concrete governed-action use case:

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml
```

Use refs only. Do not share private payloads, customer data, secrets, API keys, or access tokens.

Read the controlled beta access operating path first:

```text
docs/controlled-mcp-beta-access.md
```
