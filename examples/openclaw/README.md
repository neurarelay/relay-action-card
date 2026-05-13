# OpenClaw-Style Action Receipt Kit

These examples are public-safe Action Card drafts for OpenClaw-style autonomous computer-use actions. They are refs-only fixtures for getting a Decision Receipt before user or runtime-owned execution.

This folder is not an official OpenClaw or ClawHub integration, listing, approval, or partnership.
The workspace surface is also not an official OpenClaw OS, OpenUI, OpenClaw, or ClawHub integration.

## Run

Fastest path:

```bash
npm run openclaw:five-minute-demo
npm run openclaw:copy-paste-integration
npm run openclaw:computer-use-loop
npm run verify:openclaw-five-minute-demo
```

Read [`QUICKSTART.md`](QUICKSTART.md) for the 5-minute GitHub visitor path. For reviewer-facing evidence, use [`docs/openclaw-clawhub-maintainer-packet.md`](../../docs/openclaw-clawhub-maintainer-packet.md).

Start with the full local proof:

```bash
npm run openclaw:five-minute-demo
npm run openclaw:copy-paste-integration
npm run openclaw:computer-use-loop
npm run verify:openclaw-five-minute-demo
npm run openclaw:proof
npm run openclaw:proof -- --live
```

Generate the visual surfaces:

```bash
npm run openclaw:workbench
npm run openclaw:workspace-proof
npm run openclaw:severe-proof
npm run openclaw:severe-preflight
```

Run fixture and receipt checks:

```bash
npm run openclaw:dry-run
npm run openclaw:receipts -- --only=send-message --json
npm run verify:openclaw-action-receipt-kit
npm run verify:openclaw-action-receipt-pack
npm run verify:openclaw-developer-journey
npm run verify:openclaw-five-minute-demo
npm run verify:openclaw-copy-paste-integration
npm run verify:openclaw-computer-use-loop
npm run verify:openclaw-clean-consumer
npm run test:openclaw-five-minute-demo
npm run test:openclaw-copy-paste-integration
npm run test:openclaw-computer-use-loop
npm run test:openclaw-developer-journey
npm run verify:openclaw-severe-proof
npm run test:openclaw-severe-proof
npm run verify:openclaw-severe-preflight
npm run test:openclaw-severe-preflight
npm run test:openclaw-kit
npm run test:openclaw-kit:e2e
npm run verify:openclaw-workbench
npm run verify:openclaw-workspace-surface
npm run test:openclaw-workspace-surface
```

Live receipt output includes `developer_route` and `developer_next_step` alongside `receipt_recommended_next_step`. A `proceed` receipt only becomes `ready_for_developer_owned_execution` when delegated authority is Registry-backed and ready. Public demo refs that are only developer-supplied route to `hold_for_registry_backed_authority`.

Inspect the preflight adapter release candidate:

```bash
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

The 5-minute receipt demo at `run-five-minute-receipt-demo.mjs` is the fastest OpenClaw-style adoption proof. It routes three high-signal local-agent moments through the preflight adapter shape: sending a customer message, deleting a local file, and publishing a package. Read [`docs/openclaw-five-minute-receipt-demo.md`](../../docs/openclaw-five-minute-receipt-demo.md) for the install-to-proof path and clean-consumer verifier.

The copy-paste integration at `run-copy-paste-agent-integration.mjs` shows the exact `guardToolCall(toolCall)` pattern developers can place before local tool execution. It covers `message.send`, `file.delete`, and `package.publish`, keeps execution attempted as `false` until the route is ready, and is documented in [`docs/openclaw-copy-paste-agent-integration.md`](../../docs/openclaw-copy-paste-agent-integration.md).

The generic computer-use agent loop at `integrations/computer-use-agent-loop.mjs` shows the runtime loop pausing before `message.send`, `file.delete`, and `package.publish`. It is documented in [`docs/openclaw-computer-use-agent-loop.md`](../../docs/openclaw-computer-use-agent-loop.md).

The developer journey proof at `run-developer-journey-proof.mjs` is the one-command local adoption path. It generates the workbench, dry-runs all refs-only fixtures, dry-runs the preflight adapter, runs the verifiers, and runs the local test suite. Read [`docs/openclaw-developer-journey.md`](../../docs/openclaw-developer-journey.md) for the clone-to-confidence path.

The Near-Miss Workbench at `near-miss-workbench/scenarios.json` generates `artifacts/openclaw-near-miss-workbench/report.html` for three severe local developer journeys: customer data exfiltration, production deployment, and expired delegated authority. The visual report shows the agent intent, what Neura catches, the receipt route, and the developer-owned next step. It is a safe local projection; no real email, browser submit, file delete, shell command, deployment, token issuance, or downstream execution occurs.

The committed GitHub preview assets live in `docs/assets/openclaw-near-miss-workbench/`; regenerate the local report with `npm run openclaw:workbench` before replacing them.

The Workspace Decision Receipt Surface at `workspace-surface/scenarios.json` generates `artifacts/openclaw-workspace-decision-surface/report.html` for persistent workspace actions: generated app deploys, artifact publishing, scheduled crons, workflow monitor interventions, session memory writes, browser direct-control submits, and shell/file operations. It shows the proposed workspace action, Authority Decision Engine posture, receipt route, readiness path, and developer-owned next step. It is safe local projection only; no generated app, artifact, cron, workflow, memory, browser, shell, or file action is executed.

The Severe Scenario Proof Pack at `severe-scenario-proof/scenario.json` generates `artifacts/openclaw-severe-scenario-proof/report.html` for one five-checkpoint computer-use incident: customer data export, external browser submit, completion message, file deletion, and workflow close. It shows the agent intent, each receipt route, what Neura catches, and the developer-owned next step. It is safe local projection only; no real data export, browser submit, message send, file delete, workflow transition, credential issuance, or downstream execution occurs.

The Severe Preflight Queue at `run-severe-preflight-queue.mjs` generates `artifacts/openclaw-severe-preflight-queue/transcript.html` for the same incident using the existing `adapter.beforeAction(preflightAction)` path. It shows each preflight action, generated Action Card, adapter route, projected or live receipt route, and execution attempted as `false`. It is safe local projection by default; `--live` requests Relay receipts without local computer-use execution.

The `preflight-adapter` folder adds the npm-published `beforeAction(preflightAction)` stable package for local autonomous computer-use runtimes: `@neurarelay/openclaw-preflight-adapter@0.1.0` under the `latest` tag. The old `rc` tag remains available only for release-candidate history. It is not submitted, listed, approved, or partnered by OpenClaw / ClawHub.
