# Diccionario de datos V1

**Versión de revisión:** 8
**Fecha:** 17 de agosto de 2026
**Fase:** 4 — Modelo lógico y diccionario de datos
**Estado:** 136 fichas; la planificación de fuerza gana detalle por serie
**Deriva de:** [`V1_LOGICAL_ERD.md`](./V1_LOGICAL_ERD.md), [`POSTGRES_MODELING_STANDARD.md`](./POSTGRES_MODELING_STANDARD.md), [`V1_PHYSICAL_OBJECT_CATALOG.md`](./V1_PHYSICAL_OBJECT_CATALOG.md), [`V1_RLS_MATRIX.md`](./V1_RLS_MATRIX.md), [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](./V1_CROSS_TABLE_INTEGRITY_MATRIX.md), [`V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md`](./V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md), [`V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md`](./V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md)

## 1. Propósito

La ficha obligatoria de cada una de las **136 tablas físicas** de V1. El inventario vigente incluye `organizations.organization_type_transitions` y `system.invitation_rate_windows`; `identity.access_sessions` conserva evidencia por superficie sin confiar en claims. El plan de fases es tajante: **no se crea una tabla cuya ficha no pueda completarse**; enums, vistas, funciones y particiones hijas no cuentan como tablas de dominio.

Cada ficha responde los quince campos exigidos por [`DATABASE_REFACTOR_PHASES.md` §Fase 4](../04_EXECUTION/DATABASE_REFACTOR_PHASES.md). El diccionario, el ERD lógico y el SQL de Fase 5 deben coincidir; cualquier divergencia es un defecto que se corrige aquí antes de escribir la migración.

## 2. Convenciones que no se repiten en cada ficha

Para no repetir lo que el [estándar](./POSTGRES_MODELING_STANDARD.md) ya fija, estas reglas se aplican a **todas** las tablas salvo que la ficha diga lo contrario:

- **PK:** `id uuid` con default UUIDv7; las fichas offline que igualan `id = Command-Id` lo reciben del dispositivo. `access_events` y `disposition_events` usan PK compuesta con la columna de partición.
- **Nullability:** toda columna es `NOT NULL` salvo que la ficha escriba explícitamente `(nullable)`; payload y `*_schema_version` opcionales aparecen o faltan juntos.
- **`created_at timestamptz not null default now()`** en todas.
- **`updated_at timestamptz`** por trigger en tablas mutables; **ausente** en append-only.
- **Autoría:** cuando una fila la escribe un actor humano lleva `created_by_kind actor_kind` y el `created_by_person_id` o `created_by_membership_id` que aplique.
- **Contexto RLS:** toda tabla de dominio tiene `FORCE ROW LEVEL SECURITY`; las condiciones exactas están en [`V1_RLS_MATRIX.md`](./V1_RLS_MATRIX.md) y aquí se resume la policy.
- **`allfit_owner`** posee los objetos; **`allfit_api`** es el rol de runtime; los workers y soporte tienen los suyos.
- **Clasificación del dato** usa las categorías: `operational` (no personal), `identity_pii`, `training`, `body`, `health`, `nutrition`, `audit`.
- **Integridad cruzada:** las claves portadoras, FKs compuestas y triggers `IX-01..45` de [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](./V1_CROSS_TABLE_INTEGRITY_MATRIX.md) son obligatorios aunque una ficha resuma el mecanismo.
- **Trazabilidad RLS:** toda expresión “vía”, “hereda” o “relación visible” se expande en [`V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md`](./V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md) a joins, columnas, proyección, índice y pruebas exactos.
- **Objetos y JSONB:** los nombres físicos, enums compartidos, contratos JSONB y particiones se rigen por [`V1_PHYSICAL_OBJECT_CATALOG.md`](./V1_PHYSICAL_OBJECT_CATALOG.md); no se difieren a la migración.
- **Idempotencia:** scope, receipts, PKs offline, expiración, disposición y concurrencia se rigen por [`V1_IDEMPOTENCY_CONTRACT.md`](./V1_IDEMPOTENCY_CONTRACT.md).
- **Notación de índices:** “por `x`” significa B-tree exacto `(x)`; “compuesto anterior” usa exactamente las columnas y orden de `Consultas`; parciales reproducen literalmente su predicado. El catálogo físico determina el nombre.

### 2.1 Formato de ficha

Cada ficha lista: propósito, dominio/fuente de verdad, clasificación, columnas (nombre · tipo · nota), FKs con borrado, uniques y checks, actores lectura/escritura, RLS (resumen), patrones de consulta, índices, retención y eventos. Las columnas de auditoría estándar (§2) se omiten de la lista salvo cuando tienen una particularidad.

## 3. Índice

| Schema | Tablas | Sección |
| --- | --- | --- |
| `identity` | 21 | §4 |
| `organizations` | 11 | §5 |
| `relationships` | 6 | §6 |
| `privacy` | 17 | §7 |
| `catalog` | 18 | §8 |
| `planning` | 22 | §9 |
| `execution` | 14 | §10 |
| `nutrition` | 8 | §10A |
| `system` | 4 | §11 |
| `payments` | 12 | §13 |
| `support` | 5 | §12 |

---

## 4. Schema `identity`

### 4.1 `identity.people`

- **Propósito:** raíz canónica del Fitness ID; el sujeto humano al que todo lo demás refiere.
- **Dominio / fuente de verdad:** Identidad. Es la fuente de verdad de la identidad de dominio.
- **Clasificación:** `identity_pii`.
- **Columnas:** `id` · `given_name text` · `family_name text` · `display_name text` (derivada, para presentación) · `username citext` (nullable; Space lo exige al crear el Fitness ID, Studio no lo pide) · `contact_email citext` (nullable hasta verificar) · `contact_email_verified_at timestamptz` (nullable) · `contact_phone text` (E.164, nullable) · `contact_phone_verified_at timestamptz` (nullable) · `biological_sex identity.biological_sex` (`male`, `female`; **nullable**: no decirlo es una respuesta y se representa como ausencia de valor, nunca como `unknown`) · `status identity.person_status` (`pending_activation`, `active`, `closed`) · `activated_at timestamptz` (**nullable**: se sella en la activación).
- **FKs y borrado:** ninguna saliente. Es la raíz; no referencia a otros dominios.
- **Uniques y checks:** `UNIQUE (username) WHERE username IS NOT NULL` y `CHECK` de formato del handle (3 a 30 caracteres, empieza por letra, después letras, dígitos o `_`); `CHECK` que empareja estado y sello: `pending_activation` exige `activated_at` nulo, cualquier otro estado lo exige presente — el estado y la fecha no pueden discrepar; `UNIQUE (contact_email) WHERE contact_email IS NOT NULL`; `UNIQUE (contact_phone) WHERE contact_phone IS NOT NULL`; `CHECK ((contact_email_verified_at IS NULL) OR (contact_email IS NOT NULL))` y equivalente para teléfono. **El correo de contacto y el correo de ingreso son el mismo dato**: se siembra en `OP-IDN-043` desde lo que el proveedor confirma para ese `sub`, nunca desde lo que manda el cliente, y cambiarlo exige actualizar el usuario en WorkOS y volver a verificar, en el flujo de `OP-IDN-021`. Los uniques son parciales y **nunca** se exponen: una consulta por contacto no existe en ninguna superficie, para preservar que una invitación no revele si el contacto ya tiene cuenta.
- **Actores:** lee la propia persona; escribe solo la función que crea el Fitness ID pendiente (INSERT), la de activación (transición de estado) y el worker de privacidad (anonimización/cierre). Ningún profesional lee esta tabla directamente: usa `identity.v_client_identity`.
- **RLS:** `access_control.is_self(id)` para lectura y update; INSERT bloqueado salvo función de activación.
- **Consultas:** por `id`; join desde casi todos los dominios.
- **Panel de negocio (`HU-BO-004`, `NEW-SUP-DASHBOARD`):** `support.read_business_panel` cuenta las personas registradas (todo estado salvo `closed`) y las que llegaron en los últimos siete días. Solo cuenta: no lee nombre ni contacto, no devuelve identificadores y no escribe `privacy.access_events`. Un conteo de personas menor que `minimum_aggregate` (5, número inventado y declarado) sale `below_threshold` sin valor; un cero verdadero se publica.
- **Índices:** PK. `status` no se indexa (baja cardinalidad).
- **Retención:** el cierre elimina PII —nombre, apellido, correo y teléfono— y deja tombstone técnico sin PII (`OP-SYS-008`); nunca `deleted_at`. El contacto es dato personal bajo la Ley 1581: clasificación `identity_pii`, misma política de disposición que el resto de la identidad.
- **Eventos:** `identity.person_activated.v1`, `identity.contact_changed.v1`, `identity.contact_verified.v1`.
- **Nota de diseño:** la persona **se crea en `pending_activation` en cuanto se conoce su nombre**, no al final del onboarding. Eso es lo que permite que todo lo que se responda después —perfil, objetivo, datos físicos— se escriba directamente sobre ella con `person_id` real, sin ninguna tabla de preparación intermedia ni un segundo camino de escritura. Activar es la transición de estado y el sello de `activated_at`; no mueve datos de sitio.

  La elegibilidad adulta sigue resolviéndose **antes** de crear la fila, que es lo que exigen DT-012 y ADR-017. Lo que cambia respecto a la versión anterior es cuándo se crea, no el orden de los controles.

  El handle es columna de esta tabla y no una relación aparte: al colgar de una persona que existe desde el primer momento, nunca hay una segunda población de handles reservados sin persona, y por tanto nada que pueda entrar en carrera con otra fuente de verdad.

### 4.2 `identity.access_accounts`

- **Propósito:** vínculo entre un usuario externo de WorkOS y una persona de dominio.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii`.
- **Columnas:** `id` · `provider text` (`workos`) · `issuer text` · `subject text` (el `sub`) · `person_id uuid` (nullable hasta activar) · `linked_at timestamptz`.
- **FKs y borrado:** `person_id → identity.people(id) ON DELETE RESTRICT`.
- **Uniques y checks:** `UNIQUE (provider, issuer, subject)`.
- **Actores:** lee la propia cuenta/persona; escribe la función de activación. **Ninguna organización lee esta tabla:** el `sub` no sale de Identidad.
- **RLS:** fila = `app.actor_account_id`, o `person_id = access_control.person()`.
- **Consultas:** por `(provider, issuer, subject)` en cada request; por `person_id`.
- **Índices:** único `(provider, issuer, subject)`; `person_id`.
- **Retención:** se anonimiza/elimina con el cierre de la persona.
- **Eventos:** ninguno propio.

### 4.2.1 `identity.access_sessions`

- **Propósito:** almacenamiento técnico de sesiones opacas de navegador; no representa una persona ni concede acceso de dominio por sí solo.
- **Dominio / fuente de verdad:** Identidad para persistencia y evidencia local; WorkOS gobierna el `sid`, sus tokens y la verificación externa.
- **Clasificación:** `identity_pii` y secreto operativo.
- **Columnas:** `id uuid` UUIDv7 · `access_account_id uuid` · `provider_session_id text` (`sid`) · `surface identity.access_session_surface` (`studio`, `backoffice`) · `token_hash bytea` (SHA-256, 32 bytes) · `token_ciphertext text` (access y refresh tokens cifrados) · `access_token_expires_at timestamptz` · `token_version integer` · `assurance_level smallint` · `authentication_method text` (nullable para compatibilidad Studio) · `assurance_verified_at timestamptz` (nullable) · `last_activity_at timestamptz` (nullable) · `absolute_expires_at timestamptz` (nullable) · `revoked_at timestamptz` (nullable).
- **FKs y borrado:** `access_account_id → identity.access_accounts(id) ON DELETE RESTRICT`.
- **Uniques y checks:** `UNIQUE (surface, provider_session_id)`; `UNIQUE token_hash`; hash de 32 bytes; versión positiva; ciphertext versionado. Toda fila Backoffice exige AAL2, `password_totp`, evidencia, actividad y vencimiento absoluto; Studio conserva AAL1 compatible. La cookie sin hash y los tokens en texto plano están prohibidos.
- **Actores:** ninguna lectura o escritura directa desde runtime. Solo funciones `SECURITY DEFINER` estrechas concedidas a `allfit_api` crean, cargan, rotan por compare-and-swap y revocan.
- **RLS:** habilitada y forzada, sin policies de acceso directo para runtime.
- **Consultas:** por `token_hash + surface`; reemplazo por `surface + provider_session_id`; sesiones activas por cuenta. La carga Backoffice revalida persona, rol, AAL2, quince minutos de inactividad y ocho horas absolutas, y actualiza actividad dentro de la función cerrada.
- **Índices:** uniques anteriores; `(access_account_id)`; parcial `(access_account_id, surface) WHERE revoked_at IS NULL`.
- **Panel de negocio (`HU-BO-004`):** es la única actividad que la plataforma registra. `support.read_business_panel` cuenta personas distintas con una sesión `studio` activa en los últimos siete días, y la etiqueta como profesionales trabajando en Studio. Space no persiste sesiones aquí, así que «personas activas esta semana» no tiene señal y se devuelve `not_modelled` con razón `space_sessions_not_recorded`, nunca cero ni el conteo de Studio en su lugar.
- **Retención:** hasta revocación y purga operativa; cambiar `SESSION_ENCRYPTION_KEY` invalida los ciphertext existentes y fuerza reautenticación.
- **Eventos:** ninguno de dominio.

### 4.2.2 `identity.password_reset_receipts`

- **Propósito:** receipt técnico e idempotente de `password_reset.succeeded`; confirma en una transacción el evento consumido y la revocación de sesiones locales anteriores.
- **Dominio / fuente de verdad:** Identidad para el efecto local; WorkOS conserva la fuente de verdad del cambio de contraseña y sus sesiones alojadas.
- **Clasificación:** metadato operativo de identidad; no almacena payload, firma, email, subject, token ni identificador del reset.
- **Columnas:** `id uuid` UUIDv7 · `provider text` (`workos`) · `issuer text` · `provider_event_id text` · `occurred_at timestamptz` · `access_account_id uuid` (nullable) · `result identity.password_reset_receipt_result` (nullable solo dentro de la transacción) · `revoked_session_count integer` · `received_at timestamptz` · `processed_at timestamptz` (nullable solo mientras se procesa).
- **FKs y borrado:** `access_account_id → identity.access_accounts(id) ON DELETE RESTRICT`; queda nulo si el subject firmado no tiene cuenta local.
- **Uniques y checks:** `UNIQUE (provider, issuer, provider_event_id)`; proveedor cerrado a `workos`; issuer y evento no vacíos; conteo no negativo; resultado y fecha de procesamiento aparecen juntos.
- **Actores:** ninguna lectura ni escritura directa desde runtime. `allfit_api` solo ejecuta `identity.process_password_reset_succeeded`; `PUBLIC` no ejecuta la función. En la misma transacción la función confirma la recuperación en curso de la persona de esa cuenta (`identity.identity_action_requests`, `HU-BO-010`).
- **RLS:** habilitada y forzada, con policy exclusiva de `allfit_owner`.
- **Consultas:** reconocimiento de replay por `(provider, issuer, provider_event_id)`; asociación opcional por `access_account_id`.
- **Índices:** unique anterior; parcial por `access_account_id WHERE access_account_id IS NOT NULL`.
- **Retención:** al menos durante la ventana completa de reintentos del proveedor; cualquier purga posterior requiere una política operativa explícita y no forma parte de HU-STUDIO-003.
- **Eventos:** ninguno de dominio; es evidencia técnica de consumo, no outbox.

### 4.2.3 `identity.access_account_mfa_factors`

- **Propósito:** vínculo local del factor TOTP persistido por cuenta; permite revalidar y revocar sin almacenar el secreto compartido.
- **Dominio / fuente de verdad:** Identidad conserva estado y asociación; WorkOS conserva y verifica el factor.
- **Clasificación:** secreto operativo restringido; `provider_factor_id` nunca sale de funciones cerradas.
- **Columnas:** `id uuid` UUIDv7 · `access_account_id uuid` · `provider text` (`workos`) · `provider_factor_id text` · `factor_kind text` (`totp`) · `status identity.mfa_factor_status` (`pending`, `active`, `revoked`, `superseded`) · `verified_at`, `revoked_at`, `superseded_at` nullable · timestamps.
- **FKs y borrado:** `access_account_id → identity.access_accounts(id) RESTRICT`; sin cascadas.
- **Uniques y checks:** unique `(provider, provider_factor_id)` y unique parcial `(access_account_id, factor_kind) WHERE status IN ('pending','active')`; forma temporal exacta por estado. Una cuenta no tiene dos TOTP actuales.
- **Actores / RLS:** `FORCE RLS`; sin DML o SELECT para `allfit_api`. Sólo funciones cerradas de login, expiración, recuperación y revocación.
- **Consultas / índices:** factor actual por cuenta y estado; limpieza por eventos de outbox.
- **Retención:** el factor activo se conserva tras password reset; revocación/supersesión conserva evidencia hasta la política de seguridad aplicable.
- **Eventos:** solicitudes de limpieza externa sin factor ID en payload público.

### 4.2.4 `identity.backoffice_authentication_attempts`

- **Propósito:** ceremonia temporal entre password correcto y TOTP verificado; nunca constituye una sesión.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** altamente sensible y temporal.
- **Columnas:** `id uuid` · cuenta/factor · `provider_session_id`, `provider_challenge_id` · `attempt_token_hash bytea` · `secret_ciphertext text` nullable · vencimiento del access token · estado (`pending_enrollment`, `pending_challenge`, `completed`, `failed`, `expired`) · `invalid_code_count` 0..5 · `verification_idempotency_key`, `verification_command_id`, `completed_session_id` nullable · `expires_at`, `terminal_at`, timestamps.
- **FKs y borrado:** cuenta, factor y sesión completada usan `RESTRICT`.
- **Uniques y checks:** token, `sid` y challenge únicos; máximo un intento abierto por cuenta; hash de 32 bytes; secreto `v1.*` sólo mientras está abierto; toda fila terminal elimina ciphertext y fija `terminal_at`.
- **Actores / RLS:** `FORCE RLS`; sin acceso directo runtime. Las funciones bloquean cuenta, factor, intento, rol y sesión; la primera transacción confirmada gana frente a revocación.
- **Consultas / índices:** hash de cookie; expiración por `(expires_at,id)`; command binding antes de consumir el challenge externo.
- **Retención:** diez minutos abierta; el worker expira en lotes y elimina secretos. Sólo queda evidencia mínima terminal.
- **Eventos:** limpieza de `sid` y factor pendiente mediante outbox.

### 4.2.5 `identity.mfa_factor_recovery_events`

- **Propósito:** evidencia inmutable de la ceremonia de recuperación por autenticador perdido.
- **Dominio / fuente de verdad:** Identidad/seguridad de plataforma.
- **Clasificación:** `restricted`; la referencia de ceremonia no contiene PII.
- **Columnas:** `id uuid` · `factor_id` · `subject_person_id` · `requested_by_person_id` · `approved_by_person_id` · `reason_code='lost_authenticator'` · `ceremony_reference` · `occurred_at`.
- **FKs y borrado:** factor y tres personas con `RESTRICT`; solicitante, aprobador y sujeto deben ser distintos.
- **Uniques y checks:** razón cerrada, referencia no vacía; fila append-only.
- **Actores / RLS:** sólo `allfit_migrator` mediante workflow protegido; `FORCE RLS`, sin runtime DML.
- **Consultas / índices:** historia por `(factor_id, occurred_at DESC, id DESC)`.
- **Retención:** evidencia durable de seguridad; no se elimina en runtime.
- **Eventos:** la misma transacción solicita revocar sesiones/intentos y eliminar el factor externo.

### 4.2.6 `identity.identity_action_requests`

- **Propósito:** solicitud durable de una acción sobre la identidad que solo la persona confirma (PRE_PHASE_5 §5). El corte físico cubre solo `account_recovery`: la recuperación de acceso que soporte inicia para una persona que no puede entrar (`HU-BO-010`). Los cambios de contacto que la persona inicia desde Space llegarán como nuevos valores de `identity.identity_action_kind`, con las columnas de propuesta que necesiten.
- **Dominio / fuente de verdad:** Identidad para el estado y la autoría; WorkOS conserva el enlace de recuperación, su token y el cambio de contraseña.
- **Clasificación:** `identity_pii` minimizada; no guarda el contacto en claro, el enlace, el token ni un código.
- **Columnas:** `id uuid` (Command-Id del comando que la abrió) · `person_id uuid` · `access_account_id uuid` · `action_kind identity.identity_action_kind` (`account_recovery`) · `status identity.identity_action_status` (`initiated`, `awaiting_verification`, `confirmed`, `expired`, `cancelled`, `failed`) · `initiated_by_kind text` (`support`) · `initiated_by_person_id uuid` · `initiated_by_duty_assignment_id uuid` · `case_reference text` · `delivery_channel text` (`email`) · `contact_fingerprint bytea` (SHA-256 del correo en minúsculas) · `contact_hint text` (enmascarado) · `expires_at timestamptz` · `delivered_at`, `confirmed_at`, `cancelled_at`, `failed_at timestamptz` (nullable) · `failure_code text` (`contact_changed`, `delivery_failed`; nullable) · `created_at` · `updated_at`.
- **FKs y borrado:** `person_id` e `initiated_by_person_id → identity.people(id) RESTRICT`; `access_account_id → identity.access_accounts(id) RESTRICT`; `initiated_by_duty_assignment_id → support.platform_duty_assignments(id) RESTRICT`.
- **Uniques y checks:** único parcial `(person_id, action_kind) WHERE status IN ('initiated','awaiting_verification')`: una sola solicitud en curso por persona y tipo, también para el dueño de la tabla. `ck_identity_action_requests_initiator`: la inicia soporte con asignación de deber y referencia de caso trazable, y nunca sobre su propia persona. `ck_identity_action_requests_lifecycle`: cada fecha terminal aparece exactamente con su estado, `awaiting_verification` y `confirmed` exigen `delivered_at` y `failure_code` existe solo en `failed`. Fingerprint de 32 bytes. `trg_identity_action_requests_transition` rechaza (`55000`) borrar, cambiar sujeto, destino o autoría, mover un estado terminal o volver de `awaiting_verification` a `initiated`.
- **Actores:** Allfit (`A10` con `diagnose_support_metadata`) lee, inicia, reenvía y cancela (`NEW-IDN-ACTION`, `OP-IDN-053..055`). El worker prepara la entrega, la registra con el vencimiento que informa el proveedor o la da por fallida. `identity.process_password_reset_succeeded` la confirma cuando el proveedor informa que la persona cambió su contraseña. Nadie la confirma por la persona.
- **RLS:** `FORCE ROW LEVEL SECURITY` con política única para `allfit_owner`; `allfit_api` sin privilegios de tabla. Entradas cerradas: `read_account_recovery`, `start_account_recovery`, `resend_account_recovery`, `cancel_account_recovery`, `prepare_account_recovery_delivery`, `record_account_recovery_delivery` y `fail_account_recovery_delivery`; cada lectura y cada comando de soporte escribe `privacy.access_events` (`support_metadata`) antes de devolver contenido.
- **Consultas:** las diez más recientes de una persona; la solicitud en curso de una persona; por persona de la cuenta al confirmar.
- **Índices:** PK; único parcial en curso; `(person_id, created_at DESC, id DESC)`; `(access_account_id)`.
- **Retención:** evidencia de soporte; sigue la disposición de la identidad de la persona.
- **Eventos:** `identity.account_recovery_requested.v1`, con solo `request_id` en el payload, al iniciar y al reenviar.
- **Divergencias con PRE_PHASE_5 §5:** no guarda `provider_challenge_ref`, porque el identificador del reset de WorkOS devuelve el token por la API y es, por tanto, un camino al secreto. `person_id` no es nullable: la recuperación de soporte siempre parte de una persona resuelta. `idempotency_command_id` es el propio `id`.

### 4.2.7 `identity.identity_action_events`

- **Propósito:** historial append-only de cada transición y cada pedido de envío de una solicitud de identidad (`HU-BO-010`, criterio 12).
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `operational`; sin contacto, enlace, token ni código.
- **Columnas:** `id uuid` · `request_id uuid` · `event_type text` (`initiated`, `delivery_requested`, `delivered`, `confirmed`, `expired`, `cancelled`, `failed`) · `actor_kind text` (`support`, `worker`, `person`, `system`) · `actor_person_id uuid` (nullable) · `actor_duty_assignment_id uuid` (nullable) · `case_reference text` (nullable) · `delivery_channel text` (`email`; nullable) · `result_code text` (nullable) · `occurred_at timestamptz`.
- **FKs y borrado:** `request_id → identity.identity_action_requests(id) RESTRICT`; `actor_person_id → identity.people(id) RESTRICT`; `actor_duty_assignment_id → support.platform_duty_assignments(id) RESTRICT`.
- **Uniques y checks:** `ck_identity_action_events_actor`: soporte inicia, pide reenvío y cancela con persona, deber y caso; el worker entrega o falla; la persona confirma; el sistema vence. `ck_identity_action_events_channel` y `ck_identity_action_events_result` cierran el canal y el código de falla. `trg_identity_action_events_append_only` rechaza (`55000`) toda actualización o borrado, también para el dueño.
- **Actores:** escriben solo las funciones de la solicitud. El límite de tres correos de recuperación por persona en 24 horas se cuenta sobre `initiated` y `delivery_requested`.
- **RLS:** igual que la solicitud.
- **Consultas / índices:** por `(request_id, occurred_at, id)`.
- **Retención:** con la solicitud.
- **Eventos:** ninguno propio.

### 4.3 `identity.onboarding_attempts`

- **Propósito:** flujo previo a activar una persona; puede terminar sin crearla.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii`.
- **Columnas:** `id` · `account_id uuid` · `person_id uuid` (nullable hasta crear el Fitness ID pendiente) · `status identity.onboarding_status` · `invitation_token_hash text` (nullable, SHA-256 en hexadecimal) · `terms_version text` (nullable) · `terms_accepted_at timestamptz` (nullable) · `privacy_notice_version text` (nullable) · `privacy_notice_accepted_at timestamptz` (nullable) · `expires_at timestamptz`.
- **FKs y borrado:** `account_id → access_accounts(id) RESTRICT`; `person_id → people(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE parcial (account_id) WHERE status='open'` (un intento abierto por cuenta).
- **Actores:** la propia cuenta lee; los cambios ocurren mediante funciones gobernadas; worker de privacidad dispone. Asociar el hash de una invitación conserva continuidad de navegación y nunca acepta la intención.
- **RLS:** `account_id = app.actor_account_id`.
- **Consultas:** por `account_id` y estado abierto.
- **Índices:** parcial de intento abierto por cuenta.
- **Retención:** intentos no activados se purgan; los datos de elegibilidad se minimizan.
- **Eventos:** `identity.onboarding_attempt_started.v1`, `identity.person_created_pending.v1`.
- **Nota de diseño:** el intento guarda **lo que es del intento**: la cuenta, el estado, la invitación de referencia y las aceptaciones legales versionadas. Ningún dato de la persona vive aquí. `person_id` se llena en cuanto se crea el Fitness ID pendiente, así que desde ese momento el intento y la persona están relacionados y todo lo demás del onboarding escribe sobre ella. Por eso esta tabla **no crece cuando cambia el onboarding**: añadir o quitar preguntas de perfil no la toca.

### 4.3.1 `identity.onboarding_step_skips`

- **Propósito:** registrar que una persona **saltó** un paso del onboarding, para que no se le vuelva a preguntar.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `operational`.
- **Columnas:** `onboarding_attempt_id uuid` · `step_code text` · `skipped_at timestamptz`.
- **FKs y borrado:** `onboarding_attempt_id → onboarding_attempts(id) ON DELETE CASCADE`. El salto no sobrevive al intento que lo produjo.
- **Uniques y checks:** PK compuesta `(onboarding_attempt_id, step_code)`, que hace el salto idempotente por construcción: saltar dos veces no escribe dos filas.
- **Actores:** la propia cuenta, mediante función gobernada.
- **RLS:** por el intento, `account_id = app.actor_account_id`.
- **Consultas / índices:** por intento; la PK basta.
- **Retención:** se purga con el intento.
- **Eventos:** ninguno.
- **Nota de diseño:** `HU-SP-015` permite saltar cualquier paso que no sea edad, nombre y términos, y `HU-SP-011` es el primero que lo ejerce. Una columna por paso en `onboarding_attempts` —como la que tiene el sexo— habría reproducido el problema que ya obligó a convertir la lectura del onboarding en un solo objeto `answers`: cada paso nuevo cambia la tabla. Aquí el paso es **un valor**, no una columna, así que la tabla no crece cuando crece el onboarding, lo mismo que promete la nota de §4.3. Un array de códigos habría sido la otra tentación, y la norma lo prohíbe: los conjuntos son tablas explícitas.
- **Lo que un salto NO es:** declinar. El sexo biológico se declina y eso deja el sello en el intento con valor ausente, porque declinar **es** una respuesta a esa pregunta. Saltar es no responderla. Coinciden en que el paso deja de pedirse y se distinguen en que el salto no afirma nada sobre la persona.

### 4.4 `identity.eligibility_evidence`

- **Propósito:** aplicación versionada de la política de mayoría de edad, congelada en la evidencia.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii` (declaración explícita de mayoría de edad y snapshot versionado de la política; no incluye fecha de nacimiento).
- **Columnas:** `id` · `onboarding_attempt_id uuid` · `result identity.eligibility_result` · `policy_version integer` · `policy_snapshot_schema_version smallint` (`1`) · `policy_snapshot jsonb` · `evaluated_at timestamptz`.
- **FKs y borrado:** `onboarding_attempt_id → onboarding_attempts(id) ON DELETE CASCADE`.
- **Uniques y checks:** `CHECK (result in ('pass','fail','review_required','unknown'))`.
- **Actores:** la propia cuenta; append-only. **Ninguna organización.**
- **RLS:** hereda del intento (`account_id`).
- **Consultas:** por `onboarding_attempt_id`; última evidencia `pass`.
- **Índices:** `(onboarding_attempt_id, evaluated_at desc)`.
- **Retención:** se conserva el resultado y el snapshot versionado necesarios para trazabilidad; esta política no recopila fecha de nacimiento.
- **Eventos:** `identity.eligibility_evaluated.v1`.

### 4.5 `identity.profile_attributes`

- **Propósito:** catálogo cerrado de los atributos de perfil fitness declarables en V1.
- **Dominio / fuente de verdad:** Identidad (catálogo de referencia).
- **Miembros V1.** Se declaran cuando se construye la pantalla que los escribe, no antes: dar de alta un atributo es un `insert` en este catálogo, no un cambio de esquema, y enumerar códigos sin la pantalla que los usa inventa vocabulario que después no calza.
  - `primary_training_goal` — `value_kind` enum, sin unidad, clasificación `training`. Valores: `lose_weight`, `build_muscle`, `get_fit`, `improve_performance`, `run_a_race`, `maintain`, que son los seis del criterio 1 de `HU-SP-010`. Clasificado `training` porque el profesional programa contra él: sin verlo no puede ajustar volumen ni intensidad.
    - **`improve_performance` queda fuera del lanzamiento inicial de V1**, decidido el 23 de agosto de 2026. Permanece en el catálogo porque va a entrar más adelante y borrarlo obligaría a reponerlo, pero **el contrato de API declara solo los otros cinco** y rechaza este con `400`. Que no esté en V1 tiene que ser una garantía verificable, no una omisión de la pantalla.
  - `focus_areas` — `value_kind` enum, sin unidad, clasificación `training`. Valores: `chest`, `back`, `shoulders`, `arms`, `abs`, `glutes`, `legs` y `whole_body`, que son las siete zonas del criterio 1 de `HU-SP-097` más la forma de decir «sin énfasis». Clasificado `training` por la misma razón que el objetivo: el profesional reparte volumen contra él.
    - **Es el primer atributo multivaluado del catálogo.** Una persona tiene **varias afirmaciones vigentes** de este atributo a la vez, una por zona, y se declaran como conjunto con `OP-IDN-046`. `OP-IDN-004` no sirve para escribirlo: supersede la anterior del mismo atributo, así que tres zonas dejarían una. Ver el índice único parcial de §4.6.
    - **`whole_body` es un miembro del catálogo, no la ausencia del dato.** Sin él, «no quiero énfasis» y «no contesté» serían ambos cero filas e indistinguibles, y el resumen del onboarding necesita separarlos para saber si el paso está respondido. Es el mismo recurso que `multiple` para `HU-SP-013`. Es **excluyente** con las siete zonas: llega solo o no llega.
  - `training_experience` — `value_kind` enum, sin unidad, clasificación `training`. Valores: `starting`, `some_practice`, `experienced`, que son los tres términos simples del criterio 2 de `HU-SP-012`. Singular y excluyente: se escribe con `OP-IDN-004`, y recalificarse crea otra afirmación con `superseded_by_id` en lugar de editar, así que queda registrado con qué nivel se inscribió la persona.
    - **Es un nivel global, no uno por disciplina.** El criterio 2 decía «en cada una» y se enmendó el 24 de agosto de 2026: `catalog.disciplines` no es legible por el rol de runtime y solo tiene filas de prueba, así que no hay lista sobre la que colgar un nivel por disciplina. Si esa lista llega a existir, el nivel por disciplina es un atributo **nuevo** —miembro con valor propio, no conjunto—, no una ampliación de este.
    - **Nada de `beginner`, `intermediate`, `advanced`.** La historia pide términos simples, y el motivo es de producto: «avanzado» hace que la gente se subestime y elija por debajo de su nivel, con lo que el plan aburre. El orden lo comunica la pantalla, no el vocabulario.
- **Fuera del catálogo:** el **sexo biológico** vive como columna de `identity.people`, no como atributo declarable. Decidido el 23 de agosto de 2026: es un hecho singular y estable, y el diseño de este catálogo —procedencias que coexisten, vigencias, `superseded_by_id`— existe para datos que cambian y que varias fuentes observan. Ver §4.1.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` · `name text` · `data_classification_code text` · `value_kind text` (numérico, texto, enum) · `unit_dimension text` (nullable) · `allowed_values text[]` (nullable).
- **FKs y borrado:** `data_classification_code → privacy.data_classifications(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE code`. `allowed_values` es obligatorio y de al menos dos miembros cuando `value_kind` es enum, y nulo en cualquier otro caso; `unit_dimension` solo se acepta cuando el valor es numérico. Los miembros del enum viven aquí y no en la aplicación, para que la validación ocurra en la misma transacción que la escritura.
- **Actores:** lectura autenticada; escritura plataforma.
- **RLS:** lectura abierta a autenticados.
- **Consultas:** por `code`.
- **Índices:** único `code`.
- **Retención:** permanente (catálogo).
- **Eventos:** ninguno.

### 4.6 `identity.fitness_profile_claims`

- **Propósito:** afirmación tipada de un atributo de perfil, con procedencia; varias coexisten.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** hereda del atributo (`training`, `body` o `health`).
- **Columnas:** `id uuid` (**Command-Id UUIDv7 del dispositivo para `OP-IDN-004`**; en `OP-IDN-046` el comando escribe varias filas, así que cada una lleva un UUIDv7 propio generado en la base y la identidad del comando la sostiene el receipt de idempotencia) · `person_id uuid` · `attribute_code text` · `value_numeric numeric` (nullable) · `value_text text` (nullable) · `unit_code text` (nullable) · `provenance identity.provenance` · `captured_by_kind identity.actor_kind` · `captured_by_assignment_id uuid` (nullable) · `valid_from timestamptz` · `valid_to timestamptz` (nullable) · `superseded_by_id uuid` (nullable).
- **FKs y borrado:** `person_id → people(id) RESTRICT`; `attribute_code → profile_attributes(code) RESTRICT`; `unit_code → catalog.units(code) RESTRICT`; FK compuesta opcional `(captured_by_assignment_id, person_id) → relationships.relationship_professional_assignments(id, person_id) RESTRICT` (`IX-04`).
- **Uniques y checks:** `CHECK (value_numeric is not null or value_text is not null)`. Sin unique de "una por atributo": coexisten por procedencia, y en un atributo multivaluado coexisten además **por valor**. `UPDATE` revocado (append-only + `revision_events`).
  - Único parcial `(person_id, value_text) WHERE attribute_code = 'focus_areas' AND valid_to IS NULL AND provenance = 'person_declared'`: en un atributo multivaluado la fila **es** el miembro del conjunto, así que la misma zona dos veces vigente es un estado corrupto y lo impide la base, no el comando. Es el patrón de `organizations.membership_roles`.
  - **Va acotado al atributo a propósito.** Generalizarlo a todo `attribute_code` rompería `OP-IDN-004`, que **inserta antes de sellar**: la fila nueva y la anterior conviven un instante con el mismo valor, y redeclarar el objetivo vigente chocaría. Generalizarlo exige invertir ese orden, y es un cambio aparte.
- **Actores:** la persona (declara, procedencia `person_declared`); el profesional con `contribute` (observación); worker de privacidad dispone.
- **RLS:** `access_control.is_self(person_id)` **OR** `access_control.can_access(person_id,'relationship_training','read')`; proyección `identity.v_client_profile` aplica field-set.
- **Consultas:** `(person_id, attribute_code, valid_from desc)`.
- **Índices:** `(person_id, attribute_code, valid_from desc)`; único parcial de miembro vigente para `focus_areas`, descrito arriba.
- **Retención:** por categoría de disposición; anonimización rompe el enlace a `person_id`.
- **Eventos:** `identity.profile_claim_declared.v1`, `identity.profile_claim_revised.v1`.
- **As implemented (STUDIO-44, migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`).** The professional read is the closed function `identity.read_client_training_profile`, not a view: `identity.v_client_profile` does not exist. It serves the live claims of the attributes classified `training`, each field only when the grant's frozen version names it. The row policy for the definer stays `fitness_profile_claims_all_owner`; the function is the gate (see the RLS matrix).

### 4.7 `identity.body_progress_records`

- **Propósito:** medición, composición o foto corporal elegida por la persona.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `body`.
- **Columnas:** `id uuid` (**Command-Id UUIDv7 del dispositivo para `OP-IDN-006`**) · `person_id uuid` · `metric_code text` · `value_numeric numeric(12,3)` (en la unidad canónica de su dimensión) · `unit_code text` · `original_value numeric(12,3)` (nullable) · `original_unit_code text` (nullable) · `measured_on date` · `media_ref text` (nullable, sin EXIF) · `has_media boolean` · `created_at timestamptz`.
- **FKs y borrado:** `person_id → people(id) RESTRICT`; `metric_code → body_progress_metrics(code) RESTRICT`; `unit_code` y `original_unit_code → catalog.units(code) RESTRICT`.
- **Uniques y checks:** `CHECK (has_media = (media_ref is not null))`; `value_numeric > 0`; el valor original y su unidad van juntos o no van, y el original es positivo.
- **Miembros de `metric_code`:** los que `identity.body_progress_metrics` tenga publicados; la FK sustituyó al `CHECK` cerrado que los enumeraba, así que añadir uno ya no cuesta una migración de restricción sino una fila. El prefijo `body_` no es adorno: `metric_code` existe también en los resultados de ejecución y en los derivados, donde `weight` es la carga levantada y no el peso de la persona.
- **Canónico y original:** `value_numeric`/`unit_code` guardan **siempre** la unidad canónica de la dimensión, y `original_value`/`original_unit_code` lo que la persona vio. La conversión la hace la función con `catalog.units.to_canonical_factor` y nunca el cliente: el factor tiene una sola fuente de verdad, y guardar solo lo mostrado hace que 74 kg → 163 lb → 73,9 kg y el peso se mueva solo al cambiar de unidad y volver.
- **Implementado (`HU-SP-025`, `HU-SP-026`, `HU-SP-027`, `HU-BO-009`):** el trigger `identity.body_progress_record_guard_tg` rechaza cualquier `UPDATE` (una medición se conserva o se borra, nunca se reescribe) y exige que `unit_code` sea la unidad canónica de la dimensión de la medida y que `original_unit_code` mida lo mismo. El tope por medida vive en `body_progress_metrics` y lo aplica `identity.record_body_progress`. **Fotos todavía no:** ningún comando escribe `media_ref`, así que ningún registro dice tener una; el despojo de metadatos en el servidor es su propia pieza. La tabla tiene RLS forzado y el runtime no tiene privilegios sobre ella: la persona entra sólo por `identity.record_body_progress`, `identity.list_body_progress` e `identity.delete_body_progress`, que resuelven el sujeto del token a la persona dentro de la transacción (`identity.require_space_person`), y soporte sólo por `support.exercise_break_glass`. La lectura profesional por `body_progress` llega con `relationships`.
- **Actores:** la persona (lee, escribe, borra); el profesional con `body_progress` **read**; worker de privacidad.
- **RLS:** `access_control.is_self(person_id)` **OR** `access_control.can_access(person_id,'body_progress','read')`. `relationship_training` **no** alcanza; Studio usa `identity.v_client_body_progress`.
- **Consultas:** `(person_id, measured_on desc)`.
- **Índices:** `(person_id, measured_on desc)`.
- **Retención:** categoría `body`; borrado propio abre `disposition_case` unitario; imágenes con borrado propagado.
- **Eventos:** `identity.body_progress_recorded.v1`, cuyo payload lleva sólo `body_progress_record_id`: ni el valor ni la unidad salen al outbox.
- **As implemented (STUDIO-45).** The professional read is `identity.list_client_body_progress`; `identity.v_client_body_progress` does not exist. Photos are not rows of this table: they live in `identity.body_photos` (TECH-31, no entry here yet) and reach a gym only through `identity.body_photo_shares`.

### 4.7.2 `identity.body_photo_shares`

- **Purpose:** which of her body photos she shows to which relationship (HU-SP-025 criterion 4).
- **Domain / source of truth:** Identity.
- **Classification:** `body`.
- **Columns:** `id uuid` (UUIDv7) · `person_id uuid` · `body_photo_id uuid` · `relationship_id uuid` · `status text` (`shared`, `withdrawn`) · `shared_at timestamptz` · `withdrawn_at timestamptz` (nullable).
- **FKs and deletion:** `(body_photo_id, person_id) → identity.body_photos(id, person_id) ON DELETE CASCADE`, so deleting the photo takes its shares; `(relationship_id, person_id) → relationships.service_relationships(id, person_id) RESTRICT`. The first needs the new `uq_body_photos_person UNIQUE (id, person_id)` on `identity.body_photos`.
- **Uniques and checks:** `uq_body_photo_shares_pair (body_photo_id, relationship_id)`: one row per pair, reactivated rather than duplicated; `ck_body_photo_shares_status`; `ck_body_photo_shares_withdrawn`: `withdrawn_at` is set exactly when the share is `withdrawn`.
- **Actors:** the person, through `identity.share_body_photo` and `identity.withdraw_body_photo_share`; no professional reads a share.
- **RLS:** forced. `body_photo_shares_all_self` (`is_self`), and `body_photo_shares_select_review` inside the contract scope `body_photo_review` only, so the photo policy can see them. `allfit_api` has no privilege on the table.
- **Indexes:** `idx_body_photo_shares_relationship (relationship_id, status)`, `idx_body_photo_shares_person (person_id)`.
- **Retention:** with the photo.
- **Events:** `identity.body_photo_shared.v1`, `identity.body_photo_share_withdrawn.v1`, each only when the state changes.
- **As implemented (STUDIO-45, migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`).**

### 4.7.1 `identity.body_progress_metrics`

- **Propósito:** las medidas corporales que Space acepta, con su dimensión y un tope que rechaza errores de tipeo, no cuerpos inusuales.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `operational`.
- **Columnas:** `code text` (PK) · `name text` · `dimension text` (`mass`, `length`, `ratio`) · `maximum_value numeric` (en la unidad canónica) · `created_at timestamptz`.
- **FKs y borrado:** ninguna saliente; `body_progress_records.metric_code` la referencia con `RESTRICT`.
- **Uniques y checks:** código `^[a-z][a-z0-9_]{1,31}$`; nombre no vacío de hasta 60 caracteres; tope positivo.
- **Contenido V1:** `weight` (700 kg), `muscle_mass` (400 kg), `body_fat` (100 %), `waist`, `hip` y `chest` (5 m), `arm` y `thigh` (3 m). Cambia sólo por migración.
- **Actores / RLS:** RLS forzado y sin privilegios de runtime; las funciones de progreso corporal la leen.
- **Retención:** permanente; una medida referenciada no se elimina.
- **Eventos:** ninguno.

### 4.8 `identity.health_context_claims`

- **Propósito:** dolor, limitación o recuperación declarados; salud fitness minimizada.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `health` (la más restrictiva).
- **Columnas:** `id uuid` (**Command-Id UUIDv7 del dispositivo para `OP-IDN-008`**) · `person_id uuid` · `context_type text` (`pain`, `limitation`, `recovery`) · `description text` · `body_area text` (nullable) · `provenance identity.provenance` · `valid_from timestamptz` · `valid_to timestamptz` (nullable).
- **FKs y borrado:** `person_id → people(id) RESTRICT`.
- **Uniques y checks:** `CHECK (context_type in ('pain','limitation','recovery'))`.
- **Actores:** la persona; el profesional con `health_context`; worker de privacidad.
- **RLS:** `access_control.is_self(person_id)` **OR** `access_control.can_access(person_id,'health_context','read')`; Studio usa `identity.v_client_health_context`.
- **Consultas:** `(person_id, valid_from desc)`.
- **Índices:** `(person_id, valid_from desc)`.
- **Retención:** categoría `health`; disposición por su política.
- **Eventos:** `identity.health_context_declared.v1`, cuyo payload lleva sólo `health_context_claim_id`: lo declarado nunca sale al outbox.
- **Implementado (`HU-SP-014`, `HU-SP-028`, `HU-BO-009`):** suma `created_at timestamptz`. `description` no queda vacía y tiene como máximo 500 caracteres (la función la guarda sin espacios alrededor); `body_area` es nula o una de catorce zonas (`neck`, `shoulder`, `upper_back`, `lower_back`, `chest`, `abdomen`, `arm`, `elbow`, `wrist_hand`, `hip`, `thigh`, `knee`, `lower_leg`, `ankle_foot`); `valid_to`, si existe, es posterior a `valid_from`. No hay columna para un diagnóstico, un examen ni un documento. `identity.provenance` se crea aquí con las cinco procedencias del glosario, y Space sólo escribe `person_declared`. `identity.health_context_claim_guard_tg` rechaza cualquier `UPDATE`: una declaración se conserva o se borra, y una posterior dice qué cambió. Índice `(person_id, valid_from desc, id desc)`, que es también el orden del cursor. La tabla tiene RLS forzado y el runtime no tiene privilegios sobre ella: la persona entra sólo por `identity.record_health_context`, `identity.list_health_context` e `identity.delete_health_context`, y soporte sólo por `support.exercise_break_glass`. La lectura profesional por `health_context` llega con `relationships`.
- **As implemented (STUDIO-46, migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`).** The professional read is `identity.list_client_health_context`, ordered like her own list; `identity.v_client_health_context` does not exist. The V1 rules add `provenance` to the fields `health_context` shares.

### 4.9 `identity.professional_profiles`

- **Propósito:** presentación profesional; pertenece a la persona y sobrevive al cambio de organización.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii` (no fitness).
- **Columnas:** `id uuid` · `person_id uuid` · `headline text` · `bio text` · `practice_started_year smallint` · `created_at timestamptz` · `updated_at timestamptz`.
- **FKs y borrado:** `person_id → people(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE person_id`; `headline` normalizado y no vacío, máximo 120 caracteres; `bio` máximo 2.000; `practice_started_year` entre 1900 y 2100, y `OP-IDN-010` rechaza años posteriores al actual.
- **Actores:** la persona crea y actualiza; integrantes de una organización compartida consumen una proyección cerrada de solo lectura.
- **RLS:** escritura solo con `access_control.is_self(person_id)`; lectura directa propia. La lectura organizacional ocurre mediante una proyección que exige membresía vigente compartida en `access_control.org()`.
- **Consultas:** por `person_id`; por miembros de organización.
- **Índices:** único `person_id`.
- **Retención:** con la persona.
- **Eventos:** `identity.professional_profile_updated.v1`.

### 4.10 `identity.professional_profile_specialties`

- **Propósito:** especialidades gobernadas que la persona declara para su perfil profesional.
- **Dominio / fuente de verdad:** Identidad para la declaración; Catálogo para el significado del código.
- **Clasificación:** `identity_pii` (no fitness sensible).
- **Columnas:** `professional_profile_id uuid` · `specialty_code text` · `declared_at timestamptz`.
- **FKs y borrado:** `professional_profile_id → professional_profiles(id) ON DELETE CASCADE`; `specialty_code → catalog.professional_specialties(code) RESTRICT`.
- **Uniques y checks:** `PRIMARY KEY (professional_profile_id, specialty_code)`; `OP-IDN-010` solo acepta códigos publicados y exige al menos uno para completar el perfil.
- **Actores y RLS:** hereda ownership y proyección de `professional_profiles`; una organización nunca escribe la relación.
- **Consultas / índices:** PK anterior; índice inverso `(specialty_code, professional_profile_id)`.
- **Retención:** con el perfil.
- **Eventos:** incluidos en `identity.professional_profile_updated.v1`.

### 4.11 `identity.professional_credentials`

- **Propósito:** credencial profesional declarada con identidad estable; no implica verificación.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii`.
- **Columnas:** `id uuid` · `professional_profile_id uuid` · `credential_type_code text` · `issuer text` · `name text` · `identifier text` (nullable) · `issued_on date` (nullable) · `expires_on date` (nullable) · `verification_url text` (nullable) · `status text` (`active`, `retired`) · `supersedes_credential_id uuid` (nullable) · `created_at timestamptz` · `retired_at timestamptz` (nullable).
- **FKs y borrado:** `professional_profile_id → professional_profiles(id) RESTRICT`; `credential_type_code → catalog.professional_credential_types(code) RESTRICT`; `supersedes_credential_id → professional_credentials(id) RESTRICT`.
- **Uniques y checks:** fechas coherentes; URL HTTPS; retiro consistente con `retired_at`; una revisión debe pertenecer al mismo perfil y no puede formar ciclos. Los campos materiales son inmutables: corregir crea otra fila y retira la anterior.
- **Actores:** la persona declara, revisa o retira mediante funciones cerradas. Organizaciones y verificadores no modifican la declaración.
- **RLS:** lectura y comandos propios; consumidores organizacionales solo reciben la proyección permitida. Sin `DELETE` ni `UPDATE` material desde runtime.
- **Consultas / índices:** `(professional_profile_id, status)`; `(supersedes_credential_id)`.
- **Retención:** con la persona y las verificaciones asociadas.
- **Eventos:** `identity.professional_credential_declared.v1`, `identity.professional_credential_revised.v1`, `identity.professional_credential_retired.v1`.
- **Implementado (`HU-BO-021`):** declarar una credencial abre una solicitud de verificación pendiente para esa versión exacta (`trg_professional_credentials_open_verification_request`) y retirarla cancela la pendiente (`trg_professional_credentials_withdraw_verification_request`). Revisar es crear una versión nueva y retirar la anterior, así que el criterio 7 —una revisión abre su propia revisión y la verificación anterior queda intacta— sale de esos dos triggers en vez de ser una tercera regla. Nadie tiene que acordarse de pedir la verificación.

### 4.12 `identity.professional_credential_verifications`

- **Propósito:** verificación de **una versión exacta** de credencial profesional; no marca otras credenciales ni el perfil completo.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii`; la evidencia interna permanece restringida.
- **Columnas:** `id uuid` · `professional_credential_id uuid` · `verifier_person_id uuid` · `policy_code text` · `method text` (`official_registry_lookup`, `issuer_confirmation`) · `source_authority text` · `source_jurisdiction text` · `source_reference text` · `source_status text` · `source_checked_at timestamptz` · `source_valid_to timestamptz` (nullable) · `evidence_fingerprint bytea` · `result text` (`verified`, `rejected`, `unverifiable`, `revoked`) · `decided_at timestamptz` · `valid_from timestamptz` (nullable) · `valid_to timestamptz` (nullable) · `supersedes_verification_id uuid` (nullable) · `revoked_at timestamptz` (nullable).
- **FKs y borrado:** `professional_credential_id → professional_credentials(id) RESTRICT`; `verifier_person_id → people(id) RESTRICT`; `supersedes_verification_id → professional_credential_verifications(id) RESTRICT`.
- **Uniques y checks:** `valid_to` obligatorio cuando `result='verified'`; nunca supera `decided_at + interval '12 months'` ni `source_valid_to` cuando la fuente publica vencimiento; `source_checked_at <= decided_at`; una función cerrada valida credencial, fuente/método, AAL2, deber vigente y conflictos antes de insertar. Append-only.
- **Actores:** solo `A11/verify_professional_credentials` escribe. La persona y consumidores autorizados reciben estado, vigencia y tipo mediante proyecciones; nunca fingerprint ni referencia interna.
- **RLS:** sin DML directo de runtime. Lectura de estado mediante funciones o proyecciones cerradas; la evidencia interna queda restringida a su finalidad.
- **Consultas / índices:** `(professional_credential_id, decided_at desc)`; verificaciones vigentes por credencial.
- **Retención:** con la credencial verificada.
- **Eventos:** `identity.professional_credential_verified.v1`, `identity.professional_credential_verification_revoked.v1`.
- **Gobernanza:** ADR-026 y `T-VG-01..06`; solo credenciales profesionales y evidencia minimizada.
- **Implementado (`HU-BO-021`):** `identity.decide_credential_verification` es `OP-IDN-011`. Añade `request_id` nullable con FK portadora `(request_id, professional_credential_id) → credential_verification_requests(id, professional_credential_id)`, y un único resultado por solicitud. Las decisiones anteriores a la cola conservan `request_id` nulo.
  - **No hay resultado por defecto**: sin resultado la función responde `22023`. La política se deriva del método (`official_registry_lookup` ⇒ `professional_credential.registry.v1`, `issuer_confirmation` ⇒ `professional_credential.issuer.v1`) y no se acepta del cliente.
  - **La vigencia se deriva, nunca se acepta**: la menor entre `decided_at + 12 meses`, `source_valid_to` y `expires_on` de la credencial. Una fuente que informa la credencial vencida no puede producir `verified`. El `CHECK` de la tabla sigue siendo una tercera defensa: al quitar la derivación en una prueba deliberada, fue el `CHECK` quien detuvo la inserción.
  - `evidence_fingerprint` lo calcula la base como `sha256` de política, método, fuente, referencia, estado y `source_checked_at`. Ninguna proyección devuelve la huella ni `source_reference`.
  - **Append-only real**: `identity.reject_credential_verification_rewrite` rechaza `UPDATE` y `DELETE` con `55000`, también para el dueño de la tabla. Renovar, revocar y apelar crean otra fila.
  - **Conflictos (ADR-026 §2.4) comprobados contra los datos**: `identity.credential_verification_conflict` devuelve `verifier_is_holder` o `shared_active_membership`. Haber declarado o revisado es la misma persona que el titular en V1. **Pendientes**: la relación o asignación profesional efectiva no se puede comprobar porque `relationships` no existe —lo que también implica que hoy no puede existir ninguna—, y las apelaciones no están construidas. Cuando lleguen, su comprobación va en esa función.
  - La autoridad la resuelve `identity.require_credential_verifier`: rol base más `verify_professional_credentials`. `curate_global_catalog` no la sustituye, y `T-IDN-VERIFY-01` lo asserta.
- **Evento emitido:** `identity.professional_credential_verified.v1` sólo cuando el resultado es `verified`. Un `rejected` o `unverifiable` queda en la fila sin evento propio; la persona lo ve por la proyección de la credencial.

### 4.12.1 `identity.credential_verification_requests`

- **Propósito:** cola de trabajo de verificación: una solicitud por versión exacta de credencial. Cierra la brecha técnica de `HU-BO-021` que PRE_PHASE_5 §6 dejaba como `NEW-IDN-VERIFY-REQUEST`.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii` (enlaza a la persona y a su credencial).
- **Columnas:** `id uuid` · `professional_credential_id uuid` · `requested_by_person_id uuid` · `kind text` (`initial`, `renewal`) · `status text` (`pending`, `resolved`, `cancelled`) · `supersedes_request_id uuid` (nullable) · `created_at timestamptz` · `resolved_at timestamptz` (nullable) · `cancelled_at timestamptz` (nullable).
- **Divergencia con PRE_PHASE_5 §6.2, deliberada:** el boceto incluía `verified`, `rejected`, `unverifiable`, `expired`, `appealed` e `in_review` entre los estados de la solicitud. Eso guardaría el resultado dos veces —aquí y en la verificación— y dos copias se desincronizan. **La solicitud no lleva resultado**: sólo `pending`, `resolved` o `cancelled`, y lo decidido vive únicamente en `professional_credential_verifications`. Tampoco se modelaron verificador asignado, `due_at` ni `in_review`: ningún criterio los exige y la concurrencia la resuelve el bloqueo de la fila al decidir.
- **FKs y borrado:** credencial, solicitante y `supersedes_request_id` con `RESTRICT`. Clave portadora `UNIQUE (id, professional_credential_id)` para la verificación.
- **Uniques y checks:** forma exacta de timestamps por estado; `UNIQUE (professional_credential_id) WHERE status = 'pending'` (una revisión vigente por versión, §6.3); sin auto-referencia. `identity.guard_credential_verification_request_transition` impide salir de un estado terminal o reescribir campos. **El borrado no se guarda**: el runtime no tiene DML sobre la tabla, y una solicitud decidida no puede borrarse porque su verificación la referencia.
- **Actores:** los triggers de `professional_credentials` abren y cancelan; `A11/verify_professional_credentials` lee, decide y abre renovaciones mediante funciones cerradas.
- **RLS:** sin DML de runtime; `force row level security` y política sólo para el dueño.
- **Consultas:** `identity.list_credential_verification_requests` (cola pendiente; `viewer_can_decide` es pista para la pantalla, nunca autoridad) · `identity.list_due_credential_renewals` · `identity.open_credential_verification_renewal`. Las dos lecturas **escriben un `privacy.access_events` por titular devuelto** antes de devolverlo, porque muestran nombre, número de registro y dónde consultarlo.
- **Renovación (criterio 4):** nadie corre en el instante en que una verificación vence, así que vencer no puede abrir una solicitud. La lista de renovaciones se calcula —credenciales activas cuya última verificación es `verified` y termina en menos de **30 días**— y un verificador abre la renovación, que es una solicitud nueva enlazada a la anterior y nunca extiende la verificación vieja. **Los 30 días son un número inventado**: ninguna fuente normativa fija esa ventana.
- **Índices:** único parcial de pendientes; `(status, created_at, id)`.
- **Retención:** con la credencial.
- **Eventos:** ninguno propio; el evento es el de la verificación.

### 4.13 `identity.invitations`

- **Propósito:** sobre temporal de entrega y seguridad; no crea persona provisional.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `identity_pii` (contacto del invitado).
- **Columnas:** `id` · `organization_id uuid` · `issued_by_membership_id uuid` (nullable) · `issued_by_person_id uuid` (nullable) · `issued_by_duty_assignment_id uuid` (nullable) · `reissues_invitation_id uuid` (nullable) · `channel text` (`email`) · `contact citext` · `token_hash bytea` · `token_key_version smallint` · `proposal_hash bytea` · `responsible_party_schema_version smallint` (`1`) · `responsible_party jsonb` · `status identity.invitation_status` (`pending`, `completed`, `revoked`, `expired`) · `expires_at timestamptz` · `created_at` · `updated_at`.
- **FKs y borrado:** `(issued_by_membership_id, organization_id) → organizations.organization_memberships(id, organization_id) RESTRICT`; `issued_by_person_id → identity.people(id) RESTRICT`; `issued_by_duty_assignment_id → support.platform_duty_assignments(id) RESTRICT`; `reissues_invitation_id → identity.invitations(id) RESTRICT`. **Sin** FK a persona destino (`IX-24`).
- **Uniques y checks:** `UNIQUE token_hash`; único parcial `(organization_id, proposal_hash) WHERE status='pending'`; hashes de 32 bytes. `ck_invitations_issuer` exige exactamente una autoría: la membresía que emite, o la persona de Allfit con la asignación de deber bajo la que actuó (`HU-BO-014`). Una membresía ausente nunca representa "lo emitió Allfit". El token se deriva por HMAC con clave versionada, nunca se guarda en claro ni en el outbox. `reissues_invitation_id` apunta a la invitación vencida que una reemisión reemplaza (`HU-BO-011`): `ck_invitations_reissue_author` exige que la firme Allfit y `ck_invitations_reissue_not_self` que no se apunte a sí misma. El trigger `trg_invitations_before_insert_reissue` rechaza (`23514`) una reemisión a otra organización, canal, contacto o propuesta, también para el dueño de la tabla.
- **Actores:** la organización emite, lista y revoca invitaciones de equipo; Allfit (`A10` con `manage_organization_lifecycle`) emite, reenvía y retira la invitación de propiedad de una organización no reclamada (`OP-ORG-018`, `OP-ORG-021`, `OP-ORG-022`); Allfit (`A10` con `diagnose_support_metadata`) lista las invitaciones de equipo y de cliente de una organización con el contacto enmascarado y las reenvía (`NEW-IDN-RESEND`, `OP-IDN-052`; `NEW-IDN-CLIENT-RESEND`, `OP-IDN-051`, que además copia la oferta entera): una vigente se reenvía tal cual y una vencida se reemite igual, firmada por Allfit; nunca una aceptada, rechazada, revocada o ya reemitida. El invitado resuelve y decide; el worker expira por lotes y prepara la entrega. Todos operan mediante funciones cerradas.
- **RLS:** `FORCE ROW LEVEL SECURITY`; todo DML directo está revocado a `allfit_api`. Entradas cerradas: `issue_staff_invitation`, `resolve_staff_invitation`, `decide_staff_invitation`, `list_staff_invitations`, `revoke_staff_invitation`, `expire_staff_invitations`, `organizations.create_unclaimed_organization`, `organizations.resend_ownership_invitation`, `organizations.cancel_unclaimed_organization`, `resolve_ownership_invitation`, `decide_ownership_invitation`, `prepare_ownership_invitation_delivery`, `list_backoffice_team_invitations` y `resend_team_invitation`. Las funciones de equipo filtran `kind = 'membership'`, así que un token de propiedad nunca se resuelve ni se decide como invitación de equipo.
- **Consultas:** por `token_hash`; por organización/estado y cursor de emisión; por expiración pendiente; la invitación de propiedad más reciente de una organización.
- **Índices:** único `token_hash`; único parcial de propuesta pendiente; `(organization_id, status, expires_at DESC)`; `(organization_id, created_at DESC, id DESC)`.
- **Retención:** conserva evidencia; se purga tras plazo largo.
- **Eventos:** `organization.staff_invited.v1` / `relationship.client_invited.v1`, `organization.ownership_invited.v1` (entrega de la invitación de propiedad, también al reenviar), `identity.invitation_revoked.v1`, `identity.invitation_expired.v1`.

### 4.14 `identity.invitation_intents`

- **Propósito:** propuesta tipada decidida de forma independiente; materializa ≤1 destino. Una intención `service_relationship` agrupa las opciones de scope que la persona decide en la misma confirmación, sin convertirlas en una aceptación global.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `invitation_id uuid` · `kind identity.invitation_intent_kind` (`membership` y `ownership` en el corte físico) · `status identity.invitation_intent_status` (`pending`, `accepted`, `rejected`, `revoked`, `expired`) · `proposed_role_code text` · `materialized_membership_id uuid` (nullable) · `decided_at timestamptz` (nullable) · `created_at` · `updated_at`.
- **FKs y borrado:** `invitation_id → invitations(id) ON DELETE CASCADE`; `proposed_role_code → organization_roles(code) RESTRICT`; `materialized_membership_id → organization_memberships(id) RESTRICT`.
- **Uniques y checks:** una intención por `(invitation_id, kind)`; aceptar exige `materialized_membership_id`, los demás terminales lo prohíben. `ck_invitation_intents_ownership_role`: una intención `ownership` propone siempre `owner`, y ninguna otra lo propone. El trigger `trg_invitation_intents_before_insert_issuer` rechaza (`23514`) una intención `ownership` fuera de una invitación emitida por Allfit para una organización `unclaimed`, y cualquier otra intención en una invitación emitida por Allfit salvo que reemita una vencida (`HU-BO-011`): en ese caso la intención debe tener el mismo `kind` y `proposed_role_code` que la original. Aceptar una intención `ownership` activa la organización, crea la membresía `owner` y registra `organization.claimed.v1` en la misma transacción; quien emitió la invitación no puede aceptarla (`42501`).
- **Actores:** la persona decide; la organización crea y revoca; el worker expira. El corte staff entra solo mediante funciones cerradas y no materializa dominios de cliente.
- **RLS:** igual que la invitación: runtime sin DML directo.
- **Consultas:** por `invitation_id`.
- **Índices:** `invitation_id`.
- **Retención:** con la invitación.
- **Eventos:** `identity.invitation_intent_decided.v1`.

**The first program in a client invitation, as implemented (STUDIO-16, migration `20261106090000_an_invitation_can_offer_a_first_program.sql`).** A client invitation may carry a second intent, `kind = 'program_assignment'`, beside its `service_relationship`. New columns: `proposed_program_version_id uuid` (`fk_invitation_intents_program_version → planning.program_versions(id) RESTRICT`), `proposed_starts_on date`, `proposed_timezone text`, `materialized_assignment_id uuid` (`fk_invitation_intents_assignment → planning.program_assignments(id) RESTRICT`) and `unmaterialized_reason text`. `ck_invitation_intents_program_proposal`: the three `proposed_*` columns are all set on a `program_assignment` intent and all null on any other. `ck_invitation_intents_unmaterialized_reason`: null, `training_not_granted` or `program_unavailable`. `ck_invitation_intents_decision` is replaced: nothing points anywhere while `pending` or after `rejected`, `revoked` or `expired`; an accepted `membership`/`ownership` names only a membership; an accepted `service_relationship` names only a relationship; an accepted `program_assignment` names exactly one of `materialized_assignment_id` or `unmaterialized_reason`. Partial indexes on both new foreign keys. The proposal is part of the invitation's identity: `identity.client_proposal_hash` appends `program_assignment`, the version and the start to the text it hashes only when there is a program, so every invitation issued before keeps its hash. The intent issuer trigger now compares a reissued intent with the original's intent **of the same kind** (it compared with the original's first intent, which held while every invitation had one), and `privacy.enforce_reissued_offer_matches` also rebuilds the hash with the program and compares version, start and zone both ways.

### 4.14.1 `identity.invitation_resends`

- **Propósito:** registro de cada reenvío de una invitación hecho por Allfit (`HU-BO-011`, criterio 6): qué se reenvió, si salió la misma invitación o una reemisión, quién y bajo qué deber.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `operational`; no guarda contacto, token ni enlace.
- **Columnas:** `id uuid` · `invitation_id uuid` (la invitación reenviada) · `delivered_invitation_id uuid` (la que salió: la misma, o la reemisión) · `kind identity.invitation_intent_kind` (`membership`, `ownership`) · `outcome text` (`redelivered`, `reissued`) · `actor_person_id uuid` · `actor_duty_assignment_id uuid` · `created_at timestamptz`.
- **FKs y borrado:** `invitation_id` y `delivered_invitation_id → identity.invitations(id) RESTRICT`; `actor_person_id → identity.people(id) RESTRICT`; `actor_duty_assignment_id → support.platform_duty_assignments(id) RESTRICT`.
- **Uniques y checks:** `ck_invitation_resends_outcome`: `redelivered` entrega la misma invitación y `reissued` una distinta. `trg_invitation_resends_append_only` rechaza (`55000`) toda actualización o borrado, también para el dueño.
- **Actores:** escriben solo `identity.resend_team_invitation` (`OP-IDN-052`, `diagnose_support_metadata`), `identity.resend_client_invitation` (`OP-IDN-051`, `diagnose_support_metadata`) y `organizations.resend_ownership_invitation` (`OP-ORG-021`, `manage_organization_lifecycle`). `identity.list_backoffice_team_invitations` y `identity.list_backoffice_client_invitations` leen la fecha del último reenvío.
- **RLS:** `FORCE ROW LEVEL SECURITY` con política única para `allfit_owner`; `allfit_api` sin privilegios de tabla.
- **Consultas:** por invitación reenviada y fecha; por invitación entregada.
- **Índices:** PK; `(invitation_id, created_at)`; `(delivered_invitation_id)`.
- **Retención:** con la invitación; es evidencia de soporte.
- **Eventos:** ninguno propio; la entrega usa `organization.staff_invited.v1` u `organization.ownership_invited.v1`.

### 4.15 `identity.notification_preferences`

- **Propósito:** qué canales acepta la persona para cada categoría de notificación. Es el dato contra el cual `OP-SYS-002` evalúa su filtro obligatorio de "preferencia vigente para ese canal", que hoy no tiene dónde consultarse.
- **Dominio / fuente de verdad:** Identidad.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `person_id uuid` · `category text` (`relationship`, `assignment`, `consent`, `correction`, `nutrition`, `security`) · `channel text` (`email`, `sms`, `push`) · `enabled boolean` · `updated_at timestamptz`.
- **FKs y borrado:** `person_id → identity.people(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (person_id, category, channel)`; `CHECK` sobre los catálogos cerrados de categoría y canal. Las notificaciones de la categoría `security` **no se pueden desactivar**: `CHECK (category <> 'security' OR enabled)`.
- **Actores:** solo la persona. Ninguna organización lee ni escribe esta tabla.
- **RLS:** `person_id = access_control.person()` y nada más.
- **Consultas:** `(person_id, category, channel)`.
- **Índices:** el unique sirve la consulta.
- **Retención:** con la persona.
- **Eventos:** ninguno propio.

---

## 5. Schema `organizations`

### 5.1 `organizations.organizations`

- **Propósito:** frontera estable de operación, autoría y permisos; conserva su `id` al crecer a equipo.
- **Dominio / fuente de verdad:** Organizaciones.
- **Clasificación:** `operational`; `legal_name` puede ser `identity_pii` y el JSON `responsible_party` contiene identidad/contacto restringido.
- **Columnas:** `id uuid` · `type_code text` · `legal_name text` (nullable) · `display_name text` · `status organizations.organization_status` (`unclaimed`, `active`, `closed`, `cancelled`) · `responsible_party_schema_version smallint` (`1`) · `responsible_party jsonb` · `revision_number bigint` (`0`) · `claimed_at timestamptz` (nullable; default `clock_timestamp()`) · `cancelled_at timestamptz` (nullable) · `created_at timestamptz` · `updated_at timestamptz`.
- **FKs y borrado:** `type_code → organization_types(code) RESTRICT`.
- **Uniques y checks:** `ck_organizations_lifecycle_shape`: `unclaimed` sin `claimed_at` ni `cancelled_at`; `active` con `claimed_at` y sin `cancelled_at`; `cancelled` con `cancelled_at` y nunca `claimed_at`; `closed` sin `cancelled_at` (su forma queda abierta hasta que exista el flujo de cierre). `ck_organizations_responsible_party` exige `party_kind`, `purpose = 'studio_operations'` y un `party_name` no vacío, salvo en una organización `unclaimed` o `cancelled` de persona natural, que no lo lleva: Allfit nunca escribe el nombre de una persona, y se toma de su propia identidad cuando acepta (`HU-BO-014`). La versión anterior del check aceptaba cualquier organización sin `party_name`, porque una clave ausente evaluaba a null y un check en null pasa. `revision_number >= 0`. El cambio de `type_code` exige una transición activa en `organization_type_transitions`. El trigger `trg_organization_memberships_before_insert_claimed` sobre `organization_memberships` rechaza (`55000`) cualquier membresía de una organización `unclaimed` o `cancelled`: reclamar pasa la organización a `active` antes de insertar al dueño, en la misma transacción. Las organizaciones existentes antes de `20260913150100` recibieron `claimed_at = created_at`, porque hasta entonces solo su dueño podía crearlas.
- **Actores:** miembros leen una proyección cerrada; admin/owner llaman `organizations.update_organization` para modificar por autoservicio solo `display_name`, `legal_name` y `type_code`. `responsible_party`, su `purpose`/schema version, `id`, `status` y timestamps no son editables por `OP-ORG-002`. El equipo de Allfit (`allfit_admin` con `diagnose_support_metadata` o `manage_organization_lifecycle`, `HU-BO-012`, `NEW-SUP-ORG-SEARCH`) lee el directorio por `organizations.list_backoffice_organizations`: nombre visible, tipo, estado, `created_at`, `claimed_at`, `cancelled_at`, membresías activas y sedes activas. Nunca recibe `legal_name` ni `responsible_party`. `people_served` es null hasta que exista `relationships`: un cero afirmaría que la organización no atiende a nadie. La ficha de Backoffice (`HU-BO-013`, `NEW-SUP-ORG-DETAIL`) se lee por `organizations.read_backoffice_organization` con el mismo par de deberes: organización, dueño y equipo por identificador y rol, y sedes; nunca nombres, contactos ni `responsible_party`, y la dirección de la sede de una persona natural se reserva porque puede ser su casa. Cada miembro activo que devuelve queda en `privacy.access_events` (`support_metadata`) antes de responder; un exmiembro se cuenta y no se lista.
- **RLS:** la función `organizations.read_organization` aplica `access_control.has_membership(id)` y devuelve columnas cerradas. `allfit_api` no recibe `SELECT` ni DML sobre la tabla base y escribe únicamente por funciones cerradas. El directorio de Backoffice exige el deber dentro de la función (`42501`) y no escribe `privacy.access_events`, porque no alcanza datos de ninguna persona.
- **Consultas:** por `id`; por membresía del actor; directorio de Backoffice por `display_name` (búsqueda literal, desde 2 caracteres, sin tocar `legal_name`) y por estado, paginado por `(lower(display_name), id)`.
- **Índices:** PK; `idx_organizations_directory (lower(display_name), id)`; `idx_organizations_status_created (status, created_at)`.
- **Panel de negocio (`HU-BO-004`):** `support.read_business_panel` cuenta todas las organizaciones, las `unclaimed` y las que **operan**: `active` con al menos una membresía `active`. Una organización no es una persona, así que estos conteos no se someten al umbral mínimo.
- **Retención:** el cierre termina relaciones y abre disposición; conserva activos propios.
- **Eventos:** `organization.created.v1`, `organization.updated.v1`, `organization.ownership_transferred.v1`, `organization.closed.v1`.

### 5.2 `organizations.organization_types`

- **Propósito:** clasificación gobernada de la actividad principal (práctica, gimnasio, estudio…).
- **Dominio / fuente de verdad:** Organizaciones (catálogo).
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` · `name text`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `UNIQUE code`.
- **Actores:** lectura autenticada; escritura plataforma.
- **RLS:** lectura abierta.
- **Consultas:** por `code`.
- **Índices:** único `code`.
- **Retención:** permanente.
- **Eventos:** ninguno.

### 5.2.1 `organizations.organization_type_transitions`

- **Propósito:** catálogo gobernado de cambios de actividad principal admitidos por `OP-ORG-002`.
- **Dominio / fuente de verdad:** Organizaciones (catálogo).
- **Clasificación:** `operational`.
- **Columnas:** `from_type_code text` · `to_type_code text` · `status text` (`active`, `inactive`) · `created_at timestamptz`.
- **FKs y borrado:** ambos códigos → `organization_types(code) RESTRICT`.
- **Uniques y checks:** PK `(from_type_code, to_type_code)`; códigos distintos; V1 publica únicamente `professional_practice → gym` y `professional_practice → studio`.
- **Actores:** lectura autenticada; escritura solo migraciones/gobernanza de plataforma.
- **RLS:** lectura abierta; sin DML de runtime.
- **Consultas:** por `(from_type_code, to_type_code, status)`.
- **Índices:** PK; `(from_type_code, status)`.
- **Retención:** permanente; desactivar preserva evidencia histórica.
- **Eventos:** ninguno propio; el cambio efectivo produce `organization.updated.v1`.

### 5.3 `organizations.organization_sites`

- **Propósito:** sede física básica; informativa, no reservable ni delimitadora de permisos.
- **Dominio / fuente de verdad:** Organizaciones.
- **Clasificación:** `operational`; `address` puede ser `identity_pii` cuando una práctica profesional opera desde el domicilio de la persona.
- **Columnas:** `id uuid` · `organization_id uuid` · `name text` · `address text` (nullable) · `status text` (`active`, `inactive`) · `revision_number bigint` (`0`) · `created_at timestamptz` · `updated_at timestamptz`.
- **FKs y borrado:** `organization_id → organizations(id) ON DELETE CASCADE`.
- **Uniques y checks:** `revision_number >= 0`.
- **Actores:** admin/owner llaman `organizations.create_site`/`organizations.update_site`; miembros leen dentro de la proyección organizacional cerrada.
- **RLS:** lectura solo dentro de `organizations.read_organization` bajo `access_control.has_membership(organization_id)`; sin `SELECT` base ni DML directo de runtime.
- **Consultas:** por `organization_id`.
- **Índices:** `organization_id`.
- **Retención:** con la organización; una dirección domiciliaria sigue la disposición aplicable a `identity_pii` y no se copia al evento de acceso.
- **Eventos:** `organization.site_created.v1`, `organization.site_updated.v1`.

### 5.4 `organizations.organization_memberships`

- **Propósito:** vínculo bilateral persona–organización; **no** concede acceso al Fitness ID.
- **Dominio / fuente de verdad:** Organizaciones.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `organization_id uuid` · `person_id uuid` · `status organizations.membership_status` · `joined_at timestamptz` · `ended_at timestamptz` (nullable).
- **FKs y borrado:** `organization_id → organizations(id) RESTRICT`; `person_id → identity.people(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE parcial (organization_id, person_id) WHERE status <> 'terminated'`; claves portadoras `UNIQUE (id,organization_id)` y `UNIQUE (id,organization_id,person_id)`.
- **Actores:** admin/owner gestionan mediante `organizations.terminate_membership`; la persona usa `organizations.resign_membership` aunque no conserve roles; staff y coach leen el directorio. Un owner solo sale después de `OP-ORG-011`.
- **RLS:** lectura por `organization_id = access_control.org()` con membresía vigente, **OR** `person_id = access_control.person()`; sin DML directo de runtime.
- **Consultas:** `(organization_id, status)`, `(person_id, status)`.
- **Índices:** ambos compuestos anteriores.
- **Retención:** conserva historial; no se borra.
- **Eventos:** `organization.membership_created.v1`, `organization.membership_terminated.v1`, `organization.membership_resigned.v1`.

### 5.5 `organizations.organization_roles`

- **Propósito:** catálogo cerrado de roles V1: `owner`, `admin`, `coach`, `staff`.
- **Dominio / fuente de verdad:** Organizaciones (catálogo).
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` · `name text`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `UNIQUE code`.
- **Actores:** lectura autenticada; sin escritura en runtime.
- **RLS:** lectura abierta.
- **Consultas:** por `code`.
- **Índices:** único `code`.
- **Retención:** permanente.
- **Eventos:** ninguno.

### 5.6 `organizations.organization_capabilities`

- **Propósito:** catálogo de acciones organizacionales concretas que un rol habilita.
- **Dominio / fuente de verdad:** Organizaciones (catálogo).
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` (incluye `guide_nutrition`) · `name text`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `UNIQUE code`.
- **Actores:** lectura autenticada.
- **RLS:** lectura abierta.
- **Consultas:** por `code`.
- **Índices:** único `code`.
- **Retención:** permanente.
- **Eventos:** ninguno.

### 5.7 `organizations.role_capabilities`

- **Propósito:** asociación gobernada rol → capacidad.
- **Dominio / fuente de verdad:** Organizaciones (catálogo).
- **Clasificación:** `operational`.
- **Columnas:** `id` · `role_code text` · `capability_code text`.
- **FKs y borrado:** `role_code → organization_roles(code) RESTRICT`; `capability_code → organization_capabilities(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (role_code, capability_code)`.
- **Actores:** lectura autenticada.
- **RLS:** lectura abierta.
- **Consultas:** por `role_code`.
- **Índices:** único compuesto.
- **Retención:** permanente.
- **Eventos:** ninguno.

### 5.8 `organizations.membership_roles`

- **Propósito:** asignación efectiva de un rol a una membresía, con vigencia e historial.
- **Dominio / fuente de verdad:** Organizaciones.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `membership_id uuid` · `role_code text` · `valid_from timestamptz` · `valid_to timestamptz` (nullable).
- **FKs y borrado:** `membership_id → organization_memberships(id) ON DELETE CASCADE`; `role_code → organization_roles(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE parcial (membership_id, role_code) WHERE valid_to is null`. El constraint trigger diferible `organizations.enforce_exactly_one_active_owner_ct` comprueba al confirmar que toda organización activa tenga exactamente una membresía activa con un `membership_role owner` vigente. Se evalúa ante altas, bajas o cambios de vigencia/estado en organización, membresía y rol; rechaza tanto cero como más de un `owner`, pero permite que una transferencia controlada cambie ambas vigencias dentro de una sola transacción.
- **Actores:** admin/owner gestionan `admin`, `coach` y `staff` mediante `organizations.grant_membership_role`/`organizations.revoke_membership_role`; el runtime genérico no puede crear ni cerrar `owner`. Solo `organizations.transfer_ownership(...)`, ejecutada por el owner vigente, cambia ambas vigencias bajo locks y confirma exactamente uno.
- **RLS:** lectura vía la membresía; `allfit_api` no recibe DML directo.
- **Consultas:** `(membership_id, valid_to)`.
- **Índices:** `(membership_id, role_code, valid_from, valid_to)`.
- **Retención:** conserva historial.
- **Eventos:** `organization.role_granted.v1`, `organization.role_revoked.v1`.

### 5.9 `organizations.organization_events`

- **Propósito:** historia append-only de altas, cambios, transferencia de propiedad y cierre.
- **Dominio / fuente de verdad:** Organizaciones.
- **Clasificación:** `audit`; snapshots de `legal_name` o `address` domiciliaria heredan además tratamiento `identity_pii`.
- **Columnas:** `id` · `organization_id uuid` · `event_type text` · `snapshot_schema_version smallint` (`1`) · `before jsonb` (nullable) · `after jsonb` (nullable) · `actor_membership_id uuid` (nullable) · `actor_person_id uuid` (nullable) · `actor_duty_assignment_id uuid` (nullable).
- **FKs y borrado:** `organization_id → organizations(id) ON DELETE CASCADE`; FK compuesta opcional `(actor_membership_id, organization_id) → organization_memberships(id, organization_id) RESTRICT` (`IX-25`); `actor_person_id → identity.people(id) RESTRICT`; `actor_duty_assignment_id → support.platform_duty_assignments(id) RESTRICT`.
- **Uniques y checks:** append-only: `INSERT` directo, `UPDATE` y `DELETE` revocados al runtime. El snapshot v1 admite datos organizacionales, sede (`site_id`, `name`, `address`, `status`, `revision_number`), transferencia (`previous_owner_membership_id`, `owner_membership_id`) o reclamo (`owner_membership_id`) según `event_type`; claves adicionales o combinaciones ajenas se rechazan. `ck_organization_events_platform_actor`: la persona y la asignación de deber de Allfit van juntas, nunca con una membresía; `organization.created_unclaimed.v1` y `organization.cancelled.v1` exigen actor de Allfit, y `organization.claimed.v1` exige la membresía del nuevo dueño (`HU-BO-014`, `HU-BO-015`). Una membresía ausente nunca representa "lo hizo Allfit".
- **Actores:** las funciones cerradas del agregado insertan; admin/owner leen. Allfit inserta la creación no reclamada, su sede y su cancelación por `create_unclaimed_organization` y `cancel_unclaimed_organization`; el dueño inserta el reclamo al aceptar.
- **RLS:** hereda de la organización.
- **Consultas:** `(organization_id, created_at desc)`.
- **Índices:** `(organization_id, created_at desc)`.
- **Retención:** evidencia de auditoría bajo finalidad/plazo; una dirección domiciliaria sigue la política de `identity_pii` y no se conserva indefinidamente por ser sede.
- **Eventos:** ninguno propio.

### 5.10 `organizations.membership_events`

- **Propósito:** historia append-only de la membresía y sus roles.
- **Dominio / fuente de verdad:** Organizaciones.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `membership_id uuid` · `event_type text` · `snapshot_schema_version smallint` (`1`) · `before jsonb` (nullable) · `after jsonb` (nullable) · `created_at timestamptz`.
- **FKs y borrado:** `membership_id → organization_memberships(id) ON DELETE CASCADE`.
- **Uniques y checks:** append-only; un único `organization.membership_created.v1` por membresía; versión de snapshot `1`; al menos uno de `before` o `after` presente. El snapshot admite contexto de membresía y, según `event_type`, `role_code`, `valid_from` y `valid_to`; cambios de rol y transferencia exigen la forma exacta before/after.
- **Actores:** los comandos gobernados de `allfit_api` provocan la inserción mediante un trigger cerrado; no existe DML directo de runtime. Admin/owner y la propia persona leen.
- **RLS:** hereda de la membresía.
- **Consultas:** `(membership_id, created_at desc)`.
- **Índices:** `(membership_id, created_at desc)`.
- **Retención:** auditoría.
- **Eventos:** ninguno propio.

---

## 6. Schema `relationships`

### 6.1 `relationships.service_relationships`

- **Propósito:** vínculo aceptado de servicio persona–organización; no concede datos por sí solo.
- **Dominio / fuente de verdad:** Relaciones.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `person_id uuid` · `organization_id uuid` · `status relationships.relationship_status` · `previous_relationship_id uuid` (nullable) · `started_at timestamptz` · `ended_at timestamptz` (nullable) · `ended_reason text` (nullable) · `ended_by_kind identity.actor_kind` (nullable).
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `organization_id → organizations.organizations(id) RESTRICT`; FK autocontenida opcional `(previous_relationship_id, person_id, organization_id) → service_relationships(id, person_id, organization_id) RESTRICT` (`IX-01`).
- **Uniques y checks:** `UNIQUE parcial (person_id, organization_id) WHERE status='active'`; claves portadoras `UNIQUE (id, person_id)`, `UNIQUE (id, organization_id)` y `UNIQUE (id, person_id, organization_id)`. `CHECK (ended_at is null or ended_at >= started_at)`.
- **Actores:** la persona (termina); admin/owner (crean vía aceptación, terminan); coach asignado lee.
- **RLS:** `person_id = access_control.person()` **OR** (`organization_id = access_control.org()` **AND** (capacidad de clientes **OR** asignación efectiva)).
- **Consultas:** `(person_id, status)`, `(organization_id, status)`.
- **Índices:** ambos compuestos + parcial de activa.
- **Retención:** conserva historial; el motivo lo ve solo quien lo declaró.
- **Eventos:** `relationship.terminated.v1`.

### 6.2 `relationships.responsible_party_snapshots`

- **Propósito:** parte responsable, organización presentada y propósito conocidos al aceptar.
- **Dominio / fuente de verdad:** Relaciones.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `relationship_id uuid` · `party_kind text` (`natural`, `legal`) · `party_name text` · `presented_purpose text` · `presented_at timestamptz`.
- **FKs y borrado:** `relationship_id → service_relationships(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE relationship_id`; `CHECK (party_kind in ('natural','legal'))`.
- **Actores:** la persona y la organización de la relación leen; append-only.
- **RLS:** hereda de la relación.
- **Consultas:** por `relationship_id`.
- **Índices:** único `relationship_id`.
- **Retención:** con la relación (evidencia bilateral).
- **Eventos:** ninguno propio.

### 6.3 `relationships.relationship_professional_assignments`

- **Propósito:** profesional autorizado dentro de una relación: titular o suplente.
- **Dominio / fuente de verdad:** Relaciones.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `relationship_id uuid` · `person_id uuid` · `organization_id uuid` · `membership_id uuid` · `kind relationships.assignment_kind` · `status relationships.assignment_status` · `valid_from timestamptz` · `valid_to timestamptz` (nullable) · `ends_on date` (nullable; **NOT NULL para suplencia** por CHECK) · `accepted_by_person_at timestamptz` (nullable).
- **FKs y borrado:** `(relationship_id, person_id, organization_id) → service_relationships(id, person_id, organization_id) RESTRICT`; `(membership_id, organization_id) → organizations.organization_memberships(id, organization_id) RESTRICT` (`IX-02`).
- **Uniques y checks:** claves portadoras `UNIQUE (id,person_id)` y `UNIQUE (id,relationship_id,person_id,organization_id,membership_id)`; `UNIQUE parcial (relationship_id) WHERE kind='holder' AND status='active'` (un titular efectivo). `CHECK (kind='holder' OR ends_on is not null)` (suplencia con fin obligatorio). `CHECK (kind='holder' OR accepted_by_person_at is not null OR status in ('proposed','rejected'))` (suplencia exige aceptación para activarse; una rechazada nunca la tuvo, y así queda registrada). Constraint trigger diferible `relationships.enforce_assignment_eligibility_ct` verifica membresía vigente y rol `coach`, también ante terminación de membresía o rol (`IX-03`).
- **Actores:** admin/owner asignan titular; titular/admin proponen suplencia; la persona acepta o rechaza la suplencia (`relationships.decide_substitution`, `OP-REL-005`, migración `20261021120000`).
- **RLS:** vía la relación; el `INSERT` exige membresía vigente en la misma organización con rol `coach`.
- **Consultas:** `(relationship_id, status, valid_from, valid_to)`, `(person_id, status)`, `(organization_id, status)`.
- **Índices:** los tres compuestos anteriores + parcial de titular efectivo.
- **Retención:** conserva historial de reasignaciones.
- **Eventos:** `relationship.professional_assigned.v1`, `relationship.professional_reassigned.v1`, `relationship.substitution_proposed.v1`, `relationship.substitution_decided.v1`, `relationship.substitution_ended.v1`, `relationship.substitution_expired.v1`.

### 6.4 `relationships.professional_assignment_events`

- **Propósito:** historia append-only de asignaciones y suplencias.
- **Dominio / fuente de verdad:** Relaciones.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `assignment_id uuid` · `event_type text` · `snapshot_schema_version smallint` (`1`) · `before jsonb` (nullable) · `after jsonb` (nullable).
- **FKs y borrado:** `assignment_id → relationship_professional_assignments(id) ON DELETE CASCADE`.
- **Uniques y checks:** append-only.
- **Actores:** `allfit_api` inserta; la relación lee.
- **RLS:** hereda de la asignación.
- **Consultas:** `(assignment_id, created_at desc)`.
- **Índices:** `(assignment_id, created_at desc)`.
- **Retención:** auditoría.
- **Eventos:** ninguno propio.

### 6.5 `relationships.relationship_events`

- **Propósito:** historia append-only de la relación: alta, cambios de titular, consentimientos, terminación.
- **Dominio / fuente de verdad:** Relaciones.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `relationship_id uuid` · `event_type text` · `visible_to text` (`both`, `person`, `organization`) · `detail_schema_version smallint` (`1`, nullable junto a payload) · `detail jsonb` (nullable).
- **FKs y borrado:** `relationship_id → service_relationships(id) ON DELETE CASCADE`.
- **Uniques y checks:** append-only; `CHECK (visible_to in ('both','person','organization'))`.
- **Actores:** `allfit_api` inserta; la persona y la organización leen según `visible_to`.
- **RLS:** hereda de la relación, más filtro por `visible_to` (el motivo de terminación se ve solo por quien lo declaró).
- **Consultas:** `(relationship_id, created_at desc)`.
- **Índices:** `(relationship_id, created_at desc)`.
- **Retención:** auditoría.
- **Eventos:** ninguno propio.

---

## 7. Schema `privacy`

### 6.6 `relationships.relationship_termination_requests`

- **Propósito:** solicitud de un coach titular para que la organización termine una relación que él no puede terminar por sí mismo. No cambia el estado de la relación ni corta ningún acceso.
- **Dominio / fuente de verdad:** Relaciones.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `relationship_id uuid` · `organization_id uuid` · `requested_by_membership_id uuid` · `status relationships.termination_request_status` (`pending`, `withdrawn`, `rejected`, `resolved`, `superseded`) · `reason text` (nullable) · `resolution text` (nullable) · `resolved_by_membership_id uuid` (nullable) · `created_at` · `resolved_at timestamptz` (nullable).
- **FKs y borrado:** `(relationship_id, organization_id) → service_relationships(id, organization_id) ON DELETE CASCADE`; `(requested_by_membership_id, organization_id) → organizations.organization_memberships(id, organization_id) RESTRICT`; `(resolved_by_membership_id, organization_id) → organizations.organization_memberships(id, organization_id) RESTRICT`.
- **Uniques and checks:** `UNIQUE (relationship_id) WHERE status = 'pending'` — **the no-duplicate rule of `OP-REL-009` lives here, not in code**; `(status = 'pending') = (resolved_at IS NULL)`; `resolved_at >= created_at`; `resolved_by_membership_id` is set exactly for `withdrawn`, `rejected` and `resolved` (a `superseded` request was overtaken, nobody decided it); a `withdrawn` request was settled by its requester; `resolution` is present exactly for `rejected`; `reason` and `resolution` are non-blank and at most 2000 characters.
- **Actors:** the holder `A3` asks (`OP-REL-009`) and may withdraw her own (`OP-REL-017`); `A4`/`A5` refuse it (`OP-REL-018`) or end the relationship, which resolves it. `close_relationship` and the trigger `trg_professional_assignments_after_update_supersede_requests` settle it, through `relationships.settle_termination_requests`.
- **RLS (as implemented, STUDIO-26):** `organization_id = access_control.org()` **and** (the actor owns `requested_by_membership_id` **or** `access_control.has_capability(organization_id, 'assign_professionals')`), **or** the contract scope `termination_request_settlement` for that relationship. The capability is the one `OP-REL-008` checks, so whoever reads and refuses requests is exactly whoever could end the relationship. Insert requires the actor to own `requested_by_membership_id`. The person attended **never** sees these requests, and neither do staff nor other coaches: they are the organization's internal deliberation.
- **Consultas:** `(organization_id, status, created_at desc)`; `(relationship_id) WHERE status = 'pending'`.
- **Índices:** `(organization_id, status, created_at desc)`; el unique parcial sirve la búsqueda de pendiente.
- **Retención:** operativa; se dispone con la relación.
- **Events:** `relationship.termination_requested.v1`, `relationship.termination_request_rejected.v1`. No worker delivers either yet.

---

### 7.1 `privacy.data_classifications`

- **Propósito:** catálogo de niveles de sensibilidad usados por reglas de scope, atributos y disposición.
- **Dominio / fuente de verdad:** Privacidad (catálogo).
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` (`operational`, `training`, `body`, `health`, `nutrition`, `identity_pii`, `audit`) · `name text` · `sensitivity_rank integer`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `UNIQUE code`.
- **Actores:** lectura autenticada; escritura plataforma.
- **RLS:** lectura abierta.
- **Implementado:** las siete clasificaciones vienen sembradas por la migración, con `sensitivity_rank` creciente. `allfit_api` no tiene DML: agregar una clasificación es un cambio de esquema, no una operación.
- **Consultas:** por `code`; por `sensitivity_rank` (para heredar la más restrictiva).
- **Índices:** único `code`.
- **Retención:** permanente.
- **Eventos:** ninguno.

### 7.2 `privacy.scope_definitions`

- **Propósito:** versión publicada e inmutable de un scope V1.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `scope_code text` (`relationship_training`, `prior_training_history`, `body_progress`, `health_context`, `nutrition_intake`, `nutrition_guidance`, `nutrition_media`) · `version_number integer` · `status catalog.publication_status` · `published_at timestamptz`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `UNIQUE (scope_code, version_number)`; clave portadora `UNIQUE (id, scope_code)`. `UPDATE`/`DELETE` revocados en runtime.
- **Actores:** lectura autenticada; escritura plataforma.
- **RLS:** `status='published'` para lectura.
- **Implementado:** `privacy.publish_scope_definition` es la única escritura y **siempre agrega una versión**, nunca corrige una publicada: el número de versión lo asigna el servidor a partir del máximo existente. `privacy.list_scope_definitions` y `privacy.scope_definition_projection` son las lecturas. La inmutabilidad no depende de los grants: el trigger `privacy.prevent_published_scope_mutation` rechaza cualquier `UPDATE` o `DELETE` sobre una versión publicada, también al dueño de la tabla. Eso es lo que sostiene la promesa de que **quien aceptó una versión anterior la conserva**: un grant apunta a una versión congelada y esa fila no puede cambiar debajo.
- **Consultas:** por `(scope_code, version_number)`; versión vigente.
- **Índices:** único `(scope_code, version_number)`.
- **Retención:** permanente (referenciada por grants históricos).
- **Eventos:** `privacy.scope_definition_published.v1`.

### 7.3 `privacy.scope_resource_rules`

- **Propósito:** enumera recursos, campos, exclusiones y acciones máximas de una versión de scope.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `scope_definition_id uuid` · `resource text` · `field text` · `data_classification_code text` · `max_action privacy.access_level` · `is_excluded boolean` · `historical_readable boolean NOT NULL default false`.
- **FKs y borrado:** `scope_definition_id → scope_definitions(id) ON DELETE CASCADE`; `data_classification_code → data_classifications(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (scope_definition_id, resource, field)`. `CHECK` que todo campo tiene clasificación. `historical_readable` solo puede ser `true` cuando `is_excluded=false` y la acción máxima incluye lectura.
- **Actores:** lectura autenticada; escritura plataforma.
- **RLS:** lectura abierta de versiones publicadas.
- **Implementado:** `privacy.access_level` es un enum (`read`, `contribute`), no texto con `CHECK`. Las reglas se insertan sólo dentro de `privacy.publish_scope_definition`, y `privacy.prevent_published_scope_rule_mutation` las congela con la versión. El duplicado de `(resource, field)` dentro de una misma publicación se rechaza en un trigger `before insert` y no en un `CHECK`: PostgreSQL no admite subconsultas en un `CHECK`, así que la comprobación que compara el arreglo contra su propio conjunto distinto no es expresable ahí.
- **Applied (STUDIO-44..46, migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`).** `privacy.scope_allows(scope_definition_id, resource, field)` is the first reader of these rules: a non-excluded rule for the field or for `'*'` shares it, and an exclusion of either wins. It is closed to `allfit_api`. The reads of `OP-IDN-018`, `-019`, `-020`, `-059` and `-060` project each field through it, so a field the frozen version leaves out reads as `null`, and a row whose ordering key is not shared is not listed.
- **Consultas:** por `scope_definition_id`.
- **Índices:** único compuesto.
- **Retención:** con la versión.
- **Eventos:** ninguno propio.

### 7.4 `privacy.consent_events`

- **Propósito:** decisión de consentimiento con el snapshot exacto presentado; append-only.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `person_id uuid` · `relationship_id uuid` · `organization_id uuid` · `invitation_scope_option_id uuid` · `scope_definition_id uuid` · `scope_code text` · `decision privacy.consent_decision` · `presented_snapshot_schema_version smallint` (`1`) · `presented_snapshot jsonb` · `decided_at timestamptz`.
- **FKs y borrado:** `(relationship_id, person_id, organization_id) → relationships.service_relationships(id, person_id, organization_id) RESTRICT`; `(invitation_scope_option_id, scope_definition_id, scope_code) → invitation_scope_options(id, scope_definition_id, scope_code) RESTRICT`; `(scope_definition_id, scope_code) → scope_definitions(id, scope_code) RESTRICT` (`IX-05`).
- **Uniques y checks:** clave portadora `UNIQUE (id, person_id, relationship_id, organization_id, scope_definition_id, scope_code)`; append-only.
- **Actores:** la persona decide; la organización ve estado.
- **RLS:** `person_id = access_control.person()` **OR** (`relationship` de `access_control.org()`).
- **Consultas:** `(person_id, decided_at desc)`, `(relationship_id, scope_code, decided_at desc)`, `(organization_id, decided_at desc)`.
- **Índices:** los tres compuestos anteriores.
- **Retención:** evidencia; auditoría.
- **Eventos:** `privacy.grant_created.v1`, `privacy.grant_rejected.v1`, `privacy.grant_revoked.v1`.

### 7.5 `privacy.invitation_scope_options`

- **Propósito:** scopes, nivel y finalidad que se presentan junto con una intención `service_relationship`; no conceden acceso por existir y no pueden crearse para una relación ya activa.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `operational` hasta la decisión; la evidencia definitiva queda en `consent_events`.
- **Columnas:** `id` · `invitation_intent_id uuid` · `scope_definition_id uuid` · `scope_code text` · `offered_access_level privacy.access_level` · `purpose text` · `presented_snapshot_schema_version smallint` (`1`) · `presented_snapshot jsonb` · `decision privacy.consent_decision` (nullable mientras la invitación no se decide) · `decided_at timestamptz` (nullable).
- **FKs y borrado:** `invitation_intent_id → identity.invitation_intents(id) ON DELETE CASCADE`; `(scope_definition_id, scope_code) → scope_definitions(id, scope_code) RESTRICT` (`IX-06`).
- **Uniques y checks:** `UNIQUE (invitation_intent_id, scope_code)`; clave portadora `UNIQUE (id, scope_definition_id, scope_code)`; `CHECK ((decision is null) = (decided_at is null))`. El constraint trigger `privacy.enforce_invitation_scope_option_ct` exige que el padre sea una intención `service_relationship`, que su invitación pertenezca a la organización que emitió la propuesta y que ninguna opción cambie después de decidirse.
- **Actores:** la organización las fija al emitir la invitación; la persona decide todas las opciones dentro de `identity.decide_invitation_intent`. No existe `INSERT` o `UPDATE` desde una relación activa ni una ruta Studio para volver a pedirlas.
- **RLS:** hereda el acceso de la invitación y su intención; DML directo revocado.
- **Consultas:** por `invitation_intent_id`.
- **Índices:** único `(invitation_intent_id, scope_code)`.
- **Retención:** con la invitación; `consent_events` conserva la evidencia inmutable de la decisión materializada.
- **Eventos:** ninguno propio; la confirmación produce `privacy.grant_created.v1` o `privacy.grant_rejected.v1` por opción.

### 7.6 `privacy.data_grants`

- **Propósito:** convierte una relación en acceso; congela versión exacta de scope, nivel y propósito.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `operational` (metadato de autorización).
- **Columnas:** `id` · `person_id uuid` · `relationship_id uuid` · `organization_id uuid` · `scope_definition_id uuid` · `scope_code text` · `consent_event_id uuid` · `access_level privacy.access_level` · `purpose text` · `status privacy.grant_status` · `granted_at timestamptz` · `frozen_at timestamptz` (nullable) · `revoked_at timestamptz` (nullable) · `last_reviewed_at timestamptz` (nullable).
- **FKs y borrado:** `(relationship_id, person_id, organization_id) → relationships.service_relationships(id, person_id, organization_id) RESTRICT`; `(scope_definition_id, scope_code) → scope_definitions(id, scope_code) RESTRICT`; `(consent_event_id, person_id, relationship_id, organization_id, scope_definition_id, scope_code) → consent_events(id, person_id, relationship_id, organization_id, scope_definition_id, scope_code) RESTRICT` (`IX-07`). `DELETE` revocado.
- **Uniques y checks:** `UNIQUE parcial (relationship_id, scope_code) WHERE status IN ('active','frozen')` — como máximo un grant no revocado de cada scope, aunque existan versiones distintas. `CHECK` de estado: `active` exige ambos cortes `NULL`; `frozen` exige `frozen_at NOT NULL` y `revoked_at NULL`; `revoked` exige `revoked_at NOT NULL` y puede conservar `frozen_at`. Trigger `privacy.enforce_data_grant_transition_tg` prohíbe `frozen/revoked → active`, `revoked → frozen` y modificar un corte ya fijado.
- **Actores:** la persona concede dentro de `identity.decide_invitation_intent` y revoca después; el profesional asignado y admin/owner leen el estado mientras la relación está activa. La función de decisión inserta; `privacy.revoke_grant` actualiza `status, revoked_at`; `relationships.terminate_relationship` actualiza `status, frozen_at`. La lectura histórica solo se ejerce mediante un `historical_access_case` válido y `access_control.can_read_frozen`.
- **RLS:** `person_id = access_control.person()` **OR** organización de la relación.
- **Estados y su efecto en la lectura:**

  | `status` | Qué habilita | Cuándo |
  | --- | --- | --- |
  | `active` | Lectura **en vivo** de los datos del scope | Relación activa |
  | `frozen` | Lectura **solo de filas con instante ≤ `frozen_at`**; ningún dato posterior | Relación terminada, cuenta de la persona viva |
  | `revoked` | Ningún acceso | La persona revocó el consentimiento explícitamente |

  La distinción es importante: **terminar una relación produce `frozen`** (el gimnasio conserva su histórico); **revocar el consentimiento produce `revoked`** (acceso cortado del todo). Son caminos distintos con resultados distintos. Si la persona elimina su cuenta, la anonimización actúa sobre los datos y alcanza también lo que ve un grant `frozen`.
- **Consultas:** `(relationship_id, scope_code, status)` — **el índice más crítico del sistema**; `(person_id, status)`. Toda proyección bajo un grant `frozen` añade el filtro por `frozen_at`.
- **Índices:** único parcial `(relationship_id, scope_code) WHERE status IN ('active','frozen')`; `(person_id, status)`; `(organization_id, status)`; parcial `(relationship_id, scope_code, frozen_at) WHERE status='frozen'`.
- **Retención:** conserva; congelar y revocar cierran sin borrar.
- **Eventos:** `privacy.grant_created.v1`, `privacy.grant_frozen.v1`, `privacy.grant_revoked.v1`, `privacy.grant_review_due.v1`.

### 7.7 `privacy.session_visibility_denials`

- **Propósito:** oculta una sesión autónoma para una relación; prevalece sobre el grant.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `operational` (preferencia sensible).
- **Columnas:** `id` · `person_id uuid` · `executed_session_id uuid` · `relationship_id uuid` · `status text` (`active`, `reverted`) · `denied_at timestamptz` · `restored_at timestamptz` (nullable) · `frozen_denied_at timestamptz` (nullable).
- **FKs y borrado:** `(executed_session_id, person_id) → execution.executed_sessions(id, person_id) RESTRICT`; `(relationship_id, person_id) → relationships.service_relationships(id, person_id) RESTRICT` (`IX-08`).
- **Uniques y checks:** `UNIQUE (executed_session_id, relationship_id)`. `frozen_denied_at`, una vez establecido, es inmutable: después de `T` una restauración no amplía la ventana histórica. **`IX-36`**: constraint trigger que rechaza la fila si la sesión se produjo dentro de esa misma relación (`executed_sessions.context_relationship_id = relationship_id`); la regla es de base de datos, no de la aplicación.
- **Actores:** **solo la persona**. Ninguna organización la lee.
- **RLS:** `person_id = access_control.person()` y nada más.
- **Consultas:** `(executed_session_id, relationship_id)`, `(relationship_id, status)`.
- **Índices:** único de par + `(relationship_id, status)`.
- **Retención:** con la persona.
- **Eventos:** `privacy.session_visibility_denied.v1`, `privacy.session_visibility_restored.v1`.
- **As implemented (STUDIO-47/48, migration `20261107090000_a_coach_reviews_what_a_client_trained.sql`).** Constraints:
  - `pk_session_visibility_denials`;
  - `uq_session_visibility_denials_pair`;
  - `fk_session_visibility_denials_session` and `fk_session_visibility_denials_relationship`, both composite with `person_id` and `RESTRICT`;
  - `ck_session_visibility_denials_status`;
  - `ck_session_visibility_denials_restored`: `restored_at` is set exactly when the denial is `reverted`.

  Indexes: `idx_session_visibility_denials_relationship_status`, and `idx_session_visibility_denials_person_denied`, partial on `active`, for her list.

  Triggers:
  - `trg_session_visibility_denials_before_update_keep` keeps the person, session and relationship, and never changes `frozen_denied_at` once it is set;
  - `IX-36` is `trg_session_visibility_denials_after_insert_own_relationship`, a deferrable constraint trigger that also refuses a session it cannot see.

  `allfit_api` has no privilege on the table; it writes through `privacy.hide_session` and `privacy.restore_session`. **RLS deviation:** see `V1_RLS_MATRIX.md` § `SESSION_VISIBILITY_DENIAL`.

### 7.8 `privacy.historical_access_cases`

- **Propósito:** autorización temporal, explícita y de solo lectura para ejercer un grant `frozen` sobre una relación terminada.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `restricted` (metadato de autorización y justificación).
- **Columnas:** `id uuid` · `organization_id uuid` · `relationship_id uuid` · `authorized_membership_id uuid` · `opened_by_membership_id uuid` · `capability_code text` (`read_frozen_relationship_history`) · `purpose privacy.historical_access_purpose` · `case_reference text` · `justification text` · `status privacy.historical_case_status` · `opened_at timestamptz` · `expires_at timestamptz` · `closed_at timestamptz` (nullable).
- **FKs y borrado:** `(relationship_id, organization_id) → relationships.service_relationships(id, organization_id) RESTRICT`; `(authorized_membership_id, organization_id)` y `(opened_by_membership_id, organization_id) → organizations.organization_memberships(id, organization_id) RESTRICT`; `capability_code → organizations.organization_capabilities(code) RESTRICT` (`IX-09`).
- **Uniques y checks:** `expires_at > opened_at`; `expires_at <= opened_at + interval '24 hours'`; capacidad fija. Constraint trigger diferible `privacy.enforce_historical_case_eligibility_ct` verifica relación terminada, exclusión de `staff`, membresía autorizada activa y rol `owner`/`admin` o antiguo titular; cambios de membresía, rol o asignación deben cerrar el caso en la misma transacción (`IX-10`). Un índice parcial impide más de un caso abierto por `(relationship_id, authorized_membership_id, purpose)`.
- **Actores:** `owner`/`admin` con `manage_historical_access` abren/cierran; ejerce únicamente la membresía autorizada con MFA.
- **RLS:** gestión por organización con capacidad; la fila solo es ejercible por `authorized_membership_id = access_control.membership()` y `status='open'` y `expires_at > statement_timestamp()`.
- **Consultas:** `(organization_id, relationship_id, status)`, `(authorized_membership_id, status, expires_at)`, `case_reference`.
- **Índices:** compuestos anteriores + parcial de casos abiertos.
- **Retención:** 24 meses después de cerrar/expirar, alineada con `access_events`; una política posterior puede exigir más por disputa u obligación.
- **Eventos:** `privacy.historical_access_case_opened.v1`, `privacy.historical_access_case_closed.v1`, `privacy.historical_access_case_expired.v1`.

### 7.9 `privacy.access_events`

- **Propósito:** registro de toda lectura autorizada de una persona o de la proyección operativa cerrada de una organización; el actor humano es obligatorio.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id uuid` · `occurred_at timestamptz` (**clave de partición derivada del UUIDv7**) · `subject_person_id uuid` (nullable) · `subject_organization_id uuid` (nullable) · `actor_person_id uuid` · `actor_membership_id uuid` (nullable) · `relationship_id uuid` (nullable) · `data_grant_id uuid` (nullable) · `historical_access_case_id uuid` (nullable) · `scope_code text` (nullable) · `scope_version integer` (nullable) · `purpose text` · `access_mode privacy.access_mode` (`live`, `frozen`, `break_glass`, `organization_operational`, `support_metadata` — lectura del equipo de Allfit bajo un deber de plataforma, añadido en `20260910130000`) · `resource text` · `request_id uuid` · `result text` (`allowed`, `denied`).
- **FKs y borrado:** `subject_person_id` y `actor_person_id` → `identity.people(id) RESTRICT`; `subject_organization_id → organizations.organizations(id) RESTRICT`. Las referencias de alto volumen a relación, grant y caso se validan en la entrada cerrada, no con FK dura sobre cada partición.
- **Uniques y checks:** PK `(id,occurred_at)`; `CHECK (num_nonnulls(subject_person_id,subject_organization_id)=1)`; rango mensual; `access_events_id_partition_time_chk` exige UUIDv7 y `occurred_at=extensions.uuid_v7_timestamp(id)`. Actor humano obligatorio. La rama personal conserva sus reglas live/frozen/break-glass. La rama organización exige `access_mode='organization_operational'`, `actor_membership_id` activo del mismo tenant y de `actor_person_id`, `resource='organizations.organization_context'` y relación/grant/caso/scope/version nulos. `privacy.log_access_event` es la única entrada y `privacy.enforce_access_event_context_tg` valida `IX-23`.
- **Actores:** la persona consulta las suyas mediante `privacy.v_my_access_events`; `A12` audita metadatos break-glass mediante `support.list_break_glass_audit_events`; `A10` consulta sus ejercicios en `support.break_glass_events`, no esta tabla. `privacy.log_access_event` inserta en la misma transacción de la lectura.
- **Implementado (`HU-BO-030`, `OP-SUP-009`):** `privacy.list_access_events` y `privacy.count_withheld_access_events`. La autoridad —`audit_platform_access` sobre el rol base— la resuelve `privacy.require_access_log_auditor`, invocado con `perform` dentro de `plpgsql`: invocado como elemento del `FROM` en una función `language sql` devuelve `void`, el planificador puede eliminarlo y la comprobación no se ejecuta. Ese error se cometió primero y `T-PRV-AUD-01` lo detectó.
  - **Append-only real desde `20260911030000`.** Antes de esa migración `UPDATE` y `DELETE` sobre esta tabla funcionaban: lo único que los impedía era que `allfit_api` no tiene permisos, lo que protege las rutas y no la tabla. `privacy.reject_access_event_rewrite` los rechaza con `55000`, también para el dueño. Soltar una partición mensual es DDL y un trigger de fila no la ve, así que la retención no se afecta.
  - **Separación de deberes por caso, no global.** Un auditor que pidió o aprobó una ventana break-glass no audita *esa* ventana y sigue auditando todas las demás. La versión global es más fácil de escribir y dejaría el registro sin auditor posible para cualquiera que haya aprobado algo alguna vez.
  - **Lo retenido se cuenta en su propia consulta**, para que sobreviva a una lista vacía: sin ese número, un auditor que filtra hasta su propia ventana lee «nadie accedió» cuando accedió él. Las dos consultas comparten un único predicado, `privacy.is_own_break_glass_case`, para que el conteo nunca describa un conjunto distinto del que se retiró, y la API las lee en una sola transacción.
  - La proyección lleva el registro del acceso y nada de lo leído. `T-PRV-AUD-01` lo asegura contra el tipo de resultado declarado, así que una columna de contenido añadida después rompe la prueba en vez de filtrarse.
  - Las lecturas de la cola de verificación (`HU-BO-021`) escriben aquí con `purpose = 'professional_credential_verification'` y `access_mode = 'support_metadata'`: quien verifica lee bajo un deber de plataforma, no bajo un permiso de la persona. La primera versión (`20260913120000`) escribía `live` y afirmaba que el enum no tenía un valor de plataforma, cuando `support_metadata` existía desde `20260910130000`; `20260913140000` lo corrige. Registrada como `live`, la lectura le habría dicho a un auditor que la persona consintió.
- **Pendiente:** `support.list_break_glass_audit_events` **no existe todavía**. `support.exercise_break_glass` inserta aquí directamente, en la misma transacción que su propia evidencia, y desde `20260910170000` una FK exige que la fila exista — sin ella la evidencia del operador podía apuntar a una auditoría que nunca se escribió, y la persona no habría visto nunca el intento registrado en su contra. La revisión específica de `A12/audit_break_glass` sobre un expediente sigue pendiente, junto con la revisión posterior de `12.3`; la consulta general del registro ya existe y se describe arriba.
- **RLS:** en la tabla base, `SELECT` solo cuando `subject_person_id = access_control.person()`; `privacy.v_my_access_events` nunca incluye sujetos organización. `INSERT` directo revocado. Ninguna organización, `A10` o `A12` recibe `SELECT` directo.
- **Consultas:** `(subject_person_id, occurred_at desc)` para la persona; `(subject_organization_id, occurred_at desc)` solo para investigación restringida de plataforma.
- **Índices:** ambos compuestos anteriores por partición.
- **Retención:** **24 meses** para ambas ramas; la purga es `DROP` de partición. La dirección potencialmente `identity_pii` nunca se copia al evento: solo se registra el código de recurso cerrado.
- **Eventos:** ninguno propio (es el registro, no un hecho de negocio).

### 7.10 `privacy.retention_policies`

- **Propósito:** política de retención versionada por categoría, finalidad, trigger y jurisdicción.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `data_classification_code text` · `jurisdiction text` (`CO`, con techo GDPR) · `version_number integer` · `default_action privacy.disposition_action` · `retention_period interval` · `trigger text` · `published_at timestamptz`.
- **FKs y borrado:** `data_classification_code → data_classifications(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (data_classification_code, jurisdiction, version_number)`.
- **Actores:** lectura autenticada; escritura plataforma.
- **RLS:** lectura abierta.
- **Consultas:** por `(data_classification_code, jurisdiction)` vigente.
- **Índices:** único compuesto.
- **Retención:** permanente (gobierna a las demás).
- **Eventos:** ninguno.
- **Implementado (`HU-SP-027`):** checks de jurisdicción ISO de dos letras, versión positiva, periodo no negativo y `trigger` como código. `privacy.reject_disposition_policy_rewrite_tg` impide editar o borrar una política publicada: se publica otra versión. La única política sembrada es la que la operación ya declara: `body`, `CO`, versión 1, `delete`, periodo cero, `owner_request`. La retención por cualquier otro disparador es DB-P5-015 y no se decide aquí. `20260920120000` publica la segunda con la misma forma para `health`, y `20260921120000` la tercera para `nutrition`.

### 7.11 `privacy.erasure_requests`

- **Propósito:** solicitud de supresión de la persona; abre un caso de disposición.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `person_id uuid` · `scope text` (`account`, categorías concretas) · `status text` (`open`, `resolved`) · `requested_at timestamptz` · `resolved_at timestamptz` (nullable).
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE parcial (person_id, scope) WHERE status='open'`; clave portadora `UNIQUE (id, person_id)`.
- **Actores:** la persona; worker de privacidad resuelve.
- **RLS:** `person_id = access_control.person()`.
- **Consultas:** `(person_id, status)`.
- **Índices:** compuesto + parcial abierto.
- **Retención:** evidencia del ejercicio del derecho.
- **Eventos:** `privacy.erasure_requested.v1`, `privacy.erasure_resolved.v1`.

### 7.12 `privacy.disposition_cases`

- **Propósito:** agrupa la resolución de una disposición por sujeto y origen.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `subject_person_id uuid` · `erasure_request_id uuid` (nullable) · `origin text` (`request`, `retention`, `closure`, `disconnection`, `expiry`) · `status text` (`open`, `closed`) · `opened_at timestamptz` · `closed_at timestamptz` (nullable).
- **FKs y borrado:** `subject_person_id → identity.people(id) RESTRICT`; FK compuesta opcional `(erasure_request_id, subject_person_id) → erasure_requests(id, person_id) RESTRICT` (`IX-26`).
- **Uniques y checks:** clave portadora `UNIQUE (id, subject_person_id)`.
- **Actores:** worker de privacidad; la persona ve estado; soporte ve metadatos.
- **RLS:** `subject_person_id = access_control.person()` para la persona; worker por rol.
- **Consultas:** `(subject_person_id, status)`.
- **Índices:** `(subject_person_id, status)`.
- **Retención:** auditoría.
- **Eventos:** `privacy.disposition_case_opened.v1`.
- **Implementado (`HU-SP-027`):** suma `requested_by_person_id uuid` (nullable, `→ identity.people(id) RESTRICT`): un caso con origen `request` nombra a quien lo pidió y hoy sólo lo pide el propio sujeto (`CHECK`). `CHECK (status = 'closed') = (closed_at is not null)`. `erasure_request_id` y su FK llegan con `privacy.erasure_requests`. `privacy.disposition_case_guard_tg` impide borrar un caso, reabrir uno cerrado o cambiar su sujeto, origen, solicitante o apertura. El runtime no tiene privilegios: hoy sólo `identity.delete_body_progress` abre y cierra casos, en la misma transacción.

### 7.13 `privacy.disposition_items`

- **Propósito:** resuelve por categoría y target si eliminar, anonimizar o retener; target polimórfico tipado.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `disposition_case_id uuid` · `subject_person_id uuid` · `data_classification_code text` · `retention_policy_id uuid` · `action privacy.disposition_action` · `status privacy.disposition_status` · `due_at timestamptz` · **targets nullable por tipo:** `target_execution_id`, `target_body_progress_id`, `target_health_context_id`, `target_profile_claim_id`, `target_access_account_id`, `target_nutrition_meal_id`, `target_nutrition_goal_set_id` (uno no nulo).
- **FKs y borrado:** `(disposition_case_id, subject_person_id) → disposition_cases(id, subject_person_id) ON DELETE CASCADE`; `retention_policy_id → retention_policies(id) RESTRICT`; cada `target_*` → su tabla `ON DELETE RESTRICT`.
- **Uniques y checks:** `CHECK (num_nonnulls(target_execution_id, target_body_progress_id, target_health_context_id, target_profile_claim_id, target_access_account_id, target_nutrition_meal_id, target_nutrition_goal_set_id) = 1)`; constraint trigger diferible `privacy.enforce_disposition_target_subject_ct` exige que el target pertenezca a `subject_person_id` (`IX-26`). Disponer una comida elimina su objeto saneado e hijos; disponer el goal set alcanza versiones, targets y decisiones, incluidos los visibles por `frozen`.
- **Actores:** worker de privacidad.
- **RLS:** vía el caso.
- **Consultas:** `(status, due_at)` para el barrido del worker.
- **Índices:** `(status, due_at)`; sobre cada `target_*`.
- **Retención:** auditoría de la disposición.
- **Eventos:** ninguno propio (los produce el evento de ejecución).
- **Implementado (`HU-SP-027`), con una desviación deliberada:** los targets entran por tipo a medida que su tabla existe; hoy sólo `target_body_progress_id`, acompañado de `target_kind text` (`body_progress`), `executed_at timestamptz` y `created_at timestamptz`. **Un ítem ejecutado con acción `delete` suelta su target:** el `CHECK` exige exactamente un target en cualquier otro estado y ninguno en ese. Con `ON DELETE RESTRICT` y «siempre uno no nulo», el borrado físico que el ítem existe para ejecutar sería imposible; así, un ítem pendiente retiene la fila y uno ejecutado conserva `target_kind` sin apuntar a una fila que ya no existe. `privacy.disposition_item_guard_tg` cubre `IX-26` (el target pertenece a `subject_person_id` y la política corresponde a la clasificación) y las transiciones (`pending → executed | suspended`, `suspended → pending | executed`; un ejecutado no se mueve, un target sólo cambia al soltarse y un ítem no se borra).
- **Segundo tipo de target (`HU-SP-028`):** `target_health_context_id` (`→ identity.health_context_claims(id) RESTRICT`, indexado) y `target_kind` en (`body_progress`, `health_context`). El `CHECK` exige que el target no nulo sea el de su tipo, y el guard exige la clasificación de ese tipo (`body` o `health`) y que el target sea del sujeto. El borrado a pedido del dueño es ahora una sola función, `privacy.dispose_on_owner_request(sujeto, clasificación, tipo, target)`: toma la política `owner_request` vigente de esa clasificación, abre el caso y el ítem, encola `privacy.disposition_case_opened.v1`, registra el evento, ejecuta el ítem soltando el target y cierra el caso. Quien la llama borra su propia fila en la misma transacción. El runtime no puede ejecutarla.
- **Tercer tipo de target (`HU-SP-070`):** `target_nutrition_meal_id` (`→ nutrition.meals(id) RESTRICT`, indexado), `target_kind` `nutrition_meal` y clasificación `nutrition`, con las mismas reglas que los otros dos.

### 7.14 `privacy.disposition_events`

- **Propósito:** ejecución append-only e idempotente de una disposición.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id uuid` · `executed_at timestamptz` (clave de partición derivada del UUIDv7) · `disposition_item_id uuid` · `action privacy.disposition_action` · `result text` · `actor text` (worker/job).
- **FKs y borrado:** `disposition_item_id → disposition_items(id) RESTRICT`; el particionamiento no elimina esta FK (`IX-26`).
- **Uniques y checks:** PK `(id,executed_at)`; rango mensual; `disposition_events_id_partition_time_chk` exige UUIDv7 y `executed_at=extensions.uuid_v7_timestamp(id)`. Append-only, entrada exclusiva `privacy.log_disposition_event`; el caller no aporta ID ni tiempo.
- **Actores:** worker de privacidad inserta; soporte lee metadatos.
- **RLS:** restringida a rol de privacidad y soporte.
- **Consultas:** `(disposition_item_id, executed_at)`.
- **Índices:** `(disposition_item_id, executed_at)` por partición.
- **Retención:** auditoría prolongada.
- **Eventos:** `privacy.disposition_executed.v1`, `privacy.disposition_reapplied.v1`.
- **Implementado (`HU-SP-027`):** `result` en (`deleted`, `anonymized`, `retained`, `failed`) y `actor` en (`owner_request`, `privacy_worker`). La constraint de tiempo se llama `ck_disposition_events_time`, con el prefijo del repositorio. Particiones mensuales de 2026-09 a 2027-12 más una `default`, todas con RLS forzado. `privacy.reject_disposition_event_rewrite_tg` impide `UPDATE` y `DELETE`, también al dueño. Todavía no emite eventos de outbox: el borrado propio se ejecuta en la misma transacción que abre el caso, y ese caso ya emite `privacy.disposition_case_opened.v1`.

### 7.15 `privacy.legal_holds`

- **Propósito:** suspende la disposición de ítems concretos; alcance, motivo y vigencia obligatorios.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `scope_description text` · `reason text` · `valid_from timestamptz` · `valid_to timestamptz` · `status text` (`active`, `released`) · `created_by text` · `released_at timestamptz` (nullable).
- **FKs y borrado:** ninguna saliente.
- **Uniques y checks:** `NOT NULL` en alcance, motivo y `valid_to`. No existe hold sin fin.
- **Actores:** soporte (`A10`).
- **RLS:** rol de soporte gestiona; la persona ve el hecho vía el ítem.
- **Consultas:** `(status, valid_to)`.
- **Índices:** `(status, valid_to)`.
- **Retención:** auditoría.
- **Eventos:** `privacy.legal_hold_applied.v1`, `privacy.legal_hold_released.v1`.
- **Implementado (`HU-BO-033`), con dos desviaciones deliberadas:** `created_by text` quedó como
  `applied_by_person_id uuid` resuelto de la sesión —un nombre escrito a mano no se puede
  verificar y es en sí mismo dato personal—, y `reason` quedó como `reason_code` sobre lista
  cerrada (`judicial_order`, `regulatory_request`, `service_dispute`,
  `tax_or_accounting_obligation`), que es lo que pide el criterio 5. Suma `case_reference` (la
  orden o requerimiento que sustenta el hold) y `released_by_person_id`. Un trigger impide
  borrar la fila: un hold es evidencia.

### 7.16 `privacy.hold_applications`

- **Propósito:** aplica un hold a un `disposition_item` concreto.
- **Dominio / fuente de verdad:** Privacidad.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `legal_hold_id uuid` · `disposition_item_id uuid` · `status text` (`active`, `released`) · `applied_at timestamptz`.
- **FKs y borrado:** `legal_hold_id → legal_holds(id) RESTRICT`; `disposition_item_id → disposition_items(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE parcial (disposition_item_id) WHERE status='active'` (un hold vigente por ítem).
- **Actores:** soporte.
- **RLS:** rol de soporte; la persona ve el hecho.
- **Consultas:** `(disposition_item_id, status)`, `(legal_hold_id, status)`.
- **Índices:** ambos compuestos.
- **Retención:** auditoría.
- **Eventos:** ninguno propio.
- **Implementado (`HU-BO-033`):** el parcial único `uidx_hold_applications_active` sostiene un
  hold vigente por ítem, porque dos harían ambigua la liberación. Suma `released_at`. Liberar
  devuelve el ítem a `pending` y a nada más: ejecutar la eliminación de alguien no es decisión
  de quien revisa.

---

### 7.17 `privacy.binary_disposals` — retirada

Existió el 18 y el 19 de septiembre de 2026 para probar la destrucción de un binario
personal, primero como recibo y después también como cola del borrado en el bucket. La
segunda revisión de `ADR-031` retiró la fotografía personal entera, así que la tabla se
quedó sin un solo escritor y `ADR-021` prohíbe dejarla puesta por si acaso.

El registro de la retención programada sigue siendo `privacy.disposition_events` (§7.14),
que nunca tuvo modelo físico y sigue esperando a `DB-P5-015`. Si algún día vuelve un
binario personal —la foto de comida y el progreso corporal conservan su contrato en la
baseline—, esta ficha y `ADR-031` son el punto de partida.

## 8. Schema `catalog`

Salvo indicación, todas las tablas de catálogo tienen **clasificación `operational`**, **RLS de lectura autenticada** para contenido `global` publicado (el contenido `organization`/`person` se restringe a su owner) y **retención permanente** salvo archivado.

### 8.1 `catalog.disciplines`

- **Propósito:** familia global de actividad con código estable.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de las disciplinas globales publicadas por la plataforma.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` · `name text` · `status catalog.publication_status`.
- **FKs y borrado:** ninguna saliente; es una raíz de catálogo y las referencias entrantes usan `ON DELETE RESTRICT`.
- **Uniques y checks:** `UNIQUE code`.
- **Actores:** lectura autenticada; escritura curaduría (`A11` con `curate_global_catalog`) por `catalog.publish_discipline` y `catalog.archive_discipline` (`OP-CAT-004`, `OP-CAT-005`). `catalog.list_global_catalog` es la única lectura que devuelve borradores y archivadas (`NEW-CAT-GLOBAL-PUBLISH`, `HU-BO-022`).
- **RLS:** lectura autenticada solo para filas `status='published'`; escritura exclusiva de la plataforma por la función de publicación. Backoffice la lee en `/backoffice/v1/catalog/disciplines` por `catalog.list_disciplines()`, cerrada tras `catalog.require_catalog_reader()`, que exige una persona autenticada **y activa**: el catálogo es global, no público. Las policies `disciplines_select_platform`, `disciplines_insert_platform` y `disciplines_update_platform` habilitan la curaduría sólo cuando el actor es `support`.
- **Consultas / índices:** por `code`; único `code`; `(status)` para la policy de publicación.
- **Retención:** permanente; una disciplina referenciada se depreca o archiva, no se elimina.
- **Eventos:** ninguno.

### 8.2 `catalog.activity_types`

- **Propósito:** clase concreta de actividad; determina contratos y estructuras compatibles.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de los tipos de actividad globales o privados de una organización.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `discipline_code text` · `code text` · `name text` · `content_scope catalog.content_scope` · `owner_organization_id uuid` (nullable) · `status catalog.publication_status`.
- **FKs y borrado:** `discipline_code → disciplines(code) RESTRICT`; `owner_organization_id → organizations.organizations(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (code)` para globales; `CHECK (content_scope='global') = (owner_organization_id is null)`.
- **Actores:** personas autenticadas leen tipos globales publicados; miembros autorizados leen contenido de su organización; solo plataforma o owner organizacional autorizado escriben según `content_scope`. La curaduría global (`OP-CAT-004`, `OP-CAT-005`) publica y archiva únicamente filas `global`, sin dueño, y `trg_activity_types_before_delete_global` rechaza (`55000`) borrar una de ellas: archivar retira de la búsqueda y conserva lo que ya la referenciaba (`HU-BO-022`, criterio 3).
- **RLS:** `global` publicado abierto; privado solo a su organización. `activity_types_all_platform` añade la curaduría: actor `support` y `content_scope = 'global'` sin dueño, nunca contenido de un gimnasio.
- **Consultas / índices:** `(content_scope, owner_organization_id, status)`; `(content_scope, discipline_code, status)`.
- **Retención:** permanente para globales; el contenido organizacional se archiva y sigue la disposición de su organización cuando no está referenciado.
- **Eventos:** ninguno propio.

### 8.3 `catalog.activity_type_aliases`

- **Propósito:** nombre alternativo o traducción; no crea otro tipo.
- **Dominio / fuente de verdad:** Catálogo. La fuente de verdad continúa siendo el `activity_type` padre.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `activity_type_id uuid` · `locale text` · `name text`.
- **FKs y borrado:** `activity_type_id → activity_types(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (activity_type_id, locale)`.
- **Actores:** los mismos actores autorizados sobre el tipo de actividad padre.
- **RLS:** hereda visibilidad y escritura del padre mediante `activity_type_id → activity_types(id)`.
- **Consultas / índices:** por `activity_type_id`.
- **Retención:** se elimina con el tipo de actividad padre.
- **Eventos:** ninguno.

### 8.4 `catalog.movements`

- **Propósito:** acción o técnica reutilizable y opcional; global, personal u organizacional.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de la identidad y ownership de cada movimiento.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `discipline_code text` · `name text` · `normalized_name text` · `content_scope catalog.content_scope` · `owner_organization_id uuid` (nullable) · `owner_person_id uuid` (nullable) · `successor_movement_id uuid` (nullable) · `status catalog.publication_status`.
- **FKs y borrado:** `discipline_code → disciplines(code) RESTRICT`; `owner_organization_id → organizations.organizations(id) RESTRICT`; `owner_person_id → identity.people(id) RESTRICT`; `successor_movement_id → movements(id) RESTRICT`.
- **Uniques y checks:** `CHECK` de un solo owner según `content_scope`; `UNIQUE parcial (owner_organization_id, normalized_name) WHERE content_scope='organization'`; `uidx_movements_global_name`, único parcial sobre `normalized_name WHERE content_scope='global'`: dos movimientos globales con el mismo nombre son el mismo escrito dos veces (`HU-BO-022`).
- **Actores:** lectura autenticada de globales publicados; owner personal u organización con membresía vigente leen/escriben su contenido; la plataforma publica y archiva globales (`OP-CAT-004`, `OP-CAT-005`), y `trg_movements_before_delete_global` rechaza (`55000`) borrar uno.
- **RLS:** `global` abierto; `organization` solo a su organización con membresía; `person` solo a su dueño. `movements_all_platform` añade la curaduría: actor `support` y `content_scope = 'global'` sin dueño.
- **Consultas / índices:** `(content_scope, owner_organization_id, status)`; `(content_scope, discipline_code, status)`; índice sobre `normalized_name`.
- **Retención:** archivado, no borrado, si está referenciado.
- **Eventos:** `catalog.private_movement_created.v1`, `catalog.private_movement_updated.v1`, `catalog.private_movement_archived.v1`.

### 8.5 `catalog.movement_aliases`

- **Propósito:** nombre alternativo o traducción de un movimiento.
- **Dominio / fuente de verdad:** Catálogo. La fuente de verdad continúa siendo el movimiento padre.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `movement_id uuid` · `locale text` · `name text`.
- **FKs y borrado:** `movement_id → movements(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (movement_id, locale, name)`.
- **Actores:** los mismos actores autorizados sobre el movimiento padre.
- **RLS:** hereda visibilidad y escritura del padre mediante `movement_id → movements(id)`.
- **Consultas / índices:** por `movement_id`.
- **Retención:** se elimina con el movimiento padre.
- **Eventos:** ninguno.

### 8.6 `catalog.movement_variants`

- **Propósito:** relación curatorial base↔variante; conserva procedencia sin sobrescribir.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de las relaciones curatoriales entre movimientos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `base_movement_id uuid` · `variant_movement_id uuid` · `relation text` · `note text` (nullable).
- **FKs y borrado:** ambos `→ movements(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (base_movement_id, variant_movement_id)`; `CHECK (base_movement_id <> variant_movement_id)`.
- **Actores:** lectura para quien pueda leer ambos movimientos; escritura de plataforma o del owner autorizado de ambos movimientos privados.
- **RLS:** exige visibilidad sobre `base_movement_id` y `variant_movement_id`; no amplía la visibilidad de ninguno.
- **Consultas / índices:** por `base_movement_id`.
- **Retención:** permanece mientras cualquiera de los movimientos esté referenciado; se elimina solo al retirar ambos sin referencias.
- **Eventos:** ninguno.

`relation` dice **qué tipo** de relación es; `note` dice **por qué le importa a quien
lee**, en una frase — «más pectoral superior», «menos técnica». Son cosas distintas y
por eso son dos columnas: un código no se muestra y una frase no se consulta.

### 8.7 `catalog.equipment`

- **Propósito:** recurso físico compatible o requerido; no inventario ni reservas.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad del equipamiento reutilizable global o de una organización.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` (nullable para privado) · `name text` · `content_scope catalog.content_scope` · `owner_organization_id uuid` (nullable).
- **FKs y borrado:** `owner_organization_id → organizations.organizations(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE code` para globales.
- **Actores:** lectura autenticada de globales; miembros autorizados leen contenido de su organización; plataforma u owner organizacional autorizado escriben según `content_scope`.
- **RLS:** `global` publicado abierto; `organization` solo para membresías vigentes de `owner_organization_id`.
- **Consultas / índices:** `(content_scope, owner_organization_id)`; nombre normalizado.
- **Retención:** permanente para globales; el contenido organizacional se archiva y sigue la disposición de su organización cuando no está referenciado.
- **Eventos:** ninguno.

### 8.8 `catalog.movement_equipment`

- **Propósito:** compatibilidad N:M movimiento↔equipamiento.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de la compatibilidad entre un movimiento y su equipamiento.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `movement_id uuid` · `equipment_id uuid` · `requirement text` (`required`, `optional`).
- **FKs y borrado:** `movement_id → movements(id) ON DELETE CASCADE`; `equipment_id → equipment(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (movement_id, equipment_id)`.
- **Actores:** los actores autorizados para administrar el movimiento; lectura solo si movimiento y equipamiento son visibles.
- **RLS:** hereda del movimiento mediante `movement_id`; además exige visibilidad del `equipment_id` asociado.
- **Consultas / índices:** por `movement_id`.
- **Retención:** se elimina con el movimiento padre; una referencia histórica publicada conserva el movimiento y, por tanto, la asociación.
- **Eventos:** ninguno.

### 8.9 `catalog.units`

- **Propósito:** código y conversión dentro de una dimensión; unidad canónica por dimensión.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de unidades y factores de conversión V1.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` · `dimension text` (peso, distancia, tiempo…) · `is_canonical boolean` · `to_canonical_factor numeric`.
- **FKs y borrado:** ninguna saliente; las referencias entrantes usan `ON DELETE RESTRICT`.
- **Uniques y checks:** `UNIQUE code`; `UNIQUE parcial (dimension) WHERE is_canonical`.
- **Miembros V1.** Curados el 24 de agosto de 2026 con `HU-SP-011`, que es la primera pantalla que necesita unidades reales: dimensión `mass` con `kg` canónica y `lb` a `0.45359237`; dimensión `length` con `cm` canónica y `in` a `2.54`. Nutrición (`ADR-027`, `ADR-041`) suma `kcal` (energía, canónica), `g` a `0.001`, `mg` a `0.000001`, `mcg` a `0.000000001` y `oz` a `0.028349523125` en `mass`, y `ml` (canónica), `l` a `1000` y `fl_oz` a `29.5735` en `volume`. La taza y la cucharada no son unidades: son porciones de cada alimento, porque una taza de arroz y una de leche no pesan lo mismo. Las filas `test_*` de `seed.sql` son sintéticas y producción no las carga.
- **Actores:** lectura autenticada; escritura exclusiva de curaduría de plataforma.
- **RLS:** lectura autenticada; sin escritura de runtime salvo función de curaduría. **El esquema no lo cumplía**: hasta el 24 de agosto de 2026 la única política era `to allfit_owner` y no había `grant` para el rol de runtime, así que Space no podía leer el catálogo que sus propias pantallas necesitan. Corregido al construir `HU-SP-011`; no es un cambio de norma sino ponerse en conformidad con ella.
- **Consultas / índices:** por `code`; por `dimension`.
- **Retención:** permanente; una unidad referenciada no se elimina.
- **Eventos:** ninguno.
- **Sembrado por el progreso corporal:** `kg` (canónica) y `lb` en `mass`, `m` (canónica), `cm` e `in` en `length`, y `percent` (canónica) en `ratio`. Es SI donde lo hay: una cintura se guarda en metros para que la longitud tenga una sola unidad canónica, sea una cintura o una carrera.
- **Sembrado por las comidas:** `g` en `mass` (factor 0,001), `kcal` (canónica) en `energy` y `ml` (canónica) en `volume`.

### 8.10 `catalog.result_contracts`

- **Propósito:** contrato publicado/versionado de envelope, mínimos y detalle por nivel de completitud.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de los contratos versionados de resultados.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `contract_code text` · `version_number integer` · `activity_family text` · `contract_schema_version smallint` (`1`) · `envelope jsonb` · `minimums jsonb` · `status catalog.publication_status` · `published_at timestamptz`.
- **FKs y borrado:** ninguna saliente; asociaciones y ejecuciones lo referencian con `ON DELETE RESTRICT`.
- **Uniques y checks:** `UNIQUE (contract_code, version_number)`; inmutable. Los JSONB `envelope`/`minimums` describen la regla del contrato, no datos de negocio consultables por campo.
- **Actores:** lectura autenticada; escritura curaduría.
- **RLS:** lectura autenticada de contratos publicados; publicación exclusiva de plataforma y sin `UPDATE`/`DELETE` de versiones publicadas, garantizado por `catalog.prevent_published_result_contract_mutation` (`errcode 55000`). `catalog.publish_result_contract` y `catalog.deprecate_result_contract` son las únicas escrituras; el número de versión lo asigna el servidor, nunca el cliente.
- **Consultas / índices:** por `(contract_code, version_number)`. `minimums` es un documento opaco: puede organizarse por nivel de completitud (`partial`, `summary`, `detailed`, `sensor_enriched`), pero **hoy nada lo valida** — ni el esquema, ni `publish_result_contract`, ni la pantalla de curaduría. Queda a cargo de quien publica.
- **Retención:** permanente (ejecuciones lo congelan).
- **Eventos:** `catalog.result_contract_published.v1`.

### 8.11 `catalog.activity_type_result_contracts`

- **Propósito:** asociación vigente/default entre actividad y contrato; congela compatibilidad.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de la compatibilidad versionada entre tipo de actividad y contrato.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `activity_type_id uuid` · `result_contract_id uuid` · `is_default boolean` · `valid_from timestamptz` · `valid_to timestamptz` (nullable).
- **FKs y borrado:** `activity_type_id → activity_types(id) RESTRICT`; `result_contract_id → result_contracts(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE parcial (activity_type_id) WHERE is_default AND valid_to is null`.
- **Actores:** lectura para quien pueda leer el tipo de actividad; escritura exclusiva de curaduría de plataforma.
- **RLS:** hereda la visibilidad de `activity_types`; solo permite asociar contratos publicados y escritura de plataforma. La lectura efectiva escondía la fila en cuanto pasaba `valid_to`, y PostgreSQL exige que una fila actualizada siga siendo visible, así que cerrar una asociación fallaba: lo resuelve `activity_type_result_contracts_select_platform`, acotada a `access_control.actor_kind() = 'support'`. La política del actor de producto no se tocó.
- **Consultas / índices:** por `activity_type_id`. Backoffice la lee en `/backoffice/v1/catalog/activity-types/{id}/result-contracts` por `catalog.list_activity_type_result_contracts(uuid)`, que devuelve **solo asociaciones vigentes**: una superseded conserva su ventana para las ejecuciones congeladas bajo ella, pero no se ofrece para un borrador nuevo.
- **Retención:** historial permanente de vigencias; una asociación deja de ser efectiva con `valid_to`, no se sobrescribe.
- **Eventos:** ninguno propio.

### 8.12 `catalog.contract_fixtures`

- **Propósito:** caso válido o inválido de la suite contractual; `sensor_enriched` usa fixtures, no conectores.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de los fixtures que demuestran cada contrato publicado.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `result_contract_id uuid` · `kind text` (`valid`, `invalid`) · `payload_schema_version smallint` (`1`) · `payload jsonb` · `expected text`.
- **FKs y borrado:** `result_contract_id → result_contracts(id) ON DELETE CASCADE`.
- **Uniques y checks:** al publicar un contrato debe existir ≥1 `valid` y ≥1 `invalid` (validado en `OP-CAT-006`).
- **Actores:** lectura y escritura de curaduría, CI y validadores internos; sin acceso desde Space u Studio.
- **RLS:** sin acceso de runtime de producto; únicamente plataforma/CI mediante rol dedicado y contrato publicado.
- **Consultas / índices:** por `result_contract_id`.
- **Retención:** se elimina con el contrato no publicado; fixtures de contratos publicados se conservan permanentemente para reproducibilidad.
- **Eventos:** ninguno.

### 8.13 `catalog.professional_specialties`

- **Propósito:** catálogo global gobernado de especialidades que una persona puede declarar en su perfil profesional.
- **Dominio / fuente de verdad:** Catálogo.
- **Clasificación:** `operational`.
- **Columnas:** `code text` · `name text` · `description text` (nullable) · `status catalog.publication_status` · `display_order integer`.
- **Uniques y checks:** `PRIMARY KEY code`; nombre no vacío; orden no negativo.
- **Actores:** lectura autenticada de publicados; escritura solo `A11/curate_global_catalog`.
- **RLS:** autenticados leen `status='published'`; runtime de producto no escribe.
- **Consultas / índices:** `(status, display_order, code)`.
- **Retención:** permanente; deprecar evita nuevas selecciones y conserva referencias existentes.
- **Eventos:** ninguno.

### 8.14 `catalog.professional_credential_types`

- **Propósito:** catálogo global gobernado de tipos de credencial que una persona puede declarar en su perfil profesional.
- **Dominio / fuente de verdad:** Catálogo.
- **Clasificación:** `operational`.
- **Columnas:** `code text` · `name text` · `description text` (nullable) · `status catalog.publication_status` · `display_order integer`.
- **Uniques y checks:** `PRIMARY KEY code`; nombre no vacío; orden no negativo.
- **Actores:** lectura autenticada de publicados; escritura solo `A11/curate_global_catalog`.
- **RLS:** autenticados leen `status='published'`; runtime de producto no escribe.
- **Consultas / índices:** `(status, display_order, code)`.
- **Retención:** permanente; deprecar evita nuevas declaraciones y conserva referencias existentes.
- **Eventos:** ninguno.

### 8.15 `catalog.muscles`

- **Propósito:** taxonomía global de músculos y regiones contra la que se etiqueta un movimiento, para que la persona pueda buscar por lo que quiere trabajar.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad del vocabulario muscular del producto.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` · `name text` · `region text` (`upper`, `lower`, `general`) · `body_slug text` (nullable) · `status catalog.publication_status` · `display_order integer`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `UNIQUE code`; código con la forma de los demás códigos de catálogo; nombre no vacío; orden no negativo.
- **Actores:** lectura autenticada de publicados; escritura solo `A11/curate_global_catalog`.
- **RLS:** autenticados leen `status='published'`; el runtime de producto no escribe.
- **Consultas / índices:** `(status, display_order, code)`.
- **Retención:** permanente; deprecar retira un músculo de las búsquedas y conserva las etiquetas existentes.
- **Eventos:** ninguno.

`body_slug` es el puente con la figura del cuerpo que Space ya dibuja en su
onboarding: es **la parte que representa al músculo**, no necesariamente la que
es exactamente él. La figura no tiene dorsal propio, así que toma la forma más
cercana —la espalda superior— y la comparte con el músculo que la posee. Una
parte puede por tanto encender dos músculos a la vez, y eso es lo honesto: el
dibujo no los distingue, y fingir lo contrario dejándolo sin parte hacía que
elegirlo pareciera roto.

**Un músculo sin forma aproximadamente correcta no entra al vocabulario.** El
abductor se probó sobre el glúteo y se leyó como otro músculo; un vocabulario de
producto no puede contener una palabra que la interfaz responde mal.

Es nullable porque no todo lo que se filtra es una parte dibujable: `cardio` y
`cuerpo completo` etiquetan los movimientos que no son de fuerza, y sin ellos
esos movimientos no tendrían ninguna etiqueta.

`region` existe para agrupar las fichas del filtro en dos bloques legibles, que
es como se lee una lista de diecinueve.

### 8.16 `catalog.movement_muscles`

- **Propósito:** qué trabaja un movimiento, N:M contra la taxonomía.
- **Dominio / fuente de verdad:** Catálogo. Es la fuente de verdad de la relación entre un movimiento y los músculos que entrena.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `movement_id uuid` · `muscle_id uuid` · `is_primary boolean`.
- **FKs y borrado:** `movement_id → movements(id) ON DELETE CASCADE`; `muscle_id → muscles(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (movement_id, muscle_id)`.
- **Actores:** los actores autorizados para administrar el movimiento; lectura solo si movimiento y músculo son visibles.
- **RLS:** hereda del movimiento mediante `movement_id`; además exige visibilidad del `muscle_id` asociado.
- **Consultas / índices:** por `movement_id`; por `muscle_id` para el filtro inverso.
- **Retención:** se elimina con el movimiento padre.
- **Eventos:** ninguno.

`is_primary` distingue lo que un movimiento entrena de lo que además usa: una
sentadilla es cuádriceps y glúteos como principal y espalda baja como
acompañante. El filtro devuelve ambos, porque quien busca «glúteos» quiere la
sentadilla; el orden puede preferir lo principal.

### 8.17 `catalog.movement_instructions`

- **Propósito:** cómo se ejecuta un movimiento, paso a paso y en orden.
- **Dominio / fuente de verdad:** Catálogo. La fuente de verdad sigue siendo el movimiento padre.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `movement_id uuid` · `locale text` · `position integer` · `text text`.
- **FKs y borrado:** `movement_id → movements(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (movement_id, locale, position)`; posición positiva; texto no vacío.
- **Actores:** los mismos actores autorizados sobre el movimiento padre.
- **RLS:** hereda visibilidad y escritura del padre mediante `movement_id → movements(id)`.
- **Consultas / índices:** por `(movement_id, locale, position)`, que es también el orden en que se leen.
- **Retención:** se elimina con el movimiento padre.
- **Eventos:** ninguno.

**Esto es instrucción de ejercicio, y eso tiene consecuencias.** Un paso mal escrito
no es una errata: es alguien cargando mal la espalda. El texto se cura como el resto
del catálogo global —solo Allfit lo publica— y **no se publica sin revisión de
alguien con criterio técnico**. El control es la revisión del cambio, no una columna
de estado: un `status` aquí solo movería la pregunta de sitio.

`position` ordena y `locale` separa idiomas, de modo que traducir es añadir filas y
nunca reescribir las que ya se leyeron.

### 8.18 `catalog.movement_media`

- **Propósito:** la demostración visual de un movimiento, para quien no lo conoce y no puede deducirlo del nombre.
- **Dominio / fuente de verdad:** Catálogo. La fuente de verdad sigue siendo el movimiento padre; el binario vive fuera de la base.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `movement_id uuid` · `kind text` · `object_key text` · `content_type text` · `width integer` · `height integer` · `byte_size integer` · `checksum text`.
- **FKs y borrado:** `movement_id → movements(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (movement_id, kind)`; `kind` en un conjunto cerrado (`demo`); clave de objeto y checksum no vacíos; tipo de contenido de imagen; dimensiones y tamaño positivos.
- **Actores:** los mismos actores autorizados sobre el movimiento padre.
- **RLS:** hereda visibilidad del padre mediante `movement_id → movements(id)`. Escritura solo de curaduría, como el resto del catálogo global.
- **Consultas / índices:** por `movement_id`, que es como se proyecta.
- **Retención:** se elimina con el movimiento padre; el objeto se retira aparte.
- **Eventos:** ninguno.

**La base guarda la clave, no la URL.** Una URL absoluta almacenada ata el contenido
al origen que lo servía el día que se escribió: cambiar de proveedor obligaría a
migrar filas. La API compone la dirección desde configuración al proyectar, así que
mudar el origen es una variable de entorno.

**Tampoco guarda el binario.** Una demostración es idéntica para todo el mundo,
inmutable y grande; sirve desde un CDN con caché largo, no desde una fila. Esto la
separa deliberadamente de la foto de comida, que es dato personal y por eso **sí** pasa
por un endpoint que reevalúa autorización en cada petición: allí el control es la
autorización, aquí es la inmutabilidad.

**El `checksum` es lo que hace reproducible la curaduría.** Dice qué bytes se
revisaron; si el objeto del almacén no coincide, alguien cambió el contenido sin pasar
por la revisión del cambio.

Un movimiento sin fila aquí no es un error: es el estado normal de un catálogo que
crece, y el producto dibuja la figura del cuerpo en su lugar.

---

## 9. Schema `planning`

### 9.1 `planning.session_templates`

- **Propósito:** identidad estable de una plantilla de sesión; borradores y versiones no se mezclan.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad de la identidad y ownership estable de cada plantilla.
- **Clasificación:** `training`.
- **Columnas:** `id` · `content_scope catalog.content_scope` · `owner_organization_id uuid` (nullable) · `owner_person_id uuid` (nullable) · `author_person_id uuid` (nullable) · `discipline_code text` · `status catalog.publication_status`.
- **FKs y borrado:** owners → sus tablas `RESTRICT`; `discipline_code → catalog.disciplines(code) RESTRICT`.
- **Uniques y checks:** `CHECK` de un solo owner según `content_scope`, idéntico al de `catalog.movements`: `global` sin ningún owner, `organization` solo con organización, `person` solo con persona. `CHECK (author_person_id IS NULL) = (content_scope = 'global')` — el contenido global no lo firma una persona, lo publica la plataforma.
- **Actores:** owner del contexto; sin acceso entre organizaciones. El contenido `global` lo escribe solo la curaduría de plataforma.
- **RLS:** `content_scope = 'global'` **OR** owner org con membresía **OR** owner person.
- **Consultas / índices:** `(owner_organization_id, status)`, `(owner_person_id, status)`.
- **Retención:** con el owner.
- **Eventos:** `planning.session_template_created.v1`.

**`archived` tiene dos escritores y ninguno borra nada.** El primero es `OP-PLN-028`, que
descarta la plantilla porque la persona lo pidió. El segundo es `OP-PLN-034`: al eliminar
un programa, si la persona pide llevarse sus rutinas, se archivan **sólo las que ningún
otro programa no archivado suyo use**. Una rutina compartida se queda donde está, porque
archivarla dejaría al otro programa pidiendo una sesión que ya no existe, y `OP-PLN-028`
ya se niega a dejar un programa sin ninguna. El archivado colateral ocurre en sitio, en la
misma transacción del programa y sin pasar por `OP-PLN-028`, que lleva su propio recibo de
idempotencia.

### 9.2 `planning.session_template_drafts`

- **Propósito:** contenido editable de una plantilla; nunca referenciable por un programa.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del único borrador editable de la plantilla padre.
- **Clasificación:** `training`.
- **Columnas:** `id` · `template_id uuid` · `content_schema_version smallint` (`1`) · `content jsonb` · `updated_at timestamptz`. El contenido admite `title`, `activity_type_id` y `steps`; cualquier otra clave invalida el borrador entero. **`cover` salió el 19 de septiembre de 2026**: la portada la declara el programa (§9.9) y no la rutina, así que ya no es contenido de este borrador ni entra al hash canónico (`ADR-031`).
- **FKs y borrado:** `template_id → session_templates(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE template_id` (un borrador vivo por plantilla).
- **Actores:** owner personal u organizacional de la plantilla; ninguna persona asignada puede editar el borrador.
- **RLS:** vía la plantilla.
- **Consultas / índices:** por `template_id`.
- **Retención:** se reemplaza de forma controlada mientras es borrador y se elimina con la plantilla; publicar crea una versión inmutable separada.
- **Provenance (`derived_from_version_id`, as implemented).** Set when the draft is derived from a version (`OP-PLN-004`) and kept through every Studio edit. The next version published from the draft takes it, and the draft then drops it: from there it continues linearly from the version it just became. Until migration `20261103150000_organization_content_stays_in_the_organization.sql` an edit cleared it, so a variant almost never recorded its source.
- **Eventos:** `planning.session_template_draft_updated.v1`.

### 9.3 `planning.session_template_versions`

- **Propósito:** versión publicada, completa e inmutable de una plantilla.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad histórica de cada versión publicada de una plantilla.
- **Clasificación:** `training`.
- **Columnas:** `id` · `template_id uuid` · `version_number integer` · `discipline_code text` · `activity_type_id uuid` · `derived_from_version_id uuid` (nullable) · `title text` · `content_hash bytea` · `status catalog.publication_status` · `published_at timestamptz`.
- **FKs y borrado:** `template_id → session_templates(id) RESTRICT`; `activity_type_id → catalog.activity_types(id) RESTRICT`; `derived_from_version_id → session_template_versions(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (template_id, version_number)`; sin `UPDATE`/`DELETE` en runtime. **`content_hash` no es único por plantilla**: dos versiones pueden repetir contenido porque deshacer un cambio es una versión nueva y no un regreso a la anterior (`ADR-009`). La unicidad que hubo hasta el 18 de septiembre de 2026 obligaba a devolver la versión antigua, y su identificador viaja en semanas de programa que lo resolverían contra nada.
- **Actores:** el owner publica; owner y personas con asignaciones que la referencian leen; ningún runtime actualiza una versión publicada.
- **RLS:** owner del contexto, **OR** persona con asignación que la referencia.
- **Consultas / índices:** `(template_id, version_number)`, que sirve tanto la última versión publicada como la comparación de contenido al publicar. No hay índice por `content_hash`: nadie busca por él desde que la deduplicación mira sólo a la última versión.
- **Retención:** permanente si referenciada.
- **Eventos:** `planning.session_template_version_published.v1`, `planning.session_template_version_deprecated.v1`.

**Aquí no hay portada, y es deliberado.** Entre el 18 y el 19 de septiembre de 2026 esta
tabla llevó `cover_kind`, `cover_icon` y `cover_object_key`, y la clave `cover` viajaba en
el contenido del borrador y por tanto en el hash canónico. La tercera revisión de
`ADR-031` se lo llevó todo a `planning.programs` (§9.9): **la portada de una rutina no se
decide en la rutina**, porque quien escribe una rutina la mira sola y quien arma el
programa ve las seis juntas en el carrusel de la semana. Lo que cada rutina aporta —qué
músculos trabaja— ya está en sus pasos y no hace falta copiarlo aquí.

Que la portada saliera del contenido tiene una consecuencia declarada: **toda rutina que
llevara portada dice «cambios sin publicar» hasta que se publique una vez**, y es cierto,
porque su contenido cambió. Una rutina que no está en ningún programa no lleva portada y
se reconoce por su letra inicial.

### 9.4 `planning.planned_steps`

- **Propósito:** paso planificado de una versión de plantilla; movimiento opcional.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del orden y contenido estructural de los pasos de una versión.
- **Clasificación:** `training`.
- **Columnas:** `id` · `template_version_id uuid` · `position integer` · `movement_id uuid` (nullable) · `activity_type_id uuid` (nullable, más específico para híbrido) · `superset_group smallint` (nullable) · `notes text` (nullable).
- **FKs y borrado:** `template_version_id → session_template_versions(id) ON DELETE CASCADE`; `movement_id → catalog.movements(id) RESTRICT`; `activity_type_id → catalog.activity_types(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (template_version_id, position)`; `superset_group > 0` si existe. `planning.enforce_superset_contiguity_ct` exige que los pasos de un mismo grupo ocupen posiciones consecutivas (`IX-46`).
- **Actores:** los mismos actores con lectura de la versión; escritura solo durante la publicación atómica de la versión.
- **RLS:** vía la versión.
- **Consultas / índices:** por `template_version_id`.
- **Retención:** con la versión publicada; inmutable una vez publicada.
- **Eventos:** ninguno propio.

**`superset_group` encadena pasos contiguos**, no cualesquiera. Dos ejercicios en
superserie se hacen seguidos, sin descanso entre medias, y eso sólo tiene sentido si
están uno al lado del otro en la sesión: encadenar el primero con el quinto describiría
un orden que nadie puede ejecutar. Por eso es una columna con un trigger de
contigüidad y no una tabla de grupos — con la regla puesta, una tabla diría exactamente
lo mismo por más dinero. Nullable porque la mayoría de los pasos no está encadenada, y
un cero no significaría nada.

El descanso de una cadena es el del **último** paso del grupo, porque el descanso ocurre
al terminarla. Los de los pasos intermedios no se aplican; `ADR-030` lo fija.

### 9.5 `planning.strength_targets`

- **Propósito:** prescripción tipada de fuerza para un paso planificado.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del target de fuerza del paso.
- **Clasificación:** `training`.
- **Columnas:** `id` · `planned_step_id uuid` · `target_sets integer` · `target_reps integer` (nullable) · `target_load_value numeric` (nullable) · `target_load_unit_code text` (nullable) · `target_rpe numeric` (nullable) · `target_rest_seconds integer` (nullable).
- **`target_sets` y `target_reps` son resumen derivado, no autoría.** Desde `ADR-030` la
  verdad de una prescripción de fuerza son las filas de `planned_sets`; al publicar,
  `target_sets` es su conteo y `target_reps` existe sólo cuando todas las series
  coinciden. Se conserva para que la agenda, el día y la semana sigan leyendo lo que
  siempre leyeron, y ningún actor de runtime puede escribirlo a mano (`IX-47`).
- **`target_rest_seconds` es prescripción, no medición.** Es el descanso que el paso pide entre series, y quien entrena lo ve como referencia; lo que de verdad descansó no se registra en V1. Nullable porque un paso puede no decir nada al respecto, y un cero significaría «sin descanso», que es una instrucción distinta a «no se dijo».
- **FKs y borrado:** `planned_step_id → planned_steps(id) ON DELETE CASCADE`; `target_load_unit_code → catalog.units(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (planned_step_id)`; `target_sets > 0`; `target_reps > 0` si existe; load y unidad aparecen juntos y load es `>=0`; RPE entre 0 y 10; `target_rest_seconds` entre 0 y 3600 si existe. `planning.enforce_target_family_ct` exige familia `strength` (`IX-22`).
- **Actores:** los mismos de la versión de plantilla.
- **RLS:** `EXISTS` por `planned_step_id → session_template_versions → session_templates`.
- **Consultas / índices:** único `(planned_step_id)`.
- **Retención:** con la versión publicada; inmutable tras publicación.
- **Eventos:** ninguno propio.

### 9.6 `planning.endurance_targets`

- **Propósito:** prescripción tipada de distancia, duración o ritmo objetivo.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del target de endurance del paso.
- **Clasificación:** `training`.
- **Columnas:** `id` · `planned_step_id uuid` · `target_distance_value numeric` (nullable) · `target_distance_unit_code text` (nullable) · `target_duration_seconds numeric` (nullable) · `target_pace_seconds_per_unit numeric` (nullable) · `target_pace_unit_code text` (nullable).
- **FKs y borrado:** `planned_step_id → planned_steps(id) ON DELETE CASCADE`; ambas unidades `→ catalog.units(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (planned_step_id)`; al menos distancia o duración; cantidades `>0`; cada valor con unidad aparece en pareja. `planning.enforce_target_family_ct` exige familia `endurance` (`IX-22`).
- **Actores:** los mismos de la versión de plantilla.
- **RLS:** `EXISTS` por paso, versión y plantilla owner.
- **Consultas / índices:** único `(planned_step_id)`.
- **Retención:** con la versión publicada; inmutable tras publicación.
- **Eventos:** ninguno propio.

### 9.7 `planning.interval_targets`

- **Propósito:** prescripción tipada de rondas de trabajo/descanso.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del target de intervalos del paso.
- **Clasificación:** `training`.
- **Columnas:** `id` · `planned_step_id uuid` · `rounds integer` · `work_duration_seconds numeric` · `rest_duration_seconds numeric` (nullable) · `target_rpe numeric` (nullable).
- **FKs y borrado:** `planned_step_id → planned_steps(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (planned_step_id)`; `rounds > 0`; trabajo `>0`; descanso `>=0` si existe; RPE entre 0 y 10. `planning.enforce_target_family_ct` exige familia `interval` (`IX-22`).
- **Actores:** los mismos de la versión de plantilla.
- **RLS:** `EXISTS` por paso, versión y plantilla owner.
- **Consultas / índices:** único `(planned_step_id)`.
- **Retención:** con la versión publicada; inmutable tras publicación.
- **Eventos:** ninguno propio.

### 9.8 `planning.mobility_targets`

- **Propósito:** prescripción tipada de una posición de movilidad, por sostén o repeticiones.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del target de movilidad del paso.
- **Clasificación:** `training`.
- **Columnas:** `id` · `planned_step_id uuid` · `sequence_position integer` · `hold_duration_seconds numeric` (nullable) · `target_repetitions integer` (nullable) · `side text` (`left`, `right`, `bilateral`, `not_applicable`).
- **FKs y borrado:** `planned_step_id → planned_steps(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (planned_step_id)`; `sequence_position > 0`; al menos duración o repeticiones; ambas positivas si existen; side en catálogo cerrado. `planning.enforce_target_family_ct` exige familia `mobility` (`IX-22`).
- **Actores:** los mismos de la versión de plantilla.
- **RLS:** `EXISTS` por paso, versión y plantilla owner.
- **Consultas / índices:** único `(planned_step_id)`.
- **Retención:** con la versión publicada; inmutable tras publicación.
- **Eventos:** ninguno propio.

### 9.9 `planning.programs`

- **Propósito:** identidad estable de un programa.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad de la identidad y ownership estable de cada programa.
- **Clasificación:** `training`.
- **Columnas:** `id` · `content_scope catalog.content_scope` · `owner_organization_id uuid` (nullable) · `owner_person_id uuid` (nullable) · `author_person_id uuid` (nullable) · `routine_cover_kind planning.routine_cover` (nullable) · `routine_cover_icon planning.routine_cover_icon` (nullable) · `status catalog.publication_status`.
- **FKs y borrado:** owners → sus tablas `RESTRICT`.
- **Uniques y checks:** `CHECK` de un solo owner según `content_scope`, idéntico al de `catalog.movements`. `CHECK (author_person_id IS NULL) = (content_scope = 'global')`. `CHECK` de que `routine_cover_icon` existe **si y sólo si** `routine_cover_kind = 'icon'`: las otras dos clases se dibujan solas y un icono guardado bajo ellas sería un dato que nadie lee.
- **Actores:** owner personal u organización con membresía/capacidad vigente; sin acceso de otras organizaciones. El contenido `global` lo escribe solo la curaduría de plataforma y **cualquier persona autenticada lo lee**: es el catálogo que `OP-PLN-011` ya llamaba «global» al exigir «versión publicada y accesible para la persona: propia o global».
- **RLS:** `content_scope = 'global'` **OR** owner del contexto.
- **Consultas / índices:** `(owner_organization_id, status)`, `(owner_person_id, status)`.
- **Retención:** se archiva cuando deja de usarse; se conserva mientras una versión o asignación lo referencie.
- **Eventos:** `planning.program_created.v1`.

**Un programa que estuvo publicado ahora puede llegar a `archived`.** Hasta que existió
`OP-PLN-034` no podía: `OP-PLN-029` rechaza cualquier programa con una versión publicada,
de modo que `archived` era el final exclusivo de los borradores que nadie llegó a publicar
—y la lista de programas, que sólo enseña los publicados, enseñaba exactamente lo que no
se podía quitar—. Eliminar no destruye nada: el programa pasa a `archived`, sus versiones
a `deprecated` porque hay historial y sesiones que las apuntan, y la asignación personal
termina. `status` sigue siendo un estado del contenido y no un rastro de ejecución, y por
eso archivar aquí no toca ni una fila de lo entrenado.

**El estilo de portada de las rutinas vive aquí porque la decisión es del programa.** La
pantalla Hoy abre con las rutinas de la semana en un carrusel, una al lado de otra: si
cada rutina eligiera su propio estilo, esa fila mezclaría figuras de músculos, iconos y
fotografías y se leería como un muestrario en vez de como una semana. Quien escribe una
rutina la mira sola; quien arma el programa ve las seis juntas, y por eso decide él.
`routine_cover_kind` declara la clase para **todas** las rutinas del programa, y dentro de
la clase cada rutina pone lo suyo: `muscles` dibuja lo que esa rutina trabaja y `photo`
toma del catálogo la que corresponde a la región dominante de sus músculos. `icon` es el
único que se guarda, en `routine_cover_icon`, y es el mismo para todas — **un icono se
elige y no se calcula**, porque nada en los ejercicios dice cuál de los treinta y dos le
toca. Así el carrusel habla un idioma y aun así una tarjeta se distingue de la de al lado
sin leer el rótulo.

**Vive en la identidad del programa y no en `planning.program_versions` (§9.11)**, por la
misma razón que la portada del propio programa (§9.9.1): una versión publicada es inmutable
porque **es lo que alguien entrenó**, y cambiar cómo se ve una tarjeta no cambia lo que se
entrena. Vestir un programa (`OP-PLN-033`) surte efecto al momento y no acuña versión de
nada, igual que reordenar los programas (`OP-PLN-024`) no publica nada.

**Se hereda al bifurcar.** Tomar un programa de Allfit copia su estilo junto con sus
portadas (§9.9.1): si la copia las perdiera, seis tarjetas cambiarían de aspecto en el
mismo instante en que el programa pasa a ser tuyo, y eso no es tomar ese programa sino
otro. `IX-48` lo cubre desde el lado de la bifurcación.

**El prefijo `routine_` es deliberado.** La cara del programa en su propia tarjeta es otra
cosa y vive en otra tabla (§9.9.1). Dos nombres parecidos con sentidos distintos se
confunden a la primera, y el prefijo es lo único que los separa cuando alguien lee una
consulta en medio de un incidente.

**`cover_object_key` se retira de esta tabla.** Guardaba una sola clave de objeto porque
había una sola portada por programa; desde que el catálogo se fotografía por sexo declarado
hay un juego por audiencia, y una columna no puede llevar dos. Podría haberse quedado como
«la portada por defecto», y sería exactamente el error: dos verdades sobre la misma imagen,
una tabla que dice cuál le toca a cada quien y una columna que dice otra, y la garantía de
que un día se responde la que no era. La portada la responde ahora `planning.cover_for`
(§9.9.1) sin excepción, incluso para quien declinó decir su sexo. No queda ningún valor por
migrar que la tabla nueva no reciba: la clave que la columna llevaba es una de las
veinticuatro del juego que le corresponda.

**Es nullable porque la portada es opcional.** Nulo significa «no se dijo», no «vacío
elegido», y las rutinas del programa se reconocen entonces por su letra inicial, que es
como se reconocían antes de que la portada existiera. Lo mismo vale para una rutina que no
está en ningún programa: no hay nadie que haya declarado un estilo, así que no lleva
portada. Una rutina que está en varios programas se viste del **primero**, por el orden
que la persona ya eligió para sus programas.

**Dos vocabularios cerrados.** `planning.routine_cover` dice de qué clase es la portada
—`muscles`, `icon` o `photo`— y `planning.routine_cover_icon` enumera los iconos
disponibles. Nació con doce y hoy tiene treinta y dos; **se amplía por el final y nunca se
reordena ni se reutiliza un identificador**, porque un programa guardado con `strength`
tiene que seguir dibujando lo mismo dentro de un año. Qué orden usa la rejilla lo decide la
aplicación, no el enumerado. Los dos nacieron sirviendo a
`planning.session_template_versions` y sólo cambiaron de dueño con la tercera revisión de
`ADR-031`; el nombre `routine_cover` sigue siendo el correcto porque lo que describen es
cómo se ve una rutina, no cómo se ve un programa.

**Los iconos no son el catálogo de equipamiento.** Un icono dice de qué va el programa, no
con qué se hace: un programa de fondos en paralelas tiene derecho a la mancuerna, porque
la mancuerna ahí significa «fuerza». Por eso viven en `planning` y no en `catalog`, por
la misma razón que `planning.set_kind`: el catálogo guarda contenido que una persona
explora, y esto es cómo se presenta un programa que ya es suyo. Nadie lo busca ni lo
filtra, lo declara.

### 9.9.1 `planning.program_cover_photos`

- **Propósito:** la fotografía con la que un programa se presenta en el catálogo, una por cada juego de audiencia.
- **Dominio / fuente de verdad:** Planificación. La fuente de verdad sigue siendo el programa padre; el binario vive fuera de la base, igual que en `catalog.movement_media` (§8.18).
- **Clasificación:** `operational`. Es contenido curado, idéntico para todo el mundo dentro de su juego, y no dice nada de ninguna persona.
- **Columnas:** `program_id uuid` · `audience identity.biological_sex` · `object_key text` · `content_type text` · `width integer` · `height integer` · `byte_size integer` · `checksum text`.
- **FKs y borrado:** `program_id → programs(id) ON DELETE CASCADE`.
- **Uniques y checks:** `PRIMARY KEY (program_id, audience)`, que es también el único: un programa tiene una portada por juego y no dos. `audience` es `NOT NULL` por ser parte de la clave —**no hay un tercer valor y tampoco un nulo que signifique «mixto»**—; clave de objeto y checksum no vacíos; tipo de contenido de imagen; dimensiones y tamaño positivos.
- **Actores:** los mismos actores autorizados sobre el programa padre. Escritura solo de curaduría, como el resto del contenido `global`.
- **RLS:** hereda visibilidad del padre mediante `program_id → programs(id)`, que para el catálogo resuelve `content_scope = 'global'` y lo lee cualquier persona autenticada. `allfit_api` tiene `SELECT` y nada más.
- **Consultas / índices:** por la clave primaria `(program_id, audience)`, que es exactamente como se lee —un programa y un juego— y por `program_id` sola cuando la curaduría revisa el par completo. El único cubre las dos.
- **Retención:** se elimina con el programa padre; el objeto se retira aparte.
- **Eventos:** ninguno.

**Dos juegos y no tres.** `audience` toma los dos valores de `identity.biological_sex`
porque hay dos juegos de veinticuatro fotografías, y «mixto» **no es un tercero**: es lo
que se ve cuando el carrusel alterna entre los dos. Un tercer juego serían veinticuatro
imágenes más para decir lo mismo, y antes de encargarlas habría que resolver qué significa
«mixto» dentro de un solo encuadre —dos personas en el cuadro, o ninguna, o una a la que
nadie reconoce—, que es una pregunta sin buena respuesta y que el catálogo no necesita
hacerse. El enumerado del sexo declarado ya tiene exactamente los valores que la tabla
necesita, y por eso se reutiliza en lugar de inventar un vocabulario paralelo que habría
que mantener en paso con él.

**Quién elige es `planning.cover_for(p_program_id uuid, p_person_id uuid)`**, `stable`, y
no cuenta como tabla de dominio (§1): lee el sexo declarado de la persona y devuelve la
clave de su juego. Cuando la persona declinó —el nulo de `identity.people.biological_sex`,
que §4.1 define como una respuesta y no como una ausencia de respuesta— la función elige
entre los dos de forma determinista a partir del identificador del programa, de modo que
el catálogo sale mixto y **sale siempre igual**. Que sea determinista no es un detalle de
implementación: una portada sorteada en cada lectura sería una portada distinta cada vez
que se refresca la lista, y un catálogo que cambia de cara solo porque lo miraste dos veces
no se reconoce.

**Nada se guarda por persona y nada se registra.** Elegir una portada es **una lectura**:
no hay fila por persona, ni preferencia de imagen, ni traza de que alguien vio un juego u
otro. El sexo declarado ya es un hecho que la persona dio y que vive en `identity.people`;
esto lo **gasta**, no recoge nada nuevo. Por eso la clasificación es `operational` y no
`identity_pii`: la fila no habla de nadie, y quién la mira no deja rastro en ella. Tampoco
se le vuelve a preguntar a nadie: no existe una pregunta de portada, y quien declinó sigue
habiendo declinado.

**La base guarda la clave, no la URL**, por la misma razón que `movement_media` (§8.18):
una dirección absoluta ata el contenido al origen que lo servía el día que se escribió. La
clave sigue siendo el contenido —`programs/<program_id>/<sha256>.webp`, inmutable, y un
arte nuevo es una dirección nueva—, y la API compone la dirección al proyectar. El
`checksum` dice qué bytes se revisaron: si el objeto del almacén no coincide, alguien
cambió la portada sin pasar por la revisión del cambio.

**Es tabla y no columnas de `programs`.** Dos columnas paralelas —una por sexo— repetirían
seis veces los metadatos de la imagen y no sobrevivirían a la primera pregunta sobre
tamaños o formatos; una tabla hija con clave `(program_id, audience)` deja que el conjunto
crezca por filas y que la base garantice que no hay dos portadas para el mismo juego. Un
programa sin fila aquí no es un error de integridad sino un programa sin fotografiar
todavía, y la tarjeta se resuelve como se resolvía antes de que la fotografía existiera.

### 9.10 `planning.program_drafts`

- **Propósito:** composición editable de un programa.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del único borrador editable del programa padre.
- **Clasificación:** `training`.
- **Columnas:** `id` · `program_id uuid` · `content_schema_version smallint` (`1`) · `content jsonb`.
- **FKs y borrado:** `program_id → programs(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE program_id`.
- **Actores:** owner personal u organizacional del programa; ninguna persona asignada puede editar el borrador.
- **RLS:** vía el programa.
- **Consultas / índices:** por `program_id`.
- **Retención:** se reemplaza de forma controlada mientras es borrador y se elimina con el programa; publicar crea una versión inmutable separada.
- **Eventos:** `planning.program_draft_updated.v1`.

**Sobre `repeats_forever` en el borrador.** El `content` puede traer la clave opcional
`repeats_forever` —booleana, y ausente significa `false`—, que es lo que quien edita
declara cuando su programa no tiene fecha de fin; la validación la admite en su lista
blanca y rechaza cualquier valor que no sea booleano. `content_schema_version` **sigue
siendo `1`**: una clave nueva, opcional y con valor por defecto no cambia la forma del
documento, y subir el número obligaría a migrar borradores que se leen exactamente igual
que ayer. Al publicar, la clave pasa a la columna homónima de la versión (`§9.11`).

### 9.11 `planning.program_versions`

- **Propósito:** versión publicada e inmutable de un programa.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad histórica de cada versión publicada del programa.
- **Clasificación:** `training`.
- **Columnas:** `id` · `program_id uuid` · `version_number integer` · `title text` · `notes text` (nullable) · `repeats_forever boolean` (`not null default false`) · `content_hash bytea` · `sex_affinity identity.biological_sex` (nullable) · `status catalog.publication_status` · `published_at timestamptz`.
- **FKs y borrado:** `program_id → programs(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (program_id, version_number)`; inmutable. **`content_hash` no es único por programa**, por la misma razón que en `§9.3`: publicar una composición idéntica a una versión anterior crea la siguiente y no devuelve la vieja, cuyo identificador vive en asignaciones y sesiones planificadas.
- **Actores:** el owner publica; owner y personas con asignaciones que la referencian leen; ningún runtime actualiza una versión publicada.
- **RLS:** owner, **OR** persona asignada.
- **Consultas / índices:** `(program_id, version_number)`.
- **Retención:** permanente mientras esté referenciada por una asignación o forme parte del historial publicado.
- **Eventos:** `planning.program_version_published.v1`, `planning.program_version_deprecated.v1`.

**Sobre `repeats_forever`, que es lo único que dice si el programa termina.** Un programa
marcado así **no tiene fecha de fin**: cuando su composición se acaba, vuelve a empezar, y
es el valor por defecto de un programa nuevo en Space. La marca vive en la **versión** y no
en el programa porque cambia lo que se entrena —un bloque de ocho semanas con final y una
rutina sostenida son dos entrenamientos distintos aunque compartan hasta la última serie—,
y por esa misma razón `planning.canonical_program_content` la emite siempre y **entra en
el `content_hash`**: dos versiones que sólo difieren en ella no pueden compartir hash. La
contrapartida está declarada en `ADR-032`: como el canónico ganó una clave, la primera
republicación de un programa que ya existía acuña una versión aunque nadie haya tocado
nada. Lo que se repite es **la composición entera y no «una semana»**: al número de semanas
de la composición lo llamamos el ciclo, en Space suele valer uno porque se compone una
semana, y un bloque de cuatro de Studio da la vuelta como bloque. La semana de composición
que toca en la semana de programa `n` es `((n - 1) % ciclo) + 1`, que con ciclo uno es
«siempre la misma semana» sin ningún caso especial que escribir.

### 9.12 `planning.program_version_sessions`

- **Propósito:** composición: cada posición referencia una **versión exacta** de plantilla.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad de la composición inmutable de una versión de programa.
- **Clasificación:** `training`.
- **Columnas:** `id` · `program_version_id uuid` · `template_version_id uuid` · `position integer` · `week integer` · `day integer`.
- **FKs y borrado:** `program_version_id → program_versions(id) ON DELETE CASCADE`; `template_version_id → session_template_versions(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (program_version_id, position)`. Nunca resuelve "la última".
- **Actores:** los mismos actores con lectura de la versión de programa; escritura solo durante su publicación atómica.
- **RLS:** vía la versión de programa.
- **Consultas / índices:** por `program_version_id`.
- **Retención:** con la versión de programa; inmutable después de publicar.
- **Eventos:** ninguno propio.

### 9.13 `planning.program_assignments`

- **Propósito:** asignación de una versión a una persona; pertenece al historial personal.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del snapshot asignado, su origen y su ciclo de continuidad personal.
- **Clasificación:** `training`.
- **Columnas:** `id` · `person_id uuid` · `program_version_id uuid` · `origin_relationship_id uuid` (nullable) · `lifecycle planning.assignment_lifecycle` · `starts_on date` · `timezone text` · `assigned_at timestamptz`.
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `program_version_id → program_versions(id) RESTRICT`; FK compuesta opcional `(origin_relationship_id, person_id) → relationships.service_relationships(id, person_id) RESTRICT` (`IX-11`).
- **Uniques and checks:** carrier key `UNIQUE (id, person_id)`; `ck_program_assignments_managed_origin`: `active` and `detached_pending_choice` require `origin_relationship_id`. (An earlier revision listed `program_day` here; that column belongs to `planned_sessions`, §9.16.)
- **Actores:** la persona (autoasigna, decide continuidad); el coach con `contribute` (asigna, cancela).
- **RLS:** `person_id = access_control.person()` **OR** (`origin_relationship_id` visible **AND** grant `relationship_training`).
- **Consultas / índices:** `(person_id, lifecycle)`, `(origin_relationship_id, lifecycle)`.
- **Retención:** historial personal; se conserva al desacoplar.
- **Eventos:** `planning.assignment_created.v1`, `planning.assignment_detached.v1`, `planning.assignment_cancelled.v1`, `planning.assignment_continued.v1`, `planning.assignment_ended.v1`.

**`lifecycle = 'ended'` ya tiene quien lo escriba.** El valor estaba en el enumerado desde
el principio y hasta `OP-PLN-034` ninguna operación de Space lo ponía: eliminar un
programa propio termina la asignación personal que la persona se hizo sobre sus versiones.
Para quien usa la aplicación significa una cosa concreta y sólo esa: **el programa se va
de su biblioteca y de su agenda**, deja de aparecer entre los suyos y dejan de ofrecérsele
sus sesiones. No significa que se haya ido su historial. La asignación **no se borra** —el
grant de runtime no tiene `DELETE` sobre esta tabla y la columna `program_version_id`
sigue apuntando a una versión que existe—, porque es de dónde cuelga cada ejecución que la
persona hizo, y un entrenamiento tiene que poder explicarse después de que el programa que
lo pedía ya no esté. Terminar es distinto de cancelar: `cancelled` lo escribe quien
administraba desde una relación, y `ended` lo escribe la persona sobre lo suyo.

**Managed assignments, as implemented (STUDIO-39/40, migration `20261104090000_a_gym_assigns_a_program_through_the_relationship.sql`).** `ck_program_assignments_no_origin` is gone: an assignment created through `OP-PLN-010` carries `origin_relationship_id` and `lifecycle = 'active'`. The composite FK `fk_program_assignments_origin` keeps the origin on one of the person's own relationships, and `trg_program_assignments_before_update_origin` refuses changing the origin or the person afterwards, so a later relationship never inherits what an earlier one managed. A `personal` row may keep an origin once the person continues a detached program (`OP-PLN-015`, not built yet). Ending the relationship moves `active` to `detached_pending_choice`. `OP-PLN-014` (STUDIO-43) adds no `cancelled` lifecycle: it writes `ended` and closes the management period with `end_reason = 'cancelled'`, and Studio reads that pair as `status: cancelled`; the row stays. Row policies: the person reads her own (`_select_self`); the organization reads and inserts through `access_control.can_access(origin_relationship_id, 'relationship_training', level)` (`_select_managing`, `_insert_managing`, level `contribute` to insert); the contract scope `relationship_assignment` (keyed by person) lets the assigning command read her other assignments for zone, order and overlap; `relationship_detachment` (keyed by relationship) lets the detachment read and update them. `planned_sessions` inherit from a visible managed assignment. The person reads the program version she was given (`program_versions_select_assigned`) and the template versions planted for her (`session_template_versions_select_planned`), nothing else of the organization's catalogue. Space projections that list what to train include `active`, and `read_my_programs` returns `managed_by`, the managing organization's display name.

### 9.14 `planning.assignment_management_periods`

- **Propósito:** separa la gestión efectiva de la procedencia; un solo periodo vigente por asignación.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad de quién administró una asignación y durante qué intervalo.
- **Clasificación:** `training`.
- **Columnas:** `id` · `assignment_id uuid` · `person_id uuid` · `relationship_id uuid` · `started_at timestamptz` · `ended_at timestamptz` (nullable).
- **FKs y borrado:** `(assignment_id, person_id) → program_assignments(id, person_id) ON DELETE CASCADE`; `(relationship_id, person_id) → relationships.service_relationships(id, person_id) RESTRICT` (`IX-12`).
- **Uniques y checks:** `UNIQUE parcial (assignment_id) WHERE ended_at is null`.
- **Actores:** persona y profesionales de la relación leen según autorización; solo comandos de asignación, reasignación y terminación abren o cierran periodos.
- **RLS:** vía la asignación.
- **Consultas / índices:** `(assignment_id, ended_at)`.
- **Retención:** con la asignación como historial de gestión; un periodo cerrado no se elimina ni se reactiva.
- **Eventos:** ninguno propio.
- **As implemented (migration `20261104090000_a_gym_assigns_a_program_through_the_relationship.sql`).** Adds `end_reason` (`cancelled`, `relationship_ended`) with `ck_assignment_management_periods_end`: `ended_at` and `end_reason` are set together and `ended_at >= started_at`. Both FKs are `ON DELETE RESTRICT`, not `CASCADE`: assignments are never deleted. Indexes: `uidx_assignment_management_periods_open (assignment_id) WHERE ended_at IS NULL` and `idx_assignment_management_periods_relationship_open (relationship_id) WHERE ended_at IS NULL`. `trg_assignment_management_periods_before_change_close_only` allows only closing an open period; no update reopens one and no row is deleted. RLS is forced and the table has its own policies rather than inheriting: the person reads hers; the organization reads with `can_access(relationship_id, …, 'read')` and inserts an open period with `contribute`; the detachment scope reads and closes. Detachment closes the period at the relationship's `T`, or at `started_at` if that is later.

### 9.15 `planning.prescription_revisions`

- **Propósito:** adaptación personal de la prescripción sin editar plantilla ni programa publicados.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad de cada revisión personal aplicada sobre el snapshot asignado.
- **Clasificación:** `training`.
- **Columnas:** `id` · `assignment_id uuid` · `person_id uuid` · `planned_step_ref uuid` · `override_kind text` (`target_sets`, `target_reps`, `target_load`, `target_rpe`, `target_distance`, `target_duration`, `target_pace`, `rounds`, `work_duration`, `rest_duration`, `hold_duration`, `target_repetitions`, `side`, `notes`) · `value_numeric numeric` (nullable) · `value_integer integer` (nullable) · `value_text text` (nullable) · `value_boolean boolean` (nullable) · `unit_code text` (nullable) · `created_by_assignment_id uuid`.
- **FKs y borrado:** `(assignment_id, person_id) → program_assignments(id, person_id) ON DELETE CASCADE`; `(created_by_assignment_id, person_id) → relationships.relationship_professional_assignments(id, person_id) RESTRICT`; `planned_step_ref → planned_steps(id) RESTRICT`; `unit_code → catalog.units(code) RESTRICT` (`IX-13`).
- **Uniques y checks:** exactamente una columna `value_*` no nula; unidad solo con `value_numeric`. Constraint trigger `planning.enforce_prescription_override_ct` comprueba que el paso pertenece al snapshot asignado y que field, tipo y unidad corresponden a la tabla target efectiva.
- **Actores:** la persona sobre su asignación y el profesional con periodo de gestión, asignación efectiva y nivel `contribute`; append-only.
- **RLS:** vía la asignación + periodo de gestión vigente para escribir.
- **Consultas / índices:** por `assignment_id`.
- **Retención:** con la asignación; conserva autoría y valor histórico aun después de terminar la gestión profesional.
- **Eventos:** `planning.prescription_revised.v1`.
- **As implemented (migration `20261105090000_a_coach_manages_what_the_gym_assigned.sql`, STUDIO-42).** Deviations from the columns above: `planned_step_id` instead of `planned_step_ref`, with the FK named for it; **no `value_boolean`**, because none of the 14 kinds takes a boolean; `created_at timestamptz` added; and the assignment FK is `ON DELETE RESTRICT`, not `CASCADE`, because assignments are never deleted and a revision is history. `ck_prescription_revisions_kind` lists the 14 kinds. `ck_prescription_revisions_value` calls `planning.prescription_value_fits`, shared with the command: exactly one of `value_numeric`, `value_integer`, `value_text`; integers (`target_sets`, `target_reps`, `rounds`, `target_repetitions`) above zero; `target_load` zero or more and `target_distance`/`target_pace` above zero, all three with a unit; `target_rpe` from 0 to 10; durations in seconds without a unit (`rest_duration` may be zero); `side` one of `left`, `right`, `bilateral`, `not_applicable`; `notes` non-blank up to 2000 characters. The constraint trigger `trg_prescription_revisions_after_insert_override` runs `planning.enforce_prescription_override_ct`: the step must belong to a template version composed into the assigned program version (`planning.assigned_step_family`), and the kind must fit that step's target family (`planning.prescription_kind_families`). `trg_prescription_revisions_before_change_keep` refuses every update and delete. Index `idx_prescription_revisions_assignment_step (assignment_id, planned_step_id, override_kind, created_at desc)` serves "the latest of each kind". RLS is forced, with three policies: `_select_self` (the person), `_select_managing` (`can_access(origin_relationship_id, …, 'read')`), and `_insert_managing`, which requires an open management period, an `active` assignment, `contribute`, and that `created_by_assignment_id` be the actor's own professional assignment on that relationship. Space reads the revisions in force through `planning.step_adjustments`, `planning.effective_target` and `planning.effective_sets`, all definer functions owned by `allfit_owner`, so the person sees what her coach adjusted without reading the organization's tables.

### 9.16 `planning.planned_sessions`

- **Propósito:** sesión del calendario en la zona horaria de la persona. **Pertenece a una semana, no a un día.** Un programa **con fecha de fin** la materializa entera al asignar, como siempre; uno **sin fecha de fin** materializa al asignar la semana en la que se asigna, y cada semana posterior la **siembra la lectura que está a punto de enseñarla** (`ADR-032`). No hay job de calendario en ninguno de los dos casos.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad del calendario materializado de una asignación.
- **Clasificación:** `training`.
- **Columnas:** `id` · `assignment_id uuid` · `person_id uuid` · `template_version_id uuid` · `program_day smallint` · `week_starts_on date` · `scheduled_at timestamptz` · `timezone text` · `status text` (`scheduled`, `paused`, `cancelled`, `completed`).
- **`week_starts_on` es lo que decide qué se ofrece**, y es el lunes de la semana de calendario a la que pertenece la sesión. `scheduled_at` se conserva como el día **sugerido** dentro de esa semana: ordena la lista y fecha el historial, pero no obliga. La semana N del programa cae en la semana de calendario N contada desde la que contiene el día de la asignación, así que tomar un programa un viernes deja esa primera semana corta. Lo que no se hace **no se arrastra**: la semana siguiente empieza limpia.
- **`program_day` es el día que el programa le puso, y `scheduled_at` es dónde cayó.** No siempre coinciden: la materialización adelanta las sesiones de la primera semana que caerían antes del día de la asignación, para no estrenar un programa con sesiones ya perdidas. Tomar un programa un jueves deja su sesión de lunes agendada el jueves, y sin esta columna la pantalla no tendría de dónde sacar que esa sesión es la del lunes — leería el jueves de `scheduled_at` y contradiría al programa que la persona armó. Va de 1 (lunes) a 7 (domingo), como `program_version_sessions.day`. **Ese adelanto es de la primera semana y sólo de ella:** una semana sembrada más tarde por la lectura no lo lleva, porque existe para no estrenar un programa con sesiones ya perdidas y la semana ciento tres no se estrena; cada una de sus sesiones cae en el día que le puso el programa.
- **FKs y borrado:** `(assignment_id, person_id) → program_assignments(id, person_id) ON DELETE CASCADE`; `template_version_id → session_template_versions(id) RESTRICT` (`IX-15`).
- **Uniques y checks:** clave portadora `UNIQUE (id, person_id)`; `program_day` entre 1 y 7.
- **Actores:** la persona (agenda); el coach reprograma la parte administrada.
- **RLS:** vía la asignación.
- **Consultas / índices:** `(assignment_id, scheduled_at)`, `(person_id, week_starts_on)`.
- **Retención:** con la asignación. **Eliminar el programa (`OP-PLN-034`) retira las
  sesiones que nadie entrenó y deja las demás donde están**: lo planificado es intención, y
  una intención que ya no se va a cumplir no tiene por qué seguir ocupando la agenda; una
  sesión con ejecución, en cambio, es un hecho, y la clave foránea `RESTRICT` de
  `planned_session_executions` la defiende antes de que nadie tenga que acordarse de
  hacerlo. Por eso el borrado se pide entero y la base decide qué sobrevive: si una sola
  sesión con ejecución cayera en el conjunto, la transacción se rechaza completa.
- **Eventos:** `planning.session_rescheduled.v1`.
- **As implemented (migration `20261105090000_a_coach_manages_what_the_gym_assigned.sql`, STUDIO-41).** Adds `revision_number bigint not null default 0` with `ck_planned_sessions_revision` (`>= 0`); each move by `OP-PLN-012` increments it, and Studio sends the one it read. A move changes `scheduled_at` only, inside the session's own week, so `week_starts_on` and `program_day` keep meaning what they meant. Cancelling (`OP-PLN-014`) writes `status = 'cancelled'` on the sessions from today on that nobody started. Row policies added: `planned_sessions_update_managing` (the coach, through `can_access(…, 'contribute')`, on an `active` assignment with an open period), `planned_sessions_select_lookup` (contract scope `planned_session_lookup`, keyed by session id) and `planned_sessions_update_administration` (contract scope `assignment_administration`). Reading a managed assignment's sessions needs no policy of its own: `planned_sessions_select_managed` follows the assignment.

#### `planning.planned_session_reschedules` (added by STUDIO-41)

- **Purpose:** keep every move of a managed session with its author. Append-only.
- **Classification:** `training`.
- **Columns:** `id` · `planned_session_id uuid` · `person_id uuid` · `assignment_id uuid` · `relationship_id uuid` · `moved_from date` · `moved_to date` · `rescheduled_by_membership_id uuid` · `created_at timestamptz`.
- **FKs and deletion:** `(planned_session_id, person_id) → planned_sessions(id, person_id) ON DELETE CASCADE`, so removing an untrained session (`OP-PLN-034`) takes its moves; `(assignment_id, person_id) → program_assignments`, `(relationship_id, person_id) → relationships.service_relationships` and `rescheduled_by_membership_id → organizations.organization_memberships`, all `RESTRICT`.
- **Checks:** `ck_planned_session_reschedules_moved` (`moved_from <> moved_to`). `trg_planned_session_reschedules_before_update_keep` refuses every update.
- **RLS:** forced. `planned_session_reschedules_insert_managing` requires the actor's own membership as author, an `active` assignment of that relationship with an open period, and `contribute`. Nobody selects from it at runtime yet.
- **Indexes:** `idx_planned_session_reschedules_session (planned_session_id, created_at)`.
- **Events:** `planning.session_rescheduled.v1`, enqueued by `OP-PLN-012`.

### 9.17 `planning.service_access_blocks`

- **Propósito:** representar una causa reversible que hace inefectiva la contribución profesional y/o las sesiones futuras sin mutar sus fuentes de verdad. Es un bloqueo causal, **no** un snapshot del estado que deberá restaurarse.
- **Dominio / fuente de verdad:** Planificación conserva el bloqueo operativo; Pagos u Organizaciones conservan la transición que lo origina.
- **Clasificación:** `operational` con causa comercial restringida.
- **Columnas:** `id uuid` · `person_id uuid` · `organization_id uuid` · `relationship_id uuid` (nullable) · `subscription_id uuid` (nullable) · `organization_event_id uuid` (nullable) · `source_kind text` (`subscription_suspension`, `organization_suspension`) · `blocks_future_sessions boolean` · `blocks_professional_contribution boolean` · `started_at timestamptz` · `ended_at timestamptz` (nullable) · `created_by_kind identity.actor_kind` · `created_by_membership_id uuid` (nullable).
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `(relationship_id, person_id, organization_id) → relationships.service_relationships(id, person_id, organization_id) RESTRICT` cuando se declara relación; `(subscription_id, person_id, organization_id) → payments.plan_subscriptions(id, person_id, organization_id) RESTRICT`; `organization_event_id → organizations.organization_events(id) RESTRICT`; `(created_by_membership_id, organization_id) → organizations.organization_memberships(id, organization_id) RESTRICT`. `planning.enforce_service_access_block_source_ct` valida que el evento organizacional pertenezca al mismo tenant y sea una suspensión.
- **Uniques y checks:** `UNIQUE (subscription_id) WHERE ended_at IS NULL AND subscription_id IS NOT NULL`; `UNIQUE (organization_event_id, person_id) WHERE ended_at IS NULL AND organization_event_id IS NOT NULL`; `CHECK (num_nonnulls(subscription_id, organization_event_id) = 1)` y correspondencia exhaustiva con `source_kind`; `CHECK (ended_at IS NULL OR ended_at >= started_at)`; al menos uno de los dos flags es verdadero. Una fila cerrada no se reabre ni cambia de fuente.
- **Actores:** solo funciones cerradas de suspensión/reactivación de Pagos u Organizaciones insertan o fijan `ended_at`; no hay DML directo de runtime. Cerrar exige lock de la fuente y cierra una sola fila coincidente.
- **RLS:** la persona ve sus bloqueos y `admin`/`owner` con la capacidad correspondiente ven los de su organización. Un coach no lee la causa comercial: las proyecciones cerradas solo consumen `access_control.has_service_block(...)` para denegar contribución o proyectar agenda efectiva.
- **Consultas / índices:** `(person_id, ended_at)`, `(organization_id, ended_at)`, `(relationship_id, ended_at)` y el unique parcial de fuente abierta.
- **Retención:** se conserva como evidencia del periodo bloqueado junto con el evento causal; su cierre no altera ni revive grants, relaciones, membresías, asignaciones o sesiones.
- **Eventos:** ninguno propio; la transición causal emite el evento de suscripción u organización correspondiente.

### 9.18 `planning.program_version_goals`

- **Propósito:** para qué objetivos sirve una versión de programa. Es lo que permite proponer un catálogo sin IA.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad de la segmentación con la que se publicó una versión.
- **Clasificación:** `training`.
- **Columnas:** `program_version_id uuid` · `goal_code text`.
- **FKs y borrado:** `program_version_id → program_versions(id) ON DELETE CASCADE`.
- **Uniques y checks:** `PRIMARY KEY (program_version_id, goal_code)`; `CHECK` cerrado sobre los cinco objetivos que el contrato admite. `improve_performance` queda fuera porque `PrimaryTrainingGoal` ya lo excluye.
- **Actores:** lectura autenticada junto con la versión; escritura solo por la curaduría de plataforma.
- **RLS:** vía la versión.
- **Consultas / índices:** `(goal_code, program_version_id)` para resolver el catálogo desde el objetivo declarado.
- **Retención:** con la versión. **Es inmutable como ella**: una versión publicada queda fija, y la segmentación con la que se publicó también.
- **Eventos:** ninguno propio.

### 9.19 `planning.program_version_levels`

- **Propósito:** para qué nivel de experiencia sirve una versión.
- **Dominio / fuente de verdad:** Planificación.
- **Clasificación:** `training`.
- **Columnas:** `program_version_id uuid` · `experience_code text`.
- **FKs y borrado:** `program_version_id → program_versions(id) ON DELETE CASCADE`.
- **Uniques y checks:** `PRIMARY KEY (program_version_id, experience_code)`; `CHECK` cerrado sobre `starting`, `some_practice`, `experienced`, el vocabulario de `training_experience` en `identity.profile_attributes`.
- **Actores:** igual que §9.18.
- **RLS:** vía la versión.
- **Consultas / índices:** `(experience_code, program_version_id)`.
- **Retención:** con la versión, inmutable.
- **Eventos:** ninguno propio.

### 9.20 `planning.program_version_emphases`

- **Propósito:** qué zonas trabaja una versión. Ordena el catálogo contra las zonas declaradas y es lo que la tarjeta muestra antes de elegir.
- **Dominio / fuente de verdad:** Planificación.
- **Clasificación:** `training`.
- **Columnas:** `program_version_id uuid` · `focus_area_code text`.
- **FKs y borrado:** `program_version_id → program_versions(id) ON DELETE CASCADE`.
- **Uniques y checks:** `PRIMARY KEY (program_version_id, focus_area_code)`; `CHECK` cerrado sobre las ocho zonas de `focus_areas`.
- **Actores:** igual que §9.18.
- **RLS:** vía la versión.
- **Consultas / índices:** `(focus_area_code, program_version_id)`.
- **Retención:** con la versión, inmutable.
- **Eventos:** ninguno propio.

**Sobre la afinidad de sexo y sobre lo que no se guarda.** La afinidad vive como
columna `sex_affinity` nullable en `program_versions`, no como tabla: es un valor y no
un conjunto, y **ordena sin filtrar** —todos ven el mismo catálogo, y quien declinó no
necesita una regla aparte—. Los días por semana y las semanas del **ciclo** siguen sin
guardarse: se derivan de `program_version_sessions`, porque guardarlos sería una segunda
verdad del mismo número y la frecuencia es justo el eje sobre el que se elige. Lo que **sí
se guarda** es si el programa termina, en `repeats_forever`: eso no se puede derivar de una
composición que se repite, porque `max(week)` dice cuánto mide el ciclo y no si hay un
último ciclo. Antes coincidían por accidente —al leer la duración como `max(week)`, todo
programa terminaba—, y esa coincidencia era justo la que hacía estructuralmente imposible
un programa sin fin (`ADR-032`).

### 9.21 `planning.planned_sets`

- **Propósito:** cada serie de un paso de fuerza, con lo que esa serie pide y de qué tipo es.
- **Dominio / fuente de verdad:** Planificación. Es la fuente de verdad de la prescripción de fuerza; `strength_targets` sólo la resume.
- **Clasificación:** `training`.
- **Columnas:** `id` · `planned_step_id uuid` · `set_order integer` · `kind planning.set_kind` · `target_reps integer` (nullable) · `target_load_value numeric` (nullable) · `target_load_unit_code text` (nullable) · `target_rpe numeric` (nullable).
- **FKs y borrado:** `planned_step_id → planned_steps(id) ON DELETE CASCADE`; `target_load_unit_code → catalog.units(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (planned_step_id, set_order)`; `set_order > 0` y consecutivo desde 1 dentro del paso; `target_reps > 0` si existe; **`kind = 'to_failure'` exige `target_reps IS NULL`**; load y unidad aparecen juntos y load es `>=0`; RPE entre 0 y 10.
- **Actores:** los mismos de la versión de plantilla; escritura sólo durante la publicación atómica.
- **RLS:** `EXISTS` por `planned_step_id → planned_steps → session_template_versions → session_templates`, igual que los targets. `allfit_api` holds no direct grant on this table; a stray `select, insert` grant was revoked by migration `20261103150000_organization_content_stays_in_the_organization.sql`.
- **Consultas / índices:** único `(planned_step_id, set_order)`, que es también el orden de lectura.
- **Retención:** con la versión publicada; inmutable tras publicación.
- **Eventos:** ninguno propio.

**Por qué filas y no dos números.** Nadie hace cuatro series idénticas: la primera es de
calentamiento con carga ligera, las del medio son de trabajo, la última va al fallo y su
número de repeticiones es el que salga. Guardar «4 × 8» describe mal lo que la persona
va a hacer, y una rutina que describe mal no se usa dos veces. `ADR-003` ya lo anticipa
al cerrar que «los targets consultados o validados frecuentemente no se almacenan
únicamente en JSONB».

**Una serie al fallo no lleva repeticiones**, y el modelo lo prohíbe en lugar de dejarlo
a la interfaz. «Hasta no poder más» y «hasta ocho» son instrucciones distintas; un
número ahí sería una contradicción guardada.

**`kind` vive en `planning` y no en `catalog`.** El catálogo guarda vocabulario de
contenido que una persona explora —disciplinas, movimientos, equipamiento, músculos—.
El tipo de serie es estructura de la prescripción: nadie lo busca ni lo filtra, lo
declara. Su vocabulario es cerrado: `normal`, `warmup`, `to_failure`, `drop`.

**Es hija de una versión publicada y hereda su inmutabilidad.** `ADR-009` es tajante en
que sólo el borrador es mutable, así que esta tabla lleva las mismas tres protecciones
que sus hermanas: sin mutación de hija inmutable, inserción sólo durante la publicación,
y política de fila heredada del padre. Sin ellas sería la única grieta en esa garantía.

### 9.22 `planning.session_template_cover_photos` — retirada

Guardó los metadatos y la clave del objeto de la fotografía que una persona subía como
portada de una rutina suya. La segunda revisión de `ADR-031` retiró esa fotografía: nadie
sube nada, y la portada de clase `foto` pasa a ser **una del catálogo elegida por la
región dominante de los músculos que la rutina trabaja**, que es contenido público,
inmutable y ya desplegado.

De aquello no queda ninguna columna. `session_template_versions` llegó a guardar la clave
de esa imagen del catálogo, y la tercera revisión de `ADR-031` se la llevó también: hoy el
estilo lo declara el programa (§9.9) y ninguna fila guarda qué imagen le toca a una
rutina, porque la determina la región dominante de los músculos que trabaja y la elección
es determinista. No es un dato personal, no tiene RLS propia y no hay nada que
destruir cuando la rutina se descarta.

Nota de conteo: `planning` tiene 22 tablas y 23 fichas; §9.5–9.8 son cuatro tablas físicas independientes, §9.9.1 es la tabla de portadas del catálogo —numerada junto a su padre, como §4.2.1 junto al suyo— y §9.22 está retirada.

---

## 10. Schema `execution`

### 10.1 `execution.executed_sessions`

- **Propósito:** hecho real de una sesión; pertenece a la persona; congela contrato y versión.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad del hecho ejecutado, su estado, contrato congelado y procedencia.
- **Clasificación:** `training` (con campos de otras categorías heredando la suya).
- **Columnas:** `id uuid` (**Command-Id UUIDv7 del dispositivo para crear la ejecución**) · `person_id uuid` · `activity_type_id uuid` · `result_contract_id uuid` · `contract_version integer` · `context_relationship_id uuid` (nullable) · `context_organization_id uuid` (nullable) · `is_autonomous boolean` · `started_at timestamptz` · `ended_at timestamptz` (nullable) · `timezone text` · `execution_status execution.execution_status` · `validation_status execution.validation_status` · `revision_number bigint` (`0`, incrementa bajo lock) · `requested_level catalog.completeness_level` · `achieved_level catalog.completeness_level` (nullable) · `capture_source text` · `capture_provenance identity.provenance` · `annulled_at timestamptz` (nullable) · `annulment_reason text` (nullable).
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `activity_type_id → catalog.activity_types(id) RESTRICT`; `result_contract_id → catalog.result_contracts(id) RESTRICT`; FK compuesta de contexto `MATCH SIMPLE (context_relationship_id, person_id, context_organization_id) → relationships.service_relationships(id, person_id, organization_id) RESTRICT` (`IX-14`).
- **Uniques y checks:** clave portadora `UNIQUE (id, person_id)`; `revision_number >= 0`; `CHECK (ended_at is null or ended_at >= started_at)`; `CHECK` que exige ambos IDs de contexto cuando `is_autonomous=false` y ambos `NULL` cuando `is_autonomous=true`; sin `UPDATE` de resultados por terceros (privilegios).
- **Actores:** la persona (crea, corrige, invalida); el profesional lee proyectado.
- **RLS:** `access_control.is_self(person_id)` **OR** (relación con `relationship_training` para lo producido en ella; `prior_training_history` para lo autónomo, con evaluación de `session_denied`). Proyección `execution.v_client_executions`.
- **Consultas / índices:** `(person_id, started_at desc)`, `(context_relationship_id, started_at desc)`.
- **Retención:** categoría `training`; disposición por política; cierre anonimiza `person_id`.
- **Eventos:** `execution.attempt_started.v1`, `execution.session_started.v1`, `execution.finalized.v1`, `execution.revised.v1`, `execution.annulled.v1`.
- **Implementado (sesión libre):** la tabla existe con todas sus columnas, pero hasta que haya `relationships` toda sesión nace `is_autonomous=true` y con los dos IDs de contexto en `NULL`; el `CHECK` de contexto ya los exige juntos. `execution.start_free_session` congela el contrato por defecto vigente del único tipo de actividad global publicado de la disciplina y nace sin ejercicios; `replace_execution_results` reemplaza el conjunto entero bajo la revisión que el dispositivo vio (`AF409` si ya no es la actual) y `finalize_execution` cierra con `execution_status='completed'` y `validation_status='valid'`. Una persona tiene a lo sumo una sesión libre abierta. `achieved_level` queda `NULL` a propósito: certificar el nivel depende de ADR-013, que sigue en revisión. Ninguna función de ejecución escribe todavía en el outbox: `session_started.v1` y `finalized.v1` están previstos.

- **Implemented (STUDIO-47/48, migration `20261107090000_a_coach_reviews_what_a_client_trained.sql`): where a session was produced.**
  - `ck_executed_sessions_autonomous` becomes `(is_autonomous and both context ids null) or (not is_autonomous and both set)`. The constraint also gets `fk_executed_sessions_context`, and there is a new partial index `idx_executed_sessions_context_started (context_relationship_id, started_at desc, id desc)`.
  - `execution.start_planned_session_attempt` stores the relationship and its organization when three things hold: the planned session belongs to an `active` managed assignment, the assignment has an open management period on its origin relationship, and that relationship is `active`. It locks the relationship `for share` before the planned session, in the order a termination takes them. Free sessions and personal programs stay autonomous, and so does a program she kept after the gym let go.
  - `trg_executed_sessions_before_update_context` makes the context immutable (`23514`).
  - **Backfill:** an existing attempt whose `started_at` falls inside a management period of its assignment was moved inside that period's relationship.
  - Professional reads go through the policy `executed_sessions_select_screening` and two closed functions. There is no `execution.v_client_executions`.

### 10.2 `execution.planned_session_executions`

- **Propósito:** vínculo entre una sesión planificada y una ejecución; numeración de intentos y primaria.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de los intentos históricos y de cuál ejecución válida es primaria para una sesión planificada.
- **Clasificación:** `training`.
- **Columnas:** `id` · `planned_session_id uuid` · `executed_session_id uuid` · `person_id uuid` · `attempt_number integer` · `is_primary boolean`.
- **FKs y borrado:** `(planned_session_id, person_id) → planning.planned_sessions(id, person_id) RESTRICT`; `(executed_session_id, person_id) → executed_sessions(id, person_id) ON DELETE CASCADE` (`IX-16`).
- **Uniques y checks:** `UNIQUE (planned_session_id, attempt_number)`; `UNIQUE parcial (planned_session_id) WHERE is_primary`; constraint trigger diferible `execution.enforce_primary_execution_ct` exige ejecución completada y válida para `is_primary=true` (`IX-17`).
- **Actores:** la persona inicia, reanuda o abandona intentos y decide cambios explícitos de primaria; el sistema resuelve la primaria inicial al finalizar.
- **RLS:** vía la ejecución/planificación (misma persona).
- **Consultas / índices:** `(planned_session_id, attempt_number)`.
- **Retención:** con la ejecución y la sesión planificada; los intentos históricos y el cambio de primaria no se borran.
- **Eventos:** `execution.primary_resolved.v1`, `execution.primary_changed.v1`.
- **Implementado:** nada todavía. Sin planificación no hay intento contra un plan, así que `OP-EXE-001` no está montado y la sesión libre no pasa por aquí.

### 10.3 `execution.session_segments`

- **Propósito:** divide una sesión; una híbrida exige ≥2 familias distintas.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de la composición real y ordenada de segmentos de una sesión.
- **Clasificación:** `training`.
- **Columnas:** `id` · `executed_session_id uuid` · `position integer` · `activity_type_id uuid` (nullable) · `planned_step_id uuid` (nullable).
- **FKs y borrado:** `executed_session_id → executed_sessions(id) ON DELETE CASCADE`; `activity_type_id → catalog.activity_types(id) RESTRICT`; `planned_step_id → planning.planned_steps(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (executed_session_id, position)`; clave portadora `UNIQUE (id, executed_session_id)`. **`IX-37`**: constraint trigger que, al cerrar una ejecución híbrida, exige al menos dos segmentos de familias distintas.
- **Actores:** la persona captura segmentos propios; profesionales solo leen la proyección autorizada de la ejecución.
- **RLS:** vía la sesión.
- **Consultas / índices:** por `executed_session_id`.
- **Retención:** con la ejecución; se elimina o anonimiza según la política de la categoría `training`.
- **Eventos:** ninguno propio.

### 10.4 `execution.strength_sets`

- **Propósito:** esfuerzo/serie de fuerza con orden, movimiento y cantidad lograda.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de los resultados observados de fuerza de una ejecución.
- **Clasificación:** `training`.
- **Columnas:** `id` · `executed_session_id uuid` · `session_segment_id uuid` (nullable) · `movement_id uuid` (nullable) · `planned_step_id uuid` (nullable) · `set_order integer` · `achieved_reps integer` (nullable) · `load_value numeric` (nullable) · `load_unit_code text` (nullable) · `original_load_value numeric` (nullable) · `original_load_unit_code text` (nullable) · `rpe numeric` (nullable) · `kind planning.set_kind` (default `normal`, `ADR-033`) · `session_exercise_id uuid` (el ejercicio de la sesión al que pertenece, `ADR-034`).
- **FKs y borrado:** `executed_session_id → executed_sessions(id) ON DELETE CASCADE`; FK compuesta opcional `(session_segment_id, executed_session_id) → session_segments(id, executed_session_id) RESTRICT`; `movement_id → catalog.movements(id) RESTRICT`; unidades → `catalog.units(code) RESTRICT` (`IX-18`).
- **Uniques y checks:** `UNIQUE (executed_session_id, set_order)`; `NULL` ≠ 0; `rpe` entre 0 y 10, nulo cuando no se declaró. Una serie `warmup` se registra pero no suma a tonelaje ni a recuentos de series (`ADR-033`).
- **Actores:** la persona captura y revisa sus resultados; profesionales solo leen la proyección autorizada y nunca sobrescriben el set.
- **RLS:** vía la sesión.
- **Consultas / índices:** por `executed_session_id`.
- **Retención:** con la ejecución; conserva revisiones y se dispone bajo la categoría `training`.
- **Eventos:** ninguno propio.

### 10.4b `execution.session_exercises`

- **Propósito:** los ejercicios de una sesión, en su orden, con sus superseries y su descanso (`ADR-034`, `ADR-035`).
- **Dominio / fuente de verdad:** Ejecución. Se siembra desde la rutina al iniciar el intento y desde ahí es la verdad de la sesión.
- **Clasificación:** `training`.
- **Columnas:** `id` · `executed_session_id uuid` · `position integer` · `movement_id uuid` (nullable) · `planned_step_id uuid` (nullable: nulo para un ejercicio añadido) · `superset_group smallint` (nullable) · `rest_seconds integer` (nullable: copiado de `strength_targets.target_rest_seconds` al iniciar; editable sólo en la sesión).
- **FKs y borrado:** `executed_session_id → executed_sessions(id) ON DELETE CASCADE`; `movement_id → catalog.movements(id) RESTRICT`; `planned_step_id → planning.planned_steps(id) RESTRICT`. `strength_sets.session_exercise_id → session_exercises(id) ON DELETE CASCADE`.
- **Uniques y checks:** `UNIQUE (executed_session_id, position)`; `position > 0`; `rest_seconds` nulo o entre 0 y 3600; los ejercicios de un mismo grupo son contiguos (`IX-50`).
- **Actores:** la persona siembra, reordena, encadena, añade y quita mientras la sesión no está finalizada; profesionales solo leen la proyección autorizada.
- **RLS:** vía la sesión.
- **Consultas / índices:** por `executed_session_id`.
- **Retención:** con la ejecución.
- **Eventos:** ninguno propio.

### 10.5 `execution.endurance_laps`

- **Propósito:** vuelta o tramo de endurance con distancia y duración capturadas.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de vueltas y tramos observados de endurance.
- **Clasificación:** `training`; `avg_heart_rate_bpm` queda fuera de los siete scopes V1.
- **Columnas:** `id` · `executed_session_id uuid` · `session_segment_id uuid` (nullable) · `lap_number integer` · `distance_value numeric` · `distance_unit_code text` · `duration_seconds numeric` · `elevation_gain_value numeric` (nullable) · `elevation_gain_unit_code text` (nullable) · `avg_heart_rate_bpm integer` (nullable).
- **FKs y borrado:** `executed_session_id → executed_sessions(id) ON DELETE CASCADE`; FK `MATCH SIMPLE (session_segment_id,executed_session_id) → session_segments(id,executed_session_id) RESTRICT`; unidades `→ catalog.units(code) RESTRICT` (`IX-18`).
- **Uniques y checks:** `UNIQUE (executed_session_id,lap_number)`; número, distancia y duración positivos; elevación no negativa y emparejada con unidad; frecuencia cardiaca positiva si existe; `NULL` no se transforma en cero.
- **Actores:** la persona escribe; profesional solo lee la proyección autorizada sin frecuencia cardiaca.
- **RLS:** `EXISTS executed_sessions(id=executed_session_id)` bajo la policy de la sesión.
- **Consultas / índices:** único `(executed_session_id,lap_number)`.
- **Retención:** con la ejecución.
- **Eventos:** ninguno propio.

### 10.6 `execution.interval_results`

- **Propósito:** resultado de una ronda de trabajo/descanso.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de los resultados observados por intervalo.
- **Clasificación:** `training`.
- **Columnas:** `id` · `executed_session_id uuid` · `session_segment_id uuid` (nullable) · `interval_number integer` · `work_duration_seconds numeric` · `rest_duration_seconds numeric` (nullable) · `achieved_repetitions integer` (nullable) · `distance_value numeric` (nullable) · `distance_unit_code text` (nullable) · `completed boolean`.
- **FKs y borrado:** ejecución y segmento como §10.5; `distance_unit_code → catalog.units(code) RESTRICT` (`IX-18`).
- **Uniques y checks:** `UNIQUE (executed_session_id,interval_number)`; número y trabajo positivos; descanso no negativo; repeticiones positivas si existen; distancia/unidad aparecen juntas y distancia es positiva.
- **Actores:** la persona escribe; profesional lee según grant.
- **RLS:** hereda de la ejecución mediante `EXISTS`.
- **Consultas / índices:** único `(executed_session_id,interval_number)`.
- **Retención:** con la ejecución.
- **Eventos:** ninguno propio.

### 10.7 `execution.round_results`

- **Propósito:** resultado de una ronda híbrida con una familia y al menos una medida tipada.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de las rondas observadas en sesiones híbridas.
- **Clasificación:** `training`.
- **Columnas:** `id` · `executed_session_id uuid` · `session_segment_id uuid` (nullable) · `round_number integer` · `activity_family text` (`strength`, `endurance`, `interval`, `mobility`) · `completed_repetitions integer` (nullable) · `duration_seconds numeric` (nullable) · `distance_value numeric` (nullable) · `distance_unit_code text` (nullable) · `load_value numeric` (nullable) · `load_unit_code text` (nullable).
- **FKs y borrado:** ejecución y segmento como §10.5; unidades `→ catalog.units(code) RESTRICT` (`IX-18`).
- **Uniques y checks:** `UNIQUE (executed_session_id,round_number)`; ronda positiva; al menos una medida no nula; cantidades positivas salvo load, que puede ser cero; distancia/load y sus unidades aparecen en pareja.
- **Actores:** la persona escribe; profesional lee según grant.
- **RLS:** hereda de la ejecución mediante `EXISTS`.
- **Consultas / índices:** único `(executed_session_id,round_number)`.
- **Retención:** con la ejecución.
- **Eventos:** ninguno propio.

### 10.8 `execution.mobility_results`

- **Propósito:** resultado de una posición o movimiento de movilidad.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de los resultados observados de movilidad.
- **Clasificación:** `training`.
- **Columnas:** `id` · `executed_session_id uuid` · `session_segment_id uuid` (nullable) · `sequence_position integer` · `movement_id uuid` (nullable) · `side text` (`left`, `right`, `bilateral`, `not_applicable`) · `hold_duration_seconds numeric` (nullable) · `completed_repetitions integer` (nullable).
- **FKs y borrado:** ejecución y segmento como §10.5; `movement_id → catalog.movements(id) RESTRICT` (`IX-18`).
- **Uniques y checks:** `UNIQUE (executed_session_id,sequence_position)`; posición positiva; al menos duración o repeticiones; ambas positivas si existen.
- **Actores:** la persona escribe; profesional lee según grant.
- **RLS:** hereda de la ejecución mediante `EXISTS`.
- **Consultas / índices:** único `(executed_session_id,sequence_position)`.
- **Retención:** con la ejecución.
- **Eventos:** ninguno propio.

### 10.9 `execution.metric_samples`

- **Propósito:** muestra temporal de fixture controlado; fuera de los siete scopes V1; inmutable.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de muestras controladas asociadas a una ejecución V1, sin habilitar conectores productivos.
- **Clasificación:** `training` (pero **nunca** visible a organizaciones en V1).
- **Columnas:** `id` · `executed_session_id uuid` · `session_segment_id uuid` (nullable) · `metric_code text` · `value numeric` · `unit_code text` · `quality text` · `sampled_at timestamptz` · `source text`.
- **FKs y borrado:** `executed_session_id → executed_sessions(id) ON DELETE CASCADE`; FK compuesta opcional `(session_segment_id, executed_session_id) → session_segments(id, executed_session_id) RESTRICT`; `unit_code → catalog.units(code) RESTRICT` (`IX-18`).
- **Uniques y checks:** sin `UPDATE`/`DELETE` (raw inmutable).
- **Actores:** la persona y el importador controlado escriben sobre sesiones propias; solo la persona puede leer; ningún profesional u organización accede en V1.
- **RLS:** `access_control.is_self(person_id)` vía la sesión, y nada más. Ningún grant lo expone.
- **Consultas / índices:** `(executed_session_id, sampled_at)`.
- **Retención:** con la sesión; excluible del análisis sin alterar payload.
- **Eventos:** ninguno propio.

### 10.10 `execution.professional_observations`

- **Propósito:** observación profesional; coexiste con lo declarado, no lo edita.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de la observación y autoría profesional asociadas a una ejecución.
- **Clasificación:** hereda del contenido observado.
- **Columnas:** `id` · `executed_session_id uuid` · `person_id uuid` · `author_assignment_id uuid` · `content text` · `provenance identity.provenance` · `data_classification_code text`.
- **FKs y borrado:** `(executed_session_id, person_id) → executed_sessions(id, person_id) RESTRICT`; `(author_assignment_id, person_id) → relationships.relationship_professional_assignments(id, person_id) RESTRICT`; `data_classification_code → privacy.data_classifications(code) RESTRICT` (`IX-19`).
- **Uniques y checks:** —.
- **Actores:** el profesional con `contribute` (crea, revisa la propia); la persona la ve.
- **RLS:** `INSERT` exige `can_access(person_id, scope, 'contribute')`; `UPDATE` solo autor vía revisión.
- **Consultas / índices:** `(person_id, executed_session_id)`, `author_assignment_id`.
- **Retención:** con la sesión / categoría.
- **Eventos:** `execution.observation_created.v1`, `execution.observation_revised.v1`.
- **As implemented (STUDIO-50/51, migration `20261111090000_a_coach_reads_progress_and_observes_a_session.sql`).**
  - **Columns:** `id` (the `Command-Id`), `person_id`, `executed_session_id`, `relationship_id`, `organization_id`, `author_assignment_id`, `author_membership_id`, `data_classification_code` (`training` or `health`), `provenance` (`professional_observation` or `person_declared`), `content`, `revision_number` (from 1), `created_at` and `revised_at`.
  - **Classification:** the observation's own category, not the session's. Pain noted on a strength session is `health`.
  - **Keys:** `pk_professional_observations` and `uq_professional_observations_person (id, person_id)`.
  - **Session FKs:** `fk_professional_observations_session (executed_session_id, person_id)`, and `fk_professional_observations_session_context (executed_session_id, relationship_id) → executed_sessions(id, context_relationship_id)`. The second is backed by the new `uq_executed_sessions_context`, so an observation can only sit on a session its relationship produced.
  - **Other FKs:** `fk_professional_observations_relationship`; `fk_professional_observations_author`, to the assignment carrier, so the author's assignment, membership, relationship, person and organization agree; and `fk_professional_observations_classification`. Every FK is `RESTRICT`.
  - **Checks:** `ck_professional_observations_classification`, `_provenance`, `_content` (trimmed, 1 to 2000 characters), and `_revision` (`revised_at` is set exactly when `revision_number > 1`).
  - **Indexes:** `idx_professional_observations_session (executed_session_id, relationship_id, created_at)`, `_person (person_id, created_at)` and `_author (author_assignment_id)`.
  - **Trigger:** `trg_professional_observations_before_update_keep` keeps every column except `content`, `revision_number` and `revised_at`, and moves the revision one step at a time.
  - **Access:** `allfit_api` has no privilege on the table. It writes through `execution.record_observation` and `execution.revise_observation`, and reads through `execution.read_authorized_execution`. RLS: see `V1_RLS_MATRIX.md` § `PROFESSIONAL_OBSERVATION`.
- **`execution.observation_revisions` (STUDIO-51), which this catalogue did not list before.** The append-only history of an observation's corrections.
  - **Columns:** `id` (the `Command-Id`), `observation_id`, `person_id`, `revision_from`, `revision_to`, `actor_assignment_id`, `actor_membership_id`, `reason` (1 to 500), `before_content`, `after_content` and `created_at`.
  - **Constraints:** `fk_observation_revisions_observation (observation_id, person_id)`, `fk_observation_revisions_actor`, `uq_observation_revisions_step (observation_id, revision_to)`, `ck_observation_revisions_step` (`revision_to = revision_from + 1`), `_reason`, and `_content` (the text must change).
  - **Indexes:** `idx_observation_revisions_person (person_id, created_at)` and `_actor (actor_assignment_id)`.
  - **Append-only:** `trg_observation_revisions_append_only` refuses `UPDATE`, `DELETE` and `TRUNCATE`.
  - For observations it takes the place of `execution.revision_events` (§10.12).

### 10.11 `execution.correction_proposals`

- **Propósito:** propuesta de corrección sobre un dato declarado por la persona; target polimórfico tipado.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de la propuesta, su target, autor y decisión personal.
- **Clasificación:** hereda del target.
- **Columnas:** `id` · `person_id uuid` · `proposer_assignment_id uuid` · `target_field text` · `proposed_numeric numeric` (nullable) · `proposed_integer integer` (nullable) · `proposed_text text` (nullable) · `proposed_boolean boolean` (nullable) · `proposed_unit_code text` (nullable) · `reason text` · `status execution.proposal_status` · `expires_at timestamptz` · **targets nullable por tipo:** `target_claim_id`, `target_strength_set_id`, `target_execution_id` (uno no nulo).
- **FKs y borrado:** `(proposer_assignment_id, person_id) → relationships.relationship_professional_assignments(id, person_id) RESTRICT`; cada `target_*` a su tabla `RESTRICT`; `proposed_unit_code → catalog.units(code) RESTRICT`.
- **Uniques y checks:** exactamente un target y exactamente una columna `proposed_*` no nulos; unidad solo con `proposed_numeric`. Constraint trigger diferible `execution.enforce_correction_subject_ct` resuelve target/sujeto y valida que `target_field`, tipo y unidad sean editables para esa tabla (`IX-20`).
- **Actores:** el profesional con `contribute` propone; la persona decide.
- **RLS:** `person_id = access_control.person()` **OR** proponente con asignación efectiva.
- **Consultas / índices:** `(person_id, status, expires_at)`, `(proposer_assignment_id, status)`.
- **Retención:** conserva; vencidas y canceladas se marcan, no se borran.
- **Eventos:** `execution.correction_proposed.v1`, `execution.correction_decided.v1`, `execution.correction_expired.v1`.

### 10.12 `execution.revision_events`

- **Propósito:** historia append-only de correcciones; conserva before/after, actor, motivo; target tipado.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad auditable de cada revisión material aplicada a un dato ejecutado.
- **Clasificación:** `audit`.
- **Columnas:** `id uuid` (**Command-Id UUIDv7 del dispositivo para revisiones offline**) · `subject_person_id uuid` · `executed_session_id uuid` (nullable) · `snapshot_schema_version smallint` (`1`) · `before jsonb` · `after jsonb` · `actor_kind identity.actor_kind` · `actor_ref uuid` (nullable) · `reason text` · **targets nullable por tipo** con `CHECK` de uno no nulo.
- **FKs y borrado:** FK compuesta opcional `(executed_session_id, subject_person_id) → executed_sessions(id, person_id) RESTRICT`; targets a sus tablas `RESTRICT`.
- **Uniques y checks:** append-only; `CHECK num_nonnulls(target_*) = 1`; constraint trigger diferible `execution.enforce_revision_target_ct` exige que target, `subject_person_id` y ejecución correspondan (`IX-21`).
- **Actores:** `allfit_api` inserta; la persona y el profesional autorizado leen según target.
- **RLS:** hereda del target.
- **Consultas / índices:** por `executed_session_id`; por target.
- **Retención:** auditoría con el dato.
- **Eventos:** ninguno propio.
- **As implemented: not built.** There is no `execution.revision_events`. Corrections are typed by what they correct instead of using one polymorphic target:
  - a session's go to `execution.execution_revisions` (`revise_execution`, migration `20261003120000_the_person_corrects_and_annuls_what_is_theirs.sql`);
  - an observation's go to `execution.observation_revisions` (§10.10, STUDIO-51).

### 10.13 `execution.result_validation_events`

- **Propósito:** resultado de validar una ejecución contra su contrato congelado; append-only.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de cada validación contractual y del nivel de completitud alcanzado.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `executed_session_id uuid` · `result_contract_id uuid` · `contract_version integer` · `requested_level catalog.completeness_level` · `achieved_level catalog.completeness_level` (nullable) · `errors_schema_version smallint` (`1`, nullable junto a payload) · `errors jsonb` (nullable) · `validated_at timestamptz`.
- **FKs y borrado:** `executed_session_id → executed_sessions(id) ON DELETE CASCADE`; `result_contract_id → catalog.result_contracts(id) RESTRICT`.
- **Uniques y checks:** append-only.
- **Actores:** solo `execution.finalize_execution` inserta; la persona lee y el profesional autorizado ve el estado proyectado, no errores fuera de su field-set.
- **RLS:** vía la sesión.
- **Consultas / índices:** `(executed_session_id, validated_at desc)`.
- **Retención:** con la ejecución y su contrato congelado; los eventos se conservan para explicar la validación histórica.
- **Eventos:** producido dentro de `execution.finalized.v1`.

### 10.14 `execution.derived_results`

- **Propósito:** valor derivado con algoritmo, versión, inputs y clasificación heredada; solo lo escribe el worker.
- **Dominio / fuente de verdad:** Ejecución. Es la fuente de verdad de derivados reproducibles, sin sustituir los inputs observados.
- **Clasificación:** hereda la **más restrictiva** de sus inputs.
- **Columnas:** `id` · `person_id uuid` · `metric_code text` · `period text` · `value numeric` · `unit_code text` (nullable) · `algorithm text` · `algorithm_version integer` · `inputs_schema_version smallint` (`1`) · `inputs jsonb` · `data_classification_code text` · `valid boolean` · `computed_at timestamptz`.
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `unit_code → catalog.units(code) RESTRICT`; `data_classification_code → privacy.data_classifications(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (person_id, metric_code, period, algorithm_version)`.
- **Actores:** **solo el worker de mantenimiento** escribe; la persona lee; el profesional lee si accede a todos los inputs.
- **RLS:** `access_control.is_self(person_id)` **OR** acceso a **todas** las clasificaciones heredadas.
- **Consultas / índices:** `(person_id, metric_code, period)`.
- **Retención:** con sus inputs; invalidado no se sirve.
- **Eventos:** `execution.derived_recomputed.v1`.

---

## 10A. Schema `nutrition`

### 10A.1 `nutrition.nutrient_definitions`

- **Propósito:** catálogo cerrado y publicado de nutrientes admitidos por Nutrición V1.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `operational`.
- **Columnas:** `id uuid` · `code text` · `name text` · `canonical_unit_code text` (`kcal`, `g`, `mg`, `mcg`, `ml`) · `nutrient_group text` (`macro`, `detail`, `vitamin`, `mineral`) · `daily_reference numeric` (nullable) · `status catalog.publication_status` · `published_at timestamptz`.
- **Códigos (31, `ADR-041`):**
  - macros: `energy`, `protein`, `carbohydrates`, `fat`, `fiber`, `water`;
  - detalle: `saturated_fat`, `trans_fat`, `cholesterol`, `sodium`, `sugars`;
  - vitaminas: `vitamin_a`, `vitamin_c`, `vitamin_d`, `vitamin_e`, `vitamin_k`, `thiamin`, `riboflavin`, `niacin`, `pantothenic_acid`, `vitamin_b6`, `vitamin_b12`, `folate`;
  - minerales: `calcium`, `iron`, `magnesium`, `phosphorus`, `potassium`, `zinc`, `selenium`, `copper`.
- **Referencia diaria:** el valor para adultos de la Resolución 810 de 2021, art. 15, en la unidad canónica: la tabla 9 para necesidades y la tabla 10 para los máximos de grasas saturadas y trans, colesterol y sodio. Es null en `sugars` y `water`, que la norma no fija. La app usa primero la meta activa de la persona.
- **FKs y borrado:** `canonical_unit_code → catalog.units(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE(code)`; la unidad canónica es de energía, masa o volumen (`kcal`, `g`, `mg`, `mcg`, `ml`); el grupo es uno de los cuatro; la referencia, si existe, es positiva; versiones publicadas sin `UPDATE/DELETE` runtime. El contrato empareja cada código con su única unidad.
- **Actores:** lectura autenticada; publicación exclusiva de plataforma.
- **RLS:** runtime lee solo `status='published'`.
- **Consultas:** por `code`, catálogo publicado.
- **Índices:** único `(code)`; `(status,code)`.
- **Retención:** permanente; referenciado por historial.
- **Eventos:** ninguno; ampliar códigos exige nueva versión de `nutrition_intake`. Al 5 de octubre de 2026 ese scope no tiene ninguna versión publicada con reglas de campos, así que la primera nace con los 31 códigos.
- **Implementado (`20260927080000`, ampliado en `20261007100000`):** `maximum_value numeric` es el tope por ítem en la unidad canónica (10 000 kcal; 1 000 g de proteína, grasa y grasas saturada y trans; 2 000 g de carbohidratos y azúcares; 500 g de fibra; 10 000 ml de agua; 100 000 mg y 1 000 000 mcg para el resto) y la función de escritura lo exige. El `CHECK` que cerraba los seis códigos se reemplaza por el de unidad (`kcal`, `g`, `mg`, `mcg`, `ml`); se suman `nutrient_group` y `daily_reference`. `nutrition.reject_nutrient_rewrite_tg` impide editar o borrar una definición publicada: el historial la usa, y solo la migración que amplía el catálogo lo suspende para llenar las dos columnas nuevas de las seis primeras. RLS forzado; el runtime no tiene privilegios y las funciones de comida la leen.

### 10A.2 `nutrition.meals`

- **Propósito:** comida manual personal y raíz transaccional de ítems, nutrientes y una foto opcional.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` (**Command-Id UUIDv7 para `OP-NUT-001`**) · `person_id uuid` · `occurred_at timestamptz` · `timezone text` · `local_date date` · `meal_type nutrition.meal_type` · `note text` (nullable) · `revision_number integer` (`0`) · `media_ref text` (nullable, solo objeto saneado) · `has_media boolean` · `recognized_by text` (nullable: el modelo exacto que reconoció la foto, `ADR-041`) · `created_at timestamptz` · `updated_at timestamptz`.
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; clave portadora `UNIQUE(id,person_id)`.
- **Uniques y checks:** `revision_number>=0`; `CHECK (has_media=(media_ref IS NOT NULL))`; `local_date` corresponde a `occurred_at` bajo `timezone` mediante función de entrada; máximo una foto.
- **Actores:** solo la persona crea/revisa/borra por funciones; profesional nunca recibe DML.
- **RLS:** base `access_control.is_self(person_id)`; Studio solo por vistas `nutrition.v_client_*`.
- **Consultas:** `(person_id,occurred_at DESC,id DESC)`; por `local_date`.
- **Índices:** `(person_id,occurred_at DESC,id DESC)`; `(person_id,local_date)`.
- **Retención:** mientras cuenta activa o hasta borrado personal; disposición elimina hijos, media, vistas/derivados; hold suspende.
- **Eventos:** `nutrition.meal_recorded.v1`, `nutrition.meal_revised.v1`, `nutrition.meal_deleted.v1`.
- **Implementado (`HU-SP-067` a `HU-SP-070`, `HU-BO-009`; `20260927080000` y `20261007100000`):** `note` no queda vacía (la función la normaliza a `null`) y tiene hasta 1 000 caracteres; `timezone` de 3 a 100. `nutrition.meal_guard_tg` exige que la zona exista en `pg_timezone_names` y que `local_date` sea el día de `occurred_at` en esa zona, lo escriba quien lo escriba; desde que existe revisar (`OP-NUT-003`, `nutrition.revise_meal`) deja pasar la corrección y rechaza solo el cambio de momento, zona, día o persona. `media_ref` lo escribe solo la revisión, y la foto que deja de usarse va a `nutrition.media_disposals`. Los eventos llevan sólo `meal_id`. RLS forzado y sin privilegios de runtime: la persona entra por `nutrition.record_meal`, `read_meal`, `list_my_meals`, `revise_meal` y `delete_meal`, con la persona ya resuelta y el actor fijado; las políticas son `*_all_self` y `*_select_break_glass`, que abre la lectura solo bajo una ventana aprobada y vigente de `nutrition_intake`, y soporte entra por `support.exercise_break_glass`. Las vistas `v_my_meals` y `v_client_*` no existen: la lectura propia va por función, y la profesional llega con `relationships`. Borrar una comida pasa por `privacy.dispose_on_owner_request` con la política `nutrition`, anuncia `nutrition.meal_deleted.v1` y elimina en cascada ítems y valores.

### 10A.3 `nutrition.meal_items`

- **Propósito:** componente manual y ordenado de una comida.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` · `meal_id uuid` · `person_id uuid` · `position integer` · `name text` · `quantity_numeric numeric` (nullable) · `quantity_unit_code text` (nullable) · `serving text` (nullable, 1 a 40 caracteres: cómo dijo la persona la cantidad, «1 ½ tazas»; los nutrientes siguen los gramos) · `food_id uuid` (nullable, `ADR-041`) · `product_id uuid` (nullable, `ADR-041`) · `origin nutrition.item_origin` (`typed`, `catalog`, `photo`; por defecto `typed`) · `created_at timestamptz`.
- **FKs y borrado:** `(meal_id,person_id) → meals(id,person_id) ON DELETE CASCADE`; `quantity_unit_code → catalog.units(code) RESTRICT`; claves portadoras `UNIQUE(id,meal_id,person_id)` y `UNIQUE(id,person_id)` (`IX-28`).
- **Uniques y checks:** `UNIQUE(meal_id,position)`; `position>0`; cantidad/unidad aparecen juntas y cantidad `>0`; `origin='catalog'` exige exactamente uno de `food_id` y `product_id`, `origin='typed'` prohíbe los dos y `origin='photo'` prohíbe `product_id`; cada uno solo nombra un alimento o un producto publicado (función de escritura).
- **Implementado:** `position` de 1 a 100 y la pone el cliente, como pide el contrato; `name` hasta 160 caracteres; `quantity_numeric numeric(12,3)`. `nutrition.meal_item_guard_tg` exige que la unidad de cantidad sea una masa o un volumen y rechaza cualquier `UPDATE`: una revisión reemplaza los ítems, no los edita. Índice `(meal_id, person_id)` para la FK portadora.
- **Actores:** solo funciones de revisión de la persona.
- **RLS:** hereda del meal mediante `EXISTS`; sin lectura profesional directa.
- **Consultas:** por `meal_id` ordenado por posición.
- **Índices:** único `(meal_id,position)`.
- **Retención:** con la comida.
- **Eventos:** ninguno propio.

### 10A.4 `nutrition.meal_nutrient_values`

- **Propósito:** valor canónico no negativo de un nutriente para un ítem.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` · `meal_item_id uuid` · `meal_id uuid` · `person_id uuid` · `nutrient_definition_id uuid` · `value_numeric numeric` · `unit_code text` · `created_at timestamptz`.
- **FKs y borrado:** `(meal_item_id,meal_id,person_id) → meal_items(id,meal_id,person_id) ON DELETE CASCADE`; `(meal_id,person_id) → meals(id,person_id) ON DELETE CASCADE`; `nutrient_definition_id → nutrient_definitions(id) RESTRICT`; `unit_code → catalog.units(code) RESTRICT` (`IX-28`).
- **Uniques y checks:** `UNIQUE(meal_item_id,nutrient_definition_id)`; `value_numeric>=0`; unidad igual a la canónica mediante `nutrition.enforce_nutrient_unit_ct` (`IX-29`).
- **Implementado:** `value_numeric numeric(12,3)`. El constraint trigger de `IX-29` es `deferrable initially immediate`: una revisión futura puede diferirlo, y hoy rechaza en el acto. `nutrition.reject_nutrient_value_rewrite_tg` rechaza cualquier `UPDATE`. Índices sobre cada FK.
- **Actores:** solo funciones de comida.
- **RLS:** hereda desde item→meal; sin lectura profesional directa.
- **Consultas:** por ítem/nutriente; agregación por meal/persona mediante joins autorizados.
- **Índices:** único compuesto; `(nutrient_definition_id)`.
- **Retención:** con la comida.
- **Eventos:** ninguno propio.

### 10A.5 `nutrition.goal_sets`

- **Propósito:** única línea longitudinal de objetivos nutricionales de una persona.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` · `person_id uuid` · `created_at timestamptz` · `updated_at timestamptz`.
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; clave portadora `UNIQUE(id,person_id)`.
- **Uniques y checks:** `UNIQUE(person_id)`.
- **Actores:** la persona controla; se crea idempotentemente al publicar/proponer la primera versión.
- **RLS:** `access_control.is_self(person_id)`; profesional solo por vistas/funciones.
- **Consultas:** por `person_id`.
- **Índices:** único `(person_id)`.
- **Retención:** con la persona; no se archiva por relación.
- **Eventos:** ninguno propio.

### 10A.6 `nutrition.goal_versions`

- **Propósito:** snapshot inmutable de targets de origen personal o propuesta profesional.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` (**Command-Id en `OP-NUT-007/012`**) · `goal_set_id uuid` · `person_id uuid` · `version_number integer` · `origin nutrition.goal_origin` · `status nutrition.goal_status` · `rationale text` (nullable solo para `self`; obligatorio para `professional`) · `author_person_id uuid` · `author_membership_id uuid` (nullable) · `author_assignment_id uuid` (nullable) · `origin_relationship_id uuid` (nullable) · `origin_organization_id uuid` (nullable) · `credential_verification_id uuid` (nullable) · `created_at timestamptz` · `activated_at timestamptz` (nullable) · `cancelled_at timestamptz` (nullable).
- **FKs y borrado:** `(goal_set_id,person_id) → goal_sets(id,person_id) RESTRICT`; `author_person_id → identity.people(id) RESTRICT`; para origen profesional: `(origin_relationship_id,person_id,origin_organization_id) → relationships.service_relationships(id,person_id,organization_id) RESTRICT`, `(author_membership_id,origin_organization_id,author_person_id) → organizations.organization_memberships(id,organization_id,person_id) RESTRICT` y `(author_assignment_id,origin_relationship_id,person_id,origin_organization_id,author_membership_id) → relationships.relationship_professional_assignments(id,relationship_id,person_id,organization_id,membership_id) RESTRICT`; `credential_verification_id → identity.professional_credential_verifications(id) RESTRICT`; clave portadora `UNIQUE(id,person_id)` (`IX-30`).
- **Uniques y checks:** `UNIQUE(goal_set_id,version_number)`; activo único por set; pendiente profesional único por `(goal_set_id,origin_relationship_id)`; shape `self` sin contexto profesional y `professional` con contexto completo más `NULLIF(btrim(rationale),'') IS NOT NULL` y longitud máxima 2000; contenido inmutable, transición solo por funciones.
- **Actores:** persona publica self y decide; profesional elegible propone; ningún actor actualiza contenido.
- **RLS:** self por goal set; live/frozen profesional solo por proyecciones.
- **Consultas:** `(goal_set_id,created_at DESC,id DESC)`; `(origin_relationship_id,created_at DESC,id DESC)`; status parcial.
- **Índices:** únicos anteriores + `(person_id,status)` + `(goal_set_id,created_at DESC,id DESC)` + `(origin_relationship_id,created_at DESC,id DESC)`.
- **Retención:** mientras cuenta activa o hasta borrado; frozen consulta el mismo dato, sin snapshot.
- **Eventos:** `nutrition.goal_version_proposed.v1`, `nutrition.goal_version_activated.v1`, `nutrition.goal_proposals_cancelled.v1`.

### 10A.7 `nutrition.goal_targets`

- **Propósito:** target tipado por nutriente dentro de una versión inmutable.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` · `goal_version_id uuid` · `nutrient_definition_id uuid` · `mode nutrition.goal_target_mode` · `minimum_value numeric` (nullable) · `maximum_value numeric` (nullable) · `exact_value numeric` (nullable) · `unit_code text` · `created_at timestamptz`.
- **FKs y borrado:** `goal_version_id → goal_versions(id) ON DELETE CASCADE`; `nutrient_definition_id → nutrient_definitions(id) RESTRICT`; `unit_code → catalog.units(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE(goal_version_id,nutrient_definition_id)`; exactamente los campos requeridos por modo; valores no negativos; rango `minimum<=maximum`; unidad canónica (`IX-34`).
- **Actores:** solo funciones de publicación/propuesta.
- **RLS:** hereda de versión→set.
- **Consultas:** por versión/nutriente.
- **Índices:** único compuesto.
- **Retención:** con la versión.
- **Eventos:** ninguno propio.

### 10A.7a `nutrition.goal_references`

- **Propósito:** la meta de referencia que cada objetivo de entrenamiento le da a un programa de Allfit, por kilo de peso (PN-1, `HU-SP-100`).
- **Dominio / fuente de verdad:** Nutrición. La escribe solo la curaduría (`packages/db/curation/007_goal_references.sql`).
- **Clasificación:** contenido de referencia, no personal.
- **Columnas:** `goal_code text` · `nutrient_code text` · `mode nutrition.goal_target_mode` · `minimum_per_kg numeric` (nullable) · `maximum_per_kg numeric` (nullable) · `exact_per_kg numeric` (nullable) · `updated_at timestamptz`.
- **Uniques y checks:** `PK(goal_code, nutrient_code)`; `goal_code` en la lista cerrada de objetivos de programa; nutrientes `energy`, `protein`, `carbohydrates`, `fat`; `range` con mínimo y máximo, `exact` con exacto.
- **Actores:** lectura por `nutrition.reference_targets`; sin privilegios para `allfit_api`.
- **RLS:** forzada; solo lectura para `allfit_owner`.
- **Retención:** indefinida; una meta ya adoptada no depende de ella, porque se congela en la versión de la persona.

### 10A.8 `nutrition.goal_decisions`

- **Propósito:** aceptación o rechazo personal append-only de una propuesta profesional.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` (**Command-Id para `OP-NUT-008`**) · `goal_version_id uuid` · `person_id uuid` · `decision nutrition.goal_decision` · `decided_at timestamptz`.
- **FKs y borrado:** `(goal_version_id,person_id) → goal_versions(id,person_id) RESTRICT`.
- **Uniques y checks:** `UNIQUE(goal_version_id)`; solo versión `professional/proposed` propia mediante `nutrition.enforce_goal_decision_ct` (`IX-35`); append-only.
- **Actores:** solo la persona del goal set inserta mediante función cerrada.
- **RLS:** self; profesional solo ve la decisión por la proyección guidance autorizada.
- **Consultas:** por versión y `(person_id,decided_at DESC)`.
- **Índices:** único `(goal_version_id)`; `(person_id,decided_at DESC)`.
- **Retención:** con la versión; borrado personal alcanza live/frozen.
- **Eventos:** `nutrition.goal_version_accepted.v1`, `nutrition.goal_version_rejected.v1`.

---

### 10A.9 `nutrition.foods` y sus tablas (`ADR-041`)

- **Propósito:** el catálogo de alimentos de Allfit: ingredientes tomados de USDA FoodData Central (CC0) con nombre en español, y platos que son recetas de Allfit.
- **Dominio / fuente de verdad:** Nutrición; los datos viven en `packages/db/curation/005_food_catalogue.sql`, generado desde `curation/import/foods-authored.ts` y los CSV de USDA.
- **Clasificación:** `operational`.
- **Tablas y columnas:**
  - `foods`: `id uuid` · `name text` · `name_normalized text` (generada: minúsculas, sin tildes) · `kind nutrition.food_kind` (`ingredient`, `dish`) · `source nutrition.food_source` (`usda`, `allfit_recipe`) · `source_ref text` (el `fdc_id`) · `icon text` (un icono de alimento del Design System) · `grams_per_ml numeric` (nullable, 0,1 a 3: lo que pesa un mililitro de lo que se sirve líquido, sacado de la taza de USDA o 1 si no la trae; sin él no se ofrecen ml) · `status catalog.publication_status` · `published_at timestamptz` · `created_at timestamptz`.
  - `food_aliases`: `id uuid` · `food_id uuid` · `alias text` · `alias_normalized text` (generada).
  - `food_nutrients`: `food_id uuid` · `nutrient_definition_id uuid` · `value_per_100g numeric` · `unit_code text`.
  - `food_portions`: `id uuid` · `food_id uuid` · `label text` · `grams numeric` · `position integer` · `is_default boolean`.
  - `food_recipe_parts`: `dish_id uuid` · `part_food_id uuid` · `grams numeric` · `position integer`.
- **Uniques y checks:** `UNIQUE(name_normalized)`; `UNIQUE(alias_normalized)`; un ingrediente de USDA lleva `source_ref` numérico; una porción por defecto como máximo por alimento; valores `>=0` en la unidad canónica de su nutriente (`nutrition.enforce_canonical_unit`); una receta no se contiene a sí misma.
- **Actores:** lectura de cualquier persona por funciones; nadie escribe en runtime: cambia solo por curaduría.
- **RLS:** `FORCE`; lectura de lo publicado; sin escritura para `allfit_api`.
- **Consultas:** `nutrition.search_foods`, `nutrition.match_foods`, `nutrition.my_frequent_foods`.
- **Índices:** `(status, name_normalized text_pattern_ops)`; `(alias_normalized text_pattern_ops)`; `(food_id)`.
- **Retención:** permanente; referenciado por `meal_items.food_id`.
- **Eventos:** ninguno.

### 10A.10 `nutrition.recognition_consents` (`ADR-041`)

- **Propósito:** el consentimiento de una persona para que sus fotos de comida se reconozcan con un proveedor externo, por versión del texto aceptado.
- **Dominio / fuente de verdad:** Nutrición.
- **Clasificación:** `nutrition`.
- **Columnas:** `id uuid` (Command-Id) · `person_id uuid` · `text_version text` → `recognition_consent_versions(version)` · `accepted_at timestamptz`.
- **Uniques y checks:** `UNIQUE(person_id, text_version)`.
- **Actores:** solo la persona, por `nutrition.accept_recognition_consent` (`OP-NUT-017`).
- **RLS:** `FORCE`, `is_self`.
- **Retención:** mientras la cuenta esté activa; se elimina con la cuenta.
- **Eventos:** ninguno.

### 10A.11 `nutrition.products` y sus tablas (`ADR-041`)

- **Propósito:** los productos empacados vendidos en Colombia, tomados de Open Food Facts. Viven aparte de `nutrition.foods` porque sus datos son ODbL.
- **Dominio / fuente de verdad:** Nutrición. Los datos viven en `packages/db/curation/006_off_products.sql`, generado por `curation/import/products.ts` desde la búsqueda de Open Food Facts. Datos © colaboradores de Open Food Facts, bajo la ODbL; cada producto, bajo la Database Contents License.
- **Clasificación:** `operational`.
- **Tablas y columnas:**
  - `products`: `id uuid` · `barcode text` · `name text` · `name_normalized text` (generada) · `brand text` (nullable) · `brand_normalized text` (generada) · `quantity_label text` (nullable, el tamaño del empaque) · `icon text` · `grams_per_ml numeric` (nullable; 1 en las bebidas, cuyos valores vienen por 100 ml) · `status catalog.publication_status` · `published_at timestamptz` · `created_at timestamptz`.
  - `product_nutrients`: `product_id uuid` · `nutrient_definition_id uuid` · `value_per_100g numeric` · `unit_code text`.
  - `product_portions`: `id uuid` · `product_id uuid` · `label text` · `grams numeric` · `position integer` · `is_default boolean`.
- **Uniques y checks:** `UNIQUE(barcode)`, de 8 a 14 dígitos; una porción por defecto como máximo por producto; valores `>=0` en la unidad canónica (`nutrition.enforce_canonical_unit`). La importación deja fuera lo que no puede ser verdad por 100 g: más de 900 kcal, un macro de más de 100 g o macros que sumen más de 105 g. Los valores de bebidas vienen por 100 ml y se cuentan como gramos.
- **Actores:** lectura de cualquier persona por funciones; nadie escribe en runtime: cambia solo por curaduría.
- **RLS:** `FORCE`; lectura de lo publicado; sin escritura para `allfit_api`.
- **Consultas:** `nutrition.search_foods` (por nombre y marca, después de los alimentos propios que empaten) y `nutrition.my_frequent_foods`. `nutrition.match_foods` no los usa: una foto nunca se cruza con una marca.
- **Índices:** `(status, name_normalized text_pattern_ops)`; `(status, brand_normalized text_pattern_ops)`; `meal_items (person_id, product_id)`.
- **Retención:** permanente; referenciado por `meal_items.product_id`.
- **Eventos:** ninguno.

## 11. Schema `system`

### 11.1 `system.outbox_events`

- **Propósito:** eventos de dominio escritos transaccionalmente; transportan identificadores, no contenido sensible.
- **Dominio / fuente de verdad:** Sistema. Es la fuente de verdad del sobre transaccional y del estado de despacho de cada evento de dominio.
- **Clasificación:** `operational`.
- **Columnas diseñadas:** `id` · `type text` · `aggregate_kind text` · `aggregate_id uuid` · `subject_person_id uuid` (nullable) · `organization_id uuid` (nullable) · `correlation_id uuid` · `payload_schema_version smallint` (`1`) · `payload jsonb` · `dispatched_at timestamptz` (nullable).
- **Columnas implementadas:** `id` · `aggregate_type text` · `aggregate_id uuid` · `event_type text` · `payload_schema_version smallint` · `payload jsonb` · `occurred_at timestamptz` · `available_at timestamptz` · `published_at timestamptz` (nullable) · `attempt_count integer` · `last_error_code text` (nullable) · `dead_lettered_at timestamptz` (nullable). Los nombres difieren del diseño (`event_type` y `aggregate_type`, no `type` y `aggregate_kind`), no existen `subject_person_id`, `organization_id` ni `correlation_id`, y el despacho no es un solo `dispatched_at`: el reintento y la carta muerta son parte de la fila.
- **FKs y borrado:** sin FK dura por excepción explícita: `aggregate_id` es un identificador opaco de sobre, no una relación navegable ni fuente de autorización; el evento debe sobrevivir al agregado. `INSERT` directo revocado; la única entrada es `system.enqueue_outbox_event(...)` — el diseño la nombraba `enqueue_domain_event`.
- **Uniques y checks:** el `payload` nunca contiene datos sensibles (invariante documentada).
- **Actores:** `allfit_api` inserta; `allfit_worker_outbox` despacha.
- **RLS:** restringida a roles de sistema.
- **Diagnóstico de Backoffice (`HU-BO-031`):** `support.list_operational_events` presenta esta tabla junto a `system.idempotency_keys` como una sola bandeja, y `support.outbox_event_state` deriva el estado que se muestra: `dead_lettered`, luego `delivered` si hay `published_at`, luego `retrying` si ya hubo un intento, y `pending` en otro caso. **`pending` y `retrying` se mantienen separados a propósito**, para que una cola sana no se lea como una pila de fallos. La proyección **nunca** entrega `payload`, y por eso el diagnóstico no necesita ventana break-glass ni deja registro de acceso: una cola de entrega no tiene sujeto.
- **Consultas / índices:** `(dispatched_at, aggregate_id)` parcial sobre no despachados; orden por agregado.
- **Retención:** se purga tras despacho confirmado + margen.
- **Eventos:** es el mecanismo de eventos, no produce uno propio.

### 11.2 `system.idempotency_keys`

- **Propósito:** registra replay HTTP y la identidad durable de todo comando; el TTL de respuesta nunca habilita otra ejecución.
- **Dominio / fuente de verdad:** Sistema. Es la fuente de verdad del replay HTTP y de la identidad durable de cada comando.
- **Clasificación:** `operational`.
- **Columnas:** `id uuid` · `principal_fingerprint bytea` · `client_id text` · `surface system.command_surface` · `operation_code text` · `key uuid` · `command_id uuid` · `request_hash bytea` · `status system.idempotency_status` · `http_status smallint` (nullable mientras procesa) · `outcome_code text` (nullable mientras procesa) · `response_schema_version smallint` (`1`, nullable mientras procesa) · `response jsonb` (nullable mientras procesa o tras expirar) · `aggregate_type text` (nullable) · `aggregate_id uuid` (nullable) · `effect_disposed_at timestamptz` (nullable) · `completed_at timestamptz` (nullable mientras procesa) · `response_expires_at timestamptz` (nullable mientras procesa) · `purge_after timestamptz` (nullable) · `created_at timestamptz`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** uniques exactos de transporte `(principal_fingerprint,client_id,surface,operation_code,key)` y comando `(principal_fingerprint,surface,operation_code,command_id)`; hashes de 32 bytes; key/command UUIDv4/v7 para HTTP o UUIDv5 determinístico para `system`; aggregate tipo/ID emparejados; ventana de respuesta de 24 h. `system.enforce_idempotency_terminal_ct` impide confirmar `processing`; `system.expire_idempotency_response` es la única entrada que limpia response+versión tras expirar.
- **Actores:** `allfit_api` crea/terminaliza en la transacción; `allfit_idempotency_worker` expira response y purga cuando `purge_after` lo permite.
- **RLS:** restringida a API y worker dedicado; ningún runtime consulta receipts ajenos.
- **Diagnóstico de Backoffice (`HU-BO-031`):** `support.command_state` deriva el estado visible desde `status` y `http_status`, y un comando que sigue `processing` **cinco minutos** después de empezar se lee `stalled`. Ese umbral es el único número inventado de la historia: ninguna fuente normativa lo fija, y queda aquí para que se discuta en vez de quedar enterrado en una función. La proyección no entrega `payload`, `response`, `principal_fingerprint` ni `request_hash`: un diagnóstico no abre los datos de nadie.
- **Consultas / índices:** los dos uniques; `(response_expires_at,purge_after)`; parcial `(aggregate_type,aggregate_id) WHERE aggregate_id IS NOT NULL`.
- **Retención:** response 24 h; tombstone mínimo durable mientras el actor o agregado sean invocables. Disposición marca el efecto y un retry devuelve `410`, sin recrearlo. Contrato completo en [`V1_IDEMPOTENCY_CONTRACT.md`](./V1_IDEMPOTENCY_CONTRACT.md).
- **Eventos:** ninguno.

### 11.3 `system.job_runs`

> **No implementada.** El esquema `system` en V1 tiene `outbox_events`, `outbox_delivery_circuits`, `idempotency_keys` e `invitation_rate_windows`. La idempotencia por ciclo de los workers se resuelve hoy con `system.idempotency_keys` y claves UUIDv5 determinísticas. Esta entrada queda como diseño, no como estado.

- **Propósito:** registro de ejecución de workers; garantiza idempotencia de jobs por ciclo.
- **Dominio / fuente de verdad:** Sistema. Es la fuente de verdad del estado y la idempotencia de cada ejecución de worker por ciclo.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `job_name text` · `cycle_key text` · `status text` · `started_at timestamptz` · `finished_at timestamptz` (nullable) · `detail_schema_version smallint` (`1`, nullable junto a payload) · `detail jsonb` (nullable).
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `UNIQUE (job_name, cycle_key)` (un run por ciclo).
- **Actores:** workers.
- **RLS:** restringida a roles de sistema y soporte (metadatos).
- **Consultas / índices:** `(job_name, started_at desc)`; único `(job_name, cycle_key)`.
- **Retención:** auditoría operativa.
- **Eventos:** ninguno.

### 11.4 `system.invitation_rate_windows`

- **Propósito:** aplicar límites de emisión/entrega sin persistir el destinatario ni la IP.
- **Dominio / fuente de verdad:** Sistema; contador operativo temporal.
- **Clasificación:** `operational` minimizado.
- **Columnas:** `scope text` (`actor_hour`, `organization_day`, `destination_day`) · `scope_hash bytea` · `window_started_at timestamptz` · `attempt_count integer` · `expires_at timestamptz` · `updated_at timestamptz`.
- **Uniques y checks:** PK `(scope, scope_hash)`; hash SHA-256 de 32 bytes; contador positivo; expiración no superior a siete días de retención operacional.
- **Actores / RLS:** solo `allfit_owner` mediante `system.consume_invitation_rate_window`; sin grants de tabla para `allfit_api` y sin IP en la base de aplicación.
- **Consultas / índices:** la PK resuelve cada ventana; el worker elimina por `expires_at` durante la expiración de invitaciones.
- **Retención:** máximo siete días.
- **Eventos:** ninguno; el límite produce métrica sin PII y respuesta `429` con `Retry-After`.

---

### 11.5 `system.outbox_delivery_circuits`

- **Propósito:** estado del cortacircuitos por tipo de evento. Es lo que permite decir «un canal está caído» en vez de mostrar veinte fallos individuales y dejar que alguien deduzca la causa.
- **Dominio / fuente de verdad:** Sistema.
- **Clasificación:** `operational`.
- **Columnas:** `event_type text` · `state text` (`closed`, `open`, `half_open`) · `window_started_at timestamptz` · `success_count integer` · `failure_count integer` · `opened_until timestamptz` (nullable).
- **FKs y borrado:** ninguna; `event_type` es el mismo identificador opaco que en `outbox_events`.
- **Actores:** el worker de outbox escribe; `A10` con deber de diagnóstico lee.
- **RLS:** restringida a roles de sistema; la lectura de Backoffice pasa por función cerrada.
- **Diagnóstico de Backoffice (`HU-BO-031`):** `support.list_delivery_circuits` es la lectura, y la pantalla **abre por aquí**, no por la bandeja de eventos: un canal abierto explica de golpe todos los eventos atascados que cuelgan de él, y mirarlos uno por uno es perder el tiempo.
- **Panel de atención (`HU-BO-005`, `NEW-SUP-ATTENTION`):** `support.read_attention_panel` devuelve solo contadores y no escribe `privacy.access_events`, porque no revela a nadie. Lista los circuitos `open`/`half_open` y agrupa por `event_type` u `operation_code` lo que falla de forma repetida: cada intento fallido de un evento no publicado cuenta (uno que se rindió solo si fue en las últimas 24 horas) y cada comando `stalled` de las últimas 24 horas cuenta; un grupo aparece desde 2 fallas y la lista se corta en 20. Suma además las solicitudes `pending` de `identity.credential_verification_requests` y las renovaciones por vencer (mismo predicado que `identity.list_due_credential_renewals`), y las organizaciones `unclaimed` cuya última invitación `ownership` ya no está vigente. Cada aviso exige el deber de su destino y, sin él, llega `withheld` con conteos null; sin ningún deber que resuelva un aviso la lectura falla con `42501`. La ventana de 24 horas y el umbral de 2 son números inventados y declarados.
- **Retención:** estado vivo; no es historia.
- **Eventos:** ninguno.

---

## 12. Schema `support`

### 12.1 `support.platform_role_assignments`

- **Propósito:** quién del equipo de Allfit puede iniciar sesión en Backoffice. Es un control necesario, pero **no concede ninguna operación ni categoría de datos** sin deber vigente.
- **Dominio / fuente de verdad:** Soporte.
- **Clasificación:** `restricted`.
- **Columnas:** `id` · `person_id uuid` · `platform_role text` (`allfit_admin`) · `status text` (`active`, `revoked`) · `granted_by_person_id uuid` · `granted_at timestamptz` · `revoked_by_person_id uuid` (nullable) · `revoked_at timestamptz` (nullable).
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `granted_by_person_id → identity.people(id) RESTRICT`; `revoked_by_person_id → identity.people(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (person_id, platform_role) WHERE status = 'active'`; `CHECK (platform_role in ('allfit_admin'))` — catálogo cerrado que crece solo cuando exista alguien a quien asignarle el rol nuevo; `CHECK ((status = 'revoked') = (revoked_at IS NOT NULL))`; **`CHECK (granted_by_person_id <> person_id)`** — nadie se asigna su propio rol. **Nunca puede quedar cero `allfit_admin` activos**, garantizado por trigger.
- **Actores:** `A12/manage_platform_access` asigna o revoca a otra persona; `A12/manage_platform_access` o `audit_platform_access` consulta. El bootstrap inicial usa exclusivamente una ceremonia `allfit_migrator`, con dos personas existentes y asignaciones cruzadas en una transacción. Ninguna organización ni persona externa.
- **RLS:** exige rol base y deber de administración/auditoría vigentes, resueltos **en la transacción**; jamás desde grupo, cabecera o caché. El rol base nunca satisface por sí solo una policy de negocio. No existe función runtime de bootstrap; `allfit_migrator` se habilita sólo durante la ceremonia y conserva el mismo check de otorgante distinto.
- **Consultas / índices:** `(person_id, status)`, `(platform_role, status)`. El inventario se lee por `support.list_platform_role_assignments`, cerrada tras `support.require_platform_access_reader`, que acepta `manage_platform_access` **o** `audit_platform_access`. Leer el inventario no concede autoridad: cada operación revalida su deber en su propia transacción.
- **Retención:** **append-only sobre el historial**: retirar un rol cierra la fila, no la borra. `allfit_api` no tiene `DELETE` sobre esta tabla y **ningún rol lo tiene en runtime**. Sin eso, quien tuviera el rol podría borrar la evidencia de habérselo dado.
- **Eventos:** `support.platform_role_granted.v1`, `support.platform_role_revoked.v1`.

### 12.2 `support.platform_duty_assignments`

- **Propósito:** autoridad temporal y auditable para ejecutar una función concreta de Backoffice; determina el modo `A10`, `A11` o `A12` de la operación.
- **Dominio / fuente de verdad:** Soporte.
- **Clasificación:** `restricted`.
- **Columnas:** `id` · `person_id uuid` · `duty_code text` · `actor_mode text` (`A10`, `A11`, `A12`) · `status text` (`scheduled`, `active`, `suspended`, `expired`, `revoked`) · `valid_from timestamptz` · `valid_to timestamptz` · `required_aal smallint default 2` · `granted_by_person_id uuid` · `recertified_by_person_id uuid` (nullable) · `recertified_at timestamptz` (nullable) · `suspended_by_person_id uuid` (nullable) · `suspended_at timestamptz` (nullable) · `revoked_by_person_id uuid` (nullable) · `revoked_at timestamptz` (nullable) · `reason_code text`.
- **FKs y borrado:** todas las referencias de persona → `identity.people(id) RESTRICT`; `person_id` debe tener `platform_role_assignments` activo al entrar en vigencia, validado por trigger diferido.
- **Uniques y checks:** unique parcial `(person_id,duty_code) WHERE status IN ('scheduled','active','suspended')`; catálogo cerrado de ADR-028 y `actor_mode` derivado del código; `valid_to > valid_from` y `valid_to <= valid_from + interval '90 days'`; `required_aal = 2`; otorgante/recertificador/suspensor/revocador distintos de `person_id`; forma temporal exacta por estado.
- **Actores:** sólo `A12/manage_platform_access` administra a otra persona; `A12/manage_platform_access` o `audit_platform_access` consulta.
- **RLS:** tabla base sin acceso directo de cliente; funciones `support.assign_platform_duty`, `suspend_platform_duty` y `revoke_platform_duty` revalidan rol, deber, AAL2 y actor en la transacción. `access_control.has_platform_duty` es `SECURITY DEFINER`, `STABLE`, fail-closed y no acepta el código desde contexto no confiable.
- **Consultas:** autoridad exacta por `(person_id,duty_code,status,valid_from,valid_to)` e inventario interno por estado/vencimiento, expuesto por `support.list_platform_duty_assignments`. El estado leído lo deriva `support.effective_platform_duty_status(status, valid_to)`: un deber vencido nunca se presenta como activo aunque la fila conserve `active`.
- **Índices:** unique parcial anterior; `(person_id,status,valid_to)`; `(duty_code,status,valid_to)`; `(status,valid_to)`.
- **Retención:** historial append-only lógico; no hay `DELETE` en runtime. Usa la clase `platform_security_authority`; la purga queda bloqueada hasta cerrar `DB-P5-015`.
- **Eventos:** `support.platform_duty_granted.v1`, `support.platform_duty_suspended.v1`, `support.platform_duty_revoked.v1`, `support.platform_duty_expired.v1`, `support.platform_duty_recertified.v1`.

### 12.3 `support.break_glass_requests`

- **Propósito:** expediente inmutable que solicita y, si completa quorum, delimita una ventana excepcional para una persona, propósito, caso y categorías exactos.
- **Dominio / fuente de verdad:** Soporte.
- **Clasificación:** `highly_sensitive`.
- **Columnas:** `id` · `requester_person_id uuid` · `requester_duty_assignment_id uuid` · `subject_person_id uuid` · `policy_code text default 'break_glass.v1'` · `categories text[]` · `purpose text` · `case_reference text` · `sensitivity_tier text` (`standard`, `restricted`) · `required_approvals smallint` · `requested_duration_minutes smallint` · `requested_at timestamptz` · `request_expires_at timestamptz` · `status text` (`requested`, `approved`, `rejected`, `closed`, `expired`) · `window_starts_at timestamptz` (nullable) · `window_ends_at timestamptz` (nullable) · `closed_at timestamptz` (nullable) · `reviewed_at timestamptz` (nullable) · `reviewed_by_person_id uuid` (nullable) · `reviewed_by_duty_assignment_id uuid` (nullable) · `review_outcome text` (nullable).
- **FKs y borrado:** requester/subject/reviewer → `identity.people(id) RESTRICT`; duty FKs → `platform_duty_assignments(id) RESTRICT`; unique portadora `(id,requester_person_id,subject_person_id,requester_duty_assignment_id)` para eventos; sin cascadas.
- **Uniques y checks:** requester ≠ subject; `request_expires_at = requested_at + interval '30 minutes'`; categorías no vacías, sin duplicados y del catálogo aprobable; tier/quorum/duración calculados (estándar 1/30, restringido 2/15); propósito cerrado y `case_reference` opaca/no vacía; forma exacta de ventana, cierre y revisión por estado; sujeto, alcance y propósito inmutables.
- **Actores:** `A10/request_break_glass` crea y cierra sólo la propia; `A12` con deber compatible decide o revisa sin ejercer; la persona no consulta el expediente.
- **RLS:** sin DML directo; `support.request_break_glass`, `decide_break_glass`, `close_break_glass` y `review_break_glass` revalidan rol base, deber exacto, AAL2, conflicto, quorum y timestamp. La falta de autoridad o de auditoría falla cerrada.
- **Implementado:** `support.request_break_glass`, `decide_break_glass`, `exercise_break_glass`, `close_break_glass`, `list_break_glass_requests` y `break_glass_request_projection`. Derivan del alcance: `break_glass_category_tier`, `break_glass_scope_tier`, `break_glass_required_approvals`, `break_glass_duration_minutes`. La autoridad la comprueba `support.require_break_glass_duty`, sobre la que `allfit_api` **no** tiene `execute`: el runtime ejecuta las operaciones, nunca el guardia.
- **Divergencias con el diseño, verificadas:**
  - **`review_break_glass` no existe.** La revisión posterior por `A12` no está implementada, y las columnas `reviewed_by_person_id`, `reviewed_by_duty_assignment_id` y `review_outcome` sí existen: hoy las escribe la decisión, no una revisión aparte. La revisión sigue pendiente.
  - **`status` nunca almacena `expired`.** El vencimiento no es una transición: nadie corre en el instante en que la ventana se cierra. `support.effective_break_glass_status(status, request_expires_at, window_ends_at)` lo **calcula** en cada lectura, así que una ventana pasada de hora y una solicitud que nadie decidió a tiempo leen `expired` sin que ningún proceso las haya tocado. Una lectura que confiara en la columna vería una ventana abierta que ya venció.
  - `purpose` y `sensitivity_tier` son enums (`support.break_glass_purpose` con cinco propósitos, `support.break_glass_tier`), no texto con `CHECK`.
  - Una **categoría prohibida no es un nivel más estricto: no tiene nivel**. `break_glass_scope_tier` lanza `42501` al encontrarla, así que no existe alcance ni precio que la conceda.
  - El duplicado dentro de `categories` se rechaza en un trigger `before insert`, no en un `CHECK`: PostgreSQL no admite subconsultas en un `CHECK`.
- **Retirada de deber:** `support.close_break_glass_for_withdrawn_duty(uuid)` cierra toda ventana efectiva del deber retirado y la invoca el comando de deber al suspender, revocar o vencer. `allfit_api` no tiene `execute` sobre ella — cerrar ventanas es consecuencia de administrar acceso, no algo que se pida desde la superficie de break-glass. Completa el criterio 5 de `HU-BO-028`.
- **Consultas:** bandeja por estado/prioridad, solicitudes propias y vencimientos; nunca se usa como permiso sin revalidar aprobaciones y deber.
- **Índices:** `(requester_person_id,status,request_expires_at)`; `(subject_person_id,requested_at desc)`; `(status,request_expires_at)`; `(status,window_ends_at)`; `(reviewed_at) WHERE status IN ('closed','expired')`.
- **Retención:** clase `platform_security_access`; expediente e historia no se borran en runtime y su purga queda bloqueada por `DB-P5-015`.
- **Eventos diseñados:** `support.break_glass_requested.v1`, `support.break_glass_window_opened.v1`, `support.break_glass_closed.v1`, `support.break_glass_expired.v1`, `support.break_glass_reviewed.v1`.
- **Eventos emitidos:** `support.break_glass_requested.v1`, `support.break_glass_decided.v1`, `support.break_glass_window_opened.v1`, `support.break_glass_closed.v1`. `break_glass_decided.v1` no estaba en el diseño y hace falta: un rechazo también es una decisión que alguien tiene que ver. **`break_glass_expired.v1` no se emite** porque el vencimiento se calcula y nadie corre en ese instante para emitirlo; si se quiere una notificación al vencer, hace falta un job que la produzca. `break_glass_reviewed.v1` espera a que exista la revisión.

### 12.4 `support.break_glass_approvals`

- **Propósito:** decisión append-only de cada aprobador que aporta quorum o rechaza una solicitud.
- **Dominio / fuente de verdad:** Soporte.
- **Clasificación:** `highly_sensitive`.
- **Columnas:** `id` · `request_id uuid` · `approver_person_id uuid` · `approver_duty_assignment_id uuid` · `decision text` (`approved`, `rejected`) · `reason_code text` · `decided_at timestamptz`.
- **FKs y borrado:** `request_id → break_glass_requests(id) RESTRICT`; approver → `identity.people(id) RESTRICT`; deber → `platform_duty_assignments(id) RESTRICT`; sin cascadas.
- **Uniques y checks:** `UNIQUE(request_id,approver_person_id)`; aprobador distinto de solicitante/sujeto y de todo aprobador previo, comprobado por trigger; decisión y columnas inmutables; un rechazo es terminal y una aprobación parcial no cambia la ventana.
- **Actores:** sólo `A12/approve_break_glass` ajeno y sin conflicto inserta mediante función; auditor y A10 no insertan.
- **RLS:** tabla base sin DML directo; lectura sólo por proyección de expediente para A12 autorizado. `support.decide_break_glass` serializa la solicitud y abre ventana únicamente al completar quorum.
- **Implementado:** `support.enforce_break_glass_approver_independence` es el trigger que sostiene la separación de deberes, y `reject_break_glass_approval_rewrite` impide reescribir una decisión. La independencia vive ahí y **no se rederiva en la API ni en la pantalla**: `support.break_glass_viewer_projection` responde `viewer_is_requester`, `viewer_can_decide` y `viewer_can_exercise` para que el cliente no tenga una segunda copia de la regla que se desincronice. Son pistas, no autoridad: cada comando revalida por su cuenta. La sesión de Backoffice lleva `sub` y `sid` y ningún identificador de persona de dominio, así que sin esos tres campos el cliente no tendría forma de saberlo.
- **Consultas:** quorum por solicitud y cola de solicitudes pendientes.
- **Índices:** unique anterior; `(request_id,decision)`; `(approver_person_id,decided_at desc)`.
- **Retención:** misma clase y plazo que la solicitud; sin `UPDATE`/`DELETE` runtime; purga bloqueada por `DB-P5-015`.
- **Eventos:** incluidos en la transición de `break_glass_requests`.

### 12.5 `support.break_glass_events`

- **Propósito:** evidencia append-only de cada intento permitido o denegado de ejercer/cerrar una ventana, ligada a la auditoría visible de la persona.
- **Dominio / fuente de verdad:** Soporte; `privacy.access_events` conserva el reflejo visible.
- **Clasificación:** `highly_sensitive`.
- **Columnas:** `id` · `request_id uuid` · `requester_person_id uuid` · `requester_duty_assignment_id uuid` · `subject_person_id uuid` · `category text` · `result text` (`allowed`, `denied`) · `resource_type text` · `resource_id uuid` (nullable) · `operation_code text` · `reason_code text` · `occurred_at timestamptz` · `access_event_id uuid` · `access_event_occurred_at timestamptz`.
- **FKs y borrado:** FK compuesta `(request_id,requester_person_id,subject_person_id,requester_duty_assignment_id) → break_glass_requests(id,requester_person_id,subject_person_id,requester_duty_assignment_id) RESTRICT`; deber → `platform_duty_assignments(id) RESTRICT`; FK `(access_event_occurred_at,access_event_id) → privacy.access_events(occurred_at,id) RESTRICT` — el orden de columnas va al revés de la lista porque `privacy.access_events` está particionada por `occurred_at` y su clave primaria es `(occurred_at, id)`, y una FK compuesta nombra las columnas en el orden que declara el unique.
- **Uniques y checks:** `UNIQUE(access_event_id,access_event_occurred_at)`; categoría dentro del alcance de la solicitud; `occurred_at = access_event_occurred_at`; resultado/razón y recurso con forma exacta; append-only.
- **Actores:** sólo el `A10` solicitante exacto genera el evento mediante la función de lectura; `A12/audit_break_glass` consulta metadatos; la persona ve el `access_event`, no esta tabla.
- **RLS:** sin `INSERT` directo. La función de ejercicio revalida rol, deber, AAL2, solicitud, quorum, ventana, categoría y recurso, escribe ambos eventos y devuelve contenido sólo si `result='allowed'` y ambos inserts confirman.
- **Implementado, y es la decisión más importante de la historia:** `support.exercise_break_glass` **nunca lanza excepción**, y eso es un requisito de correctitud, no de estilo. Un intento denegado tiene que dejar evidencia, y en PostgreSQL una excepción revierte la función completa — incluidas las dos filas que prueban que el intento ocurrió. La primera versión denegaba con `raise exception` y `T-SUP-BG-01` lo cazó: cuatro asserts fallaron porque la evidencia desaparecía junto con el error. La función devuelve su resultado, el contrato declara `denied` como resultado válido y la API responde **200 con la razón registrada** en vez de 403. **«Falla cerrada» significa no devolver contenido, no lanzar.**
- **Escalera de denegación:** `not_the_requester` → `duty_not_effective` → `window_not_open` → `quorum_incomplete` → `category_out_of_scope`, en ese orden, para que a un impostor no se le informe que su categoría estaba fuera de alcance. Un intento autorizado escribe `reason_code='authorized_exercise'`.
- **Contador:** `exercise_count` en la proyección cuenta sólo eventos con `result='allowed'`. Un intento denegado deja su fila pero no sube el contador.
- **Sin contenido todavía:** `HU-BO-008` pide historial de sesiones, lo registrado y la agenda. Los esquemas `execution` y `nutrition` no existen, y `planning` sólo guarda `owner_person_id` y `author_person_id` — registra quién creó un programa, nunca a quién se le asignó, así que tampoco hay fuente de agenda. Hoy un ejercicio autorizado responde `content_unavailable` con `execution_and_nutrition_absent`: la ventana es válida, el intento queda registrado y no hay contenido. Es honesto, y no es el criterio cumplido.
- **Consultas:** por solicitud, actor, sujeto, resultado y tiempo para revisión/incident response.
- **Índices:** `(request_id,occurred_at)`; `(requester_person_id,occurred_at desc)`; `(subject_person_id,occurred_at desc)`; `(result,occurred_at desc)`.
- **Retención:** misma clase y plazo que solicitud/aprobaciones; sin `UPDATE`/`DELETE` runtime; purga bloqueada por `DB-P5-015`.
- **Eventos:** ninguno adicional; la fila y `privacy.access_events` son la evidencia.

---

## 13. Schema `payments`

Dominio incorporado por DT-017. Regla que lo gobierna: **Allfit refleja el estado del pago; no lo procesa.** Ninguna tabla de este schema contiene datos de tarjeta, saldos, giros ni conciliación.

### 13.1 `payments.gateway_connections`

- **Propósito:** vincula una organización con su propia cuenta de pasarela. Es lo que hace que la plata vaya directo al gimnasio sin pasar por Allfit.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `restricted`.
- **Columnas:** `id` · `organization_id uuid` · `provider text` (`mercado_pago`, `wompi`) · `external_account_ref text` · `credential_secret_ref text` (**referencia a un secreto externo, nunca el secreto**) · `status text` (`active`, `revoked`) · `connected_at timestamptz` · `revoked_at timestamptz` (nullable).
- **FKs y borrado:** `organization_id → organizations.organizations(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (organization_id) WHERE status = 'active'`; `CHECK (provider in ('mercado_pago','wompi'))`.
- **Actores:** solo `owner`. Ni `admin`, ni `coach`, ni `staff`.
- **RLS:** `access_control.has_membership(organization_id)` **y** `access_control.has_capability(organization_id,'manage_billing')`. Ninguna persona atendida lee esta tabla.
- **Consultas / índices:** por `organization_id`.
- **Retención:** con la organización; revocar no borra el historial de cobros.
- **Eventos:** `payments.gateway_connected.v1`, `payments.gateway_revoked.v1`.

---

### 13.2 `payments.organization_plans`

- **Propósito:** identidad estable del plan comercial que una organización ofrece. No contiene precio: el precio vive en la versión.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `organization_id uuid` · `name text` · `status catalog.publication_status` · `created_at timestamptz`.
- **FKs y borrado:** `organization_id → organizations.organizations(id) RESTRICT`; clave portadora `UNIQUE (id, organization_id)`.
- **Uniques y checks:** `UNIQUE (organization_id, lower(name))`.
- **Actores:** `admin` y `owner` escriben; el resto de la organización lee.
- **RLS:** `access_control.has_membership(organization_id)`; la escritura exige `manage_billing`.
- **Consultas / índices:** `(organization_id, status)`.
- **Retención:** con la organización.
- **Eventos:** `payments.plan_created.v1`.

---

### 13.3 `payments.plan_versions`

- **Propósito:** versión publicada e **inmutable** de un plan: precio, moneda y periodo. Una suscripción congela una de estas y nunca cambia bajo los pies de la persona.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `plan_id uuid` · `organization_id uuid` · `version_number integer` · `amount_minor bigint` · `currency_code text` (ISO 4217) · `billing_period text` (`month`, `year`) · `status catalog.publication_status` · `published_at timestamptz` · `deprecated_at timestamptz` (nullable).
- **FKs y borrado:** `(plan_id, organization_id) → organization_plans(id, organization_id) RESTRICT`; clave portadora `UNIQUE (id, organization_id)`.
- **Uniques y checks:** `UNIQUE (plan_id, version_number)`; `CHECK (billing_period in ('month','year'))`; `CHECK (amount_minor > 0)`. Sin `UPDATE` en runtime salvo la marca de deprecación: una versión publicada no se edita jamás.
- **Actores:** `admin` y `owner` publican; nadie edita.
- **RLS:** vía el plan; una organización nunca ve versiones de otra.
- **Consultas / índices:** `(plan_id, status)`.
- **Retención:** se conserva mientras exista una suscripción que la referencie.
- **Eventos:** `payments.plan_version_published.v1`, `payments.plan_version_deprecated.v1`.

---

### 13.4 `payments.plan_subscriptions`

- **Propósito:** el vínculo de pago entre una persona y una organización. Es una entidad **distinta de la relación de servicio** y tiene su propio ciclo de vida.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `person_id uuid` · `organization_id uuid` · `plan_version_id uuid` · `status payments.subscription_status` (`active`, `suspended`, `ended`) · `external_subscription_ref text` (nullable) · `current_period_end date` (nullable) · `started_at timestamptz` · `suspended_at timestamptz` (nullable) · `ended_at timestamptz` (nullable) · `ended_by_kind identity.actor_kind` (nullable) · `ended_by_membership_id uuid` (nullable).
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `(plan_version_id, organization_id) → plan_versions(id, organization_id) RESTRICT` (`IX-38`); `(ended_by_membership_id, organization_id) → organizations.organization_memberships(id, organization_id) RESTRICT`; clave portadora `UNIQUE (id, person_id, organization_id)`.
- **Uniques y checks:** `UNIQUE (person_id, organization_id) WHERE status <> 'ended'`; `CHECK ((status = 'suspended') = (suspended_at IS NOT NULL))`; `CHECK ((status = 'ended') = (ended_at IS NOT NULL))`; **`CHECK (status <> 'ended' OR ended_by_kind IS NOT NULL)`** — nada termina sin un actor humano, y el worker de pagos no puede escribir `ended` porque no tiene actor humano que declarar.
- **Actores:** la persona se suscribe y cancela; `admin`/`owner` suspenden, reactivan y terminan; el worker de pagos solo transiciona entre `active` y `suspended`. Suspender y reactivar se ejecutan mediante funciones cerradas que abren o cierran el `planning.service_access_blocks` exacto bajo lock (`IX-40`); ninguna transición restaura filas de otros dominios.
- **RLS:** `person_id = access_control.person()` **OR** (`organization_id = access_control.org()` **AND** `access_control.has_capability(organization_id,'manage_billing')`). Un `coach` **no** lee esta tabla: el estado de pago de su cliente no es asunto suyo.
- **Consultas / índices:** `(person_id, status)`, `(organization_id, status)`.
- **Retención:** con la persona; la anonimización rompe el vínculo y conserva el agregado de la organización.
- **Eventos:** `payments.subscription_started.v1`, `payments.subscription_suspended.v1`, `payments.subscription_reactivated.v1`, `payments.subscription_ended.v1`.

---

### 13.5 `payments.payment_records`

- **Propósito:** historial de cobros **reportados por la pasarela**. Allfit no cobra: registra lo que el proveedor informa.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `subscription_id uuid` · `person_id uuid` · `organization_id uuid` · `amount_minor bigint` · `currency_code text` · `result text` (`succeeded`, `failed`) · `failure_code text` (nullable) · `external_payment_ref text` · `occurred_at timestamptz` · `recorded_at timestamptz`.
- **FKs y borrado:** `(subscription_id, person_id, organization_id) → plan_subscriptions(id, person_id, organization_id) RESTRICT` (`IX-39`).
- **Uniques y checks:** `UNIQUE (organization_id, external_payment_ref)` — **el webhook de la pasarela queda idempotente por construcción**; append-only; `CHECK (result in ('succeeded','failed'))`.
- **Actores:** solo el worker de pagos inserta. La persona lee los suyos; `admin`/`owner` los de su organización.
- **RLS:** igual que la suscripción.
- **Consultas / índices:** `(subscription_id, occurred_at desc)`; el unique sirve la deduplicación.
- **Retención:** operativa. **No contiene datos de tarjeta**, solo la referencia opaca del proveedor.
- **Eventos:** `payments.payment_recorded.v1`.

---

### 13.6 `payments.subscription_events`

- **Propósito:** historia append-only de la suscripción: alta, suspensión, reactivación y terminación, con su actor.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `audit`.
- **Columnas:** `id` · `subscription_id uuid` · `event_type text` · `actor_kind identity.actor_kind` · `actor_person_id uuid` (nullable) · `actor_membership_id uuid` (nullable) · `detail_schema_version smallint` (nullable) · `detail jsonb` (nullable) · `occurred_at timestamptz`.
- **FKs y borrado:** `subscription_id → plan_subscriptions(id) ON DELETE CASCADE`.
- **Uniques y checks:** append-only.
- **Actores:** escribe el backend; leen la persona y la administración de la organización.
- **RLS:** vía la suscripción.
- **Consultas / índices:** `(subscription_id, occurred_at desc)`.
- **Retención:** auditoría.
- **Eventos:** ninguno propio.

---

### 13.7 `payments.platform_plans`

- **Propósito:** identidad estable de un plan que **Allfit** le vende a una persona. El precio vive en la versión.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `code text` · `name text` · `plan_kind text` (`free`, `paid`) · `status catalog.publication_status` (`draft` hasta publicar su primera versión, luego `published`) · `created_by_person_id uuid` · `created_by_duty_assignment_id uuid` · `created_at timestamptz`.
- **FKs y borrado:** ninguna saliente. Es contenido global de plataforma.
- **Uniques y checks:** `UNIQUE (code)`; `UNIQUE (id, plan_kind)` como clave portadora hacia las versiones; `CHECK (plan_kind in ('free','paid'))`; **`uidx_platform_plans_single_free`, `UNIQUE (plan_kind) WHERE plan_kind = 'free'`** — existe un solo plan gratuito, siempre, más estricto que «uno publicado»: sus límites cambian con versiones suyas. **El plan gratuito es un plan como cualquier otro**: sus límites son datos, no código, y cambiarlos no exige desplegar nada. Un trigger impide cambiar código, nombre, tipo o autor, despublicar o borrar.
- **Actores:** solo `A11`. Ninguna organización crea planes de plataforma.
- **RLS:** `SELECT` para cualquier cuenta autenticada sobre `status = 'published'`; `INSERT` solo con deber de plataforma.
- **Consultas / índices:** por `code`.
- **Retención:** contenido global; no se elimina mientras exista una suscripción que lo referencie.
- **Eventos:** `payments.platform_plan_published.v1`.

---

### 13.8 `payments.platform_plan_versions`

- **Propósito:** versión publicada e inmutable del plan de Allfit, con su precio y periodo, y el conjunto de funciones que habilita.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `platform_plan_id uuid` · `plan_kind text` (portado desde el plan) · `version_number integer` · `amount_minor bigint` · `currency_code text` (nullable en el plan gratuito) · `billing_period text` (`month`, `year`) · `status catalog.publication_status` (`draft` es una propuesta en revisión; `archived`, una propuesta retirada) · `supersedes_version_id uuid` (nullable) · `proposed_by_person_id uuid` · `proposed_by_duty_assignment_id uuid` · `proposed_at timestamptz` · `published_by_person_id uuid` · `published_by_duty_assignment_id uuid` · `published_at timestamptz` · `deprecated_at timestamptz` · `withdrawn_by_person_id uuid` · `withdrawn_by_duty_assignment_id uuid` · `withdrawn_at timestamptz` (los de publicación, retiro y deprecación son nullable).
- **FKs y borrado:** `platform_plan_id → platform_plans(id) RESTRICT`.
- **Uniques y checks:** `UNIQUE (platform_plan_id, version_number)`; FK compuesta `(platform_plan_id, plan_kind) → platform_plans(id, plan_kind)`; **`IX-41`** como `CHECK` sobre el tipo portado: una versión `paid` tiene monto positivo (hasta 10^11), moneda ISO 4217 y periodo `month` o `year`; una `free` tiene monto cero, sin moneda ni periodo. Únicos parciales: una versión `published` y una `draft` por plan. `CHECK` de revisión: quien publica no es quien propuso (`HU-BO-025`, criterio 5), y cada paso lleva su autor y su asignación de deber. Un trigger solo permite `draft → published`, `draft → archived` y `published → deprecated`, nunca reescribe lo que la versión ofrece ni su autoría, y rechaza borrar.
- **Actores:** solo `A11`.
- **RLS:** `SELECT` de versiones publicadas para cualquier autenticado.
- **Consultas / índices:** `(platform_plan_id, status)`.
- **Retención:** mientras exista una suscripción que la congele.
- **Eventos:** `payments.platform_plan_version_published.v1`.

---

### 13.9 `payments.platform_features`

- **Propósito:** catálogo cerrado de las funciones que un plan puede limitar. Existe para que el límite sea **dato y no código**.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `code text` (PK) · `name text` · `unit text` (nullable; por ejemplo `weeks`, `items`) · `created_at timestamptz`.
- **FKs y borrado:** ninguna.
- **Uniques y checks:** `CHECK (code ~ '^[a-z][a-z0-9_]{1,63}$')`. **Ninguna función de privacidad, consentimiento, portabilidad o supresión puede existir en este catálogo**: `ck_platform_features_not_privacy` rechaza los códigos que nombran una, y `T-PAY-PLAN-01` lo verifica. El catálogo cambia **solo por migración**, junto con el código que hace cumplir el límite; el runtime no tiene privilegio sobre la tabla. Se publicó vacío porque producto no ha decidido qué incluye cada plan (`HU-SP-084`).
- **Actores:** solo `A11`.
- **RLS:** legible por cualquier autenticado.
- **Consultas / índices:** PK.
- **Retención:** contenido global.
- **Eventos:** ninguno propio.

---

### 13.10 `payments.platform_plan_features`

- **Propósito:** el límite de cada función para una versión exacta de plan, **incluido el plan gratuito**. `NULL` significa sin límite; `enabled = false` significa que la función no está disponible en ese plan. Aquí es donde se decide, por ejemplo, si el plan gratuito registra comidas ilimitadas, solo una, o ninguna — y cambiarlo es publicar otra versión, no tocar código.
- **Dominio / fuente de verdad:** Pagos.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `platform_plan_version_id uuid` · `feature_code text` · `limit_value integer` (nullable = ilimitado) · `enabled boolean`.
- **FKs y borrado:** `platform_plan_version_id → platform_plan_versions(id) ON DELETE CASCADE`; `feature_code → platform_features(code) RESTRICT`.
- **Uniques y checks:** `UNIQUE (platform_plan_version_id, feature_code)`; `CHECK (limit_value IS NULL OR limit_value >= 0)`; `CHECK (enabled OR limit_value IS NULL)`. Una versión declara cada función del catálogo. Un trigger solo admite filas mientras la versión es una propuesta y rechaza cambiarlas o borrarlas.
- **Actores:** solo `A11`, dentro de la publicación de la versión.
- **RLS:** vía la versión.
- **Consultas / índices:** `(platform_plan_version_id, feature_code)`.
- **Retención:** con la versión.
- **Eventos:** ninguno propio.

---

### 13.11 `payments.platform_subscriptions`

- **Propósito:** la suscripción de una persona **a Allfit Pro**, comprada con la compra integrada de una tienda (`ADR-043`). La tienda cobra; Allfit registra lo que la tienda verificó.
- **Dominio / fuente de verdad:** Pagos. Migración `20261012100000_a_person_can_have_pro.sql`.
- **Clasificación:** `operational`.
- **Columnas:** `id` · `person_id uuid` · `platform_plan_version_id uuid` (congelada) · `store payments.platform_store` (`app_store`, `google_play`) · `store_product_id text` · `store_subscription_ref text` (el `originalTransactionId` de Apple, o el primer token de compra de Google con hash) · `environment text` (`production`, `sandbox`, `xcode`) · `status payments.platform_subscription_status` (`active`, `grace`, `suspended`, `ended`) · `auto_renews boolean` · `current_period_end timestamptz` · `grace_until timestamptz` (nullable) · `last_observed_at timestamptz` · `started_at` · `suspended_at` (nullable) · `ended_at` (nullable) · `ended_reason text` (`expired`, `refunded`, `revoked`, `replaced`) · `created_at` · `updated_at`.
- **FKs y borrado:** `person_id → identity.people(id) RESTRICT`; `(store, store_product_id, platform_plan_version_id) → platform_store_products RESTRICT`, de modo que el producto y la versión no pueden contradecirse.
- **Uniques y checks:** una suscripción viva por persona (`uidx_platform_subscriptions_live`); una referencia de tienda viva pertenece a una sola fila (`uidx_platform_subscriptions_ref_live`); `ended` exige `ended_at` y `ended_reason`; `grace` exige `grace_until`; `suspended` exige `suspended_at`. Un trigger impide cambiar persona, versión, tienda, producto, referencia y entorno, y prohíbe borrar.
- **Actores:** la persona registra su compra (`OP-PAY-019`); el consumidor de notificaciones (`worker`) mueve el estado (`OP-PAY-023`). **Ninguna organización lee esta tabla.**
- **RLS:** forzada; solo `allfit_owner`. `allfit_api` no tiene privilegios: todo pasa por funciones cerradas que exigen ser la propia persona.
- **Retención:** con la persona. Es historia: nunca se borra.
- **Eventos:** `payments.platform_subscription_started.v1`, `.suspended.v1`, `.reactivated.v1`, `.ended.v1`.

---

### 13.12 `payments.organization_premium_entitlements` — obsoleta

**No se crea** (`ADR-043`). En V1 todo gimnasio activo da Pro a sus invitados con relación vigente, y eso se resuelve al leer a partir de `relationships.service_relationships` y `organizations.organizations.status`. No hay nada que habilitar gimnasio por gimnasio.

---

### 13.13 `payments.platform_store_products`

- **Propósito:** qué producto de tienda vende cada versión de pago. Una versión con otro precio se vende con otro producto.
- **Columnas:** `store` · `product_id text` · `platform_plan_version_id uuid` · `created_at`.
- **Uniques y checks:** PK `(store, product_id)`; `uq (store, product_id, platform_plan_version_id)` para la FK compuesta de la suscripción. Solo versiones `paid`; nunca se cambia ni se borra.
- **Actores:** se carga por curaduría; editarlo desde Backoffice es otra historia.

### 13.14 `payments.platform_subscription_events`

- **Propósito:** la historia de cada suscripción: `started` y cada `changed`, con el estado, la renovación y el periodo observados.
- **Retención:** con la suscripción. Solo se agrega.

### 13.15 `payments.platform_payment_records`

- **Propósito:** cada cobro que la tienda reportó.
- **Columnas:** `platform_subscription_id` · `person_id` · `store` · `store_transaction_id` · `amount_minor` (nullable) · `currency_code` (nullable) · `result` (`succeeded`, `failed`) · `failure_code` · `occurred_at` · `recorded_at`.
- **Uniques y checks:** `uq (store, store_transaction_id)`: una transacción se registra una sola vez. Sin datos de tarjeta. Solo se agrega.

### 13.16 `payments.store_notification_receipts`

- **Propósito:** deduplicar las notificaciones de las tiendas.
- **Columnas:** `store` · `notification_id` · `payload_hash bytea` (32 bytes; **nunca el contenido**) · `outcome` (`processed`, `ignored`, `stale`) · `platform_subscription_id` (nullable) · `received_at`.
- **Uniques y checks:** `uq (store, notification_id)`. El mismo id con otro hash se rechaza.

---

## 14. Cobertura y verificación

### 14.1 Conteo por schema

| Schema | Tablas fichadas |
| --- | --- |
| `identity` | 21 |
| `organizations` | 11 |
| `relationships` | 6 |
| `privacy` | 17 |
| `catalog` | 18 |
| `planning` | 23 |
| `execution` | 14 |
| `nutrition` | 8 |
| `payments` | 12 |
| `system` | 4 |
| `support` | 5 |
| **Total** | **139** |

### 14.2 Invariantes transversales confirmadas por el diccionario

- **Ninguna referencia polimórfica usa uuid libre:** `disposition_items`, `correction_proposals` y `revision_events` usan FK nullable por tipo + `CHECK num_nonnulls = 1`.
- **Ninguna versión publicada es mutable:** `scope_definitions`, `session_template_versions`, `program_versions`, `result_contracts` revocan `UPDATE`/`DELETE` en runtime.
- **`NULL` nunca es cero:** los resultados tipados lo declaran explícitamente.
- **Cantidades físicas con unidad canónica:** todo `*_value` lleva su `*_unit_code`.
- **Auditoría con actor humano obligatorio:** `access_events` tiene `CHECK (actor_person_id is not null)`.
- **Un solo owner:** `session_templates`, `programs`, `movements` con `CHECK num_nonnulls(owner_*) = 1`.
- **Unicidad de estado:** titular efectivo, periodo de gestión, primaria y relación activa con `UNIQUE` parciales.
- **Particionamiento de auditoría:** `access_events` y `disposition_events` por rango mensual.

### 14.3 Ninguna tabla de capacidades diferidas

No existe tabla, columna ni JSON de booking, commerce, marketplace, integrations, intelligence, nutrición clínica/terapéutica ni menores. Nutrición V1 se limita a registro manual y guía profesional no clínica; `metric_samples` existe solo para fixtures de `sensor_enriched` y no habilita conectores.

## 15. Detalles de implementación que no cambian el modelo

P0-07 cerró objetos/JSONB/particiones y P0-08 cerró receipts, PKs offline y revisión optimista en sus catálogos normativos. Fase 5 solo puede decidir:

- el cuerpo compatible de `extensions.uuid_generate_v7()`, `uuid_is_v7()` y `uuid_v7_timestamp()` según la versión real de PostgreSQL, conservando sus firmas y pruebas;
- el cuerpo compatible de las funciones idempotentes cerradas, conservando firmas, transacción, checks y errores;
- valores concretos de seeds para los catálogos ya definidos;
- herramienta de generación de tipos TypeScript;
- organización interna de archivos SQL, sin cambiar orden, nombres ni semántica.

## 16. Estado de salida

Entregable principal de detalle de la Fase 4, complementado por el catálogo de objetos físicos. Se considera completo cuando la revisión confirme que:

1. las 136 tablas tienen ficha completa en sus quince campos;
2. el diccionario, el ERD lógico y las cardinalidades coinciden;
3. cada tabla tiene responsabilidad clara, integridad y justificación en operaciones reales;
4. ninguna tabla podría no existir sin romper una operación de la matriz;
5. ninguna tabla pertenece a una capacidad diferida.

Con este documento y `V1_PHYSICAL_OBJECT_CATALOG.md`, la especificación física de Fase 4 queda recertificada. La Fase 5 debe traducirla a migraciones sin reabrir sus decisiones.
