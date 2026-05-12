---
name: neura-openclaw-before-send
description: Use before an OpenClaw-style or local agent sends an outbound message through email, chat, collaboration, or messaging channels so it gets a Decision Receipt before delivery.
---

# Neura Before Send

Use this skill before outbound agent messages are delivered. Create a refs-only Action Card for the proposed send action and route it to Relay for a Decision Receipt before the user or runtime sends anything.

This is an example skill, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Check

- recipient or channel ref is present
- user intent ref is present
- draft/message ref is present without raw body content
- policy or communication-review ref is present
- delegated authority covers message sending for this target
- risk category reflects customer, partner, legal, or public communication impact

## Output

Return a Decision Receipt-ready Action Card draft, missing refs, and the recommended hold/proceed posture. Do not send the message and do not include raw message bodies, secrets, credentials, private payloads, or token values.
