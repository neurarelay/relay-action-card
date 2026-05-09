# SDK Alpha Path

Status: staged for `@neurarelay/sdk@0.1.0-alpha.0`; npm publication is not claimed until the package is actually published.

The SDK path keeps the same core mechanism as the public example:

```text
Action Card -> Relay -> Decision Receipt -> developer-owned execution
```

Use the SDK after alpha publication when you want typed helpers around the same Relay surfaces already proven in this repo.

## Install

```bash
npm install @neurarelay/sdk
```

Until publication is approved, use the direct core example:

```bash
npm run example:relay -- --example=support-reply --json
```

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
```

## Optional Protected Adapters

The SDK also exposes helper clients for the optional protected paths:

- `relay.a2a.getAgentCard()` for public Agent Card metadata
- `relay.a2a.sendActionCard(actionCard)` for protected A2A `message/send`
- `relay.mcp.listTools()` for protected MCP tool discovery
- `relay.mcp.resolveActionCard(actionCard)` for protected MCP `resolve_action_card`

MCP and A2A execution remain protected. The SDK does not issue public API keys, public production MCP tokens, public A2A tokens, downstream execution, private payload exposure, or Registry auto-approval.
