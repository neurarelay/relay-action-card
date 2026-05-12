# Neura Relay Preflight Adapter Release Candidate

This folder contains the package-ready, claim-safe OpenClaw-style preflight adapter release candidate:

```text
@neurarelay/openclaw-preflight-adapter@0.1.0-rc.1
```

It shows how a local autonomous computer-use runtime can call:

```text
beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route
```

It is not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership. Publishing or submission requires Roman approval of the exact action.

## Run

```bash
npm run openclaw:preflight:dry-run
npm run openclaw:preflight:receipt -- --json
npm run openclaw:plugin:pack:dry-run
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-plugin-rc
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
