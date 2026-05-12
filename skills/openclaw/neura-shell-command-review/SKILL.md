---
name: neura-openclaw-shell-command-review
description: Use before an OpenClaw-style or local agent runs a shell command, process command, package script, or runtime operation so it gets a Decision Receipt before execution.
---

# Neura Shell Command Review

Use this skill before shell commands or runtime operations. Create a refs-only Action Card and get a Decision Receipt before the user or runtime executes the command.

This is an example skill, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Check

- command profile ref is present instead of a raw command string
- workspace or environment scope ref is present
- blast-radius ref is present
- policy ref covers shell/runtime execution
- delegated authority covers the environment and action class
- risk category reflects filesystem, network, deployment, credential, or production impact

## Output

Return a Decision Receipt-ready Action Card draft, missing refs, and a recommended route. Do not run the command and do not include raw command strings, secrets, credentials, private payloads, or token values.
