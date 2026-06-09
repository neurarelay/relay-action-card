# Acceptance Test Fixtures Packet

Status: draft packet; exact approval required before public use

## Concrete Ask

- Source:
- Who asked:
- Behavior to prove:
- Target repo / issue / PR:

## Test Matrix

| Case | Input change | Expected decision | Why |
| --- | --- | --- | --- |
| baseline approved action | no change | `allow` or original approved state | Same actor, action, target, args, scope, and policy refs. |
| changed args | `args_hash` / `argsDigest` differs | `revise` or `human_review` | Approval cannot silently carry to a different payload. |
| changed target | `target_ref` differs | `stop` or `human_review` | Approval is bound to one target/resource. |
| stale approval | approval is expired | `human_review` | Time-bound authority must be refreshed. |
| consumed one-shot approval | `consumed_at` exists | `stop` or `human_review` | One-shot approval cannot be reused. |
| revoked authority | revocation ref is active | `stop` | Revoked delegation must not execute. |

## Proposed Artifact

```text
fixtures/
  baseline-approved.json
  changed-args.json
  changed-target.json
  stale-approval.json
  consumed-one-shot.json
  revoked-authority.json
tests/
  approval-boundary.test.*
```

## Verification

```bash
npm run verify:mcp-approval-receipt
npm run verify:delegated-authority-scenarios
```

Use the verifier that matches the project lane.

## Boundary

Fixtures must use synthetic refs and hashes. Do not include raw customer data, real account ids, tokens, payment details, private policy text, or raw tool args.

## Approval State

Not approved for public use until Roman approves exact copy, channel, identity, link posture, and follow-up rule.
