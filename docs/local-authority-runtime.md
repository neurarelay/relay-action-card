# Neura Local Authority Runtime v0.1

Status: local package consumer proof; no publish, provider approval, ecosystem endorsement, customer adoption, compliance certification, or downstream execution claim.

This proof shows the first Local Authority Runtime slice:

```text
local discovery -> redacted manifest -> refs-only Action Card -> controlled Relay receipt bridge -> scoped local-runtime route bridge -> local binding verifier -> local ledger event
```

Run:

```bash
npm run proof:local-authority-runtime -- --dry-run --json
npm run verify:local-authority-runtime
```

The proof consumes the private local runtime package from the sibling `neura-relay-web` checkout. If the package lives somewhere else, set:

```bash
NEURA_AUTHORITY_RUNTIME_DIR=/path/to/neura-relay-web/packages/authority-runtime npm run proof:local-authority-runtime -- --dry-run --json
```

## What It Proves

- The private local runtime package can be built and imported by a consumer proof.
- Discovery emits a redacted local manifest.
- Discovery finds candidate action surfaces only; it does not infer authority.
- The Node wrapper dry-run emits a refs-only Action Card, Decision Receipt, local binding record, and local ledger event.
- The MCP fixture dry-run emits the same authority sequence.
- Controlled Relay mode derives a Relay-compatible refs-only Action Card and verifies the returned receipt locally through a mock transport.
- Scoped local-runtime route mode targets `/api/local-runtime/resolve-action-card` through the same mock transport and keeps the request Action Card refs-only.
- Changed args, changed target, changed actor, expired receipt, one-shot reuse, and non-proceed routes fail closed.
- There is no proprietary website intake.
- There is no hidden config mutation.
- There is no downstream execution by Neura.

## Boundary

This is not a universal interceptor, an enterprise installer, a desktop app, a hosted environment scanner, a production runtime-token rollout, or a public package release. It is the first package-level proof that the local runtime can govern routed action surfaces without exporting private payloads.
