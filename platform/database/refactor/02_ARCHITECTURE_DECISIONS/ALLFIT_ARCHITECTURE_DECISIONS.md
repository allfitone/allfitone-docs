# ADR — Decisiones de arquitectura de Allfit

**Estado general:** mixto; cada ADR conserva su estado y la ejecución avanza con gates por rebanada<br>
**Fecha de consolidación:** 5 de agosto de 2026<br>
**Alcance:** identidad, invitaciones, autenticación, acceso a PostgreSQL, operación profesional, consentimiento, terminación de relaciones, retención y disposición de datos, entrenamiento multidisciplina, Nutrición no clínica y topología de repositorios.

## Índice de decisiones

| ADR | Decisión |
| --- | --- |
| ADR-001 | Registro directo en Space e invitaciones opcionales desde Studio |
| ADR-002 | WorkOS AuthKit para autenticación y Supabase únicamente como PostgreSQL |
| ADR-003 | Núcleo de entrenamiento multidisciplina |
| ADR-004 | Operación profesional siempre dentro de una organización |
| ADR-005 | Terminación de relaciones y retención restringida de datos |
| ADR-006 | Evolución de práctica unipersonal a equipo sin cambiar de organización |
| ADR-007 | Categorías de consentimiento explícito para V1 |
| ADR-008 | Intenciones tipadas y aceptación parcial de invitaciones |
| ADR-009 | Versionado independiente e inmutable de plantillas de sesión |
| ADR-010 | Múltiples intentos y una ejecución primaria por sesión planificada |
| ADR-011 | Correcciones profesionales sin sobrescribir ejecuciones ajenas |
| ADR-012 | Eliminación, anonimización y conservación restringida por categoría |
| ADR-013 | Contratos mínimos y versionados de resultados por tipo de actividad |
| ADR-014 | Independencia funcional sin tolerancia física separada en V1 |
| ADR-015 | Consentimiento a la parte responsable con acceso por profesionales asignados |
| ADR-016 | Contratos versionados de campos para los scopes V1 |
| ADR-017 | V1 exclusiva para personas adultas, sin representación de menores |
| ADR-018 | Procedencia explícita y coexistencia de afirmaciones del perfil |
| ADR-019 | Desacoplar y pausar asignaciones al terminar una relación |
| ADR-020 | Ocultación de sesiones autónomas por relación |
| ADR-021 | Capacidades diferidas sin modelo físico especulativo en V1 |
| ADR-022 | Decisiones operativas de Fase 3: rol staff, suplencia profesional y soporte con break-glass |
| ADR-023 | Acceso histórico restringido a grants frozen |
| ADR-024 | Integridad compuesta entre persona, organización y relación |
| ADR-025 | Idempotencia durable independiente del replay HTTP |
| ADR-026 | Gobernanza cerrada de verificadores y acceso break-glass |
| ADR-027 | Nutrición personal y guía profesional no clínica en V1 |
| ADR-028 | Backoffice con rol base, deberes temporales y separación break-glass (partially superseded by ADR-046) |
| ADR-029 | Monorepo de implementación con deployables independientes |
| ADR-030 | Detalle por serie y superseries en la planificación de fuerza |
| ADR-031 | La portada de una rutina la pone su programa, y sale del catálogo |
| ADR-032 | Un programa puede no tener fin, y la semana que no existe la siembra quien la va a enseñar |
| ADR-033 | La serie ejecutada dice de qué tipo fue, y el esfuerzo se registra al entrenar |
| ADR-034 | Una sesión es una lista de ejercicios, y cada serie pertenece a uno |
| ADR-035 | El descanso viaja con la sesión y se cuenta al marcar la serie |
| ADR-036 | El cierre de un entreno se resume y se comparte; récords, racha y número son derivados |
| ADR-037 | El historial de Space muestra lo terminado, y cada fila se resume al leer |
| ADR-038 | La persona abre, corrige, anula y repite un entreno terminado |
| ADR-039 | Las fotos de comida viven en un almacén privado S3 (proveedor sustituido por ADR-042) |
| ADR-040 | Alcance V1 de nutrición en Space |
| ADR-041 | Reconocer y buscar alimentos al registrar una comida |
| ADR-042 | Las fotos de comida viven en Cloudflare R2, en Estados Unidos |
| ADR-043 | Allfit Pro: se paga con la compra integrada de cada tienda y se resuelve al leer |
| ADR-044 | La persona trae su historial de otra app, y entra como entrenamiento suyo |
| ADR-046 | An Allfit admin acts with the full authority of the platform |

Cada sección conserva su contexto, decisión, invariantes, consecuencias y pruebas. Las nuevas decisiones de arquitectura de esta refactorización deben añadirse a este mismo documento.

---

## ADR-001 — Registro directo e invitaciones separadas por superficie

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

Allfit Space debe permitir que cualquier persona elegible se registre y use su Fitness ID de forma autónoma, sin depender de una organización o invitación. Allfit Studio también necesita proponer relaciones con profesionales u organizaciones, pero una organización no debe crear credenciales, aceptar términos, completar perfiles ni tomar decisiones de privacidad en nombre de otra persona.

### Decisión

Existen tres entradas personales al mismo flujo de identidad:

1. **Registro directo en Space:** la persona inicia personalmente el registro mediante WorkOS AuthKit, acredita elegibilidad adulta, acepta términos y completa onboarding sin invitación.
2. **Registro directo desde Studio:** la persona inicia personalmente el registro mediante la aplicación WorkOS de Studio y completa el mismo onboarding canónico desde la superficie Studio antes de crear u operar una organización.
3. **Invitación opcional emitida desde Studio:** la organización propone un vínculo y la persona se registra o inicia sesión por sí misma. Una invitación de equipo se entrega por email y se consulta y decide exclusivamente en Studio; una invitación de cliente se consulta y decide en Space.

La invitación no es requisito para crear una cuenta o activar el Fitness ID. El registro directo, se presente desde Space o Studio, crea únicamente persona, cuenta y evidencia propia del onboarding; no crea organización, membresía, relación profesional, asignación ni grants de servicio.

Allfit Studio solo puede iniciar propuestas hacia otra persona mediante una invitación. El canal V1 de equipo es exclusivamente email; otros canales no se infieren ni se habilitan por compartir el modelo con invitaciones de cliente. La activación disponible en Studio es autoservicio del titular autenticado y no concede a la organización facultad alguna para activarlo a él o a terceros.

Studio nunca puede:

- usar la operación administrativa `Create User` de WorkOS o cualquier flujo equivalente para registrar al invitado;
- crear una persona canónica en `identity.people`;
- completar un perfil fitness;
- aceptar términos o consentimientos;
- crear una membresía o relación efectiva antes de la aceptación;
- asignar de forma efectiva un programa a alguien que todavía no se ha registrado.

Antes de la aceptación existe únicamente una invitación, no una persona provisional. La persona y cuenta se materializan cuando su titular verifica el contacto, acredita elegibilidad y completa personalmente el onboarding. La activación puede asociar el hash de la invitación para conservar continuidad, pero nunca la acepta automáticamente. En el registro directo de Space no existe invitación ni debe crearse una artificial.

### Invariantes

1. Space permite registro directo sin invitación, organización o relación profesional.
2. Una invitación no es una persona ni una cuenta.
3. El destino de una invitación no se usa para crear automáticamente un usuario de WorkOS.
4. Solo el titular que controla el contacto puede iniciar/completar el registro o autenticación mediante AuthKit.
5. Si la invitación usa email, el email verificado por WorkOS debe coincidir exactamente con el destino normalizado. Un email no verificado no puede decidir.
6. Una invitación no concede permisos ni acceso a datos.
7. La aceptación materializa únicamente las intenciones que la persona acepta.
8. Una persona ya registrada en Allfit acepta la invitación con su identidad existente; no se crea otra.
9. El registro directo no materializa intenciones, membresías, relaciones, asignaciones o grants inexistentes.
10. Ambos caminos producen el mismo tipo de persona, cuenta y Fitness ID canónicos.
11. El flujo completo es idempotente, transaccional y auditable.

### Flujo de registro directo en Space

```mermaid
sequenceDiagram
    participant P as "Persona"
    participant Space as "Allfit Space"
    participant Auth as "WorkOS AuthKit"
    participant DB as "Dominio Allfit"

    P->>Space: Iniciar registro sin invitación
    Space->>Auth: Registro/autenticación iniciados por la persona
    Auth-->>P: Verificar email
    P->>DB: Elegibilidad, términos y onboarding
    DB->>DB: Crear/vincular persona, cuenta y Fitness ID
    DB-->>P: Registro autónomo completado
```

### Flujo de invitación desde Studio

```mermaid
sequenceDiagram
    participant Studio as "Allfit Studio"
    participant Inv as "Servicio de invitaciones"
    participant P as "Persona invitada en Studio o Space"
    participant Auth as "WorkOS AuthKit"
    participant DB as "Dominio Allfit"

    Studio->>Inv: Invitar + propósito tipado
    Inv->>DB: Guardar invitación y token hasheado
    Inv-->>P: Enviar enlace a la superficie del propósito
    P->>Auth: Iniciar personalmente registro/autenticación
    Auth-->>P: Verificar email
    P->>DB: Completar onboarding si aplica y decidir
    DB->>DB: Validar token, contacto, vigencia e idempotencia
    DB->>DB: Crear/vincular persona y materializar solo intenciones aceptadas
    DB-->>P: Registro completado
```

### Modelo conceptual de la invitación

`identity.invitations` debe contener como mínimo:

- `id`;
- `organization_id`;
- `invited_by_person_id`;
- `channel`: `email` en invitaciones de equipo V1; otros canales solo cuando el propósito los apruebe explícitamente;
- destino normalizado y protegido;
- `token_hash`, nunca el token plano;
- propósito/tipo de invitación;
- `status`;
- `expires_at`;
- `sent_at`, `delivered_at`, `completed_at`, `revoked_at`;
- `completed_by_person_id`, nullable hasta completar el flujo;
- timestamps y datos mínimos de auditoría.

Las propuestas viven como filas independientes en `identity.invitation_intents`, con tipo, estado, dependencias y referencias tipadas. La invitación es el sobre; no debe almacenar una aceptación general equivalente a “aceptar todo”.

Estados recomendados:

```text
pending → sent → delivered → opened → completed
                       ├── expired
                       ├── revoked
                       └── blocked
```

No crear una tabla “persona provisional”. Si se necesita CRM antes del registro, el lead/contacto pertenece al dominio CRM y tampoco debe confundirse con `identity.people`.

### Aceptación transaccional

La operación de aceptación debe:

1. verificar el access token de AuthKit —firma mediante JWKS, `iss`, `exp`, `iat`, `sub`, `sid` y `client_id` de la WorkOS Application esperada—;
2. comprobar que la evidencia aprobada de control del canal coincide con la invitación;
3. validar token, expiración, estado, organización e intenciones;
4. encontrar la persona ya vinculada a la cuenta o crearla durante onboarding;
5. registrar aceptación o rechazo individual de cada intención presentada;
6. crear únicamente membresías, relaciones y asignaciones expresamente aceptadas y cuyas dependencias se cumplan;
7. registrar consentimientos explícitos por separado;
8. marcar la invitación como completada aunque alguna intención opcional haya sido rechazada;
9. registrar auditoría/outbox;
10. completar todo en una única transacción idempotente.

### Seguridad

- Tokens aleatorios de alta entropía, de un solo uso y almacenados como hash.
- Expiración corta y revocación inmediata.
- Rate limiting por organización, actor, destino e IP.
- Respuestas que no permitan enumerar si un contacto ya tiene cuenta.
- Acceso a invitaciones limitado al emisor autorizado y al destinatario durante aceptación.
- Las credenciales de PostgreSQL permanecen exclusivamente en backend.
- El contacto se retiene únicamente durante el periodo necesario.
- Toda aceptación, rechazo, expiración y revocación queda auditada.

AuthKit verifica email como identidad primaria. La ruta de invitación por celular queda bloqueada hasta decidir e implementar un OTP propio o proveedor específico, con propósito, expiración, rate limit, evidencia y retención. Un desafío SMS antifraude de WorkOS Radar no se considera automáticamente prueba de identidad para aceptar una invitación.

### Consecuencias

#### Positivas

- La persona controla su identidad, términos y privacidad.
- Studio no necesita permisos administrativos para crear usuarios en WorkOS.
- Se evita crear usuarios falsos, incompletos o duplicados.
- Las relaciones efectivas siempre apuntan a personas verificadas.
- El modelo de RLS es más simple: no existen personas activas sin identidad autenticable.

#### Costos

- Studio no puede asignar ni operar sobre una persona antes de que acepte.
- Los flujos comerciales deben distinguir invitación pendiente de cliente activo.
- La conversión depende de entrega y aceptación del destinatario.
- Se necesita un proceso robusto para reenvío, expiración y cambio de contacto.

### Escenarios de prueba obligatorios

1. Studio crea invitación y no aparece ningún usuario WorkOS ni fila en `identity.people`.
2. Un token expirado o revocado no puede aceptarse.
3. Una cuenta con email/celular diferente no puede aceptar la invitación.
4. Una persona existente acepta sin crear duplicados.
5. Dos reintentos concurrentes producen una sola aceptación.
6. Una invitación aceptada no puede reutilizarse.
7. Rechazar una intención no crea relación, asignación ni consentimiento.
8. Un miembro sin permiso no puede invitar ni consultar contactos invitados.
9. Aceptar la relación y rechazar el programa produce una relación sin asignación.
10. Completar una invitación nunca concede scopes de datos, términos, pagos o usos secundarios implícitos.
11. Una persona se registra directamente en Space sin que exista o se cree una invitación.
12. El registro directo no crea organización, membresía, relación, asignación ni grant.
13. Esa persona acepta después una invitación de Studio usando el mismo `person_id` y Fitness ID.

---

## ADR-002 — WorkOS AuthKit para autenticación y Supabase únicamente como PostgreSQL

**Estado:** aceptada para V1<br>
**Fecha:** 3 de agosto de 2026; ampliada el 12 de agosto de 2026<br>
**Supersedida parcialmente por:** ADR-029 sustituye únicamente la separación física de los repositorios de producto; conserva Applications, deployables, identidad y superficies independientes

### Contexto

Allfit Studio y Allfit Space compartirán identidad y datos. En el momento de esta decisión se proyectaron repositorios y aplicaciones independientes; ADR-029 consolidó después el código en un monorepo sin cambiar la independencia de las aplicaciones ni de sus despliegues. Se decidió no utilizar Supabase Auth ni acceso directo desde los clientes a la Data API de Supabase.

### Decisión

- WorkOS AuthKit será la única fuente de autenticación.
- Existirá un environment de WorkOS aislado por ambiente de Allfit.
- Space, Studio y Backoffice tendrán WorkOS Applications separadas dentro del mismo environment y compartirán la misma base de usuarios de ese environment.
- Supabase se usará únicamente como servicio administrado de PostgreSQL.
- Space y Studio nunca se conectarán directamente a PostgreSQL ni usarán claves `anon`/`service_role`.
- Una API/backend propio verificará los JWT de WorkOS AuthKit y será el único acceso runtime a la BD.
- Personas, organizaciones, roles, relaciones, deberes y consentimientos de negocio vivirán en PostgreSQL. Las Organizations, roles, permissions y claims organizacionales de WorkOS no son autoridad de dominio para Allfit V1.
- La RLS de PostgreSQL se conservará como defensa en profundidad usando contexto transaccional establecido por el backend.

### Arquitectura

```mermaid
flowchart LR
    space["Allfit Space"] --> spaceClient["WorkOS Application<br/>Space · cliente público PKCE"]
    studio["Allfit Studio"] --> studioClient["WorkOS Application<br/>Studio"]
    backoffice["Allfit Backoffice"] --> backofficeClient["WorkOS Application<br/>Backoffice"]

    spaceClient --> pool["WorkOS environment<br/>por ambiente Allfit"]
    studioClient --> pool
    backofficeClient --> pool

    space --> api["API Allfit"]
    studio --> api
    backoffice --> api
    pool -->|"JWT firmado"| api

    api -->|"conexión pooled<br/>+ contexto RLS"| db[("Supabase PostgreSQL")]
```

### Topología por ambiente

```text
development
├── WorkOS environment allfit-dev
│   ├── WorkOS Application Space dev
│   ├── WorkOS Application Studio dev
│   └── WorkOS Application Backoffice dev
└── Supabase project allfit-dev

staging
├── WorkOS environment allfit-staging
│   ├── WorkOS Application Space staging
│   ├── WorkOS Application Studio staging
│   └── WorkOS Application Backoffice staging
└── Supabase project allfit-staging

production
├── WorkOS environment allfit-prod
│   ├── WorkOS Application Space prod
│   ├── WorkOS Application Studio prod
│   └── WorkOS Application Backoffice prod
└── Supabase project allfit-prod
```

No se crea un environment por producto: las Applications del mismo environment comparten usuarios sin duplicar cuentas. Los environments sí permanecen aislados entre development, staging y production; sus usuarios, claves, webhooks y configuración no se promueven automáticamente.

Space es una aplicación móvil pública y usa Authorization Code con PKCE; nunca incorpora una API key o client secret de WorkOS en el bundle. Studio y Backoffice usan el flujo y almacenamiento de sesión apropiados para aplicaciones web, con redirect URIs y políticas de sesión independientes.

### Identidad externa y persona de dominio

WorkOS AuthKit autentica un usuario mediante:

- `issuer`: claim `iss` del environment o dominio de autenticación configurado;
- `subject`: claim `sub`, que contiene el WorkOS user ID;
- `session_id`: claim `sid` de la sesión;
- `client_id`: WorkOS Application que obtuvo el access token;
- `iat`, `exp` y demás claims admitidos por el contrato de sesión.

PostgreSQL mantiene la identidad de dominio:

```text
identity.people
└── identity.accounts
    ├── provider = 'workos'
    ├── issuer
    ├── subject          # WorkOS user ID del claim sub
    ├── person_id
    ├── created_at
    └── last_seen_at
```

Constraints recomendados:

- `unique (provider, issuer, subject)`;
- un usuario WorkOS vinculado pertenece a una sola persona de dominio;
- no usar email o celular como FK o identificador estable;
- email/celular se consideran atributos verificables y mutables.

### Verificación de cada petición

La API debe validar antes de consultar la BD:

1. firma contra el JWKS correspondiente al `client_id` de la WorkOS Application;
2. `iss` permitido para el environment o dominio de autenticación del ambiente;
3. `exp`, `iat` y temporalidad;
4. `sub` con formato de WorkOS user ID y `sid` de sesión;
5. `client_id` permitido para la superficie Space, Studio o Backoffice solicitada;
6. estado local de la cuenta/persona;
7. membresías, relaciones, deberes y consentimientos en PostgreSQL.

Los claims `org_id`, `role` y `permissions` de WorkOS se ignoran para autorización de negocio. La organización efectiva continúa viajando explícitamente en la ruta de Studio y se valida contra PostgreSQL.

El claim `auth_time` permite exigir autenticación reciente mediante `max_age`, pero **no demuestra por sí solo que hubo MFA**. La política MFA de AuthKit se configura por environment y no se aplica de la misma forma a usuarios SSO, por lo que activarla no basta para inferir AAL2 en Backoffice. Antes de habilitar una operación que exige `aal2`, la integración debe fijar y probar cómo obtiene evidencia verificable de MFA/step-up desde WorkOS y cómo la ata a la sesión. Mientras esa evidencia no exista, el backend solo establece `app.authn_assurance = 'aal1'` y las operaciones AAL2 fallan cerradas.

Decodificar un JWT sin verificar firma y claims no autentica a nadie.

### Contexto RLS en PostgreSQL

No se utilizarán `auth.uid()` ni roles `anon`/`authenticated`. El backend verifica WorkOS AuthKit, resuelve la persona y establece contexto local dentro de la misma transacción:

Los helpers propios de autorización y RLS se alojan en el schema técnico privado `access_control`; no se crean objetos Allfit en el schema `auth` administrado por Supabase.

```sql
begin;

select set_config('app.current_person_id', $1, true);
select set_config('app.workos_user_id', $2, true);
select set_config('app.client_id', $3, true);
select set_config('app.request_id', $4, true);

-- queries o funciones de dominio

commit;
```

El tercer argumento `true` hace que el valor sea local a la transacción. Esto es obligatorio con conexiones pooled para evitar que el contexto de una persona se filtre a la siguiente petición.

Helper conceptual:

```sql
create function identity.current_person_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select nullif(current_setting('app.current_person_id', true), '')::uuid
$$;
```

Las policies deben negar acceso si el contexto está ausente o es inválido.

### Roles de PostgreSQL

Separar credenciales y privilegios:

| Rol | Uso | Propiedad/BYPASSRLS |
| --- | --- | --- |
| `allfit_migrator` | CI de migraciones | Puede administrar esquema; no lo usa runtime |
| `allfit_api` | Peticiones autenticadas | No owner, `NOBYPASSRLS`, privilegios mínimos |
| `allfit_worker` | Jobs/webhooks | Grants específicos; no acceso universal por defecto |
| `allfit_readonly` | Diagnóstico controlado | Solo vistas/tablas autorizadas |

El backend no debe conectarse como `postgres` ni como propietario de las tablas.

### Conexiones

- Backends persistentes: conexión directa o pooler de sesión según red y arquitectura.
- Serverless/edge: Supavisor en transaction mode.
- Migrations, dumps y administración: conexión directa con credencial separada.
- Con transaction pooling, toda petición que dependa de RLS debe abrir una transacción y usar configuración local.
- No usar configuración de sesión para identidad.

### Invitaciones

La decisión documentada en la sección ADR-001 permanece:

- Space permite que la persona inicie registro/autenticación con AuthKit y onboarding sin invitación.
- El registro directo crea el Fitness ID sin organización, membresía, relación, asignación o grant de servicio.
- Studio crea `identity.invitations` con email/celular.
- Studio nunca usa la operación administrativa `Create User` de WorkOS para registrar a un invitado.
- La persona inicia personalmente el registro o autenticación mediante AuthKit.
- Si ya tiene cuenta, inicia sesión con la existente.
- La API valida que el contacto verificado coincida con la invitación.
- Después materializa persona, membresía, relación o asignación aceptada.

Una persona registrada directamente en Space puede aceptar después una invitación con la misma cuenta y `person_id`; la invitación nunca crea una segunda identidad.

Un registro iniciado por la persona puede producir temporalmente un usuario WorkOS antes de finalizar el onboarding de dominio. Eso no autoriza acceso a datos: hasta crear/vincular `identity.accounts`, la API debe responder con estado `registration_incomplete` y limitar los endpoints disponibles.

### Qué componentes de Supabase no se utilizarán

- Supabase Auth.
- Acceso directo desde `supabase-js` a tablas de negocio.
- Claves `anon` o `service_role` en Space/Studio.
- `auth.users`, `auth.uid()` o claims de Supabase en policies.
- PostgREST/Data API como frontera pública de las aplicaciones.

Storage, Realtime o Edge Functions requerirían un ADR separado antes de incorporarse; no forman parte de esta decisión.

**Storage estuvo autorizado durante un día y volvió a quedar diferido.** `ADR-031` lo abrió el 19 de septiembre de 2026 para los binarios personales y lo cerró el mismo día, cuando el único caso que lo pedía —la fotografía de portada de una rutina— dejó de existir. El diferimiento de este ADR vuelve a estar íntegro: Storage, Realtime y Edge Functions siguen fuera hasta que un ADR los traiga con un caso construido detrás.

### Referencias de WorkOS

- [Applications: clientes separados con una base de usuarios compartida](https://workos.com/docs/authkit/applications).
- [Environments: aislamiento de usuarios, claves y configuración](https://workos.com/docs/authkit/environments).
- [Sessions: access tokens, JWKS y claims](https://workos.com/docs/authkit/sessions).
- [Reauthentication: `auth_time` y `max_age`](https://workos.com/docs/authkit/reauthentication).
- [Multi-Factor Authentication: configuración por environment y comportamiento SSO](https://workos.com/docs/authkit/mfa).
- [Authorization Code con PKCE para clientes públicos](https://workos.com/docs/reference/authkit/authentication/get-authorization-url).

### Consecuencias

#### Positivas

- Identidad independiente de Supabase.
- Una sola base de usuarios WorkOS compartida entre las Applications del mismo ambiente.
- Ninguna credencial de BD llega a navegadores o móviles.
- Autorización de negocio centralizada en PostgreSQL.
- RLS continúa protegiendo frente a errores de consulta del backend.
- Es posible migrar de proveedor PostgreSQL sin reconstruir identidad.

#### Costos

- Se necesita una API propia para todo acceso a datos.
- El backend debe verificar JWT y establecer correctamente el contexto RLS.
- Se pierde la comodidad de `auth.uid()` y del acceso directo con `supabase-js`.
- WorkOS y Supabase deben configurarse coordinadamente por ambiente.
- Los tests deben cubrir identidad, pooler, contexto transaccional y RLS.

### Pruebas obligatorias

1. Tokens de otro WorkOS environment o issuer son rechazados.
2. Tokens emitidos para un WorkOS Application no autorizado son rechazados.
3. Ninguna credencial distinta del access token de AuthKit se acepta en la API.
4. Token válido sin `identity.accounts` solo accede al onboarding.
5. El `sub` resuelve exactamente una persona.
6. Falta de contexto RLS produce cero filas/denegación.
7. El contexto no sobrevive al `commit` ni se filtra entre conexiones pooled.
8. `allfit_api` no puede desactivar RLS ni consultar como otra persona sin contexto válido.
9. Space, Studio y Backoffice aplican permisos diferentes sobre la misma persona.
10. `org_id`, `role` o `permissions` de WorkOS nunca sustituyen la autorización de PostgreSQL.
11. Space completa Authorization Code con PKCE sin client secret ni API key en el bundle.
12. Una sesión sin evidencia verificable de MFA/step-up nunca establece `aal2`.
13. Ningún bundle frontend contiene credenciales de PostgreSQL o API keys de WorkOS.

---

## ADR-003 — Núcleo de entrenamiento multidisciplina

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

La primera rebanada funcional de Allfit se validará con entrenamiento de fuerza, pero Allfit Space y Allfit Studio deben soportar running, ciclismo, natación, entrenamiento híbrido, cross-training, calistenia, movilidad, yoga, pilates, clases y futuras disciplinas.

Un modelo construido alrededor de `exercises`, `routines`, `sets`, `reps` y `weight` convertiría musculación en la estructura universal y obligaría a deformar o duplicar las demás disciplinas.

### Decisión

El núcleo universal se modelará con:

- disciplina;
- tipo de actividad;
- movimiento opcional;
- programa y versión;
- plantilla de sesión;
- paso planificado;
- asignación;
- sesión planificada;
- sesión ejecutada;
- segmento ejecutado;
- resultados tipados por modalidad;
- métricas temporales cuando corresponda.

“Ejercicio” será un nombre de producto válido dentro de fuerza, pero no la entidad universal. “Rutina” será un nombre de producto válido para una plantilla de fuerza, pero no el nombre físico universal.

### Modelo conceptual

```mermaid
erDiagram
    DISCIPLINES ||--o{ ACTIVITY_TYPES : clasifica
    DISCIPLINES ||--o{ MOVEMENTS : contiene

    PROGRAMS ||--o{ PROGRAM_VERSIONS : publica
    PROGRAM_VERSIONS ||--o{ PROGRAM_VERSION_SESSIONS : compone
    SESSION_TEMPLATES ||--o{ SESSION_TEMPLATE_VERSIONS : publica
    SESSION_TEMPLATE_VERSIONS ||--o{ PROGRAM_VERSION_SESSIONS : reutiliza
    SESSION_TEMPLATE_VERSIONS ||--o{ PLANNED_STEPS : estructura
    MOVEMENTS o|--o{ PLANNED_STEPS : referencia

    PROGRAM_VERSIONS ||--o{ PROGRAM_ASSIGNMENTS : asigna
    PROGRAM_ASSIGNMENTS ||--o{ PLANNED_SESSIONS : agenda
    SESSION_TEMPLATE_VERSIONS ||--o{ PLANNED_SESSIONS : materializa

    PLANNED_SESSIONS ||--o{ PLANNED_SESSION_EXECUTIONS : admite_intentos
    FITNESS_SESSIONS ||--o| PLANNED_SESSION_EXECUTIONS : vincula
    FITNESS_SESSIONS ||--o{ SESSION_SEGMENTS : divide
    FITNESS_SESSIONS ||--o{ STRENGTH_SETS : registra
    FITNESS_SESSIONS ||--o{ ENDURANCE_LAPS : registra
    FITNESS_SESSIONS ||--o{ METRIC_SAMPLES : mide
    SESSION_SEGMENTS ||--o{ INTERVAL_RESULTS : registra
    SESSION_SEGMENTS ||--o{ ROUND_RESULTS : registra
```

### Entidades universales

#### `catalog.disciplines`

Familias amplias y extensibles:

- strength;
- running;
- cycling;
- swimming;
- hybrid;
- cross_training;
- calisthenics;
- mobility;
- yoga;
- pilates;
- recovery;
- custom.

No se codifican como columnas booleanas ni como enum difícil de retirar. Se usa catálogo con código estable, estado y metadata controlada.

#### `catalog.activity_types`

Describe qué clase de actividad ocurre dentro de una disciplina:

- strength_workout;
- easy_run;
- interval_run;
- cycling_ride;
- pool_swim;
- yoga_practice;
- pilates_class;
- mobility_session;
- amrap;
- emom;
- for_time.

Un activity type determina qué targets/resultados especializados son válidos, pero no crea una tabla nueva automáticamente.

#### `catalog.movements`

Acción reutilizable y opcional:

- sentadilla;
- press de banca;
- dominada;
- postura de yoga;
- ejercicio de movilidad;
- técnica de natación.

No toda actividad requiere movimientos. Una carrera continua puede definirse mediante duración/distancia/zona sin fingir que “correr” es un ejercicio de fuerza.

#### `training.session_templates`

Identidad estable de una plantilla reutilizable. Su contenido ejecutable vive en versiones. En UI puede llamarse:

- rutina, en fuerza;
- entrenamiento, en running;
- secuencia, en yoga;
- práctica, en movilidad;
- workout, en cross-training.

`training.session_template_versions` contiene nombre presentado, disciplina, tipo de actividad, instrucciones, duración, pasos y targets. El borrador es mutable; publicar crea una versión inmutable con número consecutivo. `program_version_sessions` referencia una versión exacta, nunca “la última”.

#### `training.planned_steps`

Bloques ordenados de intención. Cada paso tiene columnas comunes y una especialización tipada:

- movimiento o instrucción opcional;
- orden y bloque/superset;
- duración/distancia objetivo;
- intensidad/zona objetivo;
- recuperación;
- tabla especializada de fuerza, endurance, intervalos, rondas o movilidad.

Los targets consultados o validados frecuentemente no se almacenan únicamente en JSONB.

#### `fitness.sessions`

Hecho universal ejecutado:

- persona;
- disciplina y activity type;
- inicio/fin y zona horaria original;
- fuente y procedencia;
- sesión planificada opcional;
- organización/relación opcional;
- estado y visibilidad.

#### `fitness.session_segments`

Partes temporales u ordenadas de una sesión:

- calentamiento;
- bloque de fuerza;
- intervalo;
- recuperación;
- ronda;
- enfriamiento;
- transición de una sesión híbrida.

Permite combinar modalidades sin añadir columnas incompatibles a `fitness.sessions`.

### Especializaciones de resultados

| Modalidad | Tablas/resultados candidatos |
| --- | --- |
| Fuerza | `strength_sets`: reps, load, RPE, RIR, tempo, set type |
| Running/ciclismo | `endurance_laps`, route summary, elevation, pace/speed, power, cadence |
| Natación | laps/lengths, stroke, pool length, interval, SWOLF |
| Yoga/pilates/movilidad | movement/sequence completion, side, duration, perceived difficulty, range |
| Cross-training | `round_results`, `interval_results`, time cap, rounds, reps, load |
| Híbrido | session segments con modalidades diferentes y transiciones |
| Wearables | `metric_samples`: heart rate, power, cadence, GPS y otras series temporales |

No se creará una única tabla `results(type, value, metadata)` para todo. Los resultados comunes pueden compartir procedencia y unidades, pero las estructuras consultadas frecuentemente serán tipadas.

### Unidades

- Guardar valor numérico y unidad canónica, no texto como `"5 km"`.
- Definir dimensiones: distancia, duración, masa, velocidad, potencia, frecuencia, energía y otras.
- Normalizar para cálculos y conservar la unidad original cuando provenga de dispositivo/importación.
- Dinero y métricas físicas no comparten un catálogo genérico de unidades.
- No usar `float` cuando la exactitud contractual sea necesaria; elegir `numeric`, enteros en unidad mínima o tipos apropiados según métrica/volumen.

### JSONB

JSONB se permite para:

- payload original de integración;
- extensiones poco consultadas;
- metadata versionada;
- datos experimentales antes de estabilizar el contrato.

No se permite como sustituto de:

- distancia, duración, carga o repeticiones consultadas;
- relaciones conocidas;
- targets principales;
- métricas usadas en filtros, progreso o RLS.

Todo JSONB de dominio debe tener `schema_version`. Si una clave se vuelve operacional, se promueve a columna/tabla tipada y se indexa según acceso real.

### Métricas temporales y particionamiento

`fitness.metric_samples` debe diseñarse para alto volumen y posible partición temporal futura, pero no se particionará inicialmente. La partición se activará cuando tamaño, retención y planes reales lo justifiquen.

Las muestras deben incluir:

- sesión/persona;
- tipo de métrica;
- timestamp u offset;
- valor/unidad;
- fuente/dispositivo;
- calidad/procedencia;
- clave externa para deduplicación cuando aplique.

### Invariantes

1. Un programa publicado compone versiones exactas e inmutables de plantilla, no sesiones personales ni referencias a “la última”.
2. Una asignación apunta a una versión inmutable.
3. Las sesiones planificadas nacen de una asignación/versión de plantilla y pertenecen a una persona.
4. Una sesión ejecutada puede ser espontánea o vincularse como intento de una sola sesión planificada; una planificada puede tener varios intentos.
5. Una sesión ejecutada siempre declara disciplina y activity type.
6. Un segmento pertenece a una sola sesión ejecutada.
7. Los objetivos planificados nunca se sobrescriben con resultados.
8. Los resultados especializados mantienen FK a sesión/segmento y persona derivable.
9. No toda disciplina requiere movimientos, sets o repeticiones.
10. Agregar una disciplina no exige alterar la tabla universal de sesiones, salvo que aparezca un atributo verdaderamente común.

### Validación mínima del modelo V1

Aunque la interfaz inicial se concentre en fuerza, el esquema no se aprueba hasta representar sin hacks:

1. una sesión de fuerza con sets, cargas, RPE y descansos;
2. una carrera por intervalos con distancia, ritmo, laps y heart rate;
3. una práctica de yoga/movilidad basada en secuencia y duración;
4. una sesión híbrida con segmentos de fuerza y endurance.

No es necesario construir las cuatro experiencias completas. Sí deben existir fixtures y pruebas de integridad que demuestren que el núcleo no depende de musculación.

### Consecuencias

#### Positivas

- Se agregan disciplinas mediante catálogos y extensiones tipadas.
- El historial personal puede mezclar actividades sin perder semántica.
- Programas híbridos son naturales.
- Las consultas principales permanecen tipadas e indexables.
- La UI puede usar el vocabulario propio de cada disciplina.

#### Costos

- Existen más tablas que en un modelo JSON/EAV.
- Cada disciplina necesita contrato y pruebas específicas.
- La analítica transversal requiere una capa común de métricas/resúmenes.
- No todas las disciplinas encajan exactamente en movimiento → resultado; los vínculos deben ser opcionales.

### Alternativas rechazadas

#### Una tabla universal con muchas columnas nullable

Produce combinaciones inválidas, checks complejos y cambios de tabla por cada modalidad.

#### EAV o JSONB para todos los targets/resultados

Reduce integridad, tipos, rendimiento e indexación, y desplaza validaciones críticas a la aplicación.

#### Una base/esquema por disciplina

Duplica persona, programa, calendario, privacidad y ejecución; dificulta entrenamiento híbrido y progreso longitudinal.

---

## ADR-004 — Operación profesional siempre dentro de una organización

**Estado:** aceptada para V1<br>
**Fecha:** 18 de julio de 2026; ratificada el 17 de agosto de 2026

### Contexto

Un profesional es una capacidad de una persona y puede mantener un perfil, especialidades y credenciales propios. Sin embargo, prestar servicios mediante Allfit Studio requiere un contexto operativo estable para clientes, oferta, programas, permisos, pagos, auditoría y suscripción de producto.

Modelar al “coach independiente” y al “gimnasio” como raíces incompatibles duplicaría relaciones, comercio y autorización. También fallaría cuando una misma persona trabaja por cuenta propia y para una o varias organizaciones.

### Decisión

- Toda persona profesional puede crear y mantener su perfil profesional independientemente de una organización.
- Para prestar servicios, gestionar clientes, publicar oferta, asignar programas o recibir pagos mediante Allfit Studio, el profesional debe actuar dentro de una organización.
- Si trabaja de forma independiente, Allfit crea durante el onboarding una organización de tipo `professional_practice`, registra `solo_professional` como modalidad de onboarding y crea su membresía inicial como propietario.
- La organización unipersonal es una frontera técnica y operativa; no afirma por sí sola que exista una persona jurídica, razón social o registro tributario.
- Una persona puede conservar su organización unipersonal y, simultáneamente, pertenecer como profesional a otras organizaciones.
- Cada operación profesional debe registrar tanto el actor profesional como la organización bajo la cual actuó.
- La oferta comercial tiene siempre una organización vendedora, aunque públicamente destaque el perfil de una persona profesional.

Los tipos activos iniciales `professional_practice`, `gym` y `studio` describen la clase principal de operación; no crean modelos raíz separados. `academy` y `clinic` permanecen gobernados pero inactivos hasta que exista un caso real aprobado. `solo_professional` no es un tipo de organización, sino una modalidad de onboarding.

### Invariantes

1. El perfil profesional pertenece a la persona, no a una organización.
2. Existir como profesional no concede acceso a Allfit Studio ni a datos de clientes.
3. Ninguna acción profesional sobre un cliente ocurre sin una organización activa y una membresía profesional vigente.
4. La práctica creada mediante onboarding `solo_professional` tiene exactamente una membresía propietaria inicial para la persona que la crea.
5. Cambiar o terminar una membresía organizacional no elimina el perfil profesional global.
6. Una relación de servicio identifica a la persona atendida, al profesional responsable y a la organización de contexto.
7. Programas publicados, asignaciones, productos, órdenes y pagos conservan la organización de origen y el actor cuando aplique.
8. Una organización unipersonal no exige datos legales o tributarios hasta que una operación regulada —por ejemplo facturación o pagos— los requiera.

### Consecuencias

#### Positivas

- Un único modelo soporta coaches independientes, gimnasios, estudios y futuras clases de proveedor.
- Billing, permisos, oferta, marketplace y auditoría mantienen una frontera consistente.
- Un profesional puede operar en varios contextos sin duplicar su identidad ni su perfil.
- La transición de profesional independiente a equipo u organización con staff no exige migrar a otra entidad raíz.

#### Costos

- El onboarding independiente debe crear una organización y membresía de forma transaccional e idempotente.
- La interfaz debe ocultar complejidad organizacional cuando no aporte valor al profesional independiente.
- Las consultas y comandos profesionales deben exigir contexto organizacional explícito y evitar seleccionar uno de forma ambigua.

### Escenarios de prueba obligatorios

1. Una persona crea su perfil profesional sin obtener acceso a clientes ni operaciones de Studio.
2. El onboarding `solo_professional` crea una sola `professional_practice` y una sola membresía propietaria ante reintentos concurrentes.
3. Un profesional publica o asigna únicamente bajo una organización donde tiene membresía y permiso vigentes.
4. La misma persona opera desde su organización unipersonal y desde un gimnasio sin duplicar su perfil profesional.
5. Al terminar su membresía en un gimnasio, conserva su perfil y su organización propia, pero pierde las facultades operativas del gimnasio.
6. Toda relación, asignación, oferta y pago permite identificar la organización de origen y el actor profesional.

---

## ADR-005 — Terminación de relaciones y retención restringida de datos

**Estado:** aceptada para V1<br>
**Fecha:** 18 de julio de 2026<br>
**Ratificación:** 23 de julio de 2026

> **Resolución ratificada:** terminar una relación no equivale a revocar el consentimiento. En el instante efectivo `T`, los grants `active` de la relación pasan a `frozen`: cesan el acceso en vivo, la operación y toda escritura, pero la organización conserva una vista histórica limitada al conjunto previamente autorizado y a filas con instante de negocio `<= T`. `revoked` continúa significando acceso nulo. ADR-023 define quién puede ejercer la lectura histórica y bajo qué predicado; esa autorización no puede ampliar la ventana ni reactivar capacidades operativas.

### Contexto

Una relación profesional da acceso temporal a categorías del Fitness ID para prestar un servicio. Al terminarla, es necesario distinguir propiedad, procedencia, acceso en vivo, lectura histórica y retención. Conservar una ventana histórica no permite seguir gestionando a la persona ni consultar datos posteriores al corte.

La persona necesita continuidad de su historial y la organización necesita preservar la evidencia del servicio prestado. Esa continuidad no se implementa copiando datos: el dato permanece person-céntrico y la autorización cambia de una vista en vivo a una ventana histórica congelada.

### Decisión

- En el instante efectivo `T`, terminar una relación cambia todos sus grants `active` a `frozen` y registra `frozen_at = T`.
- Un grant `frozen` no habilita operación, escritura, contribuciones, correcciones, observaciones, asignaciones, recordatorios ni datos creados después de `T`.
- La organización conserva únicamente lectura histórica sobre el conjunto que estaba autorizado por el grant, su versión de scope, su nivel y las restricciones aplicables, siempre acotada a filas con instante de negocio `<= T`.
- La lectura histórica usa la superficie y el predicado separados definidos por ADR-023: caso acotado, actor humano, propósito cerrado, MFA y auditoría por lectura.
- Un grant `revoked` no habilita lectura en vivo ni histórica. La terminación no cambia por sí sola un grant a `revoked`.
- La persona conserva en su Fitness ID el perfil, las versiones asignadas, sesiones planificadas, ejecuciones, resultados y registros compartidos que le correspondan.
- La organización conserva sus activos propios —programas maestros, metodología, oferta y configuración—, la ventana histórica congelada y los registros bilaterales necesarios según finalidad y plazo.
- Pueden retenerse, por finalidad y plazo definidos, evidencia de asignaciones, comentarios/evaluaciones profesionales, contratos, órdenes, facturas, pagos, reembolsos, consentimientos, revocaciones, auditoría, seguridad, fraude y conciliación.
- La persona sale de listados y flujos operativos normales. La lectura `frozen` no reutiliza esos endpoints ni presenta a la persona como cliente activo.
- No hay snapshot, copia ni tabla `archive`. El filtro de autorización se aplica sobre las fuentes canónicas y toda anonimización se ejecuta una sola vez, en su lugar.
- Si la persona vuelve, se crea una relación nueva con grants nuevos; la relación nueva no hereda ni fusiona la ventana de la anterior.
- Si la persona elimina su cuenta y no conserva relaciones activas, la disposición anonimiza la información para todos, incluido el gimnasio. Ningún grant `frozen` permite atravesar esa anonimización.
- Las métricas de negocio irreversiblemente anónimas pueden conservarse sin llaves de enlace o posibilidad razonable de reidentificación.
- Al vencer el plazo aplicable, los datos se eliminan o anonimizan. Una excepción requiere un `legal_hold` documentado, con motivo, actor, alcance y vigencia.
- Los datos retenidos no pueden reutilizarse para marketing, entrenamiento de IA o analítica identificable sin una base y autorización separadas.
- Los plazos concretos se definen por categoría, finalidad y jurisdicción; no se codifica una única retención global.

**Mapeo V1:** billing y suscripciones están diferidos. La condición de servicio activo se representa con `service_relationships.status = 'active'`; incorporar suscripciones más adelante no cambia la transición `active → frozen`.

### Matriz de salida de la relación

| Categoría | Resultado al terminar |
| --- | --- |
| Perfil, objetivos e historial fitness previamente autorizados | Lectura `frozen` solo dentro del scope/field-set aceptado y con instante `<= T`; sin operación ni escritura |
| Datos creados después de `T`, futuras sesiones nuevas y datos de otras relaciones | Nunca quedan disponibles para la organización anterior |
| Categorías no concedidas o excluidas por el contrato aplicable | Nunca se incorporan a la ventana congelada |
| Programa maestro de la organización | La organización conserva propiedad/autoría |
| Versión asignada | La persona conserva el snapshot; la asignación activa se desacopla y pausa según ADR-019; la organización conserva evidencia mínima |
| Ejecuciones y resultados autorizados hasta `T` | Permanecen en el Fitness ID y pueden formar parte de la lectura `frozen`; no admiten contribución posterior |
| Comentarios y evaluaciones profesionales previos | Conservan autoría y pueden integrar la ventana histórica cuando la regla de campo los marque `historical_readable`; nunca vuelven a ser editables |
| Contratos, órdenes, facturas, pagos y reembolsos | Retención por finalidad operativa/legal aplicable |
| Consentimientos, revocaciones, auditoría, seguridad y fraude | Evidencia append-only con acceso restringido |
| Analítica anonimizada | Puede conservarse si no permite reidentificar a la persona |

### Invariantes

1. Terminar una relación hace cesar inmediatamente toda autoridad operativa y de escritura.
2. La terminación transiciona sus grants `active` a `frozen` con un único instante efectivo `T`; no los marca `revoked`.
3. Un grant `frozen` nunca devuelve filas con instante de negocio posterior a `T`.
4. La persona no pierde su historial porque termine una relación u organización.
5. La lectura histórica nunca amplía scope, field-set, nivel o finalidad aceptados ni convierte un grant `revoked` en legible.
6. La organización no pierde la autoría de sus programas maestros ni la evidencia mínima de operaciones bilaterales.
7. No existe una segunda copia del historial para la organización.
8. La anonimización por cierre de cuenta alcanza las fuentes canónicas y, por tanto, todas las vistas `frozen`.
9. Toda categoría retenida tiene regla de plazo y acción final: eliminar, anonimizar o conservar bajo hold documentado.
10. Los registros financieros, de consentimiento y auditoría no se modifican para simular que nunca existieron; su tratamiento final sigue la política aplicable.

### Consecuencias

#### Positivas

- El Fitness ID permanece portable y bajo control de la persona.
- La organización puede consultar el historial autorizado del servicio sin recibir actividad futura ni recuperar capacidades operativas.
- La terminación tiene un efecto técnico comprobable en RLS y contratos de API.
- Retención, acceso y eliminación dejan de depender de un `deleted_at` genérico.

#### Costos

- Se necesita clasificar los datos y definir plazos por categoría y jurisdicción.
- Studio requiere la superficie histórica separada y el predicado de autorización específico definidos por ADR-023.
- La terminación debe coordinar relación, grants, listados operativos, asignaciones y políticas de retención.
- Los plazos y bases de conservación necesitan validación jurídica antes de producción.

### Alternativas rechazadas

- **Revocar todo acceso al terminar:** contradice la vista histórica ratificada y confunde terminación con revocación explícita.
- **Copiar a una tabla `archive`:** divide la fuente de verdad, multiplica disposición y exige merges al volver la persona.
- **Conservar datos identificables después de eliminar la cuenta:** se descarta; la anonimización alcanza también la vista del gimnasio.

### Decisiones todavía abiertas

1. Plazos de retención por categoría en `privacy.retention_policies`.
2. Validación jurídica de la política completa para Colombia antes de producción.

### Escenarios de prueba obligatorios

1. Terminar una relación cambia todos sus grants `active` a `frozen` con el mismo `frozen_at = T`.
2. Después de `T` fallan todas las escrituras, contribuciones y consultas operativas de la relación terminada.
3. `access_control.can_read_frozen` devuelve solo el conjunto autorizado con instante `<= T`.
4. Una fila posterior a `T`, incluso bajo el mismo scope, nunca aparece en detalle, conteos, derivados o cachés de la organización anterior.
5. Un grant `revoked` no permite lectura histórica.
6. La persona continúa viendo su historial, resultados y versión asignada.
7. El cierre de cuenta sin relaciones activas anonimiza las fuentes canónicas y ninguna vista `frozen` conserva identificación nominal.
8. Volver a la misma organización crea una relación y grants nuevos sin fusionar ventanas.
9. Al vencer `retention_until`, el proceso aplica la acción configurada salvo un hold vigente.
10. Los datos retenidos no aparecen en segmentación comercial, contexto de IA ni analítica identificable.

---

## ADR-006 — Evolución de práctica unipersonal a equipo sin cambiar de organización

**Estado:** aceptada para V1<br>
**Fecha:** 18 de julio de 2026; ratificada el 17 de agosto de 2026

### Contexto

Un profesional puede comenzar solo y después contratar asistentes, incorporar otros profesionales o construir una empresa. Si “independiente” fuera un tipo permanente, el modelo quedaría obsoleto al invitar al primer integrante o exigiría migrar clientes, programas, pagos y auditoría hacia una nueva organización.

El tamaño actual del equipo y la clase de operación son dimensiones diferentes. Un gimnasio puede tener un solo integrante y una práctica profesional puede tener varios; por eso no deben representarse con el mismo atributo.

### Decisión

- La organización creada para un profesional independiente nace como `organization_kind = 'professional_practice'`.
- `solo_professional` describe la modalidad de onboarding y procedencia inicial; no limita la evolución posterior ni gobierna autorización.
- La condición unipersonal se deriva de las membresías activas y no se persiste como `is_independent` o tipo permanente.
- La práctica puede incorporar staff y otros profesionales conservando el mismo `organization_id`, clientes, relaciones, programas, productos, pagos, suscripción y auditoría.
- El tipo principal de organización describe su operación —inicialmente práctica profesional, gimnasio o estudio—, no el número de integrantes. Academia y clínica permanecen como tipos inactivos hasta que exista un caso real aprobado.
- Añadir miembros no cambia `organization_kind`. Un cambio real de actividad principal requiere una transición explícita y auditada, no una migración de identidad.
- Cada relación de servicio conserva la organización y el profesional responsable. Una reasignación cambia al responsable mediante historial efectivo, sin reemplazar la procedencia anterior.
- Los límites comerciales o de SaaS pueden depender del número de miembros, sedes o capacidades, sin alterar la identidad de la organización.

### Invariantes

1. Invitar al primer integrante adicional nunca crea otra organización ni migra datos.
2. `organization_id` permanece estable durante el crecimiento de práctica unipersonal a equipo.
3. El número de integrantes se calcula con membresías activas; no se usa para definir ownership.
4. Un profesional puede pertenecer a su práctica y a otras organizaciones sin duplicar su perfil.
5. Programas, productos y relaciones conservan organización de origen y autoría profesional cuando aplique.
6. Reasignar un cliente no elimina al profesional anterior del historial de responsabilidad.
7. Permisos de nuevos integrantes nacen de su membresía y roles; incorporarse al equipo no concede acceso retroactivo ilimitado.

### Consecuencias

#### Positivas

- El crecimiento del negocio no exige migraciones de identidad ni datos.
- El mismo modelo cubre profesional solo, práctica con equipo y profesional vinculado a varios negocios.
- Billing, permisos y límites de producto pueden evolucionar independientemente de la categoría organizacional.
- Se conserva quién atendió a cada persona y bajo qué organización.

#### Costos

- Studio necesita flujos de invitación, roles y administración de equipo incluso para organizaciones creadas como unipersonales.
- Las reasignaciones de profesional responsable requieren historial temporal/auditable.
- La interfaz debe cambiar gradualmente de experiencia personal a gestión de equipo sin exponer complejidad prematuramente.

### Escenarios de prueba obligatorios

1. Una práctica con un propietario invita staff y conserva el mismo `organization_id` y todos sus datos.
2. El segundo miembro no cambia `organization_kind` ni invalida contratos existentes.
3. Un profesional adicional solo ve clientes autorizados por rol, asignación y relación.
4. Reasignar un cliente conserva el historial del responsable anterior y activa al nuevo desde una fecha efectiva.
5. El propietario puede operar simultáneamente desde su práctica y como miembro de un gimnasio sin mezclar clientes o permisos.
6. Un cambio de plan SaaS por crecimiento no crea otra organización.
7. Una transición real de categoría organizacional registra actor, fecha, motivo y valores anterior/nuevo.

---

## ADR-007 — Categorías de consentimiento explícito para V1

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

Aceptar una relación profesional no debe abrir automáticamente todo el Fitness ID. El acompañamiento necesita datos producidos dentro de esa relación, pero el historial previo, las métricas corporales y el contexto de salud tienen finalidades y niveles de sensibilidad diferentes.

Como política de producto, Allfit tratará los datos fitness como sensibles y aplicará minimización y autorización explícita, aunque la clasificación jurídica exacta de cada campo dependa de la jurisdicción. En Colombia, los datos de salud y biométricos están sujetos a protección reforzada y, salvo excepciones legales, autorización explícita.

### Decisión

V1 tendrá siete scopes independientes:

| Scope | Contenido | Regla V1 |
| --- | --- | --- |
| `relationship_training` | Programa asignado, sesiones planificadas y resultados producidos dentro de la relación | Aceptación explícita necesaria para activar el acompañamiento basado en resultados |
| `prior_training_history` | Sesiones, resultados y récords anteriores o autónomos, fuera de la relación | Opcional y denegado por defecto |
| `body_progress` | Peso, medidas, composición corporal y fotografías de progreso | Opcional, separado y denegado por defecto |
| `health_context` | Dolor, lesiones declaradas, limitaciones, recuperación y otros datos relacionados con salud | Opcional, separado, minimizado y denegado por defecto |
| `nutrition_intake` | Comidas, componentes, cantidades, nutrientes y resúmenes diarios manuales | Opcional, separado, denegado por defecto y solo lectura profesional |
| `nutrition_guidance` | Objetivos, versiones, targets, racional profesional y decisiones de la persona | Opcional; `contribute` exige profesional nutricional verificado |
| `nutrition_media` | Una fotografía elegida por comida | Opcional, separado y solo efectivo junto con `nutrition_intake/read` |

La relación comercial o profesional puede existir sin `relationship_training`, pero las funciones que requieren consultar resultados deben permanecer inactivas o limitadas. El producto debe explicar esta consecuencia antes de aceptar o rechazar el scope.

Cuenta, identidad básica, términos, membresía organizacional, contrato, orden, factura, pago, evidencia de consentimiento y auditoría no se modelan como `data_grants` de coaching; cada uno tiene su propia finalidad y base de tratamiento.

Los scopes nutricionales no se heredan de los cuatro scopes de entrenamiento ni de la aceptación de la relación. Scopes futuros como `wearables`, `biometrics`, `ai_context`, `public_sharing` y `research_or_model_training` permanecen separados de los siete scopes V1.

### Reglas del grant

Cada grant registra como mínimo:

- persona titular;
- destinatario;
- `scope_code`;
- propósito;
- nivel de acceso;
- relación contextual;
- inicio y vencimiento;
- versión del texto presentado;
- instante, canal y evidencia de aceptación;
- revocación y actor cuando aplique.

No se permiten casillas premarcadas, un scope `all_data` ni consentimiento implícito por inactividad. Conceder nuevamente un scope crea un nuevo evento; no elimina la evidencia de concesiones o revocaciones anteriores.

### Invariantes

1. Aceptar una relación no concede `prior_training_history`, `body_progress` ni `health_context`.
2. `relationship_training` solo cubre planificación y resultados producidos dentro de la relación correspondiente.
3. Las sesiones autónomas o de otra relación no aparecen por inferencia en `relationship_training`.
4. Cada scope puede concederse, rechazarse, expirar o revocarse independientemente.
5. RLS y contratos de API aplican denegación por defecto cuando falta un grant vigente.
6. Revocar un scope cambia el acceso efectivo inmediatamente y no borra la evidencia histórica.
7. Ningún scope de entrenamiento autoriza publicación, marketing, biometría, contexto de IA o entrenamiento de modelos.
8. Los datos opcionales no bloquean funciones que no los necesitan.
9. La aplicación informa finalidad, destinatario, datos incluidos y efecto de negar/revocar antes de solicitar el consentimiento.

### Consecuencias

#### Positivas

- La persona entiende qué parte de su Fitness ID comparte y para qué.
- Un coach recibe los datos mínimos necesarios sin obtener el historial completo.
- Los permisos pueden revocarse por categoría sin terminar necesariamente toda la relación.
- IA, wearables, publicación y usos secundarios quedan aislados desde el diseño.

#### Costos

- El onboarding de la relación necesita una pantalla explícita de scopes y consecuencias.
- Las consultas deben distinguir datos de la relación frente a historial previo o autónomo.
- El diccionario de datos debe asignar cada campo sensible a una categoría inequívoca.
- La redacción y evidencia de autorización necesitan validación jurídica por jurisdicción antes de producción.

### Escenarios de prueba obligatorios

1. Aceptar solo `relationship_training` permite ver resultados de sesiones asignadas dentro de la relación, pero no historial anterior o autónomo.
2. Rechazar `relationship_training` mantiene la relación registrada y bloquea las funciones que dependen de resultados.
3. Conceder `body_progress` no concede `health_context` ni historial previo.
4. Revocar un scope retira inmediatamente sus datos de endpoints y contexto autorizado.
5. Una relación nueva no hereda grants de una relación anterior, aunque participe el mismo profesional u organización.
6. Ningún grant V1 habilita datos para IA, publicación, marketing o entrenamiento de modelos.
7. Los eventos permiten reconstruir qué texto, finalidad, destinatario y scopes aceptó la persona en cada momento.
8. No existe un camino de API o RLS equivalente a `all_data`.

### Referencia jurídica inicial

- [Ley 1581 de 2012 — categorías especiales y tratamiento de datos sensibles](https://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html).
- [Decreto 1377 de 2013 — información y consentimiento expreso para datos sensibles](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646).

Estas referencias orientan la baseline colombiana y no sustituyen la validación jurídica del flujo, textos y finalidades concretas.

---

## ADR-008 — Intenciones tipadas y aceptación parcial de invitaciones

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

Una invitación puede iniciar varios pasos relacionados —registro, membresía, relación profesional o programa—, pero no debe convertirlos en una aceptación indivisible. Términos, scopes de datos, contratos y pagos requieren evidencia y finalidades propias.

Un payload genérico que materialice todo al usar el token permitiría crear permisos, relaciones o asignaciones no comprendidas por la persona. También impediría aceptar una relación y rechazar un programa, o registrarse sin aceptar propuestas opcionales.

### Decisión

La invitación es un sobre temporal y puede contener únicamente intenciones tipadas compatibles con su propósito:

| Propósito | Intenciones V1 permitidas |
| --- | --- |
| `staff_invitation` | `organization_membership` |
| `client_invitation` | `service_relationship` y, opcionalmente, `program_assignment` |

Cada intención se presenta, acepta o rechaza de forma independiente:

- `organization_membership`: organización y rol propuesto;
- `service_relationship`: organización, profesional responsable, tipo de servicio y fecha tentativa;
- `program_assignment`: programa, versión exacta y fecha tentativa, dependiente de una relación aceptada.

Términos y política de privacidad, cada `data_grant`, contratos comerciales, compras, pagos, IA, publicación, marketing, biometría y entrenamiento de modelos quedan fuera de la aceptación de la invitación y producen evidencia separada.

Las invitaciones de staff y clientes no se mezclan. Una invitación puede completarse parcialmente; `completed` significa que la persona decidió las intenciones presentadas, no que las aceptó todas.

| Propósito | Superficie de consulta y decisión | Regla V1 |
| --- | --- | --- |
| `staff_invitation` | Studio | Una intención de membresía; email verificado coincidente; nunca materializa entidades de cliente. |
| `client_invitation` | Space | Relación, programa y scopes presentados por separado; nunca materializa membresías o roles de equipo. |

El enlace de staff usa `https://studio.allfit.one/invitations#token=…`. El token
se retira del navegador antes de renderizar, se conserva solo durante la pestaña
y llega a la API exclusivamente en el cuerpo JSON de un `POST`. No aparece en
paths, query strings, logs o referrers.

### Modelo y estados

```text
identity.invitations
└── identity.invitation_intents
    ├── proposed
    ├── accepted
    ├── rejected
    ├── revoked
    └── expired
```

`identity.invitations` conserva contacto, emisor, organización, propósito, token, entrega y expiración. Cada `invitation_intent` conserva tipo, estado, referencias tipadas, versión del texto presentado, decisión, actor y timestamps.

Las referencias vinculantes no viven únicamente en JSONB. El modelo lógico debe usar columnas/FKs con checks o tablas especializadas para membresía, relación y asignación. Metadata no vinculante —mensaje o contexto de presentación— sí puede usar una extensión versionada.

### Dependencias

- `program_assignment` exige que `service_relationship` haya sido aceptada y pueda materializarse.
- El rol de una membresía debe existir y ser asignable por el emisor.
- La versión de programa debe estar publicada, vigente y pertenecer al contexto autorizado.
- Rechazar una intención dependiente no revierte otras intenciones válidamente aceptadas.
- Si una dependencia falla por cambio de estado, la intención no se materializa y el flujo informa el motivo; nunca se degrada silenciosamente a otra entidad o versión.

### Invariantes

1. Una invitación no crea entidades de dominio antes de una decisión autenticada del destinatario.
2. Aceptar una intención no acepta las demás.
3. Aceptar una invitación no concede términos, consentimientos, scopes, pagos ni usos secundarios.
4. Una asignación solo apunta a la versión exacta presentada y aceptada.
5. Una intención rechazada permanece como evidencia y no puede materializarse posteriormente sin una nueva propuesta.
6. La aceptación parcial es válida y no elimina la cuenta/persona creada durante onboarding.
7. Cada materialización es transaccional, idempotente y auditable.
8. Los reintentos concurrentes producen como máximo una membresía, relación o asignación por intención.
9. No existe una operación `accept_all` que evite mostrar y registrar decisiones separadas.
10. La resolución pública nunca devuelve el destino y trata inválida, vencida, revocada y consumida como el mismo `404`.
11. Una decisión de staff exige el email verificado exacto del destinatario y no crea perfil de cliente, relación, scope o grant.
12. Aceptar y revocar bloquean la misma invitación; gana la primera transacción confirmada.

### Consecuencias

#### Positivas

- La persona entiende y controla cada vínculo que está creando.
- Staff, clientes y programas usan flujos claros sin entidades provisionales.
- Las propuestas opcionales pueden rechazarse sin bloquear el registro o la relación principal.
- Auditoría puede demostrar qué se presentó y qué decidió la persona.

#### Costos

- El onboarding necesita pasos y estados por intención.
- La API debe resolver dependencias y resultados parciales de forma explícita.
- El modelo requiere más filas y constraints que un payload único.

### Escenarios de prueba obligatorios

1. Aceptar `service_relationship` y rechazar `program_assignment` crea solo la relación.
2. Rechazar una relación impide materializar su asignación dependiente.
3. Aceptar una membresía de staff no crea relación de cliente ni grants de Fitness ID.
4. Completar una invitación con intenciones rechazadas conserva la persona/cuenta y la evidencia de decisiones.
5. Una versión de programa retirada o diferente de la presentada no puede sustituirse silenciosamente.
6. Dos reintentos concurrentes de la misma intención crean una sola entidad.
7. Revocar la invitación bloquea decisiones todavía pendientes, sin deshacer intenciones ya materializadas; esas entidades siguen su propio ciclo de vida.
8. Ningún flujo de invitación concede automáticamente `relationship_training`, otros scopes, términos, pagos, IA o publicación.

---

## ADR-009 — Versionado independiente e inmutable de plantillas de sesión

**Estado:** aceptada para V1<br>
**Fecha:** 18 de julio de 2026; ratificada el 17 de agosto de 2026<br>
**Enmendada:** 18 de septiembre de 2026 — alcance de la deduplicación por contenido

### Contexto

Las plantillas se reutilizan entre programas y también pueden originar sesiones independientes. Congelar su contenido únicamente dentro de cada versión de programa duplicaría estructuras y dificultaría biblioteca, procedencia y reutilización. Mantenerlas mutables, en cambio, cambiaría retrospectivamente lo asignado a una persona.

También es necesario separar una actualización de biblioteca de una adaptación específica para un programa o una persona.

### Decisión

- `training.session_templates` representa la identidad estable, ownership y procedencia de la plantilla.
- `training.session_template_versions` contiene el contenido ejecutable versionado.
- Solo el borrador es mutable. Publicar crea una versión inmutable con `version_number` entero consecutivo por plantilla.
- Pasos, targets, instrucciones, disciplina, tipo de actividad, duración estimada y medios esenciales pertenecen a la versión publicada.
- `training.program_version_sessions` referencia `session_template_version_id`; una versión de programa nunca sigue automáticamente la versión más reciente de una plantilla.
- Publicar una nueva versión de plantilla no modifica programas, asignaciones o sesiones planificadas existentes.
- Una adaptación reutilizable crea otra versión y conserva `derived_from_version_id`.
- Una modificación específica para una persona se modela como revisión/snapshot auditable de prescripción, no como edición de la plantilla maestra.
- Una versión publicada puede retirarse para nuevos usos, pero no editarse ni eliminarse si está referenciada.

### Modelo conceptual

```text
training.session_templates
└── training.session_template_versions
    └── training.planned_steps
        ├── strength_targets
        ├── endurance_targets
        ├── interval_targets
        └── mobility_targets

training.program_versions
└── training.program_version_sessions
    └── session_template_version_id
```

La entidad estable contiene datos que no deben cambiar el significado histórico —propietario, organización de origen, procedencia y estado general—. La versión contiene todo lo que la persona vio o debía ejecutar, incluido el nombre presentado cuando sea relevante para el historial.

### Ciclo de publicación

```text
draft mutable → published immutable → retired para nuevos usos
                      └── nueva revisión → nuevo draft → nueva versión
```

No se crea una versión por autosave. El borrador usa control de concurrencia/optimistic locking. La publicación es una operación explícita y transaccional que valida estructura, targets, unidades y referencias, calcula `content_hash` y asigna el siguiente `version_number`.

La numeración es un entero por plantilla con `UNIQUE (template_id, version_number)`; no se usa SemVer.

**La deduplicación por contenido alcanza sólo a la última versión publicada.** Publicar un borrador idéntico a ella no crea nada y devuelve esa versión, que es lo que evita una versión por cada pulsación sobre un contenido que no cambió. Publicar un borrador que coincide con una versión **anterior** —deshacer un cambio, quitar una portada que se acababa de poner— crea la versión siguiente: nunca se devuelve una versión que ya fue superada.

La razón es que el identificador de versión viaja fuera de la plantilla. Una semana de programa, una sesión planificada y una asignación guardan `session_template_version_id`, y el resto del producto resuelve el contenido vigente por la última versión publicada; entregar un identificador anterior al publicar deja esas referencias apuntando a una versión que ninguna consulta de biblioteca nombra. También destruye la cronología: una misma fila representaría dos épocas distintas y `version_number` dejaría de ordenar en el tiempo.

El coste aceptado es almacenamiento —cada versión materializa sus pasos, series y targets— y no latencia: los lectores toman la última versión por el índice `(template_id, version_number)` sin recorrer la historia.

`change_kind` —`correction`, `progression`, `adaptation`, `localization`— queda **fuera de V1**: se documenta como intención y no tiene columna física mientras ninguna operación lo escriba, según `ADR-021`.

### Relación con programas y personas

- Un programa borrador puede seleccionar versiones publicadas de plantilla.
- Publicar el programa congela la composición y posición de esas versiones en `program_version_sessions`.
- Adoptar una nueva versión de plantilla requiere una acción explícita en un nuevo borrador/versión de programa.
- Si un programa necesita contenido diferente, crea una versión derivada en vez de overrides operativos dentro de JSONB.
- Una sesión planificada conserva `program_version_id`, `session_template_version_id` y, si fue personalizada, la revisión/snapshot de prescripción aplicable.
- Cambiar una prescripción personal no modifica la versión de plantilla ni el programa publicado.

### Invariantes

1. Una versión publicada de plantilla es inmutable.
2. Los pasos y targets pertenecen a `session_template_version_id`, no a la identidad estable.
3. Toda composición publicada referencia versiones exactas y publicadas.
4. Ninguna consulta histórica resuelve “latest template version”.
5. Retirar una versión impide nuevas selecciones, pero conserva referencias existentes.
6. Una versión referenciada no se elimina físicamente.
7. `derived_from_version_id` conserva procedencia sin compartir filas mutables.
8. Las adaptaciones personales son revisiones de prescripción auditables y no nuevas ediciones silenciosas de la biblioteca.
9. Un proceso/IA puede crear borradores, pero publicar requiere actor autorizado y auditable.
10. Publicar devuelve la última versión de la plantilla o una nueva, jamás una anterior.

### Consecuencias

#### Positivas

- Las plantillas se reutilizan sin duplicar contenido en cada programa.
- El historial permanece estable y explicable.
- Los programas actualizan plantillas de forma intencional.
- Biblioteca, derivaciones y adaptaciones conservan procedencia.

#### Costos

- Se añaden `session_template_versions` y `program_version_sessions`.
- El editor debe gestionar borrador, publicación, retiro y actualización manual de referencias.
- Las personalizaciones requieren un modelo separado de revisión de prescripción.
- Los medios esenciales también necesitan referencias estables o versionadas para no romper el historial.

### Escenarios de prueba obligatorios

1. Publicar una plantilla crea versión 1 inmutable; editar después crea un nuevo borrador y versión 2.
2. Un programa publicado con plantilla v1 continúa apuntando a v1 después de publicar v2.
3. Un nuevo programa puede seleccionar v2 sin modificar asignaciones anteriores.
4. No se puede publicar un programa que apunte a una plantilla en borrador o retirada para nuevos usos.
5. Retirar v1 no rompe programas, asignaciones o sesiones que ya la referencian.
6. Una adaptación crea una versión nueva con `derived_from_version_id` y pasos propios.
7. Personalizar la sesión de una persona conserva template/programa de origen y registra una revisión de prescripción.
8. Reintentos concurrentes de publicación no asignan el mismo `version_number` ni crean dos versiones equivalentes a la última.
9. Ningún endpoint histórico cambia de contenido al aparecer una versión más reciente.
10. Publicar un contenido idéntico a la última versión no crea ninguna y devuelve esa; idéntico a una anterior crea la siguiente.
11. Una copia hecha por bifurcación conserva `derived_from_version_id` hacia la versión de origen.

---

## ADR-010 — Múltiples intentos y una ejecución primaria por sesión planificada

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

Una persona puede iniciar y abandonar una sesión, reanudarla, repetirla, importar otra ejecución desde un dispositivo o invalidar un registro erróneo. Una relación uno-a-uno entre sesión planificada y ejecutada perdería estos hechos o forzaría sobrescrituras.

Al mismo tiempo, adherencia y progresión necesitan una única ejecución que represente el cumplimiento de la prescripción. Varios intentos históricos no deben hacer que una sesión planificada cuente varias veces.

### Decisión

- Una sesión planificada admite cero o múltiples ejecuciones vinculadas como intentos numerados.
- Una ejecución pertenece como máximo a una sesión planificada.
- Como máximo una ejecución completada y válida puede ser la primaria para cumplimiento y progresión.
- El primer intento completado se selecciona inicialmente como primario.
- Completar otro intento no reemplaza al primario de forma automática; cambiarlo requiere acción explícita y auditable.
- Reanudar una ejecución `in_progress` o `paused` no crea otro intento.
- Todos los intentos válidos permanecen en el Fitness ID; la adherencia del plan cuenta una sola sesión y la progresión usa la primaria.
- El cumplimiento dividido mediante varias ejecuciones complementarias queda fuera de V1.

### Modelo

```text
training.planned_sessions
└── training.planned_session_executions
    ├── attempt 1 → fitness.sessions (abandoned)
    ├── attempt 2 → fitness.sessions (completed, primary)
    └── attempt 3 → fitness.sessions (completed, retry)
```

`training.planned_session_executions` contiene como mínimo:

- `planned_session_id`;
- `fitness_session_id`;
- `attempt_number`;
- `attempt_role`;
- `is_primary`;
- `linked_at` y actor/origen del vínculo;
- `invalidated_at`, actor y motivo cuando aplique.

Constraints:

```text
UNIQUE (fitness_session_id)
UNIQUE (planned_session_id, attempt_number)
UNIQUE (planned_session_id) WHERE is_primary = true
```

La selección primaria debe validar que la ejecución esté completada, no invalidada y pertenezca a la misma persona. La integridad que cruce estado entre tablas se aplica mediante un comando transaccional con tests de concurrencia.

### Creación, reanudación y concurrencia

El comando para iniciar debe bloquear la sesión planificada, revisar intentos activos y usar idempotency key:

1. Si existe un intento `in_progress` o `paused`, devuelve ese intento para reanudar.
2. Si no existe, crea la ejecución y el siguiente `attempt_number` en una sola transacción.
3. Crear un nuevo intento mientras otro sigue activo exige una acción explícita que abandone/cierre el anterior o una autorización de excepción.
4. Reintentos de red, doble clic y sincronización offline no crean intentos duplicados.

### Estado y analítica

| Condición | Estado operativo de la sesión planificada |
| --- | --- |
| Sin intentos | `scheduled` |
| Intento activo | `in_progress` |
| Solo intentos abandonados | `attempted` |
| Existe primaria completada | `completed` |
| Cancelada antes de ejecutar | `cancelled` |
| Omitida | `skipped` |

El estado puede materializarse por rendimiento, pero su transición debe coincidir con los intentos. No basta un `completed_at` sin identificar la ejecución que produjo el cumplimiento.

Se separan dos métricas:

- cumplimiento del plan: una sesión planificada completada mediante su primaria;
- actividad real: todas las ejecuciones válidas que ocurrieron.

Los récords personales pueden considerar todos los intentos válidos. La progresión prescrita usa únicamente la primaria, salvo una regla futura explícita y versionada.

### Invariantes

1. Una ejecución se vincula como intento de máximo una sesión planificada.
2. Los números de intento son únicos y monotónicos dentro de la sesión planificada.
3. Solo una ejecución completada y válida puede ser primaria.
4. Reanudar no crea un intento nuevo.
5. Cambiar la primaria conserva historial de la selección anterior y actor/motivo.
6. Invalidar la primaria no promueve silenciosamente otro intento; deja la sesión pendiente de resolución.
7. Intentos abandonados, retries e invalidados no se borran para simular una única ejecución.
8. Adherencia cuenta máximo un cumplimiento por sesión planificada.
9. Una sesión espontánea puede existir sin vínculo de intento.
10. V1 no combina varias ejecuciones como cumplimiento parcial de una sola prescripción.

### Consecuencias

#### Positivas

- El historial refleja abandono, repetición, importación e invalidación sin sobrescrituras.
- Adherencia y progresión tienen una fuente inequívoca.
- Offline e idempotencia pueden manejar duplicados de transporte sin perder intentos reales.
- El modelo queda preparado para retries sin implementar todavía sesiones divididas.

#### Costos

- Se añade una tabla de vínculo y lógica transaccional para numeración/primaria.
- La UI debe distinguir continuar, abandonar y empezar otro intento.
- Analítica debe separar ejecuciones físicas de cumplimiento del plan.
- Cambiar o invalidar la primaria requiere herramientas y auditoría.

### Escenarios de prueba obligatorios

1. Iniciar dos veces con la misma idempotency key devuelve el mismo intento.
2. Reanudar una ejecución pausada no incrementa `attempt_number`.
3. Abandonar el intento 1 y completar el 2 selecciona el 2 como primaria.
4. Completar el intento 3 no reemplaza automáticamente la primaria 2.
5. Dos transacciones concurrentes no crean el mismo número ni dos primarias.
6. Una ejecución no puede vincularse a dos sesiones planificadas.
7. Invalidar la primaria deja resolución pendiente y conserva todos los resultados históricos.
8. Adherencia cuenta una sesión; actividad real puede contar varios intentos completados.
9. Una sesión espontánea permanece válida sin `planned_session_execution`.
10. La API rechaza agrupar varios intentos como cumplimiento dividido en V1.

---

## ADR-011 — Correcciones profesionales sin sobrescribir ejecuciones ajenas

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

Una ejecución y sus resultados pertenecen al historial de la persona, aunque un profesional los capture durante una sesión acompañada. El profesional necesita corregir errores propios y aportar criterio técnico, pero no debe poder reescribir declaraciones de la persona, datos de dispositivos o hechos completados sin evidencia.

Un permiso genérico `manage_execution` mezclaría captura, anotación, corrección, invalidación y ownership. La procedencia de cada dato debe determinar qué acciones son válidas.

### Decisión

Un profesional con relación activa, scope vigente y capacidad específica puede:

- capturar resultados durante una ejecución activa;
- corregir mientras está activa los valores que él mismo está registrando;
- revisar posteriormente sus propias capturas mediante una revisión append-only y notificación a la persona;
- crear, revisar o invalidar sus propias observaciones/notas profesionales conservando versiones;
- proponer correcciones sobre valores introducidos por la persona, estado final, vínculo de intento o clasificación relevante;
- reportar duplicados, fraude o datos de integración problemáticos para un flujo restringido.

No puede:

- sobrescribir directamente datos declarados por la persona;
- modificar datos crudos de wearables/integraciones;
- editar RPE, dolor, sensaciones u otras declaraciones subjetivas de la persona;
- cambiar silenciosamente el estado final, la ejecución primaria o el vínculo con una sesión planificada;
- escribir directamente récords o métricas derivadas;
- eliminar una ejecución o resultado para ocultar el valor original.

### Matriz de autoridad

| Categoría | Acción profesional |
| --- | --- |
| Prescripción futura | Nueva revisión de prescripción; no modifica ejecución pasada |
| Captura propia durante sesión activa | Crear/corregir con procedencia profesional |
| Captura propia después de completar | Revisión auditada; conserva original y notifica |
| Valor declarado por la persona | Propuesta; requiere aceptación de la persona |
| Raw de dispositivo/integración | Inmutable; reportar, excluir de análisis o crear normalización separada |
| Nota/evaluación profesional propia | Versionar o invalidar conservando historial |
| Declaración subjetiva de la persona | No editar; comentar o solicitar corrección |
| Estado final, vínculo de intento o primaria | Propuesta o soporte restringido; nunca cambio silencioso |
| Métrica/PR derivado | Recalcula el sistema con algoritmo versionado |

### Procedencia

Toda captura conserva como mínimo:

```text
subject_person_id
recorded_by_person_id
source
relationship_id
organization_id
recorded_at
```

Las fuentes se distinguen explícitamente:

- `person_reported`;
- `professional_entry`;
- `professional_observation`;
- `device_observation`;
- `system_derived`.

La persona es sujeto/propietaria lógica del historial. `recorded_by` y `source` conservan autoría y método de captura, pero no transfieren ownership.

### Propuestas y revisiones

`fitness.correction_proposals` registra propuestas sobre datos que el profesional no puede revisar directamente:

- target tipado;
- valor propuesto;
- motivo;
- actor y relación;
- estado `pending`, `accepted`, `rejected`, `withdrawn` o `expired`;
- persona que revisó y timestamps.

Aceptar una propuesta ejecuta un comando tipado que crea `fitness.revision_events` y actualiza la proyección canónica. No se aplican JSON Patch arbitrarios sobre tablas. La revisión conserva valor anterior, valor nuevo, actor, motivo, procedencia y timestamp.

Los datos raw de integración permanecen inmutables. Una anomalía puede producir `excluded_from_analysis`, un registro normalizado separado y un recálculo versionado, pero nunca alterar el payload original.

### Capacidades

No existe `manage_execution`. Las capacidades son explícitas:

```text
execution.read
execution.contribute
execution.annotate
execution.propose_correction
own_capture.revise
professional_note.revise
execution.invalidate_request
```

Un access level general del grant no amplía estas capacidades ni permite evitar ownership, procedencia o aprobación. `relationship_training` con `contribute` habilita captura dentro de la relación, no edición universal del historial.

### Fin de relación

Al terminar la relación:

- se bloquean nuevas capturas, notas y propuestas operativas;
- las propuestas pendientes expiran o quedan bloqueadas según política;
- revisiones ya aceptadas permanecen en el historial;
- notas retenidas siguen ADR-005;
- una disputa posterior usa soporte restringido y auditado, no endpoints normales de Studio.

### Invariantes

1. Ninguna corrección destruye el valor original ni su procedencia.
2. Un profesional solo revisa directamente capturas u observaciones de su propia autoría.
3. Cambiar un valor declarado por la persona requiere su aceptación o soporte restringido con fundamento auditado.
4. Raw de dispositivo/importación es inmutable.
5. Métricas derivadas registran algoritmo/versión y se recalculan; no se editan manualmente.
6. Una nota profesional no puede suplantar una declaración de la persona.
7. Toda revisión registra actor, motivo, relación, before/after y timestamp.
8. Terminar la relación bloquea nuevas correcciones operativas.
9. Ningún rol organizacional por sí solo concede corrección sobre clientes.
10. Los comandos de corrección son tipados e idempotentes.

### Consecuencias

#### Positivas

- La persona conserva control y trazabilidad de su historial.
- El profesional puede corregir errores propios sin perder evidencia.
- Dispositivo, persona, profesional y sistema mantienen procedencias diferenciadas.
- Auditoría y analítica pueden reconstruir el valor observado y el canónico.

#### Costos

- Se necesitan propuestas, eventos de revisión y proyecciones canónicas.
- La UI debe mostrar solicitudes, before/after, autor y motivo.
- Recalcular métricas derivadas requiere jobs/eventos versionados.
- Soporte necesita un flujo excepcional separado de Studio operativo.

### Escenarios de prueba obligatorios

1. Un profesional con `contribute` registra y corrige su captura durante una sesión activa.
2. Revisar una captura profesional completada conserva el original y notifica a la persona.
3. Proponer cambiar un valor de la persona no altera el canónico hasta que ella acepta.
4. Rechazar o expirar una propuesta no modifica resultados.
5. Un profesional no puede editar RPE/dolor declarado por la persona ni raw de wearable.
6. Excluir raw de análisis conserva el payload y produce una decisión auditada.
7. Modificar un dato base recalcula el resultado derivado con versión de algoritmo.
8. Un profesional no puede cambiar directamente primaria, estado final o vínculo de intento.
9. Terminar la relación bloquea nuevas propuestas y revisiones operativas.
10. Un admin de organización sin relación/scope/capacidad no puede corregir datos del cliente.

---

## ADR-012 — Eliminación, anonimización y conservación restringida por categoría

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

ADR-005 define qué ocurre al terminar una relación profesional, pero el ecosistema también necesita reglas para el cierre de una cuenta u organización, la desconexión de una integración, la revocación de un propósito y el vencimiento de una obligación de conservación.

Un `deleted_at` universal no expresa si el dato debe desaparecer físicamente, permanecer solo como estadística irreversible o conservarse con acceso excepcional. Tampoco distingue anonimización de seudonimización: reemplazar un identificador, cifrarlo o separar la llave sigue permitiendo reidentificar y, por tanto, no equivale a eliminar el dato personal.

### Decisión

Todo dato administrado por Allfit debe pertenecer a una categoría con una política versionada y una disposición final explícita:

- `delete`: eliminación física de los sistemas activos cuando termina la finalidad o procede una solicitud válida de supresión;
- `anonymize`: transformación irreversible que elimina identificadores directos, indirectos y llaves de enlace cuando solo subsiste una finalidad estadística legítima;
- `retain_restricted`: conservación temporal y mínima por obligación legal o contractual, evidencia bilateral, seguridad, fraude, controversia o `legal_hold` documentado.

La política se resuelve por categoría, finalidad, evento de inicio, jurisdicción y versión. No existe un plazo global ni conservación indefinida por defecto. Un `legal_hold` suspende únicamente la disposición de los registros dentro de su alcance y debe registrar motivo, actor, vigencia y liberación.

Revocar un grant elimina todo acceso del tercero. Terminar una relación corta el acceso en vivo y transiciona sus grants `active` a `frozen` según ADR-005; ninguno de los dos eventos elimina por sí solo los datos del Fitness ID. La eliminación o anonimización ocurre por cierre de cuenta, solicitud válida de la persona o vencimiento de su propia finalidad. Los registros conservados quedan fuera de listados activos, analítica identificable, marketing y contexto ordinario de IA; la única excepción de lectura es la superficie histórica acotada definida por ADR-023.

### Matriz de disposición V1

| Categoría o evento | Disposición |
| --- | --- |
| PII privada, preferencias y perfil personal al cerrar el Fitness ID | `delete`, salvo campos mínimos afectados por una obligación o hold |
| Historial fitness, fotos, medidas, contexto de salud y datos opcionales ante supresión válida | `delete`; la organización no conserva una copia completa |
| Revocación de un scope | Revocar todo acceso del tercero; el dato permanece con la persona hasta que aplique su política propia |
| Terminación de relación | Cortar acceso en vivo y congelar la ventana histórica en `T`; el dato permanece con la persona hasta que aplique su política propia |
| Invitaciones vencidas, rechazadas o completadas | Invalidar token de inmediato y eliminar contacto/payload tras la ventana mínima de seguridad y auditoría |
| Borradores de onboarding, archivos temporales y cargas abandonadas | `delete` al vencer su finalidad breve |
| Tokens de sesión, dispositivo e integración | Revocar y `delete` al cerrar sesión, desconectar o retirar autorización según corresponda |
| Payload raw de integraciones/wearables | `delete` después de normalización y ventana diagnóstica; el dato normalizado sigue la política personal |
| Copias temporales usadas como contexto de IA | `delete` al terminar el run y su ventana técnica; nunca entrenamiento de modelos por defecto |
| Analítica y métricas agregadas sin necesidad de identidad | `anonymize` de forma irreversible antes de conservación estadística |
| Contratos, órdenes, facturas, pagos y reembolsos | `retain_restricted` durante el plazo aplicable y luego ejecutar su disposición final |
| Consentimientos, revocaciones, auditoría y evidencia de seguridad/fraude | `retain_restricted`, append-only y con finalidad/plazo definidos |
| Evidencia bilateral de relación, asignación y servicio | `retain_restricted` en su mínima expresión; nunca el Fitness ID completo |
| Programas, plantillas y activos propios de la organización | Archivar/conservar con autoría y procedencia; no son PII eliminable por cerrar la cuenta de un cliente |
| Contenido afectado por controversia o `legal_hold` | `retain_restricted` solo dentro del alcance y hasta liberar el hold |

### Identidad, integridad referencial y respaldos

- Al cerrar la cuenta se deshabilita/elimina el acceso en WorkOS AuthKit, se revocan sesiones y se desvincula `identity.accounts` conforme al flujo coordinado.
- `identity.person_private` y demás PII se eliminan. Puede permanecer un tombstone técnico sin PII únicamente si una referencia histórica legítima lo exige.
- Un tombstone no conserva email, teléfono, nombre ni una llave accesible de reidentificación.
- La supresión se propaga a cachés, índices, réplicas, storage y sistemas derivados.
- En backups, la eliminación se completa mediante expiración documentada. Una restauración no puede reactivar datos cuya disposición ya fue ejecutada; los eventos de disposición deben reaplicarse antes de abrir el sistema restaurado.
- Puede conservarse de forma restringida un marcador mínimo de supresión/no contacto cuando sea necesario para evitar reimportar o volver a contactar a la persona; ese marcador sigue siendo dato protegido y tiene política propia.

### Modelo lógico mínimo

- `privacy.retention_policies`: categoría, finalidad, jurisdicción, evento inicial, duración/regla, acción final, versión y vigencia.
- `privacy.erasure_requests`: solicitud, sujeto, alcance, base, estado, decisiones por categoría y resolución.
- `privacy.legal_holds`: motivo, alcance tipado, actor, inicio, vencimiento/revisión y liberación.
- `privacy.disposition_events`: categoría, target tipado, política aplicada, acción, resultado, actor/job y timestamps.

Las tablas con datos sujetos a disposición exponen su categoría y la información necesaria para calcular `retention_until`, sin copiar una constante a cada servicio. El worker de disposición es idempotente, auditable y aplica borrado o anonimización mediante comandos tipados; no usa patches genéricos.

### Invariantes

1. Cada categoría personal tiene finalidad, trigger, política versionada y disposición final.
2. `soft delete`, cifrado y seudonimización no satisfacen por sí solos una eliminación o anonimización.
3. La anonimización es irreversible y elimina tanto identificadores directos como vías razonables de enlace.
4. Revocar acceso no elimina automáticamente el dato que la persona conserva en su Fitness ID.
5. Una obligación o hold conserva solo el mínimo necesario y nunca mantiene acceso operativo ordinario.
6. Ningún hold es global o indefinido por defecto; tiene alcance, revisión, vigencia y liberación auditados.
7. Los datos retenidos no se reutilizan para marketing, IA o analítica identificable sin base y autorización independientes.
8. Los activos no personales de una organización conservan autoría/procedencia aunque se archive su creador o cierre una relación.
9. La disposición alcanza sistemas activos y derivados; los backups convergen mediante expiración y no reintroducen datos eliminados.
10. Los plazos concretos se validan por categoría y jurisdicción antes de producción.

### Consecuencias

#### Positivas

- El ciclo de vida del dato es comprobable y no depende de un `deleted_at` ambiguo.
- La persona puede cerrar su cuenta sin borrar evidencia que Allfit esté obligado a conservar ni dejar su Fitness ID navegable para terceros.
- Analítica histórica puede sobrevivir únicamente sin capacidad razonable de reidentificación.
- Integraciones, IA, storage y backups quedan incluidos en la supresión, no solo PostgreSQL.

#### Costos

- Se necesita inventario de categorías y validación jurídica por jurisdicción.
- El backend requiere orquestación de disposición, holds y restauraciones.
- La anonimización debe probarse contra identificadores indirectos y conjuntos pequeños.
- Soporte y cumplimiento necesitan una interfaz separada, restringida y auditada.

### Escenarios de prueba obligatorios

1. Cerrar una cuenta revoca sesiones y elimina PII y datos personales configurados sin afectar activos legítimos de organizaciones.
2. Revocar `body_progress` bloquea al profesional, pero no borra las medidas del Fitness ID de la persona.
3. Una solicitud de supresión produce decisiones trazables por categoría y no una respuesta global opaca.
4. Un registro bajo hold no se elimina; otro registro fuera de su alcance sí ejecuta su política vencida.
5. Liberar un hold reanuda la disposición pendiente de manera idempotente.
6. Desconectar un wearable elimina credenciales de inmediato y sus raw payloads según la ventana configurada.
7. La analítica conservada no contiene identificadores ni llaves que permitan volver a la persona.
8. Un rol operativo no puede consultar registros `retain_restricted`.
9. Restaurar un backup reaplica disposiciones posteriores al snapshot antes de habilitar tráfico.
10. Reintentar un job no duplica eventos ni cambia el resultado de una disposición ya completada.

---

## ADR-013 — Contratos mínimos y versionados de resultados por tipo de actividad

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

El núcleo multidisciplina necesita resultados comparables sin convertir fuerza en el modelo universal ni almacenar cada modalidad dentro de un JSON libre. Una disciplina agrupa semántica, pero no determina por sí sola todos los resultados: una carrera continua y una carrera por intervalos pertenecen a running y requieren contratos distintos.

También es necesario separar el hecho de completar una actividad del nivel de detalle capturado. Una persona puede registrar válidamente una práctica sin wearable o sin diligenciar cada paso; ese registro no debe fingir precisión suficiente para calcular adherencia detallada o progresión.

### Decisión

Cada `catalog.activity_type` debe admitir uno o más contratos de resultados publicados y versionados. La plantilla, sesión planificada o ejecución congela la versión aplicable; una modificación futura del contrato no cambia el historial.

Toda ejecución conserva:

- el envelope universal de sesión;
- `result_contract_id` y versión;
- `result_completeness` certificado;
- `result_validation_status` y evidencia de validación;
- resultados tipados por modalidad y procedencia.

Los niveles certificados son:

- `summary`: mínimo necesario para un registro histórico válido de la modalidad;
- `detailed`: suficiente para contrastar resultados contra targets o pasos planificados;
- `sensor_enriched`: cumple `detailed` y añade series o mediciones de dispositivos.

`partial` es un estado de ingesta para una importación o captura que todavía no satisface `summary`; no se presenta como nivel certificado ni alimenta adherencia o progresión precisa. El estado de ejecución y la completitud son dimensiones diferentes: `completed` no implica `detailed` ni `sensor_enriched`.

### Envelope universal

Toda sesión ejecutada registra como mínimo:

- `subject_person_id`;
- `discipline_code` y `activity_type_code`;
- `started_at` y `ended_at`, o una duración efectiva consistente;
- timezone original;
- estado de ejecución;
- fuente, procedencia y actor/dispositivo de captura;
- vínculo opcional a planificación, relación y organización;
- contrato, versión y nivel de resultados.

Cada observación especializada conserva sesión y, cuando aplique, segmento/paso/movimiento, orden o intervalo temporal, valor y unidad canónica, fuente, actor, momento, validez y revisiones. `NULL` significa “no capturado”; cero significa un cero observado. No se rellenan métricas faltantes con valores por defecto.

### Contratos iniciales V1

| Familia inicial | Mínimo `summary` | Mínimo `detailed` |
| --- | --- | --- |
| Fuerza/calistenia | Duración efectiva y cantidad de esfuerzos o sets completados | Al menos un set con movimiento o paso, orden, estado y una cantidad lograda entre repeticiones, duración o distancia; carga, RPE, RIR y tempo son opcionales |
| Running | Duración y distancia efectivas | Laps o intervalos ordenados con duración y distancia lograda; vínculo al paso planificado cuando exista |
| Yoga/movilidad | Duración efectiva y estado de realización | Secuencia ordenada con postura/movimiento, lado cuando aplique, estado y al menos duración, repeticiones o rango observado |
| Híbrido | Al menos dos segmentos de familias diferentes, ordenados y con límites temporales; cada uno cumple su contrato `summary` | Cada segmento cumple el contrato `detailed` de su propio `activity_type`; las transiciones permanecen explícitas |

La frecuencia cardiaca, calorías, GPS, ruta, RPE, carga, movimientos, segmentos y datos de wearable no son universales. Un contrato concreto puede exigir alguno cuando sea esencial para su semántica, pero no se añaden como columnas obligatorias de `fitness.sessions`.

Natación, ciclismo, pilates, cross-training y nuevas modalidades no pueden producir resultados certificados hasta publicar su contrato, fixtures y pruebas. Pueden ingresar temporalmente como actividad `partial` sin forzar sus datos dentro de contratos ajenos.

### Resultados derivados

Ritmo, velocidad, volumen, récords, adherencia y demás valores calculables no se capturan como una segunda verdad cuando pueden derivarse de observaciones base. Si se materializan, registran:

- código y versión del algoritmo;
- inputs y revisiones utilizados;
- timestamp de cálculo;
- estado de vigencia;
- capacidad de recálculo.

Una revisión de un dato base invalida o recalcula los derivados afectados conforme a ADR-011.

### Modelo lógico y validación

- `catalog.result_contracts`: código, versión, familia, nivel, estado, reglas publicadas y vigencia.
- `catalog.activity_type_result_contracts`: asociación entre tipo de actividad y contratos permitidos/default por vigencia.
- `fitness.sessions`: contrato/version congelados, completitud y estado de validación.
- `fitness.result_validation_events`: contrato, nivel solicitado/alcanzado, errores tipados, actor/job y timestamp.
- Tablas tipadas como `strength_sets`, `endurance_laps`, resultados de secuencia, segmentos, intervalos y muestras temporales.

El comando idempotente `finalize_execution` resuelve y congela la versión, valida el envelope, el mínimo del nivel solicitado, unidades/rangos y la integridad entre detalles. Los checks y FKs protegen reglas por fila; las reglas que cruzan tablas se validan dentro del comando transaccional, no mediante `CHECK` que consulte otras filas.

JSONB puede expresar reglas publicadas o extensiones experimentales con `schema_version`, pero ningún resultado usado para filtros, progresión, adherencia o RLS depende únicamente de claves JSON sin contrato tipado.

### Invariantes

1. El contrato operativo se selecciona por `activity_type`, no solo por disciplina.
2. Toda ejecución histórica conserva la versión exacta del contrato aplicado.
3. `completed`, `summary`, `detailed` y `sensor_enriched` no son sinónimos.
4. Un nivel superior satisface los mínimos de los niveles inferiores.
5. Ningún sensor o resultado subjetivo es obligatorio para todas las disciplinas.
6. Targets planificados y resultados observados permanecen separados.
7. `NULL` nunca se transforma implícitamente en cero.
8. Los resultados operativos frecuentes usan estructuras, valores y unidades tipados.
9. Los derivados conservan algoritmo/versión y se recalculan al cambiar sus inputs.
10. Una modalidad nueva necesita contrato publicado, fixtures y pruebas antes de certificar resultados.

### Consecuencias

#### Positivas

- El historial acepta capturas manuales, profesionales e importadas sin inventar precisión.
- Adherencia y progresión pueden declarar qué nivel de datos necesitan.
- Agregar disciplinas no ensancha la tabla universal ni deforma sus resultados.
- Las versiones permiten evolucionar contratos sin reinterpretar sesiones antiguas.

#### Costos

- Se necesita gobernanza y versionado de contratos por tipo de actividad.
- La finalización exige validación transaccional entre tablas.
- La UI debe comunicar cuándo un registro es parcial, resumen o detallado.
- Cada modalidad nueva requiere fixtures y pruebas propias.

### Escenarios de prueba obligatorios

1. Una sesión de fuerza `summary` se completa sin carga/RPE y no habilita progresión por movimiento.
2. Fuerza `detailed` rechaza un set sin movimiento/paso o sin cantidad lograda.
3. Running `summary` exige duración y distancia; ritmo se deriva y no se duplica como verdad independiente.
4. Running por intervalos `detailed` conserva orden, duración, distancia y vínculo opcional al paso.
5. Yoga `summary` no exige wearable ni detalle de cada postura.
6. Yoga/movilidad `detailed` valida secuencia, lado y cantidad observada cuando correspondan.
7. Una sesión híbrida exige al menos dos familias y valida cada segmento con su contrato congelado.
8. `sensor_enriched` sin detalle válido no se certifica como tal.
9. Una importación incompleta permanece `partial` y no alimenta adherencia detallada.
10. Publicar otra versión del contrato no altera ni revalida silenciosamente ejecuciones históricas.
11. Corregir un dato base recalcula derivados con algoritmo/version auditados.
12. Reintentar `finalize_execution` no duplica detalles ni eventos de validación.

---

## ADR-014 — Independencia funcional sin tolerancia física separada en V1

**Estado:** en revisión<br>
**Fecha:** 18 de julio de 2026

### Contexto

Allfit Space y Allfit Studio deben funcionar como productos con valor propio, pero comparten persona, Fitness ID, relaciones, consentimientos, entrenamiento y transacciones. Interpretar “independencia” como dos dominios físicos de persistencia desde V1 exigiría duplicar o sincronizar esas verdades mediante consistencia eventual, eventos, resolución de conflictos y controles de privacidad distribuidos.

La arquitectura necesita declarar qué fallos deben quedar aislados y cuáles forman parte del riesgo aceptado. Sin esa definición, “independiente” puede prometer una disponibilidad que una única base compartida no puede cumplir o, en el extremo contrario, permitir que un job exclusivo de Studio degrade innecesariamente Space.

### Decisión

En V1, independencia significa:

- valor funcional y comercial propio para Space y Studio;
- frontends, WorkOS Applications y contratos HTTP separados;
- despliegues de frontend independientes;
- límites de dominio y módulos/workers extraíbles;
- aislamiento operativo razonable mediante cuotas, pools, timeouts, rate limits y colas diferenciadas.

No significa tolerancia física separada ante la caída total de PostgreSQL, WorkOS AuthKit o infraestructura API compartida. El ecosistema mantiene por ambiente un WorkOS environment y un PostgreSQL/Supabase compartidos. Una indisponibilidad total de la fuente autoritativa puede degradar ambos productos y constituye un riesgo explícitamente aceptado para V1.

No se fijan SLO, RTO o RPO numéricos en este ADR. Deben acordarse antes de producción, medirse por producto y contrastarse con los límites reales de las dependencias compartidas.

### Matriz de aislamiento y degradación

| Fallo | Comportamiento V1 |
| --- | --- |
| Frontend de Space | Studio continúa funcionando |
| Frontend de Studio | Space continúa funcionando |
| Worker o integración exclusiva de Studio | Space continúa; Studio reintenta mediante cola/DLQ sin bloquear requests síncronos |
| Proveedor externo usado por V1 | El núcleo continúa cuando la operación puede degradarse; la capacidad afectada aplica timeout/circuit breaker |
| Endpoint/módulo específico de un producto | El otro contrato permanece disponible si API y PostgreSQL compartidos están sanos |
| WorkOS AuthKit | Login/refresh pueden fallar; la API solo acepta tokens vigentes que pueda verificar de forma segura |
| PostgreSQL compartido | Ambos productos pierden operaciones que requieren estado autoritativo; se permiten únicamente degradaciones explícitas |
| Caché, réplica o read model atrasado | Nunca concede permisos, consentimiento, capacidad, pago o estado confirmado |

### Degradación segura

- Space puede conservar borradores locales de ejecuciones y sincronizarlos después mediante comandos idempotentes y detección de conflictos.
- Studio puede conservar borradores no enviados, pero no confirmar asignaciones, membresías organizacionales o cambios de permisos sin estado autoritativo.
- Autorización, grants y operaciones sensibles V1 fallan cerrados; capacidades futuras de disponibilidad y dinero deben heredar esta regla.
- La UI distingue `draft/local`, `pending_sync`, `confirmed` y `failed`; nunca presenta un dato cacheado como confirmación del servidor.
- Reintentar tras recuperación conserva idempotency keys y no duplica ejecuciones, asignaciones o invitaciones.

### Aislamiento operativo obligatorio desde V1

- rate limits, presupuestos de concurrencia y observabilidad separados por WorkOS Application/contrato;
- límites de conexión, `statement_timeout` y queries cancelables para contener noisy neighbors;
- colas, retries y dead-letter queues separadas por dominio o clase de trabajo;
- circuit breakers y timeouts para proveedores externos;
- jobs con credenciales/grants específicos, sin rol universal;
- outbox/inbox e idempotencia para procesamiento asíncrono;
- métricas de disponibilidad, errores y latencia diferenciadas para Space y Studio;
- restauración, backups y recuperación probados sobre la dependencia compartida.

Compartir deployment de API en la primera etapa es válido si mantiene estos límites. Los módulos o workers pueden separarse físicamente cuando su perfil de carga o fallo lo justifique, sin separar todavía la fuente de verdad.

### Disparadores para separación física

Se reevalúa esta decisión cuando exista evidencia de uno o más de estos factores:

- SLO, RTO, RPO o ventanas de mantenimiento incompatibles entre productos/dominios;
- requisito contractual de que un producto continúe escribiendo durante la caída del otro;
- obligación regulatoria, residencia o aislamiento de datos;
- noisy neighbors demostrados que no se controlan con cuotas, pools o optimización;
- escalamiento, costos o perfiles de carga claramente divergentes;
- equipos que necesitan autonomía de despliegue de backend con ownership separado;
- incidentes repetidos cuyo blast radius compartido excede el riesgo aceptado.

La extracción se realiza por bounded context/dominio —por ejemplo booking, commerce, integrations o intelligence—, no copiando todas las entidades en una `space_database` y una `studio_database`. Cada extracción define fuente de verdad, contratos/eventos, consistencia, privacidad, reconciliación y estrategia de backfill/cutover. Identidad, privacidad y Fitness ID mantienen una autoridad inequívoca.

### Invariantes

1. Independencia funcional no se presenta como alta disponibilidad física separada.
2. Space y Studio no duplican el Fitness ID para simular aislamiento.
3. Un fallo exclusivo de frontend, worker o proveedor de un producto no debe derribar el otro cuando las dependencias comunes están sanas.
4. PostgreSQL compartido es un dominio de fallo común aceptado y observado en V1.
5. Ningún cache/read model atrasado autoriza operaciones sensibles.
6. Toda operación diferida es idempotente y expone su estado real al usuario.
7. Autorización y consentimiento fallan cerrados; capacidad y dinero heredarán la regla cuando entren en alcance.
8. Los recursos compartidos tienen límites por producto/dominio para contener noisy neighbors.
9. La separación futura ocurre por dominio y declara una única fuente de verdad.
10. SLO/RTO/RPO deben definirse y probarse antes de producción; no se infieren de la topología.

### Consecuencias

#### Positivas

- Se conserva consistencia fuerte para identidad, privacidad y entrenamiento compartidos, extensible a futuros dominios.
- V1 evita sincronización distribuida y resolución prematura de conflictos.
- Los fallos locales se contienen sin prometer supervivencia ante una caída de la base común.
- Los eventos y límites de dominio preparan una extracción basada en evidencia.

#### Costos

- PostgreSQL, WorkOS AuthKit y la infraestructura API compartida mantienen blast radius común.
- Se requieren observabilidad, cuotas y pruebas de degradación desde el inicio.
- El modo offline/draft necesita estados visibles, idempotencia y reconciliación.
- Una separación futura seguirá siendo un proyecto explícito, no una consecuencia automática de usar schemas.

### Escenarios de prueba obligatorios

1. Una caída del frontend de Space no afecta Studio y viceversa.
2. Un worker de Studio saturado no consume el presupuesto reservado de requests de Space.
3. Un proveedor externo usado por V1 abre su circuit breaker sin bloquear operaciones independientes.
4. PostgreSQL no disponible impide confirmaciones sensibles en ambos productos y muestra degradación explícita.
5. Space crea un borrador local durante la caída y lo sincroniza una sola vez al recuperarse.
6. Studio no confirma asignación, cambio de permisos o grant usando caché/read model atrasado.
7. Reintentos posteriores a recuperación no duplican operaciones.
8. Métricas y alertas permiten distinguir impacto Space, Studio, dominio y dependencia compartida.
9. Un ejercicio de restauración cumple los RTO/RPO acordados antes de producción.
10. Una propuesta de extracción identifica dominio, fuente de verdad y consistencia; se rechaza si solo duplica tablas por producto.

---

## ADR-015 — Consentimiento a la parte responsable con acceso por profesionales asignados

**Estado:** aceptada para V1<br>
**Fecha:** 20 de julio de 2026; ratificada el 17 de agosto de 2026

### Contexto

Un consentimiento concedido únicamente al profesional dificulta equipos, reemplazos y responsabilidad organizacional. Concederlo a toda la organización, en cambio, puede interpretarse como acceso para cualquier miembro. Mantener grants independientes para organización y profesional duplica evidencia y vuelve ambiguas la revocación, la reasignación y la terminación.

Además, la organización unipersonal de Allfit es una frontera técnica/operativa y no implica por sí sola una persona jurídica. El modelo debe distinguir quién responde legal o contractualmente por el servicio, dónde se opera y qué persona concreta consulta los datos.

### Decisión

Para los servicios V1, cada consentimiento se concede en el contexto de una `service_relationship` a la parte responsable identificada y se materializa operativamente sobre la organización de esa relación.

- `relationship_id` y `grantee_organization_id` son obligatorios en los grants de servicio.
- La evidencia de consentimiento identifica a la parte natural o jurídica responsable, el nombre presentado de la organización, propósito, scope, texto/version y vigencia.
- El grant no habilita a todos los miembros de la organización.
- Los profesionales son actores autorizados, no receptores independientes del consentimiento.
- El acceso efectivo exige simultáneamente relación y grant vigentes, asignación profesional efectiva, membresía activa, capacidad explícita, propósito y scope compatibles.
- Un administrador no obtiene acceso a datos fitness por su rol administrativo.
- `grantee_person_id` no se usa para grants normales de servicio en V1; queda reservado para futuros flujos personales que no dependan de una organización.

La clasificación jurídica definitiva de responsable/encargado depende del contrato y la operación real. El modelo conserva la parte responsable comunicada a la persona sin inferir que toda `professional_practice` es una persona jurídica.

### Organización unipersonal y organización empresarial

| Caso | Parte responsable presentada | Organización operativa | Actor autorizado |
| --- | --- | --- | --- |
| Coach independiente | El coach como persona natural, junto con su nombre comercial cuando aplique | Su `professional_practice` | El coach asignado |
| Gimnasio/empresa | La persona jurídica o parte contractual identificada | La organización del gimnasio | Profesionales explícitamente asignados |
| Equipo profesional sin persona jurídica distinta | La persona natural/parte contractual definida | La `professional_practice` compartida | Solo integrantes asignados y autorizados |

La interfaz nunca presenta una organización técnica como si demostrara por sí sola existencia o personalidad jurídica.

### Reasignación

Cuando cambia el profesional dentro de la misma organización y permanecen la misma parte responsable, finalidad y scopes:

1. la asignación anterior termina con vigencia efectiva;
2. el profesional anterior pierde acceso inmediatamente;
3. el nuevo profesional accede desde el inicio efectivo de su asignación;
4. el evento conserva actor, motivo, before/after y timestamps;
5. la persona recibe una notificación clara;
6. el grant no se duplica ni requiere una nueva aceptación.

Se requiere un nuevo consentimiento si cambia la organización, la parte responsable, la finalidad o el scope. Si un coach abandona un gimnasio y continúa atendiendo desde su propia práctica, se crea una nueva relación y nuevos grants.

### Modelo lógico mínimo

- `privacy.data_grants`: sujeto, relación, organización grantee, scope, nivel, propósito, vigencia, estado y versión/evidencia.
- `privacy.consent_events`: eventos append-only con snapshot de la parte responsable, organización presentada, texto, canal y decisión de la persona.
- `organizations.relationship_professional_assignments`: relación, profesional, rol en la atención, vigencia, actor y motivo.
- `privacy.access_events`: actor humano real, organización, relación, scope, propósito y recurso consultado.

La representación tipada de una parte responsable natural o jurídica se cierra en el modelo lógico; no se implementa como un UUID polimórfico sin integridad referencial.

### Invariantes

1. Todo grant de servicio V1 pertenece a una relación y organización concretas.
2. La persona conoce la parte responsable, finalidad, scope y vigencia que acepta.
3. Membresía o rol administrativo por sí solos no conceden acceso al Fitness ID.
4. Solo profesionales con asignación efectiva y capacidad compatible ejercen el grant.
5. La organización no hereda acceso a categorías no incluidas en el scope.
6. Reasignar dentro de la misma parte responsable revoca al actor anterior antes de habilitar al nuevo.
7. Cambiar organización, parte responsable, finalidad o scope exige un nuevo consentimiento.
8. Cada acceso registra al profesional real; no se audita únicamente a la organización.
9. Una práctica unipersonal no se trata automáticamente como persona jurídica.
10. Revocar el grant bloquea a todos sus actores autorizados sin borrar la evidencia histórica.

### Consecuencias

#### Positivas

- La responsabilidad y la finalidad permanecen estables durante reemplazos internos.
- El acceso continúa siendo individual, mínimo y auditable.
- Coaches unipersonales y gimnasios usan el mismo modelo operativo.
- La revocación tiene un único efecto inequívoco sobre la relación.

#### Costos

- El onboarding debe mostrar parte responsable, organización y profesionales asignados sin confundirlos.
- RLS necesita combinar grant, relación, asignación, membresía y capacidad.
- Reasignaciones requieren notificación e historial efectivo.
- El modelo lógico deberá representar partes naturales/jurídicas con integridad.

### Escenarios de prueba obligatorios

1. Un coach asignado con grant vigente accede únicamente a los scopes concedidos.
2. Otro coach de la misma organización sin asignación no accede.
3. Un administrador organizacional sin asignación/capacidad no accede a datos fitness.
4. En una práctica unipersonal, el consentimiento identifica al coach como parte responsable y opera mediante su organización.
5. Reasignar dentro de la misma parte responsable revoca al anterior, habilita al nuevo, notifica y conserva un solo grant.
6. Dos profesionales concurrentes solo acceden si ambos tienen asignaciones explícitas vigentes.
7. Cambiar a otra organización o parte responsable exige otra relación y consentimiento.
8. Cambiar o ampliar el scope exige aceptación independiente.
9. Revocar el grant bloquea inmediatamente a todos los profesionales que lo ejercían.
10. Cada lectura sensible audita al actor humano, organización, relación, scope y propósito.

### Referencias normativas de contexto

- [Ley 1581 de 2012 — Secretaría del Senado](https://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html): finalidad, libertad, acceso restringido, autorización y deberes de responsables/encargados.
- [SIC — autorización explícita para datos sensibles de salud](https://www.sic.gov.co/boletin-juridico-abril-2017/tratamiento-de-los-datos-sensibles-en-casos-relativos-a-la-salud).

Estas referencias orientan la arquitectura y no sustituyen la validación jurídica de contratos, responsables y encargados antes de producción.

---

## ADR-016 — Contratos versionados de campos para los scopes V1

**Estado:** en revisión<br>
**Fecha:** 20 de julio de 2026

### Contexto

Nombrar un scope sin definir sus recursos, campos y exclusiones permite que cada endpoint lo interprete de forma distinta. También puede ampliar silenciosamente consentimientos anteriores cuando se añaden columnas nuevas. Una misma sesión puede mezclar resultados de entrenamiento, dolor, biometría y ubicación; autorizar la fila completa violaría la separación de categorías acordada en ADR-007.

El scope responde **qué datos** pueden tratarse para una finalidad. `access_level` y las capacidades responden **qué acciones** puede ejecutar el actor. Estas dimensiones no se combinan en un permiso genérico.

### Decisión

Cada scope V1 es un contrato publicado e inmutable identificado por `scope_code + definition_version`. Todo grant y evento de consentimiento conserva la versión exacta aceptada.

- Ampliar recursos, campos, finalidades o acciones máximas crea otra versión y exige nueva aceptación.
- Retirar exposición por seguridad puede aplicarse inmediatamente sin ampliar el consentimiento.
- Ningún campo nuevo entra automáticamente en grants existentes.
- Los endpoints declaran scope, versión mínima compatible, propósito y proyección devuelta.
- RLS controla elegibilidad de filas; tablas sensibles y vistas/proyecciones autorizadas controlan campos.
- El frontend no es la frontera de redacción.
- Un derivado hereda la clasificación más restrictiva de sus inputs.
- `NULL`, conteos, errores o metadatos no deben revelar una categoría no concedida.

### `relationship_training`

**Finalidad:** planificar, acompañar y evaluar entrenamiento producido dentro de la relación concreta.

Incluye:

- identidad técnica, vigencia y profesionales asignados de la relación;
- programa/versión asignados y snapshots de prescripción;
- plantillas/versiones, sesiones planificadas, pasos, instrucciones y targets;
- intentos y sesiones ejecutadas vinculadas a esa relación;
- fecha, duración, estado, disciplina, activity type, fuente y completitud;
- sets, reps, carga de ejercicio, duración, distancia, laps, intervalos, rondas y segmentos;
- RPE, RIR, tempo y demás resultados propios del entrenamiento;
- cumplimiento/adherencia derivados de esos datos;
- observaciones profesionales operativas, revisiones y procedencia ligadas a la ejecución.

Excluye:

- sesiones previas o autónomas fuera de la relación;
- peso corporal, composición, medidas y fotografías;
- dolor, lesiones, limitaciones, recuperación y readiness;
- frecuencia cardiaca, biometría, GPS/ruta y raw de wearables;
- nutrición, pagos, mensajes y notas internas no compartidas.

La carga externa de un ejercicio pertenece a entrenamiento; el peso corporal de la persona pertenece a `body_progress`. Un campo de dolor capturado durante una sesión sigue perteneciendo a `health_context`.

Acciones posibles: `read`, `contribute`, `annotate` y `propose_correction`, siempre combinadas con capacidades y procedencia de ADR-011. No permite overwrite personal.

### `prior_training_history`

**Finalidad:** permitir al profesional comprender la experiencia ejecutada fuera de la relación actual.

Incluye:

- sesiones anteriores al inicio de la relación;
- sesiones autónomas realizadas mientras el grant esté vigente;
- fecha, duración, disciplina, activity type, estado y completitud;
- resultados `summary` y `detailed` tipados;
- movimientos, sets, reps, cargas, laps, intervalos y segmentos ejecutados;
- récords personales, volumen, distancia, duración y ritmo derivados;
- procedencia general: personal, profesional, dispositivo o importación.

Excluye:

- programas maestros, plantillas privadas y metodología de otras organizaciones;
- notas u observaciones privadas de profesionales anteriores;
- identidad de organización/profesional anterior cuando no sea necesaria;
- body progress, health context, fotografías, biometría, GPS y raw de wearables;
- pagos y registros comerciales anteriores.

Acciones V1: `read` y `propose_correction`; nunca contribución o modificación directa. ADR-020 permite que la persona reduzca este conjunto mediante ocultaciones individuales por relación; nunca lo amplía sin grant.

### `body_progress`

**Finalidad:** evaluar evolución corporal compartida voluntariamente.

Incluye:

- fecha/hora, fuente, método, calidad y procedencia;
- peso y altura cuando participe en cálculos corporales;
- grasa corporal, masa grasa, masa magra y masa muscular cuando exista;
- perímetros corporales;
- BMI y tendencias derivadas;
- fotografías seleccionadas explícitamente como progreso;
- región, pose, lado, fecha y revisiones de esas fotografías.

Excluye:

- EXIF y geolocalización innecesarios;
- archivos de galería no seleccionados;
- diagnósticos, lesiones, dolor y limitaciones;
- entrenamientos, biometría continua, nutrición y notas privadas.

La UI debe mencionar explícitamente que `body_progress` incluye fotografías. Si producto requiere consentimiento independiente para ellas, se crea en una decisión futura `progress_photos`; no se oculta como campo implícito.

Acciones V1: `read` por defecto. `contribute` requiere access level explícito y conserva procedencia profesional; corregir datos de la persona sigue ADR-011.

### `health_context`

**Finalidad:** adaptar el entrenamiento con seguridad usando solo contexto relevante; no construir una historia clínica.

Incluye:

- dolor, lesión o molestia declarados;
- área corporal, lado, severidad, inicio, resolución y estado;
- limitaciones de movimiento, actividades restringidas y contraindicaciones declaradas;
- recuperación percibida, fatiga, soreness, sueño y readiness declarados;
- notas que la persona decide compartir;
- observaciones profesionales separadas y versionadas.

Excluye:

- historia clínica completa;
- diagnósticos no necesarios, medicamentos, laboratorios e imágenes diagnósticas;
- información sexual/reproductiva y datos de terceros;
- documentos médicos completos;
- frecuencia cardiaca, ECG, biometría, raw de wearables e inferencias médicas de IA.

Acciones V1: `read` por defecto. `contribute` explícito permite observaciones profesionales, solicitudes de actualización y propuestas de corrección; nunca editar declaraciones personales.

### Datos fuera de los siete scopes

Requieren contratos futuros independientes: `wearables`, `biometrics`, `precise_location`, `ai_context`, `public_sharing`, `research_or_model_training`, mensajería y marketing. Nutrición entra únicamente mediante `nutrition_intake`, `nutrition_guidance` y `nutrition_media`; ninguno permite nutrición clínica o terapéutica.

### Modelo lógico mínimo

- `privacy.scope_definitions`: código, versión, finalidad, estado, publicación y reemplazo.
- Un diccionario versionado de recursos/campos por definición, revisable y generador de contratos/proyecciones; sus filas no sustituyen RLS ni autorización en código/SQL.
- `privacy.data_grants.scope_definition_id` o clave equivalente a la versión exacta.
- `privacy.consent_events` conserva la definición y el texto aceptados.
- Tablas/proyecciones separadas para entrenamiento, body progress, health context, biometría y ubicación.
- Registro de clasificación/procedencia para métricas derivadas.

### Invariantes

1. Un scope no es un array libre ni una etiqueta interpretada por el frontend.
2. Todo grant congela una definición publicada e inmutable.
3. Ampliar contenido o finalidad exige nueva versión y aceptación.
4. Scope y access level son dimensiones independientes.
5. Conceder un scope no concede otro ni un uso secundario.
6. Los datos derivados heredan la clasificación más restrictiva de sus inputs.
7. Salud, biometría, ubicación y body progress no se filtran únicamente en UI.
8. Propiedad intelectual y notas privadas de otra organización no entran en `prior_training_history`.
9. `health_context` es contexto fitness minimizado, no historia clínica.
10. Cada endpoint y prueba pueden enumerar exactamente los campos visibles y ocultos.

### Consecuencias

#### Positivas

- La persona sabe qué comparte y una nueva columna no amplía su consentimiento.
- API, RLS y pruebas usan el mismo contrato verificable.
- Los campos sensibles pueden coexistir en una experiencia sin compartir la fila completa.
- Nuevos scopes se incorporan sin reinterpretar grants históricos.

#### Costos

- Se necesita gobernanza/versionado de definiciones y proyecciones.
- Las consultas mixtas deben redactar o separar datos por categoría.
- Cambios materiales requieren migración de contrato y reconsentimiento.
- La UI debe explicar fotografías y datos de salud de forma explícita.

### Escenarios de prueba obligatorios

1. `relationship_training` devuelve resultados de la relación y oculta sesiones autónomas, peso y dolor.
2. Dolor registrado dentro de una sesión permanece oculto sin `health_context`.
3. `prior_training_history` expone ejecuciones elegibles sin programas/notas privadas anteriores.
4. `body_progress` devuelve mediciones/fotos seleccionadas sin EXIF o geolocalización.
5. `health_context` devuelve declaraciones relevantes y no documentos clínicos/biometría.
6. Conceder uno de los siete scopes no cambia respuestas de los otros seis.
7. Un grant `read` no permite `contribute` aunque el scope cubra el recurso.
8. Un profesional con `contribute` crea su propia observación pero no modifica una declaración personal.
9. Publicar una definición v2 con campos nuevos no amplía grants v1.
10. Un derivado de peso permanece protegido por `body_progress`; uno basado en dolor por `health_context`.
11. Frecuencia cardiaca, GPS y raw de wearable permanecen ocultos aun con los siete scopes V1.
12. Errores, conteos y campos nulos no permiten inferir categorías denegadas.

### Referencias normativas de contexto

- [Ley 1581 de 2012 — Secretaría del Senado](https://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html): datos sensibles, finalidad, autorización explícita, circulación restringida y seguridad.
- [SIC — tratamiento de datos sensibles relativos a la salud](https://sedeelectronica.sic.gov.co/publicaciones/boletin-juridico/concepto/tratamiento-de-datos-sensibles-relativos-la-salud).

Estas referencias orientan la clasificación y minimización; los field-sets y textos de consentimiento requieren validación jurídica antes de producción.

---

## ADR-017 — V1 exclusiva para personas adultas, sin representación de menores

**Estado:** aceptada para V1<br>
**Fecha:** 20 de julio de 2026<br>
**Ratificación:** 23 de julio de 2026

> **Resolución ratificada:** V1 permanece limitada a personas de **18 años o más**. La propuesta de admitir desde los 14 años como usuarios autónomos se descarta para esta baseline. La presencia de adolescentes en gimnasios se reconoce como una necesidad comercial real, pero su soporte entrará, si se prioriza, como una rebanada vertical propia para personas de 14 a 17 años con representación, autorización y salvaguardas específicas; no como una reducción del entero de edad mínima.

### Contexto

Atender a una persona menor de edad no consiste únicamente en permitir que un adulto marque una casilla. Requiere modelar la identidad y autoridad del representante, la participación del menor, cambios de custodia o representación, acceso a datos, salvaguardas y la transición al alcanzar la mayoría de edad.

V1 no incluirá esas capacidades. La exclusión es una decisión de alcance de producto y arquitectura; no afirma que Allfit nunca pueda prestar servicios a menores mediante una versión futura diseñada y validada para ello.

### Decisión

Allfit Studio y Allfit Space V1 solo activan un Fitness ID para personas que cumplan la política de elegibilidad adulta: **18 años o más**. El límite se aplica globalmente en V1 y no puede reducirse por organización, profesional, país, disciplina o tipo de servicio.

V1 no modela ni permite:

- perfiles, Fitness IDs o relaciones de servicio de menores;
- cuentas dependientes o tuteladas;
- representantes legales, acudientes o vínculos padre/madre-hijo;
- consentimiento parental o acceso de guardianes;
- cuentas familiares que permitan operar el perfil de otra persona;
- excepciones aprobadas por un coach, gimnasio, organización o miembro de soporte.

La autorización de un representante no convierte a un menor en elegible para V1. Soportar menores exige un ADR futuro, revisión jurídica y un diseño específico de protección y seguridad.

La administración de membresías, ingreso o asistencia de menores en establecimientos tampoco cambia esta decisión: booking, asistencia y membresías comerciales están diferidos. Si una fase futura habilita entrenamiento personalizado y Fitness ID para adolescentes, deberá distinguir la participación del adolescente de la autorización de su representante y modelar identidad, representación, vigencia, revocación y transición al cumplir 18 años.

### Control de elegibilidad durante el registro

La elegibilidad se comprueba después de que el titular controla su autenticación y **antes** de:

- crear o activar `identity.people` y su vínculo local `identity.accounts`;
- iniciar el perfil fitness;
- recopilar datos corporales, de salud o entrenamiento;
- materializar intenciones de membresía, relación o programa;
- emitir grants o consentimientos de servicio.

V1 registra evidencia mínima y versionada de la decisión de elegibilidad: resultado, regla aplicada, método, actor o sujeto declarante y timestamp. Si la única finalidad es comprobar mayoría de edad, no se conserva la fecha de nacimiento completa; una declaración explícita y versionada de ser mayor de 18 años es suficiente para V1. Si el producto necesita posteriormente la fecha exacta para otra finalidad, deberá incorporarla como dato personal con procedencia, finalidad y controles propios.

Una invitación puede existir antes de conocer la edad porque no es una persona ni concede derechos. Al intentar aceptarla:

1. el destinatario controla personalmente su autenticación;
2. el backend evalúa la elegibilidad adulta;
3. si es elegible, continúa el onboarding y puede aceptar intenciones por separado;
4. si no es elegible, no crea persona, relación, membresía, asignación, consentimiento ni grant, y marca el intento como no elegible.

Una organización que ya conoce que el destinatario es menor no debe invitarlo; si esa información llega al backend, la operación se rechaza. No se infiere mayoría de edad a partir de una invitación, medio de pago, afirmación del profesional, membresía o usuario WorkOS.

### Usuario WorkOS temporal

La propia persona puede alcanzar el control de edad después de crear y verificar temporalmente un usuario en WorkOS AuthKit. Ese sujeto externo todavía no es una persona de dominio ni puede usar endpoints operativos.

Cuando el resultado es no elegible:

- no se crea el vínculo local activo con un Fitness ID;
- se bloquea el onboarding con estado `ineligible_age`;
- el usuario WorkOS se deshabilita y elimina mediante una política corta, segura y auditable;
- se conserva únicamente la evidencia mínima necesaria para seguridad, prevención de reintentos abusivos y auditoría durante su plazo definido;
- no se conservan datos fitness, corporales o de salud.

### Descubrimiento posterior

Si después de la activación se descubre que la declaración era incorrecta o que la persona es menor:

1. se restringe inmediatamente la persona y se revocan sesiones, grants y accesos operativos;
2. se detienen relaciones, asignaciones y servicios activos;
3. se abre un caso auditable de soporte y disposición;
4. los datos se eliminan, anonimizan o conservan de forma restringida conforme a ADR-012, finalidad, plazo y holds aplicables;
5. la cuenta no se convierte en perfil tutelado ni se reactiva mediante autorización parental.

### Modelo lógico mínimo

- Una política versionada de elegibilidad con edad mínima global de 18 años para V1.
- Eventos o declaraciones de elegibilidad asociados al intento de onboarding y, solo al resultar elegible, a la persona activada.
- Estados explícitos `eligible_adult`, `ineligible_age` y `review_required`; un estado desconocido no equivale a elegible.
- Procedencia del resultado: declaración de la persona, regla aplicada y cualquier revisión autorizada.
- Retención corta y separada para intentos no elegibles, sin crear un perfil fitness incompleto.

Los nombres físicos se decidirán en el modelo lógico. No se añadirá un simple `is_minor` mutable a `identity.people` como única evidencia.

### Invariantes

1. Toda persona activa en V1 tiene evidencia vigente de elegibilidad adulta.
2. `unknown`, ausencia de dato o fallo del control nunca significan mayoría de edad.
3. La elegibilidad se aplica en backend y pruebas; términos y UI no son la única frontera.
4. Ninguna intención de invitación se materializa antes de resolver la elegibilidad.
5. WorkOS AuthKit autenticado no implica persona elegible ni Fitness ID activo.
6. Un tercero no puede declarar o aceptar la mayoría de edad en nombre del titular.
7. La autorización parental no habilita excepciones en V1.
8. Antes de resolver elegibilidad no se recopilan datos fitness, corporales o de salud.
9. Un caso no elegible no deja una persona, relación o grant parcialmente creados.
10. El soporte futuro de menores no reutiliza esta declaración como sustituto de representación y consentimiento.

### Consecuencias

#### Positivas

- El alcance de identidad, consentimiento y privacidad de V1 permanece verificable.
- No se simula representación legal mediante roles o permisos insuficientes.
- Se minimizan los datos personales recopilados solo para controlar la edad.
- Un diseño futuro para menores puede incorporar salvaguardas completas sin compatibilidad accidental con un modelo incompleto.

#### Costos

- Allfit no puede atender en V1 academias, familias o profesionales cuyo servicio incluya menores.
- Debe existir un control de elegibilidad y un flujo de disposición para errores o declaraciones falsas.
- Una declaración de mayoría de edad reduce fricción y datos, pero no constituye verificación documental de identidad.

### Escenarios de prueba obligatorios

1. Una persona que declara cumplir la política puede completar onboarding y activar un único Fitness ID.
2. Una persona no elegible se detiene antes de crear persona, cuenta local, perfil o datos fitness.
3. Aceptar una invitación siendo no elegible no materializa ninguna de sus intenciones.
4. Reintentos e idempotencia no permiten omitir el control ni crear entidades parciales.
5. Ningún endpoint permite crear representante, dependiente, consentimiento parental o perfil familiar en V1.
6. Una organización no puede marcar manualmente a un menor como elegible.
7. El fallo o ausencia del control produce `review_required` o rechazo, nunca acceso operativo.
8. Descubrir posteriormente que una persona es menor restringe la cuenta, revoca grants y activa disposición.
9. Un usuario WorkOS temporal no elegible no puede consultar ni escribir datos de dominio y converge a eliminación.
10. La evidencia conserva versión y procedencia sin almacenar fecha de nacimiento completa cuando no existe otra finalidad.

### Referencias normativas de contexto

- [Ley 1581 de 2012 — Secretaría del Senado, artículo 7](https://www.secretariasenado.gov.co/senado/basedoc/ley_1581_2012.html): protección especial de los datos personales de niños, niñas y adolescentes.
- [Decreto 1377 de 2013 — Función Pública, artículo 12](https://www1.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646): requisitos particulares para su tratamiento y participación del representante.

Estas referencias explican por qué soportar menores requiere un alcance propio. La implementación, los textos de elegibilidad y la política de retención deben someterse a validación jurídica antes de producción.

---

## ADR-018 — Procedencia explícita y coexistencia de afirmaciones del perfil

**Estado:** en revisión<br>
**Fecha:** 20 de julio de 2026

### Contexto

Un atributo del perfil puede haber sido declarado por la persona, observado por un profesional, medido por un dispositivo, inferido por un algoritmo o contrastado por una autoridad. Esos orígenes no tienen el mismo significado ni deben sobrescribirse entre sí.

Por ejemplo, una persona puede declarar nivel intermedio, un coach observar nivel principiante y un algoritmo inferir nivel intermedio a partir del historial. Ninguno de esos valores convierte automáticamente a los otros en incorrectos. Una única columna mutable perdería autoría, evidencia, vigencia y contexto.

También es necesario separar procedencia y verificación. Que un dato provenga de un dispositivo no significa que sea exacto; que lo escriba un profesional no lo convierte en verdad verificada; y verificar una credencial concreta no verifica todo el perfil de quien la presenta.

### Decisión

Todo dato de perfil que afecte personalización, presentación, acceso o decisiones operativas conserva su procedencia. V1 distingue cinco clases canónicas:

| Clase | Significado | Ejemplos |
| --- | --- | --- |
| `person_declared` | La propia persona afirma el valor, aunque otro actor autorizado lo transcriba | objetivo, experiencia percibida, preferencias, disponibilidad, dolor o sensación subjetiva |
| `professional_observation` | Un profesional registra su propia evaluación u observación dentro de una relación autorizada | nivel técnico observado, movilidad, calidad de movimiento |
| `device_observed` | Un dispositivo o integración produce una medición u observación | peso de báscula, frecuencia cardiaca, actividad importada |
| `system_inferred` | Allfit calcula o recomienda un valor a partir de otros datos | nivel sugerido, tendencia, recomendación o carga estimada |
| `authority_verified` | Un flujo autorizado contrasta una afirmación concreta con evidencia o una fuente competente | control de contacto, credencial profesional o afiliación confirmada |

La clase describe el origen semántico del valor. El actor que lo registra y el método de captura son dimensiones separadas. Si un profesional transcribe “la persona reporta dolor 4/10”, la procedencia continúa siendo `person_declared`, con el profesional como `recorded_by`; no se transforma en observación profesional.

### Verificación independiente

“Verificado” no es un booleano general del perfil ni una reputación transferible. Es el estado de una afirmación concreta y conserva:

- sujeto y atributo verificado;
- valor o referencia exacta evaluada;
- verificador y autoridad/fuente;
- método y referencia de evidencia, sin copiar documentos completos cuando no sea necesario;
- resultado, fecha, vigencia, expiración y revocación;
- política o criterio aplicado.

Un valor puede ser declarado y posteriormente verificado sin perder su declaración original. La proyección puede mostrar el estado verificado, pero el evento de verificación no cambia la autoría del valor.

La declaración de mayoría de edad definida en ADR-017 es `person_declared`. Aplicar la política de elegibilidad permite o bloquea el onboarding, pero no debe presentarse como verificación documental de identidad o fecha de nacimiento.

### Autoridad por tipo de atributo

| Tipo de atributo | Regla V1 |
| --- | --- |
| Objetivos, preferencias, disponibilidad y experiencia subjetiva | La persona es autoridad sobre su declaración; observaciones e inferencias se muestran aparte |
| Dolor, esfuerzo percibido, sensación o estado subjetivo | No se sobrescribe por un profesional, dispositivo o algoritmo |
| Evaluación técnica profesional | Pertenece al profesional autor; otro profesional crea su propia observación |
| Medición de dispositivo | Conserva dispositivo, integración, unidad, calidad y raw de origen; no se etiqueta automáticamente como verificada |
| Inferencia o recomendación | Conserva algoritmo, versión, inputs, confianza y vigencia; nunca reemplaza silenciosamente el dato fuente |
| Identidad, contacto o credencial | Solo el flujo competente puede otorgar estado verificado y puede revocarlo o dejarlo vencer |

Las notas privadas de una organización o profesional no forman parte del perfil personal por el hecho de referirse a la persona. Deben permanecer como registros organizacionales separados, con finalidad, acceso y retención propios.

### Coexistencia y proyección actual

Para un mismo atributo pueden coexistir varias afirmaciones. Cada una conserva como mínimo:

```text
subject_person_id
attribute_code
typed_value
source_kind
recorded_by_actor
source_reference
recorded_at
effective_at
supersedes_or_invalidates
data_category_and_scope
```

Los metadatos adicionales dependen del origen:

- profesional: relación, organización y autor;
- dispositivo: integración, dispositivo, unidad, calidad e identificador externo;
- inferencia: algoritmo, versión, inputs, confianza y expiración;
- verificación: verificador, método, evidencia mínima, vigencia y estado.

Una proyección “actual” puede seleccionar qué valor usa cada caso de producto, pero la regla de selección debe ser explícita y versionada por atributo/contexto. La proyección no elimina afirmaciones alternativas ni presenta una inferencia como declaración de la persona.

La UI y la API muestran procedencia, vigencia o confianza cuando sean materiales para interpretar el dato. No se usa una insignia genérica de “perfil verificado” para afirmar que todos sus atributos fueron comprobados.

### Cambios y correcciones

- La persona actualiza una declaración creando una nueva revisión que reemplaza su declaración anterior sin borrar historial material.
- Un profesional revisa únicamente sus observaciones; sobre una declaración personal presenta una propuesta que la persona acepta o rechaza.
- Otro profesional crea una observación independiente y no edita la del autor anterior.
- El raw de un dispositivo permanece inmutable; normalización, exclusión o corrección generan registros derivados separados.
- Una inferencia recalculada crea otro resultado con su algoritmo/versión e invalida o deja vencer la anterior según política.
- Una verificación solo puede renovarse, revocarse o reemplazarse mediante el flujo autorizado correspondiente.

### Privacidad y autorización

La procedencia no concede acceso. Cada afirmación sigue la categoría y el scope del dato que contiene:

- una observación profesional sobre dolor continúa bajo `health_context`;
- una medición corporal continúa bajo `body_progress` aunque provenga de un dispositivo;
- una inferencia hereda la clasificación más restrictiva de sus inputs;
- el acceso a evidencia de verificación puede ser más restringido que el acceso al estado resultante;
- compartir un valor no comparte automáticamente sus documentos, inputs o notas privadas de origen.

### Modelo lógico mínimo

- Catálogo gobernado de clases de procedencia y reglas por atributo.
- Afirmaciones/revisiones append-only o historial equivalente en estructuras tipadas de dominio.
- Referencias explícitas a actor, relación, organización, integración, algoritmo o verificación cuando apliquen.
- Proyecciones actuales reproducibles desde afirmaciones y reglas de selección versionadas.
- Eventos de verificación separados del valor y evidencia minimizada con retención propia.
- Clasificación y scope tanto del valor como de sus derivados.

Esto no autoriza una tabla EAV universal ni un JSON de perfil abierto. Los valores siguen siendo tipados y se separan por dominio/sensibilidad; la procedencia es una capacidad transversal común.

### Invariantes

1. Todo valor material del perfil conserva procedencia, actor y tiempo.
2. `recorded_by` no cambia quién originó semánticamente la afirmación.
3. Declaración, observación, medición, inferencia y verificación no se sobrescriben entre sí.
4. `device_observed` no equivale a `authority_verified`.
5. Una credencial verificada no convierte todo el perfil en verificado.
6. Una inferencia conserva algoritmo, versión, inputs, confianza y vigencia.
7. Los datos subjetivos de la persona no se corrigen sin su aceptación.
8. Un profesional solo revisa directamente observaciones propias.
9. Procedencia o verificación nunca amplían scopes ni capacidades.
10. Los derivados heredan la clasificación más restrictiva de sus inputs.
11. Una proyección actual es reproducible y no destruye afirmaciones históricas.
12. Las notas privadas no se incorporan silenciosamente al Fitness ID.

### Consecuencias

#### Positivas

- La persona y los profesionales pueden interpretar por qué aparece un valor.
- Allfit puede personalizar sin presentar inferencias como hechos declarados.
- Correcciones, verificaciones y disputas conservan evidencia y autoría.
- Integraciones y algoritmos pueden evolucionar sin reescribir el perfil histórico.

#### Costos

- Las consultas necesitan proyecciones y reglas de precedencia por atributo.
- UI y API deben comunicar origen, vigencia y confianza cuando corresponda.
- Las verificaciones requieren ciclo de vida y retención de evidencia separados.
- Mantener afirmaciones coexistentes es más complejo que una fila mutable de perfil.

### Escenarios de prueba obligatorios

1. Una persona declara nivel intermedio y un profesional observa nivel principiante; ambos valores permanecen visibles con su origen.
2. Una inferencia recomienda otro nivel sin cambiar la declaración ni la observación.
3. Un profesional que transcribe una declaración conserva `person_declared` y registra su autoría como capturador.
4. Otro profesional no puede editar una observación ajena.
5. Una medición de dispositivo conserva dispositivo/unidad/calidad y no aparece como verificada.
6. Recalcular una inferencia conserva algoritmo y versión anteriores.
7. Verificar una credencial no marca objetivos, experiencia u otros atributos como verificados.
8. Una verificación vencida o revocada deja de mostrarse vigente sin borrar su historial.
9. Una observación de dolor permanece oculta sin `health_context`, independientemente de su origen.
10. Un derivado de inputs con scopes distintos hereda la categoría más restrictiva.
11. Una propuesta profesional aceptada crea revisión; rechazarla no cambia la declaración.
12. Eliminar una nota privada de la organización de una proyección personal no altera el perfil de la persona.

---

## ADR-019 — Desacoplar y pausar asignaciones al terminar una relación

**Estado:** aceptada para V1<br>
**Fecha:** 20 de julio de 2026; ratificada el 17 de agosto de 2026

### Contexto

ADR-005 define que terminar una relación corta el acceso operativo y de escritura, congela en `T` la ventana histórica de la organización y preserva para la persona el snapshot de las versiones asignadas. Quedaba por decidir qué ocurre con una asignación todavía activa, sus sesiones futuras y la capacidad de continuar entrenando.

Cancelar todo automáticamente haría que la persona pierda un plan ya incorporado a su Fitness ID. Mantener la asignación como si aún fuera administrada permitiría al profesional seguir actuando después de terminar su autoridad. Convertirla silenciosamente en autoentrenamiento también podría generar sesiones o incumplimientos sin una decisión consciente.

### Decisión

Cuando una relación profesional alcanza su fecha efectiva de terminación, toda asignación activa originada y administrada por esa relación se **desacopla de la gestión profesional y queda pausada** en estado `detached_pending_choice`.

La transición:

- revoca inmediatamente grants, capacidades y acceso operativo de la organización anterior;
- conserva la misma asignación, `program_version_id`, snapshot/revisiones de prescripción, autoría y relación de origen;
- elimina toda autoridad de edición, reprogramación, generación, anotación o seguimiento del profesional;
- pausa la generación de nuevas sesiones, recordatorios y cálculos de incumplimiento;
- mantiene las sesiones completadas o iniciadas como historial de la persona;
- conserva las sesiones futuras ya materializadas, visibles para la persona pero pausadas;
- no crea una copia ni cambia silenciosamente a otra versión del programa.

### Decisión posterior de la persona

Desde `detached_pending_choice`, únicamente la persona puede decidir:

1. `continue_personally`: la misma asignación pasa a `active_personal`, conserva el snapshot y reanuda su calendario bajo control personal.
2. `end_assignment`: la asignación pasa a `ended`; las sesiones futuras no iniciadas se cancelan con motivo explícito y las iniciadas/completadas permanecen.

No responder mantiene la asignación pausada. En ese estado no se generan nuevas ocurrencias, no se envían recordatorios de cumplimiento y no se penaliza adherencia.

La persona puede compartir posteriormente la asignación o sus resultados con otra relación, pero esto exige un nuevo grant y aceptación independiente. La nueva organización no hereda gestión, observaciones, notas privadas ni permisos de la anterior. Adoptar el plan profesionalmente requiere una acción explícita y auditable del nuevo profesional y de la persona.

### Sesiones en el momento de terminación

- Una sesión completada conserva el contexto y autoría históricos.
- Una sesión iniciada puede terminarse por la persona como actividad propia; desde el momento efectivo el profesional anterior no puede verla, capturar resultados ni corregirla operativamente.
- Una sesión futura permanece pausada hasta la decisión de la persona.
- Cancelar la asignación nunca elimina ejecuciones, intentos o resultados existentes.

Si la terminación fue programada para una fecha futura, la relación y la gestión continúan únicamente hasta ese instante. La transición se ejecuta con el tiempo efectivo de negocio, no con la hora en que un worker procese el evento.

### Propiedad intelectual y atribución

Continuar personalmente permite usar el contenido exacto que fue asignado y conservarlo como parte del historial. No concede:

- propiedad sobre el programa maestro;
- acceso a nuevas versiones, borradores o metodología privada;
- derecho a publicar, vender o redistribuir el contenido;
- acceso a notas privadas de la organización.

La asignación conserva `origin_relationship_id`, organización/profesional autor, versión y revisiones previas como atribución histórica inmutable. El cambio de gestión no reescribe quién prescribió el contenido.

### Modelo lógico mínimo

- Estados diferenciados `active_managed`, `detached_pending_choice`, `active_personal` y `ended`, además de los estados previos necesarios.
- Contexto de origen inmutable y contexto de gestión efectivo separado.
- Evento append-only de desacoplamiento con causa, actor/proceso, `effective_at` y relación terminada.
- Evento de decisión personal con versión presentada, decisión y timestamp.
- Estado pausado de sesiones futuras o regla equivalente que impida ejecución automática del calendario.
- Comando transaccional e idempotente que termina la relación, congela grants, revoca capacidades operativas y desacopla asignaciones.

Los nombres físicos se decidirán en el modelo lógico. No se representa la continuidad borrando `relationship_id`, copiando la asignación o fingiendo que siempre fue personal.

### Invariantes

1. Una relación terminada no puede administrar asignaciones.
2. Toda asignación administrada por la relación se desacopla exactamente una vez en su tiempo efectivo.
3. Desacoplar no cambia versión, snapshot, origen ni atribución.
4. `detached_pending_choice` no genera sesiones, recordatorios ni incumplimiento.
5. Solo la persona puede continuar personalmente o terminar la asignación desacoplada.
6. Continuar personalmente reutiliza la misma asignación; no crea una copia divergente.
7. Terminar cancela únicamente sesiones futuras no iniciadas y nunca borra historial.
8. Una organización nueva no hereda gestión ni grants.
9. La organización anterior no accede a actividad creada después de la terminación.
10. Los reintentos y la concurrencia no producen estados, eventos o decisiones duplicados.

### Consecuencias

#### Positivas

- La persona conserva continuidad sin mantener autoridad del profesional anterior.
- El sistema no interpreta silencio como aceptación de autoentrenamiento.
- Historial, atribución y propiedad intelectual permanecen explicables.
- Una relación futura comienza con permisos y decisiones nuevas.

#### Costos

- Se añade un estado intermedio y una decisión de producto para la persona.
- Generación de calendario, adherencia y notificaciones deben respetar la pausa.
- La terminación coordina relación, grants, asignaciones y sesiones de forma transaccional/eventual idempotente.

### Escenarios de prueba obligatorios

1. Terminar una relación desacopla todas sus asignaciones activas, corta acceso profesional en vivo y congela la ventana histórica en el tiempo efectivo.
2. Una asignación desacoplada conserva versión, snapshot, revisiones y origen.
3. Las sesiones completadas/iniciadas permanecen; las futuras quedan pausadas.
4. Mientras no exista decisión no se generan sesiones, recordatorios ni incumplimientos.
5. `continue_personally` reactiva la misma asignación sin duplicarla y sin devolver acceso a la organización.
6. `end_assignment` cancela futuras no iniciadas y conserva intentos/resultados históricos.
7. Una sesión iniciada puede finalizarla la persona, pero el profesional anterior no puede contribuir después del corte.
8. Una nueva relación no ve ni gestiona la asignación sin nuevo grant y adopción explícita.
9. Continuar no expone programa maestro, futuras versiones o notas privadas.
10. Terminación, worker y decisión concurrentes convergen a un único estado válido y eventos idempotentes.

---

## ADR-020 — Ocultación de sesiones autónomas por relación

**Estado:** en revisión<br>
**Fecha:** 20 de julio de 2026

### Contexto

`prior_training_history` permite compartir con una relación sesiones anteriores o autónomas, incluidas las realizadas mientras el grant está vigente. Quedaba por decidir si conceder el scope obliga a mostrar todo el conjunto elegible o si la persona puede excluir sesiones concretas.

El Fitness ID pertenece longitudinalmente a la persona y una relación puede necesitar contexto sin adquirir visibilidad irreversible sobre toda actividad privada. Al mismo tiempo, ocultar una fila solo en UI sería insuficiente si conteos, récords, adherencia, errores o derivados permiten inferirla.

### Decisión

La persona puede ocultar cualquier sesión autónoma o previa para una relación concreta. La regla de visibilidad es una **denegación por relación** que reduce el conjunto autorizado por `prior_training_history`.

El acceso efectivo requiere simultáneamente:

1. relación vigente;
2. grant vigente de `prior_training_history` con su versión exacta;
3. actor profesional autorizado por asignación, membresía y capacidad;
4. ausencia de una denegación individual para esa sesión y relación.

Una excepción individual nunca concede acceso si falta cualquiera de los tres primeros requisitos. Denegar prevalece sobre permitir.

### Alcance de la ocultación

- Sin `prior_training_history`, ninguna sesión autónoma es visible.
- Con el grant, las sesiones elegibles se comparten conforme al contrato aceptado, incluidas futuras sesiones autónomas mientras esté vigente.
- La persona puede excluir una sesión antes o después de que haya sido visible.
- La exclusión se aplica a la relación y a su organización responsable completa, no solamente al coach actualmente asignado.
- Reasignar profesionales dentro de la misma relación no evita la exclusión.
- La misma sesión puede estar compartida con una relación y oculta para otra.
- Las reglas de una relación no se heredan al crear otra relación.
- Revocar el grant bloquea todo el conjunto. Terminar la relación bloquea el acceso en vivo y los datos posteriores al corte; la lectura `frozen` queda sujeta al predicado separado de ADR-005.

La interfaz de consentimiento debe explicar que el scope cubre sesiones futuras durante su vigencia y permitir revisar las exclusiones antes de confirmar. Ocultar o volver a compartir después es una acción autenticada y auditable de la persona.

### Efecto sobre consultas y derivados

Una sesión oculta no aparece en:

- listados, detalle, búsqueda o exportaciones profesionales;
- conteos, fechas mínimas/máximas, paginación o estados que permitan inferirla;
- récords, tendencias, volumen, adherencia o recomendaciones calculados para la relación;
- cachés, índices, read models o contexto de IA accesibles por la organización;
- propuestas de corrección o anotaciones nuevas del profesional.

Las proyecciones profesionales calculan derivados únicamente sobre el conjunto autorizado. Los derivados que ya incluían la sesión se invalidan y recalculan o se retiran. La respuesta no contiene placeholders ni indica cuántas sesiones fueron ocultadas.

Para no presentar el historial como completo, la experiencia profesional muestra siempre una advertencia neutral equivalente a:

> Este historial contiene únicamente información compartida por la persona y puede no representar su actividad completa.

La advertencia no cambia según existan exclusiones, por lo que no revela su uso.

### Sesiones que no califican

La ocultación individual de este ADR aplica a sesiones autónomas, espontáneas, importadas o anteriores elegibles bajo `prior_training_history`.

Una ejecución originada dentro de la relación y vinculada a su planificación permanece bajo `relationship_training`; no puede reclasificarse como autónoma para evitar ese contrato. La persona puede revocar el scope correspondiente o terminar la relación conforme a sus reglas, pero no alterar la procedencia histórica.

Vincular posteriormente una sesión autónoma a una sesión planificada de la relación exige confirmación explícita de la persona. La operación conserva su procedencia y explica el cambio de contexto/visibilidad; un profesional no puede vincular una sesión oculta por sí solo.

### Separación de scopes

Compartir una sesión no comparte automáticamente todos sus campos. `prior_training_history` mantiene las exclusiones definidas en ADR-016:

- dolor o limitaciones requieren `health_context`;
- peso o composición requieren `body_progress`;
- frecuencia cardiaca, GPS, biometría y raw de wearables permanecen fuera de los siete scopes V1;
- notas privadas y propiedad intelectual de otra organización nunca se incluyen.

Una denegación de sesión bloquea también cualquier campo o derivado de esa sesión que de otro modo fuese visible por combinación de scopes dentro de la misma relación.

### Cambios posteriores y acceso previo

Ocultar una sesión produce efecto para todo acceso futuro y obliga a invalidar cachés/proyecciones. No borra:

- el dato del Fitness ID;
- eventos de consentimiento u ocultación;
- logs de acceso mínimos sujetos a retención;
- el hecho de que un profesional pudo haberla consultado legítimamente antes.

Allfit no puede garantizar que un tercero olvide información ya vista o exportada conforme al permiso vigente. La UI debe explicar esta limitación antes de aplicar una ocultación retroactiva.

### Modelo lógico mínimo

- Regla de visibilidad por `subject_person_id`, `fitness_session_id` y `relationship_id`.
- Estado/effectividad append-only o historial equivalente para ocultar y volver a compartir.
- Actor exclusivamente personal o flujo de soporte restringido que actúe por solicitud verificable; una organización no modifica la preferencia.
- Evaluación server-side/RLS junto al grant y la asignación profesional.
- Invalidación idempotente de cachés, read models y derivados autorizados.
- Eventos auditables que no expongan la sesión a actores sin autorización.

Los nombres físicos se decidirán en el modelo lógico. No se persiste una visibilidad global `is_hidden` porque la decisión cambia entre relaciones.

### Invariantes

1. Sin grant vigente no existe acceso, aunque una sesión no esté oculta.
2. Una regla individual solo reduce acceso y denegar siempre prevalece.
3. La visibilidad se evalúa por relación/organización responsable, no por coach aislado.
4. Una reasignación profesional no cambia las exclusiones.
5. Ningún conteo, derivado, error o metadato revela una sesión oculta.
6. Ocultar no elimina ni modifica la sesión personal.
7. La organización no crea, elimina ni evita reglas de ocultación.
8. Una sesión de la relación no se reclasifica para evadir `relationship_training`.
9. Otros scopes no reexponen una sesión oculta dentro de la misma relación.
10. Cambios, revocaciones y reintentos son efectivos, auditables e idempotentes.

### Consecuencias

#### Positivas

- La persona mantiene control granular sin crear scopes por sesión.
- Las organizaciones reciben únicamente el historial que continúa autorizado.
- Reasignaciones internas respetan la misma decisión de privacidad.
- Las consultas no inducen a creer que el historial compartido es necesariamente completo.

#### Costos

- Toda consulta, agregado y read model profesional debe aplicar exclusiones.
- Ocultar después de compartir no puede retirar conocimiento previamente adquirido.
- Cambios de visibilidad requieren invalidación y recálculo de derivados.
- La UI debe permitir gestionar exclusiones sin revelarlas a la organización.

### Escenarios de prueba obligatorios

1. Sin `prior_training_history`, una sesión autónoma no es visible aunque no tenga exclusión.
2. Con grant vigente, una sesión elegible es visible salvo denegación individual.
3. Ocultarla la elimina de detalle, búsqueda, conteos, paginación, récords y agregados profesionales.
4. La misma sesión puede verse en relación A y permanecer oculta en relación B.
5. Reasignar el coach dentro de la relación no reexpone la sesión.
6. Revocar el grant bloquea todo; terminar la relación bloquea el acceso en vivo y todo dato posterior al corte, independientemente de reglas individuales.
7. Volver a compartir exige acción de la persona y no restaura un grant vencido.
8. Un profesional u organización no puede modificar la regla ni vincular una sesión oculta a su planificación.
9. Dolor, peso, frecuencia cardiaca, GPS y raw siguen ocultos aunque la sesión sea compartida.
10. Un derivado previamente calculado se invalida y deja de filtrar información después de ocultar.
11. Las respuestas profesionales muestran siempre la advertencia neutral y nunca el número de exclusiones.
12. Reintentos concurrentes de ocultar/mostrar convergen a una sola preferencia efectiva y eventos auditables.

---

## ADR-021 — Capacidades diferidas sin modelo físico especulativo en V1

**Estado:** aceptada para V1<br>
**Fecha:** 20 de julio de 2026; ratificada el 17 de agosto de 2026

### Contexto

La arquitectura objetivo describe un ecosistema mayor que la primera baseline. Crear desde V1 tablas, permisos, JSON o estados para todas las capacidades futuras aumentaría el alcance, fijaría decisiones todavía no validadas y trasladaría deuda especulativa al nuevo diseño.

No anticipar ningún límite tampoco es deseable: identidad, versionado, privacidad, eventos y separación de dominios deben permitir ampliaciones posteriores sin duplicar el Fitness ID o reescribir el historial.

### Decisión

V1 implementa únicamente el flujo vertical de identidad adulta, operación profesional básica y entrenamiento compartido. Las capacidades diferidas se documentan como límites conceptuales, pero **no producen DDL, permisos ni contratos operativos en la baseline**.

### Capacidades incluidas en la baseline V1

- Fitness ID, cuenta, elegibilidad adulta y perfiles personales/profesionales.
- Organizaciones, sedes básicas, membresías de staff, roles y práctica profesional.
- Invitaciones, relaciones, profesionales asignados, consentimiento y siete scopes V1.
- Catálogo global mínimo de disciplinas/tipos/movimientos y contenido privado de entrenamiento.
- Plantillas, programas, versiones, asignaciones y calendario básico.
- Sesiones planificadas, autónomas y ejecutadas, intentos y resultados tipados.
- Progreso básico, procedencia, correcciones y contratos de resultados.
- Nutrición manual no clínica, resúmenes calculados, foto opcional y objetivos personales/propuestos.
- RLS, auditoría, outbox/inbox, idempotencia, retención y disposición.

El catálogo V1 admite definiciones globales gobernadas por Allfit y contenido privado de personas u organizaciones necesario para entrenar. Publicación comercial, listings, descubrimiento y marketplace quedan fuera.

### Capacidades diferidas a expansión operativa

- clases grupales, agenda de oferta, reservas, recursos, recurrencia, capacidad y asistencia;
- productos, precios, órdenes, cobros, pagos externos/manuales, reembolsos, facturación y conciliación;
- membresías comerciales, suscripciones de cliente y entitlements;
- marketplace, perfiles públicos comerciales, listings, descubrimiento y reviews;
- billing SaaS persistido dentro de esta baseline.

V1 no procesa ni registra pagos coach-cliente. Una compra no es requisito para crear relaciones o asignaciones del flujo vertical inicial.

### Capacidades diferidas a extensiones avanzadas

- conectores de wearables, credenciales, webhooks y almacenamiento general de raw;
- biometría continua, ECG y GPS/rutas precisas;
- nutrición clínica/terapéutica, catálogos externos de alimentos, recetas, suplementos y recuperación avanzada más allá del contexto declarado V1;
- IA contextual, recomendaciones automáticas, agentes y entrenamiento de modelos;
- mensajería, comunidad, social, eventos y comercio físico;
- publicación pública, investigación y usos secundarios;
- menores, representantes y cuentas familiares;
- especialización completa de todas las disciplinas;
- separación física de bases/servicios por producto.

### Contrato `sensor_enriched`

El núcleo puede definir y probar `sensor_enriched` para demostrar que los resultados tipados admiten muestras de sensores sin deformar la sesión universal. Esto no incorpora en V1 conectores, credenciales, raw streams, GPS preciso, biometría continua ni scopes de wearable.

Fixtures o importaciones técnicas controladas pueden validar el contrato. Una integración productiva requiere su propia ampliación vertical, consentimiento y política de retención.

### Regla para el modelo físico V1

Una capacidad diferida no justifica:

- schemas o tablas vacíos “por si acaso”;
- columnas nullable, enums o estados en entidades actuales sin operación V1;
- JSONB/EAV genérico para capturar datos futuros;
- roles, capacidades, scopes o feature flags que simulen una autorización inexistente;
- endpoints, jobs, webhooks, seeds o eventos sin consumidor V1;
- FKs hacia entidades todavía no modeladas;
- dependencias requeridas para completar el flujo vertical.

Los documentos pueden nombrar dominios futuros para explicar fronteras y orden de expansión. Esa mención no autoriza migraciones en la baseline.

### Preparación permitida

V1 sí conserva fundamentos que ya necesita y que facilitan crecer:

- IDs estables y ownership inequívoco;
- límites de dominio y contratos HTTP separados;
- versionado inmutable de plantillas, programas, scopes y resultados;
- outbox/inbox e idempotencia;
- clasificación, procedencia, retención y disposición de datos;
- migraciones aditivas y una única autoridad de esquema;
- códigos de catálogo estables y extensibles cuando tienen uso V1.

No se añade una abstracción solo porque podría reutilizarse. Debe resolver una operación actual y conservar semántica clara.

### Puerta de entrada para una capacidad diferida

Cada ampliación futura repite las puertas de diseño:

1. alcance, actores y casos de uso;
2. términos y contraejemplos del dominio;
3. ownership, procedencia y ciclo de vida;
4. datos sensibles, finalidades y scopes nuevos;
5. operaciones, autorización y transacciones;
6. ADR y modelo lógico aprobados;
7. migraciones, RLS, contratos, pruebas y observabilidad;
8. criterios de salida y disposición.

Una capacidad no entra parcialmente mediante una columna o permiso aislado. Su primera entrega debe ser una rebanada vertical coherente.

### Invariantes

1. La baseline V1 se reconstruye y funciona sin schemas de capacidades diferidas.
2. Ninguna tabla/campo V1 existe únicamente para una función futura.
3. Un scope V1 no incluye datos de una capacidad diferida.
4. Marketplace/publicación no se infieren del contenido privado de entrenamiento.
5. V1 no procesa ni registra pagos coach-cliente, sean internos, externos o manuales.
6. Membresía organizacional de staff no se confunde con membresía comercial.
7. `sensor_enriched` no implica conectores o raw de wearables en producción.
8. Feature flags no sustituyen modelo, autorización o consentimiento inexistentes.
9. Cada ampliación futura tiene ADR, DDL, RLS y pruebas propios.
10. Incorporar una capacidad no duplica persona, organización o historial existente.

### Consecuencias

#### Positivas

- La baseline permanece pequeña, explicable y comprobable.
- Se evita convertir hipótesis de producto en deuda estructural.
- Las futuras capacidades entran con privacidad y ownership deliberados.
- El núcleo mantiene extensibilidad mediante contratos y dominios ya necesarios.

#### Costos

- Algunas capacidades requerirán nuevas migraciones y decisiones aunque ya aparezcan en diagramas conceptuales.
- No habrá commerce, reservas, marketplace, wearables o IA productivos en la primera baseline.
- Ciertos catálogos o abstracciones se incorporarán solo cuando llegue su caso de uso.

### Escenarios de prueba obligatorios

1. La baseline se reconstruye sin schemas/tablas `booking`, `commerce`, `marketplace`, `integrations` o `intelligence`.
2. Ningún endpoint V1 crea productos, reservas, pagos, listings, conectores o runs de IA.
3. Solo existen los tres scopes nutricionales aprobados; no existen scopes V1 de wearables, biometría, ubicación precisa, IA o publicación.
4. Contenido privado de entrenamiento no aparece en búsquedas o perfiles públicos.
5. Una relación y asignación se completan sin orden, pago o membresía comercial.
6. El catálogo global mínimo y el contenido privado satisfacen el flujo de entrenamiento sin tablas de marketplace.
7. `sensor_enriched` pasa fixtures tipados sin credenciales, webhooks o raw stores productivos.
8. No existen columnas/JSON placeholders referidos únicamente a capacidades diferidas.
9. Añadir una capacidad futura mediante fixtures aislados no puede habilitarla sin sus migraciones, permisos y scopes.
10. El pipeline detecta dependencias o DDL de dominios diferidos introducidos fuera de una ampliación aprobada.

---

## ADR-022 — Decisiones operativas de Fase 3

**Estado:** aceptada para V1 y recertificada en Fase 2<br>
**Fecha:** 22 de julio de 2026<br>
**Recertificación:** 26 de julio de 2026<br>
**Enmendada:** 20 de septiembre de 2026 — «todas las sesiones» se estrecha a los programas que terminan, y sigue sin haber job de calendario (`ADR-032`)

> **Decision 3 is partially superseded by [ADR-046](#adr-046-an-allfit-admin-acts-with-the-full-authority-of-the-platform)**
> on 7 November 2026, decided and pending implementation: an administrator approves their
> own break-glass window, and support search shows names and contact. Invariant 8 and
> scenarios 9, 10, 11 and 15 follow. Only the requester exercises a window, every exercise
> is visible to the person, and break-glass never writes.

### Contexto

El mapa de dominios difirió explícitamente a la Fase 3 un conjunto de decisiones operativas: el catálogo exacto de roles organizacionales (§4.14), la autoridad de terminación y la concurrencia de profesionales en una relación (§5.15), el catálogo de `access_level` y el alcance de la auditoría de lectura (§6.18), la autoridad de publicación del catálogo (§7.18), la materialización del calendario (§8.21) y las ventanas de corrección de ejecuciones (§9.22).

Al escribir la matriz de operaciones y la de seguridad, esas decisiones dejaron de poder posponerse: sin ellas no es posible declarar actor, filtros obligatorios ni condición de fila. Tres de las resoluciones **introducen conceptos que no existían** en los documentos de Fase 2 y por eso exigen un ADR propio en lugar de quedar solo en un entregable derivado.

### Decisión

#### 1. El catálogo de roles organizacionales de V1 es cerrado y tiene cuatro roles

`owner`, `admin`, `coach` y `staff`. No hay roles personalizados por organización ni alcance de rol por sede.

`staff` es el concepto nuevo. Cubre recepción y personal administrativo: crea invitaciones y consulta el directorio de personas relacionadas con la organización —nombre, estado de relación y estado de invitación— y **ningún** dato fitness, de perfil, corporal o de salud. Existe porque en un gimnasio real quien invita y da de alta no siempre es quien entrena, y sin este rol esa persona necesitaría `admin`, que es un permiso mayor.

Ningún rol, incluido `owner`, concede por sí mismo acceso al Fitness ID de nadie.

#### 2. Una relación admite un titular efectivo y suplencias aceptadas por la persona

En cada instante hay **un** profesional titular por relación. Además pueden existir suplencias, y son el segundo concepto nuevo:

- las propone el titular o un `admin` de la organización;
- tienen vigencia acotada con fecha de fin **obligatoria**;
- **requieren aceptación explícita de la persona** antes de conceder cualquier acceso;
- ejercen exactamente los grants ya vigentes, sin ampliarlos;
- caducan solas, y la fórmula de acceso rechaza a un suplente vencido aunque el job de expiración no haya corrido;
- la persona puede terminarlas en cualquier momento sin justificar y sin afectar al titular ni a la relación.

Se rechazó la alternativa de que un `admin` designara suplentes con acceso inmediato: habría permitido que la organización ampliara unilateralmente el conjunto de personas que ven datos de alguien, que es exactamente lo que ADR-015 impide para el titular.

#### 3. Soporte y aprobación de break-glass son deberes de plataforma separados

Tercer concepto nuevo. Soporte opera normalmente sobre **metadatos**: identificadores, estados, marcas de tiempo, errores y contadores, sin nombres ni contenido. Para acceder a datos de una persona necesita una ventana break-glass que exige propósito/caso, sujeto y categorías concretas, fecha de fin obligatoria y quorum independiente según ADR-026.

V1 separa dos actores de plataforma:

- `A10` — soporte solicitante: diagnostica, solicita una ventana y, una vez aprobada, solo él puede ejercerla o cerrarla;
- `A12` — aprobador de seguridad/privacidad: aprueba/rechaza o revisa; no puede ejercer, y quien aprobó un caso no registra su revisión posterior.

`A10` y `A12` no son roles organizacionales, no pertenecen al catálogo `owner/admin/coach/staff` y no reciben autoridad mediante una membresía de gimnasio. Son deberes internos provisionados por el control de acceso de plataforma. El backend solo establece `actor_kind` y `platform_duty` después de validar esa autorización confiable; WorkOS AuthKit autentica, pero un grupo o claim enviado por el cliente nunca decide por sí solo la autorización.

Una aprobación válida exige:

- aprobador distinto del solicitante;
- deber efectivo `approve_break_glass`;
- solicitud todavía pendiente;
- sujeto, categorías, propósito/caso y duración inmutables desde la solicitud;
- `UNIQUE(request_id,approver_person_id)`, un rechazo terminal y apertura solo al completar uno o dos aprobadores según sensibilidad.

Si no existen todos los actores independientes requeridos —solicitante, quorum y revisor— break-glass queda indisponible y falla cerrado. Un turno unipersonal no habilita autoaprobación.

Cada ejercicio exige que el actor sea el `A10` solicitante de la ventana, escribe un `ACCESS_EVENT` marcado que **la persona afectada puede ver** y falla si la auditoría no puede persistirse. Break-glass no habilita escritura: soporte no observa, no corrige y no propone.

La alternativa —resolver incidencias con acceso directo a la base bajo procedimiento manual— se rechazó porque deja el acceso más sensible del sistema fuera del modelo de auditoría.

#### 4. Decisiones diferidas que quedan cerradas sin introducir conceptos nuevos

| Ámbito | Resolución |
| --- | --- |
| Terminación de relación | Persona y `admin`/`owner` con efecto inmediato; el `coach` solicita. Motivo opcional, visible solo para quien lo declaró |
| Reactivación | Relación nueva con grants desde cero, enlazada a la anterior para mostrar continuidad sin conceder acceso |
| Relaciones simultáneas | Una relación activa por par persona–organización |
| `access_level` | `read` y `contribute` |
| Vigencia de grants | Indefinida, con recordatorio de revisión a los 12 meses que **no** corta el acceso |
| Auditoría de lectura | Toda lectura amparada por un grant, con actor humano real; retención de 24 meses |
| Invalidación tras revocación | Transaccional e inmediata; no existe ventana de caché tolerada |
| Jurisdicción | Colombia (Ley 1581 y Decreto 1377) con techo GDPR; 30 días corridos para resolver una supresión |
| Catálogo | Disciplinas, tipos de actividad, unidades y contratos solo los publica la plataforma; las organizaciones crean movimientos privados, promovibles a global mediante moderación explícita |
| Idiomas del catálogo | Solo español en V1, con la estructura de alias lista para traducir sin cambio de modelo |
| Calendario | Las sesiones se materializan **dentro de la transacción de asignación**; no existe job periódico de calendario. Desde la enmienda del 20 de septiembre de 2026, un programa **sin fecha de fin** materializa en esa transacción la semana en la que se asigna, y la lectura de la agenda siembra la semana que va a enseñar (`ADR-032`) |
| Asignaciones simultáneas | Sin límite; los solapamientos de agenda se advierten, no se bloquean |
| Reprogramación | Solo el coach, y solo sobre la parte administrada por una relación con periodo de gestión vigente |
| Zona horaria | La de la persona en el momento del hecho |
| Ejecución primaria | Solo la persona puede cambiarla |
| Edición de ejecuciones | Indefinida y append-only mediante revisiones; sin ventana de congelamiento |
| Propuestas de corrección | Vencen a los 30 días y se cancelan al terminar la relación |
| Notificación de revisiones | Obligatoria hacia la persona |
| Jobs de V1 | Outbox, notificaciones, expiraciones, recordatorio de revisión de grants, disposición, resolución de supresión, reaplicación tras restauración y recálculo de derivados; cada uno con credencial propia y grants mínimos |

### Revisión del 20 de septiembre de 2026

**La promesa se mantiene entera; lo que se estrecha es la palabra «todas».** Esta decisión
cerró el calendario diciendo que las sesiones se materializan dentro de la transacción de
asignación y que **no existe job periódico de calendario**. Lo segundo sigue siendo cierto
al pie de la letra: `ADR-032` no crea ningún worker, ninguna ventana de calendario y nada
a lo que haya que vigilarle si corrió.

Lo primero deja de poder decirse de un programa que no termina, porque ahí no hay un
«todas» que materializar. Un programa **con** fecha de fin se comporta exactamente como
esta decisión lo escribió: la composición entera cae en la transacción de la asignación.
Un programa **sin** fecha de fin materializa en esa misma transacción la semana de
calendario en la que se asigna, y cada semana posterior la siembra la lectura de la agenda
un instante antes de enseñarla.

Eso no reintroduce por la puerta de atrás lo que esta decisión rechazó. Lo que se rechazó
fue que la agenda dependiera de un proceso ajeno corriendo a tiempo, con su ventana, su
retraso y su pregunta de «¿ya corrió?»; una siembra que ocurre dentro de la petición que
va a mostrar esa semana no tiene ventana ni retraso, porque no promete nada que no vaya a
entregar en el mismo instante. El razonamiento completo está en `ADR-032`.

### Invariantes

1. Ningún rol organizacional concede acceso a datos fitness sin relación, asignación y grant.
2. `staff` no puede leer perfil, ejecuciones, progreso corporal ni contexto de salud de nadie.
3. Ningún profesional adicional accede a los datos de una persona sin aceptación explícita de esa persona.
4. Una suplencia sin fecha de fin no existe.
5. Un suplente nunca ejerce un scope que el titular no tenga.
6. En cada instante hay como máximo un titular efectivo por relación.
7. Soporte no tiene acceso ordinario a datos de personas.
8. `A10` no aprueba y `A12` no ejerce; ningún actor puede aprobar su propia solicitud.
9. Ninguna ventana break-glass es indefinida, de alcance total ni mutable después de solicitarse.
10. Solo el solicitante exacto puede ejercer o cerrar su ventana aprobada.
11. Todo ejercicio de break-glass es visible para la persona afectada.
12. Break-glass no concede escritura sobre datos de una persona.

### Consecuencias

#### Positivas

- El catálogo de roles queda cerrado y comprobable, sin roles personalizados que multipliquen la superficie de autorización.
- La suplencia resuelve un caso operativo real —vacaciones, cobertura, especialidad— sin que la organización pueda ampliar por su cuenta quién ve datos personales.
- El acceso más sensible del sistema, el de soporte, entra al modelo de auditoría en lugar de vivir fuera de él.
- La agenda deja de depender de que un job periódico corra a tiempo, y sigue sin depender de él cuando el programa no termina: lo que falta lo siembra la misma lectura que lo va a mostrar (`ADR-032`).

#### Costos

- La aceptación de suplencias añade fricción cuando la cobertura es urgente: si la persona no responde, no hay suplente.
- Auditar toda lectura bajo grant convierte `ACCESS_EVENT` en la tabla de mayor crecimiento del sistema y obliga a particionarla en Fase 4.
- Materializar el calendario al asignar escribe decenas de filas en una sola transacción, y en un programa sin fin traslada a la lectura una escritura acotada a una semana.
- Un cuarto rol es una condición más que probar en cada policy.

### Escenarios de prueba obligatorios

1. `staff` lista el directorio y no obtiene ninguna columna de perfil, ejecución, medida corporal o salud.
2. `staff` crea una invitación y no puede asignar programas ni ejercer grants.
3. Un suplente propuesto y no aceptado no lee absolutamente nada.
4. Un suplente aceptado ejerce los grants vigentes y **no** obtiene ninguno adicional.
5. Un suplente con vigencia expirada es rechazado aunque el job de expiración no haya corrido.
6. La persona termina una suplencia sin afectar al titular ni a la relación.
7. Existe como máximo un titular efectivo por relación bajo escritura concurrente.
8. Un `coach` no puede terminar la relación; su solicitud no cambia ningún estado ni corta accesos.
9. Soporte consulta metadatos sin obtener nombres, contactos ni contenido.
10. `A10` no puede aprobar, `A12` no puede ejercer y un aprobador no puede revisar posteriormente su propio caso.
11. Una ventana sin propósito/caso, fin, alcance, quorum, AAL2 o separación suficiente es rechazada.
12. Solo el `A10` solicitante puede ejercer o cerrar la ventana aprobada.
13. Un ejercicio de break-glass aparece en el historial de accesos de la persona afectada.
14. Break-glass no permite escribir observaciones, correcciones ni resultados.
15. Una categoría restringida no abre con una sola aprobación y vence a los 15 minutos aunque el job no haya corrido.
16. Asignar un programa **con fecha de fin** materializa todas sus sesiones en la misma transacción, en la zona horaria de la persona; asignar uno sin fecha de fin materializa en esa misma transacción la semana de la asignación, y ninguna de las dos formas espera a que corra un proceso posterior.
17. Revocar un grant corta el acceso en la lectura inmediatamente posterior, sin ventana de caché.
18. Un grant sin uso durante doce meses genera recordatorio y **conserva** el acceso.

### Recertificación de Fase 2

El 26 de julio de 2026 se recorrieron de nuevo el mapa de ownership, el ERD conceptual y los escenarios afectados. La recertificación confirma:

1. `staff` pertenece a Organizaciones y nunca es actor de datos fitness;
2. titular y suplente son variantes de una asignación de Relaciones, no roles ni grants nuevos;
3. la decisión de la persona sobre una suplencia pertenece al historial de la asignación;
4. solicitud, aprobación y ejercicio break-glass pertenecen a Soporte de plataforma;
5. `A10` y `A12` son deberes de plataforma separados de los roles organizacionales;
6. `HISTORICAL_ACCESS_CASE` pertenece a Privacidad y no se confunde con break-glass;
7. terminación cierra titular y suplencias, congela grants y no deja accesos de soporte implícitos;
8. retención conserva evidencia restringida, nunca autoridad operativa.

---

## ADR-023 — Acceso histórico restringido a grants `frozen`

**Estado:** aceptada para V1<br>
**Fecha:** 23 de julio de 2026

### Contexto

ADR-005 conserva para la organización una ventana histórica sobre grants `frozen`, pero la fórmula profesional normal exige relación y asignación vigentes. Reutilizar esa fórmula haría imposible la lectura histórica; omitirla permitiría que cualquier miembro administrativo navegara el Fitness ID de antiguos clientes.

La lectura histórica debe demostrar una finalidad legítima sin transformar retención en acceso cotidiano. También debe respetar el corte `T`, las restricciones personales, la minimización por campo, la revocación posterior y la anonimización.

### Decisión

#### 1. No existe un quinto rol organizacional

El catálogo V1 permanece cerrado en `owner`, `admin`, `coach` y `staff`. Ningún rol obtiene por sí mismo acceso `frozen`.

La autorización se materializa mediante un `privacy.historical_access_case` que concede, para **una relación terminada**, la capacidad protegida `read_frozen_relationship_history` a **una membresía activa concreta**:

- `owner` o `admin`, mediante la capacidad `manage_historical_access`, abre y cierra el caso;
- puede autorizarse a sí mismo, a otro `owner`/`admin` o al antiguo coach titular de esa relación, siempre que su membresía continúe activa;
- `staff`, suplentes vencidos, miembros terminados y cualquier coach sin participación histórica en la relación son inelegibles;
- la asignación profesional anterior no concede nada por sí sola: el antiguo titular pierde toda capacidad directa en `T`;
- el caso fija organización, relación, membresía autorizada, propósito, referencia externa, justificación, apertura y expiración;
- su vigencia máxima es de 24 horas; cada nueva necesidad exige otro caso.

`manage_historical_access` permite administrar casos, no leer datos. `read_frozen_relationship_history` existe únicamente dentro del caso autorizado y nunca se asigna a un rol mediante `role_capabilities`.

#### 2. Superficie separada y de solo lectura

La lectura ocurre exclusivamente bajo:

`GET /studio/v1/organizations/{orgId}/historical-relationships/{relationshipId}`

La petición identifica el caso mediante `X-Historical-Access-Case`. Puede consultar recursos históricos subordinados por relación, pero:

- no reutiliza `/clients`;
- no lista ni busca antiguos clientes;
- no habilita exportaciones masivas en V1;
- no permite observaciones, correcciones, asignaciones, reprogramación o cualquier escritura;
- no revela si existe una relación ante un actor que no supera el predicado completo.

#### 3. Propósito cerrado, caso vigente y MFA

El caso usa uno de estos propósitos:

- `service_dispute`;
- `legal_or_regulatory_obligation`;
- `customer_support_request`;
- `security_investigation`;
- `authorized_quality_review`.

También exige `case_reference`, justificación no vacía y autenticación reforzada `aal2`/MFA. Marketing, recuperación comercial, entrenamiento de IA y curiosidad operativa están prohibidos.

#### 4. Predicado separado

`access_control.can_read_frozen(relationship_id, scope_code, resource, field, occurred_at)` es distinto de `access_control.can_access`. El actor siempre sale del contexto transaccional, nunca de un parámetro.

Devuelve verdadero únicamente cuando:

```text
actor humano autenticado con AAL2/MFA
∧ membresía autorizada activa en la organización de la ruta
∧ caso histórico abierto, no vencido y asignado a esa membresía
∧ propósito y relación coinciden con el caso
∧ relación terminada
∧ grant de esa relación y organización en status = 'frozen'
∧ occurred_at <= data_grants.frozen_at
∧ scope/version originales cubren el recurso y campo
∧ scope_resource_rules.historical_readable = true
∧ no existe denegación histórica aplicable
∧ la política de retención todavía permite conservar el dato
```

La asignación profesional efectiva no forma parte de esta fórmula. La existencia de un caso tampoco evita ninguna de las demás condiciones.

#### 5. Toda lectura se audita

Cada lectura, incluida colección, detalle o intento denegado, escribe `ACCESS_EVENT` en la misma transacción con:

- actor humano y membresía;
- organización, relación, grant, scope y versión cuando el predicado alcanzó a resolverlos;
- `historical_access_case_id` cuando fue presentado y resoluble;
- propósito, recurso y field-set aplicado;
- timestamp, `request_id`, resultado y modo `frozen`.

Si el evento no puede persistirse, la lectura falla cerrada. La persona puede consultar estos eventos en su historial de accesos. El log no copia valores sensibles.

#### 6. Las denegaciones son monotónicas después del corte

- Una denegación efectiva en `T` permanece fuera de la ventana.
- La persona puede añadir una denegación después de `T` para reducir la ventana.
- Restaurar después de `T` no vuelve a ampliar el histórico congelado.
- Detalle, conteos, derivados, cursores y cachés aplican la misma exclusión.

`session_visibility_denials.frozen_denied_at` registra el primer instante desde el que la exclusión se vuelve irreversible para esa relación terminada. Es metadato de autorización, no una copia del dato fitness.

#### 7. Revocación posterior

La persona puede revocar un grant `frozen`. La transición `frozen → revoked`:

- corta inmediatamente toda lectura histórica;
- cierra todos los casos abiertos de la relación —el caso abarca la relación y no un scope individual—;
- invalida proyecciones, cachés y exportaciones pendientes;
- conserva evidencia de consentimiento, acceso y revocación bajo acceso restringido;
- nunca reactiva el grant anterior.

Volver a compartir exige relación y consentimiento nuevos. La eliminación de cuenta aplica además la anonimización definida por ADR-005.

#### 8. Field-set histórico

`scope_resource_rules.historical_readable` define un subconjunto del field-set aceptado:

| Scope | Regla histórica V1 |
| --- | --- |
| `relationship_training` | Programas entregados, sesiones, ejecuciones, resultados y notas bilaterales materializados hasta `T` |
| `prior_training_history` | Solo sesiones que fueron compartidas y no quedaron denegadas |
| `body_progress` | Medidas estructuradas históricas; fotos, archivos y EXIF quedan excluidos |
| `health_context` | Sin lectura `frozen` en V1; la evidencia bilateral imprescindible se conserva separada y restringida |

El perfil/proyección actual, estados en vivo, actividad de otras relaciones y cualquier dato posterior a `T` quedan fuera.

Un derivado sobrevive únicamente si estaba materializado en `T`, su regla está marcada `historical_readable` y **todos** sus inputs continúan permitidos. No se recalcula con datos posteriores ni puede reconstruir inputs excluidos. Los agregados irreversiblemente anónimos se rigen por ADR-005, no por el grant.

### Invariantes

1. Ningún rol organizacional concede por sí solo lectura `frozen`.
2. El antiguo titular pierde toda capacidad directa en `T`.
3. `staff` nunca ejerce un caso histórico.
4. Un caso autoriza una membresía, organización, relación y propósito exactos durante máximo 24 horas.
5. `manage_historical_access` no concede lectura.
6. `access_control.can_access` nunca acepta grants `frozen`; `access_control.can_read_frozen` nunca acepta grants `active` o `revoked`.
7. No existe escritura, exportación masiva ni dato posterior a `T` bajo la superficie histórica.
8. Una denegación o revocación posterior solo reduce acceso; ninguna acción posterior a `T` amplía la ventana.
9. Toda lectura histórica produce `ACCESS_EVENT` o falla.
10. Solo sobreviven campos marcados `historical_readable`; `health_context`, medios y EXIF quedan fuera en V1.

### Consecuencias

#### Positivas

- La organización conserva evidencia útil sin mantener un CRM de antiguos clientes.
- Owner/admin administran el proceso sin recibir acceso implícito.
- El antiguo coach puede participar en una disputa concreta sin conservar acceso cotidiano.
- La autorización se expresa sobre columnas y estados auditables.
- Revocación, ocultación y eliminación continúan bajo control de la persona.

#### Costos

- Se añade `privacy.historical_access_cases` y una dimensión `historical_readable` al contrato de scopes.
- Toda lectura histórica exige MFA, contexto adicional y escritura de auditoría.
- Las denegaciones necesitan metadatos monotónicos después de `T`.
- Los endpoints históricos no pueden reutilizar directamente los read models operativos.

### Escenarios de prueba obligatorios

1. Un `owner` sin caso recibe vacío aunque conozca relación y persona.
2. Un `admin` con caso abierto para otra membresía no puede ejercerlo.
3. El antiguo coach sin caso pierde todo acceso en `T`.
4. El antiguo coach con membresía activa y caso exacto puede leer solo campos históricos `<= T`.
5. `staff` no puede ser autorizado ni ejercer el caso.
6. Un caso vencido, cerrado, de otra organización, relación, membresía o propósito falla.
7. Una petición sin MFA falla antes de leer datos.
8. La superficie histórica no admite escrituras ni exportación masiva.
9. Cada lectura exitosa o denegada registra `ACCESS_EVENT`; si falla la auditoría, no se sirve el dato.
10. Una denegación vigente en `T` o creada después oculta detalle, conteos y derivados; restaurarla después no amplía la ventana.
11. `frozen → revoked` cierra casos e invalida toda lectura inmediatamente.
12. `health_context`, fotos, EXIF, perfil actual y datos posteriores a `T` nunca aparecen.
13. Un derivado con un input denegado o no histórico queda excluido.
14. Cerrar la cuenta anonimiza también lo que antes devolvía la superficie histórica.

---

## ADR-024 — Integridad compuesta entre persona, organización y relación

**Estado:** aceptada para V1
**Fecha:** 26 de julio de 2026

### Contexto

Varias tablas V1 transportan más de un identificador de contexto: persona y relación, relación y organización, ejecución y segmento, o asignación y autor profesional. Dos FKs simples solo demuestran que ambos IDs existen; no demuestran que pertenezcan al mismo sujeto o tenant.

RLS protege qué filas puede operar un actor, pero puede ser omitida por workers, funciones privilegiadas o migraciones. La API tampoco es una restricción estructural. Repetir el patrón defectuoso de la base anterior permitiría construir filas físicamente válidas pero semánticamente cruzadas.

### Decisión

1. Toda identidad cross-table que ya está presente en el hijo se protege con una **FK compuesta** hacia una `UNIQUE` portadora del padre.
2. Se permite repetir `person_id` u `organization_id` para enrutamiento y RLS únicamente cuando una FK compuesta demuestra su procedencia.
3. Elegibilidad temporal, targets polimórficos, estado de una primaria y familia de un paso se protegen con `CONSTRAINT TRIGGER DEFERRABLE INITIALLY IMMEDIATE`.
4. Los padres mutables reciben triggers recíprocos cuando su cambio podría dejar un hijo efectivo inválido.
5. `privacy.access_events`, por ser particionada y de alto volumen, conserva referencias sin FK dura hacia cada agregado, pero solo admite escritura por `privacy.log_access_event(...)` y un trigger guardián valida el contexto.
6. Cada invariante debe tener una prueba negativa ejecutada por un rol con `BYPASSRLS` y sin `SUPERUSER`.
7. La lista exhaustiva de 27 invariantes, constraints y pruebas es [`V1_CROSS_TABLE_INTEGRITY_MATRIX.md`](../03_PROPOSED_DESIGN/V1_CROSS_TABLE_INTEGRITY_MATRIX.md).

### Invariantes

1. Una relación anterior pertenece a la misma persona y organización.
2. Una asignación profesional nunca mezcla relación y membresía de organizaciones distintas.
3. Consentimiento, grant, denegación y caso histórico no pueden cambiar el sujeto o tenant de su relación.
4. Una asignación, periodo de gestión, sesión planificada y ejecución conservan la misma persona a lo largo del recorrido.
5. Un resultado no puede apuntar a un segmento de otra ejecución.
6. Autoría profesional, observación y propuesta de corrección corresponden al sujeto del dato.
7. Una tabla de target tipado solo puede especializar un paso de la familia compatible.
8. RLS, API y jobs no son sustitutos de estas constraints.
9. Ninguna inconsistencia puede sobrevivir al `COMMIT`, aunque el constraint sea diferible.

### Consecuencias

#### Positivas

- Los cruces de tenant fallan incluso con `BYPASSRLS`.
- Las columnas repetidas dejan de ser una fuente de drift y se convierten en claves de integridad y enrutamiento.
- La suite puede atribuir cada rechazo a un constraint o guardián concreto.
- Los comandos atómicos pueden ordenar cierres y altas sin relajar el estado final.

#### Costos

- Se añaden claves portadoras redundantes y columnas `person_id`/`organization_id` en algunas tablas hijas.
- Los triggers de estado necesitan locks ordenados y pruebas de concurrencia.
- Las escrituras de auditoría validan contexto antes de insertar.
- El DDL y la restauración deben conservar nombres, diferibilidad y triggers recíprocos.

### Escenarios de prueba obligatorios

1. Una membresía de otra organización no puede asignarse aunque exista y RLS esté omitida.
2. Un grant no puede usar persona, organización, consentimiento o scope de otra relación.
3. Una planificación y una ejecución de personas distintas no pueden enlazarse.
4. Un resultado no puede usar el segmento de otra ejecución.
5. Una observación o propuesta no puede atribuirse al sujeto equivocado.
6. Diferir constraints permite una transición atómica válida, pero el `COMMIT` rechaza una transición incompleta.
7. Un rol con `BYPASSRLS` obtiene los mismos errores de integridad.
8. Restaurar y reejecutar migraciones conserva los 27 invariantes.

---

## ADR-025 — Idempotencia durable independiente del replay HTTP

**Estado:** aceptada para V1<br>
**Fecha:** 26 de julio de 2026

### Contexto

Space admite borradores locales que pueden permanecer sin conexión más de 24 horas. Conservar una respuesta HTTP por 24 horas no impide que, tras purgarla, el mismo comando vuelva a crear una ejecución, claim, medición o efecto crítico. Tampoco basta una key global sin actor, WorkOS Application, superficie u operación, y un estado `processing` persistente podría bloquear reintentos después de un crash.

Un `PUT` convergente reduce duplicados, pero no evita que un draft antiguo sobrescriba una revisión posterior. La idempotencia de transporte y la identidad de una intención de negocio son garantías distintas.

### Decisión

1. Todo comando HTTP V1 que muta dominio exige `Idempotency-Key` UUIDv4 para replay y `Command-Id` UUIDv7 para identidad durable; jobs derivan ambas identidades con UUIDv5. `OP-SUP-003` no se deduplica porque cada lectura break-glass debe auditarse por separado.
2. El servidor calcula principal, WorkOS Application, superficie y `operation_code`; el caller no declara su scope.
3. La respuesta mínima expira a las 24 horas. El tombstone de comando permanece mientras el actor o agregado sean invocables y nunca contiene el body ni datos personales/de dominio.
4. Repetir una identidad con hash distinto devuelve `409`. Repetirla con el mismo hash nunca ejecuta otra vez, aunque el response haya expirado.
5. Receipt, efecto de dominio, auditoría y outbox se confirman en una sola transacción. Un constraint trigger impide confirmar `processing`; crash, `5xx` y errores retryables revierten todo.
6. Los creates offline igualan `Command-Id` con la PK UUIDv7 del agregado o evento. Las transiciones restantes usan receipt durable, lock y estado convergente.
7. `OP-EXE-005` exige revisión base/`If-Match`; un draft obsoleto no pisa resultados confirmados.
8. Disponer el efecto marca el receipt. Un retry devuelve `410` y no recrea el dato.
9. Los jobs derivan UUIDv5 determinístico de operación, target y ciclo.
10. El contrato físico, algoritmo, retención y suite obligatoria se fijan en [`V1_IDEMPOTENCY_CONTRACT.md`](../03_PROPOSED_DESIGN/V1_IDEMPOTENCY_CONTRACT.md).

### Invariantes

1. Expirar el replay HTTP nunca vuelve ejecutable un comando resuelto.
2. Dos actores, clients, superficies u operaciones no comparten outcome por coincidencia de key.
3. El mismo `Command-Id` no acepta dos hashes.
4. Ninguna fila `processing` sobrevive al commit.
5. Un timeout después del commit converge al outcome ya resuelto.
6. Un efecto dispuesto no se recrea.
7. El receipt no se usa como copia de datos de dominio.

### Consecuencias

#### Positivas

- Los borradores offline pueden sincronizar después de 24 horas sin duplicar efectos.
- Crash y concurrencia tienen un comportamiento transaccional verificable.
- La respuesta sensible no se retiene para sostener la deduplicación.
- Los conflictos de drafts obsoletos son explícitos y no producen last-write-wins silencioso.

#### Costos

- Cada comando crea un tombstone operacional mínimo.
- Space debe persistir `Command-Id`, key por operación y revisión base junto al borrador.
- API y workers deben canonicalizar el request de la misma forma.
- La disposición debe actualizar receipts asociados sin conservar el dato eliminado.

### Escenarios de prueba obligatorios

1. Dos requests concurrentes con las mismas identidades producen un solo efecto.
2. Misma key o command ID con body distinto devuelve `409`.
3. Retry posterior a 24 horas no ejecuta de nuevo.
4. Crash antes del commit no deja `processing`.
5. Un error retryable permite reintento y un rechazo final se reproduce.
6. La misma key en actores u operaciones distintas no mezcla outcomes.
7. Un draft obsoleto no sobrescribe una revisión confirmada.
8. Retry de un efecto dispuesto devuelve `410`.
9. Receipt y response no contienen PII ni payload de dominio.
10. Cada comando de la matriz demuestra identidad y convergencia.

---

## ADR-026 — Gobernanza cerrada de verificadores y acceso break-glass

**Estado:** aceptada para V1<br>
**Fecha:** 26 de julio de 2026

> **Partially superseded by [ADR-046](#adr-046-an-allfit-admin-acts-with-the-full-authority-of-the-platform)**
> on 7 November 2026. For administrators, item 6 (duties last at most 90 days and are
> recertified) no longer applies; this is built. The break-glass quorum and durations, the
> approver rules and the pending request (items 8 and 10, the first sentence of item 11,
> invariants 4 and 5, the approval half of invariant 7, scenarios 5, 7 and 8, and the
> rejected or expired request of scenario 6) are replaced by self-approved 60-minute windows,
> decided and pending implementation. Review by someone who did not request the window
> (item 12) stays.

### Contexto

ADR-018 separó una afirmación de su verificación y ADR-022 separó soporte solicitante (`A10`) de aprobación/auditoría (`A12`). Faltaba cerrar quién puede verificar, qué evidencia puede usar, cómo se recertifican esos deberes, cuántas aprobaciones exige una lectura excepcional y qué ocurre ante conflicto o abuso.

Dejar esas decisiones a un claim, role o permission de WorkOS, un procedimiento manual o una aprobación genérica permitiría convertir curaduría en autoridad universal, autoaprobar accesos sensibles o mantener deberes indefinidos.

### Decisión

1. V1 solo verifica versiones exactas de **credenciales profesionales** normalizadas. WorkOS verifica el email de autenticación; la prueba de control de celular pertenece al contrato separado de identidad. La mayoría de edad continúa como declaración de elegibilidad; identidad documental, salud, biometría, afiliación comercial y perfil completo no reciben estado `authority_verified`.
2. `A11` es el actor de plataforma, pero verificar exige el deber separado `verify_professional_credentials`, AAL2 y una asignación interna vigente. Tener `curate_catalog` no concede verificación.
3. Solo se admiten `official_registry_lookup` e `issuer_confirmation`. No se copian documentos: se conserva autoridad, referencia mínima, instante, resultado, fingerprint y versión de política.
4. La verificación exige `valid_to`, con máximo de doce meses y nunca posterior al vencimiento publicado por la autoridad. Renovar, revocar o apelar crea otro evento; no reescribe la credencial declarada ni transfiere autoridad a una revisión posterior de ella.
5. El verificador no puede ser el sujeto, declarante/revisor de la credencial, miembro activo de una organización compartida con el sujeto, profesional asignado suyo ni decisor de la apelación que revisa. Un conflicto o evidencia ambigua falla cerrado como `unverifiable`.
6. Los deberes `A10`, `A11` verificador y `A12` se provisionan fuera de roles organizacionales, vencen como máximo a los 90 días y requieren recertificación por seguridad/privacidad. Revocarlos corta inmediatamente nuevas decisiones y cierra ventanas break-glass abiertas del `A10` afectado.
7. Break-glass usa cinco propósitos cerrados, referencia obligatoria a un caso, AAL2, sujeto exacto, categorías concretas y alcance inmutable. No existe `other`, acceso a “toda la cuenta” ni extensión de una ventana.
8. `relationship_training`, `prior_training_history` y `nutrition_guidance` requieren una aprobación `A12` y duran como máximo 30 minutos. `body_progress`, `health_context` y `nutrition_intake` requieren **dos aprobaciones de A12 distintos** y duran como máximo 15 minutos. Una solicitud mixta hereda el quorum y plazo más restrictivos.
9. `nutrition_media`, identidad/contacto, secretos de autenticación, pagos, raw de sensores, evidencia documental y notas privadas organizacionales nunca son categorías break-glass V1. Soporte no puede usar una ventana para invocar `OP-NUT-013`, obtener URLs de storage o leer bytes de fotos.
10. Ningún aprobador puede ser solicitante, sujeto, repetirse en la misma solicitud, compartir organización/relación activa con el sujeto o ejercer la ventana. Cualquier rechazo es terminal; la ventana solo abre al completar el quorum.
11. Toda solicitud pendiente vence a los 30 minutos. Toda ventana se evalúa por timestamp aunque el job no haya corrido, es solo lectura, nunca cacheable y cada ejercicio exitoso o denegado produce auditoría durable antes de entregar contenido.
12. El 100% de ventanas ejercidas recibe revisión posterior dentro de las 24 horas corridas siguientes al primer ejercicio por un `A12/audit_break_glass` que no solicitó ni aprobó el caso. Si ese actor no existe, break-glass falla cerrado.
13. Intentar escribir, pedir una categoría prohibida, alterar auditoría o ejercer una ventana ajena cierra las ventanas del actor, suspende su deber, abre incidente de seguridad, preserva evidencia y activa revisión de sus accesos anteriores. Un acceso fuera de tiempo/alcance se deniega y alerta; nunca amplía la ventana.
14. El contrato exacto, catálogo, transiciones y pruebas se fijan en [`V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md`](../03_PROPOSED_DESIGN/V1_VERIFICATION_AND_BREAK_GLASS_GOVERNANCE.md).

### Invariantes

1. Ninguna credencial de catálogo, grupo del cliente o rol de gimnasio concede por sí solo autoridad de verificación o break-glass.
2. Una verificación cubre una versión de credencial, método, fuente y vigencia exactos.
3. Evidencia ambigua o conflicto de interés nunca produce `verified`.
4. La máxima sensibilidad exige dos aprobadores distintos y una ventana de máximo 15 minutos.
5. Un rechazo cierra la solicitud; aprobaciones parciales no conceden acceso.
6. El solicitante exacto es el único que puede ejercer y cerrar la ventana.
7. Aprobación, ejercicio y revisión posterior no recaen en la misma persona para un caso ejercido.
8. Ausencia de auditoría, aprobador o revisor independiente falla cerrado.
9. Break-glass jamás habilita escritura ni una categoría prohibida.
10. Todo abuso conserva evidencia y reduce autoridad; nunca se resuelve borrando eventos.

### Consecuencias

#### Positivas

- La etiqueta verificada deja de depender de criterio libre o documentos copiados.
- Curaduría y verificación comparten actor técnico sin compartir automáticamente deberes.
- Los accesos más sensibles reciben quorum, duración y revisión reforzados.
- Conflictos y abuso tienen efectos operativos comprobables.

#### Costos

- La operación de soporte sensible necesita hasta cuatro personas: solicitante, dos aprobadores y revisor.
- Las asignaciones de deberes requieren recertificación trimestral.
- `break_glass_approvals` deja de ser una decisión única por solicitud y pasa a registrar quorum.
- La disponibilidad de soporte falla cerrada cuando no existe separación suficiente.

### Escenarios de prueba obligatorios

1. Un curador sin `verify_professional_credentials` no registra verificaciones.
2. Una consulta de registro oficial válida verifica una sola credencial y vence dentro de doce meses.
3. Un documento subido, una declaración de edad o evidencia ambigua no producen `authority_verified`.
4. El sujeto, declarante/revisor, profesional asignado o miembro de una organización compartida no verifica la credencial.
5. Una categoría estándar abre con un A12; una restringida permanece cerrada hasta dos aprobaciones distintas.
6. Un rechazo, solicitud vencida o deber expirado impiden abrir o ejercer.
7. La ventana restringida vence a los 15 minutos aunque el job no haya corrido.
8. El solicitante no aprueba, los aprobadores no ejercen y ninguno revisa posteriormente su propio caso.
9. Cada lectura y denegación queda auditada antes de servir contenido.
10. Un intento de escritura o categoría prohibida suspende el deber y abre incidente sin borrar evidencia.

---

## ADR-027 — Nutrición personal y guía profesional no clínica en V1

**Estado:** aceptada para V1<br>
**Fecha:** 28 de julio de 2026

### Contexto

La baseline aprobada difería nutrición para evitar esconder ingestas, macros o planes dentro de `health_context`. Antes de comenzar la Fase 5, producto decidió incorporar una rebanada nutricional completa, manteniendo el sistema greenfield y sin reutilizar datos, identificadores, contratos o migraciones de Factory Fitness.

El cambio necesita dominio, ownership, privacidad, autoridad profesional, estructuras físicas y contratos propios. Una tabla genérica de notas, un JSON de salud o un único scope `nutrition` no preservan la separación entre ingestas, orientación y medios.

### Decisión

1. Nutrición es el noveno dominio conceptual y usa el schema físico `nutrition`.
2. La persona es dueña lógica de sus comidas, componentes, nutrientes, fotos, objetivos y decisiones. Space es una superficie de captura; no una fuente paralela.
3. V1 incluye registro manual estructurado, seis nutrientes iniciales (`energy`, `protein`, `carbohydrates`, `fat`, `fiber`, `water`), resúmenes diarios calculados, una foto opcional por comida y una línea versionada de objetivos.
4. V1 excluye nutrición clínica o terapéutica, diagnósticos, medicamentos, laboratorios, prescripción médica, suplementos, catálogo global de alimentos, recetas, menús, códigos de barras, proveedores externos e IA nutricional.
   > **Reemplazado en parte por [ADR-041](#adr-041-reconocer-y-buscar-alimentos-al-registrar-una-comida)** el 4 de octubre de 2026: entran un catálogo propio de alimentos y el reconocimiento por foto con un proveedor externo. Siguen fuera la nutrición clínica, los suplementos, los menús y los códigos de barras.
5. Privacidad publica tres scopes independientes: `nutrition_intake`, `nutrition_guidance` y `nutrition_media`. El último nunca revela una comida sin `nutrition_intake/read`.
6. Un profesional solo lee nutrición o propone objetivos cuando coinciden organización de ruta, relación activa, asignación efectiva, membresía vigente, capability `guide_nutrition`, credencial `nutrition_professional` verificada y grant suficiente. Ningún rol organizacional concede acceso por sí solo.
7. La persona puede publicar una meta propia, que se activa inmediatamente. Una versión profesional exige un `rationale` no vacío de hasta 2000 caracteres, es inmutable y permanece `proposed` hasta decisión personal explícita; aceptarla reemplaza la activa y rechazarla no cambia la meta vigente.
8. El profesional nunca modifica comidas, adjunta fotos, decide por la persona ni activa objetivos directamente.
9. Terminar la relación cancela propuestas pendientes y congela el grant. La superficie histórica solo puede mostrar guía profesional emitida por esa relación hasta `T`; excluye comidas, resúmenes, fotos y metas personales, y exige el caso, AAL2, propósito y auditoría de ADR-023.
10. Space admite captura offline de datos estructurados con `Command-Id`. La foto se adjunta después mediante una revisión idempotente; el servidor elimina EXIF/geolocalización y falla cerrado si no puede sanearla.
11. Resúmenes diarios son vistas/proyecciones, no snapshots ni tablas materializadas. Space puede emitir a la persona una URL de storage firmada por hasta 300 segundos; Studio nunca recibe esa URL y obtiene la foto por un proxy autenticado que reevalúa ambos scopes en cada GET, registra el acceso, no redirige y transmite únicamente el objeto saneado. Revocación, borrado o anonimización invalidan detalles, conteos, cursores, agregados, cachés, enlaces autenticados y URLs firmadas según su superficie.
12. Los datos canónicos permanecen mientras la cuenta esté activa salvo borrado personal, hold o política de disposición. El acceso `frozen` nunca crea una copia independiente.
13. La incorporación es greenfield: no existen ETL, backfill, mapeos de ID, compatibilidad, reconciliación, reconsentimiento o importación desde Factory Fitness.
14. La primera rebanada de Fase 5 se amplía de ocho a veintiuna operaciones HTTP: conserva las ocho actuales e incorpora `OP-NUT-001..013`.

### Modelo físico cerrado

El dominio se materializa en ocho tablas: `nutrient_definitions`, `meals`, `meal_items`, `meal_nutrient_values`, `goal_sets`, `goal_versions`, `goal_targets` y `goal_decisions`. El total de la baseline pasa de 91 a 99 tablas en diez schemas.

### Invariantes

1. Una comida pertenece a una persona y sus ítems/nutrientes heredan ese sujeto mediante claves portadoras.
2. Cada persona tiene un único `goal_set` y como máximo una versión `active`.
3. Contenido de una versión publicada no se actualiza; estados cambian solo mediante funciones cerradas.
4. Una propuesta profesional conserva autor, membresía, asignación, relación, organización, credencial y vigencia comprobadas en el instante de publicación. Las superficies públicas minimizan esa procedencia a `author.kind` y `author.person_id`; no serializan membresía, asignación, organización, verificación ni nombre.
5. Solo la persona del `goal_set` decide una propuesta y solo una vez.
6. `nutrition_media` sin `nutrition_intake` produce cero filas y cero señales derivadas.
7. La revocación se evalúa antes de detalle, conteo, paginación, resumen o URL.
8. Eventos de outbox transportan identificadores y versión de contrato; nunca notas, nutrientes o medios.

### Escenarios de prueba obligatorios

1. Una persona registra offline una comida y sincroniza la foto después sin duplicar el agregado.
2. Otra persona, un admin, un `staff` y un coach sin asignación reciben cero acceso.
3. Un coach asignado sin capability, credencial o grant falla cerrado.
4. `nutrition_intake/read` expone estructura pero no foto; `nutrition_media/read` aislado no revela la comida.
5. Para Space, la persona recibe una URL HTTPS de storage por máximo 300 segundos; para Studio, la combinación de ambos scopes entrega un enlace al proxy autenticado `OP-NUT-013`, nunca una URL de storage.
6. Un profesional autorizado propone; la versión no se activa hasta aceptación de la persona.
7. Aceptaciones concurrentes producen una sola meta activa y una sola decisión por versión.
8. Revocar `nutrition_intake` o `nutrition_media` hace que el mismo enlace Studio previamente entregado responda `404` sin bytes en la lectura inmediatamente posterior; revocar cualquier scope invalida además su superficie y todos sus derivados.
9. Tras terminar la relación, un caso histórico válido solo ve guía emitida hasta `T`.
10. El esquema se reconstruye sin ningún artefacto, dato o dependencia de Factory Fitness.

---

## ADR-028 — Backoffice con rol base, deberes temporales y separación break-glass

**Estado:** aceptada para V1<br>
**Fecha:** 3 de agosto de 2026<br>
**Supersede:** la consolidación informal `DT-019` que absorbía `A11/A12` en `A10`<br>
**Ratifica:** ADR-022 y ADR-026

> **Partially superseded by [ADR-046](#adr-046-an-allfit-admin-acts-with-the-full-authority-of-the-platform)**
> on 7 November 2026. Superseded: items 2, 5 (for administrators), 6, 7, 9 (its ban on
> self-approval) and 19 (the session limits); items 1, 8 and 16 in part; invariants 5 and 6
> and the second half of invariant 3; scenarios 1, 5 and 6, and scenario 7 for approvers.
> Built: an administrator holds all thirteen duties for as long as the role lasts, and the
> session lasts 60 idle minutes and 12 hours. Pending implementation: self-approved
> break-glass, partial person search and the optional case reference, so items 6 to 9 below
> still describe what runs for them. Items 16 and 23 describe bootstrap and recovery
> workflows that do not exist; ADR-046 records the real ceremony. The rest stays in force.

### Contexto

Las HU de Backoffice declaraban un único `allfit_admin` con acceso ordinario a todas las categorías. ADR-022 y ADR-026, en cambio, separan soporte, verificación, aprobación y auditoría, y exigen deber temporal, AAL2, quorum y break-glass para contenido sensible. La mezcla no permite compilar una política RLS segura ni demostrar mínimo privilegio.

### Decisión

1. Se adopta la **opción B**: separación de deberes y break-glass son obligatorios en V1.
2. `allfit_admin` es únicamente la asignación base que permite iniciar sesión en Backoffice. No concede lectura, escritura ni deber implícito.
3. Los modos humanos permanecen separados: `A10` soporte/operación ordinaria, `A11` curaduría o verificación y `A12` seguridad/privacidad. Son modos derivados del deber ejercido, no roles de organización ni roles PostgreSQL.
4. El catálogo cerrado inicial de deberes es: `view_platform_metrics`, `diagnose_support_metadata`, `view_billing_metadata`, `manage_organization_lifecycle`, `request_break_glass`, `verify_professional_credentials`, `curate_global_catalog`, `manage_platform_commercial`, `manage_platform_access`, `audit_platform_access`, `approve_break_glass`, `audit_break_glass` y `manage_privacy_requests`.
5. Todo deber exige AAL2, otorgante distinto del sujeto, `valid_from`, `valid_to` de máximo 90 días, estado y recertificación. El servidor lo resuelve dentro de cada transacción desde `support.platform_duty_assignments`; grupos, headers, payloads o caché no son autoridad.
6. Soporte ordinario usa proyecciones cerradas de identificadores, estados, fechas, errores y contadores. Una búsqueda de persona exige coincidencia exacta o identificador, referencia de caso y devuelve contacto enmascarado; no existe exploración por nombre.
7. Entrenamiento e historial previo son categorías break-glass estándar: un aprobador independiente y máximo 30 minutos. Cuerpo, salud y `nutrition_intake` son restringidas: dos aprobadores distintos y máximo 15 minutos.
8. `nutrition_media`, identidad/contacto completos, secretos de autenticación, pagos detallados, raw de sensores, documentos y notas privadas no son categorías break-glass. Los casos de identidad y cobro sólo usan operaciones dedicadas, minimizadas y sin secretos.
9. Solicitante, aprobadores y revisor se validan por persona y por caso. Nadie autoaprueba, ejerce una ventana ajena, revisa su propia solicitud/aprobación ni escribe mediante break-glass.
10. La autoridad física se materializa en cinco tablas `support`: `platform_role_assignments`, `platform_duty_assignments`, `break_glass_requests`, `break_glass_approvals` y `break_glass_events`.
11. `OP-SUP-001..006` cubren solicitud, decisión, ejercicio, cierre, metadatos y revisión break-glass; `OP-SUP-007..009` cubren rol base y auditoría; `OP-SUP-010..011` administran y consultan deberes.
12. Toda lectura sensible permitida o denegada escribe `break_glass_events` y `privacy.access_events` antes de devolver contenido. Si no puede auditar, falla cerrada. La persona afectada ve actor, categoría, propósito, instante y resultado, no el expediente interno.
13. Suspender, revocar o vencer `request_break_glass` cierra las ventanas abiertas del actor. Retirar el rol base revoca la sesión y todos sus deberes efectivos sin borrar historial.
14. Ningún runtime usa owner, superuser o `BYPASSRLS`; el rol de conexión de soporte sólo ejecuta funciones/proyecciones cerradas.
15. Backoffice usa un WorkOS Application propia dentro del WorkOS environment compartido y la API sólo acepta ese `client_id` en `/backoffice/v1`. Los WorkOS Applications de Space u Studio no obtienen acceso por compartir `sub` o `person_id`.
16. El bootstrap inicial y una recuperación por pérdida total de autoridad no son endpoints. Una ceremonia operativa con aprobación de dos personas usa temporalmente `allfit_migrator` para insertar, en una sola transacción, al menos dos roles base y sus deberes `manage_platform_access` cruzados: cada destinatario tiene como otorgante a la otra persona. El pipeline deshabilita esa credencial al terminar y conserva evidencia; no hay seed ni excepción de autoasignación.
17. Backoffice V1 autentica correo + contraseña y TOTP mediante las APIs independientes de WorkOS. Hosted AuthKit no participa en el login y el MFA global del environment permanece desactivado para esta superficie.
18. La API sólo crea la sesión Backoffice después de confirmar el challenge TOTP y revalidar persona activa, rol base, factor y carrera de revocación. PostgreSQL materializa `assurance_level=2`, `authentication_method='password_totp'` y `assurance_verified_at` para el `sid` exacto; ningún claim permite inferirlos.
19. La sesión Backoffice es host-only, dura ocho horas como máximo y quince minutos sin actividad. Retirar el rol, recuperar el factor o cambiar la contraseña revoca sesiones e intentos; el worker reintenta revocaciones externas con outbox y dead letter.
20. Una cuenta conserva como máximo un TOTP activo. QR, clave manual, tokens y challenge se cifran sólo mientras el intento está abierto; PostgreSQL conserva el factor ID requerido por WorkOS y únicamente hashes de cookies opacas.
21. El reset de contraseña usa `createPasswordReset` con la Application Backoffice. WorkOS envía el correo y sirve la página en `*.authkit.app`; la API descarta URL y token y responde uniformemente. `auth.allfit.one` queda diferido como branding/configuración.
22. Contraseña + TOTP es la evidencia AAL2 interna de V1, pero no es resistente al phishing. No se declarará equivalencia integral con una oferta AAL2 moderna hasta adoptar WebAuthn/passkeys.
23. El bootstrap y la recuperación TOTP se ejecutan únicamente mediante workflows protegidos con credencial `allfit_migrator`, dos personas, evidencia durable y deshabilitación de la credencial al terminar. No existen endpoints equivalentes.

### Invariantes

1. Rol base vigente y deber vigente son condiciones distintas y ambas son necesarias.
2. No hay autoasignación de rol o deber ni eliminación de su historial.
3. Nunca queda cero `allfit_admin` activos; la ausencia de un actor independiente para una función sensible hace que ésta falle cerrada.
4. Un deber vencido no se prolonga por caché, sesión o retraso de un job.
5. La vista ordinaria no devuelve nombres, contactos completos ni contenido personal.
6. Una aprobación parcial, un rechazo o una solicitud vencida nunca abren ventana.
7. Cada ejercicio está ligado por FK a solicitud, solicitante, sujeto y asignación de deber exactos.
8. Break-glass no concede DML, exportación masiva, storage ni una categoría prohibida.

### Consecuencias

- Las HU de Backoffice se corrigen para distinguir metadatos ordinarios, operaciones dedicadas y contenido break-glass.
- El schema `support` aumenta de una a cinco tablas; la baseline documental pasa de 111 a 115 tablas antes de incorporar otros P0.
- La matriz de operaciones restaura `A11/A12`, añade las fichas `OP-SUP-001..006` y crea `OP-SUP-010..011`.
- RLS separa `PR-22` para break-glass y `PR-28` para rol/deber de plataforma.
- Los contratos de retención definitivos siguen gobernados por `DB-P5-015`; hasta aprobarlos no se autoriza purga física de estos registros.

### Escenarios de prueba obligatorios

1. Un `allfit_admin` sin deber entra al Backoffice pero no puede ejecutar ninguna operación.
2. Un header o grupo que declare un deber inexistente no concede acceso.
3. Nadie se asigna rol o deber a sí mismo ni retira el último administrador base.
4. Un deber vencido o revocado corta la operación en la siguiente transacción y cierra ventanas abiertas cuando corresponde.
5. La búsqueda ordinaria no permite exploración por nombre y sólo devuelve contacto enmascarado.
6. Una ventana estándar abre con un A12 independiente; una restringida exige dos personas distintas.
7. Solicitante, aprobador o revisor con conflicto es rechazado.
8. Identidad completa, pagos detallados, medios o storage se rechazan aunque exista ventana.
9. Una falla al escribir auditoría impide devolver contenido.
10. Los roles runtime no pueden seleccionar tablas sensibles ni modificar/borrar historial de rol, deber, aprobación o evento.
11. Una instalación vacía no ofrece endpoint de autoaprovisionamiento: el bootstrap exige dos personas existentes, autoridad `allfit_migrator`, asignaciones cruzadas y evidencia; el mismo intento con un rol runtime falla.

---

## ADR-029 — Monorepo de implementación con deployables independientes

**Estado:** aceptada para V1<br>
**Fecha:** 5 de agosto de 2026<br>
**Supersede:** las referencias vigentes que asignaban API, migraciones o clientes a `allfitone-studio`, `allfitone-space` o `allfitone-backoffice` como repositorios de implementación separados<br>
**Ratifica:** ADR-002 en identidad, autenticación, superficies y aislamiento por Application; no cambia sus decisiones de seguridad

### Contexto

La API, el worker y los clientes participan en los mismos flujos verticales: Studio asigna, Space ejecuta y Studio consulta el resultado autorizado. Mantenerlos en repositorios de código separados obligaría a coordinar manualmente contratos, DTOs, cambios de dominio y migraciones que deben evolucionar de forma atómica.

La independencia de un producto o deployable no exige un repositorio propio. Son ejes distintos: el repositorio define dónde se versiona el código y el deployable define qué se construye, configura, escala y publica de manera independiente.

### Decisión

1. `allfitone` es el único monorepo de implementación para la plataforma V1.
2. El monorepo produce cinco deployables independientes:
   - `apps/api`: API Hono con las superficies `/space/v1`, `/studio/v1`, `/catalog/v1` y `/backoffice/v1`;
   - `apps/worker`: consumidores de outbox y trabajos programados;
   - `apps/studio-web`: cliente web de Allfit Studio;
   - `apps/backoffice-web`: cliente web de Allfit Backoffice;
   - `apps/space`: aplicación Expo de Allfit Space.
3. El código reutilizable vive en `packages/`. La baseline incluye `auth-provider`, `queue`, `contracts` y `db`; una aplicación nunca importa código interno de otra aplicación.
4. `packages/db` es el único propietario de la configuración local de Supabase, la historia de migraciones, los schemas declarativos si se adoptan, los seeds, las pruebas de base de datos y los tipos generados. Un solo pipeline aplica migraciones.
5. `packages/contracts/openapi` contiene la fuente canónica del OpenAPI ejecutable y `packages/contracts/generated` sus DTOs generados para API y clientes. `allfitone-docs` conserva los requisitos, el contexto arquitectónico y la trazabilidad contractual, y enlaza la especificación sin mantener otra copia del YAML.
6. Cada deployable conserva configuración, secretos, pipeline, artefacto, observabilidad, límites de recursos y estrategia de rollback propios. Turborepo selecciona las tareas afectadas; compartir repositorio no obliga a desplegar todo junto.
7. `allfitone-docs` continúa como repositorio normativo de producto y arquitectura. `allfitone-design-system` continúa como biblioteca publicada y `allfitone-landing-page` como sitio de marketing; ninguno se incorpora al monorepo de la plataforma en V1.
8. Una separación futura ocurre por dominio y solo ante evidencia medida de SLO, regulación, escala o incidentes. No se separa por producto duplicando API, identidad, contratos, grants o base de datos.

### Topología normativa

```text
allfitone/
├── apps/
│   ├── api/
│   ├── worker/
│   ├── studio-web/
│   ├── backoffice-web/
│   └── space/
└── packages/
    ├── auth-provider/
    ├── queue/
    ├── contracts/
    └── db/

allfitone-docs/          documentación normativa
allfitone-design-system/ biblioteca UI publicada
allfitone-landing-page/  sitio público de marketing
```

### Invariantes

1. Solo `packages/db` produce y despliega la historia de migraciones.
2. Solo `apps/api` accede a PostgreSQL durante requests; los clientes nunca usan PostgreSQL, PostgREST ni credenciales Supabase directamente.
3. Ninguna aplicación importa otra aplicación. La lógica compartida se extrae a un paquete con interfaz explícita.
4. Los tipos crudos de base de datos no salen del backend; los clientes consumen DTOs de `packages/contracts`.
5. Una modificación incompatible del contrato se versiona por superficie aunque todos los consumidores vivan en el mismo repositorio.
6. Un cambio en un deployable no despliega otros deployables no afectados.
7. La topología del repositorio no concede acceso entre superficies, no comparte secretos y no altera la validación de `client_id`.

### Consecuencias

#### Positivas

- API, clientes, worker, contratos y migraciones pueden evolucionar en una sola revisión y un solo commit.
- Las herramientas del monorepo pueden comprobar dependencias, tipos y alcance afectado de extremo a extremo.
- Se elimina la publicación intermedia de DTOs privados para sincronizar clientes del mismo producto.
- La propiedad de la base de datos y del contrato ejecutable queda físicamente inequívoca.

#### Costos

- El CI necesita filtrado por grafo y caché para no ejecutar ni desplegar todo ante cada cambio.
- Las fronteras entre aplicaciones y dominios deben imponerse con reglas automatizadas, no con la separación accidental de repositorios.
- Los permisos del repositorio cubren más código y requieren protección de ramas y ownership por paths cuando el equipo crezca.
- La narrativa contractual y el OpenAPI ejecutable viven en repositorios distintos; sus enlaces y trazabilidad deben revisarse sin introducir una segunda copia del YAML.

### Escenarios de prueba obligatorios

1. Un cambio exclusivo de `apps/space` no construye ni despliega Studio, Backoffice, API o worker.
2. Un cambio de `packages/contracts` ejecuta validación y build de todos sus consumidores afectados.
3. Un cambio de `packages/db` ejecuta pruebas de base de datos y de los deployables backend afectados, pero solo el pipeline autorizado puede aplicar migraciones.
4. Una importación desde una aplicación hacia otra falla en lint o en la verificación de fronteras.
5. Un OpenAPI inválido o una diferencia entre la especificación canónica y los DTOs generados falla en CI.
6. Un token emitido para una Application sigue siendo rechazado en otra superficie aunque ambas vivan en el mismo repositorio.
7. Un fallo o rollback de un deployable no obliga a publicar una versión nueva de los otros cuatro.

---

## ADR-030 — Detalle por serie y superseries en la planificación de fuerza

**Estado:** aceptada para V1<br>
**Fecha:** 17 de septiembre de 2026<br>
**Enmendada:** 29 de septiembre de 2026 — la ejecución registra el tipo de serie y la sesión recibe las series planificadas (`ADR-033`)

### Contexto

El modelo de planificación describe un paso de fuerza con dos números agregados:
`target_sets` y `target_reps`. Cuatro series de ocho repeticiones son literalmente el
entero `4` y el entero `8` colgando del paso.

Eso alcanzaba mientras el catálogo tenía treinta y ocho movimientos y la aplicación
servía para anotar una rutina. Con cuatrocientos movimientos y personas que entrenan
de verdad, no alcanza: nadie hace cuatro series idénticas. La primera es de
calentamiento con carga ligera, las dos del medio son de trabajo, y la última va al
fallo sin número de repeticiones porque el número es el que salga. Una rutina que no
sabe distinguirlas describe mal lo que la persona va a hacer, y una rutina que
describe mal no se usa dos veces.

Lo mismo con las superseries. Encadenar dos ejercicios para hacerlos seguidos sin
descanso entre medias no es un adorno: cambia el estímulo y cambia la duración de la
sesión. Hoy no hay forma de decirlo, y quien lo quiere lo escribe en la nota, que es
texto que ningún lector entiende.

**Esta decisión no contradice `ADR-021`.** Sus listas de capacidades diferidas cubren
otros dominios —reservas, comercio, marketplace, wearables, nutrición clínica, IA— y,
en entrenamiento, «especialización completa de todas las disciplinas». Profundizar la
única disciplina que Space publica no aparece ahí. Lo que `ADR-021` sí impone es una
puerta de ocho pasos para cualquier ampliación y la exigencia de que su primera
entrega sea «una rebanada vertical coherente»: este ADR es el paso 6 de esa puerta, y
la entrega incluye migración, RLS, contrato, pruebas y pantalla.

`ADR-003` ya sancionó el concepto: su modelo de `planned_steps` enumera «orden y
bloque/superset» y «recuperación» entre los atributos del paso. Lo que faltaba era el
modelo físico y el permiso explícito para construirlo.

### Decisión

**1. Las series de un paso de fuerza se modelan una por una.** `planning.planned_sets`
cuelga de `planned_steps`, con `set_order`, un tipo, y las repeticiones, carga y RPE
que esa serie pide.

**2. El tipo de serie es un vocabulario cerrado de cuatro:** `normal`, `warmup`,
`to_failure` y `drop`. Vive en `planning` y no en `catalog` porque `catalog` guarda
vocabulario de **contenido** que una persona explora —disciplinas, movimientos,
equipamiento, músculos— y el tipo de serie es estructura de la prescripción.

**3. Una serie al fallo no lleva repeticiones.** Es lo que significa: hasta no poder
más. Un número ahí sería una instrucción distinta, así que el modelo lo prohíbe en vez
de dejarlo a la interfaz.

**4. `strength_targets` pasa a ser resumen derivado, nunca autoría.** Al publicar,
`target_sets` es el conteo de series y `target_reps` existe solo cuando todas
coinciden. La verdad son las filas; el resumen es una comodidad para quien ya lo leía.
Se hace así para que **ningún lector existente se rompa**: la agenda, el día de hoy,
la semana y todo el lado de ejecución siguen leyendo lo que siempre leyeron.

**5. La superserie es una agrupación de pasos contiguos**, expresada como una columna
en `planned_steps` y no como una tabla. Sólo se encadena con el ejercicio de al lado;
con esa regla, una columna dice exactamente lo que diría una tabla de grupos, y la
contigüidad se impone con un trigger de restricción.

**6. El descanso no se mueve.** `strength_targets.target_rest_seconds` ya existe, es
prescripción y no medición, y es genuinamente por ejercicio. Dentro de una superserie
sólo cuenta el del último paso de la cadena, porque el descanso ocurre al terminarla.

**7. `planned_sets` es hija de una versión publicada y hereda su inmutabilidad.**
`ADR-009` es tajante: sólo el borrador es mutable y una versión publicada no se edita.
La tabla nueva lleva las mismas tres familias de protección que sus hermanas —sin
mutación de hija inmutable, inserción sólo durante la publicación, y política de fila
heredada del padre— o sería la única grieta en esa garantía.

### Lo que esta decisión no hace

- **La ejecución no aprende de series planificadas.** `execution.strength_sets`
  seguirá apuntando al paso y no a la serie prescrita. Enlazar lo ejecutado con la
  serie que lo pidió es otra decisión, con su propio ADR.
  *Estrechado por `ADR-033`:* la ejecución registra el tipo de cada serie y la sesión
  recibe las series planificadas, pero el enlace con la serie concreta sigue sin existir.
- **Las revisiones de prescripción siguen operando a nivel de paso.** Un profesional
  adapta el ejercicio, no la tercera serie; el vocabulario cerrado de
  `override_kind` no se amplía aquí.
- **Las demás disciplinas no cambian.** Resistencia, intervalos y movilidad conservan
  su target único por paso. Esto es profundidad en fuerza, no una reforma del núcleo
  multidisciplina.
- **Nada de esto funciona sin conexión.** `DT-007` reserva el borrador local para el
  registro de ejecución y la edición de perfil.

### Invariantes

1. Un paso de fuerza publicado tiene al menos una serie.
2. `set_order` es único y consecutivo dentro de su paso.
3. Una serie `to_failure` no declara repeticiones.
4. El resumen de `strength_targets` es derivado: ningún actor de runtime lo escribe.
5. Los pasos que comparten grupo de superserie ocupan posiciones consecutivas.
6. Una serie planificada no se edita ni se borra una vez publicada su versión.
7. El contenido del borrador entra al hash de publicación con sus series dentro: dos
   rutinas que difieren en una serie no publican la misma versión.
8. El descanso de una superserie es el del último paso de la cadena.

### Consecuencias

#### Positivas

- La rutina describe lo que la persona realmente va a hacer.
- Los lectores existentes no cambian: el detalle entra como añadido.
- El tipo de serie queda disponible para que la ejecución lo aproveche cuando se
  decida enlazarlas.

#### Costos

- Una tabla más bajo una versión inmutable, con las tres protecciones que eso exige.
- El validador del borrador, la función canónica de hash y la materialización tienen
  que moverse juntas o el hash y las filas se separan.
- Lo ya publicado necesita relleno: cada `strength_targets` existente se convierte en
  N series iguales.
- Studio recibe el modelo y el contrato, pero su interfaz es trabajo aparte.

### Escenarios de prueba obligatorios

1. Una serie `to_failure` con repeticiones se rechaza.
2. Un grupo de superserie con posiciones no contiguas se rechaza.
3. El rol de runtime no puede escribir el resumen de `strength_targets`.
4. Una versión publicada no admite insertar, editar ni borrar una serie.
5. Publicar dos veces el mismo contenido sigue sin crear dos versiones, con las series
   dentro del hash.
6. Cambiar una sola serie del borrador sí produce una versión nueva.
7. El relleno deja cada paso publicado con tantas series como decía su `target_sets`.
8. La agenda, el día de hoy y la semana devuelven lo mismo antes y después del cambio.

---

## ADR-031 — La portada de una rutina la pone su programa, y sale del catálogo

**Estado:** aceptada para V1<br>
**Fecha:** 18 de septiembre de 2026<br>
**Enmendada:** 19 de septiembre de 2026 — los bytes salen de PostgreSQL a un bucket privado<br>
**Enmendada:** 19 de septiembre de 2026 — se revierte la fotografía personal entera y con ella el bucket<br>
**Enmendada:** 19 de septiembre de 2026 — la portada deja de ser de la rutina y pasa a ser del programa<br>
**Enmendada:** 20 de septiembre de 2026 — la portada del catálogo se fotografía por sexo declarado, y `cover_object_key` se retira<br>
**Enmienda a:** `ADR-002`, cuyo diferimiento de Storage queda restituido

> **Léase de abajo arriba.** Las cuatro primeras secciones son el rastro de cómo se llegó
> aquí y no describen lo vigente: la primera revisión midió el volumen, la segunda retiró
> la fotografía personal, la tercera mudó la decisión de la rutina al programa y la cuarta
> fotografió el catálogo por sexo declarado. La decisión en vigor empieza en «Cuarta
> revisión».

### Contexto

`ADR-002` eligió Supabase **únicamente como PostgreSQL administrado** y dejó dicho que
«Storage, Realtime o Edge Functions requerirían un ADR separado antes de incorporarse».
Desde entonces nadie lo pidió, y el estado de la plataforma lo confirma: `[storage]` está
`enabled = false` en la configuración local, el esquema `storage` existe sin una sola
tabla, la API sólo habla `postgres` y Hono, y no hay una sola operación de subida en el
contrato implementado.

Pero la baseline **sí describe imágenes personales**. La foto de comida tiene contrato
cerrado —`NutritionPhotoUpload` en base64, `SignedMediaUrl` de trescientos segundos para
Space, proxy autenticado para Studio— y nunca se construyó. `identity.body_progress_records`
lleva `media_ref` y `has_media` con su check, y ninguna función los escribe. Es decir:
la doctrina está escrita y el mecanismo no existe.

La portada de una rutina es lo primero que lo necesita de verdad. `HU-SP-108` la pide y
el resto de la portada —figura de músculos e iconos— ya está construido: falta la foto.

Lo único **implementado** hoy que se parece es `catalog.movement_media`, y su propio
comentario de cabecera explica por qué no sirve de molde: guarda una clave de objeto
hacia un origen estático público, la demostración de un ejercicio es idéntica para todo
el mundo y se cachea un año. Su cabecera lo contrasta a propósito con la foto de comida,
«que sí se sirve por petición precisamente porque es un dato personal cuya autorización
hay que reevaluar cada vez».

### Revisión del 19 de septiembre de 2026

La cuarta razón de la decisión original —«el volumen no lo justifica»— se midió y es
falsa. El error fue el modelo de uso: se supuso como mucho una foto por rutina y alguna
rutina con foto. El modelo real del producto es **dos programas por persona, seis rutinas
por programa y foto en todas**: doce fotos de unos setenta kilobytes, **822 KB por
persona**.

Contra las cuotas del plan, eso es:

| Cuota | Personas que caben |
| --- | --- |
| Base de datos, 500 MB (plan gratuito) | **~600** |
| Almacenamiento, 1 GB (plan gratuito) | ~1 300 |
| Almacenamiento incluido en Pro, 100 GB | ~128 000 |
| Egreso incluido en Pro, 250 GB/mes | ~107 000 |

Seiscientas personas llenan la base de datos entera, y esa cuota es para los datos del
producto: rutinas, programas, sesiones e historial de entrenamiento. Las imágenes no
compiten con el producto por su espacio.

Las otras tres razones siguen siendo ciertas y se pagan a conciencia: aparece una
credencial, aparece una dependencia de orden con el servicio, y el borrado deja de ser
una sola sentencia. Lo que cambió no es el razonamiento, es un número.

### Segunda revisión del 19 de septiembre de 2026

**El caso desapareció.** La fotografía de portada se construyó entera —selector, saneado,
subida, proxy autenticado, bucket privado y cola de borrado— y la lectura del producto es
que **nadie la va a usar**. Una portada existe para reconocer una rutina entre seis en una
lista; para eso, la figura de los músculos y el icono ya responden, y hacen algo que una
fotografía propia no hace: se dibujan solas.

Pedir una fotografía es pedir trabajo. Es abrir la galería, encuadrar y esperar una
subida, cada vez, para decorar una fila. La revisión de la mañana midió bien el volumen y
corrigió dónde debían vivir los bytes; lo que no se preguntó es si alguien iba a producir
esos bytes. La respuesta es no.

Así que lo que se revierte no es el bucket contra PostgreSQL: es la fotografía personal
entera. Y con ella se va todo lo que existía **sólo** para sostenerla.

### Cuarta revisión del 20 de septiembre de 2026

**La portada del catálogo se fotografía por sexo declarado.** Las veinticuatro
fotografías de los programas globales pasan a ser dos juegos —`male` y `female`—, y quien
prefirió no decirlo recibe una mezcla estable de los dos. Esta revisión contradice dos
cosas que la tercera dijo que no haría, y por eso se escribe aquí y no en una ficha: «no
toca las portadas del catálogo» y «`cover_object_key` sigue significando lo que
significaba». Las dos dejan de ser ciertas.

**Por qué es una decisión y no una sustitución de archivos.** Hasta hoy el sexo declarado
sólo **ordenaba**: `sex_affinity` empuja hacia arriba los programas que encajan y no
esconde ninguno, porque quien declinó no necesita una regla aparte. Fotografiar es otra
cosa: es lo primero que la persona ve de un programa, y decidirlo por un dato suyo es
tratar ese dato como parte de la presentación y no sólo del orden. Se hace porque una
persona reconoce antes lo que puede hacer cuando ve a alguien como ella haciéndolo, y se
escribe aquí porque es la clase de decisión que alguien debería poder discutir dentro de
un año sin reconstruirla desde una tabla.

**Dos juegos y no tres.** «Mixto» no es una tercera fotografía: es lo que se ve cuando el
carrusel alterna entre los dos juegos. Un tercero serían veinticuatro imágenes más para
decir lo mismo, y habría que resolver antes qué significa «mixto» dentro de un solo
encuadre — dos personas, ninguna, o una que nadie reconoce—, que es una pregunta sin
buena respuesta.

**La mezcla es estable.** Se elige de forma determinista por el identificador del
programa, no al azar y no por persona. Una portada sorteada en cada lectura sería una
portada distinta cada vez que alguien refresca la lista, y el catálogo dejaría de ser un
sitio y pasaría a ser un carrusel de sí mismo. Y nunca hay juego por defecto para quien
declinó: eso sería decidir por ella justo lo que decidió no decir.

**`planning.programs.cover_object_key` se retira.** Una columna no puede llevar dos
claves, y dejarla como «la portada por defecto» sería tener dos verdades sobre la misma
imagen. En su lugar, la tabla curada `planning.program_cover_photos`, con clave
`(program_id, audience)`, y `planning.cover_for(program_id, person_id)`, que es por donde
pasan todos los lectores — incluido el que le da fotografía a una rutina.

**Elegir una portada no escribe nada.** No hay fila por persona, ni preferencia guardada,
ni traza de qué juego vio nadie. El sexo declarado ya es un hecho que la persona dio; esto
lo gasta, no recoge nada nuevo, y no se le vuelve a preguntar a nadie por esto.

### Tercera revisión del 19 de septiembre de 2026

**La portada no era una decisión de la rutina; era una decisión de quien las ve juntas.**
La pantalla Hoy abre con las rutinas de la semana en un carrusel, una al lado de otra. Si
cada rutina eligiera su propio estilo, esa fila mezclaría una figura de músculos, un icono
y una fotografía, y lo que se lee entonces no es una semana: es un muestrario. El problema
no se arregla pidiéndole gusto a quien escribe una rutina, porque quien escribe una rutina
la está mirando sola. Sólo quien arma el programa ve las seis a la vez, y por eso la
decisión es suya.

Así que la portada cambia de dueño. **El estilo lo declara el programa y vale para todas
sus rutinas; la imagen la sigue poniendo cada rutina**, porque dentro de un mismo estilo
lo que se dibuja depende de lo que cada una trabaja. El carrusel habla un idioma y aun así
una tarjeta se distingue de la de al lado sin leer el rótulo, que era lo único que una
portada tenía que conseguir.

Lo que la segunda revisión decidió sigue en pie entero: nadie sube nada, la clase `photo`
toma una imagen del catálogo público y la elige la región dominante de los músculos. Lo
que esta revisión mueve es **dónde se toma la decisión**, no de dónde sale la imagen.

### Decisión

**1. En V1 no hay binarios personales.** Ninguna operación acepta bytes de una persona.
El diferimiento de `ADR-002` vuelve a estar íntegro: Storage, Realtime y Edge Functions
quedan fuera hasta que un ADR los traiga con un caso construido detrás.

**2. El estilo de portada es del programa; la imagen es de la rutina.** Un programa
declara `muscles`, `icon` o `photo`, y esa clase vale para todas las rutinas que lo
componen. Dentro de la clase, cada rutina se dibuja con lo suyo:

- **músculos**, la figura de lo que *esa* rutina trabaja, calculada de sus ejercicios;
- **foto**, la del catálogo público que corresponde a lo que *esa* rutina trabaja, elegida
  por la región dominante de sus músculos;
- **icono**, el mismo para todas, porque un icono **se elige y no se calcula**: no hay nada
  en los ejercicios de una rutina que diga cuál de los treinta y dos le toca.

La fotografía se sigue pidiendo sin decir *cuál*, por la misma razón de la segunda
revisión: la región dominante ya está en los ejercicios, y **lo que se ve en la imagen y lo
que se entrena hablan de lo mismo** sin que nadie elija. Es el mecanismo de
`pick_program_cover`, aplicado ahora rutina a rutina bajo el estilo que el programa fijó.

**3. Vive en `planning.programs`, no en `planning.program_versions`.** Por la misma razón
que `planning.programs.cover_object_key`: una versión publicada es inmutable porque **es lo
que alguien entrenó**, y cambiar cómo se ve una tarjeta no cambia lo que se entrena. Las
columnas son `routine_cover_kind planning.routine_cover` (nullable) y
`routine_cover_icon planning.routine_cover_icon` (nullable), con un check de que el icono
existe si y sólo si la clase es `icon`. Se llaman `routine_`*algo* a propósito: `cover_object_key` ya vive en
esa tabla y significa otra cosa —la cara del programa en su propia tarjeta—, y dos columnas
parecidas con sentidos distintos se confunden a la primera.

**4. `planning.session_template_versions` pierde la portada.** Se van `cover_kind`,
`cover_icon` y `cover_object_key`, y la clave `cover` sale del contenido del borrador
(`SessionTemplateDraftContent`) y por tanto del hash canónico. **Consecuencia declarada:**
toda rutina que llevara portada dirá «cambios sin publicar» hasta que se publique una vez,
y es cierto — su contenido cambió.

**5. Una rutina suelta no lleva portada.** Una rutina que no está en ningún programa se
reconoce por su letra inicial, que es como se reconocía antes de que la portada existiera.
No hay estilo que aplicarle porque no hay nadie que lo haya declarado, y dejarla elegir uno
propio devolvería exactamente el muestrario que esta revisión retira. Una rutina que está
en **varios** programas se viste del primero, por el orden que la persona ya eligió para
sus programas: el mismo con el que abre la pestaña Entrenar (`OP-PLN-024`).

**6. Vestir un programa surte efecto al momento y no acuña versión de nada.** Es
`OP-PLN-033`, `PUT /space/v1/programs/{programId}/cover`, un comando idempotente sobre
programa propio. No publica una versión de programa ni de rutina, igual que `OP-PLN-024` no
publica nada por reordenar: **la presentación no es contenido**. Un programa tomado de
Allfit no se puede revestir, porque se ve como Allfit lo armó.

**7. Esas imágenes no son personales, así que no heredan nada de lo anterior.** Viven en
el origen estático público del catálogo, se cachean un año y son idénticas para todo el
mundo: es exactamente el molde de `catalog.movement_media`. La fila guarda **la clave del
objeto**, jamás una URL, y la base del endpoint vive en configuración —`CATALOG_MEDIA_BASE_URL`—
como ya hacía. No hay autorización que reevaluar, no hay proxy, no hay credencial nueva.

**8. `privacy.binary_disposals` se retira.** Era la cola y el recibo de la destrucción de
un binario personal, y se queda sin un solo escritor. `ADR-021` prohíbe el modelo «por si
acaso», y una tabla de disposiciones sin nada que disponer es justo eso. `ADR-012` no
pierde nada: sin bytes personales fuera de la transacción, no hay nada que propagar más
allá de ella, y el borrado vuelve a ser una sola sentencia.

**9. Lo que se escribió sigue escrito, para cuando vuelva.** La foto de comida y el
progreso corporal conservan su contrato en la baseline y siguen sin construirse. Cuando
se construyan, la revisión de la mañana y sus tres condiciones de portabilidad —protocolo
S3 y no el cliente de Supabase, la clave del objeto y nunca una URL, y la autorización en
nuestra API— son el punto de partida, no un ADR nuevo desde cero. Lo que este documento
guarda es el razonamiento; lo que retira es el código que no tenía usuario.

### Lo que esta decisión no hace

- **No quita la portada.** Sigue habiendo tres maneras de ver una rutina, y una de ellas
  sigue siendo una fotografía. Lo que desaparece es que sea *tuya* y que la elija la
  rutina.
- **No toca las portadas del catálogo.** Las veinticuatro de los programas globales son
  contenido curado y se despliegan como siempre. *(Dejó de ser cierto el 20 de septiembre
  de 2026: ver «Cuarta revisión».)*
- **No cambia la cara del programa en su propia tarjeta.** `cover_object_key` sigue
  significando lo que significaba y se decide igual. *(Ídem: la columna se retiró.)*
- **No cierra la puerta a los binarios personales.** La cierra para V1 y deja el camino
  descrito.
- **No modela retención programada.** `privacy.retention_policies`, `erasure_requests` y
  `legal_holds` siguen sin modelo físico, y ahora sin nada personal que purgar tampoco lo
  necesitan antes de `DB-P5-015`.

### Invariantes

1. Ninguna operación de V1 acepta bytes subidos por una persona.
2. Ninguna fila guarda una URL de un almacén: sólo la clave del objeto.
3. **La portada de una rutina no se decide en la rutina.** El estilo lo declara el programa
   que la usa, y ninguna fila de plantilla ni de versión de plantilla lo guarda.
4. El mismo programa y la misma rutina reciben siempre la misma fotografía: la elección es
   determinista.
5. Una rutina sin ejercicios no recibe fotografía, y eso no es un error: es una rutina
   que todavía no dice qué trabaja.
6. Una rutina fuera de todo programa no lleva portada, y se reconoce por su letra inicial.
7. Ninguna respuesta expone el endpoint del origen estático; expone la dirección
   compuesta, que es pública.

### Consecuencias

#### Positivas

- **El carrusel de la semana se lee como una semana.** Seis tarjetas con el mismo idioma
  visual y distinto contenido se recorren de un vistazo; seis estilos mezclados obligan a
  leer cada rótulo.
- La decisión se toma una vez por programa y no seis veces por semana, y la toma quien
  tiene delante el resultado.
- Desaparecen una credencial de almacenamiento, una dependencia de orden con Supabase,
  un trabajo programado al que vigilarle la antigüedad y la ventana de borrado que
  `ADR-012` obligaba a medir.
- La base de datos no guarda ni un byte de imagen, y el bucket no existe: el techo de
  personas deja de depender del almacenamiento.
- **La portada sale del contenido versionado.** Vestir un programa deja de acuñar
  versiones de rutina que no cambian nada de lo que se entrena, y el hash canónico vuelve
  a describir sólo entrenamiento.
- El saneado de imágenes sale del camino de una petición, y con él `sharp`.

#### Costos

- **Toda rutina que llevara portada dirá «cambios sin publicar»** hasta que se publique una
  vez. Es correcto y está declarado: su contenido cambió al salir la clave `cover` del
  borrador.
- Se construyó y se retira: la subida, el proxy, el bucket, el paquete de acceso S3, la
  cola de disposición y las tres columnas de portada en la versión de plantilla dejan de
  existir. El razonamiento queda aquí; el código no.
- Quien quisiera una rutina con un estilo propio dentro de un programa no puede tenerlo, y
  quien quisiera una fotografía suya tampoco.
- Una rutina que está en dos programas de estilos distintos se ve con el del primero, y no
  hay manera de decir «en este programa quiero verla de otra forma».
- Dos rutinas de la misma región pueden salir con caras parecidas; el desempate por
  identificador las reparte, pero el catálogo son veinticuatro imágenes.

### Escenarios de prueba obligatorios

1. Un programa con estilo `photo` da a cada una de sus rutinas la clave que corresponde a
   la región dominante de *esa* rutina, y dos rutinas de regiones distintas no reciben la
   misma.
2. Un programa con estilo `icon` da el **mismo** icono a todas sus rutinas.
3. El mismo programa y la misma rutina reciben siempre la misma fotografía, y volver a
   vestir el programa con la misma clase no la cambia.
4. Una rutina sin ejercicios en un programa con estilo `photo` no recibe clave y la
   pantalla dibuja el estado vacío.
5. Una rutina que no está en ningún programa se responde sin portada y la pantalla la
   dibuja con su letra inicial.
6. Una rutina que está en dos programas se responde con el estilo del primero según el
   orden de `OP-PLN-024`, y cambia de cara al reordenarlos.
7. Vestir un programa no crea una versión de programa ni una versión de plantilla, y la
   pantalla lo refleja al momento.
8. Un programa de `content_scope = 'person'` se puede vestir; uno tomado de Allfit
   responde lo mismo que uno inexistente.
9. Ninguna respuesta ni ninguna fila contiene una URL del almacén.
10. Ninguna ruta del contrato acepta una imagen.

### Quinta revisión del 22 de septiembre de 2026

**El estilo de portada deja de ser configurable: toda rutina lleva fotografía.** Se retira
la elección —`OP-PLN-033` y `HU-SP-108`—, no el mecanismo.

Esta revisión contradice la primera mitad del punto 2 de la tercera: «el estilo de portada
es del programa». Ya no hay estilo que declarar. La segunda mitad —«la imagen es de la
rutina»— se queda entera y sin una línea de diferencia: la fotografía se pide **sin decir
cuál**, la elige la región dominante de los ejercicios de esa rutina, y lo que se ve y lo
que se entrena hablan de lo mismo sin que nadie elija.

**Por qué.** Puestas las tres clases una al lado de otra en pantallas de verdad —el
carrusel de Hoy, el catálogo, el detalle del programa—, la fotografía era la única que
alguien elegía. Una fotografía dice de qué va la rutina antes de que nadie lea el nombre;
un icono dice de qué va el programa, que es lo que el nombre del programa ya dice. **Una
opción que nadie cambia no es una opción, es una pregunta**, y ésta estaba en medio de la
pantalla de configuración del plan pidiendo una decisión cuyo resultado era siempre el
mismo.

**Qué queda por limpiar, dicho por delante.** Retirada la operación, nadie escribe
`routine_cover_kind` ni `routine_cover_icon`: las dos columnas, sus enumerados y el
invariante `IX-48` quedan sin quien las alimente. No se retiran en esta revisión porque
todavía sostienen lo que algún programa declaró antes de hoy; su retirada es una decisión
aparte y una migración aparte.

**Una rutina sin fotografía se reconoce por su letra**, que es el caso de la que todavía
no tiene ejercicios: nada dice qué trabaja, así que no hay región de la que partir.

Tampoco se tocan las portadas del **programa** (`planning.program_cover_photos`, cuarta
revisión) ni el punto 1: en V1 sigue sin haber binarios personales.

---

## ADR-032 — Un programa puede no tener fin, y la semana que no existe la siembra quien la va a enseñar

**Estado:** aceptada para V1<br>
**Fecha:** 20 de septiembre de 2026<br>
**Enmienda a:** `ADR-022`, cuya materialización del calendario se estrecha a los programas que terminan

### Contexto

La duración de un programa nunca se declaró: se deduce. Es el `max(week)` de
`planning.program_version_sessions`, y deducirla así arrastra una consecuencia que nadie
eligió — **todo programa termina**, porque una composición finita leída como duración no
puede decir otra cosa. No es que faltara la casilla de «esto no se acaba»: es que no había
dónde ponerla, y por eso la finitud no era una decisión de producto sino una propiedad
estructural del modelo.

Lo que la gente hace en Space no se parece a eso. Quien arma su propia semana —tres días,
empujar, tirar, piernas— no está escribiendo ocho semanas: está escribiendo **una** y
repitiéndola hasta que decida cambiarla. Pedirle un final la obliga a inventarse un número,
y ese número vuelve el día que se cumple, cuando la agenda amanece vacía sin que nadie haya
decidido parar. El caso frecuente del producto estaba obligado a disfrazarse del caso raro.

Esto no es sólo Space. Studio compone bloques de varias semanas y también los hace girar;
lo que se repite en un caso es una semana y en el otro un bloque, pero el acto es el mismo.
Por eso la decisión no puede escribirse sobre «la semana»: tiene que escribirse sobre la
composición.

### Decisión

**1. `planning.program_versions` gana `repeats_forever boolean not null default false`.**
Un programa con esa marca no tiene fecha de fin: cuando su composición se acaba, vuelve a
empezar. Es el **valor por defecto de un programa nuevo en Space**, porque es lo que la
gente escribe.

**2. Vive en la versión y no en el programa, y por eso entra en el hash.** Un programa que
termina en ocho semanas y uno que no termina **son dos entrenamientos distintos** aunque
compartan hasta la última serie: uno propone un ciclo con final y el otro una rutina
sostenida. Eso es contenido, no presentación, así que sigue la regla de `ADR-009` —lo que
cambia lo que se entrena pertenece a la versión inmutable— y `planning.canonical_program_content`
lo emite siempre, nunca ausente, de modo que el `content_hash` lo distingue. La alternativa
—colgarlo de `planning.programs`, como la portada de `ADR-031`— haría que dos cosas
distintas compartieran hash, y un hash que no distingue no sirve para lo único que hace.

**3. La unidad que se repite es la composición entera, y se llama el ciclo.** No es «una
semana»: es `max(week)` de `program_version_sessions`. En Space el ciclo suele valer uno
porque se compone una semana; en Studio un bloque de cuatro semanas da la vuelta como
bloque. La semana de composición que toca en la semana de programa `n` es
`((n - 1) % ciclo) + 1`, y con `ciclo = 1` eso es exactamente «la misma semana siempre»,
sin un caso especial que escribir.

**4. El borrador declara la clave y el esquema no cambia de número.**
`planning.program_drafts.content` admite `repeats_forever` como clave **opcional**
—ausente significa `false`—, `planning.program_content_errors` la acepta en su lista blanca
y rechaza cualquier cosa que no sea booleano, y `content_schema_version` **sigue siendo 1**:
una clave nueva opcional con valor por defecto no es un cambio de forma, y subir el número
obligaría a migrar borradores que se leen igual de bien que ayer.

**5. La primera republicación de un programa que ya existía acuña una versión, y está
declarado.** El canónico ganó una clave, así que su hash cambió para todo el mundo: un
programa que nadie ha tocado dirá «cambios sin publicar» una vez, y una vez publicado no
vuelve a decirlo. Es el mismo precio que `ADR-031` pagó al sacar la portada del contenido,
y por la misma razón se paga: lo contrario sería que dos programas distintos compartieran
hash.

**6. Con fin, la agenda entera al asignar; sin fin, la semana de la asignación.** Un
programa con fecha de fin se materializa exactamente como hasta hoy: toda la composición
dentro de la transacción de `self_assign_program`. Uno sin fecha de fin materializa en esa
misma transacción **la semana de calendario en la que se asigna**, y nada más, porque no
hay un «entera» que materializar.

**7. La semana que falta la siembra la lectura, y no un worker.**
`planning.read_week_plan` y `planning.read_today_session` llaman antes a
`planning.plant_my_open_week`, que siembra **la semana que esa lectura va a enseñar**. Las
dos razones por las que no es un trabajo periódico son concretas. La primera:
`execution.start_planned_session_attempt` exige que la fila planificada exista, así que
nadie puede entrenar una semana que no esté sembrada y la siembra no puede llegar tarde.
La segunda: si sólo sembrara un acto de entrenar, quien vuelve después de dos meses abriría
una semana vacía que ya nadie podría sembrar, y el horizonte quedaría atascado justo para
la persona que más necesita volver a empezar. Sembrar dentro de la lectura no promete nada
que no se entregue en el mismo instante.

**8. La siembra es idempotente, cabe en una semana y toma un lock.** Si ya existe cualquier
fila de esa asignación con ese `week_starts_on`, no se toca nada; se toma
`pg_advisory_xact_lock` sobre el `assignment_id` antes de mirar, porque dos lecturas
simultáneas sembrarían la misma semana dos veces; y si la semana de programa todavía no
llegó a uno —la asignación empieza más adelante— no se siembra nada. Las filas se calculan
igual que en la asignación **salvo el adelanto de la primera semana**: ese adelanto existe
para no estrenar un programa con sesiones ya perdidas, y la semana ciento tres no se
estrena.

**9. `ADR-022` se estrecha, no se contradice.** Aquella decisión prometió que **no existe
job periódico de calendario** y esa promesa queda intacta: esto no crea ningún worker.
Lo único que se estrecha es el «todas» de «asignar materializa todas las sesiones», que
ahora vale para los programas que terminan.

**10. Donde no hay fin, la duración se responde nula.** `weeks` es `null` en
`read_my_programs`, `read_program_version` y `read_program_catalogue` cuando la versión no
termina, y sigue siendo `max(week)` en las demás. `editable` deja de compararse contra la
duración declarada y se compara contra **el ciclo**, que existe siempre; y el catálogo deja
de filtrar por «`weeks` no nula» —que quería decir «tiene sesiones»— y filtra por número de
sesiones, o un programa sin fin desaparecería de él. `sessions_planned` y `sessions_done`
no se tocan: cuentan lo que hay en la agenda, y eso es verdad tenga fin o no.

### Invariantes

1. `repeats_forever` pertenece a la versión publicada y nunca cambia después de publicarse.
2. Dos versiones que difieren sólo en `repeats_forever` tienen `content_hash` distinto.
3. Ninguna siembra escribe más de una semana de calendario por asignación y por lectura.
4. No existen dos sesiones planificadas de la misma asignación para la misma semana de
   calendario y el mismo día de programa.
5. Ninguna semana sembrada después de la asignación lleva el adelanto de primera semana.
6. Ningún proceso periódico, worker o job extiende el horizonte de la agenda.
7. Una versión sin fin responde `weeks` nula y jamás un número inventado.

### Consecuencias

#### Positivas

- **El caso frecuente deja de disfrazarse del raro.** Quien repite su semana no declara un
  final que no piensa cumplir, y la agenda no se apaga sola el día en que ese número
  arbitrario se agota.
- La agenda de un programa sin fin no tiene techo y **no cuesta lo que un techo costaría**:
  no se escriben cien semanas por si acaso, se escribe la que se va a mirar.
- La promesa de `ADR-022` sobrevive intacta. No aparece un worker al que vigilarle si corrió,
  ni una ventana de calendario que alguien tenga que dimensionar.
- Quien vuelve después de meses abre la semana en curso y la encuentra completa, sin haber
  tenido que entrenar para que existiera.
- El modelo sirve igual a una semana de Space y a un bloque de cuatro de Studio, porque lo
  que gira es la composición y no una unidad fija.

#### Costos y riesgos

- **Una lectura escribe.** Es la única del sistema que lo hace, y hay que decirlo en voz
  alta: `GET /space/v1/agenda` y `GET /space/v1/today` dejan de ser puramente de lectura
  cuando la persona sigue un programa sin fin.
- El lock por asignación introduce un punto de serialización en el camino de una pantalla
  que se abre muchas veces. Está acotado a la transacción y a una asignación, pero existe.
- **Toda versión de programa que hoy existe dirá «cambios sin publicar» una vez.** El
  canónico ganó una clave; es visible, es una sola vez y es cierto.
- `weeks` deja de ser un entero y pasa a admitir nulo en tres proyecciones y en tres tipos
  del contrato: cualquier pantalla que lo formateara sin preguntar imprimiría «semana 3 de
  null».
- Un programa sin fin no tiene total de sesiones que mostrar, así que la línea de resumen
  del editor y la tarjeta de catálogo dicen menos de lo que decían.

### Escenarios de prueba obligatorios

1. Publicar un borrador con `repeats_forever` en verdadero crea una versión cuyo
   `repeats_forever` es verdadero, y el borrador sin la clave crea una con falso.
2. Dos borradores idénticos salvo `repeats_forever` producen `content_hash` distintos.
3. Republicar sin tocar nada un programa publicado antes de esta decisión acuña
   exactamente **una** versión nueva, y la republicación siguiente no acuña ninguna.
4. Un borrador con `repeats_forever` no booleano es rechazado por
   `planning.program_content_errors`.
5. Asignarse una versión **con** fin materializa toda la composición en la transacción.
6. Asignarse una versión **sin** fin materializa sólo la semana de calendario de la
   asignación.
7. Leer la agenda de una semana posterior de un programa sin fin la deja sembrada con la
   semana de composición `((n - 1) % ciclo) + 1`.
8. Dos lecturas simultáneas de la misma semana siembran esa semana **una sola vez**.
9. Leer dos veces la misma semana no duplica ninguna sesión ni cambia las ya existentes.
10. Una semana sembrada por la lectura **no** aplica el adelanto de la primera semana: cada
    sesión cae en el día que le puso el programa.
11. Una asignación que empieza la semana que viene no siembra nada al leerla hoy.
12. Una persona que no abre la aplicación durante dos meses encuentra, al volver, la semana
    en curso completa, y las semanas que no miró siguen sin existir.
13. Re-plantear una asignación sin fin tras editar el programa borra lo no cumplido y
    siembra **sólo la semana en curso** con la composición nueva.
14. `read_my_programs`, `read_program_version` y `read_program_catalogue` responden `weeks`
    nula para una versión sin fin, y un programa sin fin **aparece** en el catálogo.
15. `editable` sigue siendo correcto en un programa sin fin, comparando contra el ciclo y
    no contra la duración declarada.

---

## ADR-033 — La serie ejecutada dice de qué tipo fue, y el esfuerzo se registra al entrenar

**Estado:** aceptada para V1<br>
**Fecha:** 29 de septiembre de 2026<br>
**Enmienda a:** `ADR-030`, cuya exclusión «la ejecución no aprende de series planificadas» se estrecha<br>
**Enmendada:** 30 de septiembre de 2026 — las series pertenecen a un ejercicio de la sesión, y la sesión lee su lista y no el plan (`ADR-034`)

### Contexto

`ADR-030` le dio a cada serie planificada un tipo —normal, calentamiento, al fallo o
descendente— y dejó escrito que la ejecución no lo aprendía: `execution.strength_sets`
sólo guarda orden, repeticiones, carga y RPE. Eso produce tres desajustes que ya se ven en
Space.

- **La sesión no sabe qué tipo de serie tiene delante.** `execution.read_execution` le pasa
  a la pantalla el resumen de `strength_targets` —cuántas series y cuántas repeticiones—, no
  las series planificadas, así que un calentamiento se entrena como una serie más y nada lo
  distingue.
- **El calentamiento suma como trabajo.** El editor promete que «no suma al volumen», pero
  el tonelaje de «La última vez», la semana y los contadores de series lo cuentan, porque la
  ejecución no puede saber cuál fue.
- **El esfuerzo se pide en el sitio equivocado.** Space pedía un RPE al planificar cada
  serie (`HU-SP-043` criterio 5). El RPE es lo que se sintió, y sólo se sabe al hacerla;
  `HU-SP-055` criterio 1 ya lo pedía durante el entrenamiento y la sesión no lo capturaba,
  aunque la columna `execution.strength_sets.rpe` y el contrato lo aceptan.

### Decisión

**1. `execution.strength_sets` gana `kind planning.set_kind not null default 'normal'`.**
El vocabulario es el de `ADR-030` y es el mismo tipo, no uno nuevo: un segundo enum con
los mismos cuatro valores en `execution` sería el enum homónimo que el catálogo físico
prohíbe, y convertir entre los dos en cada lectura sería el cast implícito que esa regla
evita. La ejecución ya depende de planificación —`strength_sets` referencia
`planning.planned_steps`—, así que usar su tipo no añade una dirección nueva de
dependencia. El valor por defecto conserva el significado de toda fila anterior.

**2. La sesión recibe las series planificadas, y el tipo se propone, no se impone.**
`read_execution` añade a cada paso planificado sus series de `planning.planned_sets`
—orden, tipo, repeticiones y carga— y cae en el resumen de `strength_targets` cuando el paso
no las tiene. La pantalla abre cada fila con el tipo que el plan pidió, y la persona puede
cambiarlo: lo que se registra es lo que hizo. **Una serie ejecutada no se enlaza con la
serie planificada concreta**; eso sigue siendo otra decisión.

**3. Un calentamiento no es trabajo.** Las series ejecutadas `warmup` se registran y se
ven, pero no suman al tonelaje ni a las series registradas que cuentan «La última vez», el
resumen de la semana y la sesión en curso. Es la regla que la interfaz ya prometía, puesta
donde se calcula. Los recuentos **del plan** —cuántas series tiene una rutina y cómo se
reparten por músculo— no cambian con esta decisión.

**4. El esfuerzo se registra al entrenar.** Space deja de pedir `target_rpe` en el editor de
rutina y lo pide, opcional, en cada serie de la sesión. `target_rpe` se queda en el modelo
de planificación: Studio puede prescribirlo y nada de esta decisión lo borra. Una serie sin
esfuerzo marcado no declara ninguno, y **nunca se convierte en cero**.

### Lo que esta decisión no hace

- **No enlaza la serie ejecutada con la planificada.** `strength_sets` sigue apuntando al
  paso; comparar la tercera serie hecha con la tercera pedida necesita ese enlace.
- **No añade RIR, tempo ni descanso real por serie.**
- **No cambia las demás disciplinas.** Resistencia, intervalos y movilidad no tienen tipo de
  serie.

### Invariantes

1. Toda serie ejecutada tiene un tipo, y el de las anteriores a esta decisión es `normal`.
2. El tipo de una serie ejecutada pertenece al vocabulario de `planning.set_kind`.
3. Una serie ejecutada `warmup` no suma a ningún tonelaje ni a ningún recuento de series registradas.
4. El esfuerzo registrado es opcional y, cuando no se declara, es nulo y no cero.

### Consecuencias

#### Positivas

- La sesión enseña el plan que se escribió, serie por serie.
- El volumen deja de inflarse con el calentamiento, y la interfaz deja de contradecir los
  números.
- El RPE deja de ser una promesa del plan para ser un dato de lo que pasó.

#### Costos

- `replace_execution_results`, `read_execution`, la agenda y el resumen de la semana se
  redefinen juntos, o el tipo se escribe en un sitio y se ignora en otro.
- Los recuentos del plan siguen contando el calentamiento, y quedan como trabajo aparte.
- `planned.sets` y `StrengthSet.kind` entran al contrato como campos opcionales.
- El RPE planificado de las rutinas de Space se pierde la próxima vez que se guarde su
  borrador. Es un dato opcional y ya no se muestra.

### Escenarios de prueba obligatorios

1. Una serie registrada con tipo lo conserva al leerse la sesión.
2. Una serie registrada sin tipo se lee como `normal`.
3. Un tipo fuera del vocabulario se rechaza.
4. `read_execution` devuelve las series planificadas de cada paso con su tipo, y el
   resumen cuando el paso no tiene series.
5. Un calentamiento con carga no suma al tonelaje de «La última vez» ni al de la semana.
6. Un calentamiento no cuenta en las series de «La última vez».
7. Las series de otra persona siguen sin verse, con o sin tipo.

---

## ADR-034 — Una sesión es una lista de ejercicios, y cada serie pertenece a uno

**Estado:** aceptada para V1<br>
**Fecha:** 30 de septiembre de 2026<br>
**Enmienda a:** `ADR-030` y `ADR-033`<br>
**Enmendada:** 30 de septiembre de 2026 — cada ejercicio de la sesión lleva su descanso y la sesión lo cuenta (`ADR-035`)

### Contexto

Una sesión en curso se reconstruía cada vez desde la rutina: sus ejercicios eran los
pasos del plan, en el orden del plan, y sus series colgaban de la sesión sin saber de qué
ejercicio eran más allá del movimiento. Eso deja fuera cuatro cosas que la gente hace al
entrenar: **quitar** un ejercicio que no va a hacer, **moverlo** porque la máquina está
ocupada, **encadenarlo** en superserie y **añadir** uno que la rutina no traía. Nada de
eso tenía dónde guardarse:

- `executed_sessions` es una fila por sesión; listar ejercicios ahí sería un JSON sin
  contrato, que `OP-EXE-005` prohíbe.
- `strength_sets` es una fila por serie marcada; un ejercicio quitado, movido o añadido
  sin entrenar no tiene ninguna.
- `session_segments` son los bloques de una sesión híbrida, no ejercicios.

Y había un defecto: si un movimiento aparecía dos veces en la rutina, las dos filas
compartían sus series, porque el único enlace era el movimiento.

Las aplicaciones de registro de gimnasio resuelven esto igual. La API pública de Hevy
modela un entrenamiento como una lista de **ejercicios**, cada uno con su posición y su
`superset_id`, y las series dentro; empezar una rutina copia sus ejercicios al
entrenamiento, y a partir de ahí es independiente.

### Decisión

**1. `execution.session_exercises`: una fila por ejercicio de la sesión.** Posición,
movimiento, el paso de la rutina del que salió (`planned_step_id`, nulo para uno añadido)
y el grupo de superserie. La posición es única por sesión.

**2. Se siembra al empezar y desde ahí es la verdad de la sesión.** `OP-EXE-001` copia los
pasos de la versión de rutina en la misma transacción que crea el intento, con sus
superseries. A partir de ese momento el plan no vuelve a decidir: quitar borra la fila,
mover cambia la posición, encadenar pone el grupo y añadir inserta. Una sesión espontánea
nace sin ejercicios.

**3. Cada serie pertenece a un ejercicio.** `strength_sets.session_exercise_id` referencia
su fila, y borrarla borra sus series. Dos ejercicios del mismo movimiento dejan de
compartir series.

**4. Se reemplaza entero, como las series.** `OP-EXE-005` recibe la lista de ejercicios
junto con las series y reemplaza ambas en la misma transacción, bajo el mismo lock y
`If-Match`. Cada serie dice en qué posición está su ejercicio.

**5. Una superserie es contigua, igual que en el plan.** Los ejercicios que comparten grupo
ocupan posiciones consecutivas (`IX-50`, hermano de `IX-46`); un reemplazo que lo viole se
rechaza entero.

**6. Lo que ya existía se rellena.** Cada sesión anterior recibe una fila por paso de su
rutina y una por movimiento registrado fuera de ella, y sus series se enlazan por
movimiento.

### Lo que esta decisión no hace

- **No temporiza la superserie.** El descanso entre ejercicios encadenados sigue fuera.
  *Enmendado por `ADR-035`:* la sesión cuenta el descanso, y en una cadena lo cuenta al
  terminarla.
- **No enlaza la serie ejecutada con la planificada concreta.**
- **No cambia los derivados por movimiento.** El historial de «anterior», «La última vez»
  y los kilos de la semana siguen leyendo series.

### Invariantes

1. Toda serie de fuerza de una sesión nueva pertenece a un ejercicio de esa sesión.
2. La posición de un ejercicio es única dentro de su sesión.
3. Los ejercicios que comparten grupo de superserie ocupan posiciones consecutivas.
4. La lista la escribe sólo la dueña de la sesión, y sólo mientras no esté finalizada.

### Consecuencias

#### Positivas

- La sesión recuerda cómo se entrenó de verdad: orden, cadenas y lo que se quitó o añadió.
- El detalle de una sesión y cualquier historial futuro leen esa lista, no el plan.
- Un movimiento repetido deja de mezclar sus series.

#### Costos

- Una tabla más con su política, heredada de la sesión.
- `start_planned_session_attempt`, `replace_execution_results` y `read_execution` se
  redefinen juntas.
- El contrato gana `exercises` en el reemplazo y en la lectura, y `exercise_position` en
  cada serie.

### Escenarios de prueba obligatorios

1. Una sesión nueva nace con los ejercicios y las superseries de su rutina.
2. Mover, quitar y añadir sobreviven a leer la sesión otra vez.
3. Una superserie no contigua se rechaza.
4. Dos ejercicios del mismo movimiento no comparten series.
5. Las sesiones anteriores quedan con su lista y sus series enlazadas.
6. Otra persona no lee ni escribe los ejercicios de una sesión ajena.
7. El tonelaje y «La última vez» no cambian.

---

## ADR-035 — El descanso viaja con la sesión y se cuenta al marcar la serie

**Estado:** aceptada para V1<br>
**Fecha:** 30 de septiembre de 2026<br>
**Enmienda a:** `ADR-034`

### Contexto

El descanso entre series existe como prescripción de la rutina
(`strength_targets.target_rest_seconds`, `ADR-030`), pero nada del camino de la sesión lo
llevaba: ni la lista de ejercicios (`ADR-034`) ni su lectura. La persona que entrena no
tenía cuenta atrás, y si la máquina está ocupada o el día pesa, tampoco podía alargar el
descanso sin editar la rutina, que es de todas las semanas y no de hoy.

### Decisión

**1. Cada ejercicio de la sesión lleva su descanso.** `session_exercises.rest_seconds`
se copia de `target_rest_seconds` del paso al iniciar el intento (`OP-EXE-001`). Desde ahí
es de la sesión: cambiarlo reemplaza la lista (`OP-EXE-005`) y **no toca la rutina**. Un
ejercicio añadido nace sin descanso.

**2. La cuenta atrás es del dispositivo, no un resultado.** Arranca al marcar una serie,
se alarga o acorta de 15 en 15 segundos y se puede saltar. Un ejercicio cuya rutina no
dijo nada de descanso cuenta el de apertura del editor, 1 min 30 s: una cuenta atrás que
nunca aparece se lee como rota. Sólo «Ninguno» (0) no cuenta. No se guarda: el descanso real
hecho sigue fuera de V1, como dicen el diccionario y `ADR-033`.

**3. En una superserie también se cuenta, y dice qué sigue.** Marcar una serie arranca el
descanso de ese ejercicio aunque esté en una cadena: la transición también es tiempo, y un
aviso que sólo dice «ahora» deja adivinando cuánto queda. Mientras cuenta dice el ejercicio
siguiente de la cadena; al final de la cadena, el primero para otra vuelta. Esto se aparta,
**sólo durante la sesión**, de la regla de `ADR-030` de que en la cadena cuenta sólo el
descanso del último paso: la rutina sigue guardándolo así.

**4. Avisa también con la app cerrada.** Al terminar, la sesión vibra; con la app en
segundo plano o el teléfono bloqueado, llega una notificación **local** programada en el
propio teléfono. No hay push ni servidor: no hace falta el permiso de APNs, y un permiso
negado sólo quita el aviso, nunca la cuenta atrás.

### Invariantes

1. `rest_seconds` es nulo o está entre 0 y 3600, igual que su origen.
2. Cambiar el descanso de una sesión nunca cambia `strength_targets`.

### Consecuencias

#### Positivas

- La sesión tiene cuenta atrás con el descanso de la rutina, sin que nadie lo recuerde.
- Ajustar el descanso de hoy no reescribe el plan de todas las semanas.

#### Costos

- Una columna más en `session_exercises`, y las tres funciones de `ADR-034` se redefinen.
- Una dependencia nueva en Space para la notificación local.

### Escenarios de prueba obligatorios

1. Una sesión nueva nace con el descanso de cada paso.
2. Cambiarlo en la sesión persiste y no cambia la rutina.
3. Un descanso fuera de rango se rechaza.
4. Un ejercicio añadido nace sin descanso.
5. En una superserie, cada ejercicio arranca su descanso y dice cuál sigue.

---

## ADR-036 — El cierre de un entreno se resume y se comparte; récords, racha y número son derivados

**Estado:** aceptada para V1<br>
**Fecha:** 1 de octubre de 2026

### Contexto

Al guardar un entrenamiento la aplicación volvía directo a Hoy: la persona no veía qué
logró ni podía mostrarlo. La pantalla «Compártelo» resume la sesión en tarjetas para
compartir, y algunas dicen cosas que ningún dato decía todavía: si hubo un récord, cuántas
semanas seguidas lleva entrenando y qué número de entreno es este.

### Decisión

**1. Un resumen de lectura, no un dato nuevo.** `OP-EXE-021` responde el resumen de una
ejecución propia terminada: duración, series de trabajo, ejercicios y kilos, la lista de
ejercicios con sus series, los récords, la racha, el número de entreno, el nombre y el
usuario de la persona, y la portada de la rutina. No hay tablas nuevas.

**2. Los récords se calculan al leer.** Son derivados, como ya fija esta matriz para los
indicadores: guardarlos sería una segunda verdad que envejece al corregir una serie. Para
cada movimiento de la sesión se compara contra lo mejor de las ejecuciones **anteriores**,
terminadas y no anuladas, y sólo con series de trabajo — el calentamiento nunca es récord.
Hay cuatro tipos:

- **Más peso:** la carga más alta levantada en el movimiento.
- **Mejor 1RM estimado:** el mayor `carga × (1 + repeticiones / 30)` (Epley).
- **Mejor serie:** el mayor `carga × repeticiones` en una sola serie.
- **Más volumen en la sesión:** la mayor suma de `carga × repeticiones` del movimiento en
  una ejecución.

La primera vez que se hace un movimiento **no es récord**: no hay con qué compararlo. Cada
récord responde su valor anterior y la fecha de ese anterior, y el cálculo lleva
`algorithm_version = 1`.

**3. La racha son semanas seguidas con al menos un entreno.** Semanas ISO, de lunes a
domingo en la zona horaria de la persona, contadas hacia atrás desde la semana del
entreno. La semana en curso no la rompe mientras no termine: una racha de ocho semanas no
pasa a cero el lunes por la mañana.

**4. El número de entreno cuenta todos los entrenos terminados de la persona**, contando
éste. No depende de un programa.

**5. La foto de fondo nunca sale del teléfono.** Las tarjetas con foto usan la portada
predefinida de la rutina; si la persona elige otra de su galería, se usa sólo para
componer la imagen en el dispositivo. No se sube ni se guarda: no es un dato nuevo.

**6. Compartir es una imagen generada en el teléfono.** Allfit no publica nada ni guarda
qué se compartió. «Historias» entrega la tarjeta al editor de historias de Instagram
como sticker, con el identificador de aplicación de Meta, que es público y viaja en la
app. Sin ese identificador o sin Instagram en el teléfono, la imagen sale por la hoja
nativa del sistema, igual que el resto de acciones.

### Lo que esta decisión no hace

- No guarda récords ni rachas, ni ofrece un historial de récords.
- No muestra la sede donde se entrenó: la ejecución es autónoma y no lleva organización.
- No publica en Instagram por la persona: abre su editor y es ella quien publica.

### Invariantes

1. Un calentamiento nunca es récord ni suma a los kilos del resumen.
2. Una ejecución abandonada o anulada no cuenta para récords, racha ni número.
3. El resumen sólo lo lee la dueña de la ejecución, y sólo si está terminada.

### Escenarios de prueba obligatorios

1. Duración, totales y número de entreno de una ejecución terminada.
2. Cada tipo de récord aparece al superar lo anterior, y no aparece al igualarlo.
3. La primera vez de un movimiento no es récord.
4. Un calentamiento con más peso no es récord.
5. Una ejecución abandonada no cuenta para récords, racha ni número.
6. La racha se corta con una semana sin entrenar, y la semana en curso no la rompe.
7. Otra persona no lee el resumen de una ejecución ajena.

## ADR-037 — El historial de Space muestra lo terminado, y cada fila se resume al leer

**Estado:** aceptada para V1<br>
**Fecha:** 1 de octubre de 2026

### Contexto

`OP-EXE-014` define el listado de las ejecuciones propias, y `HU-SP-057` pide que la
persona vea **todo lo suyo**. La primera entrega del historial en Space —una sección en Hoy
y una pantalla completa con buscador, filtros y resumen del mes— tiene que decidir qué
muestra cada fila, cómo se filtra y qué queda para después. Hoy todas las ejecuciones son
autónomas: ni el ocultamiento a terceros ni las observaciones profesionales tienen todavía
tablas que leer.

### Decisión

**1. Esta entrega lista sólo ejecuciones terminadas y no anuladas.** Los intentos
abandonados, las anuladas y el historial de correcciones de `HU-SP-057` quedan
**diferidos**: el listado responde un `status` por fila para poder añadirlos sin romper el
contrato. Lo oculto y las observaciones llegan con el dominio de relaciones; hasta
entonces el contrato no los declara, porque declarar un campo que siempre viene vacío es
prometer un dato que no existe.

**2. Cada fila se resume al leer.** Duración, series de trabajo y kilos —sin calentamientos,
y nulos si no se pesó nada—, y el **número de récords**, con la misma regla de `ADR-036`:
la fila y la tarjeta de esa sesión nunca discrepan. La miniatura es la **portada de la
rutina**, la misma que muestran Hoy y el resumen; una sesión libre no tiene rutina y no
lleva portada.

**3. El listado se filtra por mes, disciplina, récord, libre y texto.** El mes se cuenta en
la zona horaria de la persona. Una sesión es **libre** cuando no salió de una sesión
planificada. El texto busca, sin tildes ni mayúsculas, en el nombre de la rutina y en el
de sus ejercicios. Paginado por cursor, inicio descendente y desempate por identificador,
como ya fija `OP-EXE-014`.

**4. El mes se resume aparte (`OP-EXE-022`).** Entrenos, tiempo, series, kilos y récords del
mes; por cada semana ISO, contada entera aunque cruce a otro mes, cuántas se terminaron,
cuántas se planificaron y cuántas de las planificadas se cumplieron, cada una una sola vez
por más veces que se repitiera; cada día entrenado, con su tiempo, sus series, sus kilos y sus récords, para dibujar el
mes como calendario y resumir el día que se toque; los meses con algún entreno, para elegir mes; y las disciplinas presentes,
para ofrecer sólo los filtros que dan resultado.

### Lo que esta decisión no hace

- No muestra abandonadas, anuladas ni correcciones (diferido, criterio 1 de `HU-SP-057`).
- No abre el detalle de una sesión al tocarla. **Superado por `ADR-038`**, que lo abre.
- No funciona sin conexión todavía (criterio 2 de `HU-SP-057`).

### Invariantes

1. Una ejecución abandonada o anulada no aparece en el listado ni suma al mes.
2. El número de récords y la portada de una fila son los mismos que responde el resumen de esa ejecución.
3. El historial sólo lo lee su dueña.

### Escenarios de prueba obligatorios

1. Orden por inicio descendente y paginación por cursor sin repetir ni saltar filas.
2. Cada filtro y la búsqueda, con tildes, mayúsculas y por nombre de ejercicio.
3. Abandonadas y anuladas no aparecen.
4. Los récords de una fila coinciden con los del resumen.
5. El mes responde sus totales, sus semanas con planificadas y libres, y los meses disponibles.
6. Otra persona no lee el historial ajeno.

## ADR-038 — La persona abre, corrige, anula y repite un entreno terminado

**Estado:** aceptada para V1<br>
**Fecha:** 3 de octubre de 2026

### Contexto

Tocar una fila del historial no abría nada (`ADR-037`). Los diseños `FIN-18` piden el
detalle de un entreno terminado y, desde él, corregirlo, anularlo y repetirlo. `ADR-022`
ya fijó que la edición es indefinida y append-only, y `HU-SP-058`, `HU-SP-060` y el
criterio 5 de `HU-SP-051` lo piden; ninguna de las tres operaciones estaba construida, y
`OP-EXE-005` sólo acepta sesiones en curso.

### Decisión

**1. El detalle se lee aparte (`OP-EXE-023`).** Cada serie con su tipo, la mejor serie de
cada ejercicio (el mayor 1RM estimado, la primera de las iguales), la marca de la serie que
batió todo lo anterior y la última vez que se terminó la misma rutina, con la diferencia
de kilos. Récords y comparación se derivan al leer, como fija `ADR-036`, así que una
corrección se ve al instante. Una sesión anulada o sin terminar responde como inexistente.

**2. Corregir guarda lo que había (`OP-EXE-007`).** La sesión se envía entera —sus series,
su lista de ejercicios y su horario— bajo la revisión que se leyó. Cada corrección deja en
`execution.execution_revisions` el antes y el después, con actor y motivo; esa tabla no
admite cambios ni borrados, ni del dueño. El motivo es fijo: «Corrección de la persona».
Vaciar una sesión no es corregirla: es anularla.

**3. Eliminar es anular (`OP-EXE-009`).** Nada se borra. La sesión pasa a `annulled`, deja
de contar en historial, récords, racha y totales, y conserva sus series. **El motivo pasa
a ser opcional**: sin uno se registra «La persona lo eliminó». Antes de confirmar, la
persona ve qué cambia (`OP-EXE-024`): los récords que se van y la racha de hoy con la
sesión y sin ella.

**4. Repetir abre otro intento con los mismos ejercicios (`OP-EXE-025`).** Otro intento de
la misma sesión planificada, como pide `HU-SP-051`, que empieza con la lista de ejercicios
con la que terminó la sesión de origen —orden, superseries y descanso— y sin series. Un
entreno libre no tiene rutina que repetir, y con otra sesión abierta se rechaza.

### Lo que esta decisión no hace

- No muestra el historial de revisiones a la persona.
- No revalida contra el contrato al corregir: el nivel alcanzado no baja todavía (criterio 4 de `HU-SP-058`).
- No emite `execution.revised.v1` ni `execution.annulled.v1`: el dominio de ejecución aún no escribe en el outbox.
- No permite elegir qué intento cuenta (`OP-EXE-008`).

### Invariantes

1. Una revisión nunca se reescribe ni se borra.
2. Anular no borra series ni la sesión.
3. Lo anulado no cuenta para récords, racha, totales, historial ni «la última vez».
4. Sólo la dueña lee, corrige, anula o repite su sesión.

### Escenarios de prueba obligatorios

1. El detalle suma como el resumen y marca la mejor serie y la que batió todo.
2. La comparación con la última vez de la misma rutina, y su ausencia la primera vez.
3. Corregir guarda el antes, rechaza una revisión obsoleta, un horario al revés y una sesión vacía.
4. El anticipo dice los récords y la racha antes y después.
5. Repetir copia la lista y rechaza un entreno libre y una segunda sesión abierta.
6. Anular deja la sesión fuera del historial y del detalle, y es idempotente.
7. Otra persona no lee ni anula lo ajeno.

## ADR-039 — Las fotos de comida viven en un almacén privado S3

**Estado:** aceptada para V1; su decisión 1 (el proveedor) está sustituida por ADR-042<br>
**Fecha:** 4 de octubre de 2026

> **Reemplazado en parte por [ADR-042](#adr-042-las-fotos-de-comida-viven-en-cloudflare-r2-en-estados-unidos)** el 6 de octubre de 2026: el almacén es Cloudflare R2 con jurisdicción de Estados Unidos, no AWS S3. Siguen vigentes el puerto propio, la clave que no sale de la API, el saneamiento y el orden de subida, commit y borrado.

### Contexto

`ADR-027` permite una foto por comida, que se sube en la revisión, se sanea y se lee
con una URL firmada de 300 segundos como máximo. Nunca se construyó: no había dónde
guardar archivos privados. Las portadas personales lo intentaron en PostgreSQL y en un
bucket, y se retiraron (`20260919230000`). `ADR-002` adoptó Supabase solo como
PostgreSQL, así que su almacenamiento no es opción.

### Decisión

**1. El almacén es AWS S3 en `us-east-1`.** El bucket es privado, cifrado con una llave
KMS propia (SSE-KMS) y con bloqueo de acceso público. R2 costaba casi lo mismo a esta
escala (menos de un dólar al mes con mil personas), pero no ofrece llaves propias ni
residencia garantizada fuera de la UE y FedRAMP. Además, AWS ya es el proveedor de la
empresa.

**2. Queda detrás de un puerto propio, `packages/object-store`.** Solo sabe guardar
unos bytes bajo una clave, firmar una lectura por unos segundos y borrar. El adaptador
habla la API S3, así que MinIO en local o R2 son cambios de configuración. Solo ese
paquete importa el SDK; ESLint rechaza cualquier otro import.

**3. La clave no sale de la API.** Es `nutrition/{person}/{meal}/{uuid}.jpg` y se guarda
en `meals.media_ref`. Al teléfono le llega la URL firmada de GET por 300 s, que no se
registra en logs.

**4. Se sanea antes de guardar.** `sharp` decodifica y vuelve a codificar en JPEG: no
queda EXIF, ni GPS, ni cámara, ni hora. Antes la endereza con su propia orientación y
la reduce a 1600 px por el lado mayor. Lo que no puede decodificar, lo rechaza (falla
cerrada, 422).

**5. El orden protege los dos lados.**
- Se sube primero y después se hace el commit de la revisión.
- Si el commit falla, la foto subida se borra (compensación).
- La foto anterior, o la de una comida eliminada, entra a `nutrition.media_disposals` en
  la misma transacción. Después del commit se borra del almacén y se sella.
- Si el almacén se niega a borrarla, queda en la cola sin deshacer lo que la persona
  hizo. El barrido de esa cola por el worker queda diferido.

### Lo que esta decisión no hace

- No crea el bucket ni sus credenciales en AWS. Los pasos están en el PR de
  implementación.
- No resuelve el DPA ni la transferencia internacional bajo la Ley 1581, igual que con
  el proveedor de identidad.
- No sirve fotos a Studio: el proxy autenticado de `OP-NUT-013` llega con Studio.

## ADR-040 — Alcance V1 de nutrición en Space

**Estado:** aceptada para V1<br>
**Fecha:** 4 de octubre de 2026

### Contexto

Los diseños N-1e a N-6 y N-3b piden en Space:
- la línea del día;
- registrar, ver, corregir y eliminar una comida;
- el historial de 7, 14 o 31 días;
- la meta propia;
- la propuesta de un profesional.

El contrato y `OP-NUT-001..008` ya estaban cerrados; faltaban la base, la API y la app.

### Decisión

**1. Las ocho tablas del diccionario (§10A), con funciones cerradas.**
- Corregir reemplaza en el sitio bajo la revisión leída (`If-Match`, 409 si está
  obsoleta), como fija `OP-NUT-003`.
- Eliminar es borrado duro (`OP-NUT-004`).
- La hora y el día de una comida quedan fijos al registrarla, en su zona.

**2. El día se resume al leer** (`OP-NUT-005`): un nutriente sin registrar no tiene
total, nunca cero.
- La respuesta suma `streak_days`: los días seguidos con al menos una comida, que
  terminan hoy o, mientras hoy siga vacío, ayer.
- La zona del teléfono decide qué día es hoy.

**3. Se añade la lectura de una comida** (`GET /meals/{id}`, dentro de `OP-NUT-002`),
que el detalle necesita y que devuelve el ETag de la corrección.

**4. La autoría de una propuesta incluye el nombre del profesional y de su organización.**
La persona sabe quién la acompaña; lo que se sigue sin exponer es el contexto interno de
la relación.

**5. La app calcula lo que no es un dato:**
- lo que queda frente a la meta, según su modo;
- «Tu día queda así» antes de eliminar;
- el promedio de los días con registro.

También muestra los entrenos del día en la misma línea, leídos de `OP-EXE-014`.

### Lo que esta decisión no hace

- **Sin conexión:** no guarda comidas para enviarlas después (`HU-SP-067`, `069`, `070`);
  queda diferido.
- **Eventos:** no emite `nutrition.meal_*.v1` ni los de metas, porque el dominio aún no
  escribe en el outbox.
- **Studio:** no construye `OP-NUT-009..013`. Las propuestas se prueban con datos
  sembrados.

### Invariantes

1. Ninguna fila ni total convierte un nutriente sin registrar en cero.
2. Una sola meta activa por persona, y una decisión por propuesta, que no se reescribe.
3. La clave de una foto nunca sale de la API.
4. Solo la dueña lee, corrige o elimina sus comidas y decide sobre sus metas.

## ADR-041 — Reconocer y buscar alimentos al registrar una comida

**Estado:** aceptada para V1<br>
**Fecha:** 4 de octubre de 2026<br>
**Reemplaza:** el punto 4 de ADR-027 en lo que toca al catálogo de alimentos, a los
proveedores externos y a la IA nutricional. El resto de ADR-027 sigue vigente.

### Contexto

Registrar una comida a mano obliga a escribir las kcal y los macros de cada alimento.
Los diseños R-0 a R-F5 y R-A0 a R-A5 abren dos caminos desde la cámara:
- **Foto:** la app reconoce los alimentos y calcula porciones y nutrientes;
- **Alimentos:** se busca en un catálogo y se elige la porción.

ADR-027 había excluido de V1 el catálogo global, los proveedores externos y la IA
nutricional. Esta decisión los admite con límites estrictos.

La elección del modelo salió de tres pruebas con 12 fotos de platos colombianos de
Wikimedia, por unos 0,74 USD en total:

| Modelo | Aciertos | Latencia (mediana) | USD por foto |
| --- | --- | --- | --- |
| Gemini 3.8 Flash | 96–98 % | 8 s, con colas de 34 s | 0,0049 |
| Gemini 3.5 Flash | 97 % | 8 s | 0,0112 |
| Claude Sonnet 5.5 | 90 % | 3 s | 0,0045 |
| **Gemini 3.5 Flash-Lite**, con el *prompt* final | **87–91 %** | **2,1 s** | **0,0010** |
| GPT-5-mini | 87 % | 9,5 s | 0,0022 |
| GPT-4o-mini | 86 % | 2,9 s | 0,0039 |
| Gemini 2.5 Flash-Lite | 80 % | 1,7 s | 0,0002 |
| Claude Haiku 4.5 | 67 %, con alimentos inventados | 3,2 s | 0,0020 |

Los aciertos miden qué parte de los alimentos visibles, anotados a mano, nombró cada
modelo. Los gramos no se pudieron validar porque las fotos no tienen peso real.

### Decisión

**1. El modelo dice qué ve y cuántos gramos; los nutrientes salen del catálogo.**
- Cada alimento reconocido se cruza con el catálogo, y si cruza, sus nutrientes son los
  del catálogo para esos gramos.
- Si no cruza, el modelo da una **estimación** para la porción: energía y macros siempre,
  y el detalle, las vitaminas y los minerales que pueda estimar con sentido. La app la
  marca «IA», y la persona puede cambiar el alimento o los valores.
- La persona revisa todo antes de guardar, y nada entra al diario sin su confirmación.

**2. El reconocimiento usa un solo modelo, por versión exacta:**
`google/gemini-3.5-flash-lite`, a través del AI Gateway de Vercel.
- La API lo llama solo por Vertex AI de Google (`only: ['vertex']`), con retención cero
  por petición: la retención cero cubre Vertex, no AI Studio.
- **No hay respaldo automático entre modelos.** Si el proveedor falla, la app ofrece
  la búsqueda.
- Cambiar de modelo es configuración, nunca un alias que el proveedor mueva solo, y solo
  después de pasar el set de prueba versionado en el repositorio.

**3. La foto que se reconoce es la misma que después se guarda.**
- Se limpia de EXIF y se reduce a 1024 px antes de salir, como fija ADR-039.
- No se guarda en el proveedor.
- Si la persona guarda la comida, la foto sigue el camino de ADR-039.

**4. Hace falta un consentimiento explícito antes del primer reconocimiento.**
- Es un dato sensible bajo la Ley 1581, y el reconocimiento lo procesa un tercero.
- El consentimiento se guarda con la versión del texto aceptado.
- Sin consentimiento, la API se niega: falla cerrado.
- Buscar en el catálogo no lo necesita, porque nada sale de Allfit.

**5. El catálogo es propio y vive en `nutrition`.**
- Arranca con alimentos de **USDA FoodData Central**, que es de dominio público (CC0),
  con nombres en español, sinónimos y porciones colombianas.
- Los platos son **recetas de Allfit**, compuestas por esos ingredientes.
- Los valores salen de los archivos de USDA, nunca escritos a mano.
- Lo leen todas las personas; nadie lo escribe desde la API, porque se siembra por
  migración.
- **La tabla del ICBF no se copia:** su portal prohíbe la reproducción y el uso comercial
  sin autorización previa y escrita. Esa autorización se pide en paralelo.
- **Los productos empacados vienen de Open Food Facts** (ODbL), en tablas propias
  (`nutrition.products` y sus hijas), aparte del catálogo de Allfit. Separados, forman
  una obra colectiva junto al catálogo y no una base derivada, y el *share-alike* de la
  ODbL alcanza solo a esos datos.
  - Se importan los productos vendidos en Colombia, por migración de curación generada.
    Como son datos colaborativos, entra solo lo que puede ser verdad por 100 g, con
    nombre, código de barras y energía. Un mismo producto con varios códigos queda una vez.
  - La app acredita «Open Food Facts (ODbL)» donde se muestre un producto.
  - Se buscan por nombre y marca. Una foto nunca se cruza con un producto: distinguir la
    marca de un vaso de leche no es del modelo.

**6. La información nutricional es la de una etiqueta, medida contra una referencia.**
- Se publican 31 nutrientes, cada uno en su unidad (`kcal`, `g`, `mg`, `mcg` o `ml`) y en
  un grupo: macros, detalle (grasas saturadas y trans, colesterol, sodio, azúcares),
  vitaminas y minerales.
- El % de cada uno se mide contra la meta activa de la persona, para la energía y los
  macros. Si no tiene meta, y para todo lo demás, se mide contra los valores diarios de
  referencia para adultos de la **Resolución 810 de 2021**, artículo 15: la tabla 9 para
  las necesidades y la tabla 10 para los máximos de grasas saturadas y trans, colesterol y
  sodio. Los azúcares totales y el agua no tienen referencia en la norma, y se muestran sin
  %.
- Los azúcares añadidos no entran: USDA SR Legacy no los trae.

**7. La cantidad se escribe como la dice la persona.**
- Se escribe como número o como fracción («1 ½»), en una unidad que el alimento admite:
  sus medidas propias o las de USDA (vaso, taza, cucharada…), la masa (g, kg, lb, oz) y,
  solo para lo que se sirve líquido, el volumen (ml, l, fl oz) según su densidad.
- Los nutrientes se calculan siempre en gramos. El ítem guarda además cómo lo dijo la
  persona (`serving`, «1 ½ tazas»), para mostrarlo de vuelta.

**8. Cada alimento registrado dice de dónde salió:**
- `typed` si se escribió a mano, `catalog` si se eligió del catálogo, `photo` si se
  reconoció;
- su alimento del catálogo o su producto, cuando lo tiene; nunca los dos;
- la comida guarda qué modelo la reconoció.

### Invariantes

1. Ningún nutriente del modelo se guarda sin que la persona lo haya visto marcado como
   estimado («IA»).
2. Ninguna foto sale de Allfit sin consentimiento vigente de su dueña, ni con EXIF.
3. Un nombre que no sea texto llano (letras, espacios, tildes) no llega al diario.
4. El catálogo y los productos solo cambian por migración.

### Lo que esta decisión no hace

- No escanea códigos de barras: el código se guarda, pero buscar por cámara queda fuera.
- No mezcla los datos de Open Food Facts con el catálogo propio.
- No configura evaluación por confianza entre modelos.
- No resuelve los DPA de Vercel y Google ni la transferencia internacional bajo la Ley
  1581, igual que con S3 y con el proveedor de identidad.
- No lleva el reconocimiento a Studio ni lo permite sin conexión.

### Pruebas

`T-NUT-FOOD-*`, `T-NUT-PROD-*`, `T-NUT-FREQ-*`, `T-NUT-CONSENT-*`, `T-NUT-CUR-*`,
`T-NUT-API-16..` y `T-REC-UNIT-*`,
más el set de prueba del reconocimiento, que se corre a mano antes de cambiar de modelo
(umbral: 85 % de aciertos y ninguna respuesta que devuelva solo el plato).

## ADR-042 — Las fotos de comida viven en Cloudflare R2, en Estados Unidos

**Estado:** aceptada para V1<br>
**Fecha:** 6 de octubre de 2026<br>
**Supersede:** la decisión 1 de `ADR-039` (el proveedor). Sus decisiones 2 a 5 siguen vigentes.

### Contexto

`ADR-039` eligió AWS S3 por dos razones: una llave de cifrado propia (KMS) y que AWS ya
era proveedor de la empresa. Antes de crear el bucket se compararon de nuevo los dos
almacenes, con los precios y límites publicados el 6 de octubre de 2026.

| | Cloudflare R2 | AWS S3 (`us-east-1`) |
| --- | --- | --- |
| Almacenamiento | US$ 0,015 por GB al mes; 10 GB gratis | US$ 0,023 por GB al mes |
| Escrituras | US$ 4,50 por millón; 1 millón gratis al mes | US$ 5,00 por millón |
| Lecturas | US$ 0,36 por millón; 10 millones gratis al mes | US$ 0,40 por millón |
| Salida de datos (el teléfono descargando la foto) | Gratis | US$ 0,09 por GB, después de la franja gratuita de AWS (sin verificar en esta revisión) |
| Tamaño máximo por objeto | 5 TiB | 5 TiB |
| Enlaces firmados | Sí, hasta 7 días, solo en el dominio S3 de R2 | Sí |
| Cifrado en reposo | AES-256 con llaves de Cloudflare | Con llave propia en KMS |
| Llave propia | Solo SSE-C (la llave viaja en cada petición) | KMS |
| Ubicación garantizada | Jurisdicciones de Estados Unidos, Unión Europea o FedRAMP | La región elegida |

Con 1.000 personas, tres fotos al día de unos 250 KB y diez vistas por foto, al cabo de
un año serían unos 270 GB guardados y unos 225 GB descargados al mes: alrededor de
US$ 4 al mes en R2 y de US$ 18 a 20 en S3 con su llave. La diferencia es casi toda la
salida de datos, que crece con las personas.

**La llave propia protege poco en esta arquitectura.** Da un registro de cada uso, la
posibilidad de dejar ilegible todo apagando la llave, y que leer exija dos permisos. Pero:

- la API necesita los dos permisos para funcionar, así que quien la comprometa tiene ambos;
- la foto llega al teléfono por un enlace firmado de 300 segundos, y quien tenga el enlace
  la ve con o sin llave propia;
- la Ley 1581 exige medidas de seguridad adecuadas, no una llave propia en particular. Lo
  que protege las fotos es el bucket privado, los enlaces cortos y que la clave del objeto
  nunca salga de la API, y eso no depende del proveedor.

En R2 la única llave propia es SSE-C, que obliga a enviar la llave en cada lectura. Eso no
funciona con enlaces firmados: la API tendría que servir cada foto ella misma.

`ADR-039` descartó R2 porque no garantizaba residencia fuera de la Unión Europea y
FedRAMP. Hoy R2 ofrece también la jurisdicción de **Estados Unidos**.

### Decisión

**1. El almacén es Cloudflare R2, en un bucket privado con jurisdicción de Estados
Unidos.**
- La jurisdicción se elige al crear el bucket («Specify jurisdiction» → *United States*) y
  **no se puede cambiar después**. Sin ella, Cloudflare elige la región más cercana sin
  garantía de que los datos se queden ahí.
- Estados Unidos porque no existe una jurisdicción en Latinoamérica, es la más cercana a
  Colombia, y es donde están ya el proveedor de identidad y el alojamiento de la API: un
  solo país en el que responder dónde están los datos.
- El punto de acceso S3 del bucket es `https://<cuenta>.us.r2.cloudflarestorage.com`.

**2. La foto se sigue leyendo con un enlace firmado de GET por 300 segundos**, en el
dominio S3 de R2. Los enlaces firmados de R2 no funcionan con dominios personalizados.

**3. El cifrado en reposo es el de Cloudflare (AES-256).** No se usa SSE-C, porque rompería
los enlaces firmados.

**4. No cambia el código.** El puerto `packages/object-store` ya habla el protocolo S3 y su
adaptador acepta cualquier punto de acceso. Cambiar de proveedor es cambiar las variables
`OBJECT_STORE_*` de la API: con R2, el punto de acceso de la jurisdicción y la región
`auto`. En local sigue MinIO.

**5. Cloudflare es encargado del tratamiento.** Guardar las fotos fuera de Colombia es una
*transmisión* internacional a un encargado, según la distinción del Decreto 1074 de 2025 que
recoge la Circular Externa 003 de 2025 de la SIC. Exige un contrato de transmisión con
Cloudflare. La SIC recomienda las cláusulas contractuales modelo de la Red Iberoamericana de
Protección de Datos. Esto valdría igual con AWS.

### Volver a S3 si hace falta

Si un cliente o una auditoría pide llave propia, la mudanza es corta porque ninguna fila
guarda una URL, solo la clave del objeto (`meals.media_ref`), y los enlaces se firman al leer:

1. Crear el bucket privado en S3 con su llave KMS como cifrado por defecto.
2. Copiar los objetos de R2 a S3 con las mismas claves (por ejemplo con `rclone`), sin
   detener la app. Sacar datos de R2 no tiene costo.
3. Cambiar las variables `OBJECT_STORE_*` de la API (y `OBJECT_STORE_KMS_KEY_ID`) y desplegar.
4. Copiar otra vez lo que se haya subido durante la primera copia.
5. Verificar que las fotos abren y, unos días después, borrar el bucket de R2.

No cambia la app, ni la base de datos, ni el código de la API. Se estima en un día de
trabajo más el tiempo de la copia.

### Invariantes

Siguen las de `ADR-039`: ninguna fila ni ninguna respuesta contiene una URL del almacén, la
clave del objeto no sale de la API, y ninguna foto se guarda sin sanear.

### Lo que esta decisión no hace

- No crea el bucket ni sus credenciales en Cloudflare: es un paso de operación.
- No firma el contrato de transmisión con Cloudflare ni revisa con un abogado si Estados
  Unidos sigue en la lista de países con nivel adecuado de la SIC (Circular Externa 005
  de 2017).
- No verificó si R2 registra cada lectura de un objeto como lo hace S3.
- No resuelve qué pasa si el almacén no responde: hoy la API espera los reintentos del
  cliente S3 sin límite de tiempo propio, y eso queda para otra tarea.

### Pruebas

Sin pruebas nuevas: no cambia el código. `T-OBJ-UNIT-01..03` prueban el adaptador sin red:
la configuración que falta, el enlace firmado y el direccionamiento por ruta con un punto de
acceso propio, que es como se habla con R2. Los casos de uso de nutrición se prueban con el
almacén en memoria. Ninguna prueba automática habla con R2; se verifica a mano al crear el
bucket.

---

## ADR-043 — Allfit Pro: se paga con la compra integrada de cada tienda y se resuelve al leer

**Estado:** aceptada para V1<br>
**Fecha:** 12 de octubre de 2026<br>
**Cierra:** `DB-P5-007` y `DB-P5-008`<br>
**Supersede:** la regla de `V1_DATABASE_SCOPE.md` §17.4 que hacía depender el Premium del
gimnasio de una suscripción de organización y de una habilitación por gimnasio
(`organization_premium_entitlements`, `OP-PAY-022`).

### Contexto

El plan de pago de Allfit para personas se llamaba **Premium** y desde el 12 de octubre de
2026 se llama **Pro**. Las historias de `E-SP-15` se reescribieron el 1 de octubre:

- en V1 existen solo dos planes, ambos de Allfit: el **gratuito** y **Pro**;
- los gimnasios no le cobran a sus clientes a través de Allfit (`E-SP-13`, `E-SP-14` y
  `E-STUDIO-13` quedan diferidas);
- a Pro se llega **pagándoselo a Allfit** o **entrando invitado por un gimnasio activo**, y
  un gimnasio activo es uno que le está pagando a Allfit.

El catálogo de planes (`HU-BO-025`, `HU-BO-026`) ya está construido en
`20260927050000_platform_plan_catalogue.sql`. Dejó sin decidir, a propósito, de dónde sale
el Pro de una persona. `DB-P5-008` hacía cinco preguntas que esta decisión responde.

**Las tiendas.** La App Store (guía 3.1.1) exige la compra integrada para vender una
suscripción digital dentro de la app. Los enlaces y pagos externos solo se permiten en la
tienda de Estados Unidos desde mayo de 2025. Google Play exige su facturación salvo en el
Espacio Económico Europeo, el Reino Unido y Estados Unidos. Colombia no está en ninguna de
esas excepciones. Las aplicaciones de fitness de la región, como Fitia, cobran dentro de la
app con la tienda y aparte en su web.

### Decisión

**1. Dentro de Space, Pro se paga solo con la compra integrada:** App Store en iPhone y
Google Play Billing en Android. La tienda cobra; Allfit no procesa el pago ni ve una tarjeta.
El cobro web de los gimnasios, con Mercado Pago, pertenece al dominio de Backoffice y no
pasa por Space.

**2. La API verifica cada compra con la tienda antes de registrarla.** La app nunca afirma
que pagó:
- **Apple:** la transacción llega firmada (JWS) y se verifica con la cadena raíz de Apple,
  el `bundleId` y el entorno.
- **Google:** con el token de compra se consulta la suscripción en la Google Play Developer
  API, con una cuenta de servicio.

Una compra que no se pudo verificar **no da Pro**.

**3. Lo que pasa después lo cuenta la tienda.** Las renovaciones, la gracia, la suspensión,
el vencimiento, el reembolso y la revocación llegan como notificaciones de servidor:
- App Store Server Notifications V2, firmadas y verificadas igual que la compra;
- las notificaciones en tiempo real de Google Play, por un push de Pub/Sub con token OIDC
  verificado, y el estado se vuelve a leer en la API de Google.

Cada notificación se deduplica por su identificador. Se guarda un hash del contenido, nunca
el contenido.

**4. Cancelar se hace en la tienda.** Ni Apple ni Google permiten cancelar una suscripción
desde la app. Space abre la gestión de suscripciones de la tienda, y el cambio llega por la
notificación. Pro sigue hasta el final del periodo pagado.

**5. Cada versión de pago se vende con un producto de tienda propio.** La tabla
`payments.platform_store_products` enlaza `(tienda, producto)` con una versión exacta del
catálogo. Una versión con otro precio se vende con un producto nuevo, así que quien ya
estaba suscrito conserva la suya. La app muestra el precio localizado que da la tienda; el
catálogo dice qué incluye cada versión. El enlace se carga por curaduría; editarlo desde
Backoffice es otra historia.

**6. Pro se resuelve al leer y nunca se guarda como bandera.** En este orden:

```text
plan_efectivo(persona) =
   SI tiene una suscripción propia viva                → su versión congelada
      (active o grace, con current_period_end futuro)
   SI NO, tiene una relación active con una
      organización active                              → la versión vigente del plan pro
   SI NO                                               → la versión vigente del plan gratuito
```

Las respuestas a las preguntas de `DB-P5-008`:

1. **Qué versión recibe quien tiene Pro por su gimnasio:** la versión **vigente** del plan
   de pago con código `pro`.
2. **Si se congela por acuerdo:** no. Solo quien paga congela su versión, porque es quien
   aceptó un precio. Si Allfit cambia lo que incluye Pro, a los invitados de gimnasio les
   cambia también.
3. **Varios gimnasios activos:** no hay conflicto, todos dan la misma versión vigente.
4. **Prioridad:** suscripción propia, luego gimnasio, luego gratuito.
5. **Suspensión:** una suscripción `suspended` no cuenta; una organización que no esté
   `active` no da nada. Hoy las organizaciones no tienen estado `suspended`; cuando lo
   tengan (`HU-BO-016`), la regla ya lo excluye.

La lectura devuelve **todas las vías vigentes**, aunque solo una determine los límites, para
que quien paga sepa si además tiene Pro por su gimnasio, y al revés.

**7. Ante cualquier ambigüedad, el resultado es el plan gratuito.** Si no existe un plan
`pro` publicado, una versión no tiene sus funciones o una suscripción no tiene versión,
la persona recibe el gratuito. Nunca al revés.

### Invariantes

- Ninguna tabla guarda datos de tarjeta, PAN, token de tarjeta ni medio de pago reutilizable.
- Una persona tiene como máximo una suscripción viva a Allfit.
- Una referencia de tienda (`originalTransactionId` de Apple o el primer token de compra de
  Google) pertenece a una sola persona. Otra persona que la presente recibe `conflict`.
- La versión de una suscripción nunca cambia; cambiar de versión es otra suscripción.
- Repetir una compra o una notificación no crea un segundo registro ni otro efecto.
- Ningún cambio de Pro borra datos, toca permisos ni termina relaciones.
- Ninguna función de privacidad puede limitarse (`ck_platform_features_not_privacy`).
- `allfit_api` no tiene privilegios sobre las tablas: todo pasa por funciones cerradas.
- Solo la persona lee su suscripción. Ninguna organización la lee.
- Una transacción firmada por Xcode (StoreKit local) solo se acepta con la API configurada
  para el entorno `xcode`, que nunca existe fuera del equipo de desarrollo.

### Consecuencias

- `organization_premium_entitlements` no se crea, y `OP-PAY-022` queda obsoleta. Qué
  gimnasio está activo lo decide Backoffice al crearlo, suspenderlo o cancelarlo.
- `HU-SP-088` se cumple sola: cuando una relación termine o un gimnasio deje de estar
  activo, la resolución deja de contarlo sin ningún proceso extra.
- Publicar en las tiendas exige la cuenta de Apple Developer y la de Google Play Console,
  que también hacen falta para distribuir la app.
- Las comisiones de las tiendas aplican a Pro comprado dentro de la app.

### Lo que esta decisión no hace

- No decide qué funciones limita Pro: el catálogo de funciones sigue vacío.
- No crea los productos en App Store Connect ni en Google Play Console.
- No modela el cobro web ni Mercado Pago.
- No construye la terminación de relaciones ni la suspensión de gimnasios.
- No ofrece pruebas gratuitas, cupones ni cambios entre planes de pago.

### Escenarios de prueba obligatorios

1. Sin suscripción ni relación, la persona resuelve al plan gratuito vigente.
2. Con una suscripción viva, resuelve a su versión congelada, aun después de publicarse otra.
3. Con una relación `active` y una organización `active`, resuelve al Pro vigente.
4. Con la relación terminada o la organización no `active`, el gimnasio no da nada.
5. Con las dos vías, mandan los límites de la suscripción y se devuelven ambas vías.
6. Sin plan `pro` publicado, quien llega por su gimnasio resuelve al gratuito.
7. Una suscripción `suspended`, `ended` o con el periodo vencido no da Pro.
8. Repetir la misma compra o la misma notificación no crea otro registro.
9. Otra persona no puede reclamar una referencia de tienda ajena ni leer la suscripción.
10. Dos compras simultáneas de la misma persona dejan una sola suscripción viva.
11. Una compra o notificación que no se pudo verificar no cambia nada.

---

## ADR-044 — La persona trae su historial de otra app, y entra como entrenamiento suyo

**Estado:** aceptada para V1<br>
**Fecha:** 3 de noviembre de 2026<br>
**Operaciones:** `OP-EXE-027`, `OP-EXE-028`, `OP-EXE-029` y `OP-EXE-030`<br>
**Supersede:** la fila «Importar historial masivo desde un tercero» de
`V1_OPERATIONS_MATRIX.md` §9, que dejaba toda importación fuera de V1.

### Contexto

Quien llega a Space desde otra app de fuerza trae años de entrenamiento. Si empieza de cero
pierde sus récords, su «última vez» y la progresión que le dice cuánto cargar. Esa pérdida
es la razón más concreta para no cambiarse de app.

Hevy, una de las apps de registro de fuerza más usadas, exporta el historial completo
desde sus ajustes en un archivo CSV. Se analizaron dos exportaciones reales de la misma
cuenta: 340 entrenos y 7.322 series entre 2023 y 2026, una con la app en inglés y otra en
español.

- **Hay una fila por serie**, con 14 columnas fijas: `title`, `start_time`, `end_time`,
  `description`, `exercise_title`, `superset_id`, `exercise_notes`, `set_index`, `set_type`,
  `weight_kg`, `reps`, `distance_km`, `duration_seconds` y `rpe`. La sesión se repite en
  cada fila y no trae identificador.
- **La fecha se escribe en el idioma de la app**, sin zona horaria: `Aug 4, 2026, 3:09 PM`
  en inglés y `4 ago 2026, 15:09` en español, donde septiembre es `sept`. Las dos
  exportaciones dan el mismo instante local en las 7.322 filas.
- **El nombre del ejercicio llega siempre en inglés**, cualquiera sea el idioma de la app,
  con el equipo entre paréntesis: `Lat Pulldown (Cable)`.
- **`set_type` tiene los cuatro valores de `ADR-033`**: `normal`, `warmup`, `dropset` y
  `failure`. El peso vacío es peso corporal, y el RPE admite medios puntos.

`ADR-034` ya dice que una sesión es una lista de ejercicios con sus series, y `ADR-036`
deriva récords, racha y número de entreno de las sesiones terminadas. Lo que Hevy exporta
cabe en ese modelo sin cambiarlo.

### Decisión

**1. Se importa un archivo que la persona exportó, no una cuenta ajena.** Space no se
conecta a la cuenta de otra app, no guarda sus credenciales ni sincroniza en segundo plano.
La persona elige el archivo en su teléfono y lo sube.

**2. Cada fuente tiene un lector, y todos producen el mismo modelo.** Un lector reconoce su
formato y lo traduce a un modelo intermedio propio y versionado, `imported_history.v1`:
sesiones con título, inicio y fin locales, descripción y ejercicios en orden; cada ejercicio
con su nombre de origen, su nota, su superserie y sus series; cada serie con su tipo, su
carga en kilos, sus repeticiones y su RPE. La primera fuente es `hevy_csv`. Otra app es otro
lector; el resto del sistema no cambia.

- El lector reconoce el formato por su cabecera exacta y las fechas por el idioma en que
  vienen. Un formato o una fecha que no reconoce **rechaza el archivo** con el motivo y la
  fila; nunca adivina.
- Lo que el modelo no admite se informa, no se descarta en silencio: una serie con
  distancia o duración llega como aviso de serie no soportada.

**3. El archivo se lee en la misma petición y no se guarda.** La API lo lee al recibirlo y
solo conserva lo que leyó. El original no va al almacén de objetos ni a ningún otro lugar.
El texto viaja tal cual, sin base64, con un tope de 4.000.000 de caracteres, por debajo del
límite de cuerpo de la plataforma. La exportación analizada pesa 0,9 MB.

**4. Importar tiene tres pasos: dejar en espera, confirmar y, si hace falta, deshacer.**

- **En espera** (`OP-EXE-027`): lo leído queda en una zona de espera de la persona, sin
  tocar su historial. La respuesta es una vista previa: cuántos entrenos y series, entre qué
  fechas, cuáles ya estaban y cómo se resolvió cada ejercicio. Subir el mismo archivo otra
  vez devuelve la misma importación. Una importación que no se confirma en 7 días expira y
  su zona de espera se borra.
- **Confirmar** (`OP-EXE-028`): los entrenos nuevos entran al historial **por tandas de a
  lo sumo 25**, del más antiguo al más reciente. Cada tanda es una transacción: entra
  entera o no entra. La primera fija la zona horaria y las elecciones de la persona y
  resuelve una sola vez el movimiento de cada nombre; la importación queda `committing`
  y la respuesta dice cuántos entrenos faltan. La app repite la llamada, con una clave
  nueva y la misma zona, hasta que no falta ninguno y la importación queda `committed`.
  Una llamada que continúa no lee elecciones: ya están resueltas, y una app que se reabre
  a mitad ya no las tiene. Lo que va entrando sale de la zona de espera.
- **Deshacer** (`OP-EXE-029`): anula todos los entrenos de esa importación con el motivo
  `import_undone`, con la semántica de anular de `ADR-038`. Lo que ya se compartió con un
  profesional se trata como cualquier anulación.
- **Leer** (`OP-EXE-030`): la persona ve sus importaciones, su estado y sus conteos.

**Por qué por tandas y no en el worker.** Confirmar un historial en una sola petición
tardaba unos 4 s con 340 entrenos en local y crece con el historial: una base de datos más
pequeña o un historial de varios miles pasa del tiempo que el balanceador espera (60 s) y
del que la plataforma admite para un comando. La alternativa obvia, responder enseguida y
procesarlo en el worker, obliga a que un proceso escriba los entrenos de la persona: o
actúa como ella, algo que hoy ningún proceso hace en tiempo de ejecución, o se abren las
políticas de esas tablas a escrituras del worker. Las dos debilitan la frontera de la
persona sobre sus datos de salud. Por tandas, cada escritura sigue siendo un comando firmado
por la propia persona, cada petición dura lo mismo sea cual sea el historial (unos 0,2 s
por tanda; la primera, que resuelve los nombres, unos 1,6 s) y la app muestra el avance
real. El costo es que, si la persona cierra la app a mitad, la importación queda a medias
hasta que vuelva y la continúe o la deshaga.

**5. Un entreno importado es un entreno terminado de la persona.** Se crea cerrado:
`completed` y `valid`, autónomo, sin relación ni organización, con el tipo de actividad y el
contrato de resultados de fuerza que usa un entreno libre. Su captura es
`capture_source = 'import'` y su procedencia, `person_declared` (`ADR-018`): la persona
declara lo que hizo, aunque lo haya anotado en otra app. El inicio y el fin son la hora
local del archivo en la zona horaria que la persona confirma al importar. La zona horaria
del teléfono se propone por defecto, porque el archivo no la trae.

**6. Lo importado cuenta para todo.** Récords, «la última vez», racha, número de entreno,
resumen de la semana y comparación de periodos leen el historial completo, y un entreno
importado es parte de él. Ningún lector lo filtra. El plan gratuito conserva su corte de un
mes de historial visible (`ADR-043`, `training_history_months`). Los récords se calculan
contra todo lo anterior, incluido lo que el corte no muestra.

**7. Cada ejercicio se resuelve contra el catálogo por capas.** El primer resultado que
aparece manda:

1. lo que la persona eligió para ese nombre en una importación anterior;
2. una tabla global curada de nombres de cada fuente a movimientos del catálogo;
3. una sugerencia por nombre o alias, que la persona confirma;
4. sin movimiento.

Un ejercicio sin movimiento **se importa igual**: conserva su nombre y su nota de origen, y
sus series cuentan en tiempo, series y kilos. No genera récords, porque un récord es de un
movimiento (`ADR-036`). La persona puede corregir cualquier resolución antes de confirmar,
y su elección se recuerda para la próxima importación.

**8. Un entreno no entra dos veces.** Cada entreno importado tiene una huella: su fuente,
su inicio local y su título. Mientras haya un entreno vivo con esa huella, el mismo entreno
no vuelve a entrar, aunque llegue en otro archivo. Así, subir una exportación más nueva
solo agrega lo que falta. Deshacer libera las huellas y el historial se puede volver a
importar.

**9. Lo importado dice de dónde vino.** El historial y el detalle de un entreno indican la
fuente («Importado de Hevy»), el título de origen y el nombre original de cada ejercicio
que quedó sin movimiento.

### Invariantes

- Nunca se guarda el archivo original ni una copia de él.
- La zona de espera solo la lee y la escribe su persona. Se vacía a medida que se confirma,
  y del todo al deshacer o expirar.
- Cada tanda es todo o nada. Una importación a medias (`committing`) tiene en el historial
  sus entrenos más antiguos completos, y nada más; se continúa o se deshace.
- La zona horaria y la resolución de cada nombre se fijan en la primera tanda y valen para
  todas.
- Un entreno importado nunca queda abierto, nunca tiene relación ni organización y nunca
  dice ser de un dispositivo ni de un profesional.
- Una huella viva identifica a lo sumo un entreno de la persona.
- Repetir cualquier comando con su misma clave no crea otro efecto (`ADR-025`).
- Una fecha que el lector no reconoce rechaza el archivo; ninguna fila se interpreta a
  medias.
- `allfit_api` no tiene privilegios sobre las tablas: todo pasa por funciones cerradas.

### Consecuencias

- `capture_source` admite `import` además de `manual` y `device`.
- Aparecen una zona de espera por persona, el vínculo de cada entreno importado con su
  importación y su título de origen, el nombre y la nota de origen de cada ejercicio, la
  tabla global de nombres externos y la memoria de elecciones de cada persona.
- Las lecturas de historial (`OP-EXE-014`, `OP-EXE-022`) y de detalle (`OP-EXE-023`)
  devuelven la fuente de cada entreno.
- Importar años de historial cambia de inmediato los récords y la racha de la persona. Es
  lo esperado: es su entrenamiento.
- La app repite la confirmación hasta terminar y muestra el avance. Una importación que
  quedó a medias se ofrece para continuar o deshacer al abrirla.
- La cobertura de la tabla global decide cuánto trabajo le queda a la persona al revisar.
  Se siembra con los nombres de las exportaciones analizadas y crece por curaduría.

### Lo que esta decisión no hace

- No conecta cuentas de terceros, no usa la API de Hevy ni sincroniza en segundo plano.
- No importa nada que no sea fuerza: ni distancia, ni duración por serie, ni cardio.
- No importa rutinas, programas, medidas corporales ni fotos.
- No construye todavía la cola de curaduría de nombres sin resolver en Backoffice.
- No agrega más fuentes que `hevy_csv`.
- No exporta desde Space.

### Escenarios de prueba obligatorios

1. Las exportaciones en inglés y en español del mismo historial producen el mismo modelo y
   los mismos instantes.
2. Un archivo con una cabecera ajena o una fecha ilegible se rechaza con el motivo y la
   fila, sin dejar nada en espera.
3. Dejar en espera no cambia el historial, los récords ni la racha.
4. Subir el mismo archivo dos veces devuelve la misma importación.
5. Confirmar crea los entrenos cerrados, con su fuente, por tandas de a lo sumo 25, cada una
   completa o nada; la última cierra la importación. Una tanda que continúa no cambia la
   zona horaria y escribe los nombres como los resolvió la primera.
6. Una segunda importación que repite entrenos solo agrega los nuevos.
7. Deshacer anula todos los entrenos de la importación, y después se pueden volver a
   importar.
8. Lo importado aparece en el historial, cuenta para récords y racha, y el plan gratuito
   sigue viendo un solo mes.
9. Un ejercicio sin movimiento conserva su nombre de origen y no genera récords.
10. La elección de una persona se recuerda en su próxima importación y no la ve nadie más.
11. Otra persona no puede leer, confirmar ni deshacer una importación ajena.
12. Repetir cualquier comando con la misma clave no crea otro efecto.
13. Deshacer una importación a medias anula lo que entró y descarta lo que faltaba.

---

## ADR-046 — An Allfit admin acts with the full authority of the platform

**Status:** accepted for V1. Decisions 1 and 3 are built; decisions 2, 4 and 5 are decided
and pending implementation.<br>
**Date:** 7 November 2026<br>
**Supersedes:** in `ADR-028`, items 2, 5 (for administrators), 6, 7, 9 (only its ban on
self-approval) and 19 (only the session limits); items 1, 8 and 16 in part; invariants 5 and 6
and the second half of invariant 3; mandatory scenarios 1, 5 and 6, and scenario 7 for
approvers. The same rules restated in `ADR-022` decision 3 and `ADR-026` are listed below,
under *Earlier decisions this changes*.<br>
**Ratifies:** every other item of `ADR-028`, and the guarantees listed under *What stays*.

### Context

`ADR-028` was written for a team that separates duties: one person asks for support access,
another approves it and a third audits it. The Allfit One Backoffice is run by two
administrators. Under `ADR-028`:

- **The base role granted nothing.** Each of the thirteen duties of `ADR-028` item 4 had to
  be granted by the other administrator, for at most 90 days, and recertified. A lapsed duty
  turned its screens into `403`. `manage_platform_access`, the duty that grants the rest, was
  held by both administrators with the same end date: had it lapsed for both, nobody could
  grant any duty from Backoffice again.
- **Break-glass could not open.** A restricted window (body, health, nutrition intake) needs
  two approvers besides the requester, which two administrators never have. A standard window
  needs the other administrator to approve it. Windows lasted 15 or 30 minutes.
- **The session ended after 15 idle minutes or 8 hours.**
- **Person search matched only an exact email, phone or identifier**, always with a case
  reference, and showed a masked contact and no name.

The controls that protect the person whose data is read do not depend on how many
administrators there are: the read is logged before content leaves, the person sees it,
break-glass never writes and some categories are never reachable. The controls that split
authority among staff do depend on it, and with two administrators they produced dead ends
instead of protection.

### Decision

**1. `allfit_admin` holds all thirteen duties for as long as the person holds the role.**
Granting the role brings every duty. An administrator receives no per-duty grant, and their
duties have no 90-day end and no recertification. Withdrawing the role still revokes every
duty, closes the person's break-glass windows and ends their sessions.

- The duties stay rows of `support.platform_duty_assignments`, with `basis = 'admin_role'`.
  Break-glass, invitations, recovery, plans and suspensions record the exact assignment a
  command acted under, so the role writes thirteen assignments instead of being read as a
  wildcard.
- A Backoffice session without an active `allfit_admin` role holds no duty.
- **Implementation: built** in PR 1 (code branch `feat/backoffice-admin-standing-duties`),
  migration `20261114090000_an_admin_holds_every_duty.sql`.

**2. Break-glass is self-approved.** An administrator opens a window by requesting it with
one of the closed purposes; nobody else approves it.

- Every window lasts 60 minutes, whatever its tier, body, health and nutrition included.
- Every read is still logged before content is returned, and the person still sees it.
- The other administrator reviews each exercised window afterwards. The reviewer is still
  never the requester or the subject.
- **Implementation: pending** (PR 2). Until it ships, the quorum and the durations of
  `ADR-028` item 7 still run.

**3. A Backoffice session lasts 60 idle minutes and 12 hours.** Password plus TOTP (AAL2)
still opens it. Withdrawing the role, recovering the factor or resetting the password still
ends it.

- **Implementation: built** in PR 1. PostgreSQL enforces both limits through
  `access_control.backoffice_idle_limit()` and `access_control.backoffice_session_lifetime()`.
  The API keeps matching constants, `BACKOFFICE_IDLE_LIMIT_MS` and
  `BACKOFFICE_SESSION_LIFETIME_SECONDS`, which only set the cookie's `Max-Age=43200` and the
  idle deadline it reports.

**4. Person search matches part of a name, an email or a phone.** Administrators see the
person's full name and contact. Every search is logged, with one access event for each
person it returns.

- **Implementation: pending** (PR 2). Until it ships, search still matches exactly and masks
  the contact.

**5. A case reference is optional for support reads**: the person search, the person file,
payments, billing follow-up and the recovery read. Account-recovery commands still require
one.

- **Implementation: pending** (PR 2).

### What stays

- Every read of personal data is logged before content is returned. If the log cannot be
  written, the read does not happen.
- Password plus TOTP (AAL2) opens every Backoffice session.
- The platform never acts as the person, and Backoffice never writes through break-glass.
- Authentication secrets and the forbidden categories — meal photos, documents and private
  notes — stay unreachable.
- History is append-only.
- Nobody grants themselves the base role, and the last active administrator cannot be
  withdrawn.
- The break-glass reviewer is independent of the requester and of the subject.
- Whoever requested or approved a read of a person cannot place a legal hold on that person
  (`privacy.asked_to_read_this_person`).

### What changes in ADR-028

| `ADR-028` | What it said | What changes | Status |
| --- | --- | --- | --- |
| Item 1 | Separation of duties and break-glass are mandatory | Duties are no longer split among administrators. Break-glass stays mandatory for content | Built for duties |
| Item 2 | `allfit_admin` only lets a person sign in | The role brings every duty (decision 1) | Built |
| Item 5 | Every duty lasts at most 90 days and is recertified | Not for a duty the role brings. A duty granted on its own (`basis = 'granted'`) keeps every rule of item 5 | Built |
| Item 6 | Exact search, case reference, masked contact, no name | Decisions 4 and 5 | Pending |
| Item 7 | One approver and 30 minutes, or two approvers and 15 minutes | Decision 2: self-approved, 60 minutes for every tier | Pending |
| Item 8 | Forbidden break-glass categories; identity and billing cases use minimized operations | The categories stay forbidden. Search and the person file show the full name and contact (decision 4) | Pending |
| Item 9 | Nobody self-approves | Decision 2. Exercising someone else's window, reviewing one's own request and writing through break-glass stay forbidden | Pending |
| Item 16 | The ceremony inserts two roles and their crossed `manage_platform_access` duties | It inserts only the two crossed roles; the roles bring the duties. See also *A stale ceremony* below | Built |
| Item 19 | Eight hours and fifteen idle minutes | Twelve hours and sixty idle minutes (decision 3). The rest of the item stays | Built |
| Invariant 3 | Without an independent actor, a sensitive function fails closed | Not for approving break-glass (decision 2). Review still needs an independent reviewer | Pending |
| Invariant 5 | The ordinary view returns no names or full contacts | Names and contacts, by decision 4. Personal content stays out | Pending |
| Invariant 6 | A partial approval, a rejection or an expired request never opens a window | The request itself opens the window (decision 2) | Pending |
| Scenario 1 | An admin without a duty signs in but runs nothing | A Backoffice session without an active admin role holds nothing | Built |
| Scenario 5 | Search has no name lookup and masks the contact | Decision 4 | Pending |
| Scenario 6 | One independent approver, or two for a restricted window | Decision 2 | Pending |
| Scenario 7 | A requester, approver or reviewer with a conflict is refused | Only for requester and reviewer: there is no separate approver | Pending |

Every other item, invariant and scenario of `ADR-028` stays. In particular:

- the closed catalogue of thirteen duties (item 4);
- the modes `A10`, `A11` and `A12`, still derived from the duty exercised (item 3), although
  one administrator now acts in all three;
- the five `support` tables (item 10) and the closed operations (item 11);
- logging before content (item 12);
- withdrawing the role revokes the session and every duty (item 13);
- no runtime owner, superuser or `BYPASSRLS` (item 14);
- the WorkOS Application, password plus TOTP, the session materialized in PostgreSQL, one
  TOTP per account and the hosted password reset (items 15, 17, 18 and 20 to 22);
- invariant 1 as a check: every operation still requires an active role and an active duty
  in its own transaction, and for an administrator the first brings the second;
- invariants 2, 4, 7 and 8, and scenarios 2 to 4 and 8 to 11.

### A stale ceremony

**`ADR-028` items 16 and 23 describe workflows that do not exist.** The code repository has
no `backoffice-bootstrap.yml`, no `backoffice-totp-recovery.yml` and no protected GitHub
environment for them; its workflows are `ci.yml`, `deploy-aws.yml` and
`deploy-database-aws.yml`.

- **The real bootstrap** is `infra/docker/migrator.sh bootstrap`, run as a one-off task of
  the migrator task definition on ECS with `SUBJECT_A`, `SUBJECT_B` and `CEREMONY_REFERENCE`.
  It connects with the database master credential, finds both people through their WorkOS
  accounts, which must already have a person (each administrator signed in to Studio once),
  and calls `support.bootstrap_backoffice_administrators` as `allfit_migrator` in one
  transaction. Since this decision it no longer takes
  `DUTY_DAYS`.
- **TOTP factor recovery** has a function, `identity.recover_backoffice_totp_factor`, but no
  migrator command or workflow runs it. It requires two administrators other than the
  subject, both holding `manage_platform_access`, which a team of two administrators cannot
  provide.

This decision changes neither ceremony beyond `DUTY_DAYS`. The gaps are recorded so that
nobody follows items 16 and 23 as written.

### Earlier decisions this changes

- **`ADR-026`:** item 6 (duties last at most 90 days and are recertified) no longer applies
  to administrators, and this is built. Pending with decision 2: the quorum and durations of
  item 8, the approver rules of item 10, the 30-minute pending request of item 11,
  invariants 4 and 5, the approval half of invariant 7, the costs that follow from them, and
  scenarios 5, 7 and 8 and the rejected or expired request of scenario 6. Item 12 stays: a
  window is reviewed by someone who did not request it.
- **`ADR-022` decision 3:** the approval by an `A12` other than the requester, and the rule
  that a single-person shift never self-approves, are replaced by decision 2; support
  metadata «sin nombres» is replaced by decision 4. Both are pending, and invariant 8 and
  scenarios 9, 10, 11 and 15 follow them. Only the requester exercises a window, every
  exercise is visible to the person, and break-glass never writes.

### Invariants

1. A person holds a duty through the role only while the role is active. Withdrawing the
   role revokes every duty in the same transaction.
2. A duty held through the role never lapses, and it is never suspended, revoked or
   recertified on its own. Its `basis` never changes.
3. A duty granted on its own lasts at most 90 days.
4. A person holds at most one current assignment of each duty in each basis.
5. A Backoffice session without an active `allfit_admin` holds no duty and no role.
6. The role is never self-granted, and the last active administrator is never withdrawn.
7. Every read of personal data is logged before content is returned.

### Consequences

- `support.platform_duty_assignments` gains `basis` (`granted` or `admin_role`). The window
  check depends on it, and the current-assignment unique index moves to
  `(person_id, duty_code, basis)`. A temporary duty granted before this decision lives beside
  the one the role brings and lapses on its own date; nothing is rewritten and nobody is
  recorded as having revoked it.
- A duty the role brings ends on `9999-12-31 00:00:00+00` rather than `infinity`, because the
  API's driver turns `infinity` into an invalid date and the contract declares a date-time.
  Clients show it as permanent, not as a date.
- Granting the role (`OP-SUP-007`) now brings the thirteen duties. Granting an administrator a
  duty (`OP-SUP-010`) converges on the one the role brought. Suspending, revoking or
  recertifying it is refused with `409 conflict`. Backoffice no longer offers a duty form,
  because every duty requires the role, and the role already brings it.
- Every duty requires `allfit_admin`, which brings all of them. A narrower staff profile
  would need a new role and a new decision.
- Once decision 2 is built, one administrator requests, opens and exercises a window alone.
  The safeguards move after the fact: the person sees every read, and the other administrator
  reviews it. The approved plan retires the separate approval (`OP-SUP-002`) in that change;
  past approvals stay as append-only history.
- A session left open in a browser stays usable for up to an hour of inactivity instead of
  fifteen minutes.

### Alternatives considered

- **Keep `ADR-028` and renew duties by hand.** This is the stopgap until PR 1 is deployed.
  It cannot open a restricted window at all, and every lapse is a `403` in front of the next
  operator.
- **Read the role as a wildcard, with no duty rows.** Rejected: the commands that record the
  assignment they acted under would have nothing to point at.
- **End standing duties at `infinity`.** Rejected for the driver and contract reason above.
- **Rewrite or revoke the temporary duties already in production.** Rejected: the index
  gains `basis`, so they coexist and lapse without anyone editing history.

### Mandatory test scenarios

1. The bootstrap ceremony and a role granted in Backoffice each bring exactly the thirteen
   duties, granted by whoever granted the role, never lapsing (`T-SUP-STANDING-01`,
   `T-IDN-BACKOFFICE-CEREMONIES-01`).
2. A Backoffice session without the role holds no duty and no role.
3. Granting an administrator a duty they hold through the role answers that duty and adds no
   row.
4. Suspending, revoking or recertifying a duty held through the role fails, and so does
   rewriting its `basis`.
5. A temporary duty from before lives beside the standing one; two temporary ones of the same
   duty never do; a granted duty still lasts at most 90 days.
6. A session idle for 59 minutes still carries its role and duties; one idle for 61 minutes
   does not, and the sweep revokes it, as it revokes one past 12 hours
   (`T-IDN-BACKOFFICE-SWEEP-01`).
7. Withdrawing the role revokes the thirteen duties.
8. *Pending with decision 2:* a request with a closed purpose opens a 60-minute window at
   once; a request without one, or for a forbidden category, is refused; the requester never
   reviews the window.
9. *Pending with decision 4:* a partial name or contact finds the person, and every returned
   person gets an access event.
10. *Pending with decision 5:* support reads work without a case reference, and
    account-recovery commands refuse one that is missing.
