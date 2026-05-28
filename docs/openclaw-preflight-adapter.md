# OpenClaw-Style Preflight Adapter v0.1

Status: stable npm package published; canonical ClawHub community package published; further OpenClaw / ClawHub changes remain approval-gated
Date: 2026-05-12

This adapter turns the Action Receipt Kit into a plugin-ready runtime contract:

```text
beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route
```

It is not an official OpenClaw, ClawHub, OpenAI, Codex, Anthropic, Claude, MCP, or A2A integration, listing, approval, or partnership. It is an OpenClaw-style package for developers who want to route proposed local actions through Neura before execution.

## Official Path Readiness

OpenClaw's current public docs describe native plugins as package-scoped extensions with a native plugin manifest, package `openclaw.extensions`, an entry object that exposes `register(api)`, and CLI install/publish flows for ClawHub packages.

This repo now carries a package-ready stable adapter shaped for that path:

| Surface | File |
| --- | --- |
| Native plugin manifest | `examples/openclaw/preflight-adapter/openclaw.plugin.json` |
| Package metadata | `examples/openclaw/preflight-adapter/package.json` |
| OpenClaw-style entry point | `examples/openclaw/preflight-adapter/index.mjs` |
| Runtime adapter contract | `examples/openclaw/preflight-adapter/adapter.mjs` |
| Refs-only fixture | `examples/openclaw/preflight-adapter/fixtures/send-message.preflight.json` |
| CLI runner | `examples/openclaw/run-preflight-adapter.mjs` |
| Verifier | `scripts/verify-openclaw-preflight-adapter.mjs` |
| Stable package verifier | `scripts/verify-openclaw-plugin-rc.mjs` |
| Runtime approval verifier | `scripts/verify-openclaw-runtime-approval.mjs` |
| Unit test | `tests/openclaw-preflight-adapter.test.mjs` |
| Live E2E test | `tests/openclaw-preflight-adapter.e2e.mjs` |
| Submission-readiness packet | `docs/openclaw-plugin-release-candidate.md` |
| Final submission-readiness packet | `docs/openclaw-clawhub-submission-readiness.md` |
| Runtime verification packet | `docs/openclaw-runtime-verification-and-publish-approval.md` |

Current public docs reviewed for this shape:

- `https://docs.openclaw.ai/plugins/manifest`
- `https://docs.openclaw.ai/plugins/building-plugins`
- `https://documentation.openclaw.ai/clawhub`

Published stable npm package:

```text
@neurarelay/openclaw-preflight-adapter@0.1.4
```

Use Node `24` via `.nvmrc`; runtime verification requires Node `>=22.14.0`.

Install from npm:

```bash
npm install @neurarelay/openclaw-preflight-adapter
```

This is the stable npm install path. npm `latest` resolves to `0.1.4`; the old `@rc` tag remains available only for release-candidate history.

Published canonical ClawHub community package:

```text
clawhub:@neurarelay/openclaw-preflight-adapter@0.1.4
```

ClawHub currently shows current version `v0.1.4`, `latest` and `stable` tags, visible README, Static analysis pass, and ClawScan / VirusTotal pending. This is community package availability only, not an official OpenClaw or ClawHub approval, listing, endorsement, integration, or partnership.

Use the package surface:

```js
import { createNeuraPreflightAdapter } from "@neurarelay/openclaw-preflight-adapter";
import { createActionCardFromPreflightAction } from "@neurarelay/openclaw-preflight-adapter/adapter";
```

## Commands

```bash
npm run openclaw:preflight:dry-run
npm run openclaw:preflight:receipt -- --json
npm run openclaw:plugin:pack:dry-run
npm run verify:openclaw-preflight-adapter
npm run verify:openclaw-plugin-rc
npm run verify:openclaw-npm-package
npm run verify:openclaw-submission-readiness
npm run verify:openclaw-runtime-approval
npm run test:openclaw-preflight-adapter
npm run test:openclaw-preflight-adapter:e2e
```

Further OpenClaw / ClawHub submission, package-version release, README polish release, metadata change, or public-copy action requires Roman approval of the exact metadata, package name, public description, and publish/submission action.

## Contract

The adapter accepts a refs-only preflight action:

- proposed action type, summary, and target ref
- affected object ref
- authority refs
- evidence refs
- rule refs
- risk category

It returns:

- Action Card v0.1
- Decision Receipt summary when live
- route such as `hold_for_registry_backed_authority`, `ready_for_developer_owned_execution`, `route_to_human_review_before_execution`, `revise_action_card_before_execution`, or `stop_before_execution`
- explicit developer-owned execution boundary

## Boundaries

- no official OpenClaw or ClawHub claim
- no further OpenClaw / ClawHub submission, package-version release, metadata change, or public-copy action without Roman approval
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no downstream execution by Neura
- no private payload exposure
- no Registry auto-approval
- no provider approval claim
