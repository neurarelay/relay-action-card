# OpenClaw Runtime Verification And Publish Approval Packet

Status: runtime-verified locally; canonical ClawHub `0.1.2` package staged; OpenClaw / ClawHub publish approval required
Date: 2026-05-18

This packet records the actual OpenClaw / ClawHub release gate for the canonical ClawHub package:

```text
@neurarelay/openclaw-preflight-adapter@0.1.2
```

The canonical `0.1.2` ClawHub package uses plugin id `neurarelay-openclaw-preflight-adapter` so it does not collide with the existing `@rpelevin/neura-relay-preflight-adapter@0.1.1` community fallback, whose plugin id is already claimed in ClawHub.

It does not publish, submit, list, approve, or partner the plugin through OpenClaw / ClawHub. It exists so Roman can make a clean OpenClaw / ClawHub publish/submission decision from verified facts.

For the final Roman approval packet before any OpenClaw / ClawHub submission or package publication action, see [`openclaw-clawhub-submission-readiness.md`](openclaw-clawhub-submission-readiness.md).

## Runtime Requirement

Use Node `24` for this repo, pinned in `.nvmrc`. The verifier and package declare Node `>=22.14.0` because OpenClaw `2026.5.7` does not run on the local system Node `21.1.0`.

```bash
nvm use
node -v
npm run verify:openclaw-runtime-approval
```

## Verified Runtime Path

The plugin was installed into an isolated OpenClaw profile using OpenClaw `2026.5.7` under a temporary HOME/config/data/cache directory:

```bash
openclaw --profile neura-rc plugins install -l examples/openclaw/preflight-adapter
openclaw --profile neura-rc plugins inspect neurarelay-openclaw-preflight-adapter --json
openclaw --profile neura-rc plugins inspect neurarelay-openclaw-preflight-adapter --runtime --json
```

Runtime inspection confirmed:

- plugin id: `neurarelay-openclaw-preflight-adapter`
- package name: `@neurarelay/openclaw-preflight-adapter`
- version: `0.1.2`
- status: `loaded`
- enabled: `true`
- runtime imported: `true`
- registered tool: `neura_relay_preflight_action`
- diagnostics: none

## Verified npm Consumer Path

The stable npm package can be installed by an outside developer:

```bash
npm install @neurarelay/openclaw-preflight-adapter
```

This is the stable npm install path. It currently resolves to the latest public npm release until a separate npm `0.1.2` publish is approved.

The public package surface is:

```js
import { createNeuraPreflightAdapter } from "@neurarelay/openclaw-preflight-adapter";
import { createActionCardFromPreflightAction } from "@neurarelay/openclaw-preflight-adapter/adapter";
```

Run the registry-backed clean consumer check:

```bash
npm run verify:openclaw-npm-package
npm run verify:openclaw-submission-readiness
```

## Verified ClawHub Dry Run

ClawHub `0.15.0` package pack produced the expected six-file package:

- `README.md`
- `adapter.mjs`
- `fixtures/send-message.preflight.json`
- `index.mjs`
- `openclaw.plugin.json`
- `package.json`

Run `npm run verify:openclaw-runtime-approval` before any OpenClaw / ClawHub publish decision to regenerate the exact local runtime, pack, and dry-run proof.

ClawHub publish dry-run succeeded with this claim-safe shape:

```json
{
  "source": "github:neurarelay/relay-action-card@main:examples/openclaw/preflight-adapter",
  "name": "@neurarelay/openclaw-preflight-adapter",
  "displayName": "Neura Relay Preflight Adapter",
  "family": "code-plugin",
  "version": "0.1.2",
  "files": 6
}
```

## Approval-Gated Publish Command

Do not run this without Roman approval:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.2 --tags stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
```

## Public-Safe Description

Neura Relay Preflight Adapter is an OpenClaw-style plugin surface for developers who want a Decision Receipt before local autonomous computer-use actions execute. It converts refs-only preflight actions into Action Cards, calls Neura Relay, and returns a route such as proceed, revise, human review, or stop. The developer runtime keeps execution ownership.

## Boundaries

- no canonical `@neurarelay` ClawHub publication has been performed
- the existing `@rpelevin/neura-relay-preflight-adapter@0.1.1` package remains a community fallback only
- no official OpenClaw or ClawHub listing, approval, partnership, or endorsement claim exists
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no downstream execution by Neura
- no private payload exposure
- no Registry auto-approval
- no provider approval/listing/partnership claim
