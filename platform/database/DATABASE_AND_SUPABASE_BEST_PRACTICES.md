# Database and Supabase best practices

This policy is normative for every database change in `allfitone`. Supabase
hosts PostgreSQL, WorkOS owns authentication, and all application traffic enters
through the API.

## Source of truth

- Git is the source of truth for schema, roles, functions, policies, tests and
  operational configuration.
- Every schema change is a timestamped SQL migration in
  `allfitone/packages/db/supabase/migrations`.
- Once a migration reaches a shared environment, it is immutable. Corrections
  are new forward-only migrations; history is never rewritten.
- A clean local database must be reproducible with `bun run db:reset`.
- Dashboard schema changes are prohibited. Emergency SQL must be captured as a
  migration and reconciled before the next deployment.

## Language and deterministic names

Technical identifiers use English `lower_snake_case` and communicate purpose.

| Object | Convention |
| --- | --- |
| Primary key | `pk_<table>` |
| Foreign key | `fk_<table>_<relationship>` |
| Unique constraint | `uq_<table>_<rule>` |
| Check constraint | `ck_<table>_<rule>` |
| Regular index | `idx_<table>_<columns_or_purpose>` |
| Unique index | `uidx_<table>_<columns_or_purpose>` |
| Trigger | `trg_<table>_<event>_<purpose>` |
| RLS policy | `<table>_<select|insert|update|delete|all>_<rule>` |

Migration files use `YYYYMMDDHHMMSS_description_in_english.sql`. Timestamps are
unique and descriptions are ASCII `lower_snake_case`.

## Migration rules

- Generate migrations with `bun run db:migration:new -- <name>`.
- Include bounded `lock_timeout` and `statement_timeout` values in every new
  migration. Separate long-running backfills from structural changes.
- Prefer additive, backwards-compatible changes. Destructive changes require an
  expand/migrate/contract sequence and an explicit recovery plan.
- Never place schema definitions in `seed.sql`; it contains disposable local and
  integration-test data only.
- Never commit production data, real personal data or secrets in migrations,
  fixtures or seeds.
- Review locks, table rewrites and index-build strategy before merging changes
  to large tables.

## Security and data integrity

- `allfit_api` is the only runtime database role. Clients never connect directly.
- Business invariants belong in constraints, RLS, constraint triggers and narrow
  database functions, not only in application code.
- Every table containing business or personal data enables and forces RLS.
- Policies use transaction-local actor context set by the API. Supabase-specific
  `auth.uid()`, `anon`, `authenticated` and direct-client patterns are forbidden.
- Privileges follow least privilege. Public receives no implicit table or
  function access, and `SECURITY DEFINER` functions use a fixed safe
  `search_path`.
- Foreign-key columns and common policy predicates have supporting indexes.
- Sensitive values are encrypted or hashed as appropriate. Logs and tests never
  expose credentials, session tokens or personal data.

## Required local and CI checks

Before a database change can merge, CI runs:

```bash
bun run check:db-policy
bun run db:start
bun run db:reset
bun run db:lint
bun run db:test
bun run check:db-types
bun run db:stop
```

The policy check rejects edited migration history, invalid filenames, duplicate
timestamps, unsafe seeds, obvious secrets and non-deterministic names in new
migrations. pgTAP covers physical structure, RLS, invariants and database
functions. Generated types remain synchronized with the rebuilt schema.

## Environments and deployment

Local, preview, staging and production use separate databases, credentials and
data. Preview data is synthetic or sanitized.

- Pull requests validate by rebuilding an ephemeral local stack.
- Successful CI on `main` deploys pending migrations to staging.
- Production deployment is manually approved through a protected GitHub
  Environment.
- Deployment runs `migration list`, `db push --dry-run`, then `db push`, and is
  serialized per environment.
- Production never runs `db reset`, never loads `seed.sql`, and never deploys
  from a developer laptop during normal operation.
- A failed deployment stops immediately. Recovery uses a reviewed forward
  migration unless restoration is required to meet the incident objective.

See [OPERATIONS.md](OPERATIONS.md) for credentials and runbooks.

## Reliability, privacy and operations

- Define and review RPO and RTO before storing irreplaceable customer data.
- Enable provider backups and point-in-time recovery when required by data
  criticality. A backup is not accepted until restoration is tested.
- Quarterly restore exercises record duration, integrity checks and owners.
- Monitor connection saturation, slow queries, lock waits, deadlocks, storage,
  migration failures and backup status without logging sensitive values.
- Cross-system writes use the transactional outbox. PostgreSQL and external
  providers are never treated as one transaction.
- Retention, deletion, export and incident access are explicit per domain.
  Production access is time-limited, attributable and audited.

## Review checklist

- Can the schema rebuild from zero?
- Is the migration forward-only and safe under concurrent traffic?
- Are constraints, RLS, grants and indexes correct?
- Are names deterministic and generated types synchronized?
- Do tests prove both allowed and denied behavior?
- Is there any secret, real user data or destructive seed behavior?
- What is the recovery path if deployment fails?
