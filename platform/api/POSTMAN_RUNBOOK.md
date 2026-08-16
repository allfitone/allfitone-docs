# AllFit One Postman runbook

**Status:** Current<br>
**Last reviewed:** 16 August 2026<br>
**Owner:** Dinnartec Backend

## 1. Purpose and authority

Postman is the executable collaboration layer for exploring and validating the
AllFit One API. It complements the existing contract and test gates; it does not
replace them.

The sources of truth are:

1. [`allfit-v1.openapi.yaml`](https://github.com/dinnartec/allfitone/blob/main/packages/contracts/openapi/allfit-v1.openapi.yaml)
   for the executable HTTP contract;
2. `allfitone-docs` for product, architecture, security and operational policy;
3. the versioned `postman/` artifacts in `allfitone` for curated journeys and
   production smoke tests.

The current executable baseline contains 53 paths, 57 operations and 13 tags.
Automation must always derive these counts from the OpenAPI file instead of
encoding them as fixed acceptance thresholds.

## 2. Workspace governance

Use the internal Team Dinnartec workspace named **AllFit One**. Never make the
workspace public or publish its resources to the Public API Network.

The workspace description must state that:

- Git and OpenAPI are the executable source;
- this repository is the normative documentation source;
- Local View is the authoring surface and Cloud View is read-only for consumers;
- real personal, medical, nutrition, authentication and media data is forbidden.

Assign at least two Dinnartec workspace administrators. Give the backend team
edit access and product and QA read access. Review these assignments quarterly
and whenever a team member changes role or leaves Dinnartec.

## 3. Resource model

The workspace contains exactly these managed resources:

| Type                 | Name                                        | Ownership                                                |
| -------------------- | ------------------------------------------- | -------------------------------------------------------- |
| Specification        | `AllFit One Platform API — v1`              | Generated from the canonical OpenAPI only                |
| Generated collection | `AllFit One API v1 — Contract`              | Spec → collection only; never edit manually              |
| Curated collection   | `AllFit One — Local Journeys`               | Versioned in Git and edited in Local View                |
| Safe collection      | `AllFit One — Production Smoke`             | Versioned in Git; four unauthenticated GET requests only |
| Environment          | `Local`                                     | Shared URLs only                                         |
| Environment          | `Production`                                | Shared URLs only                                         |
| Monitor              | `AllFit One — Production Smoke — On Demand` | Triggered manually or by `workflow_dispatch` only        |

Do not create staging environments, mocks, SDKs, Flows, performance tests or
public documentation as part of this workspace baseline.

### Environments

| Variable           | Local                   | Production                      |
| ------------------ | ----------------------- | ------------------------------- |
| `baseUrl`          | `http://localhost:8080` | `https://api.allfit.one`        |
| `studioOrigin`     | `http://localhost:3000` | `https://studio.allfit.one`     |
| `backofficeOrigin` | `http://localhost:3001` | `https://backoffice.allfit.one` |

No other shared environment values are allowed. Domain IDs, cursors, ETags,
tokens and invitation tokens must be local or run-scoped.

## 4. Local View and Git workflow

Open the root of the `allfitone` monorepo in Postman Desktop. Native Git uses:

- `.postman/resources.yaml` to map local paths to Cloud resources;
- `postman/collections/` for version 3 multi-file collections;
- `postman/environments/` for non-secret shared environments;
- `packages/contracts/openapi/allfit-v1.openapi.yaml` for the canonical spec.

Make changes in Local View on a feature branch. Include the Postman artifacts in
the same pull request as the API change they exercise. Cloud View is a deployed
mirror, not an editing surface.

Before opening a pull request, run:

```bash
bun install --frozen-lockfile
bun run check:openapi
bun run check:contracts
bun run check:postman
npx -y postman-cli collection lint "postman/collections/AllFit One - Local Journeys" --fail-severity warning
npx -y postman-cli collection lint "postman/collections/AllFit One - Production Smoke" --fail-severity warning
bun run test:postman:smoke
```

The smoke command uses an ephemeral local fixture and never contacts production.
Pull requests must not run production requests.

## 5. Authentication and test data

Use Postman's cookie jar for Studio and Backoffice sessions. Never copy cookies
into environments, collection variables or examples.

- Studio OAuth remains a hosted, manually assisted flow.
- Backoffice password and TOTP remain a manually assisted AAL2 flow.
- Do not add authentication bypasses or test-only API endpoints.
- Keep local credentials, TOTP seeds and access tokens in Postman Local Vault.
- Do not assume Shared Vault while Dinnartec uses the Free plan.

Journey scripts create `Idempotency-Key` and `Command-Id` values and capture IDs
and ETags in run scope. Use only synthetic people, organizations, email addresses,
health context and nutrition data.

Never save real production responses, signed URLs, photos, tokens, cookies or
sensitive bodies as examples. A response may be inspected transiently during an
authorized diagnostic session but must not be saved or copied to Cloud.

## 6. CI publication and contract synchronization

Create a Postman API key named `github-allfitone-main` in the Postman account
settings. Copy it once into the GitHub Actions secret `POSTMAN_API_KEY`; never
write it to Git, Postman variables, logs or documentation.

Configure these GitHub Actions variables:

- `POSTMAN_WORKSPACE_ID`
- `POSTMAN_SPEC_ID`
- `POSTMAN_CONTRACT_COLLECTION_UID`
- `POSTMAN_SMOKE_COLLECTION_UID`
- `POSTMAN_PROD_ENV_UID`
- `POSTMAN_SMOKE_MONITOR_ID`

The non-sensitive local mappings remain reviewable in
`.postman/resources.yaml`. If a Cloud resource is deliberately replaced, update
the GitHub variable and Native Git mapping in the same change.

After every successful `main` build, CI performs a normal
`postman workspace push --yes`. Never use `force-sync`: it may delete Cloud-only
resources. CI then uploads the canonical OpenAPI root file, invokes the official
spec-to-collection synchronization endpoint, waits for the asynchronous task and
compares the generated collection with OpenAPI by exact method and path. Missing,
orphaned or duplicate operations fail publication.

## 7. On-demand production smoke

The production smoke contains only:

- `GET /health`;
- `GET /backoffice/v1/telemetry-config`;
- `GET /space/v1/telemetry-config`;
- `GET /studio/v1/telemetry-config`.

It verifies status, JSON content type, cache headers, absence of `Set-Cookie` and
the closed public response shape. It has no auth, body or mutation.

Run it from GitHub Actions using **Postman Production Smoke → Run workflow**, or
manually with:

```bash
postman monitor run "$POSTMAN_SMOKE_MONITOR_ID" --timeout 60000
```

The monitor must use Postman's **Postman CLI** run mode, not a schedule. Postman's
public API currently requires a schedule during monitor creation, so the initial
bootstrap monitor is paused with a placeholder daily cron. In Postman Desktop or
the web app, edit the monitor once, select **Run → Postman CLI**, save it and
confirm that no schedule remains. Do not resume a scheduled mode.

Under the monitor's Notifications settings, connect the Dinnartec Slack workspace
and select `#allfitone-alerts` for run failures and errors. Confirm the subscription
message appears in that channel. Postman's monitor API exposes email recipients
but not native Slack channel configuration, so this connection is a one-time UI
step.

## 8. Recovery and drift handling

If Cloud View differs from Git:

1. stop Cloud editing and identify whether the change is authorized;
2. preserve any legitimate change by recreating it in Local View on a branch;
3. run all local validation;
4. merge through the normal review process;
5. let the successful `main` workflow publish with the default push strategy;
6. verify the generated contract collection reports `in-sync` and exact parity.

Do not use `force-sync`, manually edit the generated collection or make Cloud the
source of truth. If a resource was deleted, recreate it, update its non-sensitive
ID mappings and rerun publication. If the API key is exposed, revoke it, create a
replacement with the same purpose, rotate `POSTMAN_API_KEY` and review logs for
use of the old key.

After recovery, run the production smoke manually. Do not save its responses.

## 9. Acceptance checklist

- `main` passes OpenAPI, generated contract, Postman, lint, typecheck, test and
  build gates.
- The workspace remains internal and contains only Local and Production.
- The generated collection has one request per OpenAPI operation.
- A repeat publication produces no unexpected changes.
- Local journeys cover governed errors, idempotent replay, ETag concurrency and
  applicable cache policy.
- The on-demand smoke completes with four requests and nineteen assertions.
- A deliberate monitor failure reaches `#allfitone-alerts` after the native
  Postman Slack subscription is configured.
- Git and Postman Cloud contain no credentials, cookies or real personal data.
