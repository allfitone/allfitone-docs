# Telemetry policy

**Notice version:** `analytics-v1`

**Provider:** PostHog US

**Applies to:** Studio, Space, API and worker

## Purpose and defaults

Allfit One uses telemetry only to understand product flows, reliability and
performance. Client telemetry is optional and disabled until a person grants
consent on that device. API and worker telemetry is always anonymous and
aggregated. A missing gate, key, consent record or provider response disables
capture and must never change authentication, authorization or business work.

The Backoffice has no client telemetry. Its operators are Allfit One staff, and
consent that an employer asks of its own staff is not freely given, so the
Backoffice loads no SDK, has no gate and asks for no decision. Its sessions carry
no analytics pseudonym.

The current rollout captures only production telemetry in `Allfit One
Production`. Development and preview capture remain disabled. If
non-production capture is introduced later, it requires a separate PostHog US
project, project token and pseudonym key; data must not be copied or merged.

## Identity and consent

- A client `distinct_id` is `a<version>_<base64url>` derived with HMAC-SHA256
  from the verified identity-provider `issuer + subject`.
- Email, name, `person_id`, `account_id`, organization ID and provider subject
  are never analytics identities or event properties.
- Each enabled environment uses its own 32-byte HMAC key. The active version is
  selected by `ANALYTICS_PSEUDONYM_ACTIVE_VERSION`; keys use
  `ANALYTICS_PSEUDONYM_KEY_V<n>`.
- Rotation creates a new analytics identity. Previous keys remain available to
  the privacy deletion process for the applicable retention period; identities
  are never merged automatically.
- Consent is stored per device as `analytics-v1`: web uses `localStorage` and
  Space uses encrypted Secure Store. Unknown, invalid or inaccessible storage
  means no consent.
- Global Privacy Control and Do Not Track override a web grant and disable
  capture. A person can change the decision from the persistent Privacy control.
- Logout and any HTTP 401 reset the SDK identity without changing the consent
  decision.
- Client SDK code, the remote gate request and event delivery must not run before
  consent. The gate is `GET /{studio|space}/v1/telemetry-config`, cached for five
  minutes and fail-closed. Each refresh first stops capture, then waits at most
  five seconds for a valid response. A disabled gate, timeout, invalid response
  or error stops and opts out the SDK, cancels pending initialization and
  schedules another check after five minutes while consent remains effective.
- Client events are never queued. Events produced while the gate is unknown or
  disabled are discarded and cannot be delivered after a later re-enable.
  Consent withdrawal, logout and identity changes invalidate in-flight gate and
  SDK work so a late response cannot reactivate capture.

## Approved event catalogue

Every event contains only `surface`, `service`, `environment`, `release` and
`platform`, plus the properties listed below.

| Event | Additional properties |
| --- | --- |
| `client.screen.viewed.v1` | Enumerated `screen` |
| `client.api_request.completed.v1` | Enumerated `operation`, method, closed outcome, status group, total duration, optional server duration and network overhead, external dependency |
| `client.performance.measured.v1` | Web Vital or mobile start/navigation metric, numeric value, closed rating |
| `client.failure.observed.v1` | Closed code, boundary and recoverability; no message or stack |
| `product.flow_step.completed.v1` | Enumerated flow, step, outcome and optional duration |
| `server.http_request.completed.v1` | Hono route template, method, status, outcome, region, total duration, approved phases and dependency |
| `worker.job.completed.v1` | Enumerated job and outcome, duration and optional aggregate count |

The TypeScript contract and runtime sanitizer in `@allfitone/telemetry` are the
executable allowlist. New event names or properties require a policy update,
contract review and privacy review before release.

## Prohibited data

Telemetry must never contain tokens, cookies, authorization headers, names,
emails, provider subjects, internal IDs, organization or client IDs, full URLs,
query strings, request or response bodies, free text, exception messages,
stacks, credentials, or health, fitness, nutrition, body, client or organization
data. Server events use route templates, never requested paths. Client HTTP
instrumentation receives an enumerated operation, never a URL.

Autocapture, automatic page views, heatmaps, session replay, surveys, automatic
exception capture, feature-flag evaluation and group analytics are prohibited.
IP capture and GeoIP enrichment are disabled. Server events use one aggregate
technical identity with person-profile processing disabled.

## Retention and deletion

- Production product and performance events: target 90 days.
- PostHog logs: target 30 days.
- Future non-production events and logs: target 30 days in a separate project.
- If the contracted plan cannot enforce these values, use the shortest
  available retention and record the exception in the operations log.
- A verified deletion request derives every retained pseudonym version for the
  subject in each environment and deletes those identities and events from
  PostHog. The deletion job records only completion metadata outside PostHog.
- Pseudonym keys are never present in clients and are stored only as protected
  server deployment secrets.

## Reliability objectives and alerts

Normal requests exclude calls with `external_dependency = workos`.

- p95 at or below 500 ms.
- p99 at or below 800 ms.
- Any normal request above one second alerts over a five-minute window.
- Any 5xx, `unavailable`, failed worker job or missed cron alerts.
- Web Vital regressions use a consolidated hourly alert with separate p75
  thresholds and a minimum of 20 samples for LCP, INP and CLS.

Alerts go only to Slack channel `#posthog-alerts` (`C0BP0HYPZ7G`). The PostHog
bot must be a channel member before an alert test is accepted.

## Incident response

For suspected prohibited data or unintended capture:

1. Disable the affected surface gate and `ANALYTICS_SERVER_ENABLED` as needed.
2. Enable the PostHog live discard filter for the affected event names.
3. Preserve sanitized deployment and configuration evidence; do not copy event
   payloads into tickets or Slack.
4. Identify the affected US project and time range, notify Privacy and Security,
   and initiate deletion.
5. Fix the allowlist or adapter and validate with synthetic data in an isolated
   project when available. Without one, keep provider transformations disabled
   and re-enable application gates only after privacy approval.

PostHog outages are availability incidents only when they affect observability;
the product remains available because every adapter absorbs provider failures.

## Privacy notice

The public, indexable notice is
[https://www.allfit.one/privacy/analytics](https://www.allfit.one/privacy/analytics).
It must be deployed and verified before any production gate is enabled. Every
client Privacy control links to that URL. PostHog US is recorded as the
telemetry processor in the public notice and in
[the repository notice](../privacy/TELEMETRY_PRIVACY_NOTICE.md).
