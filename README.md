# Allfit One Documentation

Central repository for Allfit One product, architecture, engineering and
operational documentation.

This repository owns product specifications, user stories, architecture
decisions, shared data and identity rules, operational runbooks, recovery
procedures and cross-product traceability. Implementation repositories keep
executable artifacts and link back to the canonical documents here.

## Products

| Product | Documentation |
| --- | --- |
| Allfit Studio | [Specification and user stories](products/studio/README.md) |
| Allfit Space | [Specification and user stories](products/space/README.md) |
| Allfit Backoffice | [Specification and user stories](products/backoffice/README.md) |

New products use an additional `products/<slug>/` directory.

## Shared platform

- [Telemetry policy](platform/observability/TELEMETRY_POLICY.md)
- [Platform documentation](platform/README.md)
- [Data and database](platform/database/README.md)
- [Database and Supabase best practices](platform/database/DATABASE_AND_SUPABASE_BEST_PRACTICES.md)
- [Database operations](platform/database/OPERATIONS.md)
- [Database architecture decisions](platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md)
- [Proposed database design](platform/database/refactor/03_PROPOSED_DESIGN/)
- [Database execution plan](platform/database/refactor/04_EXECUTION/)

## Repository topology

- [`dinnartec/allfitone`](https://github.com/dinnartec/allfitone) is the platform
  implementation monorepo. It contains the API, worker, Studio, Space,
  Backoffice and the shared authentication, queue, contract and database
  packages.
- `allfitone-docs` is the only durable documentation repository and the
  normative source for product, architecture, engineering and operations.
- The executable OpenAPI source belongs to
  [`allfitone/packages/contracts/openapi`](https://github.com/dinnartec/allfitone/tree/main/packages/contracts/openapi),
  beside the code that validates and consumes it.
- `allfitone-design-system` is the published UI library and
  `allfitone-landing-page` is the public marketing site.

The complete implementation topology decision is recorded in
[ADR-029](platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md#adr-029-monorepo-de-implementación-con-deployables-independientes).

## Documentation boundary

| `allfitone-docs` | Implementation repositories |
| --- | --- |
| Product definition, scope and user stories | Executable source code and configuration |
| Architecture, security and shared data decisions | Migrations, OpenAPI and generated artifacts |
| Database, deployment, operations and recovery runbooks | CI/CD workflows that enforce the documented policy |
| Requirements, semantics and cross-product traceability | Concise repository onboarding and canonical links |

- A source of truth is never copied between repositories.
- Implementation repositories link here for durable documentation.
- Executable artifacts stay with the code and are linked from their documented
  context here.
- All new or modified documentation is written in English.

## Validation

```bash
npm ci
npm run check
```

Validation checks Markdown structure, internal links and anchors. The OpenAPI
3.1 document is validated by `allfitone` CI, where its canonical executable
source lives.

See [CONTRIBUTING.md](CONTRIBUTING.md) for ownership and writing rules.
