# Matriz de integridad cruzada V1

**Estado:** aprobada para implementación de Fase 5<br>
**Fecha:** 28 de julio de 2026; ampliada el 17 de agosto de 2026
**Alcance:** invariantes que cruzan persona, organización, membresía, relación, asignación, planificación, ejecución, nutrición y privacidad; incluye transición organizacional gobernada

## 1. Propósito

Esta matriz cierra P0-05. Su objetivo es impedir físicamente que identificadores individualmente válidos formen una fila imposible: una membresía de otra organización, un grant para otra persona, una ejecución enlazada al plan de otro sujeto o un resultado asociado a un segmento de otra sesión.

RLS y la API siguen siendo capas de autorización, pero no sustituyen estas restricciones. Las mismas reglas deben rechazar una escritura hecha por un worker, una función `SECURITY DEFINER`, una migración defectuosa o el rol de pruebas con `BYPASSRLS`.

## 2. Decisión de modelado

V1 adopta cuatro mecanismos, en este orden:

1. **FK compuesta** cuando el hijo ya conoce los componentes de identidad que deben coincidir.
2. **Columna de enrutamiento repetida y restringida** cuando hace falta transportar `person_id` u `organization_id` para RLS y para una FK compuesta.
3. **Constraint trigger diferible** cuando la regla depende de estado, tiempo, un target polimórfico o una familia derivada.
4. **Función de escritura cerrada más trigger guardián** para el log particionado `access_events`.

No se acepta:

- un `CHECK` que pretenda consultar otra tabla;
- dos FKs simples como sustituto de una identidad compuesta;
- validación exclusiva en TypeScript, API, RLS o job;
- una columna repetida sin constraint que pruebe su procedencia;
- desactivar constraints durante una importación de runtime.

Dos referencias deliberadamente no son FKs ordinarias:

- `system.outbox_events.aggregate_id` es un identificador opaco de sobre, no una relación navegable ni una fuente de autorización. Debe sobrevivir al ciclo de vida del agregado y queda fuera del grafo relacional. `INSERT` directo está revocado: `system.enqueue_domain_event(...)` valida el contrato tipado del evento y lo escribe en la misma transacción del comando.
- `privacy.access_events` evita FKs de alto volumen hacia varios agregados, pero su contexto sí es autoritativo y por eso queda protegido por `IX-23`.

## 3. Claves portadoras obligatorias

Las siguientes `UNIQUE` no expresan una unicidad de negocio adicional. Exponen una identidad compuesta estable para que PostgreSQL pueda ser el árbitro del cruce.

| Tabla padre | Clave portadora |
| --- | --- |
| `organizations.organization_memberships` | `UNIQUE (id, organization_id)` |
| `organizations.organization_memberships` | `UNIQUE (id, organization_id, person_id)` |
| `relationships.service_relationships` | `UNIQUE (id, person_id)` |
| `relationships.service_relationships` | `UNIQUE (id, organization_id)` |
| `relationships.service_relationships` | `UNIQUE (id, person_id, organization_id)` |
| `relationships.relationship_professional_assignments` | `UNIQUE (id, person_id)` |
| `relationships.relationship_professional_assignments` | `UNIQUE (id, relationship_id, person_id, organization_id, membership_id)` |
| `privacy.scope_definitions` | `UNIQUE (id, scope_code)` |
| `privacy.consent_events` | `UNIQUE (id, person_id, relationship_id, organization_id, scope_definition_id, scope_code)` |
| `planning.program_assignments` | `UNIQUE (id, person_id)` |
| `planning.planned_sessions` | `UNIQUE (id, person_id)` |
| `execution.executed_sessions` | `UNIQUE (id, person_id)` |
| `execution.session_segments` | `UNIQUE (id, executed_session_id)` |
| `privacy.erasure_requests` | `UNIQUE (id, person_id)` |
| `privacy.disposition_cases` | `UNIQUE (id, subject_person_id)` |
| `support.break_glass_requests` | `UNIQUE (id, requester_person_id, subject_person_id, requester_duty_assignment_id)` |
| `nutrition.meals` | `UNIQUE (id, person_id)` |
| `nutrition.meal_items` | `UNIQUE (id, meal_id, person_id)` |
| `nutrition.meal_items` | `UNIQUE (id, person_id)` |
| `nutrition.goal_sets` | `UNIQUE (id, person_id)` |
| `nutrition.goal_versions` | `UNIQUE (id, person_id)` |

Todas las columnas de una clave portadora son `NOT NULL`. Una referencia opcional usa `MATCH SIMPLE`. Cuando el sujeto permanece obligatorio pero el par relación/organización es opcional, un `CHECK` de forma exige que esos dos componentes aparezcan o falten juntos; `MATCH FULL` sería incorrecto porque `person_id` nunca es `NULL`.

## 4. Registro exhaustivo de invariantes

| ID | Fila protegida | Invariante | Mecanismo PostgreSQL exacto |
| --- | --- | --- | --- |
| `IX-01` | `service_relationships.previous_relationship_id` | La relación anterior pertenece a la misma persona y organización | FK autocontenida `(previous_relationship_id, person_id, organization_id) → service_relationships(id, person_id, organization_id)` |
| `IX-02` | `relationship_professional_assignments` | Relación, sujeto y organización son el mismo contexto; la membresía profesional pertenece a esa organización | Añadir `person_id`, `organization_id`; FKs `(relationship_id, person_id, organization_id)` y `(membership_id, organization_id)` |
| `IX-03` | activación de `relationship_professional_assignments` | La membresía está vigente y tiene rol `coach` efectivo durante la activación | Constraint triggers diferibles `relationships.enforce_assignment_eligibility_ct` sobre asignación, membresía y vigencias de rol |
| `IX-04` | `fitness_profile_claims.captured_by_assignment_id` | Si captura un profesional, su asignación corresponde al sujeto del claim | FK `(captured_by_assignment_id, person_id) → relationship_professional_assignments(id, person_id)` |
| `IX-05` | `consent_events` | Persona/organización coinciden con la relación y scope/versión coinciden con la opción exacta presentada en la invitación | FKs `(relationship_id, person_id, organization_id) → service_relationships(id, person_id, organization_id)`, `(invitation_scope_option_id,scope_definition_id,scope_code) → invitation_scope_options(id,scope_definition_id,scope_code)` y `(scope_definition_id, scope_code) → scope_definitions(id, scope_code)` |
| `IX-06` | `invitation_scope_options` | Cada opción pertenece a una intención `service_relationship`; `scope_code` coincide con la definición presentada y la opción queda inmutable al decidirse | FK a `identity.invitation_intents`; FK `(scope_definition_id, scope_code) → scope_definitions(id, scope_code)`; `UNIQUE (invitation_intent_id,scope_code)` y constraint trigger `privacy.enforce_invitation_scope_option_ct` |
| `IX-07` | `data_grants` | Persona y organización coinciden con la relación; el consentimiento corresponde a la misma tupla y versión exacta de scope | FKs `(relationship_id, person_id, organization_id)`, `(scope_definition_id, scope_code)` y `(consent_event_id, person_id, relationship_id, organization_id, scope_definition_id, scope_code)`; se elimina el falso `CHECK` cross-table |
| `IX-08` | `session_visibility_denials` | La ejecución y la relación pertenecen a la persona que decide | FKs `(executed_session_id, person_id)` y `(relationship_id, person_id)` |
| `IX-09` | `historical_access_cases` | Relación y ambas membresías pertenecen a la organización exacta | FKs `(relationship_id, organization_id)`, `(authorized_membership_id, organization_id)` y `(opened_by_membership_id, organization_id)` |
| `IX-10` | apertura/continuidad de `historical_access_cases` | Relación terminada; autorizada elegible; `staff` excluido; caso cerrado al perder elegibilidad | Constraint triggers diferibles `privacy.enforce_historical_case_eligibility_ct` sobre caso, membresía, rol y asignación |
| `IX-11` | `program_assignments.origin_relationship_id` | El origen, cuando existe, pertenece a la persona asignada | FK `(origin_relationship_id, person_id) → service_relationships(id, person_id)` |
| `IX-12` | `assignment_management_periods` | Asignación y relación administradora pertenecen a la misma persona | Añadir `person_id`; FKs `(assignment_id, person_id)` y `(relationship_id, person_id)` |
| `IX-13` | `prescription_revisions` | Asignación y autor corresponden a la misma persona; el paso pertenece al snapshot asignado y el override coincide con la familia/campo | FKs `(assignment_id, person_id)`, `(created_by_assignment_id, person_id)` y `planned_step_ref`; constraint trigger diferible `planning.enforce_prescription_override_ct` |
| `IX-14` | `executed_sessions` con contexto | Persona, relación y organización de contexto forman una sola tupla; una sesión autónoma no inventa contexto | FK `MATCH SIMPLE (context_relationship_id, person_id, context_organization_id)` y `CHECK` de autonomía/contexto |
| `IX-15` | `planned_sessions` | La sesión materializada pertenece a la persona de la asignación | Añadir `person_id`; FK `(assignment_id, person_id) → program_assignments(id, person_id)` |
| `IX-16` | `planned_session_executions` | Planificación y ejecución pertenecen a la misma persona | Añadir `person_id`; FKs `(planned_session_id, person_id)` y `(executed_session_id, person_id)` |
| `IX-17` | primaria de `planned_session_executions` | Solo una ejecución completada, válida y del mismo sujeto puede ser primaria | La identidad se cubre con `IX-16`; constraint trigger diferible `execution.enforce_primary_execution_ct` cubre estado y conserva el índice único parcial |
| `IX-18` | resultados con `session_segment_id` | El segmento pertenece a la misma ejecución del resultado | FK `(session_segment_id, executed_session_id) → session_segments(id, executed_session_id)` en `strength_sets`, `endurance_laps`, `interval_results`, `round_results`, `mobility_results` y `metric_samples` |
| `IX-19` | `professional_observations` | Ejecución, sujeto y asignación profesional autora corresponden a la misma persona | FKs `(executed_session_id, person_id)` y `(author_assignment_id, person_id)` |
| `IX-20` | `correction_proposals` | Proponente y target corresponden al sujeto de la propuesta | FK `(proposer_assignment_id, person_id)` + constraint trigger diferible `execution.enforce_correction_subject_ct` que resuelve el único target tipado |
| `IX-21` | `revision_events` | El target y `executed_session_id`, cuando aplica, pertenecen al mismo sujeto | Añadir `subject_person_id`; constraint trigger diferible `execution.enforce_revision_target_ct`; FK compuesta directa para target de ejecución |
| `IX-22` | targets de `planned_steps` | La tabla tipada coincide con la familia efectiva del paso | Constraint trigger diferible `planning.enforce_target_family_ct` en las cuatro tablas de targets; resuelve `COALESCE(step.activity_type_id, template.activity_type_id)` contra el contrato publicado |
| `IX-23` | `access_events` permitidos | Exactamente uno de persona u organización es sujeto y el modo/contexto describe ese acceso | `CHECK num_nonnulls(subject_person_id,subject_organization_id)=1`; única entrada `privacy.log_access_event` y trigger `BEFORE INSERT privacy.enforce_access_event_context_tg`. Para persona valida relación/grant/caso/scope; para organización exige modo `organization_operational`, actor membership activo del mismo tenant y de `actor_person_id`, recurso `organizations.organization_context` y relación/grant/caso/scope nulos |
| `IX-24` | `identity.invitations` | La membresía emisora pertenece a la organización que invita | Sustituir autor suelto por `issued_by_membership_id`; FK `(issued_by_membership_id, organization_id) → organization_memberships(id, organization_id)` |
| `IX-25` | `organization_events.actor_membership_id` | El actor organizacional pertenece a la organización del evento | FK compuesta opcional `(actor_membership_id, organization_id) → organization_memberships(id, organization_id)` |
| `IX-26` | `disposition_cases` / ítems / eventos | Solicitud, caso y target —incluidas comida o línea de objetivos nutricionales— pertenecen al mismo sujeto; evento referencia ítem real y su UUID solo puede vivir en un mes | FK `(erasure_request_id,subject_person_id)`; `subject_person_id` + FK al caso; targets tipados a `nutrition.meals`/`goal_sets`; trigger `privacy.enforce_disposition_target_subject_ct`; evento con FK dura, entrada `privacy.log_disposition_event` y check UUIDv7/tiempo |
| `IX-27` | `break_glass_events` | Evento, solicitante, sujeto y deber coinciden con una solicitud aprobada, con quorum y ventana vigentes | FK `(request_id,requester_person_id,subject_person_id,requester_duty_assignment_id) → break_glass_requests(id,requester_person_id,subject_person_id,requester_duty_assignment_id)`; la función revalida rol/deber/AAL/quorum/timestamp/categoría y enlaza un `access_event` |
| `IX-28` | `meal_items` y `meal_nutrient_values` | Ítem, nutriente, comida y sujeto forman el mismo agregado personal | Repetir `person_id` en ambos hijos y `meal_id` en valores; FKs `(meal_id,person_id) → meals(id,person_id)` y `(meal_item_id,meal_id,person_id) → meal_items(id,meal_id,person_id)` |
| `IX-29` | `meal_nutrient_values` | Cada valor usa la unidad canónica publicada para su nutriente | Constraint trigger diferible `nutrition.enforce_nutrient_unit_ct` sobre valor, definición y unidad; el catálogo publicado es inmutable |
| `IX-30` | `goal_versions` de origen profesional | Set, persona, relación, organización, asignación, membresía y autor describen el mismo contexto | FKs `(goal_set_id,person_id)`, `(origin_relationship_id,person_id,origin_organization_id)`, `(author_membership_id,origin_organization_id,author_person_id)` y `(author_assignment_id,origin_relationship_id,person_id,origin_organization_id,author_membership_id)` |
| `IX-31` | publicación de `goal_versions` profesionales | Autor elegible con `guide_nutrition`, credencial `nutrition_professional` verificada/vigente y grant exacto `nutrition_guidance/contribute` | Constraint trigger diferible `nutrition.enforce_professional_goal_authority_ct` sobre versión, asignación, membresía/roles/capabilities, verificación y grant; triggers recíprocos bloquean nuevas lecturas/propuestas al perder vigencia |
| `IX-32` | procedencia de `goal_versions` | Una versión `self` no inventa contexto profesional; una `professional` lo declara completo | `CHECK` de forma por `origin`; `author_person_id=person_id` para `self`; `NULLIF(btrim(rationale),'')` de máximo 2000 caracteres y los cinco IDs de contexto obligatorios para `professional` |
| `IX-33` | estado longitudinal de `goal_versions` | Solo una versión activa por set y una propuesta pendiente por relación; activar, reemplazar, terminar la relación o cancelar es atómico | Índices únicos parciales + constraint trigger `nutrition.enforce_goal_version_transition_ct`; funciones cerradas bloquean set/relación y marcan `superseded`/`cancelled` en la misma transacción; el trigger recíproco de relación impide dejar propuestas pendientes al terminar |
| `IX-34` | `goal_targets` | Modo, valores y unidad forman un target posible y canónico | `CHECK` exhaustivo para `minimum`, `maximum`, `range` o `exact`; constraint trigger `nutrition.enforce_goal_target_unit_ct` compara unidad con definición |
| `IX-35` | `goal_decisions` | Solo la persona decide una vez una propuesta profesional propia todavía pendiente; aceptar activa atómicamente | FK `(goal_version_id,person_id)`, `UNIQUE(goal_version_id)`, append-only y constraint trigger `nutrition.enforce_goal_decision_ct` ejecutado dentro de `nutrition.decide_goal_proposal(...)` |
| `IX-36` | `session_visibility_denials` | Una sesión producida **dentro** de una relación no puede ocultarse **para esa misma relación** | Constraint trigger diferible `privacy.enforce_denial_not_own_relationship_ct`: rechaza si `executed_sessions.context_relationship_id = NEW.relationship_id`. No se expresa con FK porque `context_relationship_id` es nullable y `MATCH SIMPLE` dejaría pasar la sesión autónoma |
| `IX-37` | `session_segments` de una ejecución híbrida | Una ejecución cuyo tipo de actividad es híbrido tiene al menos dos segmentos de **familias distintas** | Constraint trigger diferible `execution.enforce_hybrid_segment_families_ct`, evaluado al cerrar la ejecución sobre `count(distinct family) >= 2`; una condición agregada entre filas no es expresable como `CHECK` de fila |
| `IX-38` | `plan_subscriptions` | La versión de plan suscrita pertenece a la **misma organización** que cobra | FK compuesta `(plan_version_id, organization_id) → plan_versions(id, organization_id)` |
| `IX-39` | `payment_records` | El cobro pertenece a la misma persona y organización que su suscripción | FK compuesta `(subscription_id, person_id, organization_id) → plan_subscriptions(id, person_id, organization_id)` |
| `IX-40` | transición de `plan_subscriptions` + `service_access_blocks` | Suspender abre un bloqueo causal sin tocar grants, relación, membresía, asignación o sesión; reactivar cierra **solo** el bloqueo de esa fuente y nunca restaura un snapshot ni cierra otra causa | FKs tipadas a `subscription_id` u `organization_event_id`, `CHECK` de exactamente una fuente, uniques parciales por cada fuente abierta, funciones cerradas bajo lock y constraint trigger `payments.enforce_suspension_isolation_ct`; rechaza DML protegido, fuente no coincidente o cierre múltiple, y acceso/agenda derivan el efecto de todos los bloqueos abiertos (`T-PAY-7/8/11..14`) |
| `IX-41` | `platform_plan_versions` | Un plan `paid` cuesta más que cero y un plan `free` cuesta exactamente cero; hay un solo plan gratuito publicado | Columna portadora `plan_kind` con FK compuesta `(platform_plan_id, plan_kind) → platform_plans(id, plan_kind)` y `CHECK ((plan_kind = 'paid') = (amount_minor > 0))`; unique parcial sobre el plan gratuito publicado |
| `IX-42` | `platform_duty_assignments` | Un deber pertenece a una persona con rol base vigente, modo derivado, AAL2 y máximo 90 días; nadie se autoasigna | Trigger diferible valida rol base al activar; catálogo cerrado deriva `actor_mode`; checks de tiempo/AAL/actor; unique parcial `(person_id,duty_code)`; sin `DELETE` runtime |
| `IX-43` | `break_glass_approvals` | Cada aprobador usa su propio deber A12 vigente, es distinto de solicitante/sujeto y no repite decisión | FK a `platform_duty_assignments`; `UNIQUE(request_id,approver_person_id)`; trigger bajo lock valida actor, modo, vigencia y conflictos antes de insertar |
| `IX-44` | revisión de `break_glass_requests` | Revisor A12 es distinto del solicitante y de todos los aprobadores y conserva la asignación de deber exacta | `reviewed_by_duty_assignment_id` FK; constraint trigger diferible valida persona/deber/conflictos y forma terminal de revisión |
| `IX-45` | actualización de `organizations.type_code` | El tipo solo cambia por una transición activa y gobernada; incorporar equipo no modifica el tipo | Tabla `organizations.organization_type_transitions` con FKs a ambos tipos y trigger `organizations.enforce_type_transition_tg` sobre `organizations`; `UPDATE(type_code)` directo revocado y función cerrada valida old/new bajo lock |
| `IX-46` | `planned_steps` | Los pasos que comparten `superset_group` ocupan posiciones consecutivas dentro de su versión | Constraint trigger `planning.enforce_superset_contiguity_ct`: una cadena que salta un ejercicio describe un orden que nadie puede ejecutar, y encadenar el primero con el quinto sería eso |
| `IX-47` | `strength_targets` frente a `planned_sets` | El resumen es derivado: `target_sets` es el conteo de series y `target_reps` existe sólo cuando todas coinciden | Se calcula dentro de `planning.materialize_target` durante la publicación atómica; ningún rol de runtime escribe la fila, así que la única verdad son las series (`ADR-030`) |
| `IX-48` | portada de `planning.programs` | La clase de portada y su carga concuerdan, y un icono es uno de los que el vocabulario declara | `CHECK` de que `routine_cover_icon` existe si y sólo si `routine_cover_kind = 'icon'`, con el tipo enumerado cerrando el conjunto. La tercera revisión de `ADR-031` mudó estas columnas desde `session_template_versions`: la portada la declara el programa y no la rutina |

## 5. Formas normativas

### 5.1 Contexto profesional

```sql
alter table relationships.service_relationships
  add constraint service_relationships_id_person_org_uq
  unique (id, person_id, organization_id);

alter table relationships.relationship_professional_assignments
  add column person_id uuid not null,
  add column organization_id uuid not null,
  add constraint professional_assignment_relationship_fk
    foreign key (relationship_id, person_id, organization_id)
    references relationships.service_relationships
      (id, person_id, organization_id)
    on delete restrict,
  add constraint professional_assignment_membership_org_fk
    foreign key (membership_id, organization_id)
    references organizations.organization_memberships
      (id, organization_id)
    on delete restrict;
```

`person_id` es el sujeto de la relación, no la persona que ocupa la membresía profesional. La identidad del profesional sigue derivándose de `membership_id`.

### 5.2 Contexto opcional de ejecución

```sql
alter table execution.executed_sessions
  add constraint executed_session_context_shape_chk check (
    (is_autonomous
      and context_relationship_id is null
      and context_organization_id is null)
    or
    (not is_autonomous
      and context_relationship_id is not null
      and context_organization_id is not null)
  ),
  add constraint executed_session_context_fk
    foreign key (
      context_relationship_id,
      person_id,
      context_organization_id
    )
    references relationships.service_relationships
      (id, person_id, organization_id)
    match simple
    on delete restrict;
```

Una sesión autónoma puede ser compartida después mediante un grant, pero no se reescribe como producida dentro de una relación.

### 5.3 Resultado y segmento

```sql
alter table execution.session_segments
  add constraint session_segments_id_execution_uq
  unique (id, executed_session_id);

alter table execution.strength_sets
  add constraint strength_sets_segment_execution_fk
  foreign key (session_segment_id, executed_session_id)
  references execution.session_segments (id, executed_session_id)
  on delete restrict;
```

La misma forma se aplica a las otras cinco tablas que admiten `session_segment_id`.

### 5.4 Constraint triggers diferibles

Las funciones guardianas:

- son `SECURITY DEFINER`;
- fijan `search_path` a `pg_catalog` y a los schemas explícitamente usados;
- son propiedad de un rol sin `LOGIN`;
- no son ejecutables directamente por roles de aplicación;
- bloquean `NULL` inesperados y usan `SELECT ... FOR KEY SHARE` cuando la fila padre puede cambiar;
- producen `SQLSTATE 23514` con el ID `IX-*` en el mensaje;
- se instalan como `CONSTRAINT TRIGGER`, `AFTER ... FOR EACH ROW DEFERRABLE INITIALLY IMMEDIATE`.

Los triggers recíprocos sobre padres impiden que terminar una membresía, cerrar un rol o cambiar un estado deje hijos efectivos inválidos. El comando de dominio debe cerrar esos hijos en la misma transacción y puede ejecutar `SET CONSTRAINTS ALL DEFERRED` hasta el `COMMIT`.

### 5.5 Targets polimórficos

`CHECK (num_nonnulls(target_*) = 1)` sigue probando la forma de la fila. El constraint trigger prueba la semántica:

1. resuelve únicamente la FK no nula;
2. obtiene su `person_id`, directamente o por la ejecución padre;
3. lo compara con el sujeto declarado;
4. para revisiones, comprueba además que `executed_session_id` coincide con la ejecución del target;
5. rechaza si el target dejó de ser elegible durante la transacción.

## 6. Orden de escritura y concurrencia

- Las FKs compuestas son `NOT DEFERRABLE` salvo un ciclo real documentado.
- Los guardianes de estado son diferibles para permitir comandos atómicos, nunca para aceptar inconsistencia después del `COMMIT`.
- Los locks se adquieren en orden: persona → organización → membresía → relación → asignación → planificación → ejecución.
- Los procesos masivos usan las mismas constraints. No se admite `session_replication_role = replica` en migraciones de datos V1.
- Un fallo de integridad aborta todo el comando, incluido outbox y auditoría.

## 7. Pruebas negativas obligatorias

La suite `tests/database/integrity/` usará `allfit_integrity_test`, un rol con `BYPASSRLS` pero sin `SUPERUSER`, sin propiedad de tablas y sin capacidad de desactivar triggers.

| Prueba | Escritura inválida que debe fallar |
| --- | --- |
| `T-INT-01` | Enlazar como anterior una relación de otra persona u organización |
| `T-INT-02` | Asignar una membresía de otra organización |
| `T-INT-03` | Activar como titular/suplente una membresía inactiva o sin `coach` |
| `T-INT-04` | Atribuir un claim de una persona a la asignación de otra |
| `T-INT-05` | Registrar consentimiento con persona y relación divergentes |
| `T-INT-06` | Solicitar un grant con relación o membresía de otra organización |
| `T-INT-07` | Crear un grant con persona, organización, consentimiento o scope ajenos |
| `T-INT-08` | Ocultar una ejecución o relación de otra persona |
| `T-INT-09` | Abrir un caso histórico con relación o membresías de otro tenant |
| `T-INT-10` | Mantener abierto un caso después de perder elegibilidad |
| `T-INT-11` | Asignar un programa con una relación origen de otra persona |
| `T-INT-12` | Abrir un periodo con asignación y relación de personas distintas |
| `T-INT-13` | Revisar con autor de otra persona o aplicar field/tipo/unidad incompatible con el paso asignado |
| `T-INT-14` | Crear una ejecución con relación o organización de contexto divergente |
| `T-INT-15` | Materializar una sesión con persona distinta de la asignación |
| `T-INT-16` | Enlazar una ejecución al plan de otra persona |
| `T-INT-17` | Marcar primaria una ejecución incompleta, inválida o ajena |
| `T-INT-18` | Referenciar un segmento de otra ejecución desde cualquier resultado |
| `T-INT-19` | Crear una observación con ejecución, persona o autor divergentes |
| `T-INT-20` | Proponer corrección sobre target ajeno o con `target_field`/tipo/unidad no válidos para ese target |
| `T-INT-21` | Registrar una revisión cuyo target y ejecución no coinciden |
| `T-INT-22` | Insertar un target de fuerza/endurance/interval/movilidad en una familia incompatible |
| `T-INT-23` | Insertar directamente o registrar un `ACCESS_EVENT` con contexto incoherente |
| `T-INT-24` | Crear una invitación con membresía emisora de otra organización |
| `T-INT-25` | Atribuir un evento organizacional a una membresía de otro tenant |
| `T-INT-26` | Disponer un target de otra persona o asociar una solicitud ajena al caso |
| `T-INT-27` | Registrar un evento break-glass con solicitante o sujeto distintos de la solicitud |
| `T-INT-28` | Activar un deber sin rol base, con modo/AAL/vigencia incompatibles o autoasignado |
| `T-INT-29` | Aprobar break-glass con deber ajeno/vencido, como solicitante/sujeto o por segunda vez |
| `T-INT-30` | Revisar un caso solicitado o aprobado por la misma persona, o sin deber de auditor vigente |

### 7.1 Nutrición

| Prueba | Escritura inválida que debe fallar |
| --- | --- |
| `T-NUT-INT-01` | Enlazar un ítem o valor nutricional a una comida de otra persona |
| `T-NUT-INT-02` | Guardar un nutriente o target con unidad distinta de su definición canónica |
| `T-NUT-INT-03` | Proponer objetivos con set, persona, relación, organización, asignación, membresía o autor divergentes |
| `T-NUT-INT-04` | Proponer sin capability, credencial vigente o grant exacto `nutrition_guidance/contribute` |
| `T-NUT-INT-05` | Crear una versión `self` con contexto profesional o una `professional` incompleta |
| `T-NUT-INT-06` | Mantener dos metas activas o dos propuestas pendientes de la misma relación |
| `T-NUT-INT-07` | Crear un target con forma, rango o unidad incompatible |
| `T-NUT-INT-08` | Decidir dos veces, decidir una versión ajena/no profesional/no pendiente o aceptar sin transición atómica |

Cada prueba verifica `SQLSTATE`, nombre del constraint o ID `IX-*`, rollback total y ausencia de evento de dominio. Cada invariante tiene además un caso positivo mínimo y, cuando usa trigger diferible, una prueba con dos transacciones concurrentes.

## 8. Criterio de implementación

ADR-028 añade `IX-42..44` y `T-INT-28..30`; el conteo global se recompilará en `DB-P5-014`. La Fase 5 solo puede marcar cada rebanada como terminada cuando:

1. sus claves portadoras, FKs y triggers estén presentes en la migración;
2. los roles runtime no puedan eludirlos;
3. la prueba negativa `T-INT-*` correspondiente pase con `BYPASSRLS`;
4. el introspector de constraints confirme nombres, columnas, `MATCH`, acciones de borrado y diferibilidad;
5. restauración y replay conserven las mismas restricciones.
