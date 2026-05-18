# Runtime-Bound Action Card Proof v0.1

This local proof answers the binding problem:

```text
actual runtime/tool invocation
-> derived Action Card
-> Relay Decision Receipt
-> receipt valid only for that exact call
-> runtime-owned proceed / revise / stop / human_review route
```

The Action Card is generated from the invocation envelope captured at the tool boundary. It is not a separate written description of intent. The Decision Receipt binds to the exact `call_ref` and envelope hash. If the target, tool/action, or params hash changes after the receipt is issued, the old receipt no longer applies.

## Run

```bash
npm run proof:runtime-binding -- --dry-run --json
```

List or run one scenario:

```bash
npm run proof:runtime-binding -- --list
npm run proof:runtime-binding -- --dry-run --only=package-publish-human-review --json
```

Verify the proof packet:

```bash
npm run verify:runtime-bound-action-card-proof
```

## Invocation Envelope

Each envelope is refs-only and contains the binding fields used for the receipt hash:

- `call_ref`
- `actor_ref`
- `runtime_ref`
- `tool_ref`
- `action_ref`
- `target_ref`
- `params_hash`
- `policy_context_ref`
- `evidence_refs`
- `source`
- `campaign`
- `surface`

The proof keeps parameter content outside Neura. Only `params_hash` is carried into the Action Card and receipt binding.

## Scenarios

`repo-search-proceed`
Read-only repository search. Decision: `proceed`.

`issue-comment-revise`
Public issue-comment attempt without enough review context. Decision: `revise`.

`package-publish-human-review`
Package publication attempt. Decision: `human_review`.

`deployment-promote-stop`
Production deployment promotion attempt without approval. Decision: `stop`.

## Binding Checks

The verifier locks these mutation scenarios:

- unchanged invocation -> receipt remains applicable
- changed target -> old receipt no longer applies
- changed tool/action -> old receipt no longer applies
- changed params hash -> old receipt no longer applies
- high-risk call -> `human_review` or `stop`

## Runtime Ownership

Neura returns the decision record: `receipt_ref`, `trace_ref`, decision, route, and binding refs. The runtime/tool adapter owns whether and how execution proceeds. The proof records `runtime_must_recheck_binding_before_execution: true`, `execution_performed_by_neura: false`, and `downstream_tool_executed_in_dry_run: false`.

## Boundaries

This is a local dry-run proof packet:

- no downstream execution by Neura
- no private payload persistence
- no token or secret values
- no raw user data, customer content, file contents, or browser form values
- no provider approval, listing, endorsement, integration, or partnership claim
- no official OpenClaw, ClawHub, MCP, ADK, OpenAI, Anthropic, A2A, Google, Cisco, Outshift, AGNTCY, or other provider claim
- no public token issuance, provider submission, website update, public GitHub comment, package publish, or public distribution action
- no full data-flow provenance claim

The product point is narrow: authority must bind to the real action boundary, and the receipt must fail closed when the call changes.
