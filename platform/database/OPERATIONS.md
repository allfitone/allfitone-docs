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
