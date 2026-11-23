# Allfit Backoffice authentication operations

- **Applies to:** `HU-BO-001`, `HU-BO-002`, `HU-BO-003`
- **Surface:** `/backoffice/v1`
- **V1 evidence:** password + TOTP, materialized as AAL2 per session
- **Frontend:** `apps/backoffice-web`, a direct client of `/backoffice/v1`

The Backoffice does not use Hosted AuthKit to sign in. The API combines password authentication on the Backoffice Application with the [WorkOS composable MFA API](https://workos.com/docs/mfa), and PostgreSQL creates the session cookie only after the TOTP challenge is confirmed. Password recovery is the only hosted ceremony: WorkOS sends the email and serves the page on its `*.authkit.app` domain.

## Frontend behaviour

- Start-up asks for the session and the attempt in parallel. A `200` session goes
  straight to Inicio (`/panel`); a `200` attempt resumes enrollment or the challenge;
  two `401` answers show the sign-in. Any indeterminate state fails closed and mounts
  no operator data.
- A verified TOTP code also goes straight to Inicio. The address is replaced, not
  pushed, so Back from Inicio does not return to the access screen. Inicio's operator
  card shows who signed in, that it was with two factors, and both deadlines.
- From then on the workspace session gate holds the session: it confirms it before
  rendering, ends the view at the API deadline, follows a sign-out in another tab, and
  checks again when a tab comes back into view or is restored from BFCache.
- Enrollment shows the QR returned by WorkOS and always offers the manual key. Email,
  password, TOTP code, QR and manual key live only in memory and are never written to
  the URL, logs, `localStorage` or `sessionStorage`.
- Each distinct code creates an `Idempotency-Key` UUIDv4 and a `Command-Id` UUIDv7. If
  the response is lost, the client checks the session first and keeps the same
  identifiers for a safe retry of the same code.
- Tabs share only state and technical deadlines. Activity is refreshed at most once a
  minute.
- A manual or inactivity sign-out unmounts the authenticated view at once. If it cannot
  be confirmed, “Tu sesión está protegida” appears with no operator name or data, and
  with actions to complete the sign-out or retry.

The access screen once ended on “Acceso confirmado”, with the name, the AAL2 evidence,
the deadlines and a sign-out, because `HU-BO-004` did not exist yet. Inicio now shows
the same facts, so the screen was removed. Authorization did not change: every request
resolves the session and the duty again.

The frontend uses only `@allfitone/react` and the DTOs generated in
`@allfitone/contracts`. `NEXT_PUBLIC_API_URL` is still its only environment variable.

## WorkOS configuration

In every environment, use an Application exclusive to the Backoffice inside the matching WorkOS environment:

| Setting | Value |
| --- | --- |
| Method | Email + password enabled |
| Default emails | Enabled |
| AuthKit global MFA | Disabled |
| SSO, OAuth, Magic Auth, SMS and passkeys | Disabled in V1 |
| Custom domain | Not required; `auth.allfit.one` deferred |
| Webhook | `password_reset.succeeded` to `{API_PUBLIC_URL}/webhooks/workos` |

Sign-in uses `WORKOS_API_KEY_BACKOFFICE`, `WORKOS_CLIENT_ID_BACKOFFICE` and the issuer the API expects. The worker needs only `WORKOS_API_KEY_BACKOFFICE`, to delete abandoned factors and revoke a `sid`; it needs no client ID, issuer or domain.

## Variables and gates

| Deployable | Variable | Use |
| --- | --- | --- |
| API | `BACKOFFICE_AUTH_ENABLED=false` | Closes only new password sign-ins during a deployment or rollback |
| API | `BACKOFFICE_WEB_URL` | Exact CORS origin; no list or wildcard |
| API | `WORKOS_API_KEY_BACKOFFICE` | Password, MFA, reset and revocation |
| API | `WORKOS_CLIENT_ID_BACKOFFICE` | The exact Application to authenticate against and validate tokens for |
| API | `WORKOS_ISSUER` | Expected issuer and the link in `access_accounts` |
| API | `SESSION_ENCRYPTION_KEY` | Encrypts tokens and temporary enrollment data |
| Worker | `WORKOS_API_KEY_BACKOFFICE` | External cleanup and revocation |
| Worker | `DATABASE_URL`, `CRON_SECRET` | Closed functions and protection of `/cron/outbox` |

With the gate off, session, logout, verification of attempts already open, reset, expiry and revocation stay available. No custom-domain variables are added.

## Contract and cookies

- `POST /backoffice/v1/auth/password` creates a ten-minute attempt and the `allfit_backoffice_auth_attempt` cookie: `HttpOnly`, `SameSite=Strict`, host-only and limited to `/backoffice/v1/auth`.
- `GET /backoffice/v1/auth/attempt` resumes the challenge or enrollment without returning IDs, tokens or identity.
- `POST /backoffice/v1/auth/totp/verification` requires `Idempotency-Key`, `Command-Id` and a six-digit code. An attempt tolerates at most five wrong codes.
- `GET /backoffice/v1/session` returns only the level and method, the given name and the deadlines. It exposes no email, factor, claims, duties or permissions.
- `POST /backoffice/v1/auth/logout` accepts `manual`, `inactivity` or `recovery`, never redirects and always answers `204`.
- `POST /backoffice/v1/auth/password-resets` always answers `202`; the API discards the URL and token WorkOS returns.

Every route requires the exact `Origin`, answers `Cache-Control: no-store` and `Referrer-Policy: no-referrer`, and never logs an email, password, TOTP code, QR, manual key, factor or challenge ID, or token. The `allfit_backoffice_session` cookie uses path `/backoffice/v1` and `Max-Age=43200`. The session ends after 60 minutes without activity or 12 hours in all (ADR-046); PostgreSQL enforces both through `access_control.backoffice_idle_limit()` and `access_control.backoffice_session_lifetime()`, and `GET /backoffice/v1/session` reports `inactivity_expires_at` as the last activity plus 60 minutes.

## Per-address limits

**Before AWS, on Vercel.** These rules lived in the Vercel project of the API, with no IP
stored in PostgreSQL:

- password: 10 requests every 15 minutes per IP;
- TOTP: 20 requests every 15 minutes per IP, on top of five wrong codes per attempt in PostgreSQL;
- reset: 5 requests an hour per IP.

The refusal is `429 rate-limited` with `Retry-After`. The metrics are counters without personal data for password, enrollment, challenge, verification, session, logout, reset and rate limiting.

**On AWS.** The Vercel rules did not move with the API, so production has had no per-address
limit since. The five-failure lockout per attempt in PostgreSQL still holds, but nothing
slows down someone who tries many accounts from one address. It matters more for Space,
whose sign-in passes through the API, so the identity provider only ever sees the API's
address.

The code branch `feat/backoffice-last-gaps` (`infra/modules/edge`) restores the limit with
an AWS WAF web ACL on the load balancer. It takes effect when Terraform is applied in
`infra/production`:

- **Backoffice:** 20 `POST` per address in 5 minutes, over `/backoffice/v1/auth/password`,
  `totp/verification` and `password-resets` together. A sign-in is two requests, so that
  is ten sign-ins.
- **Space:** 100 `POST` per address in 5 minutes, over `/space/v1/auth/sessions`,
  `registrations`, `registrations/verification` and `password-resets`. It is looser
  because a phone carrier puts many people behind one address.
- **The answer** is the API's: `429` with `{"error":{"code":"rate-limited"}}`,
  `Retry-After: 300` and `Cache-Control: no-store`. It also carries the CORS headers for
  the Backoffice origin, so the screen reads the `429` instead of a network error.
- **Nothing else is counted:** every other route and method passes untouched, and no
  address reaches PostgreSQL.
- **Cost (AWS price list, November 2026):** US$5 a month for the web ACL, US$1 a month per
  rule (two), and US$0.60 per million requests inspected.
- **Tests:** `infra/modules/edge/tests/edge.tftest.hcl` checks the limits, the window, the
  `429` and the association with the load balancer.

## Protected bootstrap

The `backoffice-bootstrap.yml` workflow and the `backoffice-bootstrap-production`
environment this section used to describe do not exist (ADR-046, *A stale ceremony*). The
ceremony is the `bootstrap` command of the migrator task, `infra/docker/migrator.sh`:

1. Apply the migrations as usual (**Deploy Database AWS**).
2. Each of the two people signs in to Studio once, so their WorkOS account already has a
   person; the command looks both people up through those accounts.
3. Run the migrator task on ECS with the command `bootstrap` and three environment
   overrides: `SUBJECT_A` and `SUBJECT_B`, the two WorkOS user ids, and
   `CEREMONY_REFERENCE`, the approving ticket without personal data. The header of
   `infra/docker/migrator.sh` gives the `aws ecs run-task` call. Since ADR-046 there is no
   `DUTY_DAYS`; a value left over from an old runbook is ignored.
4. The command resolves both people, switches to `allfit_migrator` and calls
   `support.bootstrap_backoffice_administrators` in one transaction. It links the accounts
   and grants each person `allfit_admin`, granted by the other; each role brings the
   thirteen duties, granted by the other person and with no end of their own.
5. Check that both accounts are linked, that two crossed `allfit_admin` roles exist and that
   each person holds thirteen duties with `basis = 'admin_role'`.

The task connects with the database master credential. No endpoint, seed or function
granted to the runtime can repeat the bootstrap. The command does not create people or
WorkOS accounts.

## Recovering a lost authenticator

**Not runnable as written (see ADR-046, *A stale ceremony*):** the `backoffice-totp-recovery.yml` workflow and its environment do not exist, and no migrator command runs the recovery. The function `identity.recover_backoffice_totp_factor` exists and requires two administrators other than the subject, both holding `manage_platform_access`; with two administrators in all, it cannot run for either of them. The rest of this section describes what the function does. It blocks the factor and the relevant sessions, attempts and roles, records immutable evidence and hands the cleanup to the worker. The next correct password starts a new enrollment.

The process never shows or recovers the previous TOTP key. Changing the password does not by itself delete the active factor; a `password_reset.succeeded` does revoke the Studio and Backoffice sessions and the pending attempts.

## Worker and observability

`GET /cron/outbox` processes on every run:

- batch expiry of attempts;
- deletion of abandoned pending factors;
- revocation of a `sid` after a partial logout, a withdrawn role, a reset or a recovery;
- idempotent retries, and a dead letter after the configured maximum.

Check the cron with `Authorization: Bearer {CRON_SECRET}`: without the bearer it must answer `401`; with it, it must return the `invitations` and `backofficeAuthentication` results. Alert on `worker.backoffice_auth.cleanup` in `retrying`, on growth of abandoned attempts and on a sustained rise in failed verifications.

## Sandbox and deployment gate

1. Keep `BACKOFFICE_AUTH_ENABLED=false`, apply structure and functions, and run the bootstrap.
2. Confirm that an unknown password, a wrong password, an inactive person and a missing role return the same `401`.
3. In Preview, turn the gate on and enroll a real QR. Verify a real TOTP code and check that only then does an AAL2 session appear.
4. Sign in again with the existing factor, try four wrong codes and confirm that the fifth ends the attempt.
5. Confirm 60 idle minutes, 12 absolute hours (ADR-046), repeated logout and role withdrawal during a sign-in.
6. Request a reset for a known address and an unknown one; both answer `202`. Complete the hosted email on `*.authkit.app` and check that sessions are revoked without losing the TOTP factor.
7. Try the protected recovery of a factor and the enrollment after it.
8. Turn on Production without the frontend and run the same smoke test through the HTTP contract.

To roll back, turn off `BACKOFFICE_AUTH_ENABLED` first. Do not turn off the worker, logout, session, expiry, reset or revocation while attempts or sessions issued under it exist.

## Limit of the guarantee

Password + TOTP is the internal AAL2 evidence approved for V1, bound to the session and not to claims. TOTP can be phished; Allfit will not claim full compliance with a modern AAL2 offer until it adds WebAuthn or passkeys. Adding `auth.allfit.one` later only changes the branding and configuration of the WorkOS hosted pages: it does not migrate HTTP contracts, cookies, factors or local sessions.

### Password + TOTP is not WebAuthn (`HU-BO-001` criterion 7)

**What the gap is.** A TOTP code is not bound to the site that asks for it. A page that
imitates the Backoffice can take the password and the current code and replay both to the
real Backoffice within the code's window, and the session it opens is a genuine AAL2
session. WebAuthn and passkeys sign a challenge bound to the origin, so a look-alike page
gets nothing it can replay. That is why V1 never claims phishing resistance or full
equivalence with an AAL2 offer built on WebAuthn.

**What limits the damage in V1:**

- Every action checks the duty and the session's AAL2 again inside its own transaction.
- A session lasts 12 hours at most and ends after 60 idle minutes (ADR-046).
- An attempt ends at the fifth wrong code.
- Signing out, or withdrawing the base role, revokes the session.
- Every read of a person's data is recorded before it is returned, so a stolen session leaves
  a trail in `privacy.access_events`.

None of these stops the relay itself; they bound how long and how far a relayed session
goes.

**What closes it.** WebAuthn or passkeys as the Backoffice factor, which `DB-P5-019` keeps
open. Until then, nobody should be told that the Backoffice sign-in resists phishing.
