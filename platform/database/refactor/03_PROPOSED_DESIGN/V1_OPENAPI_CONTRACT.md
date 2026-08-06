# Contrato OpenAPI de la primera rebanada vertical V1

**Versión de revisión:** 7<br>
**Fecha:** 6 de agosto de 2026<br>
**Fase:** 3 — Contrato ejecutable previo a Fase 5<br>
**Estado:** aprobado; contrato, tipos generados y gate de rutas sincronizados<br>
**Fuente canónica:** [`allfitone/packages/contracts/openapi/allfit-v1.openapi.yaml`](https://github.com/dinnartec/allfitone/blob/main/packages/contracts/openapi/allfit-v1.openapi.yaml)<br>
**Deriva de:** [`V1_OPERATIONS_MATRIX.md`](./V1_OPERATIONS_MATRIX.md), [`V1_SPACE_STUDIO_API_CONTRACTS.md`](./V1_SPACE_STUDIO_API_CONTRACTS.md), [`V1_IDEMPOTENCY_CONTRACT.md`](./V1_IDEMPOTENCY_CONTRACT.md) y [`V1_DEGRADATION_AND_RECOVERY_MATRIX.md`](./V1_DEGRADATION_AND_RECOVERY_MATRIX.md)

## 1. Decisión

La primera rebanada vertical ya tiene un contrato OpenAPI 3.1 canónico, cerrado y validable antes de implementar sus handlers. ADR-029 ubica su fuente ejecutable junto al código consumidor en el monorepo `allfitone`; este documento conserva el contexto y la trazabilidad. El archivo YAML fija:

- rutas, métodos y parámetros;
- DTOs exactos con objetos cerrados mediante `additionalProperties: false`;
- ejemplos completos de request y response;
- respuestas de error `application/problem+json`;
- autenticación, idempotencia y concurrencia optimista;
- política de caché por operación;
- relación exacta con la operación `OP-*`;
- política separada de URLs firmadas Space y proxy autenticado Studio.

Los P1/P2 contractuales de Nutrición quedan resueltos en esta revisión: el contrato separa requests self/profesional, protege medios Studio mediante proxy autenticado y publica autoría mínima consistente. La baseline completa queda recertificada para iniciar Fase 5. Una ruta de producto estable que no está en el YAML sigue sin autorización para implementarse. Solo una ruta operacional o provisional puede existir fuera de `paths`, siempre que figure en la lista auditable `x-allfit-contract-gate.exclusions`; esas exclusiones no constituyen contratos para clientes.

## 2. Alcance implementable

La primera rebanada ampliada se materializa en veintiuna operaciones HTTP: ocho del flujo original y trece del dominio Nutrición.

| Paso | Método y ruta | Operación | Request | Response | Caché |
| --- | --- | --- | --- | --- | --- |
| Publicar versión | `POST /studio/v1/organizations/{organizationId}/programs/{programId}/versions` | `OP-PLN-008` | `ProgramVersionCreate` | `ProgramVersion` | `no-store` |
| Asignar versión | `POST /studio/v1/organizations/{organizationId}/relationships/{relationshipId}/assignments` | `OP-PLN-010` | `ProgramAssignmentCreate` | `ProgramAssignment` | `no-store` |
| Consultar agenda | `GET /space/v1/agenda` | `OP-PLN-016` | query `from`, `to`, `limit`, `cursor` | `AgendaPage` | `private, max-age=0, must-revalidate` + `ETag` |
| Iniciar intento | `POST /space/v1/planned-sessions/{plannedSessionId}/attempts` | `OP-EXE-001` | `AttemptCreate` | `Attempt` | `no-store` |
| Guardar resultados | `PUT /space/v1/executions/{executionId}/results` | `OP-EXE-005` | `ExecutionResultsReplace` | `ExecutionResultsState` | `no-store` |
| Finalizar ejecución | `POST /space/v1/executions/{executionId}/finalize` | `OP-EXE-006` | `ExecutionFinalize` | `ExecutionFinalized` | `no-store` |
| Leer resultado autorizado | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/executions/{executionId}` | `OP-EXE-018` | path | `AuthorizedExecution` | `private, no-store` |
| Revocar consentimiento | `POST /space/v1/consents/{grantId}/revocation` | `OP-PRV-005` | sin body | `ConsentRevocation` | `no-store` |
| Registrar/listar comidas | `POST/GET /space/v1/nutrition/meals` | `OP-NUT-001/002` | `NutritionMealCreate` / query | `NutritionMeal` / `NutritionMealPage` | `no-store` |
| Revisar/eliminar comida | `PATCH/DELETE /space/v1/nutrition/meals/{mealId}` | `OP-NUT-003/004` | `NutritionMealPatch` / sin body | `NutritionMeal` / `204` | `no-store` |
| Resumen personal | `GET /space/v1/nutrition/daily-summaries` | `OP-NUT-005` | rango | `NutritionDailySummaryPage` | `private, no-store` |
| Metas personales | `GET /space/v1/nutrition/goals` | `OP-NUT-006` | sin body | `NutritionGoals` | `private, no-store` |
| Publicar meta personal | `POST /space/v1/nutrition/goals/versions` | `OP-NUT-007` | `SelfNutritionGoalVersionCreate` | `NutritionGoalVersion` | `no-store` |
| Decidir propuesta | `POST /space/v1/nutrition/goal-versions/{id}/decision` | `OP-NUT-008` | `NutritionGoalDecisionCreate` | `NutritionGoalDecision` | `no-store` |
| Leer comidas Studio | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/nutrition/meals` | `OP-NUT-009` | rango/cursor | `AuthorizedNutritionMealPage` | `private, no-store` |
| Obtener foto Studio | `GET .../nutrition/meals/{mealId}/photo` | `OP-NUT-013` | path + bearer | bytes JPEG/PNG/WebP | `private, no-store` |
| Leer resúmenes Studio | `GET .../nutrition/daily-summaries` | `OP-NUT-010` | rango | `NutritionDailySummaryPage` | `private, no-store` |
| Leer/proponer guía Studio | `GET/POST .../nutrition/goals/versions` | `OP-NUT-011/012` | query / `ProfessionalNutritionGoalVersionCreate` | `NutritionGoalVersionPage` / `NutritionGoalVersion` | `private, no-store` / `no-store` |

La lectura Studio posterior a la revocación reutiliza las operaciones GET correspondientes y, salvo la excepción de medios, responde `403 scope-required`; la revocación no crea operaciones adicionales. `OP-NUT-013` es la excepción cerrada: ante recurso inexistente o cualquier autorización no efectiva responde siempre el mismo `404` sin bytes para no revelar la existencia de la foto.

## 3. Reglas transversales cerradas

### 3.1 Identidad e idempotencia

Todo comando exige:

- `Idempotency-Key`: UUIDv4 nuevo por operación HTTP y reutilizado solo en sus reintentos;
- `Command-Id`: UUIDv7 durable creado con la intención de usuario;
- `Idempotent-Replay: true` cuando el servidor devuelve el resultado mínimo persistido de un replay.

En `OP-EXE-001`, `Command-Id` también se convierte en `executed_session.id`. Guardar resultados y finalizar emplean `Command-Id` e `Idempotency-Key` propios.

### 3.2 Concurrencia

`OP-EXE-005` y `OP-EXE-006` exigen un `If-Match` fuerte con formato:

```text
"execution:{executionId}:r{revision_number}"
```

Falta del header → `428 precondition-required`. Revisión obsoleta → `409 stale-draft`. Cada escritura exitosa incrementa `revision_number` y devuelve el nuevo `ETag`.

### 3.3 Caché

- Mutaciones y errores: `Cache-Control: no-store`.
- Agenda personal: `private, max-age=0, must-revalidate`, con `ETag` y soporte de `If-None-Match`/`304`.
- Proyecciones personales autorizadas en Studio: `private, no-store`.
- Ninguna respuesta que dependa de consentimiento puede confirmarse desde una copia obsoleta.

### 3.4 Entrega de medios privados

Space entrega a la persona su medio mediante `NutritionMeal.photo: SignedMediaUrl`:

- HTTPS y método `GET`;
- expiración máxima de 300 segundos desde su emisión;
- `Cache-Control: private, no-store`;
- query string opaco que nunca se registra ni persiste;
- la URL no constituye autorización durable y no puede renovarse sin reevaluar identidad.

Studio nunca recibe esa URL. `AuthorizedNutritionMeal.photo` contiene `AuthenticatedMediaLink` hacia `OP-NUT-013`, que:

- exige bearer y reevalúa la fórmula profesional completa más `nutrition_intake/read` y `nutrition_media/read` en cada GET;
- registra `ACCESS_EVENT`, responde `private, no-store` y transmite internamente solo bytes saneados;
- no redirige ni expone `media_ref`, query firmada o URL de storage;
- responde el mismo `404` sin bytes ante inexistencia o cualquier autorización no efectiva;
- hace que un enlace obtenido antes de una revocación deje de servir contenido en la lectura inmediatamente posterior.

## 4. Gate contract-first

Toda ruta registrada por Hono debe pertenecer a una de dos categorías mutuamente excluyentes:

1. operación estable de producto definida en `paths`, con `operationId` y `x-allfit-operation`;
2. excepción operacional o provisional declarada en `x-allfit-contract-gate.exclusions` y todavía presente en la implementación.

El manifiesto generado desde OpenAPI contiene ambas listas. CI enumera `createApp().routes`, rechaza una ruta implementada que no aparezca en ninguna y también rechaza una exclusión obsoleta cuya ruta ya no exista. La lista vigente contiene:

| Método y ruta | Clase | Ciclo de vida | Motivo |
| --- | --- | --- | --- |
| `GET /health` | Operacional | Permanente | Liveness pertenece al despliegue, no al contrato de producto. |
| `GET /studio/v1/auth/start` | Provisional | Hasta cerrar sesiones Studio | Walking skeleton del flujo hospedado; todavía no es contrato para clientes. |
| `GET /studio/v1/auth/callback` | Provisional | Hasta cerrar sesiones Studio | La respuesta actual es diagnóstica y debe sustituirse por el contrato real de sesión. |

Una operación solo puede implementarse cuando:

1. existe en el YAML con `operationId` único;
2. declara exactamente un `x-allfit-operation` presente en la matriz;
3. tiene request, responses, errores, seguridad y caché explícitos;
4. sus ejemplos pasan contra los esquemas;
5. los DTOs generados coinciden con el artefacto publicado;
6. cualquier cambio incompatible incrementa la versión de la superficie afectada.

El YAML inicial reúne Space y Studio para validar el flujo de extremo a extremo. La separación futura en `space-v1.yaml`, `studio-v1.yaml`, `catalog-v1.yaml` y componentes compartidos es una transformación de empaquetado: no puede alterar los contratos sin revisión.

## 5. Verificaciones obligatorias

| Prueba | Demuestra |
| --- | --- |
| `T-API-01` | El archivo parsea como OpenAPI 3.1.0 y todas las referencias locales resuelven. |
| `T-API-02` | Cada `operationId` es único, cada operación declara un `x-allfit-operation` válido y toda ruta Hono está cubierta por OpenAPI o por una exclusión vigente; ninguna exclusión queda obsoleta. |
| `T-API-03` | Las veintiuna operaciones de la rebanada están presentes; no falta ningún paso ejecutable. |
| `T-API-04` | Requests, responses y ejemplos validan contra esquemas cerrados. |
| `T-API-05` | Todo comando exige `Idempotency-Key` y `Command-Id`; resultados/finalización exigen `If-Match`. |
| `T-API-06` | Cada operación y respuesta declara su política de caché; los errores nunca son cacheables. |
| `T-API-07` | La proyección Studio aplica field-set y no distingue datos redactados de datos no capturados. |
| `T-API-08` | Toda URL firmada es HTTPS, dura como máximo 300 segundos y no filtra su query a logs. |
| `T-API-09` | Los tipos TypeScript y el manifiesto de operaciones/exclusiones se regeneran de forma determinista y no difieren del OpenAPI publicado. |

### 5.1 Verificaciones nutricionales

| Prueba | Demuestra |
| --- | --- |
| `T-NUT-API-01` | Existen exactamente `OP-NUT-001..013`, con `operationId` únicos y diez paths nuevos. |
| `T-NUT-API-02` | Todos los DTOs públicos de Nutrición y sus componentes tienen `additionalProperties:false`. |
| `T-NUT-API-03` | Crear comida exige `Command-Id`; replay no duplica comida, ítems o nutrientes. |
| `T-NUT-API-04` | PATCH exige ETag `"nutrition-meal:{id}:r{n}"`; obsoleto devuelve conflicto sin cambio parcial. |
| `T-NUT-API-05` | Foto acepta solo payload declarado, se sanea en servidor y nunca expone `media_ref`. |
| `T-NUT-API-06` | Meal/media redaction exige intake+media; media aislada no cambia filas, total o cursor. |
| `T-NUT-API-07` | Resúmenes abarcan máximo 31 días y omiten nutrientes no capturados sin convertir ausencia en cero. |
| `T-NUT-API-08` | Space acepta una meta sin `rationale`; el request Studio y toda respuesta `NutritionGoalVersion` de origen profesional exigen `rationale` no nulo, con contenido y máximo 2000 caracteres; la propuesta responde `proposed` y no cambia la activa antes de decisión. |
| `T-NUT-API-09` | Solo `accepted/rejected` son decisiones válidas y la respuesta identifica la versión activa resultante. |
| `T-NUT-API-10` | GET Studio aplica scopes live; header histórico selecciona exclusivamente la proyección frozen. |
| `T-NUT-API-11` | Frozen nunca serializa comidas, fotos, resúmenes, metas self, otra relación o post-corte. |
| `T-NUT-API-12` | La URL firmada Space usa HTTPS/GET y expira en máximo 300 s; Studio solo serializa un enlace API autenticado y todas las respuestas sensibles son `no-store`. |
| `T-NUT-API-13` | `OP-NUT-013` transmite un medio saneado sin redirect; el mismo enlace responde `404` sin bytes inmediatamente después de revocar intake o media y ante cualquier contexto profesional inválido. |
| `T-NUT-API-14` | Toda `NutritionGoalVersion` incluye `author.kind` igual a `origin` y `author.person_id` UUID; self usa la persona del goal set y professional conserva el snapshot del autor también en live/frozen, sin nombres ni IDs internos de contexto. |

`T-NUT-API-01/02` son verificaciones globales de las trece operaciones y todos sus DTOs; no se repiten como trazas individuales salvo cuando una fila dependa de una regla más específica.

Estas verificaciones deben entrar en CI antes del primer handler. La validación documental de P1-01 no sustituye las pruebas de integración de Fase 6.

## 6. Resultado

Los tres P1 y los tres P2 de Nutrición dejan de ser bloqueos contractuales: frozen usa una columna física real, la propuesta profesional exige `rationale`, Studio tiene revocación efectiva por petición para medios, `NutritionGoalVersion` publica autoría mínima y la trazabilidad operación→prueba es exacta. La recertificación integral conserva 18 paths/21 operaciones, añade tres exclusiones auditables sin ampliar el contrato estable y habilita `GO` para iniciar Fase 5.
