# Delegated Action Trust Proof

Delegated Action Trust is the Agent Action Gateway proof for multi-agent delegated work.

It borrows the useful security pattern from agent policy-decision systems: delegation depth, inherited scope, purpose drift, behavioral sequence, and kill-chain signals should affect whether an agent action can proceed.

Neura's difference is the output object:

```text
Delegated action intent -> trust and sequence analysis -> Decision Receipt -> developer-owned execution or restraint
```

The receipt is created before execution. It binds the decision to the actor, target, params hash, delegation path, policy refs, evidence refs, validity rules, and trace refs.

## Run The Proof

```bash
npm run proof:delegated-action-trust -- --dry-run --json
npm run verify:delegated-action-trust
```

## Scenarios

| Scenario | Decision | What it proves |
| --- | --- | --- |
| Child agent stays inside delegated read scope | `allow` | A delegated agent can proceed when action and target stay inside inherited scope. |
| Three-hop delegated refund requires owner review | `human_review` | Deep delegation plus money movement lowers default trust and requires owner review. |
| Delegated worker attempts resource outside parent scope | `stop` | Child agents cannot exceed parent resource scope. |
| Bulk reads followed by export are treated as a kill-chain pattern | `stop` | Individually valid reads can become unsafe as a sequence. |
| Report summarizer drifts into external data movement | `stop` | Declared purpose does not authorize external transmission. |
| Allowed delegation but proposed action must be narrowed | `revise` | A valid delegation can still require policy-safe revision before execution. |

## Receipt Fields Added By This Proof

The proof uses the working Decision Receipt shape and adds:

- `trust_analysis.trust_score`
- `trust_analysis.trust_floor`
- `trust_analysis.delegation_depth`
- `trust_analysis.flags`
- `trust_analysis.behavioral_sequence`
- `authority.delegation_path`
- `validity.invalid_if_changed` including `delegation_path`, `authority_scope`, and `behavioral_sequence`

These fields are designed to remain refs-only and inspectable. They do not require private payload storage or downstream execution by Neura.

## Why This Matters

Multi-agent workflows do not fail only because one request is invalid.

They also fail when:

- a child agent exceeds inherited scope;
- an action is delegated too many hops away from the owner;
- an agent drifts from declared purpose;
- individually permitted reads become a bulk exfiltration pattern;
- a customer-facing or money-moving action needs revision before execution.

This proof turns those conditions into a portable pre-action receipt rather than only a local audit-log row.

## Boundary

This is a local dry-run proof with synthetic data only.

No downstream execution by Neura.

It does not touch payment rails, customer systems, external email, real providers, production systems, private payloads, real customer records, PHI, real insurer systems, real EHRs, or real scheduling systems.

It does not claim provider approval, marketplace listing, Microsoft approval, OpenAI approval, compliance certification, HIPAA compliance, production integration, partnership, public token issuance, Registry auto-approval, or downstream execution by Neura.
