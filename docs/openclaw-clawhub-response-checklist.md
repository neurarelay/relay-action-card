# ClawHub Response Checklist

Status: local response plan; no ClawHub publication, listing, approval, or partnership claim
Date: 2026-05-13

Use this when `openclaw/clawhub#2190` receives maintainer/admin feedback.

## If Publisher Access Is Granted

1. Confirm the grant scope is exactly `@neurarelay` publisher access for `@rpelevin` or a verified `@neurarelay` org/team publisher path.
2. Rerun the release gate locally using Node `24`:

   ```bash
   nvm use
   npm run verify:openclaw-clawhub-release
   ```

3. Run the exact dry-run command one more time:

   ```bash
   clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter --dry-run --json
   ```

4. Stop for Roman approval before the real publish command:

   ```text
   Approved: publish @neurarelay/openclaw-preflight-adapter@0.1.0 to ClawHub.
   ```

5. Only after that exact approval, run:

   ```bash
   clawhub package publish examples/openclaw/preflight-adapter --family code-plugin --owner neurarelay --name @neurarelay/openclaw-preflight-adapter --display-name "Neura Relay Preflight Adapter" --version 0.1.0 --tags stable --source-repo neurarelay/relay-action-card --source-path examples/openclaw/preflight-adapter
   ```

6. Verify install and runtime inspection:

   ```bash
   openclaw plugins install clawhub:@neurarelay/openclaw-preflight-adapter@0.1.0
   openclaw plugins inspect neura-relay-preflight-adapter --runtime --json
   npm run verify:openclaw-runtime-approval
   ```

7. Record the result without claiming official OpenClaw / ClawHub endorsement unless maintainers explicitly state that status.

## If Maintainers Ask For Authority Proof

Reply with only the requested proof and keep it scoped to namespace control. Useful proof surfaces:

- `neurarelay/relay-action-card` ownership and write access
- npm package ownership for `@neurarelay/openclaw-preflight-adapter`
- current green CI run for the package source
- maintainer evidence packet: [`openclaw-clawhub-maintainer-packet.md`](openclaw-clawhub-maintainer-packet.md)

Do not paste private tokens, API keys, internal dashboards, or private payloads into the issue.

## If Maintainers Request Package Changes

1. Treat the request as product review feedback, not approval.
2. Patch the package source under `examples/openclaw/preflight-adapter`.
3. Rerun:

   ```bash
   nvm use
   npm run verify:openclaw-clawhub-release
   npm run verify:openclaw-submission-readiness
   ```

4. Publish a new npm version only after Roman approves the version and changelog.
5. Update the ClawHub issue with the new package/version evidence only after Roman approves the public text.

## If Access Is Rejected Or Deferred

- Keep npm as the stable public install path.
- Keep the repo docs as OpenClaw-style examples, not an official ClawHub listing.
- Do not create another issue unless maintainers ask for a new route.
- Continue developer adoption through `npm install @neurarelay/openclaw-preflight-adapter` and the copy-paste integration path.

## Claim Boundaries

- no official OpenClaw / ClawHub integration, listing, approval, publication, partnership, endorsement, or namespace approval claim until it is real
- no downstream execution by Neura
- no private payload exposure
- no public API-key issuance
- no public production MCP token issuance
- no public A2A token issuance
- no unprotected A2A execution
- no Registry auto-approval

