# AGENTS.md

This repository is the single source of truth for Allfit One documentation.
Read this file before changing any document.

## Documentation ownership

- Durable product, architecture, engineering, security, database, deployment,
  operations and recovery documentation belongs in `allfitone-docs`.
- Code repositories keep executable artifacts beside the code and only the
  concise README, `AGENTS.md` and `CLAUDE.md` pointers required to build and
  navigate that repository.
- Never copy a normative document into a code repository. Link to its canonical
  path here.
- OpenAPI, migrations, generated types, CI workflows and source-code comments
  remain with the code because they are executable artifacts, not duplicate
  documentation.

## Language

Documentation may be written in English or Spanish. Preserve the language of an
existing document unless a translation is explicitly requested, and keep each
document internally consistent.

Technical identifiers use English `lower_snake_case`. Normative document names
use `UPPER_SNAKE_CASE.md`; conventional files such as `README.md`, `AGENTS.md`,
`CLAUDE.md` and `CONTRIBUTING.md` keep their standard names.

## Database documentation

The canonical database policy and runbook are:

- `platform/database/DATABASE_AND_SUPABASE_BEST_PRACTICES.md`
- `platform/database/OPERATIONS.md`

Any change to migrations, RLS, roles, Supabase environments, database CI/CD,
backups, restore procedures or runtime database credentials must update these
documents in the same change or in a linked documentation pull request.

The executable implementation remains in `allfitone/allfitone` under
`packages/db`, `scripts/check-db-policy.mjs` and the database workflows.

## Validation

Run from this repository root:

```bash
npm ci
npm run check
```

Do not mark documentation complete until Markdown and internal-link validation
both pass.
