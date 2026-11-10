# Operación de autenticación de Allfit Backoffice

- **Aplica a:** `HU-BO-001`, `HU-BO-002`, `HU-BO-003`
- **Superficie:** `/backoffice/v1`
- **Evidencia V1:** contraseña + TOTP, materializada como AAL2 por sesión
- **Frontend:** `apps/backoffice-web`, cliente directo de `/backoffice/v1`

Backoffice no usa Hosted AuthKit para iniciar sesión. La API combina la autenticación por contraseña de la Application Backoffice con la [API MFA componible de WorkOS](https://workos.com/docs/mfa), y PostgreSQL sólo crea la cookie de sesión después de confirmar el challenge TOTP. La recuperación de contraseña es la única ceremonia alojada: WorkOS envía el correo y sirve la página en su dominio `*.authkit.app`.

## Comportamiento del frontend

- El arranque consulta sesión e intento en paralelo. Una sesión `200` abre la
  confirmación AAL2; un intento `200` reanuda enrolamiento o challenge; dos
  respuestas `401` muestran el acceso. Cualquier estado indeterminado falla
  cerrado y no monta datos del operador.
- El enrolamiento muestra el QR devuelto por WorkOS y siempre ofrece la clave
  manual. Correo, contraseña, TOTP, QR y clave manual viven sólo en memoria y no
  se escriben en URL, logs, `localStorage` ni `sessionStorage`.
- Cada código distinto crea un `Idempotency-Key` UUIDv4 y `Command-Id` UUIDv7.
  Si la respuesta se pierde, el cliente comprueba primero la sesión y conserva
  los mismos identificadores para un reintento seguro del mismo código.
- El navegador sincroniza entre pestañas únicamente estado y vencimientos
  técnicos. Revalida al volver a la pestaña o restaurar BFCache y actualiza la
  actividad como máximo una vez por minuto.
- Un cierre manual o por inactividad desmonta de inmediato la vista autenticada.
  Si no puede confirmarse, aparece “Tu sesión está protegida” sin nombre ni datos
  del operador, con acciones para completar el cierre o reintentar.
- Hasta implementar `HU-BO-004`, el resultado autenticado es “Acceso confirmado”:
  nombre, evidencia AAL2, vencimientos y logout. No simula navegación, permisos ni
  un dashboard todavía inexistente.

El frontend usa exclusivamente `@allfitone/react` y los DTO generados de
`@allfitone/contracts`. `NEXT_PUBLIC_API_URL` sigue siendo su única variable de
entorno.

## Configuración de WorkOS

En cada ambiente, usar una Application exclusiva de Backoffice dentro del environment correspondiente:

| Ajuste | Valor |
| --- | --- |
| Método | Email + password activo |
| Emails predeterminados | Activos |
| MFA global de AuthKit | Desactivado |
| SSO, OAuth, Magic Auth, SMS y passkeys | Desactivados en V1 |
| Dominio personalizado | No requerido; `auth.allfit.one` diferido |
| Webhook | `password_reset.succeeded` hacia `{API_PUBLIC_URL}/webhooks/workos` |

El login usa `WORKOS_API_KEY_BACKOFFICE`, `WORKOS_CLIENT_ID_BACKOFFICE` y el issuer esperado en la API. El worker sólo necesita `WORKOS_API_KEY_BACKOFFICE` para eliminar factores abandonados y revocar `sid`; no necesita client ID, issuer ni dominio.

## Variables y gates

| Deployable | Variable | Uso |
| --- | --- | --- |
| API | `BACKOFFICE_AUTH_ENABLED=false` | Cierra únicamente nuevos inicios por contraseña durante despliegue o rollback |
| API | `BACKOFFICE_WEB_URL` | Origen CORS exacto; no admite lista ni wildcard |
| API | `WORKOS_API_KEY_BACKOFFICE` | Password, MFA, reset y revocación |
| API | `WORKOS_CLIENT_ID_BACKOFFICE` | Application exacta para autenticar y validar tokens |
| API | `WORKOS_ISSUER` | Issuer esperado y vínculo de `access_accounts` |
| API | `SESSION_ENCRYPTION_KEY` | Cifra tokens y datos temporales de enrolamiento |
| Worker | `WORKOS_API_KEY_BACKOFFICE` | Limpieza y revocación externa |
| Worker | `DATABASE_URL`, `CRON_SECRET` | Funciones cerradas y protección de `/cron/outbox` |

Con el gate apagado, sesión, logout, verificación de intentos ya abiertos, reset, expiración y revocación continúan disponibles. No se agregan variables de dominio personalizado.

## Contrato y cookies

- `POST /backoffice/v1/auth/password` crea un intento de diez minutos y la cookie `allfit_backoffice_auth_attempt`, `HttpOnly`, `SameSite=Strict`, host-only y limitada a `/backoffice/v1/auth`.
- `GET /backoffice/v1/auth/attempt` recupera challenge o enrolamiento sin devolver IDs, tokens ni identidad.
- `POST /backoffice/v1/auth/totp/verification` exige `Idempotency-Key`, `Command-Id` y un código de seis dígitos. El intento tolera como máximo cinco códigos incorrectos.
- `GET /backoffice/v1/session` devuelve únicamente nivel/método, nombre propio y vencimientos. No expone email, factor, claims, deberes ni permisos.
- `POST /backoffice/v1/auth/logout` acepta `manual`, `inactivity` o `recovery`, no redirige y siempre responde `204`.
- `POST /backoffice/v1/auth/password-resets` siempre responde `202`; la API descarta URL y token devueltos por WorkOS.

Todas las rutas requieren `Origin` exacto, responden `Cache-Control: no-store` y `Referrer-Policy: no-referrer`, y nunca registran email, contraseña, TOTP, QR, clave manual, factor/challenge ID o tokens. The `allfit_backoffice_session` cookie uses path `/backoffice/v1` and `Max-Age=43200`. The session ends after 60 minutes without activity or 12 hours in all (ADR-046); PostgreSQL enforces both through `access_control.backoffice_idle_limit()` and `access_control.backoffice_session_lifetime()`, and `GET /backoffice/v1/session` reports `inactivity_expires_at` as the last activity plus 60 minutes.

## Límites en Vercel

Crear reglas por proyecto API sin persistir IP en PostgreSQL:

- password: 10 solicitudes cada 15 minutos por IP;
- TOTP: 20 solicitudes cada 15 minutos por IP, además de cinco códigos inválidos por intento en PostgreSQL;
- reset: 5 solicitudes por hora por IP.

El rechazo es `429 rate-limited` con `Retry-After`. Las métricas son contadores sin PII para password, enrollment, challenge, verification, session, logout, reset y rate limiting.

## Bootstrap protegido

The `backoffice-bootstrap.yml` workflow and the `backoffice-bootstrap-production`
environment this section used to describe do not exist (ADR-046, *A stale ceremony*). The
ceremony is the `bootstrap` command of the migrator task, `infra/docker/migrator.sh`:

1. Apply the migrations as usual (**Deploy Database AWS**).
2. Each of the two people signs in to Studio once, so their WorkOS account already has a
   person; the command looks both people up through those accounts.
3. Run the migrator task on ECS with the command `bootstrap` and three environment
   overrides: `SUBJECT_A` and `SUBJECT_B`, the two WorkOS user ids, and
   `CEREMONY_REFERENCE`, the approving ticket without personal data. The header of
   `infra/docker/migrator.sh` gives the `aws ecs run-task` call. Since ADR-046 there is no
   `DUTY_DAYS`; a value left over from an old runbook is ignored.
4. The command resolves both people, switches to `allfit_migrator` and calls
   `support.bootstrap_backoffice_administrators` in one transaction. It links the accounts
   and grants each person `allfit_admin`, granted by the other; each role brings the
   thirteen duties, granted by the other person and with no end of their own.
5. Check that both accounts are linked, that two crossed `allfit_admin` roles exist and that
   each person holds thirteen duties with `basis = 'admin_role'`.

The task connects with the database master credential. No endpoint, seed or function
granted to the runtime can repeat the bootstrap. The command does not create people or
WorkOS accounts.

## Recuperación de un autenticador perdido

**Not runnable as written (see ADR-046, *A stale ceremony*):** the `backoffice-totp-recovery.yml` workflow and its environment do not exist, and no migrator command runs the recovery. The function `identity.recover_backoffice_totp_factor` exists and requires two administrators other than the subject, both holding `manage_platform_access`; with two administrators in all, it cannot run for either of them. The rest of this section describes what the function does. La función bloquea el factor, sesiones, intentos y roles relevantes; registra evidencia inmutable y emite limpieza al worker. El próximo password correcto inicia un enrolamiento nuevo.

El proceso nunca muestra ni recupera la clave TOTP anterior. Cambiar la contraseña no elimina por sí solo el factor activo; un `password_reset.succeeded` sí revoca sesiones Studio/Backoffice e intentos pendientes.

## Worker y observabilidad

`GET /cron/outbox` procesa en cada ejecución:

- vencimiento por lotes de intentos;
- eliminación de factores pendientes abandonados;
- revocación de `sid` por logout parcial, rol retirado, reset o recuperación;
- reintentos idempotentes y dead letter después del máximo configurado.

Validar el cron con `Authorization: Bearer {CRON_SECRET}`: sin bearer debe responder `401`; con bearer debe devolver los resultados `invitations` y `backofficeAuthentication`. Alertar por `worker.backoffice_auth.cleanup` en `retrying`, crecimiento de intentos abandonados y aumento sostenido de verificaciones fallidas.

## Gate de sandbox y despliegue

1. Mantener `BACKOFFICE_AUTH_ENABLED=false`, aplicar estructura y funciones y ejecutar el bootstrap.
2. Confirmar que password desconocido, password erróneo, persona inactiva y rol ausente devuelven el mismo `401`.
3. En Preview, activar el gate y enrolar un QR real. Verificar un TOTP real y comprobar que sólo entonces aparece una sesión AAL2.
4. Repetir el login con el factor existente, probar cuatro códigos incorrectos y confirmar que el quinto termina el intento.
5. Confirm 60 idle minutes, 12 absolute hours (ADR-046), repeated logout and role withdrawal during a login.
6. Solicitar reset de una dirección conocida y una desconocida; ambas peticiones responden `202`. Completar el correo alojado en `*.authkit.app` y comprobar revocación de sesiones sin pérdida del TOTP.
7. Probar recuperación protegida de un factor y el enrolamiento posterior.
8. Activar Producción sin frontend y ejecutar el mismo smoke test mediante el contrato HTTP.

Para rollback, apagar primero `BACKOFFICE_AUTH_ENABLED`. No apagar worker, logout, sesión, expiración, reset ni revocación mientras existan intentos o sesiones emitidos.

## Límite de la garantía

Password + TOTP es la evidencia AAL2 interna aprobada para V1, vinculada a la sesión y no a claims. TOTP puede ser objeto de phishing; Allfit no declarará cumplimiento integral de una oferta AAL2 moderna hasta incorporar WebAuthn/passkeys. Añadir `auth.allfit.one` posteriormente sólo cambia el branding y la configuración de páginas alojadas de WorkOS: no migra contratos HTTP, cookies, factores ni sesiones locales.

### Password + TOTP is not WebAuthn (`HU-BO-001` criterion 7)

**What the gap is.** A TOTP code is not bound to the site that asks for it. A page that
imitates the Backoffice can take the password and the current code and replay both to the
real Backoffice within the code's window, and the session it opens is a genuine AAL2
session. WebAuthn and passkeys sign a challenge bound to the origin, so a look-alike page
gets nothing it can replay. That is why V1 never claims phishing resistance or full
equivalence with an AAL2 offer built on WebAuthn.

**What limits the damage in V1:**

- Every action checks the duty and the session's AAL2 again inside its own transaction.
- A session lasts 12 hours at most and ends after 60 idle minutes (ADR-046).
- An attempt ends at the fifth wrong code.
- Signing out, or withdrawing the base role, revokes the session.
- Every read of a person's data is recorded before it is returned, so a stolen session leaves
  a trail in `privacy.access_events`.

None of these stops the relay itself; they bound how long and how far a relayed session
goes.

**What closes it.** WebAuthn or passkeys as the Backoffice factor, which `DB-P5-019` keeps
open. Until then, nobody should be told that the Backoffice sign-in resists phishing.
