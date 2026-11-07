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
3. configurar claves HMAC, Resend, cron, base URL y reglas Vercel; desplegar API,
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
pending proposal pending**: she can still decide it.

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
