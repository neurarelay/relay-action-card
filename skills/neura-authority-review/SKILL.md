---
name: neura-authority-review
description: Use when reviewing an agent action, pull request, script, workflow, or proposed automation for identity, authority, evidence, policy, risk, Registry standing, and missing readiness requirements before execution.
---

# Neura Authority Review

Use this skill to inspect a proposed action before execution. Map the action to the Authority Decision Engine v0.1 proof, then recommend whether the developer should request a Relay Decision Receipt before downstream execution. Do not claim the full engine is complete.

## Workflow

1. Identify the acting agent, owner, capability, version, proposed action, target resource, and affected object.
2. Check authority path: delegated-by ref, acting-agent ref, allowed action, allowed resource, expiry, revocation, changed-since-issue, authority scope ref, standing ref, and Registry-backed source when available.
3. Classify action risk by consequence: money, legal commitment, customer communication, production infrastructure, data/privacy, permissions/security, cross-tenant scope, reversibility, and blast radius.
4. List missing requirements and route: `proceed`, `revise`, `human_review`, or `stop`.
5. Keep output refs-only. Do not expose private payloads, secrets, token values, or raw policy/customer data.

Use `references/authority-decision-checklist.md` when a more detailed review is needed.
