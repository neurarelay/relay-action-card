# Changelog

## Public proof conversion refresh - 2026-06-03

- Sharpens the README entry path around first proof, Decision Receipts, optional Registry context, and protected MCP.
- Adds `docs/current-public-proof-map.md` as the current claim-safe route map from developer attention to first-proof evidence, live receipt refs, feedback, Registry identity, sandbox MCP, or controlled production/private access.
- Keeps downloads, clones, views, and stars framed as discovery signals only, not adoption proof.
- Preserves no-customer-adoption, no-provider-approval, no-ecosystem-endorsement, no-integration, no-partnership, no-public-token-issuance, and no-downstream-execution boundaries.

## OpenClaw adapter npm latest publish - 2026-05-28

- Publishes `@neurarelay/openclaw-preflight-adapter@0.1.4` to npm under the `latest` tag through npm Trusted Publishing.
- Aligns npm latest with the canonical ClawHub community package version and the source package version.
- Preserves npm `rc=0.1.0-rc.2`, the historical `@rpelevin/neura-relay-preflight-adapter@0.1.1` ClawHub fallback, and the no-official-claim boundary.

## ClawHub README-only polish release - 2026-05-18

- Publishes the canonical ClawHub community package as `@neurarelay/openclaw-preflight-adapter@0.1.4` from the same source path with no functional behavior changes.
- Moves the package README and metadata to the current canonical ClawHub version so the live ClawHub page presents the clean install path and claim boundaries.
- At publication time, preserved npm latest as `@neurarelay/openclaw-preflight-adapter@0.1.1`; npm latest was moved to `0.1.4` in the later trusted-publishing release.
- Preserves the historical `@rpelevin/neura-relay-preflight-adapter@0.1.1` fallback and keeps the no-official-claim boundary.

## ClawHub canonical community package metadata repair - 2026-05-18

- Publishes the canonical ClawHub community package as `@neurarelay/openclaw-preflight-adapter@0.1.3`, release id `rd72j7xj1e8y2tajcf4h21k9v586z1tw`, source-linked to `neurarelay/relay-action-card@4d4e6730ada58e1589ac2c84c9411c58eabe10a7`.
- Uses plugin id `neurarelay-openclaw-preflight-adapter` so it does not collide with the historical founder-publisher fallback id.
- ClawHub now shows current version `v0.1.3`, `latest` and `stable` tags, visible README, Static analysis pass, and ClawScan / VirusTotal pending.
- Preserves npm latest as `@neurarelay/openclaw-preflight-adapter@0.1.1`; no npm `0.1.3` publish was performed.
- Preserves developer-owned execution, no private payload exposure, no public token/key issuance, and no official OpenClaw or ClawHub listing, approval, endorsement, integration, or partnership claim.

## OpenClaw 5-minute receipt demo - 2026-05-13

- Publishes the founder-publisher fallback package to ClawHub community as `@rpelevin/neura-relay-preflight-adapter@0.1.0`, release id `rd71v95v9mqw6xebweek19qb6x86mfps`, source-linked to `neurarelay/relay-action-card@5b7a87288b90e34f7023ece6188e3e23908fd078`.
- Preserves `@neurarelay/openclaw-preflight-adapter@0.1.0` as the canonical npm package while `openclaw/clawhub#2190` remains open for canonical publisher namespace access.
- Adds `npm run verify:openclaw-founder-clawhub-publisher` as the claim-safe dry-run fallback for publishing the Neura Relay adapter under Roman's established `@rpelevin` ClawHub publisher while `@neurarelay` namespace access remains pending.
- Updates `docs/openclaw-clawhub-submission-readiness.md` with the founder-publisher fallback command shape, install check, approval text, and no-official-claim boundaries.
- Adds `npm run openclaw:five-minute-demo` as the fastest OpenClaw-style proof loop for message send, file delete, and package publish preflight.
- Adds `npm run verify:openclaw-five-minute-demo` to prove the local demo and a clean outside npm consumer install of `@neurarelay/openclaw-preflight-adapter`.
- Adds `npm run test:openclaw-five-minute-demo` for deterministic dry-run coverage of the three severe developer scenarios.
- Adds the five-minute demo, verifier, and test to GitHub Actions so the public proof cannot drift silently.
- Adds `examples/openclaw/QUICKSTART.md` as the shortest GitHub visitor path to the OpenClaw-style proof.
- Adds `npm run openclaw:copy-paste-integration`, verifier, test, and docs as the copy-paste runtime guard before message send, file delete, and package publish.
- Moves the stable adapter install and `guardToolCall()` path closer to the top of the README so developers can wire the runtime guard faster.
- Adds a claim-safe ClawHub issue update draft for Roman approval before posting.
- Adds a ClawHub response checklist and verifier for grant, proof request, package-change request, rejection, or deferral paths.
- Adds a generic computer-use agent loop example, visual transcript, verifier, test, and docs that pause before message send, file delete, and package publish execution.
- Adds `docs/openclaw-clawhub-maintainer-packet.md` as a concise public-safe evidence index for ClawHub publisher-access review.
- Documents the install-to-proof path in `docs/openclaw-five-minute-receipt-demo.md` without changing the already-published npm `0.1.0` package contents.
- Preserves developer-owned execution, refs-only payloads, no public token/key issuance, no downstream execution by Neura, and no official OpenClaw or ClawHub listing, approval, publication, or partnership claim.

## OpenClaw Preflight Adapter stable npm package - 2026-05-13

- Publishes `@neurarelay/openclaw-preflight-adapter@0.1.0` as the stable npm package under the `latest` tag.
- Keeps npm `rc` on `0.1.0-rc.2` for release-candidate history.
- Updates the adapter package metadata, README, verification gates, and ClawHub dry-run packet to use the stable npm install path.
- Preserves developer-owned execution, no private payload exposure, no public token/key issuance, and no official OpenClaw or ClawHub listing, approval, or partnership claim.

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
- Adds `npm run verify:openclaw-clean-consumer` to ensure a fresh npm install does not dirty the checkout or drift the root Node engine lockfile.
- Adds `npm run verify:openclaw-action-receipt-kit` plus Node unit and live E2E tests for the kit.
- Adds `npm run verify:openclaw-developer-journey` and `npm run test:openclaw-developer-journey` to keep the clone-to-confidence path locked.
- Adds GitHub Actions CI for the local kit contract, with live production receipt proof kept manual.
- Preserves developer-owned execution, no private payload exposure, no public token/key issuance, and no official OpenClaw or ClawHub listing, approval, or partnership claim.
