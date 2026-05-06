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

For machine-readable output:

```bash
npm run example:relay -- --json
```

To point the same example at a local Relay server:

```bash
RELAY_BASE_URL=http://localhost:3000 npm run example:relay
```

## Files

- `action-card.json`: proposed agent action.
- `resolve-action-card.mjs`: sends the Action Card to `POST /api/resolve`.
- `decision-receipt.example.json`: example receipt shape your system can store.

MCP is optional. For the protected MCP compatibility examples, see `../mcp`.
