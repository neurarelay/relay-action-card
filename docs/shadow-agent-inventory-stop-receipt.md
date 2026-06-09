# Shadow Agent Inventory / Stop Receipt

Status: synthetic service-framing proof; no customer runtime shutdown authorization

Shadow Agent Inventory / Stop Receipt turns existing agent traffic, tool-call, authority, and policy refs into an audit finding and a stop recommendation receipt.

```text
traffic refs -> inventory finding -> stop recommendation receipt -> customer-runtime shutdown or quarantine
```

Neura can identify risky or ungoverned agent activity and issue a receipt that says what should stop. The customer runtime, owner, or security team owns the actual shutdown, token disablement, schedule pause, tool revoke, quarantine, or follow-up enforcement.

## Run The Proof

```bash
npm run proof:shadow-agent-inventory -- --dry-run --json
npm run verify:shadow-agent-inventory-stop-receipt
```

The proof is local and synthetic. It does not read a real customer runtime, disable an agent, revoke credentials, modify policies, contact a provider, or store private payload.

## What The Proof Contains

| Artifact | Path | Purpose |
| --- | --- | --- |
| Manifest | `examples/shadow-agent-inventory/manifest.json` | Defines the service frame, source refs, commands, and boundary flags. |
| Inventory findings | `examples/shadow-agent-inventory/findings/*.json` | Shows governed, stale-authority, and shadow-agent findings from refs-only traffic. |
| Stop receipts | `examples/shadow-agent-inventory/receipts/*.json` | Shows stop recommendation receipts for ungoverned or stale-authority agents. |
| Proof runner | `examples/shadow-agent-inventory/run-proof.mjs` | Prints the inventory findings and stop receipts as a dry-run packet. |
| Verifier | `scripts/verify-shadow-agent-inventory-stop-receipt.mjs` | Verifies docs, examples, command routing, refs-only payload posture, and shutdown boundaries. |

## Finding Types

| Finding | Meaning | Receipt action |
| --- | --- | --- |
| `known_governed_agent` | Agent has owner, authority refs, policy refs, and recent governed traffic. | No stop receipt. Keep monitoring. |
| `stale_authority_agent` | Agent is still active after authority expiry or revocation context changed. | Issue stop recommendation receipt. |
| `shadow_agent_detected` | Agent activity is visible in traffic refs, but owner or authority cannot be matched. | Issue stop recommendation receipt. |

## Stop Receipt Shape

A stop receipt is a specialized Decision Receipt:

- `standard = neura-decision-receipt-v0.1-draft`
- `receipt_type = shadow_agent_stop_receipt`
- `decision = stop`
- `runtime_instruction = customer_runtime_stop_or_quarantine`
- `payload.redaction_status = metadata_refs_hashes_only`
- `boundary.private_payload_stored = false`
- `boundary.downstream_execution_performed_by_neura = false`
- `boundary.customer_runtime_shutdown_performed_by_neura = false`
- `execution.customer_runtime_owns_shutdown = true`

The receipt binds the agent ref, runtime ref, observed action classes, evidence refs, policy refs, authority state, validity invalidators, and blocked downstream actions. It does not contain raw prompts, raw tool arguments, customer data, secrets, cookies, access tokens, or provider credentials.

## Service Packet

Use this lane when a buyer, maintainer, operator, or security reviewer asks:

- Which agents are acting without clear owner or authority?
- Which agent actions should be stopped before the next run?
- Which receipts prove why a stop recommendation was issued?
- Which refs should a customer runtime use to disable, quarantine, pause, or review an agent?
- Which risks come from stale authority, missing owner, changed args, missing purpose, or ungoverned data movement?

Do not use this lane to claim that Neura is a runtime kill switch, endpoint control plane, SIEM, IAM provider, compliance certifier, or customer enforcement system.

## Boundary

This proof is synthetic. It does not touch customer systems, providers, production runtimes, payment rails, real accounts, real agent tokens, real message channels, or private data.

Neura does not shut down agents in this proof. Neura issues a stop recommendation receipt. The customer runtime owns shutdown, quarantine, credential revocation, schedule pause, tool revoke, and enforcement.

No provider approval, customer adoption, compliance certification, public action, PR, GitHub comment, email, DM, deployment, token issuance, or partnership claim is made or authorized by this proof.
