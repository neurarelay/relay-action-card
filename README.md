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

## Get Your First Receipt In 5 Minutes

Use this repo to prove the adoption loop before wiring Neura into your own agent:

1. Clone this repo
2. Run one public Action Card example
3. Confirm Relay returns a Decision Receipt and trace ref
4. Create a Registry Agent Passport for your production agent
5. Open Relay Developer Workspace
6. Send the same Action Card through Workspace and inspect the Decision Receipt, Registry status, and trace replay
7. Copy the Workspace JavaScript or curl handoff when you are ready to wire the same call into your agent workflow

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm run example:relay -- --example=support-reply --json
```

Expected safe output shape:

```json
{
  "input_model": "action_card_v0_1",
  "receipt_id": "decision_receipt_...",
  "decision": "human_review",
  "trace_ref": "trace_ref_...",
  "transaction_ref": "relay_txn_...",
  "relay_boundary": "decision_gate_only_developer_keeps_execution"
}
```

Then open Workspace:

```text
https://www.neurarelay.com/developers/workspace
```

Workspace keeps the proposed action visible, returns a safe receipt, and gives copyable JavaScript and curl for the public `POST /api/resolve` path. Your app still owns execution.

The demo cards include a demo Agent Passport. In production, the acting agent needs a Registry Agent Passport before Relay can validate identity, capability, version, and standing. Create the production Agent Passport at [Neura Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew).

## After The First Receipt

Once you have a Decision Receipt, choose one next action:

| Next action | Use when | Link |
| --- | --- | --- |
| First receipt feedback | You ran the public example and want to share refs-only feedback or a blocker | [Open feedback issue](https://github.com/neurarelay/relay-action-card/issues/new?template=first-receipt-feedback.yml) |
| Create the production Agent Passport | You are moving from demo refs to your own production agent identity | [Open Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew) |
| Controlled MCP access | You have an MCP-capable runtime and a concrete governed-action use case | [Request controlled access](https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml) |

Read the full path in [`docs/developer-feedback-and-controlled-access.md`](docs/developer-feedback-and-controlled-access.md).

## Production Agent Identity

Demo examples run immediately because they include a demo Agent Passport. A production agent needs its own Registry Agent Passport before Relay can treat the acting identity as valid.

Create the Agent Passport in Registry first:

```text
https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew
```

Then place the Registry-backed agent id, owner, capability, and capability version in the Action Card before sending it to Relay.

## Run The Core Example In 60 Seconds

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm run example:relay
```

List the public Action Card examples:

```bash
npm run example:relay -- --list-examples
```

Run a specific example:

```bash
npm run example:relay -- --example=support-reply
npm run example:relay -- --example=refund-exception
npm run example:relay -- --example=data-export
npm run example:relay -- --example=payment-release
```

The example calls production Relay by default:

```txt
Neura Relay returned a Decision Receipt

Relay: https://www.neurarelay.com
Input: action_card_v0_1
Decision: proceed
Reason: ...
Decision factors: identity pass - authority pass - evidence pass - policy pass - risk pass
Receipt: decision_receipt_...
Transaction: relay_txn_...
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

## Copy The Core Examples

The default core example sends `examples/core/action-card.json` to Relay. The broader public example library lives in `examples/core/action-cards`:

| Example | File | What Relay reviews |
| --- | --- | --- |
| Support reply | `examples/core/action-cards/support-reply.json` | A customer reply before it is sent |
| Refund exception | `examples/core/action-cards/refund-exception.json` | A refund exception before approval |
| Data export | `examples/core/action-cards/data-export.json` | A workspace export before content leaves the system |
| Payment release | `examples/core/action-cards/payment-release.json` | A partner payment before funds move |

Each file is an Action Card v0.1. Copy one into your agent workflow or paste it into the protected [Relay Developer Workspace](https://www.neurarelay.com/developers/workspace), then send it to Relay and inspect the returned Decision Receipt, Registry status, trace replay, and copyable integration handoff.

The default support-reply Action Card looks like this:

```json
{
  "version": "0.1",
  "agent": {
    "id": "11de8d9a-7e1e-42f9-86ae-5f9c26878624",
    "owner": "neura_relay",
    "capability": "decision_resolution",
    "capabilityVersion": "4511419e-9d22-49f5-aa7e-55f6f8b949de"
  },
  "proposedAction": {
    "type": "send_customer_reply",
    "summary": "Send a prepared support reply after policy and evidence review",
    "target": "support_thread_8421"
  },
  "affectedObject": "support_thread_8421",
  "context": {
    "evidenceRefs": ["support_thread:8421", "policy:refund_window"],
    "ruleRefs": ["policy:customer_communication_review"],
    "riskCategory": "customer_communication",
    "requestedOutcome": "decision_receipt"
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
4. Registry identity and capability context appear in the receipt when the agent has a valid Agent Passport.
5. Your system stores the receipt next to the proposed action.
6. Your system keeps execution ownership.

Relay is a governed decision gate. Your agent, product, private payloads, and downstream execution stay in your system.

For a product UI walkthrough, open the protected Relay Developer Workspace:

```text
https://www.neurarelay.com/developers/workspace
```

The Workspace uses the same four examples, keeps the proposed action visible while you edit JSON, links the returned Decision Receipt to trace replay, and provides JavaScript and curl handoff snippets for your own agent workflow.

## Why Agent Developers Add Neura

MCP gives agents a standard way to reach tools. Neura gives teams a governed checkpoint before those tool calls create business impact.

Use Neura when an agent is about to touch customer messages, CRM records, refunds, deployments, account state, or other consequential systems and you need:

- pre-action validation
- Agent Passport identity and authority-standing context
- a governed Decision Receipt
- trace refs for replay and receipt IDs for audit
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
- 1 Anthropic Claude Messages MCP connector template
- 1 Claude Code remote HTTP MCP configuration template
- 1 provider-runtime path guide for developer rollout decisions
- 1 compatibility matrix that separates verified, prepared, planned, and not-claimed surfaces

Start here:

- `examples/README.md`
- `examples/mcp/README.md`
- `examples/mcp/provider-runtime-paths.md`
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
    action-cards/
      support-reply.json
      refund-exception.json
      data-export.json
      payment-release.json
  mcp/
    README.md
    compatibility-matrix.md
    provider-runtime-paths.md
    direct-mcp-client.mjs
    openai-responses-remote-mcp.mjs
    anthropic-messages-mcp.mjs
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
  verify-developer-feedback-access-path.mjs
docs/
  developer-feedback-and-controlled-access.md
.github/
  ISSUE_TEMPLATE/
    first-receipt-feedback.yml
    controlled-mcp-access.yml
```

## Verify

```bash
npm run verify:relay-example
npm run verify:mcp-adoption-pack
npm run verify:developer-feedback-access-path
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
