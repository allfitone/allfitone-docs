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

## Studio latency rollout

Studio's API runs in `pdx1`, beside the Oregon PostgreSQL project. Deploy the
additive `identity.resolve_actor_registration(uuid)` function before the API
that calls it; an API rollback leaves the unused function in place. The function
is `SECURITY INVOKER`, keeps actor settings transaction-local and does not replace
RLS or the authorized-read ritual.

Deploy API before Studio in one release window. Confirm the final region segment
before the request identifier in `x-vercel-id` is `pdx1`; preceding segments are
edge ingress regions. Then exercise `/session`, `/entry-context`,
`/me/memberships`, organization memberships, invitations and roles with a
technical organization containing no fitness or health data. Normal requests
target p95 at 500 ms and p99 at 800 ms;
requests that refresh through WorkOS are measured separately. A normal request
above one second emits the closed `studio.http.slow_request` signal. Roll back
immediately for any authorization, content-exposure, functional or 5xx regression.
Run `bun run measure:studio-latency` with `STUDIO_API_URL`, the complete technical
account cookie in `STUDIO_SESSION_COOKIE`, `STUDIO_TECHNICAL_ORGANIZATION_ID` and
`STUDIO_EXPECTED_VERCEL_REGION=pdx1` for the post-deployment run.
The command never prints the cookie and exits nonzero when a normal endpoint
misses the 500/800/1000 ms acceptance thresholds.

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

## Allfit Pro rollout (ADR-043)

Pro is bought through the App Store and Google Play and verified by the API.
Deploy in this order:

1. apply the forward-only migration `20261012100000_a_person_can_have_pro.sql`;
2. publish the free plan and Pro through Backoffice (two people, one proposing and
   another publishing), then load the store products of each paid version into
   `payments.platform_store_products` with a curation script: a new price is a new
   product;
3. create the subscription products in App Store Connect and Google Play Console
   with the same product ids;
4. set the API's `APPLE_BUNDLE_ID`, `APPLE_APP_APPLE_ID` and
   `APPLE_ENVIRONMENT=production`, and Google's `GOOGLE_PLAY_PACKAGE_NAME`,
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON`, `GOOGLE_PUBSUB_AUDIENCE` and
   `GOOGLE_PUBSUB_SERVICE_ACCOUNT`;
5. point App Store Server Notifications V2 at `{API_PUBLIC_URL}/webhooks/app-store`,
   and a Pub/Sub push subscription with an OIDC token at
   `{API_PUBLIC_URL}/webhooks/google-play`; and
6. confirm an unsigned notification returns `400` with `Cache-Control: no-store`.

A store left unset answers `503` to its purchases and grants nothing. A failed
notification answers `503` so the store delivers it again; a repeated one is
recognized by its id and changes nothing. **Never set `APPLE_ENVIRONMENT=xcode`
outside a developer's machine**: it trusts StoreKit testing without a signature.

Locally, `bun packages/db/scripts/publish-local-pro.ts` publishes both plans and the
product `com.dinnartec.allfitspace.pro.monthly`, which the StoreKit configuration in
`apps/space/storekit/AllfitPro.storekit` sells in the simulator when the app runs from
Xcode with that file selected in its scheme. Because that catalogue occupies the one
free plan, the payments pgTAP tests fail on a database where it was published; run
them on a fresh database, as CI does.

## Backoffice AAL2 rollout and ceremonies

Backoffice usa password + TOTP mediante la API MFA componible de WorkOS; no usa
Hosted AuthKit para login ni requiere `auth.allfit.one`. La recuperación de
contraseña permanece alojada en `*.authkit.app`. El runbook completo, variables,
límites y smoke tests están en [Backoffice Authentication Operations](../../products/backoffice/AUTHENTICATION_OPERATIONS.md).

Desplegar en este orden:

1. mantener `BACKOFFICE_AUTH_ENABLED=false`;
2. aplicar las migraciones forward-only de superficie, estructura y funciones;
3. configurar `WORKOS_API_KEY_BACKOFFICE` en worker y API, además del client ID e
   issuer sólo en API;
4. crear los environments protegidos de GitHub para bootstrap y recuperación,
   ambos con `prevent self-review`, reviewers autorizados y la credencial
   administrativa limitada al environment;
5. ejecutar el bootstrap cruzado de dos personas activas desde `main` y retirar
   la credencial al terminar;
6. validar `/cron/outbox`, rate limits y el ciclo real en WorkOS sandbox;
7. activar primero Preview y después Production.

El endpoint de cron conserva expiración y revocación incluso con el gate de
login apagado. Alertar por `worker.backoffice_auth.cleanup` con outcome
`retrying`, intentos abiertos crecientes y errores TOTP sostenidos. Para
rollback, apagar sólo nuevos passwords; no detener sesión, logout, reset,
verificación de intentos existentes, worker ni webhook.

La recuperación de un autenticador perdido usa exclusivamente
`backoffice-totp-recovery.yml`. Deben intervenir el iniciador del workflow y un
aprobador independiente del environment, y la función exige además dos
administradores distintos del sujeto. No se recupera el secreto anterior: se
revoca factor, intentos y sesiones, se conserva evidencia y el próximo login
enrola otro TOTP.

**Correction (ADR-046, *A stale ceremony*).** Neither workflow nor their protected
environments exist; the code repository's workflows are `ci.yml`, `deploy-aws.yml`
and `deploy-database-aws.yml`. The bootstrap of step 5 is the `bootstrap` command of
the migrator task (`infra/docker/migrator.sh`), described in
[Backoffice Authentication Operations](../../products/backoffice/AUTHENTICATION_OPERATIONS.md).
No migrator command runs `identity.recover_backoffice_totp_factor`, and it needs two
administrators other than the subject, which a team of two administrators cannot
provide.

## Studio team-invitation rollout

`OP-ORG-005` crea la invitación, su intención de membresía y el evento
`organization.staff_invited.v1` en una transacción. La invitación dura siete
días; un comando distinto con el mismo correo y la misma propuesta reutiliza la
vigente y solicita una nueva entrega. El outbox solo transporta
`invitation_id`: nunca correo ni token. El worker construye únicamente
`https://studio.allfit.one/invitations#token=…` mediante
`STAFF_INVITATION_PUBLIC_BASE_URL=https://studio.allfit.one/`.

Los gates son independientes:

- `STAFF_INVITATION_ISSUANCE_ENABLED`: creación/reutilización de propuestas;
- `STAFF_INVITATION_DELIVERY_ENABLED`: reclamación y entrega de correos;
- `NEXT_PUBLIC_STAFF_INVITATIONS_ENABLED`: interfaz de emisión en Studio.

Resolver, decidir, listar, revocar y expirar permanecen disponibles con los tres
gates apagados. El cron tampoco se apaga durante un rollback: debe seguir
expirando invitaciones y limpiando contadores aunque la entrega esté cerrada.

Antes del despliegue, crear en Vercel las reglas perimetrales siguientes. El
owner operativo es Platform y Security aprueba y conserva la evidencia del
cambio; la aplicación no persiste IPs.

| Rule ID | Ruta | Límite |
| --- | --- | --- |
| `studio-team-invitation-issue-ip-20h` | `POST /studio/v1/organizations/*/invitations` | 20 por hora e IP |
| `studio-team-invitation-resolve-ip-30m` | `POST /studio/v1/invitations/resolve` | 30 por minuto e IP |
| `studio-team-invitation-decision-ip-10h` | `POST /studio/v1/invitations/decisions` | 10 por hora e IP |

PostgreSQL aplica adicionalmente 20 emisiones/hora por actor, 100/día por
organización y tres entregas/24 horas por destinatario y organización. Solo
conserva hashes SHA-256 de dimensiones normalizadas durante un máximo de siete
días. Todo límite responde `429 rate-limited` con `Retry-After`.

Despliegue en este orden:

1. integrar documentación y código con los tres gates desactivados;
2. aplicar primero la migración de enums y después la de funciones, índices,
   límites y ciclo de vida mediante el workflow protegido de producción;
3. configurar claves HMAC, correo (Amazon SES, ADR-049), cron, base URL y reglas Vercel; desplegar API,
   worker y Studio con los gates todavía apagados;
4. consultar invitaciones productivas pendientes. Si alguna fue enviada con un
   enlace antiguo de Space, detener la activación y aprobar explícitamente una
   redelivery o compatibilidad revisada; no activar sobre un inventario incierto;
5. habilitar emisión y entrega para una organización interna y validar con un
   email real resolución, activación previa, aceptación, rechazo, revocación,
   eventos, métricas y límites;
6. habilitar `NEXT_PUBLIC_STAFF_INVITATIONS_ENABLED` para esa organización; y
7. ampliar gradualmente después de revisar errores, dead-letter y expiraciones.

El circuit breaker usa ventana de 30 segundos, mínimo 20 resultados, apertura
al 50 % de fallos durante 60 segundos y tres pruebas half-open. Un fallo de
correo nunca invalida la invitación. Para rollback, apagar primero la interfaz y
después la emisión; opcionalmente cerrar entrega para correos aún no reclamados.
Mantener resolución, decisiones, listado, revocación, cron y expiración. Las
migraciones forward-only permanecen.

## Despliegue de la invitación de cliente

`OP-REL-001` encola `relationship.client_invited.v1` desde que se desplegó, y hasta
`OP-IDN-051` nada lo reclamaba. Un evento sin reclamar no tiene publicación ni
intentos, así que `support.list_operational_events` reportaba cada invitación de
cliente emitida como `pending` indefinidamente: la cola crecía con trabajo que nadie
hacía y el panel técnico de `HU-BO-031` se leía como una avería.

El consumidor existe y está probado. **Permanece apagado.** Desde `TECH-28` (migración
`20261021120000`) Space ya resuelve y decide la invitación, y además la encuentra sin el
enlace: `GET /space/v1/client-invitations` (`OP-IDN-056`) lista las pendientes dirigidas
al correo verificado de la persona. Lo que falta es el enlace universal `https`: los
dominios asociados esperan la cuenta de pago de Apple. Hasta entonces la app abre
`allfitspace://client-invitations#token=…`; el token viaja en el fragmento, se retiene
en memoria y nunca entra en una URL que vea la API. Un esquema propio no abre nada en un
teléfono sin la app instalada, así que encender la entrega con él enviaría un enlace
muerto a quien todavía no la tiene.

Los gates son independientes:

- `STAFF_INVITATION_DELIVERY_ENABLED`: condición previa; es el interruptor general de
  entrega de invitaciones y el que decide si existe el remitente;
- `CLIENT_INVITATION_DELIVERY_ENABLED`: reclamación y entrega de la invitación de
  cliente. Requiere el anterior;
- `CLIENT_INVITATION_PUBLIC_BASE_URL`: base del enlace, obligatoria cuando el gate
  anterior está encendido. Es **propia**, no la de Studio: el worker construye
  `…/client-invitations#token=…`, y `/invitations` de Studio responde una invitación de
  equipo, no una de cliente.

Emitir, resolver, decidir y reenviar permanecen disponibles con la entrega apagada. Lo
único que no ocurre es el correo.

El correo no nombra ni cuenta los permisos que pide la invitación. Llega a una
dirección, no a una persona verificada, y el conteo habría que leerlo de
`privacy.invitation_scope_options`, cuyas políticas admiten a la organización que pidió
y a la persona invitada. El detalle se muestra detrás del enlace, con el token y la
sesión. La proyección `identity.prepare_client_invitation_delivery` tampoco lo devuelve,
y `T-IDN-CLIENT-RESEND-01` lo fija enumerando sus columnas.

Despliegue en este orden:

1. integrar con `CLIENT_INVITATION_DELIVERY_ENABLED` apagado; el evento sigue sin
   reclamar, igual que antes del cambio;
2. construir la pantalla de Space —hecho en `TECH-28`— y publicar la ruta pública que
   la abre, que espera el enlace universal;
3. configurar `CLIENT_INVITATION_PUBLIC_BASE_URL` apuntando a esa ruta y desplegar el
   worker todavía apagado;
4. revisar el inventario de invitaciones de cliente pendientes. Las emitidas antes de
   la activación llevan semanas en la cola: decidir explícitamente si se entregan o se
   descartan antes de encender, porque encender las enviará todas;
5. habilitar la entrega para una organización interna y validar con un correo real que
   el enlace abre, que la persona decide cada permiso por separado y que el reenvío
   desde Backoffice ofrece exactamente lo mismo;
6. habilitar en general.

Para rollback, apagar `CLIENT_INVITATION_DELIVERY_ENABLED`. El evento vuelve a quedar
sin reclamar y nada más cambia. `apps/worker/src/delivery-coverage.test.ts` impide que
un evento de entrega nuevo vuelva a quedarse sin consumidor sin que nadie lo note.

## Studio role revocation (STUDIO-13)

Migration `20261102184047_revoke_membership_roles.sql` introduces OP-ORG-008 and
must be applied before the DELETE route is deployed. The operation requires a
Studio session, an allowed origin, `Idempotency-Key` and `Command-Id`; it takes no
body and returns the role and its closing instant with `Cache-Control: no-store`.

Before deploying, rebuild the local database, run `db:lint`, `db:test` and
`db:test:concurrency`, generate `db:types` and run `check:db-types`. The
`T-ORG-REVOKE-01` test covers tenant isolation, permissions, consent preservation,
future substitutions, idempotency and rollback. The
`membership-role-revocation-concurrency.test.ts` suite covers the races between
assignment, substitution acceptance and revocation. Local validation on
2 November 2026 with PostgreSQL 17.6: a rebuild of 178 migrations, 2666 SQL tests
across 120 files and 37 integration and concurrency tests passed. Types were
regenerated from PostgreSQL and `check:db-types` passed; `db:lint` finished without
errors, with warnings on pre-existing functions. Run the SQL tests before the
concurrency suite: that suite loads a persistent catalogue that collides with SQL
fixtures if the order is reversed. On Windows, port 54322 can fall inside a range
the system reserves; restarting the `winnat` service from an elevated shell frees
it, or a different local port can be used temporarily.

On a transient `55P03` conflict the API returns 409 with `Retry-After: 1`. Retry
the same intent with its original identifiers; the transaction re-evaluates the
current role. A completed revocation keeps its receipt even if the same role is
granted again. Do not edit receipts or assignment rows by hand to resolve the
conflict.

If the evidence write or the assignment closure fails, the whole transaction rolls
back. To roll back the API deployment, keep the migration and its authority guard.
Restoring a role requires a new grant command; ended assignments keep their history
and need a new assignment or substitution decision through their usual flow.

## Studio membership termination (STUDIO-14)

Migration `20261102215626_terminate_memberships.sql` introduces OP-ORG-009 and
must be applied before the `POST .../memberships/{membershipId}/termination`
route is deployed. It also widens the membership event contract to accept
`organization.membership_terminated.v1`; existing rows already satisfy the new
check. The operation requires a Studio session, an allowed origin,
`Idempotency-Key` and `Command-Id`; it takes no body and returns the membership
and its `ended_at` with `Cache-Control: no-store`.

`T-ORG-TERMINATE-01` covers tenant isolation, permissions, the owner refusal,
rollback, idempotency, the surviving relationship, consent and authorship.
`membership-termination-concurrency.test.ts` covers the races between
termination, a concurrent assignment and a second termination. On a transient
`55P03` the API returns 409 with `Retry-After: 1`; retry with the original
identifiers.

After deployment, the relationships the member held have no responsible
professional until the organization reassigns them. To roll back the API
deployment, keep the migration. A terminated person rejoins only through a new
team invitation, which creates a new membership; the terminated one keeps its
history.

## Studio membership resignation (STUDIO-15)

Migration `20261102232627_resign_memberships.sql` introduces OP-ORG-010 and
must be applied before the `POST .../me/membership/resignation` route and the
worker release that claims `organization.membership_resigned.v1`. It widens the
membership event contract to accept the resigned event; existing rows already
satisfy the new check. The operation requires a Studio session, an allowed
origin, `Idempotency-Key` and `Command-Id`; it takes no body and returns the
membership and its `ended_at` with `Cache-Control: no-store`.

The notice email rides the existing invitation delivery job and the
`STAFF_INVITATION_DELIVERY_ENABLED` switch, like the reassignment notice. While
the switch is off, notices stay in the outbox and are delivered once it is
turned on. A payload the worker cannot read is dead-lettered as
`invalid_delivery_projection`.

`T-ORG-RESIGN-01` covers tenant isolation, impersonation, the owner refusal,
rollback when a notice cannot be written, idempotency, convergence, the
recipients, the surviving relationship and authorship.
`membership-resignation-concurrency.test.ts` covers a resignation racing a
termination and two concurrent resignations. On a transient `55P03` the API
returns 409 with `Retry-After: 1`; retry with the original identifiers.

To roll back the API or worker deployment, keep the migration. A person who
resigned rejoins only through a new team invitation, which creates a new
membership.

## Guest quota enforcement (STUDIO-158)

Migration `20261103003415_enforce_guest_quota.sql` enforces `HU-STUDIO-087` in
`identity.issue_client_invitation` and `identity.decide_client_invitation`. It
creates `relationships.occupancy_count_keys` with one random 32-byte secret,
generated in each environment when the migration runs; the secret never leaves
the database and is not configuration. Apply the migration before deploying the
API release that maps `AF409` to `409 guest-quota-exhausted`. An API deployed
before the migration only misses the refusal; one deployed after it without the
mapping answers the refusal as `503`.

Existing organizations have no quota and stay unlimited. Lowering a quota below
the occupancy ends nothing: new invitations and acceptances are refused until a
place frees up. The quota projection in Backoffice keeps reading the same
occupancy function, which now counts every live relationship regardless of who
asks.

To rotate the counting secret, update the single row of
`relationships.occupancy_count_keys` with `extensions.gen_random_bytes(32)` as
the owner; tokens live only inside one function call, so rotation needs no
coordination.

`T-REL-QUOTA-01` covers the coach and Space actors, reuse, expiry, the lowered
quota, the refused acceptance, the unlimited organization and the token policy
(forged and expired tokens, unreadable key). `guest-quota-concurrency.test.ts`
races two invitations for the last place. On a transient `55P03` the API returns
409 with `Retry-After: 1`; retry with the original identifiers.

## Organization closure (STUDIO-11)

Migration `20261103014500_close_organizations.sql` adds `OP-ORG-012`
(`organizations.close_organization`) and its domain contracts. It creates
`access_control.contract_scope_keys` with one random 32-byte secret, generated
in each environment when the migration runs; rotate it the same way as the
occupancy key. It also adds `organization.closed.v1` to the organization event
contract. Apply the migration before deploying the API release that mounts
`POST /studio/v1/organizations/{organizationId}/closure`; until then, the route
answers `503`.

A closure is terminal. Relationships end with their grants frozen, memberships
close and pending invitations are revoked, so there is no reopen path; restoring
an organization needs a new organization. An owner whose clients still have
subscriptions that are not ended receives `422` until each one is ended.

`relationship.terminated.v1` notices are enqueued for clients with an address,
but no worker claims that event yet; the same is true for `OP-REL-008`. Until a
consumer exists, those notices are not emailed.

`T-ORG-CLOSURE-01` covers authorization, the subscription and grant refusals with
full rollback, every effect of the closure, the untouched other tenant, replay
and convergence, and the contract scope. `organization-closure-concurrency.test.ts`
races an acceptance against the closure. On a transient `55P03` the API returns
409 with `Retry-After: 1`; retry with the original identifiers.

## Relationship termination requests (STUDIO-26)

Migration `20261103090000_a_coach_asks_the_gym_to_end_a_relationship.sql` adds
`relationships.relationship_termination_requests`, the commands `OP-REL-009`,
`OP-REL-017` and `OP-REL-018`, and a new `termination_request` field on
`OP-REL-011`. It also replaces `relationships.close_relationship` and
`relationships.read_relationship_state`, and adds the trigger
`trg_professional_assignments_after_update_supersede_requests`. Apply it before
deploying the API release that mounts the three `termination-requests` routes.
An API deployed first answers `503` on those routes and reports
`termination_request` as null on the relationship read.

Asking never changes a relationship. Every request ends settled: `resolved` when
the organization ends the relationship (including an organization closing),
`rejected` or `withdrawn` by the commands, and `superseded` when the person ends
it or the coach stops being its holder. A request found `pending` on a
relationship that is terminated, or whose requester no longer holds it, is a
defect; `T-REL-TERMREQ-INT-17` and `termination-request-concurrency.test.ts`
assert it cannot happen.

`relationship.termination_requested.v1` and
`relationship.termination_request_rejected.v1` are enqueued with their
recipients, but no worker claims them yet, as with `relationship.terminated.v1`.
Until a consumer exists, administrators learn of a request from the relationship
screen, not by email.

## Organization content stays in the organization (STUDIO-29..36)

Migration `20261103150000_organization_content_stays_in_the_organization.sql` closes a tenancy hole
in program composition: the shared guards `planning.program_content_errors` and
`planning.lock_program_template_versions` accepted any routine the actor owns,
so a coach could put her own Space routine into her organization's program. An
organization program now accepts only that organization's templates and
published global ones. The migration also keeps derivation provenance through
edits, returns `repeats_forever` on every program version, adds
`planning.read_organization_program_version` behind
`GET /studio/v1/organizations/{organizationId}/programs/{programId}/versions/{versionNumber}`,
and revokes a direct `allfit_api` grant on `planning.planned_sets`. Apply it
before deploying the API release that mounts the route; until then the route
answers `503`.

Existing rows are not rewritten. When the migration runs it counts organization
program drafts and published versions that already hold a personal routine, and
emits `WARNING: organization programs holding personal routines: N drafts, M
published versions` in the deployment log when either is not zero. No warning
means nothing is affected. With a warning, list the cases read-only:

```sql
select program.owner_organization_id, program.id as program_id,
       version.version_number, template.owner_person_id
from planning.program_versions as version
join planning.programs as program on program.id = version.program_id
join planning.program_version_sessions as session on session.program_version_id = version.id
join planning.session_template_versions as template_version
  on template_version.id = session.template_version_id
join planning.session_templates as template on template.id = template_version.template_id
where program.owner_organization_id is not null
  and template.owner_person_id is not null;
```

A draft in that state fails validation (`template-version`) on its next edit or
publication until the personal routine is removed. A published version is
immutable: the organization retires it (`OP-PLN-009`) and publishes a corrected
one. Nothing reaches a client until organizations can assign programs
(STUDIO-39).

`T-PLN-ORGCONTENT-01` covers the guard, cross-organization and role denials,
provenance, `repeats_forever` and the audited read.

## A gym assigns programs through the relationship (STUDIO-39..40)

Migration `20261104090000_a_gym_assigns_a_program_through_the_relationship.sql` lifts
`ck_program_assignments_no_origin`: an organization can now give a client a
program through the relationship (`OP-PLN-010`) and read back what it gave
(`OP-PLN-018`). It adds `planning.assignment_management_periods`, the
`access_control.grant_of` and `access_control.can_access` helpers, row policies
for the coach and the person, and makes `relationships.close_relationship`
detach managed assignments at the instant it ends the relationship. Apply it
before deploying the API release that mounts
`/studio/v1/organizations/{organizationId}/relationships/{relationshipId}/assignments`;
until then the route answers `503`. The Space API release that returns
`managed_by` needs it too, because `planning.read_my_programs` gains that
column.

Nothing is backfilled: no assignment could have an origin before this
migration. **Production cannot exercise it until the scope catalogue is
published**: assigning needs an active `relationship_training` grant, and no
grant exists while `privacy.scope_definitions` has no published version. Until
then every attempt answers `403 scope-required`, which is the correct refusal,
not a fault.

The invariant to watch is that no managed assignment outlives its relationship.
This read-only query must return nothing:

```sql
select assignment.id, assignment.origin_relationship_id, relationship.status
from planning.program_assignments as assignment
join relationships.service_relationships as relationship
  on relationship.id = assignment.origin_relationship_id
where assignment.lifecycle = 'active'
  and relationship.status <> 'active';
```

A detached assignment stays `detached_pending_choice`, with its sessions
`paused`, until the person decides (`OP-PLN-015`, not built yet); until then
Space does not show it. Two domain events are enqueued and no worker consumes
them: `planning.assignment_created.v1` and `planning.assignment_detached.v1`.

`T-PLN-RELASSIGN-01` covers authorization, the calendar, the list and its audit,
Space and termination; `T-REL-TERMINATE-01` and `T-ORG-CLOSURE-01` cover
detachment on every way a relationship ends, and
`relationship-assignment-concurrency.test.ts` an assignment crossing a
termination.

## A coach manages what the gym assigned (STUDIO-41..43)

Migration `20261105090000_a_coach_manages_what_the_gym_assigned.sql` lets the
coach who attends a client move a session of a program the gym manages
(`OP-PLN-012`), adjust its prescription for that one person (`OP-PLN-013`), and
lets the coach, an administrator or the owner stop it (`OP-PLN-014`). It adds
`planned_sessions.revision_number`, `planning.planned_session_reschedules` and
`planning.prescription_revisions`, the row policies and two contract scopes
(`planned_session_lookup`, `assignment_administration`). It also redefines
`execution.read_execution` and `planning.read_week_plan`, so Space reads the
adjusted target, plus `relationship_assignment_item`,
`detach_relationship_assignments` and `plant_my_open_week`. Apply it before
deploying the API release that mounts the three routes; until then they answer
`503`. The Space release needs no change: its projections keep their shape.

Nothing is backfilled: `revision_number` starts at `0` for every existing
session. As with `OP-PLN-010`, **production cannot exercise it until the scope
catalogue is published**: all three commands require `relationship_training`
at `contribute`, administrators included, and answer `403 scope-required`
until a grant exists.

The invariant to watch is that a cancelled assignment has nothing left to train.
This read-only query must return nothing:

```sql
select session.id, session.status, period.assignment_id
from planning.assignment_management_periods as period
join planning.planned_sessions as session on session.assignment_id = period.assignment_id
where period.end_reason = 'cancelled'
  and session.status in ('scheduled', 'paused')
  and (session.scheduled_at at time zone session.timezone)::date
      >= (period.ended_at at time zone session.timezone)::date
  and not exists (
    select 1 from execution.planned_session_executions as attempt
    where attempt.planned_session_id = session.id
  );
```

Three domain events are enqueued and no worker consumes them yet:
`planning.session_rescheduled.v1`, `planning.prescription_revised.v1` and
`planning.assignment_cancelled.v1`. Administrators and owners can cancel, but
`OP-PLN-018` refuses them, so Studio has no read that gives them an assignment
id yet.

`T-PLN-MANAGE-01` covers authorization, the three commands, Space's adjusted
reads and every row policy; `managed-assignment-concurrency.test.ts` covers a
start, a planted week and a termination crossing each command. The PR records
mutation evidence for every guard and policy.

## An invitation can offer a first program (STUDIO-16)

Migration `20261106090000_an_invitation_can_offer_a_first_program.sql` lets a coach's client invitation offer a first program
(`HU-STUDIO-023` criteria 2, 6 and 7) that the person answers on its own in
Space (`HU-SP-016` criterion 1, `HU-SP-017` criteria 1, 8 and 9). It adds five
columns and three checks to `identity.invitation_intents`, the helper
`identity.client_proposal_hash`, `planning.plant_invited_program`,
`identity.client_program_outcome`, the contract scope `invitation_program` and
three row policies. It recreates `issue_client_invitation`,
`client_invitation_projection`, `resolve_client_invitation`,
`read_my_client_invitation`, `decide_client_invitation` and
`decide_my_client_invitation`, and replaces `resend_client_invitation`,
`invitation_intent_issuer_tg` and `enforce_reissued_offer_matches`.

**Apply it before deploying the API release.** The new arguments default to
null and the functions only gain result columns, so the API already in
production keeps working against the migrated database; the new API calls the
longer signatures and fails against a database without them. The Space app
needs no release: an app that does not send `program_decision` declines the
program, and the new response fields are ignored.

Nothing is backfilled: no invitation issued before carries a program, and its
`proposal_hash` is unchanged. As with `OP-PLN-010`, **production cannot
exercise it until the scope catalogue is published**: a proposal needs
`relationship_training` offered at `contribute`, and issuing fails without a
published definition.

The invariant to watch is that a created program is the one proposed, managed
through the relationship the same invitation created. This read-only query
must return nothing:

```sql
select program.id
from identity.invitation_intents as program
join identity.invitation_intents as relationship_intent
  on relationship_intent.invitation_id = program.invitation_id
 and relationship_intent.kind = 'service_relationship'
join planning.program_assignments as assignment
  on assignment.id = program.materialized_assignment_id
where assignment.program_version_id is distinct from program.proposed_program_version_id
   or assignment.origin_relationship_id is distinct from relationship_intent.materialized_relationship_id;
```

A decision with a program now enqueues one `identity.invitation_intent_decided.v1`
per intent decided, and `planning.assignment_created.v1` when the program is
created; no worker consumes either yet. The Studio and Space screens are not
built. `T-REL-INVITE-PROGRAM-01` covers issuing, reading, deciding, the row
policies, the checks and the reissue; `invitation-program-concurrency.test.ts`
covers a retirement crossing the acceptance and the issue, and two answers at
once. The PR records mutation evidence for every guard and policy.

## A coach reviews what a client trained (STUDIO-47..48)

Migration `20261107090000_a_coach_reviews_what_a_client_trained.sql` lets the coach who attends a person read what she trained
(`HU-STUDIO-054`, `HU-STUDIO-055`) and lets her hide one session from one gym
(`HU-SP-032` to `HU-SP-034`). It does five things:

- relaxes `ck_executed_sessions_autonomous` and makes a session's context
  immutable;
- redefines `execution.start_planned_session_attempt`;
- adds `privacy.session_visibility_denials`, with its triggers and two policies;
- adds the session policy `executed_sessions_select_screening`;
- adds five closed functions for the API: the two Studio reads and the three
  Space commands and query.

**Apply it before deploying the API release.** The old API keeps working
against the migrated database. `start_planned_session_attempt` keeps its
signature, and the old API calls none of the new functions. The new API's
routes fail with `503` until the migration is applied. Merging deploys the API
automatically, so expect that gap between the merge and the manual database
deploy. Neither the Studio nor the Space screens exist yet, so nobody reaches
those routes in the meantime.

**Backfill.** The migration moves every existing attempt of a planned session
whose `started_at` falls inside a management period of its assignment into
that period's relationship. Managed programs exist only since `OP-PLN-010`
(STUDIO-39..40), so few rows, if any, are touched. The check is dropped and
re-added around the update inside the same transaction. With
`lock_timeout = 5s`, a busy `execution.executed_sessions` makes the migration
fail rather than queue; retry it.

As with `OP-PLN-010`, **production cannot show a coach anything until the
scope catalogue is published**. With no grant, both reads record a refused
attempt, the list is empty, and the detail answers `403 scope-required`.

Two invariants must hold, and these read-only queries must return nothing:

```sql
-- A session inside a relationship belongs to that relationship's person and gym.
select session.id
from execution.executed_sessions as session
join relationships.service_relationships as relationship
  on relationship.id = session.context_relationship_id
where relationship.person_id <> session.person_id
   or relationship.organization_id <> session.context_organization_id;

-- No denial hides a session from the relationship it was produced in (IX-36).
select denial.id
from privacy.session_visibility_denials as denial
join execution.executed_sessions as session on session.id = denial.executed_session_id
where session.context_relationship_id = denial.relationship_id;
```

The commands enqueue `privacy.session_visibility_denied.v1` and
`privacy.session_visibility_restored.v1`. No worker consumes either yet, and
no aggregate over sessions exists to recompute.

Tests:

- `T-EXE-AUTHORIZED-01` covers the origin, the policies, both reads and the
  access record.
- `T-PRV-HIDE-01` covers the three Space operations, the frozen window and
  `IX-36`.
- `authorized-execution-concurrency.test.ts` covers a start crossing a
  termination, in both orders, and two hides crossing each other.

## A coach reads what a client shares about herself (STUDIO-44..46)

Migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql` lets the coach who attends a person read her training
profile (`HU-STUDIO-051`), her body progress (`HU-STUDIO-052`) and her health
context (`HU-STUDIO-053`), and lets her show one body photo to one gym
(`HU-SP-025` criterion 4). It does five things:

- adds `privacy.scope_allows`, the first reader of `privacy.scope_resource_rules`;
- adds `identity.body_photo_shares`, `uq_body_photos_person` and the two policies
  of the photo review;
- adds the Space commands `share_body_photo` and `withdraw_body_photo_share`, and
  `shared_with` in `list_my_body_photos`;
- adds the five closed Studio reads;
- rewrites the words of `relationship_training` and `body_progress` in
  `privacy.scope_presentations`.

**Deploy order.** Merging runs **Deploy AWS**, which rolls out the API with the
new routes and registers this commit's migrator. Then dispatch **Deploy
Database AWS**, which refuses to run until that migrator is in place. Until the
migration is applied, the new Studio and Space routes fail and
`GET /space/v1/body-photos` answers without `shared_with`. No screen calls the
new routes yet, so nobody reaches them in the meantime.

**Publishing the scopes.** Production cannot show a coach anything until the
seven scopes are published from `/permissions`, from the rules in
`packages/db/scripts/v1-scope-rules.ts`:

- `relationship_training` now names the training profile and
  `biological_sex`;
- `body_progress` includes `identity.body_photos.taken_on` and `media_ref`;
- `health_context` adds `provenance`.

`body_progress` includes photos in its **first** version only if it is
published after this release. The words already promise "solo las fotos que tú
elijas mostrarnos". If `body_progress` was published earlier from the rules
without photos, that version stays photo-less for every grant that points at
it, and photos need a second version.

With no grant, every read records a refused attempt and answers
`403 scope-required`. The photo image answers `404`.

This read-only query must return nothing:

```sql
-- No live share points at another person's photo or relationship.
select share.id
from identity.body_photo_shares as share
join identity.body_photos as photo on photo.id = share.body_photo_id
join relationships.service_relationships as relationship
  on relationship.id = share.relationship_id
where photo.person_id <> share.person_id
   or relationship.person_id <> share.person_id;
```

The commands enqueue `identity.body_photo_shared.v1` and
`identity.body_photo_share_withdrawn.v1`. No worker consumes either yet.

Tests:

- `T-IDN-AUTHORIZED-01` covers the three reads, `privacy.scope_allows`, the
  access record and two versions giving two field sets.
- `T-IDN-PHOTO-SHARE-01` covers sharing, withdrawing, what Studio lists and
  opens, and the photo policies.
- `body-photo-share-concurrency.test.ts` covers two shares at once, a share
  crossing a termination and a share crossing a deletion, in both orders.

## A coach reads progress and observes a session (STUDIO-49..51)

Migration `20261111090000_a_coach_reads_progress_and_observes_a_session.sql`
lets the coach who attends a person read her progress (`HU-STUDIO-056`) and
leave and correct observations on her sessions (`HU-STUDIO-057`,
`HU-STUDIO-058`). It does four things:

- adds `uq_executed_sessions_context (id, context_relationship_id)` on
  `execution.executed_sessions`, so an observation's FK can require a session
  its relationship produced;
- adds `execution.professional_observations` and the append-only
  `execution.observation_revisions`, with their policies;
- adds the closed read `execution.read_client_progress` and the commands
  `execution.record_observation` and `execution.revise_observation`;
- recreates `execution.read_authorized_execution` so that it carries
  `observations`.

Both tables start empty, so there is no backfill.

**Locks.** Adding the unique constraint builds an index on
`execution.executed_sessions` and blocks writes to sessions while it builds. The
migration's `lock_timeout` and `statement_timeout` bound the build.

**Deploy order.** Merging runs **Deploy AWS**, which rolls out the API with the
new routes and registers this commit's migrator. Then dispatch **Deploy
Database AWS**. Until the migration is applied, the three new routes fail and
`OP-EXE-018` answers without `observations`. No screen calls the new routes yet.

**Publishing the scopes.** The V1 rules in `packages/db/scripts/v1-scope-rules.ts`
now declare `execution.professional_observations` twice: under
`relationship_training` (training, `contribute`) and under `health_context`
(health, `contribute`).

- If production published those scopes before this release, the published
  versions lack the rule. A new version is needed for the published field set
  to say so. Writing works either way, because `access_control.can_access` does
  not read the rules.
- The consent words of both scopes do not mention observations yet. Decide them
  before Studio offers `health_context` at `contribute`.

Tests:

- `T-EXE-PROGRESS-01` covers who may read, `scope_required` with its denied
  event, each training scope alone and together, hiding and restoring a
  session, a corrected value, and warm-ups, unloaded sets and annulled, open
  and other gyms' sessions. It also covers Epley, month periods and the exact
  keys.
- `T-EXE-OBSERVATION-01` covers both commands (IDEM, scopes, the strict
  session rule, the capability, a paused service, transcription, stale and
  invalid corrections, termination) and every policy in both directions. It
  also covers the observations and their health access record in `OP-EXE-018`.
- `observation-concurrency.test.ts` covers two corrections over the same
  revision, and an observation or a correction racing a termination.

## A coach proposes a correction and she decides (STUDIO-52..53)

Migration `20261112090000_a_coach_proposes_a_correction_and_she_decides.sql`
lets the coach who attends a person propose a correction to a strength set she
declared (`HU-STUDIO-059`) and follow what he proposed (`HU-STUDIO-060`). It
also lets her list what was proposed to her and decide it (`HU-SP-062`,
`HU-SP-063`). A proposal nobody answers expires after thirty days
(`OP-SYS-004`). It does five things:

- adds the enum `execution.correction_status` and the table
  `execution.correction_proposals`, with its policies, an update trigger and the
  `IX-20` constraint trigger;
- adds `correction_proposal_id` to `execution.execution_revisions`, unique and
  with a `RESTRICT` FK to the proposal;
- adds three triggers that cancel what waits on a session when she rewrites its
  sets, annuls it or hides it, on `execution.strength_sets`,
  `execution.executed_sessions` and `privacy.session_visibility_denials`;
- adds the commands `execution.propose_correction` and
  `execution.decide_correction_proposal`, the lists
  `execution.list_proposed_corrections` and
  `execution.list_my_correction_proposals`, and the sweep
  `execution.expire_correction_proposals`;
- recreates `relationships.close_relationship` so that it calls
  `execution.cancel_relationship_correction_proposals` at the instant it ends a
  relationship. Her ending it, the gym ending it and the organization closing
  all go through it.

The table starts empty and the new column is null on every existing revision,
so there is no backfill.

**Locks.** The new unique constraint builds an index on
`execution.execution_revisions`. Creating the three triggers blocks writes to
`execution.strength_sets`, `execution.executed_sessions` and
`privacy.session_visibility_denials` for an instant. With `lock_timeout = 5s`, a
busy table makes the migration fail rather than queue; retry it.

**Deploy order.** Merging runs **Deploy AWS**, which rolls out the API and the
worker and registers this commit's migrator. Then dispatch **Deploy Database
AWS** right after it finishes. Until the migration is applied:

- the four new routes fail;
- the worker's minute job fails at `correction_proposal_expiry`. It is the last
  job of `/cron/outbox`, so the other jobs still run first, but the batch answers
  `503` and the run is recorded as `correction_proposal_expiry_failed`. The
  Backoffice diagnosis names the job «Vencimiento de propuestas de corrección».

No screen calls the new routes yet.

**The email.** `execution.correction_proposed.v1` is a delivery event. The worker
renders it with `renderCorrectionProposedEmail`, in Spanish, inside the
existing delivery job and under the `STAFF_INVITATION_DELIVERY_ENABLED` switch,
like the substitution question. While the switch is off, the notices stay in the
outbox and are delivered once it is turned on.

- The email states the fact, then that nothing changes unless she accepts, then
  the deadline as a day in Colombia (`America/Bogota`, no hour), and that
  silence changes nothing.
- It carries neither value and no link. The event does not carry the values
  either.
- A payload the worker cannot read is dead-lettered as
  `invalid_delivery_projection`. The provider's idempotency key is
  `correction-proposal/<message id>`, so a redelivery is not a second email.

`execution.correction_decided.v1` and `execution.correction_expired.v1` carry
ids only. They are domain records, and no worker consumes them.

**The sweep.** `correction_proposal_expiry` runs
`execution.expire_correction_proposals(200)` as the `worker` actor every minute.
It expires up to 200 due proposals per run, oldest deadline first, with
`for update skip locked`, and applies nothing. A decision she is making holds
the row and is skipped. Two consequences:

- The sweep can run up to a minute late. In that minute, a proposal past its
  thirty days but not yet swept still holds the unique pending slot of its field,
  so a new proposal on that field answers `409` until the sweep marks it. Her
  decision and both lists already read it as expired.
- A backlog drains at 200 a minute. Expiry is read from the clock, so a late
  sweep changes no answer, only the stored state.

**What cancels a proposal.** Each cancellation keeps the proposal listed on both
sides, with its reason: `target_changed` when she corrects the session herself,
`session_annulled`, `session_hidden` (only that relationship's), and
`relationship_terminated`. **Revoking a grant without terminating leaves a
pending proposal pending**: she can still decide it. Since STUDIO-77 (migration
`20261118100000_a_coach_opens_the_card_of_a_client.sql`) Studio reads both
`session_annulled` and `session_hidden` as `session_unavailable`; the stored reason and
what she sees in Space are unchanged.

**Publishing the scopes.** The V1 rules in `packages/db/scripts/v1-scope-rules.ts`
now declare `execution.correction_proposals` under `relationship_training`
(training, `contribute`). If production published that scope before this
release, the published version lacks the rule, and a new version is needed for
the published field set to say so. Proposing works either way, because
`access_control.can_access` does not read the rules. Proposing needs an active
`relationship_training` grant at `contribute`; without one, every attempt
answers `403 scope-required`.

Three invariants must hold. These read-only queries must return nothing, or no
rows that keep growing for the last one:

```sql
-- Nothing waits on a relationship that has ended.
select proposal.id
from execution.correction_proposals as proposal
join relationships.service_relationships as relationship
  on relationship.id = proposal.relationship_id
where proposal.status = 'pending'
  and relationship.status = 'terminated';

-- Nothing waits on a set that is gone (target_strength_set_id has no FK).
select proposal.id
from execution.correction_proposals as proposal
where proposal.status = 'pending'
  and not exists (
    select 1 from execution.strength_sets as sets
    where sets.id = proposal.target_strength_set_id
      and sets.executed_session_id = proposal.executed_session_id
  );

-- The sweep keeps up: nothing stays pending long past its thirty days.
select proposal.id
from execution.correction_proposals as proposal
where proposal.status = 'pending'
  and proposal.expires_at < clock_timestamp() - interval '5 minutes';
```

Tests:

- `T-EXE-PROPOSAL-01` (49) covers validation in order, device and observed data,
  a hidden session, her prior history, a person with no address, the outbox
  without values, privileges, IDEM, that proposing changes nothing, the thirty
  days, one pending proposal per field, both lists and every policy in both
  directions.
- `T-EXE-PROPOSAL-DECIDE-01` (31) covers accepting in place with the revision,
  the reason and the proposal, rejecting, a proposal expired by the clock before
  the sweep, a cancelled one, a set that moved, IDEM, and the worker's policies
  and the sweep.
- `T-EXE-PROPOSAL-CANCEL-01` (20) covers each cancellation reason, termination by
  her, by the gym and by closing the organization, the two contract scopes, and
  both lists still showing cancelled proposals. `T-ORG-CLOSURE-INT-20` now lists
  the table as decided for the closure.
- `correction-proposal-concurrency.test.ts` (6) covers a proposal racing her
  correction, her correction committing after a proposal, two professionals on
  the same field, her decision against the sweep, and a decision or a proposal
  racing a termination.
- The worker's `correction-proposals.test.ts` (9) and
  `correction-proposal-expiry.test.ts` (2) cover the email and the job.

## A gym names its own movements (STUDIO-57..60)

Migration `20261113090000_a_gym_names_its_own_movements.sql` lets a gym create,
edit, archive and search its own movements from Studio (`HU-STUDIO-064` to
`HU-STUDIO-067`). It does six things:

- adds the capability `archive_movements` («Archivar movimientos propios») and
  grants it to owner and admin;
- adds `revision_number` and `created_by_membership_id` to `catalog.movements`,
  with `ck_movements_organization_author`, and partial indexes on `movement_id`
  in `planning.planned_steps`, `execution.session_exercises`,
  `execution.strength_sets` and `execution.mobility_results`;
- adds the append-only table `catalog.movement_revisions`, with its policies;
- adds the trigger `trg_movements_before_update_meaning`, which freezes the
  discipline and the name of a movement a published version uses;
- adds two select policies so that a person reads a gym's movement she was
  planned or trained, and write policies on `movement_aliases`,
  `movement_equipment` and `movement_variants` for the organization's own
  movements;
- adds the commands `catalog.create_organization_movement`,
  `update_organization_movement` and `archive_organization_movement`, and the
  reads `catalog.search_organization_movements` and
  `read_organization_movement`. `allfit_api` can execute these five and none of
  their helpers.

The new table starts empty, and every existing movement starts at revision 1, so
there is no backfill.

**Before applying it, check for organization movements.**
`ck_movements_organization_author` fails the migration if a row with
`content_scope = 'organization'` already exists without an author. No code path
could create one before this release, but check production read-only first:

```sql
select count(*) from catalog.movements where content_scope = 'organization';
```

`0` is expected. Otherwise, stop and decide each row's author before applying.

**Locks.** Adding the columns and constraints takes an `ACCESS EXCLUSIVE` lock on
`catalog.movements` while the checks and the FK validate, which is brief on a
catalogue of a few hundred rows. The four new indexes are built without
`CONCURRENTLY`, so each blocks writes to its table while it builds, including
`execution.strength_sets`. With `lock_timeout = 5s`, a busy table makes the
migration fail rather than queue; retry it. `statement_timeout = 60s` bounds each
build.

**Deploy order.** Merging runs **Deploy AWS**, which rolls out the API with the
five new routes and registers this commit's migrator. Then dispatch **Deploy
Database AWS** right after it finishes. Until the migration is applied, the five
routes answer `503`. No screen calls them yet (STUDIO-129..132), and nothing that
exists changes behaviour: published versions and sessions keep resolving their
movements.

**The freeze.** Once a published version uses an organization movement, its
discipline is fixed and its name only changes in case and spacing. The trigger
enforces it on the row, so it also holds for a manual fix in production: an
`UPDATE` that renames a used movement fails with `55000 movement-in-use`. To
correct a used movement's name, create a new movement and use it in the next
version.

**Accepted race.** A version published at the same instant the movement is
archived stays valid, because publishing checks the movement is published and
does not lock it until it writes the steps. The version keeps resolving the
name, so nothing breaks, and nothing watches for it.

What to watch, read-only:

```sql
-- Each edit or archive leaves exactly one revision, so the counter matches the history.
select movement.id, movement.revision_number
from catalog.movements as movement
where movement.content_scope = 'organization'
  and movement.revision_number <> 1 + (
    select count(*) from catalog.movement_revisions as revision
    where revision.movement_id = movement.id
  );
```

It should return no rows.

Tests:

- `T-CAT-MOVEMENT-CREATE-01` (36) covers who creates, every field validated at
  once, the name per organization, IDEM, the stored row, the event, and that the
  runtime writes movements only through the command.
- `T-CAT-MOVEMENT-UPDATE-01` (30) covers the freeze at the command and at the
  row, case and spacing, other names, equipment and variant, the revision, stale
  edits, IDEM, archived and foreign movements, and the event.
- `T-CAT-MOVEMENT-ARCHIVE-01` (16) covers who archives, converging, a draft that
  no longer publishes, a version that still resolves, and that nothing referenced
  is deleted.
- `T-CAT-MOVEMENT-SEARCH-01` (21) covers the global and own library and nobody
  else's, other names, archived movements, the discipline, pages and cursors,
  literal matching, and the read.
- `T-CAT-MOVEMENT-RLS-01` (22) covers the person's two policies, the revisions'
  policies, and both directions of every new write policy.
- `organization-movement-concurrency.test.ts` (4) covers a rename racing a
  publication in both orders, two creates with the same name, and two edits of
  the same revision.
- `T-ORG-TEAM-DIRECTORY-01` now counts 23 capabilities and 43 role grants.

## An Allfit admin holds every duty (ADR-046)

Migration `20261114090000_an_admin_holds_every_duty.sql` makes the `allfit_admin`
role bring all thirteen Backoffice duties for as long as it lasts, and lengthens the
Backoffice session to 60 idle minutes and 12 hours (ADR-046 decisions 1 and 3). It
does six things:

- adds `basis` (`granted` by default, or `admin_role`) to
  `support.platform_duty_assignments`, with `ck_platform_duty_assignments_basis`, and
  replaces `ck_platform_duty_assignments_window` with a check by basis: a `granted`
  duty lasts at most 90 days; an `admin_role` one ends at `9999-12-31 00:00:00+00`
  with `reason_code = 'admin_role'`;
- rebuilds `uidx_platform_duty_assignments_current` on
  `(person_id, duty_code, basis)`;
- adds `support.standing_platform_duties()` and the `AFTER INSERT` trigger
  `trg_platform_role_assignments_insert_grant_duties`, whose function
  `support.grant_standing_platform_duties()` inserts the thirteen duties for every
  new active role, granted by whoever granted the role;
- backfills the same thirteen duties for every active administrator;
- replaces `support.preserve_platform_duty_history`, which now freezes `basis` and
  refuses to suspend, expire, recertify or, while the role is active, revoke an
  `admin_role` duty; `support.assign_platform_duty`, which converges on a duty held
  in any basis; `support.platform_duty_assignment_projection`, which returns
  `basis`; and `support.bootstrap_backoffice_administrators`, which keeps its seven
  arguments but inserts only the two crossed roles and ignores `p_valid_to`;
- adds `access_control.backoffice_idle_limit()` (60 minutes) and
  `access_control.backoffice_session_lifetime()` (12 hours), and rewrites
  `access_control.has_platform_duty`, `access_control.has_platform_role`,
  `access_control.holds_backoffice_duty`, `identity.expire_backoffice_sessions`,
  `identity.complete_backoffice_authentication` and
  `identity.load_backoffice_access_session` from their latest definitions, changing
  only the limit.

**What production already holds stays.** The temporary duties the administrators
hold today, `manage_platform_access` included, live beside the standing ones and
lapse on their own date. Nothing is rewritten and nobody is recorded as having
revoked them. The old window check already bounded every existing row to 90 days,
so the new check validates without a pre-deploy query. The backfill gives every
active administrator the thirteen standing duties whether or not their temporary
ones have lapsed, so applying the migration also restores access lost to a lapse.
The backfill queues no `support.platform_duty_granted.v1`; every role granted
afterwards queues one per duty.

**Locks.** Adding the column and the checks takes an `ACCESS EXCLUSIVE` lock on
`support.platform_duty_assignments` while the window check validates, and the
unique index is rebuilt without `CONCURRENTLY`. The table only holds the
administrators' duties, so both are brief. Creating the trigger locks
`support.platform_role_assignments` for an instant. With `lock_timeout = 5s`, a busy
table makes the migration fail rather than queue; retry it.

**Deploy order.** Merging runs **Deploy AWS**, which rolls out the API and the
Backoffice web and registers this commit's migrator. Then dispatch **Deploy Database
AWS** right after it finishes. Until the migration is applied:

- PostgreSQL still ends a session after 15 idle minutes or 8 hours. The cookie
  already lasts 12 hours and `GET /backoffice/v1/session` already reports an idle
  deadline 60 minutes after the last activity, so the countdown is wrong, but the
  session still ends when the database says so;
- the duty inventory carries no `basis`, so the Backoffice shows every duty with its
  dates and actions, and it no longer offers a grant form. A temporary duty that
  lapses in that gap can only be granted again through the API, by someone who
  still holds `manage_platform_access`. Applying the migration restores every
  active administrator's duties anyway.

**The bootstrap ceremony** no longer takes `DUTY_DAYS`. `infra/docker/migrator.sh
bootstrap` passes `null` for the validity argument, which the function ignores, and
a `DUTY_DAYS` left in the task's environment neither bounds nor blocks it.

What to watch, read-only:

```sql
-- Every active administrator holds the thirteen duties through the role.
select role_assignment.person_id, count(duty.id) as standing
from support.platform_role_assignments as role_assignment
left join support.platform_duty_assignments as duty
  on duty.person_id = role_assignment.person_id
 and duty.basis = 'admin_role'
 and duty.status = 'active'
where role_assignment.platform_role = 'allfit_admin'
  and role_assignment.status = 'active'
group by role_assignment.person_id
having count(duty.id) <> 13;
```

It should return no rows.

Tests:

- `T-SUP-STANDING-01` (30) covers the thirteen duties from the ceremony and from a
  role granted in Backoffice, their grantor and mode, a session without the role,
  converging grants, the refusal to suspend, revoke, recertify or rewrite a standing
  duty, the window by basis, a temporary duty beside a standing one, 59 and 61 idle
  minutes in the duty and role checks, the policy helper and the session load, and
  withdrawing the role.
- `T-IDN-BACKOFFICE-SWEEP-01` (10) asserts 61 idle minutes against 59, and 12 hours,
  for the worker's sweep.
- `T-IDN-BACKOFFICE-CEREMONIES-01` (17) asserts that the crossed roles bring 26
  crossed standing duties whatever `p_valid_to` says, and refuses one person in
  both seats.
- `T-SUP-RECERT-01` (13) recertifies and lapses `granted` duties, as production
  still holds them.
- The pgTAP suites that denied an admin without a given duty now deny a Backoffice
  session without an active role; the allow case is unchanged.
- `migrator-bootstrap.test.ts` checks that the command needs only `SUBJECT_A`,
  `SUBJECT_B` and `CEREMONY_REFERENCE`, and that a leftover `DUTY_DAYS` changes
  nothing.
- The API tests assert the session cookie's `Max-Age=43200` and an idle deadline 60
  minutes after the last activity.

## An Allfit One admin opens their own window and finds a person by name (ADR-046)

Two migrations build ADR-046 decisions 2, 4 and 5 (code branch
`feat/backoffice-self-approved-break-glass`; its pull request and the database deploy are
pending).

`20261115090000_an_admin_opens_their_own_break_glass_window.sql` (decision 2):

- replaces `support.break_glass_required_approvals(tier)`, which now returns 0, and
  `support.break_glass_duration_minutes(tier)`, which returns 60, for both tiers;
- replaces `ck_break_glass_requests_derived`: a row has the new shape (0 approvals, 60
  minutes) or one of the two shapes asked for before ADR-046 (standard 1/30, restricted
  2/15); a mix such as 0/15 or 0/90 is refused;
- drops `support.decide_break_glass`. `OP-SUP-002` is retired: the route
  `POST /backoffice/v1/break-glass/requests/{requestId}/decisions` answers `404`, and the
  OpenAPI operation `decideBackofficeBreakGlass` and schema `BreakGlassDecision` are gone;
- replaces `support.break_glass_viewer_projection` without `viewer_can_decide`; it keeps
  `viewer_is_requester` and `viewer_can_exercise`;
- replaces `support.request_break_glass`, which inserts the request with
  `status = 'approved'`, `window_starts_at` at the request and `window_ends_at` 60 minutes
  later, and emits `support.break_glass_requested.v1` and
  `support.break_glass_window_opened.v1` (`request_id`, `window_starts_at`,
  `window_ends_at`). It still writes `request_expires_at` 30 minutes after the request. The
  closed purpose, the traceable case reference, the refusal of forbidden categories and of a
  window over one's own data, exercising, closing and the review are unchanged.

`20261115100000_an_admin_finds_a_person_by_name.sql` (decisions 4 and 5):

- on `support.metadata_queries`, drops `not null` from `case_reference`, whose check now
  accepts null or a traceable code, and adds `text` to `ck_metadata_queries_lookup_kind`;
- drops `support.search_people(uuid, uuid, text, text, text)`, which took a lookup kind,
  and creates `support.search_people(p_actor_person_id uuid, p_actor_session_id uuid,
  p_case_reference text, p_query text, p_limit integer) returns jsonb`, executable only by
  `allfit_api`. The term is `lower(btrim(query))`, at least two characters; the limit is 1 to
  25 (`22023` otherwise). It matches part of `lower(display_name)`, `lower(contact_email)`
  or `contact_phone`, with `\`, `%` and `_` escaped, or the exact person identifier, orders
  by `lower(display_name)` then id, and answers
  `{ matches: [{ person_id, display_name, contact_email, contact_phone, account_status }],
  has_more }`. Each search writes one `support.metadata_queries` row (`lookup_kind =
  'text'`, `lookup_hash` the sha256 of the lowered term, `result_count`) and one
  `privacy.access_events` row per person returned (`resource = 'support.person_search'`,
  purpose `support_diagnosis`, access mode `support_metadata`). A Backoffice session without
  the admin role gets `42501` and nothing is recorded;
- replaces `support.v_support_metadata`, appending `display_name`, `contact_email` and
  `contact_phone`, so `support.person_metadata` returns them; the masked fields stay;
- replaces `support.person_metadata`, `support.person_payments`,
  `support.billing_follow_up` and `identity.read_account_recovery` from their latest
  definitions, changing only the case reference: null or empty is accepted, and one given
  in free text is refused with `22023 a case reference is a traceable code, never free
  text`. Starting, resending and cancelling an account recovery still require one.

**What production already holds stays.** Every break-glass file asked for before keeps its
quorum and length, and the new check accepts both old shapes, so it validates without a
pre-deploy query. Its approvals stay in `support.break_glass_approvals`, which is
append-only and which nothing writes any more. A request still pending when the migration
runs can no longer be approved: it expires 30 minutes after it was asked, and the
Backoffice shows it as «Pedida antes del cambio, sin abrir». Recorded searches keep their
lookup kind and case reference.

**Locks.** Replacing the check on `support.break_glass_requests`, and the checks and the
`not null` on `support.metadata_queries`, takes an `ACCESS EXCLUSIVE` lock on each table
while the new checks validate. Both tables are small, so it is brief. With
`lock_timeout = 5s`, a busy table makes the migration fail rather than queue; retry it.

**Deploy order.** The same as in
[the section above](#an-allfit-admin-holds-every-duty-adr-046): merging runs
**Deploy AWS**, then dispatch **Deploy Database AWS** right after it finishes. Until the
migration is applied:

- every person search fails with `503 upstream-unavailable`, because the API calls a
  `support.search_people` signature that does not exist yet;
- the person file, payments, the billing follow-up and the recovery read answer
  `400 invalid-request` without a case reference, because the old functions still require
  one, so the billing follow-up screen, which now loads without a case, fails. With a case
  they work, but the person file arrives without `display_name`, `contact_email` and
  `contact_phone`;
- no new break-glass window opens: the database still creates the request as `requested`
  with its old quorum, and the API no longer offers a way to approve it. The Backoffice
  shows it as «Pedida antes del cambio, sin abrir» and it expires after 30 minutes. A window
  already open keeps working.

What to watch, read-only:

```sql
-- Both should be true once the migration is applied.
select
  to_regprocedure(
    'support.decide_break_glass(uuid, uuid, uuid, text, text, uuid, uuid, bytea)'
  ) is null as approval_retired,
  to_regprocedure(
    'support.search_people(uuid, uuid, text, text, integer)'
  ) is not null as search_by_term;

-- Files asked for since the deploy show 0 approvals and 60 minutes.
select sensitivity_tier, required_approvals, requested_duration_minutes, status, count(*)
from support.break_glass_requests
where requested_at >= now() - interval '1 day'
group by sensitivity_tier, required_approvals, requested_duration_minutes, status
order by sensitivity_tier;
```

**Local tooling.** `packages/db/scripts/approve-local-break-glass.ts` is deleted, and
`packages/db/scripts/bootstrap-local-operator.ts` no longer makes a third local
administrator to reach a quorum: the local operator opens their own window.

**Open follow-ups.**

- The `approve_break_glass` duty no longer approves anything; it only still grants reading
  the whole break-glass tray. Whether to retire or rename it is an owner decision.
- The search has no trigram index and scans `identity.people`. That is acceptable at the
  current volume; revisit with `pg_trgm` if it grows.
- `request_expires_at` is still written for new windows but no longer gates anything.
- The masked fields of the person file can be removed once no screen reads them.

Tests:

- `T-SUP-BG-SELF-01` (25) covers windows that open at once with 0 approvals and 60 minutes,
  one `support.break_glass_window_opened.v1` each, a replay that converges, the refusals
  (forbidden category, own data, missing or invalid purpose, free-text case, a session
  without the role), that `support.decide_break_glass` no longer exists and the tray offers
  no decision, that the requester cannot review while the other administrator can, and that
  1/30 and 2/15 rows stay valid while mixed shapes are refused.
- `T-SUP-BG-01`, `T-SUP-BGR-01`, `T-PRV-AUD-01`, `T-SUP-BG-03`, `T-SUP-BG-TRAIN-01`,
  `T-SUP-RECERT-01`, `T-IDN-BODY-01`, `T-IDN-HEALTH-01` and `T-NUT-DISP-01` are rewritten
  for windows that open on request; `T-SUP-BGR-01` keeps a case approved before ADR-046 to
  assert that its approver cannot review it. `T-SUP-BG-02` asserts that a holder of
  `approve_break_glass` reads the whole tray.
- `T-SUP-SEARCH-02` (27) covers partial name, email and phone, the identifier, `_` and `%`
  as characters, the page and `has_more`, the evidence per search and per person returned,
  searches and reads without a case, a free-text case refused, and starting a recovery
  still needing one. `T-SUP-RLS-03` (35) is rewritten for the search and the person file;
  `T-SUP-PAY-01`, `T-SUP-BILLING-01` and `T-IDN-RECOVERY-01` now refuse a free-text case
  instead of a missing one.
- API: `T-BG-API-01`, `02`, `08`, `09` and `20`; `T-SUP-API-23` to `28`, `46`, `48` and `49`;
  `T-SUP-UNIT-01` and `02`; `T-IDN-RECOVERY-API-10` reads a recovery without a case.

## A case opens the frozen history (STUDIO-54..56)

`20261116090000_a_case_opens_the_frozen_history.sql` builds the historical access case of
ADR-023 (HU-STUDIO-061, 062 and 063; code branch `feat/historical-access-case`, whose pull
request and database deploy are pending). The decisions, and how they differ from the
ADR, are in
[ALLFIT_ARCHITECTURE_DECISIONS.md](refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md),
ADR-023, section *As implemented (STUDIO-54/55/56)*.

It does five things:

- **A recent sign-in.**
  - **The column.** It adds `identity.access_sessions.authenticated_at`, nullable and
    allowed only on the `studio` surface (`ck_access_sessions_authenticated`), and
    `identity.recent_authentication_window()`, ten minutes.
  - **The session functions.** It replaces `identity.create_access_session` with a
    seven-argument version whose last argument, `p_authenticated_at`, defaults to null;
    the six-argument version is dropped. It also replaces `identity.load_access_session`,
    which adds `recent_authentication_expires_at`.
  - **The check.** It creates `identity.require_recent_studio_authentication(session_id)`,
    which raises `AF401`.
- **The case table.** It creates the enums `privacy.historical_access_purpose` and
  `privacy.historical_case_status`, and the table `privacy.historical_access_cases`, with:
  - forced row security and no privilege for `allfit_api`;
  - the eligibility constraint trigger, which is not deferrable;
  - the immutability triggers;
  - six policies;
  - one partial unique index, for one open case per relationship, membership and purpose.
- **Open, close, list.** It creates `privacy.open_historical_access_case`,
  `privacy.close_historical_access_case` and `privacy.list_historical_access_cases`,
  executable by `allfit_api`.
- **Closing on its own.** It adds three triggers that close open cases in the transaction
  that makes them ineligible:
  - `trg_data_grants_after_update_historical_cases` on `privacy.data_grants`, when a frozen
    grant is revoked;
  - `trg_organization_memberships_after_update_historical_cases` on
    `organizations.organization_memberships`, when a membership stops being active;
  - `trg_membership_roles_after_update_historical_cases` on
    `organizations.membership_roles`, when a role ends.
- **Reading through a case.**
  - **The predicate.** `access_control.historical_case_exercisable`,
    `privacy.frozen_category`, `access_control.can_read_frozen` and
    `privacy.scope_reads_frozen`.
  - **Three `for select` policies.** `executed_sessions_select_frozen`,
    `execution_revisions_select_frozen` and `session_visibility_denials_select_frozen`, all
    under the contract scope `frozen_history`. Each asks first whether that scope is open,
    once per statement, and only then calls `access_control.reads_frozen_session`,
    `access_control.frozen_case_covers_person` or
    `access_control.frozen_case_covers_relationship`.
  - **Why functions, not inline subqueries.** PostgreSQL expands a policy's subqueries,
    with the policies of every table they name, into each plan that reads the table, and
    every catalogue read of a gym's movement reads executed sessions through
    `movements_select_executed`. With the subqueries inline, the movement commands became
    four times slower and `organization-movement-concurrency.test.ts` timed out. A SQL
    function with `set search_path` is never inlined (the shape of
    `access_control.reads_under_break_glass`), so it is planned only when a case is read.
  - **Four reads,** executable by `allfit_api`: `privacy.read_historical_relationship`,
    `execution.list_frozen_executions`, `execution.read_frozen_execution` and
    `identity.list_frozen_body_progress`. Each records `privacy.access_events` in `frozen`
    mode before answering.

**No backfill.** Every session created before the migration keeps `authenticated_at`
null, so nobody holds a recent sign-in when it lands. A member who opens or reads a case
gets `403 reauthentication-required` and signs in again through
`GET /studio/v1/auth/start?reauthenticate=true`, which sends WorkOS `max_age=0`. Nothing
else in Studio asks for it, so no other screen notices.

**Locks.** With `lock_timeout = 5s` and `statement_timeout = 60s`, a busy table makes the
migration fail rather than queue; retry it.

- **`identity.access_sessions`:** adding the column and its check takes an
  `ACCESS EXCLUSIVE` lock while the check validates. The column is null on every row, so
  this is a short scan.
- **`execution.executed_sessions`, `execution.execution_revisions` and
  `privacy.session_visibility_denials`:** `CREATE POLICY` takes an `ACCESS EXCLUSIVE` lock
  on each for an instant, with no scan.
- **`privacy.data_grants`, `organizations.organization_memberships` and
  `organizations.membership_roles`:** `CREATE TRIGGER` takes a `SHARE ROW EXCLUSIVE` lock
  on each, which blocks writes but not reads, for an instant.

**Deploy order.** Merging runs **Deploy AWS**; dispatch **Deploy Database AWS** right after
it finishes, as in [the section above](#an-allfit-admin-holds-every-duty-adr-046).

- **Studio sign-in breaks until the migration is applied.** The new API calls
  `identity.create_access_session` with seven arguments, which do not exist yet, so every
  callback answers `503 upstream-unavailable` and nobody can sign in to Studio.
- **Existing sessions keep working.** `loadSession` reads `select *` and treats a missing
  `recent_authentication_expires_at` as null.
- **The seven historical routes answer `503`,** because their functions do not exist yet.
- **The other order is safe.** The old API's six-argument call resolves to the new function
  through the default, so applying the migration before the API ships breaks nothing. Keep
  the gap short either way.

**What a case can read depends on what was published.** A case reads only the scope
versions whose rules mark a resource `historical_readable` and do not exclude it. The V1
rules in `packages/db/scripts/v1-scope-rules.ts` mark executed sessions (`relationship_training`
and `prior_training_history`, at `read`) and the six structured fields of body measurements
(`body_progress`) since 5 November 2026 (commit `9dcd837`, HU-BO-024). A version published
from earlier rules may mark nothing, and a case over a relationship frozen on it reads
nothing: the reads answer an empty list or `403 scope-required`, never an error.

**Events.** `privacy.historical_access_case_opened.v1` and
`privacy.historical_access_case_closed.v1` go to the outbox with identifiers, purpose and
instants, never the justification or the reference. No worker consumes them yet. There is
no `expired` event: a case past its hours reads as `expired` and opens nothing, and it is
stored as closed only when someone closes it or opens an equivalent case, or when one of
the three triggers closes it.

**A gap the triggers leave.** No trigger watches `organizations.organizations`. A case
whose organization is suspended stays `open`, but cannot be exercised, because the read
checks that the organization is active.

What to watch, read-only:

```sql
-- Published versions and how many historical rules each has. A version with 0 lets a
-- case read nothing under it.
select definition.scope_code, definition.version_number,
       count(*) filter (where rule.historical_readable and not rule.is_excluded)
         as historical_rules
from privacy.scope_definitions as definition
left join privacy.scope_resource_rules as rule on rule.scope_definition_id = definition.id
where definition.status = 'published'
group by definition.scope_code, definition.version_number
order by definition.scope_code, definition.version_number;

-- Frozen grants whose version keeps nothing readable afterwards.
select shared.scope_code, definition.version_number, count(*) as frozen_grants
from privacy.data_grants as shared
join privacy.scope_definitions as definition on definition.id = shared.scope_definition_id
where shared.status = 'frozen'
  and not exists (
    select 1 from privacy.scope_resource_rules as rule
    where rule.scope_definition_id = shared.scope_definition_id
      and rule.historical_readable and not rule.is_excluded
  )
group by shared.scope_code, definition.version_number;

-- Must be empty: an open case after a frozen grant of its relationship was revoked.
select hcase.id
from privacy.historical_access_cases as hcase
join privacy.data_grants as shared on shared.relationship_id = hcase.relationship_id
where hcase.status = 'open'
  and shared.status = 'revoked'
  and shared.revoked_at >= hcase.opened_at;

-- Must be empty: an open case whose authorized membership is no longer active.
select hcase.id
from privacy.historical_access_cases as hcase
join organizations.organization_memberships as membership
  on membership.id = hcase.authorized_membership_id
where hcase.status = 'open'
  and membership.status <> 'active';

-- Must be 0: a frozen read recorded without its case (the last day only, so the
-- partition key prunes).
select count(*)
from privacy.access_events
where access_mode = 'frozen'
  and historical_access_case_id is null
  and occurred_at >= now() - interval '1 day';
```

**Open follow-ups.**

- No Studio screen opens, lists, closes or reads a case yet; the routes are backend only.
- The 24 months of case retention in the data dictionary are not enforced, and the
  immutability trigger refuses deletes until a disposition path exists.
- No test covers a case refused because the person closed her account, though the predicate
  checks it.
- Frozen nutrition guidance (`OP-NUT-011` with a case) is built since STUDIO-61..65; see
  *A coach reads and guides what a client eats* below.

Tests:

- `T-PRV-HIST-01` (58) covers `OP-PRV-018`, `-019` and `-025`, under these groups:
  - the table under forced row security;
  - the recent sign-in: Studio only, never in the future, the ten-minute window;
  - who may open a case, and whom it may name;
  - the validation;
  - opening, replaying and the one open case;
  - the events, with no justification or reference;
  - listing per role;
  - immutability;
  - closing and converging;
  - derived expiry;
  - closing on its own: role ended, membership left, frozen grant revoked;
  - a category that did not freeze.
- `T-PRV-HIST-02` (40) covers `OP-PRV-020`:
  - the three policies, and that nothing is visible without a case;
  - a stale sign-in;
  - each read, with the cut, the hidden, corrected and annulled sessions, the measurements
    recorded before the cut and the fields the version kept;
  - the access record per category, and each refusal recorded;
  - expired, closed and foreign cases;
  - the revocation that closes the case;
  - that `allfit_api` cannot call the predicate;
  - that no case reads her health.
- `historical-access-case-concurrency.test.ts` (2) races a revocation against an opening
  in both orders.
- API: `studio-historical-access.test.ts` (18) covers the seven routes, the headers, the
  error mapping and the cache headers. The Studio identity tests and the WorkOS adapter
  test cover `auth_time`, `reauthenticate=true` and `recent_authentication_expires_at`.

## A coach reads and guides what a client eats (STUDIO-61..65)

`20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql` lets the coach who attends
a person read the nutrition she shares and propose her goals (HU-STUDIO-068..072,
`OP-NUT-009..013`; pull request allfitone#203, whose merge and database deploy are
pending). The decisions, and how they differ from the ADR, are in
[ALLFIT_ARCHITECTURE_DECISIONS.md](refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md),
ADR-027, section *As implemented (STUDIO-61..65)*.

It does five things:

- **The credential.**
  - It inserts the credential type `nutrition_professional` into
    `catalog.professional_credential_types`.
  - It adds `identity.effective_credential_verification(person, type)` and
    `identity.credential_verification_is_effective(verification, person, type)`. Neither is
    executable by `allfit_api`.
- **Policies on the nutrition tables.** All are `to allfit_owner`, under contract scopes
  that only the new functions open:
  - `*_select_review` on meals, items, nutrient values, goal versions, targets and decisions;
  - `*_proposal` on goal sets, versions and targets;
  - `goal_versions_select/update_detachment`;
  - `goal_*_select_frozen` on versions, targets and decisions.
- **The reads and the command,** executable by `allfit_api`:
  - `nutrition.list_client_meals`;
  - `nutrition.read_client_daily_summaries`;
  - `nutrition.open_client_meal_photo`;
  - `nutrition.list_client_goal_versions`;
  - `nutrition.propose_goal_version`;
  - `nutrition.list_frozen_goal_versions`.
- **Cancelling at the end.** It creates `nutrition.cancel_relationship_goal_proposals` and
  recreates `relationships.close_relationship` with the body of `20261112090000` plus that
  call. Her ending it, the gym ending it and the organization closing all go through it.
- **Helpers.** Non-inlined SQL helpers for the policies:
  - `nutrition.scoped_relationship` and `scoped_subject`;
  - `goal_version_visible`, `goal_version_from` and `proposal_in_progress`;
  - `reads_frozen_goal_version` and `reads_frozen_goal_decision`.

  JSON projections: `client_meal_json`, `client_targets_json`, `client_goal_version_json` and
  `field_shared`.

**What it does not add.** It adds no table, column, index or trigger, and needs no
backfill. Creating the policies takes a brief exclusive lock on each nutrition table. With
`lock_timeout = 5s`, a busy table makes the migration fail rather than queue; retry it.

**Deploy order.** Merging runs **Deploy AWS**. Then dispatch **Deploy Database AWS**.
Until the migration is applied, the six new routes answer `503`. Nothing that exists
changes behaviour, since no existing signature changes.

**After the deploy: publish `nutrition_guidance` v2.** Until it is published, no grant
can reach `contribute` and no frozen case keeps guidance, so proposing answers
`403 scope-required` and the frozen read answers the same.

1. A curator with `curate_global_catalog` opens Backoffice `/permissions` and publishes a
   new version of `nutrition_guidance`. The rules come from
   `packages/db/scripts/v1-scope-rules.ts`:
   - **Up to `contribute`:** `nutrition.goal_sets`, `nutrition.goal_versions` and
     `nutrition.goal_targets`, field `*`.
   - **Read and historical:** `nutrition.goal_decisions`, field `*`.
   - **Historical fields on `nutrition.goal_versions`:** `version_number`, `origin`,
     `status`, `rationale`, `author_person_id`, `origin_relationship_id`, `created_at`,
     `activated_at` and `cancelled_at`.
   - **Historical fields on `nutrition.goal_targets`:** `nutrient_definition_id`, `mode`,
     `minimum_value`, `maximum_value`, `exact_value` and `unit_code`.
   - **Excluded:** `nutrition.meals` and `nutrition.meal_items`.

   Locally, `publish-local-scopes.ts` publishes it on its own, because it now publishes a
   new version whenever a scope's rules changed.
2. Grants already given stay at their version (ADR-007). A v1 grant still reads goals, but
   never proposes and keeps nothing for a case.
3. **Known limit:** Studio-web invites at `read` only
   (`apps/studio-web/src/lib/client-invitations.ts`), and nothing raises an existing grant.
   Proposing works only once an invitation asks `nutrition_guidance` at `contribute`, which
   is front work (STUDIO-136).
4. Staff verify each coach's `nutrition_professional` credential in Backoffice
   (`verify_professional_credentials`), as for any other type. Only the `coach` role holds
   `guide_nutrition`.

**The event.** `nutrition.goal_version_proposed.v1` carries the version, the person, the
relationship and the organization, never targets or rationale. It is a domain record:
no worker consumes it, and she is not told by email yet.

**Checks after the deploy.** All are read only and return identifiers, never content.

```sql
-- v2 is published once the curator has acted.
select version_number, status, published_at
from privacy.scope_definitions
where scope_code = 'nutrition_guidance'
order by version_number;

-- Must be empty: a professional version without the verification it was proposed under.
select id
from nutrition.goal_versions
where origin = 'professional'
  and credential_verification_id is null;

-- Must be empty: a proposal still waiting on a relationship that has ended.
select version.id
from nutrition.goal_versions as version
join relationships.service_relationships as relationship
  on relationship.id = version.origin_relationship_id
where version.status = 'proposed'
  and relationship.status = 'terminated';
```

**Open follow-ups.**

- No Studio screen calls the new routes yet (STUDIO-133..137).
- Invitations ask for `read` only, as above.
- She is not notified of a proposal; the event has no consumer.
- Inside `nutrition.list_frozen_goal_versions`, the cut repeats what the frozen policy
  already applies. Removing it changes nothing a test can see. The policy is the guard,
  and the mutation tests prove it.

Tests:

- `T-NUT-STUDIO-01` (46) covers `OP-NUT-009`, `-010`, `-011` live and `-013`:
  - holder and cover read; no attendance means not found; owner and admin read nothing
    by role;
  - fields the version hides;
  - the photo, only with both grants and a version that keeps where it is;
  - totals only from shared rows;
  - the access record before any row;
  - revocation on the next request;
  - live goals with her active goal masked;
  - the review policies read directly.
- `T-NUT-STUDIO-02` (30) covers `OP-NUT-012`:
  - who may propose, and each state of the credential;
  - a `read` grant and a paused service;
  - validation and idempotency;
  - superseding;
  - cancelling at the end;
  - the event without content;
  - the insert policy against a direct write.
- `T-NUT-HIST-01` (17) covers `OP-NUT-011` frozen:
  - only this relationship's proposals by the cut, and each `status_at_cut`;
  - a decision after the cut is not told;
  - a v1 grant answers `scope-required`;
  - a stale sign-in, expired and foreign cases;
  - the access record in `frozen` mode;
  - the frozen policies read directly.
- `T-IDN-PROFESSIONAL-PROFILE-01` now expects four credential types.
- `goal-proposal-concurrency.test.ts` (10) races a proposal against another proposal, her
  decision, her own goal, a revocation and the end of the relationship. One case holds the
  goal set and checks that a proposal waits on it before numbering.
- API:
  - `nutrition/handlers/studio.test.ts` covers the five routes against the contract, the
    origin and cookie, ranges, the uniform photo `404`, proposal validation, the request
    hash and every error mapping;
  - the application and infrastructure tests for Studio nutrition;
  - `studio-historical-access.test.ts` and `privacy/infrastructure/historical-access.test.ts`
    cover the frozen route and its binding.

## The client card, today, search and her access log (STUDIO-74..77)

Four migrations build `HU-STUDIO-081..084` and `OP-PRV-015` (pull request allfitone#204,
merged and deployed on 9 November 2026). The decisions, and how they differ from earlier documents, are in
[ALLFIT_ARCHITECTURE_DECISIONS.md](refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md),
ADR-047.

- **`20261118090000_a_member_finds_a_client_by_name.sql` (`OP-REL-010`, STUDIO-75).**
  - It creates `relationships.fold_name(text)`, immutable, which no runtime role executes.
  - It creates the eight-argument `relationships.list_organization_clients(…, p_query)`,
    `security definer`, executable by `allfit_api`.
  - It replaces the seven-argument signature with a `security invoker` wrapper that calls
    the new one with a null search. Both stayed executable by `allfit_api` until
    `20261119090000_the_directory_keeps_one_signature.sql` (allfitone#205) dropped the wrapper.
- **`20261118100000_a_coach_opens_the_card_of_a_client.sql` (`OP-REL-019`, STUDIO-76/77).**
  - It creates the policy `service_relationships_select_former_attendance` on
    `relationships.service_relationships`, `for select to allfit_owner`, admitting the one
    row named by the open contract scope `former_attendance`.
  - It creates the helpers `relationships.client_card_grants` and
    `relationships.former_attendance`, which no runtime role executes, and the entry point
    `relationships.read_client_card`, `security definer`, executable by `allfit_api`.
  - It recreates `execution.proposal_for_proposer` with one change: `session_hidden` and
    `session_annulled` read as `session_unavailable`.
- **`20261118110000_a_person_reads_who_read_her_data.sql` (`OP-PRV-015`, STUDIO-76).** It
  creates `privacy.list_my_access_events`, `security definer`, executable by `allfit_api`.
  It adds no view, no policy, no grant on `privacy.access_events` and no index.
- **`20261118120000_a_studio_member_sees_what_needs_attention_today.sql` (`OP-REL-020`,
  STUDIO-74).** It creates the helpers `relationships.today_invitations` and
  `relationships.today_training(organization, now)`, which no runtime role executes, and
  the entry point `relationships.read_studio_today`, `security definer`, executable by
  `allfit_api`.

**What they do not add.** No table, column, index or trigger, and no backfill. The only
policy is the `former_attendance` one. `CREATE POLICY` takes an `ACCESS EXCLUSIVE` lock on
`relationships.service_relationships` for an instant, with no scan. With
`lock_timeout = 5s`, a busy table makes the migration fail rather than queue; retry it.

**The contract scope `former_attendance`.** The policy compares the row's id with
`(select access_control.contract_scope('former_attendance'))`, read once per statement.
Only `relationships.former_attendance` opens it, for the one relationship the caller's
current membership last attended, reads `status` and `ended_at`, and closes it before it
returns. `read_client_card` calls it only when the caller does not attend the person. A
coach never reads anything else of that row, and nobody else reaches it.

**Deploy order.** Merging runs **Deploy AWS**, which rolls out the API first. Then dispatch
**Deploy Database AWS**, as in [the section above](#an-allfit-admin-holds-every-duty-adr-046).
Until the migrations are applied:

- **The plain directory keeps working.** Without `q`, the API calls the seven-argument
  `list_organization_clients`, which already exists.
- **Search, the card, today and the access log answer `503`.** Their functions do not exist
  yet (`42883`), and the API maps any other database failure to `upstream-unavailable`.
- **Studio's correction list still says `session_hidden` or `session_annulled`**, values the
  new contract no longer lists. No Studio screen reads `cancel_reason` yet.
- **The other order is safe.** The old API calls only the seven-argument directory, which
  the migration keeps; its correction list would say `session_unavailable`, which no screen
  reads yet. Keep the gap short either way.

**What today writes.** Every opening by a member with `observe_training` writes one row in
`privacy.access_events` per client evaluated: `resource = 'relationships.studio_today'`,
`purpose = 'studio_attention_today'`, `access_mode = 'live'`, `result = 'allowed'`, under
her `relationship_training` grant, with the request id the API generates. A client with no
active `relationship_training` grant is neither evaluated nor recorded. Each such row is
listed in her access log, so a coach who opens today often fills his clients' logs.

**Checks after the deploy.** All are read only and return catalogue facts or counts, never
content.

```sql
-- Owner, security and who may call each function. Expected: every row owned by
-- allfit_owner; security definer for the eight-argument directory, read_client_card,
-- read_studio_today and list_my_access_events; allfit_api executes those four and none
-- of the five helpers. Since allfitone#205 the directory has one signature.
select procedure.oid::regprocedure as function,
       pg_get_userbyid(procedure.proowner) as owner,
       procedure.prosecdef as security_definer,
       has_function_privilege('allfit_api', procedure.oid, 'execute') as api_executes
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname || '.' || procedure.proname in (
  'relationships.list_organization_clients', 'relationships.read_client_card',
  'relationships.read_studio_today', 'privacy.list_my_access_events',
  'relationships.fold_name', 'relationships.client_card_grants',
  'relationships.former_attendance', 'relationships.today_invitations',
  'relationships.today_training')
order by 1;

-- Expected: one row, roles {allfit_owner}, command SELECT.
select policyname, roles, cmd
from pg_policies
where schemaname = 'relationships'
  and tablename = 'service_relationships'
  and policyname = 'service_relationships_select_former_attendance';

-- Expected: false. Her log is read only through privacy.list_my_access_events.
select has_table_privilege('allfit_api', 'privacy.access_events', 'select') as api_selects;
```

**Open follow-ups.**

- No screen calls the new routes yet: the Studio screens are STUDIO-146..149, and the Space
  screen for the access log is front work too.
- The seven-argument `list_organization_clients` is gone: allfitone#205 dropped it on
  9 November 2026, once no deployed API called it.
- A coach who comes back under a different membership gets no reason: only the current
  membership is looked at.
- Name folding covers Latin accents only.
- `training` counts the planned sessions that exist. A week of a program without an end
  that she never opened may hold none (ADR-032 plants it on her read).

Tests:

- `T-REL-DIRECTORY-03` (19) covers `q`: accents and case, spaces, `%` and `_` as
  characters, no invitations, keyset through the matches, an owner searching `terminated`,
  a coach finding only his clients, the length limits and `invited`, no access event, the
  one signature left since allfitone#205, and the folding helper closed to the runtime.
- `T-REL-CARD-01` (19) covers the live card: the sections and their order, version and
  level, meal photos only with the meals, withdrawn and shared again, refused nowhere, an
  accepted cover with its `ends_on`, owner, admin and staff not found, a non-member
  refused, no access event, and which functions the runtime may call.
- `T-REL-CARD-02` (22) covers the former card: each reason and its instant, a cover ended
  early or by its date, held and then covered, thirty days, a refused or unanswered cover,
  no name, her return changing nothing, another coach and the owner told nothing, no
  access event, the policy for `allfit_owner` only and its scope read once per statement.
- `T-PRV-ACCESSLOG-01` (21) covers `OP-PRV-015`: order and ties, a coach's read with the
  person, the organization and holder or cover, denied and frozen reads, break-glass and
  support by name, her own and others' reads and the horizon excluded, the scope filter,
  keyset inside a tie, nobody reading another log, the limits, the cursor and scope
  validation, nothing written by reading, the table closed to `allfit_api`, and the
  subject index on every partition.
- `T-REL-TODAY-01` (24) covers the notices per role, the counts and the five items, a
  coach's own invitations, unassigned and termination requests, team invitations and the
  team, new relationships, `empty`, refusals, and no access event for the counts.
- `T-REL-TODAY-02` (17) covers `training`: the closed week, cancelled, paused and annulled
  sessions, 48 hours, the screening scope closed afterwards, one access event per client
  evaluated with its grant and none without one, a lapsed cover, the request id, the week
  in her timezone, and that the runtime cannot call the helper.
- `T-EXE-PROPOSAL-CANCEL-01` now has 22: `-CANCEL-LIST-03/04` show Studio's
  `session_unavailable` and her real reason.
- `T-ORG-CLOSE-01` counts the relationship functions the runtime reaches: nineteen since
  allfitone#205, which left the directory with one signature.
- API:
  - `relationships/handlers/client-card.test.ts`: `T-REL-CARD-API-01..05` and
    `T-REL-TODAY-API-01..03` (the contract, the links, the error mapping, origin, session
    and identifiers);
  - `relationships/handlers/studio.test.ts`: the search, its validation and its cursors;
  - `relationships/infrastructure/card-and-today.test.ts` and `directory.test.ts`: the
    bindings, the request id, and the seven-argument call without a search;
  - `privacy/handlers/space.test.ts` (`T-PRV-API-SPACE-19..22`) and
    `privacy/infrastructure/my-access-log.test.ts`: the route, the cursor bound to the
    scope, and the binding;
  - `execution/handlers/studio.test.ts` (`T-EXE-PROPOSAL-API-09`): the contract refuses
    `session_hidden` and `session_annulled` for Studio.

## The directory keeps one signature (allfitone#205)

`20261119090000_the_directory_keeps_one_signature.sql` drops the seven-argument
`relationships.list_organization_clients`, the `security invoker` wrapper that STUDIO-75 kept
for its deploy gap. The API binds the search, or null, as the eighth argument. The function
is dropped without `cascade`, so the migration fails if anything still calls it.

**Deploy order.** Either order is safe:

- the new API calls only the eight-argument function, live since allfitone#204;
- Deploy Database AWS waits for that commit's migrator.

It was applied on 9 November 2026.

**Check after the deploy.** Expected: one row, the eight-argument signature.

```sql
select procedure.oid::regprocedure as signature
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'relationships'
  and procedure.proname = 'list_organization_clients';
```

Tests:

- `T-REL-DIRECTORY-03` proves that only that signature is left and that `allfit_api`
  executes it.
- `T-REL-DIRECTORY-01/02` call it.
- `T-ORG-CLOSE-01` counts nineteen relationship functions.
- `directory.test.ts` binds a null search in the last position.

## A gym sells its plans (HU-STUDIO-074..077)

Two migrations build `HU-STUDIO-074..077` (`OP-PAY-002..006`; Jira TECH-48, TECH-130, TECH-71
and TECH-133; pull request allfitone#207). What each operation does is in
[the operations matrix](refactor/03_PROPOSED_DESIGN/V1_OPERATIONS_MATRIX.md), and why plans
are delivered in person or remotely is in ADR-048.

- **`20261120090000_a_gym_sells_its_plans.sql`.**
  - It adds `payments.plan_versions.delivery_mode text not null default 'in_person'`, with
    `ck_plan_versions_delivery_mode`. A constant default adds the column without rewriting
    the table, and every existing version reads `in_person`, which is what Space has always
    offered.
  - It recreates `payments.plan_version_guard_tg` so `delivery_mode` is frozen with the
    rest of a published version.
  - It creates `uidx_plan_versions_live`, unique on `(plan_id) where status = 'published'`:
    one price on sale per plan.
  - It creates the helpers `payments.organization_plan_projection` and
    `payments.require_plan_manager`, which no runtime role executes, and five entry points,
    `security definer` and executable by `allfit_api`: `create_organization_plan`,
    `rename_organization_plan`, `publish_plan_version`, `deprecate_plan_version` and
    `list_organization_plans_for_team`.
- **`20261120100000_space_offers_only_in_person_plans.sql`.** It recreates
  `payments.list_organization_plans` and `payments.subscribe_to_plan` with the same
  signatures and grants. Both keep only `in_person` versions. `subscribe_to_plan` first takes
  `pg_advisory_xact_lock_shared` on the version; publishing and retiring take the exclusive
  lock, so no subscription is created on a version whose retirement has committed.

**What they do not add.** No table, policy, table grant or backfill. Adding the column and
the constraint takes an `ACCESS EXCLUSIVE` lock on `payments.plan_versions` for an instant,
and building the index blocks writes to it while it reads a small table. With
`lock_timeout = 5s`, a busy table makes the migration fail rather than queue; retry it.

**Before the deploy: one price on sale per plan.** The index cannot be built if a plan
already has two published versions. Nothing in production has published one yet, because
Studio had no route for it. The master user does not bypass RLS, so a `select` on
`payments.plan_versions` returns nothing whatever the table holds. Before Deploy Database AWS
is dispatched, read the row count instead, read only:

```sql
select n_live_tup
from pg_stat_user_tables
where schemaname = 'payments'
  and relname = 'plan_versions';
```

Zero means nothing can conflict. Otherwise the index finds any duplicate itself: the
migration fails and rolls back whole, and nothing changes. Which price stays on sale is then
the gym's decision, not the deploy's.

**Deploy order.** Merging runs **Deploy AWS**, which rolls out the API first. Then dispatch
**Deploy Database AWS**. Until the migrations are applied:

- **The five plan routes answer `503`.** Their functions do not exist yet (`42883`), and
  the API maps any other database failure to `upstream-unavailable`.
- **Space keeps answering as before.** Its list and subscribe functions keep their old
  bodies, and no remote version can exist without the new column.

**Rollback.** The migrations are forward only. An API rollback leaves the five functions
unused; the column, the index and the in-person filter stay.

**Check after the deploy.** Expected: five rows, each `true`.

```sql
select procedure.proname, has_function_privilege('allfit_api', procedure.oid, 'execute')
from pg_proc as procedure
join pg_namespace as namespace on namespace.oid = procedure.pronamespace
where namespace.nspname = 'payments'
  and procedure.proname in (
    'create_organization_plan', 'rename_organization_plan', 'publish_plan_version',
    'deprecate_plan_version', 'list_organization_plans_for_team'
  );
```

Tests:

- `T-PAY-GYM-PLAN-01` covers creating, renaming and listing.
- `T-PAY-GYM-PLAN-02` covers publishing, replacing, retiring and what Space offers.
- `T-PAY-SUBSCRIPTION-01` writes its second version after retiring the first.
- `T-PAY-API-02` (`studio-plans.test.ts`) checks the routes against the contract.
- The race between retiring and subscribing needs two sessions, so pgTAP cannot run it. It
  was checked by hand on 9 November 2026. With the lock, the subscription waited for the
  retirement and was refused with `P0002`. Without the lock, it landed on the retired
  version.
