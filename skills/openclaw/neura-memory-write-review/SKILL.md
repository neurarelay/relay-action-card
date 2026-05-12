---
name: neura-openclaw-memory-write-review
description: Use before an OpenClaw-style or local agent writes persistent memory, preferences, facts, or long-lived context so the memory action gets a Decision Receipt before storage.
---

# Neura Memory Write Review

Use this skill before persistent agent memory is written. Create a refs-only Action Card and get a Decision Receipt before the user or runtime stores new memory.

This is an example skill, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Check

- memory target ref is present
- subject intent or operator intent ref is present
- memory scope or retention scope ref is present
- memory-write policy ref is present
- delegated authority covers the memory family and target
- risk category reflects persistent state change

## Output

Return a Decision Receipt-ready Action Card draft, missing refs, and the suggested route. Do not write memory and do not include raw private facts, credentials, secrets, customer data, private payloads, or token values.
