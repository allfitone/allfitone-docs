# Allfit Studio AuthKit Operations

**Applies to:** `HU-STUDIO-001 — Sign in`, `HU-STUDIO-002 — Sign out`, `HU-STUDIO-003 — Password recovery`
**Authentication surface:** WorkOS AuthKit Hosted UI
**Application:** Allfit Studio

Studio delegates sign-up, email verification, email-and-password sign-in, and
password recovery to the WorkOS hosted UI. Studio owns the opaque application
session, personal activation, membership routing, and all authorization after
the provider redirects back.

## Application configuration

Configure Studio as its own WorkOS Application in every environment. Do not
reuse the Space or Backoffice application credentials.

| Setting               | Required value                              |
| --------------------- | ------------------------------------------- |
| Authentication method | Email and password enabled                  |
| Fallback locale       | Spanish                                     |
| Redirect URI          | `{API_PUBLIC_URL}/studio/v1/auth/callback`  |
| Sign-out redirect     | The trusted `STUDIO_WEB_URL`                |
| Client ID and API key | Studio-specific credentials                 |
| Session policy        | Studio-specific values below                |

Studio uses the following browser-session policy in every WorkOS environment:

| Session control        | Value      |
| ---------------------- | ---------- |
| Inactivity timeout     | 30 minutes |
| Maximum session length | 12 hours   |
| Access token duration  | 5 minutes  |

The inactivity timeout is enforced twice. WorkOS ends the hosted session when
refresh activity stops, while Studio hides already-rendered content after 30
minutes without deliberate keyboard, pointer, or touch interaction. Background
requests do not extend the browser guard.

The API receives these values through `WORKOS_CLIENT_ID_STUDIO`,
`WORKOS_API_KEY_STUDIO`, `WORKOS_ISSUER`, `API_PUBLIC_URL`, and
`STUDIO_WEB_URL`. The shared webhook additionally requires
`WORKOS_WEBHOOK_SECRET`. The browser receives only `NEXT_PUBLIC_API_URL`; no
WorkOS credential may be exposed through a public environment variable.

Studio and Space share the WorkOS user directory but not application sessions.
The API validates the token `client_id` against the requested surface and uses
only `sub` and `sid`. WorkOS organization, role, and permission claims never
authorize an Allfit operation.

## Password recovery and webhook

WorkOS sends the recovery email and renders the request and password-change
screens. Allfit does not expose password-reset request or confirmation endpoints.
The hosted response must remain indistinguishable whether or not the address is
registered.

Create one environment-level WorkOS endpoint at
`{API_PUBLIC_URL}/webhooks/workos`, copy its signing secret to
`WORKOS_WEBHOOK_SECRET`, and subscribe only to `password_reset.succeeded`. The
endpoint is operational Identity infrastructure shared by Studio, Space and
Backoffice; it is not part of a client API contract.

The API verifies `WorkOS-Signature` over the untouched request body with a
five-minute tolerance. A verified password-reset event writes one idempotent
receipt and revokes every active local opaque session for the exact
`provider + issuer + subject` whose `created_at` is not later than the event.
A login created after the password change remains valid. Receipt and revocations
commit in the same PostgreSQL transaction; a database failure returns `503` so
WorkOS retries.

Never log the request body, signature, subject, email, provider reset ID or
event ID. The receipt stores no raw payload, email or subject.

## Sandbox release gate

Run this checklist against the WorkOS sandbox before promoting either AuthKit
configuration or Studio authentication changes:

1. Register a new address with a password, complete email verification, and
   confirm the callback returns to Studio.
2. Complete adult eligibility, identity, and both versioned legal acceptances;
   confirm no professional operation is available before completion.
3. Sign in with an existing address and password.
4. Submit an unknown address and submit a known address with a wrong password.
   The visible response must be indistinguishable. Treat any difference as a
   release blocker and do not replace the hosted UI without a new architecture
   decision.
5. Confirm a Space session does not authenticate `/studio/v1/session`.
6. Confirm logout revokes the local Studio session, clears its cookie, reaches
   hosted logout, and returns to the configured Studio URL.
7. Confirm Space remains authenticated after ending a Studio session.
8. Leave Studio without deliberate interaction for 30 minutes. Confirm the
   current tab is covered, every other Studio tab is covered, and the next
   request requires authentication. Repeat at the 12-hour absolute limit.
9. After logout, reload and use browser Back. No previous workspace, account,
   membership, or onboarding content may become visible.
10. Simulate unavailable local session persistence. Confirm the opaque cookie is
    still deleted and Studio returns with the recoverable partial-close notice.
11. With zero active memberships, choose **Wait for an invitation** and confirm
   that no organization, membership, or professional profile is created.
12. Add one active membership externally and use **Check again**; Studio must
    enter that workspace. Repeat with multiple memberships and confirm the
    organization selector appears.
13. Open two independent Studio sessions, request password recovery through
    AuthKit, and complete the change. The next request from both prior sessions
    must return `401`.
14. Sign in again after the password change and confirm that this newer session
    remains valid. Replay the same webhook delivery and confirm no additional
    revocation or receipt is created.

Do not record test addresses, names, tokens, session identifiers, or provider
responses in screenshots, logs, or release evidence.

## Operational counters

The API emits structured, log-derived counters with closed dimensions:

| Counter                          | Dimensions                         |
| -------------------------------- | ---------------------------------- |
| `studio.auth.callback`           | `outcome`; closed failure `reason` |
| `studio.auth.logout`             | `trigger`; closed `outcome`        |
| `studio.registration.incomplete` | None                               |
| `studio.membership.destination`  | `zero`, `one`, or `multiple`       |
| `identity.password_reset.webhook` | `processed`, `replayed`, `account-absent`, `ignored`, `invalid`, or `failed` |

These events contain no account, person, organization, contact, token, or
provider detail. Alerting and aggregation belong to the runtime log platform;
application code must not add identifying dimensions.

Alert on every `studio.auth.logout` event with `outcome=partial`. The browser is
already safe because its opaque cookie and rendered content are cleared, but a
partial result means the local revocation or hosted redirect could not be fully
confirmed and requires operational review. There is no automatic retry worker
in this delivery.

Alert on sustained `identity.password_reset.webhook` outcomes of `invalid` and
on every `failed` delivery. A `failed` response intentionally remains retryable;
there is no Allfit worker for webhook redelivery.

## Rollout and rollback

Deploy in this order: apply the forward-only database migration; create the
WorkOS endpoint and obtain its signing secret; configure
`WORKOS_WEBHOOK_SECRET`; deploy the API; enable only
`password_reset.succeeded`; then execute the sandbox release gate. To roll back,
disable the WorkOS endpoint first. The receipt migration remains in place and is
not reversed.

## Deferred boundaries

- Waiting for an invitation does not accept or claim an invitation token.
- `identity.onboarding_attempts.invitation_token_hash` remains reserved for the
  complete invitation slice.
- Consultable legal pages remain explicit product debt. Studio continues to
  require and store both versioned acceptances without making them implicit.
