# ClawHub Issue Update Draft

Status: historical draft; superseded by May 18 canonical package publication; do not post without Roman approval
Date: 2026-05-18

Use only as historical context. The current ClawHub truth is in [`openclaw-clawhub-submission-readiness.md`](openclaw-clawhub-submission-readiness.md): the canonical `@neurarelay/openclaw-preflight-adapter@0.1.4` community package is published and visible, security audits are pending, and no official OpenClaw / ClawHub approval, listing, endorsement, integration, or partnership claim exists.

```markdown
Historical draft from the `@neurarelay` side:

- Stable npm package at draft time: `@neurarelay/openclaw-preflight-adapter@0.1.1`; current package truth lives in `openclaw-clawhub-submission-readiness.md`
- Canonical ClawHub community package: `@neurarelay/openclaw-preflight-adapter@0.1.4`
- Source path: `neurarelay/relay-action-card`, `examples/openclaw/preflight-adapter`
- Green CI for the current OpenClaw-style integration commit: https://github.com/neurarelay/relay-action-card/actions/runs/25795608585
- Maintainer evidence packet: https://github.com/neurarelay/relay-action-card/blob/main/docs/openclaw-clawhub-maintainer-packet.md
- 5-minute quickstart: https://github.com/neurarelay/relay-action-card/blob/main/examples/openclaw/QUICKSTART.md
- Copy-paste runtime guard: https://github.com/neurarelay/relay-action-card/blob/main/docs/openclaw-copy-paste-agent-integration.md

The adapter gives local autonomous computer-use runtimes a `beforeAction(preflightAction)` path before `message.send`, `file.delete`, and `package.publish`. It returns a Neura Decision Receipt route while the developer runtime keeps execution ownership.

Boundary: this is not an official OpenClaw / ClawHub integration, listing, approval, publication, endorsement, or partnership claim. ClawHub security audits and any maintainer/admin review remain operational state, not approval.
```
