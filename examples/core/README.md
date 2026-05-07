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

## Action Card Examples

The public example library mirrors the Relay Developer Workspace:

| Example | Run command | File |
| --- | --- | --- |
| Support reply | `npm run example:relay -- --example=support-reply` | `action-cards/support-reply.json` |
| Refund exception | `npm run example:relay -- --example=refund-exception` | `action-cards/refund-exception.json` |
| Data export | `npm run example:relay -- --example=data-export` | `action-cards/data-export.json` |
| Payment release | `npm run example:relay -- --example=payment-release` | `action-cards/payment-release.json` |

You can copy any Action Card into your own agent workflow or paste it into the protected Relay Developer Workspace:

```text
https://www.neurarelay.com/developers/workspace
```

The Workspace lets you edit the Action Card JSON, run Relay, and inspect the returned receipt and trace.

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
- `resolve-action-card.mjs`: sends the Action Card to `POST /api/resolve`.
- `decision-receipt.example.json`: example receipt shape your system can store.

MCP is optional. For the protected MCP compatibility examples, see `../mcp`.
