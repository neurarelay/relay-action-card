# Neura Relay Core Example

This is the public, non-MCP Neura developer path.

```text
Action Card -> Relay /api/resolve -> Decision Receipt
```

Run it from the repo root:

```bash
npm run example:relay
```

The example sends `action-card.json` to production Relay by default and prints the governed Decision Receipt. Your system keeps execution ownership; Relay only returns the decision record before execution.

## First Receipt Path

```bash
npm run example:relay -- --example=support-reply --json
```

That command proves the core loop:

```text
Action Card -> Relay -> Decision Receipt -> trace ref
```

After the CLI returns a receipt, open Relay Developer Workspace and paste or edit the same Action Card:

```text
https://www.neurarelay.com/developers/workspace
```

Workspace shows the same adoption path with the Decision Receipt, Registry status, trace replay, and copyable JavaScript or curl handoff for `POST /api/resolve`.

## Action Card Examples

The public example library mirrors the Relay Developer Workspace:

| Example | Run command | File |
| --- | --- | --- |
| Support reply | `npm run example:relay -- --example=support-reply` | `action-cards/support-reply.json` |
| Account API write | `npm run example:relay -- --example=account-api-write` | `action-cards/account-api-write.json` |
| Refund exception | `npm run example:relay -- --example=refund-exception` | `action-cards/refund-exception.json` |
| Data export | `npm run example:relay -- --example=data-export` | `action-cards/data-export.json` |
| Payment release | `npm run example:relay -- --example=payment-release` | `action-cards/payment-release.json` |
| Workflow state change | `npm run example:relay -- --example=workflow-state-change` | `action-cards/workflow-state-change.json` |
| Authorized CRM account update | `npm run example:relay -- --example=authorized-crm-account-update` | `action-cards/authorized-crm-account-update.json` |
| Blocked cross-resource CRM update | `npm run example:relay -- --example=blocked-cross-resource-crm-update` | `action-cards/blocked-cross-resource-crm-update.json` |
| Blocked payment without authority | `npm run example:relay -- --example=blocked-payment-without-authority` | `action-cards/blocked-payment-without-authority.json` |

You can copy any Action Card into your own agent workflow or paste it into the protected Relay Developer Workspace:

```text
https://www.neurarelay.com/developers/workspace
```

The Workspace lets you edit the Action Card JSON, send it to Relay, inspect the Decision Receipt, Registry status, and trace replay, then copy the integration handoff for your own agent workflow.

The demo cards include a demo Agent Passport. In production, the acting agent needs a Registry Agent Passport before Relay can validate identity, capability, version, and standing. Create the production Agent Passport at [Neura Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew).

Production order:

```text
Create Registry Agent Passport -> put its refs in the Action Card -> send to Relay -> route execution from the Decision Receipt
```

The four primary developer patterns are API write, customer notification, financial or operational commitment, and workflow state change. See [`../../docs/developer-owned-agent-walkthrough.md`](../../docs/developer-owned-agent-walkthrough.md) for the full flow.

Authorization bypass scenarios are included for an authorized CRM update and two authority-mismatch attempts. The blocked scenarios must not auto-proceed:

```bash
npm run verify:authorization-bypass-scenarios
```

See [`../../docs/authorization-bypass-scenarios.md`](../../docs/authorization-bypass-scenarios.md).

For machine-readable output:

```bash
npm run example:relay -- --json
```

To point the same example at a local Relay server:

```bash
RELAY_BASE_URL=http://localhost:3000 npm run example:relay
```

To see a high-risk action route away from automatic execution:

```bash
npm run example:relay -- --example=high-risk
```

## Files

- `action-card.json`: proposed agent action.
- `action-cards/`: public Action Card examples for common developer workflows.
- `action-card-high-risk.json`: proposed financial action with missing evidence and policy refs.
- `action-cards/authorized-crm-account-update.json`: permitted target/action scenario.
- `action-cards/blocked-cross-resource-crm-update.json`: authority-mismatch account target scenario.
- `action-cards/blocked-payment-without-authority.json`: payment action outside declared authority scenario.
- `resolve-action-card.mjs`: sends the Action Card to `POST /api/resolve`.
- `decision-receipt.example.json`: example receipt shape your system can store.

MCP is optional. For the protected MCP compatibility examples, see `../mcp`.
