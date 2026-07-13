# Recoverable Observer Fixture Pack

This v0.1 draft is an implementation-neutral, payload-free contract for read-only extensions that need a trustworthy projection of agent and subagent lifecycle state.

It defines four observable outcomes:

1. `snapshot` supplies visible runs plus a resume cursor.
2. `lifecycle_transition` supplies ordered status changes with runtime-owned identity.
3. `resync_required` makes missed, duplicate, reordered, or conflicting events explicit.
4. `stream_closed` makes consent revocation, disconnect, cursor expiry, and buffer overflow explicit.

## Envelope

Every envelope carries:

- an event ID and cursor;
- extension, profile, workspace, and remote-authority scope;
- separate session, run-attempt, and delegation IDs;
- per-run sequence, previous/current status, and reason code;
- occurred and observed timestamps;
- `payload_free = true`.

`needs_input` exposes only an opaque request ID and an input kind. It does not carry prompt text or input payload.

## Regression Matrix

| Case | Required result |
| --- | --- |
| Late attach | Return a coherent snapshot and continue only after the returned cursor. |
| Missed, duplicate, reordered, or conflicting event | Emit `resync_required`; never overwrite the projection in place. |
| Retry | Preserve the old terminal attempt; start a new run-attempt ID at sequence `1`. |
| Parent cancellation | Settle each active child exactly once with a deterministic terminal outcome. |
| Needs input | Emit only an opaque request ID and input kind. |
| Consent revocation or disconnect | Emit `stream_closed`, stop delivery, and require a fresh snapshot before resuming. |
| Cursor expiry or buffer overflow | Emit `stream_closed` and require a fresh snapshot. |
| Scope mismatch | Reject delivery across extension, profile, workspace, or remote-authority boundaries. |

## Verification

```bash
npm run verify:recoverable-observer
npm run test:recoverable-observer
```

The verifier checks identity separation, cursor continuity, retry immutability, terminal finality, explicit resync/closure handling, payload absence, and scope isolation.

## Boundary

This is synthetic architecture and fixture-shape work. It does not test or validate VS Code, GitHub Copilot, VentoView, an extension API, event delivery, privacy behavior, implementation correctness, production readiness, adoption, partnership, integration, customer interest, official alignment, or Neura usage.
