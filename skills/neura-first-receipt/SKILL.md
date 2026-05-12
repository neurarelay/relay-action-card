---
name: neura-first-receipt
description: Use when a developer wants to run Neura Relay for the first time, clone or inspect the public Action Card example, get a first Decision Receipt, or verify the direct Action Card to Relay path before optional protected MCP or A2A access.
---

# Neura First Receipt

Use this skill to help a developer get the first Decision Receipt through the direct public Relay path.

## Workflow

1. Start with direct public `POST /api/resolve`; do not require MCP or A2A.
2. Use this repo's core example or `scripts/run-first-receipt.mjs`.
3. Confirm the result includes `decision_receipt.receipt_id`, `trace_ref`, and `transaction_ledger.transaction_ref`.
4. Explain that optional MCP and A2A execution paths require controlled access and are not public token issuance.
5. Keep downstream execution in the developer-owned system.

## Commands

From the public example repo:

```bash
npm install
npm run example:relay -- --example=support-reply --json
```

From this skill folder:

```bash
node scripts/run-first-receipt.mjs
```
