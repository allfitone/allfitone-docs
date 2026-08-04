# Allfit Backoffice

## Visión del producto interno para operar y gobernar Allfit One

> **Estado del documento:** baseline V1 alineada con las 33 historias de Backoffice y ADR-028 al 3 de agosto de 2026.

Este documento define el propósito, los límites y la experiencia operativa de Allfit Backoffice. Las [historias de usuario](USER_STORIES.md) detallan el comportamiento verificable y [ADR-028](../../platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md) es la fuente normativa para autorización, separación de deberes y break-glass.

## 1. Propósito

Allfit Backoffice es el producto interno desde el cual el equipo autorizado de Allfit puede observar, asistir y gobernar el ecosistema sin apropiarse de la operación de las personas, profesionales u organizaciones.

Su promesa es:

> **Resolver operaciones de plataforma con el mínimo acceso necesario, evidencia completa y separación de responsabilidades.**

No es un panel con acceso irrestricto a la base de datos ni una versión privilegiada de OS o Space. Cada capacidad corresponde a un deber explícito, temporal y auditable.

## 2. Lugar dentro del ecosistema

Allfit One se compone de tres productos que consumen dominios compartidos mediante contratos diferentes:

```text
Allfit Space       Persona: identidad, entrenamiento y datos propios
Allfit OS          Profesional u organización: servicio y operación fitness
Allfit Backoffice  Equipo de Allfit: soporte y gobierno de plataforma
```

Backoffice no crea otra copia de personas, organizaciones, pagos o contenido. Consulta proyecciones minimizadas y ejecuta operaciones cerradas sobre las mismas fuentes de verdad.

## 3. Quién puede utilizarlo

`allfit_admin` es únicamente la habilitación base para iniciar sesión mediante la WorkOS Application exclusiva de Backoffice. No concede lectura ni escritura.

Cada operación exige AAL2 y un deber temporal vigente, otorgado por otra persona durante un máximo de 90 días:

| Modo | Responsabilidad | Límite principal |
| --- | --- | --- |
| `A10` Soporte ordinario | métricas, diagnóstico y metadatos de soporte | no accede a contenido personal |
| `A11` Curaduría y verificación | credenciales, catálogos, reglas y oferta global | cada deber es independiente |
| `A12` Seguridad y privacidad | accesos internos, break-glass y solicitudes legales | no aprueba ni audita su propia actuación |

Los modos describen el deber ejercido; no son roles enviados por el cliente, roles organizacionales ni roles PostgreSQL.

## 4. Áreas principales

### 4.1 Inicio y atención

- Indicadores básicos del estado del negocio y la plataforma.
- Lista priorizada de situaciones que requieren intervención.
- Diagnóstico mediante identificadores, estados, errores y contadores.
- Ausencia explícita de analítica avanzada en V1.

### 4.2 Personas

- Búsqueda exacta por identificador o contacto con referencia de caso.
- Contacto enmascarado y estado operativo sin exploración por nombre.
- Acciones dedicadas para reenviar verificaciones, recuperaciones o invitaciones.
- Inicio de correcciones de identidad sin modificar directamente los datos de la persona.
- Acceso excepcional a categorías aprobables únicamente mediante break-glass.

### 4.3 Organizaciones

- Buscar y consultar organizaciones.
- Crear una organización inicial y entregarla a su dueño mediante invitación.
- Cancelar una organización no reclamada.
- Suspender de forma reversible cuando exista causa operativa.
- No administrar el gimnasio en nombre de su owner.

El cierre unilateral de una organización ya reclamada está diferido y no genera capacidades de base de datos en V1.

### 4.4 Suscripciones y actividad comercial

- Consultar metadatos minimizados de pagos de una persona.
- Consultar suscripciones de organizaciones.
- Consultar ingresos agregados de Allfit Premium.
- Publicar planes de plataforma y definir sus entitlements.
- Habilitar a una organización elegible para conceder Premium.

Backoffice no cobra, gira, concilia ni altera dinero. La pasarela es la fuente de los resultados de cobro.

### 4.5 Catálogo y verificación

- Verificar credenciales profesionales con evidencia competente.
- Publicar el catálogo global.
- Publicar contratos de resultados por actividad.
- Publicar definiciones versionadas de permisos.

Verificar credenciales y curar catálogo son deberes independientes. Ninguno habilita el otro.

### 4.6 Equipo interno y auditoría

- Otorgar o revocar el rol base y los deberes de plataforma sin autoasignación.
- Consultar quién tiene acceso, quién lo otorgó, su vigencia y su estado.
- Auditar accesos permitidos y denegados.
- Diagnosticar problemas sin ampliar el contenido visible.
- Impedir la eliminación o reescritura del historial de acceso.

### 4.7 Privacidad y obligaciones legales

- Seguir solicitudes de eliminación por categoría.
- Aplicar una suspensión legal documentada y acotada.
- Ejecutar eliminación o anonimización al vencer la retención aplicable.
- Evitar que una restauración de respaldo reviva información ya dispuesta.

## 5. Acceso excepcional y fallo cerrado

El soporte ordinario no puede leer entrenamiento, cuerpo, salud, nutrición o medios. Cuando una incidencia exige contenido personal, se utiliza una ventana break-glass ligada a un caso, propósito, categoría, sujeto y duración exactos.

- Entrenamiento e historial previo: categoría estándar, un aprobador independiente y máximo 30 minutos.
- Cuerpo, salud y `nutrition_intake`: categoría restringida, dos aprobadores distintos y máximo 15 minutos.
- `nutrition_media`, archivos, identidad o contacto completos, secretos, pagos detallados, raw de sensores y notas privadas: categorías no aprobables.

Solicitante, aprobadores y revisor deben ser personas distintas cuando corresponda. Break-glass sólo permite lectura desde proyecciones cerradas; nunca concede escritura, exportación masiva, acceso a storage o uso de una ventana ajena.

Toda lectura sensible permitida o denegada se registra antes de devolver contenido. Si la auditoría falla, la lectura también falla. La persona afectada puede conocer actor, categoría, propósito, momento y resultado, sin exponer el expediente interno ni el contenido consultado.

## 6. Principios de producto

### El rol base no implica privilegio

Entrar al producto y estar autorizado para una operación son decisiones separadas.

### El soporte utiliza la mínima información

La experiencia comienza con metadatos operativos y escala sólo mediante una operación dedicada o un caso excepcional aprobado.

### Nadie controla todo el flujo sensible

Asignación, solicitud, aprobación, ejercicio y revisión conservan actores independientes.

### La evidencia no se borra

Roles, deberes, decisiones y accesos forman un historial inmutable y consultable.

### Backoffice no suplanta a otros productos

Las personas controlan su identidad y datos desde Space; las organizaciones administran su operación desde OS.

### La automatización conserva las mismas garantías

Jobs, webhooks y procesos de retención son idempotentes, observables y no amplían permisos humanos.

## 7. Fuera de alcance

- Crear cuentas o aceptar términos en nombre de una persona.
- Cambiar directamente identidad, contacto, contraseña o cuenta vinculada.
- Reescribir entrenamiento, cuerpo, salud o nutrición.
- Operar una organización en nombre de su dueño.
- Cobrar, girar, conciliar o facturar dinero dentro de la plataforma.
- Mensajería general con personas u organizaciones.
- Analítica avanzada de cohortes, retención o embudos.
- Acceso ordinario o excepcional a categorías expresamente prohibidas.

## 8. Prioridad de entrega

La primera versión se implementa por rebanadas de HU. Una rebanada sólo avanza cuando están cerrados su deber, operación, objeto propietario, contrato, autorización y pruebas.

Las 17 HU imprescindibles cubren el mínimo de lanzamiento: acceso, visión operativa, búsqueda y soporte de personas, creación y entrega de organizaciones, metadatos de pagos, verificación, catálogo, planes y gobierno del equipo interno. Las demás HU incluidas se incorporan según dependencia y prioridad; `HU-BO-017` permanece diferida.

## 9. Medida de éxito

La medida principal no es cuánto contenido puede consultar soporte. Es la proporción de operaciones resueltas mediante metadatos u operaciones dedicadas, sin acceso excepcional y sin violar separación de deberes.

Se observan además:

- tiempo de resolución por tipo de caso;
- deberes vencidos o revocados correctamente;
- ventanas break-glass solicitadas, rechazadas, ejercidas y revisadas;
- lecturas impedidas por ausencia de auditoría o conflicto;
- solicitudes legales resueltas dentro de su política;
- incidencias repetidas que requieren mejorar el producto en lugar de ampliar privilegios.

## Definición final

> **Allfit Backoffice es el producto interno de Allfit One para observar, asistir y gobernar la plataforma mediante deberes temporales, operaciones minimizadas, separación de responsabilidades y evidencia auditable, sin suplantar a las personas ni a las organizaciones.**
