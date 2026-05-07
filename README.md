# Relay Action Card

Send an Action Card to Neura Relay. Get a governed Decision Receipt before execution.

This is the public developer starting point for Neura Relay. Your agent proposes an action, Relay evaluates identity, authority, evidence, policy, and risk, and your system receives a governed receipt before deciding what to execute.

## Start Here

There are two paths in this repo:

| Path | Folder | Access | Purpose |
| --- | --- | --- | --- |
| Core Relay example | `examples/core` | Public | Send an Action Card to `POST /api/resolve` and receive a Decision Receipt |
| Optional MCP examples | `examples/mcp` | Controlled access | Call the same Relay spine through protected MCP-compatible tools |

The core path is the default Neura path:

```text
Action Card -> Relay -> Decision Receipt
```

The MCP path is optional compatibility:

```text
MCP-capable runtime -> protected /mcp -> same Relay decision spine
```

## Run The Core Example In 60 Seconds

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm run example:relay
```

The example calls production Relay by default:

```txt
Neura Relay returned a Decision Receipt

Relay: https://www.neurarelay.com
Input: action_card_v0_1
Decision: proceed
Reason: ...
Decision factors: identity pass - authority pass - evidence pass - policy pass - risk pass
Next step: Developer may continue to execution.
Trace: trace_ref_...
Boundary: decision_gate_only_developer_keeps_execution
```

For machine-readable output:

```bash
npm run example:relay -- --json
```

To point the example at a local Relay server:

```bash
RELAY_BASE_URL=http://localhost:3000 npm run example:relay
```

## Copy The Core Request

The core example sends `examples/core/action-card.json` to Relay:

```json
{
  "version": "0.1",
  "agent": {
    "id": "agent_support_reply_001",
    "owner": "acme_support",
    "capability": "customer_message_draft",
    "capabilityVersion": "0.1.0"
  },
  "proposedAction": {
    "type": "send_message",
    "summary": "Send a customer reply confirming that the document was received and will be reviewed today.",
    "target": "customer_thread_123"
  },
  "affectedObject": "customer_thread_123",
  "context": {
    "evidenceRefs": ["ticket_123", "uploaded_document_456"],
    "ruleRefs": ["customer_reply_policy"],
    "riskCategory": "customer_communication",
    "requestedOutcome": "proceed_or_review"
  }
}
```

The script wraps that Action Card for the Relay resolve endpoint:

```js
const response = await fetch("https://www.neurarelay.com/api/resolve", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ action_card: actionCard })
});

const { decision_receipt: receipt } = await response.json();
```

## What Just Happened

1. The example loads `examples/core/action-card.json`.
2. It sends the Action Card to `POST /api/resolve`.
3. Relay returns a Decision Receipt v0.1 with decision factors.
4. Your system stores the receipt next to the proposed action.
5. Your system keeps execution ownership.

Relay is a governed decision gate. Your agent, product, private payloads, and downstream execution stay in your system.

## Why Agent Developers Add Neura

MCP gives agents a standard way to reach tools. Neura gives teams a governed checkpoint before those tool calls create business impact.

Use Neura when an agent is about to touch customer messages, CRM records, refunds, deployments, account state, or other consequential systems and you need:

- pre-action validation
- Agent Passport identity and authority-standing context
- a governed Decision Receipt
- trace and transaction refs for replay
- no private payload exposure
- no downstream execution by Neura

## Optional MCP Examples

MCP makes tool access easier. Neura makes consequential MCP tool use governable before it happens.

Use Neura Relay through MCP when an agent can reach real tools, records, messages, money workflows, deployments, or customer data and you need a pre-action record before the action becomes real.

Current MCP boundary:

- the open public path is still `POST /api/resolve`
- protected MCP access is controlled beta through `NEURA_RELAY_MCP_ACCESS_TOKEN`
- Neura does not currently offer public self-serve token issuance
- Neura does not execute downstream actions

Run the direct MCP client when Neura has issued an MCP token:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --list-tools
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=validate_action_card --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=resolve_action_card --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=lookup_agent_passport --action-card=examples/mcp/action-cards/registry-ready-evidence-capture.json --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

The MCP example pack includes:

- 4 safe Action Card scenarios: customer reply, CRM update, refund review, and deployment change
- 1 Registry-ready Action Card for Agent Passport and authority-standing lookup
- 1 blocked high-risk Action Card that should not proceed automatically
- 1 direct MCP JSON-RPC client for all five protected Neura tools
- 1 OpenAI Responses remote MCP template
- 1 Claude Code remote HTTP MCP configuration template
- 1 compatibility matrix that separates verified, prepared, planned, and not-claimed surfaces

Start here:

- `examples/README.md`
- `examples/mcp/README.md`
- `examples/mcp/compatibility-matrix.md`

## Repository Map

```text
examples/
  core/
    README.md
    action-card.json
    action-card-high-risk.json
    resolve-action-card.mjs
    decision-receipt.example.json
  mcp/
    README.md
    compatibility-matrix.md
    direct-mcp-client.mjs
    openai-responses-remote-mcp.mjs
    claude-code-neura.mcp.example.json
    agent-passport-authority-standing.example.json
    action-cards/
      customer-reply.json
      crm-update.json
      refund-review.json
      deploy-change.json
      registry-ready-evidence-capture.json
      blocked-funds-transfer.json
scripts/
  verify-relay-action-card-example.mjs
  verify-mcp-developer-adoption-pack.mjs
```

## Verify

```bash
npm run verify:relay-example
npm run verify:mcp-adoption-pack
```

`verify:mcp-adoption-pack` performs static checks by default. When `NEURA_RELAY_MCP_ACCESS_TOKEN` is present, it also performs live protected production validation and resolution through `/mcp`.

## Ecosystem Fit

- Relay evaluates proposed agent actions before execution.
- Registry supplies Agent Passport identity and capability-version context.
- Protocol defines the Action Card, decision factor, receipt, and trace language.
- Your system owns the agent, data, workflow, and final execution.

## Launch Boundary

This is a runnable public example for the live Relay Action Card path.

MCP examples are controlled-access examples until Neura ships a real beta or public token system.
