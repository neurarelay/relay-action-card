# CommerceOps Fire Drill

CommerceOps Fire Drill is a synthetic proof of Neura Relay as the Pre-Action Authority for money-moving commerce operations.

It shows a Shopify-style merchant agent proposing familiar business actions, then receiving a Decision Receipt before anything executes.

## Core Path

```text
Commerce agent intent -> Action Card -> Pre-Action Authority -> Decision Receipt -> developer-owned execution or restraint
```

## Run The Proof

```bash
npm run proof:commerceops-fire-drill -- --dry-run --json
npm run verify:commerceops-fire-drill
```

The proof covers six synthetic commerce actions:

| Scenario | Decision | Why |
| --- | --- | --- |
| Routine tracking reply | `allow` | Factual reply based on existing synthetic fulfillment data. |
| Refund over threshold | `human_review` | Money-moving action exceeds owner-approval threshold. |
| Discount code above limit | `revise` | Useful retention action must be reduced to policy-safe terms. |
| Address change after risk signal | `human_review` | High-value post-payment address change needs verification. |
| Cancellation after fulfillment release | `human_review` | Cancellation cannot be promised after warehouse release without confirmation. |
| Unsupported customer promise | `stop` | Message promises refund and overnight replacement without evidence. |

## Outputs

Each scenario produces:

- a synthetic Action Card;
- a Decision Receipt;
- policy and evidence basis;
- allowed next step;
- blocked downstream actions;
- attribution fields for proof measurement;
- boundary flags showing no real commerce action occurred.

## Files

```text
examples/commerceops-fire-drill/fixtures/*.json
examples/commerceops-fire-drill/scenarios/*.json
examples/commerceops-fire-drill/receipts/*.receipt.json
examples/commerceops-fire-drill/manifest.json
examples/commerceops-fire-drill/run-proof.mjs
scripts/verify-commerceops-fire-drill.mjs
```

## Boundary

CommerceOps Fire Drill is a local dry-run proof with synthetic data only. It does not touch Shopify, payment rails, fulfillment systems, customer accounts, discount-code systems, or customer-message channels. It does not claim provider approval, marketplace listing, compliance certification, production integration, partnership, or downstream execution by Neura.
