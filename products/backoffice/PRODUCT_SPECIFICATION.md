# Allfit Backoffice

## Visión del producto interno para operar y gobernar Allfit One

> **Estado del documento:** baseline V1 alineada con las 33 historias de Backoffice y ADR-028; backend AAL2 recertificado al 12 de agosto de 2026.

Este documento define el propósito, los límites y la experiencia operativa de Allfit Backoffice. Las [historias de usuario](USER_STORIES.md) detallan el comportamiento verificable y [ADR-028](../../platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md) es la fuente normativa para autorización, separación de deberes y break-glass.

> **[ADR-046](../../platform/database/refactor/02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md#adr-046-an-allfit-admin-acts-with-the-full-authority-of-the-platform)
> partially supersedes ADR-028 (7 November 2026).** Built: `allfit_admin` holds all thirteen
> duties for as long as the role lasts, and the session lasts 60 idle minutes and 12 hours.
> Also built: self-approved break-glass windows of 60 minutes for every tier, person search
> by partial name, email or phone with full name and contact, and an optional case reference
> for support reads. Sections 4.2, 5 and 6 say so where they change.

## 1. Propósito

Allfit Backoffice es el producto interno desde el cual el equipo autorizado de Allfit puede observar, asistir y gobernar el ecosistema sin apropiarse de la operación de las personas, profesionales u organizaciones.

Su promesa es:

> **Resolver operaciones de plataforma con el mínimo acceso necesario, evidencia completa y separación de responsabilidades.**

No es un panel con acceso irrestricto a la base de datos ni una versión privilegiada de Studio o Space. Each capability corresponds to an explicit, auditable duty; since ADR-046 an administrator holds all of them through the role.

## 2. Lugar dentro del ecosistema

Allfit One se compone de tres productos que consumen dominios compartidos mediante contratos diferentes:

```text
Allfit Space       Persona: identidad, entrenamiento y datos propios
Allfit Studio          Profesional u organización: servicio y operación fitness
Allfit Backoffice  Equipo de Allfit: soporte y gobierno de plataforma
```

Backoffice no crea otra copia de personas, organizaciones, pagos o contenido. Consulta proyecciones minimizadas y ejecuta operaciones cerradas sobre las mismas fuentes de verdad.

## 3. Quién puede utilizarlo

`allfit_admin` lets a person sign in through the Backoffice's own WorkOS Application and, since ADR-046, brings all thirteen platform duties for as long as the person holds it. Without it, a Backoffice session can do nothing.

El login V1 no usa Hosted AuthKit: la API autentica correo y contraseña con la Application de Backoffice, exige email verificado y completa un challenge TOTP mediante la API MFA componible de WorkOS. PostgreSQL crea una sesión host-only sólo después de materializar esa prueba como `assurance_level=2` y `authentication_method=password_totp` para el `sid` exacto. The session lasts at most 12 hours and 60 minutes without activity (ADR-046). Roles, permisos, organizaciones, `authenticationMethod` y `auth_time` del proveedor no autorizan nada.

La combinación contraseña + TOTP constituye la evidencia AAL2 interna de V1, pero no es resistente al phishing. Allfit no declarará equivalencia integral con una oferta AAL2 moderna hasta incorporar WebAuthn/passkeys. La recuperación de contraseña sí usa la página alojada y el correo predeterminado de WorkOS en `*.authkit.app`; `auth.allfit.one` queda diferido como configuración y branding, no como dependencia contractual.

Every operation requires AAL2 and the duty it names, checked in its own transaction. An administrator holds every duty through the role, with no end of its own and no recertification; a duty granted on its own (only temporary duties from before ADR-046) lasts at most 90 days:

| Modo | Responsabilidad | Límite principal |
| --- | --- | --- |
| `A10` Soporte ordinario | métricas, diagnóstico y metadatos de soporte | no accede a contenido personal |
| `A11` Curaduría y verificación | credenciales, catálogos, reglas y oferta global | cada deber es independiente |
| `A12` Seguridad y privacidad | accesos internos, break-glass y solicitudes legales | never reviews its own break-glass window; since ADR-046 nobody approves one |

Los modos describen el deber ejercido; no son roles enviados por el cliente, roles organizacionales ni roles PostgreSQL.

## 4. Áreas principales

### 4.1 Inicio y atención

- Indicadores básicos del estado del negocio y la plataforma.
- Lista priorizada de situaciones que requieren intervención.
- Diagnóstico mediante identificadores, estados, errores y contadores.
- Ausencia explícita de analítica avanzada en V1.

### 4.2 Personas

- Search by part of a name, an email or a phone, or by the person's identifier, in one field, with an optional case reference (ADR-046 decisions 4 and 5).
- Results and the person file show the full name, contact and operational state. Every search is logged, with one access event per person returned, so each person sees it in her own history (ADR-046).
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
- Consultar ingresos agregados de Allfit Pro.
- Publicar planes de plataforma y definir sus entitlements.
- Habilitar a una organización elegible para conceder Pro.

Backoffice no cobra, gira, concilia ni altera dinero. La pasarela es la fuente de los resultados de cobro.

### 4.5 Catálogo y verificación

- Verificar credenciales profesionales con evidencia competente.
- Publicar el catálogo global.
- Publicar contratos de resultados por actividad.
- Publicar definiciones versionadas de permisos.

Verificar credenciales y curar catálogo son deberes independientes. Ninguno habilita el otro.

### 4.6 Equipo interno y auditoría

- Grant or withdraw the base role without self-granting it. Since ADR-046 the role brings every duty and withdrawing it revokes them; a duty held through the role is not suspended, revoked or recertified on its own.
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

- Training and prior history: standard category; the window opens on request and lasts 60 minutes (ADR-046).
- Body, health and `nutrition_intake`: restricted category; the window also opens on request and lasts 60 minutes (ADR-046).
- Every window needs a closed purpose and a traceable case; every read is still logged and visible to the person, and the other administrator reviews it afterwards. Nobody approves a window (ADR-046).
- `nutrition_media`, archivos, identidad o contacto completos, secretos, pagos detallados, raw de sensores y notas privadas: categorías no aprobables.

The requester and the reviewer must be different people, and neither can be the subject (ADR-046). Break-glass sólo permite lectura desde proyecciones cerradas; nunca concede escritura, exportación masiva, acceso a storage o uso de una ventana ajena.

Toda lectura sensible permitida o denegada se registra antes de devolver contenido. Si la auditoría falla, la lectura también falla. La persona afectada puede conocer actor, categoría, propósito, momento y resultado, sin exponer el expediente interno ni el contenido consultado.

## 6. Principios de producto

### El rol base no implica privilegio

Entrar al producto y estar autorizado para una operación son decisiones separadas. **Superseded by ADR-046:** the base role brings every duty, so for an administrator they are the same decision. Each operation still checks its duty in its own transaction.

### El soporte utiliza la mínima información

La experiencia comienza con metadatos operativos y escala sólo mediante una operación dedicada o un caso excepcional aprobado.

### Nadie controla todo el flujo sensible

Asignación, solicitud, aprobación, ejercicio y revisión conservan actores independientes. **Changed by ADR-046:** an administrator opens and exercises their own window, with no separate approval; the review stays with someone other than the requester and the subject.

### La evidencia no se borra

Roles, deberes, decisiones y accesos forman un historial inmutable y consultable.

### Backoffice no suplanta a otros productos

Las personas controlan su identidad y datos desde Space; las organizaciones administran su operación desde Studio.

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

Since ADR-046 the duties of an administrator are not temporary and are not split among administrators; the auditable evidence and the refusal to act as people or organizations stay.
