# Agent Action Firewall

Agent Action Firewall is the first Pre-Action Authority capability in Neura Relay.

It turns proposed consequential agent actions into Decision Receipts before execution. The downstream product, runtime, or owner still decides whether execution happens elsewhere.

## Core Path

```text
Action Card -> Agent Action Firewall -> Decision Receipt -> developer-owned execution or restraint
```

The Firewall does not behave like a network firewall or endpoint firewall. It is an authority decision gate for agent actions.

## Four Decisions

| Decision | Meaning |
| --- | --- |
| `allow` | The proposed action can continue with a receipt. |
| `revise` | The proposed action must be changed before it can continue. |
| `human_review` | A human, owner, or admin must review before execution. |
| `stop` | The proposed action should not execute under current authority or evidence. |

## Run The Proof

```bash
npm run proof:agent-action-firewall -- --dry-run --json
npm run verify:agent-action-firewall
```

The proof covers four synthetic scenarios:

| Scenario | Decision | Why |
| --- | --- | --- |
| Internal status lookup | `allow` | Low-risk read with synthetic refs only. |
| Discount above policy | `revise` | Agent can continue with a lower approved discount. |
| Refund above threshold | `human_review` | Money-moving action needs merchant-owner review. |
| Data export without purpose | `stop` | Sensitive data movement lacks purpose and authority. |

## Outputs

Each scenario produces:

- an Action Card;
- a Decision Receipt;
- policy and evidence refs;
- validity fields;
- blocked downstream actions where relevant;
- boundary flags showing no downstream execution by Neura.

## What This Proves

This proof shows the Gateway decision loop:

```text
proposed action -> policy/evidence/authority check -> allow/revise/human_review/stop receipt
```

It is intentionally small. It gives Relay, MCP Risk Gate, and CommerceOps Fire Drill a shared proof foundation instead of making each surface re-explain the core mechanism.

## Boundary

This is a local dry-run proof with synthetic data only. It does not touch Shopify, payment rails, customer accounts, production systems, external message channels, MCP providers, or real data. It does not claim provider approval, marketplace listing, compliance certification, production integration, partnership, or downstream execution by Neura.
