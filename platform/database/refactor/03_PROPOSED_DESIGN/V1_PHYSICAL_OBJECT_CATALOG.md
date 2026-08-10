# Catálogo de objetos físicos y contratos JSONB V1

**Fecha:** 3 de agosto de 2026
**Fase:** 4 — cierre de especificación física
**Estado:** inventario de 120 tablas; sesión técnica de Studio, bloqueo causal y perfil profesional normalizado materializados
**Deriva de:** [`POSTGRES_MODELING_STANDARD.md`](./POSTGRES_MODELING_STANDARD.md), [`V1_LOGICAL_ERD.md`](./V1_LOGICAL_ERD.md), [`V1_DATA_DICTIONARY.md`](./V1_DATA_DICTIONARY.md)

## 1. Propósito

Este catálogo cierra las decisiones que no pueden dejarse a quien escriba la primera migración:

- conteo e identidad de las tablas físicas;
- schema propietario de enums compartidos;
- nombres determinísticos de constraints, índices, triggers y policies;
- forma, versión y validación de cada JSONB;
- identidad global y mantenimiento de tablas particionadas.

No sustituye las fichas de las 120 tablas. Fija las reglas mecánicas que todas consumen.

## 2. Inventario recertificado

| Schema | Tablas |
| --- | ---: |
| `identity` | 16 |
| `organizations` | 10 |
| `relationships` | 6 |
| `privacy` | 16 |
| `catalog` | 13 |
| `planning` | 17 |
| `execution` | 14 |
| `nutrition` | 8 |
| `payments` | 12 |
| `system` | 3 |
| `support` | 5 |
| **Total** | **120** |

El conteo se obtiene de 120 fichas de tabla en el diccionario, incluidas `identity.access_sessions` como almacenamiento técnico de sesión, `planning.service_access_blocks` como bloqueo causal y las tablas normalizadas de especialidades y credenciales profesionales. Incluye cuatro targets, cinco resultados tipados, ocho tablas nutricionales y las cinco tablas de soporte de ADR-028 como tablas independientes. Excluye:

- enums;
- vistas y funciones;
- schemas y extensiones;
- secuencias inexistentes para UUID;
- particiones mensuales hijas;
- índices, constraints, triggers y policies.

`V1_LOGICAL_ERD.md` y `V1_DATA_DICTIONARY.md` deben fallar CI si sus inventarios difieren.

## 3. Tipos compartidos

Un enum existe una sola vez en el schema indicado. Una columna de otro schema usa siempre el nombre calificado.

| Tipo canónico | Consumidores externos al schema |
| --- | --- |
| `identity.actor_kind` | todos los dominios que registran actor |
| `identity.access_session_surface` | `identity.access_sessions` |
| `identity.provenance` | ejecución y perfil |
| `privacy.access_level` | relaciones, planificación y ejecución |
| `catalog.content_scope` | catálogo |
| `catalog.publication_status` | `privacy.scope_definitions` y artefactos `planning` |
| `catalog.completeness_level` | `execution.executed_sessions` y validaciones |
| `nutrition.meal_type` | `nutrition.meals` |
| `nutrition.goal_origin` | `nutrition.goal_versions` |
| `nutrition.goal_status` | `nutrition.goal_versions` |
| `nutrition.goal_target_mode` | `nutrition.goal_targets` |
| `nutrition.goal_decision` | `nutrition.goal_decisions` |

No existen `planning.publication_status` ni `privacy.publication_status`. Esta decisión evita enums homónimos incompatibles y casts implícitos en FKs, funciones o vistas.

## 4. Nombres físicos determinísticos

Todos los nombres se generan en minúscula. No se permite elegir otro nombre en la migración.

| Objeto | Forma exacta | Ejemplo |
| --- | --- | --- |
| PK | `<table>_pkey` | `data_grants_pkey` |
| FK | `<table>_<rol>_fk` | `data_grants_relationship_context_fk` |
| Unique de negocio/portadora | `<table>_<columnas>_uq` | `scope_definitions_id_scope_code_uq` |
| Check | `<table>_<regla>_chk` | `data_grants_state_timestamps_chk` |
| Índice no unique | `<table>_<columnas>_idx` | `access_events_subject_person_id_occurred_at_idx` |
| Índice parcial | `<table>_<columnas>_<estado>_idx` | `data_grants_relationship_id_scope_code_frozen_idx` |
| Policy | `<table>_<comando>_policy` | `data_grants_select_policy` |
| Trigger ordinario | `<table>_<acción>_tg` | `scope_definitions_published_immutable_tg` |
| Constraint trigger | nombre exacto `IX-*` | `planning.enforce_target_family_ct` |

Reglas adicionales:

1. `<columnas>` conserva el orden del DDL y omite `DESC`.
2. Una tabla tiene como máximo una policy por comando; las alternativas de actor se combinan dentro de ella.
3. Si el nombre excede 63 bytes, se conserva un prefijo de 54 bytes y se añade `_` + los primeros 8 hex de `sha256(nombre_completo)`. El script generador y el verificador usan la misma función.
4. Los índices obligatorios son los de las fichas y `PR-01..29`; no se crean índices “por si acaso”.
5. Los triggers guardianes `IX-01..44`, `privacy.enforce_data_grant_transition_tg`, los validadores JSONB y los de partición conservan los nombres publicados, no los regeneran.

## 5. Contrato transversal JSONB

Todo JSONB tiene una columna hermana `*_schema_version smallint`. Para V1 solo se acepta `1`. Payload y versión son ambos nulos o ambos no nulos cuando el documento es opcional.

La validación usa:

```text
system.validate_json_contract(
  p_contract_code text,
  p_schema_version smallint,
  p_payload jsonb
) RETURNS boolean
```

Es `IMMUTABLE`, `STRICT`, `SECURITY INVOKER`, no consulta tablas y rechaza:

- versión desconocida;
- tipo raíz incorrecto;
- claves requeridas ausentes;
- claves adicionales;
- tipos, formatos o límites inválidos;
- UUID, fecha o timestamp codificados con formato no canónico.

Cada tabla instala un `CHECK` llamado `<table>_<json_column>_contract_chk`. Los contratos que dependen de `event_type`, `result_contract_id` o target añaden el validador específico indicado.

## 6. Registro de contratos JSONB

| Tabla/columna | Código de contrato V1 | Forma cerrada | Validación adicional |
| --- | --- | --- | --- |
| `eligibility_evidence.policy_snapshot` | `identity.eligibility_policy_snapshot` | objeto: `policy_code`, `minimum_age`, `jurisdiction`, `evidence_kind`, `evaluated_result`; opcional `birth_year` | `minimum_age=18`; nunca documento ni fecha de nacimiento completa |
| `identity.invitations.responsible_party_snapshot` | `identity.responsible_party_snapshot` | objeto: `organization_id`, `party_kind`, `party_name`, `purpose`, `captured_at` | organization coincide con la fila |
| `organizations.responsible_party` | `organizations.responsible_party` | objeto: `party_kind`, `party_name`, `purpose`; opcionales `legal_identifier`, `contact` | `party_kind` natural/legal |
| `organization_events.before/after` | `audit.organization_event_snapshot` | subset de `type_code`, `legal_name`, `display_name`, `status`, `responsible_party_*` | validator recibe `event_type`; before/after no pueden ser ambos nulos |
| `membership_events.before/after` | `audit.membership_event_snapshot` | subset de `organization_id`, `person_id`, `status` | validator por `event_type` |
| `professional_assignment_events.before/after` | `audit.professional_assignment_snapshot` | subset de contexto, membership, kind, status, vigencias y aceptación | validator por `event_type` |
| `relationship_events.detail` | `relationships.relationship_event_detail` | objeto con `reason_code`, `declared_by_side`, `effective_at`; `reason_text` opcional | claves permitidas dependen de `event_type` |
| `consent_events.presented_snapshot` | `privacy.consent_presented_snapshot` | objeto: scope/version, nivel, propósito, parte responsable y array cerrado de resource/field/action | debe coincidir con definición, solicitud y relación |
| `result_contracts.envelope` | `catalog.result_contract_envelope` | objeto con array `fields`; cada field: `name`, `kind`, `classification`, `required_from_level` | nombres únicos; kinds cerrados |
| `result_contracts.minimums` | `catalog.result_contract_minimums` | objeto con claves `partial`, `summary`, `detailed`, `sensor_enriched`; cada una lista reglas | niveles monotónicos |
| `contract_fixtures.payload` | `catalog.contract_fixture_payload` | objeto raíz de ejecución con arrays tipados de resultados | `catalog.validate_result_payload(result_contract_id,payload)` |
| `session_template_drafts.content` | `planning.session_template_draft` | objeto: `discipline_code`, `activity_type_id`, `steps[]`; cada step tiene position, referencias y un target union tipado | `planning.validate_template_draft` comprueba catálogos/familias |
| `program_drafts.content` | `planning.program_draft` | objeto: `sessions[]`; cada sesión tiene `template_version_id`, `position`, `week`, `day` | posiciones únicas y referencias publicadas |
| `revision_events.before/after` | `execution.revision_snapshot` | objeto: `target_table`, `target_id`, `fields` | target/type whitelist de `execution.enforce_revision_target_ct` |
| `result_validation_events.errors` | `execution.validation_errors` | array de objetos `code`, `path`, `message` | máximo 100; códigos cerrados |
| `derived_results.inputs` | `execution.derived_inputs` | array de `resource`, `id`, `field`, `classification`, `observed_at` | no vacío; clasificación de salida = máximo de inputs |
| `outbox_events.payload` | `system.outbox_payload` | objeto de IDs/códigos no sensibles; sin nombres, contactos, perfil ni resultados | `system.validate_outbox_payload(type,version,payload)` |
| `idempotency_keys.response` | `system.idempotency_response` | objeto: `status`; exactamente uno de `resource_id` + `resource_type`, `etag`, `error_code`; `effect_disposed=true` opcional | [`V1_IDEMPOTENCY_CONTRACT.md`](./V1_IDEMPOTENCY_CONTRACT.md); se limpia a 24 h y nunca contiene body sensible |
| `job_runs.detail` | `system.job_detail` | objeto: `processed`, `succeeded`, `failed`; opcionales `cursor`, `error_codes` | contadores no negativos; sin payload de dominio |

`prescription_revisions` y `correction_proposals` no aparecen: P0-07 eliminó sus JSONB y los reemplazó por field + valor escalar tipado + unidad.

## 7. Particiones e identidad global

`privacy.access_events` y `privacy.disposition_events` se particionan mensualmente. La PK local incluye el instante porque PostgreSQL exige la clave de partición:

- `access_events (id,occurred_at)`;
- `disposition_events (id,executed_at)`.

La unicidad global del UUID se demuestra sin tabla-registro adicional:

1. la entrada cerrada genera un UUIDv7;
2. el instante de partición se obtiene del propio UUID mediante `extensions.uuid_v7_timestamp(id)`, no de un parámetro;
3. `extensions.uuid_is_v7(id)` y un check verifican versión y equivalencia;
4. un mismo UUID siempre enruta al mismo mes;
5. la PK de esa partición rechaza el duplicado.

Checks exactos:

```text
access_events_id_partition_time_chk
disposition_events_id_partition_time_chk
```

Las únicas entradas son `privacy.log_access_event` y `privacy.log_disposition_event`. Ninguna acepta `id`, `occurred_at` o `executed_at` del caller.

### 7.1 Creación anticipada

`system.ensure_monthly_audit_partitions(p_through_month date)`:

- se ejecuta diariamente por `allfit_worker_maintenance`;
- conserva la partición actual y crea las tres siguientes;
- usa nombres `<table>_yYYYYmMM`;
- instala en cada hija los índices declarados por la tabla padre;
- es idempotente y toma advisory lock por tabla/mes;
- alerta si quedan menos de 30 días de cobertura;
- no elimina particiones: la disposición/retención usa una función separada y autorizada.

La migración inicial crea el mes actual más tres meses futuros. Una escritura sin partición falla cerrada.

## 8. Pruebas de cierre de P0-07

| ID | Demostración |
| --- | --- |
| `T-SCHEMA-01` | ERD, diccionario e inventario reportan exactamente 120 tablas y el diccionario contiene 120 fichas únicas. |
| `T-SCHEMA-02` | Cada tabla/columna/FK/check/índice de las fichas se compara con `pg_catalog`; falta o nombre distinto falla CI. |
| `T-SCHEMA-03` | Cada tabla con RLS tiene exactamente las policies esperadas por comando y ninguna policy extra permisiva. |
| `T-SCHEMA-04` | Cada JSONB acepta fixtures V1 válidos y rechaza versión, claves, tipos y campos adicionales inválidos. |
| `T-SCHEMA-05` | El mismo UUIDv7 no puede insertarse en dos particiones; timestamp forjado y UUID no-v7 se rechazan. |
| `T-SCHEMA-06` | El job de particiones es idempotente, replica índices y mantiene al menos 90 días de cobertura. |

P0-07 queda documentalmente cerrado; Fase 5 debe materializar este catálogo sin reinterpretarlo.
