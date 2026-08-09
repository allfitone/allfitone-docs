# Historias de usuario — Allfit Backoffice

**Estado:** baseline V1 — acceso Backoffice recertificado con separación de deberes<br>
**Fecha:** 3 de agosto de 2026<br>
**Producto:** el panel interno de Allfit. No lo usa ninguna persona que entrena ni ningún gimnasio.

Este documento es **autocontenido**: no hay que abrir ningún otro archivo para
entenderlo ni para construir a partir de él.

---

## 1. Cómo se lee una historia

```markdown
### HU-BO-012 — Título escrito desde quien actúa

**Como** <quién>
**quiero** <qué>
**para** <para qué>.

`E-BO-03` · imprescindible

**Criterios**

1. <regla verificable, en lenguaje de negocio>
```

| Elemento | Qué significa |
| --- | --- |
| `HU-BO-###` | Identificador estable. No se reutiliza nunca |
| `E-BO-##` | Épica a la que pertenece |
| Prioridad | `imprescindible` sin esto no se lanza · `importante` debería estar · `después` puede esperar |

Los criterios describen **qué debe ser cierto**, no cómo se ve. No incluyen
nombres de endpoints, tablas ni códigos de error: eso vive en el contrato
técnico.

## 2. Quién usa el Backoffice

`allfit_admin` es la habilitación base para que una persona del equipo de Allfit
pueda iniciar sesión. **No concede por sí sola acceso a datos ni capacidad para
ejecutar acciones.** Cada operación exige un deber de plataforma vigente,
otorgado por otra persona, con vigencia máxima de 90 días y el nivel de
autenticación requerido.

| Modo de actuación | Deberes principales | Límite |
| --- | --- | --- |
| Soporte ordinario (`A10`) | métricas, diagnóstico y metadatos de soporte | No ve contenido personal, entrenamiento, cuerpo, salud, nutrición ni medios |
| Curaduría/verificación (`A11`) | catálogo global o verificación de credenciales | Cada deber es independiente; curar no permite verificar |
| Seguridad/privacidad (`A12`) | administrar accesos, aprobar y auditar break-glass, gestionar solicitudes legales | No solicita ni ejerce una ventana que aprueba o audita |

Una persona puede recibir más de un deber, pero la separación se comprueba en
cada caso: nadie se autoasigna; solicitante, aprobadores y revisor son personas
distintas cuando el flujo lo exige; un deber vencido o revocado corta el acceso
de inmediato.

Dos aclaraciones de nombre:

- **`admin` de una organización** es alguien de un gimnasio: administra su gimnasio y no ve datos de entrenamiento por ese rol.
- **`allfit_api`, `allfit_support`, `allfit_worker_*`** y similares son roles de conexión de la base de datos, no personas ni deberes humanos.

## 3. Lo que el Backoffice puede y lo que no

**Sí puede, con el deber correspondiente:** consultar metadatos mínimos, crear
gimnasios y entregarlos, publicar contenido global, verificar títulos
profesionales, consultar información comercial minimizada y ayudar a iniciar
flujos de identidad sin modificar los datos directamente.

El contenido de entrenamiento sólo se consulta mediante una ventana
break-glass estándar aprobada. Cuerpo, salud y registro nutricional requieren
una ventana restringida y dos aprobadores distintos. Fotos, archivos, identidad
y contacto completos, secretos de autenticación, pagos detallados, raw de
sensores y notas privadas no son categorías aprobables por break-glass.

**No puede:**

| No puede | Por qué |
| --- | --- |
| Crear la cuenta de una persona | La persona se registra sola y acepta sus propios términos. Allfit invita, no suplanta |
| Cambiar directamente nombre, correo, teléfono, contraseña o cuenta vinculada | La identidad permanece bajo control de la persona y de sus pruebas de acceso |
| Reescribir el historial de entrenamiento, cuerpo, salud o nutrición | Ese historial es suyo. Se corrige desde su app o mediante propuesta de su coach |
| Operar un gimnasio en nombre de su dueño | Se le entrega y él lo administra desde Allfit Studio |
| Cobrar o mover dinero | Los cobros los reporta la pasarela |
| Leer contenido sensible por tener `allfit_admin` | El rol base permite entrar; el deber y, cuando aplica, break-glass autorizan cada operación |
| Aprobar o auditar mi propio acceso excepcional | La separación de deberes es obligatoria y falla cerrada |
| Borrar el registro de accesos, roles o deberes | Nadie puede, para que la evidencia sirva de algo |

Cada lectura permitida o denegada de datos de una persona queda registrada antes
de entregar contenido. La persona afectada puede ver quién accedió, la categoría,
el propósito, el momento y el resultado; nunca se expone el expediente interno
ni el contenido consultado. Si la auditoría falla, la lectura no ocurre.

---

## E-BO-01 · Entrar

### HU-BO-001 — Iniciar sesión

**Como** integrante del equipo de Allfit
**quiero** entrar al Backoffice con mi cuenta
**para** trabajar.

`E-BO-01` · imprescindible

**Criterios**

1. Entro con mi correo y contraseña.
2. Si no tengo rol de plataforma vigente **no entro**, aunque mi cuenta exista.
3. Un intento fallido no revela si el correo existe o si la contraseña está mal.
4. La sesión del Backoffice es independiente de la de Allfit Studio: entrar a uno no me mete al otro.
5. Entrar no habilita ninguna operación: cada pantalla y acción comprueba un deber vigente y, para funciones sensibles, AAL2.

### HU-BO-002 — Cerrar sesión

**Como** integrante del equipo
**quiero** cerrar sesión
**para** dejar el equipo libre.

`E-BO-01` · imprescindible

**Criterios**

1. Al cerrar sesión no queda nada consultable sin volver a entrar.
2. La sesión caduca sola tras un tiempo de inactividad.

### HU-BO-003 — Recuperar mi contraseña

**Como** integrante del equipo que olvidó su contraseña
**quiero** restablecerla
**para** volver a entrar.

`E-BO-01` · imprescindible

**Criterios**

1. Pido el restablecimiento con mi correo y me llega un enlace temporal.
2. El mensaje es el mismo exista o no la cuenta.
3. Al cambiar la contraseña se cierran mis otras sesiones abiertas.

---

## E-BO-02 · Panel de inicio

### HU-BO-004 — Ver cómo va el negocio

**Como** fundador
**quiero** abrir el Backoffice y ver el estado de Allfit
**para** saber si el lanzamiento está funcionando.

`E-BO-02` · imprescindible

**Criterios**

1. Veo cuántas personas se registraron y cuántas estuvieron activas esta semana.
2. Veo cuántos gimnasios hay y cuántos están operando de verdad, no solo creados.
3. Veo cuántas suscripciones activas hay y cuánto se está facturando.
4. Veo cuántas personas tienen Premium y por cuál vía: pagándole a Allfit o por su gimnasio.
5. Cada número dice de qué periodo es. Un número sin periodo no se muestra.
6. Si algo no se puede calcular aparece vacío, **no en cero**. Cero y "no sé" son cosas distintas.
7. El panel exige el deber `view_platform_metrics`; sólo expone agregados con umbral mínimo y nunca permite navegar desde una cifra hasta el contenido de una persona.

### HU-BO-005 — Ver qué necesita atención

**Como** integrante del equipo
**quiero** que el panel me muestre lo pendiente o atascado
**para** no tener que salir a buscarlo.

`E-BO-02` · importante

**Criterios**

1. Veo cobros fallidos recientes y suscripciones suspendidas.
2. Veo verificaciones de título pendientes.
3. Veo gimnasios creados que nadie ha reclamado.
4. Veo errores del sistema que se estén repitiendo.
5. Desde cada aviso llego directo a donde se resuelve.
6. Cada destino vuelve a comprobar su deber específico; ver un contador no concede acceso al expediente ni a sus datos.

---

## E-BO-03 · Personas

### HU-BO-006 — Buscar a una persona

**Como** integrante del equipo atendiendo un caso
**quiero** encontrar a alguien por su correo, nombre o identificador
**para** poder ayudarlo.

`E-BO-03` · imprescindible

**Criterios**

1. Busco por identificador o por coincidencia exacta de un correo o teléfono que la persona entregó en su caso de soporte; no existe búsqueda exploratoria por nombre.
2. Los resultados muestran únicamente identificador, contacto parcialmente oculto y estado operativo de la cuenta.
3. Si no hay resultados se dice claramente; no aparece una lista vacía sin explicación.
4. La búsqueda exige `diagnose_support_metadata`, referencia de caso y queda registrada incluso si no encuentra resultados.

### HU-BO-007 — Ver el estado operativo de una persona

**Como** integrante del equipo
**quiero** abrir su estado operativo minimizado
**para** entender el caso sin acceder a su contenido personal.

`E-BO-03` · imprescindible

**Criterios**

1. Veo identificador, estado de cuenta, antigüedad, contactos parcialmente ocultos y estado de verificación, sin valores completos.
2. Veo que existen perfil, relaciones, plan, Premium y permisos, junto con sus estados y fechas; no veo objetivos, contenido, pagos ni destinatarios desde esta ficha.
3. Para resolver un caso de entrenamiento uso `HU-BO-008`; para cuerpo, salud o nutrición uso `HU-BO-009`. Ninguna pantalla amplía silenciosamente la categoría aprobada.
4. La ficha exige `diagnose_support_metadata`, referencia de caso y registra la consulta.
5. La ficha carga aunque falten datos y representa desconocido como vacío, nunca como cero o falso.

### HU-BO-008 — Ver el entrenamiento de una persona

**Como** integrante del equipo atendiendo un problema de registro
**quiero** ver sus sesiones y su agenda
**para** entender qué pasó.

`E-BO-03` · imprescindible

**Criterios**

1. Veo su historial de sesiones con fecha, tipo de actividad y si quedó completa.
2. Puedo abrir una sesión y ver lo que registró: series, cargas, distancias o duración según la modalidad.
3. Veo su agenda: qué tiene planeado y de qué programa viene.
4. Veo también lo que ella ocultó a algún gimnasio, indicando para cuál está oculto.
5. Sólo puedo consultar mediante mi propia ventana break-glass estándar, aprobada para esa persona, caso, propósito y categorías; dura como máximo 30 minutos.
6. Cada lectura revalida AAL2, deber, quorum, categoría y vigencia, y registra resultado permitido o denegado antes de devolver contenido.

### HU-BO-009 — Ver cuerpo, salud y nutrición

**Como** integrante del equipo
**quiero** consultar sus mediciones, su contexto de salud y su registro de comidas
**para** resolver casos que involucren esos datos.

`E-BO-03` · importante

**Criterios**

1. Veo mediciones corporales, dolores y limitaciones declaradas, y las comidas que registró con sus valores.
2. **Ninguna foto ni ningún archivo se abre desde el Backoffice.** Ni fotos de progreso corporal, ni fotos de comida, ni documentos. Se guardan y la persona los ve en su aplicación, pero desde aquí no son accesibles.
3. Donde hay una foto, se indica que existe. Se sabe que está, no se ve.
4. La consulta requiere una ventana break-glass restringida, dos aprobadores distintos y una duración máxima de 15 minutos.
5. Fotos, archivos y `nutrition_media` se rechazan antes de abrir la ventana; conocer que existe un medio no concede URL, referencia de storage ni bytes.
6. Cada lectura revalida AAL2, deber, quorum, categoría y vigencia, y registra resultado permitido o denegado antes de devolver contenido.

### HU-BO-010 — Ayudar a corregir un dato de identidad

**Como** integrante del equipo
**quiero** iniciar el flujo seguro para que una persona corrija su nombre, correo o teléfono
**para** ayudarla sin asumir el control de su identidad.

`E-BO-03` · importante

**Criterios**

1. Desde Backoffice **no puedo escribir directamente** el nombre, correo ni teléfono de una persona.
2. Si todavía puede entrar, la persona cambia su nombre, correo o teléfono desde Allfit Space y confirma nuevamente su identidad. Backoffice solo la orienta y consulta el estado.
3. Si no puede entrar pero controla un correo o teléfono previamente verificado, puedo enviarle el flujo oficial de recuperación, temporal y de un solo uso.
4. Si no controla ningún contacto verificado, V1 **falla cerrado**: no cambio datos, no acepto fotos de documentos, no vinculo otra cuenta a su Fitness ID y cierro o escalo la atención como recuperación no disponible.
5. El equipo ve contactos parcialmente ocultos y estados como iniciado, esperando verificación, confirmado, vencido, cancelado o fallido; nunca ve contraseñas, códigos ni enlaces completos.
6. Un correo o teléfono nuevo debe verificarse antes de sustituir al anterior. Si ya pertenece a otra cuenta, se rechaza sin revelar quién lo usa.
7. El correo de acceso en WorkOS AuthKit y el correo de contacto cambian como una sola decisión. Si una parte falla, ambas conservan el valor anterior.
8. Al confirmar un nuevo correo se cierran las demás sesiones y se notifica al contacto anterior y al nuevo. Un cambio de teléfono también se notifica por los canales verificados disponibles.
9. El nombre declarado lo modifica la persona. Cambiarlo no reescribe una credencial profesional verificada; una incompatibilidad abre una nueva revisión y conserva la evidencia anterior.
10. Puedo reenviar una verificación pendiente o cancelar una intención sospechosa, pero nunca confirmar, marcar como verificado ni elegir el dato por la persona.
11. **No puedo tocar** su entrenamiento, su cuerpo, su salud ni su nutrición. Ese historial es suyo y se corrige desde su app.
12. Quedan registrados quien inició la ayuda, la persona que confirmó, los estados y las fechas; la auditoría nunca conserva contraseñas, códigos ni secretos.

### HU-BO-011 — Reenviar una verificación, recuperación o invitación

**Como** integrante del equipo
**quiero** reenviar una invitación, verificación o recuperación pendiente
**para** desatascar a alguien sin alterar su identidad ni la intención original.

`E-BO-03` · importante

**Criterios**

1. Puedo reenviar estas cosas, y en cada caso veo de cuál se trata:
   - la **verificación o recuperación** de alguien que se está registrando, cambió un contacto o perdió el acceso;
   - la **invitación de un gimnasio a una persona**, para ser su cliente o para unirse a su equipo;
   - la **invitación de Allfit al dueño** de un gimnasio recién creado.
2. Solo se reenvían las que siguen pendientes. Una ya aceptada no se reenvía.
3. Si venció, genero una nueva en lugar de revivir la anterior; la anterior permanece vencida y nunca vuelve a funcionar.
4. Reenviar no permite ver el código o enlace, elegir otro contacto ni marcar la verificación como completada.
5. Reenviar **no cambia nada** de lo que la invitación, verificación o recuperación proponía: ni la identidad, ni el rol, ni el gimnasio, ni el programa.
6. Queda registrado qué tipo de mensaje reenvié y cuándo.

---

## E-BO-04 · Gimnasios

### HU-BO-012 — Buscar y listar gimnasios

**Como** integrante del equipo
**quiero** ver todos los gimnasios y buscar uno
**para** llegar a su ficha.

`E-BO-04` · imprescindible

**Criterios**

1. Veo el listado con nombre, tipo, estado y cuántas personas atiende.
2. Busco por nombre.
3. Distingo los que están operando de los que se crearon y nadie reclamó.

### HU-BO-013 — Ver la ficha de un gimnasio

**Como** integrante del equipo
**quiero** abrir un gimnasio y ver cómo está
**para** entender su situación.

`E-BO-04` · imprescindible

**Criterios**

1. Veo sus datos, su dueño y sus sedes.
2. Veo su equipo: quién es admin, quién coach y quién staff.
3. Veo cuántas personas atiende y en qué estado están esas relaciones.
4. Veo sus planes publicados y sus suscriptores.
5. Veo si tiene su medio de cobro conectado, **sin ver ninguna credencial**.
6. Veo si está habilitado para dar Premium a sus clientes.

### HU-BO-014 — Crear un gimnasio y entregárselo a su dueño

**Como** fundador cerrando una venta
**quiero** montar el gimnasio desde el Backoffice y entregárselo
**para** que empiece a operar sin pelear con un registro.

`E-BO-04` · imprescindible

**Criterios**

1. Creo la organización con nombre, tipo y sede, e invito por correo a quien será el dueño.
2. Mientras nadie la reclama, la organización **existe pero no opera**: no puede invitar clientes, ni publicar planes, ni recibir pagos.
3. Cuando el dueño acepta, **queda como propietario** y la organización empieza a operar.
4. **Allfit no la administra en el intervalo.** Solo puede reenviar la invitación o cancelar la creación.
5. Si nadie la reclama dentro del plazo, aparece en el panel como pendiente de seguimiento.
6. Allfit **no crea las cuentas del equipo**. Una vez entregada, el dueño invita a sus entrenadores desde Allfit Studio.
7. Queda registrado quién la creó y a quién se la entregó.
8. Crear o cancelar organizaciones no reclamadas exige `manage_organization_lifecycle`, AAL2 y actor humano auditado.

### HU-BO-015 — Cancelar un gimnasio que nadie reclamó

**Como** integrante del equipo
**quiero** eliminar una organización creada por error o nunca reclamada
**para** que no quede basura en el sistema.

`E-BO-04` · importante

**Criterios**

1. Solo puedo cancelar organizaciones que **nunca fueron reclamadas**.
2. Una organización con dueño no se cancela desde aquí: la cierra su propietario.
3. Queda registro de la cancelación.
4. La acción exige `manage_organization_lifecycle`, AAL2 y no se deriva del rol base `allfit_admin`.

### HU-BO-016 — Suspender un gimnasio

**Como** fundador
**quiero** suspender a un gimnasio que incumplió
**para** cortarle el servicio sin destruir nada.

`E-BO-04` · importante

**Criterios**

1. Puedo suspenderlo **por decisión de Allfit**, sin que él lo pida. El caso típico es que no le esté pagando a Allfit lo pactado.
2. Un gimnasio suspendido **deja de operar**: no invita, no asigna programas, no publica planes ni cobra suscripciones nuevas.
3. **Sus clientes conservan todo lo suyo**: su historial completo, su entrenamiento por su cuenta y su registro de comidas. Los programas que el gimnasio les asignó quedan pausados.
4. **Los permisos no se tocan** y las relaciones no se terminan. Suspender no es cancelar.
5. Si estaba habilitado para dar Premium a sus clientes, esos clientes bajan al plan gratuito mientras dure la suspensión, sin perder ningún dato.
6. Levantar la suspensión **solo cierra el bloqueo de esa organización** y vuelve a calcular la operación con el estado vigente; no restaura una copia anterior de permisos, relaciones, membresías, asignaciones, suscripciones ni sesiones.
7. Nadie repite una autorización que siga vigente, pero lo revocado, terminado, cambiado, cancelado, iniciado o vencido durante la suspensión **no revive**. Cualquier otro bloqueo vigente sigue aplicando.
8. Queda registrado quién lo suspendió o reactivó, cuándo y con qué motivo.
9. Suspender o reactivar exige `manage_organization_lifecycle`, AAL2 y motivo cerrado; el actor se conserva como persona y asignación de deber vigentes.

### HU-BO-017 — Cancelar la relación con un gimnasio

**Como** fundador
**quiero** terminar definitivamente con un gimnasio
**para** sacarlo de la plataforma cuando la suspensión no bastó o él lo pidió.

`E-BO-04` · después

**Criterios**

1. Puedo cancelarlo **por decisión de Allfit** o a petición del dueño. Allfit se reserva el derecho de terminar la relación con un gimnasio.
2. Cancelar termina todas sus relaciones con personas, con el efecto completo: el gimnasio pierde el acceso a los datos de sus clientes y esas personas quedan libres para decidir qué hacer con sus programas.
3. **No elimina el historial de ninguna persona.** Lo que cada quien entrenó es suyo y se queda con él.
4. El gimnasio conserva solo lo que ya tenía derecho a conservar.
5. Es irreversible: volver exige empezar de cero, con relaciones y permisos nuevos.
6. Antes de confirmar veo a cuántas personas afecta.
7. Queda registrado quién lo canceló, cuándo y con qué motivo.

---

## E-BO-05 · Suscripciones y pagos

### HU-BO-018 — Ver los pagos de una persona

**Como** integrante del equipo atendiendo un reclamo de cobro
**quiero** ver su suscripción y su historial de pagos
**para** entender qué pasó.

`E-BO-05` · imprescindible

**Criterios**

1. Veo su plan, con qué gimnasio, cuánto paga y cuándo es el próximo cobro.
2. Veo cada cobro con su resultado, incluidos los fallidos y el motivo.
3. Veo si está suspendida y desde cuándo.
4. **Nunca veo datos de tarjeta**, porque Allfit no los guarda.
5. La consulta exige `view_billing_metadata`, referencia de caso y una proyección cerrada; pagos no son categoría break-glass.

### HU-BO-019 — Ver las suscripciones de un gimnasio

**Como** integrante del equipo
**quiero** ver todas las suscripciones de un gimnasio
**para** entender cómo le va y ayudarlo si algo falla.

`E-BO-05` · importante

**Criterios**

1. Veo cuántas activas, cuántas suspendidas y cuántas terminadas.
2. Veo cuánto factura al mes.
3. Si su medio de cobro no está conectado se ve claramente, porque explica que no tenga suscripciones.
4. La consulta exige `view_billing_metadata` y sólo devuelve estados, periodos y agregados comerciales minimizados.

### HU-BO-020 — Ver los ingresos de Allfit Premium

**Como** fundador
**quiero** ver quién le paga Premium a Allfit y cuánto entra
**para** seguir nuestro propio ingreso.

`E-BO-05` · importante

**Criterios**

1. Veo las suscripciones a Allfit, activas y suspendidas, y lo que suman.
2. Distingo quién paga directo de quién tiene Premium por su gimnasio.
3. Veo los cobros fallidos para poder hacer seguimiento.
4. La consulta exige `view_platform_metrics`; identificar pagadores individuales requiere además `view_billing_metadata` y finalidad de soporte trazable.

---

## E-BO-06 · Contenido global y verificación

### HU-BO-021 — Verificar el título de un profesional

**Como** integrante del equipo
**quiero** comprobar que un título profesional es real y dejarlo verificado
**para** que quien lo tenga pueda ejercer lo que ese título habilita.

`E-BO-06` · imprescindible

**Por qué lo hace Allfit y no el gimnasio.** Un gimnasio certificando a sus
propios entrenadores no certifica nada: sería juez y parte. La verificación
vale precisamente porque la hace alguien que no tiene interés en el resultado.
Y hay un caso donde deja de ser un adorno: **un nutricionista solo puede
ponerle metas de alimentación a un cliente si su título está verificado.** Si
nadie verifica, esa función no se puede usar.

**Criterios**

1. Veo las verificaciones pendientes: quién la pidió, qué título dice tener y qué registro debo consultar.
2. Verifico contra el registro oficial de la profesión o confirmando con quien lo emitió. **No se guardan copias de documentos.**
3. Verificar un título **no marca ningún otro dato** de esa persona como verificado. No existe un estado de "perfil verificado".
4. Toda verificación vence, máximo a los 12 meses, y hay que rehacerla.
5. Si la evidencia no alcanza, el resultado es "no verificable". **Nunca "verificado" por defecto.**
6. La persona ve si su título quedó verificado, y hasta cuándo.
7. Cambiar el nombre declarado no modifica esta verificación. Si deja de ser compatible con la credencial, se abre una revisión nueva y el evento anterior permanece intacto.
8. Decidir exige `verify_professional_credentials`, AAL2, asignación vigente y ausencia de conflicto; `curate_global_catalog` no concede esta capacidad.

### HU-BO-022 — Publicar el catálogo global

**Como** integrante del equipo
**quiero** publicar disciplinas, tipos de actividad, movimientos y equipamiento
**para** que gimnasios y personas tengan de dónde escoger.

`E-BO-06` · imprescindible

**Criterios**

1. El catálogo global lo publica **solo Allfit**. Un gimnasio crea movimientos privados suyos, pero no puede subirlos al global.
2. Un código publicado es estable y no se reutiliza para otra cosa.
3. Archivar algo lo retira de las búsquedas pero **no rompe** las sesiones ni las plantillas que ya lo usaban.
4. Publicar o archivar exige `curate_global_catalog`, AAL2 y una asignación vigente.

### HU-BO-023 — Publicar las reglas de validación de una actividad

**Como** integrante del equipo
**quiero** publicar qué datos mínimos exige cada tipo de actividad
**para** que los resultados sean comparables.

`E-BO-06` · importante

**Criterios**

1. Defino qué se exige para que una sesión cuente como completa en cada modalidad.
2. Una versión publicada **no se edita**: corregir exige publicar otra.
3. Publicar una versión nueva **no reinterpreta** las sesiones ya registradas.
4. Publicar exige `curate_global_catalog`, AAL2 y una asignación vigente.

### HU-BO-024 — Publicar las definiciones de permiso

**Como** integrante del equipo
**quiero** publicar qué abarca exactamente cada permiso que una persona concede
**para** que sepa qué está entregando.

`E-BO-06` · importante

**Criterios**

1. Cada permiso enumera qué recursos y campos incluye y cuáles excluye.
2. Una versión publicada es inmutable.
3. Publicar una versión más amplia **no amplía** lo ya concedido: quien aceptó la anterior conserva la anterior.
4. Publicar exige `curate_global_catalog`, AAL2 y una asignación vigente.

---

## E-BO-07 · Planes de Allfit y Premium

### HU-BO-025 — Publicar un plan de Allfit

**Como** fundador
**quiero** publicar los planes que Allfit le vende a las personas
**para** poder cobrar Premium.

`E-BO-07` · imprescindible

**Criterios**

1. Defino nombre, precio, moneda y si el cobro es mensual o anual.
2. **El plan gratuito también se publica aquí**, con precio cero, y sus límites se definen igual que los de pago.
3. Cambiar qué incluye un plan se hace publicando otra versión. **A quien ya está suscrito no le cambia nada.**
4. Ninguna función de privacidad puede limitarse: ni ver quién accedió a sus datos, ni pedir su eliminación, ni administrar permisos.
5. Publicar un plan exige `manage_platform_commercial`, AAL2 y revisión por otra persona cuando cambia precio o funciones.

### HU-BO-026 — Definir qué incluye cada plan

**Como** fundador
**quiero** decidir qué funciones y con qué límite tiene cada plan
**para** ajustar la oferta sin depender de un despliegue.

`E-BO-07` · imprescindible

**Criterios**

1. Por cada función decido si está incluida y con qué límite; sin límite significa ilimitada.
2. Puedo dejar una función fuera del plan gratuito por completo.
3. **El cambio se aplica publicando una versión nueva, sin tocar código ni desplegar nada.**
4. Veo qué cambia respecto de la versión anterior antes de publicar.
5. Publicar exige `manage_platform_commercial`, AAL2 y conserva actor, asignación de deber y versión anterior.

### HU-BO-027 — Habilitar a un gimnasio para dar Premium

**Como** fundador que cerró un acuerdo con un gimnasio
**quiero** marcar que sus clientes activos tienen Premium
**para** cumplir lo pactado.

`E-BO-07` · importante

**Criterios**

1. Marco el gimnasio y anoto la referencia del acuerdo comercial.
2. Sus clientes con plan **activo** obtienen Premium; los suspendidos no.
3. Esto **no cobra nada**: lo que Allfit le cobre al gimnasio se factura por fuera.
4. Al quitarlo, sus clientes vuelven al plan gratuito **sin perder ningún dato**.
5. La acción exige `manage_platform_commercial`, AAL2, referencia de acuerdo y auditoría del actor humano.

---

## E-BO-08 · Equipo de Allfit

### HU-BO-028 — Dar o quitar acceso a alguien del equipo

**Como** fundador
**quiero** dar o quitar el rol base y deberes de plataforma
**para** controlar por separado quién entra y qué puede hacer.

`E-BO-08` · imprescindible

**Criterios**

1. El rol `allfit_admin` permite iniciar sesión, pero no concede ninguna operación sin deber vigente.
2. **No puedo asignarme ni el rol ni un deber a mí mismo.** Administrar acceso exige `manage_platform_access` y AAL2.
3. **Nunca puede quedar el Backoffice sin ningún administrador base activo.**
4. Cada deber tiene catálogo cerrado, vigencia máxima de 90 días, AAL requerido y recertificación independiente.
5. Quitar el rol revoca la sesión; suspender, revocar o vencer un deber corta inmediatamente sus operaciones y cierra ventanas break-glass del solicitante afectado.
6. El historial de roles y deberes se conserva; retirar no borra ni reescribe.

### HU-BO-029 — Ver quién del equipo tiene acceso

**Como** fundador
**quiero** ver quién puede entrar al Backoffice
**para** saber siempre quién alcanza los datos.

`E-BO-08` · imprescindible

**Criterios**

1. Veo quién tiene rol base hoy y quién lo tuvo antes.
2. Veo sus deberes vigentes, suspendidos, vencidos o revocados, con vigencia, AAL, otorgante y última recertificación.
3. La consulta exige `manage_platform_access` o `audit_platform_access`; ninguna organización ni persona externa puede verla.

### HU-BO-030 — Ver el registro de accesos

**Como** responsable independiente de seguridad o privacidad
**quiero** consultar quién del equipo miró los datos de quién
**para** poder responder si alguien pregunta.

`E-BO-08` · importante

**Criterios**

1. Veo quién accedió, a qué tipo de dato, sobre quién y cuándo.
2. Puedo filtrar por integrante del equipo, por persona afectada o por fecha.
3. Veo el registro del acceso, no el contenido consultado.
4. **El registro no se puede editar ni borrar.**
5. La consulta exige `audit_platform_access`, AAL2 y no permite revisar como auditor independiente un caso break-glass que solicité o aprobé.

### HU-BO-031 — Diagnosticar un problema técnico

**Como** integrante del equipo
**quiero** ver el estado técnico de una operación que falló
**para** entender qué pasó sin abrir los datos de nadie.

`E-BO-08` · importante

**Criterios**

1. Veo identificadores, estados, marcas de tiempo, errores y reintentos.
2. Veo si un aviso quedó atascado, si un cobro no llegó, si algo falló al sincronizar.
3. Resuelve la mayoría de los casos sin necesidad de abrir el dato de nadie.
4. Exige `diagnose_support_metadata`; la proyección no devuelve nombres, contactos completos ni contenido personal.

---

## E-BO-09 · Obligaciones legales

### HU-BO-032 — Seguir las solicitudes de eliminación de datos

**Como** integrante del equipo
**quiero** ver y hacer seguimiento a las solicitudes de eliminación
**para** cumplir en el plazo legal.

`E-BO-09` · importante

**Criterios**

1. Veo las solicitudes abiertas, desde cuándo y qué falta para cerrarlas.
2. Veo la resolución por categoría: qué se eliminó, qué se anonimizó, qué se conserva y hasta cuándo.
3. El plazo objetivo son 30 días y el panel avisa cuando alguna se acerca al límite.
4. La consulta exige `manage_privacy_requests`, AAL2 y sólo muestra los datos necesarios para la disposición.

### HU-BO-033 — Suspender una eliminación por una obligación legal

**Como** responsable ante un requerimiento
**quiero** suspender la eliminación de datos concretos
**para** cumplir sin perder la evidencia.

`E-BO-09` · después

**Criterios**

1. Declaro alcance, motivo, vigencia y responsable. No existen suspensiones indefinidas.
2. Suspender **no da acceso** a nada que no se tuviera ya.
3. La persona ve que ese dato está suspendido, con el motivo y el plazo.
4. Al liberar, la eliminación sigue su curso.
5. Aplicar o liberar el hold exige `manage_privacy_requests`, AAL2, motivo cerrado y separación respecto de quien solicitó el acceso excepcional al mismo dato.

---

## 4. Procesos automáticos

No son historias porque nadie los pide: se disparan solos. El Backoffice es
donde se ven sus efectos y sus fallos, en `HU-BO-005` y `HU-BO-031`.

| Proceso | Cuándo corre | Qué garantiza |
| --- | --- | --- |
| Entrega de eventos internos | Continuo | Un evento se publica solo después de confirmarse la operación que lo produjo, nunca antes |
| Envío de notificaciones | Por evento | Solo a contactos verificados. Un aviso **nunca** contiene resultados, medidas, salud ni comidas: avisa el hecho y enlaza a la app. Correo, SMS y push van aislados: uno caído no arrastra a los otros |
| Vencimiento de invitaciones | Programado | Vencer conserva la evidencia. Una invitación ya aceptada nunca se revierte |
| Vencimiento de cambios y recuperaciones de identidad | Según la vigencia presentada a la persona | Una intención vencida no confirma nada ni vuelve a funcionar; reintentar crea una nueva y conserva la evidencia anterior |
| Vencimiento de propuestas de corrección | Programado, 30 días | El silencio de la persona **nunca** cuenta como aceptación |
| Vencimiento de suplencias | Programado | Limpia estado; la autorización ya rechaza a un suplente vencido aunque el proceso no haya corrido |
| Recordatorio anual de permisos | Programado, 12 meses | Le recuerda a la persona revisar qué comparte. **No corta el acceso** si no responde |
| Eliminación al vencer la retención | Programado | Elimina o anonimiza de forma irreversible, salvo suspensión vigente. Los respaldos no resucitan datos eliminados |
| Resolución de solicitudes de eliminación | Por solicitud y programado | Cada categoría se resuelve por su política, no por una regla global |
| Reaplicación tras restaurar un respaldo | Manual | Una restauración **no revive** datos eliminados. El sistema no acepta tráfico hasta reaplicarlas |
| Recálculo de indicadores | Por corrección o cambio | Un indicador desactualizado **no se muestra** hasta recalcularse |
| Registro de cobros de gimnasios | Webhook de la pasarela | Un cobro fallido suspende de forma indefinida. **Nunca termina nada** ni toca permisos |
| Registro de cobros de Allfit | Webhook | Un cobro fallido baja a plan gratuito. **Bajar a gratis nunca elimina datos** |

---

## 5. Lo que no entra

| Ausencia | Motivo |
| --- | --- |
| Crear la cuenta de una persona | Se registra sola y acepta sus propios términos |
| Reescribir historial de entrenamiento, cuerpo, salud o nutrición | Es de la persona |
| Operar un gimnasio en nombre de su dueño | Se le entrega y él lo administra |
| Cobrar, girar o conciliar dinero | Los cobros los reporta la pasarela |
| Facturarle a los gimnasios dentro de la plataforma | Se factura por fuera |
| Analítica avanzada: cohortes, retención, embudos | Después. Al lanzar bastan los números básicos |
| Roles acotados por nivel | Cuando llegue el equipo de soporte |
| Mensajería con personas o gimnasios | Diferida |

## 6. Resumen

| Épica | Historias | Imprescindibles |
| --- | --- | ---: |
| `E-BO-01` Entrar | `HU-BO-001` – `HU-BO-003` | 3 de 3 |
| `E-BO-02` Panel de inicio | `HU-BO-004` – `HU-BO-005` | 1 de 2 |
| `E-BO-03` Personas | `HU-BO-006` – `HU-BO-011` | 3 de 6 |
| `E-BO-04` Gimnasios | `HU-BO-012` – `HU-BO-017` | 3 de 6 |
| `E-BO-05` Suscripciones y pagos | `HU-BO-018` – `HU-BO-020` | 1 de 3 |
| `E-BO-06` Contenido y verificación | `HU-BO-021` – `HU-BO-024` | 2 de 4 |
| `E-BO-07` Planes y Premium | `HU-BO-025` – `HU-BO-027` | 2 de 3 |
| `E-BO-08` Equipo de Allfit | `HU-BO-028` – `HU-BO-031` | 2 de 4 |
| `E-BO-09` Obligaciones legales | `HU-BO-032` – `HU-BO-033` | 0 de 2 |
| **Total** | **33 historias** | **17 imprescindibles** |

Las 17 imprescindibles son el Backoffice mínimo para lanzar: entrar, ver cómo va
el negocio, encontrar a una persona y abrir su ficha y su entrenamiento, montar
y entregar un gimnasio, ver sus pagos, verificar títulos, publicar el catálogo y
los planes, y controlar quién del equipo tiene acceso.
