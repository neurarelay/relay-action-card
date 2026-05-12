---
name: neura-openclaw-file-change-review
description: Use before an OpenClaw-style or local agent edits, moves, overwrites, or deletes files so the file action gets a Decision Receipt before local state changes.
---

# Neura File Change Review

Use this skill before file edits, overwrites, moves, or deletes. Create a refs-only Action Card and get a Decision Receipt before the user or runtime changes local files.

This is an example skill, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Check

- file or artifact ref is present
- change request ref is present
- backup, diff, or restore ref is present for destructive actions
- retention or ownership policy ref is present when deletion is proposed
- delegated authority covers the file family and action class
- risk category reflects reversibility and blast radius

## Output

Return a Decision Receipt-ready Action Card draft, missing backup/evidence/policy refs, and a recommended route. Do not edit or delete files and do not include raw file contents, secrets, credentials, private payloads, or token values.
