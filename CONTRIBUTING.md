# Contributing to Allfit One Documentation

This repository owns the durable documentation for the Allfit One ecosystem.
Implementation repositories keep executable artifacts and concise pointers to
their canonical documentation here.

## Where documentation belongs

A durable document belongs in `allfitone-docs`, including:

- product scope, rules and user stories;
- architecture and engineering decisions;
- shared API, data, identity, security and integration semantics;
- database standards, deployment procedures and operational runbooks;
- backup, recovery, observability and incident procedures;
- cross-product and cross-repository traceability.

Implementation repositories retain only:

- executable code, migrations, OpenAPI, generated types and CI/CD workflows;
- source-code comments and configuration required by those artifacts;
- concise README, `AGENTS.md` and `CLAUDE.md` instructions that link here.

When implementation consumes a rule from this repository, it links to the
canonical document instead of copying it. If durable documentation is found in
a code repository, move it here and leave only a pointer.

## Organization

- `products/<slug>/`: definition, scope and user stories for each product.
- `platform/`: shared architecture, engineering and operational documentation.
- `platform/database/`: canonical database policy and operations.
- `platform/database/refactor/`: active database-reconstruction initiative and
  its traceability while the refactor remains in progress.

A new cross-cutting category needs a clear owner before another directory is
created. Do not create a separate document merely to record a conversation when
an existing canonical source can be updated.

## Normative changes

Every scope, architecture, contract or operations change must:

1. update its canonical source first;
2. update affected derived documents and implementation links;
3. preserve traceability to the relevant story, ADR, operation or contract;
4. distinguish approved state from proposals and historical references;
5. avoid presenting future artifacts as if they already existed.

Historical documents are not rewritten to appear current. They state which
decision or document supersedes them.

## Language and naming

- All new or modified documents are written entirely in English.
- A legacy Spanish document must be fully translated when it is modified; do
  not leave mixed-language documents.
- Technical and file identifiers use English.
- Normative documents use `UPPER_SNAKE_CASE.md`; conventional files keep their
  standard names.
- Each document has one H1 and does not skip heading levels.
- Internal references use relative links.
- External evidence links should target an immutable version or commit when
  possible.
- Domain terminology must match the current glossary and architecture decisions.

## Local validation

```bash
npm ci
npm run check
```

The command validates Markdown, paths and internal anchors.

## Review checklist

- The document is in the correct canonical location.
- No second source of truth was created.
- The entire modified document is in English.
- Derived documents and implementation links remain synchronized.
- Status and dates do not present a proposal as approved.
- `npm run check` succeeds.
