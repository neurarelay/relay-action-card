# SDK Alpha Path

Status: published npm alpha for `@neurarelay/sdk@0.1.0-alpha.1`.

The SDK path keeps the same core mechanism as the public example:

```text
Action Card -> Relay -> Decision Receipt -> developer-owned execution
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
```

For a clean outside-consumer proof that installs from npm instead of using this repo's dependency tree:

```bash
npm run verify:sdk-alpha1-consumer
```

That verifier creates a temporary Node project, installs `@neurarelay/sdk@0.1.0-alpha.1`, resolves the example Action Card against Relay, checks public A2A Agent Card discovery, and runs protected A2A only when `RELAY_A2A_ACCESS_TOKEN` is available.

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

For a runnable protected A2A client shape, see `examples/a2a`. It discovers the public Agent Card first, then requires `RELAY_A2A_ACCESS_TOKEN` before calling protected `message/send`.
