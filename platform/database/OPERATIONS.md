# Database operations

## Environment model

| Environment | Purpose | Deployment | Data |
| --- | --- | --- | --- |
| Local | Development and integration tests | Developer CLI | Disposable synthetic data |
| Preview | Pull-request validation when provisioned | CI only | Synthetic or sanitized data |
| Staging | Deferred; create before shared pre-production verification is needed | None while unprovisioned | No project or data yet |
| Production | Customer workloads | Manual approval in CI | Production data |

While staging is deferred, production is never reused as a staging target.
When staging is provisioned, it requires a distinct Supabase project, passwords
and pooler connection strings. Sharing a project defeats deployment safety even
when the schemas appear identical.

## GitHub configuration

Create the protected GitHub Environment `supabase-production`. Create
`supabase-staging` only when its independent project is provisioned. Store these
environment secrets in each environment that exists:

- `SUPABASE_ACCESS_TOKEN`: deployment token with access to the target project.
- `SUPABASE_PROJECT_REF`: target Supabase project reference.
- `SUPABASE_DB_PASSWORD`: target database password.
- `SUPABASE_ADMIN_DATABASE_URL`: direct or session-mode administrative URL used
  only to provision the runtime role credential.
- `ALLFIT_API_DB_PASSWORD`: generated password for that environment's
  `allfit_api` role.

Require reviewers for `supabase-production` when the GitHub plan supports that
protection on private repositories. The current plan does not; until it is
upgraded, production is protected by manual dispatch, an environment branch
policy restricted to `main`, complete database gates and non-cancellable
serialization. This limitation means dispatch and approval are not independent
and must remain visible as an operational risk. The workflow never prints secret
values and does not persist linked-project metadata in Git.

Runtime applications use separate secret configuration:

- `DATABASE_URL`: Supavisor transaction-pooler URL for the `allfit_api` role.
- `SESSION_ENCRYPTION_KEY`: independently generated 32-byte base64 key.
- `WORKOS_WEBHOOK_SECRET`: server-only signing secret for the environment-level
  Identity webhook. Use a distinct value in every WorkOS environment.

Never reuse values across staging and production. Never expose them as
`NEXT_PUBLIC_*` variables or store them in repository files.

The deployment sets the `allfit_api` password from the protected environment
secret after migrations create the role. The runtime `DATABASE_URL` uses that
same role and password; a shared environment never connects as `postgres`.

## Deployment

While staging is deferred, the `Deploy database` workflow only accepts a manual
`workflow_dispatch` from `main` and always targets production. It requires
environment approval and repeats the full local database gate before linking to
the remote project. A run with no pending migrations is a safe no-op.

When staging is provisioned, restore automatic staging deployment after
successful `main` CI without weakening the manual production approval.

Each deployment:

1. verifies the selected ref is `main` and validates repository policy;
2. rebuilds the local database, lints it, runs pgTAP and checks generated types;
3. links the CLI to the explicit target project;
4. lists local and remote migration state;
5. runs a dry-run push;
6. applies pending migrations without seeds;
7. provisions the environment-specific `allfit_api` credential;
8. lists migration state again for evidence.

Deployments to the same environment are serialized and never cancelled midway.

## Emergency changes and drift

Do not use the Supabase dashboard for normal schema changes. If an incident
requires emergency SQL:

1. record the operator, timestamp, reason and exact SQL in the incident;
2. obtain a second reviewer whenever the incident permits;
3. create an equivalent forward migration immediately;
4. reconcile migration history before any later deployment;
5. add a regression test for the failure mode.

## Backup and restore readiness

Before production stores customer data:

- choose documented RPO and RTO targets;
- enable backups and point-in-time recovery appropriate to those targets;
- identify who may initiate and approve a restore;
- restore into an isolated project;
- verify row counts, constraints, RLS, critical functions and application login;
- record actual recovery time and unresolved gaps.

Repeat the restore exercise at least quarterly and after material storage or
topology changes.

## Operational monitoring

Alert on migration failures, connection-pool saturation, long-running queries,
lock waits, deadlocks, storage growth and backup failures. Query logs redact
parameters containing credentials, tokens, health data or identifiers.

## Access-audit partition maintenance

`privacy.access_events` uses monthly range partitions through December 2027 and
an `access_events_default` partition as an availability safeguard. The default
partition does not weaken fail-closed auditing: an authorized read still fails
when its audit write fails, while an event outside the prepared monthly horizon
continues to have a valid destination.

Create the complete 2028 monthly horizon in a reviewed forward-only migration
before September 2027. The migration must retain `allfit_owner` ownership,
forced RLS, inherited parent indexes and no direct `PUBLIC` or `allfit_api`
privileges. Runtime roles never create, attach or detach partitions.

Before attaching a new monthly partition, check whether
`privacy.access_events_default` contains rows inside the proposed bounds. If it
does, use a bounded maintenance transaction to:

1. create a standalone table with the same structure, ownership, forced RLS and
   indexes as the parent;
2. move only the bounded month's rows out of the default partition;
3. add and validate the exact monthly range constraint;
4. attach the standalone table as the monthly partition; and
5. verify that the default partition contains no rows inside the newly attached
   bounds.

Run the database physical-object tests after the migration. They must prove the
monthly destination, the out-of-horizon default destination, ownership, forced
RLS, indexes and absence of runtime grants before production deployment.

## Professional membership history rollout

`identity.get_my_professional_context` returns the authenticated person's active
and terminated organization memberships for professional-profile context. Active
memberships expose current roles; terminated memberships expose only roles that
were effective at `ended_at`. Closed organizations remain visible in personal
history, but that projection does not restore membership authorization.

Deploy the forward-only database migration before the API and Studio versions
that present this history. Verify with one active and one terminated membership,
including a closed organization, and confirm that another person cannot request
the same context. `/studio/v1/me/memberships` remains active-only and continues to
govern onboarding and workspace routing.

## Password-reset webhook rollout

The WorkOS endpoint is `{API_PUBLIC_URL}/webhooks/workos` and subscribes only to
`password_reset.succeeded`. Deploy in this order:

1. apply the forward-only migration that creates
   `identity.password_reset_receipts` and
   `identity.process_password_reset_succeeded`;
2. create the endpoint in the matching WorkOS environment and copy its signing
   secret into the API's `WORKOS_WEBHOOK_SECRET`;
3. deploy the API and confirm unsigned requests return `400` with
   `Cache-Control: no-store`;
4. enable `password_reset.succeeded`; and
5. complete the two-session sandbox reset described in Studio AuthKit
   Operations.

Every database failure returns `503` so WorkOS retries. Monitor the closed
`identity.password_reset.webhook` counter without identifiers. To roll back,
disable the WorkOS endpoint before rolling back API code and keep the
forward-only migration. Do not create a local retry worker and do not enable
`password_reset.created`.
