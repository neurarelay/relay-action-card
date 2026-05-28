# Authority Path Proof

Authority Path Proof is the Neura Relay proof for indirect authority, scope envelopes, and sequence-aware restraint.

It proves that a proposed action should be judged against where authority came from, what scope it carried, whether the action still fits the stated purpose, and whether the recent sequence changes the risk.

Neura's difference is the output object:

```text
Proposed action -> authority path review -> Decision Receipt -> developer-owned execution or restraint
```

The receipt is created before execution. It binds the decision to the actor, target, params hash, authority path, scope envelope, policy refs, evidence refs, validity rules, and trace refs.

## Run The Proof

```bash
npm run proof:authority-path -- --dry-run --json
npm run verify:authority-path
```

## Scenarios

| Scenario | Decision | What it proves |
| --- | --- | --- |
| Worker stays inside assigned read scope | `allow` | A proposed action can proceed when action and target stay inside the scope envelope. |
| Indirect refund path requires owner review | `human_review` | Money movement requires owner review when the authority path is too indirect. |
| Worker attempts resource outside scope envelope | `stop` | A worker cannot exceed the carried resource scope. |
| Valid reads followed by export require stop | `stop` | Individually valid reads can become unsafe as a sequence. |
| Report summarizer drifts into external data movement | `stop` | Declared purpose does not authorize external transmission. |
| Allowed authority path but proposed action must be narrowed | `revise` | A valid authority path can still require policy-safe revision before execution. |

## Receipt Fields Added By This Proof

The proof uses the working Decision Receipt shape and adds:

- `authority_path_review.authority_score`
- `authority_path_review.required_authority_floor`
- `authority_path_review.authority_path_depth`
- `authority_path_review.flags`
- `authority_path_review.sequence_context`
- `authority.authority_path`
- `authority.scope_envelope_checked`
- `validity.invalid_if_changed` including `authority_path`, `scope_envelope`, and `sequence_context`

These fields are designed to remain refs-only and inspectable. They do not require private payload storage or downstream execution by Neura.

## Why This Matters

Multi-agent workflows do not fail only because one request is invalid.

They also fail when:

- a worker exceeds assigned scope;
- an action is too many authority handoffs away from the owner;
- an agent drifts from declared purpose;
- individually permitted reads become an unsafe export sequence;
- a customer-facing or money-moving action needs revision before execution.

This proof turns those conditions into a portable pre-action receipt rather than only a local audit-log row.

## Boundary

This is a local dry-run proof with synthetic data only.

No downstream execution by Neura.

It does not touch payment rails, customer systems, external email, real providers, production systems, private payloads, real customer records, PHI, real insurer systems, real EHRs, or real scheduling systems.

It does not claim provider approval, marketplace listing, Microsoft approval, OpenAI approval, compliance certification, HIPAA compliance, production integration, partnership, public token issuance, Registry auto-approval, or downstream execution by Neura.
