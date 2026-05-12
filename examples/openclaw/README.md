# OpenClaw-Style Action Receipt Kit

These examples are public-safe Action Card drafts for OpenClaw-style autonomous computer-use actions. They are refs-only fixtures for getting a Decision Receipt before user or runtime-owned execution.

This folder is not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Run

```bash
npm run openclaw:dry-run
npm run openclaw:receipts -- --only=send-message --json
npm run verify:openclaw-action-receipt-kit
npm run verify:openclaw-action-receipt-pack
npm run test:openclaw-kit
npm run test:openclaw-kit:e2e
```

## Fixtures

| File | Family |
| --- | --- |
| `send-message.json` | outbound message |
| `edit-file.json` | file edit |
| `delete-file.json` | file delete |
| `browser-submit.json` | browser submit |
| `shell-command.json` | shell command |
| `workflow-state-change.json` | workflow state change |
| `memory-write.json` | memory write |
| `data-export.json` | data export |

The manifest at `action-receipt-kit.manifest.json` is the machine-readable contract for the local release candidate kit.
