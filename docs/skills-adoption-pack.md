# Skills Adoption Pack v0.1

Status: local example pack  
Date: 2026-05-12

Skills teach coding agents when and how to create an Action Card before execution.

```text
proposed agent action -> Action Card -> Relay Decision Receipt -> developer-owned execution
```

This pack is not an official OpenAI, Codex, Anthropic, Claude, MCP, or A2A marketplace integration. It is a portable SKILL.md example set for agent-assisted development workflows.

## Skills

| Skill | Purpose |
| --- | --- |
| `skills/neura-action-card` | Draft Action Cards for consequential proposed actions |
| `skills/neura-authority-review` | Review identity, authority, evidence, policy, risk, Registry standing, and missing requirements |
| `skills/neura-first-receipt` | Help a developer get the first public Decision Receipt through direct Relay |

## Install Posture

Developer-controlled local install examples:

- Codex-style: copy a skill folder into the local skills directory used by the developer's agent environment.
- Claude Code-style: copy a skill folder into a project or user-level skills directory supported by the developer's Claude Code setup.
- Portable path: keep the folder structure and `SKILL.md` file intact for any compatible agent tool.

Do not describe this as provider approval, native listing, automatic cross-product sync, or official partnership.

## Boundary

The skills:

- draft refs-only Action Cards
- review Authority Graph and risk posture
- run the first direct public receipt path
- keep MCP and A2A as optional controlled-access paths
- do not execute downstream business actions
- do not embed secrets, token values, private payloads, raw policy documents, or customer data
- do not issue public API keys, public production MCP tokens, or public A2A tokens

Verifier:

```bash
npm run verify:skills-adoption-pack
```
