# OpenClaw-Style Computer-Use Agent Loop

Status: public-safe generic runtime example; not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership
Date: 2026-05-13

This example shows where a generic autonomous computer-use runtime should pause before local execution.

```text
plan local action -> beforeExecute(action) -> adapter.beforeAction(preflightAction) -> execute only if route is ready
```

The loop covers the three adoption hooks developers recognize quickly:

| Loop checkpoint | Action | Default local state |
| --- | --- | --- |
| Draft support reply | `message.send` | paused before external communication |
| Remove generated export | `file.delete` | paused before destructive file mutation |
| Publish agent plugin | `package.publish` | paused before public distribution |

Run it locally:

```bash
npm run openclaw:computer-use-loop
npm run verify:openclaw-computer-use-loop
npm run test:openclaw-computer-use-loop
```

Live mode requests Relay Decision Receipts but still does not execute the local actions:

```bash
npm run openclaw:computer-use-loop -- --live --json
```

The example records `execution_attempted: false` for every checkpoint. The developer runtime owns execution after reviewing the route.

## Boundaries

- not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership
- no downstream execution by Neura
- no private payload exposure
- no public token or key issuance
- no Registry auto-approval
- developer-owned execution only

