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
| **Plan** | Lo que le paga a un gimnasio, o lo que le paga a Allfit por Pro |
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

### HU-SP-101 — Decir qué disciplina entreno

**Como** persona que acaba de activar su cuenta
**quiero** decir qué disciplina entreno
**para** que todo lo que la aplicación me pregunte después vaya de eso.

`E-SP-01` · imprescindible

**Criterios**

1. Elijo **una** disciplina principal, antes de decir mi objetivo.
2. Veo todas las disciplinas que Allfit va a cubrir, no solo las que ya están listas, y en cada una reconozco lo que practico por lo que la disciplina contiene.
3. **Solo puedo elegir una que esté disponible.** Las demás se ven y se leen, y dicen sin rodeos que todavía no se pueden elegir.
4. Puedo cambiarla cuando quiera desde mi perfil.

**Por qué una y no varias.** `HU-SP-012` preguntaba «una o varias disciplinas» junto
con la experiencia. Con varias no habría **de cuál** puede depender el objetivo, que es
lo que esta pregunta existe para resolver: la principal es la dirección, y «también
practico» es una lista. Se separaron el 8 de septiembre de 2026 y quedaron en dos
historias distintas.

**Alcance del lanzamiento inicial.** Solo **fuerza** está disponible. Las otras cinco
—alta intensidad, resistencia y cardio, deportes de combate, bienestar y control,
ritmos y clases— se muestran porque saber qué viene es parte de la promesa, y el
criterio 3 es lo que impide que eso se convierta en una promesa falsa: no se dejan
elegir, y **no se ofrece ningún aviso**, porque no se registra el interés de nadie. El
catálogo de atributos guarda las seis desde el principio; lo que el contrato ofrece es
una, igual que hace con `improve_performance` en `HU-SP-010`.

### HU-SP-010 — Decirle a Allfit qué quiero lograr

**Como** persona que acaba de activar su cuenta
**quiero** decir cuál es mi objetivo
**para** que la aplicación se ajuste a lo que busco.

`E-SP-01` · imprescindible

**Criterios**

1. Elijo mi objetivo principal de una lista clara: bajar de peso, ganar músculo, ponerme en forma, mejorar mi rendimiento, correr una carrera, mantenerme.
2. **La lista depende de la disciplina que dije entrenar**: solo veo los objetivos que esa disciplina persigue, para no elegir uno que su entrenamiento no puede darme.
3. Puedo elegir solo uno como principal, para que la aplicación tenga una dirección.
4. Puedo cambiarlo cuando quiera desde mi perfil.

**Alcance del lanzamiento inicial.** Decidido el 23 de agosto de 2026: **mejorar mi
rendimiento no se ofrece en el lanzamiento inicial de V1**. Entra más adelante y por
eso sigue declarado en el catálogo de atributos, pero la lista del criterio 1 arranca
con cinco. La razón es de producto: es el único de los seis cuyo avance no se ve en el
cuerpo, así que la pantalla no puede mostrar lo que promete y ninguna de las otras
cinco tiene ese problema.

**El objetivo depende de la disciplina.** Decidido el 8 de septiembre de 2026, cuando
`HU-SP-101` puso la disciplina delante de esta pregunta. Con **fuerza** —la única
disponible en el lanzamiento inicial— la lista pierde **correr una carrera**: es el
único de los cinco que el entrenamiento de fuerza no persigue, y ofrecerlo sería
prometer un plan que esa disciplina no va a escribir. Quedan cuatro.

El mapa vive en el cliente y no en PostgreSQL, a propósito. No es un invariante ni una
frontera de seguridad —nada se rompe si conviven fuerza y correr una carrera— y es una
decisión de curaduría que va a cambiar cada vez que entre una disciplina; grabada en la
base rechazaría mañana un valor histórico que fue legítimo cuando se declaró.

### HU-SP-011 — Registrar mis datos físicos

**Como** persona en el onboarding
**quiero** registrar mi peso y mi estatura
**para** que mi progreso y mis cargas tengan referencia.

`E-SP-01` · imprescindible

**Criterios**

1. Registro peso y estatura, y elijo si los quiero en kilos o libras, centímetros o pies.
2. Estos datos son **míos**: quedan como mi primer registro de progreso y puedo actualizarlos cuando quiera.
3. Las dos medidas se responden, en una sola pantalla y con el mismo control.

**Alcance del lanzamiento inicial.** Decidido el 29 de agosto de 2026: **el paso deja de
poder saltarse.** El criterio 3 decía «puedo saltarme este paso; la aplicación funciona sin
ellos, aunque el progreso será menos preciso», y eso ya no es cierto: el peso es la **línea
base de la serie de progreso**, y sin él no hay contra qué medir nada de lo que venga
después. La frase «y sin él la aplicación funciona igual» prometía algo que el producto no
cumple.

**Las dos medidas comparten pantalla, y eso costó dos intentos.** El primero puso una
tarjeta con su regla arriba y otra regla distinta abajo: dos objetos compitiendo, sin
centro. Se separaron entonces en una pantalla cada una, y con una pregunta sola por
pantalla el control ocupaba un tercio y el resto quedaba muerto. Vuelven juntas cuando las
dos mitades pasan a ser **el mismo objeto** —rótulo, unidades, lectura y cinta—: como
objetos distintos competían, como un objeto repetido se leen como pareja.

### HU-SP-012 — Contar qué entreno y desde cuándo

**Como** persona en el onboarding
**quiero** decir qué practico y con cuánta experiencia
**para** que no me traten como principiante si no lo soy, ni al revés.

`E-SP-01` · imprescindible

**Criterios**

1. Además de mi disciplina principal (`HU-SP-101`), digo qué **otras** practico: fuerza, running, movilidad, híbrido y las demás disponibles.
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

**El criterio 1 dejó de ser la disciplina principal.** Corregido el 8 de septiembre de
2026: decía «elijo una o varias disciplinas», y desde que existe `HU-SP-101` esa
pregunta ya está contestada antes del objetivo. Con varias no habría **de cuál** puede
depender el objetivo, así que la principal es una y se pregunta aparte; lo que queda
aquí es «también practico», que es una lista y no una dirección. Sigue esperando por lo
mismo que el resto de este criterio: hoy solo hay una disciplina disponible, y una lista
de una no es una lista.

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

### HU-SP-099 — Cerrar el onboarding y empezar

**Como** persona que ya respondió todo el onboarding
**quiero** ver que mi perfil quedó listo y entrar de una vez
**para** empezar a entrenar sin preguntarme si faltaba algo.

`E-SP-01` · imprescindible · HU-SP-008

**Criterios**

1. Veo que mi perfil está listo, y con mi nombre de usuario: lo que confirma que terminé es mi propia identidad, no un mensaje genérico.
2. **Al entrar, mi Fitness ID queda activo.** Es el mismo paso, no dos: la pantalla no promete algo que ocurra después.
3. Veo la semana que empieza, con hoy señalado. No es un plan todavía y no promete sesiones: dice cuándo empieza lo que sigue.
4. Si vuelvo atrás, sigo pudiendo corregir lo que respondí. Cerrar el onboarding no cierra las respuestas.

**Por qué existe esta historia.** La escribimos el 30 de agosto de 2026, después de
detectar que el diseño tenía la pantalla y ninguna historia la describía: se habría
construido contra nada. `HU-SP-008` dice lo que la activación **garantiza** —un solo
Fitness ID, reutilizar la identidad si ya existía, ninguna organización actuando por
ti— y esta dice **dónde y cómo** ocurre.

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

> **Alcance de la primera entrega (`TECH-28`).** La invitación me dice quién me invita y que
> Allfit Pro va incluido, y la encuentro también desde la aplicación, por mi correo
> verificado, aunque el enlace del correo se pierda. **Ofrecer un programa dentro de la
> invitación no está construido** y queda para una entrega aparte. Mi coach lo asigna el
> gimnasio después, desde Studio (`HU-STUDIO-023`). Mientras el enlace web no exista, el
> correo abre la aplicación directamente. Con una cuenta todavía sin Fitness ID solo sé que
> una invitación me espera: qué me pide lo leo al terminar el registro (criterio 3).

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

> **Alcance de la primera entrega (`TECH-28`).** Decido la relación y cada permiso. Los
> criterios 1, 8 y 9 esperan a que la invitación pueda ofrecer un programa, que todavía no
> está construido.

### HU-SP-018 — Ver mis relaciones profesionales

**Como** persona
**quiero** ver con qué organizaciones tengo o tuve una relación
**para** saber quién me atiende y quién me atendió.

`E-SP-02` · importante

**Criterios**

1. Veo mis relaciones activas y también las terminadas.
2. Cuando volví a trabajar con la misma organización, veo el enlace a la relación anterior.
3. Ver la continuidad no concede a la relación nueva ningún acceso a lo de la anterior.

> **Alcance de la primera entrega (`TECH-28`).** Cada relación muestra también el nombre de
> mi coach titular.

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

> **Alcance de la primera entrega (`TECH-28`).** Acepto o rechazo una sola vez. La
> aceptación queda en el historial; el rechazo todavía no aparece en él (criterio 9).

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

> **Alcance de la primera entrega (`TECH-28`).** Terminar es inmediato y no se puede hacer
> dos veces. El criterio 6 todavía no aplica: un gimnasio aún no puede asignarme un
> programa, así que no hay programa que pausar.

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

> **Alcance de la primera entrega (`TECH-29`).** «Lo que compartes», desde mi perfil, me
> muestra por cada gimnasio qué categorías comparto, cuáles rechacé y cuáles quité, y desde
> cuándo. Los gimnasios con los que terminé aparecen con lo que conservan, y eso también lo
> puedo quitar. El recordatorio a los 12 meses (criterio 4) todavía no está construido:
> espera a los avisos.

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

> **Alcance de la primera entrega (`TECH-29`).** Quito una categoría a la vez, después de
> confirmarlo, y el corte es inmediato: nada guarda una copia de mis permisos que tarde en
> enterarse. El historial de la relación dice cuándo dejé de compartirla. El criterio 6
> todavía no aplica: las consultas del historial de una relación terminada aún no existen,
> así que no hay ninguna que cerrar. Al gimnasio no se le avisa.

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
2. **Al tomar un programa de Allfit me queda una copia mía.** Lo que Allfit publique después no me toca, y lo que yo cambie no le toca a nadie más. El programa aparece entre los míos porque lo es, no porque se lo esté tomando prestado.
3. **Mi agenda existe desde el momento en que me asigno el programa, no cuando un proceso corra más tarde.** Si el programa termina, queda creada entera ahí mismo. Si no termina no hay un «entera» que crear, así que queda creada la semana en la que lo tomo, y cada semana siguiente aparece completa cuando abro la agenda para verla: nunca la estoy esperando, y nunca depende de que algo haya corrido por su cuenta.
4. **Mi agenda se organiza por semanas de calendario**, de lunes a domingo. La semana 1 del programa es la semana en la que lo tomo, así que empezar un viernes deja esa semana corta: lo que no alcance no se arrastra.
5. Nadie administra esta asignación: no tiene profesional a cargo.
6. Ninguna organización la ve, salvo que yo comparta explícitamente esa categoría.
7. Si se solapa con otro programa activo, se me advierte pero no se me bloquea.

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
5. *Enmendado el 29 de septiembre de 2026 (`ADR-033`).* **Al planificar no se pide esfuerzo.** El esfuerzo es lo que se siente al hacer la serie, así que se registra mientras entreno (`HU-SP-055` criterio 8), no cuando armo la rutina.

### HU-SP-102 — Retomar el borrador que dejé a medias

**Como** persona
**quiero** volver a la rutina que estaba armando
**para** no empezar de cero cada vez que salgo de la pantalla.

`E-SP-06` · imprescindible

**Criterios**

1. Al volver a crear una rutina, si tengo un borrador sin publicar, se abre ese.
2. Lo que veo es lo que guardé: el nombre, los ejercicios y sus series.
3. **La pantalla no escribe nada hasta haber cargado.** Un editor que se abre vacío sobre un borrador existente y guarda solo reemplaza mi trabajo con nada.
4. Si el borrador no se puede cargar, se me dice, y no se guarda encima.

### HU-SP-103 — Descartar una rutina que no quiero

**Como** persona
**quiero** decidir al salir si guardo o descarto lo que llevaba
**para** no acumular borradores que nunca voy a terminar.

`E-SP-06` · imprescindible

**Criterios**

1. Al salir de una rutina con nombre pero sin publicar, elijo entre guardarla como borrador o descartarla.
2. Descartar la retira de mi contenido; no aparece más en mis rutinas.
3. Una rutina ya publicada **también se descarta**, y los programas míos que la usaban se republican sin ella; lo que ya entrené con ella no cambia.
4. Descartar dos veces la misma rutina no es un error.

### HU-SP-107 — Retomar el programa que dejé a medias

**Como** persona
**quiero** que al volver a «programa nuevo» aparezca lo que llevaba
**para** no empezar de cero cada vez que salgo de la pantalla.

`E-SP-06` · imprescindible

**Criterios**

1. Si dejé un programa sin publicar, al entrar a crear uno aparece ese con lo que llevaba.
2. Si no dejé ninguno, empiezo en blanco.
3. Un programa descartado no se retoma.
4. Nunca se retoma el de otra persona.

### HU-SP-106 — Descartar un programa que no quiero

**Como** persona
**quiero** decidir al salir si guardo o descarto el programa que llevaba
**para** no acumular programas a medias que nunca voy a usar.

`E-SP-06` · imprescindible

**Criterios**

1. Al salir de un programa con nombre pero sin publicar, elijo entre guardarlo como borrador o descartarlo.
2. Descartar lo retira de mi contenido y deja de ofrecerse para retomar.
3. Un programa ya publicado no se descarta por esta vía: hay asignaciones que dependen de él. Eliminarlo es otro acto, y lo dicen los criterios siguientes.
4. Descartar dos veces el mismo programa no es un error.
5. Un programa publicado **sí lo puedo eliminar**, desde su menú, y antes se me confirma diciéndome qué se lleva.
6. Eliminarlo lo saca de mi biblioteca y de mi agenda: deja de aparecer entre mis programas y desaparecen las sesiones que no llegué a entrenar.
7. Si lo pido, **se eliminan también sus rutinas**, salvo las que esté usando otro programa mío: esas se quedan, y la confirmación me dice cuáles y por qué.
8. **Lo que ya entrené se conserva**, entero y en mi historial. Eliminar un programa no borra ni un entrenamiento.

### HU-SP-110 — Duplicar un programa que ya tengo

**Como** persona
**quiero** partir de un programa que ya tengo para armar el siguiente
**para** no volver a escribir la semana entera por cambiarle dos cosas.

`E-SP-06` · importante

**Criterios**

1. Duplicar un programa me deja un **borrador** con la misma semana y la misma duración que el original: empiezo donde el otro terminó.
2. La copia se llama «<Nombre> - Copia», para distinguirla del original sin abrirla.
3. Hasta que la publico **no existe para nadie más**: no se me asigna, no aparece en mi agenda y no hay ninguna sesión planificada contra ella.
4. Si salgo sin terminarla, elijo entre guardarla como borrador o descartarla, igual que con un programa nuevo (`HU-SP-106`).
5. Un programa que tomé de Allfit también se duplica, y **esa copia sí la puedo editar**.
6. Mis rutinas no se duplican con él: la copia usa las mismas, y mi biblioteca no crece por copiar un programa.

### HU-SP-104 — Definir mis series una por una

**Como** persona
**quiero** decir qué hace cada serie de un ejercicio
**para** que la rutina describa lo que realmente voy a entrenar.

`E-SP-06` · imprescindible

**Criterios**

1. Cada ejercicio se abre y puedo poner cuántas series, con cuántas repeticiones y con qué carga.
2. Cada serie tiene un tipo: normal, calentamiento, al fallo o descendente. Al entrenar la sesión me propone ese tipo y puedo cambiarlo (`HU-SP-055` criterio 9).
3. Una serie al fallo no lleva número de repeticiones, porque el número es el que salga.
4. Puedo elegir el descanso entre series del ejercicio.
5. Puedo poner el peso de cada serie, y elegir si lo digo en kilos o en libras para ese ejercicio.
6. Una serie sin peso dicho se queda sin peso: cero es una carga que alguien quiso poner, no una ausencia.

### HU-SP-105 — Encadenar dos ejercicios en superserie

**Como** persona
**quiero** encadenar un ejercicio con el siguiente
**para** hacerlos seguidos sin descanso entre medias.

`E-SP-06` · importante

**Criterios**

1. Puedo encadenar con cualquier ejercicio de la rutina; el que elijo queda al lado de este.
2. Una cadena puede tener más de dos: encadenar con uno que ya está en una cadena entra en esa cadena.
3. La rutina muestra qué ejercicios están encadenados y en cuál, con la misma marca y el mismo color.
4. El descanso de una cadena se aplica al terminarla, no entre sus ejercicios.
5. Puedo salir de una cadena sin perder mis series, y los que quedan siguen encadenados si todavía son dos.
6. Reordenar la rutina nunca deshace una cadena: se mueve entera y nada puede caer dentro de ella.

### HU-SP-108 — Ponerle portada a mi programa — retirada

Pedía elegir cómo se ven las rutinas de un programa: la figura de los músculos, uno de
treinta y dos iconos, o fotografía. Se construyó entera y se retiró el 22 de septiembre
de 2026, por la misma razón que retiró a `HU-SP-109` y una más.

**La fotografía ganó sola.** Cuando las tres opciones se pusieron una al lado de otra en
pantallas de verdad —el carrusel de Hoy, el catálogo, el detalle del programa—, ninguna
de las otras dos se eligió nunca: una fotografía dice de qué va la rutina antes de que
nadie lea el nombre, y un icono dice de qué va el programa, que es algo que el nombre del
programa ya dice.

**Y una opción que nadie cambia no es una opción, es una pregunta.** El estilo quedaba en
medio del editor de programa pidiendo una decisión cuyo resultado era siempre el mismo.
Ahora no se elige: toda rutina lleva su fotografía y su reverso, y una rutina que todavía
no dice qué trabaja se reconoce por su letra, como se reconocía antes de que esto
existiera.

Lo que se conserva es lo único que la historia probó que valía: que la imagen la decide
**el contenido y no la persona**, y que la elige el programa y no cada rutina, para que la
semana se lea como una semana. Eso no era una opción; era la regla de debajo.

### HU-SP-109 — Poner una foto mía de portada — retirada

Pedía elegir una foto de la galería y usarla como portada. Se construyó entera y se
retiró el 19 de septiembre de 2026: **nadie iba a hacerlo**. Una portada sirve para
reconocer una rutina entre seis, y para eso la figura de los músculos y el icono ya
responden sin pedir nada. La razón entera está en la segunda revisión de `ADR-031`.
`HU-SP-108` conservó entonces la fotografía como tercera opción —elegida por el contenido
y no por la persona— y se retiró a su vez tres días después, cuando quedó claro que era la
única que alguien elegía.

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
4. **No tengo que decir cuándo se acaba.** Un programa que armo yo no tiene fecha de fin mientras no le ponga una: lo que compongo se repite hasta que lo cambie. Es así de entrada, sin que yo active nada.
5. **Puedo ponerle un final si lo quiero**, y entonces el programa dura las semanas que compuse y se acaba cuando se acaban. Poner o quitar ese final cambia lo que voy a entrenar, así que es parte de lo que publico y no un ajuste de presentación.
6. Donde un programa con final me dice «8 semanas · 3 días por semana · 24 sesiones», uno sin final me dice **«Sin fecha de fin · 3 días por semana»**: no me inventa un total de sesiones que no existe.

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
5. **Puedo repetir una sesión que ya cerré.** Queda como otro intento en mi historial y no reemplaza al primero, que es el que cuenta para la semana.
6. Al empezar queda fijado con qué reglas se va a validar mi sesión, y esas reglas no cambian después.

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
8. **De cada serie puedo marcar cuánto me costó**, del 1 al 10, y no tengo que saberme la escala: al abrirla me explica qué significa cada número — un 8 es que quedaban dos repeticiones. Es opcional: una serie sin esfuerzo marcado no declara ninguno, que no es lo mismo que el mínimo.
9. **Cada serie dice de qué tipo fue**: normal, calentamiento, al fallo o descendente. La sesión abre cada serie con el tipo que pidió la rutina y yo lo cambio si hice otra cosa. Un calentamiento se registra pero no cuenta como trabajo: no suma a mis kilos levantados, a «La última vez» ni a las series de la semana.
10. **La sesión es mía una vez empezada**: puedo añadir un ejercicio, quitar uno, moverlo de lugar y encadenarlo en superserie con otro, aunque la rutina dijera otra cosa. Empieza con los ejercicios y las superseries de la rutina, y lo que cambio se queda aunque cierre la aplicación.
11. Una superserie son ejercicios seguidos: encadenar uno lo pone al lado del otro, y mover una superserie la mueve entera.
12. **Al marcar una serie empieza el descanso** que la rutina puso a ese ejercicio, con su cuenta atrás a la vista; si la rutina no dijo nada, cuenta 1 min 30 s, y sólo «Ninguno» no cuenta. Puedo sumarle o quitarle 15 segundos, o saltarlo, y marcar otra serie lo empieza de nuevo.
13. En una superserie también corre el descanso de cada ejercicio, y mientras corre me dice cuál sigue de la cadena.
14. **Puedo cambiar el descanso de un ejercicio desde la sesión**, y el cambio es de hoy: la rutina sigue con el suyo.
15. Si salgo de la aplicación o bloqueo el teléfono, me avisa cuando el descanso termina. Si no di permiso para avisos, la cuenta atrás sigue igual dentro de la sesión.

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
7. Al guardar, la sesión me lleva a compartirla (`HU-SP-111`).

### HU-SP-111 — Compartir mi entreno

**Como** persona que acaba de entrenar
**quiero** ver lo que logré y poder compartirlo
**para** celebrarlo y que lo vean los míos.

`E-SP-07` · importante

**Criterios**

1. Al guardar un entreno veo «Compártelo» con tarjetas de lo que hice: el resumen de la sesión, los músculos que trabajé, qué número de entreno es y mi nombre con mi usuario.
2. **Si batí un récord, aparece su tarjeta**: qué movimiento, cuánto y cuánto era antes. Si no lo batí, esa tarjeta no sale. Un calentamiento nunca cuenta como récord, y la primera vez que hago un ejercicio tampoco.
3. Si llevo dos semanas o más entrenando sin saltarme ninguna, aparece mi racha. La semana en curso no la rompe hasta que termine.
4. Las tarjetas con foto usan la de mi rutina. Puedo cambiarla por una de mi galería, y **esa foto no sale de mi teléfono**.
5. Puedo guardar la imagen en mis fotos, copiarla, llevarla a mis historias de Instagram o mandarla a la aplicación que quiera.
6. «Terminar» me lleva a Hoy, y el entreno ya quedó guardado aunque no comparta nada.

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
3. En Hoy veo mis últimos entrenos agrupados por semana, y desde ahí abro el historial completo.
4. Cada entreno dice cuánto duró, cuántas series y cuántos kilos hice, y cuántos récords logré.
5. Puedo buscar por rutina o por ejercicio, y filtrar por mes, disciplina, entrenos con récord y entrenos libres.
6. Veo el resumen del mes y, por semana, cuántos entrenos hice de los que tenía planificados.

> **Alcance de la primera entrega (`ADR-037`).** Se muestran los entrenos terminados. Los abandonados, los anulados, las correcciones, lo oculto y las observaciones (criterio 1) y el uso sin conexión (criterio 2) quedan para una entrega siguiente.

### HU-SP-112 — Ver el detalle de un entreno terminado

**Como** persona que revisa lo que entrenó
**quiero** abrir un entreno de mi historial
**para** ver serie por serie qué hice y qué logré.

`E-SP-08` · importante

**Criterios**

1. Al tocar un entreno del historial veo su rutina, cuándo fue, cuánto duró, las series, los kilos y los récords.
2. Cada ejercicio muestra sus series, su mejor serie y si batió un récord; la serie que batió todo lo anterior lo dice.
3. Veo cómo me fue frente a la última vez que hice esa rutina.
4. Desde ahí puedo editarlo (`HU-SP-058`), repetirlo (`HU-SP-051`), compartirlo (`HU-SP-111`) o eliminarlo (`HU-SP-060`).

### HU-SP-058 — Corregir una sesión ya cerrada

**Como** persona
**quiero** corregir un dato de una sesión pasada
**para** que mi historial refleje la verdad.

`E-SP-08` · importante

**Criterios**

1. Puedo corregir cuando quiera: no hay una ventana de tiempo que se cierre.
2. El valor original nunca se destruye; queda con el motivo del cambio.
3. Lo que se calculó a partir de ese dato se recalcula o se invalida, no se queda desactualizado.
4. Si mi corrección deja la sesión por debajo de un mínimo, baja de nivel de detalle en lugar de quedar en un estado inválido silencioso. *Diferido en V1* (`ADR-038`).
5. Corrijo pesos, repeticiones, tipo de serie, ejercicios y horario, y antes de guardar veo cuántos cambios hice y si mis récords se mantienen.

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

1. Anular no borra la sesión: queda con su motivo. **Darlo es opcional**: en la app se llama «Eliminar» y, si no digo por qué, se registra «La persona lo eliminó» (`ADR-038`).
5. Antes de confirmar veo qué cambia: los récords que se van y cómo queda mi racha.
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

**Registrar una comida tiene tres caminos** (`ADR-041`): escribirla a mano,
buscar sus alimentos en el catálogo de Allfit, o tomarle una foto para que Allfit
reconozca los alimentos y sus porciones. En los tres, las calorías y los macros
salen del catálogo, y la persona revisa todo antes de guardar. Los códigos de
barras, los menús y las recetas de la persona siguen diferidos.

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

> **Sin conexión, diferido en V1** (`ADR-040`): por ahora la comida se guarda con señal.

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

> **Sin conexión, diferido en V1** (`ADR-040`): por ahora la comida se guarda con señal.

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

> **Sin conexión, diferido en V1** (`ADR-040`): por ahora la comida se guarda con señal.

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

### HU-SP-113 — Registrar una comida con una foto

**Como** persona que registra lo que come
**quiero** tomarle una foto a mi plato y que Allfit reconozca los alimentos
**para** no tener que escribir cada uno con sus calorías.

`E-SP-10` · importante

**Criterios**

1. Antes de la primera foto que se reconoce, acepto un consentimiento que dice qué se envía, a quién y qué no se guarda. Sin aceptarlo, puedo seguir registrando con la búsqueda.
2. Veo cada alimento reconocido con su porción y sus calorías, y sobre la foto, dónde está.
3. Lo que Allfit no tiene claro me lo marca para que lo revise.
4. Puedo cambiar el alimento, la cantidad o cualquier valor; si cambio la cantidad se recalcula todo, salvo lo que edité yo.
5. Nada se guarda sin que yo lo confirme, y la foto queda con la comida, sin su ubicación.
6. Si el reconocimiento no responde, puedo buscar los alimentos sin perder la foto.
7. Al guardar puedo deshacerlo durante unos segundos.

> **Dónde vive la foto** (`ADR-042`): en un almacén privado de Cloudflare R2 que guarda
> los datos solo en Estados Unidos. Nadie la ve por una dirección pública; la app la muestra
> con un enlace que vale cinco minutos. Antes de guardarla se le quitan la ubicación, la
> cámara y la hora. Cloudflare la guarda por cuenta de Allfit, con un contrato de
> transmisión de datos como lo pide la Ley 1581. Si un cliente o una auditoría pidiera una
> llave de cifrado propia, las fotos pueden pasar a AWS S3 sin que cambie nada para la
> persona.

### HU-SP-114 — Registrar una comida buscando sus alimentos

**Como** persona que registra lo que come
**quiero** buscar un alimento y elegir cuánto comí
**para** registrar rápido sin saberme sus calorías.

`E-SP-10` · importante

**Criterios**

1. Encuentro un alimento por su nombre o por como le digo yo, con o sin tildes.
2. Veo primero lo que más registro, con la última cantidad que usé.
3. Elijo la porción entre las habituales o escribo los gramos, y veo sus calorías y macros antes de añadirlo.
4. Veo el total de la comida mientras la armo.
5. Al guardar puedo deshacerlo durante unos segundos.

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

> **Reabierta para V1** el 9 de noviembre de 2026 (`ADR-048`), junto con `E-SP-14`. Un plan
> presencial se paga aquí, en la página de Mercado Pago. Uno remoto se paga por fuera de la
> aplicación, con el link que manda el gimnasio, y la aplicación lo muestra cuando está activo.
> Pro sigue llegando por un gimnasio activo (`E-SP-15`).

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
4. Solo veo planes **presenciales**. Un plan remoto no se ofrece en la aplicación.

> **Criterion 4 implemented (TECH-130, backend).** Migration `20261120100000_space_offers_only_in_person_plans.sql` filters
> `GET /space/v1/organizations/{organizationId}/plans` and `POST /space/v1/subscriptions` to
> `delivery_mode = 'in_person'`. A remote version is refused like one not on offer.

### HU-SP-080 — Suscribirme a un plan

**Como** persona que quiere entrenar en un gimnasio
**quiero** suscribirme a uno de sus planes
**para** empezar a usar su servicio.

`E-SP-13` · imprescindible

**Criterios**

1. El precio que veo al suscribirme **queda congelado**. Si el gimnasio sube el precio después, a mí no me sube: eso exige un plan nuevo.
2. Pago en la página de Mercado Pago, que se abre desde la aplicación. Mis datos de tarjeta van **directo a la cuenta del gimnasio**, y Allfit One nunca los ve ni los guarda.
3. **Suscribirme no comparte ninguno de mis datos.** El permiso sigue siendo una decisión aparte.
4. Suscribirme tampoco crea la relación con el gimnasio: eso ya existía antes.
5. Solo puedo tener un plan vivo a la vez con el mismo gimnasio.
6. Si el gimnasio no tiene su medio de cobro configurado, se me dice claramente en lugar de dejarme a medias.
7. Mercado Pago me pide el correo de mi cuenta de Allfit One, y la aplicación me dice cuál es antes de abrirlo.
8. Mi plan queda **pendiente** hasta que Mercado Pago confirme el pago. Si vuelvo a intentarlo, retomo el mismo pago en lugar de crear otro.
9. Un plan remoto no se compra en la aplicación. Lo pago con el link que me manda mi gimnasio, que abre una página de Allfit One en el navegador.

### HU-SP-081 — Ver mi plan y mis pagos

**Como** persona suscrita
**quiero** ver en qué estado está mi plan y qué he pagado
**para** saber si estoy al día.

`E-SP-13` · imprescindible

**Criterios**

1. Veo si estoy activa o suspendida, qué plan tengo, cuánto pago y cuándo es el próximo cobro.
2. Veo cada cobro con su resultado, incluidos los que fallaron.
3. Nunca veo un dato de tarjeta, porque Allfit no lo tiene.
4. Un plan remoto lo veo igual, pero sin botón de pago ni link.

### HU-SP-082 — Cancelar mi plan

**Como** persona suscrita
**quiero** cancelar mi plan cuando quiera
**para** dejar de pagar.

`E-SP-13` · imprescindible

**Criterios**

1. Cancelar el pago **no termina mi relación** con el gimnasio ni revoca ningún permiso. Si además quiero cortar el acceso a mis datos, eso lo decido por separado.
2. Mi Fitness ID y todo mi historial quedan intactos.
3. Nadie del gimnasio puede cancelar por mí ni yo por nadie.
4. Cancelar desde la aplicación también cancela el cobro en Mercado Pago. Si Mercado Pago no lo confirma, no se cancela nada y se me dice.
5. Si cancelo desde mi cuenta de Mercado Pago, la aplicación lo muestra como cancelado en Mercado Pago, con los efectos de un plan suspendido, y puedo terminarlo desde aquí.

---

## E-SP-14 · Qué pasa si no pago

> **Reabierta para V1** junto con `E-SP-13` (`ADR-048`). Un cobro fallido suspende el plan solo
> cuando Mercado Pago deja de reintentarlo.

### HU-SP-083 — Entender qué pierdo si mi pago falla

**Como** persona a la que se le venció la tarjeta
**quiero** saber exactamente qué se me suspende y qué conservo
**para** no asustarme y poder arreglarlo.

`E-SP-14` · importante

**Criterios**

1. Si un cobro falla, Mercado Pago lo reintenta durante unos días y mi plan sigue activo. Si todos los reintentos fallan, queda **suspendido**, y se me avisa con claridad.
2. **Nada se termina solo, nunca.** Mi relación con el gimnasio sigue viva y mis permisos siguen intactos.
3. **Conservo todo lo mío:** mi historial completo, mi entrenamiento por mi cuenta y mi registro de comidas siguen funcionando igual.
4. Lo único que se pausa son las **sesiones futuras** del programa que me asignó ese gimnasio. Lo que ya entrené no se toca.
5. Mi entrenador puede seguir viendo lo que le compartí, pero **no puede asignarme nada nuevo** ni escribir sobre mis datos.
6. La suspensión dura **el tiempo que sea**: no hay un plazo tras el cual me cierren nada.
7. Al pagar se quita **solo el bloqueo de esa suscripción** y se vuelve a calcular qué puedo usar con el estado actual; no se restaura una copia anterior.
8. No tengo que volver a dar un permiso que siga vigente, pero un permiso revocado, una relación terminada, una asignación cambiada o una sesión cancelada, iniciada o pasada **no revive** por pagar.
9. Si queda otro bloqueo activo, lo afectado sigue pausado. Solo vuelven las sesiones futuras, no iniciadas y no canceladas que todavía correspondan a una relación y asignación vigentes.
10. Para un plan presencial puedo cambiar mi tarjeta desde la aplicación. Para uno remoto, mi gimnasio me manda el link otra vez.

---

## E-SP-15 · Allfit Pro

La regla que gobierna la épica: **nunca se cobra por controlar los propios
datos.** Privacidad, permisos, registro de accesos, portabilidad y supresión son
gratuitos siempre. Pro cobra por profundidad y volumen, no por control.

Y un límite **nunca borra nada**: quien baja a gratis conserva todo su historial
y lo sigue viendo.

**Dos planes y dos vías.** En V1 existen solo los planes de Allfit: el **gratuito** y
**Pro**. A Pro se llega de dos formas:

- **Pagándoselo a Allfit**, con la compra integrada de Apple en iPhone o de Google Play
  en Android.
- **Entrando invitado por un gimnasio activo.** Allfit crea los gimnasios, y uno activo
  es uno que le está pagando a Allfit. Toda persona que acepta su invitación tiene
  Pro mientras la relación siga vigente y el gimnasio siga activo.

Dentro de la aplicación solo se ofrece la compra integrada de cada tienda: la App Store
lo exige para suscripciones digitales (guía 3.1.1) y Google Play hace lo propio. El cobro
web a los gimnasios pertenece a Backoffice y no pasa por Space (`ADR-043`).

> **Qué incluye cada plan todavía no está decidido.** Es deliberado: la frontera
> vive como configuración, así que puede cambiarse publicando otra versión de
> plan, sin tocar código. Estas historias describen **cómo se comporta** el
> sistema ante cualquier frontera, no cuál es.

### HU-SP-084 — Ver qué me da Pro

**Como** persona que usa Allfit
**quiero** ver qué incluye cada plan y cuánto cuesta
**para** decidir si me sirve.

`E-SP-15` · imprescindible

**Criterios**

1. Veo el precio, si el cobro es mensual o anual, y **exactamente qué incluye cada plan con su límite**.
2. Veo también qué incluye el **plan gratuito**, con sus límites, para poder comparar.
3. Ninguna función de privacidad aparece como algo que deba pagar, porque ninguna puede limitarse.
4. Si Allfit cambia qué incluye cada plan, lo veo reflejado sin tener que actualizar la aplicación.

### HU-SP-085 — Suscribirme a Pro

**Como** persona que entrena por su cuenta
**quiero** pagarle a Allfit para tener la aplicación completa
**para** no depender de estar en un gimnasio.

`E-SP-15` · imprescindible

**Criterios**

1. El precio que acepto **queda congelado**: si Allfit sube el precio, a mí no me sube.
2. Solo puedo tener una suscripción a Allfit a la vez.
3. Pagarle a Allfit **no comparte ninguno de mis datos con nadie** ni cambia mis permisos.
4. Mis datos de tarjeta no los guarda Allfit.
5. Pago con la compra integrada de Apple en iPhone o de Google Play en Android. Allfit verifica la compra con la tienda antes de darme Pro.
6. Si mi Pro ya viene de un gimnasio, se me dice dónde está el precio y **no se me ofrece pagar**: ya tengo Pro, y cobrarme otra vez no me daría nada. Si esa relación termina, puedo suscribirme (`HU-SP-088`).

### HU-SP-086 — Saber si tengo Pro y por qué

**Como** persona
**quiero** ver si tengo Pro y de dónde me viene
**para** entender de qué depende.

`E-SP-15` · imprescindible

**Criterios**

1. Veo si tengo Pro y **por cuál vía**: porque le pago a Allfit, o porque entré invitada por un gimnasio activo.
2. Si viene de un gimnasio, veo **cuál**, para saber que lo pierdo si esa relación termina.
3. Veo el límite vigente de cada función, incluido cuando estoy en el plan gratuito.
4. Ante cualquier duda el sistema me trata como plan gratuito, nunca al revés.
5. Si Allfit endurece el plan gratuito, **a mí no me quita nada si ya estaba suscrita**: conservo la versión que acepté.

### HU-SP-087 — Cancelar mi Pro

**Como** persona suscrita a Allfit
**quiero** cancelar cuando quiera
**para** dejar de pagar.

`E-SP-15` · imprescindible

**Criterios**

1. **No se borra ni un solo dato mío.** Conservo mi historial completo y lo sigo viendo; lo que cambia son los límites.
2. Si además tengo una relación vigente con un gimnasio activo, **lo conservo por esa vía**.
3. Cancelar no afecta mi relación con ningún gimnasio ni ninguno de mis permisos.
4. Cancelo desde la gestión de suscripciones de la tienda donde pagué, que la aplicación me abre; la tienda no permite hacerlo de otra forma.
5. Conservo Pro hasta el final del periodo que ya pagué.

### HU-SP-088 — Entender qué pasa con mi Pro si termina mi relación con el gimnasio

**Como** persona cuyo Pro viene de su gimnasio
**quiero** saber qué pierdo si esa relación termina
**para** no llevarme una sorpresa.

`E-SP-15` · imprescindible

*Reescrita el 1 de octubre de 2026: en V1 el Pro del gimnasio no depende de un cobro a la persona sino de la relación y de que el gimnasio esté activo.*

**Criterios**

1. Si el gimnasio termina la relación conmigo desde Studio, o la termino yo, el Pro que venía de él **baja a gratis de inmediato**.
2. Lo mismo pasa si el gimnasio deja de estar activo para Allfit: sus invitados pasan a gratis.
3. **Conservo todos mis datos.** Los sigo viendo completos; solo se limitan algunas funciones.
4. Si vuelvo a tener una relación vigente con un gimnasio activo, Pro vuelve **solo**, sin que yo haga nada.
5. Puedo recuperarlo antes pagándole directamente a Allfit, y entonces deja de depender del gimnasio.
6. Mi privacidad, mis permisos y mi historial **nunca** se ven afectados por esto.

---

## E-SP-16 · Hoy y navegación

### HU-SP-089 — Ver qué debo hacer hoy

**Como** persona que abre la aplicación
**quiero** ver de una lo que me toca hoy
**para** no tener que buscarlo.

`E-SP-16` · imprescindible

**Criterios**

1. Al abrir la aplicación veo **la siguiente sesión pendiente de mi semana** y puedo empezarla desde ahí, sin pasar por otras pantallas.
2. **El día es una sugerencia, no una obligación.** Puedo hacer cualquier sesión de la semana el día que quiera; la semana es la unidad y el orden orienta.
3. **Si ya cumplí la semana se me dice**, y se me ofrece entrenar libre en vez de adelantar la semana siguiente.
4. Si no tengo nada planeado, se me ofrece elegir un programa (`HU-SP-100`) y también registrar un entrenamiento libre. **Nunca veo una pantalla vacía sin salida.**
5. Veo lo que quedó pendiente: una sesión sin cerrar, una propuesta de mi coach esperando respuesta, un permiso que me pidieron.
6. Si mi plan con el gimnasio está suspendido, lo veo aquí con claridad y sé qué hacer.
7. Todo se muestra en mi zona horaria.
8. Veo **las rutinas de mi semana en un carrusel**, una tarjeta por sesión, y cada una con **la fotografía que le corresponde por lo que trabaja**: la reconozco por su imagen antes de leer su nombre. No la elijo yo ni la elige nadie — la decide el contenido.
9. Cada tarjeta me dice **cuántos ejercicios y cuántas series** tiene, y me ofrece las dos cosas que puedo querer ahí mismo: verla entera antes de decidir, o empezarla.
10. **La marcha de la semana se ve como los días cumplidos**: cuántas sesiones llevo de las que me tocan, día por día, y no un porcentaje que no me dice qué me falta. Junto a ella veo lo que llevo hecho esta semana: minutos entrenando, series registradas y **kilos levantados**. Los kilos son los que moví, no los que peso: mi peso corporal es una medida mía y vive en mi progreso, no en el resumen de lo que hice.
11. **No se me inventa nada que no haya pasado.** No veo una hora a la que nadie me citó ni una sede donde nadie me espera: nadie las ha respondido nunca y ponerlas sería escribirlas yo. Prefiero una tarjeta que diga menos a una que diga algo que no ocurrió.
12. **Las fotografías del carrusel muestran a alguien como yo cuando lo dije**, y una mezcla de las dos cuando preferí no decirlo. La mezcla es siempre la misma: no cambia de cara cada vez que abro la aplicación. **No se me pregunta otra vez ni se guarda nada nuevo por esto**: se usa lo que ya conté, y nada más.
13. **Puedo girar la tarjeta** y ver el detalle sin salir de la pantalla ni elegir otra vista: qué músculos trabaja la rutina y cuántas series se lleva cada uno, y cómo me fue la última vez que la hice. Vuelvo a girarla y tengo otra vez la portada. Girar una tarjeta no gira las demás.
14. **El reverso cuenta la última vez sólo si la hubo**: cuándo fue, cuánto duró, cuántas series registré y cuánto peso moví. Una rutina que nunca entrené me enseña los músculos y **calla** lo demás, en vez de decirme cero. Una rutina que no es de fuerza no me inventa un tonelaje. Y no cuenta como «la última vez» ni una sesión que anulé ni la que tengo abierta ahora mismo: la última vez es una que terminó.

### HU-SP-100 — Elegir mi primer programa

**Como** persona que acaba de activar su Fitness ID y no tiene nada planeado
**quiero** que me propongan programas que encajen conmigo
**para** empezar hoy sin tener que armar un plan desde cero.

`E-SP-16` · imprescindible

**Criterios**

1. Veo programas que corresponden a lo que conté en el onboarding: mi objetivo y cuánto he entrenado. No es un catálogo genérico.
2. **Elijo cuántos días por semana puedo comprometer.** Se me ofrecen tres, cuatro y cinco días para mi objetivo y mi nivel, y ninguna de esas opciones es contenido pensado para otro nivel.
3. Uno viene marcado como sugerido, y puedo elegir otro sin fricción. La sugerencia orienta, no decide.
4. De cada programa veo antes de elegir cuántos días son, cuántas semanas dura, para qué nivel es y qué zonas trabaja. Si el programa **no tiene fecha de fin**, donde iría la duración leo «Sin fin» en la tarjeta y «Sin fecha de fin» en el detalle: sé que se repite hasta que yo lo cambie, en vez de ver un número en blanco o uno inventado.
5. **Antes de comprometerme veo el contenido completo**: el reparto entero, y de cada día sus ejercicios con sus series. Los días están todos a la vista y abro el que quiera; que se lean de uno en uno no es verlos a medias, es no tener que desplazar ocho semanas para saber qué hay en el cuarto. Ocho semanas no se deciden con un resumen.
6. Puedo ver el catálogo completo **sin salir de esta pantalla**: «Ver todos» extiende la lista donde está, con los que mejor encajan primero, y puedo volver a plegarla. No se me lleva a otro sitio a empezar la elección de nuevo.
7. **Al elegir uno, tengo sesiones en mi agenda desde hoy**, en mi zona horaria. Elegir no es una intención: es un plan.
8. Nunca estoy obligada a elegir: entrenar libre y crear mi propio programa siguen disponibles desde aquí.
9. El programa que elijo es mío. Ninguna organización lo administra ni lo ve.
10. **Las fotografías del catálogo muestran a alguien como yo cuando lo dije**, y una mezcla de las dos cuando preferí no decirlo, igual de estable: el mismo programa me recibe con la misma imagen cada vez que vuelvo. **No se me pregunta otra vez ni se guarda nada nuevo por esto**, y ver el catálogo no le dice a nadie qué contesté.
11. **Cada programa se me presenta con la misma tarjeta con la que veré mis rutinas** cuando lo tome: la fotografía ocupa la tarjeta entera, y encima leo su nombre, las zonas que trabaja y sus cifras. El primer día y el día ciento uno son la misma pantalla con distinto contenido, no dos productos que se parecen.
12. **Elegir no es comprometerse.** La tarjeta me lleva al programa entero, que es donde lo tomo; desde la lista no se me asigna nada, porque ocho semanas no se aceptan con un toque sobre una fotografía.
13. **El programa se ve antes de leerse.** Su fotografía encabeza el detalle, cada día del reparto lleva la suya —la misma que esa rutina tendrá en mi inicio cuando lo tome— y cada ejercicio su demostración. Decido mirando lo que voy a hacer, no una lista de nombres; y donde todavía no hay imagen curada no se inventa ninguna: se lee igual, sólo que sin foto.
14. **Cada programa de Allfit trae su meta de nutrición, ajustada a mí.** Veo la energía del día y las tres macros, calculadas con mi último peso para el objetivo del programa —el mío, si el programa lo sirve—. Al tomarlo puedo adoptarla como mi meta, y mi meta anterior queda en el historial; si no la quiero, no cambia nada. Sin peso registrado no se me muestra ninguna: no se inventan cifras.

**Por qué existe esta historia.** La escribimos el 31 de agosto de 2026, después de
detectar —como con `HU-SP-099`— que el diseño tenía la pantalla y ninguna historia la
describía. `HU-SP-089` criterio 2 solo ofrecía entrenamiento libre cuando no había
nada planeado, que es una salida pero no un plan; se enmendó en el mismo cambio.

**De dónde sale el catálogo.** Los programas son contenido **global**, propiedad de
Allfit: no pertenecen a ninguna organización ni a ninguna persona. `OP-PLN-011` ya
preveía esto al exigir «versión de programa publicada y accesible para la persona:
propia o global». En V1 el catálogo es curado y precargado; **no hay IA generando
programas**, y la correspondencia con la persona se resuelve con lo que declaró.

**Qué hace el sexo declarado.** Ordena y fotografía; no filtra. Todos ven el mismo
catálogo, con los mismos programas y en la misma cantidad, y quien declinó no
recibe una lista distinta ni necesita una regla aparte: lo que cambia es la
fotografía de la portada, y para quien declinó es una mezcla de las dos, no una
por defecto. Son dos juegos de fotografías y no tres, porque «mixto» es lo que se
ve cuando el carrusel alterna entre ellos, no una tercera manera de fotografiar a
alguien.

**Por qué la pantalla se rehízo el 21 de septiembre de 2026.** El primer día enseñaba
tres fichas de texto con un filete y una cifra al costado, y el día siguiente —ya con
programa— enseñaba fotografías a toda tarjeta. Eran dos productos pegados: la pantalla
que convence a alguien de empezar era la más pobre de las dos. Ahora el catálogo se
presenta con la tarjeta de Hoy, que es además lo que va a ver cada mañana si acepta, y
«Ver todos» deja de ser una puerta a otra pantalla para ser lo que dice: más lista.

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
| `E-SP-01` Registro y onboarding | `HU-SP-006` – `HU-SP-015`, `HU-SP-096` – `HU-SP-098`, `HU-SP-101` | 11 de 14 |
| `E-SP-02` Invitaciones y relaciones | `HU-SP-016` – `HU-SP-020`, `HU-SP-095` | 3 de 6 |
| `E-SP-03` Perfil, cuerpo y salud | `HU-SP-021` – `HU-SP-028` | 2 de 8 |
| `E-SP-04` Mis datos y quién los ve | `HU-SP-029` – `HU-SP-036` | 6 de 8 |
| `E-SP-05` Agenda y asignaciones | `HU-SP-037` – `HU-SP-041` | 5 de 5 |
| `E-SP-06` Contenido de entrenamiento propio | `HU-SP-042` – `HU-SP-050` | 0 de 9 |
| `E-SP-07` Registro de ejecución | `HU-SP-051` – `HU-SP-056` | 6 de 6 |
| `E-SP-08` Historial y progreso | `HU-SP-057` – `HU-SP-063`, `HU-SP-112` | 1 de 8 |
| `E-SP-09` Catálogo y sin conexión | `HU-SP-064` – `HU-SP-066` | 3 de 3 |
| `E-SP-10` Nutrición | `HU-SP-067` – `HU-SP-074`, `HU-SP-113`, `HU-SP-114` | 0 de 10 |
| `E-SP-11` Sincronización con apps de salud | `HU-SP-075` | 0 de 1 |
| `E-SP-12` Contacto y notificaciones | `HU-SP-076` – `HU-SP-078` | 0 de 3 |
| `E-SP-13` Mi plan con el gimnasio | `HU-SP-079` – `HU-SP-082` | 4 de 4 |
| `E-SP-14` Qué pasa si no pago | `HU-SP-083` | 0 de 1 |
| `E-SP-15` Allfit Pro | `HU-SP-084` – `HU-SP-088` | 5 de 5 |
| `E-SP-16` Hoy y navegación | `HU-SP-089` – `HU-SP-094`, `HU-SP-100` | 4 de 7 |
| **Total** | **99 historias** | **53 imprescindibles** |

El camino mínimo para lanzar es: crear cuenta y entrar, activar el Fitness ID,
ver qué toca hoy, entrenar y registrarlo aunque no haya señal, ver el historial,
aceptar la invitación de un gimnasio, decidir qué se comparte y poder cortarlo,
y tener Pro, por el gimnasio o pagándoselo a Allfit. Los planes presenciales
de un gimnasio se pagan dentro de la aplicación, con Mercado Pago (`ADR-048`).

**Nutrición no está entre lo imprescindible** aunque ya tenga todo el modelo
listo: es la rebanada más independiente y puede entrar justo después del
lanzamiento sin tocar nada de lo demás. Lo mismo con el contenido propio: quien
llega por un gimnasio recibe su programa asignado y no necesita crear el suyo.
