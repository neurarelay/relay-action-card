# Relay Action Card

Send an Action Card to Neura Relay. Get a governed Decision Receipt before execution.

This is the public developer starting point for Neura Relay. It keeps the first interaction simple: your Agent proposes an action, Relay evaluates identity, authority, evidence, policy, and risk, and your system receives a governed receipt before deciding what to execute.

## Run in 60 seconds

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
Decision factors: identity pass · authority pass · evidence pass · policy pass · risk pass
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

## Copy the request

The example sends `action-card.v0.1.json` to Relay:

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

## What just happened

1. The example loads `action-card.v0.1.json`.
2. It sends the Action Card to `POST /api/resolve`.
3. Relay returns a Decision Receipt v0.1 with decision factors.
4. Your system stores the receipt next to the proposed action.
5. Your system keeps execution ownership.

Relay is a governed decision gate. Your Agent, product, private payloads, and downstream execution stay in your system.

## MCP Developer Adoption Pack

MCP makes tool access easier. Neura makes consequential MCP tool use governable before it happens.

Use Neura Relay through MCP when an agent can reach real tools, records, messages, money workflows, deployments, or customer data and you need a pre-action record before the action becomes real.

```text
Action Card in.
Decision Receipt out.
Your agent keeps execution.
Your customer gets proof.
```

Current boundary:

- the open public path is still `POST /api/resolve`
- protected MCP access is controlled beta through `NEURA_RELAY_MCP_ACCESS_TOKEN`
- Neura does not currently offer public self-serve token issuance
- Neura does not execute downstream actions

Run the direct MCP client when Neura has issued an MCP token:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --list-tools
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=validate_action_card --json
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=resolve_action_card --json
```

The MCP example pack includes:

- safe Action Card scenarios for customer reply, CRM update, refund review, and deployment change
- a direct MCP JSON-RPC client for the protected production `/mcp` endpoint
- an OpenAI Responses remote MCP template
- a Claude Code remote HTTP MCP configuration template
- a compatibility matrix that separates verified, prepared, planned, and not-claimed surfaces

Start here:

- `examples/mcp/README.md`
- `examples/mcp/compatibility-matrix.md`

## Decision Receipt

Relay returns a governed receipt your system can store and route:

```json
{
  "decision": "proceed",
  "reason": "This output acknowledges receipt or next-step review without creating premature commitment or operational risk.",
  "recommended_next_step": "Developer may continue to execution.",
  "decision_factors": {
    "identity_check": { "status": "pass" },
    "authority_check": { "status": "pass" },
    "evidence_check": { "status": "pass" },
    "policy_check": { "status": "pass" },
    "risk_check": { "status": "pass" }
  },
  "trace_ref": "trace_ref_...",
  "relay_boundary": "decision_gate_only_developer_keeps_execution"
}
```

Your system decides what happens after the receipt. Relay only returns the governed decision before execution.

## Files

- `action-card.v0.1.json`: the proposed Agent action
- `decision-receipt.v0.1.json`: the example response shape your system stores
- `resolve-action-card.mjs`: sends the Action Card to Relay
- `examples/mcp/`: controlled-access MCP developer adoption examples
- `scripts/verify-relay-action-card-example.mjs`: production example verifier
- `scripts/verify-mcp-developer-adoption-pack.mjs`: static MCP adoption-pack verifier with optional live MCP check

## Verify

```bash
npm run verify:relay-example
npm run verify:mcp-adoption-pack
```

## Ecosystem fit

- Relay evaluates proposed Agent actions before execution
- Registry supplies Agent Passport identity and capability-version context
- Protocol defines the Action Card, decision factor, receipt, and trace language
- Your system owns the Agent, data, workflow, and final execution

## Launch boundary

This is a runnable public example for the live Relay Action Card path.

MCP examples are controlled-access examples until Neura ships a real beta or public token system.
