---
name: neura-openclaw-browser-action-review
description: Use before an OpenClaw-style or local agent submits a browser form, clicks a state-changing button, or dispatches web automation so the browser action gets a Decision Receipt before submit.
---

# Neura Browser Action Review

Use this skill before browser submits, purchases, account changes, or other state-changing web actions. Create a refs-only Action Card and get a Decision Receipt before dispatch.

This is an example skill, not an official OpenClaw or ClawHub integration, listing, approval, or partnership.

## Check

- target page or form ref is present
- user intent ref is present
- field-value refs are present without raw sensitive values
- rule or policy ref covers the proposed browser action
- delegated authority covers the target site/action family
- risk category reflects money movement, account state, customer impact, or data access

## Output

Return a Decision Receipt-ready Action Card draft, missing refs, and the suggested route. Do not submit the form, click the state-changing control, expose browser secrets, or include raw form values.
