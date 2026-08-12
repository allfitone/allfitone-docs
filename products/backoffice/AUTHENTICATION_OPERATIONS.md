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

Todas las rutas requieren `Origin` exacto, responden `Cache-Control: no-store` y `Referrer-Policy: no-referrer`, y nunca registran email, contraseña, TOTP, QR, clave manual, factor/challenge ID o tokens. La sesión `allfit_backoffice_session` usa path `/backoffice/v1`, inactividad máxima de quince minutos y vigencia absoluta de ocho horas.

## Límites en Vercel

Crear reglas por proyecto API sin persistir IP en PostgreSQL:

- password: 10 solicitudes cada 15 minutos por IP;
- TOTP: 20 solicitudes cada 15 minutos por IP, además de cinco códigos inválidos por intento en PostgreSQL;
- reset: 5 solicitudes por hora por IP.

El rechazo es `429 rate-limited` con `Retry-After`. Las métricas son contadores sin PII para password, enrollment, challenge, verification, session, logout, reset y rate limiting.

## Bootstrap protegido

1. Aplicar las migraciones con el workflow protegido normal.
2. Crear el environment de GitHub `backoffice-bootstrap-production` con `prevent self-review`, reviewers autorizados y `SUPABASE_ADMIN_DATABASE_URL` sólo en ese environment.
3. Ejecutar `backoffice-bootstrap.yml` desde `main` con dos personas activas, sus dos subjects WorkOS, issuer exacto, vencimiento del deber menor o igual a 90 días y una referencia de ceremonia sin PII.
4. Verificar que las cuentas quedaron vinculadas, existen dos `allfit_admin` cruzados y cada persona recibió `manage_platform_access` otorgado por la otra.
5. Retirar o rotar la credencial administrativa al terminar. El workflow no sustituye el alta de una persona ni crea cuentas WorkOS.

El iniciador y el aprobador independiente del environment constituyen las dos personas operativas; `prevent self-review` es obligatorio. No existe endpoint, seed ni función concedida a runtime para repetir el bootstrap.

## Recuperación de un autenticador perdido

Usar `backoffice-totp-recovery.yml` desde `main` y el environment protegido `backoffice-totp-recovery-production`. Deben intervenir dos administradores distintos del sujeto, ambos con `manage_platform_access` vigente. La función bloquea el factor, sesiones, intentos y roles relevantes; registra evidencia inmutable y emite limpieza al worker. El próximo password correcto inicia un enrolamiento nuevo.

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
5. Confirmar inactividad de 15 minutos, absoluto de 8 horas, logout repetido y revocación del rol durante un login.
6. Solicitar reset de una dirección conocida y una desconocida; ambas peticiones responden `202`. Completar el correo alojado en `*.authkit.app` y comprobar revocación de sesiones sin pérdida del TOTP.
7. Probar recuperación protegida de un factor y el enrolamiento posterior.
8. Activar Producción sin frontend y ejecutar el mismo smoke test mediante el contrato HTTP.

Para rollback, apagar primero `BACKOFFICE_AUTH_ENABLED`. No apagar worker, logout, sesión, expiración, reset ni revocación mientras existan intentos o sesiones emitidos.

## Límite de la garantía

Password + TOTP es la evidencia AAL2 interna aprobada para V1, vinculada a la sesión y no a claims. TOTP puede ser objeto de phishing; Allfit no declarará cumplimiento integral de una oferta AAL2 moderna hasta incorporar WebAuthn/passkeys. Añadir `auth.allfit.one` posteriormente sólo cambia el branding y la configuración de páginas alojadas de WorkOS: no migra contratos HTTP, cookies, factores ni sesiones locales.
