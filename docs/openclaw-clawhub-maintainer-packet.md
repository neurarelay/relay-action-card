# OpenClaw-Style ClawHub Maintainer Packet

Status: public-safe evidence packet; no OpenClaw / ClawHub listing, approval, publication, or partnership claim
Date: 2026-05-13

This packet collects the public evidence for reviewing the `@neurarelay` publisher-access request. It is intentionally an evidence index, not an official OpenClaw / ClawHub approval claim.

## Review Links

| Surface | Link |
| --- | --- |
| ClawHub issue | `https://github.com/openclaw/clawhub/issues/2190` |
| Source repo | `https://github.com/neurarelay/relay-action-card` |
| Package path | `examples/openclaw/preflight-adapter` |
| Quickstart | [`examples/openclaw/QUICKSTART.md`](../examples/openclaw/QUICKSTART.md) |
| Five-minute demo | [`openclaw-five-minute-receipt-demo.md`](openclaw-five-minute-receipt-demo.md) |
| Adapter docs | [`openclaw-preflight-adapter.md`](openclaw-preflight-adapter.md) |
| Submission readiness | [`openclaw-clawhub-submission-readiness.md`](openclaw-clawhub-submission-readiness.md) |
| Runtime approval packet | [`openclaw-runtime-verification-and-publish-approval.md`](openclaw-runtime-verification-and-publish-approval.md) |
| Recent green CI run | `https://github.com/neurarelay/relay-action-card/actions/runs/25794884529` |

## Package Evidence

| Field | Value |
| --- | --- |
| npm package | `@neurarelay/openclaw-preflight-adapter` |
| Stable version | `0.1.0` |
| npm tags | `latest=0.1.0`; `rc=0.1.0-rc.2` |
| Stable source commit | `c95fc5a7ce9d83f1a8995bde84f32727555bbbf7` |
| Quickstart commit | `45d08057e372d00ebc26596ac8d6422edb726356` |
| Package family | `code-plugin` |
| Runtime tool | `neura_relay_preflight_action` |
| Node floor | `>=22.14.0`; repo-pinned Node `24` |

## What Reviewers Can Verify

- The stable npm package is live as `@neurarelay/openclaw-preflight-adapter@0.1.0`.
- A clean npm consumer install verifier passes against the public package.
- The ClawHub package dry-run passed under Node `24.15.0`.
- GitHub Actions is green for the current OpenClaw-style quickstart commit.
- The quickstart gives developers a three-scenario proof for message send, file delete, and package publish preflight.
- The adapter returns a Decision Receipt route before local autonomous computer-use actions execute.
- The developer runtime keeps execution ownership; Neura does not execute the downstream action.

## Local Verification Commands

Run from the repository root using Node `24`:

```bash
nvm use
npm ci
npm run verify:openclaw-npm-package
npm run verify:openclaw-five-minute-demo
npm run verify:openclaw-clawhub-release
npm run test:openclaw-preflight-adapter
npm run test:openclaw-five-minute-demo
```

The ClawHub release gate may run a dry-run package command, but it does not publish the package.

## Claim Boundaries

- no official OpenClaw / ClawHub integration, listing, approval, publication, partnership, endorsement, or namespace approval claim
- no downstream execution by Neura
- no private payload exposure
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no Registry auto-approval
- maintainer or admin review is still required for ClawHub namespace or member access
