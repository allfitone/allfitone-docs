# Invitaciones de equipo exclusivas de Studio

## Alcance entregado

El flujo cubre `HU-STUDIO-014`, `HU-STUDIO-015`, `HU-STUDIO-016`,
`HU-STUDIO-085` y `HU-STUDIO-086`: emisión y entrega por correo, consulta
pública segura, autenticación, activación previa cuando haga falta, aceptación o
rechazo, listado paginado, revocación y expiración por lotes.

Las invitaciones de equipo pertenecen exclusivamente a Studio. Space conserva
las invitaciones de clientes, relaciones, programas y scopes; nunca incorpora
personas al staff de una organización.

## Superficie y contrato del token

- El correo enlaza a `https://studio.allfit.one/invitations#token=…`.
- Studio captura el fragmento antes de la hidratación, valida un token base64url
  de 32 bytes, lo retira inmediatamente de la URL y lo conserva en una clave
  dedicada de `sessionStorage` mientras dure la pestaña.
- El token se envía a la API únicamente dentro del cuerpo JSON de un `POST`.
  Nunca forma parte de un path, query string, log, métrica o referrer.
- `POST /studio/v1/invitations/resolve` es público y solo presenta organización,
  parte responsable, vencimiento e intención de membresía. No devuelve el email.
- `POST /studio/v1/invitations/decisions` exige sesión, `Idempotency-Key`,
  `Command-Id` y coincidencia exacta con el correo verificado por AuthKit.
- `GET /studio/v1/organizations/{organizationId}/invitations` y
  `POST /studio/v1/organizations/{organizationId}/invitations/{invitationId}/revocation`
  están limitados por capacidad dentro de la organización.

Una invitación inválida, vencida, revocada o consumida responde con el mismo
`404`. Las respuestas usan origen CORS exacto, `Cache-Control: no-store` y
`Referrer-Policy: no-referrer`. Los límites responden `429` con `Retry-After`.

## Identidad y efectos

El backend conserva `verifiedEmail` cifrado dentro de la sesión solo cuando
WorkOS informa `emailVerified=true`; no lo expone en `GET /studio/v1/session`.
Si la cuenta aún no tiene persona activa, el flujo reutiliza la activación de
Studio y asocia opcionalmente el hash del token al intento. Activar la cuenta no
acepta la invitación.

Aceptar valida persona, organización y rol dentro de una única transacción. Si
ya existe una membresía activa, reutiliza su `membership_id` y `joined_at` y
añade solo el rol faltante. Una membresía terminada produce una nueva. Rechazar
no crea membresía ni rol. Ninguna decisión crea perfil de cliente, relación,
scope, grant ni acceso a datos de clientes.

Aceptación y revocación bloquean la misma invitación: gana la primera operación
confirmada. Las decisiones emiten `identity.invitation_intent_decided.v1`; la
expiración emite `identity.invitation_expired.v1`, y las revocaciones conservan
su evidencia durable.

## Persistencia y límites

Las migraciones son forward-only: primero evolucionan `claimed` a `completed` y
añaden el estado de intención `revoked`; después instalan funciones cerradas,
índices, políticas y ciclo de vida. `allfit_api` continúa sin DML directo.

PostgreSQL aplica como máximo 20 emisiones por actor y hora, 100 por
organización en 24 horas y tres entregas por destinatario y organización en 24
horas. Los contadores almacenan solo dimensiones SHA-256 normalizadas y se
retienen como máximo siete días. El worker expira por lotes aun cuando la
entrega esté deshabilitada.

Vercel debe aplicar además 20 emisiones/hora/IP, 30 resoluciones/minuto/IP y 10
decisiones/hora/IP. La aplicación no persiste direcciones IP.

## Release gates

- `STAFF_INVITATION_ISSUANCE_ENABLED`: permite crear o reutilizar propuestas.
- `STAFF_INVITATION_DELIVERY_ENABLED`: permite reclamar y enviar correos.
- `NEXT_PUBLIC_STAFF_INVITATIONS_ENABLED`: muestra la interfaz de emisión.

Resolver, decidir, listar, revocar y expirar no dependen de estos gates, para
que una invitación ya emitida pueda terminar su ciclo durante un rollback. El
orden seguro para apagar es interfaz, emisión y, solo si se decide detener
correos aún no reclamados, entrega.
