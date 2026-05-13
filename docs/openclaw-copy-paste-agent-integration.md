# OpenClaw-Style Copy-Paste Agent Integration

Status: public-safe developer integration example; not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership
Date: 2026-05-13

Use this when an autonomous computer-use runtime needs a Decision Receipt before it sends a message, deletes a file, or publishes a package.

## Install

```bash
npm install @neurarelay/openclaw-preflight-adapter
```

## Guard Before Execution

The runtime pattern is `guardToolCall(toolCall)` -> `adapter.beforeAction(preflightAction)` -> local execution only when the returned route is ready.

```js
import { createNeuraPreflightAdapter } from "@neurarelay/openclaw-preflight-adapter";

const adapter = createNeuraPreflightAdapter();

async function guardToolCall(toolCall) {
  const preflightAction = {
    proposedAction: {
      type: toolCall.type,
      summary: toolCall.summary,
      target: toolCall.targetRef,
    },
    affectedObject: toolCall.targetRef,
    authority: {
      delegatedBy: "user_ref_local_operator",
      actingAgent: "local_agent_ref:computer_use_runtime",
      authorityScope: toolCall.authorityScope,
      allowedActions: [toolCall.type],
      allowedResources: [toolCall.targetRef],
      expiresAt: "2026-12-31T23:59:59Z",
      revocationStatus: "active",
      policyRefs: toolCall.ruleRefs,
      authorityScopeRef: toolCall.authorityScopeRef,
      standingRef: "registry_passport_standing_ref_demo",
    },
    evidenceRefs: toolCall.evidenceRefs,
    ruleRefs: toolCall.ruleRefs,
    riskCategory: toolCall.riskCategory,
  };

  const preflight = await adapter.beforeAction(preflightAction, { dryRun: true });
  const route = preflight.route;

  if (route !== "ready_for_developer_owned_execution") {
    return {
      execute: false,
      route,
      nextStep: "hold_or_review_before_execution",
    };
  }

  return {
    execute: true,
    route,
    nextStep: "developer_runtime_may_execute_local_action",
  };
}
```

The developer runtime keeps execution ownership. Neura returns the receipt route; it does not send the message, delete the file, publish the package, issue credentials, expose private payloads, or execute downstream actions.

## Three Severe Hooks

| Hook point | Action | Receipt before |
| --- | --- | --- |
| Before customer-visible output | `message.send` | external communication |
| Before local destructive change | `file.delete` | workspace mutation |
| Before public distribution | `package.publish` | package release |

Run the local proof:

```bash
npm run openclaw:copy-paste-integration
npm run verify:openclaw-copy-paste-integration
npm run test:openclaw-copy-paste-integration
```

For live Relay receipts:

```bash
npm run openclaw:copy-paste-integration -- --live --json
```

Live mode requests Decision Receipts only. Your runtime still decides whether and how to execute the local action after reviewing the route.

## Claim Boundaries

- not an official OpenClaw or ClawHub integration, listing, approval, publication, or partnership
- no downstream execution by Neura
- no private payload exposure
- no public token or key issuance
- no Registry auto-approval
- developer-owned execution only
