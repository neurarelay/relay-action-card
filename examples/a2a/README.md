# A2A Protected Client Proof

Status: controlled client pack v0.2 for SDK alpha.4 with A2A Controlled Runtime v1 response checks.

This example uses the published SDK alpha to call Relay's A2A surface:

```text
A2A client -> public Agent Card -> protected /a2a message/send -> Decision Receipt task
```

Public discovery is available at:

```text
https://www.neurarelay.com/.well-known/agent-card.json
```

Protected execution requires controlled Relay developer or internal access. Neura does not issue public production A2A tokens or public API keys.

For the full controlled-access runbook, see [`../../docs/a2a-controlled-client-pack.md`](../../docs/a2a-controlled-client-pack.md).

## Public Discovery

```bash
npm run example:a2a -- --agent-card-only
```

## Protected Proof

Run only after Neura has issued controlled A2A access:

```bash
RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json
```

The proof returns:

- `@neurarelay/sdk` package name and alpha.4 version
- public Agent Card name, version, endpoint, and skill ids
- A2A JSON-RPC task id and completed state
- A2A Controlled Runtime v1 version, access model, and refs-only output shape
- idempotency key ref without raw key return
- Registry Agent Passport required for production identity validation
- Decision Receipt id and decision
- trace and transaction refs
- refs-only payload posture
- controlled access model
- developer-owned downstream execution boundary
- false flags for public token issuance, public API-key issuance, unprotected A2A execution, private payload return, and token-value return

## Controlled Access Runbook

1. Run the public Action Card example and keep only safe receipt refs.
2. Confirm the production Registry Agent Passport for the acting agent.
3. Request controlled access with a concrete governed-action use case.
4. Receive the A2A token out of band.
5. Set `RELAY_A2A_ACCESS_TOKEN` locally.
6. Run the protected proof and store only receipt, trace, and transaction refs.
7. Rotate or revoke the token when access is no longer needed.

Never paste tokens, private payloads, customer data, API keys, or proprietary authorization details into GitHub issues, docs, screenshots, shared prompts, or support tickets.

## Non-Claims

This example does not create:

- public A2A token issuance
- public API-key issuance
- unprotected A2A execution
- A2A directory listing
- A2A ecosystem approval or partnership claim
- downstream execution by Neura
- private payload exposure
- Registry auto-approval
