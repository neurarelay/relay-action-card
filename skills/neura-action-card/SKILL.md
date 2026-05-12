---
name: neura-action-card
description: Use when an agent is asked to draft, review, or prepare a consequential action such as an API write, customer message, refund, payment, workflow state change, data export, permission change, deployment, or other action that should become an Action Card before execution.
---

# Neura Action Card

Use this skill before consequential agent actions. Create an Action Card v0.1 draft that can be sent to Neura Relay for a Decision Receipt before the developer-owned system executes anything.

## Workflow

1. Identify the proposed action, acting agent, target resource, affected object, evidence refs, rule refs, and risk category.
2. Draft an Action Card using `templates/action-card.v0.1.json`.
3. Keep all payloads refs-only. Do not include private customer content, secrets, credentials, token values, raw policy text, or proprietary payloads.
4. Tell the developer that Relay returns the Decision Receipt before execution and that the developer-owned system keeps downstream execution.
5. If authority is delegated, include only refs and posture in `context.authorityContext`.

## Output

Return:

- concise action summary
- Action Card v0.1 JSON
- missing refs or authority context
- recommended Relay command or API path
- reminder that no downstream execution should happen until the Decision Receipt is reviewed

For examples, read `examples/support-reply.md` or `examples/crm-update.md` only when needed.
