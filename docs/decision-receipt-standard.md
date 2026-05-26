# Decision Receipt Standard v0.1 Draft

Decision Receipt Standard v0.1 is the working Neura reference format for recording what was authorized before a consequential agent action executes.

It is not an industry standard, compliance certification, provider approval, or execution system. It is the output object for the Agent Action Gateway proof path.

## Core Path

```text
Action Card -> Agent Action Gateway -> Decision Receipt -> developer-owned execution or restraint
```

Logs tell you what happened. A Decision Receipt tells you what was authorized before it happened.

## Decision Values

The current draft supports exactly four decisions:

| Decision | Meaning | Runtime instruction |
| --- | --- | --- |
| `allow` | The action can proceed under evaluated authority, policy, and evidence. | Continue, with receipt. |
| `revise` | The agent can continue only after changing the proposed action. | Return a safer proposed action. |
| `human_review` | Human, owner, or admin review is required before execution. | Pause execution and prepare review packet. |
| `stop` | The proposed action should not proceed under current authority or evidence. | Do not execute. |

## Required Receipt Fields

Every v0.1 draft Decision Receipt must include:

- `receipt_id`
- `standard`
- `created_at`
- `action_card_id`
- `decision`
- `decision_reason`
- `actor`
- `proposed_action`
- `risk`
- `policy_basis`
- `evidence_basis`
- `authority`
- `validity`
- `execution`
- `trace`
- `boundary`

The `validity` block must bind the receipt to the exact action type, target, params hash, actor, policy/evidence refs, and approval state that were evaluated.

## Validity And Invalidation

A Decision Receipt is valid only for the exact proposed action it references.

It becomes invalid if any of these change:

- `action_type`
- `target`
- `params_hash`
- `actor`
- `policy_refs`
- `evidence_refs`
- `approval_state`
- `required_authority_role`

The verifier tests changed target, changed params hash, changed actor, and changed approval state.

## Files

```text
schemas/action-card.v0.1.json
schemas/decision-receipt.v0.1.json
examples/decision-receipts/internal-status-lookup-allow.json
examples/decision-receipts/commerceops-discount-revise.json
examples/decision-receipts/frontsmith-website-update-human-review.json
examples/decision-receipts/commerceops-refund-human-review.json
examples/decision-receipts/mcp-risk-gate-tool-call-stop.json
examples/decision-receipts/clinicops-prior-auth-human-review.json
scripts/verify-decision-receipt-standard.mjs
```

## Verify

```bash
npm run verify:decision-receipt-standard
```

The verifier checks required fields, decision enum values, high-consequence policy/evidence/authority blocks, validity/invalidation fields, trace attribution, and the no-downstream-execution boundary.

## Boundary

This draft uses synthetic examples only. Neura Relay returns authority decisions and Decision Receipts before consequential agent actions. The downstream product, runtime, or owner decides whether execution proceeds elsewhere. This proof does not claim provider approval, marketplace listing, compliance certification, production integration, partnership, or downstream execution by Neura.
