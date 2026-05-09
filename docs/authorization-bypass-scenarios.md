# Authorization Bypass Scenario Proof

This proof keeps the public developer path concrete:

```text
Action Card -> Relay -> Decision Receipt -> developer-owned execution
```

Relay does not host the agent, hold the private policy engine, or execute the downstream action. The public examples show how a developer can carry authority context in an Action Card, send refs only to Relay, and route execution from the Decision Receipt.

## Scenario Pack

### Authorized CRM Account Update

```bash
npm run example:relay -- --example=authorized-crm-account-update --json
```

Target and action type are inside the declared authority scope. Relay still returns a receipt before execution.

### Blocked Cross-Resource CRM Update

```bash
npm run example:relay -- --example=blocked-cross-resource-crm-update --json
```

Target is outside the declared authority scope and must not auto-proceed.

### Blocked Payment Without Authority

```bash
npm run example:relay -- --example=blocked-payment-without-authority --json
```

Payment action is outside the declared authority scope and must not auto-proceed.

Run the live proof:

```bash
npm run verify:authorization-bypass-scenarios
```

The verifier sends all three Action Cards to production Relay and checks that:

- every response returns a Decision Receipt, trace ref, transaction ref, and `decision_gate_only_developer_keeps_execution`
- blocked authority-mismatch scenarios do not return `proceed`
- examples use refs instead of private payloads, customer content, secrets, API keys, or access tokens
- production identity remains Registry Agent Passport backed

## Production Boundary

In production, the authority refs should come from your own authorization layer and Registry-backed Agent Passport standing. Relay can evaluate the Action Card and return a governed receipt, but your system remains responsible for final policy source of truth, private data access, downstream tool execution, and audit storage.

The proof is intentionally narrow. It does not claim a public SDK, public Agent Card route, public A2A support, or open production MCP access.
