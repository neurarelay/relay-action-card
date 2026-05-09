# MCP Tool-Call Governance Walkthrough

Before your MCP tool call executes, get a Decision Receipt.

MCP gives agents a standard way to reach tools. That is useful, but it also moves the risk closer to production systems: customer records, CRM writes, refunds, deployments, messages, exports, and other consequential actions.

Neura adds a pre-action checkpoint:

```text
MCP-capable agent -> proposed tool call -> Action Card -> Relay -> Decision Receipt -> developer-owned execution
```

Neura does not execute the downstream tool call. Relay returns the governed decision record your app can store before your app decides what to execute.

## If You Arrived From LinkedIn

Start with the fastest proof path:

1. Open the repo root: [relay-action-card](https://github.com/neurarelay/relay-action-card).
2. Run a public Action Card example and inspect the Decision Receipt:

   ```bash
   git clone https://github.com/neurarelay/relay-action-card.git
   cd relay-action-card
   npm run example:relay -- --example=support-reply --json
   ```

3. Open [Relay Developer Workspace](https://www.neurarelay.com/developers/workspace) to try the same Action Card pattern in the product surface.
4. Activate sandbox MCP in Workspace only if you want to test the protected MCP path.
5. Create a [Registry Agent Passport](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew) before production identity validation.
6. Request [controlled production/private MCP access](https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml) only after you have a concrete MCP runtime and governed-action use case.

The core proof does not require MCP:

```text
Action Card -> Relay -> Decision Receipt
```

MCP is optional compatibility for runtimes that already use MCP.

## When To Use This Pattern

Use this pattern when an MCP-capable agent is about to call a tool that can change business state, expose sensitive data, contact a customer, move money, ship code, or trigger a workflow transition.

The pattern is intentionally narrow:

| Question | Neura answer |
| --- | --- |
| What is about to happen? | The Action Card describes the proposed tool call and context. |
| Is the acting agent known? | Registry Agent Passport supplies identity, owner, capability, version, and standing for production use. |
| Should this action proceed? | Relay evaluates identity, authority, evidence, policy, and risk. |
| What should the app store? | The Decision Receipt, trace ref, transaction ref, and source refs. |
| Who executes? | The developer's app or workflow, after reading the receipt. |

## The Direct Path Remains Primary

The default Neura path is still the direct Relay path:

```text
Action Card -> POST /api/resolve -> Decision Receipt
```

Run it first:

```bash
npm run example:relay -- --example=workflow-state-change --json
```

That gives you a receipt without configuring MCP.

## The Optional MCP Path

Use MCP when your agent runtime already speaks MCP and you want to call the same Relay spine through protected MCP-compatible tools.

```text
MCP runtime -> protected Neura MCP tool -> same Relay decision spine -> Decision Receipt
```

Neura currently exposes five protected MCP tools:

| Tool | Use |
| --- | --- |
| `validate_action_card` | Check Action Card shape before Relay review. |
| `resolve_action_card` | Receive a Decision Receipt, trace ref, and transaction ref. |
| `get_decision_receipt` | Fetch a safe receipt by receipt id or transaction ref. |
| `get_trace_replay` | Fetch redacted trace replay by trace ref. |
| `lookup_agent_passport` | Check Registry identity, readiness, authority scope, and standing context. |

## Step 1: Describe The Proposed MCP Tool Call

Start from the action the agent is about to take.

Example:

```text
The agent wants to update a CRM account from an MCP-connected business system.
```

Do not send private payloads, full customer messages, secrets, access tokens, proprietary policy text, or raw database content. Send refs and decision context.

Use an Action Card like:

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
    "type": "crm_update",
    "summary": "Update account priority and owner after evidence review",
    "target": "account_8421"
  },
  "affectedObject": "account_8421",
  "context": {
    "evidenceRefs": ["crm:account_8421", "case:renewal_risk_233"],
    "ruleRefs": ["policy:account_update_review"],
    "riskCategory": "business_record_update",
    "requestedOutcome": "decision_receipt"
  }
}
```

For a ready-made MCP scenario, use:

```bash
examples/mcp/action-cards/crm-update.json
```

## Step 2: Get A Decision Receipt

Direct Relay path:

```bash
npm run example:relay -- --example=account-api-write --json
```

MCP path after Workspace sandbox access or private production access:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --tool=resolve_action_card --action-card=examples/mcp/action-cards/crm-update.json --json
```

Expected safe output includes:

```json
{
  "receipt_id": "decision_receipt_...",
  "decision": "human_review",
  "trace_ref": "trace_ref_...",
  "transaction_ref": "relay_txn_...",
  "relay_boundary": "decision_gate_only_developer_keeps_execution"
}
```

## Step 3: Route Execution In Your App

Your app reads the Decision Receipt and routes the next step.

| Receipt outcome | Developer-owned next step |
| --- | --- |
| `proceed` | Execute the tool call in your app if local policy also allows it. |
| `revise` | Modify the proposed action and request a new receipt. |
| `human_review` | Hold execution until a human reviews the action. |
| `stop` | Do not execute the proposed action. |

Neura returns the decision record. Your system keeps the agent, MCP server, private data, workflow, and final execution.

## Step 4: Add Production Identity

Demo examples include demo Agent Passport references so you can get a first receipt quickly.

For production, create a Registry Agent Passport before Relay treats the acting identity as valid:

```text
https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew
```

The production Action Card should include the Registry-backed agent id, owner, capability, and capability version. Relay can then evaluate identity, capability, version, and standing as part of the decision.

## Step 5: Choose The Access Lane

| Lane | Use when | Boundary |
| --- | --- | --- |
| Public direct Relay | You want the fastest first receipt | No MCP token needed. |
| Relay Workspace sandbox MCP | You want immediate MCP proof from a signed-in Workspace account | Sandbox only, one-time token display, limited and expiring. |
| Production/private MCP | You have a concrete MCP-capable runtime and production identity | Controlled beta access, private handoff, rotation/revocation. |

Open Workspace:

```text
https://www.neurarelay.com/developers/workspace
```

Request controlled production/private MCP access only after the public proof and Registry Agent Passport path are clear:

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml
```

## Provider Templates

This repo includes prepared provider templates:

| Provider/runtime | File | Current status |
| --- | --- | --- |
| Direct Neura MCP JSON-RPC | `examples/mcp/direct-mcp-client.mjs` | Production Neura MCP server verified when a controlled token is available. |
| OpenAI Responses remote MCP | `examples/mcp/openai-responses-remote-mcp.mjs` | Template prepared; live provider-client verification requires credentials. |
| Anthropic Claude Messages MCP connector | `examples/mcp/anthropic-messages-mcp.mjs` | Private live provider proof passed with controlled Relay sandbox access. |
| Claude Code HTTP MCP | `examples/mcp/claude-code-neura.mcp.example.json` | Config template prepared; client behavior should be verified in the target environment. |
| Google ADK remote MCP | `examples/mcp/google-adk-remote-mcp.py` | Template prepared; live provider-client verification requires runtime credentials. |
| Microsoft Agent Framework / Foundry MCP | `examples/mcp/microsoft-agent-framework-mcp.py` | Template prepared; live provider-client verification requires runtime/project access. |

## What This Does Not Claim

- Neura does not execute downstream tool calls.
- Neura does not expose private payloads.
- Neura does not issue public production MCP tokens.
- Neura does not auto-approve Registry submissions.
- Neura does not provide public A2A discoverability in this repo.
- Neura is not claiming an official ecosystem partnership.
- This repo is not a packaged SDK.

## Why This Matters

MCP standardizes access to tools. It does not, by itself, decide whether a specific tool call should happen in a specific business context.

The Neura pattern is:

```text
Propose the action.
Get the Decision Receipt.
Then decide whether your app should execute.
```

That gives agent developers a copyable governance path: prove the Action Card loop in minutes, then graduate into production identity and controlled MCP access.
