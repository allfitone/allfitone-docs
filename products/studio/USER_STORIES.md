# Historias de usuario — Allfit Studio

**Estado:** alcance BETA ratificado; implementación en curso<br>
**Fecha:** 30 de julio de 2026; alcance ratificado el 17 de agosto de 2026<br>
**Producto:** la aplicación del profesional y la organización. Web.

Este documento es **autocontenido**: no hay que abrir ningún otro archivo para
entenderlo ni para construir a partir de él.

Las 86 historias forman el alcance BETA comprometido para el **31 de agosto de
2026**. El compromiso de alcance no afirma implementación: una historia cuenta
como completa solo cuando sus entregables BACK y FRONT están verificados y
fusionados en `main`. El despliegue de la BETA queda fuera de este compromiso.

---

## 1. Cómo se lee una historia

```markdown
### HU-STUDIO-045 — Título escrito desde quien actúa

**Como** <quién>
**quiero** <qué>
**para** <para qué>.

`E-STUDIO-07` · imprescindible

**Criterios**

1. <regla verificable, en lenguaje de negocio>
```

| Elemento | Qué significa |
| --- | --- |
| `HU-STUDIO-###` | Identificador estable. No se reutiliza nunca |
| `E-STUDIO-##` | Épica a la que pertenece |
| Prioridad | `imprescindible` sin esto no se lanza · `importante` debería estar · `después` puede esperar |
| Dependencias | Se declaran una sola vez en el grafo de la sección 6; son prerrequisitos directos, no historias meramente relacionadas |

## 2. Quién usa Allfit Studio

Cuatro roles, y no hay más. No se pueden crear roles a medida.

Toda organización activa tiene exactamente una membresía activa con rol **propietario**. Esa misma membresía puede tener además roles compatibles como admin o coach, pero la propiedad no se asigna ni se retira desde la gestión común de roles.

| Rol | Puede | No puede |
| --- | --- | --- |
| **Propietario** | Todo lo de admin, más transferir la propiedad, conectar el medio de cobro y cerrar el gimnasio | Ver datos de entrenamiento solo por ser propietario |
| **Admin** | Sedes, equipo, roles, invitaciones, relaciones, asignar profesionales, terminar relaciones, planes y cobros | Ver datos de entrenamiento sin ser el profesional asignado |
| **Coach** | Crear y publicar contenido, asignar programas, ver y acompañar a **las personas que tiene asignadas** | Terminar una relación —solo puede solicitarlo— ni ver el estado de pago de nadie |
| **Staff** | Invitar y consultar el directorio: nombre, estado de la relación y de la invitación | **Ningún** dato de entrenamiento, perfil, cuerpo, salud o nutrición |

## 3. La regla que atraviesa todo el producto

> **Gestionar una relación no es acceder a los datos.**

Un admin administra clientes sin ver un solo registro de entrenamiento. Para que
un profesional acceda a una categoría o ejecute una acción se aplica siempre
**LA FÓRMULA** completa:

1. Una relación vigente con esa persona.
2. Un grant vigente para la categoría, la finalidad y el nivel de acceso requeridos.
3. Que el profesional esté **asignado** a esa relación.
4. Que su membresía siga vigente.
5. Que su rol, sus capacidades y, cuando corresponda, sus credenciales permitan la acción.

Falta una, no puede acceder a la categoría ni ejecutar la acción.

La relación y los grants se deciden dentro del mismo flujo, pero son decisiones
distintas. **Aceptar la relación no concede por sí solo ninguna categoría.** La
persona ve antes qué se solicita y acepta o rechaza cada scope y nivel de acceso
de forma independiente. Todo puede confirmarse en una sola pantalla y con una
sola acción; no hace falta un segundo flujo de solicitudes después.

Lo que ella conserva es poder **revocar** una categoría cuando quiera, **ocultar**
una sesión concreta, y **ver quién miró sus datos**. Cada consulta queda
registrada con el nombre del profesional y ella la ve desde su aplicación.

Las categorías son independientes entre sí: entrenamiento, historial previo,
cuerpo, salud y las tres de nutrición. Cada una se acepta, rechaza, revoca o
vence por separado; decidir una no decide las demás.

## 4. Vocabulario

| Palabra | Qué es |
| --- | --- |
| **Programa** | El entrenamiento que se le asigna a alguien |
| **Plan** | Lo que la persona le paga al gimnasio |
| **Membresía** | Que alguien trabaja en la organización. Nunca lo que paga un cliente |
| **Plantilla de sesión** | Lo que en fuerza la interfaz llama "rutina" |
| **Movimiento** | Lo que en fuerza la interfaz llama "ejercicio" |
| **Scope** | Contrato versionado que define una categoría, su finalidad y los campos que cubre |
| **Grant** | Autorización de la persona para un scope, versión y nivel de acceso exactos |
| **Nivel de acceso** | Acciones autorizadas sobre un scope, como lectura o contribución |
| **Perfil profesional** | Perfil personal y portátil del profesional: presentación general, especialidades, experiencia y credenciales |

## 5. Qué no entra en esta versión

| Ausencia | Motivo |
| --- | --- |
| Agenda de clases, reservas, cupos, asistencia | Diferido |
| Marketplace y perfil público del gimnasio | Diferido |
| CRM y pipeline comercial | Diferido |
| Mensajería con clientes | Diferida |
| Cambiar colores, logo o tipografía de la aplicación | Marca blanca diferida |
| Copiloto de IA para el profesional | Diferido |
| Roles a medida o permisos por sede | Fuera de esta versión |
| Menores de 18 años | Fuera de esta versión |

## 6. Grafo de dependencias

Una arista `A → B` significa que la historia `A` **depende directamente de** `B`: `B` debe estar disponible antes de que `A` pueda cumplir todos sus criterios. `—` identifica una raíz. El grafo solo contiene dependencias de entrega entre historias de Studio; los estados de negocio producidos por Space, proveedores o procesos externos se mantienen como precondiciones en los criterios y contratos, no como aristas ficticias.

| Historia | Depende directamente de |
| --- | --- |
| `HU-STUDIO-001` | — |
| `HU-STUDIO-002` | `HU-STUDIO-001` |
| `HU-STUDIO-003` | — |
| `HU-STUDIO-004` | `HU-STUDIO-006` |
| `HU-STUDIO-005` | `HU-STUDIO-001` |
| `HU-STUDIO-006` | `HU-STUDIO-001` |
| `HU-STUDIO-007` | `HU-STUDIO-001` |
| `HU-STUDIO-008` | `HU-STUDIO-007` |
| `HU-STUDIO-009` | `HU-STUDIO-007` |
| `HU-STUDIO-010` | `HU-STUDIO-009` |
| `HU-STUDIO-011` | `HU-STUDIO-007` |
| `HU-STUDIO-012` | `HU-STUDIO-017` |
| `HU-STUDIO-013` | `HU-STUDIO-007` |
| `HU-STUDIO-014` | `HU-STUDIO-007` |
| `HU-STUDIO-015` | `HU-STUDIO-014` |
| `HU-STUDIO-016` | `HU-STUDIO-014` |
| `HU-STUDIO-017` | `HU-STUDIO-007` |
| `HU-STUDIO-018` | `HU-STUDIO-007` |
| `HU-STUDIO-019` | `HU-STUDIO-017`, `HU-STUDIO-018` |
| `HU-STUDIO-020` | `HU-STUDIO-017`, `HU-STUDIO-018` |
| `HU-STUDIO-021` | `HU-STUDIO-017` |
| `HU-STUDIO-022` | `HU-STUDIO-006` |
| `HU-STUDIO-023` | `HU-STUDIO-007` |
| `HU-STUDIO-024` | `HU-STUDIO-007` |
| `HU-STUDIO-025` | `HU-STUDIO-023` |
| `HU-STUDIO-026` | `HU-STUDIO-025` |
| `HU-STUDIO-027` | `HU-STUDIO-017`, `HU-STUDIO-025` |
| `HU-STUDIO-028` | `HU-STUDIO-027` |
| `HU-STUDIO-029` | `HU-STUDIO-027` |
| `HU-STUDIO-030` | `HU-STUDIO-029` |
| `HU-STUDIO-031` | `HU-STUDIO-029` |
| `HU-STUDIO-032` | `HU-STUDIO-025` |
| `HU-STUDIO-033` | `HU-STUDIO-027` |
| `HU-STUDIO-034` | `HU-STUDIO-001` |
| `HU-STUDIO-035` | `HU-STUDIO-025`, `HU-STUDIO-034` |
| `HU-STUDIO-036` | `HU-STUDIO-007` |
| `HU-STUDIO-037` | `HU-STUDIO-036` |
| `HU-STUDIO-038` | `HU-STUDIO-037` |
| `HU-STUDIO-039` | `HU-STUDIO-038` |
| `HU-STUDIO-040` | `HU-STUDIO-038` |
| `HU-STUDIO-041` | `HU-STUDIO-038` |
| `HU-STUDIO-042` | `HU-STUDIO-041` |
| `HU-STUDIO-043` | `HU-STUDIO-042` |
| `HU-STUDIO-044` | `HU-STUDIO-007` |
| `HU-STUDIO-045` | `HU-STUDIO-044` |
| `HU-STUDIO-046` | `HU-STUDIO-027`, `HU-STUDIO-035`, `HU-STUDIO-042` |
| `HU-STUDIO-047` | `HU-STUDIO-046` |
| `HU-STUDIO-048` | `HU-STUDIO-046` |
| `HU-STUDIO-049` | `HU-STUDIO-046` |
| `HU-STUDIO-050` | `HU-STUDIO-046` |
| `HU-STUDIO-051` | `HU-STUDIO-027`, `HU-STUDIO-035` |
| `HU-STUDIO-052` | `HU-STUDIO-027`, `HU-STUDIO-035` |
| `HU-STUDIO-053` | `HU-STUDIO-027`, `HU-STUDIO-035` |
| `HU-STUDIO-054` | `HU-STUDIO-027`, `HU-STUDIO-035` |
| `HU-STUDIO-055` | `HU-STUDIO-054` |
| `HU-STUDIO-056` | `HU-STUDIO-054` |
| `HU-STUDIO-057` | `HU-STUDIO-055` |
| `HU-STUDIO-058` | `HU-STUDIO-057` |
| `HU-STUDIO-059` | `HU-STUDIO-051` |
| `HU-STUDIO-060` | `HU-STUDIO-059` |
| `HU-STUDIO-061` | `HU-STUDIO-032` |
| `HU-STUDIO-062` | `HU-STUDIO-061` |
| `HU-STUDIO-063` | `HU-STUDIO-061` |
| `HU-STUDIO-064` | `HU-STUDIO-007` |
| `HU-STUDIO-065` | `HU-STUDIO-064` |
| `HU-STUDIO-066` | `HU-STUDIO-064` |
| `HU-STUDIO-067` | `HU-STUDIO-007` |
| `HU-STUDIO-068` | `HU-STUDIO-027`, `HU-STUDIO-035` |
| `HU-STUDIO-069` | `HU-STUDIO-068` |
| `HU-STUDIO-070` | `HU-STUDIO-071` |
| `HU-STUDIO-071` | `HU-STUDIO-027`, `HU-STUDIO-035` |
| `HU-STUDIO-072` | `HU-STUDIO-068` |
| `HU-STUDIO-073` | `HU-STUDIO-007` |
| `HU-STUDIO-074` | `HU-STUDIO-007` |
| `HU-STUDIO-075` | `HU-STUDIO-074` |
| `HU-STUDIO-076` | `HU-STUDIO-075` |
| `HU-STUDIO-077` | `HU-STUDIO-074` |
| `HU-STUDIO-078` | `HU-STUDIO-075` |
| `HU-STUDIO-079` | `HU-STUDIO-078` |
| `HU-STUDIO-080` | `HU-STUDIO-078` |
| `HU-STUDIO-081` | `HU-STUDIO-016`, `HU-STUDIO-017`, `HU-STUDIO-025`, `HU-STUDIO-027`, `HU-STUDIO-055` |
| `HU-STUDIO-082` | `HU-STUDIO-024` |
| `HU-STUDIO-083` | `HU-STUDIO-035`, `HU-STUDIO-047`, `HU-STUDIO-051`, `HU-STUDIO-054`, `HU-STUDIO-056` |
| `HU-STUDIO-084` | `HU-STUDIO-028`, `HU-STUDIO-032`, `HU-STUDIO-035` |
| `HU-STUDIO-085` | `HU-STUDIO-014` |
| `HU-STUDIO-086` | `HU-STUDIO-001`, `HU-STUDIO-085` |
| `HU-STUDIO-087` | `HU-STUDIO-023` |

---

## E-STUDIO-00 · Entrar

### HU-STUDIO-001 — Iniciar sesión

**Como** integrante de un gimnasio
**quiero** entrar a Allfit Studio
**para** trabajar.

`E-STUDIO-00` · imprescindible

**Criterios**

1. Entro con mi correo y contraseña.
2. Un intento fallido no me dice si el error fue el correo o la contraseña.
3. Si no pertenezco a ninguna organización, elijo entre crear mi propio espacio profesional o un equipo o centro; también puedo continuar más adelante mediante una invitación.
4. Mi sesión de Allfit Studio es independiente de la de la aplicación personal. Si soy coach y además entreno, son dos accesos distintos.
5. Si creo la cuenta desde Studio y todavía no tengo una persona vinculada, completo personalmente la acreditación adulta, las aceptaciones legales y mis datos identificativos básicos antes de acceder a cualquier operación profesional.
6. Studio nunca completa ese registro en nombre de otra persona ni usa el alta administrativa del proveedor de identidad.
7. Tras completar el registro, una membresía activa entra directamente al workspace y varias membresías presentan un selector de organización.

### HU-STUDIO-002 — Cerrar sesión

**Como** integrante de un gimnasio
**quiero** cerrar sesión
**para** dejar el equipo libre.

`E-STUDIO-00` · imprescindible

**Criterios**

1. Al cerrar sesión no queda nada consultable sin volver a entrar.
2. La sesión caduca sola tras un tiempo de inactividad.
3. Desde que se solicita el cierre, Studio desmonta el workspace y no vuelve a
   mostrar nombres, organizaciones ni datos protegidos durante la comprobación.
4. Si el navegador recuerda un cierre pero la cookie aún es válida, no recupera
   la sesión automáticamente: muestra una pantalla segura y exige completar el
   cierre antes de permitir un nuevo acceso.
5. Si la API confirma que la sesión ya no existe, vuelvo al acceso normal. Si no
   puede comprobarlo, permanezco bloqueado y puedo reintentar sin que se monte
   el workspace.
6. Completar la recuperación borra la cookie, conserva la idempotencia del
   logout y me obliga a pulsar de nuevo **Entrar a Studio**.
7. El cierre manual, por inactividad o desde otra pestaña mantiene cualquier
   invitación de equipo pendiente solo en esa pestaña para poder cambiar de
   cuenta sin perderla.

### HU-STUDIO-003 — Recuperar mi contraseña

**Como** integrante que olvidó su contraseña
**quiero** restablecerla
**para** volver a entrar.

`E-STUDIO-00` · imprescindible

**Criterios**

1. Pido el restablecimiento con mi correo y recibo un enlace temporal.
2. El mensaje es el mismo exista o no la cuenta.
3. Al cambiarla se cierran mis sesiones en otros dispositivos.

### HU-STUDIO-004 — Elegir en qué gimnasio estoy trabajando

**Como** profesional que trabaja en más de un gimnasio
**quiero** cambiar de organización dentro de la aplicación
**para** atender a cada uno sin confundirme.

`E-STUDIO-00` · imprescindible

**Criterios**

1. Si pertenezco a varias organizaciones, elijo en cuál estoy trabajando.
2. **Todo lo que veo corresponde solo a esa organización.** Nunca se mezclan clientes, contenido ni planes de dos gimnasios.
3. En todo momento tengo claro en cuál estoy.
4. Cambiar de organización **no me da permisos nuevos**: en cada una tengo los roles que tengo.

---

## E-STUDIO-01 · Perfil profesional y organización

### HU-STUDIO-005 — Completar mi perfil profesional

**Como** profesional
**quiero** completar mi perfil profesional personal
**para** que las personas sepan quién las atiende sin que pierda mi trayectoria al cambiar de organización.

`E-STUDIO-01` · imprescindible

**Criterios**

1. El perfil profesional pertenece a la persona y puede existir sin una organización.
2. Mi presentación contiene un titular profesional, una biografía, el año en que inicié mi práctica y una o más especialidades de un catálogo gobernado.
3. Los años de experiencia se calculan desde el año de inicio; no guardo ni actualizo manualmente un contador que quede obsoleto.
4. Puedo declarar credenciales profesionales individualmente. Cada credencial conserva identidad y ciclo de vida propios; no se guarda como un objeto anónimo dentro del perfil.
5. Una credencial declarada se muestra como **no verificada** hasta que el flujo competente de Allfit verifique esa credencial exacta. Studio no puede verificarla ni presentar el perfil completo como verificado.
6. Una verificación pertenece a una versión exacta de la credencial, tiene vigencia y puede vencer o revocarse sin alterar mi presentación, especialidades u otras credenciales.
7. La organización no crea, copia ni administra otro perfil profesional. Su contexto se limita a la membresía y sus roles vigentes.
8. La ficha que ve un cliente combina el perfil profesional personal vigente con la organización, la membresía y los roles efectivos desde sus fuentes canónicas, sin copiar el perfil a la organización ni exponer evidencia interna de verificación.
9. Si trabajo en dos gimnasios mantengo un solo perfil profesional, dos membresías y los roles que correspondan en cada una.
10. Al salir de una organización termina esa membresía y dejo de aparecer como parte de su equipo operativo. La organización no puede modificar ni borrar mi perfil personal o mis credenciales.
11. Actualizar el perfil personal se refleja en las vistas autorizadas de las organizaciones donde mantengo una membresía; no cambia mis membresías ni sus roles.
12. Completar el perfil no me habilita a ver datos de nadie: para eso se aplica **LA FÓRMULA** completa.
13. Studio no infiere que una persona sea profesional por crear una cuenta, ser propietaria de una organización o pertenecer a un espacio. La persona inicia expresamente la configuración de su perfil profesional.
14. Mientras no exista un perfil profesional, Studio no presenta formularios de especialidades ni credenciales como tareas pendientes. Declarar credenciales es opcional incluso después de crear el perfil.
15. Configurar el perfil profesional no forma parte del onboarding inicial. Studio no muestra accesos ni invitaciones para hacerlo mientras la persona completa su identidad, crea o selecciona su primer espacio y ve la confirmación **Listo**.

### HU-STUDIO-006 — Ver en qué gimnasios trabajo

**Como** persona que trabaja en uno o varios gimnasios
**quiero** ver dónde estoy vinculada y con qué rol
**para** saber qué puedo hacer en cada sitio.

`E-STUDIO-01` · imprescindible

**Criterios**

1. Veo cada gimnasio donde tengo un vínculo activo, con mi rol y desde cuándo.
2. Veo también los gimnasios de los que ya salí, y desde cuándo.
3. Mi rol en un gimnasio **no vale en otro**: en cada uno tengo lo que ese gimnasio me dio.
4. Esta vista no decide qué puedo hacer: cada acción se valida contra el gimnasio concreto.

### HU-STUDIO-007 — Crear mi organización

**Como** profesional que va a empezar a atender
**quiero** crear mi organización
**para** poder invitar personas, planificar y asignar.

`E-STUDIO-01` · imprescindible

**Criterios**

1. Cualquier persona con cuenta puede crear su organización. **No hace falta tener completo el perfil profesional**: sigue siendo personal y puede completarse antes o después, sin pertenecer a la organización.
2. Al crearla quedo como propietario y la transacción solo se confirma si la organización nace con exactamente un propietario activo.
3. Al crearla nace también mi membresía propietaria inicial, que referencia mi identidad y mi perfil profesional personal sin copiarlos; esa membresía puede recibir además otros roles compatibles.
4. Si trabajo solo, mi organización es mi propia práctica: sirve como frontera de operación y no implica tener una empresa constituida.
5. No existe una marca permanente de "independiente": esta misma organización puede incorporar equipo después sin cambiar de identidad ni migrar nada.
6. Reintentar no crea una segunda organización.

### HU-STUDIO-008 — Actualizar los datos de la organización

**Como** admin u owner
**quiero** actualizar la información de la organización
**para** mantenerla correcta.

`E-STUDIO-01` · imprescindible

**Criterios**

1. El `PATCH` es cerrado: solo permite modificar `display_name`, `legal_name` y `type_code`.
2. `responsible_party`, `id`, `status`, timestamps, `purpose` y `responsible_party_schema_version` son inmutables en autoservicio.
3. Todo cambio queda registrado con el valor anterior y el nuevo.
4. Cambiar el tipo de organización solo es posible si la transición está publicada en `organization_type_transitions`. Inicialmente solo se admiten `professional_practice → gym` y `professional_practice → studio`.
5. Incorporar personal **no** cambia el tipo automáticamente.
6. Toda lectura devuelve una revisión y un ETag fuerte `"organization:{id}:r{revision}"`. El `PATCH` exige `If-Match`: si falta devuelve `428`; si la revisión quedó atrás devuelve `409 stale-draft` sin perder cambios en silencio.

### HU-STUDIO-009 — Registrar una sede

**Como** admin u owner
**quiero** registrar las sedes de la organización
**para** tener ubicada la operación.

`E-STUDIO-01` · importante

**Criterios**

1. Una sede es información de ubicación básica.
2. Una sede **no** representa recursos reservables, capacidad, clases ni inventario.
3. Una sede **no** delimita permisos: no existe alcance de rol por sede en V1.
4. La sede expone `revision_number` y el ETag fuerte `"organization-site:{id}:r{revision}"` para sus escrituras posteriores.

### HU-STUDIO-010 — Actualizar o desactivar una sede

**Como** admin u owner
**quiero** editar o desactivar una sede
**para** reflejar cambios en la operación.

`E-STUDIO-01` · después

**Criterios**

1. Desactivar una sede no afecta relaciones, asignaciones ni historial.
2. El cambio queda registrado.
3. Editar o desactivar exige el `If-Match` de la sede; si falta devuelve `428` y si quedó atrás devuelve `409 stale-draft`.

### HU-STUDIO-011 — Consultar la organización

**Como** integrante de la organización
**quiero** consultar sus datos
**para** trabajar con contexto.

`E-STUDIO-01` · imprescindible

**Criterios**

1. Una organización nunca es legible por integrantes de otra.
2. Si no pertenezco, la respuesta es la misma que si no existiera: no puedo confirmar que existe.

### HU-STUDIO-012 — Transferir la propiedad del gimnasio

**Como** propietario que vende o se retira
**quiero** dejar el gimnasio en manos de otra persona
**para** que siga operando sin mí.

`E-STUDIO-01` · después

**Criterios**

1. El destinatario debe tener una membresía activa en el gimnasio.
2. La transferencia es atómica: al confirmar sigue existiendo exactamente un propietario activo, sin estados observables con cero o dos propietarios.
3. La transferencia es el único flujo que puede cambiar qué membresía tiene el rol de propietario.
4. Se bloquean la organización, las membresías involucradas y sus roles `owner`; se cierra el rol anterior y se abre el nuevo dentro de una sola transacción.
5. El propietario anterior conserva su membresía activa y cualquier rol no `owner`. Si no conserva otro rol, queda sin capacidades hasta una asignación explícita o su renuncia mediante HU-STUDIO-022; no recibe un rol residual implícito.

### HU-STUDIO-013 — Cerrar la organización

**Como** owner
**quiero** cerrar la organización
**para** terminar la operación de forma ordenada.

`E-STUDIO-01` · después

**Criterios**

1. Cerrar termina todas las relaciones activas con su efecto completo: se congela lo compartido, se desacoplan los programas y se cierran las membresías.
2. Cerrar **no elimina** el Fitness ID de nadie ni las sesiones de ninguna persona.
3. La organización conserva solo evidencia mínima, con una finalidad y un plazo; conservar no es mantener acceso cotidiano.
4. Si alguna terminación no se puede completar, no se cierra nada: no existe un cierre a medias.
5. El cierre se coordina en una sola transacción PostgreSQL mediante contratos públicos estrechos de Organizaciones, Relaciones, Privacidad, Planificación, Ejecución y Nutrición. Ejecución cancela propuestas de corrección pendientes y Nutrición cancela propuestas nutricionales pendientes. Ningún dominio escribe directamente tablas de otro dominio.
6. Si falla cualquier contrato público, también se revierten las cancelaciones y el estado organizacional: no queda un cierre parcial.

---

## E-STUDIO-02 · Equipo, roles y membresías

### HU-STUDIO-014 — Invitar a alguien al equipo

**Como** admin, owner o staff
**quiero** invitar a una persona a integrarse al equipo
**para** que trabaje con nosotros.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Invito por email. **Nunca** puedo invitar seleccionando una persona existente del sistema.
2. La invitación **no crea** cuenta, persona, perfil ni membresía: solo transporta una propuesta.
3. No aprendo si ese contacto ya tiene cuenta en Allfit.
4. Si vuelvo a invitar al mismo contacto con la misma propuesta, se reutiliza la invitación vigente en lugar de crear otra.
5. Si falla el envío del correo, la invitación sigue siendo válida y puede reintentarse sin crear otra propuesta.
6. La invitación vence a los siete días y su enlace abre exclusivamente Allfit Studio.

**Corte implementado:** emisión y entrega por correo tienen gates independientes.
La resolución y decisión se realizan en Studio mediante `HU-STUDIO-085` y
`HU-STUDIO-086`; no dependen de historias de Space.

### HU-STUDIO-015 — Revocar una invitación

**Como** admin, owner o staff
**quiero** revocar una invitación que emitimos
**para** cancelar una propuesta que ya no aplica.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Revocar cancela la invitación y las propuestas que siguen pendientes.
2. Revocar **no deshace** lo que la persona ya aceptó: para eso hay que terminar el vínculo correspondiente.
3. Si la aceptación llegó primero, gana la aceptación.
4. Queda evidencia de que la invitación existió.

### HU-STUDIO-016 — Ver las invitaciones emitidas

**Como** admin, owner o staff
**quiero** ver el estado de nuestras invitaciones
**para** hacer seguimiento.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Veo el estado **por propuesta**, no una aceptación global.
2. Mientras la invitación siga pendiente, no puedo saber si el contacto ya tiene cuenta en Allfit.
3. Puedo filtrar por estado, avanzar por páginas y ver rol propuesto, vencimiento y correo completo porque soy un integrante autorizado de la organización.
4. Los estados terminales son aceptada, rechazada, revocada y vencida; nunca se confunden con una invitación pendiente.

### HU-STUDIO-085 — Consultar una invitación de equipo

**Como** persona que recibió una invitación para trabajar en una organización
**quiero** consultar en Studio quién invita, el rol propuesto y el vencimiento
**para** decidir con información sin exponer el destinatario.

`E-STUDIO-02` · imprescindible

**Criterios**

1. El enlace abre `studio.allfit.one/invitations`; el token viaja en el fragmento, se retira inmediatamente de la barra y no aparece en paths, query strings, logs ni referrers.
2. Puedo consultar la organización, la parte responsable, el rol propuesto y el vencimiento antes de iniciar sesión, pero nunca veo el correo destinatario.
3. Consultar no acepta ni crea cuenta, persona, membresía, perfil de cliente, relación, scope o grant.
4. Una invitación inválida, vencida, revocada o consumida produce el mismo resultado y no revela su estado real.
5. El token se conserva solo en la pestaña durante login, cambio de cuenta o activación, y se elimina al decidir o alcanzar un estado terminal.

### HU-STUDIO-086 — Aceptar o rechazar una invitación de equipo

**Como** persona invitada a trabajar en una organización
**quiero** aceptar o rechazar la propuesta desde Studio
**para** decidir si me incorporo a ese equipo.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Solo puedo decidir autenticado con el mismo correo verificado al que se envió la invitación; si uso otra cuenta puedo cerrar sesión y cambiarla sin que Studio revele el destinatario.
2. Si mi cuenta aún no tiene una persona activa, completo primero la activación y luego regreso a la invitación; activarme no equivale a aceptarla.
3. Aceptar crea una membresía con el rol propuesto. Si ya tengo una membresía activa, conserva su identidad y fecha de ingreso y añade solo el rol faltante; una membresía terminada no se reutiliza.
4. Rechazar completa la invitación sin crear membresía ni rol.
5. Aceptar nunca crea perfil de cliente, relación profesional, scope, grant ni acceso a datos de clientes.
6. Reintentar el mismo comando devuelve el mismo resultado. En una carrera con revocación gana la primera operación confirmada.
7. Tras aceptar entro a la organización; tras rechazar veo la confirmación y puedo regresar a Studio.

### HU-STUDIO-017 — Ver el equipo de la organización

**Como** admin, owner o staff
**quiero** ver quiénes integran la organización
**para** administrar el equipo.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Veo la identidad y el estado de cada integrante.
2. **No veo ningún dato fitness de ellos**, aunque también sean personas con Fitness ID.
3. Si un integrante además es cliente de la organización, aquí aparece solo por su membresía; su condición de cliente vive en otro lugar y no se mezcla.

### HU-STUDIO-018 — Conocer los roles y lo que permite cada uno

**Como** integrante de la organización
**quiero** consultar los roles disponibles y sus capacidades
**para** asignar permisos con criterio.

`E-STUDIO-02` · importante

**Criterios**

1. Existen cuatro roles y solo cuatro: propietario, administrador, coach y staff.
2. No se pueden crear roles personalizados.
3. Queda explícito que staff nunca accede a datos fitness.

### HU-STUDIO-019 — Asignar un rol

**Como** admin u owner
**quiero** asignar un rol a un integrante
**para** habilitarle lo que necesita.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Esta operación solo permite otorgar administrador, coach o staff. El rol de propietario se rechaza y solo puede cambiar mediante una transferencia de propiedad.
2. **Un rol no es un consentimiento:** dar el rol de coach no da acceso a los datos de ninguna persona.
3. El efecto es inmediato y no retroactivo: no amplía nada de lo ya ocurrido.
4. Asignar un rol que ya tiene no lo duplica.
5. Un cambio de permisos nunca se confirma desde información desactualizada.

### HU-STUDIO-020 — Retirar un rol

**Como** admin u owner
**quiero** retirar un rol
**para** quitar permisos que ya no corresponden.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Esta operación no permite retirar el rol de propietario; solo una transferencia de propiedad puede cambiarlo.
2. Al retirar el rol de coach, sus asignaciones sobre relaciones dejan de tener efecto: el permiso de la persona sobrevive, pero ese profesional deja de poder ejercerlo.
3. Retirar administrador o staff no cierra asignaciones profesionales cuando la membresía conserva el rol coach vigente.
4. La pérdida de acceso es inmediata, sin ventana de gracia.

### HU-STUDIO-021 — Dar de baja a un integrante

**Como** admin u owner
**quiero** terminar la membresía de un integrante
**para** cerrar su participación.

`E-STUDIO-02` · imprescindible

**Criterios**

1. Se cierran su membresía, sus roles y todas sus asignaciones sobre relaciones.
2. **No termina las relaciones de servicio de la organización**: quedan sin profesional responsable y hay que reasignarlas.
3. Su autoría sobre lo que escribió se conserva.
4. No se puede dar de baja a una membresía mientras tenga el rol de propietario; primero debe completarse una transferencia de propiedad.

### HU-STUDIO-022 — Renunciar a mi membresía

**Como** integrante con membresía activa que no es owner
**quiero** renunciar a mi membresía
**para** dejar de trabajar en esta organización.

`E-STUDIO-02` · después

**Criterios**

1. Un propietario no puede renunciar sin transferir la propiedad antes.
2. Puedo renunciar aunque ya no conserve ningún rol; basta que la membresía propia siga activa y no sea owner.
3. Al renunciar, todas mis asignaciones efectivas se cierran y se notifica a la administración.
4. Mi autoría sobre lo que registré se conserva.

---

## E-STUDIO-03 · Invitación de personas y directorio

### HU-STUDIO-023 — Invitar a una persona como cliente

**Como** coach, admin, owner o staff
**quiero** invitar a una persona a iniciar una relación con nosotros
**para** empezar a atenderla.

`E-STUDIO-03` · imprescindible

**Criterios**

1. Invito por email o celular. Nunca puedo crear la cuenta, la persona ni el Fitness ID de alguien.
2. Puedo proponer la relación y, opcionalmente, un programa inicial. **Cada propuesta se decidirá por separado.**
3. La invitación presenta por separado cada scope solicitado, su finalidad, la versión de su contrato y el nivel de acceso solicitado.
4. La persona acepta o rechaza cada scope de forma independiente dentro de la misma confirmación. **Aceptar la relación no concede automáticamente ningún scope.**
5. La persona puede aceptar la relación y rechazar todos los scopes. La relación queda vigente, pero ningún profesional accede a su Fitness ID y el programa inicial no se materializa.
6. Si propongo un programa, su versión debe estar publicada y ser nuestra; si no, se rechaza la invitación completa.
7. El programa inicial solo se materializa si la persona acepta la relación, acepta esa propuesta y concede `relationship_training` con el nivel requerido. Si falta una condición, el programa no se materializa.
8. Hasta que la persona acepte, no existe relación, grant, asignación ni persona provisional en nuestro sistema.
9. Quien acepta entra con **Allfit Pro** mientras la relación siga vigente y el gimnasio esté activo. No hay nada que habilitar persona por persona.
10. Solo puedo invitar mientras quede cupo (`HU-STUDIO-087`).

### HU-STUDIO-024 — Ver el directorio de personas

**Como** integrante de la organización
**quiero** ver las personas vinculadas con nosotros
**para** encontrar a quién necesito.

`E-STUDIO-03` · imprescindible

**Criterios**

1. Como coach veo **solo** las personas que tengo asignadas, como responsable o como suplente.
2. Como staff veo el directorio completo: nombre, estado de relación y estado de invitación, **y nada más**.
3. El directorio no muestra ningún dato fitness, ni siquiera agregado o resumido.
4. La existencia de un permiso se muestra como estado, nunca como contenido.
5. Consultar el directorio no consume ningún permiso de la persona.

### HU-STUDIO-025 — Consultar el estado de una relación

**Como** integrante de la organización
**quiero** ver en qué estado está una relación
**para** saber qué podemos hacer.

`E-STUDIO-03` · imprescindible

**Criterios**

1. Veo el estado del vínculo, quién es el profesional responsable y las suplencias.
2. Veo **qué permisos están concedidos y en qué versión**, pero no el contenido que amparan.
3. Saber que existe un permiso de contexto de salud no es leer el contexto de salud.

### HU-STUDIO-026 — Ver la historia de una relación

**Como** admin u owner
**quiero** consultar la historia de una relación
**para** entender qué pasó y cuándo.

`E-STUDIO-03` · importante

**Criterios**

1. Veo altas, cambios de responsable, suplencias, consentimientos y terminación, en orden.
2. El registro no se edita ni se borra.
3. Solo veo el motivo de terminación si lo declaramos nosotros.

### HU-STUDIO-087 — Respetar el cupo de invitados del gimnasio

**Como** owner o admin
**quiero** saber cuántas personas puedo tener y que el sistema no me deje pasarme
**para** que lo que usamos corresponda a lo que contratamos con Allfit.

`E-STUDIO-03` · imprescindible

*Historia nueva del 1 de octubre de 2026, todavía sin construir. Cada persona que invitamos entra con Pro, así que el cupo es lo que Allfit nos vendió.*

**Criterios**

1. El gimnasio tiene un **cupo de personas** que fija Allfit al crearlo o después (`HU-BO-034`). Nosotros no lo cambiamos.
2. Veo cuántas personas ocupan el cupo y cuántos lugares quedan.
3. Ocupan lugar las relaciones vigentes y las invitaciones sin responder. Una invitación rechazada, vencida o revocada libera su lugar, y también una relación terminada.
4. Sin lugares libres no puedo enviar invitaciones nuevas, y se me dice por qué antes de escribirlas.
5. Si la persona acepta cuando el cupo ya se llenó por otra vía, la aceptación se rechaza y nadie queda a medias.
6. Que Allfit baje el cupo **nunca termina relaciones existentes**: solo impide invitaciones nuevas hasta que haya lugar.
7. La protección es de **base de datos**: el cupo se valida en la misma transacción que crea la invitación y que la acepta, para que dos invitaciones simultáneas no lo superen.

---

## E-STUDIO-04 · Responsable, suplencias y terminación

### HU-STUDIO-027 — Asignar el profesional responsable

**Como** admin u owner
**quiero** asignar el profesional responsable de una relación
**para** que alguien concreto atienda a esa persona.

`E-STUDIO-04` · imprescindible

**Criterios**

1. Solo puedo asignar a alguien con membresía vigente **en esta organización** y rol de coach.
2. Un profesional de otra organización nunca puede asignarse, aunque la persona sea cliente de ambas.
3. Hay **un solo responsable efectivo** a la vez.
4. Asignar **no concede datos**: sin el permiso de la persona, el responsable no ve nada.

### HU-STUDIO-028 — Cambiar el profesional responsable

**Como** admin u owner
**quiero** reasignar la relación a otro profesional
**para** cubrir una salida o redistribuir la carga.

`E-STUDIO-04` · imprescindible

**Criterios**

1. El permiso de la persona se conserva, porque no cambian la organización, la parte responsable, la finalidad ni la categoría. Lo que cambia es **quién puede ejercerlo**.
2. El profesional anterior pierde el acceso de inmediato y conserva la autoría de lo que registró.
3. **La persona es notificada.** Una reasignación nunca es silenciosa.
4. Si la notificación no puede quedar encolada, la reasignación no se confirma.

### HU-STUDIO-029 — Proponer una suplencia

**Como** coach responsable, admin u owner
**quiero** proponer a otro profesional para cubrir a un cliente por un tiempo
**para** que nadie se quede sin atención cuando el titular no está.

`E-STUDIO-04` · importante

**Criterios**

1. Solo puedo proponer a alguien de mi organización con membresía vigente y rol de coach.
2. Toda propuesta indica el profesional, la fecha de inicio y una fecha de fin obligatoria.
3. La propuesta queda `pending_person_decision` y se notifica a la persona atendida. **Proponer no concede acceso.**
4. Hasta que la persona acepte, el profesional propuesto no satisface **LA FÓRMULA** y no puede leer ni escribir nada de esa relación. El silencio nunca equivale a aceptación.
5. Si la persona acepta, la suplencia entra en vigor en la fecha propuesta o en el instante de aceptación, lo que ocurra después. Nunca produce acceso retroactivo.
6. Si la persona rechaza, la relación y el profesional titular no cambian.
7. Aceptar la suplencia no crea ni amplía grants. El suplente nunca accede a más que el titular y puede acceder a menos si sus capacidades o credenciales no permiten una acción.
8. La suplencia caduca automáticamente en su fecha de fin y el acceso se corta sin depender de que un proceso posterior actualice su estado.
9. Reintentar la propuesta no crea otra suplencia pendiente equivalente y toda decisión queda en el historial.

### HU-STUDIO-030 — Terminar una suplencia

**Como** admin u owner
**quiero** terminar una suplencia antes de su fecha
**para** devolver la atención al titular.

`E-STUDIO-04` · importante

**Criterios**

1. El acceso del suplente se corta de inmediato.
2. No afecta la relación ni al profesional titular.
3. Lo que el suplente haya registrado se conserva con su autoría.
4. La persona atendida también puede terminar la suplencia desde Allfit Space.

### HU-STUDIO-031 — Ver las suplencias de una relación

**Como** coach, admin u owner
**quiero** ver quién ha cubierto a un cliente y cuándo
**para** tener claro quién lo atendió.

`E-STUDIO-04` · después

**Criterios**

1. Veo las suplencias vigentes y las pasadas, con sus fechas.
2. Una suplencia vencida o terminada **no habilita ningún acceso**, aunque siga apareciendo en el historial.

### HU-STUDIO-032 — Terminar una relación

**Como** admin u owner
**quiero** terminar una relación de servicio
**para** cerrar la atención a esa persona.

`E-STUDIO-04` · imprescindible

**Criterios**

1. El efecto es inmediato, sin preaviso.
2. Perdemos el acceso en vivo y la posibilidad de escribir cualquier cosa sobre esa persona.
3. Conservamos una **vista congelada** de lo que ya nos había compartido, hasta el instante del corte. Nada posterior es visible para nosotros, nunca.
4. Para consultar esa vista congelada hace falta abrir un caso justificado; ningún rol la abre por sí solo.
5. La persona sale de nuestros listados operativos normales.
6. Su programa queda desacoplado y esperando su decisión; nosotros no decidimos por ella.
7. Las propuestas de corrección pendientes se cancelan.
8. Un coach **no puede** ejecutar esta operación.
9. Si algún paso falla, se revierte todo: no existe una terminación a medias.

### HU-STUDIO-033 — Solicitar la terminación de una relación

**Como** coach responsable **sin** poder de terminación
**quiero** solicitarle a la administración que termine una relación
**para** dejar de atender a esa persona.

`E-STUDIO-04` · después

**Criterios**

1. Mi solicitud **no cambia el estado** de la relación ni corta ningún acceso.
2. Solo la administración de la organización o la propia persona pueden terminarla.
3. **Si además soy admin u owner, no solicito nada: termino la relación directamente.** Esta solicitud existe únicamente para el coach que no tiene poder de terminación, y el sistema me lo impide si sí lo tengo.
4. No puedo dejar dos solicitudes pendientes sobre la misma relación. La protección es de **base de datos**, no de la aplicación: un índice único parcial sobre las solicitudes pendientes lo hace imposible.
5. La persona atendida **no ve** mi solicitud: es deliberación interna de la organización.
6. Si no quiero seguir atendiendo, puedo además renunciar a mi asignación: la relación queda sin responsable pero sigue vigente.
7. Al resolverse queda registrado quién la resolvió y cuándo.

---

## E-STUDIO-05 · Qué nos autorizó cada persona

Un coach no inicia un segundo flujo de solicitudes después de la invitación. La
persona decide la relación y cada scope de forma independiente dentro de la
misma confirmación. Desde ese momento el coach puede trabajar únicamente con los
grants que quedaron vigentes.

Lo que queda de este lado es solo saber qué autorizó y qué no.

### HU-STUDIO-034 — Saber qué abarca cada categoría de información

**Como** integrante del gimnasio
**quiero** entender qué cubre cada categoría de datos
**para** saber qué puedo consultar de mis clientes.

`E-STUDIO-05` · importante

**Criterios**

1. Puedo leer qué incluye y qué excluye cada categoría: entrenamiento, historial previo, cuerpo, salud y las de nutrición.
2. La definición es fija y no cambia bajo mis pies.

### HU-STUDIO-035 — Ver qué nos autorizó cada persona

**Como** coach, admin u owner
**quiero** ver qué categorías nos autorizó cada cliente
**para** saber con qué puedo contar.

`E-STUDIO-05` · imprescindible

**Criterios**

1. Veo qué autorizó cada persona y desde cuándo.
2. Como coach veo solo a **las personas que tengo asignadas**.
3. Muestra el **estado**, no el contenido: saber que autorizó su contexto de salud no es ver su contexto de salud.
4. Si alguien revocó algo, lo veo aquí y entiendo por qué dejé de ver esa parte.
5. Esta información nunca se usa desde datos desactualizados para decidir si puedo leer algo.

---

## E-STUDIO-06 · Contenido versionado

### HU-STUDIO-036 — Crear una plantilla de sesión

**Como** coach, admin u owner
**quiero** crear una plantilla de sesión de la organización
**para** reutilizarla en nuestros programas.

`E-STUDIO-06` · imprescindible

**Criterios**

1. La plantilla pertenece a la organización, no a mí, aunque yo quede registrado como su autor.
2. La plantilla existe como identidad estable antes de publicar nada.
3. Una plantilla tiene un solo dueño: la organización **o** una persona, nunca los dos.

### HU-STUDIO-037 — Editar el borrador de una plantilla

**Como** coach, admin u owner
**quiero** editar el borrador
**para** construir la sesión antes de publicarla.

`E-STUDIO-06` · imprescindible

**Criterios**

1. Solo el borrador es editable.
2. Un borrador **nunca** puede referenciarse desde un programa ni asignarse.
3. Los objetivos de cada paso deben ser compatibles con el tipo de actividad declarado.
4. Si dos personas editan a la vez, una recibe el estado actual y un aviso de conflicto en lugar de perder su trabajo.

### HU-STUDIO-038 — Publicar una versión de plantilla

**Como** coach, admin u owner
**quiero** publicar la plantilla
**para** poder usarla en programas.

`E-STUDIO-06` · imprescindible

**Criterios**

1. La versión publicada es completa e **inmutable**: no se edita nunca; corregir exige publicar otra.
2. Publicar **no** actualiza los programas existentes ni las asignaciones históricas: quien apuntaba a la v1 sigue en la v1.
3. Si el borrador está incompleto, se me devuelve la lista de lo que falta.
4. Publicar dos veces el mismo contenido no crea dos versiones.

### HU-STUDIO-039 — Partir de una versión publicada

**Como** coach, admin u owner
**quiero** crear un borrador a partir de una versión publicada
**para** hacer una variante sin rehacerla.

`E-STUDIO-06` · después

**Criterios**

1. El borrador conserva de qué versión proviene.
2. No puedo derivar de contenido de otra organización: en V1 no existe contenido compartido entre organizaciones.

### HU-STUDIO-040 — Retirar una versión de plantilla

**Como** admin u owner
**quiero** retirar una versión
**para** que no se use en contenido nuevo.

`E-STUDIO-06` · después

**Criterios**

1. Retirar impide componer contenido nuevo con esa versión.
2. **No altera** programas publicados, asignaciones activas ni sesiones planificadas: el historial es intocable.

### HU-STUDIO-041 — Crear y editar un programa

**Como** coach, admin u owner
**quiero** armar un programa combinando plantillas
**para** estructurar varias semanas de entrenamiento.

`E-STUDIO-06` · imprescindible

**Criterios**

1. Cada posición apunta a una **versión exacta** de plantilla. Nunca a "la última".
2. No puedo componer con un borrador de plantilla.
3. Si el programa usa versiones retiradas puedo seguir editándolo, pero al publicar se me advierte.

### HU-STUDIO-042 — Publicar una versión de programa

**Como** coach, admin u owner
**quiero** publicar el programa
**para** poder asignarlo a una persona.

`E-STUDIO-06` · imprescindible

**Criterios**

1. Cada posición debe apuntar a una versión de plantilla **publicada**.
2. La versión publicada es inmutable; adoptar una plantilla nueva exige publicar otra versión del programa.
3. Un programa v1 fijado a la plantilla v1 sigue en v1 aunque exista una v2 de la plantilla.
4. Publicaciones equivalentes convergen a una sola versión.

### HU-STUDIO-043 — Retirar una versión de programa

**Como** admin u owner
**quiero** retirar una versión de programa
**para** que no se asigne más.

`E-STUDIO-06` · después

**Criterios**

1. Impide asignaciones nuevas.
2. No cancela ni altera las asignaciones vigentes ni sus sesiones.

### HU-STUDIO-044 — Ver el contenido de la organización

**Como** coach, admin u owner
**quiero** ver nuestras plantillas y programas
**para** encontrar y reutilizar lo que ya tenemos.

`E-STUDIO-06` · imprescindible

**Criterios**

1. Se distingue explícitamente el borrador de las versiones publicadas.
2. Solo veo contenido de mi organización. **Nunca** de otra.
3. Nuestros programas no son visibles para otra organización bajo ningún permiso de historial previo de una persona.

### HU-STUDIO-045 — Consultar una versión publicada

**Como** coach, admin u owner
**quiero** leer una versión publicada completa
**para** revisar qué contiene.

`E-STUDIO-06` · importante

**Criterios**

1. Solo puedo leer versiones de mi contexto: mi organización.
2. Es contenido inmutable: lo que leo hoy es lo que se ejecutó ayer.

---

## E-STUDIO-07 · Asignación y seguimiento del plan

### HU-STUDIO-046 — Asignar un programa a una persona

**Como** coach con asignación efectiva
**quiero** asignarle a una persona una versión de programa
**para** que empiece a entrenar con nuestro plan.

`E-STUDIO-07` · imprescindible

**Criterios**

1. **Sin el permiso de entrenamiento vigente no puedo asignar nada.** Se me dice exactamente qué permiso falta.
2. La versión debe estar publicada, no retirada, y ser de nuestra organización.
3. Toda la agenda de la persona queda creada **en el momento de asignar**, resuelta en la zona horaria de ella, no en la nuestra. No depende de que un proceso corra más tarde.
4. La relación que originó la asignación queda registrada y no cambia nunca.
5. No hay límite de programas simultáneos: si se solapan, se advierte pero no se bloquea.
6. Reintentar no crea una segunda asignación ni duplica sesiones.

### HU-STUDIO-047 — Ver los programas asignados a una persona

**Como** coach o suplente con asignación efectiva
**quiero** ver los programas que le asignamos
**para** hacer seguimiento.

`E-STUDIO-07` · imprescindible

**Criterios**

1. Solo veo las asignaciones **originadas por esta relación**.
2. **No veo** los programas que la persona se asignó por su cuenta, ni los que le asignó otra organización.
3. Después de la terminación dejo de ver la asignación desacoplada y sus sesiones posteriores.
4. Cada consulta queda registrada y la persona puede verla.

### HU-STUDIO-048 — Reprogramar una sesión

**Como** coach o suplente con asignación efectiva
**quiero** mover una sesión de fecha
**para** ajustarme a la disponibilidad de la persona.

`E-STUDIO-07` · importante

**Criterios**

1. Solo puedo reprogramar sesiones de un programa que **administramos nosotros**.
2. La persona no reprograma lo que un profesional administra; ese calendario lo controla el coach.
3. No puedo mover una sesión que ya se empezó.
4. En un programa personal o desacoplado no hay administrador y esta acción no aplica.
5. Reprogramar **nunca** altera el contenido ni los objetivos de la versión.

### HU-STUDIO-049 — Ajustar la prescripción para una persona

**Como** coach o suplente con asignación efectiva
**quiero** adaptar cargas u objetivos para esta persona
**para** personalizar sin romper el programa maestro.

`E-STUDIO-07` · importante

**Criterios**

1. La adaptación **no edita** la plantilla ni el programa publicados: vive en la asignación de esa persona.
2. Los ajustes quedan registrados con su autoría.
3. Los ajustes se conservan si la relación termina y el programa se desacopla.
4. Solo puedo hacerlo mientras administremos esa asignación.

### HU-STUDIO-050 — Cancelar una asignación

**Como** coach con asignación efectiva, admin u owner
**quiero** cancelar un programa que administramos
**para** detenerlo cuando ya no aplica.

`E-STUDIO-07` · importante

**Criterios**

1. Se cancelan **solo** las sesiones futuras que no se empezaron.
2. Cancelar **no borra** historial: lo ya ejecutado y las sesiones pasadas permanecen.
3. La asignación no desaparece del historial personal de la persona.

---

## E-STUDIO-08 · Lectura autorizada de datos de la persona

Todas estas historias exigen la **FÓRMULA** completa y **registran el acceso con
la identidad real** de quien consulta. La persona puede ver ese registro.

### HU-STUDIO-051 — Consultar el perfil de entrenamiento autorizado

**Como** coach o suplente con asignación efectiva
**quiero** ver el contexto de entrenamiento de la persona
**para** planificar con información real.

`E-STUDIO-08` · imprescindible

**Criterios**

1. Sin el permiso de entrenamiento vigente no veo nada.
2. Veo cada dato con su origen: si lo declaró la persona, si lo observó un profesional, si lo midió un dispositivo o si lo calculó el sistema.
3. **No veo** ningún atributo corporal ni de salud desde aquí: son categorías con su propio permiso.
4. Recibo el conjunto de campos de la **versión congelada en el permiso**, no la última publicada. Dos organizaciones pueden ver campos distintos de la misma persona.

### HU-STUDIO-052 — Consultar el progreso corporal autorizado

**Como** coach o suplente con asignación efectiva
**quiero** ver las medidas y fotos que la persona compartió
**para** seguir su evolución física.

`E-STUDIO-08` · importante

**Criterios**

1. Exige el permiso de progreso corporal, que es independiente del de entrenamiento.
2. Veo solo las fotos que la persona **eligió** compartir. Su galería no existe para mí.
3. No recibo metadatos de ubicación ni de dispositivo de ninguna imagen.
4. Los enlaces a imágenes son temporales y no se pueden reutilizar ni compartir.

### HU-STUDIO-053 — Consultar el contexto de salud autorizado

**Como** coach o suplente con asignación efectiva
**quiero** conocer dolores, limitaciones y estado de recuperación declarados
**para** no prescribir algo que le haga daño.

`E-STUDIO-08` · importante

**Criterios**

1. Exige el permiso de contexto de salud, el más restrictivo de los cuatro.
2. Recibo información minimizada: dolor, limitación y recuperación declarados.
3. **No recibo** historia clínica, diagnósticos, laboratorios, documentos médicos ni biometría continua. No existen bajo ningún permiso de V1.

### HU-STUDIO-054 — Ver las sesiones autorizadas de una persona

**Como** coach o suplente con asignación efectiva
**quiero** ver las sesiones que ejecutó
**para** hacer seguimiento de su entrenamiento.

`E-STUDIO-08` · imprescindible

**Criterios**

1. Las sesiones producidas dentro de nuestra relación exigen el permiso de entrenamiento; las autónomas o anteriores exigen el permiso de historial previo.
2. Sin el permiso de historial previo **no veo** ninguna sesión que la persona haya hecho por su cuenta.
3. Una sesión que la persona ocultó para nosotros **no aparece de ninguna forma**: ni como marcador, ni como hueco en la lista, ni como diferencia en un total.
4. Los conteos se calculan después de aplicar las ocultaciones.
5. Sin permiso vigente recibo una lista vacía, y queda registrado el intento.

### HU-STUDIO-055 — Revisar el resultado de una sesión

**Como** coach o suplente con asignación efectiva
**quiero** consultar el detalle de una sesión que la persona ejecutó
**para** comparar lo que prescribí con lo que realmente hizo.

`E-STUDIO-08` · imprescindible

**Criterios**

1. Solo accedo a personas que tengo asignadas en esta organización; ser coach o admin no me da acceso por sí solo.
2. Sin el consentimiento vigente no veo ningún resultado, aunque la relación esté activa.
3. Con el permiso de entrenamiento veo series, cargas y repeticiones; **el dolor y el peso corporal permanecen ocultos** si la persona no compartió esas categorías, aunque la sesión sí sea visible.
4. Un dato que la persona no compartió es indistinguible de uno que no registró: no puedo deducir que existe.
5. Cada campo se protege por **su propia** categoría, no por la de la sesión.
6. Frecuencia cardiaca, GPS y datos de dispositivos no se exponen bajo ningún permiso de V1.
7. Si la persona revoca el permiso o termina la relación, dejo de ver el resultado de inmediato.

### HU-STUDIO-056 — Consultar el progreso autorizado

**Como** coach o suplente con asignación efectiva
**quiero** ver la evolución de la persona
**para** decidir cómo ajustar su entrenamiento.

`E-STUDIO-08` · importante

**Criterios**

1. Un indicador solo se calcula con datos que yo puedo leer.
2. Si no se puede calcular sin datos que no tengo autorizados, **no se me entrega aproximado: no se entrega**.
3. Cuando la persona oculta una sesión, los récords y agregados que la incluían quedan invalidados. Ningún otro permiso me la vuelve a mostrar.
4. Un indicador nunca se convierte en una vía indirecta para leer lo que no me autorizaron.

---

## E-STUDIO-09 · Observaciones y correcciones

### HU-STUDIO-057 — Dejar una observación profesional

**Como** coach o suplente con permiso para contribuir
**quiero** registrar mi observación sobre una sesión
**para** dejar mi lectura profesional documentada.

`E-STUDIO-09` · importante

**Criterios**

1. Necesito permiso para **contribuir**. Un permiso de solo lectura no habilita esto.
2. Mi observación **coexiste** con lo que declaró la persona: no lo reemplaza ni lo edita.
3. Si transcribo algo que la persona me dijo, sigue constando como declarado por ella y yo quedo solo como quien lo capturó.
4. Si observo dolor o una limitación, eso es contexto de salud y se protege con esa categoría, no con la de la sesión.

### HU-STUDIO-058 — Corregir mi propia observación

**Como** coach o suplente autor de una observación
**quiero** corregirla
**para** ajustar lo que registré.

`E-STUDIO-09` · importante

**Criterios**

1. Solo puedo corregir **mis propias** observaciones y capturas.
2. No puedo corregir la observación de otro profesional, ni un dato de la persona, ni datos que vinieron de un dispositivo.
3. El valor original se conserva con el motivo del cambio.
4. Al terminar la relación ya no puedo hacer correcciones.

### HU-STUDIO-059 — Proponer una corrección a la persona

**Como** coach o suplente con permiso para contribuir
**quiero** proponer la corrección de un dato que declaró la persona
**para** que su historial sea preciso.

`E-STUDIO-09` · importante

**Criterios**

1. **Proponer no modifica nada.** No existe forma de sobrescribir un dato de la persona.
2. Solo puedo proponer sobre datos que declaró ella y que puedo ver.
3. Se le notifica de forma obligatoria.
4. La propuesta vence a los 30 días; su silencio no es aceptación.
5. Una propuesta pendiente sobre el mismo dato no se duplica.

### HU-STUDIO-060 — Ver mis propuestas de corrección

**Como** coach
**quiero** ver las propuestas que emití y su estado
**para** hacer seguimiento.

`E-STUDIO-09` · importante

**Criterios**

1. Veo el estado y el vencimiento de cada propuesta.
2. Las canceladas por terminación de la relación aparecen como canceladas.
3. Si la persona acepta, ella sigue siendo la autora del dato; yo quedo como quien lo propuso.

---

## E-STUDIO-10 · Acceso al historial de una relación terminada

### HU-STUDIO-061 — Abrir un caso de acceso al historial

**Como** admin u owner con autenticación reforzada
**quiero** abrir un caso para consultar el historial de una relación terminada
**para** atender una disputa, una obligación legal o una solicitud de la propia persona.

`E-STUDIO-10` · después

**Criterios**

1. La capacidad de administrar casos **no me da acceso a leer nada**: solo a abrir el caso.
2. Debo declarar un propósito de una lista cerrada: disputa del servicio, obligación legal, solicitud de soporte de la persona, investigación de seguridad o revisión de calidad autorizada.
3. Marketing, recuperación comercial, uso para IA y curiosidad operativa son propósitos **inválidos**.
4. El caso dura como máximo 24 horas.
5. El caso autoriza a **una membresía concreta**: yo mismo, o el antiguo profesional responsable si mantiene membresía activa. Staff nunca es elegible.
6. Requiere autenticación reforzada y la relación debe estar efectivamente terminada.

### HU-STUDIO-062 — Consultar el historial congelado

**Como** actor autorizado por un caso vigente
**quiero** consultar lo que la persona nos había compartido hasta el corte
**para** resolver el asunto que motivó el caso.

`E-STUDIO-10` · después

**Criterios**

1. Solo veo información materializada **hasta el instante del corte**. Nada posterior existe para mí.
2. Solo veo los campos marcados como consultables en histórico. **Contexto de salud, fotos, archivos y el perfil actual no tienen ruta histórica en V1.**
3. Esta consulta no permite escribir, ni corregir, ni observar, ni exportar en bloque.
4. No puedo listar antiguos clientes ni buscar entre ellos: solo consultar la relación exacta del caso.
5. Cada consulta, permitida o denegada, queda registrada, y **si el registro falla no se me entrega el dato**.
6. Si la persona ocultó algo antes o después del corte, esa ocultación reduce lo que veo de forma permanente.
7. Si la persona revoca el permiso congelado, el caso se cierra y pierdo el acceso.
8. Lo inexistente y lo no autorizado se ven igual: no puedo deducir qué había.

### HU-STUDIO-063 — Cerrar el caso de acceso

**Como** admin u owner
**quiero** cerrar el caso
**para** terminar la ventana de acceso.

`E-STUDIO-10` · después

**Criterios**

1. El caso también se vuelve inutilizable solo, al cumplirse su plazo.
2. Cerrarlo no borra ningún registro de acceso.
3. Un caso cerrado no se reabre: hay que abrir uno nuevo con su propia justificación.

---

## E-STUDIO-11 · Catálogo privado de movimientos

### HU-STUDIO-064 — Crear un movimiento propio

**Como** coach, admin u owner
**quiero** crear un movimiento nuestro
**para** usar nuestra propia terminología y variantes.

`E-STUDIO-11` · importante

**Criterios**

1. El movimiento es **solo visible para nuestra organización**.
2. Puedo relacionarlo como variante de un movimiento global.
3. No puedo crear disciplinas ni tipos de actividad: eso lo publica solo la plataforma, para que los datos sigan siendo comparables.
4. Un nombre repetido dentro de nuestra organización se rechaza en lugar de duplicarse.
5. **No existe forma de subir un movimiento nuestro al catálogo global.** El catálogo global lo carga Allfit; si necesitamos que un movimiento sea global, se gestiona fuera del producto.

### HU-STUDIO-065 — Actualizar un movimiento propio

**Como** coach, admin u owner
**quiero** editar un movimiento nuestro
**para** corregirlo o completarlo.

`E-STUDIO-11` · después

**Criterios**

1. Actualizarlo **no reinterpreta el historial**: las versiones de plantilla y las sesiones que lo referencian conservan el significado con el que se registraron.
2. Un movimiento global nunca se edita desde aquí.

### HU-STUDIO-066 — Archivar un movimiento propio

**Como** admin u owner
**quiero** archivar un movimiento
**para** que no se use en contenido nuevo.

`E-STUDIO-11` · después

**Criterios**

1. Archivar lo retira de la búsqueda para contenido nuevo, pero **no lo elimina**.
2. Las versiones publicadas y las sesiones que lo referencian siguen resolviéndolo correctamente.
3. Un movimiento referenciado nunca se borra mientras exista historial.

### HU-STUDIO-067 — Buscar movimientos incluyendo los nuestros

**Como** coach, admin u owner
**quiero** buscar en el catálogo global y en el nuestro a la vez
**para** encontrar rápido lo que necesito al planificar.

`E-STUDIO-11` · importante

**Criterios**

1. Veo lo global más lo privado de nuestra organización, y **nada** de otras organizaciones.
2. La búsqueda cubre nombre y nombres alternativos.
3. Los archivados no aparecen salvo que los pida explícitamente.

---

## E-STUDIO-12 · Nutrición autorizada

Toda esta épica es **lectura y propuesta**. Ningún profesional escribe en el
registro nutricional de una persona ni activa su meta.

Proponer objetivos exige tres cosas a la vez: la capacidad `guide_nutrition`,
una credencial de profesional de nutrición **verificada**, y el permiso de
orientación nutricional con nivel de contribución. Faltando una, la operación
falla antes de persistir nada.

### HU-STUDIO-068 — Ver las comidas que la persona autorizó

**Como** coach o suplente con asignación efectiva
**quiero** consultar el registro de comidas de la persona
**para** acompañar su alimentación con datos reales.

`E-STUDIO-12` · importante

**Criterios**

1. Exige el permiso de registro nutricional; sin él no veo nada.
2. La foto de una comida exige **además** el permiso de imágenes nutricionales: son categorías separadas y una no concede la otra.
3. **Nunca recibo una URL de almacenamiento ni una referencia al archivo.** Si tengo ambos permisos, recibo un enlace autenticado que se resuelve por el propio sistema.
4. Un admin o un miembro de staff no accede a esto por su rol.
5. Si el permiso se revoca, dejo de ver el registro en la petición siguiente, sin caché de por medio.
6. Cada consulta queda registrada antes de entregarme los datos, y la persona puede verla.
7. Si algo falla en la autorización, no recibo ninguna señal de que exista o no exista información.

### HU-STUDIO-069 — Ver los resúmenes nutricionales autorizados

**Como** coach o suplente con asignación efectiva
**quiero** ver el consolidado diario de la persona
**para** evaluar tendencias sin revisar comida por comida.

`E-STUDIO-12` · importante

**Criterios**

1. Exige el permiso de registro nutricional.
2. Consulto por rango, con un máximo de 31 días.
3. Los totales se calculan **después** de aplicar la autorización, nunca antes.
4. Si un permiso se revoca, desaparecen también los totales, las tendencias y cualquier indicio de que haya más información.
5. Nunca recibo un agregado parcial que permita deducir filas que no puedo ver.

### HU-STUDIO-070 — Ver el historial de objetivos que propusimos

**Como** coach o suplente con asignación efectiva
**quiero** consultar las versiones de objetivos nutricionales de esta relación
**para** dar continuidad a la orientación.

`E-STUDIO-12` · importante

**Criterios**

1. En una relación activa exige el permiso de orientación nutricional.
2. Si la relación ya terminó, solo puedo consultarlo mediante un caso de acceso histórico, con autenticación reforzada y propósito declarado.
3. En la vista histórica solo aparece lo de **origen profesional de esta relación** y anterior al corte. Las comidas, las fotos, los resúmenes y las metas personales de la persona **no tienen ruta histórica**.
4. Sin un caso válido no existe forma de caer de vuelta al endpoint normal.

### HU-STUDIO-071 — Proponer objetivos nutricionales

**Como** profesional de nutrición verificado con asignación efectiva
**quiero** proponerle a la persona una versión de sus objetivos
**para** orientar su alimentación.

`E-STUDIO-12` · importante

**Criterios**

1. Necesito las tres condiciones a la vez: la capacidad de orientar nutrición, mi credencial de nutrición **verificada y vigente**, y el permiso con nivel de contribución. Si falta una, no se crea nada.
2. **Proponer no activa ni modifica la meta vigente de la persona.** Solo ella decide.
3. Debo justificar la propuesta: un texto de hasta 2000 caracteres que no puede ir vacío.
4. Una propuesta pendiente anterior de esta misma relación queda reemplazada por la nueva.
5. La propuesta **no puede contener un menú ni una indicación clínica**: esto es orientación nutricional, no tratamiento.
6. La persona ve que la propuesta es mía, con mi autoría mínima y nada más.
7. Esta operación exige conexión.

### HU-STUDIO-072 — Ver la foto de una comida autorizada

**Como** coach o suplente con ambos permisos nutricionales
**quiero** ver la foto que la persona adjuntó a una comida
**para** entender mejor lo que registró.

`E-STUDIO-12` · importante

**Criterios**

1. Exige el permiso de registro nutricional **y** el de imágenes nutricionales, y ambos se reevalúan **en cada consulta de la imagen**.
2. Recibo la imagen servida por el propio sistema. **Nunca** una URL de almacenamiento, una referencia al archivo ni un enlace que siga funcionando después.
3. Si el permiso se revoca, la siguiente petición ya no entrega nada.
4. Cada visualización queda registrada por separado y la persona la ve.
5. Una imagen inexistente, un permiso revocado, una relación inválida o una credencial vencida producen exactamente la misma respuesta: no puedo distinguir cuál fue el motivo.

---

## E-STUDIO-13 · Planes y cobro

> **Diferida de V1** (1 de octubre de 2026). En la primera versión los gimnasios
> **no le cobran a sus clientes a través de Allfit**: el gimnasio le paga a Allfit por
> fuera de la plataforma, y cada persona que invita entra con Allfit Pro. Estas
> historias se conservan para cuando se abra esa puerta; su prioridad pasa a `después`.

**La plata nunca pasa por Allfit.** Cada organización conecta su propia cuenta de
pasarela y cobra directo. Allfit refleja el estado y suspende o reactiva.

Y una regla que atraviesa toda la épica: **el `coach` no ve nada de esto.** El
estado de pago de una persona no es un dato de entrenamiento.

### HU-STUDIO-073 — Conectar nuestra cuenta de cobro

**Como** propietario de la organización
**quiero** conectar nuestra cuenta de Mercado Pago o Wompi
**para** poder cobrarles a nuestros clientes.

`E-STUDIO-13` · después

**Criterios**

1. Solo el propietario puede hacerlo. Ni admin, ni coach, ni staff.
2. La cuenta es **nuestra**: el dinero va del cliente a nosotros sin pasar por Allfit.
3. Allfit guarda una referencia a nuestras credenciales, **nunca las credenciales mismas**.
4. Solo puede haber una cuenta de cobro activa a la vez.

### HU-STUDIO-074 — Crear un plan

**Como** admin u owner
**quiero** crear un plan comercial
**para** ofrecérselo a nuestros clientes.

`E-STUDIO-13` · después

**Criterios**

1. El plan existe con nombre antes de tener precio: el precio vive en la versión.
2. Un borrador **no se le puede vender a nadie** hasta publicarlo.
3. No podemos tener dos planes con el mismo nombre.

### HU-STUDIO-075 — Publicar una versión de plan

**Como** admin u owner
**quiero** publicar el plan con su precio
**para** que la gente pueda suscribirse.

`E-STUDIO-13` · después

**Criterios**

1. Defino monto, moneda y si el cobro es **mensual o anual**. No hay otras opciones.
2. Una versión publicada **no se edita nunca**. Cambiar el precio exige publicar otra.
3. **A quien ya está suscrito no se le sube el precio**: conserva la versión que aceptó.

### HU-STUDIO-076 — Retirar una versión de plan

**Como** admin u owner
**quiero** retirar una versión
**para** que nadie más se suscriba a ella.

`E-STUDIO-13` · después

**Criterios**

1. Retirar impide **suscripciones nuevas**.
2. **No cancela, no suspende y no cambia de plan** a nadie que ya esté suscrito.

### HU-STUDIO-077 — Ver nuestros planes

**Como** integrante de la organización
**quiero** ver los planes que ofrecemos
**para** saber qué estamos vendiendo.

`E-STUDIO-13` · después

**Criterios**

1. Distingo borradores de versiones publicadas.
2. Nunca veo los planes de otra organización.

### HU-STUDIO-078 — Ver quién está suscrito y quién debe

**Como** admin u owner
**quiero** ver el estado de pago de nuestros clientes
**para** administrar el negocio.

`E-STUDIO-13` · después

**Criterios**

1. Veo quién está activo, quién suspendido y quién terminó.
2. **Un coach no accede a esta pantalla**, aunque tenga a esa persona asignada. Un staff tampoco.
3. Aquí no hay **ningún** dato de entrenamiento, cuerpo, salud ni nutrición.

### HU-STUDIO-079 — Suspender o reactivar a mano

**Como** admin u owner
**quiero** suspender o reactivar una suscripción manualmente
**para** manejar casos que el cobro automático no cubre.

`E-STUDIO-13` · después

**Criterios**

1. Suspender **no toca los permisos** que la persona nos dio, **no desacopla** su programa y **no termina** la relación.
2. Lo que sí hace: nuestro coach deja de poder escribir, y se pausan las sesiones futuras del programa que le asignamos.
3. La persona conserva todo su historial y puede seguir entrenando por su cuenta.
4. Reactivar **solo cierra el bloqueo comercial de esta suscripción** y vuelve a calcular el acceso con el estado vigente; no restaura una copia de cómo estaban antes los permisos, la relación, la asignación, la membresía del coach ni las sesiones.
5. Si durante la suspensión se revocó un permiso, terminó la relación, cambió la asignación o una sesión fue cancelada, iniciada o quedó en el pasado, la reactivación **no revive** ese estado.
6. No se pide una autorización nueva únicamente cuando el permiso actual sigue vigente. Si existe otro bloqueo —por ejemplo, la organización continúa suspendida—, la escritura y las sesiones afectadas siguen pausadas.
7. Solo vuelven a estar disponibles las sesiones futuras, no iniciadas y no canceladas que todavía pertenezcan a una relación y asignación vigentes.
8. Si la operación intentara tocar permisos, relaciones, membresías, asignaciones o el estado intrínseco de una sesión, se revierte entera.

### HU-STUDIO-080 — Terminar una suscripción

**Como** admin u owner
**quiero** terminar la suscripción de alguien
**para** cerrar el vínculo comercial.

`E-STUDIO-13` · después

**Criterios**

1. **Terminar el plan no termina la relación** con la persona. Son dos cosas distintas: para terminar la relación existe otra acción, con sus propios efectos.
2. **Ningún proceso automático puede terminar una suscripción.** Siempre queda registrado qué persona lo decidió.
3. Una suspensión puede durar indefinidamente sin convertirse nunca en terminación por sí sola.

---

## E-STUDIO-14 · Resumen del día

### HU-STUDIO-081 — Ver qué necesita atención hoy

**Como** coach o admin que abre Allfit Studio
**quiero** ver de una qué requiere mi atención
**para** no tener que revisar cliente por cliente.

`E-STUDIO-14` · imprescindible

**Criterios**

1. Veo lo que espera acción mía: invitaciones sin responder y relaciones aceptadas sin profesional asignado.
2. Como coach veo mis clientes con sesiones sin registrar y sus resultados recién cerrados.
3. Como admin veo el estado del equipo y las relaciones nuevas. Los cobros que fallaron se suman cuando se habilite `E-STUDIO-13`.
4. **Lo que veo depende de mi rol.** Un coach no ve cobros; un staff no ve nada de entrenamiento.
5. Desde cada aviso llego directo a donde se resuelve.
6. Si no hay nada pendiente se dice, en lugar de mostrar una pantalla vacía.
7. Un scope rechazado o revocado nunca reaparece como “permiso pendiente” ni como una acción para que el coach vuelva a solicitarlo. Las decisiones de scopes ocurren únicamente dentro de la aceptación de una nueva relación.

### HU-STUDIO-082 — Buscar a una persona de mi gimnasio

**Como** integrante del gimnasio
**quiero** encontrar rápido a una persona
**para** llegar a su ficha.

`E-STUDIO-14` · imprescindible

**Criterios**

1. Busco por nombre dentro del directorio que me corresponde.
2. Como coach solo encuentro a **las personas que tengo asignadas**.
3. Los resultados muestran nombre y estado de la relación. **Ningún dato de entrenamiento**, ni siquiera resumido.
4. Si no hay resultados se dice claramente.

### HU-STUDIO-083 — Ver la ficha de una persona que atiendo

**Como** coach con asignación vigente
**quiero** abrir la ficha de mi cliente y ver todo lo que me autorizó
**para** acompañarlo sin ir saltando entre pantallas.

`E-STUDIO-14` · imprescindible

**Criterios**

1. En un solo lugar veo su perfil, su programa, sus sesiones y su progreso, **según lo que me haya autorizado**.
2. Lo que no me autorizó **no aparece como vacío ni como bloqueado**: no aparece.
3. Cada consulta queda registrada y la persona la ve.

### HU-STUDIO-084 — Entender por qué dejé de ver algo

**Como** coach que antes veía algo de un cliente y ya no
**quiero** que se me explique qué cambió
**para** no pensar que la aplicación está fallando.

`E-STUDIO-14` · importante

**Criterios**

1. Cuando algo que veía deja de estar, se me dice el motivo: la persona revocó esa categoría, terminó la relación, o me quitaron la asignación.
2. Son motivos distintos y se distinguen: que me quiten de un cliente no es lo mismo a que el cliente se vaya del gimnasio.
3. Saber que una categoría no está disponible **no me dice si esa persona tiene o no datos** de ese tipo.
4. Si la persona ocultó una sesión concreta, **no me entero**: para mí simplemente no existe.

---

## Resumen

| Épica | Historias | Imprescindibles |
| --- | --- | ---: |
| `E-STUDIO-00` Entrar | `HU-STUDIO-001` – `HU-STUDIO-004` | 4 de 4 |
| `E-STUDIO-01` Perfil y organización | `HU-STUDIO-005` – `HU-STUDIO-013` | 5 de 9 |
| `E-STUDIO-02` Equipo, roles y membresías | `HU-STUDIO-014` – `HU-STUDIO-022`, `HU-STUDIO-085` – `HU-STUDIO-086` | 9 de 11 |
| `E-STUDIO-03` Invitación de personas y directorio | `HU-STUDIO-023` – `HU-STUDIO-026`, `HU-STUDIO-087` | 4 de 5 |
| `E-STUDIO-04` Responsable, suplencias y terminación | `HU-STUDIO-027` – `HU-STUDIO-033` | 3 de 7 |
| `E-STUDIO-05` Qué nos autorizó cada persona | `HU-STUDIO-034` – `HU-STUDIO-035` | 1 de 2 |
| `E-STUDIO-06` Contenido versionado | `HU-STUDIO-036` – `HU-STUDIO-045` | 6 de 10 |
| `E-STUDIO-07` Asignación y seguimiento | `HU-STUDIO-046` – `HU-STUDIO-050` | 2 de 5 |
| `E-STUDIO-08` Ver los datos de mi cliente | `HU-STUDIO-051` – `HU-STUDIO-056` | 3 de 6 |
| `E-STUDIO-09` Observaciones y correcciones | `HU-STUDIO-057` – `HU-STUDIO-060` | 0 de 4 |
| `E-STUDIO-10` Historial de una relación terminada | `HU-STUDIO-061` – `HU-STUDIO-063` | 0 de 3 |
| `E-STUDIO-11` Catálogo privado de movimientos | `HU-STUDIO-064` – `HU-STUDIO-067` | 0 de 4 |
| `E-STUDIO-12` Nutrición | `HU-STUDIO-068` – `HU-STUDIO-072` | 0 de 5 |
| `E-STUDIO-13` Planes y cobro · diferida | `HU-STUDIO-073` – `HU-STUDIO-080` | 0 de 8 |
| `E-STUDIO-14` Resumen del día | `HU-STUDIO-081` – `HU-STUDIO-084` | 3 de 4 |
| **Total** | **87 historias** | **40 imprescindibles** |

El camino mínimo para lanzar es: entrar, crear el gimnasio con su equipo,
invitar a una persona dentro del cupo, armar un programa y asignárselo, y ver
lo que ejecutó. En V1 no se cobra a las personas desde Studio. En una sola confirmación, la persona acepta la relación y
decide cada scope de forma independiente; el coach trabaja desde el primer día
únicamente con los grants que la persona concedió.
