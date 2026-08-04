# Allfit Database Refactor

**Versión de revisión:** 4<br>
**Fecha:** 3 de agosto de 2026<br>
**Productos:** Allfit One — OS, Space y Backoffice

## Objetivo

Esta carpeta reúne el análisis, las decisiones, el alcance y el plan para reconstruir la base de datos sobre una base sólida y compartida por el ecosistema Allfit One.

El objetivo no es migrar mecánicamente el esquema actual. No existen clientes ni datos productivos que obliguen a conservarlo. El esquema actual se utiliza como evidencia para identificar requisitos, patrones útiles y deuda que no debe trasladarse al nuevo diseño. Allfit V1 es greenfield: no migra, importa ni conserva datos, IDs o compatibilidad de Factory Fitness.

## Orden recomendado de lectura

1. [Diagrama de arquitectura actual](./01_CURRENT_STATE/CURRENT_ARCHITECTURE_DIAGRAM.md).
2. [Análisis de la base de datos actual](./01_CURRENT_STATE/CURRENT_DATABASE_ANALYSIS.md).
3. [Decisiones de arquitectura](./02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md).
4. [Glosario de dominio](./03_PROPOSED_DESIGN/ALLFIT_DOMAIN_GLOSSARY.md).
5. [Alcance de base de datos V1](./03_PROPOSED_DESIGN/V1_DATABASE_SCOPE.md).
6. [Mapa de dominios y ownership](./03_PROPOSED_DESIGN/DOMAIN_OWNERSHIP_MAP.md).
7. [ERD conceptual V1](./03_PROPOSED_DESIGN/V1_CONCEPTUAL_ERD.md).
8. [Matriz de operaciones V1](./03_PROPOSED_DESIGN/V1_OPERATIONS_MATRIX.md).
9. [Matriz de seguridad y RLS V1](./03_PROPOSED_DESIGN/V1_RLS_MATRIX.md).
10. [Matriz de trazabilidad física de RLS V1](./03_PROPOSED_DESIGN/V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md).
11. [Contratos de API de Space, OS y Backoffice](./03_PROPOSED_DESIGN/V1_SPACE_OS_API_CONTRACTS.md).
12. [Contrato OpenAPI de la primera rebanada vertical V1](./03_PROPOSED_DESIGN/V1_OPENAPI_CONTRACT.md).
13. [Gobernanza de verificadores y break-glass V1](./03_PROPOSED_DESIGN/V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md).
14. [Matriz de degradación y recuperación V1](./03_PROPOSED_DESIGN/V1_DEGRADATION_AND_RECOVERY_MATRIX.md).
15. [Contrato de idempotencia durable V1](./03_PROPOSED_DESIGN/V1_IDEMPOTENCY_CONTRACT.md).
16. [Estándar de modelado en PostgreSQL](./03_PROPOSED_DESIGN/POSTGRES_MODELING_STANDARD.md).
17. [ERD lógico V1](./03_PROPOSED_DESIGN/V1_LOGICAL_ERD.md).
18. [Diccionario de datos V1](./03_PROPOSED_DESIGN/V1_DATA_DICTIONARY.md).
19. [Catálogo de objetos físicos y contratos JSONB V1](./03_PROPOSED_DESIGN/V1_PHYSICAL_OBJECT_CATALOG.md).
20. [Matriz de integridad cruzada V1](./03_PROPOSED_DESIGN/V1_CROSS_TABLE_INTEGRITY_MATRIX.md).
21. [Matriz de trazabilidad HU → BD](./03_PROPOSED_DESIGN/V1_HU_DATABASE_TRACEABILITY_MATRIX.md).
22. [Plan de ejecución por fases](./04_EXECUTION/DATABASE_REFACTOR_PHASES.md).
23. [Revisión histórica de preparación para la Fase 5](./04_EXECUTION/PHASE_5_READINESS_REVIEW.md).
24. [Modificaciones de BD requeridas por rebanada en Fase 5](./04_EXECUTION/PRE_PHASE_5_DATABASE_MODIFICATIONS.md).

## Cómo ejecutar el refactor

El refactor debe ejecutarse siguiendo [DATABASE_REFACTOR_PHASES.md](./04_EXECUTION/DATABASE_REFACTOR_PHASES.md). Este documento es la guía operativa y la fuente de verdad para ordenar el trabajo.

Las fases deben seguirse en el orden definido. Cada una incluye:

- objetivo;
- decisiones que deben cerrarse;
- trabajo que puede acelerarse con IA;
- entregables;
- criterio de salida.

Desde Fase 5 el avance se controla por rebanada vertical de HU. Una rebanada no pasa a SQL si sus decisiones, ownership, operaciones, seguridad o modelo están abiertos; un P0 de otra HU no la bloquea. Si durante la implementación cambia una decisión consumida por la rebanada, primero se actualizan sus fuentes normativas y después se continúa con su migración.

La IA puede producir borradores, ERD, SQL, migraciones y pruebas, pero no debe asumir por su cuenta reglas de ownership, privacidad, consentimiento o ciclo de vida que los socios todavía no hayan aprobado.

## Estructura

```text
refactor/
├── README.md
├── 01_CURRENT_STATE/
│   ├── CURRENT_ARCHITECTURE_DIAGRAM.md
│   └── CURRENT_DATABASE_ANALYSIS.md
├── 02_ARCHITECTURE_DECISIONS/
│   └── ALLFIT_ARCHITECTURE_DECISIONS.md
├── 03_PROPOSED_DESIGN/
│   ├── ALLFIT_DOMAIN_GLOSSARY.md
│   ├── V1_DATABASE_SCOPE.md
│   ├── DOMAIN_OWNERSHIP_MAP.md
│   ├── V1_CONCEPTUAL_ERD.md
│   ├── V1_OPERATIONS_MATRIX.md
│   ├── V1_RLS_MATRIX.md
│   ├── V1_RLS_PHYSICAL_TRACEABILITY_MATRIX.md
│   ├── V1_SPACE_OS_API_CONTRACTS.md
│   ├── V1_OPENAPI_CONTRACT.md
│   ├── V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md
│   ├── openapi/
│   │   └── allfit-v1.openapi.yaml
│   ├── V1_DEGRADATION_AND_RECOVERY_MATRIX.md
│   ├── V1_IDEMPOTENCY_CONTRACT.md
│   ├── POSTGRES_MODELING_STANDARD.md
│   ├── V1_LOGICAL_ERD.md
│   ├── V1_DATA_DICTIONARY.md
│   ├── V1_PHYSICAL_OBJECT_CATALOG.md
│   ├── V1_CROSS_TABLE_INTEGRITY_MATRIX.md
│   └── V1_HU_DATABASE_TRACEABILITY_MATRIX.md
└── 04_EXECUTION/
    ├── DATABASE_REFACTOR_PHASES.md
    ├── PHASE_5_READINESS_REVIEW.md
    └── PRE_PHASE_5_DATABASE_MODIFICATIONS.md
```

## Estado de los documentos

| Documento | Propósito | Estado |
| --- | --- | --- |
| Current Architecture Diagram | Explicar la arquitectura técnica actual | Referencia |
| Current Database Analysis | Documentar esquema, relaciones, seguridad y deuda actuales | Referencia |
| Allfit Architecture Decisions | Registrar decisiones propuestas e invariantes | ADR-028 aprobada; resto de P0 en cierre |
| Allfit Domain Glossary | Establecer el lenguaje común del negocio | Recertificado para acceso Backoffice opción B |
| Alcance BD V1 | Fijar la frontera funcional y de datos de la baseline | Recertificado para acceso Backoffice opción B |
| Database Refactor Phases | Ordenar el trabajo y sus gates de calidad | Borrador ejecutable |
| Mapa de dominios y ownership | Asignar conceptos, fuentes de verdad, acceso y ciclo de vida por dominio | Aprobado y recertificado — Fase 2 |
| ERD conceptual V1 | Representar entidades, cardinalidades y recorridos compartidos sin duplicación por producto | Aprobado como gate de Fase 2 |
| Matriz de operaciones V1 | Enumerar toda lectura y escritura con actor, filtros, transacción, idempotencia y evento | 184 operaciones; Backoffice opción B propagada, resto de P0 pendiente |
| Matriz de seguridad y RLS V1 | Fijar condición de fila, grants, proyecciones, índices y pruebas por recurso | Backoffice opción B propagada, resto de P0 pendiente |
| Matriz de trazabilidad física de RLS V1 | Compilar cada ruta de autorización a columnas, joins, funciones, índices y pruebas exactos | 28 rutas físicas; resto de P0 pendiente |
| Contratos de API de Space, OS y Backoffice | Definir superficies, endpoints, field-sets por scope, funciones internas y eventos | Superficie Backoffice fijada; detalle de capacidades `NEW-*` pendiente |
| Contrato OpenAPI de la primera rebanada V1 | Fijar 18 paths, 21 operaciones, DTOs, ejemplos, caché y gate contract-first | Aprobado y recertificado — P1/P2 de Nutrición cerrados |
| Gobernanza de verificadores y break-glass V1 | Fijar catálogo, evidencia, conflictos, quorum, expiración, revisión y abuso | Recertificada con ADR-028 y separación de deberes |
| Matriz de degradación y recuperación | Fijar aislamiento, fallo cerrado, límites, observabilidad y SLO/RTO/RPO | Aprobado — Fase 3 |
| Contrato de idempotencia durable V1 | Separar replay HTTP, identidad durable, concurrencia, expiración y disposición | Aprobado — resolución de P0-08 |
| Estándar de modelado PostgreSQL | Fijar convenciones físicas: nombres, schemas, IDs, tipos, constraints, índices | Aprobado — Fase 4 |
| ERD lógico V1 | Traducir nueve dominios conceptuales a 115 tablas físicas en once schemas | Recertificado para ADR-028; resto de P0 pendiente |
| Diccionario de datos V1 | Ficha de quince campos por cada una de las 115 tablas | 115 fichas únicas verificadas; resto de P0 pendiente |
| Catálogo de objetos físicos y contratos JSONB V1 | Fijar inventario, enums compartidos, nombres, documentos JSONB y particiones | Aprobado — resolución de P0-07 |
| Matriz de integridad cruzada V1 | Fijar claves portadoras, FKs compuestas, triggers guardianes y pruebas negativas | Aprobada — resolución de P0-05 |
| Revisión de preparación para Fase 5 | Consolidar bloqueos, contradicciones y criterios GO/NO-GO antes del DDL | Histórica; su GO fue supersedido por la revisión P0 |
| Modificaciones por rebanada en Fase 5 | Fuente de verdad para cerrar cada P0 antes del DDL que lo consume | **GO condicionado por rebanada**; no se autoriza generar la baseline completa por adelantado |

Dimensión actual: **9 dominios conceptuales, 11 schemas físicos, 115 tablas, 7 scopes, 184 operaciones inventariadas, 28 rutas físicas RLS y una primera rebanada OpenAPI de 18 paths/21 operaciones**.

## Decisiones acordadas

- El ecosistema documentado se compone de Allfit OS, Allfit Space y Allfit Backoffice.
- Amazon Cognito será la única fuente de autenticación.
- Habrá un Cognito User Pool compartido por ambiente y app clients separados por producto.
- Supabase se utilizará únicamente como PostgreSQL administrado.
- Space y OS accederán a los datos exclusivamente mediante una API propia.
- Existirá un proyecto Supabase compartido por ambiente.
- Una persona puede registrarse directamente en Space y activar su Fitness ID sin invitación, organización o relación profesional.
- Allfit OS solo puede invitar por email o celular; nunca crea cuentas o personas.
- La invitación es opcional para identidad: únicamente transporta propuestas iniciadas desde OS y una persona ya registrada la acepta con el mismo `person_id`.
- La persona completa personalmente Cognito, registro, términos y onboarding.
- V1 solo activa Fitness IDs para personas de 18 años o más; menores, representantes, consentimiento parental y cuentas tuteladas quedan fuera del alcance.
- La elegibilidad adulta se resuelve antes de crear la persona, recopilar datos fitness o materializar invitaciones; una cuenta Cognito temporal no concede acceso de dominio.
- La identidad externa de Cognito se separa de la persona/Fitness ID de dominio.
- Los datos se organizan por dominios, no por aplicación.
- El núcleo de entrenamiento será multidisciplina.
- Ejercicio y rutina son términos de interfaz para fuerza, no entidades universales.
- Lo planificado y lo ejecutado se almacenan separadamente.
- Programas publicados y asignaciones preservan versiones inmutables.
- RLS de PostgreSQL se mantiene como defensa en profundidad mediante contexto transaccional.
- Un único repositorio/pipeline será propietario de las migraciones.
- El perfil profesional pertenece a la persona y puede existir independientemente de una organización.
- Los datos materiales del perfil distinguen `person_declared`, `professional_observation`, `device_observed`, `system_inferred` y `authority_verified`.
- Procedencia, actor capturador, método y verificación son dimensiones separadas; varias afirmaciones pueden coexistir sin sobrescribirse.
- Una inferencia conserva algoritmo, versión, inputs, confianza y vigencia; una verificación cubre solo la afirmación y evidencia evaluadas.
- V1 verifica únicamente credenciales profesionales mediante registro oficial o confirmación del emisor; `A11` requiere deber separado, AAL2, vigencia y ausencia de conflicto.
- La proyección actual aplica reglas explícitas, conserva alternativas y nunca amplía scopes ni convierte todo el perfil en “verificado”.
- Para prestar servicios, gestionar clientes, publicar oferta, asignar programas o recibir pagos mediante OS, el profesional debe actuar dentro de una organización.
- El onboarding `solo_professional` crea una organización `professional_practice`; esta es una frontera operativa y no implica por sí sola una persona jurídica.
- Una práctica inicialmente unipersonal puede incorporar staff y profesionales sin cambiar de `organization_id`; “independiente” no es un tipo permanente.
- Terminar una relación corta inmediatamente acceso en vivo y escritura, y congela en `T` la ventana histórica previamente autorizada; no equivale a revocar el consentimiento.
- Las asignaciones administradas por una relación terminada se desacoplan y quedan pausadas; no generan sesiones, recordatorios ni incumplimiento hasta que la persona decida.
- La persona puede continuar el mismo snapshot como asignación personal o terminar las sesiones futuras; ninguna organización nueva hereda gestión o permisos.
- La persona conserva su Fitness ID; la organización conserva sus activos propios y evidencia bilateral mínima bajo finalidad, acceso restringido y plazo definido.
- Retener un registro no equivale a mantener acceso cotidiano; al vencer el plazo se elimina o anonimiza salvo un hold documentado.
- V1 usa siete scopes explícitos e independientes: `relationship_training`, `prior_training_history`, `body_progress`, `health_context`, `nutrition_intake`, `nutrition_guidance` y `nutrition_media`.
- Cada scope congela una definición versionada de recursos/campos; ampliar contenido o finalidad exige nueva aceptación.
- `relationship_training` cubre la relación; `prior_training_history`, ejecuciones anteriores/autónomas; `body_progress`, medidas/composición/fotos elegidas; `health_context`, salud fitness minimizada.
- La persona puede ocultar sesiones autónomas por relación; la denegación reduce `prior_training_history`, se aplica a toda la organización responsable y no puede revelar conteos o derivados.
- Ocultar no elimina la sesión ni revierte accesos anteriores; una nueva relación no hereda la preferencia y requiere su propio grant.
- Scope define qué datos y `access_level` qué acciones; biometría, GPS, wearables, nutrición clínica/terapéutica, IA y usos secundarios permanecen fuera de V1.
- El consentimiento de servicio identifica a la parte responsable y se materializa sobre la organización de la relación; solo profesionales asignados con membresía/capacidad vigentes pueden ejercerlo.
- Una reasignación interna conserva el grant si no cambian organización, responsable, finalidad o scope; cualquier cambio de esas dimensiones exige nueva autorización.
- Los scopes nutricionales nunca se heredan de los grants de entrenamiento: intake, guidance y media se conceden y revocan por separado.
- Nutrición V1 incluye registro manual, seis nutrientes canónicos, resúmenes calculados, una foto opcional, objetivos personales y propuestas de un profesional verificado.
- No existe rol `nutritionist`: proponer exige relación, asignación, membresía, `guide_nutrition`, credencial `nutrition_professional` vigente y `nutrition_guidance/contribute` en la misma organización.
- `nutrition_media` aislado no revela comidas; una lectura OS necesita además `nutrition_intake/read`. Revocar un scope invalida filas, conteos, cursores, agregados, cachés y URLs relacionadas.
- Tras terminar la relación, `frozen` nutricional nunca expone comidas, fotos, resúmenes o metas personales; solo guía profesional emitida por esa relación hasta `T`, mediante caso histórico y mientras `nutrition_guidance` siga vigente.
- Las invitaciones usan intenciones tipadas de membresía, relación y programa; cada una se acepta o rechaza de forma independiente.
- La aceptación parcial es válida y completar una invitación nunca concede términos, scopes, pagos o usos secundarios implícitos.
- Las plantillas tienen identidad estable y versiones publicadas inmutables; los programas apuntan a versiones exactas.
- Publicar una nueva plantilla no actualiza programas existentes y las adaptaciones personales usan revisiones de prescripción.
- Una sesión planificada admite múltiples intentos históricos, pero solo una ejecución completada y válida es primaria para cumplimiento y progresión.
- Reanudar no crea otro intento; cambiar la primaria es explícito y el cumplimiento dividido queda fuera de V1.
- Un profesional puede revisar capturas/observaciones propias y proponer correcciones sobre datos de la persona, pero nunca sobrescribir resultados ajenos.
- Raw de dispositivos es inmutable; toda revisión conserva original, actor, motivo y procedencia.
- Cada categoría personal tiene una política versionada y una disposición explícita: eliminar, anonimizar irreversiblemente o conservar de forma restringida.
- Revocar un scope elimina el acceso del tercero, no los datos que la persona conserva en su Fitness ID.
- `deleted_at`, cifrado o sustitución por UUID no equivalen a eliminación o anonimización; los holds son acotados y los backups no pueden resucitar datos dispuestos.
- Cada `activity_type` usa un contrato de resultados publicado y versionado; la ejecución conserva la versión aplicada.
- `summary`, `detailed` y `sensor_enriched` expresan completitud independiente del estado de la sesión; una ingesta `partial` no alimenta progresión precisa.
- V1 define mínimos para fuerza/calistenia, running, yoga/movilidad e híbrido sin exigir sensores o campos universales ficticios.
- V1 conserva catálogo global mínimo y contenido privado de entrenamiento; marketplace, publicación comercial y perfiles públicos quedan diferidos.
- Booking/clases, commerce/pagos internos o externos, membresías comerciales, wearables productivos, IA, nutrición clínica/terapéutica o automatizada, comunidad y eventos no generan DDL en la baseline.
- `sensor_enriched` se define y prueba como contrato del núcleo, sin incorporar conectores, credenciales o raw streams productivos.
- Una capacidad diferida entra después como rebanada vertical con ADR, ownership, privacidad, modelo, migraciones, RLS y pruebas propios; no mediante placeholders.
- Space y OS tienen independencia funcional y aislamiento operativo, pero comparten en V1 Cognito y PostgreSQL como dominios físicos de fallo aceptados.
- Los fallos locales se contienen con límites de recursos, colas y circuit breakers; autorización, consentimiento, capacidad y dinero fallan cerrados.
- Una separación futura se decide por SLO, regulación, escala o incidentes demostrados y se ejecuta por dominio, no duplicando bases por producto.
- La API propia se construye en Bun + TypeScript y expone cuatro superficies REST con OpenAPI: `/space/v1`, `/os/v1`, `/catalog/v1` y `/backoffice/v1`, cada una con versionado independiente.
- `allfitone-os` es el repositorio propietario de `supabase/`, de las migraciones y de la API; Allfit Space es un repositorio cliente que consume DTOs generados.
- En OS, la organización viaja explícita en la ruta bajo `/organizations/{orgId}`; nunca se resuelve desde el token ni desde una preferencia guardada.
- Allfit Space es una aplicación móvil Expo: registro de ejecución, edición de perfil y captura nutricional estructurada admiten borrador local. La foto nutricional se adjunta después al recuperar conexión; `Command-Id` se genera al crear la intención y cada operación HTTP usa su propia `Idempotency-Key`.
- El catálogo de roles organizacionales es cerrado: `owner`, `admin`, `coach` y `staff`, sin roles personalizados ni alcance por sede.
- Una relación tiene un titular efectivo y admite suplencias acotadas que la persona debe aceptar.
- Soporte no tiene acceso ordinario a contenido personal: `A10` ejerce sólo su ventana; un A12 aprueba categorías estándar y dos A12 distintos las restringidas; otro A12 revisa el caso. Cada lectura/denegación es visible y el abuso suspende el deber.
- `allfit_admin` es únicamente el rol base de inicio de sesión en Backoffice. Cada operación exige AAL2 y un deber temporal vigente; `A10`, `A11` y `A12` son modos derivados del deber, no roles enviados por el cliente.
- Toda lectura amparada por un grant escribe un registro de acceso con el actor humano real, conservado 24 meses.
- La revocación de un consentimiento invalida proyecciones y cachés en la misma transacción: no existe ventana de propagación tolerada.
- V1 opera en Colombia bajo la Ley 1581 y el Decreto 1377, diseñando al techo del GDPR.
- El calendario se materializa dentro de la transacción de asignación; no existe job periódico de generación de sesiones.
- El catálogo global lo publica solo la plataforma; las organizaciones crean movimientos privados promovibles a global mediante moderación explícita.

## Estado de la revisión conjunta

**Fase 1 — aprobada y recertificada el 28 de julio de 2026.** El glosario y el alcance incorporan Nutrición no clínica y retiran cualquier migración legacy.

**Fase 2 — aprobada y recertificada el 28 de julio de 2026.** El mapa de dominios/ownership y el ERD conceptual incorporan Nutrición como noveno dominio y conservan las interacciones con Identidad, Relaciones, Organizaciones, Privacidad y Sistema.

**Fase 3 — aprobación histórica del 28 de julio de 2026.** La incorporación del catálogo completo de HU y ADR-028 amplió el inventario a 184 operaciones y 28 rutas físicas. Las brechas se cierran just-in-time antes de la primera rebanada que las consuma.

**Fase 4 — aprobación histórica del 28 de julio de 2026.** El modelo vigente contiene 115 tablas y cinco objetos físicos de Soporte tras ADR-028; esa dimensión ya está sincronizada entre ERD, catálogo y diccionario, pero no autoriza aún el DDL.

El readiness vigente queda en **GO condicionado por rebanada** según [modificaciones de BD por rebanada](./04_EXECUTION/PRE_PHASE_5_DATABASE_MODIFICATIONS.md). Cada HU debe cerrar sus propios P0 antes de migrar; no se exige resolver Premium, pagos u otra épica para implementar una rebanada independiente. `DB-P5-002` ya está resuelto en diseño con la opción B.

Además de los P0, permanecen decisiones de ejecución registradas en el plan; se cierran antes de la primera rebanada que las necesite:

1. **SLO, RTO y RPO** — los valores de la matriz de degradación son una propuesta. Si existe algún compromiso de disponibilidad ya adquirido con un cliente o inversionista, los objetivos deben derivarse de él.
2. **Hosting de la API** — sin decidir. Los límites de recursos están expresados como garantías exigibles y se instancian en la Fase 5.
3. **Retención y borrado — política ratificada el 23 de julio de 2026.** Tres estados: **relación activa** → el gimnasio ve los datos según sus grants; **relación terminada con cuenta viva** → los grants pasan a `frozen`, cesan operación y escritura y solo sobrevive la ventana histórica autorizada hasta la fecha de corte; **sin relaciones activas y cuenta eliminada** → la información se **anonimiza para todos, incluido el gimnasio**. Sin snapshots, copias ni tabla `archive`: el dato vive en un solo lugar y la anonimización se aplica una vez, en su lugar. `data_grants` ya modela `active`, `frozen` y `revoked`; el acceso histórico exige un caso acotado, MFA, propósito, `auth.can_read_frozen` y auditoría sin excepción según ADR-023. Quedan pendientes los **plazos de retención por categoría** y la **validación con abogado de datos en Colombia**. Detalle en [ADR-005 y ADR-023](./02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md).
4. **Rol dual controlador/encargado de Allfit** — documentar en ADR propio: Allfit es **encargado** del gimnasio en OS y **controlador** frente a la persona en Space.

Decisión cerrada durante la revisión:

- **Edad mínima V1 — ratificada el 23 de julio de 2026.** V1 permanece en **18 años o más**. La propuesta de aceptar personas desde los 14 años como usuarios autónomos se descarta para esta baseline. El soporte futuro de personas de 14 a 17 años deberá entrar como una rebanada vertical representada, con autorización y salvaguardas específicas; no como un cambio aislado en `eligibility_evidence`.
- **Acceso histórico `frozen` — ratificado el 23 de julio de 2026.** No nace del rol ni reutiliza el CRM. Requiere un `historical_access_case` vigente para una relación exacta, actor elegible con membresía activa y MFA, propósito cerrado, field-set histórico, `auth.can_read_frozen` y un `ACCESS_EVENT` por lectura permitida o denegada. La persona puede revocar el grant congelado y cortar todo acceso posterior.
- **Verificación y break-glass — ratificado y recertificado el 28 de julio de 2026.** Verificación se limita a credenciales profesionales con evidencia competente; break-glass exige propósito/caso, AAL2, conflictos cerrados, quorum/duración por sensibilidad, revisión independiente y suspensión ante abuso. `nutrition_guidance` es estándar, `nutrition_intake` restringida y `nutrition_media` prohibida según ADR-026.

Las capacidades diferidas abrirán sus propias decisiones cuando entren formalmente en alcance.

## Protocolo de revisión sugerido

Para evitar decisiones dispersas entre mensajes:

1. Revisar los documentos en el orden indicado.
2. Comentar sobre definiciones y reglas de negocio, no inicialmente sobre nombres de columnas.
3. Registrar cada desacuerdo como una pregunta concreta.
4. Cerrar la decisión entre socios.
5. Actualizar el ADR consolidado.
6. Actualizar después glosario, propuesta, ERD y SQL derivados.

Formato sugerido para comentarios:

```text
[REVIEW]
Documento:
Sección:
Pregunta o desacuerdo:
Alternativa propuesta:
Decisión final:
```

## Dependencias de repositorios

Los documentos dentro de `01_CURRENT_STATE` enlazan evidencia histórica de Factory Fitness mediante el commit inmutable `d9f1fda7`. Los entregables de implementación apuntan al repositorio propietario `allfitone-os`; la documentación y los contratos permanecen en `allfitone-docs`.

## Regla de mantenimiento

Todos los nombres de archivo deben escribirse en inglés y usar `UPPER_SNAKE_CASE` para los documentos Markdown, salvo nombres convencionales como `README.md`.

No crear nuevos documentos para cada conversación. Mantener una sola fuente por responsabilidad:

- decisiones de arquitectura → `ALLFIT_ARCHITECTURE_DECISIONS.md`;
- lenguaje de dominio → `ALLFIT_DOMAIN_GLOSSARY.md`;
- frontera de la baseline → `V1_DATABASE_SCOPE.md`;
- dominios y ownership → `DOMAIN_OWNERSHIP_MAP.md`;
- entidades y cardinalidades conceptuales → `V1_CONCEPTUAL_ERD.md`;
- operaciones, actores y eventos → `V1_OPERATIONS_MATRIX.md`;
- autorización, RLS, proyecciones y pruebas → `V1_RLS_MATRIX.md`;
- superficies, endpoints y contratos → `V1_SPACE_OS_API_CONTRACTS.md`;
- fallos, límites, observabilidad y objetivos → `V1_DEGRADATION_AND_RECOVERY_MATRIX.md`;
- ejecución → `DATABASE_REFACTOR_PHASES.md`.
