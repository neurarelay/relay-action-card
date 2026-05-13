# Neura Relay Preflight Adapter

This folder contains the claim-safe OpenClaw-style preflight adapter published to npm:

```text
@neurarelay/openclaw-preflight-adapter@0.1.0
```

The ClawHub community metadata/readme correction is published as:

```text
@rpelevin/neura-relay-preflight-adapter@0.1.1
```

That founder-publisher package is a temporary community fallback while
`openclaw/clawhub#2190` remains open for canonical `@neurarelay` namespace access.
The canonical npm package remains `@neurarelay/openclaw-preflight-adapter@0.1.0`.

It shows how a local autonomous computer-use runtime can call:

```text
beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route
```

It is not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership. OpenClaw / ClawHub publishing or submission requires Roman approval of the exact action.

## Install From npm

```bash
npm install @neurarelay/openclaw-preflight-adapter
```

This is the stable npm install path. The old `@rc` tag remains available only for release-candidate history.

When installing the current ClawHub community fallback, pin the published version:

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
- The ClawHub community package is not an official OpenClaw or ClawHub listing, approval, endorsement, partnership, or canonical namespace grant.

## Run

```bash
npm run openclaw:preflight:dry-run
npm run openclaw:preflight:receipt -- --json
npm run openclaw:plugin:pack:dry-run
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-plugin-rc
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
