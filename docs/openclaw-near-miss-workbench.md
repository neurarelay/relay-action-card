# OpenClaw Near-Miss Workbench v0.1

Status: local visual workbench; not submitted or published
Date: 2026-05-12

The Near-Miss Workbench is the pre-publication developer-journey proof for the OpenClaw-style receipt lane. It turns the abstract Action Card pattern into three severe autonomous-agent incidents that any AI agent developer can recognize immediately.

The generated HTML report is a local visual proof surface. Each journey shows what the agent was about to do, what Neura caught, the Decision Receipt route, and the developer-owned next step before any real execution occurs.

![OpenClaw Near-Miss Workbench desktop preview](assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png)

```text
proposed action -> Action Card -> Decision Receipt -> developer-owned execution
```

This is a safe local projection. It does not send email, submit browser forms, delete real files, run shell commands, deploy software, issue tokens, or execute downstream actions by Neura.

## Journeys

| Journey | Severe problem | What the receipt prevents |
| --- | --- | --- |
| Customer Data Exfiltration Near-Miss | An agent tries to export customer data and submit it externally while resolving support. | Customer-data leakage before export or browser submit. |
| Production Deployment Near-Miss | A coding agent tries to migrate and deploy production without enough release authority. | Production damage before migration or deploy. |
| Expired Delegated Authority Near-Miss | An agent acts on yesterday's authority after delegation expired. | Stale authority silently becoming execution permission. |

## Run

```bash
npm run openclaw:workbench
```

The command generates:

```text
artifacts/openclaw-near-miss-workbench/report.html
artifacts/openclaw-near-miss-workbench/report.md
artifacts/openclaw-near-miss-workbench/report.json
```

Open the HTML report locally to review the developer journey. The generated artifacts are ignored by git so screenshots and local reports can be regenerated without changing the repository.

The first viewport is intentionally demo-oriented: it starts with the receipt path, the three flagship near misses, and the decision mix before expanding into the step-by-step receipt projections.

The committed preview assets live in `docs/assets/openclaw-near-miss-workbench/` so the GitHub README carries the visual proof before a developer runs the local workbench.

## Verify

```bash
npm run verify:openclaw-workbench
npm run test:openclaw-workbench
```

The verifier checks that:

- all three flagship journeys exist
- the report contains proceed, human review, revise, and stop routes
- every action is refs-only
- no real email, browser submit, file delete, shell command, or deployment execution is enabled
- no official OpenClaw / ClawHub listing, approval, partnership, or provider claim is made

## Boundary

This workbench is stronger than a fixture pack because it shows the developer why receipts matter. It is still not an official OpenClaw or ClawHub integration, listing, approval, publication, partnership, or endorsement.
