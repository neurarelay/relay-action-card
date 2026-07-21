# Structured Result Trust Receipt

Structured Result Trust Receipt v0.1 is a draft refs-only record for deciding whether an agent result is safe to use downstream.

The core rule is simple: syntax-valid is not the same as trustworthy.

```text
schema request -> generation attempts -> validation -> semantic checks -> trust receipt -> allow / human review / stop
```

## Why It Exists

Structured-output runtimes can fail in materially different ways while exposing similar successful-looking objects:

- a strict schema succeeds on the first attempt;
- validation fails, a later attempt recovers, and the retry history disappears;
- a final retry emits a content-free placeholder that passes a loose schema;
- a raw JSON-schema path returns data without validating it;
- a provider adapter silently downgrades from strict schema to JSON shape only;
- a valid structured result is produced but lost or moved to the wrong output channel.

The receipt keeps those states distinct before another agent, tool, or workflow acts on the result.

## Trust States

| State | Meaning | Default downstream route |
| --- | --- | --- |
| `trusted` | Strong schema enforcement, preserved channel, and semantic checks passed on the first attempt. | `allow` |
| `recovered` | Earlier validation failures were repaired before the retry cap, then strong validation and semantic checks passed. | `allow` |
| `degraded` | Shape-only enforcement, retry exhaustion, failed semantic checks, or incomplete trust evidence weakens the result. | `human_review` or `stop` |
| `rejected` | Validation failed, the result channel was lost, or the terminal result was explicitly rejected. | `stop` |
| `unknown` | Validation or enforcement evidence is absent. | `stop` |

An application can choose a stricter route. It should not silently upgrade `degraded`, `rejected`, or `unknown` to `allow`.

## Required Evidence

The draft receipt binds:

- runtime, provider, model, and adapter identity;
- schema reference and digest;
- enforcement mode and validation engine;
- expected and observed output channels;
- attempts used, validation failures, retry exhaustion, and final acceptance reason;
- semantic-check status and check references;
- result digest;
- asserted trust state and downstream route.

The result body is not stored. Fixtures use T0 metadata, references, and hashes only.

## Executable Cases

The verifier covers six synthetic cases:

1. healthy strict output on the first attempt;
2. successful recovery after validation retries;
3. retry-exhausted placeholder that passes only a loose shape;
4. raw JSON-schema output with no observed validation;
5. provider fallback from strict schema to shape-only JSON;
6. valid structured output lost from its expected result channel.

Run:

```bash
npm run verify:structured-result-trust-receipt
```

## Source-Grounded Demand

This proof package was shaped by public issue and source evidence, without claiming those projects use or validate Neura:

- Anthropic Claude Code issue [`#76901`](https://github.com/anthropics/claude-code/issues/76901) reports a final-retry placeholder passing a loose schema with no degraded signal.
- LangChain issue [`#38719`](https://github.com/langchain-ai/langchain/issues/38719) reports that raw JSON-schema dictionaries can bypass validation and make the normal retry path unreachable. Current source at commit [`233e02a`](https://github.com/langchain-ai/langchain/blob/233e02a8223234de731dda8f47152fa6c6a40535/libs/langchain_v1/langchain/agents/structured_output.py#L77-L103) returns raw data for `json_schema` before typed validation.
- Google ADK issue [`#6021`](https://github.com/google/adk-python/issues/6021) asks for explicit capability and downgrade telemetry when provider adapters cannot enforce the requested schema.
- Vercel AI SDK issue [`#16120`](https://github.com/vercel/ai/issues/16120) asks for structured output on `HarnessAgent`. Current source at commit [`c093ee7`](https://github.com/vercel/ai/blob/c093ee7458ccd5dada05d8461041e47c24ee55c0/packages/harness/src/agent/harness-agent.ts#L111-L120) still types output as `never`, and the stream result explicitly throws for structured output.

These are independent public signals and code observations. They are not adoption, integration, partnership, endorsement, customer, or implementation-validation evidence for Neura.

## Boundary

This is a local synthetic proof and draft portable receipt shape. It does not call a provider, inspect private model output, execute a downstream tool, certify semantic correctness, or replace application-specific quality checks.

No downstream execution by Neura. The developer runtime decides whether to allow, review, or stop after reading the receipt.
