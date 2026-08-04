# Matriz de trazabilidad física de RLS V1

**Fecha:** 3 de agosto de 2026
**Fase:** 3–4 — cierre físico previo a implementación
**Estado:** Backoffice opción B recertificada; resto de P0 pendiente
**Deriva de:** [`V1_OPERATIONS_MATRIX.md`](./V1_OPERATIONS_MATRIX.md), [`V1_RLS_MATRIX.md`](./V1_RLS_MATRIX.md), [`V1_DATA_DICTIONARY.md`](./V1_DATA_DICTIONARY.md), [`V1_PHYSICAL_OBJECT_CATALOG.md`](./V1_PHYSICAL_OBJECT_CATALOG.md), [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](./V1_CROSS_TABLE_INTEGRITY_MATRIX.md)

## 1. Propósito

Esta matriz elimina las expresiones no implementables como “vía la relación”, “hereda del padre” o “relación visible”. Para cada ruta de autorización fija:

1. operaciones que la ejercen;
2. tablas y columnas físicas;
3. predicado o proyección obligatoria;
4. índice que sostiene el predicado;
5. familia de pruebas que demuestra acceso permitido y denegado.

La matriz no crea una segunda semántica de seguridad. La semántica pertenece a `V1_RLS_MATRIX.md`; este documento es su compilación física y prevalece ante cualquier resumen ambiguo del diccionario.

## 2. Reglas de compilación

- Toda policy se expresa con columnas existentes en la tabla protegida o con un join completamente especificado.
- Una policy no navega por texto libre, JSON ni nombres de presentación.
- Los joins de tenant usan las claves portadoras compuestas de `V1_CROSS_TABLE_INTEGRITY_MATRIX.md`.
- El acceso profesional a contenido personal se hace por proyecciones cerradas. La tabla base no se convierte en API.
- `auth.grant_of` solo resuelve grants `active`; `auth.frozen_grant_of` solo resuelve grants `frozen`.
- Una denegación se aplica antes del detalle, conteo, agregado o derivado.
- `SECURITY DEFINER` fija `search_path = pg_catalog`, califica todos los objetos y obtiene el actor del contexto transaccional.
- Cada índice listado aquí forma parte del contrato de autorización, no es una optimización opcional.
- El nombre DDL de cada índice/policy se deriva mecánicamente de `V1_PHYSICAL_OBJECT_CATALOG.md`; una variante de nombre también es drift.

## 3. Contratos físicos canónicos

### 3.1 Contexto

`auth.account()`, `auth.person()`, `auth.org()`, `auth.membership()`, `auth.purpose()` y `auth.request_id()` leen exclusivamente las variables `app.*` fijadas por `SET LOCAL`. `auth.has_platform_role` y `auth.has_platform_duty` vuelven a consultar las tablas `support` en la misma transacción; un valor `app.platform_duty`, grupo o header no es autoridad. Ninguna función recibe al actor desde el payload.

### 3.2 Grants live y frozen

```text
auth.grant_of(p_relationship_id uuid, p_scope_code text)
  → grant_id, person_id, organization_id, scope_definition_id,
    access_level, purpose

auth.frozen_grant_of(p_relationship_id uuid, p_scope_code text)
  → grant_id, person_id, organization_id, scope_definition_id,
    access_level, purpose, frozen_at
```

Ambas son `STABLE SECURITY DEFINER`. La primera filtra `data_grants.status='active'`; la segunda, `status='frozen'`. La unicidad física es:

```sql
UNIQUE (relationship_id, scope_code)
WHERE status IN ('active', 'frozen')
```

`scope_code` se denormaliza únicamente en `grant_requests`, `consent_events` y `data_grants`, donde participa en autorización. No puede divergir de la versión porque las tres tablas enlazan `(scope_definition_id, scope_code)` con la clave portadora `scope_definitions(id, scope_code)`.

### 3.3 Transiciones de grant

| Estado resultante | `frozen_at` | `revoked_at` | Entrada autorizada |
| --- | --- | --- | --- |
| `active` | `NULL` | `NULL` | `privacy.grant_consent(request_id)` |
| `frozen` | No nulo | `NULL` | `relationships.terminate_relationship(relationship_id)` |
| `revoked` | Puede conservarse | No nulo | `privacy.revoke_grant(grant_id)` |

`privacy.enforce_data_grant_transition_tg` prohíbe reactivar, pasar de `revoked` a `frozen` y cambiar un corte ya fijado.

### 3.4 Proyecciones cerradas

| Proyección | Consumidor | Regla |
| --- | --- | --- |
| `identity.v_client_identity` | Studio | Identidad mínima de la relación, sin PII de cuenta |
| `identity.v_client_profile` | Studio | Field-set de `relationship_training` |
| `identity.v_client_body_progress` | Studio | Field-set de `body_progress` |
| `identity.v_client_health_context` | Studio | Field-set minimizado de `health_context` |
| `execution.v_client_executions` | Studio | Grant por procedencia, denegación antes de proyectar/contar |
| `execution.v_client_progress` | Studio | Clasificación más restrictiva de todos los inputs |
| `privacy.v_frozen_relationship_history` | Studio histórico | Caso exacto, corte, field-set histórico y auditoría |
| `privacy.v_my_access_events` | Space | Solo `subject_person_id = auth.person()` |
| `support.v_support_metadata` | Soporte | Solo metadatos operativos |

Las vistas de contenido se invocan dentro de una función transaccional que registra `privacy.log_access_event` antes de devolver el resultado.

### 3.5 Entrada cerrada de auditoría

```text
privacy.log_access_event(
  p_subject_person_id uuid,
  p_relationship_id uuid,
  p_data_grant_id uuid,
  p_historical_access_case_id uuid,
  p_scope_code text,
  p_scope_version integer,
  p_access_mode privacy.access_mode,
  p_resource text,
  p_result text
) RETURNS uuid
```

Los tres identificadores de contexto pueden ser `NULL` solo cuando el modo y resultado lo permitan. Actor, membresía, propósito y `request_id` salen de `app.*`; `occurred_at` sale de `statement_timestamp()`. El caller no puede forjarlos. La función valida `IX-23`, inserta y devuelve el ID del evento; el contenido solo se entrega si la inserción confirma.

## 4. Matriz operación → policy → índice → prueba

| Ruta | Operaciones | Recurso físico y columnas de enlace | Predicado o superficie exacta | Índices obligatorios | Pruebas |
| --- | --- | --- | --- | --- | --- |
| `PR-01` | `OP-IDN-001..003` | `identity.access_accounts(id,person_id)`; `onboarding_attempts(account_id,status,expires_at)`; `eligibility_evidence(onboarding_attempt_id,result)` | Cuenta externa propia; onboarding sin persona solo por `auth.account()`; activación únicamente mediante `identity.activate_person` | único `(provider,issuer,subject)`; `access_accounts(person_id)`; parcial `onboarding_attempts(account_id) WHERE status='open'`; evidencia `(onboarding_attempt_id,evaluated_at DESC)` | `T-ONB-*`, `T-PHY-01` |
| `PR-02` | `OP-IDN-004..008`, `010..015` | `people(id)` y recursos con `person_id`; `profile_verifications(claim_id,verifier_person_id,method,source_authority,source_status,source_checked_at,source_valid_to,valid_to)` | `auth.is_self(person_id)`; escrituras profesionales solo donde la ficha las declara; `OP-IDN-011` solo por función con `verify_professional_credentials`, AAL2, método/fuente y conflictos cerrados | `person_id` en cada recurso; verificaciones `(claim_id)`; índices temporales descritos en diccionario | `T-PEOPLE-*`, `T-PROFILE-*`, `T-BODY-*`, `T-HEALTH-*`, `T-VG-01..06` |
| `PR-03` | `OP-IDN-017` | perfil, medidas y contexto de salud enlazados por `person_id`; grant por relación | `identity.v_client_*` + `auth.can_access(person_id,scope_code,level)`; nunca lectura profesional de `people` | grants efectivos; índices por `person_id`; reglas `(scope_definition_id,resource,field)` | `T-PROFILE-*`, `T-BODY-*`, `T-HEALTH-*`, `T-PHY-07` |
| `PR-04` | `OP-IDN-009`, `016`; `OP-ORG-005..006`, `016`; `OP-REL-001` | `identity.invitations(organization_id,token_hash,status,expires_at)` e `identity.invitation_intents(invitation_id,status)` | Organización por `organization_id=auth.org()` + capacidad; aceptación por token hasheado dentro de función atómica; intenciones heredan con `EXISTS identity.invitations.id=invitation_id` | único `token_hash`; invitaciones `(organization_id,status)`; intenciones `(invitation_id,status)` | `T-INV-*`, `T-PHY-01` |
| `PR-05` | `OP-ORG-001..017` | `organizations`, `organization_memberships(person_id,organization_id,status)`, `membership_roles(membership_id,role_code,valid_from,valid_to)` | `auth.has_membership(organization_id)` y `auth.has_capability(organization_id,capability)`; la membresía del actor es `auth.membership()` | memberships `(person_id,status)`, `(organization_id,status)`; roles `(membership_id,role_code,valid_from,valid_to)` | `T-ORG-*`, `T-ROLE-*`, `T-STAFF-*` |
| `PR-06` | `OP-REL-002..014` | `service_relationships(id,person_id,organization_id,status)`; `relationship_professional_assignments(relationship_id,person_id,organization_id,membership_id,status,valid_from,valid_to)` | Persona por `person_id`; organización por `organization_id`; profesional mediante `auth.effective_assignment(relationship_id)` y membresía vigente | relaciones `(person_id,status)`, `(organization_id,status)`; asignaciones `(relationship_id,status,valid_from,valid_to)`, `(person_id,status)`, `(organization_id,status)` | `T-REL-*`, `T-ASGN-*`, `T-PHY-07` |
| `PR-07` | `OP-PRV-011..012` | `privacy.scope_definitions(id,scope_code,version_number,status)` y reglas hijas por `scope_definition_id` | Lectura autenticada solo `status='published'`; escritura plataforma; hijos heredan mediante FK al padre publicado | único `(scope_code,version_number)`; portador `(id,scope_code)`; reglas `(scope_definition_id,resource,field)` | `T-SCOPE-*`, `T-PHY-01` |
| `PR-08` | `OP-PRV-001..005`, `013..014` | `grant_requests(relationship_id,organization_id,scope_definition_id,scope_code,status)`; `consent_events(person_id,relationship_id,organization_id,scope_definition_id,scope_code)`; `data_grants(...)` | Persona vía `service_relationships(id,person_id)`; organización por par `(relationship_id,organization_id)`; inserción/revocación solo por funciones del §3.3 | solicitudes `(relationship_id,status)`, `(organization_id,status)` y pendiente único; consentimientos por persona/relación/org; grant efectivo único | `T-CONSENT-*`, `T-GRANT-*`, `T-PHY-02..05` |
| `PR-09` | lecturas Studio de `OP-IDN-017`, `OP-PLN-*`, `OP-EXE-017..019` | relación, asignación, membresía, grant, definición y recurso solicitado | Las diez condiciones de `auth.can_access`; `auth.grant_of` no acepta `frozen` ni `revoked`; salida solo por proyección cerrada | cadena completa de relación/asignación/membresía/grant; índices del recurso por `person_id` | `T-GRANT-*`, familias de cada proyección, `T-PHY-04`, `T-PHY-07` |
| `PR-10` | `OP-PRV-018..020` | `historical_access_cases(organization_id,relationship_id,authorized_membership_id,purpose,status,expires_at)`; `data_grants(...,frozen_at)` | `privacy.v_frozen_relationship_history` + `auth.can_read_frozen`; exige caso exacto, actor, MFA, propósito, field-set, retención, denegación y `occurred_at <= frozen_at` | casos `(authorized_membership_id,status,expires_at)`, `(organization_id,relationship_id,status)`; grants frozen `(relationship_id,scope_code,frozen_at)` | `T-REL-8`, `T-FROZEN-*`, `T-ACCESS-5`, `T-PHY-03..04` |
| `PR-11` | `OP-PRV-006..007`, `017`; lecturas `OP-EXE-017..019` | `session_visibility_denials(executed_session_id,relationship_id,status)`; sesión con `person_id` | `auth.session_denied(session_id,relationship_id)` se evalúa antes de detalle, conteo y derivado | único `(executed_session_id,relationship_id)`; `(relationship_id,status)` | `T-DENIAL-*`, `T-EXEC-3`, `T-PHY-07` |
| `PR-12` | `OP-PRV-015` | `access_events(subject_person_id,actor_person_id,actor_membership_id,occurred_at,access_mode,result)` | Tabla base: solo sujeto; Space usa `privacy.v_my_access_events`; `A10/A12` sin `SELECT` directo; inserción solo por `privacy.log_access_event` | partición mensual; `(subject_person_id,occurred_at DESC)` por partición | `T-ACCESS-1..7`, `T-PHY-06` |
| `PR-13` | `OP-PRV-008..010`, `016` | políticas, solicitudes, casos, ítems y holds con `person_id`, `status`, `due_at` y target tipado | Persona ve su caso; worker de privacidad usa rol no humano; organización no recibe superficie de disposición personal | `(person_id,status)`; `disposition_items(status,due_at)`; índice del target tipado | `T-ERASURE-*`, `T-DISP-*`, `T-HOLD-*` |
| `PR-14` | `OP-CAT-006..012` | `disciplines(status)`; `activity_types(content_scope,owner_organization_id,status)`; `units`; `equipment(content_scope,owner_organization_id)` | Global publicado; contenido organizacional solo `owner_organization_id=auth.org()`; aliases heredan con `EXISTS` al padre | disciplinas `(status)`; tipos por scope/owner/status; equipment por scope/owner; alias por FK | `T-CAT-*`, `T-PHY-01`, `T-PHY-07` |
| `PR-15` | `OP-CAT-001..005`, `009..010` | `movements(content_scope,owner_organization_id,owner_person_id,discipline_code,status)` | Global publicado, organización owner con membresía, o persona owner; exactamente un owner según scope | `(content_scope,owner_organization_id,status)`; `(content_scope,discipline_code,status)`; nombre normalizado | `T-MOV-*`, `T-PHY-07` |
| `PR-16` | `OP-PLN-001..009`, `019..021` | templates/programs con `owner_organization_id` u `owner_person_id`; versiones y pasos por FK padre | Padre visible por owner; versiones, pasos y reglas hijas usan `EXISTS` por FK hasta el padre; publicación no amplía owner | padres `(owner_organization_id,status)`, `(owner_person_id,status)`; hijos por FK padre | `T-TPL-*`, `T-PROG-*`, `T-PHY-01`, `T-PHY-07` |
| `PR-17` | `OP-PLN-010..018` | `program_assignments(person_id,origin_relationship_id,lifecycle)`; periodos y sesiones por `assignment_id` | Persona propia o relación de origen + `auth.can_access(...,'relationship_training','read')`; hijos heredan por FK a asignación visible | `(person_id,lifecycle)`, `(origin_relationship_id,lifecycle)`; periodo vigente único; hijos por `assignment_id` | `T-ASG-*`, `T-PLAN-*`, `T-PHY-07` |
| `PR-18` | `OP-EXE-001..009`, `014..016` | `executed_sessions(person_id,context_relationship_id,started_at)`; hijos por `executed_session_id` | Persona propia con `auth.is_self(person_id)`; hijos heredan con `EXISTS executed_sessions.id=executed_session_id AND person_id=auth.person()` | sesiones `(person_id,started_at DESC)`; cada hijo `(executed_session_id)` | `T-EXEC-*`, `T-RESULT-*`, `T-PHY-01` |
| `PR-19` | `OP-EXE-017..019` | sesiones con `person_id`, `context_relationship_id`; resultados tipados; derivados | `execution.v_client_executions` y `execution.v_client_progress`; grant por procedencia, field-set por dato, denegación previa | sesión por persona/contexto; resultados por sesión; derivados `(person_id,metric_code,period)` | `T-EXEC-*`, `T-PROGRESS-*`, `T-PHY-07` |
| `PR-20` | `OP-EXE-010..013`, `020` | observaciones/revisiones/propuestas con `(author_assignment_id,person_id)` o `(proposer_assignment_id,person_id)` y target tipado | Contribución exige `auth.can_access` y asignación efectiva; actualización solo autor mediante evento de revisión; nunca sobrescribe el original | observaciones `(person_id,executed_session_id)`, `(author_assignment_id)`; propuestas `(person_id,status,expires_at)`, `(proposer_assignment_id,status)`; revisiones por ejecución/target | `T-OBS-*`, `T-CORR-*`, `T-PHY-01` |
| `PR-21` | `OP-SYS-010`, `OP-EXE-016`, `019` | resultados derivados con persona, métrica, periodo, algoritmo, versión e inputs clasificados | Worker calcula; lectura requiere que todos los inputs satisfagan el scope y la clasificación más restrictiva | `(person_id,metric_code,period)`; inputs por derivado | `T-DERIVED-*`, `T-PROGRESS-*` |
| `PR-22` | `OP-SUP-001..006` | rol base y deber exacto; requests con `requester_duty_assignment_id`, propósito/caso/tier/quorum/plazos; approvals con deber de aprobador; events allowed/denied ligados a solicitud, solicitante, sujeto, deber y `access_event` | `auth.has_platform_role` + `auth.has_platform_duty`; funciones/proyecciones cerradas; AAL2/conflicto; `nutrition_guidance` estándar (un A12/30 min), `nutrition_intake` restringida (dos A12/15 min) y `nutrition_media` rechazada; A10 exacto ejerce; auditor posterior independiente; sin DML, exportación, `OP-NUT-013` ni storage | duties `(person_id,duty_code,status,valid_to)`; requests `(requester_person_id,status,request_expires_at)`, `(status,window_ends_at)`; approvals unique `(request_id,approver_person_id)`; events por request/requester/subject | `T-DUTY-*`, `T-BG-*`, `T-BGG-01..12`, `T-ACCESS-4..7`, `T-PHY-06` |
| `PR-23` | `OP-SYS-001..009` | `outbox_events(dispatched_at,aggregate_id)`; `idempotency_keys(principal_fingerprint,client_id,surface,operation_code,key,command_id,status,response_expires_at)`; `job_runs(job_name,cycle_key,status,started_at)` | Roles worker dedicados; `allfit_api` crea/terminaliza dentro de la transacción; `allfit_idempotency_worker` solo ejecuta expiración/purga cerradas; ningún runtime lee receipts ajenos | outbox parcial por no despachados; uniques scoped de transporte/comando; expiración/purga y agregado; jobs `UNIQUE(job_name,cycle_key)` y `(job_name,started_at DESC)` | `T-SYS-*`, `T-IDEM-01..10`, pruebas de roles y recuperación |
| `PR-24` | `OP-NUT-001..008` | `meals(person_id,occurred_at,revision_number)`, hijos por `meal_id`; `goal_sets(person_id)`, versiones/targets/decisiones por FK | Self mediante `auth.is_self`; mutaciones solo por seis funciones `nutrition.*`; hijos heredan por FK/`EXISTS`; sin acceso directo profesional | meals `(person_id,occurred_at DESC,id DESC)`; ítems `(meal_id,position)`; nutrientes unique; goal set unique; versiones/targets/decisiones por padre | `T-NUT-RLS-01..05`, `17`, `20..22`, `T-NUT-PHY-01` |
| `PR-25` | `OP-NUT-009..010`, `OP-NUT-013` | relación, asignación, membresía, capability, verificación, grants intake/media y meals/hijos | `nutrition.v_client_meals_live`/`v_client_daily_summaries_live`; `auth.can_guide_nutrition`; media exige intersección intake+media y OP-NUT-013 la reevalúa en cada GET sin redirect; filtrar antes de agregar | cadena profesional completa; meals por persona/fecha; verificación `(claim_id,result,valid_to)`; scope rules por definición/recurso/campo | `T-NUT-RLS-06..16`, `T-NUT-PHY-02`, `T-NUT-PHY-04` |
| `PR-26` | `OP-NUT-011..012` live | goal set/version/targets/decisiones + contexto profesional compuesto en versión | Vista live para read; `nutrition.propose_goal_version` para contribute; capability `guide_nutrition`, credencial y grant exactos | goal set unique; versiones `(goal_set_id,created_at DESC,id DESC)` y pendiente por relación; targets/decisión unique | `T-NUT-RLS-18..22`, `T-NUT-PHY-03..04` |
| `PR-27` | `OP-NUT-011` frozen | caso histórico, grant guidance frozen, relación de origen, `created_at` y contenido profesional | `nutrition.v_client_guidance_frozen` + `auth.can_read_frozen`; solo guía emitida por esa relación con `goal_versions.created_at<=T`; sin joins a meals/media/resúmenes/metas self | casos/grants frozen existentes; versiones `(origin_relationship_id,created_at DESC,id DESC)`; decisiones por versión | `T-NUT-RLS-23..24`, `T-NUT-PHY-02..04` |
| `PR-28` | `OP-SUP-007..011` | `platform_role_assignments(person_id,status)` y `platform_duty_assignments(person_id,duty_code,actor_mode,status,valid_from,valid_to,required_aal)` con otorgante/recertificador/revocador humanos | Sólo funciones cerradas; `A12/manage_platform_access` administra a otra persona y `A12/audit_platform_access` consulta; rol base no implica deber; catálogo y modo derivados; AAL2; sin autoasignación, último admin ni `DELETE`; bootstrap sólo por ceremonia `allfit_migrator` con dos asignaciones cruzadas | rol unique parcial `(person_id,platform_role)`; deber unique parcial `(person_id,duty_code)`; `(person_id,status,valid_to)`, `(duty_code,status,valid_to)` | `T-ROLE-1..6`, `T-DUTY-01..08`, pruebas de revocación de sesión/ventana y grants mínimos |

### 4.1 Trazabilidad individual de `OP-NUT-*`

Esta tabla es el índice unívoco operación → OpenAPI → policy/proyección → índice → prueba. Cada operación nutricional aparece exactamente una vez aquí.

`T-NUT-API-01/02` son gates globales de las trece operaciones y sus DTOs. La columna de pruebas mínimas enumera únicamente escenarios que ejercen la operación concreta.

| Operación | Ruta OpenAPI | Ruta/policy física | Índice obligatorio principal | Pruebas mínimas |
| --- | --- | --- | --- | --- |
| `OP-NUT-001` | `POST /space/v1/nutrition/meals` | `PR-24` · `auth.is_self` · `nutrition.record_meal` | `meals(person_id,occurred_at DESC,id DESC)` | `T-NUT-RLS-01`, `T-NUT-INT-01/02`, `T-NUT-IDEM-01/05`, `T-NUT-API-03`, `T-NUT-PHY-01` |
| `OP-NUT-002` | `GET /space/v1/nutrition/meals` | `PR-24` · self policy de comida/hijos | `meals(person_id,occurred_at DESC,id DESC)` | `T-NUT-RLS-02/03`, `T-NUT-API-05/12`, `T-NUT-PHY-01/04` |
| `OP-NUT-003` | `PATCH /space/v1/nutrition/meals/{mealId}` | `PR-24` · `nutrition.revise_meal` | `meals(id,person_id)` + `revision_number` | `T-NUT-RLS-02/03/05`, `T-NUT-INT-01/02`, `T-NUT-IDEM-02/03/05`, `T-NUT-API-04/05`, `T-NUT-PHY-01` |
| `OP-NUT-004` | `DELETE /space/v1/nutrition/meals/{mealId}` | `PR-24` · `nutrition.delete_meal` → disposición | `meals(id,person_id)` + target de disposición | `T-NUT-RLS-02/03/05`, `T-NUT-IDEM-06`, `T-NUT-PHY-01` |
| `OP-NUT-005` | `GET /space/v1/nutrition/daily-summaries` | `PR-24` · proyección self calculada | `meals(person_id,local_date)` + nutrientes por ítem | `T-NUT-RLS-02`, `T-NUT-API-07`, `T-NUT-PHY-01/04` |
| `OP-NUT-006` | `GET /space/v1/nutrition/goals` | `PR-24` · self policy de goal set/versiones | `goal_sets(person_id)` + `goal_versions(goal_set_id,created_at DESC,id DESC)` | `T-NUT-RLS-17/20/21`, `T-NUT-INT-05/06`, `T-NUT-API-14`, `T-NUT-PHY-01/04` |
| `OP-NUT-007` | `POST /space/v1/nutrition/goals/versions` | `PR-24` · `nutrition.publish_self_goal_version` | activo único por `goal_set_id` | `T-NUT-RLS-17`, `T-NUT-INT-05..07`, `T-NUT-IDEM-05`, `T-NUT-API-08/14`, `T-NUT-PHY-01/03` |
| `OP-NUT-008` | `POST /space/v1/nutrition/goal-versions/{goalVersionId}/decision` | `PR-24` · `nutrition.decide_goal_proposal` | `UNIQUE(goal_version_id)` + activo único | `T-NUT-RLS-21/22`, `T-NUT-INT-08`, `T-NUT-IDEM-04/05`, `T-NUT-API-09`, `T-NUT-PHY-03` |
| `OP-NUT-009` | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/nutrition/meals` | `PR-25` · `nutrition.v_client_meals_live` | cadena profesional + meals por persona/fecha | `T-NUT-RLS-04/06..13/15/16`, `T-NUT-API-06/10/12`, `T-NUT-PHY-02/04` |
| `OP-NUT-010` | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/nutrition/daily-summaries` | `PR-25` · `nutrition.v_client_daily_summaries_live` | cadena profesional + `meals(person_id,local_date)` | `T-NUT-RLS-04/06..10/14/15`, `T-NUT-API-07/10`, `T-NUT-PHY-02/04` |
| `OP-NUT-011` | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/nutrition/goals/versions` | `PR-26` live / `PR-27` frozen | versiones `(goal_set_id,created_at DESC,id DESC)` live y `(origin_relationship_id,created_at DESC,id DESC)` frozen | `T-NUT-RLS-20/23/24`, `T-NUT-API-10/11/14`, `T-NUT-PHY-02/04` |
| `OP-NUT-012` | `POST /studio/v1/organizations/{organizationId}/clients/{personId}/nutrition/goals/versions` | `PR-26` · `nutrition.propose_goal_version` | pendiente única por set/relación + cadena profesional | `T-NUT-RLS-18/19`, `T-NUT-INT-03..07`, `T-NUT-IDEM-05`, `T-NUT-API-08/14`, `T-NUT-PHY-03/04` |
| `OP-NUT-013` | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/nutrition/meals/{mealId}/photo` | `PR-25` · proxy API sobre `nutrition.v_client_meals_live`; sin acceso directo a storage | cadena profesional + `meals(id,person_id)` | `T-NUT-RLS-04/06..13/16`, `T-NUT-API-05/06/12/13`, `T-NUT-PHY-02/04` |

## 5. Pruebas de cierre físico de P0-06

Estas pruebas se implementan junto con las migraciones de Fase 5. Son adicionales a las 186 pruebas funcionales/RLS catalogadas.

| ID | Tipo | Demostración exigida |
| --- | --- | --- |
| `T-PHY-01` | Catálogo/negativa | Cada expresión de `pg_policy`, vista y función compila contra columnas existentes; las rutas “heredadas” tienen FK y join explícitos, sin referencia textual huérfana. |
| `T-PHY-02` | Concurrencia/negativa | Dos transacciones no pueden crear grants no revocados del mismo `(relationship_id,scope_code)`, aunque apunten a versiones distintas. |
| `T-PHY-03` | Estado/negativa | El trigger rechaza reactivación, `revoked→frozen`, `frozen` sin corte, `active` con corte y mutación de un corte fijado. |
| `T-PHY-04` | Función/positiva-negativa | `auth.grant_of` devuelve solo `active`; `auth.frozen_grant_of`, solo `frozen`; cada una devuelve cero filas para los otros estados. |
| `T-PHY-05` | Integridad/negativa | Un `scope_code` que no corresponde al `scope_definition_id` es rechazado en solicitud, consentimiento y grant. |
| `T-PHY-06` | Privilegios/negativa | `A10` y `A12` no leen `privacy.access_events`; `A12` solo obtiene metadatos por función, ningún aprobador revisa su propio caso y `A10` solo ve/ejerce sus expedientes con quorum vigente. |
| `T-PHY-07` | Plan/positiva | Las consultas representativas de las 28 rutas tienen disponibles los índices exactos declarados; el pipeline compara catálogo e índices con esta matriz y guarda `EXPLAIN (ANALYZE, BUFFERS)` en fixtures de escala. |
| `T-NUT-PHY-01` | Catálogo/privilegios | Las ocho tablas existen con columnas/FKs declaradas, `FORCE RLS`, sin grants directos de mutación y con funciones cerradas. |
| `T-NUT-PHY-02` | Proyección/negativa | Vistas live/frozen no exponen tablas/columnas fuera de sus scopes; media aislada y frozen nunca producen filas de ingesta. |
| `T-NUT-PHY-03` | Concurrencia/integridad | Índices parciales y guardianes garantizan una versión activa, una decisión por propuesta y una pendiente por relación. |
| `T-NUT-PHY-04` | Plan/positiva | `EXPLAIN` de `PR-24..27` usa los índices declarados para self, live, aggregate y frozen en fixtures de escala. |

## 6. Gate de implementación

P0-06 queda documentalmente resuelto cuando:

- el diccionario y el ERD contienen las columnas, FKs, estados e índices de esta matriz;
- RLS y contratos API usan los mismos nombres de funciones y proyecciones;
- no queda ninguna expresión “vía/hereda/visible” sin ruta `PR-*`;
- el readiness review registra P0-06 como cerrado.

El gate de Fase 5 no se satisface por el documento solo: las migraciones deben implementar `T-PHY-01..07`, `T-NUT-PHY-01..04` y las 186 pruebas RLS deben seguir pasando.
