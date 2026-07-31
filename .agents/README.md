# Agents Directory

This directory contains workspace-level and persona-level agent instructions.

## Files

- `WORKSPACE_INSTRUCTIONS.md` — mandatory repository-wide operating rules
- `agents/*.md` — persona-specific guidance

## Precedence

When instructions conflict, apply this order:

1. System/developer runtime instructions
2. `PROJECT_CONSTITUTION.md`
3. `CLAUDE.md`
4. `.agents/WORKSPACE_INSTRUCTIONS.md`
5. Persona file under `.agents/agents/`

Agents should treat `Wiki/` as architecture source of truth and maintain wiki↔code alignment.
