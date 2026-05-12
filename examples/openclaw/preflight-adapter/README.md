# Neura Relay Preflight Adapter Example

This folder is an unofficial OpenClaw-style preflight adapter example. It shows how a local autonomous computer-use runtime can call:

```text
beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route
```

It is not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Run

```bash
npm run openclaw:preflight:dry-run
npm run openclaw:preflight:receipt -- --json
npm run verify:openclaw-preflight-adapter
npm run test:openclaw-preflight-adapter
npm run test:openclaw-preflight-adapter:e2e
```

## Files

| File | Purpose |
| --- | --- |
| `openclaw.plugin.json` | Native plugin manifest draft with empty config schema and compatibility refs |
| `package.json` | Native-plugin-shaped package metadata and OpenClaw compatibility draft |
| `index.mjs` | OpenClaw-style `register(api)` entry example |
| `adapter.mjs` | Reusable `beforeAction` adapter and Action Card conversion helper |
| `fixtures/send-message.preflight.json` | Refs-only preflight action fixture |

The adapter never executes downstream actions. It returns a Decision Receipt and a route for the developer-owned runtime.
