# Neura Developer Examples

This folder has five lanes.

- **Core Relay** (`core`): send an Action Card to Relay and receive a Decision Receipt.
- **OpenClaw-style receipt kit** (`openclaw`): run public-safe autonomous computer-use Action Cards, a visual near-miss workbench, and a local preflight adapter release candidate.
- **CrewAI-style guardrail metadata** (`crewai`): attach a Neura pre-action receipt ref beside a guardrail verdict as provider-owned metadata.
- **A2A protected proof** (`a2a`): inspect public Agent Card discovery and run controlled protected `message/send` proof when access exists.
- **Optional MCP** (`mcp`): call Relay through protected MCP tools with a Workspace sandbox token or controlled production/private access.
- **SDK** (`sdk`): use the typed `@neurarelay/sdk` public package path.

The core path is the default:

```text
Action Card -> Relay -> Decision Receipt -> trace
```

The OpenClaw-style path is public-safe local-action review:

```text
Local autonomous action -> Action Card -> Relay -> Decision Receipt -> developer-owned route
```

For `proceed` receipts, the OpenClaw-style developer route is execution-ready only when delegated authority is Registry-backed and ready. Public demo refs that are only developer-supplied hold for Registry-backed authority.

The CrewAI-style guardrail path keeps the guardrail verdict separate from the receipt reference:

```text
GuardrailDecision verdict -> metadata["receipt_ref"] -> pre-action Decision Receipt ref
```

It is external proof alignment only, not a CrewAI integration, approval, listing, endorsement, or partnership claim.

The MCP path is only an adapter:

```text
MCP runtime -> protected Neura MCP tool -> same Relay decision spine
```

The SDK path packages the same mechanism:

```text
SDK client -> Action Card -> Relay -> Decision Receipt
```

The A2A path keeps discovery public and execution protected:

```text
A2A client -> public Agent Card -> protected /a2a message/send -> Decision Receipt task
```

For MCP-capable runtimes, start here when you need a protected tool-call governance example rather than a standalone SDK. The examples show how to validate or resolve an Action Card before developer-owned execution.

## Structure

```text
examples/
  core/
    action-card.json
    action-card-high-risk.json
    action-cards/
      support-reply.json
      account-api-write.json
      refund-exception.json
      data-export.json
      payment-release.json
      workflow-state-change.json
      authorized-crm-account-update.json
      blocked-cross-resource-crm-update.json
      blocked-payment-without-authority.json
      delegated-crm-account-update.json
      delegated-wrong-resource.json
      delegated-wrong-action.json
      delegated-expired-authority.json
    resolve-action-card.mjs
  mcp/
    action-cards/
      customer-reply.json
      crm-update.json
      refund-review.json
      deploy-change.json
      registry-ready-evidence-capture.json
      blocked-funds-transfer.json
    provider-runtime-paths.md
    direct-mcp-client.mjs
    openai-responses-remote-mcp.mjs
    anthropic-messages-mcp.mjs
    google-adk-remote-mcp.py
    microsoft-agent-framework-mcp.py
    claude-code-neura.mcp.example.json
    agent-passport-authority-standing.example.json
  a2a/
    README.md
    resolve-action-card-a2a.mjs
  crewai/
    README.md
    guardrail_receipt_ref.py
  openclaw/
    README.md
    action-receipt-kit.manifest.json
    run-action-receipt-kit.mjs
    run-developer-journey-proof.mjs
    run-near-miss-workbench.mjs
    run-preflight-adapter.mjs
    run-workspace-decision-surface.mjs
    action-cards/
      send-message.json
      edit-file.json
      delete-file.json
      browser-submit.json
      shell-command.json
      workflow-state-change.json
      memory-write.json
      data-export.json
    near-miss-workbench/
      scenarios.json
    workspace-surface/
      scenarios.json
    preflight-adapter/
      README.md
      openclaw.plugin.json
      package.json
      index.mjs
      adapter.mjs
      fixtures/
        send-message.preflight.json
  sdk/
    README.md
    resolve-action-card-sdk.mjs
    resolve-action-card-sdk-a2a.mjs
    authority-routing.mjs
```

`examples/mcp/action-cards` contains Action Cards used as inputs to MCP tool calls. It is not a separate protocol and it does not replace `examples/core`.

`examples/openclaw` contains OpenClaw-style public-safe examples only. The npm adapter RC is public, but the lane is not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership.

## Fast Checks

Run the public core path:

```bash
npm run example:relay
```

Run the OpenClaw-style local proof:

```bash
npm run openclaw:proof
npm run openclaw:workbench
npm run openclaw:workspace-proof
npm run openclaw:dry-run
npm run verify:openclaw-workspace-surface
npm run verify:openclaw-action-receipt-kit
npm run verify:crewai-guardrail-receipt-ref
```

For the full OpenClaw-style developer path, read [`../docs/openclaw-developer-journey.md`](../docs/openclaw-developer-journey.md).

List and run the public Action Card examples:

```bash
npm run example:relay -- --list-examples
npm run example:relay -- --example=account-api-write
npm run example:relay -- --example=refund-exception
npm run example:relay -- --example=data-export
npm run example:relay -- --example=payment-release
npm run example:relay -- --example=workflow-state-change
npm run example:relay -- --example=authorized-crm-account-update
npm run example:relay -- --example=blocked-cross-resource-crm-update
npm run example:relay -- --example=blocked-payment-without-authority
npm run example:relay -- --example=delegated-crm-account-update
npm run example:relay -- --example=delegated-wrong-resource
npm run example:relay -- --example=delegated-wrong-action
npm run example:relay -- --example=delegated-expired-authority
```

Run the authorization-bypass scenario proof:

```bash
npm run verify:authorization-bypass-scenarios
```

The proof sends one authorized Action Card and two authority-mismatch Action Cards to production Relay. The blocked scenarios must not auto-proceed, and every scenario keeps execution with the developer-owned system.

Run the delegated authority proof:

```bash
npm run verify:delegated-authority-scenarios
```

The delegated authority proof sends one permitted delegated action, one wrong-resource action, one wrong-action attempt, and one expired-authority action to Relay. It keeps delegated authority refs-only and preserves developer-owned execution.

Run the high-risk core example:

```bash
npm run example:relay -- --example=high-risk
```

Run the protected MCP proof sequence after copying a sandbox token from Relay Workspace or after Neura issues production/private access:

```bash
NEURA_RELAY_MCP_ACCESS_TOKEN=... npm run example:mcp-proof -- --json
```

Inspect the public A2A Agent Card and run protected A2A proof after controlled access is issued:

```bash
npm run example:a2a -- --agent-card-only
RELAY_A2A_ACCESS_TOKEN=... npm run example:a2a -- --json
```

The A2A lane is the Controlled Client Pack v0.2. It checks A2A Controlled Runtime v1, idempotency key ref without raw key return, and Registry Agent Passport required for production identity validation. It is public discovery plus controlled protected execution, not public token issuance, public API-key issuance, an A2A directory listing, or downstream execution by Neura.

Inspect the source-aligned Google ADK and Microsoft templates:

```bash
npm run example:google-adk-mcp
npm run example:microsoft-mcp
```

Run the SDK example after installing dependencies:

```bash
npm install
npm run example:sdk
```

Neura returns governed proof before execution. Your system still owns the agent, private payloads, workflow, and final downstream action.

The demo Action Cards include a demo Agent Passport. Production agents need a Registry Agent Passport before Relay can validate identity, capability, version, and standing. Create the production Agent Passport at [Neura Registry](https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew).

## Production Path

```text
Run demo Action Card -> create Registry Agent Passport -> send production Action Card to Relay -> store Decision Receipt and trace ref
```

Registry is required for production identity. Relay uses the Agent Passport refs; Relay does not create or approve the Agent Passport.

For the end-to-end developer-owned agent flow, see [`../docs/developer-owned-agent-walkthrough.md`](../docs/developer-owned-agent-walkthrough.md).

For the authorization-bypass scenario proof, see [`../docs/authorization-bypass-scenarios.md`](../docs/authorization-bypass-scenarios.md).

## Feedback And Controlled Access

Open a first-receipt feedback issue after you run the public example and receive safe refs:

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=first-receipt-feedback.yml
```

Request controlled MCP access only after you have an MCP-capable runtime and a concrete governed-action use case:

```text
https://github.com/neurarelay/relay-action-card/issues/new?template=controlled-mcp-access.yml
```

Use refs only. Do not share private payloads, customer data, secrets, API keys, or access tokens.

Read the controlled beta access operating path first:

```text
docs/controlled-mcp-beta-access.md
```
