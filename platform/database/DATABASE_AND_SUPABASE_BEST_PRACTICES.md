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
- A narrow `SECURITY INVOKER` function may coalesce sequential actor-context and
  RLS reads into one database statement. It must preserve the same account-first,
  person-second checks, use transaction-local settings and have explicit runtime
  grants; a `SECURITY DEFINER` session projection is not authorization evidence.
- Privileges follow least privilege. Public receives no implicit table or
  function access, and `SECURITY DEFINER` functions use a fixed safe
  `search_path`.
- Foreign-key columns and common policy predicates have supporting indexes.
- Sensitive values are encrypted or hashed as appropriate. Logs and tests never
  expose credentials, session tokens or personal data.
- Personal history projections remain scoped to the authenticated person inside
  closed security-definer functions. Returning terminated organization context
  never reactivates membership-based authorization, which continues to require
  an active membership.

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

Local, preview and production use separate databases, credentials and data.
Staging is temporarily deferred; when provisioned it must use a fourth,
independent project and must never share the production database. Preview data
is synthetic or sanitized.

- Pull requests validate by rebuilding an ephemeral local stack.
- Until staging exists, a successful CI run on `main` **does not deploy a
  database**. Production deployment is an explicit manual action through the
  protected `supabase-production` GitHub Environment.
- The production workflow repeats the complete local database gate before it
  links to the remote project. This repetition is mandatory while no staging
  environment exists.
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
- Signed external events that invalidate local security state use a durable
  idempotency receipt and one narrow `SECURITY DEFINER` function. Signature
  verification happens before PostgreSQL is called; the receipt and every local
  effect commit together. Raw payloads, signatures and provider PII are never
  persisted.
- Authentication ceremonies store only hashes of browser credentials. Provider
  tokens, TOTP enrollment material and challenges are encrypted with bounded
  expiry and removed on every terminal state. A runtime role never receives
  table DML for factors, attempts, sessions, roles or duties; it executes narrow
  functions that lock every authority participating in the decision.
- Bootstrap and factor recovery are not runtime APIs. They require a protected
  GitHub Environment with `prevent self-review`, a temporary `allfit_migrator`
  credential, two distinct people, one transaction and durable evidence. The
  credential is removed or rotated immediately after the ceremony.
- Retention, deletion, export and incident access are explicit per domain.
  Production access is time-limited, attributable and audited.

## Studio membership role revocation (OP-ORG-008)

`organizations.revoke_membership_role` coordinates the role period, membership
event and durable idempotency receipt in one transaction. Only a current owner or
administrator may revoke `admin`, `coach` or `staff`; `owner` is excluded. The
coordinator establishes the authorized organization context before invoking
`relationships.end_assignments_for_membership`, which is private to database
owners and retains Relationships ownership of assignment changes.

Only coach revocation ends active holder and accepted substitute assignments.
An accepted future substitute becomes `ended` immediately, with
`valid_to = greatest(effective_at, valid_from)`: its future interval is empty and
its original start and acceptance evidence survive. Pending proposals remain
pending; activation requires an active membership and a current coach role.
Relationships, consent grants, other roles and other tenants remain unchanged.

Assignment creation and activation take membership and coach-role share locks
with `NOWAIT`. This avoids a reverse-order deadlock with a substitution decision
that already holds its assignment row. SQLSTATE `55P03` is a retryable conflict;
the retry rechecks current authority. Replaying a completed revoke references
the original role period, so a later regrant remains effective.

## Studio membership termination (OP-ORG-009)

`organizations.terminate_membership` closes the membership, every open role and
the member's professional authority at one instant, in one transaction with the
`organization.membership_terminated.v1` event and the durable idempotency
receipt. Only a current owner or administrator (`manage_memberships`) may
terminate, and a membership that holds `owner` is refused with `22023`:
ownership leaves only through `organizations.transfer_ownership`. The actor's
own membership is also refused with `22023`: leaving is `OP-ORG-010`, so a
departure is always recorded as a resignation.

The coordinator reuses the private `relationships.end_assignments_for_membership`
unconditionally, so holder and accepted substitute assignments end while
Relationships keeps ownership of that table. Service relationships stay active
without a responsible professional and must be reassigned (`OP-REL-005`);
consent grants and authorship are untouched. Pending proposals stay pending and
cannot be activated, because the assignment guard requires an active
membership.

A second command for an already terminated membership converges on the original
`ended_at` without writing new evidence. The event uses the closed
`organization_id`, `person_id`, `status` snapshot, with `before` and `after`
both required.

## Studio membership resignation (OP-ORG-010)

`organizations.resign_membership` ends the actor's own active membership with
the same coordinated closing as `OP-ORG-009`: every open role and every holder
or accepted substitute assignment closes at one instant, service relationships
stay active without a professional, and consent and authorship are untouched.
The membership is resolved from the person in the context, never from the
request, and no role is required. A membership that holds `owner` is refused
with `22023`.

The organization row is locked before the idempotency receipt, as in
`OP-ORG-009`, so a resignation and a termination of the same member serialize.
The tenant lookup also accepts a former member, so a retry after leaving still
replays. A new command after a resignation converges on the original `ended_at`;
a membership an administrator terminated answers `P0002`, because it was not a
resignation.

The administration is notified in the same transaction: one
`organization.membership_resigned.v1` outbox row per current owner or
administrator with a contact on file, carrying the recipient contact, the
organization name and the member name, like the reassignment notice. A
resignation that cannot write its notices does not commit. Recipients without a
contact are skipped rather than keeping a person inside an organization they
asked to leave; the `organization.membership_resigned.v1` membership event stays
the durable record either way.

## Guest quota enforcement (HU-STUDIO-087)

`identity.issue_client_invitation` and `identity.decide_client_invitation` enforce
the guest quota stored by `HU-BO-034`. Both lock the organization row `FOR NO KEY
UPDATE` and ask `organizations.guest_places_exhausted`, which reads the single
definition of what occupies a place, `organizations.organization_guest_occupancy`:
live relationships plus unanswered, unexpired invitations. A new invitation is
refused when no place is left; reusing a pending invitation takes no second
place. Acceptance converts the place its invitation already held, so it is
refused only when the organization is over its quota by another way, for
example after Allfit lowered it. A missing quota means no limit. The refusal is
SQLSTATE `AF409`, which the API answers as `409` `guest-quota-exhausted`.

Locks are taken in the order invitation, then organization, in both functions,
so an issue that reuses the invitation a person is accepting cannot deadlock
with that acceptance.

### Counting rows the actor cannot read

`relationships.service_relationships` forces row-level security even for its
owner, so a `SECURITY DEFINER` count returns only what the actor may see. A coach
without `view_directory` and a person answering from Space would both
undercount. Do not widen a read policy to fix a count.

`organization_guest_occupancy` instead proves it is the caller with a counting
token: an HMAC of the organization id, `pg_backend_pid()` and the transaction
start, keyed by `relationships.occupancy_count_keys.secret`, which the runtime
role cannot read. The function sets `app.occupancy_count_org` and
`app.occupancy_count_token`, counts, and clears both before it returns. The
policy `service_relationships_select_occupancy_count` admits the rows of that
organization only while the token is valid, and evaluates it once per query
through a sub-select. A forged token, or a real one in another transaction,
admits nothing, and the function returns counts only. Reuse this pattern for
any other aggregate that must not depend on the actor; never return rows from
inside the token window.

### Writing rows another person owns from a domain contract

The same token, generalized, lets a closure contract act on rows whose only
policy is `is_self`. `access_control.open_contract_scope(purpose, scope_id)` sets
`app.contract_scope_purpose`, `app.contract_scope_id` and an HMAC token keyed by
`access_control.contract_scope_keys.secret`; `access_control.contract_scope(purpose)`
returns the scope id only while that token is valid; and
`access_control.close_contract_scope()` clears all three. A policy for
`allfit_owner` compares the row's organization with
`(select access_control.contract_scope('<purpose>'))`. Open the scope immediately
before the write and close it immediately after it, inside the contract function.
`nutrition.cancel_proposals_for_organization_closure` is the first user. Do not
use a capability policy instead: it would widen every owner function that reads
the table.

## Review checklist

- Can the schema rebuild from zero?
- Is the migration forward-only and safe under concurrent traffic?
- Are constraints, RLS, grants and indexes correct?
- Are names deterministic and generated types synchronized?
- Do tests prove both allowed and denied behavior?
- Is there any secret, real user data or destructive seed behavior?
- What is the recovery path if deployment fails?
