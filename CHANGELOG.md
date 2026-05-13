# Changelog

## OpenClaw Action Receipt Kit v0.1 RC - 2026-05-12

This release-candidate kit gives autonomous computer-use developers a copyable way to request a Neura Decision Receipt before local agent actions execute.

- Adds a local Near-Miss Workbench with `npm run openclaw:workbench` for customer data exfiltration, production deployment, and expired delegated authority journeys.
- Adds an OpenClaw OS Decision Receipt Surface with `npm run openclaw:workspace-proof` for generated app, artifact, cron, workflow monitor, session memory, browser direct-control, and shell/file workspace actions.
- Adds an OpenClaw Severe Scenario Proof Pack with `npm run openclaw:severe-proof` for a five-checkpoint customer data export, external browser submit, completion message, file deletion, and workflow close journey.
- Adds an OpenClaw Severe Preflight Queue with `npm run openclaw:severe-preflight` to run that five-checkpoint journey through `adapter.beforeAction(preflightAction)` before any local execution.
- Adds `npm run openclaw:proof` as the one-command OpenClaw Developer Journey Proof, with `npm run openclaw:proof -- --live` for an explicit live receipt check.
- Polishes the Near-Miss Workbench visual report around agent intent, what Neura catches, receipt route, and developer-owned next step.
- Adds committed README preview assets so the GitHub OpenClaw proof is visible before local setup.
- Adds `npm run verify:openclaw-workbench` and `npm run test:openclaw-workbench`.
- Adds `npm run verify:openclaw-workspace-surface` and `npm run test:openclaw-workspace-surface`.
- Adds a plugin-ready preflight adapter contract: `beforeAction(preflightAction) -> Action Card -> Relay Decision Receipt -> developer-owned route`.
- Adds a package-ready OpenClaw plugin release candidate packet for `@neurarelay/openclaw-preflight-adapter@0.1.0-rc.2`, including npm pack dry-run verification and claim-safe submission readiness docs.
- Adds `docs/openclaw-clawhub-submission-readiness.md` and `npm run verify:openclaw-submission-readiness` as the final Roman approval packet before any official OpenClaw / ClawHub submission or package publication action.
- Adds `npm run verify:openclaw-clawhub-release` as the one-command ClawHub release gate covering package metadata, npm pack contents, clean npm consumer install, unit tests, live Relay receipt output, OpenClaw runtime loading, local ClawHub pack, exact ClawHub publish dry-run metadata, and no-claim boundaries.
- Adds eight refs-only Action Card families: outbound message, file edit, file delete, browser submit, shell command, workflow transition, memory write, and data export.
- Adds `npm run openclaw:dry-run` and `npm run openclaw:receipts` for local contract review and live Relay receipt proof.
- Adds `npm run openclaw:preflight:dry-run`, `npm run openclaw:preflight:receipt`, `npm run openclaw:plugin:pack:dry-run`, `npm run verify:openclaw-preflight-adapter`, and `npm run verify:openclaw-plugin-rc`.
- Adds `npm run verify:openclaw-npm-package` for clean consumer install proof against the public npm release-candidate package.
- Adds `npm run verify:openclaw-action-receipt-kit` plus Node unit and live E2E tests for the kit.
- Adds `npm run verify:openclaw-developer-journey` and `npm run test:openclaw-developer-journey` to keep the clone-to-confidence path locked.
- Adds GitHub Actions CI for the local kit contract, with live production receipt proof kept manual.
- Preserves developer-owned execution, no private payload exposure, no public token/key issuance, and no official OpenClaw or ClawHub listing, approval, or partnership claim.
