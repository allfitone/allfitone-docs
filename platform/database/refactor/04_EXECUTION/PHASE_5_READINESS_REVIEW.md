# Revisión de preparación para la Fase 5

**Versión de revisión:** 14<br>
**Fecha:** 28 de julio de 2026<br>
**Revisión del repositorio:** correcciones P1/P2 de ADR-027 y drift contractual tardío propagadas; baseline recertificada<br>
**Estado:** **GO CONDICIONADO — reabierto por DT-017 y ADR-029**<br>
**Nota del 30 de julio de 2026:** el dominio de pagos (DT-017) incorporó un schema nuevo, seis tablas, dieciséis operaciones y tres invariantes. Esta revisión **debe volver a correrse** sobre la baseline resultante antes de dar el GO por firme. El inventario pasó de 99 a 107 tablas y de 150 a 171 operaciones.<br>
**Nota del 3 de agosto de 2026:** las menciones a Cognito conservan la dependencia evaluada históricamente el 28 de julio. ADR-002 las supersede con WorkOS AuthKit y `DB-P5-019` exige recertificar autenticación antes de implementar.<br>
**Nota del 5 de agosto de 2026:** ADR-029 consolidó API, worker y clientes en el monorepo `allfitone`. Las rutas de artefactos quedaron propagadas, pero los escenarios de CI, fronteras y despliegue del ADR deben ejecutarse antes de convertir este estado en GO firme.<br>
**Progreso P0:** 8 de 8 bloqueos resueltos; 0 activos<br>
**Progreso P1:** P1-01, P1-02 y los tres hallazgos P1 de Nutrición resueltos; P1-03..07 pendientes según sus hitos<br>
**Alcance:** consistencia y preparación de las Fases 1 a 4 antes de traducir el diseño a migraciones, seeds, RLS, funciones y contratos ejecutables.

## 1. Propósito

Este documento evalúa si los entregables actuales permiten comenzar la Fase 5 —implementación en Supabase/PostgreSQL— sin convertir decisiones contradictorias o incompletas en una baseline física costosa de corregir.

La revisión cubre:

- lenguaje y alcance de Fase 1;
- dominios, ownership y ERD conceptual de Fase 2;
- operaciones, seguridad, contratos y degradación de Fase 3;
- estándar PostgreSQL, ERD lógico y diccionario de Fase 4;
- coherencia transversal entre ADR, glosario, alcance, matrices y modelo físico;
- riesgos de seguridad, privacidad, integridad, recuperación, mantenibilidad y ejecución.

No es una revisión jurídica ni sustituye la validación de un abogado de datos. Cuando se señalan asuntos jurídicos, el hallazgo consiste en que la decisión de producto o su validación siguen abiertas y afectan el modelo técnico.

## 2. Veredicto ejecutivo

La dirección arquitectónica es sólida y ya no tiene bloqueos P0. La auditoría posterior de ADR-027 detectó tres P1 y tres P2. Los P1 quedaron corregidos mediante `goal_versions.created_at`, DTO profesional con `rationale` obligatorio y `OP-NUT-013` como proxy autenticado. Esta revisión cierra además la trazabilidad exacta operación→prueba, publica autoría nutricional mínima y clasifica Nutrición en break-glass. Una comprobación tardía eliminó el último `proposed_at` inexistente, hizo que la respuesta profesional garantice `rationale` no nulo/no vacío y explicitó la excepción `404` del proxy frente al `403` general. La recertificación integral conserva los conteos y habilita el inicio de Fase 5.

La edad mínima dejó de ser un bloqueo activo el 23 de julio de 2026: V1 fue ratificada para personas de 18 años o más.
La contradicción normativa de ADR-005 también quedó resuelta el 23 de julio de 2026: terminar transiciona `active → frozen`, no equivale a revocar.
El actor, predicado y superficie de lectura histórica quedaron resueltos el 23 de julio de 2026 mediante ADR-023.
Fase 2 quedó recertificada el 28 de julio de 2026 con Nutrición como noveno dominio conceptual, además de `staff`, titular/suplente, Soporte y separación de deberes `A10/A12`.
La integridad cross-table quedó recertificada mediante ADR-024/027 y una matriz de 35 invariantes con mecanismo y prueba negativa exactos.
El drift físico de RLS quedó cerrado mediante 27 rutas operación→policy→índice→prueba, contratos separados para grants `active`/`frozen`, siete pruebas físicas `T-PHY-*` y cuatro `T-NUT-PHY-*`.
El inventario y diccionario físico quedaron recertificados en 99 tablas con ficha individual, contratos JSONB, nombres determinísticos y particionamiento verificable.
La idempotencia durable quedó cerrada el 26 de julio de 2026 separando replay HTTP de 24 h y `Command-Id`, con scope calculado, tombstone mínimo, concurrencia transaccional y diez pruebas `T-IDEM-*`.
El contrato HTTP corregido contiene OpenAPI 3.1 con 18 paths, 21 operaciones, DTOs cerrados, ejemplos, caché, URL firmada Space, proxy autenticado Studio, nueve verificaciones `T-API-*` y catorce `T-NUT-API-*`.
La gobernanza de verificación y break-glass quedó recertificada con `nutrition_guidance` estándar, `nutrition_intake` restringida y `nutrition_media` prohibida, además de catálogo mínimo, evidencia permitida, conflictos, deberes de 90 días, quorum por sensibilidad, revisión independiente y respuesta ante abuso.

### Reevaluación consolidada

| Criterio de inicio | Evidencia actual | Resultado |
| --- | --- | --- |
| Aprobación de diseño | Fases 1, 2, 3 y 4 aprobadas | Cumple |
| Bloqueos críticos | 8 de 8 P0 resueltos; 0 activos | Cumple |
| Inventario físico | 99 tablas en ERD, diccionario y catálogo, sin diferencias | Cumple |
| Fichas físicas | 99 de 99 completas | Cumple |
| Seguridad RLS | 186 pruebas funcionales/RLS: 73 positivas y 113 negativas | Cumple |
| Trazabilidad física | 27 rutas `PR-*`; cada `OP-NUT-001..013` aparece una vez con pruebas semánticamente correspondientes | Cumple |
| Primera rebanada | 18 paths/21 operaciones en OpenAPI y gate contract-first | Cumple |
| Autoría pública nutricional | `NutritionGoalAuthor` obligatorio y cerrado publica solo `kind` y `person_id`; coincide con `origin` y permanece estable en live/frozen | Cumple |
| Break-glass nutricional | Guidance estándar, intake restringida, mezcla con intake restringida y media prohibida/no persistible | Cumple |

Los tres P1 y los tres P2 de Nutrición están corregidos y recertificados conjuntamente.

### Declaración GO/NO-GO actualizada

> **GO histórico de la revisión 14:** la baseline documental/OpenAPI revisada el 28 de julio autorizaba iniciar la Fase 5. DT-017 y ADR-029 reabrieron después el gate; el estado vigente es GO condicionado hasta repetir la revisión sobre la baseline actual.

La implementación comenzará por la rebanada vertical acordada y preservará los nombres, columnas, estados, policies y contratos aprobados.

## 3. Fuentes revisadas

La revisión utiliza como fuentes:

1. [`README.md`](../README.md).
2. [`DATABASE_REFACTOR_PHASES.md`](./DATABASE_REFACTOR_PHASES.md).
3. [`ALLFIT_ARCHITECTURE_DECISIONS.md`](../02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md).
4. [`ALLFIT_DOMAIN_GLOSSARY.md`](../03_PROPOSED_DESIGN/ALLFIT_DOMAIN_GLOSSARY.md).
5. [`V1_DATABASE_SCOPE.md`](../03_PROPOSED_DESIGN/V1_DATABASE_SCOPE.md).
6. [`DOMAIN_OWNERSHIP_MAP.md`](../03_PROPOSED_DESIGN/DOMAIN_OWNERSHIP_MAP.md).
7. [`V1_CONCEPTUAL_ERD.md`](../03_PROPOSED_DESIGN/V1_CONCEPTUAL_ERD.md).
8. [`V1_OPERATIONS_MATRIX.md`](../03_PROPOSED_DESIGN/V1_OPERATIONS_MATRIX.md).
9. [`V1_RLS_MATRIX.md`](../03_PROPOSED_DESIGN/V1_RLS_MATRIX.md).
10. [`V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md`](../03_PROPOSED_DESIGN/V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md).
11. [`V1_SPACE_STUDIO_API_CONTRACTS.md`](../03_PROPOSED_DESIGN/V1_SPACE_STUDIO_API_CONTRACTS.md).
12. [`V1_OPENAPI_CONTRACT.md`](../03_PROPOSED_DESIGN/V1_OPENAPI_CONTRACT.md) y [`allfit-v1.openapi.yaml`](../03_PROPOSED_DESIGN/openapi/allfit-v1.openapi.yaml).
13. [`V1_DEGRADATION_AND_RECOVERY_MATRIX.md`](../03_PROPOSED_DESIGN/V1_DEGRADATION_AND_RECOVERY_MATRIX.md).
14. [`V1_IDEMPOTENCY_CONTRACT.md`](../03_PROPOSED_DESIGN/V1_IDEMPOTENCY_CONTRACT.md).
15. [`POSTGRES_MODELING_STANDARD.md`](../03_PROPOSED_DESIGN/POSTGRES_MODELING_STANDARD.md).
16. [`V1_LOGICAL_ERD.md`](../03_PROPOSED_DESIGN/V1_LOGICAL_ERD.md).
17. [`V1_DATA_DICTIONARY.md`](../03_PROPOSED_DESIGN/V1_DATA_DICTIONARY.md).
18. [`V1_PHYSICAL_OBJECT_CATALOG.md`](../03_PROPOSED_DESIGN/V1_PHYSICAL_OBJECT_CATALOG.md).
19. [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](../03_PROPOSED_DESIGN/V1_CROSS_TABLE_INTEGRITY_MATRIX.md).
20. [`CURRENT_ARCHITECTURE_DIAGRAM.md`](../01_CURRENT_STATE/CURRENT_ARCHITECTURE_DIAGRAM.md).
21. [`CURRENT_DATABASE_ANALYSIS.md`](../01_CURRENT_STATE/CURRENT_DATABASE_ANALYSIS.md).

## 4. Escala de severidad

| Severidad | Significado | Regla |
| --- | --- | --- |
| **P0** | Bloquea el inicio seguro de migraciones de dominio | Debe resolverse y propagarse antes de crear la baseline física |
| **P1** | Puede resolverse dentro de Fase 5, pero bloquea su cierre, staging o validación integral | Debe tener owner, decisión y criterio de aceptación antes de comenzar |
| **P2** | Trazabilidad, mantenimiento o evidencia | No bloquea por sí solo, pero incrementa drift y costo de revisión |

## 5. Dimensión actual del diseño

| Elemento | Magnitud |
| --- | ---: |
| Dominios conceptuales principales | 9 |
| Schemas físicos propuestos | 10 |
| ADR consolidados | 27 |
| Escenarios transversales de Fase 2 | 18 |
| Operaciones V1 inventariadas | 150 |
| Tablas físicas declaradas | 99 |
| Fichas físicas individuales | 99 |
| Contratos JSONB registrados | 20 |
| Pruebas RLS documentadas | 186 |
| Rutas físicas de autorización | 27 |
| Pruebas de idempotencia durable | 10 generales + 6 nutricionales |
| Superficies HTTP | 3 |
| Scopes V1 | 7 |
| OpenAPI de primera rebanada | 18 paths / 21 operaciones |

Estas cifras no demuestran por sí solas sobrearquitectura. Sí demuestran que un error normativo se propaga sobre una superficie amplia. Por ello, la consistencia previa al DDL tiene un valor especialmente alto.

## 6. Evaluación por fase

### 6.1 Fase 1 — lenguaje y alcance

#### Fortalezas

- Persona, cuenta Cognito y rol contextual están separados.
- Una invitación pendiente no crea una persona provisional.
- El profesional existe como persona y opera dentro de una organización.
- Relación, consentimiento, scope, access level y capacidad son conceptos diferentes.
- El alcance diferido está protegido contra tablas, columnas, scopes o endpoints especulativos.
- El vocabulario universal de entrenamiento no está deformado hacia fuerza.
- Menores, commerce, booking, marketplace, nutrición clínica/terapéutica, IA y conectores productivos están explícitamente fuera de la baseline redactada; Nutrición manual no clínica sí está incluida.

#### Estado real

**Aprobada y recertificada el 28 de julio de 2026.** El glosario y el alcance V1 incorporan Nutrición no clínica, siete scopes y exclusión expresa de cualquier migración o dato de Factory Fitness.

#### Recomendación

Mantener Fase 1 cerrada. Un cambio futuro que altere actores, consentimiento, ciclo de vida o acceso deberá reabrir únicamente el alcance afectado.

### 6.2 Fase 2 — dominios, ownership y flujo de datos

#### Fortalezas

- Space y Studio son consumidores, no dominios ni fuentes de verdad paralelas.
- Los nueve límites de dominio están cohesionados; Nutrición y Soporte están separados de Privacidad y de los roles organizacionales.
- La persona y su Fitness ID permanecen únicos.
- Los diez escenarios cubren identidad autónoma, invitación, aceptación parcial, relaciones múltiples, privacidad, terminación, disposición y multidisciplina.
- Ownership, procedencia, acceso y retención no se tratan como sinónimos.

#### Estado real

**Aprobada y recertificada el 28 de julio de 2026.** Ownership y ERD conceptual incorporan:

- catálogo cerrado `owner/admin/coach/staff`;
- titular y suplencia aceptada por la persona;
- Soporte como octavo dominio;
- Nutrición como noveno dominio, con ownership personal y autoridad profesional acotada;
- `A10` solicitante/ejecutor y `A12` aprobador/auditor;
- grants `frozen` y `HISTORICAL_ACCESS_CASE`;
- recorridos de reasignación, terminación, soporte, retención y recuperación.

#### Recomendación

Mantener Fase 2 cerrada. Los defectos restantes son físicos y contractuales; cualquier cambio futuro que altere ownership o cardinalidades vuelve a abrir únicamente el recorrido afectado.

### 6.3 Fase 3 — operaciones, seguridad y contratos

#### Fortalezas

- El inventario operativo es extenso y asigna actor, transacción, idempotencia, sensibilidad y evento.
- La autorización se separa en autenticación, aplicación, RLS y proyección de campos.
- El contexto RLS es local a la transacción.
- No hay un rol universal de workers.
- Las lecturas por grant registran al actor humano.
- Las denegaciones de sesiones autónomas se aplican antes de contar o agregar.
- Space y Studio tienen contratos separados y la organización de Studio viaja en la ruta.
- Las operaciones sensibles fallan cerradas.
- La degradación distingue dependencias compartidas, productos, dominios y proveedores.

#### Estado real

**Aprobada y recertificada.** El inventario tiene 150 operaciones y el OpenAPI incorpora `OP-NUT-001..013`. Los P1/P2 contractuales están propagados y las asociaciones exactas operación→prueba quedaron verificadas. Permanecen además como trabajo de ejecución:

- SLO, RTO y RPO;
- hosting y materialización de límites de recursos;
- OpenAPI contract-first para cada endpoint posterior a la primera rebanada;

#### Recomendación

Implementar la primera rebanada con el contrato aprobado y mantener el gate contract-first para los endpoints posteriores.

### 6.4 Fase 4 — modelo lógico y diccionario

#### Fortalezas

- Schemas por dominio.
- UUIDv7 como estrategia común.
- Publicaciones y snapshots inmutables.
- Separación entre borrador, identidad estable y versión publicada.
- Separación planificación/ejecución.
- Targets y resultados tipados por familia.
- Disposición, holds y auditoría como conceptos físicos.
- RLS forzada y roles runtime separados del propietario.
- Outbox e idempotencia como infraestructura explícita.

#### Estado real

**Aprobada y recertificada el 28 de julio de 2026.** El modelo físico quedó cerrado en 99 tablas y 99 fichas. Las ocho tablas `nutrition`, targets y resultados están expandidos; enums compartidos, nombres, JSONB, UUID particionado, creación anticipada e idempotencia durable tienen contrato verificable.

#### Recomendación

Traducir el catálogo físico aprobado sin reinterpretarlo.

## 7. Registro de bloqueos P0

### P0-01 — RESUELTO: ADR-005 contiene una única dirección normativa

#### Resolución

El 23 de julio de 2026 se reescribió ADR-005 como una sola decisión aceptada para V1:

- relación activa → grants `active` y acceso en vivo según autorización;
- terminación efectiva en `T` → grants `active` pasan a `frozen`;
- `frozen` → sin operación ni escritura; solo ventana histórica previamente autorizada y acotada a `<= T`;
- `revoked` → ningún acceso;
- cuenta eliminada sin relaciones activas → anonimización para todos, incluido el gimnasio;
- no existe snapshot, copia ni tabla `archive`.

La dirección anterior —revocar todo acceso al terminar y conservar únicamente evidencia mínima— quedó registrada como alternativa rechazada, no como texto normativo.

#### Límite de esta resolución

`P0-01` decide **qué significa** terminar una relación. El actor, la superficie, el propósito, la auditoría, las denegaciones y la revocación posterior se resuelven separadamente en P0-02 y ADR-023.

#### Criterio de cierre

- [x] Existe una sola matriz de salida de relación.
- [x] No hay una línea normativa que ordene revocar todo y otra que ordene congelar.
- [x] Glosario, alcance, ownership, operaciones, RLS, API, degradación, ERD y diccionario usan la misma semántica.

### P0-02 — RESUELTO: acceso histórico `frozen` por caso restringido

#### Resolución

ADR-023 separa explícitamente la operación diaria de la consulta histórica:

- `auth.can_access` conserva la fórmula en vivo y nunca acepta una relación terminada;
- `auth.can_read_frozen(relationship_id, scope_code, resource, field, occurred_at)` es el único predicado histórico;
- ningún rol obtiene lectura `frozen` automáticamente;
- owner/admin pueden administrar casos con `manage_historical_access`, pero esa capacidad no concede lectura;
- cada lectura requiere un `privacy.historical_access_case` vigente, para una relación, organización, propósito y membresía autorizada exactos;
- la membresía autorizada puede ser owner/admin o el antiguo titular de esa relación, siempre que permanezca activa; `staff`, suplentes vencidos, miembros terminados y coaches ajenos no son elegibles;
- el antiguo titular pierde toda autoridad derivada de asignación en `T` y solo puede leer mediante el caso excepcional;
- V1 no introduce un quinto rol de cumplimiento;
- se exige autenticación MFA/AAL2 y uno de cinco propósitos cerrados: disputa del servicio, obligación legal/regulatoria, solicitud de soporte de la persona, investigación de seguridad o revisión de calidad autorizada;
- la superficie es `/studio/v1/organizations/{orgId}/historical-relationships/{relationshipId}` con `X-Historical-Access-Case`; no reutiliza `/clients`, no lista antiguos clientes, no escribe y no exporta en bloque;
- cada intento permitido o denegado produce `ACCESS_EVENT` en la misma transacción; si falla la auditoría, falla la lectura;
- una denegación vigente en `T` o posterior reduce el histórico; volver a compartir después de `T` nunca amplía la ventana;
- la persona puede cambiar `frozen → revoked`; se cierran casos y se invalidan cachés, derivados y exportaciones;
- sobreviven únicamente campos `historical_readable` materializados `<= T`: entrenamiento bilateral, historial previo efectivamente compartido, medidas estructuradas de progreso corporal y derivados históricos cuyos inputs completos estén autorizados. V1 excluye `health_context`, imágenes, archivos, EXIF, perfil actual, estado vivo y datos de otras relaciones.

El caso expira en un máximo de 24 horas. Puede abrirlo o cerrarlo owner/admin y puede autorizar a quien lo crea; no se exige doble aprobación, de modo que una práctica con un único owner sigue siendo operable sin debilitar la trazabilidad.

#### Consecuencia física

Se incorpora `privacy.historical_access_cases`; aquella recertificación añadió una tabla al inventario y hoy está incluida en el total vigente de 99. `scope_resource_rules` declara `historical_readable`, las denegaciones conservan `frozen_denied_at` y `access_events` registra caso, modo, request y resultado.

#### Criterio de cierre

- [x] Existe el predicado separado y nombrado `auth.can_read_frozen`.
- [x] El predicado se expresa sobre columnas documentadas.
- [x] La matriz RLS contiene pruebas positivas y negativas.
- [x] La pertenencia administrativa no concede acceso general al Fitness ID.
- [x] La superficie no permite escrituras, correcciones, observaciones, asignaciones ni datos posteriores.
- [x] Auditoría, denegaciones, revocación y field-set histórico tienen reglas explícitas.

### P0-03 — RESUELTO: V1 permanece limitada a personas de 18 años o más

#### Resolución

El 23 de julio de 2026 los socios ratificaron que Allfit V1 solo activa Fitness IDs para personas de 18 años o más. La propuesta de bajar el piso a 14 años y tratar adolescentes como usuarios autónomos fue descartada para esta baseline.

La existencia comercial de adolescentes en gimnasios no se ignora: si se prioriza, el soporte para personas de 14 a 17 años entrará como una rebanada vertical futura con representación, autorización y salvaguardas específicas. No se resolverá cambiando únicamente `minimum_age` o `eligibility_evidence`.

#### Consecuencias confirmadas

- no se crean personas, perfiles, relaciones, grants o datos fitness para menores;
- representantes, consentimiento parental y cuentas tuteladas permanecen fuera de V1;
- la elegibilidad se resuelve antes de activar `identity.people`;
- `unknown`, fallo o ausencia de evidencia nunca significan elegibilidad;
- el soporte futuro de adolescentes exige ADR, alcance, ownership, operaciones, RLS y modelo propios;
- membresías, ingreso y asistencia de menores en establecimientos no alteran esta baseline porque esas capacidades también están diferidas.

#### Criterio de cierre

- [x] ADR-017 ratificado como aceptado para V1.
- [x] README, glosario y alcance declaran 18 años o más.
- [x] La propuesta 14+ autónoma quedó descartada para V1.
- [x] El eventual soporte 14–17 quedó diferido como flujo representado independiente.

### P0-04 — RESUELTO: Fase 2 recertificada con los conceptos de Fase 3

#### Resolución

El 26 de julio de 2026 ADR-022 pasó a aceptada y los entregables de Fase 2 se recertificaron:

- `staff` pertenece a Organizaciones y no accede a datos fitness;
- `coach` queda como nombre canónico del rol profesional;
- titular y suplente son clases de asignación de Relaciones, no roles ni grants;
- una suplencia exige fin obligatorio y aceptación explícita de la persona;
- Soporte es el octavo dominio conceptual;
- `A10` diagnostica, solicita y ejerce solo su propia ventana break-glass;
- `A12` aprueba/rechaza y audita solicitudes ajenas, sin ejercerlas;
- `HISTORICAL_ACCESS_CASE` permanece en Privacidad y no se confunde con break-glass;
- terminación, reasignación, soporte, retención y recuperación fueron recorridos nuevamente.

ADR-026 refina la gobernanza: `approve_break_glass` es temporal y verificado; solicitante, uno/dos aprobadores según sensibilidad y revisor posterior son incompatibles por caso. Sin separación suficiente, el flujo falla cerrado.

#### Trazabilidad confirmada

| Tabla física introducida después | Concepto | Dominio | Operaciones |
| --- | --- | --- | --- |
| `relationship_professional_assignments` / eventos | Titular, suplente y decisión personal | Relaciones | `OP-REL-002..006` |
| `break_glass_requests` | Solicitud/ventana excepcional | Soporte | `OP-SUP-001/003/004` |
| `break_glass_approvals` | Quorum independiente de uno/dos A12 | Soporte | `OP-SUP-002` |
| `break_glass_events` | Ejercicio allowed/denied y revisión | Soporte | `OP-SUP-003/006` |
| `historical_access_cases` | Lectura histórica restringida | Privacidad | `OP-PRV-018..020` |
| catálogos de roles/capacidades | `staff` y cuatro roles cerrados | Organizaciones | `OP-ORG-*` |

#### Criterio de cierre

- [x] Ownership map y ERD conceptual declaran nueve dominios tras la recertificación ADR-027.
- [x] Titular, suplente, aceptación y vigencia tienen cardinalidades explícitas.
- [x] Solicitud, aprobación y ejercicio break-glass tienen actores incompatibles por deber.
- [x] Los escenarios afectados fueron recertificados.
- [x] ADR-022 está trazado en alcance, glosario, operaciones, RLS y modelo físico.
- [x] Cada tabla nueva de Fase 4 se traza a concepto, dominio y operación V1.

### P0-05 — RESUELTO: integridad compuesta entre persona, organización y relación

#### Resolución

ADR-024/027 y [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](../03_PROPOSED_DESIGN/V1_CROSS_TABLE_INTEGRITY_MATRIX.md) sustituyen las FKs simples independientes por un registro normativo de **35 invariantes**:

- las claves portadoras `UNIQUE` necesarias habilitan identidades compuestas;
- las filas que transportan persona, organización, relación, asignación, planificación o ejecución usan FKs compuestas;
- las columnas de enrutamiento repetidas solo existen si una FK demuestra su procedencia;
- elegibilidad temporal, targets polimórficos, primarias y familias derivadas usan constraint triggers diferibles;
- los padres mutables tienen guardianes recíprocos para que una terminación no deje hijos efectivos inválidos;
- `access_events` conserva la excepción de FK dura por particionamiento, pero solo admite `privacy.log_access_event(...)` y un trigger `BEFORE INSERT` valida el contexto;
- RLS y la API no forman parte de la garantía estructural.

El inventario original de diez brechas se amplió porque la misma clase de defecto también afectaba consentimiento, solicitudes de grant, denegaciones, casos históricos, autoría de claims, continuidad entre relaciones, disposición, invitaciones, eventos organizacionales, break-glass y revisiones. El registro exhaustivo evita resolver solo los ejemplos conocidos.

#### Prueba estructural

La suite queda definida como `T-INT-01..27` más `T-NUT-INT-01..08`. Usa un rol `allfit_integrity_test` con `BYPASSRLS`, pero sin `SUPERUSER`, propiedad de tablas o capacidad de desactivar triggers. Cada prueba intenta insertar IDs existentes pero incompatibles y exige:

1. `SQLSTATE` y constraint/`IX-*` identificables;
2. rollback de todo el comando;
3. ausencia de outbox o auditoría huérfana;
4. caso positivo equivalente;
5. prueba concurrente cuando el mecanismo es diferible.

#### Criterio de cierre

- [x] Existe un registro exhaustivo de invariantes cruzadas.
- [x] Cada una declara FK, `MATCH`, trigger o entrada cerrada exactos.
- [x] Las excepciones de FK dura están justificadas y protegidas.
- [x] Cada invariante tiene una prueba negativa privilegiada definida.
- [x] Estándar, ERD lógico, diccionario y plan de ejecución consumen la matriz.

### P0-06 — RESUELTO: trazabilidad física de RLS

#### Resolución

[`V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md`](../03_PROPOSED_DESIGN/V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md) compila las 150 operaciones en 27 rutas `PR-*`. Cada ruta declara recurso físico, columnas de enlace, join/predicado, proyección, índices y familias de pruebas. Las expresiones “vía”, “hereda” y “relación visible” ya no constituyen especificaciones por sí solas.

Los siete huecos originales se cerraron así:

1. `scope_code` se denormaliza en `grant_requests`, `consent_events` y `data_grants`, únicamente porque participa en autorización.
2. `(scope_definition_id,scope_code)` referencia la clave portadora de `scope_definitions`, por lo que código y versión no pueden divergir.
3. `consent_events` transporta y prueba la tupla exacta persona/relación/organización/definición/scope; `data_grants` la referencia completa.
4. Un único parcial sobre `(relationship_id,scope_code) WHERE status IN ('active','frozen')` impide dos grants efectivos de versiones distintas.
5. `privacy.grant_consent`, `privacy.revoke_grant` y `relationships.terminate_relationship` son entradas cerradas; el trigger de transición gobierna `frozen_at`, `revoked_at` y prohíbe reactivación.
6. `auth.grant_of` resuelve solo `active`; `auth.frozen_grant_of` resuelve solo `frozen`. `auth.can_access` y `auth.can_read_frozen` no comparten lookup.
7. `privacy.access_events` solo es visible directamente al sujeto y solo admite `privacy.log_access_event`; `A10` y `A12` usan superficies de soporte distintas y restringidas.

La suite incorpora `T-PHY-01..07` más `T-NUT-PHY-01..04`: compilación contra catálogo, unicidad concurrente, máquina de estados, separación live/frozen, coherencia definición/scope, privilegios de auditoría y disponibilidad de índices/planes.

#### Criterio de cierre

- [x] Ninguna policy o índice documentado depende de una columna inexistente.
- [x] Toda función de autorización involucrada tiene firma y semántica compatibles con el diccionario.
- [x] La unicidad de un grant efectivo por relación/scope está impuesta físicamente.
- [x] `active`, `frozen` y `revoked` tienen transiciones, actores y columnas actualizables no ambiguos.
- [x] Operaciones, RLS, API, degradación, ERD, diccionario y plan consumen la misma matriz física.

### P0-07 — RESUELTO: inventario y diccionario físico completos

#### Resolución

[`V1_PHYSICAL_OBJECT_CATALOG.md`](../03_PROPOSED_DESIGN/V1_PHYSICAL_OBJECT_CATALOG.md) y el diccionario recertifican **99 tablas**:

- 16 tablas y fichas de planificación, incluidas cuatro tablas target independientes;
- 14 tablas y fichas de ejecución, incluidos cinco resultados tipados;
- ocho tablas de Nutrición para catálogo, comidas, ítems, valores, línea de objetivos, versiones, targets y decisiones;
- 61 tablas restantes sin agrupaciones físicas ocultas.

El `97` del ERD era un error de conteo, no seis tablas faltantes. `prescription_revisions.override_value` y `correction_proposals.proposed_value` dejaron de ser JSONB: ahora usan field objetivo, valor escalar tipado y unidad. Los 20 JSONB legítimos tienen versión, forma cerrada y validator/check nombrado.

Los objetos mecánicos se nombran mediante reglas determinísticas; los guardianes conservan nombres normativos. `catalog.publication_status` es el único enum compartido por catálogo, privacidad y planificación.

Para las dos tablas particionadas, UUIDv7 determina el instante/mes: el caller no aporta ID ni tiempo y un check impide enrutar la misma identidad a otra partición. `system.ensure_monthly_audit_partitions` mantiene mes actual + tres futuros y replica índices.

Las referencias “lógicas” no abren una nueva excepción: `access_events` sigue protegido por la entrada/trigger `IX-23`, mientras `outbox_events.aggregate_id` es un identificador opaco no navegable escrito por función tipada, como ya resolvió P0-05.

La suite `T-SCHEMA-01..06` verifica inventario, catálogo PostgreSQL, policies, JSONB, identidad particionada y cobertura de particiones.

#### Criterio de cierre

- [x] El conteo es único, reproducible y coincide en ERD/diccionario.
- [x] Las 99 tablas tienen ficha individual con forma física implementable.
- [x] Cada JSONB tiene contrato, versión y validación; valores de negocio conocidos dejaron de ser JSON.
- [x] Enums compartidos y excepciones de FK/partición están justificados.
- [x] Ninguna decisión estructural de P0-07 se reserva a la migración.

### P0-08 — RESUELTO: idempotencia durable independiente del replay HTTP

#### Resolución

[`V1_IDEMPOTENCY_CONTRACT.md`](../03_PROPOSED_DESIGN/V1_IDEMPOTENCY_CONTRACT.md) separa:

- `Idempotency-Key` UUIDv4, scoped por principal/client/superficie/operación, para replay de 24 h;
- `Command-Id` UUIDv7, scoped por principal/superficie/operación, como identidad durable;
- response mínimo que se limpia a 24 h;
- tombstone sin body ni datos sensibles que permanece mientras actor o agregado sean invocables.

`system.idempotency_keys` incorpora los dos uniques, hashes SHA-256, status, outcome, aggregate opcional, expiración de response, disposición y purga gobernada. `system.enforce_idempotency_terminal_ct` impide confirmar `processing`: crash/`5xx` revierte receipt, dominio, auditoría y outbox.

Todos los comandos que mutan dominio llevan ambas identidades; `OP-SUP-003` no se deduplica porque cada lectura break-glass crea su propio evento. Los comandos offline agregan defensa de dominio:

- claims, mediciones, contexto de salud, revisiones y ejecuciones usan el `Command-Id` como PK cuando crean;
- transiciones de ejecución bloquean el agregado y convergen;
- `OP-EXE-005` exige `If-Match` sobre `revision_number`;
- jobs derivan UUIDv5 de operación/target/ciclo.
- `OP-NUT-001` usa `Command-Id` como ID de comida y el `PATCH` de foto diferida es idempotente y condicionado por `If-Match`.

Un efecto dispuesto se marca y un retry devuelve `410`; nunca recrea el dato. Una key no se comparte entre crear, guardar y finalizar.

#### Criterio de cierre verificado documentalmente

- [x] Reintentar después de 24 horas no ejecuta de nuevo el comando.
- [x] Scope de actor, client, superficie y operación calculado por servidor.
- [x] Response versionado, mínimo y separado del tombstone durable.
- [x] Concurrencia, timeout, crash, rechazo final y error retryable definidos.
- [x] `T-IDEM-01..10` cubre expiración, conflicto, disposición y minimización.
- [x] `T-NUT-IDEM-01..06` cubre captura offline, foto diferida, edición concurrente, doble decisión y crash transaccional.

### Recertificación ADR-027 — P1 Y P2 RESUELTOS

La ampliación a Nutrición cambió temporalmente el readiness a `NO-GO`. Sus tres P1 y tres P2 ya se propagaron por ADR, operaciones, RLS, contratos, OpenAPI, diccionario, integridad, gobernanza y plan de ejecución. La recertificación global restaura `GO`.

El cierre exige y confirma:

- noveno dominio conceptual y schema físico `nutrition`;
- ocho tablas nuevas, para un total de 99;
- tres scopes nutricionales independientes, para un total de siete;
- `OP-NUT-001..013`, para un inventario de 150 operaciones;
- `PR-24..27`, `IX-28..35` y las cinco familias de pruebas nutricionales;
- OpenAPI canónico con 18 paths y 21 operaciones;
- ausencia de nutrición como dominio diferido;
- ausencia de migración, ETL, compatibilidad o datos de Factory Fitness.

## 8. Hallazgos P1

### P1-01 — Resuelto: contrato HTTP implementable para la primera rebanada

[`V1_OPENAPI_CONTRACT.md`](../03_PROPOSED_DESIGN/V1_OPENAPI_CONTRACT.md) y [`allfit-v1.openapi.yaml`](../03_PROPOSED_DESIGN/openapi/allfit-v1.openapi.yaml) cierran:

- 21 operaciones HTTP distribuidas en 18 paths: las ocho originales y `OP-NUT-001..013`;
- mapeo unívoco mediante `x-allfit-operation`, sin `operationId` duplicados;
- requests, responses y DTOs campo por campo con objetos cerrados;
- ejemplos completos;
- idempotencia, `If-Match`, `ETag` y errores exactos;
- caché concreta por operación;
- URLs firmadas HTTPS Space con vigencia máxima de 300 segundos y proxy Studio autenticado, sin redirect y revocable en cada petición;
- DTOs separados para meta self y profesional, con `rationale` obligatorio en OP-NUT-012;
- verificaciones `T-API-01..09` y `T-NUT-API-01..14`.

El gate permanece contract-first: cualquier endpoint fuera de esa primera rebanada continúa sin autorización de implementación hasta entrar al OpenAPI con su `x-allfit-operation`. El código no es la fuente inicial del contrato.

### P1-02 — Resuelto: gobernanza cerrada de verificadores y break-glass

ADR-026 y [`V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md`](../03_PROPOSED_DESIGN/V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md) fijan:

- `A11/verify_professional_credentials` como único verificador V1, separado de curaduría;
- únicamente credenciales profesionales y métodos `official_registry_lookup`/`issuer_confirmation`, sin copiar documentos;
- exclusión de edad, identidad civil, salud, dispositivos, afiliación y perfil completo;
- AAL2, deberes con vigencia máxima de 90 días y recertificación;
- conflictos comprobables contra sujeto, autoría, membresía y relación/asignación;
- un A12 para `relationship_training`/`prior_training_history`/`nutrition_guidance` y dos A12 distintos para `body_progress`/`health_context`/`nutrition_intake`; las mezclas con intake heredan el nivel restringido;
- `nutrition_media` como categoría prohibida y no persistible, sin acceso por break-glass a `OP-NUT-013` o storage;
- solicitudes pendientes de 30 minutos; ventanas estándar de 30 y restringidas de 15, sin extensión;
- revisión del 100% de casos ejercidos por otro A12 dentro de las 24 horas corridas siguientes al primer ejercicio;
- auditoría previa a entregar contenido y suspensión/incidente ante escritura, categoría prohibida, ventana ajena o manipulación.

No se añadieron tablas. Se especializan las cuatro fichas físicas existentes y se definen `T-VG-01..06` y `T-BGG-01..12`. Ningún seed concede deberes de plataforma por defecto.

### P1-03 — Retención, disposición y respaldo sin valores aprobados

Faltan:

- plazos por clasificación, finalidad y trigger;
- retención de logs operativos;
- tratamiento de imágenes y storage;
- comportamiento de búsquedas, cachés y réplicas reales;
- validación jurídica de la política en Colombia;
- prueba de reaplicación de disposiciones tras PITR.

Las tablas pueden existir, pero la baseline no puede aprobarse sin policies publicadas y seeds versionados.

### P1-04 — Hosting, límites y objetivos de servicio

Siguen abiertos:

- proveedor y topología de hosting de la API;
- número real de conexiones disponible;
- posibilidad de pools reservados por superficie;
- mecanismo de colas y DLQ;
- herramienta de métricas/tracing/alertas;
- aprobación de SLO, RTO y RPO;
- ventana de mantenimiento.

Los porcentajes 40/40/20 y los rate limits actuales son propuestas. Deben probarse contra la capacidad real del proveedor.

### P1-05 — Complejidad de la baseline y estrategia de entrega

Una baseline de 99 tablas, 150 operaciones y 186 pruebas RLS es ejecutable, pero tiene un riesgo alto de implementación horizontal: crear todas las tablas antes de demostrar el flujo.

#### Recomendación

Implementar por rebanadas verticales dentro de la misma Fase 5:

1. identidad y onboarding;
2. organización, membresía y relación;
3. scope, consentimiento y grant;
4. catálogo mínimo y programa versionado;
5. asignación y sesión planificada;
6. ejecución de una familia;
7. lectura autorizada desde Studio;
8. revocación y terminación;
9. comida offline y sincronización;
10. lectura nutricional autorizada, propuesta y decisión;
11. terminación y guía nutricional histórica minimizada;
12. expansión multidisciplina;
13. disposición, soporte y recuperación.

Cada rebanada debe incluir migración, seed, RLS, API interna y pruebas. No se debe posponer toda la seguridad hasta tener las 99 tablas.

### P1-06 — Eventos, outbox e invalidación

Debe cerrarse:

- catálogo canónico de nombres y versiones de eventos;
- garantía de orden por agregado;
- deduplicación de consumidores;
- qué significa “notificación en la transacción”: encolar, no entregar externamente;
- invalidación transaccional de caches/read models;
- política de retención del outbox;
- mecanismo para evitar payload sensible más allá de una convención textual.

### P1-07 — Contrato de anonimización en sitio

“Anonimizar en su lugar” debe traducirse a una matriz física:

- columnas directas que se eliminan;
- llaves indirectas que se rompen;
- relaciones que se conservan;
- identificadores de organización que sobreviven;
- granularidad de fechas y ubicación;
- protección contra reidentificación por combinaciones raras;
- tratamiento de texto libre, observaciones, imágenes y JSONB;
- efecto sobre agregados;
- efecto sobre grants `frozen`;
- tombstone técnico permitido.

Cambiar `person_id` por otro UUID, cifrar o aplicar `deleted_at` no satisface por sí solo la decisión.

## 9. Hallazgos P2

### P2-01 — RESUELTO: estados de fases aprobados

- Fase 1 figura como `aprobada`.
- Fase 2 figura como `aprobada y recertificada`.
- Fases 3 y 4 figuran como `aprobadas`.
- Para este gate basta el estado explícito de la fase; no se exige registrar aprobador, fecha ni commit.

Debe existir un estado único por fase:

```text
draft
in_review
approved
reopened
superseded
```

La aprobación queda registrada por el estado documental de la fase.

### P2-02 — Evidencia de estado actual no reproducible

Los documentos de `01_CURRENT_STATE` referencian:

- commit `d9f1fda7`;
- `apps/`;
- `packages/`;
- `supabase/`;
- workflows y migraciones.

El commit y esos paths no están presentes en la revisión actual del repositorio. Por tanto, el análisis histórico es legible, pero no auditable desde esta rama.

#### Recomendación

Registrar:

- repositorio de origen;
- URL o remote;
- commit completo;
- snapshot o tag accesible;
- fecha de extracción;
- hash de las migraciones analizadas.

### P2-03 — Enlaces a entregables futuros

Existen referencias futuras a `allfitone/packages/db`, pruebas, tipos y `05_VALIDATION` que todavía no existen. Algunos son placeholders legítimos del plan, pero deben distinguirse de enlaces rotos mediante una marca explícita como “entregable futuro”.

### P2-04 — Tamaño y duplicación documental

Varias reglas aparecen repetidas en README, ADR, glosario, ownership, operaciones, RLS, plan y diccionario. La repetición ayuda a leer cada documento de forma aislada, pero aumenta el riesgo de drift.

#### Recomendación

Definir autoridad por regla:

| Regla | Fuente normativa | Documentos derivados |
| --- | --- | --- |
| Decisión de negocio/arquitectura | ADR | Todos |
| Definición de concepto | Glosario | Scope, ownership, ERD |
| Frontera V1 | Scope | Operaciones, ERD, API |
| Ownership y ciclo de vida | Ownership map | Operaciones, ERD |
| Operación | Operations matrix | API, RLS, eventos |
| Autorización | RLS matrix | DDL y pruebas |
| Forma física | Estándar + diccionario | Migraciones |

Una regla derivada debe enlazar a la fuente, no volver a presentarse como decisión independiente.

## 10. Contradicciones y decisiones de revisión

| Tema | Dirección A | Dirección B | Estado o resolución |
| --- | --- | --- | --- |
| Terminación de relación | Revocación total | Congelación del histórico hasta `T` | **Resuelto — `active → frozen`; operación/escritura cesan y no hay datos posteriores** |
| Actor después de terminación | No queda asignación efectiva | El gimnasio conserva lectura restringida | **Resuelto — caso exacto, actor elegible, MFA, propósito, `auth.can_read_frozen` y auditoría según ADR-023** |
| Edad mínima | 18+ | Propuesta 14+ autónoma | **Resuelto — 18+ para V1; 14–17 representado queda diferido** |
| Estado de Fase 2 | Aprobada inicialmente | Entregables incorporaron conceptos posteriores | **Resuelto — ownership y ERD recertificados el 28 de julio de 2026** |
| Cantidad de tablas | 91 antes de Nutrición | Ocho tablas exigidas por ADR-027 | **Resuelto — 99 tablas y 99 fichas** |
| Grant efectivo | Una versión congelada | Unique permitía versiones efectivas paralelas | **Resuelto — único parcial `(relationship_id,scope_code)` para `active/frozen`** |
| Índice de grant | RLS usa `scope_code` | La columna estaba ausente | **Resuelto — denormalización protegida por FK `(scope_definition_id,scope_code)`** |
| Consent event | RLS usa org/scope | La ficha no los contenía | **Resuelto — evento porta la tupla exacta y el grant la referencia por FK compuesta** |
| Integridad tenant/persona | Constraints en PostgreSQL | Varias reglas dependían solo de API/RLS | **Resuelto — ADR-024/027, `IX-01..35`, FKs compuestas y triggers guardianes** |
| Idempotencia offline | Borrador durable | Registro de replay duraba 24 h | **Resuelto — `Command-Id`, tombstone durable, scope y `T-IDEM-01..10`** |
| Diccionario completo | 99 fichas exactas | Había tablas agrupadas, Nutrición ausente y JSON pendiente | **Resuelto — fichas individuales + catálogo físico/JSONB** |
| Toda referencia tiene FK | Estándar lo exige | Auditoría/outbox usan referencias lógicas | **Resuelto para P0-05 — `access_events` protegido por `IX-23`; `outbox.aggregate_id` es sobre opaco no autoritativo escrito solo por función tipada** |
| OpenAPI como fuente | Contrato primero | Esquema exacto diferido al código | **Resuelto para la primera rebanada — OpenAPI 3.1 canónico previo al código y gate obligatorio para endpoints posteriores** |

## 11. Decisiones y propietarios recomendados

### Decisiones cerradas

| ID | Decisión | Resolución | Fecha |
| --- | --- | --- | --- |
| `D-001` | Edad mínima V1 | **18 años o más**. Personas de 14 a 17 años quedan diferidas a un flujo futuro representado | 23 de julio de 2026 |
| `D-002` | Política normativa de terminación | **`active → frozen` en `T`**; sin operación/escritura, sin datos posteriores y sin tabla `archive` | 23 de julio de 2026 |
| `D-003` | Actor/predicado para histórico `frozen` | **Caso restringido de máximo 24 h, actor exacto elegible con MFA, finalidad cerrada, `auth.can_read_frozen`, field-set histórico y auditoría obligatoria** | 23 de julio de 2026 |
| `D-007` | Aprobadores de break-glass | **A10 solicita/ejerce; uno o dos A12 distintos aprueban según sensibilidad; otro A12 revisa; expiración y abuso cerrados por ADR-026** | 26 de julio de 2026 |
| `D-011` | Mecanismo por invariante cruzada | **35 invariantes: FK compuesta por defecto; constraint trigger diferible para estado/target/familia; entrada cerrada para auditoría particionada** | 28 de julio de 2026 |
| `D-013` | Contrato físico de RLS | **27 rutas `PR-*`, grants live/frozen separados, proyecciones cerradas, índices obligatorios, `T-PHY-01..07` y `T-NUT-PHY-01..04`** | 28 de julio de 2026 |
| `D-014` | Inventario y contratos físicos | **99 fichas; tipos compartidos; nombres determinísticos; 20 JSONB versionados; UUIDv7/particiones y `T-SCHEMA-01..06`** | 28 de julio de 2026 |
| `D-010` | Alcance de idempotencia durable | **ADR-025: replay HTTP 24 h + `Command-Id` durable; scope de servidor, terminalidad transaccional, disposición y `T-IDEM-01..10`** | 26 de julio de 2026 |
| `D-012` | Esquema exacto de DTOs/OpenAPI | **OpenAPI 3.1 canónico para 18 paths/21 operaciones; DTOs self/profesional separados, autoría mínima, caché, URL firmada Space, proxy Studio y `T-API-01..09` + `T-NUT-API-01..14`** | 28 de julio de 2026 |
| `D-015` | Nutrición en V1 | **ADR-027: registro manual y guía profesional no clínica; ocho tablas, tres scopes, autoridad verificada, frozen minimizado y cero legado Factory Fitness** | 28 de julio de 2026 |
| `D-006` | Verificadores autorizados | **Solo credenciales profesionales; A11 con deber separado/AAL2, registro oficial o emisor, conflicto cerrado, vigencia y `T-VG-01..06`** | 26 de julio de 2026 |

### Decisiones todavía abiertas

| ID | Decisión | Propietario recomendado | Momento límite |
| --- | --- | --- | --- |
| `D-004` | Rol de Allfit por superficie | Legal + producto | Antes de cerrar modelo de privacidad |
| `D-005` | Plazos de retención por categoría | Legal + privacidad | Antes de seeds/staging |
| `D-008` | Hosting y capacidad real | Plataforma | Al inicio de Fase 5 |
| `D-009` | SLO/RTO/RPO | Negocio + plataforma | Antes de staging |

## 12. Plan de corrección recomendado

### Paso 1 — P2 cerrados y baseline recertificada

Las asociaciones operación→prueba, la autoría mínima del DTO y la clasificación break-glass de Nutrición están corregidas. Los conteos, OpenAPI, ejemplos y revisión transversal fueron repetidos sin drift y el gate emite `GO`.

### Paso 2 — Cerrar decisiones de producto y privacidad

Resolver:

1. ~~edad mínima~~ — resuelta: 18 años o más;
2. ~~terminación y `frozen`~~ — resuelta: `active → frozen` en `T`;
3. ~~actor, predicado y revocación de lectura histórica~~ — resueltos por ADR-023;
4. rol legal de Allfit;
5. plazos de retención;
6. ~~verificadores autorizados y break-glass~~ — resueltos por ADR-026.

### Paso 3 — Propagar desde la fuente normativa

Orden obligatorio:

1. ADR;
2. glosario;
3. alcance;
4. ownership map;
5. ERD conceptual;
6. operaciones;
7. RLS;
8. API/degradación;
9. estándar/ERD lógico/diccionario;
10. README y estado de fases.

### Paso 4 — Auditoría de integridad física definida

Completada documentalmente por ADR-024 y `V1_CROSS_TABLE_INTEGRITY_MATRIX.md`: cada cruce tiene invariante, padre canónico, mecanismo PostgreSQL, justificación de columnas repetidas y prueba `T-INT-*`. Fase 5 deberá materializar y ejecutar esa especificación, no rediseñarla.

### Paso 5 — Auditoría RLS definida

Definida documentalmente por `V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md`: las 150 operaciones convergen en 27 rutas con actor, tabla/vista, columnas, joins, predicado, field-set, índice y pruebas. Las asociaciones P2 ya están corregidas; Fase 5 materializará `T-PHY-01..07`, `T-NUT-PHY-01..04` y las 186 pruebas RLS.

### Paso 6 — Diccionario físico completado

P0-07 completó una ficha por tabla, columnas tipadas, contratos JSONB, nombres e identidad particionada. P1-01 ya produjo DTO/OpenAPI para la primera rebanada; los endpoints posteriores deben cumplir el mismo gate sin cambiar la forma física cerrada.

### Paso 7 — Idempotencia durable completada

P0-08 separó key HTTP y command ID, cerró scope, concurrencia, retención y disposición, y definió `T-IDEM-01..10`. Fase 5 debe materializarlo antes de exponer el primer comando.

### Paso 8 — Contrato ejecutable de la rebanada completado

P1-01/ADR-027 fijaron 21 operaciones HTTP, DTOs, ejemplos, autoría mínima, caché, concurrencia, URL firmada Space y proxy autenticado Studio en OpenAPI 3.1. Antes del primer handler, CI debe materializar `T-API-01..09`, `T-NUT-API-01..14` y la generación de tipos sin drift.

### Paso 9 — Implementar una rebanada vertical

La primera demostración debe cubrir:

1. Cognito subject → onboarding;
2. evidencia elegible → persona/Fitness ID;
3. organización y membresía;
4. relación;
5. scope publicado;
6. consentimiento y grant;
7. programa/plantilla versionados;
8. asignación y calendario;
9. ejecución;
10. lectura autorizada desde Studio;
11. revocación;
12. terminación y comportamiento histórico decidido.
13. comida offline → sincronización → grant → lectura Studio;
14. propuesta profesional → aceptación personal;
15. terminación → vista histórica nutricional minimizada → revocación.

Solo después se amplían las restantes operaciones.

## 13. Pruebas adicionales requeridas por esta revisión

### 13.1 Integridad

- Una membresía de organización B no puede asignarse a una relación de organización A ni con rol privilegiado.
- Un grant no puede declarar persona u organización distintas a su relación.
- Una asignación no puede apuntar a una persona distinta a la relación de origen.
- Un intento no puede enlazar una ejecución de otra persona.
- Un resultado no puede referenciar un segmento de otra ejecución.
- Una observación o corrección no puede cruzar persona, ejecución, relación o profesional.
- Dos versiones del mismo scope no pueden permanecer efectivas simultáneamente para la misma relación.

### 13.2 `Frozen`

- Solo la membresía exacta autorizada en un caso vigente, elegible y con MFA puede leer filas `<= frozen_at`.
- Owner/admin sin caso o no autorizados en él no pueden leer por su rol.
- El antiguo titular sin membresía activa o sin caso no puede leer.
- Un propósito fuera del catálogo cerrado se deniega.
- Ningún dato posterior aparece en detalle, conteos, cursores o derivados.
- No se permite ninguna escritura.
- Un actor no permitido no puede inferir existencia.
- Una denegación vigente en `T` o posterior reduce el histórico; restaurarla después de `T` no lo amplía.
- Revocar después de congelar corta el acceso.
- Cada lectura permitida o denegada produce `ACCESS_EVENT`; un fallo de auditoría impide devolver datos.
- Un caso cerrado o expirado no recupera autoridad tras restauración.
- El cierre de cuenta aplica la anonimización definida también al histórico congelado.
- Una relación nueva no hereda el grant congelado.

### 13.3 Idempotencia

- Retry concurrente produce un solo efecto.
- Retry con igual clave y distinto cuerpo produce conflicto.
- Retry después de 24 horas no duplica una ejecución offline.
- Una clave de una persona no puede reproducir la respuesta de otra.
- Una clave de Space no puede reutilizarse contra Studio.
- Un timeout después del commit devuelve el resultado previo al reintentar.
- Una respuesta persistida no expone contenido sensible fuera de su actor.
- Un `processing` no puede sobrevivir al commit o crash.
- Un draft con ETag obsoleto no pisa una revisión confirmada.
- Reintentar un efecto dispuesto devuelve `410` y no lo recrea.

### 13.4 Recuperación

- Restaurar un snapshot antiguo no revive datos dispuestos.
- Terminaciones, revocaciones y congelaciones posteriores al snapshot se reaplican.
- No se abre tráfico antes de completar la reconciliación.
- Outbox se redespacha sin duplicar efectos.
- Un borrador local conserva su contrato congelado.

### 13.5 Contratos

- Cada `OP-*` tiene endpoint, función interna o job.
- Cada comando tiene esquema de request/response y errores.
- Ningún DTO contiene columnas crudas no autorizadas.
- Campos redactados no se distinguen de campos no capturados.
- Ningún endpoint expone `all_data`.

## 14. Criterio GO para comenzar migraciones de dominio

Para la baseline revisada el 28 de julio, la Fase 5 quedó en **GO** y satisfizo los criterios siguientes. El gate vigente permanece condicionado por las notas posteriores de DT-017 y ADR-029:

- [x] ADR-005 contiene una sola dirección vigente.
- [x] La edad mínima está ratificada en 18 años o más.
- [x] El actor y predicado de `frozen` están definidos.
- [x] Fase 2 fue recertificada con los conceptos introducidos después.
- [x] Todos los P0 tienen decisión y cambios propagados.
- [x] El conteo físico es único.
- [x] Cada tabla tiene ficha exacta.
- [x] Ninguna policy documentada referencia columnas inexistentes; `T-PHY-01` lo verificará contra catálogo.
- [x] Todas las invariantes cruzadas tienen mecanismo PostgreSQL definido.
- [x] La unicidad de grants por relación/scope está resuelta.
- [x] Idempotencia durable cubre el modo offline real.
- [x] El flujo vertical tiene contratos implementables.
- [x] Los estados documentales reflejan la aprobación de las Fases 1 a 4.
- [x] ADR-027 está propagado y Nutrición ya no aparece como dominio diferido.
- [x] `OP-NUT-001..013` aparecen una sola vez y sus asociaciones exactas a pruebas corresponden semánticamente.
- [x] El DTO público de guía nutricional expone la autoría mínima acordada.
- [x] Break-glass clasifica explícitamente `nutrition_guidance` como estándar, `nutrition_intake` como restringida y `nutrition_media` como prohibida/no persistible.
- [x] Las propuestas se ordenan por columnas físicas `(created_at DESC,id DESC)`.
- [x] Una respuesta profesional no admite `rationale` ausente, nulo, vacío ni mayor de 2000 caracteres.
- [x] `OP-NUT-013` conserva `404` indistinguible tras revocación; el `403 scope-required` general no se aplica al proxy de foto.
- [x] ERD, diccionario y catálogo coinciden en 99 tablas; OpenAPI coincide en 18 paths/21 operaciones.
- [x] No existe artefacto de migración, compatibilidad o datos de Factory Fitness.

## 15. Criterio de cierre de Fase 5

Comenzar Fase 5 no equivale a aprobarla. Su cierre requiere además:

- [ ] `supabase db reset` reconstruye todo sin pasos manuales.
- [ ] Una sola historia de migraciones y un solo pipeline.
- [ ] Seeds reproducibles con múltiples personas y organizaciones.
- [ ] Policies RLS positivas y negativas implementadas.
- [ ] Las siete pruebas físicas `T-PHY-*` y cuatro `T-NUT-PHY-*` pasan contra catálogo, privilegios, concurrencia, índices y planes.
- [ ] Las seis pruebas `T-SCHEMA-*` pasan contra inventario, objetos, JSONB y particiones.
- [ ] Las diez pruebas `T-IDEM-*` y seis `T-NUT-IDEM-*` pasan contra concurrencia, offline, foto diferida, doble decisión, expiración, crash y disposición.
- [ ] Las nueve pruebas `T-API-*` y catorce `T-NUT-API-*` pasan contra contrato, ejemplos, headers, caché, redacción, agregados, autoría, URL firmada Space, proxy Studio y generación de DTOs.
- [ ] Las 27 `T-INT-*` y ocho `T-NUT-INT-*` pasan incluso con `BYPASSRLS`.
- [ ] Las 186 pruebas RLS, incluidas 24 `T-NUT-RLS-*`, pasan sin filtraciones por filas, totales, paginación, agregados o medios.
- [ ] Las seis `T-VG-*` y doce `T-BGG-*` pasan contra evidencia, conflictos, deberes, quorum, expiración, revisión y abuso.
- [ ] FKs e índices auditados desde `pg_catalog`.
- [ ] `SECURITY DEFINER` con `search_path` seguro y grants mínimos.
- [ ] Ningún runtime usa owner, superuser o `BYPASSRLS`.
- [ ] OpenAPI generado coincide con el código.
- [ ] Reintentos, concurrencia y outbox son idempotentes.
- [ ] El flujo vertical funciona desde Space y Studio.
- [ ] El flujo nutricional completo pasa: comida offline → sincronización → grant → lectura Studio → propuesta → aceptación → terminación → vista histórica minimizada.
- [ ] Revocación, terminación, congelación y disposición pasan pruebas adversariales.
- [ ] Métricas distinguen Space, Studio, dominio y dependencia.
- [ ] Los límites se probaron sobre la topología real.
- [ ] No existe DDL de capacidades diferidas.
- [ ] ERD, diccionario, SQL, RLS y contratos no presentan drift.

## 16. Acciones requeridas por documento

| Documento | Acción |
| --- | --- |
| `README.md` | ADR-027 y dimensiones 9/10/99/7/150/18/21 reflejadas; readiness en GO tras cerrar P2 |
| `ALLFIT_ARCHITECTURE_DECISIONS.md` | ADR-027 incorpora Nutrición; ADR-026 conserva gobernanza de verificación/break-glass; todavía formalizar rol legal |
| `ALLFIT_DOMAIN_GLOSSARY.md` | Comida, objetivo nutricional, guía y foto definidos; terminación, caso histórico y edad alineados |
| `V1_DATABASE_SCOPE.md` | Nutrición no clínica incluida y legado Factory Fitness excluido |
| `DOMAIN_OWNERSHIP_MAP.md` | Nueve dominios y escenarios nutricionales recertificados |
| `V1_CONCEPTUAL_ERD.md` | Ocho entidades nutricionales y sus interacciones recertificadas |
| `V1_OPERATIONS_MATRIX.md` | 150 operaciones, incluidas `OP-NUT-001..013`, alineadas con autoridad y ciclo de vida |
| `V1_RLS_MATRIX.md` | 186 casos, incluidos 24 `T-NUT-RLS-*`, scopes/media/frozen alineados |
| `V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md` | `PR-24..27`, asociaciones exactas `OP-NUT`→prueba y `T-NUT-PHY-01..04` incorporados |
| `V1_SPACE_STUDIO_API_CONTRACTS.md` | Primera rebanada alineada con OpenAPI, 21 operaciones, `If-Match`, ejemplos y gate contract-first |
| `V1_OPENAPI_CONTRACT.md` + `openapi/allfit-v1.openapi.yaml` | Fuente canónica de 18 paths/21 operaciones, DTOs, autoría mínima, ejemplos, caché, URL firmada Space, proxy Studio y pruebas API |
| `V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md` | Fuente normativa de catálogo, categorías nutricionales, evidencia, conflictos, deberes, quorum, expiración, revisión y abuso |
| `V1_DEGRADATION_AND_RECOVERY_MATRIX.md` | Alertas/suspensión/revisión break-glass alineadas; todavía aprobar objetivos y aclarar encolar versus entregar notificaciones |
| `V1_IDEMPOTENCY_CONTRACT.md` | Scope, receipt, retención, concurrencia, disposición y `T-NUT-IDEM-01..06` incorporados |
| `POSTGRES_MODELING_STANDARD.md` | Diez schemas, FKs, claves portadoras, triggers diferibles, greenfield e identidad durable definidos |
| `V1_LOGICAL_ERD.md` | Conteo 99, schema `nutrition`, tipos e idempotencia recertificados |
| `V1_DATA_DICTIONARY.md` | 99 fichas, incluidas ocho nutricionales |
| `V1_PHYSICAL_OBJECT_CATALOG.md` | Nueva fuente normativa de inventario, objetos, JSONB, particiones y `T-SCHEMA-*` |
| `V1_CROSS_TABLE_INTEGRITY_MATRIX.md` | `IX-01..35`, incluidos ocho invariantes nutricionales, recertificados |
| `DATABASE_REFACTOR_PHASES.md` | Orden DDL, fixtures, flujo nutricional y suites `T-NUT-*` incorporados |
| `01_CURRENT_STATE/*` | Evidencia histórica únicamente; no es fuente de migración ni de datos |

## 17. Resultado esperado de la revisión conjunta

La revisión conjunta del 28 de julio conservó la aprobación explícita de las Fases 1 a 4 y emitió `GO` tras cerrar los P2. Ese resultado es evidencia histórica; el estado vigente permanece condicionado hasta recertificar DT-017 y ADR-029. Los elementos técnicos que produjo son:

1. una respuesta explícita para cada `D-*`;
2. una auditoría P0 sin pendientes;
3. la declaración formal `GO` y la evidencia de cierre de los tres P2;
4. el alcance exacto de la primera rebanada vertical.

La baseline no necesita ser pequeña, pero sí debe ser internamente demostrable. El objetivo de este gate es evitar que 99 tablas conviertan una contradicción documental en deuda estructural desde la primera migración.
