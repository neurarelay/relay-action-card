# A2A Protected Client Proof

Status: public Agent Card discovery plus protected `message/send` proof.

This example uses the published SDK alpha to call Relay's A2A surface:

```text
A2A client -> public Agent Card -> protected /a2a message/send -> Decision Receipt task
```

Public discovery is available at:

```text
https://www.neurarelay.com/.well-known/agent-card.json
```

Protected execution requires controlled Relay developer or internal access. Neura does not issue public production A2A tokens or public API keys.

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

- public Agent Card name, version, endpoint, and skill ids
- A2A JSON-RPC task id and completed state
- Decision Receipt id and decision
- trace and transaction refs
- refs-only payload posture
- developer-owned downstream execution boundary

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
