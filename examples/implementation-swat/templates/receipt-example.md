# Receipt Example Packet

Status: draft packet; exact approval required before public use

## Concrete Ask

- Source:
- Who asked:
- Receipt shape requested:
- Target repo / issue / PR:

## Example

```json
{
  "receipt_id": "receipt_ref_example",
  "standard": "neura-decision-receipt-v0.1-draft",
  "created_at": "2026-06-09T16:00:00Z",
  "actor_ref": "agent_ref_example",
  "action_ref": "action_ref_example",
  "target_ref": "target_ref_example",
  "args_hash": "sha256:example_args_digest",
  "decision": "human_review",
  "trace_ref": "trace_ref_example",
  "payload": {
    "tier": "T0",
    "redaction_status": "metadata_refs_hashes_only",
    "private_payload_stored": false
  },
  "boundary": {
    "downstream_execution_performed_by_neura": false,
    "private_payload_stored": false,
    "provider_approval_claimed": false,
    "customer_adoption_claimed": false
  }
}
```

## Verification

```bash
npm run verify:decision-receipt-standard
npm run verify:agent-io-event-envelope
```

## Boundary

This is a synthetic receipt-shape example only. It is not a live receipt, provider integration, customer deployment, compliance certification, or execution record.

## Approval State

Not approved for public use until Roman approves exact copy, channel, identity, link posture, and follow-up rule.
