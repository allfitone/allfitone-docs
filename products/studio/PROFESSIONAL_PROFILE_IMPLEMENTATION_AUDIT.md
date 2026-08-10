# Allfit Studio Professional Profile Implementation Audit

**Audit date:** 2026-08-10
**Implementation branch:** `feat/studio-professional-profile`
**Branch head reviewed:** `92ee3c2` plus the 2026-08-10 P1 and P2 resolution working tree
**Normative story:** `HU-STUDIO-005 — Complete my professional profile`
**Decision:** P1 and P2 findings resolved; P3 trajectory preview remains as explicit debt

## 1. Scope

This audit covers the professional profile vertical slice implemented for Allfit Studio:

- OpenAPI contracts and generated contract artifacts.
- Professional specialty and credential type catalogues.
- Personal professional profile persistence and projection.
- Credential declaration, revision, retirement, and verification projection.
- PostgreSQL RLS, closed mutation functions, durable idempotency, access auditing, and outbox events.
- Studio API handlers, exact-origin CORS, session resolution, validation, and error mapping.
- The local Studio frontend implementation for `/profile`, including presentation, credentials, membership context, responsive layout, and accessibility behavior.

The backend and database implementation is committed on the branch. The Studio frontend reviewed by this audit is still present only as uncommitted local changes and is not part of the remote branch yet.

## 2. Executive assessment

The slice follows the principal product and security rules of `HU-STUDIO-005`:

- The professional profile belongs to the person and can exist without an organization.
- WorkOS organization, role, and permission claims are not used for authorization.
- A declared credential starts as unverified.
- Verification belongs to an exact credential version and is never projected as a global verified-profile state.
- Credential evidence is not exposed through the Studio projection.
- RLS is forced and runtime mutations are restricted to closed PostgreSQL functions.

The two original P1 merge blockers and all six P2 findings are resolved in the reviewed working tree. Access auditing now has a monthly horizon plus a default safety partition, professional-profile commands retain their identities while the normalized intention remains unchanged, personal membership history agrees across PostgreSQL, API and Studio, and the high-risk browser interactions are protected by Chromium coverage. F-08 remains the only open finding and is tracked as non-blocking P3 debt.

## 3. Findings

### F-01 — Access auditing has a fixed partition horizon

**Severity:** P1 — Resolved
**Area:** Database / availability

`privacy.access_events` only creates monthly partitions from August through November 2026:

- `allfitone/packages/db/supabase/migrations/20260810030000_professional_profile.sql:294`
- `allfitone/packages/db/supabase/migrations/20260810030000_professional_profile.sql:300`

No default partition, scheduled partition provisioning, or later partition migration exists in the repository. `identity.get_my_professional_context` writes the access event before returning the profile. Starting on 2026-12-01, PostgreSQL will reject the audit insert because no partition accepts the row, and the fail-closed read will make `GET /studio/v1/me` return an unavailable error.

**Resolution:** The forward-only migration `20260810040000_extend_access_event_partitions.sql` adds monthly partitions from December 2026 through December 2027 and an indefinite `access_events_default` fallback. Every new partition belongs to `allfit_owner`, forces RLS, inherits the parent indexes, and grants no direct runtime access. `T-PRIV-PHY-01` verifies monthly and out-of-horizon routing together with the physical security properties. The annual maintenance procedure is documented in `platform/database/OPERATIONS.md`.

### F-02 — Ambiguous failures rotate credential command identities

**Severity:** P1 — Resolved
**Area:** Frontend / idempotency

The credential dialog preserves its command identifiers for an explicit `503`, but generates a new `Idempotency-Key` and `Command-Id` for other errors:

- `allfitone/apps/studio-web/src/components/professional-credentials.tsx:441-450`

A transport failure can occur after PostgreSQL commits but before the browser receives the response. Retrying with new command identifiers can declare a duplicate credential or create another revision.

**Resolution:** Studio now uses a shared command-intention manager for profile updates and credential declaration, revision, and retirement. Its key includes the operation, route resource and normalized payload. It reuses the same `Idempotency-Key` and `Command-Id` for unchanged retries regardless of transport or server error and resets only after success, cancellation, stale-resource resolution, session termination or a materially different intention. Unit coverage proves stable retries and rotation for changed payloads, operations and credential identifiers.

### F-03 — Cyan text fails contrast on light surfaces

**Severity:** P2 — Resolved
**Area:** Frontend / accessibility

Fresh browser measurements found:

- `Abrir evidencia declarada`: `#55EFFB` over the light credential card, approximately `1.32:1`.
- Light-canvas section kickers: `#55EFFB` over `#EDF6F6`, approximately `1.26:1`.

The relevant styling applies the primary cyan token to every profile kicker:

- `allfitone/apps/studio-web/src/app/studio.composition.css:784-788`

These values are below the `4.5:1` threshold for normal text. This is a targeted contrast finding and is not a claim of complete WCAG conformance or non-conformance.

**Resolution:** Light-surface kickers and evidence links now use the DS `turquoise-deep` token, while cyan remains reserved for ink surfaces. Playwright calculates the effective foreground/background contrast and requires at least `4.5:1` for both affected cases.

### F-04 — The membership summary advertises unavailable history

**Severity:** P2 — Resolved
**Area:** API projection / frontend semantics

The database projection returns only active memberships:

- `allfitone/packages/db/supabase/migrations/20260810030000_professional_profile.sql:680`

The frontend calculates and displays `Finalized memberships` from that active-only response:

- `allfitone/apps/studio-web/src/components/professional-memberships.tsx:17-30`

The finalized count will therefore always be zero and suggests that historical membership data was evaluated when it was not returned.

**Resolution:** The forward-only migration `20260810050000_include_professional_membership_history.sql` extends the consolidated personal projection with active and terminated memberships, including closed organizations as history. Active roles are current; terminated roles are evaluated at `ended_at`. API types preserve the nullable end date, Studio separates current spaces from a collapsible history, and `/studio/v1/me/memberships` remains active-only for workspace routing. pgTAP, API and Playwright tests cover the complete boundary.

### F-05 — The credential dialog exposes an English close action

**Severity:** P2 — Resolved
**Area:** Frontend / localization

The DS-generated footer close action is visible as `Close`:

- `allfitone/apps/studio-web/src/components/professional-credentials.tsx:458`

The rest of the Studio flow is in Spanish.

**Resolution:** The credential dialog disables both generated English close actions and composes `DialogClose` with a DS `Button` labeled `Cancelar`. Chromium coverage verifies Escape dismissal, the Spanish action and focus restoration.

### F-06 — The professional profile pgTAP test is not isolated

**Severity:** P2 — Resolved
**Area:** Database tests

The test asserts the global count of all `identity.professional_profile_updated.v1` events:

- `allfitone/packages/db/supabase/tests/database/T-IDN-PROFESSIONAL-PROFILE-01.test.sql:149-153`

On a valid local database that already contains a professional profile event, the suite reports two events instead of one. During this audit, 116 of 117 pgTAP assertions passed and this assertion failed for that reason.

**Resolution:** The assertion now filters by event type, aggregate type and the profile ID created inside the transaction. The test also inserts a valid event for another aggregate before the command, proving that unrelated existing events cannot change the result.

### F-07 — Required frontend interaction coverage is absent

**Severity:** P2 — Resolved
**Area:** Frontend tests

The Studio suite contains pure validation and API-client tests, but no component or browser-level coverage for the acceptance paths required by the implementation plan:

- Navigation with zero, one, and multiple memberships.
- Profile completion without an organization.
- Double submission prevention.
- Stable retry after `503` or a transport failure.
- Credential declaration, revision, retirement, and concurrent conflict refresh.
- Session expiration and `registration-incomplete` routing.
- Dialog focus return and keyboard operation.

Manual audit confirmed that Escape closes the credential dialog and returns focus to `Add credential`, but this behavior is not protected by an automated test.

**Resolution:** Studio now has a dedicated Playwright Chromium suite with mocked cross-origin Studio APIs. Twelve scenarios cover zero/one/multiple active memberships, terminated-history exclusion from routing, optional profile access, stable command identities, synchronous double submission, declaration/revision/retirement, stale conflicts, session routing, dialog focus, 390 px overflow, reduced motion and measured contrast. CI runs it in an isolated `Studio E2E` job.

### F-08 — The trajectory preview combines draft and persisted values

**Severity:** P3
**Area:** Frontend / UX

The trajectory displays the draft start year but keeps the persisted `experience_years` value until the profile is saved:

- `allfitone/apps/studio-web/src/components/professional-presentation.tsx:267-276`

Editing the year can temporarily produce contradictory values, and a new profile shows `To be calculated` even when a valid draft year is present.

**Required correction:** Derive the preview from the current draft year. Continue treating the server projection as canonical after a successful save.

### F-09 — The Studio UI implies that every account holder is a trainer

**Severity:** P2 — Resolved
**Area:** Product semantics / frontend UX

The domain model does not require every person with a Studio account to provide professional services. A Studio participant may be an organization owner, administrator, coach, or operational staff member, and an organization owner does not need a professional profile. The profile is optional and its existence should represent the person's explicit decision to present themselves as a professional.

The current frontend exposes `My profile` across the general Studio navigation and promotes professional profile completion as a standard next step:

- `allfitone/apps/studio-web/src/components/studio-frame.tsx:30-40`
- `allfitone/apps/studio-web/src/components/space-setup.tsx:41-65`
- `allfitone/apps/studio-web/src/components/membership-selector.tsx:17`
- `allfitone/apps/studio-web/src/components/organization-workspace.tsx:145-163`

This placement and the surrounding trainer-oriented language imply that professional profile completion applies to every Studio account holder, even though the backend correctly keeps it optional and independent of organization membership.

**Resolution:** Authenticated navigation uses the neutral label `Perfil profesional`; the organization workspace no longer promotes profile completion as an organizational next step. The zero-membership setup and profile hero explain that the profile is optional and only intended for people who train or provide services. No trainer flag, membership gate or authorization inference was added.

## 4. Positive observations

- The implementation preserves personal ownership and portability of the profile.
- Profile completion does not become an onboarding or organization-creation prerequisite.
- PostgreSQL functions verify that the actor is the same active person that owns the resource.
- Credential revisions retire the previous version atomically and do not inherit verification evidence.
- Revision and retirement concurrency cannot both confirm for the same active credential.
- Idempotency hashes for revision and retirement include the credential path identifier.
- Outbox events emitted by the current commands contain identifiers and governed codes rather than professional presentation PII.
- Exact Studio origin, opaque session cookie, command-header validation, and no-store policies are implemented.
- The frontend uses explicit `@allfitone/react` subpath imports and does not introduce local profile form controls or modal primitives.
- The desktop and mobile layouts preserve the Ink & Signal direction without horizontal overflow in the audited states.
- Reduced-motion styling is present.

## 5. Verification results

| Gate                                        | Result                                                     |
| ------------------------------------------- | ---------------------------------------------------------- |
| Root lint                                   | Passed                                                     |
| Root typecheck                              | Passed                                                     |
| Root unit tests                             | Passed                                                     |
| Root build                                  | Passed                                                     |
| API tests                                   | 71 passed, 0 failed                                        |
| Studio unit tests                           | 20 passed, 0 failed                                        |
| Studio Chromium tests                       | 13 passed, 0 failed                                        |
| Database concurrency tests                  | 2 passed, 0 failed                                         |
| Database lint                               | Passed                                                     |
| Database policy check against `origin/main` | Passed; one forward-only migration detected                |
| Generated DB types check                    | Passed                                                     |
| Generated contracts check                   | Passed                                                     |
| OpenAPI validation                          | Valid; four pre-existing redirect-response warnings remain |
| pgTAP                                       | 132 passed, 0 failed after a clean local rebuild           |

## 6. Visual audit coverage

Fresh local screenshots were captured for:

- Professional presentation at 1440 px.
- Professional presentation at an approximately 390 px CSS viewport.
- Credential list with active and retired records.
- Credential declaration dialog on desktop and mobile.

The audit verified responsive layout, visible focus behavior, Escape dismissal, and focus return. It did not perform a complete screen-reader audit, production WorkOS authentication test, or full WCAG conformance assessment.

## 7. Merge criteria

All P1 and P2 merge criteria are satisfied in the reviewed working tree. Before merge, commit the frontend, migration, generated contract, CI and documentation changes together with their regression tests, then require the complete root, database, API, Studio, contract, Playwright and build gates. F-08 remains explicit P3 debt and is not part of this correction.
