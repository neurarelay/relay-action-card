# OpenClaw-Style 5-Minute Quickstart

Use this when you want the fastest Neura proof for autonomous computer-use agents.

```bash
npm install
npm run openclaw:five-minute-demo
npm run verify:openclaw-five-minute-demo
```

The demo routes three high-signal local-agent moments through the Neura preflight adapter shape before execution:

| Moment | Action | Receipt route |
| --- | --- | --- |
| Customer message | `message.send` | before external communication |
| File deletion | `file.delete` | before local destructive change |
| Package publish | `package.publish` | before public distribution |

Expected dry-run route:

```text
relay_receipt_required_before_execution
```

For live Relay receipts:

```bash
npm run openclaw:five-minute-demo -- --live --json
```

The live command requests Decision Receipts only. It does not send messages, delete files, publish packages, issue credentials, expose private payloads, or execute downstream actions. Your runtime keeps execution ownership.

Useful next links:

- [5-minute receipt demo docs](../../docs/openclaw-five-minute-receipt-demo.md)
- [OpenClaw preflight adapter docs](../../docs/openclaw-preflight-adapter.md)
- [ClawHub submission readiness packet](../../docs/openclaw-clawhub-submission-readiness.md)

This is not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership.
