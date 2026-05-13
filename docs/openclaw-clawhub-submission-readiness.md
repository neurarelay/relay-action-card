# OpenClaw / ClawHub Submission Readiness Packet

Status: approval-ready packet; no OpenClaw / ClawHub submission has been performed
Date: 2026-05-12

This is the final Development packet Roman can review before any official OpenClaw / ClawHub submission or package publication action.

## Package

| Field | Value |
| --- | --- |
| Package | `@neurarelay/openclaw-preflight-adapter` |
| Version | `0.1.0-rc.2` |
| npm install | `npm install @neurarelay/openclaw-preflight-adapter@rc` |
| npm tags | `rc=0.1.0-rc.2`; `latest=0.1.0-rc.2` until a stable package exists |
| Source repo | `neurarelay/relay-action-card` |
| Source path | `examples/openclaw/preflight-adapter` |
| Package family | `code-plugin` |
| Display name | `Neura Relay Preflight Adapter` |
| Runtime tool | `neura_relay_preflight_action` |
| OpenClaw compatibility floor | `>=2026.3.24-beta.2` |
| Node runtime floor | `>=22.14.0`; repo-pinned Node `24` |

## What It Does

The adapter gives autonomous computer-use runtimes a pre-action Decision Receipt before local actions execute.

```text
beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route
```

It converts a refs-only proposed local action into an Action Card, calls Neura Relay when live mode is used, and returns a route such as `ready_for_developer_owned_execution`, `hold_for_registry_backed_authority`, `route_to_human_review_before_execution`, `revise_action_card_before_execution`, or `stop_before_execution`.

Neura does not execute the downstream action. The developer runtime keeps execution ownership.

## Source Alignment

The current public OpenClaw / ClawHub docs support this release shape:

- `https://docs.openclaw.ai/plugins/manifest`: native OpenClaw plugins ship `openclaw.plugin.json`; the manifest is pre-runtime metadata, not package entrypoint metadata.
- `https://docs.openclaw.ai/plugins/building-plugins`: package `openclaw.extensions`, compatibility metadata, build metadata, and `register(api)` tool registration shape the native plugin path.
- `https://documentation.openclaw.ai/clawhub`: ClawHub installs plugins with `openclaw plugins install clawhub:<package>` and publishes packages with `clawhub package publish <source>`; `--dry-run` builds a publish plan without upload.

## Public Surfaces Checked

| Surface | Expected Truth |
| --- | --- |
| GitHub README | Shows `@neurarelay/openclaw-preflight-adapter@0.1.0-rc.2`, explicit `@rc` install, and no official OpenClaw / ClawHub claim |
| GitHub package folder | Shows `0.1.0-rc.2`, `Install From npm`, explicit `@rc`, and developer-owned execution |
| GitHub release `v0.1.6-openclaw-action-receipt-kit` | Describes `0.1.0-rc.2` and states the no-official-claim boundary |
| npm registry | `version=0.1.0-rc.2`, `rc=0.1.0-rc.2`, `latest=0.1.0-rc.2` until stable |
| npm package README | Contains current version, `Install From npm`, explicit `@rc`, and no official OpenClaw / ClawHub claim |

## Verification Commands

Run from the repository root using Node `24`:

```bash
nvm use
npm ci
npm run verify:openclaw-submission-readiness
npm run verify:openclaw-npm-package
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-plugin-rc
npm run verify:openclaw-runtime-approval
npm run test:openclaw-preflight-adapter
npm run openclaw:plugin:pack:dry-run
npm run openclaw:preflight:dry-run -- --json
```

Optional live proof:

```bash
npm run test:openclaw-preflight-adapter:e2e
npm run openclaw:preflight:receipt -- --json
```

## Fresh Public-User Install Test

This is the zero-state external developer check:

```bash
tmpdir="$(mktemp -d)"
cd "$tmpdir"
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
nvm use
npm ci
npm run verify:openclaw-npm-package
npm run openclaw:proof -- --json
```

Expected result:

- clean clone succeeds from public GitHub
- package install succeeds from npm `@rc`
- imported package reports `0.1.0-rc.2`
- dry-run route remains `relay_receipt_required_before_execution`
- developer-owned execution is preserved
- no private payload is returned
- no official OpenClaw / ClawHub claim appears

## Submission Action

Do not run either command without Roman's exact approval for the destination, metadata, and public copy.

Dry-run command:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0-rc.2 --tags rc --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter --dry-run --json
```

Publish command:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0-rc.2 --tags rc --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
```

Post-publish install check:

```bash
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.0-rc.2
openclaw plugins inspect neura-relay-preflight-adapter --runtime --json
```

## Public-Safe Copy

Short description:

```text
Neura Relay Preflight Adapter returns a Decision Receipt before local autonomous computer-use actions execute.
```

Long description:

```text
Neura Relay Preflight Adapter is a release-candidate OpenClaw-style plugin surface for developers who want a Decision Receipt before local autonomous computer-use actions execute. It converts refs-only preflight actions into Action Cards, calls Neura Relay, and returns a route such as proceed, revise, human review, or stop. The developer runtime keeps execution ownership.
```

## Claim Boundaries

Allowed:

- npm release candidate is published
- public GitHub examples are available
- package is shaped for OpenClaw / ClawHub plugin publication
- local runtime proof passed with OpenClaw `2026.5.7`
- ClawHub `0.15.0` dry-run proof passed
- developers should use `@rc` until a stable package exists

Not allowed:

- no official OpenClaw / ClawHub integration claim
- no OpenClaw / ClawHub listing claim
- no OpenClaw / ClawHub approval claim
- no OpenClaw / ClawHub partnership or endorsement claim
- no provider approval/listing/partnership claim
- no full Authority Decision Engine completion claim
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no downstream execution by Neura
- no private payload exposure
- no Registry auto-approval

## Roman Approval Decision

Before any official submission or publication, Roman should approve one of these exact decisions:

```text
Approved: run ClawHub dry-run only for @neurarelay/openclaw-preflight-adapter@0.1.0-rc.2.
```

```text
Approved: publish @neurarelay/openclaw-preflight-adapter@0.1.0-rc.2 to ClawHub with the public-safe copy in docs/openclaw-clawhub-submission-readiness.md.
```

Any other destination, package name, version, description, tags, or provider claim requires a new approval pass.
