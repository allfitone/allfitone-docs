# PostHog operations

This runbook configures the provider side of the
[telemetry policy](TELEMETRY_POLICY.md). Provider configuration is not complete
until every acceptance check in this document passes in the US organization.

## Projects and access

The current rollout uses one PostHog US project: `Allfit One Production`.
Non-production capture is disabled and must never send to the production
project. If non-production capture is introduced later, create a separate US
project, token and pseudonym key before enabling it.

Restrict project access to the authorized product, engineering, reliability,
security and privacy staff. IP capture, autocapture, automatic exceptions,
console capture, performance autocapture, session replay, surveys, heatmaps and
dead-click capture are disabled.

Connect the Slack integration named `Dinnartec`. Invite the PostHog bot to the
public channel `#posthog-alerts` (`C0BP0HYPZ7G`) before sending a test alert.

## Deployment variables

Server-only variables:

| Variable | Rule |
| --- | --- |
| `POSTHOG_SERVER_API_KEY` | US project token for the current environment |
| `POSTHOG_HOST` | Must be exactly `https://us.i.posthog.com` |
| `ANALYTICS_SERVER_ENABLED` | `true` only after the production synthetic smoke test and privacy review |
| `ANALYTICS_PSEUDONYM_ACTIVE_VERSION` | Positive integer |
| `ANALYTICS_PSEUDONYM_KEY_V<n>` | Environment-specific base64 32-byte secret |
| `ANALYTICS_STUDIO_CLIENT_ENABLED` | Remote Studio gate |
| `ANALYTICS_BACKOFFICE_CLIENT_ENABLED` | Remote Backoffice gate |
| `ANALYTICS_SPACE_CLIENT_ENABLED` | Remote Space gate |

Keys, pseudonyms and gates are exposed only when the resolved runtime
environment is production and the corresponding flag is exactly `true`.
`VERCEL_ENV` takes precedence over `NODE_ENV`, so `VERCEL_ENV=preview` remains
preview even when `NODE_ENV=production`. Invalid environment, key, host or flag
configuration is fail-closed.

Public build variables use the current environment's project token:

| Surface | Variables |
| --- | --- |
| Studio and Backoffice | `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`, `NEXT_PUBLIC_ANALYTICS_ENVIRONMENT`, `NEXT_PUBLIC_APP_RELEASE` |
| Space | `EXPO_PUBLIC_POSTHOG_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`, `EXPO_PUBLIC_ANALYTICS_ENVIRONMENT`, `EXPO_PUBLIC_APP_RELEASE` |

Project tokens are public configuration. Personal API keys, project secret keys
and HMAC keys are never public variables.

## Ingestion controls

Application adapters enforce the live event and property allowlists. Provider
capture remains configured with autocapture and automatic exception capture
disabled.

The following provider transformations were created but MUST remain disabled:

- `DISABLED · Allfit One allowlist · failed smoke`
- `DISABLED · Allfit One drop automatic events · failed smoke`
- `DISABLED · Allfit One strip properties · unvalidated`

On 2026-08-15, both MCP-created drop transformations discarded a permitted
synthetic event. The PostHog invocation endpoint also returned HTTP 500 during
dry-run. Do not enable them until PostHog fixes the test path and a manual UI
dry-run proves both positive and negative cases. The intended controls remain:

- Drop `$autocapture`, `$pageview`, `$snapshot` and `$exception`.
- Drop every event outside the seven-event policy catalogue.
- Apply a pre-ingestion transformation that removes any property outside the
  event-specific allowlist and drops the event if it contains a token, cookie,
  email, name, ID, URL, query, body, stack or free-text property.

No provider filter is a substitute for the application sanitizer. Until the
provider issue is resolved, the runtime sanitizer and disabled automatic
capture are the production controls.

The smoke test stored one synthetic `unknown.event.v1` before the unsafe
transformation was disabled. It contains no real identity or business data and
PostHog exposes no exact-event deletion through the connected API. Treat it as
QA data until retention removes it. The inherited GeoIP transformation was also
disabled; no ingestion transformation is active.

## Dashboards

The following dashboards exist in `Allfit One Production`:

### `Allfit One · Reliability`

- HTTP p50, p95 and p99 by surface and operation.
- Normal requests over one second and all 5xx.
- `session_db_ms`, `actor_db_ms`, `business_db_ms` and `workos_refresh_ms`.
- A separate trend for `external_dependency = workos`.
- LCP, INP and CLS by web surface; app start and screen transition for Space.
- Worker duration and failures by job.

### `Allfit One · Product`

- Authentication funnels by surface.
- Studio onboarding, organization, professional profile, credentials,
  invitations and team flows.
- Space registration and navigation.
- Activation and feature use by enumerated flow and screen only.

### `Allfit One · Telemetry Health`

- Event volume by environment, service and surface.
- Events with missing required properties.
- Ingestion silence by service and expected cron execution.
- Counts rejected by dry-run/live ingestion controls.

## Alerts

All alerts deliver to `#posthog-alerts`:

| Condition | Window and filters |
| --- | --- |
| Normal request over 1,000 ms | Immediate Slack destination per match; exclude WorkOS |
| 5xx or `unavailable` | Immediate Slack destination per 5xx match |
| Failed worker job | Immediate Slack destination per failed job |
| Missing cron | Daily alert when `backoffice_auth_cleanup` has no completion in 24 hours |
| p95 over 500 ms | Hourly; at least 20 normal samples |
| p99 over 800 ms | Hourly; at least 20 normal samples |
| LCP, INP or CLS regression | One hourly ratio alert; p75 and at least 20 samples per metric |

The current plan rejects real-time and 15-minute Insight alerts, so hourly is
the shortest supported Insight frequency. Direct Slack destinations preserve
immediate delivery for individual slow requests, 5xx and worker failures. Keep
WorkOS percentiles separate.

The three immediate destinations were verified on 2026-08-15 with synthetic,
PII-free events. PostHog recorded successful Slack executions in 66 ms, 77 ms
and 96 ms.

Keep the missing-cron alert disabled until worker telemetry is deployed and its
server gate is active. Enable it only after the first successful
`backoffice_auth_cleanup` event is visible, avoiding a pre-deploy false alarm.

## Release sequence

1. Keep every server and client gate disabled during provider configuration.
2. Deploy the landing first and verify that
   [the public analytics notice](https://www.allfit.one/privacy/analytics) is
   indexable, bilingual, linked from the footer and reachable from every client
   Privacy control.
3. Deploy the synchronized policy and runbook, then deploy the telemetry code
   with every gate still disabled.
4. Validate code, contracts, sanitizer tests, E2E and production builds. Use
   only PII-free synthetic events for provider and Slack smoke tests.
5. Confirm dashboards, immediate Slack destinations and Insight alerts.
6. Enable API and worker first. Verify permitted events and sanitized
   operational logs in PostHog US.
7. Grant consent on a synthetic Studio device, enable Studio and confirm there
   is no SDK or gate request before consent. Enable Backoffice and then Space
   through EAS, validating each surface before continuing.
8. Close each remote gate once and verify capture stops within five minutes.
   Events produced while closed must not appear after the gate reopens.
9. Observe web/server for 30 minutes and the mobile release for 24 hours.

The production project currently reports 12-month event retention. The target
is 90 days; record this as a provider-plan exception until the project setting
can enforce the target.

At any privacy regression, disable the remote gate and live-discard the affected
events. The client runtime stops capture at the next refresh, at most five
minutes after a successful gate response, and fails closed immediately on a
failed refresh. At a functional regression, disable telemetry without reverting
the additive API contracts.
