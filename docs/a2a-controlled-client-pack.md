# A2A Controlled Client Pack

Status: v0.2 controlled-access proof for SDK alpha.4 with A2A Controlled Runtime v1 response checks.

This pack proves the narrow A2A surface Neura can stand behind today:

```text
public Agent Card discovery -> controlled /a2a message/send -> Decision Receipt task
```

It is not a public A2A token program, public API-key program, agent directory listing, ecosystem approval, or downstream execution service. The core Relay path remains:

```text
Action Card -> Relay -> Decision Receipt -> developer-owned execution
```

## What To Run

Install the example dependencies:

```bash
npm install
```

Inspect public A2A discovery:

```bash
npm run example:a2a -- --agent-card-only
```

Run protected execution only after controlled access is issued:

```bash
RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json
```

Verify the pack:

```bash
npm run verify:a2a-authenticated-client
```

Without `RELAY_A2A_ACCESS_TOKEN`, the verifier proves public discovery and reports the protected execution proof as skipped. With a token, it also confirms the protected `message/send` task returns a Decision Receipt, trace ref, and transaction ref.

## Controlled Access Lane

1. Run the public Action Card example and keep the safe receipt refs.
2. Create or confirm the production Registry Agent Passport for the acting agent.
3. Request controlled access with a concrete governed-action use case.
4. Receive the A2A access token out of band.
5. Set `RELAY_A2A_ACCESS_TOKEN` locally and run the protected proof.
6. Rotate or revoke the token when access is no longer needed.

Do not paste tokens into GitHub issues, docs, terminal transcripts, screenshots, support tickets, or shared prompts.

## Output Contract

The JSON proof includes:

- `sdk.package` and `sdk.version`
- public Agent Card name, version, endpoint, and skill ids
- A2A Controlled Runtime v1 version, access model, and refs-only output shape
- idempotency key ref without raw key return
- Registry Agent Passport required for production identity validation
- controlled access model
- completed A2A task state for protected runs
- Decision Receipt id, decision, trace ref, and transaction ref
- refs-only payload posture
- developer-owned downstream execution boundary
- explicit false flags for public token issuance, public API-key issuance, unprotected A2A execution, private payload return, and token-value return

## Non-Claims

This pack does not create:

- public A2A token issuance
- public API-key issuance
- unprotected A2A execution
- A2A directory listing
- A2A ecosystem approval or partnership claim
- downstream execution by Neura
- private payload exposure
- Registry auto-approval
