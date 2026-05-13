# OpenClaw-Style 5-Minute Receipt Demo

This is the fastest public-safe proof loop for autonomous computer-use developers:

```bash
npm install
npm run openclaw:five-minute-demo
npm run verify:openclaw-five-minute-demo
```

The demo runs three severe local-agent moments through the Neura preflight adapter shape before execution:

| Scenario | Proposed action | What it prevents |
| --- | --- | --- |
| Send customer message | `message.send` | External customer communication leaving the runtime without receipt review |
| Delete local file | `file.delete` | Source or user data being removed before authority and retention refs are checked |
| Publish package | `package.publish` | Public distribution without version, provenance, approval, and claim-boundary evidence |

By default this is a dry run. It converts each refs-only preflight action into an Action Card and returns the route:

```text
relay_receipt_required_before_execution
```

For live Relay receipts, run:

```bash
npm run openclaw:five-minute-demo -- --live --json
```

Live mode requests Decision Receipts from Relay. It still does not execute the message, delete the file, publish the package, issue credentials, expose private payloads, or grant Registry approval. The developer runtime owns execution.

## Verifier

The verifier proves two things:

1. The local repo demo has the three severe scenarios and preserves the claim boundaries.
2. A clean outside consumer can install `@neurarelay/openclaw-preflight-adapter` from npm and run the same three preflight action types in dry-run mode.

```bash
npm run verify:openclaw-five-minute-demo
npm run test:openclaw-five-minute-demo
```

This is not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership. It is a claim-safe OpenClaw-style developer proof while the ClawHub publisher-access request remains under maintainer review.
