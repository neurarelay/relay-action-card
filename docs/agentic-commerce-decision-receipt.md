# Agentic Commerce Decision Receipt

Agentic Commerce Decision Receipt v0.1 is a synthetic proof pack for payment-adjacent and customer-binding agent actions.

It answers one concrete question:

```text
Before an agent refunds, credits, subscribes, adjusts, creates a payment link, or promises a customer outcome, what receipt proves this exact action was reviewed before execution?
```

## Core Path

```text
commerce agent intent -> Agent I/O Event -> Action Card -> Decision Receipt -> optional Approval Receipt -> developer-owned execution or restraint -> outcome ref
```

## Buyer Problem

Agentic commerce makes autonomous actions economically consequential:

- refunds and credits move money;
- payment links and subscriptions create commitments;
- discounts change revenue;
- customer promises create liability;
- fulfillment changes affect customer trust.

Access controls and restricted keys can limit reach. They do not, by themselves, produce a durable pre-action decision record for this exact action, target, amount, actor, policy, evidence, and approval state.

## What The Receipt Binds

The receipt binds:

- merchant or owner ref;
- economic action type;
- tool or commerce surface;
- target ref;
- customer ref;
- amount class;
- currency;
- params hash;
- actor ref;
- policy refs;
- evidence refs;
- approval state;
- expiry or one-shot validity when applicable;
- outcome ref after the developer-owned runtime acts or restrains.

If amount, currency, target, customer, params hash, actor, policy refs, evidence refs, or approval state changes, the receipt does not authorize the changed action.

## Proof Command

```bash
npm run proof:agentic-commerce-decision-receipt -- --dry-run --json
npm run verify:agentic-commerce-decision-receipt
```

The proof reuses the CommerceOps Fire Drill scenarios and adds a commerce-specific Decision Receipt view around the refund-over-threshold case.

## Covered Actions

| Action | Receipt Route |
| --- | --- |
| Factual tracking reply | `allow` |
| Refund over threshold | `human_review` |
| Discount above limit | `revise` |
| High-risk address change | `human_review` |
| Cancellation after fulfillment release | `human_review` |
| Unsupported refund/replacement promise | `stop` |

## Default Payload Posture

```text
tier = T0
redaction_status = metadata_refs_hashes_only
private_payload_stored = false
```

Use refs, hashes, amount classes, counts, and policy/evidence refs. Do not store raw payment method data, card data, customer PII, private order payloads, tokens, provider keys, session cookies, or raw tool arguments in the default tier.

## Boundary

This is a local synthetic proof. It does not touch Stripe, Shopify, payment rails, cards, wallets, customer accounts, merchant systems, fulfillment systems, discount-code systems, or customer-message channels. It does not claim provider approval, marketplace listing, compliance certification, production integration, partnership, customer adoption, payment processing, or downstream execution by Neura.
