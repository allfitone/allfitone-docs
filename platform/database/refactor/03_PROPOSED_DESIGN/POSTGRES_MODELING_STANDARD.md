# Estándar de modelado en PostgreSQL — V1

**Versión de revisión:** 3
**Fecha:** 5 de agosto de 2026
**Fase:** 4 — Modelo lógico y diccionario de datos
**Estado:** aprobado
**Deriva de:** [`DATABASE_REFACTOR_PHASES.md` §Fase 4](../04_EXECUTION/DATABASE_REFACTOR_PHASES.md), [`V1_PHYSICAL_OBJECT_CATALOG.md`](./V1_PHYSICAL_OBJECT_CATALOG.md), [`V1_IDEMPOTENCY_CONTRACT.md`](./V1_IDEMPOTENCY_CONTRACT.md), [`V1_RLS_MATRIX.md`](./V1_RLS_MATRIX.md), [`V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md`](./V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md), [`V1_CONCEPTUAL_ERD.md`](./V1_CONCEPTUAL_ERD.md), [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](./V1_CROSS_TABLE_INTEGRITY_MATRIX.md)

## 1. Propósito

Fija las convenciones físicas que el ERD lógico y el diccionario de datos aplican de forma uniforme: nombres, tipos, identificadores, claves foráneas, constraints, índices, historial, retención y los patrones estructurales que el diseño repite. Su función es que ninguna tabla tenga que redecidir estas reglas.

Es un documento normativo. Si una tabla necesita apartarse de una regla, la ficha del diccionario debe justificarlo explícitamente; el silencio no autoriza la excepción.

## 2. Nombres

| Elemento | Regla | Ejemplo |
| --- | --- | --- |
| Schema | `snake_case`, dominio en singular | `privacy`, `execution` |
| Tabla | `snake_case`, **plural** | `data_grants`, `executed_sessions` |
| Columna | `snake_case`, singular | `person_id`, `revoked_at` |
| Clave primaria | siempre `id` | `id` |
| Clave foránea | `<referente_singular>_id` | `person_id`, `relationship_id` |
| FK con rol | `<rol>_<referente>_id` | `owner_person_id`, `origin_relationship_id` |
| Booleano | prefijo `is_` / `has_` | `is_primary`, `has_media` |
| Instante | sufijo `_at` | `created_at`, `ended_at` |
| Fecha civil | sufijo `_on` | `starts_on` |
| Enum / código | sufijo `_code` cuando referencia catálogo | `scope_code`, `activity_type_code` |
| Constraint | `<tabla>_<columnas>_<tipo>` | `data_grants_relationship_id_scope_code_key` |
| Índice | `<tabla>_<columnas>_idx`; parcial añade `_partial` | `executed_sessions_person_id_started_at_idx` |
| Función | verbo en infinitivo, `snake_case` | `finalize_execution`, `terminate_relationship` |
| Vista de contrato | prefijo `v_` | `v_client_executions` |
| Trigger | `<tabla>_<evento>_<acción>` | `data_grants_before_update_guard` |

Todo en **inglés**, coherente con la regla de mantenimiento del repositorio. Un mismo concepto se nombra igual desde la columna hasta el DTO: `body_progress_record` no se abrevia ni se traduce en ninguna capa.

## 3. Schemas

Diez schemas, uno por dominio físico de V1 más los operativos. La frontera física coincide con la frontera de ownership y con los roles de la matriz de RLS, de modo que un privilegio se concede por schema y no tabla por tabla.

| Schema | Dominio | Rol principal de escritura |
| --- | --- | --- |
| `identity` | Persona, cuentas, onboarding, perfil, invitaciones | `allfit_api` |
| `organizations` | Organizaciones, sedes, membresías, roles | `allfit_api` |
| `relationships` | Relaciones de servicio, asignaciones profesionales, suplencias | `allfit_api` |
| `privacy` | Scopes, consentimientos, grants, denegaciones, disposición, auditoría | `allfit_api`, `allfit_worker_privacy` |
| `catalog` | Disciplinas, actividades, movimientos, unidades, contratos | `allfit_api`, `allfit_curation` |
| `planning` | Plantillas, programas, versiones, asignaciones, agenda | `allfit_api` |
| `execution` | Sesiones, segmentos, resultados, revisiones, derivados | `allfit_api`, `allfit_worker_maintenance` |
| `nutrition` | Comidas manuales, nutrientes y objetivos versionados | `allfit_api` |
| `system` | Outbox, jobs, claves de idempotencia | `allfit_api`, workers |
| `support` | Break-glass y su auditoría | `allfit_api`, `allfit_support` |

Las extensiones viven en un schema `extensions` dedicado, nunca en `public`. `public` queda vacío de objetos de dominio.

Las funciones privadas que leen el contexto transaccional y componen predicados de autorización viven en el schema técnico `access_control`. No es un dominio adicional, no se expone mediante la Data API y no almacena identidades. El schema `auth` administrado por Supabase permanece intacto y fuera del modelo de autorización de Allfit; WorkOS AuthKit continúa siendo la única fuente de autenticación.

## 4. Identificadores

### 4.1 Regla general

- Toda tabla tiene una PK sustituta `id uuid` con **UUIDv7**.
- UUIDv7 es ordenado por tiempo: los inserts no fragmentan el índice B-tree como haría v4, y el propio `id` sirve de desempate cronológico estable en la paginación por cursor.
- El default se genera en la base. En PostgreSQL 18 es nativo; en versiones previas se usa una función auxiliar `extensions.uuid_generate_v7()` declarada en la primera migración. El diseño no depende de que la aplicación genere el id, salvo en los borradores locales de Space (§4.3).
- Los `id` se exponen en la API con un **prefijo legible por tipo** (`per_`, `grt_`, `exe_`) formado en la capa de serialización; la columna almacena el uuid desnudo. El prefijo es presentación, no dato.

### 4.2 Claves naturales

Cuando existe un identificador de negocio estable se modela como columna **única adicional**, nunca como PK:

- catálogos con código estable (`disciplines.code`, `units.code`) llevan `code text` con `UNIQUE`;
- la cuenta externa lleva `UNIQUE (provider, issuer, subject)`;
- las versiones llevan `UNIQUE (<padre>_id, version_number)`.

La PK sigue siendo `id`. Esto evita que un cambio de código de negocio propague una reescritura de FKs.

### 4.3 Idempotencia y borradores locales

- Todo comando separa `Idempotency-Key` de transporte y `Command-Id` durable según [`V1_IDEMPOTENCY_CONTRACT.md`](./V1_IDEMPOTENCY_CONTRACT.md). El TTL de replay nunca vuelve ejecutable un comando ya resuelto.
- `system.idempotency_keys` guarda scope calculado por servidor, hashes y outcome mínimo; nunca body ni datos de dominio.
- Los IDs de agregados y eventos creados por un borrador Space se generan **en el dispositivo** como UUIDv7 cuando el contrato durable los iguala a `Command-Id`. Cada ficha declara la excepción; el resto se genera en base.

## 5. Tipos

| Concepto | Tipo | Regla |
| --- | --- | --- |
| Identificador | `uuid` | Nunca `text` ni `bigint` para PK |
| Instante | `timestamptz` | **Siempre** con zona; nunca `timestamp` sin zona |
| Zona horaria del hecho | `text` con nombre IANA | Se guarda junto al instante cuando el hecho la necesita (agenda, sesión) |
| Fecha civil | `date` | Cumpleaños, fecha de inicio de programa |
| Dinero | `numeric(19,4)` | Reservado; no hay dinero en V1, pero la regla queda fijada |
| Cantidad física | `numeric` + `unit_code` | Nunca un número desnudo; ver §8 |
| Bandera | `boolean` | Nunca un `char(1)` ni un entero |
| Texto libre | `text` | Nunca `varchar(n)` salvo límite de negocio real |
| Código enumerado | `text` + FK a catálogo, **o** enum nativo | Ver §6 |
| Documento variable | `jsonb` | Solo cuando el contenido es genuinamente variable; ver §7 |
| Conteo / orden | `integer` | `smallint` solo con rango probado |
| Número de versión | `integer` | Monotónico por padre |

Regla transversal: **`NULL` significa ausencia de captura.** Ningún default convierte un `NULL` en `0`, `''` ni `false` por comodidad. Un campo redactado por falta de scope y un campo no capturado son ambos `NULL` e indistinguibles, por diseño.

## 6. Enumerados: código versus tipo nativo

Dos mecanismos, elegidos por criterio de cambio:

| Usar enum nativo (`CREATE TYPE`) | Usar tabla de catálogo + FK |
| --- | --- |
| Conjunto cerrado y estable que rara vez cambia | Conjunto que la plataforma cura o traduce |
| Estados de máquina: `active`, `terminated` | Disciplinas, tipos de actividad, unidades |
| Procedencia: `person_declared`, `professional_observation`, … | Roles y capacidades organizacionales |
| `access_level`: `read`, `contribute` | Movimientos, equipamiento |

El plan prohíbe "enums rígidos difíciles de retirar" para el **contenido de catálogo**; por eso el catálogo va en tablas. Los **estados internos** sí van en enums nativos: son pocos, estables y su exhaustividad es una ventaja de integridad. Un enum nativo solo se amplía con `ADD VALUE`, nunca se reordena.

## 7. Uso de JSONB

Permitido **solo** cuando el contenido es genuinamente variable y no consultable como relación. Prohibido para evitar modelar una relación conocida.

| Permitido | Prohibido |
| --- | --- |
| El snapshot presentado en un `consent_event` (evidencia congelada, no se consulta por campo) | Guardar sets, reps o cargas en un JSON de la sesión |
| El `payload` de un evento del outbox | Un perfil abierto en JSON |
| El outcome mínimo y versionado de una clave de idempotencia | Overrides de prescripción en JSON opaco |
| Parámetros de un algoritmo derivado, versionados | Scopes como array libre |

Regla: si una consulta necesita filtrar, ordenar o unir por un valor, ese valor es una **columna**, no una clave JSON. Todo JSONB lleva versión hermana y `CHECK` contra el contrato cerrado de [`V1_PHYSICAL_OBJECT_CATALOG.md` §5–6](./V1_PHYSICAL_OBJECT_CATALOG.md); un documento consultado por claves exige además un índice GIN justificado. Overrides y correcciones de valores conocidos usan columnas escalares tipadas, no JSONB.

## 8. Cantidades físicas y unidades

Todo valor medido se almacena como par **valor + unidad canónica**, más la unidad original cuando la captura difirió:

```text
load_value        numeric
load_unit_code    text  → catalog.units.code   (canónica)
load_original_value   numeric   (nullable)
load_original_unit_code text    (nullable)
```

- La unidad canónica por dimensión la fija `catalog.units`.
- No existe una tabla universal `value(type, magnitude)`: cada familia de resultado tiene sus columnas tipadas.
- La conversión a canónica ocurre al escribir; el original se conserva para no perder la captura literal.

## 9. Claves foráneas y borrado

- Toda FK declara su comportamiento de borrado **explícitamente**. No se acepta el default silencioso.

| Comportamiento | Cuándo |
| --- | --- |
| `ON DELETE RESTRICT` | Por defecto para referencias de dominio: una persona no se borra si tiene ejecuciones |
| `ON DELETE CASCADE` | Solo de un agregado a sus hijos estrictos: una sesión a sus sets, una versión a sus pasos |
| `ON DELETE SET NULL` | Solo en referencias verdaderamente opcionales cuya ausencia es válida |

- El borrado real de datos personales **no** se hace con `CASCADE` de conveniencia: pasa por el dominio de disposición (`privacy.disposition_*`), que decide por categoría entre eliminar, anonimizar o retener. `CASCADE` es para la integridad estructural de un agregado, no para el ciclo de vida de datos personales.
- Las FK que participan en una condición RLS **siempre** tienen índice (§11).

## 10. Referencias polimórficas tipadas

El ERD prohíbe el `target_uuid` universal sin integridad. El patrón adoptado es **una FK nullable por tipo de target más un `CHECK` de exactamente una no nula**.

```sql
-- privacy.disposition_items apunta a un target de tipo variable
create table privacy.disposition_items (
  id uuid primary key default extensions.uuid_generate_v7(),
  disposition_case_id uuid not null references privacy.disposition_cases(id) on delete cascade,
  data_classification_code text not null references privacy.data_classifications(code),
  action privacy.disposition_action not null,        -- delete | anonymize | retain_restricted

  target_execution_id       uuid references execution.executed_sessions(id) on delete restrict,
  target_body_progress_id   uuid references identity.body_progress_records(id) on delete restrict,
  target_health_context_id  uuid references identity.health_context_claims(id) on delete restrict,
  target_profile_claim_id   uuid references identity.fitness_profile_claims(id) on delete restrict,
  target_nutrition_meal_id  uuid references nutrition.meals(id) on delete restrict,
  target_nutrition_goal_set_id uuid references nutrition.goal_sets(id) on delete restrict,
  -- … una columna por tipo disponible en V1 …

  constraint disposition_items_one_target_chk check (
    num_nonnulls(
      target_execution_id, target_body_progress_id,
      target_health_context_id, target_profile_claim_id,
      target_nutrition_meal_id, target_nutrition_goal_set_id
    ) = 1
  )
);
```

Ventajas frente a un uuid libre: cada FK valida contra su tabla real, el borrado es explícito por tipo, y ninguna fila puede apuntar a un target inexistente. El costo es una columna por tipo de target, aceptado porque el conjunto de tipos de V1 es cerrado y conocido.

Se aplica igual a `correction_proposals`, `revision_events` y `disposition_items`. Cuando el conjunto de tipos crezca en fases futuras, se añade una columna y se amplía el `CHECK`; nunca se degrada a un uuid genérico.

**As implemented, two exceptions.** `revision_events` was never built: corrections go to typed tables (`execution_revisions`, `observation_revisions`). `execution.correction_proposals` (STUDIO-52, migration `20261112090000_a_coach_proposes_a_correction_and_she_decides.sql`) has a single target type, `target_strength_set_id`, and **no FK** on it. Her own correction deletes and reinserts the session's sets with new ids, so a `RESTRICT` FK would block her correction. The guarantees the FK would give come from two triggers instead: the `IX-20` constraint trigger checks the set, its session and the declared value at insert, and the `target_changed` cancellation on `strength_sets` keeps a pending proposal from naming a set that is gone. A settled proposal may name a set that no longer exists, as history.

## 11. Índices

- **Toda FK usada en RLS o en un join frecuente lleva índice.** `V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md` enumera por ruta `PR-*` los índices que las policies exigen; son parte del contrato de autorización, no optativos.
- Índice **parcial** cuando la condición filtra un subconjunto: vigentes, publicados, activos.
  ```sql
  create unique index service_relationships_active_uq
    on relationships.service_relationships (person_id, organization_id)
    where status = 'active';
  ```
- Índice **compuesto** en el orden en que la consulta filtra y ordena; el último elemento suele ser el `id` para desempate estable del cursor.
- Índice **GIN** solo sobre el JSONB que se filtra, nunca "por si acaso".
- Búsqueda textual de catálogo (nombre normalizado de movimientos) con índice sobre la expresión normalizada.

## 12. Constraints de integridad

El plan exige que "los estados imposibles se bloquean con constraints". Se usan, en orden de preferencia:

1. **`NOT NULL`** para todo lo obligatorio. Un hold sin vigencia, una suplencia sin fecha de fin y un grant sin propósito son imposibles por `NOT NULL`.
2. **`UNIQUE`** parcial para invariantes de unicidad: un solo titular efectivo por relación, un solo periodo de gestión vigente por asignación, una sola primaria por sesión planificada, un `attempt_number` único por sesión.
3. **`CHECK`** para invariantes de fila: exactamente un owner (persona xor organización), exactamente un target polimórfico, `access_level` compatible, rangos válidos, `ended_at >= started_at`.
4. **FK simple o compuesta** para toda referencia entre tablas; las N:M son tablas puente explícitas, nunca arrays de uuid. Si el hijo repite `person_id`, `organization_id`, relación o ejecución, la FK debe probar la tupla completa.
5. **Constraint de exclusión** (`EXCLUDE`) cuando haya que impedir solapamiento temporal de vigencias sobre el mismo sujeto.
6. **Constraint triggers diferibles** cuando la regla depende de estado o tiempo en otra tabla, de un target polimórfico o de una familia derivada.
7. **Triggers ordinarios** solo para guardianes no diferibles: append-only (bloquear `UPDATE`/`DELETE`), congelar una fila publicada o validar la entrada cerrada de una tabla particionada. La cardinalidad de `owner`, al depender de organización, membresía y vigencia de rol y necesitar cambios atómicos, usa un constraint trigger diferible conforme al punto anterior.

Regla: preferir siempre la restricción más declarativa posible. Un trigger es el último recurso, no el primero.

La única referencia de negocio deliberadamente opaca es `system.outbox_events.aggregate_id`: identifica el agregado dentro de un sobre durable, no se navega, no autoriza y debe sobrevivir al agregado. `privacy.access_events` es una excepción distinta y más estricta: no lleva todas las FKs por volumen/particionamiento, pero `IX-23` valida su contexto autoritativo antes de insertar.

### 12.1 Identidades compuestas entre tablas

Dos FKs simples solo demuestran que ambos IDs existen; no prueban que formen el mismo contexto. Cuando una fila conoce más de un componente de identidad se exige:

1. `UNIQUE` portadora en el padre con la tupla exacta;
2. FK compuesta desde el hijo;
3. índice sobre las columnas del hijo en el mismo orden cuando participa en RLS o joins frecuentes;
4. prueba negativa con `BYPASSRLS`.

Las columnas repetidas de enrutamiento —por ejemplo `person_id` en una sesión planificada o `organization_id` en una asignación profesional— son aceptables únicamente cuando una FK compuesta demuestra de qué padre provienen. No pueden rellenarse por convención de la API.

### 12.2 Reglas que no caben en una FK

Un `CHECK` no consulta otras filas o tablas. Por tanto, elegibilidad temporal, estados del target y compatibilidad de familia usan un `CONSTRAINT TRIGGER ... DEFERRABLE INITIALLY IMMEDIATE`. Debe existir también el trigger recíproco sobre el padre mutable cuando cambiarlo pueda invalidar hijos efectivos.

La transacción puede ejecutar `SET CONSTRAINTS ALL DEFERRED` para ordenar cierres y altas atómicas, pero ninguna inconsistencia puede sobrevivir al `COMMIT`.

La lista normativa de claves, FKs, guardianes y pruebas es [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](./V1_CROSS_TABLE_INTEGRITY_MATRIX.md). Una ficha del diccionario no puede rebajar esos mecanismos.

## 13. Historial e inmutabilidad

| Patrón | Mecanismo |
| --- | --- |
| Versión publicada inmutable | Sin `GRANT UPDATE`/`DELETE` en runtime, más trigger guardián |
| Evento append-only | Solo `INSERT`; `UPDATE`/`DELETE` revocados por privilegios |
| Afirmación con procedencia | Filas que coexisten; la corrección crea una `revision_event`, no un `UPDATE` |
| Snapshot congelado | Copia materializada en la fila que lo congela (contrato, versión de scope, parte responsable) |
| `created_at` / `updated_at` | En toda tabla mutable; `updated_at` por trigger |
| Autoría | `created_by_*` tipado (persona, membresía o `system`), no un texto libre |

La inmutabilidad se garantiza con **privilegios primero** (revocar `UPDATE`) y trigger como refuerzo, no solo con disciplina de aplicación.

## 14. Soft delete

- **No hay un `deleted_at` universal.** El plan lo prohíbe explícitamente como política de privacidad.
- El estado del ciclo de vida se modela con una columna `status` de enum por entidad, cuando la entidad tiene estados.
- La eliminación de datos personales pasa por el dominio de disposición, que distingue eliminar, anonimizar y retener. `deleted_at` no cuenta como eliminación ni como anonimización.
- Un soft delete solo se admite cuando exista una razón de negocio concreta documentada en la ficha; por defecto, no existe.

## 15. Columnas de auditoría estándar

| Columna | Tipo | En qué tablas |
| --- | --- | --- |
| `id` | `uuid` | Todas |
| `created_at` | `timestamptz` default `now()` | Todas |
| `updated_at` | `timestamptz` | Tablas mutables; trigger |
| `created_by_kind` | enum `actor_kind` | Tablas escritas por un actor humano |
| `created_by_person_id` | `uuid` nullable | Cuando el autor es persona |
| `created_by_membership_id` | `uuid` nullable | Cuando el autor actúa por una membresía |
| `status` | enum por entidad | Entidades con ciclo de vida |

Las tablas append-only no llevan `updated_at`.

## 16. Particionamiento

- **`privacy.access_events` y `privacy.disposition_events`** se declaran `PARTITION BY RANGE` mensual desde la primera migración. La purga por retención es `DROP` de partición, no `DELETE` masivo.
- UUID e instante de partición solo se generan en la entrada cerrada; el instante se deriva de UUIDv7 y un check impide enrutar el mismo ID a otro mes. Así la PK local prueba unicidad global sin una tabla auxiliar.
- `system.ensure_monthly_audit_partitions` crea diariamente el mes actual y los tres siguientes, replica índices y alerta con menos de 30 días de cobertura.
- Ninguna otra tabla se particiona en V1: hacerlo sin volumen probado es complejidad sin retorno.

El contrato completo —helpers UUIDv7, nombres de checks, funciones de entrada y prueba de unicidad— está en [`V1_PHYSICAL_OBJECT_CATALOG.md` §7](./V1_PHYSICAL_OBJECT_CATALOG.md).

## 17. Contexto de autorización

- La API establece el contexto **local a la transacción** con `set_config(..., true)`, nunca de sesión (un pool reutiliza conexiones).
- Las variables son las de la matriz de RLS §4: `app.actor_kind`, `app.actor_account_id`, `app.actor_person_id`, `app.actor_org_id`, `app.actor_membership_id`, `app.request_id`, `app.purpose`, `app.authn_assurance`, `app.historical_access_case_id`, `app.break_glass_id` y `app.platform_duty`.
- `app.platform_duty` solo lo establece el backend después de validar la autorización interna de plataforma. Nunca se copia de headers, payloads o claims no verificados y no equivale a un rol organizacional.
- Las funciones `SECURITY DEFINER` fijan `search_path` explícito y **no** reciben el actor como parámetro: sale del contexto.
- `FORCE ROW LEVEL SECURITY` en toda tabla con datos de dominio.

## 18. Migraciones

- Una sola historia de migraciones, propiedad de `allfitone/packages/db`, aplicada por un solo pipeline.
- Orden por dependencias: extensiones y enums → catálogos → tablas padre → dependientes → uniques/checks/FKs → índices → grants → RLS y policies → vistas y funciones → seeds.
- Cada migración es reproducible desde cero: `supabase db reset` reconstruye el esquema sin pasos manuales.
- Los nombres de archivo siguen el patrón de timestamp del tooling de Supabase.
- Ninguna migración crea DDL de capacidades diferidas (booking, commerce, marketplace, integrations, intelligence, nutrición clínica/terapéutica, planes automáticos o IA nutricional).
- La historia es greenfield: no contiene staging, compatibilidad, backfill, ETL, IDs ni datos procedentes de Factory Fitness.

## 19. Checklist de conformidad por tabla

Ninguna tabla entra al diccionario sin cumplir:

- [ ] PK `id uuid` con default UUIDv7;
- [ ] vive en el schema de su dominio;
- [ ] `created_at`, y `updated_at` si es mutable;
- [ ] toda FK con comportamiento de borrado explícito e índice si participa en RLS;
- [ ] toda ruta `PR-01..29` compila contra columnas existentes y dispone de sus índices `T-PHY-*`;
- [ ] estados imposibles bloqueados por `NOT NULL`, `UNIQUE`, `CHECK` o `EXCLUDE`;
- [ ] `NULL` nunca sustituido por cero o vacío;
- [ ] JSONB solo para contenido genuinamente variable, con versión y contrato `CHECK` registrado;
- [ ] cantidades físicas con unidad canónica;
- [ ] inmutabilidad garantizada por privilegios cuando corresponde;
- [ ] política de retención/disposición asignada;
- [ ] ficha completable en su totalidad — si no, la tabla no se crea.

## 20. Estado de salida

Este documento fija las convenciones que aplican el ERD lógico y el diccionario de datos. Se considera completo cuando la revisión confirme que:

1. cada convención tiene una regla única y sin ambigüedad;
2. las cuatro decisiones estructurales (UUIDv7, schema por dominio, polimorfismo tipado, particionamiento de auditoría) están fijadas;
3. ninguna convención contradice un ADR ni el alcance V1;
4. el checklist §19 es suficiente para rechazar una tabla mal formada.

**Siguientes entregables:** [`V1_LOGICAL_ERD.md`](./V1_LOGICAL_ERD.md) y [`V1_DATA_DICTIONARY.md`](./V1_DATA_DICTIONARY.md).
