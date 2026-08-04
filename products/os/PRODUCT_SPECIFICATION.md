# Allfit OS

## Visión del sistema operativo para profesionales y organizaciones fitness

> **Estado del documento:** visión de producto alineada con la baseline técnica documentada en `platform/database/refactor`.

Este documento describe la dirección completa de Allfit OS. No reemplaza las decisiones de arquitectura, el glosario, el alcance V1 ni el modelo conceptual del refactor.

Cuando una capacidad de esta visión todavía no pertenece a V1, se indica expresamente como **expansión futura**. Si existe una diferencia entre este documento y las fuentes normativas de `platform/database/refactor`, prevalecen:

1. [ALLFIT_ARCHITECTURE_DECISIONS.md](../../platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md).
2. [ALLFIT_DOMAIN_GLOSSARY.md](../../platform/database/refactor/03_PROPOSED_DESIGN/ALLFIT_DOMAIN_GLOSSARY.md).
3. [V1_DATABASE_SCOPE.md](../../platform/database/refactor/03_PROPOSED_DESIGN/V1_DATABASE_SCOPE.md).
4. [DOMAIN_OWNERSHIP_MAP.md](../../platform/database/refactor/03_PROPOSED_DESIGN/DOMAIN_OWNERSHIP_MAP.md).
5. [V1_CONCEPTUAL_ERD.md](../../platform/database/refactor/03_PROPOSED_DESIGN/V1_CONCEPTUAL_ERD.md).

El panel administrativo existente de Factory Fitness se utiliza únicamente como evidencia funcional para la experiencia administrativa: dashboard, clientes, agenda, catálogo, planes, equipo, permisos, sedes, analítica, CRM y monetización. No se trasladan automáticamente su modelo de datos, sus nombres, sus permisos ni su alcance a la nueva baseline.

---

## 1. La tesis central

**Allfit OS debe convertirse en el sistema operativo desde el cual un profesional o una organización ofrece fitness.**

No debería ser únicamente:

- Un panel para ver clientes.
- Un creador de rutinas.
- Un calendario de clases.
- Un CRM.
- Un sistema de membresías y cobros.
- Un software separado para entrenadores, gimnasios y estudios.
- Una colección de módulos administrativos sin una fuente común de verdad.

Debe ser el lugar desde el cual una organización coordina su operación y la relación continua con las personas que atiende:

> **Organizar, invitar, programar, acompañar, analizar y hacer crecer servicios fitness desde una sola operación conectada con el Fitness ID de cada persona.**

La promesa complementaria a Allfit Space sería:

> **Todo lo que un profesional o negocio necesita para ofrecer fitness.**

La ventaja no consiste en tener más pantallas administrativas que otros productos. Consiste en conectar lo que normalmente está fragmentado:

- La identidad de la persona.
- La organización y su equipo.
- La relación profesional.
- El consentimiento y la autorización.
- La planificación.
- La ejecución real.
- El progreso.
- La operación de sedes y servicios.
- El negocio.

Allfit OS no debe administrar una copia aislada del cliente. Debe operar, con autorización, sobre una relación conectada con la misma persona que utiliza Allfit Space.

---

## 2. El ecosistema completo

ALLFIT ONE tiene tres productos sobre dominios compartidos:

```text
ALLFIT ONE

├── Allfit Space
│   Producto para personas
│
├── Allfit OS
│   Producto para profesionales y organizaciones
│
└── Allfit Backoffice
    Producto interno para operar y gobernar la plataforma
```

### Allfit Space

La persona:

- Activa y conserva su Fitness ID.
- Entrena de forma autónoma o acompañada.
- Acepta o rechaza relaciones y asignaciones.
- Decide qué información comparte.
- Registra y consulta su progreso.
- Conserva continuidad al cambiar de profesional u organización.

### Allfit OS

El profesional o la organización:

- Configura su estructura operativa.
- Invita personas y miembros del equipo.
- Gestiona relaciones profesionales aceptadas.
- Publica y asigna planificación versionada.
- Consulta únicamente los datos autorizados.
- Acompaña la ejecución y analiza resultados.
- Administra su oferta, agenda y negocio cuando esas capacidades entren formalmente en alcance.

### Allfit Backoffice

El equipo autorizado de Allfit:

- Supervisa el estado operativo y comercial del ecosistema.
- Atiende incidencias mediante metadatos mínimos y acciones dedicadas.
- Publica catálogos, reglas y planes globales.
- Gestiona accesos internos, obligaciones legales y operaciones excepcionales con separación de deberes.

```text
Allfit Space                         Allfit OS

Persona                              Profesional u organización
Controla su Fitness ID               Opera dentro de una organización
Acepta una relación                  Propone una relación
Concede o revoca acceso              Solicita acceso con finalidad
Recibe planificación                 Crea y asigna planificación
Ejecuta y registra                   Acompaña y analiza
Conserva su historial        ↔        Conserva sus activos y evidencia autorizada
```

Los tres productos consumen los mismos hechos de dominio mediante contratos y permisos diferentes; no sincronizan copias de una persona, relación, sesión o resultado.

---

## 3. El concepto más importante: una organización no es dueña del Fitness ID

La unidad central de Allfit OS no debe ser un “usuario del gimnasio” duplicado dentro de cada negocio. Debe ser una **relación profesional explícita entre una persona y una organización**.

La persona conserva:

- Su identidad y Fitness ID.
- Su historial personal.
- Sus objetivos y preferencias.
- Sus ejecuciones y resultados.
- La decisión de compartir o revocar información.
- La continuidad de su entrenamiento cuando termina una relación.

La organización conserva:

- Su identidad operativa.
- Sus sedes, miembros, roles y capacidades.
- Sus plantillas y programas propios.
- Sus observaciones y activos propios.
- Evidencia bilateral mínima cuando exista una finalidad y un plazo legítimos.

La relación conecta a ambas partes, pero no transfiere propiedad sobre la persona ni concede acceso por sí sola.

El acceso profesional efectivo debe exigir simultáneamente:

```text
relación vigente
+ grant vigente para la finalidad y el scope
+ profesional asignado
+ membresía organizacional activa
+ capacidad compatible con la acción
= acceso permitido
```

Ser propietario o administrador de la organización no concede acceso automático al Fitness ID de sus clientes. La administración del negocio y el acceso a datos personales son responsabilidades distintas.

---

## 4. Toda operación profesional ocurre dentro de una organización

Allfit OS debe soportar desde un entrenador independiente hasta una red de centros sin mantener modelos incompatibles.

El perfil profesional pertenece a la persona. Sin embargo, para prestar servicios, gestionar relaciones, asignar programas o recibir pagos mediante Allfit OS, el profesional actúa dentro de una organización activa.

### Práctica unipersonal

El onboarding de un profesional independiente crea:

- Un perfil profesional asociado a su persona.
- Una organización de tipo `professional_practice`.
- Una membresía propietaria inicial.

La organización puede incorporar después asistentes, administradores u otros profesionales sin cambiar de identidad ni migrar a otro tipo de cuenta.

“Independiente” describe una etapa operativa, no un tipo permanente de profesional.

### Organización con equipo

Una organización puede representar progresivamente:

- Una práctica profesional.
- Un gimnasio.
- Un estudio.
- Un box.
- Una academia.
- Un centro de alto rendimiento.
- Una clínica u otra operación compatible cuando exista un caso real aprobado.

El tipo representa la actividad principal, no el tamaño de la organización.

### Varias organizaciones

Una persona profesional puede participar en varias organizaciones con membresías, roles, asignaciones y capacidades diferentes. Entrar a otra organización no crea otro perfil profesional ni otro Fitness ID.

---

## 5. El producto no debe organizarse como una lista infinita de módulos

El panel administrativo actual demuestra el valor de áreas como clientes, agenda, actividades, ejercicios, rutinas, planes, analítica, equipo, sedes, CRM y monetización. La nueva experiencia debe conservar lo útil, pero agruparlo alrededor del trabajo que la organización intenta completar.

Un entrenador que trabaja solo, un estudio con clases y un gimnasio con varias sedes no deberían ver la misma navegación exacta.

Durante el onboarding, Allfit OS identifica:

- El tipo de operación.
- Las disciplinas ofrecidas.
- El tamaño y la estructura del equipo.
- Las sedes.
- El modelo de atención: individual, grupal, digital o híbrido.
- Las capacidades activas de la fase de producto.
- El rol y los permisos del miembro actual.

La interfaz se configura según esas condiciones. Una capacidad no contratada, no autorizada o todavía diferida no debe aparecer como una pantalla vacía.

La navegación completa puede converger en cinco áreas principales:

1. **Resumen**.
2. **Personas**.
3. **Entrenamiento**.
4. **Operación**.
5. **Negocio**.

Configuración, ayuda y administración de cuenta permanecen como utilidades, no como el centro del producto.

---

## 6. Las cinco áreas principales

### 6.1 Resumen

El centro operativo diario.

No debe ser un dashboard lleno de gráficas sin jerarquía. Debe responder:

> **¿Qué necesita atención hoy?**

Puede mostrar, según rol y fase:

- Invitaciones pendientes.
- Relaciones aceptadas que requieren configuración.
- Sesiones planificadas para hoy.
- Personas con baja adherencia o actividad incompleta.
- Revisiones o propuestas de corrección pendientes.
- Check-ins y seguimientos próximos.
- Asignaciones por iniciar, finalizar o ajustar.
- Tareas administrativas del equipo.
- Estado de sedes, clases, cupos o cobros cuando esos dominios estén habilitados.

Ejemplo para un entrenador:

```text
Resumen

8 sesiones programadas
2 resultados por revisar
1 cliente requiere atención

Camila completó Fuerza — Tren inferior
Adherencia semanal: 75%

[Revisar sesión]
```

El panel existente de Factory Fitness aporta patrones valiosos para esta área: resumen del día, clientes activos, adherencia, intensidad, alertas y agenda. En Allfit OS esos indicadores deben derivarse del nuevo modelo de planificación, ejecución, procedencia y autorización.

### 6.2 Personas

El centro de las relaciones profesionales.

No es una libreta de contactos ni una tabla global de usuarios. Cada entrada representa una relación válida y el nivel de información visible para el actor actual.

Debe permitir:

- Invitar por email o celular.
- Consultar el estado de cada intención enviada.
- Ver relaciones activas, pendientes, terminadas o restringidas.
- Asignar y reasignar profesionales dentro de la misma organización.
- Consultar grants y scopes sin convertirlos en una casilla genérica de consentimiento.
- Revisar perfil, objetivos y contexto autorizado.
- Consultar planificación, sesiones y progreso autorizados.
- Proponer correcciones sin sobrescribir datos ajenos.
- Terminar una relación con efectos claros y auditables.

La ficha de una persona puede organizarse de forma contextual en:

- Resumen operativo.
- Calendario y sesiones.
- Planificación asignada.
- Ejecución e historial autorizado.
- Progreso.
- Contexto fitness autorizado.
- Equipo profesional asignado.
- Relación, grants y privacidad.
- Historial de acciones y auditoría.

El panel actual ofrece referencias útiles como resumen, calendario, bitácora, entrenamiento, progreso, equipo y perfil. Nutrición y estado financiero pueden incorporarse en fases posteriores, pero no forman parte de la baseline V1.

### 6.3 Entrenamiento

El motor profesional de planificación y seguimiento.

Debe permitir:

- Administrar el catálogo multidisciplina habilitado.
- Crear contenido privado de la persona u organización.
- Crear plantillas de sesión.
- Publicar versiones inmutables.
- Construir programas con versiones exactas de plantillas.
- Asignar una versión exacta de programa.
- Aplicar revisiones personales auditables.
- Planificar sesiones.
- Comparar prescripción y ejecución.
- Revisar intentos y seleccionar la ejecución primaria cuando corresponda.
- Consultar resultados tipados por modalidad.

Para fuerza, la interfaz puede hablar de ejercicios, rutinas, series, repeticiones y cargas. Para running puede hablar de intervalos, ritmo, distancia y zonas. Para yoga o movilidad puede hablar de secuencias, duración y percepción. Estas expresiones no deben deformar el modelo universal.

Reglas esenciales:

- Una plantilla tiene identidad estable y versiones publicadas inmutables.
- Solo los borradores son editables.
- Publicar una nueva versión no modifica programas existentes.
- La asignación conserva la versión exacta recibida.
- Lo planificado y lo ejecutado permanecen separados.
- Una sesión planificada puede tener varios intentos, pero solo una ejecución completada y válida es primaria.
- Las correcciones conservan original, actor, motivo, procedencia y fecha.

### 6.4 Operación

El lugar para organizar cómo se presta el servicio.

#### Incluido en la baseline V1

- Organización y estado.
- Sede básica.
- Equipo interno.
- Membresías organizacionales.
- Roles y capacidades explícitas.
- Invitaciones de staff y profesionales.
- Asignación de profesionales a relaciones.
- Historial de reasignaciones.

#### Expansión futura

- Agenda de oferta.
- Clases grupales.
- Reservas.
- Recursos y espacios.
- Reglas de recurrencia.
- Capacidad, asistencia y listas de espera.
- Control de acceso.
- Ocupación en tiempo real.
- Mantenimiento de equipos e instalaciones.

Las pantallas actuales de agenda, actividades, ubicaciones, capacidad y reglas de reserva son referencias para esta expansión. No justifican crear tablas o permisos de booking en V1.

### 6.5 Negocio

El lugar para convertir una buena operación en una organización sostenible.

#### Expansión futura

- CRM y pipeline comercial.
- Oferta y paquetes.
- Membresías comerciales.
- Suscripciones de clientes.
- Precios y descuentos.
- Pagos internos, externos y manuales.
- Reembolsos.
- Facturación y conciliación.
- Entitlements.
- Marketplace y perfiles públicos.
- Analítica financiera.
- Retención, renovaciones y cohortes.

El panel actual demuestra flujos útiles de CRM, planes y membresías, suscriptores, pagos, integración con Mercado Pago y configuración comercial. Estas capacidades deben reingresar como rebanadas verticales completas, no como una migración automática del esquema anterior.

---

## 7. Invitaciones sin crear personas en nombre de otras personas

Allfit OS puede iniciar una relación, pero no apropiarse del registro.

La organización solo invita por email o celular. Nunca crea una cuenta Cognito, una persona provisional o un Fitness ID en nombre del destinatario.

Una invitación puede transportar intenciones separadas:

- Incorporarse como miembro de la organización.
- Iniciar una relación profesional.
- Recibir una asignación de programa, dependiente de la relación.

Cada intención se acepta o rechaza independientemente. La aceptación parcial es válida.

Ejemplo:

```text
Invitación de Allfit Performance

[Aceptar] relación de entrenamiento
[Rechazar] programa inicial de 12 semanas
[Revisar] datos solicitados y finalidad
```

Aceptar la invitación no significa aceptar implícitamente:

- Todos los términos futuros.
- Todos los scopes.
- Pagos.
- Marketing.
- Publicación.
- Investigación.
- IA.
- Entrenamiento de modelos.

Una persona que ya usa Allfit Space acepta con su cuenta y `person_id` existentes. Su historial no se duplica ni se comparte retroactivamente por defecto.

---

## 8. Privacidad como capacidad de producto

La privacidad no debe aparecer únicamente en una política legal. Debe formar parte de la operación diaria de Allfit OS.

V1 define cuatro scopes independientes:

### `relationship_training`

Prescripción, versiones, sesiones, intentos y resultados producidos dentro de la relación.

### `prior_training_history`

Sesiones anteriores o autónomas, resultados tipados, récords y procedencia general autorizados.

### `body_progress`

Medidas, composición, perímetros, tendencias y fotos elegidas por la persona.

### `health_context`

Dolor, limitaciones, restricciones, recuperación, fatiga, sueño o readiness dentro de la finalidad fitness autorizada.

Cada scope debe:

- Tener finalidad y campos versionados.
- Aceptarse, rechazarse, revocarse o vencer por separado.
- Combinarse con un nivel de acceso y capacidades explícitas.
- Denegar por defecto lo que no cubre.
- Evitar filtraciones mediante conteos, gráficas, búsquedas o datos derivados.

La persona puede ocultar una sesión autónoma para una relación concreta. Esa sesión puede seguir existiendo en su Fitness ID y permanecer visible para otra relación autorizada.

Allfit OS debe explicar de manera comprensible:

- Qué puede ver la organización.
- Para qué puede usarlo.
- Qué profesionales asignados pueden actuar.
- Cuándo vence el acceso.
- Qué cambia al revocarlo.

---

## 9. Una relación debe poder terminar correctamente

Muchos productos diseñan cuidadosamente el alta y apenas consideran la salida. En Allfit OS, terminar una relación es un flujo central.

En la fecha efectiva de terminación:

- Se revoca el acceso operativo de la organización anterior.
- La persona sale de los listados operativos normales.
- La organización no obtiene datos futuros ni información producida fuera de la relación.
- La persona conserva su Fitness ID y su historial.
- La organización conserva solo sus activos y la evidencia mínima permitida por finalidad y plazo.

Si existe una asignación profesional activa, pasa a un estado desacoplado y pausado:

- Conserva su versión, snapshot, revisiones y origen.
- Deja de generar sesiones, recordatorios o incumplimiento.
- No se copia ni cambia silenciosamente de versión.

La persona decide después:

- Continuar personalmente con la misma asignación.
- Terminarla y cancelar únicamente las sesiones futuras no iniciadas.

Una organización nueva no hereda gestión, consentimiento o acceso. Debe iniciar una nueva relación y solicitar sus propios grants.

---

## 10. Operar varias disciplinas sin convertir todo en fuerza

Allfit OS debe funcionar para fuerza, running, movilidad y experiencias híbridas desde un lenguaje común.

El núcleo utiliza:

- Disciplina.
- Tipo de actividad.
- Movimiento opcional.
- Plantilla y versión de plantilla.
- Paso y target planificados.
- Programa y versión de programa.
- Asignación.
- Sesión planificada.
- Sesión ejecutada.
- Segmento.
- Resultado tipado.

Cada tipo de actividad aplica un contrato de resultados publicado y versionado.

Niveles de completitud:

- `partial`: información insuficiente para certificar el mínimo histórico.
- `summary`: mínimo para historial básico.
- `detailed`: detalle para comparar prescripción y ejecución.
- `sensor_enriched`: resultado detallado válido enriquecido con muestras compatibles.

La baseline debe validar al menos:

- Fuerza o calistenia.
- Running o endurance.
- Yoga o movilidad.
- Sesión híbrida.

`sensor_enriched` demuestra que el núcleo puede crecer, pero V1 no incorpora conectores productivos, credenciales, GPS preciso ni almacenamiento general de streams.

---

## 11. Seguimiento y analítica orientados a decisiones

La analítica de Allfit OS debe ayudar a intervenir, no solo a reportar.

### V1

Puede derivar, con autorización y procedencia:

- Adherencia a sesiones planificadas.
- Sesiones completadas, omitidas o inválidas.
- Progreso tipado por actividad.
- Récords y tendencias.
- Evolución de body progress cuando esté autorizada.
- Comparación entre prescripción y ejecución.
- Señales de inactividad o necesidad de revisión basadas en reglas explícitas.

### Expansión futura

- Retención de clientes.
- Ocupación y capacidad.
- Conversión comercial.
- Renovación de membresías.
- Ingresos por servicio, profesional o sede.
- Predicciones y recomendaciones asistidas por IA.
- Benchmarks anonimizados con una base jurídica y de privacidad propia.

Todo resultado derivado debe conservar:

- Algoritmo y versión.
- Inputs autorizados.
- Procedencia.
- Fecha de cálculo.
- Clasificación al menos tan restrictiva como la de sus datos de entrada.

Una gráfica no puede revelar indirectamente una sesión, categoría o relación que el actor no tiene autorización para consultar.

---

## 12. Allfit Intelligence para profesionales

La inteligencia artificial debe convertirse en una capa transversal de asistencia, no en un chatbot aislado ni en una autoridad clínica.

### Capacidades futuras posibles

#### Copiloto de planificación

- Proponer borradores de plantillas o programas.
- Adaptar una prescripción a disponibilidad y equipamiento.
- Detectar conflictos entre fuerza y resistencia.
- Resumir diferencias entre lo planificado y lo ejecutado.

#### Copiloto de seguimiento

- Preparar un resumen semanal por persona.
- Priorizar revisiones pendientes.
- Identificar cambios de adherencia.
- Proponer preguntas para un check-in.
- Redactar mensajes que el profesional revisa antes de enviar.

#### Copiloto operativo

- Resumir ocupación, agenda o incidencias.
- Ayudar a configurar servicios y horarios.
- Detectar inconsistencias administrativas.

#### Copiloto de negocio

- Resumir el pipeline comercial.
- Detectar renovaciones próximas.
- Explicar variaciones de ingresos o retención.

### Límites

- La IA contextual está explícitamente diferida de V1.
- No se crean tablas, permisos o JSON genéricos de IA en la baseline.
- El profesional conserva responsabilidad sobre decisiones profesionales.
- Las recomendaciones no se presentan como diagnóstico médico.
- Los usos de datos para IA requieren finalidad, autorización y contratos propios.
- Entrenar modelos con datos personales sensibles nunca se hereda de un consentimiento de servicio.
- Toda sugerencia material debe indicar evidencia, incertidumbre y procedencia.

---

## 13. Administración organizacional y administración de plataforma

Allfit OS debe distinguir dos niveles que el panel actual ya sugiere, pero que no deben mezclarse.

### Administración de una organización

Para owners y administradores autorizados:

- Información y estado de la organización.
- Sedes.
- Miembros internos.
- Invitaciones.
- Roles y capacidades.
- Asignación de profesionales.
- Branding y preferencias operativas cuando correspondan.
- Facturación SaaS en una fase posterior.

### Operación profesional

Para profesionales asignados:

- Personas con relación y grants vigentes.
- Planificación.
- Sesiones y resultados autorizados.
- Propuestas, observaciones y seguimiento.

### Administración interna de ALLFIT ONE

Para operaciones de plataforma estrictamente controladas:

- Estado de organizaciones.
- Soporte y diagnóstico.
- Gestión de planes SaaS.
- Auditoría.
- Moderación o gobernanza futura.
- Operaciones técnicas excepcionales.

Un administrador de plataforma no obtiene acceso cotidiano al Fitness ID. Las operaciones excepcionales deben ser de privilegio mínimo, justificadas, temporales y auditadas.

El selector de workspaces del panel existente es una referencia de usabilidad, no una autorización suficiente. Cambiar de workspace nunca puede sustituir la evaluación de permisos, relación, asignación y consentimiento.

---

## 14. Arquitectura y datos compartidos

La visión de producto debe respetar las decisiones técnicas ya acordadas.

### Identidad y autenticación

- Amazon Cognito es la única fuente de autenticación.
- Existe un User Pool compartido por ambiente.
- Space y OS utilizan app clients separados.
- La identidad externa de Cognito se separa de la persona/Fitness ID de dominio.
- Cognito no modela roles de negocio, relaciones o permisos fitness.
- V1 admite únicamente personas de 18 años o más.

### Persistencia y acceso

- Supabase se utiliza únicamente como PostgreSQL administrado.
- Space y OS acceden exclusivamente mediante una API propia.
- Ningún cliente usa PostgreSQL o PostgREST directamente.
- Backend, privilegios mínimos y RLS transaccional forman defensa en profundidad.
- Un único repositorio y pipeline son autoridad de migraciones.

### Dominios de la baseline

```text
Identidad
Organizaciones
Relaciones
Privacidad
Catálogo
Planificación
Ejecución
```

Los dominios pertenecen al ecosistema ALLFIT ONE, no a una aplicación concreta. Space y OS presentan capacidades diferentes sobre las mismas fuentes de verdad.

### Procedencia e historial

Los datos materiales distinguen:

- `person_declared`.
- `professional_observation`.
- `device_observed`.
- `system_inferred`.
- `authority_verified`.

Procedencia, actor capturador, método y verificación son dimensiones separadas. Varias afirmaciones pueden coexistir; una observación profesional no sobrescribe automáticamente lo declarado por la persona.

---

## 15. El modelo de negocio

Allfit OS puede capturar valor como infraestructura operativa y como capa de transacción del ecosistema.

### Suscripción SaaS

Planes futuros por combinación de:

- Número de miembros del equipo.
- Relaciones profesionales activas.
- Sedes.
- Capacidades operativas.
- Analítica avanzada.
- Automatizaciones.
- Integraciones.
- Soporte y controles empresariales.

### Transacciones

Cuando comercio entre formalmente en alcance:

- Procesamiento de pagos.
- Suscripciones y membresías.
- Venta de programas.
- Reservas.
- Entradas a eventos.
- Comisiones de marketplace.

### Servicios empresariales

- Marca y experiencia personalizadas.
- Integraciones dedicadas.
- Migración y onboarding.
- Controles, auditoría y reportes avanzados.
- Acuerdos de servicio.

La monetización no debe debilitar la portabilidad del Fitness ID. Una organización paga por operar mejor, no por apropiarse del historial de una persona.

---

## 16. La ventaja competitiva

Allfit OS no ganará únicamente por crear rutinas más rápido.

Su defensa estaría compuesta por seis elementos.

### 1. Relación nativa con Allfit Space

La planificación profesional llega directamente a la experiencia diaria de la persona y los resultados regresan como hechos autorizados, sin importaciones manuales ni perfiles duplicados.

### 2. Fitness ID longitudinal y portátil

La persona conserva continuidad. El profesional recibe contexto autorizado más útil que una ficha creada desde cero en cada herramienta.

### 3. Operación organizacional flexible

La misma raíz soporta una práctica unipersonal que después incorpora equipo, y organizaciones con varias sedes y roles, sin cambiar de identidad.

### 4. Entrenamiento multidisciplina y versionado

Fuerza, running, movilidad e híbrido comparten una arquitectura sin reducirse a una tabla universal llena de excepciones.

### 5. Privacidad operacional

Relaciones, scopes, capacidades, procedencia y terminación están incorporados al producto, no añadidos como controles secundarios.

### 6. Conexión entre servicio, operación y negocio

Con el tiempo, planificación, clases, reservas, membresías, pagos, marketplace e inteligencia pueden operar sobre los mismos dominios y eventos, entrando por fases completas y gobernadas.

---

## 17. La métrica principal

La métrica norte de Allfit OS no debería ser el número de pantallas visitadas ni la cantidad de planes creados.

Debería ser:

> **Personas activas que completan semanalmente sesiones gestionadas mediante una relación profesional en Allfit OS.**

Esta métrica conecta la operación del profesional con un resultado real de la persona.

Métricas secundarias:

- Relaciones profesionales activas y saludables.
- Tiempo desde invitación hasta primera sesión completada.
- Adherencia por asignación.
- Porcentaje de sesiones con resultados válidos.
- Profesionales que revisan resultados a tiempo.
- Retención de relaciones a 4, 12 y 24 semanas.
- Continuidad correcta después de terminar una relación.
- Invitaciones aceptadas sin duplicación de identidad.
- Revocaciones y terminaciones aplicadas dentro del tiempo definido.
- Organizaciones que incorporan equipo sin migración de identidad.
- Ingresos gestionados y renovaciones cuando comercio esté habilitado.

---

## 18. Qué construir primero

La visión es amplia. La baseline V1 no debe serlo.

### Fase 1 — Baseline compartida de identidad y entrenamiento

Esta fase corresponde al alcance actual de `platform/database/refactor`.

- Registro directo adulto en Space.
- Cognito como autenticación única.
- Una persona y un Fitness ID por sujeto.
- Perfil profesional personal.
- Onboarding de práctica unipersonal como organización.
- Organización, sede básica, miembros, roles y capacidades.
- Invitaciones tipadas sin personas provisionales.
- Relación profesional aceptada.
- Profesionales asignados.
- Cuatro scopes V1 y grants versionados.
- Catálogo multidisciplina mínimo.
- Contenido privado.
- Plantillas y programas versionados.
- Asignaciones y sesiones planificadas.
- Ejecuciones, segmentos y resultados tipados.
- Progreso básico.
- Correcciones con procedencia.
- Fin de relación, revocación y continuidad personal.
- Retención, eliminación y anonimización por categoría.

Propuesta inicial:

> **Invita, planifica y acompaña a tus clientes mientras cada persona conserva una sola identidad y el control de sus datos.**

### Fase 2 — Experiencia profesional y colaboración de equipo

Después de aprobar e implementar la baseline:

- Dashboard operativo contextual.
- Flujos completos de revisión y seguimiento.
- Mejoras de colaboración y reasignación.
- Mensajería bajo un dominio y consentimiento propios.
- Automatizaciones operativas sin IA sensible.
- Analítica profesional ampliada.

Cada ampliación material requiere volver a alcance, ADR, ownership, modelo, seguridad y pruebas.

### Fase 3 — Agenda, clases y operación de sedes

- Oferta de actividades.
- Horarios y recurrencia.
- Reservas.
- Cupos y listas de espera.
- Asistencia.
- Recursos y espacios.
- Varias sedes.
- Control de acceso y ocupación.

### Fase 4 — Negocio y marketplace

- CRM.
- Productos y precios.
- Membresías comerciales.
- Pagos y conciliación.
- Facturación.
- Marketplace.
- Perfiles públicos y reseñas.
- Analítica comercial.

### Fase 5 — Integraciones e inteligencia

- Wearables productivos.
- Recuperación avanzada.
- Nutrición como dominio propio.
- Copiloto para profesionales.
- Recomendaciones y automatizaciones explicables.
- Máquinas y sensores conectados.

---

## 19. Qué no construir inicialmente

- Booking o clases escondidos dentro de planificación.
- Comercio escondido dentro de relaciones.
- Nutrición como un conjunto de columnas del perfil.
- IA representada por un JSON genérico sin contratos.
- Conectores de wearables sin modelo de consentimiento y operación.
- Un perfil duplicado por cada organización.
- Un modelo de datos separado para Space y otro para OS.
- Acceso al Fitness ID basado únicamente en rol administrativo.
- Un permiso genérico para editar cualquier ejecución.
- Programas publicados que cambian retroactivamente.
- Una organización “independiente” que deba migrar para contratar equipo.
- Menores o cuentas tuteladas sin un diseño completo y aprobado.
- Marketplace, pagos o membresías comerciales parcialmente modelados.
- Tablas, columnas, roles, endpoints o feature flags para capacidades futuras sin un caso V1.
- Una interfaz idéntica para todos los tipos de organización y todos los roles.

La ausencia deliberada de una capacidad diferida es parte de la calidad de la baseline.

---

## 20. Principios de producto

### La persona conserva continuidad

Terminar una relación no elimina su historia ni la obliga a comenzar de nuevo.

### La organización opera con límites claros

Solo ve y modifica lo necesario para la relación, finalidad, rol y periodo vigentes.

### La interfaz refleja el dominio

Relación, asignación, consentimiento, versión y ejecución no se reducen a etiquetas ambiguas como “cliente activo” o “plan actual”.

### Lo publicado no cambia retroactivamente

Versiones y snapshots permiten explicar qué se prescribió y qué se ejecutó en cada momento.

### Los derivados no evaden la privacidad

Gráficas, alertas, resúmenes e IA respetan la clasificación y autorización de sus datos de origen.

### Las capacidades futuras entran completas

Cada dominio nuevo incorpora lenguaje, ownership, privacidad, arquitectura, modelo, migraciones, RLS, contratos, pruebas y observabilidad.

### El sistema ayuda a actuar

Cada área debe priorizar decisiones y próximos pasos sobre administración pasiva.

---

## Definición final

> **Allfit OS es el sistema operativo para profesionales y organizaciones fitness que permite organizar equipos, establecer relaciones autorizadas, crear planificación multidisciplina, acompañar la ejecución y hacer crecer servicios conectados con el Fitness ID de cada persona.**

En su forma definitiva:

> **Allfit OS no sería únicamente el panel donde un negocio administra clientes. Sería la infraestructura desde la cual profesionales y organizaciones ofrecen fitness de forma coordinada, medible, segura y conectada con la vida real de cada persona.**

Y su lugar dentro de ALLFIT ONE sería:

```text
ALLFIT ONE

ALLFIT SPACE
Todo lo que una persona necesita para vivir el fitness.

ALLFIT OS
Todo lo que un profesional o negocio necesita para ofrecerlo.

UNA SOLA IDENTIDAD
La persona conserva su Fitness ID y decide cómo se conecta con cada relación.
```
