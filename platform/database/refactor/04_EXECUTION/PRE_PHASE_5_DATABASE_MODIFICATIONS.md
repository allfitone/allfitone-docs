# Modificaciones de base de datos requeridas por rebanada en Fase 5

**Versión:** 2<br>
**Fecha:** 3 de agosto de 2026<br>
**Estado:** registro activo de decisiones just-in-time por HU<br>
**Aplica a:** Allfit Space, Allfit OS y Allfit Backoffice<br>
**Gate afectado:** entrada de cada rebanada vertical a implementación en Supabase

## 1. Propósito

Este documento consolida las modificaciones de diseño de base de datos que deben resolverse **cuando una rebanada de HU las necesite**, antes de escribir la migración de esa rebanada. No exige cerrar por adelantado decisiones de otras áreas que todavía no se implementarán.

La revisión parte de:

- las 94 historias de [Allfit Space](../../../../products/space/USER_STORIES.md);
- las 84 historias de [Allfit OS](../../../../products/os/USER_STORIES.md);
- las 33 historias de [Allfit Backoffice](../../../../products/backoffice/USER_STORIES.md);
- los entregables vigentes de Fases 1 a 4;
- el estado declarado en [PHASE_5_READINESS_REVIEW.md](./PHASE_5_READINESS_REVIEW.md).

Este documento autoriza iniciar Fase 5 únicamente mediante rebanadas verticales que hayan cerrado su propio gate. No autoriza generar de una vez las 115 tablas documentadas, crear placeholders ni implementar una HU mientras alguno de los P0 que consume siga abierto.

## 2. Veredicto

El estado actual es **GO condicionado por rebanada vertical** y **NO-GO para generar la baseline completa de una sola vez**.

El `GO` existente fue emitido sobre una baseline de 99 tablas, 150 operaciones y 186 pruebas RLS. Después se incorporaron historias de producto, pagos, Premium, preferencias, contacto y Backoffice. La revisión contiene una nota posterior que exige ejecutarla de nuevo, pero su cuerpo todavía conserva las dimensiones anteriores.

La inspección reproducible del estado actual arroja:

| Dimensión | Estado declarado por el `GO` | Estado documental actual |
| --- | ---: | ---: |
| Historias de usuario | No forman parte de las fuentes de la revisión | 211 |
| Schemas físicos | 10 | 11 |
| Tablas con ficha en el diccionario | 99 | 115 tras aprobar opción B |
| Operaciones únicas `OP-*` | 150 | 184 tras completar `OP-SUP-*` |
| IDs/rangos de prueba explícitos en la matriz RLS | 186 | 211 tras añadir `T-DUTY-01..08` y `T-ROLE-6` |
| Rutas físicas `PR-*` | 27 | 28, ninguna para pagos |
| Operaciones en el OpenAPI canónico | 21 | 21, ninguna de identidad, organizaciones, pagos o Backoffice |
| Objetos `supabase/` | esperados en Fase 5 | todavía no existen |

El número final de tablas no debe fijarse antes de implementar las rebanadas que las justifican. El inventario instalado será consecuencia acumulativa de HU aprobadas, no una meta que obligue a crear tablas todavía innecesarias.

## 3. Regla de alcance y trazabilidad

Antes de modificar el modelo debe aprobarse qué historias forman parte de la baseline implementable.

La prioridad `después` no implica automáticamente exclusión: varias historias con esa prioridad ya dieron lugar a tablas, estados y políticas de privacidad en el diseño vigente. Cada HU debe quedar en uno de estos estados:

| Estado | Consecuencia |
| --- | --- |
| `included_v1` | Debe tener operación, persistencia o derivación explícita, autorización y pruebas antes de cerrar Fase 5 |
| `client_only_v1` | No crea DDL, pero debe documentar por qué el estado vive exclusivamente en el cliente |
| `deferred` | No crea tablas, columnas, enums, funciones, permisos ni placeholders en V1 |
| `rejected` | Se documenta la razón y la superficie debe rechazar o no ofrecer el flujo |

Para cada HU con efecto de datos debe existir una fila verificable:

```text
HU
→ operación OP-* o proceso de sistema
→ tabla, vista o función propietaria
→ invariantes/FKs/checks
→ ruta de autorización PR-*
→ contrato HTTP o contrato de job
→ pruebas positivas, negativas, concurrencia y recuperación
```

No se exige una operación de servidor para navegación, presentación o estado puramente local, pero la ausencia debe quedar justificada.

La propuesta de clasificación y la matriz completa de 211 HU están en
[V1_HU_DATABASE_TRACEABILITY_MATRIX.md](../03_PROPOSED_DESIGN/V1_HU_DATABASE_TRACEABILITY_MATRIX.md).
El documento registra las decisiones de alcance aprobadas y las brechas de trazabilidad técnica que todavía impiden cerrar este P0.

## 4. Registro consolidado de cambios

| ID | Severidad | Área | Estado |
| --- | --- | --- | --- |
| `DB-P5-001` | P0 | Recertificar alcance y trazabilidad HU | Alcance aprobado; trazabilidad técnica pendiente |
| `DB-P5-002` | P0 | Resolver el modelo de acceso de Backoffice | Resuelto: opción B aprobada y propagada |
| `DB-P5-003` | P0 | Materializar objetos físicos de soporte | Resuelto en diseño por ADR-028 |
| `DB-P5-004` | P0 | Completar ciclo de vida de organizaciones | Pendiente |
| `DB-P5-005` | P0 | Registrar actores de plataforma en eventos organizacionales | Pendiente |
| `DB-P5-006` | P0 | Modelar suspensión reversible de servicio | Pendiente |
| `DB-P5-007` | P0 | Completar persistencia de pagos y Premium | Pendiente |
| `DB-P5-008` | P0 | Cerrar resolución determinística de entitlements | JIT: pendiente hasta la primera rebanada que implemente `HU-SP-086`, `HU-SP-088` o `HU-BO-027` |
| `DB-P5-009` | P0 | Persistir cambios y recuperación de identidad | Pendiente |
| `DB-P5-010` | P0 | Persistir solicitudes de verificación profesional | Pendiente |
| `DB-P5-011` | P0 | Crear bandeja de avisos y entregas | Pendiente |
| `DB-P5-012` | P0 | Crear preferencias generales de persona | Pendiente |
| `DB-P5-013` | P0 | Tipar referencias de perfil a catálogos | Pendiente |
| `DB-P5-014` | P0 | Recompilar integridad, RLS e idempotencia | Pendiente |
| `DB-P5-015` | P0 | Cerrar retención y anonimización física | Pendiente legal/producto |
| `DB-P5-019` | P0 | Recertificar AuthKit, PKCE, claims y evidencia AAL2 | Pendiente antes de autenticación o Backoffice sensible |
| `DB-P5-016` | P1 | Sustentar búsquedas y métricas de Backoffice | Pendiente |
| `DB-P5-017` | P1 | Cerrar eventos, outbox, entregas y DLQ | Pendiente |
| `DB-P5-018` | P1 | Completar contratos y OpenAPI | Pendiente |

P0 significa que escribir **el DDL de una HU que lo consume** antes de resolverlo puede fijar una estructura incorrecta o insegura. Un P0 no bloquea una rebanada sin dependencia técnica o funcional hacia él. P1 puede implementarse dentro de la rebanada correspondiente cuando no altera decisiones P0, pero debe quedar cerrado antes de declarar terminada esa rebanada.

### 4.1 Decisión de ejecución por historias de usuario

Los socios acordaron el 3 de agosto de 2026 implementar la base de datos de forma incremental junto con las HU. Desde esta decisión:

1. se selecciona una HU o épica pequeña con valor demostrable;
2. se recorren sus dependencias en `V1_HU_DATABASE_TRACEABILITY_MATRIX.md`;
3. se cierran únicamente sus operaciones, objetos, P0, autorización, contratos e invariantes;
4. la decisión normativa y la migración aditiva se revisan en el mismo cambio;
5. se implementan pruebas positivas, negativas, concurrencia, idempotencia y recuperación de esa rebanada;
6. se actualizan los conteos instalados y la trazabilidad después de aplicar la migración;
7. no se crean tablas, columnas, enums, funciones o permisos para HU posteriores.

El diseño de Fases 1–4 sigue siendo referencia y mapa de riesgos, pero deja de ser una orden para materializar todo el modelo antes de validar flujos verticales. Una decisión transversal o irreversible se cierra antes de la primera HU que dependa de ella, no necesariamente antes de cualquier trabajo de Fase 5.

### 4.2 Cambio de proveedor de autenticación

`DB-P5-019` sustituye Cognito por WorkOS AuthKit sin cambiar la separación entre identidad externa y persona de dominio. Antes de implementar autenticación debe cerrar:

- un environment WorkOS aislado por ambiente Allfit y Applications separadas para Space, OS y Backoffice;
- Authorization Code con PKCE para Space, sin API key o client secret en el bundle;
- validación de JWKS, `iss`, `exp`, `iat`, `sub`, `sid` y `client_id` por superficie;
- rechazo de `org_id`, `role` y `permissions` de WorkOS como autoridad de dominio;
- ciclo de refresh, rotación, cierre y revocación de sesiones;
- binding de invitaciones por email al email verificado por WorkOS y decisión explícita para celular; AuthKit no prueba por sí solo control del teléfono;
- evidencia verificable de MFA/step-up para establecer `aal2`, incluida la ruta SSO; `auth_time` solo prueba frescura y no basta por sí mismo.

Hasta cerrar el último punto, cualquier operación que exija AAL2 permanece bloqueada y falla cerrada.

## 5. Identidad, contacto y recuperación

### 5.1 Problema

Las HU `HU-SP-076`, `HU-SP-077`, `HU-BO-010` y `HU-BO-011` exigen:

- conservar el contacto anterior mientras el nuevo está pendiente;
- verificar antes de promover;
- coordinar el correo de perfil y el correo de ingreso en WorkOS AuthKit;
- registrar iniciado, esperando verificación, confirmado, vencido, cancelado y fallido;
- permitir reenvío sin revelar código, token o enlace completo;
- conservar autoría y fechas;
- cerrar otras sesiones al confirmar un correo nuevo;
- fallar cerrado cuando la persona no controla un contacto verificado.

`identity.people` solo contiene el contacto vigente y sus timestamps de verificación. No existe una fila que represente la intención pendiente, su expiración o sus reenvíos.

### 5.2 Modificación requerida

Añadir una entidad durable, cuyo nombre físico debe cerrarse en el diccionario. Forma recomendada:

#### `identity.identity_action_requests`

Representa cambios de contacto y recuperaciones sin almacenar secretos.

Columnas mínimas:

- `id uuid`;
- `person_id uuid` nullable solo durante recuperación previa a resolver el sujeto;
- `account_id uuid`;
- `action_kind`: `change_email`, `change_phone`, `account_recovery`, `name_review`;
- `status`: `initiated`, `awaiting_verification`, `confirmed`, `expired`, `cancelled`, `failed`;
- `initiated_by_kind` y `initiated_by_person_id`;
- `current_contact_fingerprint bytea`;
- contacto propuesto cifrado o referencia segura, según la decisión de cifrado de PII;
- `provider_challenge_ref text`, nunca el secreto o código;
- `expires_at`, `confirmed_at`, `cancelled_at` y `failed_at`;
- `failure_code` cerrado y no revelador;
- `idempotency_command_id uuid`;
- `created_at`, `updated_at`.

#### `identity.identity_action_events`

Historial append-only de transiciones y reenvíos.

Columnas mínimas:

- `request_id`;
- `event_type`;
- actor humano real;
- `occurred_at`;
- `delivery_channel` nullable;
- referencia de entrega opaca;
- resultado y error clasificado;
- sin contacto en claro, token, contraseña o código.

### 5.3 Invariantes

- Solo una solicitud pendiente por persona y tipo de contacto.
- El contacto vigente no cambia antes de `confirmed`.
- La promoción del email en PostgreSQL y WorkOS usa una saga cerrada y compensable: una falla no deja dos valores efectivos. El teléfono no se sincroniza como identidad de AuthKit y usa su propio contrato de verificación.
- El contacto nuevo satisface unicidad sin permitir enumeración.
- `confirmed`, `expired` y `cancelled` son terminales.
- Reenviar no cambia sujeto, destino, finalidad o acción.
- El desafío nunca se almacena en claro.
- La confirmación de email genera evento para invalidar sesiones y notificar a contacto anterior y nuevo.
- Toda operación es idempotente y auditable.

### 5.4 Pruebas mínimas

- Cambio confirmado promueve el nuevo contacto una sola vez.
- Desafío vencido conserva el contacto anterior.
- Dos solicitudes concurrentes no crean dos contactos pendientes efectivos.
- Reenvío no revive una solicitud vencida.
- Colisión de contacto produce respuesta indistinguible.
- Falla de WorkOS AuthKit no modifica PostgreSQL; falla posterior de PostgreSQL ejecuta compensación o deja el caso recuperable sin doble vigencia.
- Backoffice solo ve estado y contacto parcialmente oculto.
- Ningún log, evento u outbox contiene códigos o enlaces completos.

## 6. Verificación de credenciales profesionales

### 6.1 Problema

`HU-BO-021` exige una cola de verificaciones pendientes, el título declarado, la fuente que debe consultarse, renovación y resultado. `identity.profile_verifications` modela el resultado terminal, pero no la solicitud pendiente ni su ciclo de trabajo.

### 6.2 Modificación requerida

Añadir `identity.credential_verification_requests` o una entidad equivalente.

Columnas mínimas:

- `id`;
- `claim_id`;
- `credential_type_code`;
- `requested_by_person_id`;
- `status`: `pending`, `in_review`, `verified`, `unverifiable`, `rejected`, `cancelled`, `expired`, `appealed`;
- registro o emisor sugerido y jurisdicción;
- `assigned_verifier_person_id` nullable;
- `review_started_at`, `due_at`, `decided_at`;
- `supersedes_request_id` para renovación o apelación;
- `created_at`.

Modificar `identity.profile_verifications` para referenciar la solicitud que resolvió.

### 6.3 Invariantes

- Una credencial puede tener solo una revisión vigente del mismo propósito.
- El resultado es append-only y no modifica la afirmación original.
- No se guardan documentos; solo fuente, método, referencia y fingerprint mínimo.
- `verified` siempre tiene `valid_to` de máximo 12 meses.
- Una incompatibilidad posterior abre otra solicitud, no reescribe el resultado anterior.
- La autoridad que decide se resuelve desde el modelo de plataforma aprobado en §12.

## 7. Preferencias personales y perfil tipado

### 7.1 Preferencias generales

`identity.notification_preferences` solo cubre canal por categoría. `HU-SP-094` exige idioma y unidades; `HU-SP-075`, si permanece en V1, exige conservar la preferencia de exportación a HealthKit/Health Connect.

Añadir `identity.person_preferences`:

- `person_id` único;
- `locale`;
- `mass_unit`: `kg`, `lb`;
- `distance_unit`: `km`, `mi`;
- `timezone` si el producto decide conservarla en servidor;
- `health_export_enabled` únicamente si `HU-SP-075` queda `included_v1`;
- `updated_at` y `revision_number` para concurrencia optimista.

Reglas:

- Solo la persona lee o modifica.
- Cambiar unidades no reescribe mediciones ni resultados históricos.
- Los valores canónicos y originales existentes se preservan.
- Preferencias no conceden scopes ni acceso a organizaciones.
- Si `HU-SP-075` queda diferida, no se crea su columna como placeholder.

### 7.2 Referencias del perfil a catálogos

`HU-SP-013` y `HU-SP-066` exigen elegir disciplinas y equipamiento desde listas. `identity.fitness_profile_claims` solo admite número o texto y no puede garantizar que un código de equipamiento exista.

Modificar el contrato de claims:

- ampliar `identity.profile_attributes.value_kind` a un enum cerrado: `numeric`, `text`, `option`, `discipline_ref`, `equipment_ref`;
- añadir a `fitness_profile_claims` columnas opcionales `option_code`, `discipline_code` y `equipment_id`;
- añadir FKs a `catalog.disciplines` y `catalog.equipment`;
- exigir exactamente una familia de valor por claim;
- conservar procedencia, vigencia y supersesión por cada referencia declarada.

Para opciones cerradas que no son entidades globales —por ejemplo `home`, `gym`, `outdoor`, `multiple`— añadir `identity.profile_attribute_options` con PK compuesta `(attribute_code, option_code)` y FK compuesta desde el claim.

Pruebas:

- no se guarda equipamiento inexistente;
- archivar equipamiento no rompe claims históricos;
- varias piezas de equipamiento coexisten como claims independientes;
- una observación profesional no reemplaza la declaración de la persona;
- los field-sets y scopes siguen filtrando cada claim.

## 8. Avisos, notificaciones y entrega

### 8.1 Problema

`HU-SP-091` exige una bandeja durable de avisos con:

- avisos informativos y avisos que requieren decisión;
- navegación al flujo que resuelve el aviso;
- historial de lo notificado;
- ausencia de datos personales en el contenido.

`HU-BO-005` y `HU-BO-031` requieren diagnosticar avisos atascados, errores y reintentos. `system.outbox_events` solo representa el evento de dominio y `identity.notification_preferences` solo decide canales.

### 8.2 Modificación requerida

Añadir `identity.person_notifications`:

- `id`;
- `person_id`;
- `category`: incluir al menos `relationship`, `assignment`, `consent`, `correction`, `nutrition`, `billing`, `security`;
- `event_code` y versión;
- `requires_action boolean`;
- `target_kind` y `target_id`, o un contrato de destino cerrado;
- `status`: `unread`, `read`, `resolved`, `dismissed`, `expired`;
- `occurred_at`, `read_at`, `resolved_at`, `expires_at`;
- `source_event_id` único;
- sin resultados, medidas, salud, comidas, contactos o texto libre sensible.

Añadir `system.notification_deliveries`:

- `notification_id`;
- `channel`;
- `status`: `pending`, `processing`, `delivered`, `failed_retryable`, `failed_final`, `dead_letter`;
- `provider_message_ref`;
- `attempt_count`;
- `next_attempt_at`, `last_attempt_at`;
- `last_error_code` cerrado;
- `delivered_at`, `dead_lettered_at`;
- unique por notificación y canal.

Modificar `identity.notification_preferences`:

- decidir la política de la categoría `billing`;
- mantener `security` siempre habilitada;
- validar que email/SMS solo se habiliten si existe contacto verificado;
- separar preferencia de entrega de existencia del aviso dentro de la app.

### 8.3 Invariantes

- Un canal deshabilitado no elimina el aviso de la bandeja.
- La entrega se deduplica por `(notification_id, channel)`.
- Un error de email no bloquea SMS, push o bandeja.
- La reasignación profesional solo confirma si el aviso obligatorio quedó encolado, no si el proveedor externo ya lo entregó.
- La revocación o disposición del dato origen reduce o elimina el destino navegable sin revelar contenido.
- El worker no recibe `BYPASSRLS` universal.

## 9. Ciclo de vida de organizaciones

### 9.1 Estados

`HU-BO-014`, `HU-BO-015` y `HU-BO-016` requieren organizaciones no reclamadas, canceladas y suspendidas. La operación `OP-ORG-018` ya usa `unclaimed`, pero el diccionario solo permite `active` y `closed`.

Crear `organizations.organization_status` con:

- `unclaimed`;
- `active`;
- `suspended`;
- `cancelled` para una creación nunca reclamada;
- `closed` para una organización que llegó a operar y terminó.

Modificar `organizations.organizations`:

- usar el enum anterior;
- añadir `claimed_at` nullable;
- `suspended_at` nullable;
- `cancelled_at` nullable;
- `closed_at` nullable;
- checks exhaustivos de forma por estado;
- índices por `(status, created_at)` y nombre normalizado para Backoffice.

### 9.2 Historial de suspensión

Añadir `organizations.organization_suspensions`:

- `organization_id`;
- `started_at`, `ended_at`;
- `reason_code` y motivo acotado;
- `started_by_person_id`;
- `ended_by_person_id` nullable;
- referencia a la asignación de rol de plataforma vigente;
- un solo periodo abierto por organización.

La tabla evita perder quién suspendió, por qué y durante cuánto tiempo cuando la organización vuelve a `active`.

### 9.3 Autoría de plataforma

Modificar `organizations.organization_events`:

- conservar `actor_membership_id` para acciones internas;
- añadir `actor_person_id` y `actor_platform_role_assignment_id` para acciones de Allfit;
- añadir `actor_kind` y `reason_code`;
- `CHECK` que exija exactamente el contexto de actor compatible;
- no usar `NULL` como representación implícita de “lo hizo Allfit”.

### 9.4 Reglas operativas

- `unclaimed` no tiene membresías y no puede invitar clientes, publicar planes, conectar pasarela o cobrar.
- La aceptación del futuro owner crea membresía/rol y transiciona a `active` en una sola operación idempotente.
- `cancelled` solo se alcanza desde `unclaimed` y conserva auditoría.
- `suspended` corta escrituras y operación de la organización, pero no termina relaciones ni revoca grants.
- `active` después de suspensión recupera autoridad sin nuevas aceptaciones.
- `closed` es irreversible y ejecuta el flujo completo de terminación/disposición aprobado.
- Todo helper `auth.has_membership` o `auth.has_capability` usado para escritura debe comprobar el estado operativo de la organización.

## 10. Suspensión de pago y pausa reversible

### 10.1 Problema

`HU-SP-083` y `HU-SP-088` exigen que un cobro fallido:

- suspenda indefinidamente la suscripción;
- pause sesiones futuras del programa originado en esa organización;
- conserve historial, relación y grants;
- permita al coach seguir leyendo lo autorizado;
- bloquee nuevas asignaciones, reprogramaciones, prescripciones, observaciones y correcciones;
- reactive exactamente el estado anterior cuando el pago se confirme.

Actualizar masivamente `planned_sessions.status='paused'` no es suficiente: no distingue la causa, mezcla terminación con falta de pago y no permite reanudar únicamente lo que esa suspensión pausó.

### 10.2 Modificación requerida

Añadir una entidad de bloqueo reversible. Nombre recomendado:

#### `planning.service_access_blocks`

- `id`;
- `person_id`;
- `organization_id`;
- `relationship_id` nullable;
- `subscription_id` nullable;
- `source_kind`: `subscription_suspension`, `organization_suspension`;
- `source_id`;
- `blocks_future_sessions boolean`;
- `blocks_professional_contribution boolean`;
- `started_at`, `ended_at`;
- `created_by_kind`;
- unique parcial por fuente mientras está abierto.

La alternativa de no crear tabla solo es válida si una vista/predicado puede reconstruir históricamente cada periodo desde eventos de suscripción y organización sin ambigüedad. La decisión debe quedar escrita y probada.

### 10.3 Cambios de autorización y proyección

- `auth.can_access(...,'read')` no consulta el bloqueo de pago.
- `auth.can_access(...,'contribute')` o un helper especializado deniega cuando existe bloqueo efectivo.
- La agenda expone `effective_status='paused'` y la causa permitida sin reescribir el estado intrínseco de la sesión.
- Una asignación conserva `lifecycle='active'`; no pasa a `detached_pending_choice`.
- Reactivar cierra únicamente el bloqueo de la suscripción correspondiente.
- Dos fuentes simultáneas —por ejemplo pago y suspensión de organización— deben cerrarse por separado; terminar una no abre mientras la otra siga vigente.

### 10.4 Pruebas

- Suspender no cambia grants, relación o periodo de gestión.
- Coach lee pero no escribe.
- Persona continúa entrenamiento autónomo y nutrición propia.
- Sesiones futuras aparecen pausadas; las completadas no cambian.
- Reactivar recupera contribución sin nuevo consentimiento.
- Cerrar un bloqueo no elimina otro vigente.
- Terminar la relación durante una suspensión aplica la terminación completa y no se revierte al recibir un pago posterior.

## 11. Pagos y Allfit Premium

### 11.1 Historial de cobros de plataforma

Las HU `HU-BO-020`, `HU-SP-085`, `HU-SP-086` y `HU-SP-087` requieren historial de pagos directos a Allfit. `payments.payment_records` solo referencia suscripciones entre persona y organización.

Añadir `payments.platform_payment_records`:

- `platform_subscription_id`;
- `person_id` como clave portadora;
- `amount_minor`, `currency_code`;
- `result`: `succeeded`, `failed`;
- `failure_code` nullable;
- `external_payment_ref`;
- `occurred_at`, `recorded_at`;
- unique por proveedor y referencia externa;
- sin tarjeta, PAN, token de tarjeta o método de pago reutilizable.

Añadir `payments.platform_subscription_events` o generalizar `subscription_events` de manera tipada para ambos tipos de suscripción. Debe conservar alta, suspensión, reactivación y terminación con actor.

Modificar `payments.platform_subscriptions`:

- registrar `ended_by_person_id` cuando la terminación es humana;
- checks completos de timestamps por estado;
- FK a la persona autora;
- historial append-only separado del snapshot actual.

### 11.2 Recepción de webhooks

Las operaciones de cobro dicen que una firma inválida se descarta y se registra, pero no existe una tabla que pueda registrar ese intento sin crear un cobro válido.

Añadir `payments.webhook_receipts`:

- proveedor y superficie `organization`/`platform`;
- `provider_event_id`;
- `payload_hash`, nunca el payload completo por defecto;
- `signature_status`;
- `processing_status`;
- referencias resueltas nullable;
- `received_at`, `processed_at`;
- `error_code` cerrado;
- unique por proveedor y evento.

El receipt deduplica la entrega externa; `payment_records` registra únicamente el hecho de cobro aceptado.

### 11.3 Resolución de Premium

La decisión se cerrará just-in-time antes de implementar `HU-SP-086`, `HU-SP-088`, `HU-BO-027` o cualquier operación que use Premium para autorizar una función. `HU-SP-084` puede publicar/consultar el catálogo y `HU-SP-085` puede congelar una suscripción directa sin decidir todavía la composición entre varias fuentes.

Las alternativas analizadas —precedencia de una fuente, composición por función o versión común— no son normativas hasta que producto apruebe la rebanada. En ese momento deben resolverse:

1. qué versión de plan obtiene una persona cuando Premium viene de una organización;
2. si esa versión queda congelada por acuerdo o sigue la versión Premium vigente;
3. qué ocurre si varias organizaciones activas habilitadas otorgan versiones distintas;
4. prioridad entre suscripción directa, organización y plan gratuito;
5. efecto de suspensión de organización y de suscripción.

Según la decisión futura, se modificará `payments.organization_premium_entitlements` para referenciar como mínimo `platform_plan_id` o `platform_plan_version_id`. La resolución no puede depender de “la versión vigente” sin una regla determinística, índice y prueba de concurrencia. Hasta entonces no se crea esta tabla en una migración ni se implementa `OP-PAY-020/022`.

Invariantes obligatorias:

- una suscripción directa activa tiene precedencia si así se ratifica;
- una suscripción suspendida no concede Premium;
- una organización suspendida no concede Premium;
- revocar entitlement no elimina datos;
- un cambio de plan no reescribe versiones congeladas;
- funciones de privacidad nunca aparecen en `platform_features`;
- el cálculo falla a plan gratuito, nunca a Premium.

## 12. Acceso de plataforma, auditoría y break-glass

### 12.1 Contradicción resuelta

Las HU de Backoffice declaraban un único rol `allfit_admin` que veía todos los datos y ejecutaba todas las funciones descritas. El diseño aprobado anterior establecía:

- `A10` para soporte ordinario sin contenido;
- `A11` para curaduría/verificación;
- `A12` para aprobar y auditar break-glass;
- deberes temporales, AAL2, quorum y separación de funciones.

La matriz de operaciones afirmaba después que DT-019 absorbió A11/A12 en A10, pero continuaba asignando operaciones a A11 y mantenía pruebas A12. ADR-028 resolvió la contradicción a favor de separación de deberes. `DT-019` queda supersedida y no se compilará RLS desde el modelo de rol total.

### 12.2 Opción A — rechazada

Esta alternativa no forma parte de V1. Habría implicado:

- `support.platform_role_assignments` permanece como autoridad del rol humano;
- se retiran A11/A12, deberes temporales y objetos break-glass de la baseline;
- todas las operaciones globales cambian a `allfit_admin`;
- el rol no recibe `SELECT` directo a tablas sensibles;
- cada lectura se ejecuta mediante funciones/proyecciones cerradas que escriben `privacy.access_events` antes de devolver contenido;
- una falla de auditoría impide la lectura;
- se decide si la persona puede consultar esos accesos, porque las HU y el refactor también discrepan en este punto;
- se recertifican privacidad, legal y amenazas por concentrar autoridad.

### 12.3 Opción B — aprobada el 3 de agosto de 2026

La baseline conserva el modelo de seguridad aprobado:

- las HU de Backoffice distinguen rol base, metadatos ordinarios, operaciones dedicadas y contenido break-glass;
- `support.platform_duty_assignments` conserva deber, modo A10/A11/A12, otorgante, vigencia máxima de 90 días, estado, recertificación, revocación y AAL2;
- existen fichas físicas completas para:
  - `support.break_glass_requests`;
  - `support.break_glass_approvals`;
  - `support.break_glass_events`;
- están incluidas en inventario, ERD, diccionario, integridad, RLS física y pruebas;
- se mantienen conflictos, quorum y revisión independiente;
- el primer provisionamiento exige una ceremonia sin endpoint ni seed: dos personas existentes, roles/deberes cruzados en una transacción con `allfit_migrator` y evidencia durable;
- la retención usa clases `platform_security_authority` y `platform_security_access`; su plazo/purga final permanece bloqueado por `DB-P5-015`.

### 12.4 Registro de decisión

Se aprobó la opción B. La fuente normativa es ADR-028 junto con ADR-026 y `V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md`. No se permite reintroducir una mezcla donde `allfit_admin` conceda acceso mientras una policy espere un deber temporal.

Independientemente de la opción:

- nadie se autoasigna rol;
- nunca queda cero administradores;
- retirar acceso no borra historial;
- cada lectura registra actor humano, categoría, sujeto, propósito, instante y resultado;
- ningún runtime usa owner, superuser o `BYPASSRLS`;
- las búsquedas también se auditan.

## 13. Búsquedas, dashboard y soporte operativo

### 13.1 Personas activas

`HU-BO-004` requiere personas registradas y activas por periodo. `activated_at` permite contar registros, pero no actividad semanal.

Añadir `identity.person_activity_days` o una proyección durable equivalente:

- `person_id`;
- `activity_date`;
- `product`: `space`, `os`, `backoffice`;
- `first_seen_at`, `last_seen_at`;
- unique `(person_id, activity_date, product)`;
- sin ruta, contenido, IP u otros datos innecesarios para la métrica.

La definición de “activa” debe aprobarse: petición autenticada, sesión iniciada u operación significativa. No debe inferirse desde lecturas profesionales sobre la persona.

### 13.2 Índices de búsqueda

Agregar y justificar:

- extensión `pg_trgm` si se aprueba búsqueda aproximada;
- índice GIN/trigram sobre nombre normalizado de persona;
- índices de igualdad existentes para email y teléfono normalizados;
- índice GIN/trigram sobre `organizations.display_name` normalizado;
- índices de Backoffice por estado de organización, suscripción, verificación y fecha;
- si `HU-SP-093` queda incluida, índices inversos por `movement_id` en resultados tipados y por `(person_id, started_at)` en ejecuciones.

Las consultas de Backoffice deben usar vistas/RPC cerrados, paginación por cursor y límites. Un índice no concede acceso.

### 13.3 Diagnóstico

`HU-BO-031` necesita estado, errores y reintentos de avisos, cobros y sincronización. Completar:

- `system.job_runs` con estado cerrado y error categorizado;
- `system.notification_deliveries` según §8;
- `payments.webhook_receipts` según §11;
- proyección `support.v_support_metadata` sin nombres, contactos ni contenido;
- correlación entre command, outbox, delivery, job y webhook mediante `correlation_id`.

## 14. Retención, disposición y anonimización

### 14.1 Decisiones pendientes

Antes del DDL de una rebanada deben cerrarse las decisiones de retención que afecten sus datos; todas deben estar cerradas antes del gate global:

- rol legal de Allfit por superficie;
- plazos por clasificación, finalidad, trigger y jurisdicción;
- retención de logs, eventos, receipts, entregas y actividad;
- tratamiento de texto libre, imágenes y JSONB;
- retención de pagos y referencias externas;
- búsqueda, caché, réplicas, storage y backups;
- política de invitaciones y contactos pendientes;
- prueba de reaplicación después de PITR.

### 14.2 Matriz física obligatoria

Crear un anexo normativo por tabla/columna con:

| Campo | Contenido |
| --- | --- |
| Categoría | `identity_pii`, `training`, `body`, `health`, `nutrition`, `payments`, `audit`, `operational` |
| Finalidad | propósito aprobado |
| Trigger | cierre, solicitud, expiración, terminación u otro |
| Plazo | valor aprobado |
| Acción | `delete`, `anonymize`, `retain_restricted` |
| Transformación | columnas que se eliminan, generalizan o rompen |
| Dependencias | hijos, búsquedas, storage, caché, réplica y backup |
| Hold | si puede suspenderse, alcance y máximo |
| Prueba | ID de prueba positiva/negativa/recuperación |

### 14.3 Reglas

- Sustituir `person_id` por otro UUID no es anonimización.
- Eliminar nombre pero conservar combinaciones raras puede seguir permitiendo reidentificación.
- Fotos y texto libre requieren tratamiento explícito.
- Un hold no concede acceso.
- Una restauración no revive datos dispuestos.
- El objetivo de 30 días de las solicitudes de supresión se refleja en `due_at`, alertas y pruebas, aunque cada categoría tenga una resolución distinta.

## 15. Eventos, outbox e idempotencia

### 15.1 Catálogo de eventos

Publicar un catálogo único con:

- nombre y versión;
- agregado;
- productor y consumidores;
- esquema de payload por IDs/códigos;
- orden requerido;
- política de deduplicación;
- retención;
- clasificación;
- efecto de disposición.

Debe incorporar como mínimo los nuevos eventos de identidad, organización, suspensión, pagos, Premium y notificaciones.

### 15.2 Outbox

Completar el contrato físico de `system.outbox_events`:

- orden por agregado;
- claim concurrente con `SKIP LOCKED` o mecanismo aprobado;
- deduplicación por consumidor;
- estado de despacho sin confundir “encolado” con “entregado”;
- política de reintento y dead letter;
- validación que impida payload sensible por función, no solo por convención;
- invalidación de cachés/read models ligada a la misma transacción cuando afecte autorización.

### 15.3 Idempotencia nueva

Extender [V1_IDEMPOTENCY_CONTRACT.md](../03_PROPOSED_DESIGN/V1_IDEMPOTENCY_CONTRACT.md) para cubrir:

- cambio/reenvío/confirmación de contacto;
- reclamación de organización no reclamada;
- suspensión y reactivación de organización;
- suspensión y reactivación de suscripción;
- webhooks de gimnasio y Allfit;
- creación y lectura de avisos;
- verificación profesional y apelación;
- habilitación/revocación de Premium.

Cada flujo debe probar concurrencia, timeout después de commit, replay con body distinto, identidad del actor y reintento después de expirar la respuesta HTTP.

## 16. Integridad y RLS física

### 16.1 Integridad

La matriz actual llega a `IX-41`, mientras el plan de Fase 5 todavía ordena implementar `IX-01..35`. Debe renumerarse o ampliar el gate sin perder ninguna invariante.

Añadir invariantes para:

- solicitud de identidad y persona/cuenta correctas;
- claim referencial y catálogo correcto;
- notificación y sujeto;
- delivery y notificación;
- organización y suspensión;
- actor de plataforma y asignación de rol vigente;
- service block y suscripción/organización/persona;
- payment record de plataforma y suscripción;
- webhook y efecto único;
- entitlement y versión de plan;
- solicitud y resultado de verificación;
- tablas de break-glass y deberes exigidas por ADR-028.

Todas se prueban también con un rol de prueba `BYPASSRLS`: RLS no sustituye integridad.

### 16.2 RLS

La matriz física debe añadir rutas `PR-*` para:

- contacto y recuperación propios;
- preferencias personales;
- bandeja de avisos;
- Backoffice y auditoría según la decisión del §12;
- organizaciones no reclamadas/suspendidas;
- pagos de organización;
- pagos de plataforma;
- resolución de Premium;
- verificación pendiente;
- bloqueo de contribución por suspensión;
- objetos de soporte que finalmente permanezcan.

Cada ruta declara columnas, joins, helper, proyección, índice y prueba exactos. No puede quedar una expresión “vía”, “hereda” o “visible” sin compilación física.

### 16.3 Seguridad de funciones

- `SECURITY DEFINER` solo donde sea necesario.
- `SET search_path` fijo y calificado.
- ownership por `allfit_owner`, nunca runtime.
- revocar `PUBLIC`.
- validar actor y contexto dentro de la transacción.
- funciones Backoffice registran acceso antes de devolver filas.
- funciones de pago fallan cerradas ante ambigüedad.

## 17. Contratos HTTP y de jobs

El OpenAPI canónico actual contiene 21 operaciones y no cubre identidad, organizaciones, pagos o Backoffice. Antes del primer handler de cada nueva rebanada:

- añadir su `x-allfit-operation`;
- cerrar request, response, errores, headers e idempotencia;
- generar DTOs;
- definir redacción de campos;
- probar ejemplos;
- impedir drift entre OpenAPI, función SQL y tipos generados.

Los procesos sin HTTP deben tener contrato de job equivalente: entrada, credencial, lote, lock, idempotencia, salida, error, métrica y recuperación.

## 18. Seeds y escenarios obligatorios

Además de los fixtures existentes, Fase 5 debe preparar:

### Identidad

- contacto vigente con cambio pendiente;
- cambio confirmado, vencido, cancelado y fallido;
- recuperación sin contacto controlado que falla cerrado;
- dos cambios concurrentes;
- solicitud de verificación profesional pendiente, verificada, no verificable y vencida.

### Organizaciones

- organización `unclaimed` sin membresías;
- reclamación por owner;
- cancelación antes de reclamar;
- suspensión y reactivación por plataforma;
- organización suspendida intentando invitar, publicar plan y cobrar;
- organización cerrada con relaciones y asignaciones.

### Pagos

- suscripción activa, suspendida y terminada;
- cobro de gimnasio exitoso/fallido y webhook duplicado;
- cobro de plataforma exitoso/fallido y webhook duplicado;
- firma inválida sin crear pago;
- dos fuentes Premium concurrentes;
- entitlement revocado;
- suspensión de organización y de plan simultáneas.

### Servicio suspendido

- coach que conserva lectura y pierde contribución;
- sesiones futuras efectivamente pausadas;
- entrenamiento autónomo intacto;
- reactivación exacta;
- terminación durante suspensión.

### Avisos y preferencias

- aviso informativo y con acción;
- canal deshabilitado con aviso visible en app;
- seguridad no desactivable;
- email fallido y push exitoso;
- dead letter visible solo como metadato;
- cambio de unidades sin reescribir originales.

### Backoffice

- búsqueda auditada por persona, organización y fecha;
- rol retirado con corte inmediato;
- intento de retirar el último admin;
- lectura sin poder escribir auditoría que falla cerrada;
- dashboard con valor desconocido representado como `NULL`, no cero.

## 19. Propagación documental obligatoria por rebanada

Cuando una rebanada cierre o cambie una decisión, la corrección debe propagarse en este orden dentro del mismo cambio:

1. aprobar HU y frontera V1;
2. crear o actualizar ADR cuando la rebanada cambie una decisión transversal o irreversible —por ejemplo pagos, Premium o acceso de plataforma—;
3. actualizar glosario;
4. corregir `V1_DATABASE_SCOPE.md` cuando cambie la frontera de la rebanada;
5. actualizar ownership map;
6. actualizar ERD conceptual;
7. actualizar matriz de operaciones;
8. actualizar RLS funcional y física;
9. actualizar contratos de API/degradación/idempotencia;
10. actualizar ERD lógico y diccionario;
11. actualizar catálogo físico e integridad;
12. actualizar `DATABASE_REFACTOR_PHASES.md` y `README.md`;
13. ejecutar el gate de la rebanada y registrar su resultado.

Ningún documento derivado de la rebanada debe conservar conteos o actores anteriores después de cambiar la fuente normativa. `PHASE_5_READINESS_REVIEW.md` se recalcula para el cierre global de la baseline V1, no para comenzar cada HU.

## 20. Checklists de implementación y cierre

### Gate de cada rebanada

- [ ] La HU y sus dependencias están aprobadas y no dependen de una HU diferida.
- [ ] Ninguna fila de la rebanada conserva `NEW-*`, `PR pendiente` u objeto propietario por decidir.
- [ ] Todos los P0 consumidos por la rebanada están resueltos y propagados.
- [ ] Operación, contrato, migración, RLS, integridad, idempotencia y recuperación están trazados.
- [ ] La migración es aditiva o incluye una transición explícita y recuperable; no crea placeholders de HU futuras.
- [ ] Las pruebas de la rebanada pasan desde una base reconstruida y con roles runtime reales.
- [ ] Los conteos instalados y la matriz HU → BD se actualizaron en el mismo cambio.

Las secciones siguientes son el checklist para cerrar la **baseline V1 completa**; no bloquean el inicio de una rebanada independiente.

### Alcance

- [ ] Las 211 HU tienen estado de alcance aprobado.
- [ ] Cada HU con efecto de datos tiene trazabilidad completa.
- [ ] Las capacidades diferidas no generan DDL especulativo.

### Decisiones

- [x] Se eligió la opción B para acceso de Backoffice y se propagó mediante ADR-028.
- [ ] Pagos y Premium tienen ADR que supersede cualquier exclusión anterior.
- [ ] La resolución de Premium es determinística.
- [ ] El rol legal de Allfit está aprobado.
- [ ] Los plazos de retención están aprobados.

### Modelo físico

- [ ] ERD, diccionario y catálogo reportan el mismo número de schemas y tablas.
- [ ] Cada tabla tiene ficha individual completa.
- [ ] No existen tablas referenciadas sin ficha ni fichas sin tabla en ERD.
- [ ] Todos los enums, JSONB, vistas y funciones tienen contrato.
- [ ] Identidad pendiente, organizaciones, suspensión, pagos, preferencias y avisos están modelados.

### Integridad y seguridad

- [ ] Todas las invariantes tienen mecanismo PostgreSQL y prueba negativa.
- [ ] Todas las operaciones tienen ruta física RLS.
- [ ] Pagos y Backoffice tienen pruebas de aislamiento y auditoría.
- [ ] Ningún runtime usa owner, superuser o `BYPASSRLS`.
- [ ] `SECURITY DEFINER` tiene `search_path` seguro y grants mínimos.

### Contratos

- [ ] OpenAPI cubre la primera rebanada que realmente se implementará.
- [ ] Jobs y webhooks tienen contratos equivalentes.
- [ ] Idempotencia cubre los nuevos comandos y eventos externos.
- [ ] Eventos/outbox tienen orden, deduplicación, retención y DLQ cerrados.

### Privacidad y recuperación

- [ ] Existe matriz física de retención/anonimización.
- [ ] Storage, cachés, búsquedas, réplicas y backups están incluidos.
- [ ] PITR no revive datos dispuestos ni permisos revocados.
- [ ] Avisos, outbox y logs no contienen payload sensible.

### Gate global de baseline

- [ ] `PHASE_5_READINESS_REVIEW.md` fue recalculado desde las fuentes actuales.
- [ ] El veredicto nuevo no depende de conteos históricos.
- [ ] El `GO` confirma que todas las rebanadas V1 terminaron y que el inventario instalado coincide con la documentación.

## 21. Ciclo recomendado de ejecución

1. **Elegir la siguiente HU o épica pequeña.** Producto define valor y orden; no el inventario de tablas.
2. **Trazar dependencias y P0 consumidos.** Sólo esos bloquean la rebanada.
3. **Cerrar la mínima decisión normativa necesaria.** ADR cuando sea transversal o irreversible; contrato local cuando no lo sea.
4. **Actualizar el diseño afectado.** Glosario, ownership, operación, RLS, ERD y diccionario únicamente en el alcance de la rebanada.
5. **Implementar migración, API y pruebas juntas.** La BD nunca se adelanta con placeholders.
6. **Validar el flujo vertical.** Reconstrucción, aislamiento, concurrencia, idempotencia, degradación y recuperación.
7. **Registrar resultado y elegir la siguiente HU.** Repetir hasta completar V1.
8. **Recertificar la baseline global.** Al final, recompilar conteos, readiness y evidencia de Fases 1–6.

## 22. Resultado esperado

Al cerrar cada rebanada debe existir un incremento coherente y reconstruible de la baseline, sin decisiones inventadas dentro de la migración. El objetivo no es minimizar la cantidad de tablas; es garantizar que cada objeto instalado exista por una HU o invariante ya implementada, que cada acceso sea demostrable y que pagos, identidad y datos sensibles fallen cerrados.

La Fase 5 puede comenzar con la primera rebanada que supere su gate. Una rebanada no comienza por crear SQL mientras sus propias fuentes normativas sean incompatibles, pero tampoco espera decisiones que sólo afectan HU posteriores.
