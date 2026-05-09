# Developer-Owned Agent Walkthrough

Neura does not host your agent.

Your agent proposes an action. Your app sends an Action Card to Relay. Relay returns a Decision Receipt before your app executes anything.

```text
Your agent -> Action Card -> Relay -> Decision Receipt -> your app routes execution
```

## First Proof

Run the demo path first:

```bash
npm run example:relay -- --example=support-reply --json
```

The demo cards include a demo Agent Passport so you can receive a first receipt immediately.

## Production Identity

For production, create a Registry Agent Passport before sending your own agent's Action Card to Relay:

```text
https://www.neuraregistry.com/sign-up?next=%2Fbuilder%2Fagents%2Fnew
```

Relay uses the Registry-backed agent id, owner, capability, and capability version to validate identity, capability, version, and standing. Relay does not create the Agent Passport, approve the Agent Passport, host your agent, issue a public token, or execute the downstream action.

## Four Common Patterns

| Pattern | Example | Command |
| --- | --- | --- |
| API write | Account API write | `npm run example:relay -- --example=account-api-write --json` |
| Customer notification | Support reply | `npm run example:relay -- --example=support-reply --json` |
| Financial or operational commitment | Payment release | `npm run example:relay -- --example=payment-release --json` |
| Workflow state change | Workflow state change | `npm run example:relay -- --example=workflow-state-change --json` |

Each pattern follows the same spine:

```text
Action Card -> Relay -> Decision Receipt -> trace ref -> developer-owned execution
```

## Authorization Bypass Scenarios

Use the public scenario proof when you want to test permitted and authority-mismatch Action Cards without sending private data:

```bash
npm run verify:authorization-bypass-scenarios
```

The scenario pack includes one authorized CRM account update and two authority-mismatch scenarios that must not auto-proceed. In production, your own authorization layer should provide the authority refs and Registry-backed Agent Passport standing before Relay returns the governed Decision Receipt.

## What Your App Stores

Store the Decision Receipt, trace ref, transaction ref, and the refs you used to build the Action Card. Do not send private payloads, customer content, secrets, API keys, access tokens, or proprietary policy text.

## What Your App Does Next

Your app reads the Decision Receipt and chooses the next step:

- proceed only when the receipt says the action can proceed
- revise when Relay returns a revised route
- stop when the receipt says the action should not execute
- send to human review when Relay requires review before execution

Neura gives you the governed decision record. Your product keeps the agent, tools, private data, workflow, and final execution.
