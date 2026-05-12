# Changelog

## OpenClaw Action Receipt Kit v0.1 RC - 2026-05-12

This release-candidate kit gives autonomous computer-use developers a copyable way to request a Neura Decision Receipt before local agent actions execute.

- Adds a plugin-ready preflight adapter contract: `beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route`.
- Adds eight refs-only Action Card families: outbound message, file edit, file delete, browser submit, shell command, workflow transition, memory write, and data export.
- Adds `npm run openclaw:dry-run` and `npm run openclaw:receipts` for local contract review and live Relay receipt proof.
- Adds `npm run openclaw:preflight:dry-run`, `npm run openclaw:preflight:receipt`, and `npm run verify:openclaw-preflight-adapter`.
- Adds `npm run verify:openclaw-action-receipt-kit` plus Node unit and live E2E tests for the kit.
- Adds GitHub Actions CI for the local kit contract, with live production receipt proof kept manual.
- Preserves developer-owned execution, no private payload exposure, no public token/key issuance, and no official OpenClaw or ClawHub listing, approval, or partnership claim.
