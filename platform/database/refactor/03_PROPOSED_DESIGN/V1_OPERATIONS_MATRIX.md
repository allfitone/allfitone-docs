# Matriz de operaciones V1

**Versión de revisión:** 7
**Fecha:** 17 de agosto de 2026
**Fase:** 3 — Definir operaciones, seguridad y contratos
**Estado:** AFO-39 ratifica alcance BETA Studio; implementación por rebanada pendiente
**Depende de:** [`ALLFIT_ARCHITECTURE_DECISIONS.md`](../02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md), [`ALLFIT_DOMAIN_GLOSSARY.md`](./ALLFIT_DOMAIN_GLOSSARY.md), [`V1_DATABASE_SCOPE.md`](./V1_DATABASE_SCOPE.md), [`DOMAIN_OWNERSHIP_MAP.md`](./DOMAIN_OWNERSHIP_MAP.md), [`V1_CONCEPTUAL_ERD.md`](./V1_CONCEPTUAL_ERD.md), [`V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md`](./V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md)

## 1. Propósito

Este documento enumera **todas** las operaciones de lectura y escritura que la baseline V1 debe soportar, y define para cada una quién la ejecuta, qué filtros son obligatorios, qué garantía transaccional necesita, cómo se comporta ante reintentos y concurrencia, qué información sensible toca y qué evento de dominio produce.

No define columnas, tipos ni nombres físicos: eso pertenece a la Fase 4. Tampoco define policies SQL: eso pertenece a [`V1_RLS_MATRIX.md`](./V1_RLS_MATRIX.md), que se deriva de este documento. Los nombres de entidades usados aquí son los conceptuales del [ERD de Fase 2](./V1_CONCEPTUAL_ERD.md).

El criterio de salida de la Fase 3 exige que **toda lectura y escritura del flujo vertical tenga actor, autorización, transacción y contrato definidos**. Una operación que no aparece en este documento no existe en V1: no se implementa, no recibe endpoint y no recibe policy.

## 2. Cómo se lee una ficha

Cada operación tiene una ficha con los nueve campos exigidos por el plan de fases, más tres campos de contrato:

| Campo | Qué responde |
| --- | --- |
| **Tipo** | Comando (escribe) o consulta (solo lee). Un comando nunca se expone como `GET`. |
| **Superficie** | Método y ruta en la superficie correspondiente, o `SYS` si no tiene contrato HTTP. |
| **Actor** | Quién puede ejecutarla. Los actores están definidos en §3. |
| **Filtros obligatorios** | Las condiciones que el servidor **siempre** aplica, aunque el cliente no las envíe. Su ausencia es un defecto de seguridad, no un caso borde. |
| **Transacción** | Qué debe ocurrir de forma atómica. `Ninguna` significa lectura simple. |
| **Idempotencia** | Qué pasa si la misma operación llega dos veces. |
| **Paginación y orden** | Solo para consultas de colección. |
| **Offline / concurrencia** | Comportamiento cuando el cliente está desconectado o cuando dos actores escriben a la vez. |
| **Información sensible** | Qué categorías de datos toca, para clasificar la auditoría y la redacción. |
| **Evento de dominio** | Qué se escribe en el outbox dentro de la misma transacción. `Ninguno` es una respuesta válida. |
| **Reglas** | Invariantes específicas que la operación debe hacer cumplir. |
| **Falla cerrada** | Qué ocurre cuando falta información o una dependencia está caída. |

### 2.1 Convención de identificadores

`OP-<DOMINIO>-<NNN>`. Los prefijos cubren los nueve dominios recertificados de Fase 2 más la categoría operativa de procesos de sistema:

| Prefijo | Dominio |
| --- | --- |
| `IDN` | Identidad |
| `ORG` | Organizaciones |
| `REL` | Relaciones |
| `PRV` | Privacidad |
| `CAT` | Catálogo |
| `PLN` | Planificación |
| `EXE` | Ejecución |
| `NUT` | Nutrición |
| `SYS` | Procesos de sistema sin actor humano |
| `PAY` | Pagos y planes |
| `SUP` | Soporte de plataforma |

El identificador es estable: la matriz de RLS, los contratos de API y las pruebas de Fase 6 lo referencian.

## 3. Catálogo de actores

Un actor no es un rol ni un permiso: es el sujeto autenticado desde el que se evalúa la autorización.

| Actor | Descripción | Puede existir sin `PERSON` |
| --- | --- | --- |
| `A0` Anónimo | Petición sin autenticar | Sí |
| `A1` Cuenta sin persona | Usuario WorkOS válido cuyo `ACCESS_ACCOUNT` todavía no vincula una `PERSON`. Solo puede operar sobre su propio onboarding | Sí |
| `A2` Persona | `PERSON` con Fitness ID, **activo o `pending_activation`**. Sujeto de Space. Las operaciones que exigen un Fitness ID ya activo lo declaran en sus filtros obligatorios; el resto opera igual en ambos estados, porque `access_control.is_self` no mira el estado | No |
| `A3` Profesional coach | `PERSON` con `PROFESSIONAL_PROFILE` que opera mediante `ORGANIZATION_MEMBERSHIP` vigente con rol `coach` | No |
| `A4` Admin de organización | Membresía vigente con rol `admin` | No |
| `A5` Owner de organización | La única membresía activa de la organización con rol `owner`. Puede transferir la propiedad y cerrar la organización mediante comandos atómicos V1 | No |
| `A6` Staff | Membresía vigente con rol `staff`. Gestiona invitaciones y directorio; nunca datos fitness | No |
| `A7` Profesional suplente | `A3` con una suplencia aceptada por la persona y vigente dentro de una relación | No |
| `A8` Backend | La API actuando en nombre de un actor humano. No es un actor autónomo: siempre porta un sujeto | N/A |
| `A9` Worker | Proceso asíncrono con credencial propia y grants mínimos. No hereda permisos de un usuario | N/A |
| `A10` Soporte/operación de plataforma | Persona con rol base `allfit_admin` y deber A10 vigente. Sólo usa métricas o metadatos minimizados y solicita/ejerce su propia ventana break-glass | No |
| `A11` Curador/verificador de plataforma | Persona con rol base y deber vigente de curaduría, verificación o gestión comercial; cada deber es independiente | No |
| `A12` Seguridad/privacidad de plataforma | Persona con rol base y deber vigente para administrar accesos, aprobar o auditar break-glass y gestionar privacidad | No |

`A6` y `A7` fueron incorporados y recertificados en Fase 2 el 26 de julio de 2026. `A10`, `A11` y `A12` son modos de actuación derivados del deber comprobado en la transacción; **nunca** son roles de una organización ni valores aceptados desde el cliente. ADR-028 deja sin efecto la consolidación `DT-019`: el rol base `allfit_admin` permite iniciar sesión, pero no concede una operación sin `support.platform_duty_assignments` vigente y AAL2. **Since ADR-046** the role brings all thirteen duties as rows of that table (`basis = 'admin_role'`) for as long as it lasts, so an administrator acts in every mode. A Backoffice session without the role still holds no duty, and every operation still checks its duty and AAL2 in its own transaction.

### 3.1 Fórmula de acceso profesional

Ninguna operación de `A3`, `A4`, `A6` o `A7` sobre datos de una persona se autoriza sin las diez condiciones del [ERD §7.1](./V1_CONCEPTUAL_ERD.md):

```text
cuenta válida
∧ persona profesional activa
∧ membresía organizacional vigente
∧ capacidad organizacional compatible
∧ relación de servicio vigente
∧ asignación profesional efectiva
∧ grant vigente para esa relación y organización
∧ versión de scope + access level + propósito compatibles
∧ ausencia de denegación aplicable
∧ clasificación/procedencia permitidas
```

Cuando una ficha dice **`FÓRMULA`** en filtros obligatorios, se refiere a estas diez condiciones evaluadas íntegramente en el servidor, dentro de la misma transacción de la operación. Ninguna se evalúa en el cliente y ninguna se cachea.

### 3.2 Roles y capacidades V1

| Rol | Capacidades |
| --- | --- |
| `owner` | Todas las de `admin`, más cerrar la organización. Protegido: toda organización activa tiene exactamente una membresía activa con este rol; el flujo genérico de roles no puede otorgarlo ni retirarlo |
| `admin` | Gestionar sedes, membresías, roles, invitaciones, relaciones, asignación de profesionales, terminación de relaciones y casos históricos mediante `manage_historical_access`. Esta capacidad administra casos y **no** concede lectura |
| `coach` | Crear y publicar contenido, asignar programas, ejercer grants sobre las personas que tiene asignadas, observar y proponer correcciones. `guide_nutrition` puede asociarse al rol, pero solo es efectivo con credencial `nutrition_professional` verificada |
| `staff` | Crear invitaciones y consultar el directorio de personas relacionadas con la organización: nombre, estado de relación y estado de invitación. **Ningún** dato fitness, de perfil, de ejecución, corporal o de salud |

No hay roles personalizados en V1. No hay alcance de rol por sede: `ORGANIZATION_SITE` es informativa.

`manage_historical_access` se asigna mediante `role_capabilities` a `owner` y `admin`, pero solo permite abrir/cerrar casos. `read_frozen_relationship_history` no se asigna a ningún rol: existe únicamente dentro de un `HISTORICAL_ACCESS_CASE` vigente para una membresía exacta.

## 4. Superficies

| Superficie | Base | Sujeto | WorkOS Application |
| --- | --- | --- | --- |
| Space | `api.allfit.com/space/v1` | La persona autenticada | Space |
| Studio | `api.allfit.com/studio/v1` | La organización en la que actúa el profesional | Studio |
| Catálogo | `api.allfit.com/catalog/v1` | Ninguno: contenido global de lectura | Space |
| Backoffice | `api.allfit.com/backoffice/v1` | Persona del equipo + rol base + deber vigente | Backoffice |

Cada superficie versiona su propio ciclo de vida y publica su propio documento OpenAPI. Las cuatro comparten `components` y se sirven desde el mismo despliegue.

`/catalog/v1` is Space's surface, authenticated with a bearer token. Studio and Backoffice do not read the catalogue there: their session cookies carry `Path=/studio/v1` and `Path=/backoffice/v1`, and the browser sends neither anywhere else, so every such read answered 401. Each web product reads the global catalogue inside its own surface, under `/studio/v1/catalog/...` and `/backoffice/v1/catalog/...`, with the same content, the same closed functions and the same operation in this matrix. The contract enforces it: an operation that accepts a cookie outside that cookie's `Path` fails the tests.

En Studio, la organización viaja explícita en la ruta bajo `/organizations/{orgId}/...`. Ninguna operación de Studio que toque datos de una persona puede resolver la organización desde el token o desde una preferencia guardada.

## 5. Convenciones transversales

Estas reglas aplican a todas las fichas. Una ficha solo menciona lo que se desvía de aquí.

### 5.1 Contexto transaccional

- El backend abre la transacción, establece el contexto de autorización **local a la transacción** y ejecuta. Nunca usa contexto de sesión: un pool reutiliza conexiones y un contexto de sesión filtrado entre requests es una brecha de autorización.
- La evaluación de la fórmula de acceso ocurre dentro de esa misma transacción. No se resuelve antes ni se transporta desde un paso previo.
- RLS es defensa en profundidad: la ausencia de un filtro en el código no debe permitir la lectura, pero tampoco se delega en RLS la lógica de autorización.

### 5.2 Idempotencia

- Todo comando HTTP que muta dominio exige `Idempotency-Key` UUIDv4 para replay y `Command-Id` UUIDv7 para identidad durable. El scope actor/client/superficie/operación lo calcula el servidor.
- En las fichas siguientes, la mención abreviada `Idempotency-Key` hereda también el `Command-Id` obligatorio; cada fila describe solo la convergencia adicional del dominio.
- `OP-SUP-003` conserva `N/A`: cada lectura break-glass es una decisión y evento de acceso nuevos; nunca se cachea ni deduplica.
- La respuesta mínima se conserva 24 horas; el tombstone de `Command-Id` permanece mientras el actor o agregado sean invocables. Expirar el replay nunca habilita otra ejecución.
- Misma identidad con hash distinto devuelve `409`; una transacción concurrente sigue bajo unique lock y produce replay o `409 idempotency-in-progress`.
- Los comandos de `SYS` derivan key y command ID UUIDv5 del target y ciclo (`<operación>:<target>:<ventana>`), de modo que reejecutar un job no duplica efectos.
- Ninguna operación logra idempotencia borrando y recreando: los reintentos convergen al mismo estado, no lo reconstruyen.
- El contrato físico, retención y errores están cerrados en [`V1_IDEMPOTENCY_CONTRACT.md`](./V1_IDEMPOTENCY_CONTRACT.md).

### 5.3 Paginación y orden

- Cursor opaco. `limit` por defecto 25, máximo 100.
- Todo orden es estable y determinista: incluye siempre un desempate por identificador.
- El cursor codifica los criterios de orden y filtro; cambiarlos invalida el cursor en vez de devolver resultados incoherentes.
- Una consulta nunca revela mediante `total` o mediante huecos de paginación la existencia de filas que el actor no puede leer. Los conteos se calculan **después** de aplicar denegaciones.

### 5.4 Comportamiento offline

Space es una aplicación Expo: la conectividad intermitente es el caso normal, no el excepcional.

| Estado | Significado | Quién lo produce |
| --- | --- | --- |
| `draft_local` | Existe solo en el dispositivo | Cliente |
| `pending_sync` | Enviado, sin confirmación autoritativa | Cliente |
| `confirmed` | Confirmado por el servidor | Servidor |
| `failed` | Rechazado de forma definitiva | Servidor |

- Solo el registro de ejecución y la edición de perfil admiten `draft_local`.
- Autorización, consentimiento, grants, membresías, asignaciones y terminaciones **fallan cerradas**: nunca se confirman desde caché ni desde un read model atrasado.
- La UI jamás presenta `pending_sync` como confirmación.
- Studio no tiene modo offline: puede conservar borradores no enviados, pero no confirma nada sin estado autoritativo.

### 5.5 Eventos de dominio

- Se escriben en el outbox dentro de la misma transacción del comando. Sin publicación en dos fases y sin publicar antes del commit.
- Nomenclatura `<dominio>.<hecho_en_pasado>.v<n>`.
- El consumo es idempotente: el dispatcher garantiza *at-least-once*, no *exactly-once*.
- Un evento nunca transporta datos sensibles como payload. Transporta identificadores; el consumidor vuelve a autorizar cuando necesita contenido.

### 5.6 Auditoría de accesos

- Toda lectura de datos de una persona amparada por un `DATA_GRANT` escribe un `ACCESS_EVENT` con actor humano real, membresía, asignación profesional, relación, scope, versión y propósito.
- Toda lectura `frozen` añade `historical_access_case_id`, modo `frozen`, recurso, resultado y `request_id`; la asignación profesional no se usa como justificación.
- Registrar solo la organización es insuficiente y se considera un defecto.
- Retención de `ACCESS_EVENT`: 24 meses.
- La escritura del `ACCESS_EVENT` ocurre en la misma transacción de la lectura. Si no puede escribirse, la lectura falla.

### 5.7 Errores

- `application/problem+json` (RFC 9457).
- Un actor sin autorización recibe la misma respuesta ante *no existe* y ante *no puedes verlo*, cuando distinguirlas revelaría la existencia del recurso.
- Los mensajes de validación de contrato de resultados sí son específicos: la persona debe poder corregir su registro.

### 5.8 Zona horaria

Toda sesión conserva la zona horaria de la persona en el momento del hecho. La organización no impone su zona sobre la agenda personal.

## 6. Inventario

| Dominio | Comandos | Consultas | Total |
| --- | --- | --- | --- |
| Identidad | 20 | 11 | 31 |
| Organizaciones | 13 | 5 | 18 |
| Relaciones | 9 | 5 | 14 |
| Privacidad | 13 | 7 | 20 |
| Catálogo | 4 | 8 | 12 |
| Planificación | 19 | 10 | 29 |
| Ejecución | 17 | 13 | 30 |
| Nutrición | 8 | 5 | 13 |
| Pagos | 16 | 7 | 23 |
| Sistema | 10 | 1 | 11 |
| Soporte | 6 | 5 | 11 |
| **Total** | **133** | **75** | **208** |

Algunas fichas cubren dos identificadores cuando la operación es simétrica —crear y editar un borrador, listar y consultar el detalle—. En esos casos el encabezado nombra ambos y el contenido aplica a los dos.

## 7. Operaciones por dominio

### 7.1 Identidad

Este dominio es dueño de `PERSON`, `ACCESS_ACCOUNT`, `ACCESS_SESSION`, `ONBOARDING_ATTEMPT`, `ELIGIBILITY_EVIDENCE`, `FITNESS_PROFILE_CLAIM`, `BODY_PROGRESS_RECORD`, `HEALTH_CONTEXT_CLAIM`, `PROFESSIONAL_PROFILE`, `PROFESSIONAL_PROFILE_SPECIALTY`, `PROFESSIONAL_CREDENTIAL`, `PROFESSIONAL_CREDENTIAL_VERIFICATION`, `INVITATION` e `INVITATION_INTENT`.

Regla que gobierna todo el dominio: **un usuario WorkOS no es una persona**. Ninguna operación crea una `PERSON` sin control personal del sujeto, elegibilidad adulta resuelta y onboarding completo.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-IDN-001` | Iniciar intento de onboarding | Comando | `A1` |
| `OP-IDN-002` | Registrar evidencia de elegibilidad adulta | Comando | `A1` |
| `OP-IDN-003` | Completar onboarding y activar Fitness ID | Comando | `A1` |
| `OP-IDN-004` | Declarar afirmación de perfil | Comando | `A2` |
| `OP-IDN-005` | Corregir afirmación propia | Comando | `A2` |
| `OP-IDN-006` | Registrar medición o foto de progreso corporal | Comando | `A2` |
| `OP-IDN-007` | Eliminar un registro de progreso corporal | Comando | `A2` |
| `OP-IDN-008` | Declarar contexto de salud fitness | Comando | `A2` |
| `OP-IDN-009` | Decidir las intenciones de una invitación | Comando | `A2` |
| `OP-IDN-010` | Crear o actualizar perfil profesional | Comando | `A2` |
| `OP-IDN-011` | Registrar verificación de una credencial profesional | Comando | `A11` |
| `OP-IDN-012` | Consultar mi identidad y cuentas vinculadas | Consulta | `A2` |
| `OP-IDN-013` | Consultar la proyección actual de mi perfil | Consulta | `A2` |
| `OP-IDN-014` | Consultar el historial de un atributo | Consulta | `A2` |
| `OP-IDN-015` | Consultar mis registros de progreso corporal | Consulta | `A2` |
| `OP-IDN-016` | Consultar una invitación por token protegido | Consulta | `A0`, `A1`, `A2` |
| `OP-IDN-017` | Consultar mi perfil profesional | Consulta | `A3` |
| `OP-IDN-018` | Consultar el perfil de entrenamiento de un cliente | Consulta | `A3`, `A7` |
| `OP-IDN-019` | Consultar el progreso corporal de un cliente | Consulta | `A3`, `A7` |
| `OP-IDN-020` | Consultar el contexto de salud de un cliente | Consulta | `A3`, `A7` |
| `OP-IDN-021` | Cambiar mi correo o teléfono de contacto | Comando | `A2` |
| `OP-IDN-022` | Verificar un contacto | Comando | `A2` |
| `OP-IDN-023` | Consultar mis preferencias de notificación | Consulta | `A2` |
| `OP-IDN-024` | Actualizar mis preferencias de notificación | Comando | `A2` |
| `OP-IDN-025` | Iniciar autenticación alojada de Studio | Comando | `A0` |
| `OP-IDN-026` | Completar callback y crear sesión Studio | Comando | `A0` → `A1`, `A2` |
| `OP-IDN-027` | Consultar la sesión actual de Studio | Consulta | `A1`, `A2` |
| `OP-IDN-028` | Cerrar la sesión actual de Studio | Comando | `A1`, `A2` |
| `OP-IDN-029` | Declarar una credencial profesional | Comando | `A2` |
| `OP-IDN-030` | Revisar una credencial profesional | Comando | `A2` |
| `OP-IDN-031` | Retirar una credencial profesional | Comando | `A2` |
| `OP-IDN-032` | Iniciar autenticación Backoffice por contraseña | Comando | `A0` |
| `OP-IDN-033` | Consultar intento de autenticación Backoffice | Consulta | `A0` con cookie temporal |
| `OP-IDN-034` | Verificar TOTP y crear sesión AAL2 Backoffice | Comando | `A0` con intento válido |
| `OP-IDN-035` | Consultar sesión Backoffice | Consulta | `allfit_admin` autenticado |
| `OP-IDN-036` | Cerrar sesión Backoffice | Comando | sesión presente o ausente |
| `OP-IDN-037` | Solicitar recuperación de contraseña Backoffice | Comando | `A0` |
| `OP-IDN-038` | Crear cuenta de Space y enviar código de verificación | Comando | `A0` |
| `OP-IDN-039` | Verificar el código y emitir la primera sesión de Space | Comando | `A0` → `A1` |
| `OP-IDN-040` | Iniciar sesión en Space | Comando | `A0` → `A1`, `A2` |
| `OP-IDN-041` | Renovar la sesión de Space | Comando | `A1`, `A2` |
| `OP-IDN-042` | Pedir el restablecimiento de contraseña de Space | Comando | `A0` |
| `OP-IDN-052` | Reenviar una invitación de equipo desde Backoffice | Comando | `A10` |
| `OP-IDN-053` | Enviar a una persona el flujo oficial de recuperación desde Backoffice | Comando | `A10` |
| `OP-IDN-054` | Reenviar una recuperación en curso desde Backoffice | Comando | `A10` |
| `OP-IDN-055` | Cancelar una recuperación sospechosa desde Backoffice | Comando | `A10` |
| `OP-IDN-056` | Listar mis invitaciones de cliente pendientes | Consulta | `A1`, `A2` |
| `OP-IDN-049` | Consultar mi contexto de salud | Consulta | `A2` |
| `OP-IDN-050` | Eliminar una declaración de contexto de salud | Comando | `A2` |
| `OP-IDN-051` | Reenviar una invitación de cliente desde Backoffice | Comando | `A10` |
| `OP-IDN-043` | Crear el Fitness ID en estado pendiente | Comando | `A1` → `A2` |
| `OP-IDN-044` | Consultar el intento de onboarding abierto | Consulta | `A1` |
| `OP-IDN-045` | Declarar el sexo biológico | Comando | `A2` |
| `OP-IDN-046` | Declarar las zonas de énfasis | Comando | `A2` |
| `OP-IDN-047` | Saltarse un paso del onboarding | Comando | `A2` |
| `OP-IDN-048` | Cerrar sesión Space | Comando idempotente | sesión presente o ausente |
| `OP-IDN-059` | List the body photos a client shows this gym | Consulta | `A3`, `A7` |
| `OP-IDN-060` | Open one body photo a client shows this gym | Consulta | `A3`, `A7` |
| `OP-IDN-061` | Show one of my body photos to one gym | Comando idempotente | `A2` |
| `OP-IDN-062` | Stop showing a body photo to a gym | Comando idempotente | `A2` |

> **`OP-IDN-045` a `OP-IDN-048` estuvieron asignados dos veces, y ya no.** Space los usa
> para el sexo biológico, las zonas de énfasis, saltarse un paso y cerrar sesión. Las
> cuatro operaciones de Backoffice que compartían esos números —reenviar una invitación
> de equipo y las tres de recuperación de acceso— pasaron a `OP-IDN-052` … `OP-IDN-055`.
>
> No era sólo un problema de esta tabla: ambos lados escribían su código en
> `system.idempotency_keys`, así que el recibo dejaba de identificar qué operación había
> ocurrido y el panel técnico mostraba dos cosas distintas bajo el mismo nombre.
>
> Se movieron los de Backoffice y no los de Space por el mismo criterio que rige las
> migraciones: **lo que ya está en historia compartida se queda**. Los de Space entraron
> el `20260913…` y están en `main`; los de Backoffice llegaban sin fusionar. El cambio se
> hizo archivo por archivo, no reemplazando la cadena: esos mismos códigos aparecen en
> migraciones, en el cliente de cierre de sesión y en pantallas de onboarding de Space
> con el otro significado.
>
> **`OP-IDN-056` is assigned twice in the OpenAPI, and still is.** It names
> `listMySpaceClientInvitations` (TECH-28) and `recordMyBodyPhoto` (TECH-31), whose
> receipt in `system.idempotency_keys` uses that code. The listing is a query and writes
> no receipt, so no receipt is ambiguous today, but the body photo operations
> (`OP-IDN-056` to `OP-IDN-058` in the contract) have no card here yet. `OP-IDN-059` to
> `OP-IDN-062` were checked free in both the OpenAPI and this matrix.

---

#### `OP-IDN-001` — Iniciar intento de onboarding

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/onboarding-attempts` o `POST /studio/v1/onboarding-attempts` |
| **Actor** | `A1` — usuario WorkOS válido sin persona vinculada |
| **Filtros obligatorios** | `ACCESS_ACCOUNT` derivado de `(issuer, subject)` del token verificado; la cuenta no debe tener ya una `PERSON` vinculada |
| **Transacción** | Crear `ONBOARDING_ATTEMPT` y vincularlo a la cuenta externa. Si el flujo viene de una invitación, congelar el token de referencia sin materializar ninguna intención |
| **Idempotencia** | `Idempotency-Key`. Una cuenta con un intento abierto y no vencido recibe el mismo intento en lugar de uno nuevo |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | No admite `draft_local`: sin estado autoritativo no hay onboarding. Dos peticiones concurrentes convergen al mismo intento |
| **Información sensible** | Ninguna categoría fitness. Identificadores de cuenta y, si existe, token de invitación |
| **Evento de dominio** | `identity.onboarding_attempt_started.v1` |
| **Reglas** | No crea `PERSON`, perfil, relación, grant ni membresía. No marca la invitación como aceptada. Un intento tiene vencimiento propio |
| **Falla cerrada** | Sin token verificable, sin respuesta |

#### `OP-IDN-002` — Registrar evidencia de elegibilidad adulta

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/onboarding-attempts/{id}/eligibility-evidence` o `POST /studio/v1/onboarding-attempts/{id}/eligibility-evidence` |
| **Actor** | `A1`, dueño del intento |
| **Filtros obligatorios** | El intento pertenece a la cuenta autenticada y está abierto |
| **Transacción** | Crear `ELIGIBILITY_EVIDENCE` aplicando la **versión vigente** de la política adulta y congelarla en la evidencia |
| **Idempotencia** | `Idempotency-Key`. Reenviar la misma evaluación no crea otra evidencia; una evaluación distinta se añade como intento adicional, append-only |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Sin conexión no hay evaluación |
| **Información sensible** | Declaración explícita de tener al menos 18 años bajo la política adulta V1 para Colombia. No se almacena fecha de nacimiento |
| **Evento de dominio** | `identity.eligibility_evaluated.v1` |
| **Reglas** | `fail` y `review_required` **no** son elegibilidad. La ausencia de evidencia tampoco. Un intento no elegible no crea perfil, ni datos fitness, ni persona parcial |
| **Falla cerrada** | Cualquier error de evaluación deja el intento como no elegible |

#### `OP-IDN-003` — Completar onboarding y activar Fitness ID

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/onboarding-attempts/{id}/completion` o `POST /studio/v1/onboarding-attempts/{id}/completion` |
| **Actor** | `A2` en `pending_activation`, dueño del intento |
| **Filtros obligatorios** | Intento abierto y propio, con `PERSON` ya creada en `pending_activation`, `ELIGIBILITY_EVIDENCE` en estado `pass` vigente, y aceptación de `platform_terms_v1` y `privacy_notice_v1` |
| **Transacción** | Una sola: pasar la `PERSON` de `pending_activation` a `active` sellando `activated_at`, registrar las versiones legales aceptadas, cerrar el `ONBOARDING_ATTEMPT` como `activated` y, si el intento porta una invitación, marcarla como reclamable por esa persona **sin** materializar intenciones |
| **Idempotencia** | `Idempotency-Key`. Un reintento sobre un intento ya activado devuelve la misma `PERSON`; nunca crea una segunda |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Dos peticiones concurrentes producen una sola persona: la unicidad se resuelve en la base, no en el cliente |
| **Información sensible** | Datos identificativos básicos |
| **Evento de dominio** | `identity.person_activated.v1` |
| **Reglas** | **Ya no crea la persona: la activa.** Es el único camino que lleva un Fitness ID a `active`, y no mueve ningún dato de sitio — lo que se respondió durante el onboarding ya está escrito sobre la persona. Studio puede invocarlo exclusivamente para que el titular autenticado complete su propia activación; nunca puede activar a otra persona ni adquirir por ello potestades organizacionales. Reactivar una persona ya `active` devuelve la misma y no vuelve a sellar `activated_at` |
| **Falla cerrada** | Sin elegibilidad `pass` no hay persona, aunque la invitación exista y esté vigente |

#### `OP-IDN-004` — Declarar afirmación de perfil

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/profile/claims` |
| **Actor** | `A2` |
| **Filtros obligatorios** | El sujeto de la afirmación es siempre la persona autenticada. El atributo pertenece al catálogo de atributos de perfil V1 |
| **Transacción** | Crear `FITNESS_PROFILE_CLAIM` con procedencia `person_declared`, autor, instante y vigencia |
| **Idempotencia** | `Command-Id = FITNESS_PROFILE_CLAIM.id`; replay HTTP por `Idempotency-Key`. La PK y el receipt durable impiden una segunda afirmación del mismo comando |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local`. Dos declaraciones concurrentes del mismo atributo coexisten y la proyección resuelve cuál es la vigente por reglas versionadas |
| **Información sensible** | Perfil fitness. Solo visible bajo `relationship_training` y según el field-set del grant |
| **Evento de dominio** | `identity.profile_claim_declared.v1` |
| **Reglas** | Nunca sobrescribe una observación profesional ni una inferencia sobre el mismo atributo: las afirmaciones **coexisten** con procedencias distintas. Declarar no verifica |
| **Falla cerrada** | Atributo desconocido, rechazo |

#### `OP-IDN-005` — Corregir afirmación propia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/profile/claims/{id}/revisions` |
| **Actor** | `A2`, autor de la afirmación |
| **Filtros obligatorios** | La afirmación es propia y su procedencia es `person_declared` |
| **Transacción** | Crear `REVISION_EVENT` con before/after, actor y motivo; marcar la vigencia de la afirmación anterior |
| **Idempotencia** | `Command-Id = REVISION_EVENT.id`; replay HTTP por `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local`. La revisión es append-only: dos correcciones concurrentes producen dos revisiones ordenadas, no una pérdida |
| **Información sensible** | Perfil fitness |
| **Evento de dominio** | `identity.profile_claim_revised.v1` |
| **Reglas** | No destruye el valor original ni la nota de procedencia. Una persona no puede revisar una `PROFESSIONAL_OBSERVATION`; para eso existe el flujo de propuesta inverso |
| **Falla cerrada** | Afirmación de otra procedencia, rechazo |

#### `OP-IDN-006` — Registrar medición o foto de progreso corporal

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/body-progress` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Sujeto = persona autenticada |
| **Transacción** | Crear `BODY_PROGRESS_RECORD` con valor, unidad canónica, unidad original y procedencia. Si incluye imagen: almacenar el binario **sin EXIF ni geolocalización** y registrar la referencia en la misma transacción |
| **Idempotencia** | `Command-Id = BODY_PROGRESS_RECORD.id`; replay HTTP por `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local`; la imagen se sube al recuperar conexión y el registro queda `pending_sync` hasta confirmar |
| **Información sensible** | **Progreso corporal.** Categoría independiente: solo visible con `body_progress`. Una carga de ejercicio visible no implica que el peso corporal lo sea |
| **Evento de dominio** | `identity.body_progress_recorded.v1` |
| **Reglas** | El despojo de metadatos ocurre en el servidor, no en el cliente. La galería del dispositivo nunca se expone: solo la selección explícita |
| **Falla cerrada** | Si el despojo de metadatos falla, no se almacena la imagen |

**Implementado (`identity.record_body_progress`, `POST /space/v1/body-progress` → 201).** El cuerpo trae exactamente `metric_code`, `value`, `unit_code` y `measured_on`; cualquier otro campo, incluido uno de imagen, responde 422 en vez de ignorarse. **La imagen todavía no se acepta:** el despojo de metadatos en el servidor es su propia pieza, y hasta entonces ningún registro dice tener una. El valor se convierte a la unidad canónica de la dimensión y lo que la persona escribió se conserva a su lado; una unidad de otra dimensión o un valor sobre el tope de la medida responde 422. Un replay con la misma llave devuelve el mismo registro con `Idempotent-Replay: true`; la misma llave con otro cuerpo responde 409. No hay `draft_local` ni `pending_sync` en el servidor: el dispositivo guarda el comando y lo reenvía con el mismo `Command-Id`.

#### `OP-IDN-007` — Eliminar un registro de progreso corporal

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `DELETE /space/v1/body-progress/{id}` |
| **Actor** | `A2`, dueño del registro |
| **Filtros obligatorios** | El registro pertenece a la persona autenticada |
| **Transacción** | Crear `DISPOSITION_CASE` de alcance unitario con su `DISPOSITION_ITEM`, ejecutar la eliminación del original y encolar la propagación a derivados, cachés y almacenamiento |
| **Idempotencia** | `Idempotency-Key`. Eliminar dos veces converge al mismo estado |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada: una eliminación no se confirma desde el dispositivo |
| **Información sensible** | Progreso corporal |
| **Evento de dominio** | `privacy.disposition_case_opened.v1` |
| **Reglas** | Eliminar un dato propio no es una revocación de scope y no altera los grants. Un profesional que ya lo vio conserva su `ACCESS_EVENT`, no el dato |
| **Falla cerrada** | Si el borrado del binario no puede confirmarse, el caso queda abierto y reintenta; no se reporta como completado |

**Implementado (`identity.delete_body_progress`, `DELETE /space/v1/body-progress/{recordId}` → 200).** Todo ocurre en una transacción: abre el caso con origen `request` y su ítem bajo la política `body`/`CO` vigente, encola `privacy.disposition_case_opened.v1`, registra el evento de disposición, marca el ítem ejecutado soltando su target, borra la fila y cierra el caso. Responde `{body_progress_record_id, disposition_case_id, status: "deleted"}`. Como aún no hay binarios, no hay nada que propagar y el caso no queda abierto. Desde `20260922120000`, reintentar el registro de una medición ya borrada (`OP-IDN-006`) responde `410` en vez de un resultado vacío; lo mismo `OP-IDN-008` con una declaración. Un replay con la misma llave devuelve la misma respuesta; **un segundo borrado con otra llave responde 404**, igual que el registro de otra persona, porque la fila ya no existe. El mismo estado final sí converge.

#### `OP-IDN-008` — Declarar contexto de salud fitness

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/health-context` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Sujeto = persona autenticada. El tipo declarado pertenece al catálogo minimizado V1 (dolor, limitación, recuperación) |
| **Transacción** | Crear `HEALTH_CONTEXT_CLAIM` con procedencia y vigencia |
| **Idempotencia** | `Command-Id = HEALTH_CONTEXT_CLAIM.id`; replay HTTP por `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local` |
| **Información sensible** | **Contexto de salud.** La categoría más restrictiva de V1: solo visible con `health_context` |
| **Evento de dominio** | `identity.health_context_declared.v1` |
| **Reglas** | No representa historia clínica, diagnósticos, laboratorios, biometría continua ni documentos médicos. Un dolor registrado dentro de una sesión hereda esta clasificación y permanece oculto sin el scope, aunque la sesión sea visible |
| **Falla cerrada** | Tipo fuera del catálogo minimizado, rechazo |

**Implementado (`identity.record_health_context`, `POST /space/v1/health-context` → 201).** El cuerpo trae `context_type`, `description` y `valid_from`, y opcionalmente `body_area` y `valid_to`; cualquier otro campo responde 422 en vez de ignorarse. La descripción tiene hasta 500 caracteres y se guarda sin espacios alrededor; la zona sale de una lista cerrada de catorce; `valid_from` no es posterior a mañana y `valid_to`, si llega, es posterior a `valid_from`. La procedencia la fija el servidor en `person_declared`. Un campo opcional ausente viaja y se resume como `null`, así que un reintento que lo envía explícito repite el mismo registro. No hay `draft_local` en el servidor: el dispositivo guarda el comando y lo reenvía con el mismo `Command-Id`.

#### `OP-IDN-009` — Decidir las intenciones de una invitación

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/invitations/decisions` para staff; `POST /space/v1/client-invitations/decisions` para clientes. El cuerpo nombra la invitación por `token` o, en Space, por `invitation_id`: exactamente uno de los dos |
| **Actor** | `A2` |
| **Filtros obligatorios** | Invitación pendiente, vigente y dirigida al email verificado exacto de la persona autenticada. Staff admite una única intención `membership`; cliente decide cada intención y cada `INVITATION_SCOPE_OPTION` presentada |
| **Transacción** | Staff: bloquear invitación, aceptar o rechazar, crear/reutilizar membresía activa y añadir solo el rol faltante. Cliente: materializar **como máximo un destino** por intención; relación, consentimientos, grants concedidos y programa dependiente se confirman juntos. Los dos flujos preservan evidencia y no mezclan entidades |
| **Idempotencia** | `Idempotency-Key` y `Command-Id`. Un reintento no duplica membresías, roles, relaciones, grants ni asignaciones |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Dos decisiones concurrentes materializan un solo destino; en staff, aceptación y revocación bloquean la misma fila y gana la primera confirmada |
| **Información sensible** | Identidad y vínculo. Ningún dato fitness cambia de manos aquí |
| **Evento de dominio** | `identity.invitation_intent_decided.v1`, más los eventos del dominio destino y `privacy.grant_created.v1` / `privacy.grant_rejected.v1` por opción decidida |
| **Reglas** | Staff se decide exclusivamente en Studio y nunca crea perfil de cliente, relación, scope o grant. Cliente se decide exclusivamente en Space: relación, programa y cada scope son independientes aunque se confirmen en una sola acción. Activar la persona no acepta ninguna intención |
| **Falla cerrada** | Dependencia faltante, la intención queda pendiente y no se materializa nada |
| **Implemented (program, STUDIO-16)** | `identity.decide_client_invitation` and `identity.decide_my_client_invitation` gain `p_program_decision` and `p_timezone`, defaulting to null (migration `20261106090000_an_invitation_can_offer_a_first_program.sql`). The program intent is locked with the invitation. Absent, `program_decision` declines the program (silence is not consent), and declining the relationship declines it too. Accepted, `planning.plant_invited_program` runs as her inside the same transaction, once the relationship exists and her grants are known: it holds the version `for share` while it is `published`, creates the managed assignment (`active`, `origin_relationship_id` = the new relationship, first in her order), opens the management period and plants the calendar as `OP-PLN-010` does (a finite version whole, an open-ended one its first week). Start: the proposed day or today, whichever is later. Zone: `p_timezone`, else the zone of her last **personal** assignment, else Studio's. **Deviation from the fail-closed row above:** a missing dependency does not leave the program intent pending; it is recorded as `accepted` with `unmaterialized_reason` (`training_not_granted` when she did not grant `relationship_training` at `contribute`, `program_unavailable` when the version is no longer published) and no assignment, so the invitation completes and the answer says why. Nothing substitutes another version. A `program_decision` on an invitation with no program answers `22023` `["program-decision"]`, an unknown zone `["timezone"]`. One `identity.invitation_intent_decided.v1` is enqueued per intent decided, and `planning.assignment_created.v1` when the program is created. The result adds `program_proposal`. |
| **Implementado (cliente, Space)** | `identity.decide_client_invitation` por token e `identity.decide_my_client_invitation` por identificador (migración `20261021120000`). La segunda solo busca el hash del token de esa invitación y llama a la primera, así que la prueba del correo verificado exacto y todas las reglas de la decisión viven en un solo lugar (`ADR-001`): tener el identificador no basta, igual que no basta tener el enlace. El token nunca se guarda en claro, solo su hash. Un identificador inexistente responde `404`, igual que una invitación inválida o vencida: no se distinguen (`ADR-008`). El cuerpo con `token` e `invitation_id` a la vez, o con ninguno, es `400`. **Ofrecer un programa dentro de la invitación no está construido en ninguna capa**: `OP-REL-001` no emite la intención `program_assignment` y aquí no hay nada que decidir sobre ella; queda en un ticket aparte. El titular se asigna después, en Studio (`HU-STUDIO-023`, `OP-REL-002`) |

#### `OP-IDN-010` — Crear o actualizar perfil profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PUT /studio/v1/me/professional-profile` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Sujeto = persona autenticada |
| **Transacción** | Crear o actualizar `PROFESSIONAL_PROFILE` y reemplazar atómicamente sus relaciones `PROFESSIONAL_PROFILE_SPECIALTY` por códigos publicados |
| **Idempotencia** | `Idempotency-Key`. `PUT` con el mismo contenido no genera revisión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | Presentación profesional. No es dato fitness |
| **Evento de dominio** | `identity.professional_profile_updated.v1` |
| **Reglas** | El perfil profesional pertenece a la **persona**, no a la organización, y sobrevive al cambio de organización. El payload contiene titular, biografía, `practice_started_year` y al menos una especialidad publicada; los años de experiencia se derivan. No acepta credenciales embebidas ni un indicador global de verificación. Existir no habilita operar: para prestar servicio hace falta membresía vigente. No es un perfil público ni un listing de marketplace |
| **Falla cerrada** | Año futuro, especialidad inexistente/deprecada o perfil de otra persona: rechazo sin escritura parcial |

#### `OP-IDN-011` — Registrar verificación de una credencial profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/verifications` |
| **Actor** | `A11` con `verify_professional_credentials`, AAL2 y deber vigente |
| **Filtros obligatorios** | Versión exacta de `PROFESSIONAL_CREDENTIAL`; método `official_registry_lookup` o `issuer_confirmation`; evidencia mínima; ausencia de conflicto; `valid_to` obligatorio y `<= min(vencimiento fuente, 12 meses)` |
| **Transacción** | Crear `PROFESSIONAL_CREDENTIAL_VERIFICATION` append-only con política, método, fuente, fingerprint, resultado y vigencia |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | `identity_pii`; la proyección ordinaria nunca devuelve referencia de fuente ni fingerprint |
| **Evento de dominio** | `identity.professional_credential_verified.v1` |
| **Reglas** | Verificar **una versión exacta** no marca otras credenciales ni convierte el perfil en verificado. Revisar materialmente la credencial crea otra versión sin heredar el estado. Vencer, revocar, renovar o apelar crea otro evento. Documento, edad, salud, dispositivo, afiliación y perfil completo no son verificables en V1. La verificación no amplía scopes |
| **Falla cerrada** | Evidencia ausente/ambigua, método no permitido, conflicto, AAL2/deber ausente o vencido: `unverifiable`/denegación; nunca `verified` |
| **Gobernanza** | Catálogo, conflictos, vigencia y `T-VG-01..06` en [`V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md`](./V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md) |

#### `OP-IDN-012` — Consultar mi identidad y cuentas vinculadas

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/me` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable en el cliente para presentación; nunca para decidir permisos |
| **Información sensible** | Identidad básica |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve el Fitness ID y las cuentas vinculadas, no los grants concedidos ni las relaciones: esos son recursos propios |
| **Falla cerrada** | — |

#### `OP-IDN-013` — Consultar la proyección actual de mi perfil

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/profile` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Perfil fitness completo, incluidas categorías que ninguna organización ve |
| **Evento de dominio** | Ninguno |
| **Reglas** | La proyección aplica reglas versionadas de selección y **explica** qué afirmación eligió y por qué. Nunca destruye las alternativas ni oculta la procedencia. La persona ve todo lo suyo: declaraciones, observaciones profesionales, mediciones, inferencias y verificaciones |
| **Falla cerrada** | — |

#### `OP-IDN-014` — Consultar el historial de un atributo

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/profile/attributes/{code}/claims` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: instante de afirmación descendente, desempate por identificador |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Perfil fitness |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve las afirmaciones coexistentes con su procedencia, autor capturador, método y estado de verificación como **dimensiones separadas** |
| **Falla cerrada** | — |

#### `OP-IDN-015` — Consultar mis registros de progreso corporal

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/body-progress` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: fecha de medición descendente, desempate por identificador |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Progreso corporal |
| **Evento de dominio** | Ninguno |
| **Reglas** | Las URLs de imagen son firmadas, de vigencia corta y no enumerables |
| **Falla cerrada** | — |

**Implementado (`identity.list_body_progress`).** `limit` entre 1 y 200 (50 por defecto); el cursor es el par `before_measured_on` + `before_id`, los dos o ninguno. Responde `{items, has_more}`. Cada ítem trae el valor normalizado, el original, la fecha, `has_media` y `recorded_at`; nunca `person_id` ni la referencia del medio. Todavía no hay URLs de imagen porque todavía no hay imágenes.

#### `OP-IDN-016` — Consultar una invitación por token protegido

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `POST /studio/v1/invitations/resolve` para staff; `POST /space/v1/invitations/resolve` para clientes. El token viaja en el cuerpo |
| **Actor** | `A0`, `A1`, `A2` |
| **Filtros obligatorios** | Token válido y pendiente. Inválido, vencido, revocado y consumido devuelven el mismo `404` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Límite perimetral de resolución por IP y respuesta `429` con `Retry-After` |
| **Información sensible** | Identidad de la organización invitante y contenido mínimo de las intenciones; nunca el email destinatario |
| **Evento de dominio** | Ninguno |
| **Reglas** | Staff muestra organización, responsable, rol y vencimiento únicamente en Studio. Cliente muestra en Space relación, programa y scopes por separado. El token nunca aparece en path, query, logs o referrers; consultar no acepta ni materializa nada |
| **Falla cerrada** | Token inválido y token vencido devuelven la misma respuesta |

#### `OP-IDN-017` — Consultar mi perfil profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/me` |
| **Actor** | `A3` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | Presentación profesional y credenciales declaradas; sin evidencia interna de verificación |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve titular, biografía, año de inicio, años derivados, especialidades publicadas, credenciales y el estado/vigencia proyectados de cada credencial; nunca evidencia interna ni una bandera global de perfil verificado. Incluye un resumen de membresías; el detalle es `OP-ORG-014` |
| **Falla cerrada** | — |

#### `OP-IDN-018` — Consultar el perfil de entrenamiento de un cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/profile` |
| **Actor** | `A3`, `A7` con asignación efectiva |
| **Filtros obligatorios** | **FÓRMULA** + `relationship_training` · `read`. Field-set de la **versión congelada en el grant**, no de la última publicada |
| **Transacción** | Ninguna. Lectura por `identity.v_client_profile` y `ACCESS_EVENT` en la misma transacción |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Nunca cacheable para decidir acceso; `private, no-store` |
| **Información sensible** | Perfil fitness. **Ningún** atributo clasificado como corporal o de salud viaja por aquí |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve cada afirmación con procedencia, actor capturador, método y estado de verificación como **dimensiones separadas**. Dos organizaciones con versiones de scope distintas reciben field-sets distintos de la misma persona. Un campo redactado es indistinguible de uno no capturado |
| **Falla cerrada** | Sin grant vigente: `403 scope-required` declarando qué scope y nivel faltan, y `ACCESS_EVENT` de intento denegado |
| **Implemented (STUDIO-44)** | `identity.read_client_training_profile(person, organization, subject)` returning `{outcome}`, migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`; `cookieAuth`, `private, no-store`, answering `ClientTrainingProfile`. **Who:** the coach who attends her now (`execution.require_attending_coach`): a live membership, her `active` relationship with this organization, and the holder or an accepted cover. Anyone else, admin and owner included, gets `404`, the same as for a person who is not a client. With no active `relationship_training` grant it answers `403 scope-required` naming the scope, after a `denied` access event; otherwise the `allowed` event, with the grant and its version, is written before any data. It returns her live claims (`valid_to is null`) of the attributes classified `training`, each with `provenance` and `valid_from`, and `biological_sex` as `{value, provenance: 'person_declared'}`; nothing classified body or health. Each field is served only if the grant's frozen version names it (`privacy.scope_allows`), otherwise it is `null`. **Not built:** the capturing actor, method and verification status, which have no columns; `biological_sex` has no column for its origin either. Tests: `T-IDN-AUTHORIZED-01`, `T-IDN-AUTHORIZED-API-HTTP-01..14` |

#### `OP-IDN-019` — Consultar el progreso corporal de un cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/body-progress` |
| **Actor** | `A3`, `A7` con asignación efectiva |
| **Filtros obligatorios** | **FÓRMULA** + `body_progress` · `read` |
| **Transacción** | Ninguna. Lectura por `identity.v_client_body_progress` y `ACCESS_EVENT` en la misma transacción |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: `measured_on` descendente, desempate por identificador |
| **Offline / concurrencia** | Nunca cacheable; `private, no-store` |
| **Información sensible** | **Progreso corporal.** Categoría independiente de entrenamiento |
| **Evento de dominio** | Ninguno |
| **Reglas** | Solo mediciones y composición seleccionadas, con unidad canónica y original. Las fotos son **únicamente las elegidas por la persona**, servidas por URL firmada de vigencia corta y no enumerable. EXIF, geolocalización y galería no seleccionada nunca viajan |
| **Falla cerrada** | Sin grant vigente: `403 scope-required` y `ACCESS_EVENT` denegado. Que la carga de ejercicio sea visible no implica que el peso corporal lo sea |
| **Implemented (STUDIO-45)** | `identity.list_client_body_progress(person, organization, subject, limit, cursor_measured_on, cursor_id)`, migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`; `cookieAuth`, `private, no-store`, answering `ClientBodyProgressPage` with `applied_scope`. Same attending coach, same `403 scope-required` and same access record as `OP-IDN-018`, under `body_progress`. Keyset on (`measured_on desc`, `id desc`), page cap 101; the API asks for one row more than it shows. Each field follows the frozen version, and **a version that does not share `measured_on` lists no row**, so neither the cursor nor a page boundary gives the day away. **Photos are not in this list and are not signed URLs:** they are `OP-IDN-059` and `OP-IDN-060`, read through the API. Tests: `T-IDN-AUTHORIZED-01` |

#### `OP-IDN-020` — Consultar el contexto de salud de un cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/health-context` |
| **Actor** | `A3`, `A7` con asignación efectiva |
| **Filtros obligatorios** | **FÓRMULA** + `health_context` · `read` |
| **Transacción** | Ninguna. Lectura por `identity.v_client_health_context` y `ACCESS_EVENT` en la misma transacción |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: vigencia descendente |
| **Offline / concurrencia** | Nunca cacheable; `private, no-store` |
| **Información sensible** | **Contexto de salud.** La categoría más restrictiva de V1 |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve dolor, limitación y recuperación declarados, minimizados. Historia clínica, diagnósticos, laboratorios, documentos médicos, biometría continua e inferencias médicas **no existen bajo ningún scope V1**. Un dolor registrado dentro de una sesión se sirve por aquí, no por la ejecución: hereda esta clasificación aunque la sesión sea visible |
| **Falla cerrada** | Sin grant vigente: `403 scope-required` y `ACCESS_EVENT` denegado. No tiene ruta histórica: un grant `frozen` nunca la sirve |
| **Implemented (STUDIO-46)** | `identity.list_client_health_context(person, organization, subject, limit, cursor_valid_from, cursor_id)`, migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`; `cookieAuth`, `private, no-store`, answering `ClientHealthContextPage`. Same attending coach, same `403 scope-required` and access record, under `health_context`. Only an `active` grant on an `active` relationship serves it: once the relationship ends and its grants freeze, the read is `404`. Keyset on (`valid_from desc`, `id desc`); the same set as her own list, with `context_type`, `description`, `body_area`, `provenance`, `valid_from` and `valid_to`, each as the frozen version allows; a version that does not share `valid_from` lists no row. **Not built:** pain recorded inside a session is not served here yet; sessions carry no pain since STUDIO-48. Tests: `T-IDN-AUTHORIZED-01` |

#### `OP-IDN-021` — Cambiar mi correo o teléfono de contacto

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PATCH /space/v1/me/contact` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Sujeto = persona autenticada. Formato válido; teléfono en E.164 |
| **Transacción** | Registrar el contacto **pendiente de verificación** sin sustituir todavía el vigente, y emitir el desafío de verificación. El contacto anterior sigue siendo el efectivo hasta que el nuevo se verifique |
| **Idempotencia** | `Idempotency-Key`. Reenviar el mismo cambio reutiliza el desafío vigente en lugar de crear otro |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | `identity_pii` |
| **Evento de dominio** | `identity.contact_changed.v1` |
| **Reglas** | **El correo de contacto y el correo de ingreso son el mismo dato.** Cambiarlo actualiza también la identidad en WorkOS AuthKit, y ambos lados quedan consistentes o no se aplica ninguno. El dueño del dato es el perfil de la persona, no el proveedor de autenticación. Un contacto en uso por otra persona se rechaza **sin revelar** que existe: el mensaje es el mismo que para un formato inválido, porque distinguirlos filtraría quién tiene cuenta en Allfit |
| **Falla cerrada** | Si WorkOS AuthKit o el envío del desafío no confirman, no se cambia nada: nunca queda un correo distinto a cada lado |

#### `OP-IDN-022` — Verificar un contacto

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/me/contact/verification` |
| **Actor** | `A2`, titular del contacto |
| **Filtros obligatorios** | Desafío vigente, no vencido y del propio sujeto |
| **Transacción** | Marcar el contacto como verificado, promoverlo a vigente y fijar su marca de verificación |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | `identity_pii` |
| **Evento de dominio** | `identity.contact_verified.v1` |
| **Reglas** | Un contacto **sin verificar no recibe notificaciones** y no satisface el filtro de `OP-SYS-002`. Verificar no concede ningún acceso ni cambia permisos |
| **Falla cerrada** | Desafío vencido o ajeno: rechazo, y el contacto anterior permanece vigente |

#### `OP-IDN-023` — Consultar mis preferencias de notificación · `OP-IDN-024` — Actualizarlas

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta · Comando |
| **Superficie** | `GET /space/v1/me/notification-preferences` · `PUT /space/v1/me/notification-preferences` |
| **Actor** | `A2` |
| **Filtros obligatorios** | `person_id = access_control.person()` |
| **Transacción** | Consulta: ninguna. Comando: reemplazo atómico del conjunto de preferencias |
| **Idempotencia** | `Idempotency-Key`. `PUT` con el mismo contenido no genera cambio |
| **Paginación y orden** | No aplica: el catálogo de categorías y canales es cerrado y pequeño |
| **Offline / concurrencia** | Cacheable para presentación; el cambio exige conexión |
| **Información sensible** | `operational` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Es el dato que hace evaluable el filtro obligatorio de `OP-SYS-002`. Las notificaciones de seguridad **no se pueden desactivar**. Ninguna organización lee ni escribe estas preferencias. Desactivar un canal no cancela la operación de negocio que lo hubiera usado, **salvo** en `OP-REL-003`, donde la notificación es parte de la transacción |
| **Falla cerrada** | Categoría o canal fuera del catálogo: rechazo |

#### `OP-IDN-025` — Iniciar autenticación alojada de Studio

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando técnico sin escritura de dominio |
| **Superficie** | `GET /studio/v1/auth/start` |
| **Actor** | `A0` |
| **Filtros obligatorios** | Origen y callback configurados para Studio; `state` criptográficamente aleatorio |
| **Transacción** | Ninguna. Crea una cookie temporal `HttpOnly`, `SameSite=Lax`, limitada a `/studio/v1/auth`, y redirige al flujo alojado de WorkOS AuthKit |
| **Idempotencia** | No aplica; cada inicio genera un `state` nuevo |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Exige conexión; dos inicios son flujos independientes y solo el `state` presentado puede completarse |
| **Información sensible** | El `state` no es identidad ni autorización y nunca se registra |
| **Evento de dominio** | Ninguno |
| **Reglas** | No crea `PERSON`, `ACCESS_ACCOUNT` ni sesión de producto |
| **Falla cerrada** | Configuración incompleta o proveedor no disponible: no redirige a un destino alternativo |
| **As implemented, step-up (STUDIO-54..56)** | `GET /studio/v1/auth/start?reauthenticate=true` asks WorkOS for `max_age=0` (`maxAgeSeconds: 0` in the `auth-provider` port), so WorkOS asks for the credentials again whatever session it holds. Studio uses it when an operation answers `403 reauthentication-required`; the new sign-in counts as recent for ten minutes. Without the parameter, nothing changes |

#### `OP-IDN-026` — Completar callback y crear sesión Studio

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `GET /studio/v1/auth/callback` |
| **Actor** | `A0` que pasa a `A1` o `A2` después de verificar WorkOS |
| **Filtros obligatorios** | `state` presente, vigente y coincidente; token firmado para Studio; `sub` del intercambio igual al JWT; `sid` presente |
| **Transacción** | Resolver o crear una sola `ACCESS_ACCOUNT` por `(provider, issuer, subject)` y crear/reemplazar `ACCESS_SESSION` por `(surface, sid)`; la llamada a WorkOS ocurre fuera de PostgreSQL |
| **Idempotencia** | La unicidad converge; un callback ya consumido se rechaza por `state` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Exige conexión. La base serializa la cuenta y reemplaza atómicamente la sesión del mismo `sid` |
| **Información sensible** | Cookie opaca de 256 bits; solo su SHA-256 se persiste. Access y refresh tokens se cifran con AES-256-GCM y AAD ligada a cuenta, superficie y `sid` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Una autenticación válida puede crear `ACCESS_ACCOUNT`, pero nunca `PERSON`. Redirige `303` a Studio sin tokens, códigos ni identificadores en la URL |
| **Falla cerrada** | Cualquier mismatch de `state`, `sub`, `sid`, issuer o superficie impide crear la sesión. An expired or missing `state` cookie (it lasts ten minutes) never uses the code: the callback redirects `303` to the Studio landing with `?access=expired`, which explains it and offers a fresh sign-in |
| **As implemented, when she authenticated (STUDIO-54..56)** | The verified token's `auth_time` travels as `VerifiedToken.authenticatedAt`, null when the token does not say. It is the one bounded exception to «use only `sub` and `sid`» (monorepo `AGENTS.md` §6): authentication, never authorization. The callback passes it as the seventh argument of `identity.create_access_session`, which stores it in `identity.access_sessions.authenticated_at`; replacing the session of the same `sid` overwrites it. An instant more than a minute in the future is `22023`. A refresh (`identity.rotate_access_session`) never advances it. Migration `20261116090000_a_case_opens_the_frozen_history.sql` |

#### `OP-IDN-027` — Consultar la sesión actual de Studio

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/session` |
| **Actor** | `A1`, `A2` mediante cookie opaca `HttpOnly` |
| **Filtros obligatorios** | Hash de cookie, superficie `studio`, sesión no revocada y token verificable; persona activa cuando existe vínculo |
| **Transacción** | Cargar por función cerrada. El contexto `app.actor_*` se fija localmente en la transacción para resolver cuenta/persona por RLS |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | `private, no-store`. Refresh fuera de transacción y persistencia compare-and-swap; el perdedor recarga la versión ganadora |
| **Información sensible** | Responde solo `authenticated: true` y `registration_status`; nunca IDs ni tokens |
| **Evento de dominio** | Ninguno |
| **Reglas** | Sin `person_id`: `registration_incomplete`. Persona activa: `complete`. Persona cerrada: revoca y responde `account-closed` |
| **Falla cerrada** | Error terminal revoca; fallo transitorio conserva una sesión aún vigente y responde indisponibilidad si ya venció |
| **As implemented, recent sign-in (STUDIO-54..56)** | `StudioSession` adds the required, nullable `recent_authentication_expires_at`: until when this session's sign-in counts as recent, as `identity.load_access_session` computes it (`authenticated_at` plus `identity.recent_authentication_window()`, ten minutes). It is null when WorkOS did not say when she authenticated, and for every session created before the migration. It only tells the step-up screen when to ask; PostgreSQL decides again on every operation that needs it |

#### `OP-IDN-028` — Cerrar la sesión actual de Studio

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/auth/logout` |
| **Actor** | `A1`, `A2`; idempotente si la cookie o sesión ya no existen |
| **Filtros obligatorios** | `Origin` exactamente igual al origen de `STUDIO_WEB_URL` |
| **Transacción** | Cargar el `sid`, revocar la sesión local y borrar la cookie; luego redirigir `303` al logout alojado de WorkOS con retorno a Studio |
| **Idempotencia** | Repetirlo no reabre ni recrea la sesión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Requiere conexión para terminar también la sesión alojada; la revocación local converge |
| **Información sensible** | El `sid` nunca se devuelve al navegador ni aparece en la URL de retorno de Studio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cookie host-only, `Path=/studio/v1`, sin `Max-Age`; su borrado usa el mismo path |
| **Falla cerrada** | Origen distinto: `403 forbidden` sin tocar la sesión |

#### `OP-IDN-029` — Declarar una credencial profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/me/professional-credentials` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Perfil profesional propio; tipo, emisor y nombre normalizados; fechas coherentes; URL opcional HTTPS |
| **Transacción** | Crear `PROFESSIONAL_CREDENTIAL` activa sin verificación |
| **Idempotencia** | `Idempotency-Key`; el replay devuelve la misma credencial |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline; dos comandos distintos pueden declarar credenciales distintas |
| **Información sensible** | `identity_pii` |
| **Evento de dominio** | `identity.professional_credential_declared.v1` |
| **Reglas** | Declarar nunca produce `verified`. La credencial tiene identidad estable y no se embebe en `PROFESSIONAL_PROFILE` |
| **Falla cerrada** | Perfil ajeno, formato inválido o intento de declarar estado de verificación: rechazo |

#### `OP-IDN-030` — Revisar una credencial profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/me/professional-credentials/{credentialId}/revisions` |
| **Actor** | `A2`, dueño de la credencial |
| **Filtros obligatorios** | Credencial propia y activa; contenido material distinto y válido |
| **Transacción** | Crear otra `PROFESSIONAL_CREDENTIAL` con `supersedes_credential_id` y retirar la anterior en la misma transacción |
| **Idempotencia** | `Idempotency-Key`; un replay no crea otra revisión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Concurrencia optimista; solo una revisión puede suceder a la versión activa |
| **Información sensible** | `identity_pii` |
| **Evento de dominio** | `identity.professional_credential_revised.v1` |
| **Reglas** | Las verificaciones anteriores permanecen como evidencia histórica y nunca se trasladan a la revisión nueva |
| **Falla cerrada** | Versión ya retirada, ajena o sin cambios: conflicto/rechazo sin alterar historia |

#### `OP-IDN-031` — Retirar una credencial profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/me/professional-credentials/{credentialId}/retirement` |
| **Actor** | `A2`, dueño de la credencial |
| **Filtros obligatorios** | Credencial propia activa |
| **Transacción** | Cambiar únicamente `status='retired'` y `retired_at`; conservar declaración y verificaciones históricas |
| **Idempotencia** | `Idempotency-Key`; repetir no cambia el instante original |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline; retiro y revisión concurrentes no pueden confirmar ambos |
| **Información sensible** | `identity_pii` |
| **Evento de dominio** | `identity.professional_credential_retired.v1` |
| **Reglas** | Una credencial retirada deja de presentarse como vigente aunque una verificación histórica todavía tenga `valid_to` futuro |
| **Falla cerrada** | Credencial ajena o ya sucedida por otra versión: misma respuesta cerrada |

#### `OP-IDN-032` — Iniciar autenticación Backoffice por contraseña

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando público |
| **Superficie** | `POST /backoffice/v1/auth/password` |
| **Actor** | `A0`; `Origin` exacto de `BACKOFFICE_WEB_URL` |
| **Filtros obligatorios** | Application Backoffice, email verificado, cuenta vinculada, persona activa y `allfit_admin` vigente |
| **Transacción** | Invalida intentos anteriores, persiste/reutiliza factor TOTP y crea intento de diez minutos. No crea sesión |
| **Idempotencia** | Un único intento abierto por cuenta; concurrencia serializada en PostgreSQL |
| **Información sensible** | Password, email, tokens, QR, clave manual, factor/challenge IDs nunca se registran; secretos temporales cifrados |
| **Reglas** | Respuesta `totp-enrollment` o `totp-challenge`; cualquier fallo de credencial/cuenta/persona/rol es el mismo `401` |

#### `OP-IDN-033` — Consultar intento de autenticación Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta pública ligada a cookie temporal |
| **Superficie** | `GET /backoffice/v1/auth/attempt` |
| **Actor** | Poseedor de `allfit_backoffice_auth_attempt`, host-only y `SameSite=Strict` |
| **Filtros obligatorios** | Intento abierto, no vencido, hash exacto y `Origin` exacto |
| **Transacción** | Lectura por función cerrada; no extiende los diez minutos |
| **Información sensible** | Sólo `next`, vencimiento y, durante primer enrolamiento, QR/clave manual; nunca identidad o IDs externos |
| **Falla cerrada** | Ausente, terminal, vencido o corrupto: `401` indistinguible y borrado de cookie |

#### `OP-IDN-034` — Verificar TOTP y crear sesión AAL2 Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/auth/totp/verification` |
| **Actor** | Intento temporal válido; aún no es actor Backoffice |
| **Filtros obligatorios** | Código de seis dígitos, `Idempotency-Key`, `Command-Id`, factor vigente, persona activa y rol base vigente |
| **Transacción** | Vincula command antes de consumir challenge; después bloquea cuenta, factor, intento, rol y sesión, activa factor nuevo y crea sesión AAL2 en una sola confirmación |
| **Idempotencia** | Token final derivado por HMAC del intento con separación de dominio; el mismo command puede recuperar un challenge ya verificado sin crear otra sesión; otro command recibe `409` |
| **Concurrencia** | La primera confirmación entre verificación y revocación gana. Máximo cinco códigos inválidos por intento |
| **Información sensible** | PostgreSQL conserva hash de token; challenge, QR, clave y tokens cifrados se eliminan al terminar |
| **Evento de dominio** | Solicitudes de limpieza externa si la operación termina o pierde la carrera |

#### `OP-IDN-035` — Consultar sesión Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/session` |
| **Actor** | Persona activa con rol `allfit_admin` y sesión Backoffice AAL2 |
| **Filtros obligatorios** | Hash y superficie exactos, `sid` válido, AAL2, `password_totp`, idle for less than 60 minutes and under 12 absolute hours (ADR-046; `access_control.backoffice_idle_limit()` and `access_control.backoffice_session_lifetime()`, migration `20261114090000_an_admin_holds_every_duty.sql`). The answer's `inactivity_expires_at` is the last activity plus 60 minutes |
| **Transacción** | Revalida persona/rol/evidencia y actualiza actividad mediante función cerrada; verifica/refresca token WorkOS fuera de autoridad de dominio |
| **Información sensible** | Devuelve sólo nivel, método, nombre propio y vencimientos; sin email, factor, deber, claim, token ni permiso |
| **Falla cerrada** | Cualquier pérdida de autoridad revoca/cierra la sesión y devuelve `401`; proveedor transitoriamente indisponible devuelve `503` sin ampliar vencimientos |

#### `OP-IDN-036` — Cerrar sesión Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando idempotente |
| **Superficie** | `POST /backoffice/v1/auth/logout` |
| **Actor** | Sesión Backoffice presente o ausente |
| **Filtros obligatorios** | `Origin` exacto; razón `manual`, `inactivity` o `recovery` |
| **Transacción** | Revoca primero la sesión local por función cerrada, elimina cookie y solicita revocar el `sid`; una falla externa queda en outbox para worker |
| **Idempotencia** | Ausente o ya revocada responde `204` igual que la primera ejecución |
| **Información sensible** | Métrica sólo con trigger/outcome; sin PII ni `sid` |

#### `OP-IDN-037` — Solicitar recuperación de contraseña Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando público de respuesta uniforme |
| **Superficie** | `POST /backoffice/v1/auth/password-resets` |
| **Actor** | `A0`, `Origin` exacto |
| **Transacción** | Ninguna local al solicitar; WorkOS envía correo y aloja página en `*.authkit.app`. Webhook firmado posterior revoca sesiones Studio/Backoffice e intentos en una transacción |
| **Idempotencia** | La respuesta siempre es `202`; el receipt del webhook deduplica por evento |
| **Información sensible** | La API descarta URL/token de reset y no revela existencia de cuenta ni salud del proveedor; TOTP activo se conserva |
| **Falla cerrada** | `auth.allfit.one` no es dependencia. Sin webhook válido no se aplica revocación local |

#### `OP-IDN-038` — Crear cuenta de Space y enviar código de verificación

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/auth/registrations` |
| **Actor** | `A0` — anónimo. Space usa login headless: la app nunca habla con el proveedor |
| **Filtros obligatorios** | Correo con forma válida y contraseña que cumpla la política: mínimo 8 caracteres con una minúscula, una mayúscula y un dígito |
| **Transacción** | Ninguna en PostgreSQL. Crea la credencial en el proveedor y pide el envío del código. No crea `PERSON`, ni perfil, ni `ACCESS_ACCOUNT` |
| **Idempotencia** | Sin `Idempotency-Key`: no se guarda nada de nuestro lado, así que no hay resultado que reproducir. Un reintento reenvía el código, y ese costo lo absorbe el límite de intentos |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Sin conexión no hay registro |
| **Información sensible** | Correo y contraseña. La contraseña nunca se registra ni se devuelve |
| **Evento de dominio** | Ninguno todavía; la persona no existe en el dominio |
| **Reglas** | **La respuesta no puede revelar si el correo ya tiene cuenta.** Éxito y «ya registrado» son indistinguibles: mismo estado, mismo cuerpo, misma expiración. Por eso responde `202` y nunca `201` ni `409` |
| **Falla cerrada** | Proveedor caído: `503`, sin crear nada |

#### `OP-IDN-039` — Verificar el código y emitir la primera sesión de Space

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/auth/registrations/verification` |
| **Actor** | `A0` → `A1` |
| **Filtros obligatorios** | Código de seis dígitos vigente para ese correo |
| **Transacción** | Marca el correo verificado en el proveedor y autentica, devolviendo tokens. Sigue sin crear `PERSON`: el `ACCESS_ACCOUNT` se deriva en la primera operación autenticada |
| **Idempotencia** | El código se consume al redimirlo; reintentar con el mismo código falla como inválido |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Tokens de sesión. Nunca se registran |
| **Evento de dominio** | Ninguno |
| **Reglas** | Una sola respuesta para código erróneo, contraseña errónea y correo desconocido. **Límite de intentos obligatorio**: un código de seis dígitos se agota por fuerza bruta en minutos |
| **Falla cerrada** | Cualquier duda deja la cuenta sin verificar |

#### `OP-IDN-040` — Iniciar sesión en Space

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/auth/sessions` |
| **Actor** | `A0` → `A1` si no completó registro, `A2` si ya tiene `PERSON` |
| **Filtros obligatorios** | Correo y contraseña. El token se emite para la Application de Space y no opera contra otra superficie |
| **Transacción** | Ninguna en PostgreSQL. Autentica contra el proveedor y devuelve tokens |
| **Idempotencia** | No aplica: cada inicio de sesión emite su propia sesión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Varias sesiones simultáneas del mismo Fitness ID son válidas |
| **Información sensible** | Credenciales y tokens. Ninguno se registra |
| **Evento de dominio** | Ninguno |
| **Reglas** | **Un intento fallido no dice si falló el correo o la contraseña** (HU-SP-002 criterio 2). Un correo sin verificar recibe la misma respuesta que uno inexistente. **Límite de intentos obligatorio**. **El correo verificado no viaja en la respuesta**: es server-only y `OP-IDN-043` lo muestra desde lo que la app guardó al iniciar sesión |
| **Falla cerrada** | Sin credenciales válidas no se emite token, aunque la cuenta exista |

#### `OP-IDN-041` — Renovar la sesión de Space

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/auth/sessions/refresh` |
| **Actor** | `A1`, `A2`, portador de un token de refresco vigente |
| **Filtros obligatorios** | Token de refresco emitido para la Application de Space |
| **Transacción** | Ninguna en PostgreSQL. Cambia el token de refresco por un par nuevo |
| **Idempotencia** | El proveedor rota el token de refresco: reusar el anterior falla, que es lo que detecta un robo |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Sin conexión la app conserva la sesión guardada pero no puede renovarla |
| **Información sensible** | Tokens. Nunca se registran |
| **Evento de dominio** | Ninguno |
| **Reglas** | Es lo que sostiene HU-SP-002 criterio 4, que la sesión se mantiene entre aperturas. Un refresco rechazado obliga a iniciar sesión otra vez, nunca a un acceso degradado. No devuelve contacto ni identidad de analítica: una sesión restaurada retoma el onboarding leyendo `OP-IDN-044` |
| **Falla cerrada** | Token inválido o de otra superficie: `401`, sin emitir nada |

#### `OP-IDN-042` — Pedir el restablecimiento de contraseña de Space

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/auth/password-resets` |
| **Actor** | `A0` — anónimo, por definición: quien olvidó su contraseña no puede autenticarse |
| **Filtros obligatorios** | Correo con forma válida. Nada más: comprobar si existe sería el propio dato que no se puede revelar |
| **Transacción** | Ninguna en PostgreSQL. El proveedor emite el token y envía el correo; la URL secreta nunca llega hasta nosotros |
| **Idempotencia** | Sin `Idempotency-Key`: no se guarda nada de nuestro lado. Repetir envía otro enlace, y el anterior sigue siendo válido hasta su vencimiento |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Sin conexión no hay envío |
| **Información sensible** | Correo. El token y su URL nunca se registran ni se devuelven |
| **Evento de dominio** | Ninguno al pedirlo. El cambio efectivo llega después como webhook del proveedor y lo procesa `identity.process_password_reset_succeeded` |
| **Reglas** | **Responde `202` siempre**, exista o no la cuenta y esté o no el proveedor en pie: HU-SP-004 criterio 2. Un fallo del proveedor tampoco es público, porque distinguirlo delataría igualmente qué direcciones existen. **Límite de intentos obligatorio**: sin él, este endpoint envía correos a cualquier dirección que le pidan |
| **Falla cerrada** | Cualquier error se traga y se responde `202`; nada se crea |

#### `OP-IDN-052` — Reenviar una invitación de equipo desde Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/organizations/{orgId}/team-invitations/{invitationId}/resends`; la lectura previa es `GET /backoffice/v1/organizations/{orgId}/team-invitations` (`NEW-IDN-RESEND`) |
| **Actor** | `A10` con rol base, `diagnose_support_metadata`, AAL2 y deber vigente |
| **Filtros obligatorios** | Invitación de equipo de esa organización, y organización `active`. El comando no lleva cuerpo: el contacto, el rol y la organización salen de la invitación |
| **Transacción** | `identity.resend_team_invitation`. Una invitación vigente se extiende y se reenvía tal cual. Una vencida se reemite: invitación nueva idéntica, firmada por la persona de Allfit y su asignación de deber, con `reissues_invitation_id` hacia la vencida, que sigue vencida. Cada reenvío escribe `identity.invitation_resends` |
| **Idempotencia** | `Idempotency-Key`; el reintento devuelve la invitación entregada sin reenviar |
| **Paginación y orden** | La lectura devuelve las 50 invitaciones más recientes con `truncated` |
| **Offline / concurrencia** | Falla cerrada. Aceptada, rechazada, revocada, ya reemitida o con una igual pendiente responde `409` |
| **Información sensible** | Contacto del invitado, que solo viaja enmascarado; no revela persona, así que no escribe `access_events` |
| **Evento de dominio** | `organization.staff_invited.v1` (y `identity.invitation_expired.v1` si la vencida seguía pendiente) |
| **Reglas** | `HU-BO-011`, criterios 2 a 6. La ventana por destino que usa Studio (tres al día por organización y dirección) cuenta también los reenvíos de soporte: `429`. Un trigger rechaza una reemisión con otra organización, canal, contacto, propuesta o rol |

#### `OP-IDN-053` — Enviar a una persona el flujo oficial de recuperación desde Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/people/{personId}/account-recoveries`; la lectura previa es `GET /backoffice/v1/people/{personId}/account-recovery?case_reference=` (`NEW-IDN-ACTION`) |
| **Actor** | `A10` con rol base, `diagnose_support_metadata`, AAL2 y deber vigente; nunca sobre su propia persona (`42501`) |
| **Filtros obligatorios** | Persona activa, con cuenta de acceso y correo verificado. El cuerpo lleva solo `case_reference`: la persona, el correo y el flujo salen de la base |
| **Transacción** | `identity.start_account_recovery`: bloquea la persona, marca vencidas las solicitudes cuyo enlace caducó, crea `identity.identity_action_requests` en `initiated` con fingerprint y pista del correo, escribe `identity.identity_action_events` (`initiated`), encola `identity.account_recovery_requested.v1` y registra `privacy.access_events` |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; el `Command-Id` es el identificador de la solicitud y el reintento devuelve la misma sin encolar otro correo |
| **Paginación y orden** | La lectura devuelve las diez solicitudes más recientes |
| **Offline / concurrencia** | Falla cerrada. Sin cuenta, sin correo verificado, persona no activa o con una recuperación en curso responde `409` y no escribe nada. Tres correos de recuperación por persona en 24 horas: `429` |
| **Información sensible** | El correo solo viaja enmascarado; el worker lo lee para entregarlo al proveedor. Enlace, token e identificador del reset de WorkOS nunca se guardan ni se devuelven |
| **Evento de dominio** | `identity.account_recovery_requested.v1` (payload: `request_id`). El worker llama al proveedor, registra `delivered` con el vencimiento del enlace o `failed`; `identity.process_password_reset_succeeded` confirma la solicitud cuando la persona cambia su contraseña |
| **Reglas** | `HU-BO-010`, criterios 3, 4, 5, 10 y 12. Solo la persona confirma. No hay recuperación por teléfono: V1 no tiene canal SMS |
| **Implemented (ADR-046 decision 5)** | Migration `20261115100000_an_admin_finds_a_person_by_name.sql`. The prior read `GET /backoffice/v1/people/{personId}/account-recovery` takes `case_reference` as optional: `identity.read_account_recovery` accepts null or empty, and one given in free text is refused with `22023` (`400 invalid-request`). Starting, resending and cancelling still require a case reference, because each opens a case; when the person file was opened without one, the Backoffice web asks for it before enabling those buttons. Tests: `T-IDN-RECOVERY-API-10`, `T-SUP-SEARCH-02` |

#### `OP-IDN-054` — Reenviar una recuperación en curso desde Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/people/{personId}/account-recoveries/{requestId}/resends` |
| **Actor** | Igual que `OP-IDN-053` |
| **Filtros obligatorios** | Solicitud de esa persona en `awaiting_verification` y con enlace vigente. El cuerpo lleva solo `case_reference` |
| **Transacción** | `identity.resend_account_recovery`: comprueba que el correo verificado sigue siendo aquel con el que empezó (fingerprint), escribe `delivery_requested` y encola otra entrega de la misma solicitud |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; el reintento devuelve la solicitud sin encolar otro correo |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Una solicitud que todavía no salió, vencida, cancelada, confirmada, fallida o cuyo correo verificado cambió responde `409`; una vencida nunca revive y la reemplaza una nueva con `OP-IDN-053`. Comparte el límite diario: `429` |
| **Información sensible** | Igual que `OP-IDN-053` |
| **Evento de dominio** | `identity.account_recovery_requested.v1` |
| **Reglas** | `HU-BO-011`, criterios 2 a 6, para la recuperación: reenviar no cambia sujeto, destino, finalidad ni acción |

#### `OP-IDN-055` — Cancelar una recuperación sospechosa desde Backoffice

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/people/{personId}/account-recoveries/{requestId}/cancellation` |
| **Actor** | Igual que `OP-IDN-053` |
| **Filtros obligatorios** | Solicitud de esa persona en `initiated` o `awaiting_verification` y con enlace vigente. El cuerpo lleva solo `case_reference` |
| **Transacción** | `identity.cancel_account_recovery`: pasa la solicitud a `cancelled` y escribe `cancelled` con persona, deber y caso |
| **Idempotencia** | `Idempotency-Key` + `Command-Id` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Una solicitud que ya no está vigente responde `409`. Si la entrega estaba en cola, el worker ya no la envía; si el correo ya salió, se registra pero no reabre la solicitud |
| **Información sensible** | Igual que `OP-IDN-053` |
| **Evento de dominio** | Ninguno |
| **Reglas** | `HU-BO-010`, criterio 10. Un correo que ya salió no se puede retirar del buzón de la persona: un cambio de contraseña posterior ya no confirma la solicitud cancelada |

#### `OP-IDN-056` — Listar mis invitaciones de cliente pendientes

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/client-invitations` |
| **Actor** | `A1` o `A2`: una cuenta que todavía se está registrando también puede preguntar |
| **Filtros obligatorios** | Invitaciones `pending` y no vencidas, con intención `service_relationship` pendiente, cuyo contacto es **exactamente** el correo verificado del actor (`ADR-001`). Sin correo verificado, rechazo |
| **Transacción** | `identity.list_my_client_invitations`. Lectura; no resuelve vencimientos: una vencida simplemente no aparece |
| **Idempotencia** | N/A |
| **Paginación y orden** | Sin cursor. Orden: la que vence antes primero, desempate por identificador |
| **Offline / concurrencia** | No cacheable (`no-store`) |
| **Información sensible** | Que una organización invitó a esta dirección, el nombre de la organización y el de quien la invita. **No** devuelve las opciones de scope: eso es `OP-REL-015` |
| **Evento de dominio** | Ninguno |
| **Reglas** | `HU-SP-016`. Responde identificador de invitación y de intención, organización (id y nombre), `invited_by` —nombre de la persona cuya membresía la emitió, nulo si no se puede resolver— y `expires_at`. Existe para que una invitación no se pierda con el correo que la trajo: la clave es la misma que ya exige la decisión, así que no amplía quién puede decidir. A una cuenta sin persona se le dice que algo la espera, no qué pide; leerla y decidirla exige `A2`. Una invitación dirigida a otro correo nunca aparece |
| **Falla cerrada** | Actor anónimo o sin correo verificado: `403` |

#### `OP-IDN-049` — Consultar mi contexto de salud
| **Superficie** | `POST /space/v1/onboarding-attempts/{id}/fitness-id` |
| **Actor** | `A1`, dueño del intento. Al terminar, la cuenta pasa a tener persona y el actor es `A2` |
| **Filtros obligatorios** | Intento abierto y propio, con `ELIGIBILITY_EVIDENCE` en estado `pass` vigente — **también al corregir**: una corrección no salta el control de adultez. Nombre y apellido no vacíos. Nombre de usuario con formato válido y libre para cualquier otra persona. **El proveedor debe confirmar la dirección de la credencial como verificada** al crear: sin eso no hay contacto que registrar |
| **Transacción** | Una sola. Si la cuenta no tiene persona: crear `PERSON` en `pending_activation` con nombre, apellido, nombre de usuario, **correo de contacto y su sello de verificación**, `activated_at` nulo; vincular `ACCESS_ACCOUNT` a esa persona; y anotar `person_id` en el `ONBOARDING_ATTEMPT`, que sigue `open`. **Si ya la tiene: corregir** nombre, apellido y nombre de usuario sobre la misma persona. El contacto no se reescribe aquí: pertenece a la credencial y cambiarlo es `OP-IDN-021` |
| **Idempotencia** | `Idempotency-Key`. Un reintento devuelve la misma `PERSON`; nunca crea una segunda, ni al crear ni al corregir. La unicidad del handle y del vínculo cuenta–persona se resuelven en la base |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | No admite `draft_local`: la unicidad del handle es autoritativa y no se puede prometer sin conexión. Dos peticiones concurrentes producen una sola persona |
| **Información sensible** | Datos identificativos básicos **y contacto**. Clasificación `identity_pii`. Ninguna categoría fitness |
| **Evento de dominio** | `identity.person_created_pending.v1` |
| **Reglas** | **Crear la persona aquí es lo que permite que el resto del onboarding escriba directamente sobre ella**: sin esto, cada respuesta de perfil necesitaría una tabla de preparación y un segundo camino de escritura hacia `FITNESS_PROFILE_CLAIM`. La elegibilidad adulta se exige **antes**, que es lo que piden DT-012 y ADR-017: crear la fila más temprano no adelanta ningún control. Una persona `pending_activation` **no** puede crear organización ni perfil profesional; esas operaciones ya exigen estado activo. **No existe consulta de disponibilidad de usuario**: el choque vuelve como `conflict` sobre ese campo, porque preguntar si un handle está libre delata que alguien lo tiene. **El correo de contacto no se acepta como entrada**: es la dirección de la credencial —DT-016 los declara el mismo dato— y la API la consulta al proveedor por `sub`. Una dirección que mandara el cliente jamás puede guardarse como verificada: quedaría un contacto que nadie probó satisfaciendo el filtro de `OP-SYS-002`. Cambiarla es `OP-IDN-021`, con su propia verificación. **Límite de intentos obligatorio** |
| **Falla cerrada** | Sin elegibilidad `pass` no hay persona ni corrección, aunque el nombre y el handle sean válidos. Usuario que otra persona tiene: `conflict`, y nada cambia. Si el proveedor no confirma la dirección como verificada: `forbidden` |

#### `OP-IDN-043` — Crear el Fitness ID en estado pendiente

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/onboarding-attempts/{id}/fitness-id` |
| **Actor** | `A1`, dueño del intento. Al terminar, la cuenta pasa a tener persona y el actor es `A2` |
| **Filtros obligatorios** | Intento abierto y propio, con `ELIGIBILITY_EVIDENCE` en estado `pass` vigente — **también al corregir**: una corrección no salta el control de adultez. Nombre y apellido no vacíos. Nombre de usuario con formato válido y libre para cualquier otra persona. **El proveedor debe confirmar la dirección de la credencial como verificada** al crear: sin eso no hay contacto que registrar |
| **Transacción** | Una sola. Si la cuenta no tiene persona: crear `PERSON` en `pending_activation` con nombre, apellido, nombre de usuario, **correo de contacto y su sello de verificación**, `activated_at` nulo; vincular `ACCESS_ACCOUNT` a esa persona; y anotar `person_id` en el `ONBOARDING_ATTEMPT`, que sigue `open`. **Si ya la tiene: corregir** nombre, apellido y nombre de usuario sobre la misma persona. El contacto no se reescribe aquí: pertenece a la credencial y cambiarlo es `OP-IDN-021` |
| **Idempotencia** | `Idempotency-Key`. Un reintento devuelve la misma `PERSON`; nunca crea una segunda, ni al crear ni al corregir. La unicidad del handle y del vínculo cuenta–persona se resuelven en la base |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | No admite `draft_local`: la unicidad del handle es autoritativa y no se puede prometer sin conexión. Dos peticiones concurrentes producen una sola persona |
| **Información sensible** | Datos identificativos básicos **y contacto**. Clasificación `identity_pii`. Ninguna categoría fitness |
| **Evento de dominio** | `identity.person_created_pending.v1` |
| **Reglas** | **Crear la persona aquí es lo que permite que el resto del onboarding escriba directamente sobre ella**: sin esto, cada respuesta de perfil necesitaría una tabla de preparación y un segundo camino de escritura hacia `FITNESS_PROFILE_CLAIM`. La elegibilidad adulta se exige **antes**, que es lo que piden DT-012 y ADR-017: crear la fila más temprano no adelanta ningún control. Una persona `pending_activation` **no** puede crear organización ni perfil profesional; esas operaciones ya exigen estado activo. **No existe consulta de disponibilidad de usuario**: el choque vuelve como `conflict` sobre ese campo, porque preguntar si un handle está libre delata que alguien lo tiene. **El correo de contacto no se acepta como entrada**: es la dirección de la credencial —DT-016 los declara el mismo dato— y la API la consulta al proveedor por `sub`. Una dirección que mandara el cliente jamás puede guardarse como verificada: quedaría un contacto que nadie probó satisfaciendo el filtro de `OP-SYS-002`. Cambiarla es `OP-IDN-021`, con su propia verificación. **Límite de intentos obligatorio** |
| **Falla cerrada** | Sin elegibilidad `pass` no hay persona ni corrección, aunque el nombre y el handle sean válidos. Usuario que otra persona tiene: `conflict`, y nada cambia. Si el proveedor no confirma la dirección como verificada: `forbidden` |

#### `OP-IDN-044` — Consultar el intento de onboarding abierto

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/health-context` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | `identity.list_health_context` resuelve el sujeto y lee sólo sus declaraciones |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor `before_valid_from` + `before_id`, los dos o ninguno; `limit` de 1 a 200 (50 por defecto). Orden: inicio descendente, desempate por identificador |
| **Offline / concurrencia** | Cacheable para presentación en el dispositivo; la respuesta es `no-store` |
| **Información sensible** | **Contexto de salud.** Nunca devuelve `person_id` |
| **Evento de dominio** | Ninguno |
| **Reglas** | `HU-SP-014`, `HU-SP-028`. La persona ve lo que declaró; la vista profesional es `OP-IDN-020` |
| **Falla cerrada** | Un token que no resuelve a una persona activa responde `403` |

#### `OP-IDN-050` — Eliminar una declaración de contexto de salud
| **Superficie** | `GET /space/v1/onboarding-attempts/current` |
| **Actor** | `A1`, dueño del intento |
| **Filtros obligatorios** | Solo el intento abierto de la cuenta autenticada. Una cuenta nunca ve el intento de otra |
| **Transacción** | Lectura. Devuelve el intento abierto, su estado de elegibilidad y si la cuenta ya tiene un Fitness ID pendiente |
| **Idempotencia** | No aplica |
| **Paginación y orden** | No aplica. Hay a lo sumo un intento abierto por cuenta |
| **Offline / concurrencia** | Sin conexión no se puede retomar: el estado autoritativo del onboarding vive en el servidor |
| **Información sensible** | Datos identificativos básicos. **No devuelve contacto**: el correo verificado es server-only y la app ya tiene el que usó para entrar |
| **Evento de dominio** | Ninguno |
| **Reglas** | Es lo que sostiene HU-SP-015 criterio 3 y HU-SP-098 criterio 5: volver retoma donde iba en vez de empezar de nuevo. Una cuenta sin intento abierto —incluida una persona ya activada— recibe `null`, no un error: no haber empezado no es un fallo. Lo ausente viaja como `null` y nunca omitido, para que la app no tenga que adivinar si un paso se saltó o si el campo no llegó |
| **Falla cerrada** | Sin token verificable, sin respuesta |

#### `OP-IDN-045` — Declarar el sexo biológico

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `DELETE /space/v1/health-context/{claimId}` |
| **Actor** | `A2`, dueño de la declaración |
| **Filtros obligatorios** | La declaración pertenece a la persona autenticada |
| **Transacción** | `identity.delete_health_context`: `privacy.dispose_on_owner_request` abre y cierra el caso unitario bajo la política `health`, y la fila se borra en la misma transacción |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`. Un reintento devuelve el mismo caso; un segundo borrado con otra llave responde `404` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada: una eliminación no se confirma desde el dispositivo |
| **Información sensible** | Contexto de salud. Lo que queda es el caso: qué clase de dato se borró, bajo qué política y cuándo |
| **Evento de dominio** | `privacy.disposition_case_opened.v1` |
| **Reglas** | Hace para el contexto de salud lo que `OP-IDN-007` hace para el progreso corporal. Borrar un dato propio no revoca ningún grant. La declaración de otra persona y una que no existe responden igual, `404` |
| **Falla cerrada** | Sin política `health`/`owner_request` publicada, el borrado se rechaza y no escribe nada |

#### `OP-IDN-051` — Reenviar una invitación de cliente desde Backoffice
| **Superficie** | `POST /space/v1/onboarding-attempts/{id}/biological-sex` |
| **Actor** | `A2`, dueño del intento. La persona ya existe en `pending_activation` desde `OP-IDN-043` |
| **Filtros obligatorios** | Intento abierto y propio con `ELIGIBILITY_EVIDENCE` en `pass`. La cuenta debe tener `PERSON` vinculada. El sujeto es siempre la persona autenticada; nadie declara el sexo de otra |
| **Transacción** | Una sola: escribir `PERSON.biological_sex`. El intento no cambia de estado |
| **Idempotencia** | `Idempotency-Key`. Un reintento devuelve el mismo valor. **Una segunda declaración distinta corrige**, no choca: la persona puede volver atrás y cambiar su respuesta, y declinar después de haber declarado borra el valor. El sello del intento no se retira: la pregunta quedó respondida de todos modos |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | No admite `draft_local`: es un paso del onboarding y el estado autoritativo vive en el servidor |
| **Información sensible** | Perfil fitness. Clasificación `training` |
| **Evento de dominio** | Ninguno en V1. Nada reacciona todavía a este dato |
| **Reglas** | **Vive en `identity.people`, no en `FITNESS_PROFILE_CLAIM`**: es un hecho singular y estable, y el catálogo de afirmaciones existe para datos que cambian y que varias fuentes observan. **No declararlo es una respuesta válida y se representa como ausencia de valor**, nunca como `unknown`: un centinela obligaría después a distinguirlo de «no preguntado». Por eso declinar **no llama a esta operación**; simplemente avanza. **Límite de intentos obligatorio** |
| **Falla cerrada** | Valor fuera del enum: `invalid-request`, y nada se escribe. Sin persona vinculada: `forbidden`. Intento cerrado o sin elegibilidad: `invalid-request` |

#### `OP-IDN-046` — Declarar las zonas de énfasis

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/organizations/{orgId}/client-invitations/{invitationId}/resends`; la lectura previa es `GET /backoffice/v1/organizations/{orgId}/client-invitations` (`NEW-IDN-CLIENT-RESEND`) |
| **Actor** | `A10` con rol base, `diagnose_support_metadata`, AAL2 y deber vigente |
| **Filtros obligatorios** | Invitación de cliente de esa organización, y organización `active`. El comando no lleva cuerpo: el contacto, la organización y los permisos que pide salen de la invitación |
| **Transacción** | `identity.resend_client_invitation`. Una invitación vigente se extiende y se reenvía tal cual. Una vencida se reemite: invitación nueva idéntica, firmada por la persona de Allfit y su asignación de deber, con `reissues_invitation_id` hacia la vencida, que sigue vencida. La reemisión **copia las opciones de `privacy.invitation_scope_options`** con el mismo `scope_definition_id`, nivel y propósito. Cada reenvío escribe `identity.invitation_resends` con `kind = 'service_relationship'` |
| **Idempotencia** | `Idempotency-Key`; el reintento devuelve la invitación entregada sin reenviar |
| **Paginación y orden** | La lectura devuelve las 50 invitaciones más recientes con `truncated` |
| **Offline / concurrencia** | Falla cerrada. Aceptada, rechazada, revocada, ya reemitida o con una igual pendiente responde `409` |
| **Información sensible** | Contacto del invitado, que solo viaja enmascarado, y los códigos de permiso que pidió. No revela persona —antes de que alguien acepte, una invitación no identifica a nadie—, así que no escribe `access_events`. El propósito que escribió el gimnasio y la redacción que leerá la persona no viajan a Backoffice |
| **Evento de dominio** | `relationship.client_invited.v1` (y `identity.invitation_expired.v1` si la vencida seguía pendiente) |
| **Reglas** | `HU-BO-011`, criterios 2 a 6. La ventana por destino que usa Studio cuenta también los reenvíos de soporte: `429`. Una política de lectura sobre `privacy.invitation_scope_options` habilita a `diagnose_support_metadata` a ver la oferta, y un trigger de restricción diferido rechaza con `23514` toda reemisión cuyo conjunto de permisos, nivel, propósito o versión no coincida con el original —incluida la que copió cero filas porque no pudo leerlos—, recomputando `proposal_hash` desde lo escrito |
| **Falla cerrada** | Sin poder leer la oferta no se envía nada: la reemisión vacía no coincide con el `proposal_hash` heredado y la transacción se rechaza |
| **Program (STUDIO-16)** | A reissue copies the program intent on the same version, start and zone (migration `20261106090000_an_invitation_can_offer_a_first_program.sql`); the offer trigger rebuilds the hash with it and compares the three columns, so a reissue that changes the program is refused (`23514`). |
| **Superficie** | `POST /space/v1/profile/focus-areas` |
| **Actor** | `A2`. El sujeto es siempre la persona autenticada |
| **Filtros obligatorios** | La cuenta tiene `PERSON` vinculada. Cada miembro del conjunto pertenece a `allowed_values` del atributo `focus_areas`. Sin miembros repetidos y sin nulos internos. `whole_body` llega solo o no llega |
| **Transacción** | Una sola, y declara **el conjunto completo**: sella con `valid_to` las afirmaciones vigentes de `focus_areas` que ya no están en el conjunto, inserta las que faltan y **no toca las que siguen**. Una zona retirada queda con `valid_to` y **sin `superseded_by_id`**: nada la reemplazó, y ese campo significa «fue reemplazada por esta otra», no «terminó» |
| **Idempotencia** | `Idempotency-Key` con receipt durable. **Aquí `Command-Id` no es la PK de la fila**, a diferencia de `OP-IDN-004`: el comando escribe varias filas, así que cada una lleva su propio UUIDv7 y el agregado del receipt es la persona. Consecuencia declarada: el replay devuelve **el conjunto vigente**, no una foto de lo que escribió aquel comando. El reintento no duplica, que es lo que la clave garantiza |
| **Paginación y orden** | No aplica. El conjunto se lee ordenado por código para que la comparación sea determinista |
| **Offline / concurrencia** | Admite `draft_local` como el resto de la edición de perfil. Dos declaraciones concurrentes del mismo conjunto son idempotentes; dos distintas se serializan y gana la última, que es la semántica de declarar un conjunto entero |
| **Información sensible** | Perfil fitness, clasificación `training`. Visible al profesional bajo `relationship_training` y según el field-set del grant |
| **Evento de dominio** | Ninguno en V1. Nada reacciona todavía al énfasis; se añade cuando la planificación lo consuma |
| **Reglas** | **El array es interfaz del comando, nunca almacenamiento**: cada zona es una fila, como en `OP-IDN-010` con las especialidades. La procedencia es `person_declared` y **no supersede la observación de un profesional** sobre el mismo atributo. `whole_body` es un miembro y significa «sin énfasis»; el conjunto vacío **no** es una respuesta y se rechaza, porque «no contesté» tiene que seguir siendo distinguible de «no quiero énfasis» |
| **Falla cerrada** | Miembro fuera del catálogo, repetido, nulo, conjunto vacío, o `whole_body` acompañado de una zona: `invalid-request` y **nada se escribe**, sin escritura parcial. Sin persona vinculada: `forbidden` |

#### `OP-IDN-047` — Saltarse un paso del onboarding

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/onboarding-attempts/{id}/skips` |
| **Actor** | `A2`, dueño del intento |
| **Filtros obligatorios** | Intento abierto y propio. El paso pertenece a los que `HU-SP-015` permite saltar: **nunca** la edad, el nombre ni los términos, que son la condición para que exista una persona |
| **Transacción** | Una sola: escribir `ONBOARDING_STEP_SKIP`. El intento no cambia de estado y no se escribe nada sobre la persona |
| **Idempotencia** | La **clave primaria compuesta** `(intento, paso)` es toda la garantía: saltar dos veces escribe una fila. No lleva recibo durable porque no hay cuerpo que un replay pudiera contradecir, a diferencia de las demás operaciones de esta sección |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | No admite `draft_local`: es estado del onboarding y vive en el servidor |
| **Información sensible** | Ninguna. Un salto no afirma nada de la persona, que es justo lo que lo distingue de declinar |
| **Evento de dominio** | Ninguno en V1 |
| **Reglas** | **Saltar no es declinar.** Declinar el sexo biológico deja el sello en el intento con valor ausente, porque declinar **es** una respuesta a esa pregunta; saltar es no responderla. Coinciden en que el paso deja de pedirse. Un salto **no impide volver**: el paso sigue siendo editable desde la flecha atrás y responderlo después lo deja respondido |
| **Falla cerrada** | Paso no saltable o código desconocido: `invalid-request`. Intento cerrado, vencido o ajeno: `forbidden` |

#### `OP-IDN-048` — Cerrar sesión Space

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando idempotente |
| **Superficie** | `DELETE /space/v1/auth/sessions` |
| **Actor** | Sesión Space presente o ausente |
| **Filtros obligatorios** | Ninguno más allá del token. Un token vencido o ausente **también** cierra sesión: el teléfono ya no tiene nada que consultar, y negarse dejaría a la persona dentro sin poder salir |
| **Transacción** | Ninguna en PostgreSQL. Space es *bearer* sin estado: `identity.access_sessions` proyecta las sesiones por cookie de Studio y ninguna petición de Space la consulta, así que no hay fila local que revocar. La única revocación posible es la del `sid` en el proveedor |
| **Idempotencia** | Sin recibo durable, porque no hay cuerpo que un replay pudiera contradecir. Revocar dos veces responde `204` igual que la primera |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | **El dispositivo cierra sesión aunque la revocación falle.** Un teléfono sin red que no pueda borrar lo suyo es exactamente lo que `HU-SP-003` prohíbe; el `sid` se manda a outbox y el worker lo reintenta |
| **Información sensible** | Métrica sólo con desencadenante y resultado. Nunca el `sid`, que identifica una sesión concreta |
| **Evento de dominio** | Ninguno en V1 |
| **Reglas** | **Revocar el `sid` no invalida el token de acceso ya emitido**, que sigue verificando hasta vencer: lo que muere es el refresco, y con él la sesión. Por eso el borrado en el dispositivo es la mitad que no puede fallar. El criterio 2 de `HU-SP-003` obliga a **avisar antes** cuando queda un entrenamiento sin sincronizar, y ese aviso es del cliente: el servidor no sabe qué guarda el teléfono |
| **Falla cerrada** | Nada. Esta operación no tiene rechazo: cerrar sesión siempre se concede |

#### `OP-IDN-059` — List the body photos a client shows this gym

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/body-photos` |
| **Actor** | `A3`, `A7` with effective assignment: the coach who attends her |
| **Filtros obligatorios** | **FORMULA** + `body_progress` · `read`, and a version that includes `identity.body_photos.taken_on` and `media_ref` |
| **Transacción** | `identity.list_client_shared_body_photos(...)`, which opens the contract scope `body_photo_review` for this relationship, records the access and restores the previous scope |
| **Idempotencia** | N/A |
| **Paginación y orden** | Keyset on (`taken_on desc`, `id desc`), page cap 101 |
| **Offline / concurrencia** | `private, no-store` |
| **Información sensible** | Body photos. Only the ones she shows **this** relationship; never her gallery, never one shown to another gym, never one she took back |
| **Evento de dominio** | None |
| **Reglas** | Answers `ClientBodyPhotoPage`: `id`, `taken_on` and `shared_at`, never the storage key. A version that does not include the image, or that hides the day, lists no photo. HU-STUDIO-052, HU-SP-025 criterion 4 |
| **Falla cerrada** | No grant: `403 scope-required` and a `denied` access event. Not her coach: `404` |
| **Implemented (STUDIO-45)** | Migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`. Tests: `T-IDN-PHOTO-SHARE-01`, `T-IDN-AUTHORIZED-API-HTTP-*` |

#### `OP-IDN-060` — Open one body photo a client shows this gym

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{organizationId}/clients/{personId}/body-photos/{photoId}/content` |
| **Actor** | `A3`, `A7`: the coach who attends her |
| **Filtros obligatorios** | Same as `OP-IDN-059`, rechecked on every request, plus a live share of this photo with this relationship |
| **Transacción** | `identity.open_client_shared_body_photo(...)` records the access, `allowed` or `denied`, and hands the storage key to the API only. The API then reads the object and streams it |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | `private, no-store`, `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`. Requires Studio's `Origin`, so a pasted link opens nothing |
| **Información sensible** | The image. **Never a signed URL** (`x-allfit-media-url-policy.studio_professional`) and never a redirect; the key never leaves the API |
| **Evento de dominio** | None |
| **Reglas** | `image/jpeg` bytes. PostgreSQL decides first and the object store is read only after it says yes |
| **Falla cerrada** | Anything short of a shown photo (no grant, no share, a withdrawn share, a deleted photo, a version without photos) is the same `404`, recorded as `denied`. A store fault is `503` |
| **Implemented (STUDIO-45)** | Migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`; `packages/object-store` gains `get(key)`. Tests: `T-IDN-PHOTO-SHARE-01`, `T-IDN-AUTHORIZED-UNIT-10..12`, `-API-HTTP-10/11` |

#### `OP-IDN-061` — Show one of my body photos to one gym

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando idempotente |
| **Superficie** | `PUT /space/v1/body-photos/{photoId}/shares` with body `{relationship_id}` |
| **Actor** | `A2` |
| **Filtros obligatorios** | The photo and the relationship are hers (`P0002` → `404`); the relationship is `active` (`55000` → `409`) |
| **Transacción** | `identity.share_body_photo(person, photo, relationship, idempotency_key, command_id, request_hash)`. Locks the relationship `for share` and the photo `for key share`, so a termination or a deletion in flight is waited for, then refused |
| **Idempotencia** | `Idempotency-Key` and `Command-Id`; the request hash includes the relationship. A reused key with another body is `409` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Two shares at once leave one share and one event |
| **Información sensible** | Which gym sees which photo |
| **Evento de dominio** | `identity.body_photo_shared.v1`, only when the state changes |
| **Reglas** | One row per photo and relationship in `identity.body_photo_shares`, reactivated rather than duplicated. Does not require Pro: it is a privacy control over photos she already has. Answers `200` with `BodyPhotoShare` |
| **Falla cerrada** | Another person's photo or relationship: `404`. An ended relationship: `409` |
| **Implemented (STUDIO-45)** | Migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`. Tests: `T-IDN-PHOTO-SHARE-01`, `body-photo-share-concurrency.test.ts`, `T-IDN-PHOTOSHARE-01..06`, `-IDEM-01` |

#### `OP-IDN-062` — Stop showing a body photo to a gym

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando idempotente |
| **Superficie** | `DELETE /space/v1/body-photos/{photoId}/shares/{relationshipId}` |
| **Actor** | `A2` |
| **Filtros obligatorios** | A share of hers for that photo and relationship (`P0002` → `404`). Works after the relationship ended |
| **Transacción** | `identity.withdraw_body_photo_share(...)`, same arguments |
| **Idempotencia** | Same as `OP-IDN-061` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | — |
| **Información sensible** | — |
| **Evento de dominio** | `identity.body_photo_share_withdrawn.v1`, only when the share was live |
| **Reglas** | The share becomes `withdrawn` with `withdrawn_at`; the next Studio read no longer lists or opens it. Answers `200` with `BodyPhotoShare`, like `OP-PRV-007` |
| **Falla cerrada** | No share: `404` |
| **Implemented (STUDIO-45)** | Migration `20261109110000_a_coach_reads_what_a_client_shares_about_herself.sql`. `GET /space/v1/body-photos` gains `shared_with: [{relationship_id, organization_name, shared_at}]`, live shares only. Tests: `T-IDN-PHOTO-SHARE-01` |

### 7.2 Organizaciones

Dueño de `ORGANIZATION`, `ORGANIZATION_TYPE`, `ORGANIZATION_SITE`, `ORGANIZATION_MEMBERSHIP`, `MEMBERSHIP_ROLE`, `ORGANIZATION_ROLE`, `ORGANIZATION_CAPABILITY`, `ROLE_CAPABILITY` y sus eventos.

Regla que gobierna todo el dominio: **una membresía no concede acceso al Fitness ID de nadie**. Rol y capacidad habilitan acciones organizacionales; los datos de una persona exigen relación, asignación y grant.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-ORG-001` | Crear organización | Comando | `A2` |
| `OP-ORG-002` | Actualizar datos de la organización | Comando | `A4`, `A5` |
| `OP-ORG-003` | Crear sede | Comando | `A4`, `A5` |
| `OP-ORG-004` | Actualizar o desactivar sede | Comando | `A4`, `A5` |
| `OP-ORG-005` | Invitar a una persona como staff | Comando | `A4`, `A5`, `A6` |
| `OP-ORG-006` | Revocar una invitación emitida | Comando | `A4`, `A5`, `A6` |
| `OP-ORG-007` | Asignar rol a una membresía | Comando | `A4`, `A5` |
| `OP-ORG-008` | Retirar rol de una membresía | Comando | `A4`, `A5` |
| `OP-ORG-009` | Terminar una membresía | Comando | `A4`, `A5` |
| `OP-ORG-010` | Renunciar a una membresía propia | Comando | `A2` con membresía propia activa no-owner |
| `OP-ORG-011` | Transferir propiedad | Comando | `A5` |
| `OP-ORG-012` | Cerrar la organización | Comando | `A5` |
| `OP-ORG-013` | Consultar la organización | Consulta | `A3`–`A6` |
| `OP-ORG-014` | Listar mis membresías | Consulta | `A2` |
| `OP-ORG-015` | Listar membresías de la organización | Consulta | `A4`, `A5`, `A6` |
| `OP-ORG-016` | Listar invitaciones emitidas | Consulta | `A4`, `A5`, `A6` |
| `OP-ORG-017` | Consultar catálogo de roles y capacidades | Consulta | `A3`–`A6` |
| `OP-ORG-018` | Crear una organización y entregarla a su dueño | Comando | `A10` |
| `OP-ORG-019` | Consultar catálogo de tipos de organización | Consulta | `A2` |
| `OP-ORG-020` | Resolver el contexto de entrada de Studio | Consulta | `A1`, `A2` |
| `OP-ORG-021` | Reenviar la invitación de propiedad | Comando | `A10` |
| `OP-ORG-022` | Cancelar una organización que nadie reclamó | Comando | `A10` |

---

#### `OP-ORG-001` — Crear organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations` |
| **Actor** | `A2` — cualquier persona activa |
| **Filtros obligatorios** | Persona activa. El tipo solicitado pertenece al catálogo gobernado de `ORGANIZATION_TYPE` |
| **Transacción** | `organizations.create_organization(...)` crea `ORGANIZATION`, la membresía inicial, el rol `owner` y los eventos; solo confirma si el constraint diferible verifica exactamente un `owner` activo |
| **Idempotencia** | `Idempotency-Key`. Un reintento devuelve la organización creada, nunca una segunda |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Datos de la parte responsable. Ningún dato fitness |
| **Evento de dominio** | `organization.created.v1`, `organization.membership_created.v1` |
| **Reglas** | El onboarding `solo_professional` crea una organización de tipo `professional_practice`: es una **frontera operativa**, no necesariamente una persona jurídica. No existe una bandera permanente de "independiente": la misma organización incorpora equipo después sin cambiar de identidad. Toda organización activa conserva exactamente un `owner` activo |
| **Falla cerrada** | Sin persona activa o con tipo fuera del catálogo, rechazo |

#### `OP-ORG-002` — Actualizar datos de la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PATCH /studio/v1/organizations/{orgId}` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | Membresía vigente en `{orgId}` con capacidad de administración |
| **Transacción** | `organizations.update_organization(...)` bloquea el agregado, valida revisión/transición, actualiza solo `display_name`, `legal_name` o `type_code`, incrementa `revision_number` y registra `ORGANIZATION_EVENT` con before/after |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`. Un `PATCH` sin cambios efectivos no genera evento ni incrementa la revisión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Exige `If-Match: "organization:{id}:r{revision}"`. Si falta devuelve `428 precondition-required`; si quedó atrás, `409 stale-draft`. El éxito incrementa `revision_number` y devuelve el nuevo ETag fuerte |
| **Información sensible** | `legal_name` puede ser `identity_pii`; el comando no lee ni escribe el JSON de la parte responsable |
| **Evento de dominio** | `organization.updated.v1` |
| **Reglas** | El `PATCH` es cerrado. `responsible_party`, `id`, `status`, timestamps, `purpose` y `responsible_party_schema_version` son inmutables en autoservicio. Cambiar `type_code` exige una fila activa en `organization_type_transitions`; inicialmente solo existen `professional_practice → gym` y `professional_practice → studio`. Incorporar personal **no** cambia el tipo automáticamente |
| **Falla cerrada** | Transición de tipo no permitida, rechazo |

#### `OP-ORG-003` — Crear sede

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/sites` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | Membresía vigente con capacidad de administración |
| **Transacción** | `organizations.create_site(...)` crea `ORGANIZATION_SITE` con `revision_number = 0` y su evento contractual |
| **Idempotencia** | `Idempotency-Key` + `Command-Id` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; devuelve `ETag: "organization-site:{id}:r0"` |
| **Información sensible** | `address` puede ser `identity_pii` si la sede de una práctica profesional coincide con un domicilio |
| **Evento de dominio** | `organization.site_created.v1` |
| **Reglas** | Una sede es información básica de ubicación. **No** representa recursos reservables, capacidad, clases ni inventario, y **no** delimita permisos: el alcance de rol por sede queda fuera de V1 |
| **Falla cerrada** | — |

#### `OP-ORG-004` — Actualizar o desactivar sede

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PATCH /studio/v1/organizations/{orgId}/sites/{siteId}` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | La sede pertenece a `{orgId}`; membresía vigente con capacidad de administración |
| **Transacción** | `organizations.update_site(...)` bloquea la sede, valida revisión/tenant, actualiza campos cerrados, incrementa `revision_number` y registra el evento |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Exige `If-Match: "organization-site:{id}:r{revision}"`; faltante `428 precondition-required`, obsoleto `409 stale-draft`; el éxito devuelve el nuevo ETag fuerte |
| **Información sensible** | `address` puede ser `identity_pii`; actualizar o desactivar no reduce su protección ni retención |
| **Evento de dominio** | `organization.site_updated.v1` |
| **Reglas** | Desactivar una sede no afecta relaciones, asignaciones ni historial: la sede es informativa |
| **Falla cerrada** | — |

#### `OP-ORG-005` — Invitar a una persona como staff

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/invitations` con intención de tipo `membership` |
| **Actor** | `A4`, `A5`, `A6` |
| **Filtros obligatorios** | Membresía vigente con capacidad de invitar. El destino V1 es un email; **nunca** un `person_id` |
| **Transacción** | Crear `INVITATION` con su token e `INVITATION_INTENT` de membresía, incluyendo el rol propuesto, y encolar el envío en el outbox |
| **Idempotencia** | `Idempotency-Key`. Reinvitar al mismo contacto con la misma intención reutiliza la invitación vigente en lugar de crear otra |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. PostgreSQL limita 20 emisiones/hora por actor, 100/día por organización y tres entregas/24 h por destinatario y organización |
| **Información sensible** | Contacto de la persona invitada. La organización **no** aprende si ese contacto ya tiene cuenta |
| **Evento de dominio** | `organization.staff_invited.v1` |
| **Reglas** | Studio nunca ejecuta `Create User` ni crea personas. La invitación no crea cuenta, persona, perfil ni membresía: solo transporta una propuesta. El correo enlaza a `https://studio.allfit.one/invitations#token=…`; el envío es asíncrono y un fallo del proveedor no invalida la invitación |
| **Falla cerrada** | Sin capacidad de invitar, rechazo |

#### `OP-ORG-006` — Revocar una invitación emitida

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/invitations/{id}/revocation` |
| **Actor** | `A4`, `A5`, `A6` |
| **Filtros obligatorios** | La invitación pertenece a `{orgId}` y sigue pendiente |
| **Transacción** | Bloquear y marcar la invitación y todas sus intenciones pendientes como revocadas; serializa sobre la misma fila que aceptación |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Si la aceptación llega primero, la revocación no deshace lo materializado |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `identity.invitation_revoked.v1` |
| **Reglas** | Revocar no elimina la evidencia de la invitación ni deshace intenciones ya aceptadas: para eso está la terminación del vínculo correspondiente |
| **Falla cerrada** | — |

#### `OP-ORG-007` — Asignar rol a una membresía

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/memberships/{id}/roles` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | La membresía pertenece a `{orgId}` y está vigente. El rol solicitado es `admin`, `coach` o `staff`; `owner` se rechaza |
| **Transacción** | `organizations.grant_membership_role(...)` crea la vigencia, registra `MEMBERSHIP_EVENT` y persiste el receipt durable bajo el mismo commit |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`. Asignar un rol ya vigente no lo duplica; el replay durable devuelve el receipt original incluso después de revocar el rol o expirar el replay HTTP |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Nunca se confirma un cambio de permisos desde caché o read model atrasado |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `organization.role_granted.v1` |
| **Reglas** | La gestión genérica nunca concede `owner`. Un rol no es consentimiento: conceder `coach` no da acceso a ninguna persona. El efecto es inmediato y no retroactivo: no amplía lo ya ocurrido |
| **Falla cerrada** | Rol fuera de `admin`, `coach` o `staff`, incluido `owner`, rechazo |

#### `OP-ORG-008` — Retirar rol de una membresía

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `DELETE /studio/v1/organizations/{orgId}/memberships/{id}/roles/{roleCode}` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | La membresía pertenece a `{orgId}`; el rol está vigente y no es `owner` |
| **Transacción** | `organizations.revoke_membership_role(...)` cierra la vigencia y registra el evento. Solo cuando `role_code=coach` llama `relationships.end_assignments_for_membership(...)` dentro de la misma transacción; Organizaciones no escribe tablas de Relaciones |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `organization.role_revoked.v1` |
| **Reglas** | La gestión genérica nunca retira `owner`. Retirar `coach` deja inefectivas sus asignaciones profesionales: el grant sobrevive, pero ese actor deja de poder ejercerlo. Retirar `admin` o `staff` preserva las asignaciones si `coach` sigue vigente. La invalidación es inmediata, sin ventana de caché |
| **Falla cerrada** | Intento de retirar `owner`, rechazo |

#### `OP-ORG-009` — Terminar una membresía

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/memberships/{id}/termination` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | La membresía pertenece a `{orgId}` y está vigente |
| **Transacción** | `organizations.terminate_membership(...)` cierra la membresía/roles, registra eventos y llama incondicionalmente `relationships.end_assignments_for_membership(...)`. Cada dominio escribe únicamente sus tablas |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal, pero afecta quién puede leer datos de terceros |
| **Evento de dominio** | `organization.membership_terminated.v1` |
| **Reglas** | Terminar una membresía **no** termina las relaciones de servicio de la organización: las deja sin profesional asignado y exige reasignar (`OP-REL-005`). El historial de autoría permanece. No puede terminarse una membresía mientras tenga el rol `owner` |
| **Falla cerrada** | Membresía con rol `owner`, rechazo |

#### `OP-ORG-010` — Renunciar a una membresía propia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/me/membership/resignation` |
| **Actor** | `A2` — sujeto autenticado con membresía propia activa no-owner; no requiere un rol residual |
| **Filtros obligatorios** | La membresía es la del sujeto autenticado y está vigente |
| **Transacción** | `organizations.resign_membership(...)` resuelve la membresía desde la persona del contexto y ejecuta la misma baja coordinada de `OP-ORG-009` |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `organization.membership_resigned.v1` |
| **Reglas** | Un `owner` no puede renunciar sin transferir ownership antes. Cualquier persona con membresía propia activa no-owner puede renunciar aunque no conserve roles. La renuncia cierra incondicionalmente sus asignaciones efectivas y notifica a la administración de la organización |
| **Falla cerrada** | Membresía con rol `owner`, rechazo |

#### `OP-ORG-011` — Transferir propiedad

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/ownership-transfers` |
| **Actor** | `A5` — `owner` vigente de `{orgId}` |
| **Filtros obligatorios** | `target_membership_id` pertenece a `{orgId}`, está activa y no es la membresía owner actual |
| **Transacción** | `organizations.transfer_ownership(...)` bloquea en orden la organización, ambas membresías y sus filas de rol `owner`; cierra el rol anterior, abre el destino, registra `ORGANIZATION_EVENT` y ambos `MEMBERSHIP_EVENT`, y confirma solo si `organizations.enforce_exactly_one_active_owner_ct` observa exactamente uno |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; el replay devuelve el mismo owner resultante y nunca vuelve a intercambiar roles |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Transferencias concurrentes serializan por el lock de organización; la perdedora relee o recibe conflicto sin estado parcial |
| **Información sensible** | Ninguna categoría personal; cambia la máxima autoridad organizacional |
| **Evento de dominio** | `organization.ownership_transferred.v1` |
| **Reglas** | El owner anterior conserva membresía activa y roles no `owner`. Si no tiene otro rol queda sin capacidades hasta asignación explícita o `OP-ORG-010`; no se asigna un rol residual implícito |
| **Falla cerrada** | Actor no owner, destino inactivo/ajeno, organización no activa o imposibilidad de conservar exactamente un owner: rollback completo |

#### `OP-ORG-012` — Cerrar la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/closure` |
| **Actor** | `A5` |
| **Filtros obligatorios** | Membresía `owner` vigente |
| **Transacción** | `organizations.close_organization(...)` coordina una sola transacción PostgreSQL y llama, en orden estable, los contratos públicos `relationships.terminate_for_organization(...)`, `privacy.apply_organization_closure(...)`, `planning.detach_for_organization_closure(...)`, `execution.cancel_proposals_for_organization_closure(...)` y `nutrition.cancel_proposals_for_organization_closure(...)`; después cierra membresías y organización. Ningún dominio escribe directamente tablas de otro |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Afecta el acceso a todas las categorías concedidas a esta organización |
| **Evento de dominio** | `organization.closed.v1`, más un `relationship.terminated.v1` por relación |
| **Reglas** | Los contratos públicos son estrechos y reciben `organization_id`, un instante efectivo único y el command ID; cada dominio conserva ownership de sus invariantes. Ejecución cancela propuestas de corrección pendientes y Nutrición cancela propuestas nutricionales pendientes. Cerrar no elimina el Fitness ID ni ejecuciones. La organización conserva únicamente evidencia bilateral mínima bajo finalidad, acceso restringido y plazo; retener no es mantener acceso ordinario |
| **Falla cerrada** | Si cualquier contrato de Relaciones, Privacidad, Planificación, Ejecución o Nutrición falla, la transacción entera se revierte |

**Implementation note (STUDIO-11).** The coordinator first calls
`payments.check_organization_closure`, which refuses with `22023` while a client
subscription is not ended: no contract ends an external charge. It also calls
`identity.revoke_invitations_for_organization_closure`, so no pending invitation
can be accepted after the closure. `privacy.apply_organization_closure` verifies
that no grant of the organization is still active; `close_relationship` already
froze them. Program assignments are
detached by `close_relationship` itself, which `terminate_for_organization` runs
for every relationship, so there is no separate
`planning.detach_for_organization_closure` (STUDIO-39/40; `T-ORG-CLOSURE-INT-19/21/22`).
There is no `execution.cancel_proposals_for_organization_closure` either. Since migration
`20261112090000_a_coach_proposes_a_correction_and_she_decides.sql` (STUDIO-52),
`close_relationship` calls `execution.cancel_relationship_correction_proposals` for each
relationship it ends, so every pending correction proposal is cancelled with
`relationship_terminated` at the closure instant (`T-ORG-CLOSURE-INT-20`,
`T-EXE-PROPOSAL-CANCEL-INT-06/07`). Only an `active` organization can be
closed. A new command after the closure converges on the original instant.
There is no `nutrition.cancel_proposals_for_organization_closure` either: since migration
`20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql` (STUDIO-61..65), `close_relationship` also cancels each
relationship's pending nutrition goal proposals at the same instant.

#### `OP-ORG-013` — Consultar la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}` |
| **Actor** | `A3`–`A6` |
| **Filtros obligatorios** | Membresía vigente en `{orgId}` |
| **Transacción** | Una sola transacción resuelve cuenta/persona, fija contexto con `SET LOCAL`, consulta la proyección cerrada y registra `privacy.log_access_event` antes de devolver contenido; si la auditoría falla, no retorna la proyección |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | `Cache-Control: private, no-store`; devuelve `revision_number` y `ETag: "organization:{id}:r{revision}"` fuerte |
| **Información sensible** | `legal_name` y `organization_sites.address` pueden ser `identity_pii`; excluye el JSON de `responsible_party`, identificadores legales y contacto |
| **Evento de dominio** | Ninguno |
| **Reglas** | Proyección cerrada: `id`, `display_name`, `legal_name`, `type_code`, `status`, `revision_number` y contexto mínimo de sedes (`id`, `name`, `address`, `status`, `revision_number`). Una organización nunca es legible por miembros de otra |
| **Falla cerrada** | Sin membresía, misma respuesta `404` que "no existe"; antes de devolver registra sujeto organización, modo `organization_operational` y recurso `organizations.organization_context`; un fallo de `ACCESS_EVENT` revierte la lectura |

#### `OP-ORG-014` — Listar mis membresías

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/me/memberships` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: organización, desempate por identificador |
| **Offline / concurrencia** | Cacheable para presentación, **nunca** para decidir en qué organización se puede actuar |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | Es una operación personal de Studio fuera del ámbito `/organizations/{orgId}`. Devuelve organizaciones, roles vigentes y capacidades efectivas |
| **Falla cerrada** | — |

#### `OP-ORG-019` — Consultar catálogo de tipos de organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organization-types` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona activa = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Sin paginación. Orden gobernado por código |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve únicamente los tipos activos `professional_practice`, `gym` y `studio`. `professional_practice` se presenta como “Profesional independiente”. `academy` y `clinic` permanecen gobernados pero inactivos hasta que un caso real V1 sea aprobado. El cliente nunca inventa ni persiste tipos libres |
| **Falla cerrada** | Sin persona activa, rechazo |

#### `OP-ORG-020` — Resolver el contexto de entrada de Studio

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/entry-context` |
| **Actor** | `A1`, `A2` |
| **Filtros obligatorios** | Cuenta autenticada resuelta primero mediante RLS. Si existe persona, debe estar activa y sus membresías se leen bajo su contexto RLS |
| **Transacción** | La resolución account/person ocurre en una sentencia; la consulta de membresías ocurre una vez para una persona completa |
| **Idempotencia** | N/A |
| **Paginación y orden** | Sin paginación; mismo orden que `OP-ORG-014` |
| **Offline / concurrencia** | `Cache-Control: private, no-store`. El snapshot de cliente por 30 segundos solo optimiza presentación y nunca autoriza otra operación |
| **Información sensible** | Nombre y email verificado de la cuenta; organizaciones y roles propios. No expone tokens ni identificadores internos de account/person |
| **Evento de dominio** | Ninguno |
| **Reglas** | Una cuenta sin persona recibe `incomplete` y una lista vacía. Una persona activa recibe `complete` y sus membresías. La proyección de cliente nunca sustituye la autorización PostgreSQL de otra operación |
| **Falla cerrada** | Sin sesión o referencia irresoluble: `401`; persona cerrada: `403`; dependencia o configuración fallida: `503` |

#### `OP-ORG-015` — Listar membresías de la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/memberships` |
| **Actor** | `A4`, `A5`, `A6` |
| **Filtros obligatorios** | Membresía vigente con capacidad de administración o de directorio |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: estado y nombre, desempate por identificador |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Identidad de los integrantes. **Ningún** dato fitness de ellos, aunque también sean personas con Fitness ID |
| **Evento de dominio** | Ninguno |
| **Reglas** | Un integrante que además es cliente de la organización aparece aquí solo por su membresía; su condición de cliente vive en el dominio de Relaciones y no se mezcla |
| **Falla cerrada** | — |

#### `OP-ORG-016` — Listar invitaciones emitidas

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/invitations` |
| **Actor** | `A4`, `A5`, `A6` |
| **Filtros obligatorios** | Invitaciones de equipo patrocinadas por `{orgId}` y filtro opcional de estado |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: emisión descendente, desempate por identificador |
| **Offline / concurrencia** | `no-store`; el cursor conserva el filtro y el orden estable |
| **Información sensible** | Contactos invitados |
| **Evento de dominio** | Ninguno |
| **Reglas** | Muestra contacto completo, rol, vencimiento y estado por **intención** únicamente a actores autorizados. Nunca revela si el contacto tiene cuenta en Allfit mientras la invitación siga pendiente |
| **Falla cerrada** | — |

#### `OP-ORG-017` — Consultar catálogo de roles y capacidades

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/roles` |
| **Actor** | `A3`–`A6` |
| **Filtros obligatorios** | Membresía vigente |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica: el catálogo V1 es cerrado y pequeño |
| **Offline / concurrencia** | Cacheable |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve los cuatro roles V1 y sus capacidades. No admite creación de roles personalizados |
| **Falla cerrada** | — |

### 7.3 Relaciones

Dueño de `SERVICE_RELATIONSHIP`, `RESPONSIBLE_PARTY_SNAPSHOT`, `RELATIONSHIP_PROFESSIONAL_ASSIGNMENT`, sus suplencias y sus eventos.

Regla que gobierna todo el dominio: **una relación no es autorización de datos**. Una relación activa sin ningún grant es un estado válido y frecuente: significa que existe un vínculo de servicio y que la persona todavía no ha compartido nada.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-REL-001` | Invitar a una persona como cliente | Comando | `A3`–`A6` |
| `OP-REL-002` | Asignar profesional titular | Comando | `A4`, `A5` |
| `OP-REL-003` | Reasignar profesional titular | Comando | `A4`, `A5` |
| `OP-REL-004` | Proponer una suplencia | Comando | `A3`, `A4`, `A5` |
| `OP-REL-005` | Decidir una suplencia propuesta | Comando | `A2` |
| `OP-REL-006` | Terminar una suplencia | Comando | `A2`, `A4`, `A5` |
| `OP-REL-007` | Terminar la relación (persona) | Comando | `A2` |
| `OP-REL-008` | Terminar la relación (organización) | Comando | `A4`, `A5` |
| `OP-REL-009` | Solicitar la terminación (coach) | Comando | `A3` |
| `OP-REL-010` | Listar el directorio de clientes | Consulta | `A3`–`A6` |
| `OP-REL-011` | Consultar una relación | Consulta | `A3`–`A6` |
| `OP-REL-012` | Listar mis relaciones | Consulta | `A2` |
| `OP-REL-013` | Consultar suplencias de una relación | Consulta | `A2`, `A3`–`A5` |
| `OP-REL-014` | Consultar el historial de una relación | Consulta | `A2`, `A4`, `A5` |
| `OP-REL-015` | Consultar qué pide una invitación de cliente | Consulta | `A2` |
| `OP-REL-017` | Withdraw a termination request (coach) | Command | `A3` |
| `OP-REL-018` | Refuse a termination request | Command | `A4`, `A5` |
| `OP-REL-019` | Open the card of a client | Query | `A3` attending her; a former attendant for thirty days |
| `OP-REL-020` | See what needs attention today | Query | `A3`–`A6`, by capability |

---

#### `OP-ORG-018` — Crear una organización y entregarla a su dueño

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/organizations` |
| **Actor** | `A10` con rol base, `manage_organization_lifecycle`, AAL2 y deber vigente |
| **Filtros obligatorios** | Tipo del catálogo gobernado; destino de la invitación es un email, **nunca** un `person_id` |
| **Transacción** | Una sola: crear `ORGANIZATION` en estado `unclaimed`, su sede inicial si se declara, y la `INVITATION` con intención de propiedad dirigida al futuro dueño |
| **Idempotencia** | `Idempotency-Key`. Un reintento devuelve la organización creada, nunca una segunda |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contacto del futuro dueño. Ningún dato fitness |
| **Evento de dominio** | `organization.created_unclaimed.v1` |
| **Reglas** | Es la excepción acotada a la regla de que una organización la crea su dueño, y existe solo para venta asistida. Mientras esté `unclaimed` la organización **no opera**: no invita clientes, no publica planes, no recibe pagos y **no tiene membresías**. Allfit **no la administra** en ese intervalo: solo puede reenviar la invitación o cancelar la creación. Al aceptar, el destinatario obtiene la membresía `owner` y la organización pasa a `active`. Allfit **no crea las cuentas del equipo**: el dueño invita a los suyos con `OP-ORG-005` |
| **Falla cerrada** | Si la invitación no puede crearse, no se crea la organización: no queda una organización huérfana sin destinatario |
| **Implementación (`HU-BO-014`)** | `organizations.create_unclaimed_organization`. Una empresa se nombra al crear; una persona natural se nombra con su propia identidad al aceptar, así que el comando no acepta el nombre de una persona. La organización, su sede y la invitación registran a la persona de Allfit y la asignación de deber bajo la que actuó. Aceptar ocurre en `identity.decide_ownership_invitation` (`OP-IDN-009`); quien emitió la invitación no puede aceptarla |

#### `OP-ORG-021` — Reenviar la invitación de propiedad

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/organizations/{orgId}/handover/resends` |
| **Actor** | `A10` con rol base, `manage_organization_lifecycle`, AAL2 y deber vigente |
| **Filtros obligatorios** | Organización `unclaimed` con una invitación de propiedad. El comando no lleva cuerpo: nunca cambia la dirección |
| **Transacción** | Una invitación vigente se extiende y se reenvía tal cual, así que el enlace del primer correo sigue sirviendo. Una vencida o rechazada se reemplaza por una nueva a la misma dirección |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; una organización ya reclamada o cancelada responde conflicto |
| **Información sensible** | Contacto del futuro dueño, que la respuesta solo muestra enmascarado |
| **Evento de dominio** | `organization.ownership_invited.v1` |
| **Reglas** | Allfit no administra la organización en el intervalo: reenviar es una de sus dos únicas acciones (`HU-BO-014`, criterio 4). Cada reenvío queda en `identity.invitation_resends` (`HU-BO-011`, criterio 6), y la invitación nueva de una reemisión apunta a la reemplazada con `reissues_invitation_id` |

#### `OP-ORG-022` — Cancelar una organización que nadie reclamó

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/organizations/{orgId}/cancellation` |
| **Actor** | `A10` con rol base, `manage_organization_lifecycle`, AAL2 y deber vigente; no se deriva de `allfit_admin` |
| **Filtros obligatorios** | Organización `unclaimed`. Una organización con dueño la cierra su propietario (`OP-ORG-012`), nunca Allfit desde aquí |
| **Transacción** | Pasar a `cancelled` con `cancelled_at`, retirar las invitaciones pendientes y registrar `organization.cancelled.v1` con la persona y el deber de Allfit |
| **Idempotencia** | `Idempotency-Key`. Cancelar una organización ya cancelada converge sin registrar una segunda cancelación |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; una organización reclamada entretanto responde conflicto |
| **Información sensible** | Ninguna |
| **Evento de dominio** | `organization.cancelled.v1` |
| **Reglas** | `HU-BO-015`. `cancelled` solo se alcanza desde `unclaimed` y conserva la auditoría |

#### `OP-REL-001` — Invitar a una persona como cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/invitations` con intención `service_relationship` y, opcionalmente, `program_assignment` |
| **Actor** | `A3`–`A6` con capacidad de invitar |
| **Filtros obligatorios** | Membresía vigente. Destino email o celular, nunca `person_id`. Cada opción usa una definición de los siete scopes V1 publicada, nivel permitido y propósito declarado. Si incluye intención de programa, la versión referenciada debe estar publicada y pertenecer a `{orgId}` y debe ofrecer `relationship_training` con nivel compatible |
| **Transacción** | Crear `INVITATION`, sus `INVITATION_INTENT`, las `INVITATION_SCOPE_OPTION` de la relación y los snapshots exactos que se presentarán; encolar el envío |
| **Idempotencia** | `Idempotency-Key`. Reinvitar al mismo contacto con las mismas intenciones reutiliza la invitación vigente |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contacto de la persona invitada |
| **Evento de dominio** | `relationship.client_invited.v1` |
| **Reglas** | No crea persona, cuenta, relación, grant ni asignación. La persona decidirá relación, programa y cada scope de forma independiente en una sola confirmación (`OP-IDN-009`). Las opciones quedan fijadas al emitir; Studio no puede añadirlas o volver a pedirlas después sobre una relación activa |
| **Falla cerrada** | Versión de programa no publicada, rechazo de toda la invitación |
| **Implemented (program, STUDIO-16)** | `identity.issue_client_invitation` gains three trailing arguments, `p_program_version_id`, `p_program_starts_on` and `p_program_timezone`, defaulting to null (migration `20261106090000_an_invitation_can_offer_a_first_program.sql`). The surface is `POST /studio/v1/organizations/{orgId}/client-invitations` with an optional `program` object, not the team invitations route. Decided with the product owner on 2026-11-04: **only a member with `assign_programs` (a coach) proposes a program**, and staff, administrators and owners who do not coach get `403`; the "compatible level" is **`relationship_training` at `contribute`**, else `422` `/scopes`. The version must be `published`, of a program this organization owns and not archived, held `for share` until the invitation commits so a retirement cannot slip in between (`22023` `["program-version"]`); the start must be today or later in the proposed zone. Every refusal refuses the whole invitation. The program enters `proposal_hash`, so the same scopes with another program, none, or another start issue a new invitation; reusing a pending equal one stays as before. The projection adds `program_proposal`. |

#### `OP-REL-002` — Asignar profesional titular

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/relationships/{relId}/professional-assignments` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | La relación pertenece a `{orgId}` y está vigente. La membresía destino está vigente **en la misma organización** y tiene rol `coach` |
| **Transacción** | Crear `RELATIONSHIP_PROFESSIONAL_ASSIGNMENT` con vigencia abierta y registrar el hecho. V1 no tiene tabla `PROFESSIONAL_ASSIGNMENT_EVENT`: el evento viaja por el outbox, como en el resto del esquema |
| **Idempotencia** | `Idempotency-Key`. Asignar al mismo titular vigente no crea otra asignación y responde `200` con la fecha desde la que ya atendía |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Solo puede existir **un titular efectivo** a la vez: dos asignaciones concurrentes se serializan y la segunda falla contra el índice único |
| **Información sensible** | Ninguna categoría personal se transfiere aquí |
| **Evento de dominio** | `relationship.professional_assigned.v1` |
| **Reglas** | La asignación **no** concede datos: sin grant vigente el titular no lee nada. Un profesional de otra organización nunca puede asignarse, aunque la persona sea cliente de ambas. Esta operación **solo pone titular donde no hay**: quitárselo al que ya atiende es `OP-REL-003`, que avisa a la persona en la misma transacción, y hacerlo aquí sería hacerlo callada |
| **Falla cerrada** | Membresía de otra organización o sin rol `coach`, rechazo. Relación con otro titular vigente, `409` |

#### `OP-REL-003` — Reasignar profesional titular

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/relationships/{relId}/professional-assignments/reassignment` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | Igual que `OP-REL-002`, más la existencia de un titular vigente |
| **Transacción** | Una sola: cerrar la asignación anterior, abrir la nueva y encolar el aviso. El evento lleva el aviso ya redactado —contacto, nombres y organización—, porque leerlos al entregarlo exigiría ampliar las políticas de fila que mantienen relaciones y personas fuera del alcance del worker; así el aviso dice además lo que era cierto cuando ocurrió el cambio |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. La invalidación del acceso del actor anterior es inmediata, sin ventana de caché |
| **Información sensible** | Cambia **quién** puede ejercer los grants vigentes |
| **Evento de dominio** | `relationship.professional_reassigned.v1` |
| **Reglas** | El grant se conserva porque no cambian organización, parte responsable, finalidad ni scope; lo que cambia es el actor autorizado. El profesional anterior pierde acceso de inmediato y conserva la autoría de lo que registró. La persona **es notificada**: la reasignación no es silenciosa |
| **Falla cerrada** | Si la notificación no puede encolarse en la misma transacción, la reasignación no se confirma. Esto es estructural, no una comprobación: el aviso es una fila del outbox escrita por la propia función, así que no existe camino donde el cambio se confirme y el aviso no. También falla cerrada si la persona no tiene contacto registrado — una reasignación que nadie puede comunicar es justo la silenciosa que la operación existe para impedir. Relación sin titular vigente, `409` |

#### `OP-REL-004` — Proponer una suplencia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/relationships/{relId}/substitutions` |
| **Actor** | `A3` (el titular) o `A4`, `A5` |
| **Filtros obligatorios** | Relación vigente en `{orgId}`; membresía destino vigente en la **misma** organización con rol `coach`; vigencia propuesta acotada y con fecha de fin obligatoria |
| **Transacción** | Crear la suplencia en estado `pending_person_decision` y notificar a la persona |
| **Idempotencia** | `Idempotency-Key`. Una propuesta pendiente para el mismo suplente y ventana no se duplica |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna hasta que la persona acepte |
| **Evento de dominio** | `relationship.substitution_proposed.v1` |
| **Reglas** | Proponer **no** concede acceso. Ningún profesional adicional lee datos antes de la aceptación de la persona. La suplencia caduca sola al llegar su fecha de fin |
| **Falla cerrada** | Sin fecha de fin, rechazo |

#### `OP-REL-005` — Decidir una suplencia propuesta

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/relationships/{relId}/substitutions/{id}/decision` |
| **Actor** | `A2`, sujeto de la relación |
| **Filtros obligatorios** | La relación es propia y está vigente; la suplencia está pendiente y no vencida |
| **Transacción** | Registrar la decisión y, si acepta, activar la suplencia con su vigencia acotada |
| **Idempotencia** | `Idempotency-Key`. Una decisión ya registrada no se sobrescribe |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Habilita a un actor adicional sobre los grants vigentes de esa relación |
| **Evento de dominio** | `relationship.substitution_decided.v1` |
| **Reglas** | El suplente aceptado ejerce **los mismos grants ya vigentes**, sin ampliarlos: no obtiene un scope que el titular no tenga. Rechazar no afecta la relación ni al titular. Cada acceso del suplente queda en `ACCESS_EVENT` con su identidad real |
| **Falla cerrada** | Suplencia vencida, rechazo |
| **Implementado** | `relationships.decide_substitution` (migración `20261021120000`) sobre `POST /space/v1/relationships/{relationshipId}/substitutions/{substitutionId}/decision`, con cuerpo cerrado `{decision: accepted \| rejected}`. Solo una suplencia `proposed`, no vencida, de una relación propia y `active`, y una sola vez. Aceptar fija `accepted_by_person_at` y la deja `active`; rechazar la deja `rejected`, sin aceptación: el check `ck_relationship_professional_assignments_accepted` admite ahora ese estado. El silencio no es ninguna de las dos (`ADR-022`). Suplencia o relación ajena o inexistente: `P0002` → `404`. Ya decidida o vencida: `P0004` → `409`. Un reintento con la misma `Idempotency-Key` devuelve la decisión registrada con `Idempotent-Replay`. **Todavía no** escribe `relationship.substitution_decided.v1` en el outbox, y el historial (`OP-REL-014`) muestra la aceptación pero no el rechazo |

#### `OP-REL-006` — Terminar una suplencia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/relationships/{relId}/substitutions/{id}/termination` · `POST /studio/v1/organizations/{orgId}/relationships/{relId}/substitutions/{id}/termination` |
| **Actor** | `A2`, `A4`, `A5` |
| **Filtros obligatorios** | Suplencia vigente sobre una relación propia (persona) o de `{orgId}` (organización) |
| **Transacción** | Cerrar la vigencia y registrar el evento |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; invalidación inmediata |
| **Información sensible** | Retira un actor autorizado |
| **Evento de dominio** | `relationship.substitution_ended.v1` |
| **Reglas** | La persona puede terminar una suplencia en cualquier momento sin justificar y sin afectar la relación ni al titular |
| **Falla cerrada** | — |

#### `OP-REL-007` — Terminar la relación (persona)

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/relationships/{id}/termination` |
| **Actor** | `A2`, sujeto de la relación |
| **Filtros obligatorios** | La relación es propia y está vigente |
| **Transacción** | Una sola, con instante efectivo `T` único: cerrar la relación; **congelar** todos los `DATA_GRANT` de esa relación (`status='frozen'`, `frozen_at = T`), de modo que la organización conserve el histórico ≤ `T` y no reciba ningún dato posterior; cerrar asignaciones profesionales y suplencias; cerrar el `ASSIGNMENT_MANAGEMENT_PERIOD` de cada asignación administrada dejándolas en `detached_pending_choice`; pausar las sesiones planificadas futuras no iniciadas; cancelar propuestas de corrección y propuestas nutricionales pendientes originadas en esa relación; encolar la invalidación de read models y la notificación a la organización |
| **Idempotencia** | `Idempotency-Key`; converge al mismo `T` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Ninguna demora técnica mueve `T` ni amplía acceso: una lectura en curso iniciada antes de `T` no se extiende después |
| **Información sensible** | Corta el acceso **en vivo**; la organización conserva la lectura histórica ≤ `T` |
| **Evento de dominio** | `relationship.terminated.v1`, `privacy.grant_frozen.v1` por grant, `planning.assignment_detached.v1` por asignación |
| **Reglas** | El efecto es inmediato: no hay preaviso para la persona. La organización **conserva su vista congelada del histórico compartido hasta `T`**, más su contenido propio; los datos creados después de `T` nunca son visibles para ella. Congelar **no** es revocar: un estado `revoked` corta el acceso del todo, cierra los casos históricos abiertos e invalida derivados. La lectura solo ocurre por la superficie restringida de ADR-023, con `historical_access_case`, actor elegible, MFA, propósito y `access_control.can_read_frozen`; nunca por pertenencia administrativa ni endpoints operativos. Si la persona elimina su cuenta, la anonimización alcanza también lo que ve un grant congelado. El Fitness ID no se toca. El motivo es **opcional** |
| **Falla cerrada** | Si cualquier paso falla, se revierte todo: no existe una terminación a medias |
| **Implementado** | `relationships.end_my_relationship` (migración `20261021120000`) sobre `POST /space/v1/relationships/{relationshipId}/termination`, con `reason` opcional. Cierra con `ended_by_kind = 'person'` mediante `relationships.close_relationship`, la misma función que ahora usa `OP-REL-008`, así que la regla de congelamiento vive en un solo lugar: en un único instante `T` termina la relación, congela los grants `active` —uno ya revocado sigue revocado— y cierra la asignación del titular y las suplencias aceptadas. Una relación ya terminada converge al mismo `T` sin cerrarse dos veces, y el reintento con la misma `Idempotency-Key` responde `Idempotent-Replay`. Relación ajena o inexistente: `404`. Since migration `20261104090000_a_gym_assigns_a_program_through_the_relationship.sql` (STUDIO-39/40) `close_relationship` also calls `planning.detach_relationship_assignments` at the same `T`: each `active` assignment of the relationship becomes `detached_pending_choice`, its management period closes with `relationship_ended`, every session nobody started pauses, and `planning.assignment_detached.v1` is enqueued. Since migration `20261112090000_a_coach_proposes_a_correction_and_she_decides.sql` (STUDIO-52) it also calls `execution.cancel_relationship_correction_proposals` at the same `T`: every pending correction proposal of the relationship becomes `cancelled` with `relationship_terminated` and `settled_at = T`, and stays listed for her and for the professional who proposed it. A proposal already settled keeps its state (`T-EXE-PROPOSAL-CANCEL-INT-03/04`, `-CANCEL-LIST-01/02`). **Not yet:** cancelling pending nutrition proposals, and notifying the organization through the outbox |
| **As implemented, the historical surface (STUDIO-54..56)** | The restricted surface of ADR-023 that the rules above name exists since migration `20261116090000_a_case_opens_the_frozen_history.sql` (`OP-PRV-018`, `-019`, `-020` and `-025`). It asks for a Studio sign-in less than ten minutes old instead of MFA (the owner's decision of 8 November 2026). A case reads only what existed at `T`, which it stores as `cut_at` from this relationship's `ended_at`, so the instant this operation fixes is the cut every frozen read applies |
| **As implemented, pending nutrition proposals (STUDIO-61..65)** | The «not yet» above about nutrition no longer holds. Since migration `20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql`, `close_relationship` also calls `nutrition.cancel_relationship_goal_proposals` at the same `T`. Every goal version this relationship proposed and she has not decided becomes `cancelled`, with `cancelled_at = greatest(T, created_at)`, and stays in her history. It writes no `nutrition.goal_proposals_cancelled.v1`: `relationship.terminated.v1` already says the relationship ended. Tests: `T-NUT-INT-06`, `goal-proposal-concurrency.test.ts` |

#### `OP-REL-008` — Terminar la relación (organización)

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/relationships/{id}/termination` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | La relación pertenece a `{orgId}` y está vigente |
| **Transacción** | Idéntica a `OP-REL-007` |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Igual que `OP-REL-007` |
| **Evento de dominio** | `relationship.terminated.v1` y derivados |
| **Reglas** | Efecto inmediato, sin preaviso en V1. La persona es notificada y conserva su asignación desacoplada para decidir (`OP-PLN-015`). Un `coach` **no** puede ejecutar esta operación |
| **Falla cerrada** | Igual que `OP-REL-007` |
| **Implemented** | Detachment as in `OP-REL-007`, through the same `close_relationship` (STUDIO-39/40). `T-REL-TERMINATE-01` asserts it: the assignment waits for the person's choice, its period closes at `T`, a completed session stays completed and the next one pauses. Pending correction proposals are cancelled the same way (STUDIO-52, `T-EXE-PROPOSAL-CANCEL-INT-05`) Pending nutrition goal proposals too (STUDIO-61..65); the race against a proposal is in `goal-proposal-concurrency.test.ts`. |

#### `OP-REL-009` — Solicitar la terminación (coach)

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/relationships/{id}/termination-requests` |
| **Actor** | `A3`, titular de la relación, **sin** rol `admin` ni `owner` en `{orgId}` |
| **Filtros obligatorios** | Es el titular vigente de la relación en `{orgId}`. Si la misma persona tiene además rol `admin` u `owner`, la operación se rechaza: no solicita, termina con `OP-REL-008` |
| **Transacción** | Crear `relationships.relationship_termination_requests` en estado `pending` y notificar a la administración de la organización |
| **Idempotencia** | `Idempotency-Key`. El no-duplicado lo garantiza el unique parcial `UNIQUE (relationship_id) WHERE status = 'pending'`, no el código |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `relationship.termination_requested.v1` |
| **Reglas** | La solicitud **no** cambia el estado de la relación ni corta accesos: solo `A4`/`A5` o la persona terminan. La solicitud existe únicamente para el coach **sin poder de terminación**: un coach que también es `admin` u `owner` no necesita solicitar nada. Un coach que ya no quiere atender puede además renunciar a su asignación, lo que deja la relación sin titular pero vigente. La persona atendida no ve la solicitud: es deliberación interna de la organización |
| **Falla cerrada** | Solicitante con capacidad de terminar, o solicitud pendiente ya existente para esa relación: rechazo |
| **Implemented** | `relationships.request_relationship_termination` (migration `20261103090000`) behind `POST /studio/v1/organizations/{organizationId}/relationships/{relationshipId}/termination-requests`, with an optional `reason` (1–2000). The power to end is whatever `OP-REL-008` checks, `assign_professionals`, and the same capability refuses the request (`403`), including an administrator who also coaches the relationship. Only the current holder may ask: a cover or staff member gets `403`, a coach with no assignment `404`. A second pending request violates `uidx_relationship_termination_requests_pending` (`409`). The command takes `FOR SHARE` locks on the relationship and on the holder assignment, so a concurrent termination or reassignment either waits and settles the request, or makes it fail (`409`). It enqueues `relationship.termination_requested.v1` carrying the contact of every owner and administrator; **no worker delivers it yet**. The request settles on its own: `resolved` (with the actor's membership) when the organization ends the relationship through `close_relationship`, including `OP-ORG-012`; `superseded` when the person ends it, or when the holder assignment stops being active (reassignment, resignation, removal, role loss) through `trg_professional_assignments_after_update_supersede_requests`. Settling runs under the contract scope `termination_request_settlement`, because those actors cannot see the request. `OP-REL-011` now returns the latest request as `termination_request`, narrowed by the row policy |

#### `OP-REL-017` — Withdraw a termination request (coach)

| Field | Value |
| --- | --- |
| **Type** | Command |
| **Surface** | `POST /studio/v1/organizations/{orgId}/relationships/{id}/termination-requests/{terminationRequestId}/withdrawal` |
| **Actor** | `A3`, the coach who made the request |
| **Mandatory filters** | The request belongs to the relationship and to `{orgId}`; the actor owns `requested_by_membership_id` |
| **Transaction** | The `pending` request becomes `withdrawn`, with `resolved_by_membership_id` = the requester and `resolved_at` |
| **Idempotency** | `Idempotency-Key`. Withdrawing a request already withdrawn converges to it |
| **Offline / concurrency** | Fails closed; the request row is locked `FOR UPDATE` |
| **Sensitive information** | None |
| **Domain event** | None |
| **Rules** | Nobody else may withdraw it, the administration included (`403`). A request settled any other way is a `409` |
| **Implemented** | `relationships.withdraw_termination_request` (migration `20261103090000`) |

#### `OP-REL-018` — Refuse a termination request

| Field | Value |
| --- | --- |
| **Type** | Command |
| **Surface** | `POST /studio/v1/organizations/{orgId}/relationships/{id}/termination-requests/{terminationRequestId}/rejection` |
| **Actor** | `A4`, `A5` (`assign_professionals`, the same power `OP-REL-008` requires) |
| **Mandatory filters** | The request belongs to the relationship and to `{orgId}` and is `pending` |
| **Transaction** | The request becomes `rejected` with the `resolution` text, `resolved_by_membership_id` = the actor and `resolved_at` |
| **Idempotency** | `Idempotency-Key` |
| **Offline / concurrency** | Fails closed; the request row is locked `FOR UPDATE` |
| **Sensitive information** | None |
| **Domain event** | `relationship.termination_request_rejected.v1` to the requester, when she has a contact |
| **Rules** | A refusal always carries a `resolution` (1–2000). Accepting a request is not an operation: ending the relationship with `OP-REL-008` settles it as `resolved`. A coach is refused (`403`); a settled request is a `409` |
| **Implemented** | `relationships.reject_termination_request` (migration `20261103090000`). **No worker delivers the event yet** |

#### `OP-REL-010` — Listar el directorio de clientes

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients` |
| **Actor** | `A3`–`A6` |
| **Filtros obligatorios** | Dos clases de entrada, ambas de `{orgId}`: **relaciones**, y **invitaciones de tipo `service_relationship` todavía sin responder**. Para `A3`: solo las relaciones donde tiene asignación efectiva vigente, como titular o suplente, y solo las invitaciones que emitió esa persona |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: clase de entrada y nombre, desempate por identificador. Para una invitación, el nombre de ordenamiento es el contacto |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Identidad de la persona y estado del vínculo. **Ningún** dato fitness, ni siquiera agregado. Una invitación sin responder expone el contacto **enmascarado**, nunca completo |
| **Evento de dominio** | Ninguno. El directorio no consume grants y no genera `ACCESS_EVENT` |
| **Reglas** | `A6` (staff) ve el directorio completo de la organización: nombre, estado de relación y estado de invitación, y nada más. La existencia de un grant se muestra como estado, no como contenido.<br><br>Una entrada de invitación **no tiene persona ni nombre**: mientras nadie acepta, no existe persona, ni siquiera provisional (`HU-STUDIO-023`, criterio 8). Lleva el contacto enmascarado en su lugar.<br><br>El estrechamiento de `A3` sobre invitaciones es por emisor y no por asignación, porque una invitación sin responder no tiene asignación sobre la que estrechar |
| **Falla cerrada** | — |
| **Implemented, search (STUDIO-75, `HU-STUDIO-082`)** | Migration `20261118090000_a_member_finds_a_client_by_name.sql` (pull request allfitone#204, merged and deployed on 9 November 2026). `GET …/clients?q=` reaches `relationships.list_organization_clients(person, organization, status, limit, cursor_group, cursor_name, cursor_id, query)`, a new eight-argument `security definer` function. **Matching:** `q` is 2 to 80 characters once surrounding and repeated spaces are removed (the API refuses more than 200 raw characters); names only, compared through `relationships.fold_name` (spaces collapsed, Latin accents removed by an explicit `translate`, lower case), with `\`, `%` and `_` escaped so they match as characters. **Narrowing only:** the row policy still decides who comes back, so a coach finds only the people assigned to him; an owner who asks for `terminated` searches the former clients this directory already lists. **Invitations:** with `q`, none appears, because an invitation has no name; `q` with `status=invited` is `22023` → `422`, as is a blank, one-character or over-long `q`. **No match** is an empty `data` with `has_more: false`. **Cursor:** version 3 binds `filter_status` and a 16-character digest of the lowered search, so it never resumes another search; a version 2 cursor still resumes an unsearched page. **No access event**, as above. **Deploy gap:** the seven-argument signature stayed as a `security invoker` wrapper while the API was ahead of the migration; allfitone#205 (`20261119090000_the_directory_keeps_one_signature.sql`) dropped it, and the API binds a null search itself. Tests: `T-REL-DIRECTORY-03` (19), the search tests of `relationships/handlers/studio.test.ts`, `relationships/infrastructure/directory.test.ts` |

#### `OP-REL-015` — Consultar qué pide una invitación de cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `POST /space/v1/client-invitations/resolve` (por token) · `GET /space/v1/client-invitations/{invitationId}` (por identificador, desde `OP-IDN-056`) |
| **Actor** | `A2` |
| **Filtros obligatorios** | La invitación cuyo hash de token coincide —o cuyo identificador coincide—, con intención `service_relationship`. El contacto invitado debe ser el correo verificado del actor, en las dos rutas |
| **Transacción** | Ninguna, salvo el vencimiento resuelto en la lectura |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica. Las opciones de scope vuelven ordenadas por código |
| **Offline / concurrencia** | No cacheable |
| **Información sensible** | Las categorías de datos que una organización quiere leer de esta persona, con su finalidad, nivel y contrato tal como se presentó |
| **Evento de dominio** | `identity.invitation_expired.v1` cuando la lectura encuentra la invitación vencida |
| **Reglas** | **No resuelve de forma anónima**, a diferencia de `OP-IDN-016` (equipo) y de la de titularidad. Aquellas revelan el nombre de una organización y un rol propuesto, que el destinatario ya leyó en el correo; esta revela categorías de datos de salud, así que aplica la misma prueba de destinatario que la decisión: tener el token no basta.<br><br>Un actor que no supere esa prueba recibe rechazo, **no** una invitación con oferta vacía: una oferta vacía seguiría confirmando que la invitación existe.<br><br>El vencimiento se resuelve al leer, como en las invitaciones de equipo: entre que pasa el plazo y alguien llega con el enlace no corre nada más, y una invitación que se lea como vigente después de vencer sería respondida |
| **Falla cerrada** | Actor anónimo, hash que no mide 32 bytes, o correo verificado distinto del contacto invitado |
| **Implemented (program, STUDIO-16)** | Both functions are recreated with a `program_proposal` column (migration `20261106090000_an_invitation_can_offer_a_first_program.sql`): the offered version's id, title and number, its length in weeks (null when it repeats forever), the tentative start, the scope it needs and her decision once answered. She is not a member of the organization, so the function opens the contract scope `invitation_program`, keyed by the program intent, to read that one version and its sessions, and restores the previous scope before returning. |
| **Implementado** | `identity.resolve_client_invitation` (por token) e `identity.read_my_client_invitation` (por identificador), migración `20261021120000`. La segunda solo encuentra el hash de esa invitación y llama a la primera: la prueba del destinatario es una sola. Las dos responden además **`invited_by`**, el nombre de la persona cuya membresía emitió la invitación —nulo si no se puede resolver—, porque quién invita es parte de lo que la persona decide. Inexistente, inválida y vencida responden igual, `404` (`ADR-008`). La pantalla dice quién invita y que Allfit Pro va incluido; **no ofrece ningún programa**, porque esa intención no está construida en ninguna capa (ver `OP-IDN-009`) |

#### `OP-REL-011` — Consultar una relación

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/relationships/{id}` |
| **Actor** | `A3`–`A6` |
| **Filtros obligatorios** | La relación pertenece a `{orgId}`. Para `A3`: asignación efectiva vigente |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable para presentación, nunca para decidir autorización |
| **Información sensible** | Estado del vínculo, titular, suplencias y **estado** de los grants |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve qué scopes están concedidos y en qué versión, pero **no** el contenido que amparan. Saber que existe `health_context` concedido no es leer contexto de salud. El documento es más estrecho para `A3`: la política de fila le muestra su propia asignación y no las demás, así que un coach no ve quién más atendió a esa persona. Una relación que el actor no puede ver responde **`404`**, no `403`: decirle a un coach que existe pero no es suya ya le cuenta que el gimnasio tiene a esa persona como clienta |
| **Falla cerrada** | — |

#### `OP-REL-012` — Listar mis relaciones

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/relationships` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: vigencia descendente, desempate por identificador |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Organizaciones con las que la persona tiene o tuvo vínculo |
| **Evento de dominio** | Ninguno |
| **Reglas** | Incluye relaciones cerradas y, cuando existe, el enlace a la relación anterior con la misma organización: la continuidad se muestra sin que ello conceda ningún acceso a la relación nueva |
| **Falla cerrada** | — |
| **Implementado** | `relationships.list_my_relationships`. Desde la migración `20261021120000` responde también **`holder_name`**: el nombre del coach titular vigente, nulo si la relación no tiene titular (`HU-SP-018`) |

#### `OP-REL-013` — Consultar suplencias de una relación

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/relationships/{relId}/substitutions` · `GET /studio/v1/organizations/{orgId}/relationships/{relId}/substitutions` |
| **Actor** | `A2` (propia), `A3`–`A5` (de `{orgId}`) |
| **Filtros obligatorios** | Relación propia o de la organización |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: vigencia descendente |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Identidad de los profesionales autorizados |
| **Evento de dominio** | Ninguno |
| **Reglas** | La persona siempre puede ver quién está autorizado sobre sus datos, incluidas suplencias pendientes de su decisión |
| **Falla cerrada** | — |

#### `OP-REL-014` — Consultar el historial de una relación

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/relationships/{id}/events` · `GET /studio/v1/organizations/{orgId}/relationships/{id}/events` |
| **Actor** | `A2` (propia), `A4`, `A5` (de `{orgId}`) |
| **Filtros obligatorios** | Relación propia o de la organización |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: instante descendente |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Historia de altas, cambios de titular, suplencias, consentimientos y terminación |
| **Evento de dominio** | Ninguno |
| **Reglas** | `RELATIONSHIP_EVENT` es append-only. El motivo de terminación, cuando existe, es visible solo para la parte que lo declaró |
| **Falla cerrada** | — |
| **Implementado (Space)** | `relationships.read_relationship_history` admite desde la migración `20261021120000` a la persona leyendo su propia relación, sin organización y nunca a través de una membresía que no tiene. Responde `private, no-store`. Cada lector ve solo el motivo que declaró su lado: el motivo que dio el gimnasio nunca se le muestra a ella, ni el de ella al gimnasio; `declared_by_us` dice cuál es el caso. Relación ajena o inexistente: `404`, como en `OP-REL-011`. Desde la migración `20261022120000` incluye el tipo `grant_revoked` (rango 9), con `scope_code` en el detalle y nunca lo que el scope cubría |

#### `OP-REL-019` — Open the card of a client

| Field | Value |
| --- | --- |
| **Type** | Query |
| **Surface** | `GET /studio/v1/organizations/{orgId}/clients/{personId}` (`getStudioClientCard`) |
| **Actor** | `A3` who attends her: the holder, or a cover she accepted whose `ends_on` has not passed. For thirty days, also the coach who attended her through his current membership |
| **Mandatory filters** | A live membership in an active `{orgId}`; an active relationship of `{personId}` there; an active assignment of that membership in effect now (the predicate of `relationships.actor_is_assigned`), holder first |
| **Transaction** | None. It reads no fitness data |
| **Idempotency** | N/A |
| **Pagination and order** | Not applicable. Sections follow the order of `ScopeCode` |
| **Offline / concurrency** | `private, no-store` |
| **Sensitive information** | Her name, the relationship, how he attends her, and the **state** of each category she shares or withdrew, never its content |
| **Domain event** | None. No `ACCESS_EVENT`, like `OP-REL-011` and `OP-PRV-023`: each section is read through its own audited operation |
| **Rules** | The card is an index (`HU-STUDIO-083`). `sections` lists each category with an active grant: version, level, `granted_at`, and the operations that read it (`reads`). `nutrition_media` appears only while `nutrition_intake` is active too. `withdrawn` lists each category revoked and not shared again, with when. A category she never shared, or refused, appears nowhere, not as empty and not as locked. No counts. A coach who no longer attends her gets `kind: former` with a reason for thirty days (`HU-STUDIO-084`) |
| **Fail closed** | Everyone else, an owner or administrator who does not attend her included, gets the same `404` as for somebody who does not exist |
| **Implemented (STUDIO-76/77)** | `relationships.read_client_card(person, organization, subject)`, migration `20261118100000_a_coach_opens_the_card_of_a_client.sql` (pull request allfitone#204, merged and deployed on 9 November 2026); `cookieAuth`, exact Studio `Origin`, `200 StudioClientCard`. **Attending:** `{kind: attending, person_id, display_name, relationship {id, started_at}, attendance {role, ends_on}, sections[], withdrawn[]}`, from `relationships.client_card_grants`; `ends_on` is null for a holder. The API adds each section's `reads` from `CARD_READS` (`apps/api/src/domains/relationships/handlers/client-card.ts`). **Former:** `{kind: former, person_id, reason, lost_at}` from `relationships.former_attendance(membership, organization, subject)`. It looks only at the caller's current membership, at holder assignments and at covers she accepted, `active` or `ended`; a cover ends at the earlier of `valid_to` and the start of the day after `ends_on`. The last attendance that ended decides, holder first on a tie: `relationship_ended` at `ended_at` when the link is terminated and that attendance was in effect when it ended, otherwise `assignment_ended` (holder) or `substitution_ended` (cover) at its end. It answers only while `lost_at` is less than thirty days old, never with a name, the relationship or a grant, and the same facts give the same answer if she later comes back with another coach. It reads the terminated row through the policy `service_relationships_select_former_attendance` under the contract scope `former_attendance` (ADR-047). **Deviations:** §5.7 and `T-PERSON-3` give way for the former attendant only (ADR-047). **Errors:** no live membership in an active organization `42501` → `403`; neither attending nor former `P0002` → `404` with one message for every case; an invalid identifier `400`; a wrong `Origin` `403`; no session `401`. Tests: `T-REL-CARD-01` (19), `T-REL-CARD-02` (22), `T-REL-CARD-API-01..05`, `relationships/infrastructure/card-and-today.test.ts` |

#### `OP-REL-020` — See what needs attention today

| Field | Value |
| --- | --- |
| **Type** | Query |
| **Surface** | `GET /studio/v1/organizations/{orgId}/today` (`getStudioToday`) |
| **Actor** | `A3`–`A6`; each notice by its own capability |
| **Mandatory filters** | A live membership in an active `{orgId}` holding at least one of `invite_clients`, `assign_professionals`, `terminate_relationships`, `invite`, `manage_memberships`, `view_directory` or `observe_training`. Row policies still apply underneath |
| **Transaction** | One read. The `training` notice writes one `ACCESS_EVENT` per client it evaluates |
| **Idempotency** | N/A |
| **Pagination and order** | None. Each notice counts everything it covers and lists at most five |
| **Offline / concurrency** | `private, no-store` |
| **Sensitive information** | Names, masked contacts, the state of links and requests. For `training`, whether a client left sessions of her last closed week unlogged and what she finished in the last 48 hours |
| **Domain event** | None |
| **Rules** | `HU-STUDIO-081`. A notice the caller cannot act on is absent, not empty. Each carries a link to the operation that resolves it. `empty` is true when no notice other than `team` has a count. A refused or revoked category never appears as something to ask for again (criterion 7). Failed charges join when `E-STUDIO-13` exists |
| **Fail closed** | No capability at all is `403`; the training part never runs without a request id to record under |
| **Implemented (STUDIO-74)** | `relationships.read_studio_today(person, organization)`, migration `20261118120000_a_studio_member_sees_what_needs_attention_today.sql` (pull request allfitone#204, merged and deployed on 9 November 2026); `cookieAuth`, exact Studio `Origin`, `200 StudioToday {organization_id, generated_at, empty, notices}`. **Notices:** `client_invitations` (`invite_clients`; client invitations awaiting an answer or lapsed in the last seven days, newest first, contact masked, only the caller's own without `view_directory`; `count`, `awaiting`, `lapsed`); `unassigned_relationships` (`assign_professionals`; live, no holder in effect, a cover does not count; oldest first); `termination_requests` (`terminate_relationships`; pending, oldest first); `team_invitations` (`invite`; as for clients, with `proposed_role_code`); `team` (`manage_memberships`; members with a role in force, `by_role`); `new_relationships` (`view_directory`; live, begun in the last seven days, newest first); `training` (`observe_training`). **Links** (`TODAY_LINKS` in `client-card.ts`): `listStudioOrganizationClients` with `status=invited` or `status=active`, `assignRelationshipHolder`, `terminateRelationship`, `listStudioTeamInvitations`, `listStudioOrganizationMemberships` and, for training, `getStudioClientCard`. **Training:** `relationships.today_training(organization, now)` visits each active relationship where `access_control.can_access(relationship, 'relationship_training', 'read')` holds, so only clients the caller attends who share that category. For each it writes one `privacy.access_events` row (`live`, `allowed`, resource `relationships.studio_today`, purpose `studio_attention_today`, her grant and its version), opens `session_screening` for that relationship, counts the planned sessions of her last closed week (Monday to Sunday in each session's timezone, ADR-032) in assignments with an open management period of the relationship, cancelled and paused ones excluded, logged only with a completed, non-annulled execution, and counts what she completed inside the relationship in the last 48 hours, never an autonomous session; then closes the scope. She is listed when something is unlogged or recent, the most unlogged first, with `closed_week {week_starts_on, planned, not_logged}` (null when nothing was due) and `recent_results {count, last_ended_at}`. A client listed or not is recorded alike; a client without an active grant is neither. **Errors:** no live membership, or none of the seven capabilities, `42501` → `403`; with `observe_training` and no `app.request_id`, `22023` (the API always sends one). Tests: `T-REL-TODAY-01` (24), `T-REL-TODAY-02` (17), `T-REL-TODAY-API-01..03`, `relationships/infrastructure/card-and-today.test.ts` |

### 7.4 Privacidad

Dueño de `SCOPE_DEFINITION`, `SCOPE_RESOURCE_RULE`, `DATA_CLASSIFICATION`, `CONSENT_EVENT`, `DATA_GRANT`, `SESSION_VISIBILITY_DENIAL`, `HISTORICAL_ACCESS_CASE`, `ACCESS_EVENT`, `ERASURE_REQUEST`, `RETENTION_POLICY`, `DISPOSITION_CASE`, `DISPOSITION_ITEM`, `DISPOSITION_EVENT`, `LEGAL_HOLD` y `HOLD_APPLICATION`.

Reglas que gobiernan todo el dominio:

- Los siete scopes V1 —`relationship_training`, `prior_training_history`, `body_progress`, `health_context`, `nutrition_intake`, `nutrition_guidance`, `nutrition_media`— son **independientes** para consentimiento y revocación: ninguno se hereda de otro. La proyección de media exige además intake para no revelar la existencia de una comida.
- No existe ni existirá un scope, endpoint o proyección equivalente a `all_data`.
- Cada grant congela una **versión exacta** de `SCOPE_DEFINITION`. Publicar una v2 más amplia no amplía los grants v1.
- El consentimiento se otorga a la **parte responsable** presentada, materializado sobre la organización de la relación; lo ejercen únicamente los profesionales asignados con membresía y capacidad vigentes.
- Un grant `frozen` no usa la fórmula profesional: exige un `HISTORICAL_ACCESS_CASE` exacto, MFA, propósito permitido, field-set histórico y auditoría según ADR-023.
  - **As implemented (STUDIO-54..56):** a Studio sign-in less than ten minutes old instead of MFA, by the owner's decision of 8 November 2026 (ADR-023, *As implemented*). See `OP-PRV-018`, `-019`, `-020` and `-025`.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-PRV-005` | Revocar un grant | Comando | `A2` |
| `OP-PRV-006` | Ocultar una sesión autónoma para una relación | Comando | `A2` |
| `OP-PRV-007` | Revertir la ocultación de una sesión | Comando | `A2` |
| `OP-PRV-008` | Crear una solicitud de supresión | Comando | `A2` |
| `OP-PRV-009` | Aplicar un hold legal | Comando | `A10` |
| `OP-PRV-010` | Liberar un hold legal | Comando | `A10` |
| `OP-PRV-011` | Publicar una versión de definición de scope | Comando | `A11` |
| `OP-PRV-012` | Consultar definiciones de scope publicadas | Consulta | `A2`, `A3`–`A6` |
| `OP-PRV-013` | Listar mis grants y decisiones de consentimiento | Consulta | `A2` |
| `OP-PRV-014` | Listar grants recibidos por la organización | Consulta | `A3`–`A5` |
| `OP-PRV-015` | Consultar el historial de accesos a mis datos | Consulta | `A2` |
| `OP-PRV-016` | Consultar el estado de una solicitud de supresión | Consulta | `A2` |
| `OP-PRV-017` | Listar mis ocultaciones de sesión | Consulta | `A2` |
| `OP-PRV-018` | Abrir un caso de acceso histórico | Comando | `A4`, `A5` |
| `OP-PRV-019` | Cerrar un caso de acceso histórico | Comando | `A4`, `A5` |
| `OP-PRV-020` | Consultar una relación histórica congelada | Consulta | `A3`, `A4`, `A5` autorizados por el caso |
| `OP-PRV-021` | Seguir las solicitudes de eliminación | Consulta | `A6` con `manage_privacy_requests` |
| `OP-PRV-022` | Consultar las categorías de información | Consulta | `A2`, `A3`–`A6` |
| `OP-PRV-023` | Ver qué nos autorizó cada persona | Consulta | `A3`–`A5` con capacidad de directorio |
| `OP-PRV-025` | List historical access cases | Consulta | `A3`–`A5`: every case with `manage_historical_access`, otherwise only the cases that authorize them |

`OP-PRV-024` is not listed here, but it is taken: the OpenAPI assigns it to `listBackofficeLegalHolds` (`GET /backoffice/v1/legal-holds`).

---

#### `OP-PRV-005` — Revocar un grant

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/consents/{id}/revocation` |
| **Actor** | `A2`, titular del grant |
| **Filtros obligatorios** | El grant es propio y está `active` o `frozen` |
| **Transacción** | Una sola: cambiar el grant a `revoked`, registrar `CONSENT_EVENT`, cerrar todos los `HISTORICAL_ACCESS_CASE` abiertos de la relación e **invalidar en la misma transacción** los read models, proyecciones, cachés y exportaciones pendientes del scope revocado |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. La invalidación es inmediata y sin ventana: no existe un SLA de propagación tolerado |
| **Información sensible** | Corta el acceso a la categoría revocada |
| **Evento de dominio** | `privacy.grant_revoked.v1` |
| **Reglas** | Revocar elimina acceso en vivo e histórico, **no** el dato del Fitness ID. La transición `frozen → revoked` es inmediata y el grant anterior nunca se reactiva; volver a compartir exige relación y consentimiento nuevos. Revocar `body_progress` bloquea al tercero sin borrar las mediciones. Los `ACCESS_EVENT` anteriores permanecen: son evidencia, no acceso. Revocar un scope no revoca los demás |
| **Falla cerrada** | Si la invalidación de derivados no puede confirmarse, la revocación se revierte y se reintenta: nunca se reporta revocado algo que sigue siendo legible |
| **Implementado** | `privacy.revoke_my_grant` (migración `20261022120000`) sobre `POST /space/v1/consents/{grantId}/revocation` (`revokeConsentGrant`), sin cuerpo. Un grant propio `active` o `frozen` pasa a `revoked` con `revoked_at`; solo ese, los demás no se mueven, y nada se borra (`ADR-012`). Un grant congelado por una relación terminada también se revoca (`ADR-023`). El trigger de transición existente impide reabrirlo: volver a compartir exige un consentimiento nuevo (`ADR-007`). Grant ajeno o inexistente: `P0002` → `404`, sin distinguirlos. Ya revocado por otro comando: `P0004` → `409`. Un reintento con la misma `Idempotency-Key` devuelve la misma respuesta con `Idempotent-Replay`. En la misma transacción escribe `privacy.grant_revoked.v1` en el outbox con `grant_id`, `relationship_id`, `organization_id`, `scope_code`, `scope_version` y `revoked_at`, nunca contenido amparado. **Desviación: no escribe `CONSENT_EVENT`.** `privacy.consent_events` registra respuestas a una opción de invitación —`decision` `accepted \| rejected` y FK obligatoria a la opción— y una revocación no responde ninguna. La evidencia es el propio grant, inmutable una vez revocado, más el evento del outbox. **Invalidación:** hoy no existe ninguna proyección ni caché sobre grants y cada lector comprueba el estado del grant en la misma sentencia, así que el corte es inmediato (`HU-SP-031`, criterio 2); quien añada una proyección o caché tendrá que invalidarla aquí. **Todavía no** cierra `HISTORICAL_ACCESS_CASE`: la tabla no existe y no hay nada que cerrar (`HU-SP-031`, criterio 6). Avisar a la organización no forma parte de esta operación. El historial de la relación (`OP-REL-014`) muestra `grant_revoked` |
| **As implemented (STUDIO-54..56)** | The «todavía no» above no longer holds. Since migration `20261116090000_a_case_opens_the_frozen_history.sql`, the trigger `trg_data_grants_after_update_historical_cases` (`privacy.close_cases_of_revoked_grant_tg`, `after update of status`, only `frozen → revoked`) closes every open historical access case of the relationship in the same transaction. Each closes with `closed_reason = 'grant_revoked'` and `closed_at` at the revocation, or `expired` at its `expires_at` if its hours had already run out, and enqueues `privacy.historical_access_case_closed.v1`. Revoking an `active` grant closes nothing, because an active relationship has no case. `HU-SP-031` criterion 6 is met (`T-PRV-HIST-AUTO-04..06`, `T-PRV-HIST-API-28`, `historical-access-case-concurrency.test.ts`) |
| **Regla para métricas de la organización** | Revocar, también un grant congelado, nunca debe mover un indicador del gimnasio. Altas, bajas, retención, duración de la relación, pagos y sesiones asignadas salen de la relación, la suscripción y las asignaciones, que no dependen de ningún grant. Un indicador que use contenido personal (medidas, entrenos, comidas) se guarda ya anonimizado en el momento de calcularlo y no se recalcula leyendo a través de grants. Revocar corta el acceso al historial de esa persona, no las cifras agregadas que el gimnasio ya obtuvo legítimamente. |

#### `OP-PRV-006` — Ocultar una sesión autónoma para una relación

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PUT /space/v1/executions/{id}/visibility` |
| **Actor** | `A2`, dueño de la ejecución |
| **Filtros obligatorios** | La ejecución es propia y es **actividad autónoma o previa elegible**; la relación indicada es propia y está activa o terminada con grant `frozen` |
| **Transacción** | Crear o actualizar la `SESSION_VISIBILITY_DENIAL` para el par (sesión, relación); si la relación está terminada, fijar `frozen_denied_at` sin permitir que vuelva a `NULL`; invalidar agregados, históricos y cachés que la incluían |
| **Idempotencia** | `Idempotency-Key`. Una fila efectiva por par |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Historial previo y autónomo |
| **Evento de dominio** | `privacy.session_visibility_denied.v1` |
| **Reglas** | La denegación se evalúa **antes** de proyectar o agregar, prevalece sobre grants `active` y `frozen` y aplica a detalle, conteos y derivados. Si era efectiva en `T` o nace después, reduce permanentemente esa ventana histórica. Aplica a toda la organización responsable y sobrevive a la reasignación. **No** permite ocultar actividad producida dentro de la propia relación. Ningún otro scope la reexpone dentro de esa relación |
| **Falla cerrada** | Sesión producida dentro de la relación, rechazo |
| **Implemented (STUDIO-47/48)** | `privacy.hide_session(person, executed_session, relationship, idempotency_key, command_id, request_hash)`, migration `20261107090000_a_coach_reviews_what_a_client_trained.sql`; `PUT /space/v1/executions/{executionId}/visibility` with body `{relationship_id}`. The session and the relationship must both be hers, else `404` (`P0002`), checked before the idempotency receipt, so another person's session reads as missing. A session produced inside that same relationship is refused with `422` (`22023`) before anything is written, and `IX-36` refuses it again in the database. A terminated relationship is accepted only while it still holds a `frozen` grant, else `409` (`P0004`): with nothing left to see, there is nothing to hide from. Hiding what is hidden converges, a reverted denial is reactivated, and `frozen_denied_at` is set at once when the relationship has already ended. `privacy.session_visibility_denied.v1` is enqueued only on a change. A session produced inside **another** relationship may be hidden too: it is never shown to this one, so today the denial changes nothing, and it keeps her choice if that ever changes. No aggregates or caches over sessions exist yet, so there is nothing to invalidate. |

#### `OP-PRV-007` — Revertir la ocultación de una sesión

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `DELETE /space/v1/executions/{id}/visibility/{relId}` |
| **Actor** | `A2` |
| **Filtros obligatorios** | La denegación es propia y está vigente |
| **Transacción** | Cerrar la denegación y encolar el recálculo de agregados en relaciones activas; nunca limpiar `frozen_denied_at` |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Historial previo y autónomo |
| **Evento de dominio** | `privacy.session_visibility_restored.v1` |
| **Reglas** | Revertir no genera accesos pasados. En una relación activa puede volver a compartir hacia adelante; después de `T` no amplía la ventana `frozen`. Una relación nueva **no** hereda la preferencia: requiere su propia decisión |
| **Falla cerrada** | — |
| **Implemented (STUDIO-47/48)** | `privacy.restore_session(...)`, same arguments, migration `20261107090000_a_coach_reviews_what_a_client_trained.sql`; `DELETE /space/v1/executions/{executionId}/visibility/{relationshipId}`. A denial that is not hers, or does not exist, is `404` (`P0002`), checked before the idempotency receipt. An active denial becomes `reverted` with `restored_at`. On a terminated relationship, `frozen_denied_at` takes the relationship's `ended_at` if it was still null, so a denial in force at the end keeps the historical window shut (`T-DENY-8`, `T-DENY-9`). Restoring a reverted one converges without a new event; `privacy.session_visibility_restored.v1` is enqueued on a change. `frozen_denied_at` is set here and when hiding, not by the termination: the termination runs as the gym, which cannot see denials, so setting it there would fail open. |

#### `OP-PRV-008` — Crear una solicitud de supresión

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/erasure-requests` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Sujeto = persona autenticada; alcance declarado (categorías concretas o cuenta completa) |
| **Transacción** | Crear `ERASURE_REQUEST` y abrir el `DISPOSITION_CASE` con un `DISPOSITION_ITEM` por categoría alcanzada, resolviendo cada uno con su `RETENTION_POLICY` versionada |
| **Idempotencia** | `Idempotency-Key`. Una solicitud abierta del mismo alcance no se duplica |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Todas las categorías del alcance |
| **Evento de dominio** | `privacy.erasure_requested.v1`, `privacy.disposition_case_opened.v1` |
| **Reglas** | Cada categoría se resuelve por su política: `delete`, `anonymize` o `retain_restricted`. Ninguna se resuelve con un `deleted_at` universal. Seudonimización, cifrado o sustitución por UUID **no** cuentan como anonimización irreversible. Un ítem bajo hold vigente queda suspendido con motivo y vigencia, nunca por una excepción global implícita. Plazo objetivo de resolución: 30 días corridos; las consultas y reclamos de habeas data se atienden en los plazos de la Ley 1581 de Colombia |
| **Falla cerrada** | Si una categoría no tiene política versionada aplicable, el caso no se cierra y se escala |

#### `OP-PRV-009` — Aplicar un hold legal

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/legal-holds` |
| **Actor** | `A12` con rol base, `manage_privacy_requests`, AAL2 y deber vigente |
| **Filtros obligatorios** | Alcance explícito y acotado, motivo, vigencia y responsable declarados |
| **Transacción** | Crear `LEGAL_HOLD` y sus `HOLD_APPLICATION` sobre los `DISPOSITION_ITEM` concretos alcanzados |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Suspende la disposición de las categorías alcanzadas |
| **Evento de dominio** | `privacy.legal_hold_applied.v1` |
| **Reglas** | Un hold **suspende disposición**; no concede ni mantiene acceso operativo. No existen holds globales ni indefinidos: alcance, motivo, vigencia y liberación son obligatorios y auditables |
| **Falla cerrada** | Sin alcance acotado o sin vigencia, rechazo |
| **Implementado** | `privacy.apply_legal_hold` sobre `POST /backoffice/v1/legal-holds`. La separación de deberes se comprueba **por persona**, no por caso: quien pidió o aprobó una ventana break-glass sobre alguien no puede suspender la disposición de esa persona. Responde `AF403`, distinto del `42501` general, para que la pantalla diga cuál de los dos 403 es. Un ítem ya ejecutado responde `55000` y uno inexistente `P0002` |

#### `OP-PRV-010` — Liberar un hold legal

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/legal-holds/{id}/release` |
| **Actor** | `A12` con rol base, `manage_privacy_requests`, AAL2 y deber vigente |
| **Filtros obligatorios** | Hold vigente |
| **Transacción** | Cerrar el hold y sus aplicaciones, y reanudar la disposición de los ítems suspendidos |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Reanuda la eliminación o anonimización |
| **Evento de dominio** | `privacy.legal_hold_released.v1` |
| **Reglas** | Liberar reanuda la disposición de los ítems **dentro de su alcance** y solo de esos |
| **Falla cerrada** | — |
| **Implementado** | `privacy.release_legal_hold` sobre `POST /backoffice/v1/legal-holds/{id}/release`. Devuelve los ítems a `pending` y nunca los ejecuta; un hold ya liberado responde `55000`, y la misma separación de deberes aplica al liberar |

#### `OP-PRV-011` — Publicar una versión de definición de scope

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/scope-definitions/{code}/versions` |
| **Actor** | `A12` con rol base, `manage_privacy_requests`, AAL2 y deber vigente |
| **Filtros obligatorios** | El scope pertenece a los siete V1; la versión enumera recursos, campos, exclusiones, acciones máximas y `historical_readable` de forma exhaustiva |
| **Transacción** | Crear `SCOPE_DEFINITION` inmutable con sus `SCOPE_RESOURCE_RULE`, incluyendo el subconjunto histórico |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Define qué campos pueden viajar bajo cada scope |
| **Evento de dominio** | `privacy.scope_definition_published.v1` |
| **Reglas** | Una versión publicada es **inmutable**. Publicar v2 no altera ningún grant v1: los grants existentes conservan estrictamente el field-set y el subconjunto `historical_readable` de su versión. Ampliar contenido, finalidad o histórico exige nueva aceptación. En V1 `health_context`, fotos, archivos y EXIF nunca son históricos. `SCOPE_RESOURCE_RULE` describe el máximo permitido; no sustituye autorización ni RLS |
| **Falla cerrada** | Regla ambigua o campo sin clasificación, rechazo |

#### `OP-PRV-012` — Consultar definiciones de scope publicadas

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /catalog/v1/scope-definitions` |
| **Actor** | `A2`, `A3`–`A6` |
| **Filtros obligatorios** | Solo versiones publicadas |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica: el catálogo V1 es cerrado |
| **Offline / concurrencia** | Cacheable: es contenido inmutable |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | Permite a la persona leer exactamente qué recursos y campos abarca lo que le están pidiendo, **antes** de decidir |
| **Falla cerrada** | — |

#### `OP-PRV-013` — Listar mis grants y decisiones de consentimiento

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/consents` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona = sujeto del token |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: estado y vigencia descendente |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Qué comparte y con quién |
| **Evento de dominio** | Ninguno |
| **Reglas** | Muestra por cada decisión: organización, parte responsable, relación, scope, **versión**, nivel, propósito y resultado; para grants vigentes añade quiénes pueden ejercerlos hoy —titular y suplentes—. No muestra solicitudes pendientes ni permite a Studio crear otra. Es el panel de control del consentimiento |
| **Falla cerrada** | — |
| **Implementado** | `privacy.list_my_consents` (migración `20261022120000`) sobre `GET /space/v1/consents` (`listMySpaceConsents`, esquemas `SpaceConsentList` y `SpaceConsent`). Por cada relación y scope que se le pidió, su última respuesta (`decision`, `decided_at`), lo que se le presentó (`presented_snapshot`), la organización y el estado de la relación y, si aceptó, el grant: `grant_status` (`active`, `frozen` o `revoked`), `access_level`, `granted_at`, `frozen_at` y `revoked_at`. Las relaciones terminadas aparecen con lo que la organización conserva. Solo los suyos: otro actor recibe `42501`. Sin cursor y `private, no-store`, no cacheable. **Todavía no** devuelve la parte responsable ni quiénes pueden ejercer hoy cada grant. El recordatorio de revisión a los 12 meses (`HU-SP-030`, criterio 4) es `OP-SYS-006` y espera al worker y a Avisos |

#### `OP-PRV-014` — Listar grants recibidos por la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/grants` |
| **Actor** | `A3` (solo los de sus relaciones asignadas), `A4`, `A5` |
| **Filtros obligatorios** | Grants cuya organización receptora es `{orgId}` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: relación y scope |
| **Offline / concurrencia** | Nunca cacheable para decidir acceso |
| **Información sensible** | **Estado** del consentimiento, no su contenido |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve qué está concedido y en qué versión para que la organización sepa qué puede ejercer. No devuelve ningún dato amparado ni ofrece una acción para volver a solicitar un scope rechazado o revocado |
| **Falla cerrada** | — |

#### `OP-PRV-015` — Consultar el historial de accesos a mis datos

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/access-events` |
| **Actor** | `A2` |
| **Filtros obligatorios** | `ACCESS_EVENT` cuyo sujeto es la persona autenticada |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: instante descendente, desempate por identificador |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Revela qué profesional concreto leyó qué categoría y cuándo |
| **Evento de dominio** | Ninguno |
| **Reglas** | Identifica al **actor humano real**, no solo a la organización. Cubre 24 meses. Incluye los accesos de suplentes y los ejercicios de break-glass de soporte |
| **Falla cerrada** | — |
| **Implemented (STUDIO-76, `HU-STUDIO-083` criterion 3)** | `privacy.list_my_access_events(person, scope_code, limit, before_occurred_at, before_id)`, a `security definer` function, migration `20261118110000_a_person_reads_who_read_her_data.sql` (pull request allfitone#204, merged and deployed on 9 November 2026); `GET /space/v1/access-events?limit&cursor&scope_code` (`listMyAccessEvents`), `bearerAuth`, `200 MyAccessEventPage`. **Deviation, not cacheable:** it answers `private, no-store`. **Deviation, no view:** there is no `privacy.v_my_access_events` and no table privilege for `allfit_api` (ADR-047). **What it lists:** every event whose subject is her and whose actor is somebody else, allowed or denied, with `occurred_at` in the last 24 months, optionally one `scope_code`. Each row says `actor {kind, display_name}` (`allfit_team` for `break_glass` and `support_metadata`, otherwise `professional`), `organization {id, display_name}` from the reader's membership or else from the relationship, or null; `attendance`, `holder` or `substitute` from the reader's assignment in effect at that instant (an accepted cover only), or null; `access_mode`, `scope_code`, `scope_version`, `resource` and `result`. Her own reads are not listed. **Order and page:** `occurred_at` descending, ties by id descending; keyset on `(occurred_at, id)`; `limit` 1 to 100, default 25; the cursor keeps the instant to the microsecond and is bound to `scope_code`. **Errors:** another person `42501` → `403`; a page, cursor or scope outside the contract `400`, refused before the database; no token `401`; any other database failure `503` (the shared Space privacy mapping, which would also give `422` for `22023`). Reading the log writes nothing to it. It reuses `idx_access_events_target_occurred`. Tests: `T-PRV-ACCESSLOG-01` (21), `T-PRV-API-SPACE-19..22`, `privacy/infrastructure/my-access-log.test.ts` |

#### `OP-PRV-016` — Consultar el estado de una solicitud de supresión

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/erasure-requests/{id}` |
| **Actor** | `A2`, solicitante |
| **Filtros obligatorios** | La solicitud es propia |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Alcance de la supresión |
| **Evento de dominio** | Ninguno |
| **Reglas** | Muestra la resolución **por categoría**: qué se eliminó, qué se anonimizó, qué se retiene de forma restringida, con qué finalidad y hasta cuándo. Un ítem suspendido por hold se informa como suspendido, con motivo y vigencia |
| **Falla cerrada** | — |

#### `OP-PRV-017` — Listar mis ocultaciones de sesión

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/visibility-denials` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Denegaciones propias |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: instante descendente |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Preferencias de visibilidad |
| **Evento de dominio** | Ninguno |
| **Reglas** | Solo la persona ve sus denegaciones. Ninguna organización puede consultarlas, ni deducirlas por diferencia de conteos |
| **Falla cerrada** | — |
| **Implemented (STUDIO-47/48)** | `privacy.list_my_session_denials(person, limit, cursor_denied_at, cursor_id)`, migration `20261107090000_a_coach_reviews_what_a_client_trained.sql`; `GET /space/v1/visibility-denials`, served `private, no-store` rather than cacheable: it is personal and changes with every hide. Her active denials only, newest first on (`denied_at` to the millisecond, `id`), each with the organization's name, the session's start and its activity name. Page size 1 to 100, opaque cursor. |

#### `OP-PRV-018` — Abrir un caso de acceso histórico

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/historical-access-cases` |
| **Actor** | `A4`, `A5` con `manage_historical_access` y MFA |
| **Filtros obligatorios** | Relación terminada de `{orgId}`; membresía autorizada activa de la misma organización; actor autorizado `owner`/`admin` o antiguo titular; nunca `staff`; propósito cerrado, `case_reference`, justificación y expiración `<= 24h` |
| **Transacción** | Crear `HISTORICAL_ACCESS_CASE` exacto para organización, relación, membresía, capacidad y propósito; no leer datos en esta operación |
| **Idempotencia** | `Idempotency-Key`; un caso abierto equivalente no se duplica |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Una terminación, revocación o baja de membresía concurrente invalida la creación |
| **Información sensible** | Justificación y referencia del caso; no contiene valores fitness |
| **Evento de dominio** | `privacy.historical_access_case_opened.v1` |
| **Reglas** | `manage_historical_access` administra casos y no concede lectura. El caso puede autorizar al propio admin/owner o al antiguo titular, pero solo la membresía nombrada puede ejercerlo. Marketing, recuperación comercial, IA y curiosidad operativa son propósitos inválidos |
| **Falla cerrada** | Sin MFA, propósito permitido, membresía elegible o relación terminada, rechazo |
| **Implemented (STUDIO-54)** | `privacy.open_historical_access_case(person, session, organization, relationship, authorized_membership, purpose, case_reference, justification, duration_hours, idempotency_key, command_id, request_hash)` returning `(document, replayed)`, migration `20261116090000_a_case_opens_the_frozen_history.sql`; `POST /studio/v1/organizations/{organizationId}/historical-access-cases`, `cookieAuth`, `no-store`, `Idempotency-Key` and `Command-Id`, `201 HistoricalAccessCase` (`Idempotent-Replay` on a retry). **Order of checks:** the person actor, then a recent sign-in on this very Studio session (`identity.require_recent_studio_authentication`, `AF401` → `403 reauthentication-required`), then a live membership in an active organization and `manage_historical_access` (`42501` → `403`). Only then the idempotency receipt and the body, so an outsider learns nothing about which relationships exist. **Deviation, step-up:** a sign-in less than ten minutes old replaces MFA (the owner's decision of 8 November 2026; ADR-023, *As implemented*). **Input:** `purpose` from the closed enum `privacy.historical_access_purpose`, `case_reference` 1 to 120 characters, `justification` 1 to 2000, both trimmed, and `duration_hours` 1 to 24 (`22023` → `422`). **The relationship:** a `terminated` one of this organization, else `P0002` → `404`; it must still hold a `frozen` grant, else `P0004` → `409`. **Whom it authorizes (deviation, narrower than «otro owner/admin»):** the opener herself while she holds a current `owner` or `admin` role, or the professional who held the relationship at the cut (the `holder` assignment with `valid_to = cut_at`) while his membership keeps a current `owner`, `admin` or `coach` role. Staff, another admin or a coach with no part in it is refused by the constraint trigger `trg_historical_access_cases_after_insert_eligible` (`23514` → `422`). **One open case** per relationship, authorized membership and purpose (`uidx_historical_access_cases_open`, `23505` → `409`). An equivalent case whose hours ran out is closed first as `expired` at its `expires_at`, so it stops blocking. **The row:** the case stores `person_id` and `cut_at` (the relationship's `ended_at`), and `expires_at = opened_at + duration_hours`. **Concurrency:** the relationship and its frozen grants are locked `for share`, so a revocation either waits and then closes this case, or commits first and the opening finds nothing frozen (`P0004`). **Event:** `privacy.historical_access_case_opened.v1` with `case_id`, `organization_id`, `relationship_id`, `authorized_membership_id`, `opened_by_membership_id`, `purpose`, `opened_at` and `expires_at`, never the justification or the reference. Opening reads no data and writes no `ACCESS_EVENT`. Tests: `T-PRV-HIST-01` (`-AUTH-01..06`, `-VAL-01..10`, `-OPEN-01..06`, `-IDEM-01/02`, `-EVT-01/02`, `-EXP-02/03`), `historical-access-case-concurrency.test.ts` (2) and `studio-historical-access.test.ts` |

#### `OP-PRV-019` — Cerrar un caso de acceso histórico

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/historical-access-cases/{caseId}/closure` |
| **Actor** | `A4`, `A5` con `manage_historical_access` |
| **Filtros obligatorios** | Caso abierto de `{orgId}` |
| **Transacción** | Cambiar a `closed`, fijar `closed_at` e invalidar cualquier contexto o caché asociado |
| **Idempotencia** | `Idempotency-Key`; cerrar dos veces converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | El vencimiento por reloj también lo vuelve inejercible aunque el worker no haya marcado `expired` |
| **Información sensible** | Metadato de autorización |
| **Evento de dominio** | `privacy.historical_access_case_closed.v1` |
| **Reglas** | Cerrar no borra `ACCESS_EVENT`; un caso cerrado no se reabre |
| **Falla cerrada** | — |
| **Implemented (STUDIO-56)** | `privacy.close_historical_access_case(person, organization, case, idempotency_key, command_id, request_hash)` returning `(document, replayed)`, migration `20261116090000_a_case_opens_the_frozen_history.sql`; `POST /studio/v1/organizations/{organizationId}/historical-access-cases/{caseId}/closure`, `cookieAuth`, `no-store`, `Idempotency-Key` and `Command-Id`, no body, `200 HistoricalAccessCase`. **Who:** a live member with `manage_historical_access` (`42501` → `403`); a coach the case authorizes cannot close it without that capability. A case of another organization, or none, is `P0002` → `404`. **No recent sign-in:** ending access is never harder than granting it. **Converges:** a closed case answers as it was closed. An open case closes with `closed_at = least(now, expires_at)`: `closed_by_manager` with `closed_by_membership_id`, or `expired` with no closer when its hours had run out. **Deviation, expiry:** there is no worker and no `privacy.historical_access_case_expired.v1`. A case past `expires_at` is unusable at once and reads as `expired`; it is stored as closed only when someone closes it or opens an equivalent one. **Immutable:** `trg_historical_access_cases_before_update_keep` lets an open case become closed, once, changing only `status`, `closed_at`, `closed_reason` and `closed_by_membership_id`; delete and truncate are refused (`23514`). **Closes on its own** with `grant_revoked` (`OP-PRV-005`) or `membership_ineligible` when the authorized membership stops qualifying. **Event:** `privacy.historical_access_case_closed.v1` with `case_id`, `organization_id`, `relationship_id`, `authorized_membership_id`, `purpose`, `closed_reason` and `closed_at`. Tests: `T-PRV-HIST-01` (`-CLOSE-01..07`, `-EVT-03`, `-INT-02..05`, `-EXP-01`, `-AUTO-01..06`) and `studio-historical-access.test.ts` |

#### `OP-PRV-020` — Consultar una relación histórica congelada

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/historical-relationships/{relationshipId}` y recursos subordinados |
| **Actor** | `A3`, `A4` o `A5` cuya membresía coincide exactamente con el caso |
| **Filtros obligatorios** | Header `X-Historical-Access-Case`; MFA; `access_control.can_read_frozen`; relación terminada; grant `frozen`; propósito/caso coincidentes; fila `<= frozen_at`; campo `historical_readable`; retención vigente; denegación histórica ausente |
| **Transacción** | Una sola transacción sin escrituras de dominio que registra un `ACCESS_EVENT` por recurso/grant consultado, incluido resultado denegado y el contexto que haya podido resolverse. Si la auditoría falla, no devuelve datos |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor; sin `total` inseguro; conteos y derivados se calculan después de denegaciones |
| **Offline / concurrencia** | Nunca cacheable en cliente ni read model operativo. Revocación, cierre, expiración o baja de membresía concurrentes se revalidan antes de responder |
| **Información sensible** | Subconjunto histórico exacto. `health_context`, fotos, archivos, EXIF, perfil actual y datos posteriores quedan fuera |
| **Evento de dominio** | Ninguno; `ACCESS_EVENT` es auditoría obligatoria |
| **Reglas** | No lista antiguos clientes, no reutiliza `/clients`, no admite escrituras ni exportación masiva. `relationship_training` conserva artefactos bilaterales; `prior_training_history` solo lo compartido; `body_progress` solo medidas estructuradas. Un derivado se sirve únicamente si existía en `T` y todos sus inputs siguen autorizados |
| **Falla cerrada** | La respuesta ante inexistencia o falta de autorización es indistinguible; cualquier condición ausente devuelve vacío/problema genérico sin filtrar existencia |
| **Implemented (STUDIO-55)** | Migration `20261116090000_a_case_opens_the_frozen_history.sql`; four reads, all `cookieAuth`, `private, no-store`, each requiring the header `X-Historical-Access-Case`, and each taking `person`, `session`, `organization`, `relationship` and `case`: `privacy.read_historical_relationship` behind `GET /studio/v1/organizations/{organizationId}/historical-relationships/{relationshipId}` (`HistoricalRelationship`: whose, `ended_at`, the case and the frozen categories that stayed readable, with their version and `frozen_at`); `execution.list_frozen_executions(…, limit, cursor_started_at, cursor_id)` behind `…/executions` (`FrozenExecutionPage`); `execution.read_frozen_execution(…, execution)` behind `…/executions/{executionId}` (`FrozenExecution`); `identity.list_frozen_body_progress(…, limit, cursor_measured_on, cursor_id)` behind `…/body-progress` (`FrozenBodyProgressPage` with `applied_scope`). **Shared opening (`privacy.open_frozen_read`):** the person actor, a recent sign-in on this session (`AF401` → `403 reauthentication-required`; deviation: a sign-in less than ten minutes old replaces MFA), a request id, a live membership, and `app.purpose = 'frozen_history_review'`. The case must be exercisable (`access_control.historical_case_exercisable`): it names the membership the request acts as, in this organization and for this relationship, it is open and inside its hours, the membership still qualifies, and her account is not closed. Otherwise the answer is `404`, like a case that does not exist, and the attempt is recorded as `denied` against the person whenever the case or the relationship belongs to the organization. **What it reads (deviation, narrower than «artefactos bilaterales»):** only what the frozen version marks `historical_readable` and does not exclude (`privacy.frozen_category`, `privacy.scope_reads_frozen`). In V1 that is executed sessions with their results, of this relationship under `relationship_training` and autonomous ones under `prior_training_history`, and structured body measurements under `body_progress`, field by field. The detail carries no coach observations, no planned session and no capture source. Programs, observations, derived progress, photos, health context and the profile have no historical read. **The cut:** a session counts only if it is completed, not annulled, `ended_at <= cut_at`, and has no `execution.execution_revisions` row created after the cut. An autonomous one is left out if hidden from that relationship then or since (a denial `active` or with `frozen_denied_at`). A measurement counts only if `created_at <= cut_at`, whatever `measured_on` says. **Pages:** sessions newest first on (`started_at` to the millisecond, `id`); measurements on (`measured_on`, `id`), both descending; `limit` 1 to 100, default 25, opaque cursor. **`scope-required`:** the session detail answers `403` naming `relationship_training` when no training category stayed readable; body progress names `body_progress`. The session list answers an empty page instead. Any session the list would not show is `404` by id. **Audit:** every read writes `privacy.access_events` with `access_mode = 'frozen'` and the case, once per frozen category used (`allowed`) or once `denied`, before answering. Tests: `T-PRV-HIST-02` (40), `T-PRV-HIST-01` (`-READ-01`) and `studio-historical-access.test.ts` |

#### `OP-PRV-021` — Seguir las solicitudes de eliminación

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/erasure-requests` |
| **Actor** | `A6` con rol `allfit_admin` y deber `manage_privacy_requests` vigente (AAL2 por la sesión de Backoffice) |
| **Filtros obligatorios** | `status` (`open` o `closed`); sólo casos con `origin = 'request'` |
| **Transacción** | Una sola, sin escrituras de dominio, que registra un `ACCESS_EVENT` por persona revelada antes de devolver nada |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor `(instante, id)`; abiertas por `opened_at` ascendente (la que más ha esperado primero), resueltas por `closed_at` descendente |
| **Offline / concurrencia** | `no-store`; el seguimiento cambia cuando la disposición avanza |
| **Información sensible** | Ninguna del contenido dispuesto. Persona por identificador; la resolución se agrupa por clasificación, acción y estado |
| **Evento de dominio** | Ninguno; `ACCESS_EVENT` es auditoría obligatoria |
| **Reglas** | El plazo objetivo de `HU-BO-032` son 30 días desde `opened_at` y viaja como `due_at`, nunca como días restantes: los días se calculan en la zona de quien lee. Una disposición abierta por retención no es una solicitud y no se lista. `retained_until` sale de la política que decidió conservar, no del plazo de respuesta |
| **Falla cerrada** | Sin rol o sin deber vigente responde `42501` y no registra acceso, porque no reveló nada |
| **Implementado** | `privacy.list_erasure_requests` y `privacy.erasure_request_categories`. Hoy una solicitud del titular se abre, se ejecuta y se cierra en la misma transacción, así que la mitad abierta sólo tendrá filas cuando exista una disposición diferida o suspendida por obligación legal (`HU-BO-033`) |

#### `OP-PRV-022` — Consultar las categorías de información

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/catalog/information-categories` |
| **Actor** | `A2`, `A3`–`A6`. Persona autenticada y activa; un actor de soporte es rechazado |
| **Filtros obligatorios** | Ninguno: las siete categorías de V1, siempre completas |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica. Orden fijo: entrenamiento, historial previo, cuerpo, salud y después las de nutrición — el orden en que `HU-STUDIO-034` las nombra |
| **Offline / concurrencia** | `private, no-store` como el resto de la superficie; el contenido es inmutable y se puede memorizar en el cliente |
| **Información sensible** | Ninguna. No lleva datos de ninguna persona, por eso no escribe `ACCESS_EVENT` |
| **Evento de dominio** | Ninguno |
| **Reglas** | **No es `OP-PRV-012`.** Aquella responde qué recursos y campos alcanza una versión **publicada** y no dice nada hasta que Backoffice cure el catálogo; ésta es el vocabulario: redacción fija, sin versión y sin publicación, disponible desde el primer día. Devuelve el resumen de una línea —el texto de quien pide— junto a la descripción, que es la mitad que dice dónde **para** el permiso. Las dos viajan juntas: con sólo el resumen, alguien marca «cuerpo» creyendo que alcanza lesiones |
| **Falla cerrada** | Un actor que no sea persona activa recibe `42501`, no una lista vacía: la política de `privacy.scope_presentations` sólo admite `person`, y cero filas se leería como «no hay categorías» |
| **Implementado** | `privacy.list_information_categories`. Lee `privacy.scope_presentations` sola, sin unirse a `scope_definitions`, que es lo que la mantiene libre del bloqueo de publicación. El segundo criterio de la historia —la definición no cambia bajo los pies de quien lee— lo sostiene la forma de la tabla: no tiene columna de versión |

#### `OP-PRV-023` — Ver qué nos autorizó cada persona

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{organizationId}/authorized-scopes` |
| **Actor** | `A3`–`A5`. Miembro activo con `view_directory` o `view_assigned_directory` |
| **Filtros obligatorios** | La organización. Un coach queda estrechado además a sus asignados, y eso no lo decide la función |
| **Transacción** | Una, de solo lectura |
| **Idempotencia** | N/A |
| **Paginación y orden** | Keyset por `(display_name, grant_id)`, 1–100 por página. Una fila por autorización, no por persona: agrupar en la base rompe el cursor cuando las categorías de alguien caen a caballo entre dos páginas |
| **Offline / concurrencia** | `private, no-store`. El registro refleja el instante en que se leyó y nada garantiza que siga vigente al mostrarse |
| **Información sensible** | El **estado** de cada permiso, nunca lo que ampara. No escribe `ACCESS_EVENT` porque no hay dato personal cuya lectura registrar |
| **Evento de dominio** | Ninguno |
| **Reglas** | **El filtro sale del vínculo, no del permiso.** La política de `privacy.data_grants` estrecha a la organización —`person_id = person() or organization_id = org()`— y no sabe de asignación. En la ficha de un vínculo eso basta, porque la proyección de permisos sólo se alcanza después de que el vínculo pasó su guarda; en un registro a través de clientes no, y leer `data_grants` sola entrega a un coach lo que autorizaron clientes que no atiende. La unión obligatoria con `relationships.service_relationships` es la guarda, no una conveniencia. **Criterio 5:** esto es un informe y nunca la fuente que decide un acceso; quien vaya a leer un dato resuelve la política en ese instante, dentro de la transacción que escribe el registro de acceso |
| **Falla cerrada** | Sin capacidad de directorio, `42501`. Un cursor a medias o un tamaño de página fuera de rango, `22023` — no la primera página, que se leería como filas saltadas |
| **Implementado** | `privacy.list_authorized_scopes`. Cubierta por `T-PRV-SCOPES-01`, cuya aserción de negación se escribió **antes** de la unión y se vio fallar: un coach recibía tres filas donde dos eran suyas. El test se cae el día que alguien quite esa unión |

#### `OP-PRV-025` — List historical access cases

Added with STUDIO-54..56: ADR-023 has managers open and close cases, and an authorized member needs to find the case to read through, but no operation listed them.

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{organizationId}/historical-access-cases` |
| **Actor** | `A3`–`A5` with a live membership in an active organization |
| **Filtros obligatorios** | The organization of the route; optional `relationship_id` |
| **Transacción** | One, read only, with no domain writes |
| **Idempotencia** | N/A |
| **Paginación y orden** | Newest first, keyset on (`opened_at` to the millisecond, `id`), both descending; `limit` 1 to 100, default 25; opaque cursor |
| **Offline / concurrencia** | `private, no-store` |
| **Información sensible** | The case: purpose, reference, justification, who opened it, whom it authorizes, whose history and the cut. No fitness data, so it writes no `ACCESS_EVENT` |
| **Evento de dominio** | Ninguno |
| **Reglas** | A member with `manage_historical_access` sees every case of the organization (`historical_access_cases_select_manager`); any other member sees only the cases that authorize them (`historical_access_cases_select_authorized`); staff and other coaches see none. A case past its hours reads as `expired` before anyone closes it, and cannot be used |
| **Falla cerrada** | Without a live membership, `42501` → `403`. A malformed `relationship_id`, page size or cursor is `400` before the database |
| **Implemented (STUDIO-54..56)** | `privacy.list_historical_access_cases(person, organization, relationship, limit, cursor_opened_at, cursor_id)` returning `(id, opened_at, document)`, migration `20261116090000_a_case_opens_the_frozen_history.sql`, answered as `HistoricalAccessCasePage`. The policies decide which rows; the function only sets the membership context and pages. No recent sign-in is required. Index: `idx_historical_access_cases_organization_opened (organization_id, opened_at desc, id desc)`. Tests: `T-PRV-HIST-LIST-01..05`, `T-PRV-HIST-EXP-01` and `studio-historical-access.test.ts` |

### 7.5 Catálogo

Dueño de `DISCIPLINE`, `ACTIVITY_TYPE`, `ACTIVITY_TYPE_ALIAS`, `MOVEMENT`, `MOVEMENT_ALIAS`, `MOVEMENT_VARIANT`, `MOVEMENT_INSTRUCTION`, `EQUIPMENT`, `MOVEMENT_EQUIPMENT`, `MUSCLE`, `MOVEMENT_MUSCLE`, `UNIT`, `RESULT_CONTRACT`, `ACTIVITY_TYPE_RESULT_CONTRACT` y `CONTRACT_FIXTURE`.

Reglas que gobiernan todo el dominio:

- Disciplinas, tipos de actividad, unidades y contratos de resultados los publica **solo** la plataforma. Las organizaciones crean movimientos y variantes privadas.
- V1 cubre cuatro familias: fuerza/calistenia, running/endurance, yoga/movilidad e híbrido. El catálogo es **solo en español**; la estructura de `ALIAS` existe y soportará traducciones sin cambio de modelo.
- Un movimiento es **opcional**: hay sesiones válidas que no referencian ninguno.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-CAT-001` | Crear un movimiento privado | Comando | `A3`, `A4`, `A5` |
| `OP-CAT-002` | Actualizar un movimiento privado | Comando | `A3`, `A4`, `A5` |
| `OP-CAT-003` | Archivar un movimiento privado | Comando | `A4`, `A5` |
| `OP-CAT-004` | Publicar contenido del catálogo global | Comando | `A11` |
| `OP-CAT-005` | Archivar contenido del catálogo global | Comando | `A11` |
| `OP-CAT-006` | Publicar o deprecar un contrato de resultados | Comando | `A11` |
| `OP-CAT-007` | Listar disciplinas | Consulta | Autenticado |
| `OP-CAT-008` | Listar tipos de actividad | Consulta | Autenticado |
| `OP-CAT-009` | Buscar movimientos | Consulta | Autenticado |
| `OP-CAT-010` | Consultar un movimiento | Consulta | Autenticado |
| `OP-CAT-011` | Listar equipamiento | Consulta | Autenticado |
| `OP-CAT-012` | Consultar contratos de resultados de un tipo de actividad | Consulta | Autenticado |
| `OP-CAT-013` | Listar especialidades profesionales | Consulta | Autenticado |
| `OP-CAT-014` | Listar tipos de credencial profesional | Consulta | Autenticado |
| `OP-CAT-015` | Listar músculos | Consulta | Autenticado |

---

#### `OP-CAT-001` — Crear un movimiento privado

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/movements` |
| **Actor** | `A3`, `A4`, `A5` |
| **Filtros obligatorios** | Membresía vigente en `{orgId}`; disciplina existente y publicada; alcance del movimiento fijado en `organization` con owner `{orgId}` |
| **Transacción** | Crear `MOVEMENT` con alcance, owner y procedencia; opcionalmente sus `MOVEMENT_ALIAS`, `MOVEMENT_EQUIPMENT` y su relación `MOVEMENT_VARIANT` con una base global |
| **Idempotencia** | `Idempotency-Key`. Un movimiento con el mismo nombre normalizado en la misma organización se rechaza en lugar de duplicarse |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal. Es contenido de la organización |
| **Evento de dominio** | `catalog.private_movement_created.v1` |
| **Reglas** | Un movimiento privado **solo** es visible para su organización. No pertenece a una disciplina nueva: crear disciplinas o tipos de actividad está reservado a la plataforma. No admite códigos libres sin namespace |
| **Falla cerrada** | Disciplina inexistente, rechazo |
| **Implemented (STUDIO-57..60)** | `catalog.create_organization_movement(person, organization, discipline_code, name, aliases, equipment, variant, idempotency_key, command_id, request_hash)` returning `(result, replayed)`, migration `20261113090000_a_gym_names_its_own_movements.sql`; `POST /studio/v1/organizations/{organizationId}/movements`, `cookieAuth`, the exact Studio `Origin`, `Idempotency-Key` and `Command-Id`, `201 OrganizationMovement` with `Location`, `private, no-store`. The movement id is the `Command-Id`. **Who:** a live member of an active organization with `manage_content`, which coach, admin and owner hold. Staff gets `403`, and somebody outside the organization `404`. **What:** a published discipline; a name of 1 to 120 characters, trimmed and with its spaces collapsed; up to ten other names, stored in `movement_aliases` with locale `es`, none blank, repeated or equal to the name; up to sixteen distinct codes of published global equipment; and optionally `variant {movement_id, relation, note?}`, naming a published global movement, with `relation` one of `variant`, `regression` or `progression` and a note of up to 200 characters. Every invalid field is named at once: `22023` → `422` with `errors[].path`. **Born `published`** at `revision_number = 1`, with its author in `created_by_membership_id` (`ck_movements_organization_author`). It gets no muscles, instructions or media, which stay Allfit One's to curate, so it answers `muscles: []`. **A name the organization already uses** fails on `uidx_movements_organization_name` (`23505`) and answers `409 conflict` with `errors[0].code = name-taken` and path `/name`. Another organization, or a global movement, may use the same name. **Event:** `catalog.private_movement_created.v1`, with `movement_id` and `organization_id` only. Creating writes no revision. No access event is written: the catalogue is nobody's personal data. Tests: `T-CAT-MOVEMENT-CREATE-01` (36); the HTTP layer in `T-CAT-STUDIO-MOVEMENT-API-*` and `-IDEM-01`; the bindings in `T-CAT-STUDIO-MOVEMENT-INT-04/05` |

#### `OP-CAT-002` — Actualizar un movimiento privado

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PATCH /studio/v1/organizations/{orgId}/movements/{id}` |
| **Actor** | `A3`, `A4`, `A5` |
| **Filtros obligatorios** | El movimiento pertenece a `{orgId}` y su alcance es privado |
| **Transacción** | Actualizar el movimiento conservando procedencia y registrando la revisión |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; versión optimista |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `catalog.private_movement_updated.v1` |
| **Reglas** | Actualizar un movimiento **no reinterpreta el historial**: las versiones de plantilla y las ejecuciones que lo referencian conservan el significado con el que se registraron. Un movimiento global nunca se edita desde Studio |
| **Falla cerrada** | Movimiento global, rechazo |
| **Implemented (STUDIO-57..60)** | `catalog.update_organization_movement(person, organization, movement, expected_revision, changes, idempotency_key, command_id, request_hash)` returning `(result, replayed)`; `PATCH /studio/v1/organizations/{organizationId}/movements/{movementId}` with `{expected_revision, name?, discipline_code?, aliases?, equipment?, variant?}` and at least one change, `200 OrganizationMovement`. Membership, capability and validation are those of `OP-CAT-001`. A list replaces the whole list, and `variant: null` removes the variant. An empty edit or an unknown field is `422` naming `changes`. **The optimistic version is `expected_revision` in the body**, not `If-Match`, as in the other Studio edits. An old one is `40001 stale-movement` → `409 stale-draft`. **Lock:** the command takes the movement `for update` before it changes anything, so it waits for a version being published with it, and that publication waits for it. **History is not reinterpreted: once used, the meaning freezes** (product decision, 2026-11-06). Published versions and executed sessions keep only `movement_id`, so renaming a movement would rename the past. Once a published version uses it (`catalog.movement_in_use`: a row of `planning.planned_steps` names it), its discipline is fixed and its name only takes changes that keep `normalized_name`, that is, case and spacing. Anything else is `55000 movement-in-use` → `409 conflict` with `errors[0].code = movement-in-use`. A movement that is only in a draft is still renamed. Other names, equipment and variant stay editable: they say how to find it, not what was done. The `BEFORE UPDATE` trigger `trg_movements_before_update_meaning` enforces it on every organization row, whoever writes it. `name_locked` in the answer tells Studio beforehand whether name and discipline are frozen; it is always `true` for a global movement. **Refused:** a global movement or another organization's is `404`; an archived one is `409 conflict` with `movement-archived`; a name another movement of the organization has is `409 name-taken`. **Revision:** each edit moves `revision_number` up by one and writes an append-only `catalog.movement_revisions` row with the acting membership, the revision it started from, and the movement before and after (name, discipline, status, other names, equipment and variant). A refused edit leaves none. **Event:** `catalog.private_movement_updated.v1` with `movement_id`, `organization_id` and `revision`. Tests: `T-CAT-MOVEMENT-UPDATE-01` (30), `organization-movement-concurrency.test.ts` (4), `T-CAT-STUDIO-MOVEMENT-API-*` and `-INT-06` |

#### `OP-CAT-003` — Archivar un movimiento privado

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/movements/{id}/archival` |
| **Actor** | `A4`, `A5` |
| **Filtros obligatorios** | El movimiento pertenece a `{orgId}` |
| **Transacción** | Marcar el movimiento como archivado |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `catalog.private_movement_archived.v1` |
| **Reglas** | Archivar lo retira de la búsqueda para contenido nuevo, pero **no** lo elimina: las versiones publicadas y las ejecuciones que lo referencian siguen resolviéndolo. Un movimiento referenciado nunca se borra físicamente mientras exista historial |
| **Falla cerrada** | — |
| **Implemented (STUDIO-57..60)** | `catalog.archive_organization_movement(person, organization, movement, idempotency_key, command_id, request_hash)` returning `(result, replayed)`; `POST /studio/v1/organizations/{organizationId}/movements/{movementId}/archival` with no body (a body is `415`), `200 OrganizationMovement`. **Who:** the new capability `archive_movements` («Archivar movimientos propios»), which owner and admin hold. Coaches hold `manage_content` too, so archiving needs a capability of its own. A coach or staff gets `403`, and a global movement or another organization's `404`. **Archiving converges:** it sets `status = 'archived'` at the next revision, with one `catalog.movement_revisions` row and `catalog.private_movement_archived.v1`. Archiving again answers the archived movement and writes nothing. There is no way back. **What changes:** the Studio search stops offering it unless asked (`include_archived`), a draft that uses it no longer publishes, and it is not edited again. The versions published with it keep resolving its name, and Studio still reads it, marked `archived`. **Nothing is deleted:** no path deletes a movement, and the `RESTRICT` FKs from `planned_steps` and the execution tables keep a referenced row (`T-MOV-3`). **Accepted race:** a version published at the same instant as the archive stays valid, because publishing does not lock the movement while it validates. Tests: `T-CAT-MOVEMENT-ARCHIVE-01` (16), `T-CAT-STUDIO-MOVEMENT-API-25..27`, `-IDEM-02`, `-INT-07` |

#### `OP-CAT-004` — Publicar contenido del catálogo global

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/catalogue/disciplines` · `POST /backoffice/v1/catalogue/activity-types` · `POST /backoffice/v1/catalogue/movements`; la lectura previa es `GET /backoffice/v1/catalogue` (`NEW-CAT-GLOBAL-PUBLISH`) |
| **Actor** | `A11` con rol base, `curate_global_catalog`, AAL2 y deber vigente |
| **Filtros obligatorios** | El cuerpo lleva sólo código y nombre (el movimiento, disciplina y nombre). No hay campo de alcance ni de dueño: lo que publica Allfit es global por construcción. Un tipo de actividad o un movimiento exigen una disciplina publicada |
| **Transacción** | `catalog.publish_discipline`, `publish_activity_type` o `publish_global_movement`: inserta la entrada como `published`, o vuelve a publicar una archivada **con el mismo nombre**. El nombre del movimiento se normaliza (minúsculas, espacios colapsados) y ese normalizado es único entre los globales |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; el reintento devuelve la entrada sin publicar otra vez |
| **Paginación y orden** | La lectura devuelve el catálogo completo: es pequeño y cerrado. Orden por código |
| **Offline / concurrencia** | Falla cerrada. Un código ya publicado, uno que ya nombra otra cosa o un movimiento duplicado responden `409` |
| **Información sensible** | Ninguna categoría personal: el catálogo no es dato de nadie, así que no escribe `access_events` |
| **Evento de dominio** | Ninguno |
| **Reglas** | `HU-BO-022`, criterios 1, 2 y 4. Un gimnasio crea movimientos privados y nunca los sube al global: estas rutas no encuentran contenido con dueño. El equipamiento no tiene tabla en V1 y la lectura lo declara ausente en vez de devolver una lista vacía |

#### `OP-CAT-005` — Archivar contenido del catálogo global

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/catalogue/disciplines/{code}/archival` · `.../activity-types/{code}/archival` · `.../movements/{movementId}/archival` |
| **Actor** | Igual que `OP-CAT-004` |
| **Filtros obligatorios** | La entrada es global y está publicada. El comando no lleva cuerpo |
| **Transacción** | `catalog.archive_discipline`, `archive_activity_type` o `archive_global_movement`: pasa la entrada a `archived`. Archivar una disciplina exige que su contenido global ya lo esté: no hay cascada |
| **Idempotencia** | `Idempotency-Key` + `Command-Id` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Una entrada que ya no está publicada, o una disciplina con contenido publicado, responden `409`; el contenido privado de un gimnasio responde `404` |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | `HU-BO-022`, criterio 3. Archivar retira de las lecturas del catálogo publicado pero **no borra**: un trigger rechaza (`55000`) borrar una entrada global y las FKs impiden dejar huérfano lo que la referencia, así que las sesiones y plantillas que ya la usaban siguen resolviéndola |

#### `OP-CAT-006` — Publicar o deprecar un contrato de resultados

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/result-contracts` · `POST /backoffice/v1/result-contracts/{id}/deprecation` |
| **Actor** | `A11` con rol base, `curate_global_catalog`, AAL2 y deber vigente |
| **Filtros obligatorios** | El contrato declara envelope, mínimos por nivel de completitud y estructuras compatibles; existe una `CONTRACT_FIXTURE` válida y una inválida por cada regla |
| **Transacción** | Crear `RESULT_CONTRACT` inmutable, sus fixtures y su `ACTIVITY_TYPE_RESULT_CONTRACT` con vigencia y marca de default |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `catalog.result_contract_published.v1` |
| **Reglas** | Una versión publicada es **inmutable**. Publicar v2 no reinterpreta ejecuciones históricas: cada ejecución conserva el contrato y versión que congeló. Deprecar impide congelar el contrato en ejecuciones nuevas y no invalida las existentes. `sensor_enriched` se publica y se prueba con fixtures controlados, sin conectores, credenciales ni raw stores productivos |
| **Falla cerrada** | Sin fixtures positiva y negativa, rechazo |

#### `OP-CAT-007` — Listar disciplinas · `OP-CAT-008` — Listar tipos de actividad

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/catalog/disciplines` · `GET /backoffice/v1/catalog/activity-types` (Backoffice). Space los leerá en `GET /catalog/v1/disciplines` · `GET /catalog/v1/activity-types` con su token; todavía no están servidas. As implemented (STUDIO-164), Studio reads both at `GET /studio/v1/catalog/disciplines` · `GET /studio/v1/catalog/activity-types` with its session cookie: a session template names a discipline and its draft an activity type, so a member picks them from these lists instead of typing a code. Result contracts (`OP-CAT-012`) stay off Studio, because nothing a gym authors reads them |
| **Actor** | Cualquier cuenta autenticada |
| **Filtros obligatorios** | Solo contenido global publicado y no archivado |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Sin paginación en V1: el catálogo global es pequeño y cerrado. Orden por código estable |
| **Offline / concurrencia** | Cacheable con validación; Space lo precarga para poder registrar sin conexión. The web surfaces answer uncached and never `304` (Backoffice `no-store`, Studio `private, no-store`): a `304` reached their browsers without `Access-Control-Allow-Origin` |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | El código es estable y no se reutiliza. Un tipo de actividad determina qué contratos y estructuras son compatibles. Any active person may read it on every surface: the catalogue is global published content and carries no organisation to check a Studio capability against. An empty list is a real answer, not a fault: no discipline exists until Backoffice publishes one, and until then no session template can be created |
| **Falla cerrada** | — |

#### `OP-CAT-009` — Buscar movimientos

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /catalog/v1/movements?discipline=&q=&muscle=&equipment=` · `GET /studio/v1/organizations/{orgId}/movements?q=` |
| **Actor** | Cualquier cuenta autenticada |
| **Filtros obligatorios** | En `/catalog`: solo alcance global. En `/studio`: global **más** los privados de `{orgId}` y nada de otras organizaciones |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor opaco. Orden: relevancia y nombre normalizado, desempate por identificador. El cursor es obligatorio, no una comodidad: el catálogo global pasó de decenas a centenares, y un tope sin cursor devuelve una página que parece el catálogo entero |
| **Offline / concurrencia** | El subconjunto global es cacheable en Space, que pagina una vez y se queda con la copia completa |
| **Información sensible** | Ninguna categoría personal. El contenido privado de una organización **es** confidencial frente a las demás |
| **Evento de dominio** | Ninguno |
| **Reglas** | La búsqueda cubre nombre y alias. Un movimiento archivado no aparece salvo petición explícita. `muscle` y `equipment` son repetibles: varios valores de un mismo filtro son `or`, y entre filtros distintos es `and`. Cada fila trae la dirección de su demostración cuando existe; un movimiento sin ella no es un error |
| **Falla cerrada** | Sin `{orgId}` no se devuelve ningún privado |
| **Implemented in Studio (STUDIO-57..60)** | `catalog.search_organization_movements(person, organization, query, discipline_code, include_archived, limit, cursor)` returning `{data, page}`; `GET /studio/v1/organizations/{organizationId}/movements?q&discipline&include_archived&limit&cursor`, `cookieAuth`, the exact Studio `Origin`, `200 StudioMovementPage`, `private, no-store`. **Contradiction resolved, actor:** not any authenticated account. It requires `manage_content`, because only those who compose content pick movements. Staff gets `403` and somebody outside the organization `404`. **What:** published global movements plus this organization's, and never another's, not even one another gym planned for the searcher (`T-MOV-1`). Each item says whose it is in `scope` (`global` or `organization`) and whether it is `archived`, with `muscles`, `equipment` and `demo_url`. **Matching:** `q` (up to 120 characters) matches the normalized name or any other name as a literal substring, so `%` and `_` are not patterns. `discipline` (up to 64) narrows it. Archived ones appear only with `include_archived=true`. **Deviation, order:** the normalized name, then the id. There is no relevance ranking. Keyset pages of 1 to 100 results (25 by default) with an opaque cursor; a cursor it cannot read is `400`. **Still pending on `/catalog`:** the Space search matches names only, not other names. Tests: `T-CAT-MOVEMENT-SEARCH-01` (21), `T-CAT-STUDIO-MOVEMENT-API-01..07`, `-INT-01/02` |

#### `OP-CAT-010` — Consultar un movimiento

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /catalog/v1/movements/{id}` |
| **Actor** | Cualquier cuenta autenticada |
| **Filtros obligatorios** | Global publicado, o privado de una organización donde el actor tiene membresía vigente |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | Incluye alias, músculos con su principal, equipamiento compatible, los pasos de ejecución en orden, variantes con el porqué de cada una, la demostración visual cuando existe, y sucesor global si fue promovido. Los pasos son contenido curado y revisado: se leen aquí y no se escriben desde ninguna superficie de producto. La demostración viaja como dirección absoluta compuesta al proyectar, nunca como una URL almacenada: el origen es configuración, no dato |
| **Falla cerrada** | Privado de otra organización: misma respuesta que "no existe" |
| **Implemented in Studio (STUDIO-57..60)** | `catalog.read_organization_movement(person, organization, movement)`; `GET /studio/v1/organizations/{organizationId}/movements/{movementId}`, `200 OrganizationMovement`, `private, no-store`, with the membership and `manage_content` of the search. It reads a published global movement or one of this organization's, archived ones included. Another organization's, or a global one nobody published, answers `404`, as one that does not exist. The answer carries `id`, `name`, `discipline_code`, `scope`, `archived`, `revision`, `aliases`, `equipment`, `muscles`, `variant_of {id, name, relation, note}`, `name_locked` and `demo_url`, but not the execution steps, which only global movements have. **Contradiction resolved:** the filter above admits, on `/catalog/v1/movements/{id}`, the private movements of an organization where the actor is a member. As built, that Space detail serves the global library only (`T-CAT-MOVEMENT-RLS-10`), and a gym's movement is read here, in Studio. In Space a person sees a gym's movement only inside what she was planned or trained, through `movements_select_planned` and `movements_select_executed`. Tests: `T-CAT-MOVEMENT-SEARCH-API-17..21`, `T-CAT-STUDIO-MOVEMENT-API-08..10`, `-INT-03` |

#### `OP-CAT-011` — Listar equipamiento

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /catalog/v1/equipment` |
| **Actor** | Cualquier cuenta autenticada |
| **Filtros obligatorios** | Alcance global, o privado de una organización con membresía vigente |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden por nombre normalizado |
| **Offline / concurrencia** | Cacheable |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | `EQUIPMENT` describe compatibilidad, **no** inventario, disponibilidad ni reservas |
| **Falla cerrada** | — |

#### `OP-CAT-012` — Consultar contratos de resultados de un tipo de actividad

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/catalog/activity-types/{id}/result-contracts` (Backoffice). Space la leerá en `GET /catalog/v1/activity-types/{id}/result-contracts` con su token; todavía no está servida |
| **Actor** | Cualquier cuenta autenticada |
| **Filtros obligatorios** | Asociaciones vigentes del tipo de actividad |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable. Space lo precarga: sin él no puede validar localmente un borrador antes de sincronizar |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve contratos, versiones, cuál es default y los mínimos por nivel `partial`, `summary`, `detailed` y `sensor_enriched`. La validación autoritativa sigue siendo del servidor: esta consulta existe para dar mensajes útiles al usuario, no para autorizar |
| **Falla cerrada** | — |

#### `OP-CAT-013` — Listar especialidades profesionales

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/professional-specialties` |
| **Actor** | Cualquier cuenta autenticada |
| **Filtros obligatorios** | Solo `status='published'` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Sin paginación en V1; `display_order`, desempate por código |
| **Offline / concurrencia** | Cacheable con `ETag` |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | Una especialidad es vocabulario profesional gobernado y no se infiere automáticamente desde `catalog.disciplines` |
| **Falla cerrada** | Códigos draft, deprecados o archivados no se devuelven para nuevas selecciones |

#### `OP-CAT-014` — Listar tipos de credencial profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/professional-credential-types` |
| **Actor** | `A2` con sesión Studio activa |
| **Filtros obligatorios** | Solo `status='published'` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Sin paginación en V1; `display_order`, desempate por código |
| **Offline / concurrencia** | Cacheable con `ETag` |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | El tipo gobierna nuevas declaraciones; deprecarlo conserva credenciales históricas y evita nuevas declaraciones o revisiones con ese código |
| **Falla cerrada** | Códigos draft, deprecados o archivados no se devuelven para nuevas declaraciones |

#### `OP-CAT-015` — Listar músculos

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /catalog/v1/muscles` |
| **Actor** | Cualquier cuenta autenticada |
| **Filtros obligatorios** | Solo `status='published'` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Sin paginación en V1; `region` y luego `display_order`, desempate por código |
| **Offline / concurrencia** | Cacheable con `ETag` |
| **Información sensible** | Ninguna. Un músculo del catálogo describe un movimiento, **nunca** el cuerpo de una persona: la composición corporal vive en `identity` y es dato de salud |
| **Evento de dominio** | Ninguno |
| **Reglas** | Vocabulario global y único: un músculo no tiene alcance de organización, porque dos gimnasios no pueden discrepar sobre qué es un cuádriceps. `body_slug`, cuando existe, es la parte de la figura que **representa** al músculo —no siempre la que es exactamente él—, de modo que el filtro y el onboarding hablan un solo idioma. Dos músculos pueden compartir parte |
| **Falla cerrada** | Códigos draft o deprecados no se devuelven |

### 7.6 Planificación

Dueño de `SESSION_TEMPLATE`, `SESSION_TEMPLATE_DRAFT`, `SESSION_TEMPLATE_VERSION`, `PLANNED_STEP`, los targets tipados, `PROGRAM`, `PROGRAM_DRAFT`, `PROGRAM_VERSION`, `PROGRAM_VERSION_SESSION`, `PROGRAM_ASSIGNMENT`, `ASSIGNMENT_MANAGEMENT_PERIOD`, `PRESCRIPTION_REVISION` y `PLANNED_SESSION`.

Reglas que gobiernan todo el dominio:

- Borrador y versión publicada **no se mezclan**. Una versión publicada es completa e inmutable.
- Nada referencia "la última": toda referencia histórica apunta a una versión exacta.
- Planificación expresa **intención**. Nunca almacena hechos ejecutados ni se sobrescribe con resultados.
- Una asignación pertenece al historial de la **persona**, aunque la haya originado una relación.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-PLN-001` | Crear una plantilla de sesión | Comando | `A2`, `A3`–`A5` |
| `OP-PLN-002` | Editar el borrador de una plantilla | Comando | `A2`, `A3`–`A5` |
| `OP-PLN-003` | Publicar una versión de plantilla | Comando | `A2`, `A3`–`A5` |
| `OP-PLN-004` | Derivar una versión desde otra | Comando | `A2`, `A3`–`A5` |
| `OP-PLN-005` | Deprecar una versión de plantilla | Comando | `A2`, `A4`, `A5` |
| `OP-PLN-006` | Crear un programa | Comando | `A2`, `A3`–`A5` |
| `OP-PLN-007` | Editar el borrador de un programa | Comando | `A2`, `A3`–`A5` |
| `OP-PLN-008` | Publicar una versión de programa | Comando | `A2`, `A3`–`A5` |
| `OP-PLN-009` | Deprecar una versión de programa | Comando | `A2`, `A4`, `A5` |
| `OP-PLN-010` | Asignar una versión de programa a una relación | Comando | `A3` |
| `OP-PLN-011` | Autoasignarse un programa | Comando | `A2` |
| `OP-PLN-012` | Reprogramar una sesión planificada | Comando | `A3`, `A7` |
| `OP-PLN-013` | Crear una revisión de prescripción | Comando | `A3`, `A7` |
| `OP-PLN-014` | Cancelar una asignación administrada | Comando | `A3`, `A4`, `A5` |
| `OP-PLN-015` | Decidir la continuidad de una asignación desacoplada | Comando | `A2` |
| `OP-PLN-016` | Consultar mi agenda | Consulta | `A2` |
| `OP-PLN-017` | Consultar una asignación propia | Consulta | `A2` |
| `OP-PLN-018` | Consultar las asignaciones de un cliente | Consulta | `A3`, `A7` |
| `OP-PLN-019` | Listar plantillas y versiones | Consulta | `A2`, `A3`–`A5` |
| `OP-PLN-020` | Listar programas y versiones | Consulta | `A2`, `A3`–`A5` |
| `OP-PLN-021` | Consultar una versión publicada | Consulta | `A2`, `A3`–`A5` |
| `OP-PLN-022` | Consultar mi día | Consulta | `A2` |
| `OP-PLN-023` | Consultar el borrador de una plantilla | Consulta | `A2`, `A3`–`A5` |
| `OP-PLN-024` | Ordenar mis programas | Comando | `A2` |
| `OP-PLN-025` | Consultar mi contenido | Consulta | `A2` |
| `OP-PLN-028` | Descartar una plantilla propia | Comando | `A2` |
| `OP-PLN-029` | Descartar un programa propio | Comando | `A2` |
| `OP-PLN-030` | Consultar mi programa sin publicar | Consulta | `A2` |
| `OP-PLN-034` | Eliminar mi programa | Comando | `A2` |
| `OP-PLN-035` | Duplicar mi programa | Comando | `A2` |

---

#### `OP-PLN-001` — Crear una plantilla de sesión

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/session-templates` · `POST /space/v1/session-templates` |
| **Actor** | `A3`–`A5` en Studio; `A2` para contenido personal |
| **Filtros obligatorios** | Exactamente **un** contexto de ownership: persona **u** organización, nunca ambos |
| **Transacción** | Crear `SESSION_TEMPLATE` con identidad estable y su primer `SESSION_TEMPLATE_DRAFT` |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | Contenido de entrenamiento de la organización o de la persona |
| **Evento de dominio** | `planning.session_template_created.v1` |
| **Reglas** | La identidad existe antes de publicar nada. Autoría y ownership son dimensiones separadas: el coach que la escribió queda registrado aunque la plantilla pertenezca a la organización |
| **Falla cerrada** | Doble contexto de ownership, rechazo |

#### `OP-PLN-002` — Editar el borrador de una plantilla

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PUT /studio/v1/organizations/{orgId}/session-templates/{id}/draft` · `PUT /space/v1/session-templates/{id}/draft` |
| **Actor** | `A3`–`A5` con membresía vigente; `A2` sobre contenido propio |
| **Filtros obligatorios** | La plantilla pertenece al contexto del actor |
| **Transacción** | Reemplazar el contenido del borrador: pasos planificados, targets tipados por modalidad y referencias a movimientos |
| **Idempotencia** | `Idempotency-Key`. `PUT` sin cambios no genera revisión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline. Dos ediciones concurrentes se resuelven por versión optimista: la perdedora recibe `409` con el estado actual |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.session_template_draft_updated.v1` |
| **Reglas** | Un borrador **nunca** es referenciable por un programa ni por una asignación. Los targets se guardan en estructuras tipadas por familia, no en JSONB libre |
| **Falla cerrada** | Target incompatible con el tipo de actividad declarado, rechazo |

#### `OP-PLN-023` — Consultar el borrador de una plantilla

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/session-templates/{id}/draft` · `GET /space/v1/session-templates/{id}/draft` |
| **Actor** | `A3`–`A5` con membresía vigente; `A2` sobre contenido propio |
| **Filtros obligatorios** | La plantilla pertenece al contexto del actor |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Devuelve el `ETag` con el que se editará después, de modo que la edición siguiente entra en el mismo control optimista que `OP-PLN-002` |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve el borrador y nunca una versión publicada; para eso está `OP-PLN-021`. **Sin esta operación un borrador guardado es un borrador irrecuperable:** se escribe, se cuenta y nadie puede volver a él. Quien edita **carga antes de escribir**: un editor que se abre vacío sobre un borrador existente y autoguarda reemplaza lo que había por lo que todavía no sabe |
| **Falla cerrada** | Borrador ajeno o inexistente: la misma respuesta, para no revelar cuál de las dos cosas es |

#### `OP-PLN-003` — Publicar una versión de plantilla

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/session-templates/{id}/versions` · `POST /space/v1/session-templates/{id}/versions` |
| **Actor** | `A3`–`A5`; `A2` sobre contenido propio |
| **Filtros obligatorios** | Borrador completo y válido: disciplina, tipo de actividad, al menos un paso, targets compatibles y unidades resueltas |
| **Transacción** | Crear `SESSION_TEMPLATE_VERSION` inmutable con sus `PLANNED_STEP` y targets, y asignar el número de versión |
| **Idempotencia** | `Idempotency-Key`. Publicar un borrador idéntico a la **última** versión no crea otra y devuelve esa. Idéntico a una versión **anterior** crea la siguiente: publicar nunca devuelve una versión ya superada, porque su identificador viaja en semanas de programa y sesiones planificadas que lo resolverían contra nada (`ADR-009`) |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. La numeración es monotónica y se serializa: dos publicaciones concurrentes no producen el mismo número |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.session_template_version_published.v1` |
| **Reglas** | Publicar **no** actualiza programas existentes ni asignaciones históricas: quien apuntaba a v1 sigue en v1. Una versión publicada no se edita jamás; corregir exige publicar otra |
| **Falla cerrada** | Borrador incompleto, rechazo con la lista de faltantes |
| **Implemented** | Convergence compares only with the **latest** version, and only while it is `published`: when the latest is deprecated, the same content is published as a new version. A new version takes the draft's `derived_from_version_id` (see `OP-PLN-004`) |

#### `OP-PLN-004` — Derivar una versión desde otra

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/session-templates/{id}/versions/{v}/derivation` |
| **Actor** | `A3`–`A5`; `A2` sobre contenido propio |
| **Filtros obligatorios** | La versión origen está publicada y es accesible para el actor |
| **Transacción** | Crear un borrador nuevo copiando el contenido y registrando la relación de derivación |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.session_template_version_derived.v1` |
| **Reglas** | La derivación conserva la procedencia. Derivar desde una versión de otra organización no es posible en V1: no hay contenido compartido entre organizaciones |
| **Falla cerrada** | — |
| **Implemented** | A template has **one** draft, so deriving **replaces** that draft with the content of version `v` instead of creating another, and requires `If-Match` with the current draft's ETag. The source must be `published`: a deprecated version is not a starting point (`404`). Provenance lives on the draft through every edit and passes to the next version published from it, after which the draft continues from that version (migration `20261103150000_organization_content_stays_in_the_organization.sql`) |

#### `OP-PLN-005` — Deprecar una versión de plantilla

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/session-templates/{id}/versions/{v}/deprecation` |
| **Actor** | `A2`, `A4`, `A5` |
| **Filtros obligatorios** | La versión pertenece al contexto del actor y está publicada |
| **Transacción** | Marcar la versión como deprecada |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.session_template_version_deprecated.v1` |
| **Reglas** | Deprecar impide **componer contenido nuevo** con esa versión. **No** altera programas ya publicados, asignaciones activas ni sesiones planificadas: el historial es intocable |
| **Falla cerrada** | — |

#### `OP-PLN-006` — Crear un programa · `OP-PLN-007` — Editar su borrador

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/programs` · `PUT .../programs/{id}/draft` · `POST /space/v1/programs` · `PUT /space/v1/programs/{id}/draft` |
| **Actor** | `A3`–`A5`; `A2` para programas personales |
| **Filtros obligatorios** | Un solo contexto de ownership. Cada posición del borrador referencia una **versión exacta** de plantilla accesible para el actor |
| **Transacción** | Crear `PROGRAM` y su `PROGRAM_DRAFT`; al editar, reemplazar la composición |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline; versión optimista |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.program_created.v1`, `planning.program_draft_updated.v1` |
| **Reglas** | El borrador **no** puede referenciar "la última versión" de una plantilla: la referencia es siempre exacta y explícita. Un programa compuesto por versiones deprecadas puede seguir editándose, pero al publicar se advierte |
| **Falla cerrada** | Referencia a un borrador de plantilla, rechazo |
| **Implemented** | "Accessible" depends on whose program it is. An **organization** program accepts that organization's templates and published `global` ones, never a routine its author owns personally; a **personal** program accepts the person's own and `global` ones. Until migration `20261103150000_organization_content_stays_in_the_organization.sql` the shared guards also let a coach compose her gym's program with her own Space routine |

#### `OP-PLN-008` — Publicar una versión de programa

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/programs/{id}/versions` · `POST /space/v1/programs/{id}/versions` |
| **Actor** | `A3`–`A5`; `A2` para programas personales |
| **Filtros obligatorios** | Borrador con al menos una posición; cada posición apunta a una versión de plantilla **publicada**; si el borrador declara `repeats_forever`, es booleano |
| **Transacción** | Crear `PROGRAM_VERSION` inmutable con sus `PROGRAM_VERSION_SESSION` y su numeración. El borrador puede declarar `repeats_forever` —opcional, ausente es `false`— y **la versión publicada la lleva**: es contenido, entra en el canónico y por tanto en el `content_hash` (`ADR-032`) |
| **Idempotencia** | `Idempotency-Key`. Publicaciones equivalentes convergen a una sola versión: la **última**, mientras esté publicada; contenido igual a una versión anterior se publica como la siguiente (`ADR-009`) |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; numeración serializada |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.program_version_published.v1` |
| **Reglas** | Un programa v1 fijado a la plantilla v1 sigue en v1 aunque exista v2 de la plantilla: adoptar la nueva exige **publicar otra versión de programa**. Una versión publicada nunca se edita. **Que el programa no tenga fecha de fin es parte de lo que se publica**, no de cómo se presenta: dos versiones que sólo difieren en `repeats_forever` proponen entrenamientos distintos y no comparten hash. `content_schema_version` sigue siendo `1`, porque una clave opcional con valor por defecto no cambia la forma del contenido |
| **Falla cerrada** | Posición apuntando a versión no publicada, rechazo |

#### `OP-PLN-009` — Deprecar una versión de programa

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/programs/{id}/versions/{v}/deprecation` |
| **Actor** | `A2`, `A4`, `A5` |
| **Filtros obligatorios** | Versión publicada del contexto del actor |
| **Transacción** | Marcar la versión como deprecada |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.program_version_deprecated.v1` |
| **Reglas** | Impide asignaciones nuevas. **No** cancela ni altera las asignaciones vigentes ni sus sesiones |
| **Falla cerrada** | — |
| **Implemented** | Status change only, owner or admin (`403` for a coach). Blocking new assignments is enforced by whoever assigns: `OP-PLN-011` and `OP-PLN-010` (STUDIO-39) both refuse a version that is not `published` |

#### `OP-PLN-010` — Asignar una versión de programa a una relación

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/relationships/{relId}/assignments` |
| **Actor** | `A3` con asignación efectiva vigente |
| **Filtros obligatorios** | **FÓRMULA**, más: versión de programa publicada, no deprecada y perteneciente a `{orgId}`; relación vigente; fecha de inicio y zona horaria de la persona |
| **Transacción** | Una sola: crear `PROGRAM_ASSIGNMENT` congelando la versión exacta y la relación de origen; abrir el `ASSIGNMENT_MANAGEMENT_PERIOD` de esa relación; **materializar las `PLANNED_SESSION`** derivadas de la composición, resueltas en la zona horaria de la persona: **con fecha de fin, todas**; sin fecha de fin, **la semana de calendario en la que se asigna**, porque ahí no hay un «todas» (`ADR-032`) |
| **Idempotencia** | `Idempotency-Key`. Un reintento no crea una segunda asignación ni duplica sesiones |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Requiere `relationship_training` vigente: sin grant no hay asignación |
| **Evento de dominio** | `planning.assignment_created.v1` |
| **Reglas** | La agenda se materializa **en el momento de asignar**, no por un job periódico: no existe una ventana de calendario que dependa de que un worker corra a tiempo, y `ADR-032` no crea ninguno. De un programa con fecha de fin se materializa la composición entera; de uno sin fecha de fin, la semana de la asignación, y cada semana posterior la siembra la lectura que va a enseñarla —`OP-PLN-016` y `OP-PLN-022`— un instante antes de mostrarla. La relación de origen es inmutable. No hay límite de asignaciones activas simultáneas; los solapamientos de agenda se **advierten**, no se bloquean |
| **Falla cerrada** | Sin grant `relationship_training` vigente, rechazo |
| **Implemented** | `planning.assign_program_from_relationship` (migration `20261104090000_a_gym_assigns_a_program_through_the_relationship.sql`). The actor is the holder or an accepted cover with `assign_programs`; staff and administrators who do not coach get `403`, a relationship the actor does not attend `404`. A missing grant raises `AF430` with `relationship_training:contribute` as detail, and the API answers `403 scope-required` with `required_scope`. The version must be `published`, of a non-archived program owned by `{orgId}`; anything else is `422 program-version`. The zone is the one of the person's most recent personal assignment (her device), and the request's `timezone` only when she has none; an unknown zone is `422 timezone`, a start before today in that zone `422 starts-on`. The new assignment goes in front of her order, opens its management period and plants the calendar (whole when finite, the first week when open-ended). `schedule_overlaps` is true when a session still waiting in another `personal` or `active` assignment falls inside the new span; it never blocks and never says which. Reading her other assignments for zone, order and overlap uses the contract scope `relationship_assignment`. `FOR SHARE` on the relationship serializes it against termination: a crossing termination either waits and detaches it, or the assignment fails `409`. Tests: `T-PLN-RELASSIGN-01`, `relationship-assignment-concurrency.test.ts`, `T-PLN-API-010/046..049` |

#### `OP-PLN-011` — Autoasignarse un programa

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/assignments` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Versión de programa publicada y accesible para la persona: propia o global |
| **Transacción** | Igual que `OP-PLN-010`, **sin** relación de origen y sin periodo de gestión. Si la versión es `global`, **bifurca primero**: copia el programa, sus plantillas, sus pasos y sus targets a contenido de la persona y asigna la copia. Cada versión de plantilla copiada guarda `derived_from_version_id` hacia la de Allfit de la que salió (`ADR-009`, invariante 7). Todo en la misma transacción y bajo un solo recibo. Con `adopt_nutrition`, y si la versión es `global` y la persona tiene meta de referencia (`OP-PLN-021`), publica además esa meta como meta propia de la persona llamando a `nutrition.publish_self_goal_version` (`OP-NUT-007`) con el mismo comando: planificación no escribe tablas de nutrición |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna se comparte: es contenido personal |
| **Evento de dominio** | `planning.assignment_created.v1` |
| **Reglas** | La copia es una plantilla nueva con identidad propia, así que las métricas por rutina de la persona cuentan su copia; la procedencia es lo único que permite agregar cuánta gente entrena algo derivado de un programa de Allfit. Una asignación personal no tiene gestor y nadie la administra. Ninguna organización la ve, salvo que un grant la incluya explícitamente. **Tomar un programa global es quedárselo**: la persona pasa a ser dueña de una copia, así que lo que Allfit publique después no la alcanza y lo que ella cambie no alcanza a nadie. La inmutabilidad de una versión publicada ya protegía del cambio; lo que la copia añade es la propiedad, que es lo que hace posible editarlo. Partir el acto en dos operaciones dejaría a alguien dueño de una copia sin asignación si fallara la segunda mitad. **El calendario se materializa por semanas de calendario**: la semana N del programa cae en la semana N contada desde la que contiene el día de la asignación. Si la versión **no tiene fecha de fin**, esta transacción materializa sólo la semana en la que se asigna: lo demás lo siembra la lectura de la agenda, semana a semana, y no un job periódico (`ADR-032`) |
| **Falla cerrada** | — |

#### `OP-PLN-012` — Reprogramar una sesión planificada

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PATCH /studio/v1/organizations/{orgId}/planned-sessions/{id}` |
| **Actor** | `A3`, `A7` con asignación efectiva |
| **Filtros obligatorios** | **FÓRMULA**. La sesión pertenece a una asignación con periodo de gestión **vigente** de esa relación, y no tiene ejecución iniciada |
| **Transacción** | Actualizar la fecha planificada y registrar la revisión con autoría |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; versión optimista |
| **Información sensible** | Agenda de la persona |
| **Evento de dominio** | `planning.session_rescheduled.v1` |
| **Reglas** | El calendario de la parte **administrada** lo controla el coach; la persona no reprograma lo que un profesional gestiona. En una asignación personal o desacoplada no hay gestor y esta operación no aplica. Reprogramar nunca altera targets ni contenido de la versión |
| **Falla cerrada** | Sesión ya iniciada o asignación desacoplada, rechazo |
| **Implemented** | `planning.reschedule_planned_session` (migration `20261105090000_a_coach_manages_what_the_gym_assigned.sql`, STUDIO-41). The holder or an accepted cover with `assign_programs`. Staff, and an administrator or owner without `assign_programs`, get `403`; anyone who does not attend the person — an administrator who also coaches included — and another organization get `404`. Without `relationship_training` at `contribute` the answer is `403 scope-required`: the session is resolved first through the contract scope `planned_session_lookup`, keyed by its id, so a client who withdrew her grant yields `scope-required`, not `not-found`. A personal, detached or cancelled assignment, or an ended relationship, answers `409 conflict`. **Deviation: the optimistic version travels in the body, not in `If-Match`.** The body is `{scheduled_on, expected_revision}`; `planned_sessions.revision_number` is new and every move increments it, and a stale revision answers `409 stale-draft` with the session's `current_state`. A session with any attempt, or no longer `scheduled`, answers `409`. The new day is today or later in the session's zone and not before the program starts, and **stays inside the calendar week the session belongs to** (`week_starts_on` to +6); either violation is `422` on `/scheduled_on`. Moving a session to another week would empty a week Space offers and crowd another (`ADR-032`). Only `scheduled_at` and `revision_number` change: `week_starts_on`, `program_day` and the template version stay (HU-048 C5). Each move is kept in `planning.planned_session_reschedules` with the membership that made it, and `planning.session_rescheduled.v1` is enqueued; moving a session to the day it is on writes nothing. The response is the session as `OP-PLN-018` lists it. The person has no command that moves a session, so HU-048 C2 holds by construction. Tests: `T-PLN-MANAGE-01` (`API-01`, `INT-02..12`, `INT-55`, `RLS-01..07`, `RLS-33`, `RLS-36`, `IDEM-01/02`), `managed-assignment-concurrency.test.ts`, `T-PLN-API-176/177/179/181` |

#### `OP-PLN-013` — Crear una revisión de prescripción

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/assignments/{id}/prescription-revisions` |
| **Actor** | `A3`, `A7` con asignación efectiva |
| **Filtros obligatorios** | **FÓRMULA**, más periodo de gestión vigente sobre esa asignación |
| **Transacción** | Crear `PRESCRIPTION_REVISION` referenciando la asignación, el paso afectado y el ajuste tipado |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contenido de entrenamiento personalizado |
| **Evento de dominio** | `planning.prescription_revised.v1` |
| **Reglas** | La adaptación personal **no edita** la plantilla ni el programa publicados: vive en la asignación. Los overrides son tipados, no un JSON opaco. Se conservan cuando la asignación se desacopla |
| **Falla cerrada** | Sin periodo de gestión vigente, rechazo |
| **Implemented** | `planning.revise_prescription` (migration `20261105090000_a_coach_manages_what_the_gym_assigned.sql`, STUDIO-42). Body `{planned_step_id, kind, value, unit_code?}`, `201` with the revision. Actors, grant and `409` as in `OP-PLN-012`; the assignment is resolved through the contract scope `assignment_administration`. `kind` is one of the 14 `override_kind` values of DD §9.15 and must fit the step's target family: sets, reps and load for strength; RPE for strength and interval; distance, duration and pace for endurance; rounds, work and rest for interval; hold, repetitions and side for mobility; a note for any step. `value` is a JSON number or string as the kind requires, within the range its target table accepts; load, distance and pace require a catalogue `unit_code`, every other kind refuses one. Each problem names its field: `422` on `/planned_step_id`, `/kind`, `/value` or `/unit_code`. A step outside the assigned version is refused by the command and again by the constraint trigger `trg_prescription_revisions_after_insert_override` (`IX-13`). Revisions are append-only and the latest per step and kind is in force. **Space applies them** wherever it read the program's target (decision 2026-11-04): `execution.read_execution`, through `planning.effective_target` and `planning.effective_sets`, and the set count of `planning.read_week_plan`. For strength, a set count keeps the published sets and repeats the last one to grow, and reps and load apply to working (`normal`) sets only, so a warm-up stays light. The published template and program are never written (`T-ASG-7`), and adjustments survive detachment (HU-049 C3). Space's screens render sets and reps today; the other adjusted fields reach its projections but are not displayed yet. Event: `planning.prescription_revised.v1`. Tests: `T-PLN-MANAGE-01` (`API-02`, `INT-13..38`, `INT-53/54/56`, `RLS-08..12`, `RLS-16/17/20..23`, `IDEM-03/04`), `managed-assignment-concurrency.test.ts`, `T-PLN-API-178/179` |

#### `OP-PLN-014` — Cancelar una asignación administrada

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/assignments/{id}/cancellation` |
| **Actor** | `A3` con asignación efectiva, `A4`, `A5` |
| **Filtros obligatorios** | **FÓRMULA**, más periodo de gestión vigente |
| **Transacción** | Cerrar el periodo de gestión, cancelar únicamente las sesiones futuras **no iniciadas** y registrar el evento |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Agenda de la persona |
| **Evento de dominio** | `planning.assignment_cancelled.v1` |
| **Reglas** | Cancelar **no borra** el historial: las ejecuciones ya realizadas y las sesiones pasadas permanecen. No elimina la asignación del historial personal |
| **Falla cerrada** | — |
| **Implemented** | `planning.cancel_managed_assignment` (migration `20261105090000_a_coach_manages_what_the_gym_assigned.sql`, STUDIO-43). Empty body, `200` with `{id, status: cancelled, cancelled_at, sessions_cancelled}`. The coach who attends the person, or an administrator or owner through `manage_relationships` without attending her (`A4`, `A5`); staff get `403`, an unassigned coach and another organization `404`. **Everyone needs the grant at `contribute`, administrators included** (decision 2026-11-04); without it, `403 scope-required`. **Deviation: there is no `cancelled` lifecycle.** Cancelling sets `lifecycle = 'ended'` and closes the management period with `end_reason = 'cancelled'`; Studio reads that pair as `status: cancelled`. Sessions from today on, in each session's zone, that nobody started become `cancelled`; past sessions, started ones, executions and adjustments stay, and the row is never deleted (HU-050 C1–C3, `T-ASG-5`). A second cancellation converges on the first with the same document, and a retry with the same key replays. A personal or detached assignment, or an ended relationship, answers `409`. It holds the relationship `for share` and the assignment's advisory lock, which Space also takes to plant an open-ended week, and locks the sessions in a statement of their own before the one that decides, so a session she started meanwhile stays hers. **Gap:** administrators and owners may cancel, but `OP-PLN-018` refuses them, so Studio has no read that hands them an assignment id yet. Tests: `T-PLN-MANAGE-01` (`API-03`, `INT-41..51`, `RLS-27..32`, `IDEM-05..07`), `managed-assignment-concurrency.test.ts`, `T-PLN-API-180` |

#### `OP-PLN-015` — Decidir la continuidad de una asignación desacoplada

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/assignments/{id}/continuation` |
| **Actor** | `A2`, dueño de la asignación |
| **Filtros obligatorios** | La asignación es propia y está en `detached_pending_choice` |
| **Transacción** | Si continúa: reactivar la **misma** asignación como personal, sin abrir periodo de gestión, y reanudar las sesiones futuras pausadas. Si termina: cancelar solo las sesiones futuras no iniciadas |
| **Idempotencia** | `Idempotency-Key`. Una decisión ya tomada no se reabre por reintento |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contenido de entrenamiento y agenda propios |
| **Evento de dominio** | `planning.assignment_continued.v1` o `planning.assignment_ended.v1` |
| **Reglas** | Continuar **reutiliza la misma asignación y su snapshot**: no se copia, no se clona, no cambia de identidad. Ninguna organización nueva hereda la gestión: adoptarla exigiría una decisión explícita que V1 no ofrece. Mientras esté desacoplada no genera sesiones, recordatorios ni incumplimiento |
| **Falla cerrada** | Asignación no desacoplada, rechazo |

#### `OP-PLN-016` — Consultar mi agenda

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/agenda?from=&to=` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Sesiones planificadas de asignaciones propias |
| **Transacción** | Siembra previa de **una** semana: antes de responder, la lectura materializa la semana que va a enseñar de cada asignación propia cuya versión no tenga fecha de fin. Nada más |
| **Idempotencia** | La siembra es idempotente: si ya existe una fila de esa asignación para esa semana, no se toca nada, y un `pg_advisory_xact_lock` por asignación impide que dos lecturas simultáneas siembren dos veces |
| **Paginación y orden** | Cursor. Orden: fecha planificada ascendente, desempate por identificador |
| **Offline / concurrencia** | Cacheable en el dispositivo: Space precarga una ventana para poder entrenar sin conexión |
| **Información sensible** | Agenda y contenido de entrenamiento propios, y las cifras de la última ejecución de cada rutina |
| **Evento de dominio** | Ninguno |
| **Reglas** | Resuelve todo en la **zona horaria de la persona**. Incluye asignaciones administradas, personales y desacopladas, distinguiendo su estado. Las sesiones de una asignación desacoplada aparecen como pausadas, no como incumplidas. **Esta lectura escribe, y es junto con `OP-PLN-022` la única de toda la matriz que lo hace:** un programa sin fecha de fin no tiene agenda materializada más allá de la semana en que se asignó, así que la lectura siembra la semana que está a punto de enseñar. Es **una semana y ni un día más**, es idempotente, y se hace aquí y no en un worker porque `OP-EXE-001` exige que la fila planificada exista —nadie entrena una semana sin sembrar— y porque un horizonte que sólo extendiera el acto de entrenar dejaría a quien vuelve después de dos meses frente a una semana vacía que ya nadie podría sembrar (`ADR-032`). **Cada sesión de la semana responde también la versión de plantilla a la que apunta** (`template_version_id`): Hoy dibuja cada rutina de la semana con la fotografía que le toca por lo que trabaja, y esa fotografía no vive en la agenda sino en la rutina que responde `OP-PLN-025`, así que sin ese identificador la única manera de emparejar las dos respuestas sería el nombre, que es una cosa que se repite. Es un campo de la proyección y no una tabla ni un dato nuevo: duplicar aquí la portada sería una segunda verdad del mismo dato. **Cada sesión responde además cómo fue la última vez** (`last_time`): cuándo se entrenó, cuánto duró, cuántas series se registraron y cuánto tonelaje se movió. Es el reverso de la tarjeta de Hoy, que se gira para enseñarlo. Cuatro decisiones lo gobiernan. **Se cuenta por rutina y no por versión**: una rutina cambia de versión cada vez que se publica, y emparejar por versión borraría su historial al editarla, así que el enlace sube de `template_version_id` a la plantilla. **Sólo cuenta lo que terminó**: ejecuciones cerradas y no anuladas, nunca el intento abierto de hoy, porque «la última vez» es una vez que acabó. **El tonelaje lo canoniza la base**, uniendo `load_unit_code` con `catalog.units.to_canonical_factor`, como ya hace el progreso corporal: el factor vive en el catálogo, y convertir también en el cliente serían dos verdades del mismo número. **Y se responde nulo cuando no hay nada que decir**: una rutina que nunca se entrenó no lleva cifras, y una que no es de fuerza no lleva tonelaje; un cero diría que se entrenó y no se movió nada. **Un calentamiento no es trabajo**: no suma al tonelaje ni a las series de `last_time` (`ADR-033`). Esto **no cambia lo que la lectura escribe**: lo único que escribe sigue siendo la siembra de la semana |
| **Falla cerrada** | — |

#### `OP-PLN-017` — Consultar una asignación propia

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/assignments/{id}` |
| **Actor** | `A2` |
| **Filtros obligatorios** | La asignación es propia |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Contenido de entrenamiento propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve la **versión congelada**, sus revisiones de prescripción y el origen: qué organización la creó y si sigue administrada. Una persona siempre puede ver el snapshot de lo que le fue asignado, incluso después de terminar la relación |
| **Falla cerrada** | — |

#### `OP-PLN-018` — Consultar las asignaciones de un cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/relationships/{relId}/assignments` |
| **Actor** | `A3`, `A7` |
| **Filtros obligatorios** | **FÓRMULA**. Solo asignaciones **originadas por esa relación** |
| **Transacción** | Ninguna. Escribe `ACCESS_EVENT` |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: vigencia descendente |
| **Offline / concurrencia** | Nunca cacheable para decidir acceso |
| **Información sensible** | Contenido de entrenamiento de la persona bajo `relationship_training` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Una organización **no** ve las asignaciones personales de la persona ni las creadas por otra organización. Tras la terminación, deja de ver la asignación desacoplada y sus sesiones posteriores |
| **Falla cerrada** | Sin grant vigente, ninguna fila |
| **Implemented** | `planning.list_relationship_assignments` (migration `20261104090000_a_gym_assigns_a_program_through_the_relationship.sql`). Holder or accepted cover; anyone else in the organization, including owners and administrators who see the relationship through the directory, gets `404`. Only rows whose `origin_relationship_id` is this relationship, newest first by `assigned_at` (keyed to the millisecond the cursor carries), each with its version and every planted session. An access event with grant and scope version is written before anything is returned; without `app.request_id` the read does not happen. **Deviation:** without a live grant it raises `AF430` and the API answers `403 scope-required` naming `relationship_training:read`, rather than an empty list, so Studio can tell "nothing assigned" from "not shared". Both fail closed. Tests: `T-PLN-RELASSIGN-RLS-09..14`, `RLS-26/27`, `T-PLN-API-018/046`. Since STUDIO-41..43 each assignment also carries `adjustments` (the revision in force per step and kind), each session `started` and `revision_number`, and a cancelled assignment reads `status: cancelled` with no management (`T-PLN-MANAGE-INT-38..40/50`, `T-PLN-API-182..185`) |

#### `OP-PLN-019` — Listar plantillas y versiones · `OP-PLN-020` — Listar programas y versiones

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/session-templates` · `.../programs` · equivalentes en `/space/v1` |
| **Actor** | `A3`–`A5` en Studio; `A2` para contenido propio |
| **Filtros obligatorios** | Contenido del contexto del actor: su organización o su persona, **más el contenido `global` publicado**. **Nunca** de otra organización |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: actualización descendente, desempate por identificador. En `/space` el catálogo global se ordena por correspondencia con lo declarado en el onboarding —objetivo, nivel, zonas y sexo— antes que por fecha |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Contenido de entrenamiento de la organización. El catálogo `global` no lo es: es contenido publicado de Allfit |
| **Evento de dominio** | Ninguno |
| **Reglas** | Distingue explícitamente borrador de versiones publicadas. Los programas maestros de una organización **no** son visibles bajo `prior_training_history` de otra. El contenido `global` lo lee cualquier persona autenticada y **no** pertenece a ninguna organización, que es lo que `OP-PLN-011` ya asumía al admitir una versión «propia o global». **`weeks` puede venir nula**, y significa que la versión no tiene fecha de fin: no es un dato que falte, es que no hay un número que dar. Los días por semana se siguen derivando siempre, y el filtro de catálogo mira el número de sesiones y no si `weeks` existe, porque si no un programa sin fin desaparecería de él (`ADR-032`). **La portada de cada programa es la del juego de quien pregunta**: la resuelve `planning.cover_for` con el sexo que la persona declaró, y quien prefirió no decirlo recibe una **mezcla estable** de los dos juegos —determinista por programa, de modo que la misma lista se ve igual cada vez que se abre— y nunca un juego por defecto, que sería decidir por ella lo que ella decidió no decir. Se responde la dirección compuesta y nunca la clave. **Esto no escribe nada**: el sexo declarado ya está dado, la portada se calcula al proyectar, no se guarda por persona y no se registra quién vio cuál |
| **Falla cerrada** | — |

#### `OP-PLN-022` — Consultar mi día

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/today` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Lo propio de la persona autenticada, en su zona horaria |
| **Transacción** | Siembra previa de **una** semana, la misma de `OP-PLN-016`: antes de componer la respuesta se materializa la semana en curso de cada asignación propia sin fecha de fin |
| **Idempotencia** | La siembra es idempotente y está serializada por asignación; repetir la lectura no duplica ninguna sesión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Agenda, entrenamiento y peso corporal, cada uno con su categoría |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cierra el hueco que `HU-SP-089` tenía anotado como `NEW-SP-TODAY`. **Compone, no centraliza**: Planificación responde por lo que hay agendado esta semana, Ejecución por lo entrenado y por el historial, y también por el peso que se levantó; la superficie los junta en una respuesta porque la pantalla no puede dibujar ninguno sin los otros. **La cifra de peso de la semana es el tonelaje movido, no lo que pesa la persona.** La pantalla resume lo que se hizo —minutos, series y kilos levantados—, y el peso corporal no es algo que se haga: es una medida del cuerpo y vive en `OP-IDN-015`. Se canoniza a kilogramos en la base con `catalog.units.to_canonical_factor`, igual que en `OP-PLN-016`, y sale nulo cuando no se registró ninguna carga, porque un cero diría que se entrenó sin mover nada. Las series de calentamiento no suman al tonelaje ni a las series de la semana (`ADR-033`). **La unidad es la semana de calendario, de lunes a domingo**, y la sesión que se ofrece es la siguiente pendiente de esa semana, no la fechada hoy: el día es una sugerencia. Cumplida la semana no se adelanta la siguiente; se dice que está cumplida. Lo que quede sin hacer **no se arrastra**. **Esta lectura también siembra**, por la misma razón y con los mismos límites que `OP-PLN-016`: si el programa no tiene fecha de fin, la semana en curso se materializa aquí, acotada a una semana e idempotente, y no existe ninguna otra lectura de la matriz que escriba. **Las portadas del carrusel son las del juego de quien abre la aplicación**: `planning.cover_for` las resuelve con el sexo que declaró, y quien prefirió no decirlo ve una mezcla estable de los dos juegos, la misma cada vez que abre. Esa parte de la respuesta **no escribe nada** —lo único que escribe aquí es la siembra de la semana—: no se guarda por persona qué portada le tocó ni se registra que se eligió una |
| **Falla cerrada** | — |

#### `OP-PLN-024` — Ordenar mis programas

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PUT /space/v1/programs/mine/order` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Todas las asignaciones personales de la persona autenticada, sin faltar ni repetir ninguna |
| **Transacción** | Reescribir el orden de presentación de todas sus asignaciones en una sola pasada |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; reenviar el mismo orden converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna se comparte: es contenido personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | El orden **no es decoración**: el primero es el programa sobre el que abre la pestaña Entrenar, así que vive en la base y no en el dispositivo — reinstalar la aplicación no puede cambiar con qué programa se entrena. Es una escritura **entera**, como reemplazar los resultados de una sesión: el cliente manda el orden que está viendo completo, así que nunca hay un orden a medio aplicar. Un orden parcial se rechaza, porque dejaría lo omitido donde estuviera. **Una asignación nueva entra adelante**, de modo que tomar un programa es elegirlo sin un paso más |
| **Falla cerrada** | — |

#### `OP-PLN-025` — Consultar mi contenido

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/my-content` |
| **Actor** | `A2` sobre contenido propio |
| **Filtros obligatorios** | Plantillas de la persona que no estén archivadas |
| **Transacción** | Lectura |
| **Idempotencia** | No aplica |
| **Paginación y orden** | Sin paginar, ordenado por lo último tocado. Es la biblioteca de una persona, no un catálogo: no crece sin límite |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | Contenido de entrenamiento propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cada rutina se responde con lo que hace falta para dibujarla sin una segunda petición: **la fotografía que le toca por lo que trabaja** —no hay estilo que declarar desde que `OP-PLN-033` se retiró: toda rutina lleva fotografía, y una que todavía no dice qué trabaja se reconoce por su letra inicial; se responde **la dirección compuesta y nunca la clave**—, los músculos que trabaja, sus cifras, si tiene cambios sin publicar, y **en qué programas de la persona está**. Esto último no se puede deducir en el cliente —`OP-PLN-026` responde los programas sin su composición, y un programa tomado de Allfit ni siquiera tiene borrador que abrir—, así que deducirlo obligaría a una petición por programa y aun así mentiría. La versión que se nombra es **la última publicada**: una rutina sin publicar todavía no está en ningún programa. La que se responde es **la del juego de quien pregunta**, por `planning.cover_for`, y una mezcla estable de los dos juegos si prefirió no decir su sexo. Qué fotografía le toca a la rutina lo decide la región que esa rutina trabaja; lo único que añade el sexo declarado es de cuál de los dos juegos sale. Sigue siendo una lectura: no se guarda ninguna preferencia de portada ni queda rastro de cuál se sirvió |
| **Falla cerrada** | — |

#### `OP-PLN-028` — Descartar una plantilla propia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/session-templates/{id}/discard` |
| **Actor** | `A2` sobre contenido propio |
| **Filtros obligatorios** | La plantilla es de la persona autenticada, tenga o no versiones publicadas: una plantilla publicada **también** se descarta, y los programas propios que la componen se republican sin ella |
| **Transacción** | Llevar la plantilla a `archived`, retirar su borrador, y **republicar cada programa propio que la usaba sin ella**, mudando la asignación a la versión nueva. Todo en la misma transacción: partirlo dejaría a alguien con una rutina descartada que su programa sigue pidiendo |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; descartar dos veces converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.session_template_discarded.v1` |
| **Reglas** | **Es un estado, no un borrado.** `allfit_api` no tiene `DELETE` sobre este recurso y no va a tenerlo: lo que una persona escribió no se destruye desde el runtime, y un descarte tiene que poder explicarse después. **Una plantilla publicada sí se descarta**, y los programas propios que la componen se republican sin ella — la versión anterior de cada programa queda intacta, porque es lo que alguien entrenó, y la asignación se muda sola a la nueva. El contenido de Allfit no se toca: no es de la persona, y tomarlo ya le dio una copia que sí lo es. Las fotos que ninguna versión referencia se destruyen con la rutina; las que una versión publicada congeló sobreviven, porque la versión sobrevive |
| **Falla cerrada** | **Un programa no se vacía.** Si la plantilla es la única sesión que le queda a alguno, el descarte se rechaza nombrándolo: un programa sin sesiones no se puede publicar, y dejar a alguien con uno que ya no se puede tocar es peor que no borrar la rutina |

#### `OP-PLN-029` — Descartar un programa propio

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/programs/{programId}/discard` |
| **Actor** | `A2` sobre contenido propio |
| **Filtros obligatorios** | El programa es de la persona autenticada y no tiene ninguna versión publicada |
| **Transacción** | Llevar el programa a `archived` y retirar su borrador |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; descartar dos veces converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.program_discarded.v1` |
| **Reglas** | El gemelo de `OP-PLN-028` y por las mismas razones. **Es un estado, no un borrado**, y un programa con versión publicada **no se descarta**: hay asignaciones que la referencian y sesiones ya materializadas contra ella. Sin esta operación, un programa que alguien empieza y abandona queda huérfano — existe, cuenta y nadie puede alcanzarlo, que es exactamente el hueco que `OP-PLN-023` cerró del lado de las rutinas |
| **Falla cerrada** | Con versión publicada, rechazo — y la salida es `OP-PLN-034`, que elimina el programa entero en lugar de tirar un borrador que a esas alturas ya no existe |

#### `OP-PLN-030` — Consultar mi programa sin publicar

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/programs/unpublished` |
| **Actor** | `A2` sobre contenido propio |
| **Filtros obligatorios** | Programas de la persona autenticada, no archivados y **sin ninguna versión publicada** |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | El más reciente por `updated_at` del borrador; responde uno o ninguno |
| **Offline / concurrencia** | `no-store`: es un borrador que cambia al escribirlo |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | Ninguno |
| **Reglas** | **Sin esto un borrador de programa no se puede retomar.** `OP-PLN-022` lista los programas que la persona sigue, y parte de las asignaciones: uno que nunca se publicó no tiene versión ni asignación, así que no aparece en ninguna consulta y queda huérfano — existe, ocupa y nadie puede volver a él. Es el mismo hueco que `OP-PLN-023` cerró del lado de las rutinas, con la diferencia de que allí la plantilla sí se listaba y aquí no se listaba nada |
| **Falla cerrada** | Ausente y ajeno responden igual |

#### `OP-PLN-033` — Vestir mi programa — retirada

Reescribía el estilo de portada de un programa —`muscles`, `icon` con cuál, `photo`, o
ninguno— sobre `planning.programs`. Se retiró el 22 de septiembre de 2026 con
`HU-SP-108`: puestas las tres una al lado de otra en pantallas de verdad, la fotografía
era la única que alguien elegía, y una opción que nadie cambia no es una opción sino una
pregunta en medio del editor.

El identificador no se reutiliza. Lo que la operación probaba que valía —que la imagen la
decide el contenido y no la persona, y que la decide el programa y no cada rutina, para
que la semana se lea como una semana— no era la opción: era la regla de debajo, y esa se
queda en `OP-PLN-025`.

#### `OP-PLN-034` — Eliminar mi programa

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/programs/{programId}/remove` |
| **Actor** | `A2` sobre programa propio |
| **Filtros obligatorios** | El programa es de la persona autenticada (`owner_person_id`). Vale igual para uno que escribió y para uno de Allfit que tomó: tomarlo lo bifurcó y la copia es suya |
| **Transacción** | Llevar el programa a `archived` y retirar su borrador; pasar sus versiones publicadas a `deprecated`; terminar la asignación personal de la persona sobre esas versiones y retirar sus sesiones planificadas no cumplidas; y, si se pidió con rutinas, archivar las que sólo este programa usaba. Todo en una sola transacción y **en ese orden**: el programa se archiva antes que las rutinas, porque el republicado de `OP-PLN-028` filtra los programas no archivados y republicar el que acaba de irse sería resucitarlo |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; eliminar dos veces converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | `planning.program_discarded.v1`, `planning.assignment_ended.v1`, y un `planning.session_template_discarded.v1` por cada rutina archivada |
| **Reglas** | **Es un estado, no un borrado**, por la misma línea que ya sostienen `OP-PLN-028` y `OP-PLN-029`: el programa pasa a `archived`, sus versiones publicadas a `deprecated` y la asignación personal a `lifecycle = 'ended'` —**primer escritor de ese valor en Space**, y para eso estaba el enumerado—. Las versiones no se destruyen: hay sesiones planificadas que las apuntan y `ADR-009` las congela. Lo único que se retira son las sesiones planificadas **que nadie entrenó**; lo entrenado se queda, y no por cortesía: la clave foránea de `planned_session_executions` es `RESTRICT` y se niega, pero antes que eso, un entrenamiento es de quien lo hizo y la plataforma no tiene nada que borrar ahí. Con la petición de llevarse las rutinas se archivan **sólo las que ningún otro programa no archivado de la persona use** —propias, presentes en la composición de alguna versión suya—, en sitio y sin pasar por `OP-PLN-028`, porque esa operación lleva su propio recibo de idempotencia y un comando no puede llevar dos. **Una rutina compartida se queda**: borrarla rompería el otro programa, y `OP-PLN-028` ya se niega a dejar un programa sin una sola sesión — sería pedirle al dominio exactamente lo que el dominio prohíbe. Eliminar un programa y descartar un borrador (`OP-PLN-029`) son **dos actos distintos**: el segundo tira lo que nunca llegó a publicarse y no toca ninguna rutina |
| **Falla cerrada** | Programa ajeno e inexistente responden igual, para no hacer enumerable la biblioteca del vecino. Ninguna sesión con ejecución se retira: la clave foránea `RESTRICT` rechaza la transacción entera antes que perder un entrenamiento |

#### `OP-PLN-035` — Duplicar mi programa

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/programs/{programId}/duplicate` |
| **Actor** | `A2` sobre programa propio |
| **Filtros obligatorios** | El programa es de la persona autenticada. La composición se toma de su **última versión publicada**, o de su borrador si nunca se publicó |
| **Transacción** | Crear un `PROGRAM` propio con `content_scope = 'person'` y `status = 'draft'`, que hereda el estilo de portada del original, y su `PROGRAM_DRAFT` con la composición copiada tal cual —pasada por la canonicalización de contenido, con `repeats_forever` incluido— y el título con sufijo |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`; reenviar la misma petición devuelve la copia que ya existe y no una segunda |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna se comparte: es contenido personal |
| **Evento de dominio** | `planning.program_created.v1` |
| **Reglas** | **No acuña ninguna versión y no crea ninguna asignación.** La copia nace borrador y nada más: sólo se vuelve real cuando la persona la publica, y tirarla es `OP-PLN-029`. Hasta entonces no hay nada en la agenda, ninguna sesión materializada y nadie a quien le exista. **Las rutinas no se copian**: la composición apunta a las mismas versiones de plantilla, que son inmutables y por eso se comparten sin que un programa le cambie el contenido al otro; copiarlas duplicaría la biblioteca de la persona por cambiarle el nombre a un programa. El título es el del original con el sufijo **« - Copia»**, recortado a 160 caracteres antes de añadirlo, de modo que la copia se distinga del original sin abrirla. Sirve además para lo que hoy no tiene salida: **un programa tomado de Allfit llega sin borrador y no se puede editar**, y duplicarlo da una copia propia que sí |
| **Falla cerrada** | Programa ajeno e inexistente responden igual. Un programa sin versión publicada y sin borrador no se duplica: no hay composición que copiar |

#### `OP-PLN-021` — Consultar una versión publicada

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/session-templates/{id}/versions/{v}` · `GET /studio/v1/organizations/{orgId}/programs/{id}/versions/{v}` · `GET /space/v1/assignments/{id}/program-version` · `GET /space/v1/programs/{programVersionId}` |
| **Actor** | `A2`, `A3`–`A5` |
| **Filtros obligatorios** | La versión pertenece al contexto del actor, le fue asignada a la persona autenticada, **o es contenido `global` publicado**. Una versión que se puede asignar se puede leer: son la misma regla de acceso que `OP-PLN-011`, y decidir sin ver el contenido no es decidir |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable: es contenido inmutable |
| **Información sensible** | Contenido de entrenamiento |
| **Evento de dominio** | Ninguno |
| **Reglas** | Una persona puede leer íntegramente la versión que le fue asignada, aunque pertenezca a una organización: es el contenido que va a ejecutar. Eso **no** le da acceso al resto del catálogo de esa organización. Ausente y prohibido responden igual: distinguirlos haría enumerable el catálogo ajeno de identificador en identificador. **`weeks` puede venir nula** cuando la versión no tiene fecha de fin, y quien la dibuja escribe «sin fecha de fin» en lugar de un total que no existe (`ADR-032`). **La portada del detalle es la misma que la de la lista**: la del juego de quien pregunta, resuelta por `planning.cover_for`, y una mezcla estable para quien declinó decir su sexo. La versión sigue siendo inmutable y la portada no forma parte de ella —cuelga del programa—, así que **la respuesta es cacheable por juego y no por versión**: dos personas pueden recibir imágenes distintas del mismo contenido congelado, y una caché indexada solo por identificador de versión le serviría a una la portada de la otra. No se guarda ni se registra nada por haber elegido una. **Cada día del reparto responde también su portada**: la de su rutina, que `planning.pick_routine_cover` resuelve con la región que esa rutina trabaja y con el juego de quien pregunta, de modo que es la misma que enseñará en Hoy cuando el programa se tome. Sale nula donde la curaduría todavía no llegó, que es el estado normal de un catálogo que crece y no un error: quien la dibuja enseña la fila sin imagen. Se responde la dirección compuesta y nunca la clave (`ADR-031`). **La demostración de cada ejercicio no la responde esta operación**, aunque la pantalla la dibuje: ya tiene dueño en el catálogo de movimientos (`OP-CAT-003`) y quien la necesita la cruza por identificador. Colgarla también del paso pondría la misma imagen en dos respuestas, y el paso es una forma compartida con la sesión, que no la pide. **La meta de nutrición del programa** (`nutrition`) viene solo en versiones `global`: `planning.program_nutrition` elige el objetivo —el declarado por la persona si el programa lo sirve; si no, el primero del programa— y `nutrition.reference_targets` lo calcula con el último peso registrado. Sin peso o sin referencia sale nula, y por eso también es por persona y no cacheable por versión |
| **Falla cerrada** | — |
| **Implemented (Studio, programs)** | `planning.read_organization_program_version` (migration `20261103150000_organization_content_stays_in_the_organization.sql`) answers the `ProgramVersion` publishing names in `Location`: every day's exact template version, `repeats_forever` and the template versions retired since. Same rules as the template read: content managers of `{orgId}` only, audited before it returns, absent and forbidden alike (`404`), revalidated by ETag. Space keeps `planning.read_program_version`, a different read with another shape |

### 7.7 Ejecución

Dueño de `EXECUTED_SESSION`, `PLANNED_SESSION_EXECUTION`, `SESSION_SEGMENT`, los resultados tipados (`STRENGTH_SET`, `ENDURANCE_LAP`, `INTERVAL_RESULT`, `ROUND_RESULT`, `MOBILITY_RESULT`), `METRIC_SAMPLE`, `PROFESSIONAL_OBSERVATION`, `CORRECTION_PROPOSAL`, `REVISION_EVENT`, `RESULT_VALIDATION_EVENT` y `DERIVED_RESULT`.

Reglas que gobiernan todo el dominio:

- La ejecución pertenece a la **persona**, siempre. Ningún profesional sobrescribe un resultado ajeno.
- Estado de ejecución y **completitud** de resultados son dimensiones independientes.
- `NULL` significa ausencia de captura y **nunca** se sustituye por cero.
- No existe `manage_execution` ni un patch destructivo de resultados.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-EXE-001` | Iniciar un intento sobre una sesión planificada | Comando | `A2` |
| `OP-EXE-002` | Reanudar el intento activo | Comando | `A2` |
| `OP-EXE-003` | Abandonar un intento | Comando | `A2` |
| `OP-EXE-004` | Iniciar una sesión espontánea | Comando | `A2` |
| `OP-EXE-005` | Registrar segmentos y resultados | Comando | `A2` |
| `OP-EXE-006` | Finalizar la ejecución | Comando | `A2` |
| `OP-EXE-007` | Corregir una ejecución propia | Comando | `A2` |
| `OP-EXE-008` | Cambiar la ejecución primaria | Comando | `A2` |
| `OP-EXE-009` | Anular una ejecución propia | Comando | `A2` |
| `OP-EXE-010` | Crear una observación profesional | Comando | `A3`, `A7` |
| `OP-EXE-011` | Revisar una observación profesional propia | Comando | `A3`, `A7` |
| `OP-EXE-012` | Proponer una corrección | Comando | `A3`, `A7` |
| `OP-EXE-013` | Decidir una propuesta de corrección | Comando | `A2` |
| `OP-EXE-014` | Listar mis ejecuciones | Consulta | `A2` |
| `OP-EXE-015` | Consultar el detalle de una ejecución propia | Consulta | `A2` |
| `OP-EXE-016` | Consultar mi progreso | Consulta | `A2` |
| `OP-EXE-017` | Listar las ejecuciones autorizadas de un cliente | Consulta | `A3`, `A7` |
| `OP-EXE-018` | Consultar el detalle de una ejecución autorizada | Consulta | `A3`, `A7` |
| `OP-EXE-019` | Consultar el progreso autorizado de un cliente | Consulta | `A3`, `A7` |
| `OP-EXE-020` | Listar propuestas de corrección pendientes | Consulta | `A2`, `A3` |
| `OP-EXE-021` | Leer el resumen de un entreno terminado | Consulta | `A2` |
| `OP-EXE-022` | Leer el mes de mi historial | Consulta | `A2` |
| `OP-EXE-023` | Leer el detalle de un entreno terminado | Consulta | `A2` |
| `OP-EXE-024` | Anticipar qué cambia si anulo un entreno | Consulta | `A2` |
| `OP-EXE-025` | Repetir un entreno terminado | Comando | `A2` |
| `OP-EXE-026` | Comparar mi entrenamiento por semana o por mes | Consulta | `A2` |
| `OP-EXE-027` | Dejar en espera un historial exportado de otra app | Comando | `A2` |
| `OP-EXE-028` | Confirmar una importación de historial | Comando | `A2` |
| `OP-EXE-029` | Deshacer una importación de historial | Comando | `A2` |
| `OP-EXE-030` | Listar y consultar mis importaciones de historial | Consulta | `A2` |

---

#### `OP-EXE-001` — Iniciar un intento sobre una sesión planificada

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/planned-sessions/{id}/attempts` |
| **Actor** | `A2`, dueño de la asignación |
| **Filtros obligatorios** | La sesión planificada pertenece a una asignación **propia**; la asignación no está desacoplada y pausada. **Una sesión ya cerrada admite otro intento**: rechaza `cancelled` y `paused`, no `completed` |
| **Transacción** | Una sola: crear `EXECUTED_SESSION` en estado iniciado congelando disciplina, tipo de actividad, contrato de resultados vigente y su versión, zona horaria y procedencia de captura; crear el `PLANNED_SESSION_EXECUTION` con `attempt_number` único y monotónico; sembrar `SESSION_EXERCISE` con los pasos de la versión de rutina, en su orden, con sus superseries y el descanso de cada paso (`ADR-034`, `ADR-035`) |
| **Idempotencia** | `Command-Id = EXECUTED_SESSION.id`; replay HTTP por `Idempotency-Key`. Doble toque o recuperación offline no crean otro intento |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local`: el dispositivo puede iniciar sin conexión y sincronizar después con el mismo `Command-Id`. La numeración de intentos se serializa en el servidor |
| **Información sensible** | Entrenamiento de la persona |
| **Evento de dominio** | `execution.attempt_started.v1` |
| **Reglas** | Una persona **no puede ejecutar una asignación ajena**. Los intentos son históricos y no se borran para "limpiar" el historial. **Repetir una sesión hecha es legítimo** y crea otro intento; el primero válido sigue siendo el primario y es el que cuenta para la adherencia de la semana, de modo que repetir no infla el conteo |
| **Falla cerrada** | Asignación desacoplada y pausada, rechazo |

#### `OP-EXE-002` — Reanudar el intento activo

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/executions/{id}/resumption` |
| **Actor** | `A2`, dueño de la ejecución |
| **Filtros obligatorios** | La ejecución es propia y está iniciada o pausada, no finalizada |
| **Transacción** | Actualizar el estado conservando los instantes originales |
| **Idempotencia** | `Command-Id` durable + `Idempotency-Key`; lock y estado convergente |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local` |
| **Información sensible** | Entrenamiento |
| **Evento de dominio** | `execution.attempt_resumed.v1` |
| **Reglas** | **Reanudar no crea otro intento.** Es la regla que impide que una desconexión a mitad de sesión inflacione el historial |
| **Falla cerrada** | Ejecución finalizada, rechazo |

#### `OP-EXE-003` — Abandonar un intento

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/executions/{id}/abandonment` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecución propia no finalizada |
| **Transacción** | Cerrar la ejecución como abandonada conservando lo registrado |
| **Idempotencia** | `Command-Id` durable + `Idempotency-Key`; lock y estado convergente |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local` |
| **Información sensible** | Entrenamiento |
| **Evento de dominio** | `execution.attempt_abandoned.v1` |
| **Reglas** | Un intento abandonado **nunca** es primario y no cuenta para adherencia, pero permanece en el historial con lo que alcanzó a registrarse |
| **Falla cerrada** | — |

#### `OP-EXE-004` — Iniciar una sesión espontánea

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/executions` |
| **Actor** | `A2` |
| **Filtros obligatorios** | La disciplina tiene exactamente un tipo de actividad global publicado, con contrato de resultados vigente; la persona no tiene otra sesión libre abierta |
| **Transacción** | Crear `EXECUTED_SESSION` **sin** vínculo a ninguna sesión planificada y **sin ejercicios** (`ADR-034`): la persona los agrega mientras entrena |
| **Idempotencia** | `Command-Id = EXECUTED_SESSION.id`; replay HTTP por `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admitirá `draft_local`, el caso más común de uso sin conexión; hoy exige conexión y el borrador local llega con `TECH-21`. Una sola sesión libre abierta por persona: los inicios de una misma persona se serializan, y un segundo inicio se rechaza con `55006` (`409`) |
| **Información sensible** | Entrenamiento. Por defecto es actividad **autónoma**: ninguna organización la ve sin `prior_training_history` |
| **Evento de dominio** | `execution.session_started.v1`, previsto: ninguna función de ejecución escribe todavía en el outbox |
| **Implementado (anterior, retirado)** | `execution.start_session` sobre `/space/v1/executions` (`POST`). El `Command-Id` es el identificador de la sesión, de modo que el dispositivo la puede empezar sin conexión y reintentar sin crear dos. Devuelve `201` con `Location`, `ETag` `"execution:{id}:r0"` y el contrato congelado. Se construyó en la rama de Backoffice y se descartó al integrar. |
| **Implementado** | `execution.start_free_session` (migración `20261019120000`) sobre `POST /space/v1/executions`. Congela el único tipo de actividad global publicado de la disciplina pedida y su contrato por defecto vigente, la misma regla de las rutinas propias. El `Command-Id` es el id de la sesión y la repetición devuelve la misma. Devuelve `201` con `Location`. `execution.read_open_free_session` le dice a Hoy cuál retomar. |
| **Reglas** | Existe sin planificación, sin relación y sin organización. Es el escenario Space-only completo |
| **Falla cerrada** | Tipo de actividad sin contrato vigente, rechazo |

#### `OP-EXE-005` — Registrar segmentos y resultados

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PUT /space/v1/executions/{id}/results` |
| **Actor** | `A2`, dueño de la ejecución |
| **Filtros obligatorios** | Ejecución propia no finalizada. Cada resultado pertenece a una familia **compatible** con el tipo de actividad de su segmento |
| **Transacción** | Bajo lock y `If-Match`, reemplazar el contenido de trabajo, incrementar `executed_sessions.revision_number` y conservar unidad canónica/original |
| **Idempotencia** | `Command-Id` durable + `Idempotency-Key`. Mismo comando no se reaplica; `PUT` con el mismo contenido no genera cambios |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local` y `pending_sync`. `If-Match` usa la revisión base; un draft obsoleto devuelve `409 stale-draft` y nunca sobrescribe una revisión confirmada |
| **Información sensible** | Entrenamiento. Un dolor registrado aquí es **contexto de salud** y hereda esa clasificación, no la de la sesión |
| **Evento de dominio** | Ninguno hasta finalizar |
| **Reglas** | Los resultados van a estructuras tipadas por familia, nunca a un JSONB sin contrato. Un valor no capturado permanece `NULL`. Una sesión híbrida exige al menos dos segmentos de familias distintas con transiciones explícitas. **Cada serie de fuerza dice de qué tipo fue** —normal, calentamiento, al fallo o descendente, el vocabulario de `planning.set_kind`— y la que no lo dice es `normal`; **el esfuerzo percibido se registra aquí**, opcional por serie, y la que no lo declara lo deja nulo, nunca cero (`ADR-033`). **La lista de ejercicios se reemplaza con las series**: orden, superseries, añadidos y quitados, y cada serie dice a qué ejercicio pertenece. Una superserie no contigua se rechaza (`IX-50`, `ADR-034`). **El descanso de cada ejercicio viaja en la lista** y cambiarlo no toca la rutina (`ADR-035`) |
| **Falla cerrada** | Familia incompatible o unidad de otra dimensión, rechazo con error tipado |

#### `OP-EXE-006` — Finalizar la ejecución

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/executions/{id}/finalize` |
| **Actor** | `A2`, dueño de la ejecución |
| **Filtros obligatorios** | Ejecución propia no finalizada; contrato congelado al iniciar |
| **Transacción** | Una sola e indivisible: validar el envelope y los resultados contra el **contrato congelado**, escribir `RESULT_VALIDATION_EVENT` con nivel solicitado y alcanzado, cerrar la ejecución, resolver la primaria si corresponde y encolar el recálculo de derivados |
| **Idempotencia** | `Command-Id` durable + `Idempotency-Key`. Finalizar dos veces devuelve el outcome resuelto; no duplica ejecución ni cumplimiento |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | El cliente puede finalizar offline y sincronizar. Escrituras concurrentes sobre la misma ejecución no la corrompen: la validación y el cierre ocurren bajo lock de la ejecución |
| **Información sensible** | Entrenamiento, y las categorías heredadas por los datos capturados |
| **Evento de dominio** | `execution.finalized.v1`, `execution.primary_resolved.v1` cuando aplica |
| **Implementado** | `execution.finalize_session` sobre `/space/v1/executions/{id}/finalize` (`POST`), con `If-Match` de la revisión vista. Cierra `completed` y `pending`; no resuelve primaria porque no hay plan, y no certifica nivel mientras ADR-013 siga en revisión. |
| **Reglas** | Solo una ejecución **completada y válida** puede ser primaria, y hay como máximo una por sesión planificada. La adherencia cuenta **un** cumplimiento como máximo; V1 rechaza el cumplimiento dividido entre varias ejecuciones. Niveles superiores cumplen los mínimos de los inferiores. Una ingesta `partial` no satisface `summary` ni alimenta progresión precisa. `sensor_enriched` exige un detalle válido, no muestras huérfanas |
| **Falla cerrada** | Mínimos incumplidos, unidad incompatible o resultado de otra familia: rechazo con errores tipados y la ejecución permanece abierta |

#### `OP-EXE-007` — Corregir una ejecución propia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/executions/{id}/revisions` |
| **Actor** | `A2`, dueño de la ejecución |
| **Filtros obligatorios** | Ejecución propia. Sin ventana temporal: la corrección es posible indefinidamente |
| **Transacción** | Guardar en `execution.execution_revisions` el antes y el después, con actor y motivo, y reemplazar series, lista de ejercicios y horario bajo la revisión leída (`If-Match`). Los derivados se leen, no se guardan (`ADR-036`), así que se recalculan solos. En V1 no se revalida contra el contrato (`ADR-038`) |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local`. Revisiones concurrentes se ordenan; ninguna se pierde |
| **Información sensible** | Entrenamiento y categorías heredadas |
| **Evento de dominio** | `execution.revised.v1` |
| **Reglas** | Append-only: el valor original **nunca** se destruye, y la revisión no admite cambios ni borrados. Sólo sesiones terminadas y no anuladas. Fin antes del inicio, o una sesión vacía, se rechazan: vaciarla es anularla. El motivo es fijo, «Corrección de la persona» (`ADR-038`). En V1 no se emite el evento |
| **Falla cerrada** | Si la revisión rompe los mínimos del contrato, la ejecución baja de nivel alcanzado en lugar de quedar en un estado inválido silencioso |

#### `OP-EXE-008` — Cambiar la ejecución primaria

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PUT /space/v1/planned-sessions/{id}/primary-execution` |
| **Actor** | `A2`, **solo** la persona |
| **Filtros obligatorios** | Ambas ejecuciones son propias, pertenecen a la misma sesión planificada y la candidata está completada y es válida |
| **Transacción** | Cambiar la primaria y recalcular adherencia y progresión de forma idempotente |
| **Idempotencia** | `Idempotency-Key`. La concurrencia no crea primarias duplicadas: hay como máximo una |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Entrenamiento |
| **Evento de dominio** | `execution.primary_changed.v1` |
| **Reglas** | Cambiar la primaria es **explícito**: nunca ocurre de forma automática ni silenciosa. Ningún profesional puede ejecutarlo |
| **Falla cerrada** | Candidata inválida o incompleta, rechazo |

#### `OP-EXE-009` — Anular una ejecución propia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/executions/{id}/invalidation` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecución propia y finalizada |
| **Transacción** | Fijar `validation_status = 'annulled'` con `annulled_at` y `annulment_reason`, y recalcular derivados y adherencia |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Entrenamiento |
| **Evento de dominio** | `execution.annulled.v1` |
| **Reglas** | `annulled` es un estado **distinto** de `invalid`: `invalid` significa que la ejecución no alcanzó los mínimos de su contrato de resultados, y lo decide el sistema; `annulled` significa que la persona declara que esa sesión no refleja lo que pasó, y lo decide ella. Confundirlos hace indistinguibles dos hechos distintos. Anular la primaria **no promueve otra en silencio**: la sesión queda sin primaria hasta que la persona elija. Anular no borra la ejecución |
| **Falla cerrada** | El motivo es opcional: sin uno se registra «La persona lo eliminó» (`ADR-038`). Una sesión ya anulada o sin terminar se rechaza. En V1 no se emite el evento |

#### `OP-EXE-010` — Crear una observación profesional

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/clients/{personId}/observations` |
| **Actor** | `A3`, `A7` |
| **Filtros obligatorios** | **FÓRMULA** con `access_level` = `contribute`, sobre una ejecución visible para esa relación |
| **Transacción** | Crear `PROFESSIONAL_OBSERVATION` con autoría en la asignación profesional y procedencia `professional_observation` |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | Entrenamiento y, si observa dolor o limitación, contexto de salud con su clasificación propia |
| **Evento de dominio** | `execution.observation_created.v1` |
| **Reglas** | La observación **coexiste** con lo declarado por la persona; no lo reemplaza ni lo edita. Un grant `read` **no** permite esta operación. Si el profesional transcribe algo que la persona dijo, conserva procedencia `person_declared` y se registra a sí mismo únicamente como **capturador** |
| **Falla cerrada** | Sin `contribute`, rechazo |
| **Implemented (STUDIO-50)** | `execution.record_observation(person, organization, subject, execution, category, provenance, content, idempotency_key, command_id, request_hash)` returning `(result, replayed)`, migration `20261111090000_a_coach_reads_progress_and_observes_a_session.sql`; `cookieAuth`, `no-store`, `Idempotency-Key` and `Command-Id`. **Who:** the coach who attends her (the holder or an accepted cover) with the `observe_training` capability (`42501` → `403`). Anyone else gets `404`. **Scope:** a `training` observation needs `relationship_training` at `contribute`. A `health` one (pain or a limitation) needs `health_context` at `contribute`, whatever the session's own category. A missing scope is AF430 → `403 scope-required` naming it, and a paused service is AF424 → `409 service-paused`. **Where (decision 2026-11-06, strict ADR-016):** only on a completed, non-annulled session produced inside this relationship. A session she trained on her own is `422` with `errors[].code = execution`, even with `prior_training_history`. The composite FK `fk_professional_observations_session_context` enforces it again. **What:** `content` is 1 to 2000 characters, trimmed. `provenance` is `professional_observation`, or `person_declared` for a transcription, which keeps her as the source and records the coach only as who captured it (`T-OBS-3`). Nothing she declared changes (`T-OBS-4`). The observation id is the `Command-Id`. **Termination:** the command locks the relationship `for share` and reads the author's assignment again under that lock, so a termination that commits meanwhile is refused as `404`, exactly as after it (`T-OBS-5`). The outbox event carries ids and the category only. Writes record no `ACCESS_EVENT`. |

#### `OP-EXE-011` — Revisar una observación profesional propia

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/observations/{id}/revisions` |
| **Actor** | `A3`, `A7`, **autor** de la observación |
| **Filtros obligatorios** | **FÓRMULA**, más autoría propia de la observación |
| **Transacción** | Crear `REVISION_EVENT` con before/after, actor y motivo |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | La de la observación |
| **Evento de dominio** | `execution.observation_revised.v1` |
| **Reglas** | Un profesional revisa **directamente solo capturas y observaciones propias**. No revisa las de otro profesional, ni las de la persona, ni el raw de un dispositivo. Terminar la relación bloquea nuevas correcciones operativas |
| **Falla cerrada** | Observación ajena, rechazo |
| **Implemented (STUDIO-51)** | `execution.revise_observation(person, organization, observation, expected_revision, content, reason, idempotency_key, command_id, request_hash)` returning `(result, replayed)`, migration `20261111090000_a_coach_reads_progress_and_observes_a_session.sql`; the route above with `cookieAuth` and `no-store`. **Who:** only its author, while he attends her and its category is still shared at `contribute`. Anyone else's observation, or one he can no longer reach, is `404`. **Revision:** `expected_revision` must be the current `revision_number`, otherwise `409 stale-draft` (`40001`) with the observation as it stands. Unchanged content, or a blank reason (1 to 500 characters), is `422`. **Write:** one transaction appends an `execution.observation_revisions` row (from, to, before, after, reason, and the actor's assignment and membership) and moves the observation to the next revision. `trg_professional_observations_before_update_keep` lets only `content`, `revision_number` and `revised_at` change, one step at a time. **Concurrency:** two corrections over the same revision cannot both land. The observation's row lock lets one through and gives the other `stale-draft`. A termination that commits meanwhile is refused as `404`. **Contradiction resolved:** this operation says `REVISION_EVENT`, but there is no `execution.revision_events`. An observation's corrections go to their own append-only table, as a session's go to `execution.execution_revisions`. |

#### `OP-EXE-012` — Proponer una corrección

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/clients/{personId}/correction-proposals` |
| **Actor** | `A3`, `A7` |
| **Filtros obligatorios** | **FÓRMULA** con `contribute`; el target es un dato **declarado por la persona** y visible para esa relación |
| **Transacción** | Crear `CORRECTION_PROPOSAL` con target tipado, valor propuesto, motivo y vencimiento a 30 días; notificar a la persona |
| **Idempotencia** | `Idempotency-Key`. Una propuesta pendiente sobre el mismo target no se duplica |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Sin modo offline |
| **Información sensible** | La del dato propuesto |
| **Evento de dominio** | `execution.correction_proposed.v1` |
| **Reglas** | Proponer **no modifica nada**. No existe overwrite de datos ajenos ni un patch destructivo. La notificación a la persona es obligatoria |
| **Falla cerrada** | Target no declarado por la persona, rechazo |
| **Implemented (STUDIO-52)** | `execution.propose_correction(person, organization, subject, execution, set_order, field, value, unit, reason, idempotency_key, command_id, request_hash)` returning `(result, replayed)`, migration `20261112090000_a_coach_proposes_a_correction_and_she_decides.sql`; `POST /studio/v1/organizations/{organizationId}/clients/{personId}/correction-proposals`, `cookieAuth`, `no-store`, `Idempotency-Key` and `Command-Id`, `201 ProposedCorrection`. The proposal id is the `Command-Id`. **Who:** the coach who attends her (the holder or an accepted cover) with the `propose_corrections` capability (`42501` → `403`). Anyone else gets `404`. **Scope:** `relationship_training` at `contribute`. A missing grant is AF430 → `403 scope-required` naming it, and a paused service is AF424 → `409 service-paused`. **What:** one field of one strength set, the only target in V1 (its column has no FK; see `V1_DATA_DICTIONARY.md` §10.11): `achieved_reps` (a whole number, 1 to 1000), `load` (0 to below 10000, with a mass unit) or `rpe` (0 to 10), plus a reason of 1 to 500 characters. **Where:** any set of a completed, non-annulled session the coach may see through the screening. That is a session of this relationship, or one she trained on her own while she shares `prior_training_history`, which ADR-016 admits for `propose_correction`. A session she annulled or hid, or one he cannot see, is `404`. **Refused with `422`** (`errors[]` with paths): what a device captured or anybody observed (`errors[].code = execution`), a set that is not there (`set_order`), a field she never filled (`field`), the value she already has (`value`), and an invalid field, value, unit or reason. **Nothing changes by proposing (`T-PROP-1`):** not the set, not `revision_number`, not her revisions. **One pending proposal per field per set,** whoever proposes (`uidx_correction_proposals_pending_target`): a second is `23505` → `409 conflict`, while another field of the same set is admitted. **She must be reachable:** with no contact address it is `P0004` → `409 conflict`, as with substitutions, and nothing is written. **Concurrency:** the command locks the relationship `for share` and reads the proposer's assignment again under that lock, so a termination committed meanwhile is `404`, as after it. It then takes `execution.lock_correction_targets` for the session, so her own correction, an annulment or a hiding either went first or waits, and the proposal lands on the set as it then stands. **Notice:** `execution.correction_proposed.v1` carries who proposes, from which organization, her address and name, and the deadline, never the values; the worker emails it. The answer never carries her current value. Writes record no `ACCESS_EVENT`. |

#### `OP-EXE-013` — Decidir una propuesta de corrección

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/correction-proposals/{id}/decision` |
| **Actor** | `A2`, dueño del dato |
| **Filtros obligatorios** | La propuesta apunta a un dato propio y sigue pendiente y no vencida |
| **Transacción** | Registrar la decisión y, si acepta, aplicar el cambio como `REVISION_EVENT` conservando el original, el proponente y el motivo |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | La del dato corregido |
| **Evento de dominio** | `execution.correction_decided.v1` |
| **Reglas** | Aceptar **no** convierte al profesional en autor del dato: la procedencia sigue siendo de la persona y él queda registrado como proponente. Una propuesta vencida o cancelada por terminación de la relación no puede aceptarse |
| **Falla cerrada** | Propuesta vencida, rechazo |
| **Implemented (HU-SP-063)** | `execution.decide_correction_proposal(person, proposal, decision, idempotency_key, command_id, request_hash)` returning `(result, replayed)`, migration `20261112090000_a_coach_proposes_a_correction_and_she_decides.sql`; `POST /space/v1/correction-proposals/{proposalId}/decision` with `{decision: accept \| reject}`, `bearerAuth`, `no-store`, `Idempotency-Key` and `Command-Id`, `200 CorrectionProposal`. HU-SP-063 has no Jira task. **Who:** only her. Someone else's proposal, or none, is `P0002` → `404`. **Accepting** writes the proposed value into the same set, keeping its id; a new load clears `original_load_*`. The session moves to its next `revision_number`, and an `execution.execution_revisions` row keeps the snapshot before and after, her as `actor_person_id`, the proposal's reason and the new `correction_proposal_id`. The value stays declared by her and the professional is recorded only as the proposer (`T-PROP-2`). **Contradiction resolved:** this operation says `REVISION_EVENT`, but there is no `execution.revision_events`; an accepted proposal is an `execution_revisions` row that names it. **Rejecting** changes nothing else. **Decided once (`T-PROP-3`):** a proposal already decided, cancelled or past its thirty days is `55000` → `409 conflict`, with its state as the detail, even before the sweep marks it. Accepting is also `409` when the set no longer holds the value the proposal was made against, or the session is annulled or no longer completed. **Lock order:** the session `for update`, then `execution.lock_correction_targets`, then the proposal `for update` through her update policy, which only admits a pending one. So a decision made before the deadline beats the sweep, and a decision racing a termination finds the proposal cancelled. **Errors:** `22023` → `400`. **Event:** `execution.correction_decided.v1` with ids and the decision only; no worker delivers it, so the professional is not told by email. |

#### `OP-EXE-014` — Listar mis ejecuciones · `OP-EXE-015` — Consultar el detalle

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/executions?timezone=&month=&day=&discipline=&with_record=&free=&q=&cursor=&limit=` · `GET /space/v1/executions/{id}` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecuciones propias |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: inicio descendente, desempate por identificador |
| **Offline / concurrencia** | Cacheable en el dispositivo |
| **Información sensible** | Todas las categorías propias |
| **Evento de dominio** | Ninguno |
| **Reglas** | La persona ve **todo lo suyo**: intentos abandonados, anuladas, ocultas para terceros, observaciones profesionales recibidas y revisiones con su historial completo. **En V1 el listado responde sólo las terminadas y no anuladas** (`ADR-037`); lo demás está diferido y cada fila declara su `status` para añadirlo sin romper. Cada fila se resume al leer —duración, series de trabajo, kilos sin calentamientos, número de récords con la regla de `ADR-036` y la portada de la rutina como miniatura— y se filtra por mes o por un día en la zona de la persona, disciplina, récord, libre y texto en el nombre de la rutina o de sus ejercicios. **El detalle trae lo planificado serie por serie**: cada paso de fuerza responde sus series de `planning.planned_sets` —orden, tipo, repeticiones y carga— y cae en el resumen del paso cuando no las tiene, para que la sesión abra cada fila con el tipo que el plan pidió. Cada resultado responde su tipo (`ADR-033`). **Los ejercicios salen de la sesión, no del plan**: su lista en orden, con superseries, y cada serie con la posición de su ejercicio (`ADR-034`); cada ejercicio responde su descanso (`ADR-035`) |
| **Falla cerrada** | — |

#### `OP-EXE-016` — Consultar mi progreso

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/progress` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Derivados propios |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor por métrica y periodo |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Entrenamiento y, si se incluyen, progreso corporal con su clasificación |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cada `DERIVED_RESULT` expone algoritmo, versión, inputs y vigencia. Un derivado **hereda la clasificación más restrictiva** de sus inputs: un progreso calculado con peso corporal es progreso corporal |
| **Falla cerrada** | — |

#### `OP-EXE-017` — Listar las ejecuciones autorizadas de un cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/executions` |
| **Actor** | `A3`, `A7` |
| **Filtros obligatorios** | **FÓRMULA**. Las sesiones producidas dentro de la relación exigen `relationship_training`; la actividad autónoma o previa exige `prior_training_history`. Las `SESSION_VISIBILITY_DENIAL` aplicables se evalúan **antes** de proyectar y de contar |
| **Transacción** | Ninguna. Escribe `ACCESS_EVENT` en la misma transacción de lectura |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: inicio descendente. Los totales se calculan **después** de aplicar denegaciones |
| **Offline / concurrencia** | Nunca cacheable |
| **Información sensible** | Entrenamiento; el resto de categorías se redacta por field-set |
| **Evento de dominio** | Ninguno |
| **Reglas** | Una sesión oculta no aparece ni como placeholder, ni como hueco de paginación, ni como diferencia en un conteo. Sin `prior_training_history` no se ve historial previo ni sesiones autónomas. El field-set aplicado es el de la **versión congelada** en el grant: un grant v1 no recibe campos añadidos en v2 |
| **Falla cerrada** | Sin grant vigente, colección vacía y `ACCESS_EVENT` de intento denegado |
| **Implemented (STUDIO-47)** | `execution.list_authorized_executions(person, organization, subject, limit, cursor_started_at, cursor_id)`, migration `20261107090000_a_coach_reviews_what_a_client_trained.sql`; `cookieAuth`, `private, no-store`. **Who:** the coach who attends her now, meaning a live membership, her `active` relationship with this organization, and the holder or an accepted cover of it (`relationships.actor_is_assigned`). Being admin or owner is not attending, and both missing and forbidden answer `404`. **What:** completed, non-annulled sessions of two origins. Those produced inside this relationship need `relationship_training`. Autonomous ones need `prior_training_history` and no active denial for this relationship. Decided on 2026-11-05: a session produced inside **another** relationship is never shown here, even with `prior_training_history`. The row policy `executed_sessions_select_screening` decides, under the contract scope `session_screening` keyed by the relationship, which only these two reads open and restore. Denials are excluded before projecting, so a page has no gap. **Record:** one `ACCESS_EVENT` per category used (`allowed`, with its grant and version) before anything is returned. With nothing shared, the page is empty and one `denied` event is written. Each item names its `origin` (`relationship` or `prior`) and its `applied_scope` (the code and version of the grant that made it visible). No totals are returned. Page size 1 to 100 (the database caps a page at 101 rows), cursor on (`started_at` to the millisecond, `id`). **Gap:** the field-set is fixed in the function; `SCOPE_RESOURCE_RULE` is not consulted anywhere yet. |

#### `OP-EXE-018` — Consultar el detalle de una ejecución autorizada

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/executions/{id}` |
| **Actor** | `A3`, `A7` |
| **Filtros obligatorios** | Igual que `OP-EXE-017`, evaluado para esa ejecución concreta |
| **Transacción** | Ninguna. Escribe `ACCESS_EVENT` |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Nunca cacheable |
| **Información sensible** | Cada campo se redacta según **su propia** categoría, no según la de la sesión |
| **Evento de dominio** | Ninguno |
| **Reglas** | Los sets, cargas y repeticiones son visibles con `relationship_training`, pero el **dolor** permanece oculto sin `health_context` y el **peso corporal** sin `body_progress`, aunque la carga de ejercicio sí se vea. Nutrición usa sus tres scopes propios; frecuencia cardiaca, GPS, wearables y raw permanecen fuera de los siete scopes V1 |
| **Falla cerrada** | La ausencia de un campo redactado es indistinguible de su ausencia de captura: la nullability no filtra categorías denegadas |
| **Implemented (STUDIO-48)** | `execution.read_authorized_execution(person, organization, subject, execution)` returning `{outcome}`, migration `20261107090000_a_coach_reviews_what_a_client_trained.sql`. The surface moves from `bearerAuth` to `cookieAuth`, `private, no-store`. Same attending coach and same visibility as `OP-EXE-017`. It answers `403 scope-required` naming `relationship_training` at `read` only when she shares neither category. A session this coach may not see answers `404`, whatever the reason: hidden, unfinished, annulled, another gym's, another person's or nonexistent. Every attempt is recorded, refusals as `denied`. **Decision (2026-11-05): pain and body weight are left out of the detail entirely** rather than redacted field by field. So are heart rate, the device and the capture source. The detail carries the session's sets, laps, intervals, rounds and holds, plus `origin`, `planned_session_id` and `applied_scope`. `AuthorizedStrengthSet` and `MeasuredValue` are removed from the contract. |
| **Implemented (STUDIO-50)** | The detail now carries `observations`: what this relationship wrote on that session, oldest first. Each has `category`, `provenance`, `content`, `revision_number`, `author_name` and `authored_by_me`. Training observations show with `relationship_training`. Health observations show only while `health_context` is shared at `read`, and reading them writes an `allowed` `health_context` `ACCESS_EVENT` on `execution.professional_observations` before the answer. Once she takes her health back, those observations are gone from the detail, and nothing is recorded under a category that showed nothing. |

#### `OP-EXE-019` — Consultar el progreso autorizado de un cliente

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/progress` |
| **Actor** | `A3`, `A7` |
| **Filtros obligatorios** | **FÓRMULA**. El derivado solo se calcula sobre inputs que el actor puede leer |
| **Transacción** | Ninguna. Escribe `ACCESS_EVENT` |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor por métrica y periodo |
| **Offline / concurrencia** | Nunca cacheable |
| **Información sensible** | El derivado hereda la clasificación **más restrictiva** de sus inputs |
| **Evento de dominio** | Ninguno |
| **Reglas** | Ocultar una sesión **invalida** los récords y agregados profesionales que la incluían; ningún otro scope la reexpone dentro de esa relación. Un derivado nunca se convierte en un canal lateral para leer lo denegado |
| **Falla cerrada** | Si un derivado no puede calcularse sin inputs denegados, no se devuelve: no se sustituye por una aproximación |
| **Implemented (STUDIO-49)** | `execution.read_client_progress(person, organization, subject, timezone, period, count)` returning `{outcome}`, migration `20261111090000_a_coach_reads_progress_and_observes_a_session.sql`; `GET …/progress?timezone&period&count`, `cookieAuth`, `private, no-store`. **Shape (deviation from «cursor por métrica y periodo»):** one bounded document. `period` is `week` or `month`, `count` is 1 to 12, and `timezone` is a required IANA zone, because Studio has no organization zone. Periods come oldest first. Each period has `sessions`, `trained_seconds`, `work_sets`, `volume_kg`, and `muscles` (work sets by primary muscle). Up to 50 movements follow, each with `best_kg`, `previous_best_kg`, `change_kg`, `bests` per period, and `best_e1rm_kg`: Epley over 1 to 12 reps, `algorithm {e1rm: 'epley', version: 1}`. **Inputs:** only what `executed_sessions_select_screening` shows under `session_screening`. So a derivation uses only readable inputs, and a hidden session leaves every total and every best by construction: there is no derived table and nothing to invalidate (ADR-036 computes on read). Only completed, non-annulled sessions with an end count. Warm-ups and sets with no load never count as zero. Her own movements are counted but never named. **Record:** with neither training scope shared, one `denied` event and `403 scope-required`. Otherwise one `allowed` event per grant used, before computing. No adherence, programmes or body weight, and no Pro required. Every input is `training`, so that is the classification. |

#### `OP-EXE-020` — Listar propuestas de corrección pendientes

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/correction-proposals` · `GET /studio/v1/organizations/{orgId}/correction-proposals` |
| **Actor** | `A2` (dirigidas a ella), `A3` (emitidas por él) |
| **Filtros obligatorios** | Propias como destinataria o como proponente |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: vencimiento ascendente |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | La del dato propuesto |
| **Evento de dominio** | Ninguno |
| **Reglas** | Muestra estado y vencimiento. Las propuestas canceladas por terminación de relación aparecen como canceladas, no desaparecen |
| **Falla cerrada** | — |
| **Implemented (STUDIO-53, HU-SP-062)** | Migration `20261112090000_a_coach_proposes_a_correction_and_she_decides.sql`. **Studio:** `execution.list_proposed_corrections(person, organization, status, limit, cursor_expires_at, cursor_id)` behind `GET /studio/v1/organizations/{organizationId}/correction-proposals?status&limit&cursor`, `cookieAuth`, `private, no-store`. **Space:** `execution.list_my_correction_proposals(person, status, limit, cursor_expires_at, cursor_id)` behind `GET /space/v1/correction-proposals?status&limit&cursor`, `bearerAuth`, `no-store`. HU-SP-062 has no Jira task. **Not cacheable:** both answer `no-store`, against «cacheable para presentación». **Every state (deviation from «pendientes»):** both list `pending`, `accepted`, `rejected`, `expired` and `cancelled`, with an optional `status` filter. A pending proposal past `expires_at` reads and filters as `expired` before the sweep marks it. Cancelled ones stay, with `cancel_reason`. **Order and page:** soonest to expire first, keyset on `(expires_at, id)` with an opaque cursor; `limit` 1 to 100, default 25. **Studio:** any live member of an active organization (otherwise `42501` → `403`) sees only what they proposed there, through `correction_proposals_select_proposer`. A colleague's proposals never appear. `ProposedCorrection` has `client {person_id, name}`, `field`, `proposed`, `reason`, `status`, `cancel_reason`, `created_at`, `expires_at` and `settled_at`. It **never carries her value.** `target {execution_id, set_order}` appears only while the proposer still attends her and she shares `relationship_training` or `prior_training_history`; otherwise it is null and the proposal stays listed. A filter, page size or cursor outside the contract is `422`. **Space:** `CorrectionProposal` has `execution_id`, `set_order`, `movement_id`, `movement_name`, `field`, `current` (what she had declared), `proposed`, `reason`, the state and its instants, `proposer_name` and `organization_name`. A filter, page size or cursor outside the contract is `400`. Neither list records an `ACCESS_EVENT`. |
| **As implemented, Studio's reason (STUDIO-77, `HU-STUDIO-084` criterion 4)** | Migration `20261118100000_a_coach_opens_the_card_of_a_client.sql` recreates `execution.proposal_for_proposer` so that `cancel_reason` reads `session_unavailable` for both `session_hidden` and `session_annulled`: a session she hid from the organization simply does not exist for him, so he is never told it apart from one she annulled. The stored reason is unchanged, and Space (`execution.proposal_for_person`) still tells her which. `ProposedCorrection.cancel_reason` is `ProposedCorrectionCancelReason` (`target_changed`, `session_unavailable`, `relationship_terminated`, null). Tests: `T-EXE-PROPOSAL-CANCEL-LIST-03/04`, `T-EXE-PROPOSAL-API-09` |

#### `OP-EXE-021` — Leer el resumen de un entreno terminado

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/executions/{id}/summary?timezone=` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecución propia y terminada |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Cacheable en el dispositivo |
| **Información sensible** | Las propias de la ejecución, más el nombre y el usuario de la persona |
| **Evento de dominio** | Ninguno |
| **Reglas** | Responde duración, series de trabajo, ejercicios y kilos —sin calentamientos—, la lista de ejercicios con sus series, la portada de la rutina, el nombre y el usuario. **Récords, racha y número de entreno son derivados**, calculados al leer contra las ejecuciones anteriores terminadas y no anuladas, nunca guardados (`ADR-036`). Una ejecución ajena responde como inexistente, y una sin terminar se rechaza |
| **Falla cerrada** | Si no puede calcular un derivado, responde el resumen sin él, nunca uno inventado |

#### `OP-EXE-022` — Leer el mes de mi historial

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/history/months/{month}?timezone=` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecuciones propias terminadas y no anuladas |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Cacheable en el dispositivo |
| **Información sensible** | Agregados de entrenamiento propios |
| **Evento de dominio** | Ninguno |
| **Reglas** | El mes se cuenta en la zona horaria de la persona. Responde entrenos, tiempo, series de trabajo, kilos y récords del mes; por semana ISO contada entera, las terminadas, las planificadas y las planificadas cumplidas, cada una una vez; por cada día entrenado, sus sesiones, tiempo, series, kilos y récords; los meses con algún entreno, y las disciplinas presentes (`ADR-037`) |
| **Falla cerrada** | Un mes sin entrenos responde ceros, nunca un error |

#### `OP-EXE-023` — Leer el detalle de un entreno terminado

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/executions/{id}/detail?timezone=` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecución propia, terminada y no anulada |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Ejercicios por posición y series por orden |
| **Offline / concurrencia** | Responde la revisión que `OP-EXE-007` exige en `If-Match` |
| **Información sensible** | Entrenamiento propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cabecera con título, horario, duración, series, kilos sin calentamientos, récords y número de entreno; cada ejercicio con sus series, su mejor serie y si batió algo; la serie que batió todo lo anterior marcada; la última vez que se terminó la misma rutina, con la diferencia de kilos (`ADR-038`) |
| **Falla cerrada** | Ajena, inexistente, sin terminar o anulada responden lo mismo: no encontrada |

#### `OP-EXE-024` — Anticipar qué cambia si anulo un entreno

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/executions/{id}/invalidation-preview?timezone=` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecución propia, terminada y no anulada |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Sin conexión no se ofrece anular |
| **Información sensible** | Agregados de entrenamiento propios |
| **Evento de dominio** | Ninguno |
| **Reglas** | Los récords que tiene la sesión y la racha de hoy con ella y sin ella. La racha cuenta semanas seguidas hasta esta, o hasta la anterior mientras esta siga vacía |
| **Falla cerrada** | Lo que no se puede anular no se anticipa: no encontrada |

#### `OP-EXE-025` — Repetir un entreno terminado

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/executions/{id}/repetitions` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecución propia, terminada, no anulada y con sesión planificada |
| **Transacción** | Abrir otro intento de la misma sesión planificada con `OP-EXE-001` y reemplazar su lista de ejercicios por la de la sesión de origen, sin series |
| **Idempotencia** | `Idempotency-Key`; `Command-Id` es el id de la sesión nueva |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Con otra sesión abierta se rechaza con conflicto |
| **Información sensible** | Entrenamiento propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Es otro intento, no reemplaza al primero (`HU-SP-051`); la lista conserva orden, superseries y descanso (`ADR-038`) |
| **Falla cerrada** | Un entreno libre no tiene rutina que repetir: rechazo |

#### `OP-EXE-026` — Comparar mi entrenamiento por semana o por mes

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/progress/periods?timezone=&period=&count=&program=` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Ejecuciones propias terminadas y no anuladas; plan con `period_analysis` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Periodos del más reciente al más antiguo, hasta `count` |
| **Offline / concurrencia** | Cacheable en el dispositivo |
| **Información sensible** | Agregados de entrenamiento propios |
| **Evento de dominio** | Ninguno |
| **Reglas** | Por periodo: entrenos, tiempo, series de trabajo, volumen, cumplimiento del plan, series por músculo primario y volumen por día; por movimiento, su mejor carga contra el periodo anterior en que se entrenó. Los calentamientos nunca cuentan y lo que no se pesó no es cero. `program` lee un programa, `free` o todo |
| **Falla cerrada** | Sin `period_analysis` responde que la función es de Pro |

#### `OP-EXE-027` — Dejar en espera un historial exportado de otra app

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/history-imports` |
| **Actor** | `A2` |
| **Filtros obligatorios** | La persona autenticada; fuente con lector registrado (`hevy_csv`) |
| **Transacción** | Leer el archivo en la API, sin guardarlo, y dejar las sesiones leídas en la zona de espera de la persona, marcando las que ya existen por su huella |
| **Idempotencia** | `Idempotency-Key`; `Command-Id` es el id de la importación. El mismo contenido devuelve la importación viva que ya existe |
| **Paginación y orden** | Sesiones por inicio; ejercicios distintos por nombre de origen |
| **Offline / concurrencia** | Requiere conexión. Más de 4.000.000 de caracteres se rechaza |
| **Información sensible** | Entrenamiento propio; el archivo no se conserva |
| **Evento de dominio** | Ninguno |
| **Reglas** | Responde una vista previa: entrenos, series, rango de fechas, duplicados, avisos por fila y cada ejercicio con su resolución (elección previa, tabla global, sugerencia o sin movimiento). Una importación no confirmada en 7 días expira (`ADR-044`) |
| **Falla cerrada** | Una cabecera o una fecha que el lector no reconoce rechaza el archivo con el motivo y la fila; nada queda en espera |

#### `OP-EXE-028` — Confirmar una importación de historial

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/history-imports/{id}/commit` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Importación propia en espera y no expirada |
| **Transacción** | Por llamada, una tanda de a lo sumo 25 sesiones en espera, de la más antigua a la más reciente: crear cerradas las que no estén duplicadas, con sus ejercicios y series, y sacarlas de la zona de espera; cada tanda es todo o nada. La primera guarda las elecciones de la persona y fija la zona y la resolución de cada nombre |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Requiere conexión. La importación queda `committing` y responde cuántas sesiones faltan; la app repite la llamada con una clave nueva hasta `committed`, y continúa una importación a medias al reabrirla. Las llamadas de una misma importación se serializan |
| **Información sensible** | Entrenamiento propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cada sesión entra `completed` y `valid`, autónoma, con `capture_source = 'import'` y procedencia `person_declared`, en la zona horaria elegida. Un ejercicio sin movimiento conserva su nombre de origen. Lo importado cuenta para récords, racha y número. Una llamada que continúa no lee elecciones. Por tandas y no en el worker, para que cada escritura sea un comando de la persona (`ADR-044`) |
| **Falla cerrada** | Ajena o inexistente: no encontrada. Confirmada, deshecha, expirada, o una continuación en otra zona horaria: rechazo sin efecto |

#### `OP-EXE-029` — Deshacer una importación de historial

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/history-imports/{id}/undo` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Importación propia en espera, a medias o confirmada |
| **Transacción** | Anular todas las sesiones que la importación ya trajo con el motivo `import_undone`, liberar sus huellas y vaciar la zona de espera, también si quedó a medias |
| **Idempotencia** | `Idempotency-Key` |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Deshacer lo ya deshecho no cambia nada |
| **Información sensible** | Entrenamiento propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Anular sigue `ADR-038`. Después, el mismo historial se puede volver a importar |
| **Falla cerrada** | Ajena o inexistente: no encontrada |

#### `OP-EXE-030` — Listar y consultar mis importaciones de historial

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/history-imports` y `GET /space/v1/history-imports/{id}` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Importaciones propias |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | De la más reciente a la más antigua |
| **Offline / concurrencia** | N/A |
| **Información sensible** | Entrenamiento propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cada importación con su fuente, estado, fechas y conteos; el detalle de una importación en espera devuelve su vista previa |
| **Falla cerrada** | Ajena o inexistente: no encontrada |

### 7.11 Pagos y planes

Dueño de `payments.gateway_connections`, `payments.organization_plans`, `payments.plan_versions`, `payments.plan_subscriptions`, `payments.payment_records` y `payments.subscription_events`.

Reglas que gobiernan todo el dominio:

- **Allfit refleja el estado del pago; no lo procesa.** La plata va directo a la cuenta de pasarela de la organización. Allfit no recibe, no gira, no concilia y no retiene.
- **Nunca se almacena un dato de tarjeta.** Solo la referencia opaca del proveedor.
- **La falta de pago suspende de forma indefinida y no termina nada.** Ninguna transición automática puede tocar grants, desacoplar asignaciones ni terminar relaciones.
- Suscripción y relación de servicio son **vínculos distintos** con ciclos independientes.
- Un `coach` **no** lee el estado de pago de su cliente. Un `staff` tampoco.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-PAY-001` | Conectar la pasarela de la organización | Comando | `A5` |
| `OP-PAY-002` | Crear un plan | Comando | `A4`, `A5` |
| `OP-PAY-003` | Editar el borrador de un plan | Comando | `A4`, `A5` |
| `OP-PAY-004` | Publicar una versión de plan | Comando | `A4`, `A5` |
| `OP-PAY-005` | Deprecar una versión de plan | Comando | `A4`, `A5` |
| `OP-PAY-006` | Listar los planes de la organización | Consulta | `A3`–`A6` |
| `OP-PAY-007` | Consultar las suscripciones de la organización | Consulta | `A4`, `A5` |
| `OP-PAY-008` | Suspender manualmente una suscripción | Comando | `A4`, `A5` |
| `OP-PAY-009` | Reactivar manualmente una suscripción | Comando | `A4`, `A5` |
| `OP-PAY-010` | Terminar una suscripción desde la organización | Comando | `A4`, `A5` |
| `OP-PAY-011` | Consultar los planes que ofrece una organización | Consulta | `A2` |
| `OP-PAY-012` | Suscribirme a un plan | Comando | `A2` |
| `OP-PAY-013` | Consultar mi suscripción | Consulta | `A2` |
| `OP-PAY-014` | Consultar mi historial de pagos | Consulta | `A2` |
| `OP-PAY-015` | Cancelar mi suscripción | Comando | `A2` |
| `OP-PAY-016` | Registrar el resultado de un cobro | Comando | `A9` |
| `OP-PAY-017` | Publicar una versión de plan de plataforma | Comando | `A11` |
| `OP-PAY-018` | Consultar los planes de Allfit | Consulta | `A2` |
| `OP-PAY-019` | Suscribirme a Allfit Pro | Comando | `A2` |
| `OP-PAY-020` | Consultar mi Pro y de dónde viene | Consulta | `A2` |
| `NEW-PAY-PRO-PAYMENTS` | Consultar mis pagos de Pro | Consulta | `A2` |
| `OP-PAY-021` | Cancelar mi Pro | Acción en la tienda | `A2` |
| `OP-PAY-022` | Habilitar o revocar el Pro de una organización — obsoleta (`ADR-043`) | — | — |
| `OP-PAY-023` | Registrar el resultado de un cobro de plataforma | Comando | `A9` |
| `OP-PAY-024` | Crear un plan de plataforma | Comando | `A11` |
| `OP-PAY-025` | Proponer una versión de plan de plataforma | Comando | `A11` |
| `OP-PAY-026` | Retirar una propuesta de versión de plan de plataforma | Comando | `A11` |

---

#### `OP-PAY-001` — Conectar la pasarela de la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/payment-gateway` |
| **Actor** | `A5` con `manage_billing`. **Ni `admin`, ni `coach`, ni `staff`** |
| **Filtros obligatorios** | Membresía `owner` vigente; proveedor del catálogo cerrado; la organización no tiene otra conexión activa |
| **Transacción** | Crear `gateway_connections` guardando la **referencia** al secreto, nunca el secreto |
| **Idempotencia** | `Idempotency-Key`. Reconectar el mismo proveedor converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | `restricted`. Ninguna categoría personal |
| **Evento de dominio** | `payments.gateway_connected.v1` |
| **Reglas** | La cuenta es **de la organización**: la plata va de la persona al gimnasio sin tocar a Allfit. Allfit no queda como intermediario financiero. Un secreto en claro nunca entra a la base de datos |
| **Falla cerrada** | Sin `manage_billing`, proveedor desconocido o conexión activa existente: rechazo |

#### `OP-PAY-002` — Crear un plan · `OP-PAY-003` — Editar su borrador

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/plans` · `PUT .../plans/{id}/draft` |
| **Actor** | `A4`, `A5` con `manage_billing` |
| **Filtros obligatorios** | Membresía vigente con capacidad; nombre único dentro de la organización |
| **Transacción** | Crear `organization_plans` con identidad estable, o reemplazar el contenido del borrador |
| **Idempotencia** | `Idempotency-Key`. `PUT` sin cambios no genera revisión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; versión optimista |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `payments.plan_created.v1` |
| **Reglas** | El plan tiene identidad antes de tener precio: el precio vive en la versión. Un borrador **nunca** es suscribible |
| **Falla cerrada** | Nombre repetido en la organización: rechazo |

#### `OP-PAY-004` — Publicar una versión de plan

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/plans/{id}/versions` |
| **Actor** | `A4`, `A5` con `manage_billing` |
| **Filtros obligatorios** | Borrador completo: monto positivo, moneda ISO 4217 y periodo `month` o `year` |
| **Transacción** | Crear `plan_versions` inmutable con numeración monotónica |
| **Idempotencia** | `Idempotency-Key`. Publicar dos veces el mismo contenido devuelve la primera versión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada; numeración serializada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `payments.plan_version_published.v1` |
| **Reglas** | Una versión publicada **no se edita jamás**. Subir el precio exige publicar otra versión, y **las suscripciones vigentes conservan la versión que congelaron**: a nadie se le sube el precio por debajo |
| **Falla cerrada** | Monto no positivo, moneda inválida o periodo fuera de `month`/`year`: rechazo |

#### `OP-PAY-005` — Deprecar una versión de plan

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/plans/{id}/versions/{v}/deprecation` |
| **Actor** | `A4`, `A5` con `manage_billing` |
| **Filtros obligatorios** | Versión publicada de la organización |
| **Transacción** | Marcar la versión como deprecada |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | `payments.plan_version_deprecated.v1` |
| **Reglas** | Deprecar impide **suscripciones nuevas**. **No** cancela, no suspende y no cambia de versión a nadie que ya esté suscrito |
| **Falla cerrada** | — |

#### `OP-PAY-006` — Listar los planes de la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/plans` |
| **Actor** | `A3`–`A6` con membresía vigente |
| **Filtros obligatorios** | Planes de `{orgId}` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: estado y nombre |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | Distingue borradores de versiones publicadas. Una organización nunca ve los planes de otra |
| **Falla cerrada** | — |

#### `OP-PAY-007` — Consultar las suscripciones de la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/subscriptions` |
| **Actor** | `A4`, `A5` con `manage_billing` |
| **Filtros obligatorios** | Suscripciones de `{orgId}` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: estado y fecha de inicio descendente |
| **Offline / concurrencia** | Nunca cacheable para decidir suspensión |
| **Información sensible** | Identidad de la persona y **estado de pago**. Ningún dato fitness |
| **Evento de dominio** | Ninguno |
| **Reglas** | **Un `coach` no accede a esta operación** aunque tenga a esa persona asignada: el estado de pago no es un dato de entrenamiento. `staff` tampoco |
| **Falla cerrada** | Sin `manage_billing`, misma respuesta que "no existe" |
| **Implemented (2026-10-12, STUDIO-71)** | `payments.list_organization_subscriptions(actor, organization, status, limit, cursor_status, cursor_started_at, cursor_subscription_id)`, migration `20261012140000_a_subscription_has_a_life.sql`; `GET /studio/v1/organizations/{organizationId}/subscriptions`, `cookieAuth`. Without `manage_billing` (held by `owner` and `admin`, not by `coach` or `staff`) it answers `P0002` → `404`, as if the list did not exist. Statuses `active`, `suspended` and `ended`, with an optional `status` filter; keyset on (`status desc`, `started_at desc`, `id desc`), page cap 101. It returns name, plan, amount, period, status and dates, and no fitness data. Tests: `T-PAY-LIFECYCLE-01` (owner, coach and staff), the Studio payments handler tests |

#### `OP-PAY-008` — Suspender manualmente · `OP-PAY-009` — Reactivar manualmente

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/subscriptions/{id}/suspension` · `/reactivation` |
| **Actor** | `A4`, `A5` con `manage_billing` |
| **Filtros obligatorios** | Suscripción de `{orgId}` y estado compatible. Para reactivar: sigue suspendida, no está terminada y existe el bloqueo abierto exacto `source_kind='subscription_suspension' AND subscription_id={id}` |
| **Transacción** | Bajo lock de la suscripción y del bloqueo causal: suspender cambia el estado y abre de forma idempotente `planning.service_access_blocks`; reactivar cambia a `active` y cierra **solo** ese bloqueo. Registrar `subscription_events` con el actor humano y encolar la notificación, sin escribir grants, relación, membresía, asignación ni estado intrínseco de sesiones |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Serializa con terminación, revocación, cambio de asignación y apertura/cierre de otros bloqueos. Un estado leído antes de una transición concurrente no autoriza restaurarlo: conflicto y reintento desde estado fresco |
| **Información sensible** | Estado de pago |
| **Evento de dominio** | `payments.subscription_suspended.v1` · `payments.subscription_reactivated.v1` |
| **Reglas** | Suspender **no toca los grants, no desacopla la asignación y no termina la relación**; lo garantiza `IX-40`. El bloqueo hace inefectiva la escritura profesional y proyecta como pausadas las sesiones futuras administradas. Reactivar es sustractivo: quita una causa y recalcula desde el estado vigente; no revive grants revocados, relaciones terminadas, membresías/asignaciones cambiadas ni sesiones canceladas, iniciadas o pasadas. No exige aceptación nueva solo si el grant actual sigue vigente. Otro bloqueo abierto sigue denegando |
| **Falla cerrada** | Suscripción terminada, bloqueo ausente o de otra fuente, o intento de restaurar/escribir grants, relación, membresía, asignación o sesiones: rechazo y rollback completo |
| **Implemented (2026-10-12, STUDIO-72)** | `payments.suspend_subscription(actor, organization, subscription, idempotency_key, command_id, request_hash)` and `payments.reactivate_subscription(...)`, same arguments, migration `20261012140000_a_subscription_has_a_life.sql`; `POST …/subscriptions/{subscriptionId}/suspension` and `…/reactivation`, without a body, with the path in the request hash. Suspending writes the status and one open `planning.service_access_blocks` row (`subscription_suspension`, both effects) and nothing else. Reactivating closes only that row and never reopens it. **The effects are enforced since `20261105101100_a_paused_plan_holds_the_gyms_program.sql`:** a block that `blocks_professional_contribution` makes `can_access(…, 'contribute')` refuse, with `AF424` from `planning.require_training_grant` (assigning, moving, adjusting and cancelling), while reading continues; a block that `blocks_future_sessions` holds the sessions of a program the gym assigned, and her own program starts as always. A gym's own suspension keeps holding after the subscription is reactivated. Tests: `T-PAY-LIFECYCLE-01`, `T-PLN-SUSPEND-01`, `T-PLN-SUSPEND-02` |

#### `OP-PAY-010` — Terminar una suscripción desde la organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/subscriptions/{id}/termination` |
| **Actor** | `A4`, `A5` con `manage_billing` |
| **Filtros obligatorios** | Suscripción viva de `{orgId}` |
| **Transacción** | Cerrar la suscripción declarando el actor humano y registrar el evento |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Estado de pago |
| **Evento de dominio** | `payments.subscription_ended.v1` |
| **Reglas** | **Terminar la suscripción no termina la relación de servicio.** Son vínculos distintos: para terminar la relación existe `OP-REL-008`, con sus propios efectos. Ningún proceso automático puede ejecutar esta operación: la tabla exige un actor humano declarado |
| **Falla cerrada** | Suscripción ya terminada: converge sin efecto |
| **Implemented (2026-10-12, STUDIO-73)** | `payments.end_subscription(actor, organization, subscription, idempotency_key, command_id, request_hash)`, migration `20261012140000_a_subscription_has_a_life.sql`; `POST …/subscriptions/{subscriptionId}/termination`. It closes the subscription's open block, so nothing is left blocking a bond that no longer exists, and records `ended_by_membership_id`. The relationship is untouched. A check on `payments.plan_subscriptions` allows `ended` only with `ended_by_kind` `person` or `professional`, so no worker or automatic process can end one, and nothing turns a suspension into an ending. Tests: `T-PAY-LIFECYCLE-01` |

#### `OP-PAY-011` — Consultar los planes que ofrece una organización

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/organizations/{orgId}/plans` |
| **Actor** | `A2` con relación vigente en esa organización |
| **Filtros obligatorios** | Solo versiones **publicadas y no deprecadas**; la persona tiene relación con `{orgId}` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: monto ascendente |
| **Offline / concurrencia** | Cacheable para presentación; nunca para suscribirse |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | No es un catálogo público ni un marketplace: solo lo ve quien ya tiene relación con esa organización. Descubrir gimnasios sigue diferido |
| **Falla cerrada** | Sin relación con `{orgId}`, misma respuesta que "no existe" |

#### `OP-PAY-012` — Suscribirme a un plan

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/subscriptions` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Versión publicada y no deprecada; relación vigente con la organización; la organización tiene pasarela activa; la persona no tiene otra suscripción viva con esa organización |
| **Transacción** | Crear `plan_subscriptions` **congelando la versión exacta**, registrar el evento y devolver el contexto para completar el pago en la pasarela de la organización |
| **Idempotencia** | `Idempotency-Key`. Un reintento no crea dos suscripciones |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. **Jamás se confirma desde caché** |
| **Información sensible** | Vínculo comercial. Ningún dato de tarjeta pasa por Allfit |
| **Evento de dominio** | `payments.subscription_started.v1` |
| **Reglas** | Los datos de tarjeta se entregan **directamente a la pasarela de la organización**; Allfit nunca los ve ni los almacena. Suscribirse **no concede ningún acceso a datos**: los scopes solo se deciden al aceptar una relación nueva. Suscribirse tampoco crea la relación de servicio |
| **Falla cerrada** | Sin pasarela activa en la organización: rechazo explícito, porque no habría a dónde cobrar |

#### `OP-PAY-013` — Consultar mi suscripción · `OP-PAY-014` — Mi historial de pagos

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/subscriptions` · `GET /space/v1/subscriptions/{id}/payments` |
| **Actor** | `A2` |
| **Filtros obligatorios** | `person_id = access_control.person()` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: fecha del cobro descendente |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Estado de pago propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | La persona ve su estado, la versión de plan que congeló, el próximo corte y cada cobro con su resultado. **Nunca** se le devuelve un dato de tarjeta, porque no existe |
| **Falla cerrada** | — |

#### `OP-PAY-015` — Cancelar mi suscripción

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/subscriptions/{id}/cancellation` |
| **Actor** | `A2`, titular de la suscripción |
| **Filtros obligatorios** | Suscripción propia y viva |
| **Transacción** | Cerrar la suscripción declarando a la persona como actor y registrar el evento |
| **Idempotencia** | `Idempotency-Key`; converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada |
| **Información sensible** | Estado de pago propio |
| **Evento de dominio** | `payments.subscription_ended.v1` |
| **Reglas** | Cancelar el pago **no termina la relación** ni revoca ningún permiso: si la persona quiere cortar el acceso a sus datos, eso es `OP-PRV-005` o `OP-REL-007`, y son decisiones separadas a propósito. Su Fitness ID y su historial no se tocan |
| **Falla cerrada** | — |

#### `OP-PAY-016` — Registrar el resultado de un cobro

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` — consumidor del webhook de la pasarela |
| **Actor** | `A9` con credencial propia |
| **Filtros obligatorios** | Firma del proveedor verificada; la organización tiene conexión activa; la suscripción existe y pertenece a esa organización |
| **Transacción** | Bajo lock de la suscripción y su bloqueo causal, insertar `payment_records` y, si corresponde, transicionar entre `active` y `suspended`: el fallo abre idempotentemente el bloqueo exacto y el pago exitoso cierra solo ese bloqueo. Registrar el evento sin escribir el estado protegido de otros dominios |
| **Idempotencia** | `UNIQUE (organization_id, external_payment_ref)`: **el reenvío del webhook no duplica nada por construcción**, no por convención |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Dos entregas concurrentes del mismo cobro producen una sola fila. Terminación, revocación, cambios de asignación y otros bloqueos se serializan o fuerzan reintento; nunca se restaura un estado leído antes del lock |
| **Información sensible** | Estado de pago; **ningún dato de tarjeta** |
| **Evento de dominio** | `payments.payment_recorded.v1`, más la transición si ocurre |
| **Reglas** | Un cobro fallido lleva la suscripción a `suspended` y **ahí se queda, de forma indefinida**. Este worker **no puede terminar nada**: la tabla exige actor humano para `ended` y él no lo tiene. Tampoco puede tocar grants, relaciones, membresías, asignaciones o sesiones (`IX-40`). Un pago posterior solo elimina el bloqueo de esa suscripción y recalcula acceso/agenda con el estado vigente; no revive estado obsoleto ni cierra otros bloqueos |
| **Falla cerrada** | Firma inválida, organización sin conexión activa o suscripción ajena: se descarta y se registra el intento |

#### `OP-PAY-017` — Publicar una versión de plan de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/platform-plans/{planId}/versions/{versionId}/publication`, sin cuerpo; la versión se propone antes con `OP-PAY-025` y la lectura es `GET /backoffice/v1/platform-plans` (`NEW-PAY-PLATFORM-PLAN`) |
| **Actor** | `A11` con rol base, `manage_platform_commercial`, AAL2 y deber vigente, **distinto de quien propuso la versión** (`HU-BO-025`, criterio 5) |
| **Filtros obligatorios** | La versión es la propuesta abierta del plan |
| **Transacción** | `payments.publish_platform_plan_version`: retira (`deprecated`) la versión en vigor, publica la propuesta con su autor y la asignación de deber, y publica el plan si era su primera versión |
| **Idempotencia** | `Idempotency-Key` + `Command-Id` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Una propuesta abierta por plan (índice parcial), así que la versión contra la que se revisó sigue en vigor al publicar. Publicar la propia propuesta responde `403`; una que ya no está abierta, `409` |
| **Información sensible** | Ninguna categoría personal: no escribe `access_events` |
| **Evento de dominio** | `payments.platform_plan_version_published.v1`; `payments.platform_plan_published.v1` la primera vez |
| **Reglas** | Una versión publicada no se edita jamás y **quien ya está suscrito conserva la suya**. Ninguna función de privacidad, consentimiento, portabilidad o supresión puede limitarse: el catálogo no las contiene y la publicación las rechaza |
| **Falla cerrada** | Función desconocida o límite negativo: rechazo |

#### `OP-PAY-018` — Consultar los planes de Allfit

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/pro/plans` → `payments.list_pro_plans` |
| **Actor** | `A2`, la propia persona |
| **Filtros obligatorios** | Solo la versión publicada de cada plan |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica: el catálogo es pequeño y cerrado. El gratuito primero |
| **Offline / concurrencia** | Cacheable con validación |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve **qué incluye cada plan con su límite exacto** y los productos de tienda con que se vende cada versión. El precio que se muestra es el localizado que da la tienda (`ADR-043`) |
| **Falla cerrada** | — |

#### `OP-PAY-019` — Suscribirme a Allfit Pro

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/pro/purchases` → `payments.record_store_subscription` |
| **Actor** | `A2`, la propia persona |
| **Filtros obligatorios** | La API verificó la compra con la tienda; el token de cuenta de la compra es la persona; el producto vende una versión de pago |
| **Transacción** | Crear `platform_subscriptions` congelando la versión del producto, con su evento y su cobro; reemplaza la suscripción viva anterior |
| **Idempotencia** | `Idempotency-Key` + `Command-Id`. Volver a presentar la misma compra (restaurar) no crea otra |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Serializada por persona; una referencia de tienda pertenece a una sola persona |
| **Información sensible** | Vínculo comercial propio; ningún dato de tarjeta |
| **Evento de dominio** | `payments.platform_subscription_started.v1` |
| **Reglas** | La tienda cobra y Allfit recibe el ingreso. Suscribirse **no concede ningún acceso a datos de nadie** ni cambia permisos |
| **Falla cerrada** | Compra no verificada, de otra cuenta o de un producto que Allfit no vende: rechazo, sin Pro |

#### `OP-PAY-020` — Consultar mi Pro y de dónde viene

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/pro` → `payments.read_my_pro` |
| **Actor** | `A2`, la propia persona |
| **Filtros obligatorios** | `person_id = access_control.person()` |
| **Transacción** | Ninguna. Resuelve el derecho **en la consulta** (`payments.resolve_pro`), nunca desde una bandera almacenada |
| **Idempotencia** | N/A |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cacheable para presentación; **nunca** para decidir si una función está habilitada |
| **Información sensible** | Estado comercial propio |
| **Evento de dominio** | Ninguno |
| **Reglas** | Suscripción propia viva → su versión congelada; si no, relación `active` con una organización `active` → la versión vigente del plan `pro`; si no, el gratuito vigente. Devuelve **todas las vías vigentes**, con el gimnasio por nombre, y el límite de cada función |
| **Falla cerrada** | Ante cualquier duda se resuelve como plan gratuito, nunca al revés |

#### `NEW-PAY-PRO-PAYMENTS` — Consultar mis pagos de Pro

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/pro/payments` → `payments.list_my_pro_payments` |
| **Actor** | `A2`, la propia persona |
| **Filtros obligatorios** | `person_id = access_control.person()` |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Los 60 más recientes, del último al primero |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Estado comercial propio; **ningún dato de tarjeta** |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cada cobro que reportó la tienda, con su resultado. Los recibos y el medio de pago siguen en la cuenta de la tienda |
| **Falla cerrada** | — |

#### `OP-PAY-021` — Cancelar mi Pro

| Campo | Valor |
| --- | --- |
| **Tipo** | Acción en la tienda |
| **Superficie** | Sin ruta propia: Space abre la gestión de suscripciones de la tienda donde se pagó |
| **Actor** | La persona, en la tienda |
| **Filtros obligatorios** | — |
| **Transacción** | La cancelación llega por `OP-PAY-023`: `auto_renews = false` y, al final del periodo pagado, `ended` |
| **Idempotencia** | La de `OP-PAY-023` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | — |
| **Información sensible** | Estado comercial propio |
| **Evento de dominio** | `payments.platform_subscription_ended.v1` al vencer |
| **Reglas** | Apple y Google no permiten cancelar desde la app (`ADR-043`). Cancelar **no borra ni un solo dato**, y quien tiene una relación vigente con un gimnasio activo **conserva Pro por esa vía** |
| **Falla cerrada** | — |

#### `OP-PAY-022` — Habilitar o revocar el Pro de una organización — obsoleta

Sustituida por `ADR-043`: todo gimnasio activo da Pro a sus invitados con relación vigente,
y eso se resuelve al leer. `organization_premium_entitlements` no se crea.

#### `OP-PAY-023` — Aplicar lo que dice una notificación de la tienda

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /webhooks/app-store` · `POST /webhooks/google-play` → `payments.apply_store_notification` |
| **Actor** | `A9` (`worker`) |
| **Filtros obligatorios** | La API verificó la firma de Apple o el token OIDC de Pub/Sub y releyó el estado en la tienda |
| **Transacción** | Mover la suscripción entre `active`, `grace`, `suspended` y `ended`, registrar su evento y el cobro reportado |
| **Idempotencia** | `store_notification_receipts (store, notification_id)` con el hash del contenido; el mismo id con otro contenido se rechaza |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Una notificación más vieja que la última aplicada es `stale` y no cambia nada |
| **Información sensible** | Estado comercial; **ningún dato de tarjeta ni el contenido de la notificación** |
| **Evento de dominio** | `payments.platform_subscription_suspended.v1` · `.reactivated.v1` · `.ended.v1` |
| **Reglas** | Bajar a gratis **nunca elimina datos**. Un cambio de producto termina la suscripción (`replaced`) y abre otra con la nueva versión |
| **Falla cerrada** | Firma inválida: no llega a la base. Suscripción que nadie registró: se guarda como `ignored` |

#### `OP-PAY-024` — Crear un plan de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/platform-plans` |
| **Actor** | `A11` con rol base, `manage_platform_commercial`, AAL2 y deber vigente |
| **Filtros obligatorios** | Código estable (`^[a-z][a-z0-9_]{1,39}$`), nombre y tipo `free` o `paid` |
| **Transacción** | `payments.create_platform_plan`: el plan nace `draft`, sin nada en vigor, con su autor y asignación de deber |
| **Idempotencia** | `Idempotency-Key` + `Command-Id` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Un código tomado o un segundo plan gratuito responden `409` |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | `HU-BO-025`, criterio 2. Hay **un solo plan gratuito**, siempre: sus límites cambian publicando versiones suyas, no reemplazándolo. Es más estricto que «un plan gratuito publicado» y hace innecesaria esa regla |
| **Falla cerrada** | — |

#### `OP-PAY-025` — Proponer una versión de plan de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/platform-plans/{planId}/versions` |
| **Actor** | Igual que `OP-PAY-024` |
| **Filtros obligatorios** | Plan de pago: monto positivo en unidades menores, moneda ISO 4217 y periodo `month` o `year`. Plan gratuito: monto cero, sin moneda ni periodo (`IX-41`). Cada función del catálogo aparece exactamente una vez; ninguna fuera de él; una excluida no lleva límite; un límite es entero y no negativo |
| **Transacción** | `payments.propose_platform_plan_version`: crea la versión `draft` con el siguiente número (nunca reutilizado), sus `platform_plan_features` y la versión que reemplazaría; rechaza la propuesta si no cambia nada frente a la versión en vigor |
| **Idempotencia** | `Idempotency-Key` + `Command-Id` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Una propuesta abierta por plan: una segunda responde `409`, y también una que no cambia nada |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno: la versión no está en vigor hasta `OP-PAY-017` |
| **Reglas** | `HU-BO-025` criterios 1 y 3, `HU-BO-026` criterios 1 a 4. La lectura devuelve con la propuesta qué cambia —precio, moneda, periodo y el estado de cada función— frente a la versión en vigor, para que quien revisa lea una diferencia y no dos versiones |
| **Falla cerrada** | Función desconocida, omitida o repetida, o forma de precio inválida: `422` |

#### `OP-PAY-026` — Retirar una propuesta de versión de plan de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/platform-plans/{planId}/versions/{versionId}/withdrawal`, sin cuerpo |
| **Actor** | Igual que `OP-PAY-024`: quien la propuso o quien la revisa |
| **Filtros obligatorios** | La versión es la propuesta abierta del plan |
| **Transacción** | `payments.withdraw_platform_plan_version`: la propuesta pasa a `archived` con quién la retiró y su asignación de deber |
| **Idempotencia** | `Idempotency-Key` + `Command-Id` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Una propuesta que ya no está abierta responde `409` |
| **Información sensible** | Ninguna categoría personal |
| **Evento de dominio** | Ninguno |
| **Reglas** | Quien propuso y cambió de idea y quien revisa y no está de acuerdo terminan igual. La propuesta retirada queda en el historial y nunca se publica |
| **Falla cerrada** | — |

### 7.8 Procesos de sistema

Operaciones de plataforma. Los comandos sin actor humano se ejecutan con credencial propia y **grants mínimos**: ningún worker usa un rol universal ni hereda los permisos de un usuario. Las consultas públicas de configuración no aceptan identidad ni datos de dominio.

Regla que gobierna todo el dominio: un worker es **idempotente y auditable**. Reejecutarlo converge al mismo estado y deja evidencia de lo que hizo. Una consulta pública falla cerrada y devuelve solo configuración no sensible.

| ID | Operación | Disparador |
| --- | --- | --- |
| `OP-SYS-001` | Despachar el outbox | Continuo |
| `OP-SYS-002` | Entregar notificaciones | Evento del outbox |
| `OP-SYS-003` | Expirar invitaciones vencidas | Programado |
| `OP-SYS-004` | Expirar propuestas de corrección | Programado |
| `OP-SYS-005` | Expirar suplencias vencidas | Programado |
| `OP-SYS-006` | Recordar la revisión anual de grants | Programado |
| `OP-SYS-007` | Ejecutar disposición por vencimiento de retención | Programado |
| `OP-SYS-008` | Resolver una solicitud de supresión | Evento + programado |
| `OP-SYS-009` | Reaplicar disposiciones tras una restauración | Manual + evento |
| `OP-SYS-010` | Recalcular derivados invalidados | Evento |
| `OP-SYS-011` | Consultar configuración pública de telemetría | Solicitud cliente |

---

#### `OP-SYS-001` — Despachar el outbox

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | Eventos no despachados, en orden por agregado |
| **Transacción** | Marcar el evento como despachado tras la confirmación del consumidor |
| **Idempotencia** | Entrega *at-least-once*. Los consumidores deduplican por identificador de evento |
| **Paginación y orden** | Lotes acotados; orden preservado **dentro** de cada agregado, no globalmente |
| **Offline / concurrencia** | Varios despachadores concurrentes no entregan dos veces el mismo evento al mismo consumidor: el lote se reclama con lock |
| **Información sensible** | Ninguna: los eventos transportan identificadores, nunca contenido sensible |
| **Evento de dominio** | Ninguno |
| **Reglas** | Nunca publica antes del commit. Un evento que falla repetidamente va a DLQ **de su dominio**, sin bloquear los demás |
| **Falla cerrada** | Si el outbox está caído, los comandos siguen funcionando: el evento queda pendiente y se entrega después |

#### `OP-SYS-002` — Entregar notificaciones

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | Destinatario con contacto verificado y preferencia vigente para ese canal |
| **Transacción** | Registrar el intento y su resultado |
| **Idempotencia** | Clave derivada de `(evento, destinatario, canal)`: un reintento no envía dos veces |
| **Paginación y orden** | Lotes acotados por proveedor |
| **Offline / concurrencia** | Cada proveedor —email, SMS, push— tiene su **propio** circuit breaker, timeout, cola y DLQ |
| **Información sensible** | El contenido del mensaje es minimizado: notifica el hecho, no el dato |
| **Evento de dominio** | Ninguno |
| **Reglas** | Un proveedor degradado no bloquea a los otros ni consume el presupuesto de requests síncronos. Una notificación nunca contiene resultados, medidas ni contexto de salud: enlaza a la aplicación, donde se vuelve a autorizar |
| **Falla cerrada** | Un fallo de entrega **no** revierte la operación de negocio que lo originó, salvo en `OP-REL-003`, donde la notificación es parte de la transacción |

#### `OP-SYS-003` — Expirar invitaciones vencidas

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | Invitaciones pendientes con vencimiento cumplido |
| **Transacción** | Marcar la invitación y sus intenciones pendientes como vencidas |
| **Idempotencia** | Clave `expire_invitations:<id>`; converge |
| **Paginación y orden** | Lotes por vencimiento ascendente |
| **Offline / concurrencia** | Una aceptación concurrente gana: si la persona acepta mientras corre el job, la materialización se conserva |
| **Información sensible** | Ninguna |
| **Evento de dominio** | `identity.invitation_expired.v1` |
| **Reglas** | Vencer conserva la evidencia. Una intención ya aceptada nunca se revierte por vencimiento del sobre |
| **Falla cerrada** | — |

#### `OP-SYS-004` — Expirar propuestas de corrección

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | Propuestas pendientes con 30 días cumplidos |
| **Transacción** | Marcar como vencidas |
| **Idempotencia** | Clave por propuesta; converge |
| **Paginación y orden** | Lotes |
| **Offline / concurrencia** | Una decisión concurrente de la persona gana |
| **Información sensible** | Ninguna adicional |
| **Evento de dominio** | `execution.correction_expired.v1` |
| **Reglas** | Vencer no aplica el cambio propuesto. El silencio **nunca** equivale a aceptación |
| **Falla cerrada** | — |
| **Implemented** | `execution.expire_correction_proposals(limit)` (default 100, 1 to 1000) returning the number expired, migration `20261112090000_a_coach_proposes_a_correction_and_she_decides.sql`. The worker runs it as the `worker` actor with a batch of 200 in `correction_proposal_expiry`, the last job of the minute `/cron/outbox`; any other actor is `42501`. **Transaction:** it takes due `pending` proposals in `(expires_at, id)` order `for update skip locked`, marks each `expired` with `settled_at`, applies nothing, and enqueues `execution.correction_expired.v1` with ids only. `correction_proposals_select_worker` and `_update_worker` let it see only what is due and write only `expired`. **Idempotency:** an expired proposal is no longer pending, so the next run takes the rest and converges. **Concurrency:** a decision she is making holds the proposal's lock and is skipped, so a decision made before the deadline wins. After the deadline her decision already refuses it, so the sweep only records what the clock decided. **Late sweep (documented deviation):** the sweep can run up to a minute late. In that minute, a proposal past its thirty days but not yet swept still holds the unique pending slot, so a new proposal on that field answers `409` until the sweep marks it. Her decision and both lists already read it as expired. The Backoffice diagnosis names the job «Vencimiento de propuestas de corrección». Tests: `T-EXE-PROPOSAL-SYS-01..08`, `-SYS-RLS-01..03`, `correction-proposal-expiry.test.ts`. |

#### `OP-SYS-005` — Expirar suplencias vencidas

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | Suplencias activas cuya fecha de fin ya pasó |
| **Transacción** | Cerrar la vigencia y registrar el evento |
| **Idempotencia** | Clave por suplencia; converge |
| **Paginación y orden** | Lotes |
| **Offline / concurrencia** | La caducidad es por **tiempo**: la autorización se evalúa contra la vigencia en cada request, de modo que un retraso del job nunca extiende el acceso |
| **Información sensible** | Retira un actor autorizado |
| **Evento de dominio** | `relationship.substitution_expired.v1` |
| **Reglas** | Este job **limpia estado**; no es el mecanismo de seguridad. La fórmula de acceso ya rechaza a un suplente vencido aunque el job no haya corrido |
| **Falla cerrada** | — |

#### `OP-SYS-006` — Recordar la revisión anual de grants

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | Grants vigentes con 12 meses cumplidos desde su concesión o su última reconfirmación |
| **Transacción** | Registrar el recordatorio y encolar la notificación |
| **Idempotencia** | Clave `grant_review:<grantId>:<ciclo>`: un grant recibe un recordatorio por ciclo |
| **Paginación y orden** | Lotes |
| **Offline / concurrencia** | Sin impacto en autorización |
| **Información sensible** | Ninguna |
| **Evento de dominio** | `privacy.grant_review_due.v1` |
| **Reglas** | El recordatorio **no corta el acceso**: los grants V1 son indefinidos. Su función es que la persona revise conscientemente qué sigue compartiendo |
| **Falla cerrada** | — |

#### `OP-SYS-007` — Ejecutar disposición por vencimiento de retención

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | `DISPOSITION_ITEM` con plazo cumplido y **sin** `HOLD_APPLICATION` vigente |
| **Transacción** | Ejecutar la acción decidida —`delete`, `anonymize` o `retain_restricted`— sobre el original y propagar a derivados, proyecciones, cachés, read models y almacenamiento; escribir `DISPOSITION_EVENT` append-only |
| **Idempotencia** | Clave `dispose:<itemId>`. Reejecutar converge y no genera eventos duplicados |
| **Paginación y orden** | Lotes acotados por categoría |
| **Offline / concurrencia** | Un hold aplicado concurrentemente suspende el ítem antes de ejecutarlo |
| **Información sensible** | Todas las categorías |
| **Evento de dominio** | `privacy.disposition_executed.v1` |
| **Reglas** | Al vencer el plazo se elimina o anonimiza **salvo hold documentado**. La anonimización elimina identificadores directos, indirectos y llaves de enlace; seudonimizar o cifrar no cuenta. Los datos retenidos quedan **fuera** de endpoints operativos, marketing, analítica identificable e IA. Los backups convergen por expiración y no resucitan datos dispuestos |
| **Falla cerrada** | Si la propagación a un sistema activo no puede confirmarse, el ítem no se marca como completado y reintenta |

#### `OP-SYS-008` — Resolver una solicitud de supresión

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | `DISPOSITION_CASE` abierto originado por `ERASURE_REQUEST` |
| **Transacción** | Resolver cada `DISPOSITION_ITEM` con su política versionada y cerrar el caso cuando todos estén resueltos o suspendidos |
| **Idempotencia** | Clave por caso e ítem; converge |
| **Paginación y orden** | Por caso |
| **Offline / concurrencia** | Un hold suspende ítems concretos sin bloquear los demás |
| **Información sensible** | Todas las categorías del alcance |
| **Evento de dominio** | `privacy.erasure_resolved.v1` |
| **Reglas** | Cada categoría se resuelve por **su** política, no por una regla global. El cierre de cuenta elimina la PII, conserva un tombstone técnico **sin** PII y mantiene la evidencia bilateral mínima en acceso restringido. Revocar un scope no es una supresión y no borra el dato del Fitness ID |
| **Falla cerrada** | Categoría sin política aplicable: el caso permanece abierto y se escala |

#### `OP-SYS-009` — Reaplicar disposiciones tras una restauración

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9`, disparado por un procedimiento operativo |
| **Filtros obligatorios** | `DISPOSITION_EVENT` con instante posterior al snapshot restaurado |
| **Transacción** | Reaplicar cada disposición en orden y registrar la reaplicación |
| **Idempotencia** | Clave `reapply:<eventId>:<restoreId>`; converge |
| **Paginación y orden** | Orden cronológico de los eventos |
| **Offline / concurrencia** | Se ejecuta **antes** de devolver tráfico al sistema restaurado |
| **Información sensible** | Todas las categorías |
| **Evento de dominio** | `privacy.disposition_reapplied.v1` |
| **Reglas** | Una restauración **no resucita** datos eliminados o anonimizados. Mientras existan disposiciones pendientes de reaplicar, el sistema no acepta tráfico ordinario |
| **Falla cerrada** | Si la reaplicación falla, no se restaura el servicio |

#### `OP-SYS-010` — Recalcular derivados invalidados

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `SYS` |
| **Actor** | `A9` |
| **Filtros obligatorios** | `DERIVED_RESULT` marcados como invalidados por una revisión, una invalidación, una ocultación o una disposición |
| **Transacción** | Recalcular registrando algoritmo, versión, inputs y revisiones usadas |
| **Idempotencia** | Clave `recompute:<derivedId>:<inputsHash>`; converge |
| **Paginación y orden** | Lotes por persona |
| **Offline / concurrencia** | Un derivado invalidado **no se sirve** hasta recalcularse: no se devuelve un valor obsoleto |
| **Información sensible** | Hereda la clasificación más restrictiva de sus inputs |
| **Evento de dominio** | `execution.derived_recomputed.v1` |
| **Reglas** | Los derivados no se editan a mano jamás. Un input denegado por ocultación queda **fuera** del cálculo, y el derivado resultante lo refleja |
| **Falla cerrada** | Un derivado que no puede recalcularse permanece invalidado y ausente, nunca aproximado |

#### `OP-SYS-011` — Consultar configuración pública de telemetría

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /{surface}/v1/telemetry-config`, donde `surface` es `studio` o `space`. El Backoffice no tiene compuerta: es interno y no mide nada en el navegador |
| **Actor** | `A0` |
| **Filtros obligatorios** | Superficie cerrada de la ruta; no acepta sujeto, identificadores ni parámetros |
| **Transacción** | Ninguna; lee solo configuración de despliegue |
| **Idempotencia** | Natural; respuesta cacheable durante cinco minutos |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Ante ausencia, error o configuración inválida el cliente no inicializa telemetría |
| **Información sensible** | Ninguna |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve únicamente `enabled` y `notice_version = analytics-v1`; no autentica, no recibe cookies y no expone claves, ambiente ni proveedor |
| **Falla cerrada** | Cualquier fallo equivale a `enabled = false` en el cliente |

### 7.9 Soporte de plataforma

Regla que gobierna todo el dominio: **el rol base permite entrar; el deber autoriza la operación; break-glass autoriza la lectura excepcional.** Toda lectura permitida o denegada de datos de una persona escribe un registro con la identidad real de quien accedió antes de devolver contenido, visible para la persona afectada. El registro es inmutable.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-SUP-001` | Solicitar ventana break-glass | Comando | `A10/request_break_glass` |
| `OP-SUP-002` | Aprobar o rechazar break-glass (retired by ADR-046) | Comando | `A12/approve_break_glass` |
| `OP-SUP-003` | Ejercer lectura break-glass | Consulta auditada | `A10` solicitante exacto |
| `OP-SUP-004` | Cerrar mi ventana break-glass | Comando | `A10` solicitante exacto |
| `OP-SUP-005` | Consultar metadatos operativos | Consulta | `A10` |
| `OP-SUP-006` | Revisar un caso break-glass ejercido | Comando | `A12/audit_break_glass` |
| `OP-SUP-007` | Asignar o retirar el rol base de plataforma | Comando | `A12/manage_platform_access` |
| `OP-SUP-008` | Consultar quién tiene rol base | Consulta | `A12/manage_platform_access` o `audit_platform_access` |
| `OP-SUP-009` | Consultar el registro de accesos de plataforma | Consulta | `A12/audit_platform_access` |
| `OP-SUP-010` | Asignar, suspender o revocar un deber | Comando | `A12/manage_platform_access` |
| `OP-SUP-011` | Consultar asignaciones de deber | Consulta | `A12/manage_platform_access` o `audit_platform_access` |

> **ADR-046.** Built: `allfit_admin` brings every duty (`OP-SUP-007`, `OP-SUP-010`,
> `OP-SUP-011` below; migration `20261114090000_an_admin_holds_every_duty.sql`). Also built:
> self-approved break-glass windows of 60 minutes for every tier (decision 2, migration
> `20261115090000_an_admin_opens_their_own_break_glass_window.sql`), which retires
> `OP-SUP-002`; person search by partial name, email or phone with full name and contact
> (decision 4) and an optional case reference for support reads (decision 5), both in
> migration `20261115100000_an_admin_finds_a_person_by_name.sql`. The «Implemented
> (ADR-046)» rows of `OP-SUP-001` to `OP-SUP-006` below say what changed; the rest of each
> table still holds.

---

#### `OP-SUP-001` — Solicitar ventana break-glass

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/break-glass/requests` |
| **Actor** | `A10` con `request_break_glass`, rol base, AAL2 y deber vigente |
| **Filtros obligatorios** | Sujeto exacto, propósito cerrado, `case_reference` opaca, categorías aprobables, duración y ausencia de conflicto |
| **Transacción** | Crear `support.break_glass_requests` con tier, quorum, expiración y asignación de deber inmutables |
| **Idempotencia** | `Idempotency-Key`; mismo comando converge a la misma solicitud |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | No offline; una solicitud pendiente vence a los 30 minutos aunque el job no corra |
| **Información sensible** | Metadatos de finalidad y sujeto; nunca contenido |
| **Evento de dominio** | `support.break_glass_requested.v1` |
| **Reglas** | El servidor calcula sensibilidad, aprobaciones y duración. Categoría prohibida se rechaza y audita sin abrir alcance aprobable |
| **Falla cerrada** | Deber/rol/AAL insuficiente, conflicto, categoría o propósito inválidos: rechazo |
| **Implemented (ADR-046)** | Migration `20261115090000_an_admin_opens_their_own_break_glass_window.sql`. **Asking opens the window:** `support.request_break_glass` derives 0 approvals and 60 minutes for both tiers (`support.break_glass_required_approvals`, `support.break_glass_duration_minutes`) and inserts the request with `status = 'approved'`, `window_starts_at` at the request and `window_ends_at` 60 minutes later. It emits `support.break_glass_requested.v1` and `support.break_glass_window_opened.v1` (`request_id`, `window_starts_at`, `window_ends_at`). `request_expires_at` is still written 30 minutes after the request but no longer gates a new window. **Unchanged:** the closed purpose (`support.break_glass_purpose`), a traceable `case_reference`, the refusal of forbidden categories, the refusal over one's own data (`42501`) and the idempotent replay. `ck_break_glass_requests_derived` accepts 0/60 and the shapes asked for before (standard 1/30, restricted 2/15), and refuses mixes such as 0/15 or 0/90. In the contract, `BreakGlassRequest.required_approvals` has minimum 0 and `requested_duration_minutes` maximum 60. The Backoffice web says «Ventana abierta por 60 minutos. Cada lectura queda registrada y otra persona la revisa después.» Tests: `T-SUP-BG-SELF-01`, `T-SUP-BG-01`, `T-BG-API-01`, `T-BG-API-02` |

#### `OP-SUP-002` — Aprobar o rechazar break-glass (retired)

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/break-glass/requests/{requestId}/decisions` |
| **Actor** | `A12` con `approve_break_glass`, rol base, AAL2 y deber vigente |
| **Filtros obligatorios** | Solicitud ajena pendiente/no vencida; aprobador distinto, sin conflicto y no repetido |
| **Transacción** | Insertar aprobación append-only; rechazo cierra o última aprobación abre la ventana atómicamente |
| **Idempotencia** | `Idempotency-Key` + `UNIQUE(request_id,approver_person_id)` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Locks por solicitud; dos decisiones concurrentes no duplican aprobador ni abren dos ventanas |
| **Información sensible** | Metadatos del expediente, no contenido de la persona |
| **Evento de dominio** | `support.break_glass_decided.v1`, y `support.break_glass_window_opened.v1` al completar quorum |
| **Reglas** | Un rechazo es terminal. Estándar exige una aprobación; restringida dos personas distintas |
| **Falla cerrada** | Solicitante/sujeto/conflicto/deber vencido o solicitud no pendiente: rechazo |
| **Retired (ADR-046)** | This table is kept as a historical record. Migration `20261115090000_an_admin_opens_their_own_break_glass_window.sql` drops `support.decide_break_glass`; the route `POST /backoffice/v1/break-glass/requests/{requestId}/decisions` answers `404`, and the OpenAPI operation `decideBackofficeBreakGlass` and schema `BreakGlassDecision` are removed. `support.break_glass_approvals` keeps the approvals recorded before, stays append-only, and nothing writes it any more. `support.break_glass_viewer_projection` no longer returns `viewer_can_decide`. A request asked for before and still pending can no longer be approved and expires; the Backoffice web shows it as «Pedida antes del cambio, sin abrir» and no longer has approve or reject controls. `support.break_glass_decided.v1` is no longer emitted. Tests: `T-SUP-BG-SELF-01`, `T-BG-API-20` |

#### `OP-SUP-003` — Ejercer lectura break-glass

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta auditada |
| **Superficie** | `POST /backoffice/v1/break-glass/requests/{requestId}/reads` |
| **Actor** | `A10` solicitante exacto con `request_break_glass`, rol base, AAL2 y deber vigentes |
| **Filtros obligatorios** | Solicitud aprobada, quorum, ventana, sujeto, propósito, categoría y recurso exactos; categoría no prohibida |
| **Transacción** | Revalidar autoridad, insertar `break_glass_events` y `privacy.access_events`, y sólo entonces devolver la proyección cerrada |
| **Idempotencia** | N/A: cada lectura permitida o denegada es un evento nuevo |
| **Paginación y orden** | Cursor acotado dentro de la categoría aprobada; sin exportación |
| **Offline / concurrencia** | No cacheable; vigencia se evalúa por timestamp en cada lectura |
| **Información sensible** | Sólo campos de la categoría aprobada; jamás medios, pagos, identidad/contacto completos, secretos o raw |
| **Evento de dominio** | Ninguno; los registros de acceso son la evidencia |
| **Reglas** | Sólo lectura. Otro A10, un A12 o el mismo actor con otra solicitud no puede ejercer |
| **Falla cerrada** | Cualquier falla de autorización o auditoría devuelve cero contenido |
| **Implemented (ADR-046)** | Unchanged. A window opened since ADR-046 is `approved` from the request with 0 required approvals, so its requester can exercise it at once; every read still writes `support.break_glass_events` and `privacy.access_events` before content |

**Contenido implementado (`HU-BO-009`, mediciones).** Con `body_progress`, una lectura permitida responde `outcome: "allowed"` y `content.body_progress`, con hasta 500 mediciones de la persona del expediente, las más recientes primero, y la misma proyección que ve la persona: `has_media` sin referencia. `body_progress` lee sólo `identity.body_progress_records`; apuntarla a otro `resource_type` se registra y responde `denied` con `resource_out_of_scope`. Las categorías cuyos datos la plataforma todavía no guarda siguen respondiendo `content_unavailable`.

**Contexto de salud implementado (`HU-BO-009`).** Con `health_context`, una lectura permitida devuelve `content.health_context` con hasta 500 declaraciones de la persona del expediente, la de inicio más reciente primero, con tipo, descripción, zona, procedencia y vigencia, y nunca `person_id`. `health_context` lee sólo `identity.health_context_claims`, y apuntarla a otro recurso se registra y responde `denied` con `resource_out_of_scope`.

**Comidas implementadas (`HU-BO-009`).** Con `nutrition_intake`, una lectura permitida devuelve `content.nutrition_intake` con hasta 500 comidas de la persona del expediente, la más reciente primero, con sus ítems y valores y `has_media`, nunca la foto ni sus scopes (`BreakGlassMeal`). Lee sólo `nutrition.meals`. Con esto, las tres categorías restringidas devuelven contenido; `relationship_training`, `prior_training_history` y `nutrition_guidance` siguen en `content_unavailable`.

#### `OP-SUP-004` — Cerrar mi ventana break-glass

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/break-glass/requests/{requestId}/closure` |
| **Actor** | `A10` solicitante exacto con rol base, AAL2 y deber vigente |
| **Filtros obligatorios** | Solicitud propia en estado `approved` y ventana no cerrada |
| **Transacción** | Marcar cierre y emitir evento sin borrar aprobaciones ni ejercicios |
| **Idempotencia** | `Idempotency-Key`; cerrar una ventana cerrada converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Cierre y lectura concurrentes se serializan; tras el cierre ninguna lectura entrega contenido |
| **Información sensible** | Ninguna adicional |
| **Evento de dominio** | `support.break_glass_closed.v1` |
| **Reglas** | No existe reapertura ni extensión; continuar exige solicitud nueva |
| **Falla cerrada** | Ventana ajena o estado incompatible: rechazo |

#### `OP-SUP-005` — Consultar metadatos operativos

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/support/...` |
| **Actor** | `A10` con rol base, `diagnose_support_metadata`, AAL2 y deber vigente |
| **Filtros obligatorios** | Solo identificadores, estados, marcas de tiempo, errores y contadores |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor |
| **Offline / concurrencia** | Cacheable |
| **Información sensible** | **Ninguna.** Sin contenido de perfil, ejecuciones, medidas ni salud |
| **Evento de dominio** | Ninguno |
| **Reglas** | Es la operación ordinaria. No devuelve nombres ni contactos completos; localizar persona exige identificador o coincidencia exacta, caso trazable y respuesta enmascarada |
| **Falla cerrada** | — |
| **Implemented (ADR-046)** | Migration `20261115100000_an_admin_finds_a_person_by_name.sql` replaces the rule above. **Search:** `GET /backoffice/v1/support/people?q=&case_reference=&limit=` accepts only those parameters (the old `identifier`, `email` and `phone` answer `400 invalid-request`); `q` is trimmed and 2 to 100 characters, and `limit` defaults to 25 and is at most 25. `support.search_people(actor, session, case_reference, query, limit)` matches part of the lowered name, email or phone, with `\`, `%` and `_` escaped so a wildcard never lists everybody, or the exact person identifier, in name order. It answers `outcome` (`found` or `not_found`), `items` and `has_more`; each `SupportPersonMatch` carries `person_id`, `display_name`, `contact_email`, `contact_phone` and `account_status`, and no masked contact. **Evidence:** one `support.metadata_queries` row per search (`lookup_kind = 'text'`, sha256 of the lowered term, `result_count`) and one `privacy.access_events` row per person returned (`resource = 'support.person_search'`, purpose `support_diagnosis`, access mode `support_metadata`); a session without the admin role is refused and nothing is recorded. **Person file:** `GET /backoffice/v1/support/people/{personId}` returns `SupportPersonMetadata` with `display_name`, `contact_email` and `contact_phone` added from `support.v_support_metadata`; the older masked fields stay, and it never shows the provider subject or separate given and family names. **Case reference (decision 5):** optional for the search, the person file, `/people/{personId}/payments` and `/support/billing-follow-up`; one given must match `^[A-Z][A-Z0-9_-]{2,63}$`, and free text answers `400 invalid-request`. The Backoffice web has one field «Nombre, correo o teléfono», an optional case and a table with name, email, phone and account state; it says when nobody matched and when more than 25 did. Tests: `T-SUP-SEARCH-02`, `T-SUP-RLS-03`, `T-SUP-API-23` to `28`, `46`, `48`, `49`, `T-SUP-UNIT-01`, `T-SUP-UNIT-02` |

#### `OP-SUP-006` — Revisar un caso break-glass ejercido

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/break-glass/requests/{requestId}/review` |
| **Actor** | `A12` con `audit_break_glass`, rol base, AAL2 y deber vigente |
| **Filtros obligatorios** | Caso ejercido; revisor distinto del solicitante y de todos los aprobadores; revisión dentro de 24 horas |
| **Transacción** | Registrar revisor, resultado y tiempo; abrir incidente cuando corresponda |
| **Idempotencia** | `Idempotency-Key`; una revisión terminal por solicitud |
| **Paginación y orden** | Cola por prioridad y primer ejercicio |
| **Offline / concurrencia** | Dos revisores concurrentes: uno confirma y el otro obtiene conflicto/replay |
| **Información sensible** | Metadatos y eventos de acceso; nunca el contenido consultado |
| **Evento de dominio** | `support.break_glass_reviewed.v1` o `support.break_glass_incident_opened.v1` |
| **Reglas** | El 100% de casos ejercidos se revisa; aprobar el caso impide revisarlo como independiente |
| **Falla cerrada** | Revisor no independiente o deber/AAL inválido: rechazo |
| **Implemented (ADR-046)** | Unchanged. Nobody approves a window opened since ADR-046, so its reviewer only has to differ from the requester and the subject: the requester cannot review it and the other administrator can. A case approved before still keeps its approvers out of its review. Tests: `T-SUP-BG-SELF-01`, `T-SUP-BGR-01` |

#### `OP-SUP-007` — Asignar o retirar el rol base de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/platform/role-assignments` · `POST .../{id}/revocation` |
| **Actor** | `A12` con rol base, `manage_platform_access`, AAL2 y deber vigente |
| **Filtros obligatorios** | La persona destino existe y está activa; el rol pertenece al catálogo cerrado de roles de plataforma |
| **Transacción** | Crear o cerrar `support.platform_role_assignments` y registrar el evento append-only |
| **Idempotencia** | `Idempotency-Key`. Asignar un rol ya vigente converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada. Un cambio de acceso **nunca** se confirma desde caché |
| **Información sensible** | Identidad interna del equipo. Since ADR-046 the role brings every duty; reading a person's content still needs a break-glass window |
| **Evento de dominio** | `support.platform_role_granted.v1`, `support.platform_role_revoked.v1` |
| **Reglas** | No hay autoasignación. El rol **no tiene vencimiento** y nunca puede quedar cero `allfit_admin`. El historial es append-only e inmutable. Since ADR-046 the role brings the thirteen duties (see below) |
| **Falla cerrada** | Último `allfit_admin`, rol fuera del catálogo o persona inactiva: rechazo |
| **Implemented (ADR-046)** | Migration `20261114090000_an_admin_holds_every_duty.sql`. **Granting brings the duties:** the `AFTER INSERT` trigger `trg_platform_role_assignments_insert_grant_duties` runs `support.grant_standing_platform_duties()`, which inserts the thirteen duties of `support.standing_platform_duties()` with `basis = 'admin_role'`, `valid_to = 9999-12-31 00:00:00+00`, `reason_code = 'admin_role'` and the role's grantor as `granted_by_person_id`, and queues one `support.platform_duty_granted.v1` per duty. The grantor is never the person, because the role is never self-granted. **Withdrawing** is unchanged: `support.close_revoked_platform_access()` revokes every duty, by whoever withdrew the role, closes the person's break-glass windows and revokes their Backoffice sessions. Tests: `T-SUP-STANDING-01` |

#### `OP-SUP-008` — Consultar quién tiene rol de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/platform/role-assignments` |
| **Actor** | `A12` con `manage_platform_access` o `audit_platform_access`, AAL2 y deber vigente |
| **Filtros obligatorios** | Ninguno adicional: es el catálogo interno de Allfit |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: estado y fecha de asignación descendente |
| **Offline / concurrencia** | **Nunca** cacheable para decidir acceso |
| **Información sensible** | Identidad de los integrantes del equipo |
| **Evento de dominio** | Ninguno |
| **Reglas** | Muestra vigentes y retiradas, con quién asignó y cuándo. Ninguna organización ni persona externa lo consulta |
| **Falla cerrada** | — |

#### `OP-SUP-009` — Consultar el registro de accesos de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/platform/access-events` |
| **Actor** | `A12` con `audit_platform_access`, AAL2 y deber vigente |
| **Filtros obligatorios** | Solo lecturas realizadas por actores de plataforma |
| **Transacción** | Ninguna |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor. Orden: instante descendente |
| **Offline / concurrencia** | Cacheable para presentación |
| **Información sensible** | Metadatos de acceso. **Nunca el contenido consultado** |
| **Evento de dominio** | Ninguno |
| **Reglas** | Identifica a la persona real, deber, categoría, sujeto, propósito, resultado e instante. El registro es inmutable. Un auditor no revisa como independiente un caso que solicitó o aprobó. La persona afectada ve el reflejo minimizado desde su aplicación |
| **Falla cerrada** | Si el registro no puede escribirse en el momento de una lectura, **esa lectura no ocurre** |

#### `OP-SUP-010` — Asignar, suspender o revocar un deber de plataforma

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /backoffice/v1/platform/duty-assignments` · `POST .../{id}/suspension` · `POST .../{id}/revocation` |
| **Actor** | `A12` con rol base, `manage_platform_access`, AAL2 y deber vigente |
| **Filtros obligatorios** | Destino con rol base activo; deber del catálogo cerrado; otorgante distinto; vigencia `<=90 días`; AAL2 |
| **Transacción** | Crear/cerrar asignación append-only, auditar y cerrar ventanas cuando se retire `request_break_glass` |
| **Idempotencia** | `Idempotency-Key`; misma asignación vigente converge |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Nunca cacheable; unique parcial impide dos asignaciones activas de persona/deber |
| **Información sensible** | Autoridad interna del equipo |
| **Evento de dominio** | `support.platform_duty_granted.v1`, `support.platform_duty_suspended.v1`, `support.platform_duty_revoked.v1` |
| **Reglas** | Nadie se autoasigna; un deber no implica otro; vencer se evalúa por tiempo aunque el job no haya corrido |
| **Falla cerrada** | Rol base ausente, catálogo/AAL/vigencia inválidos o autoasignación: rechazo |
| **Implemented (ADR-046)** | Migration `20261114090000_an_admin_holds_every_duty.sql`. Every duty requires `allfit_admin`, and the role already brings all thirteen, so these commands only matter for a temporary duty granted before ADR-046. **Granting converges:** `support.assign_platform_duty` still validates the role, the catalogue and a window of at most 90 days, then answers the assignment the person already holds (scheduled or active, in any basis, preferring `admin_role`) and adds no row; granting an administrator a duty answers it with `basis: admin_role`. **A duty held through the role follows the role:** `support.suspend_platform_duty`, `support.revoke_platform_duty` and `support.recertify_platform_duty` (`POST .../{id}/recertification`, also `OP-SUP-010`) fail on it with `23514 a duty held through the admin role follows the role`, which the API answers as `409 conflict`; the rule lives in `support.preserve_platform_duty_history`, which also freezes `basis`. **Concurrency:** the current-assignment unique index is `(person_id, duty_code, basis)`, so a temporary duty from before lives beside the standing one and lapses on its own date, and two temporary ones of the same duty never coexist. The Backoffice web no longer offers a grant form. Tests: `T-SUP-STANDING-01`, `T-SUP-RECERT-01` |

#### `OP-SUP-011` — Consultar asignaciones de deber

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /backoffice/v1/platform/duty-assignments` |
| **Actor** | `A12` con `manage_platform_access` o `audit_platform_access`, AAL2 y deber vigente |
| **Filtros obligatorios** | Catálogo interno; filtros por persona, deber, estado y vigencia |
| **Transacción** | Ninguna; la respuesta nunca se usa como caché de autorización |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor por estado, `valid_to` y creación descendente |
| **Offline / concurrencia** | No cacheable para decisiones de acceso |
| **Información sensible** | Identidad y autoridad interna del equipo |
| **Evento de dominio** | Ninguno |
| **Reglas** | Muestra historial, otorgante, vigencia, AAL, recertificación, suspensión y revocación; sin `DELETE` |
| **Falla cerrada** | Deber del consultante ausente o vencido: rechazo |
| **Implemented (ADR-046)** | Each `PlatformDutyAssignment` now carries the required `basis` (`granted` or `admin_role`). The Backoffice web shows an `admin_role` duty as «Permanente · rol admin» instead of its far `valid_to`, and «Sigue al rol» instead of the recertify, suspend and revoke actions. A temporary duty from before keeps its dates and actions until it lapses |

### 7.10 Nutrición

Regla que gobierna todo el dominio: **la persona escribe su registro; el profesional verificado solo lee o propone**. Todas las lecturas Studio usan una organización explícita de ruta y todas las mutaciones nutricionales son transaccionales.

| ID | Operación | Tipo | Actor |
| --- | --- | --- | --- |
| `OP-NUT-001` | Registrar una comida | Comando | `A2` |
| `OP-NUT-002` | Listar mis comidas | Consulta | `A2` |
| `OP-NUT-003` | Revisar una comida o adjuntar/reemplazar su foto | Comando | `A2` |
| `OP-NUT-004` | Eliminar una comida | Comando | `A2` |
| `OP-NUT-005` | Consultar mis resúmenes diarios | Consulta | `A2` |
| `OP-NUT-006` | Consultar mis metas y propuestas | Consulta | `A2` |
| `OP-NUT-007` | Publicar una meta personal | Comando | `A2` |
| `OP-NUT-008` | Aceptar o rechazar una propuesta | Comando | `A2` |
| `OP-NUT-009` | Listar comidas autorizadas | Consulta | `A3/A7` elegible |
| `OP-NUT-010` | Consultar resúmenes autorizados | Consulta | `A3/A7` elegible |
| `OP-NUT-011` | Consultar historial autorizado de objetivos | Consulta | `A3/A7` elegible |
| `OP-NUT-012` | Proponer una versión de objetivos | Comando | `A3/A7` elegible |
| `OP-NUT-013` | Obtener una foto de comida autorizada | Consulta | `A3/A7` elegible |
| `OP-NUT-014` | Buscar alimentos en el catálogo | Consulta | `A2` |
| `OP-NUT-015` | Consultar mis alimentos más registrados | Consulta | `A2` |
| `OP-NUT-016` | Reconocer los alimentos de una foto | Consulta con proveedor externo | `A2` |
| `OP-NUT-017` | Consultar y aceptar el consentimiento de reconocimiento | Consulta / Comando | `A2` |

---

#### `OP-NUT-001` — Registrar una comida

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/nutrition/meals` |
| **Actor** | `A2`, sujeto autenticado |
| **Filtros obligatorios** | `person_id = access_control.person()`; nutrientes en catálogo V1; valores no negativos; unidades compatibles |
| **Transacción** | `nutrition.record_meal`: crear comida, ítems, nutrientes, receipt y outbox; `Command-Id = meals.id` |
| **Idempotencia** | `Command-Id` durable + `Idempotency-Key`; el mismo contenido converge a una comida |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite `draft_local` estructurado; la foto no forma parte de esta creación offline |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | `nutrition.meal_recorded.v1` con IDs, nunca contenido |
| **Reglas** | Al menos un ítem; `occurred_at`, zona y `local_date` quedan congelados; resúmenes se invalidan dentro del commit |
| **Falla cerrada** | Sujeto, nutriente, unidad o payload inválido revierte todo |

**Implementado (`nutrition.record_meal`, `POST /space/v1/nutrition/meals` → 201 con `Location` y `ETag` `"nutrition-meal:{id}:r0"`).** Sigue el contrato publicado: el cliente numera los ítems (1 a 100, sin repetir), cada nutriente lleva su `unit` y debe ser la única de su código, y una cantidad lleva su `quantity_unit` (una masa o un volumen del catálogo). Nota de hasta 1 000 caracteres; `occurred_at` no posterior a mañana. Cualquier campo fuera del contrato, incluida una foto, responde 422. **No hay foto ni resúmenes diarios en esta versión**, así que no hay nada que invalidar dentro del commit. Un replay devuelve la misma comida; si la comida se borró después, responde `410 command-effect-disposed` (`AF410`) y no la recrea.

#### `OP-NUT-002` — Listar mis comidas

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/nutrition/meals` · `GET /space/v1/nutrition/meals/{mealId}` (con su ETag, `ADR-040`) |
| **Actor** | `A2` |
| **Filtros obligatorios** | `person_id = access_control.person()` |
| **Transacción** | Solo lectura por `nutrition.v_my_meals` |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor opaco; `(occurred_at DESC,id DESC)` después de filtrar |
| **Offline / concurrencia** | Space puede combinar respuesta con borradores locales sin enviarlos al servidor |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Incluye URL firmada solo si existe medio; nunca devuelve `media_ref` |
| **Falla cerrada** | Una fila ajena produce `404` en detalle y nunca aparece en lista |

**Implementado (`nutrition.list_meals`).** `from` y `to` son días locales (`local_date`), de uno a 31 por lectura; `limit` de 1 a 100 (25 por defecto). El cursor opaco codifica el rango y la última comida, y no sirve para otro rango. No existe `v_my_meals`: la lectura es una función que resuelve el sujeto. `photo` es siempre `null` y `applied_scopes` vacío, porque la vista es la de la dueña y no hay fotos.

#### `OP-NUT-003` — Revisar una comida o adjuntar/reemplazar su foto

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `PATCH /space/v1/nutrition/meals/{mealId}` |
| **Actor** | `A2`, dueño de la comida |
| **Filtros obligatorios** | Comida propia; `If-Match = "nutrition-meal:{id}:r{revision}"` |
| **Transacción** | `nutrition.revise_meal`: reemplazo atómico de estructura y/o medio, incremento de revisión, invalidación de resumen, receipt y outbox |
| **Idempotencia** | `Command-Id` + `Idempotency-Key` + revisión base |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | La estructura puede sincronizarse desde borrador; la foto se adjunta al recuperar conexión |
| **Información sensible** | `nutrition`; foto separada por `nutrition_media` |
| **Evento de dominio** | `nutrition.meal_revised.v1` |
| **Reglas** | El servidor elimina EXIF/geolocalización antes de sustituir `media_ref`; el anterior se dispone después del commit vía `nutrition.media_disposals` (`ADR-039`). La hora y el día no cambian al corregir |
| **Falla cerrada** | ETag obsoleto → `409`; saneamiento/almacenamiento fallido → no cambia fila ni medio |

#### `OP-NUT-004` — Eliminar una comida

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `DELETE /space/v1/nutrition/meals/{mealId}` |
| **Actor** | `A2`, dueño |
| **Filtros obligatorios** | Comida propia |
| **Transacción** | `nutrition.delete_meal`: abrir disposición unitaria, eliminar hijos/original, invalidar resumen y encolar borrado del medio |
| **Idempotencia** | Reintentos convergen al mismo tombstone mínimo |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | La intención puede encolarse localmente; servidor decide contra estado actual |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | `nutrition.meal_deleted.v1` |
| **Reglas** | No conserva snapshot navegable; holds suspenden la disposición |
| **Falla cerrada** | No confirma si DB, disposición o outbox no convergen |

**Implementado (`nutrition.delete_meal`, `DELETE /space/v1/nutrition/meals/{mealId}` → 204).** En una transacción: `privacy.dispose_on_owner_request` abre y cierra el caso bajo la política `nutrition`, se encola `nutrition.meal_deleted.v1` con sólo `meal_id`, y la comida se borra con sus ítems y valores en cascada. Un reintento con la misma llave responde 204 con `Idempotent-Replay`; con otra llave, 404. Holds, resúmenes y medios no existen todavía, así que no hay nada que suspender, recalcular ni propagar.

#### `OP-NUT-005` — Consultar mis resúmenes diarios

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/nutrition/daily-summaries` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona propia; rango máximo 31 días |
| **Transacción** | Agregación en `nutrition.v_my_daily_summaries` |
| **Idempotencia** | N/A |
| **Paginación y orden** | `local_date ASC` |
| **Offline / concurrencia** | Borradores locales no se presentan como resumen del servidor |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Suma únicamente nutrientes capturados; `NULL` no se convierte en cero. Responde cada día del rango y `streak_days`, contado hasta hoy en la zona que manda el teléfono (`ADR-040`) |
| **Falla cerrada** | Un rango inválido se rechaza; no aproxima valores |

#### `OP-NUT-006` — Consultar mis metas y propuestas

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/nutrition/goals` |
| **Actor** | `A2` |
| **Filtros obligatorios** | `goal_set.person_id = access_control.person()` |
| **Transacción** | Solo lectura de activa, pendientes y decisiones |
| **Idempotencia** | N/A |
| **Paginación y orden** | Propuestas por `(created_at DESC,id DESC)` |
| **Offline / concurrencia** | Sin caché durable |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Conserva origen y publica autoría mínima: `kind`, `person_id` y, en una propuesta, el nombre del profesional y de su organización (`ADR-040`); no mezcla líneas por relación ni expone contexto interno del profesional |
| **Falla cerrada** | Solo la persona ve versiones propias y profesionales |

#### `OP-NUT-007` — Publicar una meta personal

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/nutrition/goals/versions` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Goal set propio; targets válidos y catálogo vigente |
| **Transacción** | `nutrition.publish_self_goal_version`: bloquear set, crear snapshot/targets, supersede activa y activar nueva |
| **Idempotencia** | `Command-Id = goal_versions.id` + `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Admite intención local; serializa sobre el goal set |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | `nutrition.goal_version_activated.v1` |
| **Reglas** | Solo una activa; no altera propuestas pendientes; la respuesta usa `author.kind=self` y `author.person_id=access_control.person()` |
| **Falla cerrada** | Conflicto/target inválido revierte versión y transición |

#### `OP-NUT-008` — Aceptar o rechazar una propuesta

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /space/v1/nutrition/goal-versions/{goalVersionId}/decision` |
| **Actor** | `A2`, persona del goal set |
| **Filtros obligatorios** | Versión profesional `proposed`, propia y sin decisión |
| **Transacción** | `nutrition.decide_goal_version`: bloquear set/versión; insertar decisión; aceptar activa y supersede anterior, rechazar no cambia activa |
| **Idempotencia** | `Command-Id = goal_decisions.id` + `Idempotency-Key`; una decisión por versión |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Falla cerrada sin conexión; dos decisiones concurrentes producen una ganadora |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | `nutrition.goal_version_accepted.v1` o `nutrition.goal_version_rejected.v1` |
| **Reglas** | Ningún profesional o administrador decide por la persona |
| **Falla cerrada** | Versión ajena, cancelada, decidida o no profesional: rechazo |

#### `OP-NUT-009` — Listar comidas autorizadas

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/nutrition/meals` |
| **Actor** | `A3/A7` con contexto profesional elegible |
| **Filtros obligatorios** | Fórmula completa + `nutrition_intake/read`; foto exige además `nutrition_media/read` |
| **Transacción** | Lectura por `nutrition.v_client_meals_live` y `ACCESS_EVENT` antes de servir |
| **Idempotencia** | N/A |
| **Paginación y orden** | Cursor después de autorización; `(occurred_at DESC,id DESC)` |
| **Offline / concurrencia** | `private, no-store`; revocación inmediata |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Profesional no recibe `media_ref` ni URL de storage; con ambos scopes recibe únicamente el enlace autenticado de `OP-NUT-013` |
| **Falla cerrada** | Media aislada, admin/staff, credencial vencida o falta de grant producen cero señal |
| **Implemented (STUDIO-61)** | `nutrition.list_client_meals(person, organization, subject, from, to, limit, cursor_occurred_at, cursor_id)`, migration `20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql` (pull request allfitone#203, merge and database deploy pending); `GET /studio/v1/organizations/{organizationId}/clients/{personId}/nutrition/meals?from&to&limit&cursor`, `cookieAuth`, `private, no-store`, `200 ClientNutritionMealPage`. **Deviation, who reads:** the attending professional (`holder`, or a cover she accepted) with a live membership and her `nutrition_intake` grant; no capability and no credential (the owner's decision of 8 November 2026; ADR-027, *As implemented*). Not attending her is `P0002` → `404`, the same for admin, owner and staff. **Order:** `identity.open_client_category(…, 'studio_nutrition_review')` writes the access event, allowed or denied, before any row; without the grant the answer is `403 scope-required` naming `nutrition_intake`. Rows then come through `meals_select_review`, `meal_items_select_review` and `meal_nutrient_values_select_review`, under the contract scope `nutrition_review`. **What it shows:** `nutrition.client_meal_json`, each field only if her version shares it, otherwise null; never `media_ref` or the revision. **Deviation, the photo:** no `AuthenticatedMediaLink`. `has_photo` is said only when she also shares `nutrition_media`, and `photo_scope` names that version; the list then writes a second access event under `nutrition_media`. **Range:** one to thirty-one of her local days (`22023` → `422`, the API checks it first). **Page:** newest first on (`occurred_at`, `id`); `limit` 1 to 100, default 25; the cursor keeps the instant at full precision. **No plan window:** her Space plan's history window does not apply. Tests: `T-NUT-STUDIO-01` (`T-NUT-RLS-04`, `-06`, `-07`, `-08`, `-09`, `-10`, `-15`, `T-NUT-API-06`, `-10`, `-12`) and `nutrition/handlers/studio.test.ts` |

#### `OP-NUT-010` — Consultar resúmenes autorizados

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/nutrition/daily-summaries` |
| **Actor** | `A3/A7` elegible |
| **Filtros obligatorios** | Fórmula completa + `nutrition_intake/read` |
| **Transacción** | Filtrar comidas primero, agregar después y registrar acceso |
| **Idempotencia** | N/A |
| **Paginación y orden** | Rango máximo 31 días; `local_date ASC` |
| **Offline / concurrencia** | `private, no-store` |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Revocación elimina también totales, tendencias y `has_more` |
| **Falla cerrada** | Nunca devuelve agregados parciales que revelen filas ocultas |
| **Implemented (STUDIO-62)** | `nutrition.read_client_daily_summaries(person, organization, subject, from, to)`, migration `20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql`; `GET …/clients/{personId}/nutrition/daily-summaries?from&to`, `200 ClientNutritionDailySummaryPage`. Same opening, deviation and access event as `OP-NUT-009`, under `nutrition_intake`. **Per day** of a range of one to thirty-one days, in order: `meal_count`, null when her version does not share `local_date`, and `nutrient_totals` in canonical units, null when it does not share nutrient values. Totals add up only rows the review policies admit; a day with no meals has `meal_count = 0` and no totals. Computed at read time, with no streak, trend or hidden-day count. Tests: `T-NUT-RLS-10`, `-14`, `-15`, `T-NUT-API-07` |

#### `OP-NUT-011` — Consultar historial autorizado de objetivos

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/nutrition/goals/versions` |
| **Actor** | Live: profesional elegible. Frozen: membresía exacta autorizada por caso histórico |
| **Filtros obligatorios** | Live: `nutrition_guidance/read`. Frozen: grant frozen, caso/AAL2/propósito y solo origen profesional de esa relación `<=T` |
| **Transacción** | `nutrition.v_client_guidance_live` o `nutrition.v_client_guidance_frozen`; acceso auditado |
| **Idempotencia** | N/A |
| **Paginación y orden** | `(created_at DESC,id DESC)` |
| **Offline / concurrencia** | `private, no-store` |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Frozen excluye comidas, fotos, resúmenes, metas personales y post-corte; conserva `author.kind=professional` y el `author_person_id` congelado |
| **Falla cerrada** | Sin caso válido no existe fallback al endpoint live |
| **Implemented, live (STUDIO-63)** | `nutrition.list_client_goal_versions(person, organization, subject, limit, cursor_created_at, cursor_id)`, migration `20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql`; `GET …/clients/{personId}/nutrition/goals/versions?limit&cursor`, `200 ClientNutritionGoalHistory`. Same opening and deviation as `OP-NUT-009`, under `nutrition_guidance` (`403 scope-required` without it). **`data`:** the versions this relationship proposed, in every status, newest first on (`created_at`, `id`), each with its targets, `author` (`kind`, `person_id`), `rationale` when her version shares it, and her decision. Never the version number. **`active`:** her active goal with its targets. **Deviation, masked (the owner's decision of 8 November 2026):** when another relationship or she herself set it, it carries `goal_version_id: null` and `from_this_relationship: false`, and no author, rationale or origin. Policies `goal_versions_select_review` (this relationship's versions, or the active one), `goal_targets_select_review` and `goal_decisions_select_review` (decisions only on this relationship's versions). The optional `X-Historical-Access-Case` header is gone from this route. Tests: `T-NUT-RLS-20`, `-29`, `-30`, `T-NUT-API-14` |
| **Implemented, frozen (STUDIO-63)** | `nutrition.list_frozen_goal_versions(person, session, organization, relationship, case, limit, cursor_created_at, cursor_id)`; `GET /studio/v1/organizations/{organizationId}/historical-relationships/{relationshipId}/nutrition/goal-versions`, header `X-Historical-Access-Case`, `200 FrozenNutritionGoalVersionPage`. **Deviation, step-up:** a Studio sign-in less than ten minutes old instead of AAL2 (`AF401` → `403 reauthentication-required`), as in `OP-PRV-020`. It opens through `privacy.open_frozen_read` and `privacy.frozen_category('nutrition_guidance')`. **What it shows:** only professional versions of this relationship with `created_at <= cut_at`, newest first, each with `status_at_cut`, its decision only if made by the cut, and only the fields the frozen version keeps `historical_readable`. A grant on `nutrition_guidance` v1 kept none, so it answers `403 scope-required`. Policies `goal_versions_select_frozen`, `goal_targets_select_frozen` and `goal_decisions_select_frozen` guard on the open `frozen_history` scope and call `nutrition.reads_frozen_goal_version` and `reads_frozen_goal_decision`. Every read writes an access event in `frozen` mode with the case. Tests: `T-NUT-HIST-01` (17), `studio-historical-access.test.ts`, `privacy/infrastructure/historical-access.test.ts` |

#### `OP-NUT-012` — Proponer una versión de objetivos

| Campo | Valor |
| --- | --- |
| **Tipo** | Comando |
| **Superficie** | `POST /studio/v1/organizations/{orgId}/clients/{personId}/nutrition/goals/versions` |
| **Actor** | `A3/A7` con `guide_nutrition` y credencial `nutrition_professional` verificada |
| **Filtros obligatorios** | Organización de ruta = relación/asignación/grant; relación/membresía/credencial vigentes; `nutrition_guidance/contribute` |
| **Transacción** | `nutrition.propose_goal_version`: bloquear set, supersede pendiente de la misma relación, crear snapshot/targets/contexto y outbox |
| **Idempotencia** | `Command-Id = goal_versions.id` + `Idempotency-Key` |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Solo online; serializa por goal set/relación |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | `nutrition.goal_version_proposed.v1` |
| **Reglas** | La propuesta exige `rationale` no vacío de hasta 2000 caracteres, no activa ni modifica la meta vigente, no contiene menú o indicación clínica y publica solo `author.kind=professional` más `author.person_id` |
| **Falla cerrada** | Payload sin `rationale` válido o cualquier condición profesional ausente falla antes de persistir y no crea versión parcial |
| **Implemented (STUDIO-64)** | `nutrition.propose_goal_version(person, organization, subject, rationale, targets, idempotency_key, command_id, request_hash)` returning `(result, replayed)`, migration `20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql`; `POST …/clients/{personId}/nutrition/goals/versions`, `Idempotency-Key` (v4) and `Command-Id` (v7), body `ProfessionalNutritionGoalVersionCreate`, `201 ClientNutritionGoalVersion` (`Idempotent-Replay` on a retry). **Order of checks:** the attending coach (`P0002` → `404`); `guide_nutrition`, which only `coach` holds (`42501` → `403 forbidden`); a `nutrition_professional` credential in force, `identity.effective_credential_verification` (`AF431` → `403 credential-required`, new); `nutrition_guidance` at `contribute` (`AF430` → `403 scope-required`, `AF424` → `409 service-paused`). Then the body: `rationale` trimmed, 1 to 2000 characters, and 1 to 6 targets (`22023` → `422` with field codes); `nutrition.write_targets` validates each. Then the idempotency receipt. **Locks:** the relationship `for share`, the assignment read again, the grant `for share` and checked again, then her goal set `for update`. **Writes:** this relationship's pending version becomes `superseded` (`IX-33`); the new one takes `id = command_id`, the next number and the `credential_verification_id`; `nutrition.goal_version_proposed.v1` carries ids only. Her active goal is untouched. The insert policy `goal_versions_insert_proposal` repeats the credential and `contribute` checks (`IX-31`). Tests: `T-NUT-STUDIO-02` (30; `T-NUT-RLS-18/19`, `T-NUT-INT-03..07`, `T-NUT-IDEM-05`, `T-NUT-API-08`), `goal-proposal-concurrency.test.ts` (10), `nutrition/handlers/studio.test.ts` |

#### `OP-NUT-013` — Obtener una foto de comida autorizada

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta binaria |
| **Superficie** | `GET /studio/v1/organizations/{orgId}/clients/{personId}/nutrition/meals/{mealId}/photo` |
| **Actor** | `A3/A7` con contexto profesional elegible |
| **Filtros obligatorios** | Fórmula profesional completa + `nutrition_intake/read` + `nutrition_media/read`, reevaluados en cada GET |
| **Transacción** | Resolver `nutrition.v_client_meals_live`, registrar `ACCESS_EVENT` y transmitir internamente el objeto saneado; nunca redirigir a storage |
| **Idempotencia** | GET seguro; cada lectura reevalúa autorización y registra su propio acceso |
| **Paginación y orden** | No aplica |
| **Offline / concurrencia** | Solo online; `private, no-store`; revocación efectiva en la siguiente petición |
| **Información sensible** | `nutrition_media` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Responde bytes `image/jpeg`, `image/png` o `image/webp`; nunca expone `media_ref`, query firmada o URL durable de storage |
| **Falla cerrada** | Recurso inexistente, scope revocado, media aislada, relación/asignación/membresía inválida o credencial vencida producen el mismo `404` sin bytes |
| **Implemented (STUDIO-65)** | `nutrition.open_client_meal_photo(person, organization, subject, meal)`, migration `20261117090000_a_coach_reads_and_guides_what_a_client_eats.sql`; `GET …/clients/{personId}/nutrition/meals/{mealId}/photo`. The function re-checks the attending assignment and both grants, and needs her `nutrition_media` version to share `nutrition.meals.media_ref`. It records one access event under `nutrition_media` on every call, allowed or denied, and returns the storage key only to the API. The API streams the sanitized object. **Deviation, media type:** `image/jpeg` only, because the sanitizer always writes JPEG. Headers: `Cache-Control: private, no-store`, `Content-Disposition: inline`, `X-Content-Type-Options: nosniff`. Any refusal, `42501` included, is the same `404` with no bytes; a store failure is `503`. No credential is needed (ADR-027, *As implemented*). Tests: `T-NUT-RLS-11`, `-12`, `-13`, `-16`, `T-NUT-API-05`, `nutrition/handlers/studio.test.ts` |

#### `OP-NUT-014` — Buscar alimentos en el catálogo

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/nutrition/foods?q=&limit=` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Solo alimentos y productos publicados; `q` de 1 a 80 caracteres; `limit` de 1 a 30 |
| **Transacción** | `nutrition.search_foods` sobre nombre y sinónimos normalizados (minúsculas, sin tildes) de los alimentos, y nombre y marca de los productos de Open Food Facts |
| **Idempotencia** | N/A |
| **Paginación y orden** | La frase exacta, luego como prefijo, al inicio de una palabra y contenida; después, todas las palabras en cualquier orden. A igualdad, primero el alimento propio y luego el nombre |
| **Offline / concurrencia** | Solo online |
| **Información sensible** | Ninguna: el catálogo es público para las personas |
| **Evento de dominio** | Ninguno |
| **Reglas** | Cada alimento sale con sus nutrientes por 100 g y sus porciones (`ADR-041`). Un producto sale como alimento de tipo `product`, con su marca, y la app acredita Open Food Facts (ODbL). No requiere consentimiento: nada sale de Allfit |
| **Falla cerrada** | Una consulta vacía o demasiado larga se rechaza |

#### `OP-NUT-015` — Consultar mis alimentos más registrados

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta |
| **Superficie** | `GET /space/v1/nutrition/foods/frequent` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona propia; solo ítems con alimento o producto del catálogo |
| **Transacción** | `nutrition.my_frequent_foods`, derivado de `meal_items` |
| **Idempotencia** | N/A |
| **Paginación y orden** | Veces registrado, luego el más reciente; máximo 10 |
| **Offline / concurrencia** | Solo online |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Devuelve la última porción que la persona usó con cada alimento |
| **Falla cerrada** | Sin historia devuelve una lista vacía, no sugerencias genéricas |

#### `OP-NUT-016` — Reconocer los alimentos de una foto

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta con proveedor externo; no escribe nada |
| **Superficie** | `POST /space/v1/nutrition/recognitions` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Consentimiento de reconocimiento vigente (`OP-NUT-017`) |
| **Transacción** | Sanear la foto (sin EXIF, 1024 px), reconocer con el modelo configurado, validar la respuesta y cruzarla con el catálogo (`nutrition.match_foods`) |
| **Idempotencia** | N/A: no guarda estado |
| **Paginación y orden** | Ítems en el orden en que el modelo los devuelve |
| **Offline / concurrencia** | Solo online; tiempo límite de 15 s |
| **Información sensible** | `nutrition_media`, enviada a un encargado externo |
| **Evento de dominio** | Ninguno |
| **Reglas** | El modelo solo aporta nombre, unidades, gramos, confianza y dónde está cada alimento en la foto; los nutrientes salen del catálogo. Nombres que no son texto llano se descartan. Un ítem con poca confianza, sin alimento del catálogo o que es un plato completo junto a sus partes se marca para revisión. Un solo modelo por versión exacta, sin respaldo automático (`ADR-041`) |
| **Falla cerrada** | Sin consentimiento, `403 consent-required`; foto inválida, `422`; proveedor caído, respuesta inválida o nada reconocible, `503 upstream-unavailable`, sin resultado parcial inventado |

#### `OP-NUT-017` — Consultar y aceptar el consentimiento de reconocimiento

| Campo | Valor |
| --- | --- |
| **Tipo** | Consulta / Comando |
| **Superficie** | `GET` y `PUT /space/v1/nutrition/recognition-consent` |
| **Actor** | `A2` |
| **Filtros obligatorios** | Persona propia |
| **Transacción** | `nutrition.read_recognition_consent` y `nutrition.accept_recognition_consent` |
| **Idempotencia** | `Idempotency-Key` y `Command-Id` en `PUT` |
| **Paginación y orden** | N/A |
| **Offline / concurrencia** | Solo online |
| **Información sensible** | `nutrition` |
| **Evento de dominio** | Ninguno |
| **Reglas** | Guarda la versión del texto aceptado; una versión nueva exige aceptar otra vez |
| **Falla cerrada** | Una versión desconocida se rechaza |

## 8. Catálogo de eventos de dominio

Un evento se escribe en el outbox dentro de la transacción de su comando. Transporta identificadores, nunca contenido sensible.

| Dominio | Eventos |
| --- | --- |
| Identidad | `onboarding_attempt_started`, `eligibility_evaluated`, `person_activated`, `contact_changed`, `contact_verified`, `profile_claim_declared`, `profile_claim_revised`, `body_progress_recorded`, `health_context_declared`, `invitation_intent_decided`, `invitation_revoked`, `invitation_expired`, `professional_profile_updated`, `professional_credential_declared`, `professional_credential_revised`, `professional_credential_retired`, `professional_credential_verified`, `professional_credential_verification_revoked` |
| Organizaciones | `created`, `created_unclaimed`, `updated`, `site_created`, `site_updated`, `membership_created`, `membership_terminated`, `membership_resigned`, `role_granted`, `role_revoked`, `staff_invited`, `ownership_transferred`, `closed` |
| Relaciones | `client_invited`, `professional_assigned`, `professional_reassigned`, `substitution_proposed`, `substitution_decided`, `substitution_ended`, `substitution_expired`, `termination_requested`, `terminated` |
| Privacidad | `grant_created`, `grant_rejected`, `grant_frozen`, `grant_revoked`, `grant_review_due`, `scope_definition_published`, `session_visibility_denied`, `session_visibility_restored`, `erasure_requested`, `erasure_resolved`, `disposition_case_opened`, `disposition_executed`, `disposition_reapplied`, `legal_hold_applied`, `legal_hold_released`. As implemented (STUDIO-54..56): also `historical_access_case_opened` and `historical_access_case_closed`, with identifiers, purpose and instants and never the justification; there is no `historical_access_case_expired` |
| Catálogo | `private_movement_created`, `private_movement_updated`, `private_movement_archived`, `result_contract_published` |
| Planificación | `session_template_created`, `session_template_draft_updated`, `session_template_version_published`, `session_template_version_derived`, `session_template_version_deprecated`, `program_created`, `program_draft_updated`, `program_version_published`, `program_version_deprecated`, `assignment_created`, `assignment_detached`, `assignment_cancelled`, `assignment_continued`, `assignment_ended`, `session_rescheduled`, `prescription_revised`, `session_template_discarded`, `program_discarded` |
| Ejecución | `attempt_started`, `attempt_resumed`, `attempt_abandoned`, `session_started`, `finalized`, `primary_resolved`, `primary_changed`, `revised`, `annulled`, `observation_created`, `observation_revised`, `correction_proposed`, `correction_decided`, `correction_expired`, `derived_recomputed` |
| Nutrición | `meal_recorded`, `meal_revised`, `meal_deleted`, `goal_version_proposed`, `goal_version_activated`, `goal_version_accepted`, `goal_version_rejected`, `goal_proposals_cancelled` As implemented (STUDIO-61..65): `goal_version_proposed` carries `goal_version_id`, `person_id`, `relationship_id` and `organization_id`, never targets or rationale. Ending a relationship writes no `goal_proposals_cancelled`. |
| Pagos | `gateway_connected`, `gateway_revoked`, `plan_created`, `plan_version_published`, `plan_version_deprecated`, `subscription_started`, `subscription_suspended`, `subscription_reactivated`, `subscription_ended`, `payment_recorded`, `platform_plan_published`, `platform_plan_version_published`, `platform_subscription_started`, `platform_subscription_suspended`, `platform_subscription_reactivated`, `platform_subscription_ended`, `organization_premium_granted`, `organization_premium_revoked` |
| Soporte | `platform_role_granted`, `platform_role_revoked` |

## 9. Operaciones explícitamente fuera de V1

Se enumeran para que su ausencia sea una decisión registrada y no un olvido. Ninguna genera endpoint, tabla, permiso, scope ni placeholder en la baseline.

| Operación ausente | Motivo |
| --- | --- |
| Vincular una segunda cuenta externa a una persona | El modelo lo admite en cardinalidad; V1 no necesita el flujo |
| Fusionar o deduplicar dos personas | Excepcional; exige gobernanza que V1 no tiene |
| Crear disciplinas o tipos de actividad desde una organización | Reservado a la plataforma para conservar comparabilidad |
| Compartir contenido de entrenamiento entre organizaciones | Marketplace y publicación comercial están diferidos |
| Reservar clases, recursos o cupos | Booking diferido |
| Cualquier operación de cobro, orden, reembolso o membresía comercial | Commerce diferido |
| Conectar un wearable o ingerir raw de sensores en producción | `sensor_enriched` se valida con fixtures, sin conectores |
| Importar historial desde la cuenta de un tercero (API, conector o sincronización) | `ADR-044` solo admite un archivo que la persona exportó, y solo de fuerza |
| Un endpoint que devuelva "todos los datos" de una persona | No existe `all_data` en ninguna forma |
| Operaciones sobre menores, representantes o cuentas tuteladas | V1 es exclusiva para personas adultas |
| Mensajería, comunidad y eventos sociales | Diferidos |
| Nutrición clínica, suplementos, catálogo/proveedor de alimentos, recetas, menús, códigos de barras o IA nutricional | Fuera de la rebanada nutricional no clínica |
| Importar personas, comidas, objetivos, archivos o consentimientos desde Factory Fitness | Allfit V1 es greenfield; no existe contrato legacy |

## 10. Trazabilidad con los escenarios de Fase 2

| Escenario | Operaciones que lo recorren |
| --- | --- |
| 1. Persona Space-only | `IDN-001` → `IDN-002` → `IDN-003` → `IDN-004` → `EXE-004` → `EXE-005` → `EXE-006` → `EXE-014` |
| 2. Invitación Studio pendiente | `REL-001` sin ninguna operación de materialización |
| 3. Aceptación parcial | `REL-001` → `IDN-016` → `IDN-009` aceptando relación y rechazando programa; `PRV-001` posterior e independiente |
| 4. Persona Space preexistente acepta invitación | `IDN-016` → `IDN-009` reutilizando el mismo `person_id`, sin exponer `EXE-014` previo |
| 5. Práctica crece a equipo | `ORG-001` → `ORG-005` → `IDN-009` → `ORG-007` → `REL-003` sin cambiar `{orgId}` |
| 6. Dos relaciones y sesión oculta | `PRV-003` en dos relaciones → `PRV-006` sobre una → `EXE-017` y `EXE-019` divergentes |
| 7. Fin de relación y continuidad | `REL-007` u `REL-008` → `PLN-015` |
| 16. Nutrición Space | `NUT-001` → `NUT-003` → `NUT-005` |
| 17. Guía nutricional | `NUT-012` → `NUT-006` → `NUT-008` → `NUT-011` |
| 18. Nutrición frozen | `REL-007/008` cancela pendientes → `NUT-011` por caso histórico minimizado |
| 8. Disposición sin resurrección | `PRV-008` → `SYS-008` → `SYS-007` → `SYS-009` |
| 9. Núcleo multidisciplina | `PLN-003` en cuatro familias → `EXE-005` con segmentos híbridos → `EXE-006` validando el contrato congelado |
| 10. Capacidades diferidas | §9: ninguna operación de booking, commerce, marketplace, integrations o intelligence |

## 11. Decisiones cerradas en esta fase

Estas decisiones estaban explícitamente diferidas a Fase 3 en `DOMAIN_OWNERSHIP_MAP.md` §5.15, §6.18, §7.18, §8.21 y §9.22, y quedan resueltas aquí.

| # | Decisión | Resolución |
| --- | --- | --- |
| 1 | Catálogo de roles organizacionales | `owner`, `admin`, `coach`, `staff`. Sin roles personalizados |
| 2 | Alcance de rol por sede | No existe en V1; la sede es informativa |
| 3 | Autoridad de terminación de relación | Persona y `admin`/`owner` con efecto inmediato; el `coach` solicita |
| 4 | Motivo de terminación | Opcional; visible solo para quien lo declaró |
| 5 | Reactivación de una relación | Relación nueva, grants desde cero, enlazada a la anterior |
| 6 | Relaciones simultáneas persona–organización | Una activa por organización |
| 7 | Profesionales concurrentes | Un titular efectivo más suplencias acotadas **aceptadas por la persona** |
| 8 | Propuestas de corrección pendientes al terminar | Se cancelan; vencimiento ordinario de 30 días |
| 9 | Catálogo de `access_level` | `read` y `contribute` |
| 10 | Vigencia de los grants | Indefinida, con recordatorio de revisión a 12 meses que no corta acceso |
| 11 | Alcance de la auditoría de lectura | Toda lectura bajo grant, con actor humano; retención 24 meses |
| 12 | SLA de invalidación tras revocación | Transaccional e inmediato; sin caché de autorización |
| 13 | Jurisdicción | Colombia (Ley 1581, Decreto 1377) con techo GDPR; 30 días para supresión |
| 14 | Autoría del catálogo | Global solo plataforma, cargado por seed; movimientos privados por organización, **sin ruta de promoción en V1** |
| 15 | Disciplinas V1 e idiomas | Cuatro familias; catálogo solo en español, con estructura de alias lista |
| 16 | Materialización del calendario | En el comando de asignación, dentro de la transacción; sin job periódico |
| 17 | Límite de asignaciones simultáneas | Sin límite; los solapamientos se advierten |
| 18 | Autoridad de reprogramación | Solo el coach, y solo sobre la parte administrada |
| 19 | Zona horaria | La de la persona en el momento del hecho |
| 20 | Autoridad sobre la ejecución primaria | Solo la persona |
| 21 | Ventana de edición de una ejecución | Indefinida, append-only con revisiones |
| 22 | Notificación de revisiones profesionales | Obligatoria |
| 23 | Actores de soporte | `A10` diagnostica/solicita/ejerce su ventana; `A12` aprueba/audita sin ejercer; ambos sin acceso ordinario |
| 24 | Jobs de V1 | Los diez de §7.8, con credencial propia e idempotencia |
| 25 | Lectura de grants `frozen` | Caso histórico `<=24h`, membresía exacta, MFA, propósito cerrado, field-set histórico y auditoría por lectura; sin rol implícito |

Las decisiones 1, 7 y 23 introdujeron conceptos respecto a la primera aprobación de Fase 2. ADR-022, glosario, ownership y ERD conceptual quedaron recertificados con esos conceptos el 26 de julio de 2026.

## 12. Decisiones que esta matriz deja abiertas

| Decisión | Destino |
| --- | --- |
| Catálogo de verificadores y gobernanza break-glass | Cerrado por ADR-026 y [`V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md`](./V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md) |
| Diccionario exhaustivo de recursos y campos por versión de scope | `V1_RLS_MATRIX.md` |
| Condición RLS, índice y prueba positiva/negativa por operación | `V1_RLS_MATRIX.md` |
| Esquema de request/response, códigos de error y OpenAPI | `V1_SPACE_STUDIO_API_CONTRACTS.md` |
| Rate limits, cuotas, breakers, DLQ y SLO/RTO/RPO numéricos | `V1_DEGRADATION_AND_RECOVERY_MATRIX.md` |
| Nombres físicos, PKs, FKs, tipos, constraints e índices | Fase 4 |
| Estados y transiciones físicas exactas de cada entidad | Fase 4 |
| Estrategia de particionamiento de `ACCESS_EVENT` | Fase 4 |
| Plazos concretos de retención por categoría | Fase 4, sobre la jurisdicción decidida |

## 13. Estado de salida

Este documento cubre el primero de los cuatro entregables de la Fase 3. La fase **no** puede cerrarse con este documento solo.

La matriz de operaciones se considera completa cuando la revisión confirme que:

1. no existe una lectura o escritura de V1 fuera de este inventario;
2. cada ficha declara actor, filtros obligatorios, transacción, idempotencia, comportamiento offline, sensibilidad y evento;
3. ninguna operación concede acceso en vivo sin las diez condiciones de la fórmula ni acceso `frozen` sin ADR-023;
4. ninguna operación crea entidades de capacidades diferidas;
5. los diez escenarios de Fase 2 se recorren íntegramente con estas operaciones;
6. las decisiones de §11 se han incorporado al ADR, al glosario y al alcance V1.

**Siguiente entregable:** [`V1_RLS_MATRIX.md`](./V1_RLS_MATRIX.md), que deriva de estas fichas la condición de fila, los grants mínimos, el índice requerido y las pruebas positiva y negativa de cada operación.
