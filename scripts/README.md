# Scripts

CI-friendly quality gates for the Wiki-first architecture workflow.

## 1) Wiki Lint

Validates wiki consistency rules from `CLAUDE.md`:

- frontmatter presence and required fields by page type
- `source_count` alignment with `## Sources` (concept/entity pages)
- duplicate/missing `## Sources` headings (concept/entity pages)
- broken wikilinks and broken anchors
- Italian-prose detection in wiki technical pages (with allowed exception)

Run:

```bash
python3 scripts/wiki-lint.py
```

## 2) Architecture Traceability Check

Validates PR body compliance with `PROJECT_CONSTITUTION.md`.

Checks:

- `## Architecture Traceability` section exists
- required keys are present
- `wiki_refs` contains at least one `[[...]]` reference
- boolean fields use `yes|no`
- `bounded_context` and `aggregate` are not empty

Run with file input:

```bash
python3 scripts/architecture-traceability-check.py --file /path/to/pr-body.md
```

Run in CI using env:

- `PR_BODY`, or
- `GITHUB_EVENT_PATH` (GitHub Actions event payload)
