# OpenClaw Action Receipt Kit

Status: local release candidate example kit
Date: 2026-05-12

This document covers the OpenClaw Action Receipt Pack v0.1 and the runnable Action Receipt Kit that ships with it. The kit shows how an OpenClaw-style autonomous computer-use agent can create a Neura Action Card before messages, file changes, browser submits, shell commands, workflow changes, memory writes, or data exports execute.

```text
proposed local agent action -> Action Card -> Relay Decision Receipt -> user or runtime-owned execution
```

For the full local developer journey, see `docs/openclaw-developer-journey.md`. For the visual near-miss report alone, see `docs/openclaw-near-miss-workbench.md`. For the persistent workspace receipt surface, see `docs/openclaw-os-decision-receipt-surface.md`.

![OpenClaw Near-Miss Workbench visual proof](assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png)

This is not an official OpenClaw, ClawHub, OpenAI, Codex, Anthropic, Claude, MCP, or A2A integration, listing, approval, or partnership. It is a public-safe examples pack for developers who want a Decision Receipt before an agent changes state.

## Pack Contents

| Surface | Purpose |
| --- | --- |
| `skills/openclaw/neura-relay-core` | Single core workflow for OpenClaw-style agents, including package/publisher actions and receipt interpretation |
| `skills/openclaw/neura-action-card` | Draft a refs-only Action Card for an OpenClaw-style tool or channel action |
| `skills/openclaw/neura-before-send` | Review outbound message actions before channel delivery |
| `skills/openclaw/neura-file-change-review` | Review file edit and delete actions before local file changes |
| `skills/openclaw/neura-browser-action-review` | Review browser form submits and web state changes before dispatch |
| `skills/openclaw/neura-shell-command-review` | Review shell commands before local runtime execution |
| `skills/openclaw/neura-memory-write-review` | Review persistent memory writes before storage |
| `skills/openclaw/neura-data-export-review` | Review data exports before content leaves the workspace |
| `examples/openclaw/action-cards` | Public-safe Action Card fixtures for common autonomous computer-use actions |
| `examples/openclaw/action-receipt-kit.manifest.json` | Machine-readable kit manifest, boundaries, example list, and one-command entrypoints |
| `examples/openclaw/run-developer-journey-proof.mjs` | One-command clone-to-confidence proof for the workbench, dry-run fixtures, preflight adapter, verifiers, and local tests |
| `examples/openclaw/run-action-receipt-kit.mjs` | Dry-run and live receipt runner |
| `examples/openclaw/run-near-miss-workbench.mjs` | Local visual report generator for severe near-miss journeys |
| `examples/openclaw/near-miss-workbench/scenarios.json` | Three flagship near-miss journeys for data exfiltration, production deployment, and expired authority |
| `examples/openclaw/run-workspace-decision-surface.mjs` | Local workspace-style visual report generator for persistent workspace actions |
| `examples/openclaw/workspace-surface/scenarios.json` | Generated app, artifact, cron, workflow monitor, memory, browser direct-control, and shell/file receipt scenarios |
| `scripts/verify-openclaw-action-receipt-kit.mjs` | Public-safe verifier for docs, fixtures, skills, runner, and boundaries |
| `scripts/verify-openclaw-developer-journey.mjs` | Verifier for the one-command developer journey proof |
| `scripts/verify-openclaw-near-miss-workbench.mjs` | Verifier for the local visual workbench and no-real-execution boundaries |
| `scripts/verify-openclaw-workspace-surface.mjs` | Verifier for the workspace Decision Receipt surface and no-real-execution boundaries |
| `tests/openclaw-action-receipt-kit.test.mjs` | Unit tests for manifest, refs-only fixtures, aliases, docs, and dry-run output |
| `tests/openclaw-developer-journey.test.mjs` | Unit tests for the clone-to-confidence command and docs |
| `tests/openclaw-workspace-surface.test.mjs` | Unit tests for the workspace Decision Receipt surface |
| `tests/openclaw-action-receipt-kit.e2e.mjs` | Live E2E test that requests Relay Decision Receipts |
| `.github/workflows/openclaw-action-receipt-kit.yml` | CI for local contract checks plus manual live receipt proof |
| `CHANGELOG.md` | Release-candidate summary and public-safe claim boundary |
| `docs/openclaw-preflight-adapter.md` | Plugin-ready `beforeAction` adapter contract and OpenClaw-style entry example |
| `docs/openclaw-core-skill-pack.md` | Core skill pack, scenario corpus, package identity boundary, and current ClawHub community fallback truth |
| `docs/openclaw-plugin-release-candidate.md` | Package-ready OpenClaw plugin release-candidate and submission-readiness packet |

## Action Families

The kit covers eight action families:

| Family | Example file | Receipt need |
| --- | --- | --- |
| Outbound message | `send-message.json` | confirm recipient, intent, policy refs, and user approval posture |
| File edit | `edit-file.json` | confirm file ref, change request ref, and reversibility |
| File delete | `delete-file.json` | require backup/ref evidence and stronger review posture |
| Browser submit | `browser-submit.json` | confirm target form, user intent, and data refs before submit |
| Shell command | `shell-command.json` | review blast radius, environment, and command profile refs |
| Workflow state change | `workflow-state-change.json` | confirm authority, evidence, and state transition policy |
| memory write | `memory-write.json` | confirm subject intent, memory scope, retention posture, and authority before storage |
| data export | `data-export.json` | confirm privacy request, export target, and data-export policy refs before transfer |

The core skill pack also covers package and publisher actions, including package releases, package metadata updates, publisher namespace changes, and organization/public ownership changes. Those actions should include source repo, source commit, package identity, owner/publisher ref, artifact digest or pack ref, release intent, and claim-boundary refs before execution.

## How To Use

1. An agent prepares a proposed local action.
2. The matching skill drafts an Action Card using refs, not raw message bodies, file contents, form values, command strings, secrets, or customer data.
3. The developer or runtime sends the Action Card to Relay through the existing public receipt path.
4. Relay returns a Decision Receipt with decision, trace ref, transaction ref, Registry context where available, and Authority Decision Engine explanation when present.
5. The user, developer, or agent runtime decides whether to execute. Neura does not execute downstream actions.

The live runner also prints `developer_route` and `developer_next_step` alongside `receipt_recommended_next_step`. A `proceed` receipt becomes `ready_for_developer_owned_execution` only when delegated authority is Registry-backed and ready. Public demo refs that are only developer-supplied route to `hold_for_registry_backed_authority`.

Run the kit without calling Relay:

```bash
npm run openclaw:proof
npm run openclaw:workbench
npm run openclaw:workspace-proof
npm run openclaw:dry-run
npm run openclaw:dry-run -- --json
```

Request live Relay Decision Receipts:

```bash
npm run openclaw:proof -- --live
npm run openclaw:receipts
npm run openclaw:receipts -- --only=send-message --json
```

Verify the public-safe kit contract:

```bash
npm run verify:openclaw-developer-journey
npm run verify:openclaw-workbench
npm run verify:openclaw-workspace-surface
npm run verify:openclaw-core-skill-pack
npm run verify:openclaw-action-receipt-pack
npm run verify:openclaw-action-receipt-kit
```

Run the test framework:

```bash
npm run test:openclaw-developer-journey
npm run test:openclaw-kit
npm run test:openclaw-workbench
npm run test:openclaw-workspace-surface
npm run test:openclaw-kit:e2e
```

GitHub Actions runs the local contract checks automatically for relevant pull requests and pushes. The live production receipt proof runs only through manual workflow dispatch.

For runtime wiring, use the preflight adapter:

```bash
npm run openclaw:preflight:dry-run
npm run openclaw:preflight:receipt -- --json
npm run openclaw:plugin:pack:dry-run
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-plugin-rc
```

## Boundaries

This pack:

- keeps every example refs-only
- does not embed secrets, token values, private payloads, raw message content, raw file content, raw browser form values, or raw shell commands
- does not issue public API keys, public production MCP tokens, or public A2A tokens
- does not enable unprotected A2A execution
- does not execute downstream actions by Neura
- does not create Registry auto-approval
- does not claim full Authority Decision Engine completion
- does not claim official OpenClaw, ClawHub, OpenAI, Codex, Anthropic, Claude, MCP, or A2A approval
