# OpenClaw-Style Action Receipt Kit

These examples are public-safe Action Card drafts for OpenClaw-style autonomous computer-use actions. They are refs-only fixtures for getting a Decision Receipt before user or runtime-owned execution.

This folder is not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Run

```bash
npm run openclaw:proof
npm run openclaw:proof -- --live
npm run openclaw:dry-run
npm run openclaw:receipts -- --only=send-message --json
npm run verify:openclaw-action-receipt-kit
npm run verify:openclaw-action-receipt-pack
npm run verify:openclaw-developer-journey
npm run test:openclaw-developer-journey
npm run test:openclaw-kit
npm run test:openclaw-kit:e2e
npm run openclaw:workbench
npm run verify:openclaw-workbench
npm run openclaw:preflight:dry-run
npm run openclaw:plugin:pack:dry-run
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-plugin-rc
```

## Fixtures

| File | Family |
| --- | --- |
| `send-message.json` | outbound message |
| `edit-file.json` | file edit |
| `delete-file.json` | file delete |
| `browser-submit.json` | browser submit |
| `shell-command.json` | shell command |
| `workflow-state-change.json` | workflow state change |
| `memory-write.json` | memory write |
| `data-export.json` | data export |

The manifest at `action-receipt-kit.manifest.json` is the machine-readable contract for the local release candidate kit.

The developer journey proof at `run-developer-journey-proof.mjs` is the one-command local adoption path. It generates the workbench, dry-runs all refs-only fixtures, dry-runs the preflight adapter, runs the verifiers, and runs the local test suite. Read [`docs/openclaw-developer-journey.md`](../../docs/openclaw-developer-journey.md) for the clone-to-confidence path.

The Near-Miss Workbench at `near-miss-workbench/scenarios.json` generates `artifacts/openclaw-near-miss-workbench/report.html` for three severe local developer journeys: customer data exfiltration, production deployment, and expired delegated authority. The visual report shows the agent intent, what Neura catches, the receipt route, and the developer-owned next step. It is a safe local projection; no real email, browser submit, file delete, shell command, deployment, token issuance, or downstream execution occurs.

The committed GitHub preview assets live in `docs/assets/openclaw-near-miss-workbench/`; regenerate the local report with `npm run openclaw:workbench` before replacing them.

The `preflight-adapter` folder adds the package-ready `beforeAction(preflightAction)` release candidate for local autonomous computer-use runtimes. It is shaped for `@neurarelay/openclaw-preflight-adapter@0.1.0-rc.1`, but it is not submitted, published, listed, approved, or partnered by OpenClaw / ClawHub.
