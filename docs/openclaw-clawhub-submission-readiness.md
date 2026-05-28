# OpenClaw / ClawHub Submission Readiness Packet

Status: canonical `@neurarelay` package `0.1.4` published on npm latest and ClawHub community; ClawHub audits pending; founder-publisher fallback remains published; no official OpenClaw / ClawHub approval or listing claim
Date: 2026-05-28

This is the current Development packet for the ClawHub and npm publication path. Roman approved the founder-publisher fallback on May 13, 2026, and the community package remains published under `@rpelevin`. On May 18, the canonical `@neurarelay` publisher login became available, but the direct `0.1.1` canonical ClawHub publish was blocked because the fallback already claimed plugin id `neura-relay-preflight-adapter`. Roman then approved the canonical `0.1.3` metadata repair release using the distinct plugin id `neurarelay-openclaw-preflight-adapter`, followed by the `0.1.4` README-only polish release. On May 28, 2026, Roman approved npm publication and `@neurarelay/openclaw-preflight-adapter@0.1.4` was published to npm `latest` through Trusted Publishing.

## Current External Gate

The related ClawHub issue remains the public request/history thread:

`https://github.com/openclaw/clawhub/issues/2190`

Current truth: npm latest is `@neurarelay/openclaw-preflight-adapter@0.1.4`; the canonical ClawHub community package is published from source as `@neurarelay/openclaw-preflight-adapter@0.1.4`; and the founder-publisher fallback remains published to ClawHub's community channel as `@rpelevin/neura-relay-preflight-adapter@0.1.1`. None of this implies endorsement, official listing, official approval, or partnership.

The fallback path remains founder-led publication under Roman's established publisher handle while preserving Neura branding and source attribution:

- ClawHub package: `@rpelevin/neura-relay-preflight-adapter`
- Display name: `Neura Relay Preflight Adapter`
- Source repo/path: `neurarelay/relay-action-card`, `examples/openclaw/preflight-adapter`
- Current ClawHub fallback version: `0.1.1`
- Current ClawHub source commit: `794f1d8c5088312b99806fe61b5ae2eddb724723`
- Current ClawHub release id: `rd75hckdpqz0bxee3g8e18g18s86ncm2`
- Current ClawHub artifact SHA-256: `f6b9e10753110b303d0ef4d69dc99671f1b2556020cf07b8a2ac9bab7d9fb9ea`
- Canonical ClawHub community package is published as: `@neurarelay/openclaw-preflight-adapter@0.1.4`
- Canonical ClawHub plugin id is: `neurarelay-openclaw-preflight-adapter`
- The canonical package preserves the distinct plugin id and uses `latest,stable` tags so ClawHub exposes a current version/readme surface
- npm latest is `@neurarelay/openclaw-preflight-adapter@0.1.4`
- Package-level ClawHub indexing reports security audits pending while ClawScan and VirusTotal complete. Version `0.1.4` is source-linked, README-visible, static-scan clean, tagged `latest,stable`, and exposes `toolNames=["neura_relay_preflight_action"]`.

These ClawHub packages are community publications only. They are not OpenClaw / ClawHub official approvals, official listings, endorsements, partnerships, or official integration claims.

## Package

| Field | Value |
| --- | --- |
| Package | `@neurarelay/openclaw-preflight-adapter` |
| Version | `0.1.4` for npm latest and the canonical ClawHub community package |
| npm install | `npm install @neurarelay/openclaw-preflight-adapter` |
| npm tags | `latest=0.1.4`; `rc=0.1.0-rc.2` |
| Source repo | `neurarelay/relay-action-card` |
| Source path | `examples/openclaw/preflight-adapter` |
| Package family | `code-plugin` |
| Display name | `Neura Relay Preflight Adapter` |
| Plugin id | `neurarelay-openclaw-preflight-adapter` |
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
| GitHub README | Shows canonical npm and ClawHub `@neurarelay/openclaw-preflight-adapter@0.1.4`, the historical fallback package, and no official OpenClaw / ClawHub claim |
| GitHub package folder | Shows `0.1.4`, distinct plugin id, stable npm install path, and developer-owned execution |
| GitHub release `v0.1.6-openclaw-action-receipt-kit` | Describes `0.1.0` and states the no-official-claim boundary |
| npm registry | `version=0.1.4`, `latest=0.1.4`, `rc=0.1.0-rc.2` |
| npm package README | Contains current version, `Install From npm`, stable npm install, and no official OpenClaw / ClawHub claim |
| Canonical ClawHub community package | `@neurarelay/openclaw-preflight-adapter@0.1.4`; community channel; `isOfficial=false`; README visible; current version `v0.1.4`; tags `latest=0.1.4`, `stable=0.1.4`; `toolNames=["neura_relay_preflight_action"]`; static analysis pass; ClawScan and VirusTotal pending |
| Historical ClawHub community fallback | `@rpelevin/neura-relay-preflight-adapter@0.1.1`; community channel; `isOfficial=false`; source-linked to `neurarelay/relay-action-card@794f1d8c5088312b99806fe61b5ae2eddb724723`; README fetchable; `toolNames=["neura_relay_preflight_action"]`; static/LLM/VirusTotal clean; package-level `scanStatus=pending`; `latestVersion=null` |

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
- imported package reports `0.1.4`
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

This gate verifies package metadata, npm pack contents, clean local package consumer install, refs-only preflight conversion, unit coverage, live Relay Decision Receipt output, OpenClaw runtime loading, local ClawHub packaging, exact ClawHub publish dry-run metadata, and forbidden-claim boundaries.

The gate may run the ClawHub dry-run command, but it does not publish the package. It should still be rerun immediately before any further package-version, README, metadata, or public-copy release.

Founder-publisher fallback dry-run:

```bash
nvm use
npm run verify:openclaw-founder-clawhub-publisher
```

This creates a ClawHub-specific temporary tarball whose `package.json` name is `@rpelevin/neura-relay-preflight-adapter`, preserves `neura.canonicalNpmPackage=@neurarelay/openclaw-preflight-adapter@0.1.4`, and dry-runs a ClawHub package publish with the display name `Neura Relay Preflight Adapter` and source attribution to `neurarelay/relay-action-card`. It does not upload or publish.

## Canonical Publication Record

Roman approved the canonical `0.1.3` ClawHub community package publication on May 18, 2026:

```text
Approved: prepare, commit, push, and publish a ClawHub metadata repair release @neurarelay/openclaw-preflight-adapter@0.1.3 with tags latest,stable, using the same source path examples/openclaw/preflight-adapter, plugin id neurarelay-openclaw-preflight-adapter, owner @neurarelay, display name "Neura Relay Preflight Adapter", family code-plugin, source repo neurarelay/relay-action-card, with no functional behavior changes, no npm publish, no official OpenClaw or ClawHub approval/listing/integration/partnership claim, and leave @rpelevin/neura-relay-preflight-adapter untouched.
```

Publish result:

```json
{
  "name": "@neurarelay/openclaw-preflight-adapter",
  "displayName": "Neura Relay Preflight Adapter",
  "family": "code-plugin",
  "version": "0.1.3",
  "commit": "4d4e6730ada58e1589ac2c84c9411c58eabe10a7",
  "files": 6,
  "releaseId": "rd72j7xj1e8y2tajcf4h21k9v586z1tw",
  "artifactSha256": "9e0df97f7d2e1e44a4d2c30d785a91ed1792219eddb0bfbec06af0a37a8f3eae"
}
```

Current visible ClawHub state:

- package URL: `https://clawhub.ai/plugins/@neurarelay/openclaw-preflight-adapter`
- current version: `v0.1.4`
- tags: `latest 0.1.4`, `stable 0.1.4`
- README visible
- install command visible: `openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter`
- audits: ClawScan pending, Static analysis pass, VirusTotal pending
- publisher note saved and rescan started on May 18, 2026

Do not run a further publish command without Roman's exact approval for the destination, metadata, and public copy.

Current README-polish publish command:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.4 --tags latest,stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
```

Historical publish command:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.3 --tags latest,stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
```

Historical founder-publisher fallback `0.1.0` dry-run command shape:

```bash
tmpdir="$(mktemp -d)"
cp -R examples/openclaw/preflight-adapter "$tmpdir/founder-preflight-adapter"
node -e 'const fs=require("fs"); const p=process.argv[1]; const pkg=JSON.parse(fs.readFileSync(p,"utf8")); pkg.name="@rpelevin/neura-relay-preflight-adapter"; pkg.openclaw.install.npmSpec="@rpelevin/neura-relay-preflight-adapter@0.1.0"; pkg.neura={...pkg.neura,canonicalNpmPackage:"@neurarelay/openclaw-preflight-adapter@0.1.0",canonicalPublisherNamespaceRequest:"openclaw/clawhub#2190"}; fs.writeFileSync(p, JSON.stringify(pkg,null,2)+"\n");' "$tmpdir/founder-preflight-adapter/package.json"
npm pack "$tmpdir/founder-preflight-adapter" --pack-destination "$tmpdir" --json
clawhub package publish "$tmpdir/rpelevin-neura-relay-preflight-adapter-0.1.0.tgz" --family code-plugin --owner rpelevin --name @rpelevin/neura-relay-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-commit <current-commit> --source-ref main --source-path examples/openclaw/preflight-adapter --dry-run --json
```

Historical founder-publisher fallback `0.1.0` publish command shape. This was run after Roman's exact approval on May 13, 2026:

```bash
clawhub package publish <founder-tarball> --family code-plugin --owner rpelevin --name @rpelevin/neura-relay-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-commit 5b7a87288b90e34f7023ece6188e3e23908fd078 --source-ref main --source-path examples/openclaw/preflight-adapter --json
```

Publish result:

```json
{
  "name": "@rpelevin/neura-relay-preflight-adapter",
  "displayName": "Neura Relay Preflight Adapter",
  "family": "code-plugin",
  "version": "0.1.0",
  "commit": "5b7a87288b90e34f7023ece6188e3e23908fd078",
  "files": 6,
  "totalBytes": 4593,
  "releaseId": "rd71v95v9mqw6xebweek19qb6x86mfps"
}
```

Canonical namespace post-publish install check:

```bash
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.4
openclaw plugins inspect neurarelay-openclaw-preflight-adapter --runtime --json
```

Founder-publisher fallback post-publish install check:

```bash
openclaw plugins install clawhub:@rpelevin/neura-relay-preflight-adapter@0.1.1
openclaw plugins inspect neura-relay-preflight-adapter --runtime --json
```

## Founder-Publisher Metadata Correction

Roman approved the `0.1.1` community fallback metadata/readme correction on May 13, 2026:

```text
Approved: publish @rpelevin/neura-relay-preflight-adapter@0.1.1 to ClawHub as a community founder-publisher metadata/readme correction, source-linked to relay-action-card commit 794f1d8, with no official OpenClaw or ClawHub claim.
```

Publish result:

```json
{
  "name": "@rpelevin/neura-relay-preflight-adapter",
  "displayName": "Neura Relay Preflight Adapter",
  "family": "code-plugin",
  "version": "0.1.1",
  "commit": "794f1d8c5088312b99806fe61b5ae2eddb724723",
  "files": 6,
  "totalBytes": 5253,
  "releaseId": "rd75hckdpqz0bxee3g8e18g18s86ncm2"
}
```

Version `0.1.1` verification currently shows:

- channel `community`
- `isOfficial=false`
- source repo `neurarelay/relay-action-card`
- source commit `794f1d8c5088312b99806fe61b5ae2eddb724723`
- artifact SHA-256 `f6b9e10753110b303d0ef4d69dc99671f1b2556020cf07b8a2ac9bab7d9fb9ea`
- README fetchable through ClawHub file inspection
- `pluginKind=preflight-governance`
- `toolNames=["neura_relay_preflight_action"]`
- static scan clean, LLM analysis clean, VirusTotal clean
- package-level `scanStatus=pending` and `latestVersion=null`
- package-level summary/source metadata may still reflect the older `0.1.0` package until ClawHub promotes/indexes the package record

May 18, 2026 clean OpenClaw install verification:

```bash
openclaw --profile neura-clawhub-fallback plugins install clawhub:@rpelevin/neura-relay-preflight-adapter@0.1.1 --force
openclaw --profile neura-clawhub-fallback plugins inspect neura-relay-preflight-adapter --runtime --json
```

Result:

- install succeeded from ClawHub as a community/source-linked code-plugin
- plugin status `loaded`
- plugin enabled and activated
- runtime import succeeded
- tool registered as `neura_relay_preflight_action`
- diagnostics empty
- install source `clawhub:@rpelevin/neura-relay-preflight-adapter@0.1.1`

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

- npm latest package `@neurarelay/openclaw-preflight-adapter@0.1.4` is published
- canonical ClawHub community package `@neurarelay/openclaw-preflight-adapter@0.1.4` is published, visible, tagged `latest,stable`, and scan-pending
- ClawHub community fallback package `@rpelevin/neura-relay-preflight-adapter@0.1.1` is published
- public GitHub examples are available
- package is shaped for OpenClaw / ClawHub plugin publication
- local runtime proof passed with OpenClaw `2026.5.7`
- ClawHub `0.15.0` dry-run proof passed
- developers can use `npm install @neurarelay/openclaw-preflight-adapter`

Not allowed:

- no official OpenClaw / ClawHub integration claim
- no official OpenClaw / ClawHub listing claim
- no official OpenClaw / ClawHub approval claim
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

Before any further official submission, package-version release, README polish release, metadata change, or public-copy action, Roman should approve one of these exact decisions:

```text
Approved: run ClawHub dry-run only for @neurarelay/openclaw-preflight-adapter@0.1.4.
```

```text
Approved: publish a future README-only ClawHub polish release for @neurarelay/openclaw-preflight-adapter with the exact version, source path, plugin id, display name, family, tags, source repo, and claim boundaries Roman approves at that time.
```

```text
Approved: publish @rpelevin/neura-relay-preflight-adapter@0.1.0 to ClawHub as the founder-publisher fallback, with source attribution to neurarelay/relay-action-card and no official OpenClaw / ClawHub claim.
```

```text
Approved: publish @rpelevin/neura-relay-preflight-adapter@0.1.1 to ClawHub as a community founder-publisher metadata/readme correction, source-linked to relay-action-card commit 794f1d8, with no official OpenClaw or ClawHub claim.
```

Any other destination, package name, version, description, tags, or provider claim requires a new approval pass.
