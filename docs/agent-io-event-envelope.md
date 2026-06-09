# Agent I/O Event Envelope

Agent I/O Event Envelope v0.1 is a draft refs-only event shape for capturing consequential agent activity before and after execution.

It turns an agent tool call, message, write, memory update, workflow trigger, payment-adjacent action, or browser/file operation into a stable traffic record that can be tied to a Decision Receipt.

## Core Path

```text
agent intent -> Agent I/O Event -> Action Card -> Decision Receipt -> Traffic Ledger -> replay / audit / analytics
```

## Why It Exists

Agent products increasingly need to answer:

- what the agent tried to do;
- which tool or surface it touched;
- what exact args or target the decision was bound to;
- what approval was requested;
- what policy/evidence was used;
- what receipt was issued;
- what happened after execution;
- whether private payload was stored.

The event envelope gives Relay a portable traffic vocabulary without turning the ledger into a raw payload store.

## Required Posture

Default payload posture:

```text
tier = T0
redaction_status = metadata_refs_hashes_only
private_payload_stored = false
```

The event can carry refs, hashes, counts, categories, ids, and redacted metadata. It must not carry raw secrets, tokens, passwords, private keys, session cookies, provider keys, or private customer payload by default.

## Event Types

V0 focuses on:

| Event | Meaning |
| --- | --- |
| `tool.call.proposed` | A consequential tool call was proposed before execution. |
| `mcp.approval.requested` | The call requires human or policy approval. |
| `decision.issued` | Relay issued the Decision Receipt. |
| `execution.completed` | Developer-owned runtime reported the downstream outcome. |

Future events can cover stale approval, consumed approval, changed args, trace replay, and exports.

## Example Scenarios

The proof fixtures include two bounded-decision patterns:

| Scenario | Purpose | Expected Route |
| --- | --- | --- |
| Refund order approval | Shows a high-risk MCP tool call that requires owner review before execution. | `human_review` |
| Ambiguous Washington travel/procurement target | Shows how a wrong assumption is stopped before booking, payment, message, or memory write. | `revise` |

## Correlation Fields

The important correlation fields are:

- `trace_ref`;
- `transaction_ref`;
- `receipt_id`;
- `action_card_ref`;
- `session_ref`;
- `run_ref`;
- `tool_call_ref`;
- `approval_request_id`;
- `agent_ref`;
- `capability_ref`.

## Run Verification

```bash
npm run verify:agent-io-event-envelope
```

The verifier checks:

- schema and example files exist;
- examples parse as JSON;
- all examples are refs-only;
- `private_payload_stored` remains false;
- required boundary fields are false;
- event refs are unique;
- hash fields use `sha256:`;
- the core event sequence is present;
- docs avoid execution, provider approval, partnership, and compliance overclaims.

## Boundary

This is a local draft proof artifact. It does not call a real MCP server, execute a tool, store private payload, mutate a real system, claim provider approval, claim partnership, claim compliance certification, or claim downstream execution by Neura.
