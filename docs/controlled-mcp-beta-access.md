# Controlled MCP Beta Access

This is the operating path for requesting protected Neura Relay MCP access.

It is not public production token issuance. It is not a self-serve API-key system. It is not a packaged SDK. It is the production/private beta path for qualified developers who already proved the open Action Card loop and have a concrete MCP-capable runtime.

For first proof, signed-in Relay Workspace can issue a one-time sandbox MCP token instantly:

```text
https://www.neurarelay.com/developers/workspace
```

Sandbox access is limited, expires, stores only token hash/fingerprint/preview metadata, and does not create production Registry standing.

## Access Model

```text
Sandbox proof -> Registry Agent Passport -> controlled MCP request -> private token handoff -> live proof -> rotation or revocation
```

The open public path stays first:

```text
Action Card -> POST /api/resolve -> Decision Receipt -> trace ref
```

The MCP path stays optional:

```text
MCP-capable runtime -> protected /mcp -> same Relay decision spine
```

Use the Workspace sandbox for immediate MCP testing. Use this controlled-access path for production/private MCP, higher trust, organization use, or longer-running beta access.

## Qualification Checklist

A production/private MCP request is ready for review when it includes:

- public Action Card receipt ref or clear reason the public path cannot be run yet
- sandbox MCP proof, when available
- concrete MCP runtime, such as OpenAI Responses remote MCP, Claude Messages MCP, Claude Code, Google ADK, Microsoft Agent Framework / Foundry, or a custom MCP client
- governed-action use case with no private payload content
- requested Neura MCP tools from the five-tool protected surface
- Registry Agent Passport status for production identity
- contact path for private token handoff and revocation notice
- acknowledgement that Neura returns Decision Receipts and does not execute downstream actions

## Token Handoff Rules

Controlled production/private beta token handoff is private. Do not paste tokens into GitHub issues, README files, screenshots, logs, or Action Cards.

For the current v0.1 protected MCP surface:

- token env name: `NEURA_RELAY_MCP_ACCESS_TOKEN`
- endpoint: `https://www.neurarelay.com/mcp`
- transport: MCP Streamable HTTP
- allowed tools: `validate_action_card`, `resolve_action_card`, `get_decision_receipt`, `get_trace_replay`, `lookup_agent_passport`
- exposure rule: token stays in the developer's runtime environment or provider secret store
- proof rule: share receipt refs, trace refs, and high-level status only
- revocation rule: sandbox access can expire or be revoked; Neura can rotate controlled production/private tokens and invalidate beta access

## Beta Proof Sequence

After copying a Workspace sandbox token or receiving private token handoff, run:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp -- --list-tools
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

Expected safe proof:

- unauthenticated MCP requests are rejected
- `tools/list` returns exactly the five Neura tools
- Action Card validation succeeds or returns readable validation errors
- `resolve_action_card` returns a Decision Receipt, transaction ref, and trace ref
- `get_decision_receipt` and `get_trace_replay` return refs-only proof
- `lookup_agent_passport` returns Registry owner, capability, version, readiness, and authority-standing context
- high-risk blocked examples route to `stop`
- no raw private payload, customer content, secrets, or downstream execution controls appear in output

## Revocation And Rotation

Rotate or revoke controlled production/private MCP access when:

- token exposure is suspected
- the beta use case is complete
- the developer no longer needs protected MCP access
- the use case changes from the approved request
- private payloads, secrets, or unsafe logs are shared
- production identity cannot be validated through Registry Agent Passport refs

When revocation happens, the public direct Action Card path remains available. MCP access can be reviewed again through a new controlled-access request.

## What To Share Back

Use refs only:

- Decision Receipt ref
- trace ref
- transaction ref, when present
- Registry Agent Passport readiness status
- tool names exercised
- runtime name and high-level result
- blocker category, if any

Do not share:

- MCP tokens
- provider API keys
- customer data
- private payloads
- raw prompts
- proprietary policy text
- downstream execution logs

## Non-Claims

This beta path does not claim:

- public production MCP token issuance
- public API-key issuance
- self-serve approval
- external Registry submission
- Registry auto-approval
- downstream execution by Neura
- private payload storage by Neura
- packaged SDK availability
- official provider partnership
- A2A discoverability
