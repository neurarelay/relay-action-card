# OpenClaw Developer Journey Proof

Status: local developer journey proof; not submitted, listed, approved, or partnered by OpenClaw or ClawHub.

This is the fastest way for an autonomous computer-use developer to understand the Neura pattern end to end:

```text
Local agent action -> Action Card -> Relay Decision Receipt -> developer-owned route
```

It shows the problem before integration work starts: an agent is about to send data, change files, submit a browser action, run a command, change workflow state, write memory, export data, or change persistent workspace state. Neura gives the developer a Decision Receipt before that action becomes real.

## Clone To Confidence

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm install
npm run openclaw:proof
```

The proof generates and verifies the local OpenClaw-style journey:

- visual near-miss workbench
- OpenClaw OS Decision Receipt Surface for generated apps, artifacts, crons, workflow monitors, memory, browser control, shell, and file operations
- Severe Scenario Proof Pack for customer account data, external vendor portal, completion update, file deletion, and workflow close
- eight refs-only Action Card fixtures
- preflight adapter dry run
- claim-boundary verifiers
- unit tests for the kit, workbench, and adapter

To generate only the workspace surface:

```bash
npm run openclaw:workspace-proof
```

To generate only the severe scenario proof:

```bash
npm run openclaw:severe-proof
```

Open the generated visual report:

```text
artifacts/openclaw-near-miss-workbench/report.html
artifacts/openclaw-workspace-decision-surface/report.html
artifacts/openclaw-severe-scenario-proof/report.html
```

The report is the developer-facing moment:

- what the agent was about to do
- what Neura caught
- the receipt route
- the developer-owned next step

The workspace surface is the second developer-facing moment:

- proposed workspace action
- Authority Decision Engine posture
- missing refs and readiness path
- Decision Receipt route
- developer-owned execution route

The severe scenario proof is the third developer-facing moment:

- one realistic autonomous flow with customer account data, external vendor portal, completion update, file deletion, and workflow close
- five checkpoints converted to refs-only Action Cards
- `human_review`, `revise`, and `stop` routes before execution
- local HTML, Markdown, JSON, verifier, and unit test proof

## Optional Live Receipt

The default proof is local and deterministic. To request live Relay Decision Receipts for one Action Card and one preflight action:

```bash
npm run openclaw:proof -- --live
```

For machine-readable proof:

```bash
npm run openclaw:proof -- --json
npm run openclaw:proof -- --live --json
```

Live proof uses public-safe demo refs and keeps execution with the developer-owned runtime.

## What The Developer Sees

The Near-Miss Workbench focuses on three severe incidents:

| Incident | What the agent almost did | What the receipt prevents |
| --- | --- | --- |
| Customer data exfiltration | Export customer data and submit it externally during support work | Data leakage before export or browser submit |
| Production deployment | Run a migration and deploy without enough release authority | Production damage before command or deploy |
| Expired delegated authority | Act on yesterday's permission after delegation expired | Stale authority silently becoming execution permission |

The OpenClaw OS Decision Receipt Surface focuses on persistent workspace controls:

| Surface | What the agent wants to do | What the receipt shows |
| --- | --- | --- |
| Generated app | Deploy generated customer portal from preview to production | Missing release, security, and rollback refs |
| Artifact | Publish an analysis bundle externally | Human review before external publication |
| Cron | Schedule recurring production reconciliation | Required runbook, owner, rollback, and schedule refs |
| Workflow monitor | Move a stuck case to human review | Ready path for reversible review routing |
| Session memory | Persist durable memory from session notes | Revision needed for user confirmation and retention refs |
| Browser direct control | Submit a vendor account-change form | Stop before external browser submit |
| Shell and file | Apply a generated cleanup plan | Human review before file changes |

The developer then sees the reusable integration surfaces:

- `examples/openclaw/action-cards`: refs-only Action Card fixtures for common local actions
- `skills/openclaw`: example skills for drafting and reviewing receipt-ready actions
- `examples/openclaw/preflight-adapter`: `beforeAction(preflightAction)` release candidate for local runtimes
- `examples/openclaw/workspace-surface`: workspace-style receipt scenarios for generated apps, artifacts, crons, workflow monitors, memory, browser control, shell, and file operations
- `examples/openclaw/severe-scenario-proof`: severe scenario proof for customer data export, external browser submit, messaging, file deletion, and workflow close
- `docs/openclaw-os-decision-receipt-surface.md`: workspace-surface report and boundaries
- `docs/openclaw-severe-scenario-proof-pack.md`: severe end-to-end scenario proof and boundaries
- `docs/openclaw-preflight-adapter.md`: adapter contract and packaging notes
- `docs/openclaw-plugin-release-candidate.md`: package-ready release-candidate packet

## Integration Shape

Use the preflight adapter before local runtime execution:

```text
beforeAction(preflightAction)
  -> refs-only Action Card
  -> Relay Decision Receipt
  -> proceed | revise | human_review | stop
  -> developer-owned execution decision
```

The developer runtime remains responsible for user approval, local policy, private payloads, storage, and final downstream execution.

## Boundaries

This proof does not create or claim:

- official OpenClaw or ClawHub integration, listing, approval, publication, partnership, or endorsement
- public API-key issuance
- public production MCP token issuance
- public A2A token issuance
- unprotected A2A execution
- downstream execution by Neura
- private payload exposure
- Registry auto-approval

It is a public-safe proof that a developer can clone, run, inspect, and adapt before any consequential local action executes.
