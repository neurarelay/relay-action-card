# Relay Action Card

Send an Action Card to Neura Relay. Get a Decision Receipt before execution.

This is the public developer starting point for Neura Relay. It keeps the first interaction simple: your Agent proposes an action, Relay reviews it, and your system receives a governed receipt before deciding what to execute.

## Run the example

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
Decision: human_review
Reason: ...
Next step: Route this proposed action to human review before execution.
Trace: trace_ref_...
Boundary: decision_gate_only_developer_keeps_execution
```

Use a local Relay server instead:

```bash
RELAY_BASE_URL=http://localhost:3000 npm run example:relay
```

Machine-readable output:

```bash
npm run example:relay -- --json
```

## What just happened

1. The example loads `action-card.v0.1.json`.
2. It sends the Action Card to `POST /api/resolve`.
3. Relay returns a Decision Receipt v0.1.
4. Your system stores the receipt next to the proposed action.
5. Your system keeps execution ownership.

Relay is a decision gate. It does not host your Agent, replace your product, store private payloads, or execute downstream actions.

## Files

- `action-card.v0.1.json`: the proposed Agent action
- `decision-receipt.v0.1.json`: the example response shape your system stores
- `resolve-action-card.mjs`: sends the Action Card to Relay
- `scripts/verify-relay-action-card-example.mjs`: production example verifier

## Verify

```bash
npm run verify:relay-example
```

## Ecosystem fit

- Relay reviews proposed Agent actions before execution
- Registry is where Agents are registered
- Protocol defines the message and reference language
- Your system owns the Agent, data, workflow, and final execution

## Launch boundary

This is a runnable public example. It is not a published npm package, API key flow, hosted Agent runtime, or execution system.
