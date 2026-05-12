# OpenClaw OS Decision Receipt Surface v0.1

Status: local workspace-surface proof; not submitted, published, listed, approved, or partnered by OpenClaw OS, OpenUI, OpenClaw, or ClawHub.

This is not an official OpenClaw OS, OpenUI, OpenClaw, or ClawHub integration, listing, approval, publication, partnership, or endorsement.

This proof shows how Neura receipts can sit beside persistent autonomous workspace actions before those actions change state.

```text
Persistent workspace action -> Action Card -> Authority Decision Engine posture -> Decision Receipt -> developer-owned execution
```

It is the workspace-shaped counterpart to the Near-Miss Workbench. The goal is not to claim Neura is an AI operating system, workspace shell, OpenUI surface, or official OpenClaw integration. The goal is to make the receipt moment visually obvious for generated apps, artifacts, crons, workflow monitors, memory, browser control, shell, and file operations.

## Run

```bash
npm run openclaw:workspace-proof
npm run verify:openclaw-workspace-surface
npm run test:openclaw-workspace-surface
```

Open the generated report:

```text
artifacts/openclaw-workspace-decision-surface/report.html
```

For machine-readable output:

```bash
npm run openclaw:workspace-proof -- --json
```

## What It Shows

| Workspace surface | Proposed action | Receipt route |
| --- | --- | --- |
| Generated app | Deploy generated customer portal from preview to production | Stop before execution |
| Artifact | Publish analysis bundle to external shared folder | Human review |
| Cron | Schedule recurring production reconciliation job | Revise |
| Workflow monitor | Move stuck case from auto-processing to human review | Proceed |
| Session memory | Persist durable workspace memory from session note | Revise |
| Browser direct control | Submit vendor account-change form | Stop before execution |
| Shell and file | Apply generated cleanup plan to workspace files | Human review |

For each proposed action, the local report shows:

- proposed workspace action
- refs-only Action Card shape
- Authority Decision Engine posture
- missing refs
- Decision Receipt route
- readiness path
- developer-owned next step

## Why This Matters

Autonomous workspace products make agent work visible, but visibility is not governance. Neura adds a receipt before the workspace crosses from planning into state change:

```text
generated app / artifact / cron / monitor / memory / browser / shell-file action
  -> receipt posture
  -> proceed | revise | human_review | stop
  -> runtime-owned execution decision
```

This gives developers a copyable pattern for placing a Decision Receipt beside every consequential workspace control.

## Boundaries

This proof does not create or claim:

- official OpenClaw OS, OpenUI, OpenClaw, or ClawHub integration, listing, approval, publication, partnership, or endorsement
- public API-key issuance
- public production MCP token issuance
- public A2A token issuance
- unprotected A2A execution
- downstream execution by Neura
- private payload exposure
- Registry auto-approval
- real generated app deployment
- real artifact publication
- real cron scheduling
- real workflow transition
- real memory write
- real browser submit
- real shell or file execution

It is a safe local projection that developers can inspect before adapting the receipt pattern to their own runtime.
