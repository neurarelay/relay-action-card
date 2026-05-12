---
name: neura-openclaw-action-card
description: Use when an OpenClaw-style or local autonomous computer-use agent is about to send a message, touch files, submit a browser action, run a shell command, or change workflow state and should draft a Neura Action Card before execution.
---

# Neura OpenClaw-Style Action Card

Use this skill before an OpenClaw-style agent performs a consequential local tool or channel action. Draft an Action Card v0.1 that can be sent to Neura Relay for a Decision Receipt before the user or runtime executes anything.

This is an example skill, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Workflow

1. Identify the proposed action family: message, file, browser, shell, workflow, or data access.
2. Capture refs only: action ref, target ref, user intent ref, evidence refs, rule refs, authority refs, and risk category.
3. Use `templates/openclaw-action-card.v0.1.json` as the draft shape.
4. Do not include raw message bodies, file contents, browser form values, shell command strings, customer data, credentials, secrets, or token values.
5. Tell the developer or user that Relay returns a Decision Receipt and that execution remains user or runtime owned.

## Output

Return:

- action family and concise summary
- Action Card v0.1 JSON draft
- missing authority, policy, evidence, or target refs
- recommended Relay call path
- reminder that no downstream execution should happen until the Decision Receipt is reviewed
