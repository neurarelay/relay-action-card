# SDK Path

Status: published stable npm package for `@neurarelay/sdk@0.1.0`.

This is the public npm package path for the SDK examples.

Version 0.1.0 includes typed `authority_context.source` support in the SDK package. The JavaScript examples also read the same runtime field returned by production Relay.

The SDK path keeps the same core mechanism as the public example:

```text
SDK client -> Action Card -> Relay -> Decision Receipt -> developer-owned execution
```

Use the SDK when you want typed helpers around the same Relay surfaces already proven in this repo.

## Install

```bash
npm install @neurarelay/sdk
```

Or install this example repo and run the packaged SDK proof:

```bash
npm install
npm run example:sdk
npm run example:sdk:authority-routing
```

Optional refs-only activation attribution:

```bash
npm run example:sdk -- --source=sdk_docs --campaign=first_receipt
NEURA_SOURCE=github NEURA_CAMPAIGN=sdk_authority npm run example:sdk:authority-routing
```

Relay records only source, campaign, surface, session, and UTM refs with the receipt ledger. It does not record token values or private action payloads.

The authority-routing example runs the four delegated-authority Action Cards and turns each Decision Receipt into an application route:

- `ready_for_developer_owned_execution` only when the receipt is `proceed` and delegated authority is Registry-backed as `ready`
- `hold_for_registry_backed_authority` when the receipt can proceed but the public demo refs are only `developer_supplied_unverified`
- `human_review`, `revise`, or `stop` when Relay says the action should not auto-proceed

This keeps execution in the developer-owned system. It is no public API-key issuance, no public token issuance, no downstream execution, and no Registry auto-approval.

Inspect public A2A discovery through the SDK and, when controlled access exists, run protected `message/send`:

```bash
npm run example:sdk:a2a
RELAY_A2A_ACCESS_TOKEN=... npm run example:sdk:a2a
```

For a clean outside-consumer proof that installs from npm instead of using this repo's dependency tree:

```bash
npm run verify:sdk-stable-consumer
npm run verify:sdk-authority-routing
```

That verifier creates a temporary Node project, installs `@neurarelay/sdk@0.1.0`, checks aggregate and subpath SDK exports, resolves the example Action Card against Relay, checks public A2A Agent Card discovery, and runs protected A2A only when `RELAY_A2A_ACCESS_TOKEN` is available.

## Resolve With SDK

```js
import { createNeuraRelaySdk } from "@neurarelay/sdk";

const relay = createNeuraRelaySdk({
  baseUrl: "https://www.neurarelay.com"
});

const response = await relay.resolve.resolve({
  action_card: actionCard
});

console.log(response.decision_receipt?.decision);
console.log(response.decision_receipt?.trace_ref);
console.log(response.decision_receipt?.authority_context?.source);
```

For delegated-authority Action Cards, `authority_context.source` is either `registry_reference_packet` or `developer_supplied_unverified`.

## Authority Routing

```js
const route =
  receipt.decision === "proceed" &&
  receipt.authority_context?.source === "registry_reference_packet" &&
  receipt.authority_context?.registry_validation_status === "ready"
    ? "ready_for_developer_owned_execution"
    : "hold_for_registry_backed_authority";
```

Public demo Action Cards should report `developer_supplied_unverified`, so the example deliberately holds before production execution. A private developer flow can use the protected Relay route and the SDK private developer helper to inspect `production_trust.delegated_authority` before choosing the same route.

## Optional Protected Adapters

The SDK also exposes helper clients for the optional protected paths:

- `relay.a2a.getAgentCard()` for public Agent Card metadata
- `relay.a2a.sendActionCard(actionCard)` for protected A2A `message/send`
- `relay.mcp.listTools()` for protected MCP tool discovery
- `relay.mcp.resolveActionCard(actionCard)` for protected MCP `resolve_action_card`

MCP and A2A execution remain protected. The SDK does not issue public API keys, public production MCP tokens, public A2A tokens, downstream execution, private payload exposure, or Registry auto-approval.

For a runnable protected A2A client shape, see `examples/a2a` and `docs/a2a-controlled-client-pack.md`. It discovers the public Agent Card first, then requires `RELAY_A2A_ACCESS_TOKEN` before calling protected `message/send`.
