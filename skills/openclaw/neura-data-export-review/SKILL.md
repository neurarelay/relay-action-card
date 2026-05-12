---
name: neura-openclaw-data-export-review
description: Use before an OpenClaw-style or local agent exports workspace, customer, browser, or account data so the export gets a Decision Receipt before content leaves the system.
---

# Neura Data Export Review

Use this skill before data exports. Create a refs-only Action Card and get a Decision Receipt before the user or runtime moves data out of the workspace.

This is an example skill, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Check

- export target ref is present
- privacy, legal, or operator request ref is present
- data-export policy ref is present
- delegated authority covers the data family and export target
- risk category reflects privacy and customer-data impact
- evidence refs do not include raw exported data

## Output

Return a Decision Receipt-ready Action Card draft, missing privacy/evidence/policy refs, and the suggested route. Do not export data and do not include raw customer data, private payloads, credentials, secrets, or token values.
