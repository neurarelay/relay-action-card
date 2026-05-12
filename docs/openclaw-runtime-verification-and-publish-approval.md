# OpenClaw Runtime Verification And Publish Approval Packet

Status: runtime-verified locally; publish/submission approval required
Date: 2026-05-12

This packet records the actual OpenClaw / ClawHub release gate for:

```text
@neurarelay/openclaw-preflight-adapter@0.1.0-rc.1
```

It does not publish, submit, list, approve, or partner the plugin. It exists so Roman can make a clean publish/submission decision from verified facts.

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
openclaw --profile neura-rc plugins inspect neura-relay-preflight-adapter --json
openclaw --profile neura-rc plugins inspect neura-relay-preflight-adapter --runtime --json
```

Runtime inspection confirmed:

- plugin id: `neura-relay-preflight-adapter`
- package name: `@neurarelay/openclaw-preflight-adapter`
- version: `0.1.0-rc.1`
- status: `loaded`
- enabled: `true`
- runtime imported: `true`
- registered tool: `neura_relay_preflight_action`
- diagnostics: none

## Verified ClawHub Dry Run

ClawHub `0.15.0` package pack produced a tarball with:

- file count: `6`
- package size: `4212`
- sha256: `879d1c873e22255210747a95350f033f7b9a3dce238f5d1494bd30fd5a4d0dc0`
- npm integrity: `sha512-igAUHUQA1Gts99IKbLdKXhvUvoOEYwLsb+OCPVE3XKnWwmJ3VjO0Kyb38d7XqPGLXQtweSQK9uIym/N+YKUlfA==`

ClawHub publish dry-run succeeded with:

```json
{
  "source": "github:neurarelay/relay-action-card@main:examples/openclaw/preflight-adapter",
  "name": "@neurarelay/openclaw-preflight-adapter",
  "displayName": "Neura Relay Preflight Adapter",
  "family": "code-plugin",
  "version": "0.1.0-rc.1",
  "files": 6,
  "totalBytes": 4212
}
```

## Approval-Gated Publish Command

Do not run this without Roman approval:

```bash
clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0-rc.1 --tags rc --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
```

## Public-Safe Description

Neura Relay Preflight Adapter is a release-candidate OpenClaw plugin surface for developers who want a Decision Receipt before local autonomous computer-use actions execute. It converts refs-only preflight actions into Action Cards, calls Neura Relay, and returns a route such as proceed, revise, human review, or stop. The developer runtime keeps execution ownership.

## Boundaries

- no OpenClaw / ClawHub submission or publication has been performed
- no official OpenClaw or ClawHub listing, approval, partnership, or endorsement claim exists
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no downstream execution by Neura
- no private payload exposure
- no Registry auto-approval
- no provider approval/listing/partnership claim
