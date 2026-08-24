# Historias de usuario — Allfit Space

**Estado:** borrador para revisión conjunta<br>
**Fecha:** 10 de agosto de 2026<br>
**Producto:** la aplicación de la persona. Móvil, iOS y Android.

Este documento es **autocontenido**: no hay que abrir ningún otro archivo para
entenderlo ni para construir a partir de él.

---

## 1. Cómo se lee una historia

```markdown
### HU-SP-046 — Título escrito desde quien actúa

**Como** <quién>
**quiero** <qué>
**para** <para qué>.

`E-SP-07` · imprescindible · HU-SP-032

**Criterios**

1. <regla verificable, en lenguaje de negocio>
```

| Elemento | Qué significa |
| --- | --- |
| `HU-SP-###` | Identificador estable. No se reutiliza nunca |
| `E-SP-##` | Épica a la que pertenece |
| Prioridad | `imprescindible` sin esto no se lanza · `importante` debería estar · `después` puede esperar |
| `HU-SP-###` al final | De qué otra historia depende |

Los criterios describen **qué debe ser cierto**, no cómo se ve.

## 2. La promesa del producto

Allfit Space es la aplicación personal de fitness. La idea que lo sostiene todo
es el **Fitness ID**: la identidad y el historial de entrenamiento pertenecen a
la persona, no al gimnasio ni al entrenador.

De ahí salen tres reglas que atraviesan todas las historias:

1. **Una persona puede usar la aplicación sola.** Sin gimnasio, sin entrenador y sin invitación. Todo lo demás es opcional.
2. **Nadie ve sus datos sin que ella lo autorice.** Dentro de la misma confirmación decide la relación y cada categoría de forma independiente, viendo antes qué comparte; en cualquier momento puede quitar una categoría o esconder una sesión concreta.
3. **Terminar con un gimnasio no le quita nada.** Conserva su historial completo.

## 3. Vocabulario

Tres palabras que significan cosas distintas y no deben mezclarse:

| Palabra | Qué es |
| --- | --- |
| **Programa** | El entrenamiento que la persona sigue: semanas de sesiones planificadas |
| **Plan** | Lo que le paga a un gimnasio, o lo que le paga a Allfit por Premium |
| **Membresía** | Que alguien *trabaja* en una organización. Nunca se usa para lo que un cliente paga |
| **Scope** | Contrato versionado que define una categoría, su finalidad y los campos que cubre |
| **Grant** | Mi autorización para un scope, versión y nivel de acceso exactos |
| **Nivel de acceso** | Acciones que autorizo sobre un scope, como lectura o contribución |

En fuerza la interfaz puede decir "rutina" y "ejercicio". En el resto del
producto son **plantilla de sesión** y **movimiento**, porque running, yoga y
movilidad no se organizan en series y repeticiones.

## 4. Qué no entra en esta versión

| Ausencia | Motivo |
| --- | --- |
| Buscar o contratar entrenadores y gimnasios | Marketplace diferido |
| Reservar clases o cupos | Diferido |
| Comunidad, amigos, retos, feed | Diferido |
| Mensajería con el entrenador | Diferida |
| Leer datos del reloj: pulso, GPS, sueño | Diferido. Sí se **escriben** los entrenamientos hacia Apple Health y Health Connect |
| Escanear una comida con IA para identificarla | Diferido. La persona sube la foto y escribe qué comió |
| Copiloto de IA, planificación automática | Diferido |
| Menores de 18 años | Fuera de esta versión |

---

## E-SP-00 · Entrar a la aplicación

### HU-SP-001 — Crear mi cuenta

**Como** persona que descarga la aplicación
**quiero** crear una cuenta
**para** empezar a usarla.

`E-SP-00` · imprescindible

**Criterios**

1. Me registro con correo y contraseña.
2. Recibo un código o enlace para verificar que el correo es mío.
3. Si ese correo ya tiene cuenta, el mensaje **no me lo confirma**: me dice que revise su correo, exista o no. Así nadie averigua quién está registrado.
4. Crear la cuenta todavía **no me da Fitness ID**: eso ocurre al completar el registro.

### HU-SP-002 — Iniciar sesión

**Como** persona registrada
**quiero** entrar a mi cuenta
**para** usar la aplicación.

`E-SP-00` · imprescindible

**Criterios**

1. Entro con mi correo y contraseña.
2. Un intento fallido no me dice si el error fue el correo o la contraseña.
3. Si dejé el registro a medias, la aplicación me lleva al punto donde lo dejé.
4. Mi sesión se mantiene entre aperturas: no tengo que entrar cada vez que abro la app.

### HU-SP-003 — Cerrar sesión

**Como** persona
**quiero** cerrar sesión
**para** dejar de estar dentro en este teléfono.

`E-SP-00` · imprescindible

**Criterios**

1. Al cerrar sesión no queda nada mío consultable en el teléfono.
2. Si tengo un entrenamiento sin sincronizar, **se me avisa antes** de cerrar, para no perderlo.

### HU-SP-004 — Recuperar mi contraseña

**Como** persona que olvidó su contraseña
**quiero** restablecerla
**para** volver a entrar.

`E-SP-00` · imprescindible

**Criterios**

1. Pido el restablecimiento con mi correo y recibo un enlace temporal.
2. El mensaje es el mismo exista o no la cuenta.
3. Al cambiar la contraseña se cierran mis sesiones en otros dispositivos.

### HU-SP-005 — Cambiar mi contraseña

**Como** persona
**quiero** cambiar mi contraseña
**para** mantener mi cuenta segura.

`E-SP-00` · importante

**Criterios**

1. Debo escribir la contraseña actual antes de poner la nueva.
2. Al cambiarla se cierran mis sesiones en otros dispositivos y sigo dentro en este.

---

## E-SP-01 · Registro y onboarding

### HU-SP-006 — Empezar mi registro

**Como** persona que acaba de crear su cuenta
**quiero** iniciar el registro en Allfit Space
**para** empezar a construir mi identidad fitness.

`E-SP-01` · imprescindible

**Criterios**

1. Puedo iniciar el registro sin invitación, sin gimnasio y sin entrenador.
2. Si abandono a mitad y vuelvo, retomo el mismo registro en lugar de empezar otro.
3. Iniciar el registro no crea todavía mi Fitness ID ni ningún vínculo con una organización.
4. Si llegué desde una invitación, esa invitación queda asociada a mi registro pero no se acepta por el hecho de registrarme.
5. El registro necesita conexión: no puede completarse en modo local.

### HU-SP-007 — Acreditar que soy mayor de edad

**Como** persona en proceso de registro
**quiero** acreditar mi edad
**para** poder activar mi Fitness ID.

`E-SP-01` · imprescindible

**Criterios**

1. La acreditación ocurre antes de que se me pida cualquier dato de entrenamiento, cuerpo o salud.
2. Si no puedo acreditar los 18 años, el registro no avanza y no se guarda ningún dato fitness mío.
3. Un resultado dudoso o un fallo del sistema nunca me deja pasar como elegible.
4. No se me exige entregar la fecha de nacimiento completa si una declaración de mayoría de edad resuelve el control.
5. La acreditación queda registrada con la política que se me aplicó y el momento en que ocurrió.

### HU-SP-008 — Activar mi Fitness ID

**Como** persona que acreditó su edad y aceptó los términos
**quiero** completar el registro
**para** tener mi identidad fitness activa y empezar a usar la aplicación.

`E-SP-01` · imprescindible

**Criterios**

1. Al completar el registro tengo exactamente un Fitness ID, y es el único que tendré.
2. Si ya tenía cuenta y llegué por una invitación posterior, se reutiliza mi identidad: no se crea otra.
3. Ninguna organización puede completar este paso en mi nombre.
4. Sin la acreditación de edad no se activa nada, aunque exista una invitación vigente dirigida a mí.
5. Si toco dos veces por error, sigo teniendo una sola identidad.
6. Activarme no crea organización, relación profesional, asignación ni permiso de datos.

### HU-SP-009 — Ver mi identidad y mis cuentas

**Como** persona registrada
**quiero** ver mi Fitness ID y qué cuentas de acceso tengo vinculadas
**para** entender con qué me estoy identificando.

`E-SP-01` · imprescindible

**Criterios**

1. Veo mi Fitness ID y las cuentas de acceso vinculadas a él.
2. Esta vista no muestra mis permisos concedidos ni mis relaciones: cada cosa tiene su propio lugar.
3. Puedo consultarla sin conexión sobre lo ya descargado, pero nunca se usa para decidir qué puedo hacer.

### HU-SP-010 — Decirle a Allfit qué quiero lograr

**Como** persona que acaba de activar su cuenta
**quiero** decir cuál es mi objetivo
**para** que la aplicación se ajuste a lo que busco.

`E-SP-01` · imprescindible

**Criterios**

1. Elijo mi objetivo principal de una lista clara: bajar de peso, ganar músculo, ponerme en forma, mejorar mi rendimiento, correr una carrera, mantenerme.
2. Puedo elegir solo uno como principal, para que la aplicación tenga una dirección.
3. Puedo cambiarlo cuando quiera desde mi perfil.

**Alcance del lanzamiento inicial.** Decidido el 23 de agosto de 2026: **mejorar mi
rendimiento no se ofrece en el lanzamiento inicial de V1**. Entra más adelante y por
eso sigue declarado en el catálogo de atributos, pero la lista del criterio 1 arranca
con cinco. La razón es de producto: es el único de los seis cuyo avance no se ve en el
cuerpo, así que la pantalla no puede mostrar lo que promete y ninguna de las otras
cinco tiene ese problema.

### HU-SP-011 — Registrar mis datos físicos

**Como** persona en el onboarding
**quiero** registrar mi peso y mi estatura
**para** que mi progreso y mis cargas tengan referencia.

`E-SP-01` · imprescindible

**Criterios**

1. Registro peso y estatura, y elijo si los quiero en kilos o libras, centímetros o pies.
2. Estos datos son **míos**: quedan como mi primer registro de progreso y puedo actualizarlos cuando quiera.
3. Puedo saltarme este paso; la aplicación funciona sin ellos, aunque el progreso será menos preciso.

### HU-SP-012 — Contar qué entreno y desde cuándo

**Como** persona en el onboarding
**quiero** decir qué practico y con cuánta experiencia
**para** que no me traten como principiante si no lo soy, ni al revés.

`E-SP-01` · imprescindible

**Criterios**

1. Elijo una o varias disciplinas: fuerza, running, movilidad, híbrido y las demás disponibles.
2. Digo cuánta experiencia tengo, en términos simples: empezando, con algo de práctica, con experiencia.
3. Digo cuántos días a la semana puedo entrenar y cuánto tiempo tengo por sesión.

**Alcance del lanzamiento inicial.** Decidido el 24 de agosto de 2026: el criterio 2
declara **un nivel global**, no uno por disciplina. Decía «en cada una», y eso no es
construible hoy: `catalog.disciplines` solo tiene filas sintéticas de prueba en
`seed.sql` —que declara que producción no lo carga y exige curaduría aprobada— y su
única política es `to allfit_owner` sin ningún `grant` para el rol de runtime, así que
Space no puede leer la lista. Sin disciplinas reales que enumerar, el nivel por
disciplina no tiene sobre qué colgarse. El argumento de producto apunta al mismo
sitio: si las cargas se ajustan desde la primera semana, la precisión por disciplina
en el momento de registrarse compra poco. El criterio 1 espera por la misma razón, y
el criterio 3 es otra pregunta y merece su propia pantalla.

**Pendiente de confirmar.** Los niveles de volumen que la pantalla anuncia —poco,
medio, alto— y los cortes de tiempo —seis meses, años— vienen de un prototipo y **no
los ha validado nadie que programe entrenamiento**. Ninguna pieza de `planning` los
consume todavía, así que hoy describen una intención y no el comportamiento del plan.
Revisar antes de tratarlos como promesa.

### HU-SP-013 — Contar dónde entreno y con qué

**Como** persona en el onboarding
**quiero** decir dónde entreno y qué equipo tengo
**para** que no me propongan ejercicios que no puedo hacer.

`E-SP-01` · importante

**Criterios**

1. Digo si entreno en gimnasio, en casa, al aire libre o en varios sitios.
2. Marco el equipo con el que cuento, de una lista.
3. Si entreno en casa con poco equipo, eso queda claro y se tiene en cuenta.

### HU-SP-014 — Avisar si tengo alguna limitación

**Como** persona con una lesión o una molestia
**quiero** avisarlo desde el principio
**para** que no me pongan a hacer algo que me haga daño.

`E-SP-01` · importante

**Criterios**

1. Puedo declarar dolores, lesiones o limitaciones, en lenguaje sencillo.
2. **Esto no es una historia clínica**: no se me piden diagnósticos, exámenes ni documentos médicos.
3. Puedo dejarlo en blanco y agregarlo después.
4. Es de las categorías más delicadas y solo la ve un gimnasio si tengo relación con él.

### HU-SP-015 — Saltarme el onboarding y retomarlo después

**Como** persona con prisa
**quiero** empezar a usar la aplicación sin llenar todo
**para** no abandonar en la primera pantalla.

`E-SP-01` · imprescindible

**Criterios**

1. Puedo saltarme cualquier paso que no sea la edad, mi nombre y los términos.
2. La aplicación funciona con lo que haya: si falta algo, se nota dónde y por qué conviene completarlo.
3. Si lo dejo a medias y vuelvo después, retomo donde iba, no desde el principio.
4. Desde mi perfil puedo completar lo que falte en cualquier momento.

### HU-SP-096 — Decir mi sexo biológico

**Como** persona en el onboarding
**quiero** indicar mi sexo biológico
**para** que las estimaciones y las referencias de carga se calculen sobre un cuerpo parecido al mío.

`E-SP-01` · imprescindible · HU-SP-008

**Criterios**

1. Antes de que se me pregunte, se me dice **para qué se usa el dato**: entra en cálculos, no en cómo la aplicación me nombra ni me presenta.
2. **El sexo biológico y la identidad de género no son el mismo dato.** Aquí se pregunta el primero, porque es el que cambia un cálculo. La aplicación nunca lo trata como mi identidad ni lo muestra como tal.
3. Puedo no responder. La aplicación funciona igual, con estimaciones menos ajustadas, y lo dice en lugar de fingir precisión.
4. Puedo cambiarlo cuando quiera desde mi perfil, y cambiarlo no reescribe lo que ya registré.
5. Solo lo ve un gimnasio si tengo relación con él y le autoricé mi perfil de entrenamiento.

### HU-SP-097 — Señalar en qué parte del cuerpo quiero enfocarme

**Como** persona en el onboarding
**quiero** señalar qué zonas del cuerpo quiero trabajar más
**para** que lo que me propongan tenga en cuenta lo que a mí me importa.

`E-SP-01` · importante · HU-SP-010

**Criterios**

1. Señalo una o varias zonas sobre una figura del cuerpo, y **puedo elegir las mismas zonas de una lista** sin usar la figura.
2. Es un énfasis, no un plan: señalar una zona no excluye el resto del cuerpo ni promete un programa dedicado solo a ella.
3. Puedo decir **«todo el cuerpo»**, y entonces el énfasis lo decide mi objetivo principal. Es una respuesta explícita y no dejar la pregunta en blanco: para continuar tengo que contestar algo.
4. Puedo cambiarlo cuando quiera desde mi perfil.

### HU-SP-098 — Decir cómo me llamo

**Como** persona que acreditó su edad
**quiero** decir mi nombre, mi apellido y con qué usuario me identifico
**para** tener ya mi Fitness ID, aunque todavía no esté activo, y que la aplicación sepa cómo llamarme.

`E-SP-01` · imprescindible · HU-SP-007

**Criterios**

1. Doy nombre y apellido. Sin ellos no hay Fitness ID que crear, así que **este paso no se puede saltar**.
2. Veo con qué correo entro y no lo puedo cambiar aquí. Cambiarlo es otra cosa y exige verificarlo de nuevo.
3. Elijo un nombre de usuario **que no tenga nadie más**. Si el que pido ya está en uso, se me dice y elijo otro.
4. Si mi cuenta ya venía con mi nombre, lo veo escrito y solo lo confirmo o lo corrijo.
5. Al terminar este paso mi Fitness ID **ya existe**, pendiente de activación. Lo que responda de aquí en adelante queda guardado sobre él, así que si cierro la aplicación y vuelvo, sigo donde iba.
6. Puedo cambiar mi nombre y mi usuario después desde mi perfil.

---

## E-SP-02 · Invitaciones y relaciones

### HU-SP-016 — Ver qué me está proponiendo una organización

**Como** persona que recibió una invitación
**quiero** ver quién me invita y qué me está proponiendo exactamente
**para** decidir con información.

`E-SP-02` · imprescindible

**Criterios**

1. Veo la organización, la parte responsable que se presenta, el propósito y **cada propuesta de cliente por separado**: iniciar una relación profesional, recibir un programa o conceder un scope.
2. Para la relación veo por separado cada scope solicitado, su finalidad, la versión de su contrato y el nivel de acceso solicitado.
3. Puedo abrir la invitación antes de tener cuenta.
4. La invitación no revela si mi contacto ya tiene cuenta en Allfit.
5. Una invitación inválida y una vencida se ven igual: no puedo deducir cuál es cuál.
6. Abrir la invitación no acepta nada.
7. Las invitaciones para integrarse al staff o equipo no se abren ni se deciden en Space; pertenecen exclusivamente a Studio.

### HU-SP-017 — Aceptar o rechazar cada propuesta por separado

**Como** persona invitada
**quiero** decidir cada propuesta de forma independiente
**para** aceptar solo lo que quiero.

`E-SP-02` · imprescindible

**Criterios**

1. Puedo aceptar la relación profesional y rechazar el programa propuesto: es un resultado válido y esperado.
2. No existe ningún botón de "aceptar todo".
3. Antes de decidir veo **qué información voy a compartir**, para qué finalidad, bajo qué versión y con qué nivel de acceso.
4. Acepto o rechazo cada scope de forma independiente. **Aceptar la relación no concede automáticamente ningún scope.**
5. La relación y los scopes pueden confirmarse en una sola pantalla y con una sola acción, sin convertirlos en una aceptación global.
6. Puedo aceptar la relación y rechazar todos los scopes. La relación queda vigente, pero el gimnasio no accede a mi Fitness ID y el programa propuesto no se materializa.
7. Aceptar **no** significa aceptar términos futuros, pagos, publicación, investigación ni uso de mis datos para entrenar modelos. Solo lo que decidí explícitamente.
8. Si rechazo la relación, el programa que dependía de ella tampoco se materializa.
9. Aunque acepte el programa, solo se materializa si acepté la relación y concedí `relationship_training` con el nivel requerido.
10. Si ya tenía cuenta, acepto con mi identidad existente y mi historial anterior no se comparte hacia atrás.
11. Reintentar la decisión no crea vínculos ni grants duplicados.
12. Esta historia no crea membresías ni roles de equipo; esas decisiones pertenecen exclusivamente a Studio.

### HU-SP-018 — Ver mis relaciones profesionales

**Como** persona
**quiero** ver con qué organizaciones tengo o tuve una relación
**para** saber quién me atiende y quién me atendió.

`E-SP-02` · importante

**Criterios**

1. Veo mis relaciones activas y también las terminadas.
2. Cuando volví a trabajar con la misma organización, veo el enlace a la relación anterior.
3. Ver la continuidad no concede a la relación nueva ningún acceso a lo de la anterior.

### HU-SP-019 — Ver la historia de una relación

**Como** persona
**quiero** consultar qué ha pasado en una relación
**para** tener registro de los cambios que me afectaron.

`E-SP-02` · importante

**Criterios**

1. Veo altas, cambios de profesional, suplencias, consentimientos y la terminación, en orden.
2. El registro no se edita ni se borra.
3. Si la organización declaró un motivo de terminación, no lo veo: cada parte solo ve el motivo que declaró.

### HU-SP-095 — Decidir y controlar una suplencia

**Como** persona con una relación profesional vigente
**quiero** aceptar o rechazar a un suplente y poder terminar su cobertura
**para** controlar qué profesionales pueden ejercer temporalmente mis grants.

`E-SP-02` · importante

**Criterios**

1. La propuesta muestra la identidad del profesional, la organización y las fechas de inicio y fin de la cobertura.
2. Mientras la propuesta esté pendiente, el profesional no obtiene acceso. Mi silencio nunca equivale a aceptación.
3. Solo puedo aceptar o rechazar una propuesta pendiente, no vencida y perteneciente a una relación mía que siga vigente.
4. Si acepto, la suplencia entra en vigor en la fecha propuesta o en el instante de aceptación, lo que ocurra después. Nunca produce acceso retroactivo.
5. Si rechazo, la relación y el profesional titular no cambian.
6. Aceptar no crea ni amplía grants. El acceso exige simultáneamente relación y grant vigentes, suplencia aceptada y dentro de fecha, membresía activa, rol compatible y las capacidades o credenciales que requiera cada acción.
7. Puedo terminar una suplencia activa en cualquier momento, sin justificarlo. El acceso se corta de inmediato sin terminar la relación ni afectar al titular.
8. La suplencia caduca automáticamente en su fecha de fin aunque nadie ejecute otra acción.
9. Mi decisión y cualquier terminación quedan en el historial; reintentar no las duplica.

### HU-SP-020 — Terminar una relación profesional

**Como** persona
**quiero** terminar mi relación con una organización
**para** dejar de compartir mi entrenamiento con ella.

`E-SP-02` · imprescindible

**Criterios**

1. El efecto es inmediato: no hay preaviso ni período de gracia.
2. La organización deja de ver cualquier dato mío producido desde ese momento.
3. La organización conserva una vista congelada de lo que ya le había compartido, hasta el instante del corte, y para consultarla necesita un caso justificado y acotado.
4. Nada de lo que registre después es visible para ella, nunca.
5. Conservo mi Fitness ID y todo mi historial.
6. Mi programa asignado queda pausado y esperando **mi** decisión, no la de nadie más.
7. Declarar un motivo es opcional.
8. Si algo falla durante la terminación, no queda a medias: o se aplica completa o no se aplica.

---

## E-SP-03 · Perfil fitness, cuerpo y salud

### HU-SP-021 — Declarar mi contexto de entrenamiento

**Como** persona
**quiero** declarar mis objetivos, disciplinas, experiencia, disponibilidad y equipamiento
**para** que mi entrenamiento se ajuste a mi realidad.

`E-SP-03` · imprescindible

**Criterios**

1. Lo que declaro queda marcado como declarado por mí.
2. Mi declaración **no se sobrescribe** con la observación de un profesional ni con un cálculo del sistema: las tres pueden coexistir.
3. Declarar algo no lo convierte en verificado.
4. Puedo declarar sin conexión y se sincroniza después.
5. Solo se me permiten atributos del catálogo de perfil; no es un campo libre.

### HU-SP-022 — Corregir algo que declaré

**Como** persona
**quiero** corregir un dato que declaré
**para** mantener mi perfil al día.

`E-SP-03` · importante

**Criterios**

1. Puedo corregir cualquier cosa que yo haya declarado.
2. El valor anterior no se destruye: queda como historia con el motivo del cambio.
3. No puedo editar la observación de un profesional; para eso existe el flujo de propuesta en sentido contrario.
4. Dos correcciones seguidas producen dos versiones ordenadas; ninguna se pierde.

### HU-SP-023 — Ver mi perfil fitness

**Como** persona
**quiero** ver mi perfil completo
**para** entender qué sabe de mí la plataforma.

`E-SP-03` · imprescindible

**Criterios**

1. Veo **todo lo mío**: lo que declaré, lo que observó un profesional, lo que midió un dispositivo, lo que calculó el sistema y lo que fue verificado.
2. Veo categorías que ninguna organización puede ver.
3. Cuando hay varias versiones de un dato, el perfil me explica cuál está mostrando y por qué.
4. Las alternativas no se ocultan ni se borran.

### HU-SP-024 — Ver todas las versiones de un dato de mi perfil

**Como** persona
**quiero** consultar el historial de un atributo concreto
**para** ver quién dijo qué y cuándo.

`E-SP-03` · importante

**Criterios**

1. Veo las afirmaciones que coexisten sobre ese atributo.
2. De cada una veo su origen, quién la capturó, con qué método y si está verificada, como cosas separadas.
3. Una observación profesional nunca aparece presentada como si la hubiera declarado yo.

### HU-SP-025 — Registrar una medición o foto de progreso corporal

**Como** persona que sigue su evolución física
**quiero** registrar medidas, composición o fotos
**para** ver mi progreso en el tiempo.

`E-SP-03` · importante

**Criterios**

1. Esta información es una categoría aparte: que un profesional vea mis cargas de entrenamiento no significa que vea mi peso.
2. Las fotos se guardan sin metadatos de ubicación ni de dispositivo, y eso lo hace el servidor, no mi teléfono.
3. Si no se pueden quitar esos metadatos, la foto no se guarda.
4. Solo se comparte la foto que yo elijo; mi galería nunca se expone.
5. Puedo registrar sin conexión y la imagen sube al recuperar la red.

### HU-SP-026 — Ver mi progreso corporal

**Como** persona
**quiero** consultar mis mediciones y fotos
**para** comparar mi evolución.

`E-SP-03` · importante

**Criterios**

1. Veo mis registros ordenados por fecha de medición.
2. Los enlaces a mis fotos son temporales y no se pueden adivinar ni compartir por accidente.

### HU-SP-027 — Eliminar un registro de progreso corporal

**Como** persona
**quiero** eliminar una medición o una foto
**para** quitar algo que no quiero conservar.

`E-SP-03` · importante

**Criterios**

1. Eliminar un dato mío no revoca ningún permiso: son cosas distintas.
2. Un profesional que ya lo vio conserva el registro de que lo vio, pero no el dato.
3. Si la imagen no se puede borrar del almacenamiento, no se me reporta como eliminada: el proceso sigue intentándolo.
4. La eliminación no se confirma desde mi teléfono: necesita conexión.

### HU-SP-028 — Declarar dolor, lesión o limitación

**Como** persona con una molestia o restricción
**quiero** declararla
**para** que mi entrenamiento la tenga en cuenta.

`E-SP-03` · importante

**Criterios**

1. Es la categoría más protegida de todas: solo la ve quien tenga ese permiso específico.
2. Si registro dolor dentro de una sesión, ese dolor sigue siendo contexto de salud: permanece oculto aunque la sesión sí sea visible.
3. Esto no es historia clínica: no se me piden diagnósticos, laboratorios ni documentos médicos.
4. Solo puedo declarar tipos del catálogo reducido de V1: dolor, limitación y recuperación.
5. Puedo declarar sin conexión.

---

## E-SP-04 · Mis datos y quién los ve

La relación y los grants se deciden dentro de la misma confirmación, pero son
decisiones distintas. **Aceptar la relación no concede por sí solo ninguna
categoría.** Veo antes cada scope, su finalidad, versión y nivel de acceso, y
acepto o rechazo cada uno de forma independiente. No me llegan solicitudes
adicionales después.

Lo que conservo es lo importante: puedo **quitar** una categoría cuando quiera y
**esconder** una sesión concreta.

### HU-SP-029 — Ver qué voy a compartir antes de aceptar

**Como** persona a la que un gimnasio invita
**quiero** ver exactamente qué información va a ver de mí
**para** decidir con eso claro.

`E-SP-04` · imprescindible

**Criterios**

1. Antes de aceptar veo, categoría por categoría, qué van a poder ver: mi entrenamiento, mi historial anterior, mis medidas, mi contexto de salud, mi alimentación.
2. De cada categoría veo qué incluye y qué **no** incluye.
3. Lo que se me presentó queda guardado tal como lo vi. Si mañana cambian las definiciones, a mí me sigue aplicando la que acepté.
4. De cada categoría veo la finalidad, la versión del contrato y si se solicita lectura o contribución.
5. Acepto o rechazo cada categoría de forma independiente. **Aceptar la relación no autoriza automáticamente ninguna.**
6. Puedo confirmar todas mis decisiones en una sola acción; que la confirmación sea única no convierte los scopes en una autorización global.

### HU-SP-030 — Ver todo lo que comparto y con quién

**Como** persona con relaciones con gimnasios
**quiero** un panel con todo lo que estoy compartiendo
**para** controlarlo en un solo lugar.

`E-SP-04` · imprescindible

**Criterios**

1. Por cada gimnasio veo qué categorías comparto y desde cuándo.
2. Desde aquí quito lo que quiera, categoría por categoría.
3. Veo también los gimnasios con los que terminé y qué conservan de lo que compartí.
4. A los 12 meses se me recuerda revisar esto. Si no respondo **no se corta nada**: es un recordatorio, no un vencimiento.

### HU-SP-031 — Dejar de compartir una categoría

**Como** persona que compartió información
**quiero** revocar ese permiso cuando quiera
**para** cortar el acceso sin perder mi propio historial.

`E-SP-04` · imprescindible

**Criterios**

1. Revoco cada permiso por separado; revocar uno no afecta a los demás.
2. La organización deja de ver esa categoría **de inmediato**, sin ninguna demora tolerada.
3. Revocar no borra nada mío: los datos siguen en mi Fitness ID.
4. Los registros de quién accedió antes se conservan como evidencia; lo que desaparece es el acceso.
5. Un permiso revocado nunca se reactiva: volver a compartir exige un consentimiento nuevo.
6. Si la organización tenía abierta una consulta del historial de una relación terminada, queda cerrada.
7. Si el sistema no puede garantizar que todo lo derivado dejó de ser legible, la revocación no se reporta como hecha: se reintenta.

### HU-SP-032 — Ocultar una sesión propia para una organización

**Como** persona con más de una relación
**quiero** ocultar una sesión concreta para una organización
**para** compartir mi historial sin exponer todo lo que entreno por mi cuenta.

`E-SP-04` · imprescindible

**Criterios**

1. Puedo ocultar una sesión para una organización y dejarla visible para otra.
2. La ocultación aplica a **toda la organización**, no solo al coach actual, y sobrevive a un cambio de profesional.
3. La sesión oculta no aparece en el detalle, ni en los conteos, ni en las gráficas, ni como un hueco en una lista: no se puede deducir que existe.
4. Ocultar no borra la sesión de mi historial.
5. Ocultar no deshace lo que alguien ya vio legítimamente.
6. **No** puedo ocultar una sesión que se produjo dentro de esa misma relación. La protección es de **base de datos**: un guardián rechaza la fila si la sesión pertenece a esa relación, así que la regla no depende de que la aplicación la recuerde.

### HU-SP-033 — Volver a compartir una sesión oculta

**Como** persona
**quiero** revertir una ocultación
**para** volver a mostrar una sesión que había escondido.

`E-SP-04` · imprescindible

**Criterios**

1. En una relación activa puedo volver a compartirla hacia adelante.
2. Revertir no genera accesos al pasado.
3. Si la relación ya terminó, volver a compartir **no amplía** lo que la organización puede ver: la ventana congelada solo puede reducirse.
4. Una relación nueva no hereda mis preferencias: exige su propia decisión.

### HU-SP-034 — Ver qué sesiones tengo ocultas

**Como** persona
**quiero** consultar mis ocultaciones
**para** recordar qué escondí y a quién.

`E-SP-04` · imprescindible

**Criterios**

1. Solo yo veo mis ocultaciones.
2. Ninguna organización puede consultarlas ni deducirlas comparando conteos.

### HU-SP-035 — Pedir que se eliminen mis datos

**Como** persona
**quiero** solicitar la eliminación de categorías concretas o de mi cuenta completa
**para** ejercer mi derecho sobre mi información.

`E-SP-04` · después

**Criterios**

1. Declaro el alcance: categorías específicas o toda la cuenta.
2. Cada categoría se resuelve por su propia política: eliminar, anonimizar de forma irreversible, o conservar de forma restringida con una finalidad y un plazo.
3. Nada se resuelve marcando un dato como borrado y dejándolo ahí.
4. Anonimizar significa que no se puede volver atrás; cifrar o cambiar el identificador no cuenta.
5. Si un dato está retenido por una obligación, se me informa como suspendido, con el motivo y hasta cuándo.
6. El plazo objetivo de resolución es de 30 días.

### HU-SP-036 — Seguir el estado de mi solicitud de eliminación

**Como** persona que pidió la eliminación de sus datos
**quiero** ver cómo se resolvió cada parte
**para** saber qué se eliminó, qué se anonimizó y qué se conservó.

`E-SP-04` · después

**Criterios**

1. Veo la resolución **por categoría**, no un estado global.
2. De lo que se conserva veo con qué finalidad y hasta cuándo.
3. Lo suspendido por una obligación aparece como suspendido, con motivo y vigencia.

---

## E-SP-05 · Agenda y asignaciones

### HU-SP-037 — Ver qué tengo que entrenar

**Como** persona con entrenamiento asignado o propio
**quiero** ver mis sesiones planificadas de los próximos días
**para** saber qué me toca hoy sin buscarlo en varias pantallas.

`E-SP-05` · imprescindible

**Criterios**

1. Veo mis sesiones planificadas dentro del rango de fechas que consulte.
2. Todo se muestra en **mi** zona horaria, no en la de la organización que me asignó el programa.
3. Distingo si una sesión la administra un profesional, si viene de un programa que me asigné yo, o si quedó pausada.
4. Las sesiones de una asignación que quedó sin profesional aparecen como **pausadas**, nunca como incumplidas.
5. Puedo consultar la agenda ya descargada aunque esté sin conexión.

### HU-SP-038 — Ver el detalle de un programa asignado

**Como** persona con un programa asignado
**quiero** ver de dónde viene y en qué estado está
**para** entender quién lo administra.

`E-SP-05` · imprescindible

**Criterios**

1. Veo la versión exacta que me asignaron, los ajustes personales que se le hicieron, qué organización lo creó y si sigue administrado.
2. Puedo ver esto **incluso después** de terminar la relación: es el registro de lo que se me prescribió.

### HU-SP-039 — Leer el contenido exacto que me asignaron

**Como** persona con un programa asignado
**quiero** leer completo el contenido que voy a ejecutar
**para** saber qué tengo que hacer.

`E-SP-05` · imprescindible

**Criterios**

1. Leo íntegra la versión que me asignaron, aunque pertenezca a una organización.
2. Eso no me da acceso al resto del catálogo de esa organización.
3. El contenido no cambia por debajo: si la organización publica una versión nueva, la mía sigue siendo la que me asignaron.

### HU-SP-040 — Asignarme un programa por mi cuenta

**Como** persona que entrena sola
**quiero** asignarme un programa
**para** tener una estructura sin depender de un profesional.

`E-SP-05` · imprescindible

**Criterios**

1. Puedo asignarme un programa propio o uno global publicado.
2. Mi agenda queda creada completa en el momento de asignarme el programa, no cuando un proceso corra más tarde.
3. Nadie administra esta asignación: no tiene profesional a cargo.
4. Ninguna organización la ve, salvo que yo comparta explícitamente esa categoría.
5. Si se solapa con otro programa activo, se me advierte pero no se me bloquea.

### HU-SP-041 — Decidir qué pasa con mi plan cuando termina la relación

**Como** persona cuya relación terminó
**quiero** decidir si continúo con el programa por mi cuenta o lo termino
**para** no perder mi entrenamiento por un cambio de profesional.

`E-SP-05` · imprescindible

**Criterios**

1. La decisión es **solo mía**: ninguna organización puede tomarla.
2. Si continúo, sigo con el mismo programa y los mismos ajustes: no se copia ni cambia de versión.
3. Si lo termino, solo se cancelan las sesiones futuras que no empecé; lo que ya ejecuté permanece.
4. Mientras no decida, el programa no me genera sesiones, ni recordatorios, ni incumplimiento.
5. Ninguna organización nueva hereda la administración de este programa.

---

## E-SP-06 · Contenido de entrenamiento personal

### HU-SP-042 — Crear una plantilla de sesión propia

**Como** persona que arma su propio entrenamiento
**quiero** crear una plantilla de sesión
**para** reutilizarla sin volver a escribirla.

`E-SP-06` · importante

**Criterios**

1. La plantilla es mía; ninguna organización es dueña de ella.
2. La plantilla existe como identidad estable antes de que yo publique nada.
3. En fuerza la interfaz puede llamarla "rutina"; el concepto sigue siendo plantilla de sesión.

### HU-SP-043 — Editar el borrador de mi plantilla

**Como** persona
**quiero** editar mi plantilla mientras la construyo
**para** ajustarla hasta que quede bien.

`E-SP-06` · importante

**Criterios**

1. Solo el borrador es editable.
2. Un borrador no puede usarse en un programa ni asignarse: primero hay que publicarlo.
3. Los objetivos de cada paso deben corresponder al tipo de actividad; si no, no se acepta.
4. Este trabajo requiere conexión: no hay modo local para editar contenido.

### HU-SP-044 — Publicar una versión de mi plantilla

**Como** persona
**quiero** publicar mi plantilla
**para** poder usarla en un programa.

`E-SP-06` · importante

**Criterios**

1. Al publicar, la versión queda fija y no se edita nunca más; para corregir se publica otra.
2. Publicar una versión nueva **no** cambia los programas que ya usaban la anterior.
3. Si el borrador está incompleto, se me dice exactamente qué falta.
4. Publicar dos veces el mismo contenido no crea dos versiones.

### HU-SP-045 — Partir de una versión anterior

**Como** persona
**quiero** crear un borrador a partir de una versión publicada
**para** hacer una variante sin empezar de cero.

`E-SP-06` · después

**Criterios**

1. El borrador nuevo conserva de dónde viene.
2. No puedo partir del contenido de una organización: en V1 no hay contenido compartido entre organizaciones.

### HU-SP-046 — Retirar una versión de mi plantilla

**Como** persona
**quiero** marcar una versión como retirada
**para** no volver a usarla en contenido nuevo.

`E-SP-06` · después

**Criterios**

1. Retirar impide **componer contenido nuevo** con esa versión.
2. No altera programas ya publicados, ni asignaciones activas, ni sesiones ya planificadas: el historial no se toca.

### HU-SP-047 — Crear y editar un programa propio

**Como** persona
**quiero** armar un programa combinando mis plantillas
**para** organizar varias semanas de entrenamiento.

`E-SP-06` · importante

**Criterios**

1. Cada posición del programa apunta a una **versión exacta** de plantilla, nunca a "la última".
2. No puedo componer con un borrador de plantilla.
3. Si uso versiones retiradas puedo seguir editando, pero al publicar se me advierte.

### HU-SP-048 — Publicar una versión de mi programa

**Como** persona
**quiero** publicar mi programa
**para** poder asignármelo.

`E-SP-06` · importante

**Criterios**

1. Cada posición debe apuntar a una versión de plantilla publicada.
2. La versión publicada queda fija; adoptar una plantilla nueva exige publicar otra versión del programa.
3. Publicar necesita al menos una posición.

### HU-SP-049 — Retirar una versión de mi programa

**Como** persona
**quiero** retirar una versión de mi programa
**para** no volver a asignármela.

`E-SP-06` · después

**Criterios**

1. Retirar impide asignaciones nuevas.
2. No cancela ni altera las asignaciones vigentes ni sus sesiones.

### HU-SP-050 — Ver mi contenido propio

**Como** persona que crea contenido
**quiero** ver mis plantillas y programas
**para** encontrar lo que ya construí.

`E-SP-06` · importante

**Criterios**

1. Veo mi contenido separando claramente borradores de versiones publicadas.
2. Solo veo lo mío: nunca contenido de una organización a la que no pertenezco.

---

## E-SP-07 · Registro de ejecución

### HU-SP-051 — Empezar una sesión planificada

**Como** persona con una sesión en la agenda
**quiero** empezarla
**para** registrar lo que voy haciendo.

`E-SP-07` · imprescindible

**Criterios**

1. Solo puedo empezar sesiones de un programa **mío**.
2. Si el programa quedó pausado por una relación terminada, no puedo empezar hasta decidir qué hacer con él.
3. Puedo empezar sin conexión y sincronizar después.
4. Si toco dos veces o se corta la red, sigo teniendo **un solo** intento, no dos.
5. Al empezar queda fijado con qué reglas se va a validar mi sesión, y esas reglas no cambian después.

### HU-SP-052 — Entrenar algo que no estaba planificado

**Como** persona que entrena por su cuenta
**quiero** registrar una sesión que no estaba en mi agenda
**para** que mi historial refleje todo lo que realmente hago.

`E-SP-07` · imprescindible

**Criterios**

1. Puedo registrar una sesión sin programa, sin relación y sin organización.
2. Por defecto es actividad autónoma: **ninguna organización la ve** salvo que yo comparta esa categoría.
3. Es el caso más frecuente de uso sin conexión y debe funcionar completamente offline.

### HU-SP-053 — Retomar una sesión que quedó a medias

**Como** persona a la que se le interrumpió el entrenamiento
**quiero** retomar donde estaba
**para** no perder lo registrado ni ensuciar mi historial.

`E-SP-07` · imprescindible

**Criterios**

1. Retomar **no crea otro intento**: continúo el mismo.
2. Se conservan las horas originales de inicio.
3. Una desconexión a mitad de sesión no puede multiplicar mis sesiones.

### HU-SP-054 — Abandonar una sesión

**Como** persona que no va a terminar su entrenamiento
**quiero** abandonarlo
**para** cerrarlo sin que cuente como cumplido.

`E-SP-07` · imprescindible

**Criterios**

1. Se conserva lo que alcancé a registrar.
2. Un intento abandonado nunca cuenta para adherencia.
3. Queda en mi historial: no desaparece.

### HU-SP-055 — Guardar resultados mientras entreno

**Como** persona con una sesión iniciada
**quiero** guardar mis series a medida que entreno
**para** no perder lo registrado si se corta la conexión.

`E-SP-07` · imprescindible

**Criterios**

1. Puedo registrar series, carga, repeticiones y esfuerzo percibido mientras entreno.
2. Sin conexión sigo registrando con normalidad y lo pendiente se sincroniza al recuperar la red.
3. Lo que aún no se ha sincronizado se muestra como no confirmado, nunca como guardado.
4. Si registro algo que no corresponde al tipo de actividad de la sesión, se me indica y no se acepta.
5. Un dato que no capturé queda vacío; nunca se convierte en cero.
6. Si registro dolor durante la sesión, se trata como contexto de salud y no lo ve nadie sin ese permiso, aunque la sesión sí sea visible.
7. Una sesión híbrida exige al menos dos bloques de familias distintas, con la transición explícita. La protección es de **base de datos**: al cerrar la sesión un guardián verifica que existan al menos dos familias, porque es una condición entre varios bloques y no se puede comprobar bloque por bloque.

### HU-SP-056 — Cerrar la sesión

**Como** persona que terminó de entrenar
**quiero** cerrar la sesión
**para** que quede registrada y cuente en mi progreso.

`E-SP-07` · imprescindible

**Criterios**

1. Al cerrar se valida lo que registré contra las reglas fijadas al empezar, y se me dice qué nivel de detalle alcancé.
2. Si falta un mínimo —por ejemplo, la cantidad lograda de una serie— **se me dice exactamente qué falta y la sesión queda abierta** para que la complete.
3. Puedo cerrar sin conexión y sincronizar después.
4. Cerrar dos veces no duplica la sesión ni el cumplimiento.
5. Como máximo una sesión cuenta como el cumplimiento de lo planificado; no se reparte entre varias.
6. Una sesión con datos incompletos no alimenta mi progreso como si estuviera completa.

---

## E-SP-08 · Historial, correcciones y progreso

### HU-SP-057 — Ver mi historial de sesiones

**Como** persona
**quiero** consultar todo lo que he entrenado
**para** tener mi historial completo en un solo lugar.

`E-SP-08` · imprescindible

**Criterios**

1. Veo **todo lo mío**: intentos abandonados, sesiones anuladas, sesiones que oculté a terceros, observaciones que me dejó un profesional y el historial de correcciones.
2. Puedo consultar mi historial descargado sin conexión.

### HU-SP-058 — Corregir una sesión ya cerrada

**Como** persona
**quiero** corregir un dato de una sesión pasada
**para** que mi historial refleje la verdad.

`E-SP-08` · importante

**Criterios**

1. Puedo corregir cuando quiera: no hay una ventana de tiempo que se cierre.
2. El valor original nunca se destruye; queda con el motivo del cambio.
3. Lo que se calculó a partir de ese dato se recalcula o se invalida, no se queda desactualizado.
4. Si mi corrección deja la sesión por debajo de un mínimo, baja de nivel de detalle en lugar de quedar en un estado inválido silencioso.

### HU-SP-059 — Elegir qué intento cuenta

**Como** persona que intentó una sesión más de una vez
**quiero** elegir cuál cuenta como la buena
**para** que mi adherencia refleje lo que decidí.

`E-SP-08` · importante

**Criterios**

1. La decisión es **solo mía**: ningún profesional puede cambiarla.
2. Solo puede contar un intento completado y válido.
3. Nunca ocurre de forma automática ni silenciosa.
4. Cambiarlo recalcula mi adherencia y mi progreso.

### HU-SP-060 — Anular una sesión que no refleja lo que pasó

**Como** persona
**quiero** anular una sesión
**para** que no distorsione mi progreso.

`E-SP-08` · importante

**Criterios**

1. Anular no borra la sesión: queda con el motivo, y el motivo es obligatorio.
2. **Anulada por mí y no válida por el sistema son dos cosas distintas y se distinguen.** Que una sesión no haya alcanzado los mínimos de su contrato es una decisión del sistema; anularla es una decisión mía. La base de datos guarda **un estado propio** para la anulación en lugar de reutilizar el de invalidez, para que ambos hechos no queden indistinguibles.
3. Si anulo la que contaba, **no se promueve otra en silencio**: la sesión queda sin una válida hasta que yo elija.
4. Mi progreso y mi adherencia se recalculan.

### HU-SP-061 — Ver mi progreso

**Como** persona que entrena con constancia
**quiero** ver mi evolución
**para** saber si estoy mejorando.

`E-SP-08` · importante

**Criterios**

1. Cada indicador me dice con qué se calculó y desde cuándo es válido.
2. Un progreso calculado con mi peso corporal **es** información corporal y se protege como tal.
3. Un indicador que no se puede calcular no se muestra aproximado: no se muestra.

### HU-SP-062 — Ver correcciones que me proponen

**Como** persona con un profesional asignado
**quiero** ver qué correcciones me está proponiendo
**para** decidir sobre mis propios datos.

`E-SP-08` · importante

**Criterios**

1. Veo cada propuesta con su estado y su fecha de vencimiento.
2. Una propuesta cancelada porque terminó la relación aparece como cancelada; no desaparece.

### HU-SP-063 — Aceptar o rechazar una corrección

**Como** persona
**quiero** decidir si acepto la corrección que me propone un profesional
**para** conservar el control sobre mis datos.

`E-SP-08` · importante

**Criterios**

1. **Nada cambia hasta que yo acepto.** Un profesional no puede sobrescribir un dato mío.
2. Si acepto, el valor original se conserva junto con quién lo propuso y por qué.
3. Aceptar no convierte al profesional en autor del dato: sigue siendo mío, y él queda como quien lo propuso.
4. Mi silencio nunca es aceptación: la propuesta vence a los 30 días.
5. Una propuesta vencida o cancelada no se puede aceptar.

---

## E-SP-09 · Catálogo y funcionamiento sin conexión

### HU-SP-064 — Poder entrenar sin conexión

**Como** persona que entrena en un gimnasio con mala señal
**quiero** que la aplicación tenga lo necesario descargado
**para** registrar mi sesión sin depender de la red.

`E-SP-09` · imprescindible

**Criterios**

1. Antes de entrenar tengo descargadas las disciplinas, los tipos de actividad y las reglas de validación.
2. Con eso, la aplicación puede avisarme de un error de registro sin conexión, aunque la validación definitiva sea del servidor.
3. **Solo** el registro de entrenamiento y la edición de mi perfil funcionan sin conexión. Permisos, consentimientos y terminaciones **siempre** exigen conexión y nunca se dan por hechos.
4. Nada pendiente de sincronizar se me muestra como confirmado.

### HU-SP-065 — Buscar un movimiento

**Como** persona armando o registrando su entrenamiento
**quiero** buscar un movimiento por nombre
**para** encontrarlo rápido.

`E-SP-09` · imprescindible

**Criterios**

1. La búsqueda encuentra por nombre y por nombres alternativos.
2. Veo variantes y con qué equipamiento es compatible.
3. Solo veo el catálogo global: el contenido privado de una organización no aparece aquí.
4. El catálogo global está en español; la estructura admite traducciones más adelante.
5. Una sesión válida puede no referenciar ningún movimiento: no es obligatorio.

### HU-SP-066 — Saber con qué equipamiento cuento

**Como** persona
**quiero** consultar el equipamiento del catálogo
**para** declarar lo que tengo y elegir movimientos compatibles.

`E-SP-09` · imprescindible

**Criterios**

1. El equipamiento describe compatibilidad, no inventario ni disponibilidad de un gimnasio.
2. No implica reservar nada.

---

## E-SP-10 · Nutrición

La regla que gobierna toda esta épica: **la persona escribe su registro; el
profesional verificado solo lee o propone.** Nada de lo que un profesional
proponga cambia algo sin que la persona lo acepte.

Las tres categorías de nutrición son independientes entre sí y de las otras
cuatro: autorizar el registro de comidas **no** autoriza sus fotos, y autorizar
comidas no autoriza objetivos.

**El registro es manual.** La persona sube la foto y escribe qué comió.
**Identificar una comida escaneándola con IA está diferido de V1**, igual que el
catálogo de alimentos, los códigos de barras y las recetas.

### HU-SP-067 — Registrar una comida

**Como** persona que quiere seguir su alimentación
**quiero** registrar lo que comí, con sus ítems y nutrientes
**para** tener mi historial nutricional junto a mi entrenamiento.

`E-SP-10` · importante

**Criterios**

1. Una comida necesita al menos un ítem; no puedo registrar una comida vacía.
2. Solo puedo usar nutrientes del catálogo de V1, con unidades compatibles y valores no negativos.
3. El momento en que comí, mi zona horaria y el día al que corresponde quedan fijados al registrar y no cambian después.
4. Puedo registrar sin conexión y sincronizar luego; **la foto no forma parte de ese registro offline**, se adjunta aparte.
5. Si algo del registro es inválido, no se guarda nada a medias: o entra completo o no entra.
6. Mis resúmenes diarios se actualizan como parte del mismo registro, no más tarde.

### HU-SP-068 — Ver lo que he comido

**Como** persona que registra su alimentación
**quiero** consultar mis comidas
**para** revisar mi historial.

`E-SP-10` · importante

**Criterios**

1. Veo mis comidas ordenadas de la más reciente a la más antigua.
2. Si una comida tiene foto, la recibo lista para mostrar; si no la tiene, simplemente no aparece.
3. La aplicación puede combinar lo que tengo descargado con mis borradores locales sin enviarlos al servidor.
4. Nunca veo la comida de otra persona: no aparece en la lista ni se puede abrir por su identificador.

### HU-SP-069 — Corregir una comida o cambiar su foto

**Como** persona que registró mal una comida
**quiero** corregirla o adjuntar y reemplazar su foto
**para** que mi historial sea exacto.

`E-SP-10` · importante

**Criterios**

1. Solo puedo corregir mis propias comidas.
2. La corrección reemplaza la estructura, la foto, o ambas, de una sola vez: nunca queda a medio aplicar.
3. Las fotos se guardan **sin metadatos de ubicación ni de dispositivo**, y eso lo hace el servidor antes de reemplazar la anterior.
4. Si el saneamiento o el guardado de la imagen falla, ni la comida ni la foto cambian.
5. Si mi versión quedó atrás porque corregí desde otro dispositivo, se me avisa y no se sobrescribe lo confirmado.
6. La foto anterior se elimina después de confirmar el cambio, no antes.
7. Puedo sincronizar la corrección desde un borrador y adjuntar la foto al recuperar la conexión.

### HU-SP-070 — Eliminar una comida

**Como** persona
**quiero** eliminar una comida de mi registro
**para** quitar algo que no quiero conservar.

`E-SP-10` · importante

**Criterios**

1. Se elimina la comida, sus ítems, sus nutrientes y su foto.
2. **No queda una copia navegable** de lo eliminado en ninguna parte.
3. Mis resúmenes diarios se recalculan sin esa comida.
4. Si existe una obligación legal que suspenda la eliminación, se informa como suspendida en lugar de reportarse como hecha.
5. Puedo dejar la intención encolada sin conexión, pero es el servidor quien decide contra el estado real.
6. La eliminación no se reporta como completada hasta que se confirma en todos los sistemas.

### HU-SP-071 — Ver mis resúmenes diarios

**Como** persona que registra sus comidas
**quiero** ver el consolidado por día
**para** entender cómo estoy comiendo sin sumar a mano.

`E-SP-10` · importante

**Criterios**

1. Consulto por rango de fechas, con un máximo de 31 días por consulta.
2. El resumen suma **únicamente los nutrientes que registré**. Lo que no capturé queda vacío y nunca se convierte en cero.
3. Un rango inválido se rechaza; el sistema no aproxima ni completa valores.
4. Mis borradores locales no se presentan como si fueran resumen confirmado.

### HU-SP-072 — Ver mis metas nutricionales y lo que me proponen

**Como** persona con objetivos nutricionales
**quiero** ver mi meta vigente y las propuestas pendientes
**para** decidir con qué me quedo.

`E-SP-10` · importante

**Criterios**

1. Veo mi meta activa, las propuestas pendientes y las decisiones que ya tomé.
2. De cada versión sé si la publiqué yo o la propuso un profesional, y quién fue.
3. **No veo el contexto interno del profesional** ni sus notas: solo la autoría mínima.
4. Solo yo veo mis versiones, tanto las mías como las que me propusieron.

### HU-SP-073 — Fijar mi propia meta nutricional

**Como** persona que entrena por su cuenta
**quiero** publicar mi meta nutricional
**para** tener un objetivo sin depender de un profesional.

`E-SP-10` · importante

**Criterios**

1. Tengo **una sola meta activa** a la vez: publicar una nueva reemplaza la anterior.
2. La versión anterior no se borra; queda como historia.
3. Publicar mi propia meta **no cancela ni altera** las propuestas que un profesional tenga pendientes.
4. Los objetivos deben ser válidos y usar el catálogo vigente; si no, no se publica nada.
5. Si dos publicaciones ocurren a la vez, el resultado es una sola meta activa, nunca dos.

### HU-SP-074 — Aceptar o rechazar una meta que me proponen

**Como** persona a la que un profesional le propone objetivos nutricionales
**quiero** decidir si los adopto
**para** conservar el control sobre mi alimentación.

`E-SP-10` · importante

**Criterios**

1. **Ningún profesional ni administrador decide por mí.**
2. Si acepto, esa versión pasa a ser mi meta activa y reemplaza la anterior.
3. Si rechazo, mi meta activa no cambia en absoluto.
4. Cada propuesta se decide una sola vez: una decisión ya tomada no se reabre.
5. Esta decisión exige conexión; no se confirma desde el teléfono sin red.
6. No puedo decidir sobre una propuesta ajena, cancelada o ya decidida.

---

## E-SP-11 · Sincronización con apps de salud

Esta épica es **de salida y solo de salida**. Allfit Space publica hacia Apple
Health y Health Connect lo que la persona entrenó dentro de Allfit.

**Leer del reloj sigue diferido y no entra a V1.** Frecuencia cardiaca, GPS,
rutas, sueño y cualquier dato de wearable permanecen fuera: no hay conectores de
entrada, no hay credenciales de terceros y no existe ninguna categoría nueva que
proteger. Por eso esta épica no añade scopes, no cambia lo que un profesional
puede ver y no toca la fórmula de acceso.

### HU-SP-075 — Publicar mis entrenamientos en Apple Health o Health Connect

**Como** persona que usa Apple Health o Health Connect
**quiero** que mis sesiones de Allfit aparezcan allí
**para** tener toda mi actividad junta sin registrarla dos veces.

`E-SP-11` · después · sin operación de servidor · HU-SP-084

**Criterios**

1. Doy permiso explícito en el sistema operativo antes de que se publique nada. Si lo revoco desde el teléfono, Allfit deja de publicar.
2. Se publica una sesión cuando la cierro, con su tipo de actividad, inicio, fin y duración.
3. Puedo activar o desactivar esta sincronización cuando quiera, y es una preferencia mía que se conserva.
4. Una misma sesión no se publica dos veces en el mismo dispositivo.
5. **No entra nada desde Apple Health ni Health Connect.** Es un camino de una sola dirección.
6. Esto no cambia lo que ve ningún profesional: publicar en mi teléfono no comparte nada con ninguna organización.
7. Si la publicación falla, mi sesión en Allfit no se ve afectada: sigue registrada y válida.

**Reparto de responsabilidad**

| Parte | Dónde vive |
| --- | --- |
| Permiso del sistema operativo, escritura en HealthKit/Health Connect, registro de qué se publicó | **App Expo.** El almacén de salud es local al dispositivo |
| Preferencia de "sincronizar automáticamente" | **Base de datos**, junto a las demás preferencias de la persona (bloque 4) |
| Ledger de exportación | **No se necesita en el servidor.** Cada dispositivo tiene su propio almacén de salud: publicar en un teléfono nuevo no es un duplicado, es lo correcto |

Consecuencia: esta épica **no crea ninguna tabla nueva** y no cambia el
inventario físico. Su único requisito de servidor es la preferencia, que el
bloque 4 ya introduce.

---

## E-SP-12 · Datos de contacto y notificaciones

### HU-SP-076 — Cambiar mi correo o mi teléfono

**Como** persona registrada
**quiero** cambiar mi correo o mi teléfono de contacto
**para** mantener actualizada la forma en que Allfit me llega.

`E-SP-12` · importante

**Criterios**

1. **Mi correo de contacto y mi correo de ingreso son el mismo.** Cambiarlo cambia con qué correo entro a la aplicación.
2. El cambio no es efectivo hasta que verifico el contacto nuevo: mientras tanto sigue funcionando el anterior.
3. Si el correo o el teléfono ya los usa otra persona, el mensaje que recibo es indistinguible del de un formato inválido. Allfit **no me confirma** que ese contacto ya tiene cuenta.
4. Nunca quedo con un correo distinto en la aplicación y en el inicio de sesión: o cambian los dos o no cambia ninguno.
5. Mis datos de contacto son míos y viven en mi perfil, no en el sistema de autenticación.

### HU-SP-077 — Verificar mi correo o mi teléfono

**Como** persona que cambió su contacto
**quiero** verificarlo
**para** que Allfit pueda escribirme ahí.

`E-SP-12` · importante

**Criterios**

1. Hasta que verifico, **no recibo notificaciones** en ese contacto.
2. Al verificar, el contacto nuevo reemplaza al anterior.
3. Si el desafío venció, el contacto anterior sigue siendo el vigente y no pierdo nada.
4. Verificar mi contacto no me da ningún permiso ni cambia lo que comparto.

### HU-SP-078 — Elegir cómo quiero que me avisen

**Como** persona
**quiero** decidir por qué canal recibo cada tipo de aviso
**para** no recibir lo que no me interesa.

`E-SP-12` · importante

**Criterios**

1. Elijo canal por tipo de aviso: relación, asignación, consentimiento, corrección, nutrición y seguridad.
2. **Los avisos de seguridad no se pueden desactivar.**
3. Ninguna organización ve ni cambia mis preferencias.
4. Un canal desactivado no cancela lo que ocurrió: la operación de negocio sigue su curso y puedo verla en la aplicación.
5. Si no tengo un contacto verificado para un canal, ese canal no puede activarse.

---

## E-SP-13 · Mi plan con el gimnasio

Lo que la persona le paga a un gimnasio es un **plan comercial**, nunca una
"membresía": esa palabra significa trabajar en la organización.

La regla que gobierna la épica: **pagar y compartir datos son decisiones
separadas.** Suscribirse no concede ningún permiso, y cancelar no revoca
ninguno.

### HU-SP-079 — Ver qué planes ofrece mi gimnasio

**Como** persona con relación con un gimnasio
**quiero** ver los planes que ofrece y su precio
**para** elegir cuál me sirve.

`E-SP-13` · imprescindible

**Criterios**

1. Solo veo planes de gimnasios con los que **ya tengo relación**. Esto no es un buscador de gimnasios: descubrir gimnasios no existe todavía.
2. Veo el precio, la moneda y si el cobro es mensual o anual.
3. No veo planes retirados ni borradores.

### HU-SP-080 — Suscribirme a un plan

**Como** persona que quiere entrenar en un gimnasio
**quiero** suscribirme a uno de sus planes
**para** empezar a usar su servicio.

`E-SP-13` · imprescindible

**Criterios**

1. El precio que veo al suscribirme **queda congelado**. Si el gimnasio sube el precio después, a mí no me sube: eso exige un plan nuevo.
2. Mis datos de tarjeta van **directo a la pasarela del gimnasio**. Allfit nunca los ve ni los guarda.
3. **Suscribirme no comparte ninguno de mis datos.** El permiso sigue siendo una decisión aparte.
4. Suscribirme tampoco crea la relación con el gimnasio: eso ya existía antes.
5. Solo puedo tener un plan vivo a la vez con el mismo gimnasio.
6. Si el gimnasio no tiene su medio de cobro configurado, se me dice claramente en lugar de dejarme a medias.

### HU-SP-081 — Ver mi plan y mis pagos

**Como** persona suscrita
**quiero** ver en qué estado está mi plan y qué he pagado
**para** saber si estoy al día.

`E-SP-13` · imprescindible

**Criterios**

1. Veo si estoy activa o suspendida, qué plan tengo, cuánto pago y cuándo es el próximo cobro.
2. Veo cada cobro con su resultado, incluidos los que fallaron.
3. Nunca veo un dato de tarjeta, porque Allfit no lo tiene.

### HU-SP-082 — Cancelar mi plan

**Como** persona suscrita
**quiero** cancelar mi plan cuando quiera
**para** dejar de pagar.

`E-SP-13` · imprescindible

**Criterios**

1. Cancelar el pago **no termina mi relación** con el gimnasio ni revoca ningún permiso. Si además quiero cortar el acceso a mis datos, eso lo decido por separado.
2. Mi Fitness ID y todo mi historial quedan intactos.
3. Nadie del gimnasio puede cancelar por mí ni yo por nadie.

---

## E-SP-14 · Qué pasa si no pago

### HU-SP-083 — Entender qué pierdo si mi pago falla

**Como** persona a la que se le venció la tarjeta
**quiero** saber exactamente qué se me suspende y qué conservo
**para** no asustarme y poder arreglarlo.

`E-SP-14` · importante

**Criterios**

1. Si un cobro falla, mi plan queda **suspendido**, y se me avisa con claridad.
2. **Nada se termina solo, nunca.** Mi relación con el gimnasio sigue viva y mis permisos siguen intactos.
3. **Conservo todo lo mío:** mi historial completo, mi entrenamiento por mi cuenta y mi registro de comidas siguen funcionando igual.
4. Lo único que se pausa son las **sesiones futuras** del programa que me asignó ese gimnasio. Lo que ya entrené no se toca.
5. Mi entrenador puede seguir viendo lo que le compartí, pero **no puede asignarme nada nuevo** ni escribir sobre mis datos.
6. La suspensión dura **el tiempo que sea**: no hay un plazo tras el cual me cierren nada.
7. Al pagar se quita **solo el bloqueo de esa suscripción** y se vuelve a calcular qué puedo usar con el estado actual; no se restaura una copia anterior.
8. No tengo que volver a dar un permiso que siga vigente, pero un permiso revocado, una relación terminada, una asignación cambiada o una sesión cancelada, iniciada o pasada **no revive** por pagar.
9. Si queda otro bloqueo activo, lo afectado sigue pausado. Solo vuelven las sesiones futuras, no iniciadas y no canceladas que todavía correspondan a una relación y asignación vigentes.

---

## E-SP-15 · Allfit Premium

La regla que gobierna la épica: **nunca se cobra por controlar los propios
datos.** Privacidad, permisos, registro de accesos, portabilidad y supresión son
gratuitos siempre. Premium cobra por profundidad y volumen, no por control.

Y un límite **nunca borra nada**: quien baja a gratis conserva todo su historial
y lo sigue viendo.

> **Qué incluye cada plan todavía no está decidido.** Es deliberado: la frontera
> vive como configuración, así que puede cambiarse publicando otra versión de
> plan, sin tocar código. Estas historias describen **cómo se comporta** el
> sistema ante cualquier frontera, no cuál es.

### HU-SP-084 — Ver qué me da Premium

**Como** persona que usa Allfit
**quiero** ver qué incluye cada plan y cuánto cuesta
**para** decidir si me sirve.

`E-SP-15` · imprescindible

**Criterios**

1. Veo el precio, si el cobro es mensual o anual, y **exactamente qué incluye cada plan con su límite**.
2. Veo también qué incluye el **plan gratuito**, con sus límites, para poder comparar.
3. Ninguna función de privacidad aparece como algo que deba pagar, porque ninguna puede limitarse.
4. Si Allfit cambia qué incluye cada plan, lo veo reflejado sin tener que actualizar la aplicación.

### HU-SP-085 — Suscribirme a Premium

**Como** persona que entrena por su cuenta
**quiero** pagarle a Allfit para tener la aplicación completa
**para** no depender de estar en un gimnasio.

`E-SP-15` · imprescindible

**Criterios**

1. El precio que acepto **queda congelado**: si Allfit sube el precio, a mí no me sube.
2. Solo puedo tener una suscripción a Allfit a la vez.
3. Pagarle a Allfit **no comparte ninguno de mis datos con nadie** ni cambia mis permisos.
4. Mis datos de tarjeta no los guarda Allfit.

### HU-SP-086 — Saber si tengo Premium y por qué

**Como** persona
**quiero** ver si tengo Premium y de dónde me viene
**para** entender de qué depende.

`E-SP-15` · imprescindible

**Criterios**

1. Veo si tengo Premium y **por cuál vía**: porque le pago a Allfit, o porque mi gimnasio lo incluye.
2. Si viene de mi gimnasio, veo **cuál** gimnasio, para saber qué pasa si dejo de pagarle.
3. Veo el límite vigente de cada función, incluido cuando estoy en el plan gratuito.
4. Ante cualquier duda el sistema me trata como plan gratuito, nunca al revés.
5. Si Allfit endurece el plan gratuito, **a mí no me quita nada si ya estaba suscrita**: conservo la versión que acepté.

### HU-SP-087 — Cancelar mi Premium

**Como** persona suscrita a Allfit
**quiero** cancelar cuando quiera
**para** dejar de pagar.

`E-SP-15` · imprescindible

**Criterios**

1. **No se borra ni un solo dato mío.** Conservo mi historial completo y lo sigo viendo; lo que cambia son los límites.
2. Si además tengo plan activo con un gimnasio que incluye Premium, **lo conservo por esa vía**.
3. Cancelar no afecta mi relación con ningún gimnasio ni ninguno de mis permisos.

### HU-SP-088 — Entender qué pasa con mi Premium si dejo de pagarle al gimnasio

**Como** persona cuyo Premium viene de su gimnasio
**quiero** saber qué pierdo si mi plan con ellos se suspende
**para** no llevarme una sorpresa.

`E-SP-15` · imprescindible

**Criterios**

1. Si mi plan con el gimnasio queda suspendido, mi Premium **baja a gratis**, porque venía de ese servicio.
2. **Conservo todos mis datos.** Los sigo viendo completos; solo se limitan algunas funciones.
3. Al pagarle al gimnasio, mi Premium vuelve **solo**, sin que yo haga nada.
4. Puedo recuperarlo antes pagándole directamente a Allfit, y entonces deja de depender del gimnasio.
5. Mi privacidad, mis permisos y mi historial **nunca** se ven afectados por esto.

---

## E-SP-16 · Hoy y navegación

### HU-SP-089 — Ver qué debo hacer hoy

**Como** persona que abre la aplicación
**quiero** ver de una lo que me toca hoy
**para** no tener que buscarlo.

`E-SP-16` · imprescindible

**Criterios**

1. Al abrir la aplicación veo mi entrenamiento de hoy y puedo empezarlo desde ahí, sin pasar por otras pantallas.
2. Si no tengo nada planeado, se me ofrece registrar un entrenamiento libre. **Nunca veo una pantalla vacía sin salida.**
3. Veo lo que quedó pendiente: una sesión sin cerrar, una propuesta de mi coach esperando respuesta, un permiso que me pidieron.
4. Si mi plan con el gimnasio está suspendido, lo veo aquí con claridad y sé qué hacer.
5. Todo se muestra en mi zona horaria.

### HU-SP-090 — Moverme por la aplicación

**Como** persona
**quiero** llegar rápido a lo que uso
**para** no perderme.

`E-SP-16` · imprescindible

**Criterios**

1. Desde cualquier pantalla llego a lo principal: hoy, entrenar, mi historial, mi perfil.
2. Si estoy entrenando, la sesión en curso está siempre a un toque, aunque me haya ido a otra parte.
3. Lo que no tengo contratado o no aplica a mi caso **no aparece como una pantalla vacía**: simplemente no está.

### HU-SP-091 — Ver mis avisos

**Como** persona
**quiero** ver lo que me han notificado
**para** no perderme algo que requiere mi respuesta.

`E-SP-16` · importante

**Criterios**

1. Veo mis avisos: invitaciones, propuestas de suplencia, correcciones que me proponen, cambios de entrenador y cobros fallidos.
2. Distingo lo que espera una decisión mía de lo que es solo informativo.
3. Desde cada aviso llego a donde se resuelve.
4. **Un aviso nunca contiene mis datos**: dice qué pasó y me lleva a la aplicación.

### HU-SP-092 — Saber cuándo estoy sin conexión

**Como** persona entrenando en un gimnasio con mala señal
**quiero** saber qué está guardado y qué no
**para** confiar en lo que registré.

`E-SP-16` · imprescindible

**Criterios**

1. Cuando no hay conexión, la aplicación me lo dice sin que tenga que adivinarlo.
2. Lo que registré y aún no se ha subido se ve claramente como **pendiente**, nunca como guardado.
3. Al volver la conexión se sincroniza solo y me entero.
4. Si algo no se pudo sincronizar, se me dice cuál y por qué, y no se pierde.
5. Las cosas que necesitan conexión —dar un permiso, pagar, terminar una relación— se muestran deshabilitadas con su motivo, no fallan al intentarlas.

### HU-SP-093 — Buscar en mi historial

**Como** persona con meses de entrenamiento
**quiero** buscar una sesión o un movimiento
**para** encontrar algo concreto sin desplazarme sin fin.

`E-SP-16` · después

**Criterios**

1. Busco por fecha, tipo de actividad o movimiento.
2. Puedo filtrar por periodo.
3. Si no hay resultados se dice claramente.

### HU-SP-094 — Ajustar mis preferencias

**Como** persona
**quiero** configurar unidades e idioma
**para** que la aplicación hable como yo.

`E-SP-16` · importante

**Criterios**

1. Elijo kilos o libras, y kilómetros o millas.
2. Cambiar las unidades **no altera lo que ya registré**: se convierte al mostrarlo y el original se conserva.
3. Desde aquí llego a mis datos de contacto, mis permisos y la eliminación de mi cuenta.

---

## Resumen

| Épica | Historias | Imprescindibles |
| --- | --- | ---: |
| `E-SP-00` Entrar a la aplicación | `HU-SP-001` – `HU-SP-005` | 4 de 5 |
| `E-SP-01` Registro y onboarding | `HU-SP-006` – `HU-SP-015`, `HU-SP-096` – `HU-SP-098` | 10 de 13 |
| `E-SP-02` Invitaciones y relaciones | `HU-SP-016` – `HU-SP-020`, `HU-SP-095` | 3 de 6 |
| `E-SP-03` Perfil, cuerpo y salud | `HU-SP-021` – `HU-SP-028` | 2 de 8 |
| `E-SP-04` Mis datos y quién los ve | `HU-SP-029` – `HU-SP-036` | 6 de 8 |
| `E-SP-05` Agenda y asignaciones | `HU-SP-037` – `HU-SP-041` | 5 de 5 |
| `E-SP-06` Contenido de entrenamiento propio | `HU-SP-042` – `HU-SP-050` | 0 de 9 |
| `E-SP-07` Registro de ejecución | `HU-SP-051` – `HU-SP-056` | 6 de 6 |
| `E-SP-08` Historial y progreso | `HU-SP-057` – `HU-SP-063` | 1 de 7 |
| `E-SP-09` Catálogo y sin conexión | `HU-SP-064` – `HU-SP-066` | 3 de 3 |
| `E-SP-10` Nutrición | `HU-SP-067` – `HU-SP-074` | 0 de 8 |
| `E-SP-11` Sincronización con apps de salud | `HU-SP-075` | 0 de 1 |
| `E-SP-12` Contacto y notificaciones | `HU-SP-076` – `HU-SP-078` | 0 de 3 |
| `E-SP-13` Mi plan con el gimnasio | `HU-SP-079` – `HU-SP-082` | 4 de 4 |
| `E-SP-14` Qué pasa si no pago | `HU-SP-083` | 0 de 1 |
| `E-SP-15` Allfit Premium | `HU-SP-084` – `HU-SP-088` | 5 de 5 |
| `E-SP-16` Hoy y navegación | `HU-SP-089` – `HU-SP-094` | 3 de 6 |
| **Total** | **98 historias** | **52 imprescindibles** |

El camino mínimo para lanzar es: crear cuenta y entrar, activar el Fitness ID,
ver qué toca hoy, entrenar y registrarlo aunque no haya señal, ver el historial,
aceptar la invitación de un gimnasio, decidir qué se comparte y poder cortarlo,
y pagar el plan.

**Nutrición no está entre lo imprescindible** aunque ya tenga todo el modelo
listo: es la rebanada más independiente y puede entrar justo después del
lanzamiento sin tocar nada de lo demás. Lo mismo con el contenido propio: quien
llega por un gimnasio recibe su programa asignado y no necesita crear el suyo.
