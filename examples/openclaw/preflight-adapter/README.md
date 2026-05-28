# Neura Relay Preflight Adapter

Claim-safe OpenClaw-style preflight adapter package for Neura Relay:

```text
@neurarelay/openclaw-preflight-adapter@0.1.4
```

The ClawHub community fallback package remains:

```text
@rpelevin/neura-relay-preflight-adapter@0.1.1
```

The founder-publisher package remains a historical community fallback. The canonical `@neurarelay` package is published at `0.1.4` on npm `latest` and as the canonical ClawHub community package with the distinct plugin id `neurarelay-openclaw-preflight-adapter`, so it does not collide with the fallback's already-claimed `neura-relay-preflight-adapter` id. ClawHub shows the canonical package with `latest` and `stable` tags, current version `v0.1.4`, visible README, and security audits still pending.

It shows how a local autonomous computer-use runtime can call:

```text
beforeAction(preflightAction)
  -> Action Card
  -> Relay Decision Receipt
  -> developer-owned route
```

Machine-readable Relay discovery starts at:

- `https://www.neurarelay.com/llms.txt`
- `https://www.neurarelay.com/.well-known/agent-card.json`
- `https://www.neurarelay.com/developers/first-proof`

The OpenClaw-style adapter is one runtime path into the same Action Card to Decision Receipt proof. It is not an OpenClaw or ClawHub approval, listing, endorsement, integration, or partnership claim.

It is not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership. Any further OpenClaw / ClawHub publishing, submission, package-version, or public-copy change requires Roman approval of the exact action.

## Install From npm

```bash
npm install @neurarelay/openclaw-preflight-adapter
```

This is the stable npm install path. It resolves to `@neurarelay/openclaw-preflight-adapter@0.1.4` under npm `latest`.

When installing the current canonical ClawHub community package, use:

```bash
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter
```

Pin `0.1.4` when you need the exact current ClawHub package version:

```bash
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.4
```

When installing the historical founder-publisher fallback, pin the published version:

```bash
openclaw plugins install clawhub:@rpelevin/neura-relay-preflight-adapter@0.1.1
```

```js
import { createNeuraPreflightAdapter } from "@neurarelay/openclaw-preflight-adapter";
import { createActionCardFromPreflightAction } from "@neurarelay/openclaw-preflight-adapter/adapter";
```

## Capability

The adapter exposes one pre-action tool:

```text
neura_relay_preflight_action
```

Use it when a local agent is about to send a message, submit a browser form,
edit or delete a file, run a shell command, publish a package, change workflow
state, write memory, export data, or alter a publisher/namespace setting.

The tool sends refs-only proposed-action context to Neura Relay and returns a
Decision Receipt with a route such as `ready_for_developer_owned_execution`,
`hold_for_registry_backed_authority`, `revise_before_execution`, `human_review`,
or `stop_before_execution`.

## Boundaries

- Neura does not execute the downstream action.
- Private payload values, raw file contents, raw shell commands, and secrets must not be sent.
- Public demo refs are treated as developer-supplied until Registry-backed authority is available.
- The ClawHub community packages are not official OpenClaw or ClawHub listings, approvals, endorsements, partnerships, or integration claims.

## Run

```bash
npm run first-proof -- --source=openclaw_npm --campaign=package_reality_first_proof
npm run openclaw:preflight:dry-run
npm run openclaw:preflight:receipt -- --json
npm run openclaw:plugin:pack:dry-run
```

Use `npm run first-proof` when you need the package-reality signal: it distinguishes package downloads from actual proof execution and preserves source/campaign attribution in the receipt path.

## Verify From Source

```bash
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-npm-package
npm run test:openclaw-preflight-adapter
npm run test:openclaw-preflight-adapter:e2e
```

## Files

| File | Purpose |
| --- | --- |
| `openclaw.plugin.json` | Native plugin manifest with discovery/config metadata |
| `package.json` | Publish-ready package metadata, `openclaw.extensions`, compatibility metadata, and claim boundaries |
| `index.mjs` | OpenClaw-style `register(api)` entry example |
| `adapter.mjs` | Reusable `beforeAction` adapter and Action Card conversion helper |
| `fixtures/send-message.preflight.json` | Refs-only preflight action fixture |

The adapter never executes downstream actions. It returns a Decision Receipt and a route for the developer-owned runtime.

`proceed` only routes to `ready_for_developer_owned_execution` when delegated authority is Registry-backed and ready. Public demo refs that are only developer-supplied route to `hold_for_registry_backed_authority`.
