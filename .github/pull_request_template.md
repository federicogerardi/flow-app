## Summary

- What changed:
- Why it changed:
- Impacted areas:

## Architecture Traceability

- wiki_refs:
  - [[...]]
- bounded_context: 
- aggregate: 
- invariants_changed: yes|no
- domain_events_changed: yes|no
- api_contract_changed: yes|no
- migration_required: yes|no

## Constitution Compliance Checklist

- [ ] Change is traceable to canonical wiki pages (`Wiki/concepts/*`, `Wiki/entities/*`, `Wiki/overview.md`)
- [ ] Business rules are enforced in domain types/services (not controllers/UI)
- [ ] Aggregate boundaries are respected (no external mutation bypass)
- [ ] Cross-context effects are explicit (domain event and/or orchestration update)
- [ ] Tool extension follows unification policy (config-first, no unnecessary workflow/UI forks)
- [ ] Wiki pages were updated where architecture/domain behavior changed

## Testing & Verification

- [ ] Unit tests updated/added
- [ ] Integration/API tests updated/added (if applicable)
- [ ] Manual verification performed

### Commands run

```bash
# paste commands exactly as executed
```

## Data & Migration Notes (if applicable)

- Migration plan:
- Rollback plan:
- Backfill/reconciliation needed:

## Risks

- Functional risks:
- Operational risks:
- Security/privacy risks:

## Reviewer Focus

- Please focus on:
