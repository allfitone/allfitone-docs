# HU-STUDIO-014 — corte de implementación

## Alcance entregado

El corte implementa la emisión de una invitación por correo para integrarse al
equipo. `owner` y `admin` pueden proponer `admin`, `coach` o `staff`; `staff`
solo puede proponer `staff`. `coach` no invita. La operación pública es
`POST /studio/v1/organizations/{organizationId}/invitations` (`OP-ORG-005`).

La operación no consulta personas, cuentas ni WorkOS por correo. Solo crea
`identity.invitations`, una intención `membership` pendiente y un evento de
outbox. Por eso la respuesta no puede revelar si el correo ya existe en Allfit.
El contacto se devuelve enmascarado.

## Seguridad y entrega

- Vigencia: siete días.
- El token se deriva mediante HMAC-SHA256 con clave versionada y se guarda solo
  su hash SHA-256.
- El outbox contiene únicamente `invitation_id`.
- Resend recibe una clave de idempotencia por evento de outbox.
- La cola reintenta fallos transitorios y conserva la invitación pendiente.
- RLS es forzado; `allfit_api` no tiene DML directo sobre invitaciones,
  intenciones, outbox ni circuit breaker.
- El cron exige el bearer exacto de `CRON_SECRET` y no expone CORS.

## Release gate y brecha consciente

Los flags de API/worker y Studio permanecen apagados en producción hasta que
`HU-SP-016` y `HU-SP-017` implementen lectura y decisión segura por universal
link. SMS no forma parte de este corte. Por tanto, `HU-STUDIO-014` tiene su
vertical emisor email terminado, pero el criterio multicanal sigue parcial.

Tampoco se incluyen listado (`HU-STUDIO-016`), revocación
(`HU-STUDIO-015`) ni materialización de la membresía.
