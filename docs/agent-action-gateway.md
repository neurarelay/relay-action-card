# Agent Action Gateway

Agent Action Gateway is the developer proof path for Neura Relay.

It shows how a proposed consequential agent action becomes an Action Card, passes through Relay governance, and returns a Decision Receipt before the developer-owned runtime decides what happens next.

## Core Path

```text
Agent intent -> Action Card -> Agent Action Gateway -> Decision Receipt -> developer-owned execution or restraint
```

Neura Relay remains the product. Agent Action Gateway is the proof path that makes the authority-before-action mechanism concrete for developers.

## Proof Ladder

Run the full local ladder:

```bash
npm run proof:agent-action-gateway -- --dry-run --json
npm run verify:agent-action-gateway
```

Or run each piece directly:

```bash
npm run proof:agent-action-firewall -- --dry-run --json
npm run verify:decision-receipt-standard
npm run proof:mcp-risk-gate -- --dry-run --json
npm run proof:commerceops-fire-drill -- --dry-run --json
npm run proof:clinicops-synthetic -- --dry-run --json
```

| Step | Proof | What it confirms |
| --- | --- | --- |
| 01 | Agent Action Firewall | Proposed actions classify as `allow`, `revise`, `human_review`, or `stop` before execution |
| 02 | Decision Receipt Standard | Receipt fields bind the decision to action type, target, params hash, actor, policy, evidence, authority, and trace refs |
| 03 | MCP Risk Gate | MCP-style tool calls bind to exact server, tool, target, actor, and params hash before runtime-owned execution |
| 04 | CommerceOps Fire Drill | Commerce actions such as refunds, discounts, address changes, cancellations, replies, and promises receive receipts before execution |

Applied proof cases can extend the ladder without changing the core four-step Gateway proof. ClinicOps Synthetic Proof is one such applied case for regulated-style synthetic workflows:

```bash
npm run verify:clinicops-synthetic
```

## Output

The full ladder returns one JSON artifact with:

- each proof status
- decision counts across the ladder
- scenario counts
- receipt standard status
- attribution fields
- proof boundaries
- next-step links

The output is designed to be used as a local developer receipt-path proof, not as a production integration claim.

## What This Proves

This proof shows the same mechanism across three environments:

- a generic proposed agent action
- an MCP-style tool-call boundary
- a money-moving commerce workflow
- a regulated-style synthetic workflow

Different contexts, same Relay mechanism:

```text
proposed action -> policy / evidence / authority / risk check -> Decision Receipt -> developer-owned route
```

## Boundaries

This is a local dry-run proof with synthetic data only.

No downstream execution by Neura.

It does not touch Shopify, payment rails, fulfillment systems, customer accounts, customer-message channels, real MCP servers, production systems, external providers, private payloads, real customer records, PHI, real provider systems, real insurer systems, real EHRs, real scheduling systems, real patient messages, or real prior-authorization submissions.

It does not claim provider approval, insurer approval, marketplace listing, compliance certification, HIPAA compliance, medical advice, clinical accuracy, production integration, partnership, public token issuance, Registry auto-approval, or downstream execution by Neura.

Developer-owned runtimes still execute, revise, escalate, or stop downstream actions after reading the receipt.

## Live Surface

The production-facing Gateway page is:

```text
https://www.neurarelay.com/agent-action-gateway
```

The first local preview page is:

```text
https://www.neurarelay.com/developers/first-proof
```

The measurable path is:

```text
GitHub / npm / site visit -> local Gateway proof -> first receipt refs -> qualified developer reply
```
