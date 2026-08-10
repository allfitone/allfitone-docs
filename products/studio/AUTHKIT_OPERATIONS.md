# Allfit Studio AuthKit Operations

**Applies to:** `HU-STUDIO-001 — Sign in`
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
| Session policy        | Set independently from Space and Backoffice |

The API receives these values through `WORKOS_CLIENT_ID_STUDIO`,
`WORKOS_API_KEY_STUDIO`, `WORKOS_ISSUER`, `API_PUBLIC_URL`, and
`STUDIO_WEB_URL`. The browser receives only `NEXT_PUBLIC_API_URL`; no WorkOS
credential may be exposed through a public environment variable.

Studio and Space share the WorkOS user directory but not application sessions.
The API validates the token `client_id` against the requested surface and uses
only `sub` and `sid`. WorkOS organization, role, and permission claims never
authorize an Allfit operation.

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
7. With zero active memberships, choose **Wait for an invitation** and confirm
   that no organization, membership, or professional profile is created.
8. Add one active membership externally and use **Check again**; Studio must
   enter that workspace. Repeat with multiple memberships and confirm the
   organization selector appears.

Do not record test addresses, names, tokens, session identifiers, or provider
responses in screenshots, logs, or release evidence.

## Operational counters

The API emits structured, log-derived counters with closed dimensions:

| Counter                          | Dimensions                         |
| -------------------------------- | ---------------------------------- |
| `studio.auth.callback`           | `outcome`; closed failure `reason` |
| `studio.registration.incomplete` | None                               |
| `studio.membership.destination`  | `zero`, `one`, or `multiple`       |

These events contain no account, person, organization, contact, token, or
provider detail. Alerting and aggregation belong to the runtime log platform;
application code must not add identifying dimensions.

## Deferred boundaries

- Waiting for an invitation does not accept or claim an invitation token.
- `identity.onboarding_attempts.invitation_token_hash` remains reserved for the
  complete invitation slice.
- Consultable legal pages remain explicit product debt. Studio continues to
  require and store both versioned acceptances without making them implicit.
