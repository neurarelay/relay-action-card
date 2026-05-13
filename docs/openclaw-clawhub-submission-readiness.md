# OpenClaw / ClawHub Submission Readiness Packet

Status: approval-ready packet; no OpenClaw / ClawHub submission has been performed
Date: 2026-05-12

This is the final Development packet Roman can review before any official OpenClaw / ClawHub submission or package publication action.

## Current External Gate

Publisher access is requested in GitHub issue `openclaw/clawhub#2190`:

`https://github.com/openclaw/clawhub/issues/2190`

Current truth: the package is published on npm as `@neurarelay/openclaw-preflight-adapter@0.1.0`, but it is not published/listed/approved on ClawHub. The issue only asks ClawHub/OpenClaw for publisher namespace access; it does not imply endorsement, listing, approval, or partnership.

If ClawHub publisher access remains blocked, the fallback path is founder-led publication under Roman's established publisher handle while preserving Neura branding and source attribution:

- ClawHub package: `@rpelevin/neura-relay-preflight-adapter`
- Display name: `Neura Relay Preflight Adapter`
- Source repo/path: `neurarelay/relay-action-card`, `examples/openclaw/preflight-adapter`
- Canonical npm package remains: `@neurarelay/openclaw-preflight-adapter@0.1.0`
- `openclaw/clawhub#2190` remains open as the request to gain/transfer the canonical `@neurarelay` publisher namespace

This fallback is not an OpenClaw / ClawHub approval, listing, endorsement, partnership, or official integration claim.

## Package

| Field | Value |
| --- | --- |
| Package | `@neurarelay/openclaw-preflight-adapter` |
| Version | `0.1.0` |
| npm install | `npm install @neurarelay/openclaw-preflight-adapter` |
| npm tags | `latest=0.1.0`; `rc=0.1.0-rc.2` retained for release-candidate history |
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
| GitHub README | Shows `@neurarelay/openclaw-preflight-adapter@0.1.0`, stable npm install, and no official OpenClaw / ClawHub claim |
| GitHub package folder | Shows `0.1.0`, `Install From npm`, stable npm install, and developer-owned execution |
| GitHub release `v0.1.6-openclaw-action-receipt-kit` | Describes `0.1.0` and states the no-official-claim boundary |
| npm registry | `version=0.1.0`, `latest=0.1.0`, `rc=0.1.0-rc.2` |
| npm package README | Contains current version, `Install From npm`, stable npm install, and no official OpenClaw / ClawHub claim |

## Verification Commands

Run from the repository root using Node `24`:

```bash
nvm use
npm ci
npm run verify:openclaw-clawhub-release
npm run verify:openclaw-founder-clawhub-publisher
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
- package install succeeds from npm `latest`
- imported package reports `0.1.0`
- dry-run route remains `relay_receipt_required_before_execution`
- developer-owned execution is preserved
- no private payload is returned
- no official OpenClaw / ClawHub claim appears

## One-Command Release Gate

The strongest local readiness proof is:

```bash
nvm use
npm run verify:openclaw-clawhub-release
```

This gate verifies package metadata, npm pack contents, clean npm consumer install, refs-only preflight conversion, unit coverage, live Relay Decision Receipt output, OpenClaw runtime loading, local ClawHub packaging, exact ClawHub publish dry-run metadata, and forbidden-claim boundaries.

The gate may run the ClawHub dry-run command, but it does not publish the package. It should still be rerun immediately after ClawHub grants publisher access and before any real publish command.

Founder-publisher fallback dry-run:

```bash
nvm use
npm run verify:openclaw-founder-clawhub-publisher
```

This packs the exact adapter tarball and dry-runs a ClawHub package publish as `@rpelevin/neura-relay-preflight-adapter`, with the display name `Neura Relay Preflight Adapter` and source attribution to `neurarelay/relay-action-card`. It does not upload or publish.

## Submission Action

Do not run either command without Roman's exact approval for the destination, metadata, and public copy.

Dry-run command:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter --dry-run --json
```

Publish command:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
```

Founder-publisher fallback dry-run command shape:

```bash
npm pack examples/openclaw/preflight-adapter --pack-destination /tmp/neura-openclaw-pack --json
clawhub package publish /tmp/neura-openclaw-pack/neurarelay-openclaw-preflight-adapter-0.1.0.tgz --family code-plugin --owner rpelevin --name @rpelevin/neura-relay-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-commit <current-commit> --source-ref main --source-path examples/openclaw/preflight-adapter --dry-run --json
```

Founder-publisher fallback publish command shape, only after Roman's exact approval:

```bash
clawhub package publish /tmp/neura-openclaw-pack/neurarelay-openclaw-preflight-adapter-0.1.0.tgz --family code-plugin --owner rpelevin --name @rpelevin/neura-relay-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-commit <current-commit> --source-ref main --source-path examples/openclaw/preflight-adapter
```

Post-publish install check:

```bash
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.0
openclaw plugins inspect neura-relay-preflight-adapter --runtime --json
```

Founder-publisher fallback post-publish install check:

```bash
openclaw plugins install clawhub:@rpelevin/neura-relay-preflight-adapter@0.1.0
openclaw plugins inspect neura-relay-preflight-adapter --runtime --json
```

## Public-Safe Copy

Short description:

```text
Neura Relay Preflight Adapter returns a Decision Receipt before local autonomous computer-use actions execute.
```

Long description:

```text
Neura Relay Preflight Adapter is an OpenClaw-style plugin surface for developers who want a Decision Receipt before local autonomous computer-use actions execute. It converts refs-only preflight actions into Action Cards, calls Neura Relay, and returns a route such as proceed, revise, human review, or stop. The developer runtime keeps execution ownership.
```

## Claim Boundaries

Allowed:

- stable npm package is published
- public GitHub examples are available
- package is shaped for OpenClaw / ClawHub plugin publication
- local runtime proof passed with OpenClaw `2026.5.7`
- ClawHub `0.15.0` dry-run proof passed
- developers can use `npm install @neurarelay/openclaw-preflight-adapter`

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
Approved: run ClawHub dry-run only for @neurarelay/openclaw-preflight-adapter@0.1.0.
```

```text
Approved: publish @neurarelay/openclaw-preflight-adapter@0.1.0 to ClawHub with the public-safe copy in docs/openclaw-clawhub-submission-readiness.md.
```

```text
Approved: publish @rpelevin/neura-relay-preflight-adapter@0.1.0 to ClawHub as the founder-publisher fallback, with source attribution to neurarelay/relay-action-card and no official OpenClaw / ClawHub claim.
```

Any other destination, package name, version, description, tags, or provider claim requires a new approval pass.
