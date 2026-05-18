# Swarm Authority Placement Proof

Status: local deterministic proof; Ruflo-style / swarm-runtime pattern only

This proof shows where Neura can sit in a multi-agent swarm runtime without becoming the runtime and without executing downstream actions.

```text
swarm proposal / consensus / broadcast / worker dispatch / memory write
-> runtime-bound Action Card
-> Relay Decision Receipt
-> receipt_ref / trace_ref
-> runtime-owned proceed / revise / stop / human_review route
```

Run it locally:

```bash
npm run proof:swarm-authority-placement -- --dry-run --json
npm run verify:swarm-authority-placement-proof
```

## Placement Points

The proof models five insertion points:

- before consensus proposal
- proposal/result metadata
- before broadcast / dispatch
- before worker tool execution
- before memory write / federation message

At each point the swarm runtime envelope is captured as refs only, an Action Card is derived from that exact envelope, Relay returns a Decision Receipt with `receipt_ref` and `trace_ref`, and the swarm runtime owns the next route.

## Scenarios

- `before-consensus-proposal`: proposal is revised before the swarm runtime asks for consensus.
- `proposal-result-metadata`: receipt metadata can be attached to a refs-only result.
- `before-broadcast-dispatch`: worker fan-out routes to human review before dispatch.
- `before-worker-tool-execution`: external-account worker tool execution stops until authority and scope refs are repaired.
- `before-memory-federation`: memory write or federation message routes to human review before runtime execution.

## Boundary

This is not a Ruflo integration. It is a generic swarm-runtime placement proof that can answer the architecture question later.

The verifier locks:

- deterministic local dry-run output
- Action Card derived from the swarm runtime envelope
- receipt bound to the exact swarm stage
- valid `receipt_ref` / `trace_ref` shape
- runtime-owned execution
- no downstream execution by Neura
- no private payload persistence
- no provider approval, listing, endorsement, integration, or partnership claim
- no public distribution action

The proof has no Ruflo package dependency and makes no Ruflo listing, validation, endorsement, approval, integration, or partnership claim.
