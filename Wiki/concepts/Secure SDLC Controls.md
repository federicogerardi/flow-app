---
type: concept
tags:
  - wiki/concept
  - wiki/security
  - wiki/governance
date_updated: 2026-08-01
source_count: 7
confidence: high
---

# Secure SDLC Controls

> Baseline security controls integrated into development lifecycle and CI.

## Objective

Turn existing security practices into explicit release gates across code, dependencies, API contracts, and runtime configuration.

## Control Areas

| Area | Control | Enforcement |
|------|---------|-------------|
| Source code | Lint + typecheck + tests | CI required checks |
| API contracts | OpenAPI generate/lint/diff | CI required checks |
| Dependency risk | Vulnerability scan + license scan | CI quality gate |
| Secrets hygiene | Secret scanning in diff/history | CI + PR review |
| Runtime config | Required env validation at startup | App fail-closed |
| Logging hygiene | Sensitive field redaction | Runtime logger configuration |

## CI Security Gates

Minimum pipeline stages:

1. `build-and-test`
2. `api-contract-check`
3. `dependency-vulnerability-scan`
4. `dependency-license-scan`
5. `secret-scan`

Recommended fail policy:

- Block on `critical` and `high` vulnerabilities in production dependency graph.
- Block on denied licenses.
- Block on leaked credentials/tokens.
- Allow `medium` only with tracked risk acceptance ticket and expiration date.

### Security Exception Record (Mandatory)

Any temporary exception must include:

- `owner`
- `justification`
- `compensatingControls`
- `expiryDate` (maximum 30 days)
- `approver`

Expired exceptions are treated as CI gate failures until renewed or resolved.

## SAST and Dependency Scanning Policy

SAST baseline:

- Run static analysis on each PR and nightly on `main`.
- Focus ruleset on auth, input validation, unsafe deserialization, command injection, SSRF, and insecure crypto usage.

SCA baseline:

- Scan lockfiles and transitive dependencies.
- Maintain allow/deny license list.
- Track accepted risks with owner and expiry.

## Secrets Management Rules

- No plaintext secrets in repository.
- Environment secrets only through secure platform variables.
- Redact known secret paths in logs (see [[Logging Strategy]]).
- Secret rotation cadence documented per provider.

## Security Review Triggers

Mandatory security-focused review for PRs changing:

- authentication/authorization,
- token/session handling,
- file upload/parsing,
- encryption/secret handling,
- externally exposed API boundaries.

## Compliance Baseline (Operational)

Initial documentation baseline (without certification claims):

- Data classification map (PII vs non-PII).
- Retention/deletion policy references.
- Access-control model references.
- Audit trail and incident response pointers.

This baseline is the prerequisite for future formal mapping to GDPR and SOC2 controls.

## Ownership and Cadence

- Security owner: platform maintainers (or designated security champion).
- Review cadence: monthly control review + post-incident updates.
- Evidence retention: CI logs/artifacts for security gates.

## Sources

- [[synthesis/project-model-multi-dimension-audit-2026-08-01]]
- [[Testing Strategy]]
- [[API Documentation - OpenAPI]]
- [[Logging Strategy]]
- [[Environment Configuration]]
- [[sources/PRD]]
- [[Quality Gate Matrix]]
