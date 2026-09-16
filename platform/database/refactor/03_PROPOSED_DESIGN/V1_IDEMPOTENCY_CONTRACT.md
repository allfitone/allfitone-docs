# Contrato de idempotencia durable V1

**Fecha:** 28 de julio de 2026; recertificado el 17 de agosto de 2026<br>
**Estado:** aprobado y recertificado con AFO-39<br>
**Deriva de:** [ADR-025](../02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md), [`V1_OPERATIONS_MATRIX.md`](./V1_OPERATIONS_MATRIX.md), [`V1_DEGRADATION_AND_RECOVERY_MATRIX.md`](./V1_DEGRADATION_AND_RECOVERY_MATRIX.md), [`V1_SPACE_STUDIO_API_CONTRACTS.md`](./V1_SPACE_STUDIO_API_CONTRACTS.md), [`V1_DATA_DICTIONARY.md`](./V1_DATA_DICTIONARY.md)

---

## 1. Decisión

V1 separa dos garantías que no son equivalentes:

1. **Replay HTTP temporal:** `Idempotency-Key` permite repetir la misma petición y recuperar su resultado mínimo durante 24 horas.
2. **Identidad durable del comando:** `Command-Id` identifica una intención de negocio durante toda la vida invocable del actor o del agregado. Que expire el replay HTTP nunca autoriza a ejecutar otra vez el efecto.

Todo comando HTTP que muta dominio lleva ambos headers. Las consultas no llevan ninguno. `OP-SUP-003` es la excepción explícita: cada ejercicio break-glass es una nueva lectura y debe producir su propio `ACCESS_EVENT`, por lo que nunca se deduplica ni reproduce desde caché.

```http
Idempotency-Key: <uuid-v4>
Command-Id: <uuid-v7>
```

Para un borrador local, `Command-Id` se genera al crear la intención en el dispositivo. `Idempotency-Key` se genera al preparar cada operación HTTP y se reutiliza solo para reintentos de esa misma operación. Una misma clave no se comparte entre crear, guardar resultados y finalizar.

Los comandos `system` no reciben headers de un caller: derivan `key` y `Command-Id` con namespaces UUIDv5 distintos sobre `<operation_code>:<target>:<cycle>`.

---

## 2. Scope no controlado por el caller

El backend calcula el scope efectivo antes de abrir el comando:

| Dimensión | Fuente |
| --- | --- |
| `principal_fingerprint` | SHA-256 de kind + ID canónico: `person_id` tras activación, `access_account.id` durante onboarding o principal de servicio estable |
| `client_id` | Claim `client_id` de la WorkOS Application validada o identidad del worker |
| `surface` | ruta resuelta por el servidor: `space`, `studio`, `system` |
| `operation_code` | operación `OP-*` asociada a la ruta o job |

Ni actor, WorkOS Application, superficie ni operación se aceptan desde body o headers libres.

La identidad de transporte es:

```text
(principal_fingerprint, client_id, surface, operation_code, idempotency_key)
```

La identidad durable es:

```text
(principal_fingerprint, surface, operation_code, command_id)
```

Esto permite repetir una misma clave accidental en otro actor u operación sin mezclar resultados, pero impide que el mismo comando se ejecute desde otro WorkOS Application para evadir la deduplicación durable.

---

## 3. Contrato físico de `system.idempotency_keys`

### 3.1 Tipos

```text
system.command_surface       = space | studio | backoffice | system
system.idempotency_status    = processing | succeeded | rejected_final
```

### 3.2 Columnas

| Columna | Tipo | Nullability / regla |
| --- | --- | --- |
| `id` | `uuid` | PK, UUIDv7 generado en base |
| `principal_fingerprint` | `bytea` | 32 bytes |
| `client_id` | `text` | allowlist de clientes autenticados |
| `surface` | `system.command_surface` | derivada por servidor |
| `operation_code` | `text` | formato `OP-[A-Z]{3}-[0-9]{3}` |
| `key` | `uuid` | UUIDv4 para HTTP; UUIDv5 determinístico para `system` |
| `command_id` | `uuid` | UUIDv7 para HTTP; UUIDv5 determinístico para `system` |
| `request_hash` | `bytea` | SHA-256 canónico, 32 bytes |
| `status` | `system.idempotency_status` | `processing` solo dentro de la transacción |
| `http_status` | `smallint` | nullable mientras procesa |
| `outcome_code` | `text` | nullable mientras procesa; código no sensible de éxito/rechazo |
| `response_schema_version` | `smallint` | nullable mientras procesa; V1=`1` |
| `response` | `jsonb` | nullable mientras procesa; contrato mínimo cerrado |
| `aggregate_type` | `text` | nullable; aparece con `aggregate_id` |
| `aggregate_id` | `uuid` | nullable; aparece con `aggregate_type` |
| `effect_disposed_at` | `timestamptz` | nullable; impide recrear un efecto ya dispuesto |
| `created_at` | `timestamptz` | `default now()` |
| `updated_at` | `timestamptz` | trigger estándar; cambia al terminalizar, expirar o disponer |
| `completed_at` | `timestamptz` | nullable mientras procesa |
| `response_expires_at` | `timestamptz` | nullable mientras procesa; `completed_at + 24 hours` |
| `purge_after` | `timestamptz` | nullable; nunca se calcula solo desde `created_at` |

No se almacena body, token, nombre, contacto, dato de perfil, entrenamiento, cuerpo ni salud.

### 3.3 Uniques e índices exactos

```text
system_idempotency_keys_transport_uidx
  UNIQUE (principal_fingerprint,client_id,surface,operation_code,key)

system_idempotency_keys_command_uidx
  UNIQUE (principal_fingerprint,surface,operation_code,command_id)

system_idempotency_keys_expiry_idx
  (response_expires_at,purge_after)

system_idempotency_keys_aggregate_idx
  (aggregate_type,aggregate_id) WHERE aggregate_id IS NOT NULL
```

### 3.4 Checks y guardián

```text
system_idempotency_keys_principal_hash_chk
system_idempotency_keys_request_hash_chk
system_idempotency_keys_operation_code_chk
system_idempotency_keys_key_version_chk
system_idempotency_keys_command_version_chk
system_idempotency_keys_terminal_shape_chk
system_idempotency_keys_aggregate_pair_chk
system_idempotency_keys_response_window_chk
system_idempotency_keys_disposition_chk
```

`system.enforce_idempotency_terminal_ct` es un constraint trigger diferible: ninguna transacción puede confirmar una fila `processing`. Al terminalizar exige `http_status`, `outcome_code`, `response_schema_version`, `response`, `completed_at` y `response_expires_at`.

La única entrada que puede limpiar el documento es `system.expire_idempotency_response(id)`, ejecutada por `allfit_idempotency_worker`. Solo después de `response_expires_at` deja `response` y `response_schema_version` ambos nulos; no altera hashes, command ID, `status`, `http_status` ni `outcome_code`.

---

## 4. Algoritmo transaccional

1. El servidor autentica, resuelve `OP-*`, superficie y client.
2. Canonicaliza método, plantilla+IDs de ruta, query ordenada, `Content-Type`, `If-Match` y body JSON; para binarios usa su digest. Excluye headers de transporte y calcula `request_hash`.
3. Intenta insertar la fila `processing` con ambas identidades.
4. Si choca la identidad HTTP o durable:
   - hash distinto: `409 idempotency-key-reuse` o `409 command-id-reuse`;
   - mismo hash y terminal dentro de 24 h: replay mínimo con `Idempotent-Replay: true`;
   - mismo hash después de 24 h: no ejecuta; devuelve el outcome mínimo durable o `410 command-effect-disposed`;
   - transacción original aún abierta: espera hasta el timeout corto; si continúa, `409 idempotency-in-progress` + `Retry-After`.
5. Ejecuta dominio, auditoría y outbox en la misma transacción.
6. Antes del commit cambia la fila a `succeeded` o `rejected_final`.
7. Un error de infraestructura o rechazo retryable revierte dominio y fila. El siguiente intento puede ejecutar.

Si el proceso muere, PostgreSQL revierte la transacción y libera el unique lock. No existe lease ni fila `processing` huérfana que otro worker deba “adoptar”.

Solo se persisten como `rejected_final` errores determinísticos que el mismo comando nunca puede corregir. Conflictos temporales, timeouts y `5xx` no se terminalizan.

---

## 5. Garantía durable por clase de operación

`Command-Id` es obligatorio para todos los comandos idempotentes. Además, los comandos offline y los efectos críticos tienen una segunda defensa de dominio:

| Operaciones | Identidad/guardián de dominio |
| --- | --- |
| `OP-IDN-004` | `fitness_profile_claims.id = command_id`, UUIDv7 del dispositivo |
| `OP-IDN-005` | `revision_events.id = command_id`, append-only |
| `OP-IDN-006` | `body_progress_records.id = command_id`, UUIDv7 del dispositivo |
| `OP-IDN-008` | `health_context_claims.id = command_id`, UUIDv7 del dispositivo |
| `OP-ORG-002`, `OP-ORG-004` | receipt durable + `If-Match` sobre `revision_number`; una revisión obsoleta no reemplaza datos de organización o sede |
| `OP-ORG-007` | receipt durable + `Command-Id` + único de rol vigente; un replay posterior a revocar el rol o expirar el replay HTTP devuelve el resultado original y nunca vuelve a concederlo |
| `OP-ORG-008/009/010/012` | receipt durable + locks del agregado + contratos públicos interdominio; ningún efecto parcial sobre roles, membresías, asignaciones o cierre |
| `OP-ORG-011` | receipt durable + lock de organización/membresías/roles + constraint de owner único; el replay conserva el mismo owner resultante |
| `OP-EXE-001`, `OP-EXE-004` | `executed_sessions.id = command_id`, UUIDv7 del dispositivo |
| `OP-EXE-002`, `OP-EXE-003`, `OP-EXE-006` | receipt durable + lock de `executed_sessions` + transición de estado convergente |
| `OP-EXE-005` | receipt durable + `If-Match` sobre `executed_sessions.revision_number`; un draft obsoleto no reemplaza resultados nuevos |
| `OP-NUT-001` | `nutrition.meals.id = command_id`; ítems/nutrientes se crean en la misma transacción |
| `OP-NUT-003` | receipt durable + `If-Match` sobre `nutrition.meals.revision_number`; la foto se sanea antes de sustituir referencia |
| `OP-NUT-004` | receipt durable + disposición unitaria; reintentar después de borrar devuelve el mismo outcome/`410` |
| `OP-NUT-007`, `OP-NUT-012` | `nutrition.goal_versions.id = command_id` + lock del goal set + únicos de versión activa/pendiente |
| `OP-NUT-008` | `nutrition.goal_decisions.id = command_id` + único por versión + lock del goal set |
| Publicar/asignar/terminar/conceder/revocar/disponer | receipt durable + unique/estado/constraint propio del agregado |
| Jobs `OP-SYS-*` | UUIDv5 determinístico + `job_runs(job_name,cycle_key)` |

Un `PUT` semánticamente idempotente no sustituye la identidad del comando: evita duplicar el mismo estado, pero por sí solo no impide que un draft antiguo sobrescriba una revisión posterior.

---

## 6. Retención, replay y disposición

- A las 24 horas `system.expire_idempotency_response` limpia response y versión; permanece el tombstone durable con hashes, scope, command ID, outcome y referencia operativa mínima.
- Un tombstone durable no se purga mientras el principal pueda autenticarse o el agregado pueda recibir reintentos.
- La disposición del agregado pone `effect_disposed_at`, elimina juntos `aggregate_type`/`aggregate_id` cuando corresponda y conserva la identidad del comando. Un retry devuelve `410`; nunca recrea el dato.
  - **Implementado para `OP-IDN-006`, `OP-IDN-008` y `OP-NUT-001`, con una diferencia:** la disposición todavía no escribe `effect_disposed_at`. El replay comprueba si el agregado del receipt sigue existiendo y, si no, levanta `AF410`, que el API responde como `410 command-effect-disposed`. El resultado es el que pide esta regla; la columna queda para cuando haya una disposición que no borre la fila.
- Cuando el principal queda cerrado de forma irreversible y terminó la ventana de propagación/backups, el worker fija `purge_after`.
- `purge_after` no puede preceder `response_expires_at`.

La retención protege integridad y no conserva el contenido del comando.

---

## 7. Contrato mínimo de respuesta

`system.idempotency_response` V1 contiene:

```text
status: succeeded | rejected_final
exactamente uno de:
  resource_id + resource_type
  etag
  error_code
opcional:
  effect_disposed: true
```

No es un caché de la respuesta de dominio. El endpoint reconstruye una proyección actual solo si el actor aún está autorizado.

---

## 8. Pruebas de cierre de P0-08

| ID | Prueba |
| --- | --- |
| `T-IDEM-01` | Misma key, scope y hash concurrentes producen un efecto; el segundo request espera o recibe `idempotency-in-progress`. |
| `T-IDEM-02` | Misma key o command ID con hash distinto devuelve `409` sin mutar dominio. |
| `T-IDEM-03` | Retry después de 24 h con el mismo command ID no ejecuta de nuevo. |
| `T-IDEM-04` | Crash antes de commit no deja fila `processing`; el retry puede ejecutar una vez. |
| `T-IDEM-05` | Error final se reproduce; error retryable/infraestructura no bloquea el retry. |
| `T-IDEM-06` | Dos actores o dos operaciones con la misma key no comparten outcome. |
| `T-IDEM-07` | Un draft `OP-EXE-005` con ETag obsoleto no sobrescribe una revisión confirmada. |
| `T-IDEM-08` | Disponer el agregado y reintentar devuelve `410` sin recrearlo. |
| `T-IDEM-09` | La respuesta y el tombstone no contienen PII ni payload de dominio. |
| `T-IDEM-10` | Cada comando idempotente de la matriz tiene `Command-Id` y convergencia; `OP-SUP-003` conserva auditoría por lectura sin replay. |
| `T-ORG-IDEM-01` | Ejecutar `OP-ORG-007`, revocar el rol y repetir el `Command-Id` tras expirar el TTL devuelve el receipt durable original sin reabrir la vigencia ni producir otro evento. |
| `T-ORG-IDEM-02` | Reintentar actualización de organización o sede no duplica eventos ni incrementa dos veces la revisión. |
| `T-ORG-IDEM-03` | Dos transferencias concurrentes confirman como máximo una y siempre dejan exactamente un owner; replay no invierte la transferencia. |
| `T-ORG-IDEM-04` | Un fallo en cualquier contrato público de cierre, baja o renuncia revierte idempotencia y todos los efectos de dominio; el retry puede ejecutar una vez. |
| `T-NUT-IDEM-01` | Crear offline y reenviar el mismo `OP-NUT-001` produce una comida, un conjunto de hijos y un evento. |
| `T-NUT-IDEM-02` | Reintentar el adjunto diferido de foto no duplica medios; un `If-Match` obsoleto no reemplaza la foto vigente. |
| `T-NUT-IDEM-03` | Dos revisiones concurrentes serializan por `revision_number`; la perdedora devuelve `409` sin cambios parciales. |
| `T-NUT-IDEM-04` | Dos decisiones concurrentes sobre una propuesta producen una decisión y una sola versión activa. |
| `T-NUT-IDEM-05` | Crash entre objetivo, targets, decisión/outbox o comida/hijos revierte todo; retry ejecuta una vez. |
| `T-NUT-IDEM-06` | Disponer una comida y reintentar create/update/delete no la recrea ni restaura su media. |

P0-08 queda documentalmente cerrado. Fase 5 debe implementar el contrato sin reducir la garantía durable al TTL de la respuesta HTTP.
