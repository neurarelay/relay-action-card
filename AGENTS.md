# Relay Action Card Repository Instructions

## Role and authority

This public repository is Neura's proof, schema, example, skill, adapter, and developer-verification surface for Relay Action Cards and related receipts.

It demonstrates public contracts and bounded integrations. It is not the authoritative private Relay runtime, Registry identity source, or downstream execution engine.

## Runtime and verification

- Use Node 24 as the primary development and CI runtime.
- Preserve `package.json` compatibility with Node `>=22.14.0` unless a separate consumer-compatibility decision changes it.
- Treat `npm run check` as the required local and CI verification entry point.
- Run `npm audit --audit-level=high` for dependency changes and before remote review.

## Change boundaries

- Preserve public examples as synthetic and free of private customer or Capital Guide data.
- Do not add public API-key issuance, public production token issuance, unprotected execution, downstream execution, raw private payloads, or secret values.
- Do not make adoption, official-provider, certification, endorsement, or production-readiness claims without verified evidence and separate approval.
- Package publication, release tags, public narrative changes, and repository settings require separate explicit scope.
- Do not change shared contract versions through maintenance work.

## Documentation and history

- Update factual proof records when implementation or verification truth changes.
- Keep dated historical evidence intact unless a dedicated archival migration is explicitly scoped and verified.
- Use the workspace control layer at `/Users/roman/Drive/Business/Neura Agent Infrastructure` for portfolio strategy and cross-repository authority.
- Do not present a local candidate as published, pushed, merged, or generally adopted.

## External actions

Local inspection, edits, tests, and commits are allowed within the approved task. Pushing, opening or merging pull requests, changing repository settings, publishing packages, and creating releases require an exact consolidated external-action boundary.
