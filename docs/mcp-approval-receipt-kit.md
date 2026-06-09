# MCP Approval Receipt Kit

MCP Approval Receipt v0.1 is a draft receipt shape for binding a human or policy approval to one exact MCP-style tool call before execution.

It is the narrow developer wedge for Agent I/O Filter:

```text
MCP tool call proposed
-> approval requested
-> Decision Receipt issued
-> MCP Approval Receipt binds exact call
-> developer-owned runtime executes, revises, pauses, or stops
```

## What The Approval Receipt Binds

The receipt binds:

- tenant;
- environment;
- MCP server ref;
- tool name;
- target ref;
- args hash;
- actor ref;
- policy refs;
- evidence refs;
- approval request id;
- Decision Receipt id;
- trace ref;
- expiry;
- one-shot consumption state.

If the tenant, environment, server, tool, target, args hash, actor, policy refs, evidence refs, or approval state changes, the approval receipt does not authorize the new call.

## Invalidation Rules

The approval receipt is invalid when:

- args changed;
- target changed;
- server changed;
- tool changed;
- actor changed;
- policy refs changed;
- evidence refs changed;
- approval expired;
- one-shot receipt was consumed;
- approval was denied, revoked, or still pending;
- execution boundary is missing;
- private payload was stored in the default tier.

## Default Payload Posture

```text
tier = T0
redaction_status = metadata_refs_hashes_only
private_payload_stored = false
```

The approval receipt stores refs and hashes by default. It must not store raw tool arguments, raw tool results, raw secrets, tokens, passwords, private keys, cookies, or provider credentials.

## Run Verification

```bash
npm run verify:mcp-approval-receipt
```

The verifier checks:

- schema and example files exist;
- the approved receipt authorizes only the exact bound call;
- changed args fail;
- changed target fails;
- changed server fails;
- changed tool fails;
- changed actor fails;
- expired approval fails;
- consumed one-shot approval fails;
- default private payload storage remains false;
- no downstream execution by Neura is claimed.

## Boundary

This is a local synthetic proof artifact. It does not call a real MCP server, execute a real tool, mutate a real account, issue a payment, publish a message, store private payload, claim provider approval, claim partnership, claim marketplace listing, claim compliance certification, or claim downstream execution by Neura.
