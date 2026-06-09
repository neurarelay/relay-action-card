# Schema Field Map Packet

Status: draft packet; exact approval required before public use

## Concrete Ask

- Source:
- Who asked:
- Exact implementation question:
- Target repo / issue / PR:

## Evidence

| Evidence | Ref |
| --- | --- |
| Current field/model |  |
| Proposed receipt or event surface |  |
| Existing verifier or test |  |

## Proposed Artifact

| External field | Neura field | Required | Notes |
| --- | --- | --- | --- |
| `actor` / `agent` | `actor_ref` or Registry agent ref | yes | Use refs only. |
| `tool` / `action` | `tool_name` or `action_ref` | yes | Bind the exact proposed action. |
| `target` / `resource` | `target_ref` | yes | Do not store raw private target payload. |
| `args` / `input` | `args_hash` or `argsDigest` | yes | Hash or digest the exact argument set. |
| `approval` / `decision` | `approval_state` or Decision Receipt `decision` | yes | `allow`, `revise`, `human_review`, or `stop`. |
| `trace` / `run` | `trace_ref` | yes | Keep replayable correlation without private payload. |

## Verification

```bash
npm run verify:mcp-approval-receipt
npm run verify:agent-io-event-envelope
```

Adjust the command to the lane actually requested.

## Boundary

- metadata, refs, and hashes only;
- no private payload storage;
- no token, secret, credential, customer PII, or raw tool args;
- no downstream execution by Neura;
- no provider, standards-body, maintainer, integration, or customer-adoption claim.

## Approval State

Not approved for public use until Roman approves exact copy, channel, identity, link posture, and follow-up rule.
