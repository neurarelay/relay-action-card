# Contributing

## Start Here

1. Use Node `24` from `.nvmrc` for development.
2. Install dependencies with `npm ci`.
3. Make the smallest change that preserves the public proof boundary.
4. Run `npm run check` and `npm audit --audit-level=high`.
5. Open a pull request against `main`; do not push directly to `main`.

The repository also runs one Node `22.14.0` compatibility job for public consumers. Node 24 remains the primary development and CI lane.

## Contract Changes

Shared Action Card, Decision Receipt, and Agent I/O schema changes require an intentional version update through the canonical Neura Protocol authority. Maintenance changes must not silently alter contract semantics or hashes.

## Safety Boundaries

- Keep examples synthetic and free of private customer information.
- Never commit credentials, tokens, raw private payloads, or secret values.
- Do not add unprotected execution, public credential issuance, or downstream execution claims.
- Package publication, release tags, repository settings, and public positioning remain separate reviewed actions.

## Pull Request Evidence

Describe the changed surface, the verification commands run, and any contract, package, or documentation consequences. If behavior is intentionally unchanged, say so explicitly.
