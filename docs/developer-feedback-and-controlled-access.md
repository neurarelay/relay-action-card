# Developer Feedback And Controlled Access

Run the public proof first, then choose the next action.

```text
Demo Action Card -> Relay -> Decision Receipt -> trace ref
```

For production identity, create a Registry Agent Passport before sending your own agent's Action Card to Relay:

```text
https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew
```

Relay uses the Agent Passport refs to validate identity, capability, version, and standing. Relay does not create or approve the Agent Passport.

## After Your First Receipt

Open a first-receipt feedback issue when you have:

- run `npm run example:relay`
- received a Decision Receipt ref
- received a trace ref, when available
- confirmed whether the Registry Agent Passport step is clear

Share refs only. Do not paste customer data, private payloads, secrets, API keys, access tokens, or proprietary policy content.

Feedback issue:

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=first-receipt-feedback.yml
```

## Controlled MCP Access

Request controlled MCP access only when you have a concrete MCP-capable agent runtime and a consequential pre-action decision to prove.

Current boundary:

- public open path: `POST /api/resolve`
- protected MCP path: `https://www.neurarelay.com/mcp`
- access model: controlled beta token, not public self-serve token issuance
- execution model: Relay returns a Decision Receipt and does not execute downstream actions
- privacy model: refs only, no private payload exposure

Controlled MCP access issue:

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml
```

Controlled MCP beta access has its own operating path:

```text
Public proof -> Registry Agent Passport -> controlled MCP request -> private token handoff -> live proof -> rotation or revocation
```

Read the operating path before requesting access:

```text
docs/controlled-mcp-beta-access.md
```

Tokens are never shared in GitHub issues. If access is approved, handoff happens privately, and Neura can rotate or revoke controlled beta access.

## Production Adoption Loop

```text
Run demo example
Create Registry Agent Passport
Send production Action Card to Relay
Store Decision Receipt and trace ref
Open feedback or controlled-access issue with refs only
```

This keeps the public path frictionless while keeping production identity, protected MCP access, and private payload boundaries explicit.
