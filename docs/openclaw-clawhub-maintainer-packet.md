# OpenClaw-Style ClawHub Maintainer Packet

Status: public-safe evidence packet; canonical ClawHub community package published; no OpenClaw / ClawHub listing, approval, or partnership claim
Date: 2026-05-18

This packet collects the public evidence for the `@neurarelay` OpenClaw-style preflight adapter path. It is intentionally an evidence index, not an official OpenClaw / ClawHub approval claim.

## Review Links

| Surface | Link |
| --- | --- |
| ClawHub issue | `https://github.com/openclaw/clawhub/issues/2190` |
| Source repo | `https://github.com/neurarelay/relay-action-card` |
| Package path | `examples/openclaw/preflight-adapter` |
| Quickstart | [`examples/openclaw/QUICKSTART.md`](../examples/openclaw/QUICKSTART.md) |
| Copy-paste integration | [`openclaw-copy-paste-agent-integration.md`](openclaw-copy-paste-agent-integration.md) |
| Five-minute demo | [`openclaw-five-minute-receipt-demo.md`](openclaw-five-minute-receipt-demo.md) |
| Adapter docs | [`openclaw-preflight-adapter.md`](openclaw-preflight-adapter.md) |
| Submission readiness | [`openclaw-clawhub-submission-readiness.md`](openclaw-clawhub-submission-readiness.md) |
| Runtime approval packet | [`openclaw-runtime-verification-and-publish-approval.md`](openclaw-runtime-verification-and-publish-approval.md) |
| Recent green CI run | `https://github.com/neurarelay/relay-action-card/actions/runs/25795608585` |

## Package Evidence

| Field | Value |
| --- | --- |
| npm package | `@neurarelay/openclaw-preflight-adapter` |
| Stable version | `0.1.1` |
| npm tags | `latest=0.1.1`; `rc=0.1.0-rc.2` |
| Stable source commit | `fd349da8612e8523faf982d6ec47a69ab3d5d87c` |
| Current source commit | `6bd9216402ee2778e3e592c9bef69ad7e841df9c` |
| Package family | `code-plugin` |
| Canonical ClawHub community package | `@neurarelay/openclaw-preflight-adapter@0.1.4` |
| Canonical ClawHub plugin id | `neurarelay-openclaw-preflight-adapter` |
| ClawHub audit state | ClawScan pending; Static analysis pass; VirusTotal pending |
| Runtime tool | `neura_relay_preflight_action` |
| Node floor | `>=22.14.0`; repo-pinned Node `24` |

## What Reviewers Can Verify

- The stable npm package is live as `@neurarelay/openclaw-preflight-adapter@0.1.1`.
- The canonical ClawHub community package is visible as `@neurarelay/openclaw-preflight-adapter@0.1.4`.
- A clean npm consumer install verifier passes against the public package.
- The ClawHub package dry-run passed under Node `24.15.0`.
- GitHub Actions is green for the current OpenClaw-style integration commit.
- The quickstart and copy-paste integration give developers a three-scenario proof for message send, file delete, and package publish preflight.
- The adapter returns a Decision Receipt route before local autonomous computer-use actions execute.
- The developer runtime keeps execution ownership; Neura does not execute the downstream action.

## Local Verification Commands

Run from the repository root using Node `24`:

```bash
nvm use
npm ci
npm run verify:openclaw-npm-package
npm run verify:openclaw-copy-paste-integration
npm run verify:openclaw-five-minute-demo
npm run verify:openclaw-clawhub-release
npm run test:openclaw-copy-paste-integration
npm run test:openclaw-preflight-adapter
npm run test:openclaw-five-minute-demo
```

The ClawHub release gate may run a dry-run package command, but it does not publish a new package version.

## Claim Boundaries

- no official OpenClaw / ClawHub integration, listing, approval, publication, partnership, endorsement, or namespace approval claim
- no downstream execution by Neura
- no private payload exposure
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no Registry auto-approval
- ClawHub security audits and any maintainer/admin review should be treated as pending operational state, not approval
