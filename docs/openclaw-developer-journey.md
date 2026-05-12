# OpenClaw Developer Journey Proof

Status: local developer journey proof; not submitted, published, listed, approved, or partnered by OpenClaw or ClawHub.

This is the fastest way for an autonomous computer-use developer to understand the Neura pattern end to end:

```text
Local agent action -> Action Card -> Relay Decision Receipt -> developer-owned route
```

It shows the problem before integration work starts: an agent is about to send data, change files, submit a browser action, run a command, change workflow state, write memory, or export data. Neura gives the developer a Decision Receipt before that action becomes real.

## Clone To Confidence

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
npm install
npm run openclaw:proof
```

The proof generates and verifies the local OpenClaw-style journey:

- visual near-miss workbench
- eight refs-only Action Card fixtures
- preflight adapter dry run
- claim-boundary verifiers
- unit tests for the kit, workbench, and adapter

Open the generated visual report:

```text
artifacts/openclaw-near-miss-workbench/report.html
```

The report is the developer-facing moment:

- what the agent was about to do
- what Neura caught
- the receipt route
- the developer-owned next step

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

The developer then sees the reusable integration surfaces:

- `examples/openclaw/action-cards`: refs-only Action Card fixtures for common local actions
- `skills/openclaw`: example skills for drafting and reviewing receipt-ready actions
- `examples/openclaw/preflight-adapter`: `beforeAction(preflightAction)` release candidate for local runtimes
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
