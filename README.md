# Relay Action Card

Public schemas, examples, skills, adapters, and verification for reviewing consequential agent actions before execution.

Runtime: Node `24` via `.nvmrc`. Public package compatibility remains Node `>=22.14.0` and is checked in a separate CI job.

## How The Neura Stack Fits

- **Protocol** owns shared message shape, versioning, validation, and conformance.
- **Relay** evaluates proposed actions and returns Decision Receipts plus refs-only evidence.
- **Registry** supplies optional identity, standing, capability, and continuity context.
- **The developer or operator runtime** owns downstream execution or restraint.

This repository is the public proof and integration surface. It is not the private Relay runtime and does not issue production authority or execute downstream work.

## Start In 30 Seconds

```bash
git clone https://github.com/neurarelay/relay-action-card.git
cd relay-action-card
nvm use
npm ci
npm run check
```

Then run the golden path:

```bash
node examples/core/resolve-action-card.mjs
```

The example reads a synthetic Action Card, demonstrates a governed decision boundary, and returns a Decision Receipt-shaped result without executing the proposed action.

## Golden Path

Start with these files:

1. [`examples/core/action-card.json`](examples/core/action-card.json): proposed action.
2. [`examples/core/resolve-action-card.mjs`](examples/core/resolve-action-card.mjs): bounded resolver example.
3. [`examples/core/decision-receipt.example.json`](examples/core/decision-receipt.example.json): returned decision evidence.
4. [`schemas/action-card.v0.1.json`](schemas/action-card.v0.1.json): machine-readable Action Card schema.
5. [`schemas/decision-receipt.v0.1.json`](schemas/decision-receipt.v0.1.json): machine-readable Decision Receipt schema.

Use the golden path before choosing a specialized route.

## Specialized Routes

### MCP And Agent Frameworks

Use [`examples/mcp/README.md`](examples/mcp/README.md) for direct MCP, OpenAI, Anthropic, Google ADK, Microsoft Agent Framework, and related runtime examples. These examples demonstrate integration boundaries; they do not establish official provider endorsement or production partnership.

### OpenClaw

Use [`examples/openclaw/QUICKSTART.md`](examples/openclaw/QUICKSTART.md) for the public preflight adapter, action-receipt kit, near-miss workbench, and synthetic severe-scenario proof. Published-package source and provenance must remain aligned with this repository.

Choose the lane that matches what you want to prove with the OpenClaw-style receipt kit:

- **OpenClaw Developer Journey Proof:** read [`docs/openclaw-developer-journey.md`](docs/openclaw-developer-journey.md), then run `npm run openclaw:proof`. The source is [`examples/openclaw/run-developer-journey-proof.mjs`](examples/openclaw/run-developer-journey-proof.mjs); an explicitly authorized live test uses `npm run openclaw:proof -- --live`.
- **OpenClaw OS Decision Receipt Surface:** read [`docs/openclaw-os-decision-receipt-surface.md`](docs/openclaw-os-decision-receipt-surface.md), then run `npm run openclaw:workspace-proof`. The source is [`examples/openclaw/run-workspace-decision-surface.mjs`](examples/openclaw/run-workspace-decision-surface.mjs).
- **Near-miss workbench:** run `npm run openclaw:workbench`, review [`docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png`](docs/assets/openclaw-near-miss-workbench/near-miss-workbench-desktop.png), and inspect `artifacts/openclaw-near-miss-workbench/report.html`.

The OpenClaw route keeps its implementation under `examples/openclaw/`, including `near-miss-workbench/`, `workspace-surface/`, and `preflight-adapter/`; reusable operator material remains under `skills/openclaw/`. The workspace proof writes `artifacts/openclaw-workspace-decision-surface/report.html`.

### SDK And A2A

Use [`examples/sdk/README.md`](examples/sdk/README.md) and [`examples/a2a/README.md`](examples/a2a/README.md) for protected Relay client examples. Production access still requires the relevant Relay authentication and product boundary.

## Canonical Schemas

The active public schema mirror is:

- `action-card.v0.1.json`;
- `decision-receipt.v0.1.json`;
- `agent-io-event-envelope.v0.1.json`;
- `mcp-approval-receipt.v0.1.json`;
- `recoverable-observer-envelope.v0.1.json`;
- `structured-result-trust-receipt.v0.1.json`.

Neura Protocol is the canonical authority. `schemas/manifest.json` records the Protocol source path, versions, and expected SHA-256 values for these byte-identical public mirrors.

Shared-contract movement requires an intentional version change and successful local plus cross-repository compatibility verification.

## Skills

Reusable skills live under [`skills/`](skills/):

- `neura-action-card` for constructing bounded Action Cards;
- `neura-authority-review` for reviewing authority and evidence;
- `neura-first-receipt` for producing a first receipt-shaped result.

The skills preserve the same boundary as the examples: review and evidence before developer-owned execution.

## Package Reality

The OpenClaw preflight adapter is sourced from this public repository and has provenance. The SDK and OpenAI Agents packages currently source from the private Relay repository while their metadata points here.

Existing versions must not be mutated or republished. Before any future SDK or OpenAI Agents version, publishable source, repository metadata, Trusted Publishing identity, provenance, and release tags must be aligned prospectively.

## Verification

Primary development and CI:

```bash
nvm use
npm ci
npm run check
npm audit --audit-level=high
```

GitHub runs the Node 24 proof-contract gate and one Node `22.14.0` public-compatibility job. Branch protection requires the deterministic `local-contract` and `verify` checks on an up-to-date branch.

## Contributing And Security

- Contribution workflow: [`CONTRIBUTING.md`](CONTRIBUTING.md).
- Security reporting: [`SECURITY.md`](SECURITY.md).
- Ownership: [`.github/CODEOWNERS`](.github/CODEOWNERS).

Pull requests should remain synthetic, evidence-backed, and free of private customer data, credentials, tokens, or raw private payloads.

## Repository Map

```text
schemas/     Public machine-readable contract mirrors
examples/    Golden path plus specialized integration proofs
skills/      Reusable Action Card and authority-review skills
scripts/     Deterministic verification helpers
tests/       Focused contract tests
docs/        Current proof documentation and preserved history
```

## Boundary

This repository demonstrates how to review agent actions and preserve decision evidence. It does not provide public production credentials, grant authority by itself, execute downstream tools, certify third-party systems, or prove customer adoption.

The complete pre-compression README is preserved at [`docs/history/README-through-2026-07-21.md`](docs/history/README-through-2026-07-21.md).
