# Telemetry privacy notice

**Version:** `analytics-v1`

**Status:** effective when the production telemetry gates are enabled

**Public notice:**
[https://www.allfit.one/privacy/analytics](https://www.allfit.one/privacy/analytics)

Allfit One may collect optional product-use and performance telemetry after a
person chooses **Allow analytics** on a device. Declining does not restrict any
feature, and the decision can be changed at any time from the Privacy control.

Client telemetry contains enumerated screens, flows, API operations, status
groups and performance measurements. It does not contain names, email
addresses, account, person, organization or client identifiers, credentials,
free text, URLs, request bodies, or health, fitness, body and nutrition data.
Session recording, heatmaps and automatic interaction capture are disabled.

Allfit One replaces the verified sign-in subject with a keyed, versioned
pseudonym before returning it to a client. The original subject and key are not
sent to PostHog. Server and worker events are anonymous aggregate operational
measurements and do not use the client pseudonym.

PostHog, hosted in the United States, acts as the telemetry data processor.
Production product events have a target retention of 90 days and logs have a
target retention of 30 days. Non-production telemetry is currently disabled.
Where the contracted plan cannot enforce the target, Allfit One records the
provider-plan exception and uses the shortest available retention.

A person may withdraw consent on the device and may request deletion at
`hello@allfitone.com`. Withdrawal immediately disables the client runtime. No
event is queued while the remote gate is unknown or disabled, and a late gate or
SDK response cannot reactivate capture after withdrawal, logout or an identity
change. Deletion covers every retained pseudonym key version in the applicable
environments.

The detailed controls are defined in the
[telemetry policy](../observability/TELEMETRY_POLICY.md).
