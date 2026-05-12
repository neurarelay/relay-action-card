# OpenClaw Plugin Release Candidate v0.1

Status: package-ready release candidate; not submitted or published
Date: 2026-05-12

This document is the claim-safe release-readiness packet for the Neura Relay OpenClaw preflight adapter.

Package candidate:

```text
@neurarelay/openclaw-preflight-adapter@0.1.0-rc.1
```

The candidate turns a proposed local computer-use action into a refs-only Action Card, asks Neura Relay for a Decision Receipt, and returns a developer-owned execution route. Neura does not execute the downstream action.

## Current Status

- package metadata is shaped for OpenClaw plugin discovery and npm/ClawHub packaging
- native manifest is present at `examples/openclaw/preflight-adapter/openclaw.plugin.json`
- runtime entrypoint is declared through `package.json` `openclaw.extensions`
- runtime registers one tool: `neura_relay_preflight_action`
- package dry-run proof is available through `npm run openclaw:plugin:pack:dry-run`
- release-candidate verifier is available through `npm run verify:openclaw-plugin-rc`

No OpenClaw / ClawHub submission or publication has been performed. No official listing, approval, partnership, endorsement, or provider claim exists. Submission or publication requires Roman's explicit approval of the exact package name, metadata, public copy, and publish/submission action.

## Official Source Alignment

The release candidate is aligned to the current public OpenClaw / ClawHub docs:

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
```

Live production proof remains separate:

```bash
npm run test:openclaw-preflight-adapter:e2e
npm run openclaw:preflight:receipt -- --json
```

## Future Publish Commands

Do not run these without Roman approval:

```bash
clawhub package publish your-org/your-plugin --dry-run
clawhub package publish your-org/your-plugin
openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter
openclaw plugins inspect neura-relay-preflight-adapter --runtime --json
```

If OpenClaw and ClawHub CLIs are installed locally, `npm run verify:openclaw-plugin-rc` reports that they are available. It does not mutate local OpenClaw config or start registry-authenticated publishing unless explicit environment flags are supplied.

## Boundary Statement

The release candidate preserves:

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

Neura Relay Preflight Adapter is a release-candidate OpenClaw-style plugin surface for developers who want a Decision Receipt before local autonomous computer-use actions execute. It converts refs-only preflight actions into Action Cards, calls Neura Relay, and returns a route such as proceed, revise, human review, or stop. The developer runtime keeps execution ownership.

This description is a draft only. It should not be published or submitted without Roman's explicit approval.
