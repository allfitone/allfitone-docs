# Gobernanza de verificadores y break-glass V1

**Versión de revisión:** 4<br>
**Fecha:** 3 de agosto de 2026<br>
**Fase:** 3 — Seguridad, operaciones excepcionales y contratos<br>
**Estado:** aprobado y recertificado — P1-02 y P2 nutricional resueltos<br>
**Fuente normativa:** [ADR-026 y ADR-028](../02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md)<br>
**Antecedentes normativos:** [ADR-018 y ADR-022](../02_ARCHITECTURE_DECISIONS/ALLFIT_ARCHITECTURE_DECISIONS.md)

## 1. Propósito y fronteras

Este contrato cierra:

- quién puede otorgar `authority_verified`;
- qué evidencia puede evaluar;
- cómo se provisionan, vencen y revisan los deberes de plataforma;
- quién y cuántas personas aprueban break-glass;
- conflictos de interés;
- duración, cierre, revisión posterior y respuesta ante abuso.
- la diferencia entre el rol base `allfit_admin` y los deberes que autorizan cada operación de Backoffice.

Verificación y break-glass son capacidades diferentes. Verificar afirma que una fuente competente respaldó una credencial concreta. Break-glass permite diagnosticar excepcionalmente datos de una persona sin alterar su consentimiento ni sus datos. La opción B de ADR-028 queda ratificada: `allfit_admin` sólo habilita el inicio de sesión y nunca sustituye una asignación de deber vigente.

## 2. Catálogo cerrado de verificadores V1

### 2.1 Actor y deber

El único actor humano que registra una verificación V1 es `A11` con:

```text
platform_duty = verify_professional_credentials
authn_assurance >= AAL2
duty_valid_from <= now() < duty_valid_to
```

`A11/curate_catalog` y `A11/verify_professional_credentials` son deberes separados. Un mismo empleado puede recibir ambos, pero ninguno implica al otro.

### 2.2 Afirmaciones y evidencia admitidas

| Código de política | Afirmación verificable | Método permitido | Evidencia mínima | Vigencia máxima |
| --- | --- | --- | --- | --- |
| `professional_credential.registry.v1` | Licencia, matrícula o registro profesional | `official_registry_lookup` | autoridad, jurisdicción, tipo de credencial, referencia del registro, estado consultado, `checked_at`, fingerprint y versión de política | menor entre vencimiento de la autoridad y 12 meses |
| `professional_credential.issuer.v1` | Certificación profesional emitida por entidad competente | `issuer_confirmation` | emisor, tipo de credencial, referencia de confirmación, estado, `checked_at`, fingerprint y versión de política | menor entre vencimiento del emisor y 12 meses |

No se almacena una copia del documento. Si la fuente exige recibir un archivo o texto libre que no puede minimizarse a esos campos, V1 responde `unverifiable`.

Nutrición usa el `credential_type_code = nutrition_professional`. No crea otro método de verificación: debe resolverse por una de las dos políticas anteriores y permanecer `verified`, dentro de `valid_from..valid_to` y sin evento posterior de revocación. La etiqueta solo habilita el predicado adicional de ADR-027; no concede `guide_nutrition`, asignación, relación ni scopes.

### 2.3 Exclusiones explícitas

No usan `PROFESSIONAL_CREDENTIAL_VERIFICATION`:

- email de autenticación: lo verifica WorkOS AuthKit;
- teléfono: exige el contrato separado de prueba de control definido por ADR-002/`DB-P5-019`;
- declaración 18+: es evidencia de elegibilidad `person_declared`, no identidad documental;
- nombre o identidad civil;
- salud, dolor, biometría o medidas corporales;
- experiencia subjetiva, objetivos o nivel;
- afiliación a gimnasio: la demuestra la membresía/relación;
- mediciones de dispositivo;
- perfil completo o reputación general.

### 2.4 Conflictos de interés

El servidor rechaza la decisión si el `A11`:

1. es el sujeto;
2. declaró, revisó o corrigió la credencial evaluada;
3. tiene membresía activa en una organización donde el sujeto también la tenga;
4. tiene una relación o asignación profesional efectiva con el sujeto;
5. decidió la verificación apelada.

El verificador declara ausencia de conflicto, pero la declaración no reemplaza las comprobaciones físicas disponibles. Si una comprobación no puede resolverse, el resultado es `unverifiable`.

### 2.5 Ciclo de vida

```text
versión exacta de credencial profesional existente
  → evaluación no persistida como autoridad
  → verified | rejected | unverifiable (decisión append-only)
  → expired por valid_to | revoked por otro evento
  → nueva verificación, si corresponde
```

- `valid_to` es obligatorio.
- Renovar crea otro registro; no extiende el anterior.
- Revocar conserva el hecho histórico y emite `identity.professional_credential_verification_revoked.v1`.
- Una apelación la decide un `A11` distinto y crea otro evento enlazado.
- `verified` no cambia la procedencia de la credencial, no verifica el perfil completo ni amplía scopes.

## 3. Catálogo break-glass V1

### 3.1 Propósitos

Toda solicitud declara exactamente uno:

| Código | Uso permitido |
| --- | --- |
| `person_support_request` | Resolver una solicitud trazable iniciada por la persona |
| `service_incident_diagnosis` | Diagnosticar una falla concreta del servicio |
| `security_incident_investigation` | Investigar un incidente de seguridad registrado |
| `data_integrity_recovery` | Confirmar o recuperar integridad después de una falla |
| `legal_or_regulatory_request` | Atender un requerimiento legal/regulatorio validado por privacidad |

`case_reference` es obligatorio, opaco y no contiene PII. No existe `other`.

### 3.2 Categorías, quorum y duración

| Nivel | Categorías | Aprobaciones | Duración máxima |
| --- | --- | ---: | ---: |
| Estándar | `relationship_training`, `prior_training_history`, `nutrition_guidance` | 1 `A12` | 30 minutos |
| Restringido | `body_progress`, `health_context`, `nutrition_intake`; incluidos los medios privados propios de las dos primeras categorías | 2 `A12` distintos | 15 minutos |
| Prohibido | `nutrition_media`, identidad/contacto, secretos de autenticación, pagos, raw de sensores, evidencia documental, notas privadas organizacionales | No aprobable | 0 |

Una solicitud mixta hereda el nivel más restrictivo. Guidance + intake resulta restringida; cualquier solicitud que incluya `nutrition_media` se rechaza antes de abrir ventana y registra el intento. El servidor calcula `sensitivity_tier`, `required_approvals` y duración máxima; el cliente no los declara.

### 3.3 Actores

- `A10/request_break_glass`: crea y, una vez aprobado, ejerce/cierra solo su expediente.
- `A12/approve_break_glass`: aprueba o rechaza; nunca ejerce.
- `A12/audit_break_glass`: revisa posteriormente; para el mismo caso no puede ser solicitante ni aprobador.

Todos exigen AAL2 y deber vigente. La falta de personas independientes hace que la capacidad falle cerrada.

### 3.4 Conflictos

Solicitante, aprobador y revisor:

- nunca pueden ser el sujeto;
- no pueden compartir membresía organizacional activa o relación profesional con el sujeto;
- no pueden repetir función incompatible dentro del caso;
- no pueden decidir con deber vencido o suspendido.

Dos aprobaciones restringidas deben tener `approver_person_id` distintos. El mismo actor no puede decidir dos veces.

## 4. Estado y transiciones

### 4.1 Solicitud

La solicitud conserva:

```text
requester_person_id
subject_person_id
policy_code = break_glass.v1
categories
purpose
case_reference
sensitivity_tier
required_approvals
requested_duration_minutes
requested_at
request_expires_at
status
window_starts_at
window_ends_at
closed_at
reviewed_at
reviewed_by_person_id
review_outcome
```

Sujeto, categorías, propósito, caso y duración son inmutables.

### 4.2 Máquina de estados

```text
requested
  ├─ rechazo de cualquier A12 ───────────→ rejected
  ├─ vence a los 30 min ─────────────────→ expired
  └─ aprobaciones < quorum ───────────────→ requested
       └─ quorum completo ────────────────→ approved
            ├─ cierre A10 / suspensión ───→ closed
            └─ window_ends_at alcanzado ──→ expired
```

La última aprobación abre la ventana: `window_starts_at = now()` y `window_ends_at` se calcula con la duración permitida. No hay extensión; continuar requiere una solicitud nueva.

### 4.3 Aprobaciones

`break_glass_approvals` usa:

```text
UNIQUE (request_id, approver_person_id)
```

No usa `UNIQUE (request_id)`. Un rechazo es terminal. Una aprobación parcial no concede acceso.

### 4.4 Ejercicio

Cada lectura:

1. vuelve a validar actor, deber, AAL2, sujeto, categorías, propósito, estado, quorum y timestamp;
2. verifica que el recurso solicitado pertenece a una categoría aprobada;
3. inserta `break_glass_event` y `ACCESS_EVENT` con resultado `allowed` o `denied`;
4. solo después devuelve el contenido cuando el resultado es `allowed`.

No se cachea, no se deduplica y no habilita escritura, exportación masiva o consulta de otra persona. Nutrición se sirve únicamente desde proyecciones cerradas de guidance o intake; una ventana nunca autoriza `OP-NUT-013`, storage, `media_ref`, URLs o bytes.

## 5. Provisionamiento y revisión

La fuente de autoridad es el **registro interno de deberes de plataforma**, separado de WorkOS AuthKit, de los roles PostgreSQL y del rol base de Backoffice. Cada asignación conserva como mínimo:

```text
assignment_id
person_id
duty_code
status
valid_from
valid_to
required_aal = 2
granted_by_person_id
recertified_by_person_id
recertified_at
revoked_by_person_id
revoked_at
```

El backend lo consulta por un canal servidor-a-servidor en cada transacción sensible y solo entonces establece `app.platform_duty`. Un claim, role o permission de WorkOS, header, payload o valor cacheado no sustituye esa comprobación. El registro conserva su propia auditoría de altas, recertificaciones, suspensiones y revocaciones; si no puede confirmar una asignación vigente, verificación y break-glass fallan cerrados.

| Deber | Modo | Otorga | Vigencia máxima | Recertifica |
| --- | --- | --- | ---: | --- |
| `view_platform_metrics` | `A10` | Producto/operaciones | 90 días | Seguridad/privacidad |
| `diagnose_support_metadata` | `A10` | Responsable de soporte | 90 días | Seguridad/privacidad |
| `view_billing_metadata` | `A10` | Finanzas + seguridad | 90 días | Seguridad/privacidad |
| `manage_organization_lifecycle` | `A10` | Producto + operaciones | 90 días | Seguridad/privacidad |
| `request_break_glass` | `A10` | Responsable de soporte | 90 días | Seguridad/privacidad |
| `verify_professional_credentials` | `A11` | Seguridad + producto de identidad | 90 días | Seguridad/privacidad |
| `curate_global_catalog` | `A11` | Producto de catálogo | 90 días | Seguridad/privacidad |
| `manage_platform_commercial` | `A11` | Producto + finanzas | 90 días | Seguridad/privacidad |
| `manage_platform_access` | `A12` | Seguridad/privacidad | 90 días | Responsable distinto |
| `audit_platform_access` | `A12` | Seguridad/privacidad | 90 días | Responsable distinto |
| `approve_break_glass` | `A12` | Seguridad/privacidad | 90 días | Responsable distinto |
| `audit_break_glass` | `A12` | Seguridad/privacidad | 90 días | Responsable distinto |
| `manage_privacy_requests` | `A12` | Privacidad/legal | 90 días | Responsable distinto |

Reglas:

- no hay autoasignación;
- el rol base y los deberes son registros distintos: tener uno no implica el otro;
- los deberes no vienen de organizaciones ni de headers;
- toda operación exige `authn_assurance >= required_aal`; V1 fija `required_aal = 2` para el catálogo completo;
- el modo `A10/A11/A12` se deriva del deber ejercido y nunca se acepta desde el cliente;
- quitar o vencer `request_break_glass` cierra inmediatamente ventanas abiertas del actor;
- retirar el rol base invalida todos los deberes efectivos de esa persona y revoca su sesión, sin borrar historia;
- el bootstrap inicial no es una excepción de negocio: dos personas existentes se otorgan de forma cruzada rol base y `manage_platform_access` en una ceremonia auditada con `allfit_migrator`; no existe seed o endpoint para el primer administrador;
- el job de recertificación no es la frontera de seguridad: cada operación comprueba `duty_valid_to`;
- el 100% de ventanas ejercidas se revisa dentro de las 24 horas corridas siguientes al primer ejercicio por un auditor independiente;
- las ventanas restringidas, denegaciones y alertas siempre entran a la cola prioritaria.

## 6. Abuso e incidentes

### 6.1 Severidad crítica

Constituyen abuso crítico:

- intentar escribir mediante break-glass;
- solicitar o consultar una categoría prohibida;
- ejercer una ventana ajena;
- falsificar propósito/caso o intentar alterar auditoría;
- verificar con conflicto conocido o evidencia fabricada.

Respuesta atómica o coordinada:

1. denegar;
2. cerrar ventanas abiertas del actor;
3. suspender su deber de plataforma;
4. crear incidente de seguridad con referencias a eventos;
5. preservar auditoría y evidencias mínimas;
6. revisar accesos anteriores del actor;
7. notificar a seguridad/privacidad y aplicar la política de comunicación a personas afectadas.

### 6.2 Denegaciones operativas

Ventana vencida, categoría fuera del alcance aprobado o quorum incompleto producen `denied` y alerta. No renuevan ni amplían el acceso. Reincidencia se eleva a investigación y posible suspensión según el runbook de seguridad.

## 7. Pruebas obligatorias

### Rol base y deberes

| ID | Caso |
| --- | --- |
| `T-DUTY-01` | `allfit_admin` sin deber puede autenticar, pero toda operación de Backoffice es denegada. |
| `T-DUTY-02` | Un deber declarado por header, grupo o payload y ausente en `platform_duty_assignments` no concede acceso. |
| `T-DUTY-03` | Nadie se asigna a sí mismo rol o deber; retirar el último rol base falla. |
| `T-DUTY-04` | Deber vencido, suspendido o revocado falla en la siguiente transacción aunque la sesión siga viva. |
| `T-DUTY-05` | Revocar rol base cierra sesión, invalida deberes y ventanas, y conserva todo el historial. |
| `T-DUTY-06` | Una operación A10, A11 o A12 con deber de otro modo es denegada. |
| `T-DUTY-07` | La proyección ordinaria no devuelve nombre, contacto completo ni contenido personal. |
| `T-DUTY-08` | Las tablas de roles/deberes no admiten `DELETE` ni modificación retroactiva en runtime. |
| `T-ROLE-6` | El bootstrap sólo funciona con `allfit_migrator`, dos personas distintas, asignaciones cruzadas y una única transacción; cualquier rol runtime o autoasignación falla. |

### Verificación

| ID | Demostración |
| --- | --- |
| `T-VG-01` | `A11/curate_catalog` sin asignación vigente —o con registro interno no verificable— recibe denegación. |
| `T-VG-02` | Solo registro oficial o confirmación de emisor pueden producir `verified`. |
| `T-VG-03` | Documento, edad, salud, dispositivo o perfil completo fallan como no verificables. |
| `T-VG-04` | Sujeto, autor, miembro compartido o profesional asignado no verifican. |
| `T-VG-05` | `valid_to` nunca supera vencimiento de fuente ni doce meses. |
| `T-VG-06` | Renovación, revocación y apelación son append-only y la apelación usa otro actor. |

### Break-glass

| ID | Demostración |
| --- | --- |
| `T-BGG-01` | `nutrition_guidance` abre como estándar con una aprobación; `nutrition_intake` es restringida y no abre con una sola. |
| `T-BGG-02` | Dos aprobaciones del mismo A12 no completan quorum. |
| `T-BGG-03` | Cualquier rechazo cierra la solicitud. |
| `T-BGG-04` | Pendiente vence a los 30 minutos; guidance estándar dura máximo 30 e intake restringido máximo 15. |
| `T-BGG-05` | Actor, deber, AAL2 y conflictos se reevalúan en solicitud, decisión y ejercicio; registro interno no disponible falla cerrado. |
| `T-BGG-06` | `nutrition_media`, las demás categorías prohibidas y el alcance total nunca son aprobables ni persistibles como ventana. |
| `T-BGG-07` | A10 no aprueba; A12 no ejerce; otro A10 no usa ni cierra la ventana. |
| `T-BGG-08` | Cada lectura permitida o denegada, incluidas guidance/intake, escribe `break_glass_event` y `ACCESS_EVENT` antes de entregar contenido. |
| `T-BGG-09` | Vencer/revocar el deber corta acceso aunque el job no haya corrido. |
| `T-BGG-10` | Todo caso ejercido recibe revisión independiente dentro de las 24 horas corridas siguientes al primer ejercicio. |
| `T-BGG-11` | Intento de escritura, `nutrition_media`, OP-NUT-013/storage u otra categoría prohibida cierra ventanas, suspende deber y abre incidente. |
| `T-BGG-12` | La persona ve actor, propósito, instante, categoría nutricional y resultado de cada ejercicio que la afecta. |

## 8. Resultado

ADR-028 ratifica la opción B y materializa cinco tablas `support`: rol base, deberes y los tres expedientes break-glass. Guidance es estándar, intake restringida y media prohibida/no persistible. Fase 5 debe materializar constraints, funciones y pruebas; ningún seed asigna rol o deber de plataforma por defecto.
