# OpenClaw Plugin Stable Package v0.1

Status: canonical ClawHub `0.1.3` package staged; OpenClaw / ClawHub publication remains approval-gated
Date: 2026-05-18

This document is the claim-safe release-readiness packet for the Neura Relay OpenClaw preflight adapter.

For the final Roman approval packet before any OpenClaw / ClawHub submission or package publication action, see [`openclaw-clawhub-submission-readiness.md`](openclaw-clawhub-submission-readiness.md).

Staged canonical ClawHub package:

```text
@neurarelay/openclaw-preflight-adapter@0.1.3
```

This ClawHub package uses plugin id `neurarelay-openclaw-preflight-adapter` so it can coexist with the existing `@rpelevin/neura-relay-preflight-adapter@0.1.1` community fallback.

The package turns a proposed local computer-use action into a refs-only Action Card, asks Neura Relay for a Decision Receipt, and returns a developer-owned execution route. Neura does not execute the downstream action.

## Current Status

- package metadata is shaped for OpenClaw plugin discovery and npm/ClawHub packaging
- canonical ClawHub package `@neurarelay/openclaw-preflight-adapter@0.1.3` is staged for the `latest,stable` tags
- developers can still use `npm install @neurarelay/openclaw-preflight-adapter`; npm `0.1.3` requires separate Roman approval before publication
- clean local package consumer proof is available through `npm run verify:openclaw-plugin-rc`
- native manifest is present at `examples/openclaw/preflight-adapter/openclaw.plugin.json`
- runtime entrypoint is declared through `package.json` `openclaw.extensions`
- runtime registers one tool: `neura_relay_preflight_action`
- package dry-run proof is available through `npm run openclaw:plugin:pack:dry-run`
- stable package verifier is available through `npm run verify:openclaw-plugin-rc`
- runtime install/inspect proof is available through `npm run verify:openclaw-runtime-approval` when running under Node 22.14+; this repo pins Node `24` in `.nvmrc`

No canonical `@neurarelay` ClawHub publication has been performed. The existing `@rpelevin/neura-relay-preflight-adapter@0.1.1` package remains a community fallback only. No official listing, approval, partnership, endorsement, or provider claim exists. OpenClaw / ClawHub submission or canonical publication requires Roman's explicit approval of the exact package name, metadata, public copy, and publish/submission action.

## Official Source Alignment

The stable npm package is aligned to the current public OpenClaw / ClawHub docs:

- `https://docs.openclaw.ai/plugins/manifest`
- `https://docs.openclaw.ai/plugins/building-plugins`
- `https://documentation.openclaw.ai/clawhub`

Source-aligned requirements covered:

- native plugins carry `openclaw.plugin.json`
- manifest is discovery/config metadata, not runtime entrypoint metadata
- package `openclaw.extensions` declares the runtime entrypoint
- package `openclaw.compat.pluginApi` and `openclaw.build.openclawVersion` are present
- tool plugin entry exposes `register(api)` and calls `api.registerTool(...)`
- package publishing can be dry-run before any upload

## Verification Commands

```bash
npm run verify:openclaw-preflight-adapter
npm run test:openclaw-preflight-adapter
npm run openclaw:preflight:dry-run -- --json
npm run openclaw:plugin:pack:dry-run
npm run verify:openclaw-plugin-rc
npm run verify:openclaw-submission-readiness
npm run verify:openclaw-runtime-approval
```

Live production proof remains separate:

```bash
npm run test:openclaw-preflight-adapter:e2e
npm run openclaw:preflight:receipt -- --json
```

## Future Publish Commands

Do not run these without Roman approval:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.3 --tags latest,stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter --dry-run --json
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.3 --tags latest,stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.3
openclaw plugins inspect neurarelay-openclaw-preflight-adapter --runtime --json
```

If OpenClaw and ClawHub CLIs are installed locally, `npm run verify:openclaw-plugin-rc` reports that they are available. It does not mutate local OpenClaw config or start registry-authenticated publishing unless explicit environment flags are supplied.

For the verified local runtime and dry-run packet, see [`openclaw-runtime-verification-and-publish-approval.md`](openclaw-runtime-verification-and-publish-approval.md).

## Boundary Statement

The stable npm package preserves:

- developer-owned downstream execution
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no private payload exposure
- no Registry auto-approval
- no provider approval/listing/partnership claim
- no official OpenClaw or ClawHub claim

## Public-Safe Description Draft

Neura Relay Preflight Adapter is an OpenClaw-style plugin surface for developers who want a Decision Receipt before local autonomous computer-use actions execute. It converts refs-only preflight actions into Action Cards, calls Neura Relay, and returns a route such as proceed, revise, human review, or stop. The developer runtime keeps execution ownership.

This description is a draft only. It should not be published or submitted without Roman's explicit approval.
