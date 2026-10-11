# Backend Architecture

`backend/src/` is a modular monolith: one FastAPI app (`main.py`) mounting one router per
domain module. Every domain module follows the same layering:

```
<module>/
  models/domain.py   # frozen dataclasses — the module's internal domain types
  models/orm.py       # SQLAlchemy ORM rows (suffixed `XxxRow`, except `location.Place` — see below)
  repository.py        # Protocol + Sql*Repository impl (+ Empty/Unavailable fallback for no-DB mode)
  service.py           # business logic; depends on repository + narrow *Lookup protocols
  schemas.py            # camelCase Pydantic wire schemas (request/response)
  controller.py         # FastAPI APIRouter, thin HTTP adapter over service.py
  factory.py             # wires repository + service singletons from settings (lru_cache)
```

All routers are mounted under `/v1` in [main.py](../backend/src/main.py) (`create_app`); static
paths must be added before parameterized ones with the same prefix (e.g. `/events/nearby` before
`/events/{id}`).

## Cross-module dependencies: the `*Lookup` protocol pattern

Modules never import another module's concrete `service.py`/`repository.py` directly for business
logic. Instead, a service declares a narrow `typing.Protocol` (a "port") describing only the one
method it needs, and the real implementation is wired in by `factory.py` at startup — this keeps
modules independently testable (see `backend/tests/test_*.py` `Fake*Lookup` classes) and avoids
import cycles.

Shared across modules (defined once in [shared/ports.py](../backend/src/shared/ports.py)):

- **`PlaceLookup`** (`resolve_city`) — implemented by `location`'s `PlaceRepository`. Consumed by
  `content`, `events`, and `feed` services to stamp posts/events with a resolved place.

Module-local (defined in that module's own `service.py` or focused ports module, implemented via an adapter class in the
_consuming_ module's `factory.py`):

| Protocol                | Declared in             | Method                  | Implemented by                                                                                         |
| ----------------------- | ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `ComedianLookup`        | `events/service.py`     | `comedian_exists`       | `creators` (via `events/factory.py:RepositoryComedianLookup`)                                          |
| `VenueLookup`           | `events/service.py`     | `get_venue`             | `creators` (via `events/factory.py:RepositoryVenueLookup`; stored venue name/address/coordinates only) |
| `CreatorLookup`         | `social/service.py`     | `creator_exists`        | `creators` (via `social/factory.py:RepositoryCreatorLookup`)                                           |
| `ContentLookup`         | `engagement/service.py` | `content_is_engageable` | `content` (via `engagement/factory.py:RepositoryContentLookup`)                                        |
| `EventVisibilityLookup` | `content/service.py`    | `is_public`             | `events` (wired in `content/factory.py`; draft links rejected before content persistence)              |
| `EventsLookup`          | `feed/service.py`       | `list_nearby`           | `events` (feed's own `FeedService` is passed `events.factory.get_service()` directly)                  |
| `VenueNameLookup`       | `feed/service.py`       | `venue_names`           | `feed`'s own repository (self-satisfied)                                                               |

## Module map

| Module                                  | Purpose                                                                                                                                                                                                             | Notable dependencies                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [location](../backend/src/location)     | Geographic place hierarchy + discovery-region strategy (mega/large/mid/small city). See `docs/location-discovery.md`.                                                                                               | none (foundation module)                                                                            |
| [creators](../backend/src/creators)     | Comedian/venue profile CRUD.                                                                                                                                                                                        | none                                                                                                |
| [social](../backend/src/social)         | Follows, blocks, reports.                                                                                                                                                                                           | `creators` (`CreatorLookup`)                                                                        |
| [content](../backend/src/content)       | Content posts + video upload lifecycle via `media`.                                                                                                                                                                 | `location` (`PlaceLookup`), `media`                                                                 |
| [events](../backend/src/events)         | Venue events + comedian lineup.                                                                                                                                                                                     | `creators` (`ComedianLookup`, `VenueLookup`), `location` (`PlaceLookup`)                            |
| [engagement](../backend/src/engagement) | Saves, likes, raw analytics events.                                                                                                                                                                                 | `content` (`ContentLookup`)                                                                         |
| [feed](../backend/src/feed)             | Ranked video feed + home feed, assembled from `content`/`social`/`events`/`engagement` data via its own repository. Trending section reads `workers`' cached score list (falls back to an on-demand query if cold). | `location` (`PlaceLookup`), `events`, `workers` (cache contract only, via `feed/trending_cache.py`) |
| [analytics](../backend/src/analytics)   | Creator-facing stats, read from rollup tables written by `workers`.                                                                                                                                                 | `content`, `engagement`, `social`, `location` (read-only joins)                                     |
| [media](../backend/src/media)           | `MediaProvider` boundary: Cloudflare Stream or in-memory stub.                                                                                                                                                      | none                                                                                                |
| [images](../backend/src/images)         | Managed gig-poster upload, processing, publication and cleanup; Supabase private originals/public derivatives.                                                                                                      | `events` (`PosterEvents`, session-bound adapter in consuming factory)                               |
| [workers](../backend/src/workers)       | `platform-worker` process: scheduled rollup/trending/video-reconciliation/poster-cleanup jobs.                                                                                                                      | `analytics`, `content`, `images`                                                                    |
| [shared](../backend/src/shared)         | Config, auth (JWT + role cache), cache (Redis/memory), database (engine/session), errors, logging, middleware, rate limiting, cross-module `ports`.                                                                 | none (foundation module)                                                                            |

## Managed event posters

The [images domain](../backend/src/images) owns event-bound image assets, private signed uploads,
validation/re-encoding, publication and cleanup. It is separate from video `media`/Cloudflare.
Its [PosterEvents port](../backend/src/images/ports.py) is implemented by the consuming factory's
adapter over event-repository operations. `ImageTransaction` binds the event port to the same
Session as the locked asset: ownership/reference reads and CAS must not open nested connections.
This prevents connection-pool starvation when multiple requests wait on one asset lock.

Each public gig requires one primary managed image. `EventPublicationStatus` (`draft`/`published`)
is separate from scheduled/cancelled status. Migration `0011_required_gig_images` preserves all
IDs and event data, publishing only existing valid, attached, owner/event-bound managed references.
Other records remain owner-only drafts; the database rejects incomplete published-image projections.

Publication first commits a lease, then writes a new immutable public object. Events owns the
time, schedule and location eligibility policy; images validates the ready owned/event-bound asset
and manages Storage. The transaction-bound port checks eligibility again under the final event row
lock. Publication state, event reference CAS and attached-asset state commit together in the second
database transaction; failed/replaced objects remain tracked for reconciliation.
Database/Storage are not an atomic transaction.
Draft completion also advances `posterRevision`, preventing stale publication after edits.
Same-image successful publication can replay at the original or next revision even after the
start time has elapsed. Public poster replacement retains the previous reference until commit;
sole-image removal is rejected by both service/repository policy and the database CHECK.
Do not substitute an ordinary JWT TUS endpoint for the signed `/upload/resumable/sign` endpoint.

Public details hide drafts from nonowners. Venue lists and nearby/Home queries exclude drafts
before limits; linked-event hydration omits drafts. `GET /venues/me/events` includes owned drafts,
cancelled events and past dates, newest-created first (ID descending breaks ties), before applying
its bounded limit. Historical dates therefore cannot crowd out recent preparations.
Media configuration is required for writes and the compatibility
`GET /events/poster-config` limit adapter (`enabled: true`, never an optional product gate);
unconfigured media returns explicit 503. Public event reads do not depend on Storage availability.

`image_assets` and `native_event_submissions` are backend-only tables: Alembic enables RLS and
revokes public/anon/authenticated access. Storage bucket/policy configuration belongs to the
versioned Supabase migration. See the [poster plan](plans/active/gig-posters.md) for contracts,
resource limits and pending live acceptance. The
[required-image decision](decisions/2026-10-11-required-gig-images.md) supersedes optional artwork
and describes the coordinated migration rollout; do not restore incompatible readers on rollback.

### Disposable PostGIS publication contracts

`backend/tests/test_required_gig_images_postgis.py` is opt-in. CI must provision a **new empty**
local database named `comedy_required_images_test` (or that prefix followed by `_suffix`), then
run `python -m pytest tests/test_required_gig_images_postgis.py -q` from `backend/` with:

- `REQUIRED_GIG_IMAGES_TEST_DATABASE_URL`: explicit disposable PostgreSQL URL.
- `REQUIRED_GIG_IMAGES_DISPOSABLE_DATABASE=1`: confirmation of that disposable target.

The suite refuses remote hosts, runtime-database names, URL options and nonempty databases.
It applies `0010`, seeds preserved legacy events/assets, migrates to head, and checks real SQL
constraints plus publication commit/fault/replay visibility with fake Storage. It does not drop
databases or tables and never falls back to `DISCOVERY_DATABASE_URL` or `.env`; reruns require
a newly provisioned database. Normal fake-suite runs skip the PostGIS cases without both opt-ins.

## Database Migration and Readiness Invariant

Every deployable backend artifact has a required Alembic head derived from its bundled migration
directory. A configured database behind that head must not receive normal traffic: `/health`
remains a liveness endpoint for diagnostics, while `/ready` and request admission compare only
`alembic_version` to the bundled heads. A mismatch or unavailable configured database returns a
credential-free 503 code instead of allowing later ORM queries to fail as route-specific 500s.

Run migrations as a serialized **release job**, never in every API/worker startup:

```sh
cd /app
python scripts/migrate.py
```

The command requires `DISCOVERY_DATABASE_URL`, takes a PostgreSQL advisory lock, runs
`alembic upgrade head`, and logs only revision identifiers before/after. The deployment platform
must run this exact-image command before API/worker rollout and use `/ready` as its traffic
readiness check. API rollback preserves additive schema/data; do not use Alembic downgrade as an
application rollback. See [Operator Tasks](OPERATOR-TASKS.md) for production evidence.

## Known naming exception

`location/models/orm.py`'s ORM class is `Place`, not `PlaceRow` like every other module's ORM
class (`ContentRow`, `EventRow`, `SaveRow`, ...). This predates the `Row`-suffix convention and is
referenced widely enough that renaming it was judged not worth the churn — it's called out with a
comment on the class itself.

## Rate limiting

All write endpoints below are throttled per authenticated user via `shared/ratelimit.py`'s
`rate_limited(key, limit=, window_seconds=)` FastAPI-dependency helper — one `RateLimiter` (and
cache client) is shared per distinct `(limit, window_seconds)` pair. Add/remove actions on the
same resource share one bucket (same `key`) so rapid toggling (e.g. follow→unfollow→follow) can't
bypass the limit.

| Bucket key       | Routes                                                                                              | Limit     |
| ---------------- | --------------------------------------------------------------------------------------------------- | --------- |
| `follow`         | `POST`/`DELETE /follows/{creator_id}`                                                               | 30 / min  |
| `block`          | `POST`/`DELETE /blocks/{user_id}`                                                                   | 20 / min  |
| `reports`        | `POST /reports`                                                                                     | 10 / hour |
| `like`           | `POST`/`DELETE /content/{id}/like`                                                                  | 60 / min  |
| `save`           | `POST`/`DELETE /content/{id}/save`                                                                  | 60 / min  |
| `analytics`      | `POST /analytics/events`                                                                            | 60 / min  |
| `event-write`    | Native draft create/completion, legacy create adapters, event update/cancellation and lineup writes | 20 / hour |
| `event-poster`   | Poster upload intent/completion, `POST /events/{id}/publish`, and poster replacement/removal        | 30 / hour |
| `content-create` | `POST /content` (all types)                                                                         | 20 / min  |
| `video-upload`   | `POST /content` (only when `type=video_clip`; additive on top of `content-create`)                  | 5 / min   |

## What the backend can do today

Concrete, currently-implemented flows in the comedy app, by user role. All endpoints below are
mounted under `/v1` (see each module's `controller.py` for the full request/response shape).

**Any authenticated user (fan, comedian, or venue)**

- Discover nearby cities/neighbourhoods/boroughs for browsing: `GET /discovery-regions?lat=&lng=`
  ([location](../backend/src/location)) — picks a strategy (mega/large/mid/small city) based on
  population and, for mid-size cities, local content inventory.
- Scroll a ranked, geolocated video feed with stable cursor pagination:
  `GET /feed/videos?lat=&lng=&cursor=` ([feed](../backend/src/feed)).
- Load the home screen's four sections (nearby events, trending clips, followed creators, new
  comedians) in one call: `GET /feed/home?lat=&lng=`.
- Like/save a clip, and list saved items: `POST /content/{id}/like`, `POST /content/{id}/save`,
  `GET /me/saved` ([engagement](../backend/src/engagement)).
- Follow/unfollow a creator, block/unblock a user, and see who they follow:
  `POST /follows/{creator_id}`, `POST /blocks/{user_id}`, `GET /me/following`
  ([social](../backend/src/social)).
- Report abusive content or a creator (rate-limited to 10/hour):
  `POST /reports` ([social](../backend/src/social)).
- Batch-report raw analytics events (views, completions, shares, ticket clicks) for the feed
  ranker and creator analytics to consume: `POST /analytics/events` ([engagement](../backend/src/engagement)).
- View a creator's public profile and a venue's upcoming events:
  `GET /creators/{creator_id}`, `GET /venues/{venue_id}/events`, `GET /events/nearby?lat=&lng=`.

**Comedian**

- Set up/update a stage profile (name, bio, genres): `PUT /creators/me`
  ([creators](../backend/src/creators)).
- Post a text/image announcement, or upload a video clip: `POST /content` returns a direct
  upload URL (tus or multipart, via Cloudflare Stream or the in-memory stub in dev) that the
  client uploads straight to; `PUT`/webhook flow marks it processing → published as the provider
  transcodes it ([content](../backend/src/content), [media](../backend/src/media)).
- Get added to / removed from a venue's event lineup: `POST /events/{id}/comedians/{comedian_id}`.
- View personal analytics: views/completions/shares/ticket-clicks per clip and totals, plus
  where in the world their audience is watching from: `GET /creator/analytics/overview`,
  `GET /creator/analytics/content/{id}`, `GET /creator/analytics/audience`
  ([analytics](../backend/src/analytics)).

**Venue**

- Set up/update a venue profile (name, address, capacity, location): `PUT /creators/me`.
- Creator responses include nullable `latitude`/`longitude` from stored venue profiles; comedian
  responses leave these null. Profile PUT uses replacement fields: resend existing bio/capacity
  when changing location. Verification is server-managed and preserved by repository updates.
- Prepare a native gig: `POST /events/native/drafts` accepts `title`, optional `description`, required
  `localStartTime` and IANA `timeZone`, optional `localEndTime` and HTTPS `ticketUrl`. Local times
  must use `YYYY-MM-DDTHH:mm` without an offset or seconds. Start must be future; end must be later
  (use the following date for overnight gigs). DST gaps and ambiguous wall times are rejected.
  The venue's stored nonblank name/address and valid paired coordinates are required; venue
  identity/location cannot be supplied by the client. The existing event response, persistence,
  place/H3 resolution and write limit are reused. Missing Storage explicitly prevents image
  uploads/publication; a private preparation is never a public fallback.
- Native preparation accepts optional UUID `Idempotency-Key`: same-owner/payload replay returns
  the original event even after its start; mismatched payload returns 409 without inserting
  another event. The hash/key format is unchanged, so old native submissions reconcile through
  the draft endpoint. Definitive input/service validation returns 422 before persistence.
- Complete an owned draft using `PATCH /events/{id}/draft`: the same native fields plus required
  integer `expectedRevision` (the response's `posterRevision`). Fetch all owned preparations and
  events, including past/cancelled records, with `GET /venues/me/events`.
- Create a private signed image upload intent and complete processing through
  `/events/{id}/poster/uploads` and `/events/{id}/poster/uploads/{assetId}/complete`. Publish with
  `POST /events/{id}/publish`, body `{assetId, expectedRevision}`. Only a successful finalization
  exposes the event publicly. `PUT /events/{id}/poster` replaces artwork on published gigs;
  `DELETE /events/{id}/poster` cannot remove their sole image. Event responses include
  `publicationStatus`, display URL/dimensions and revision; no original keys or signed original
  URLs are exposed.
- Legacy `POST /events` and new attempts at `POST /events/native` return explicit update-required 409. Legacy native replays succeed only for an already-published event with the same
  owner/key/hash; a stored private draft returns update-required rather than false public success.
  The corrected draft endpoint recovers that private record using its original key.
- Update and cancel events, and manage the comedian lineup:
  `PATCH /events/{id}`, `DELETE /events/{id}`, `POST`/`DELETE /events/{id}/comedians/{comedian_id}`
  ([events](../backend/src/events)).
- Post event-promotion content linked to one of their events: `POST /content` with
  `type=event_promotion` and `eventId` set.
- Same analytics endpoints as comedians, scoped to their own content/events.

**Automatic / background (no direct user action)**

- Hourly when Storage is configured: reference-safe poster cleanup/reconciliation, initially
  dry-run, at most 100 candidates. Requires inactivity grace and the signed-capability/TUS floor;
  activation and destructive cleanup require separate operator verification.
- Every 2 minutes: reconcile any video upload that's gone stale — expire uploads whose signed URL
  lapsed, and re-poll Cloudflare for ones that missed their webhook
  (`ContentService.reconcile_stale_media`, run from [workers/main.py](../backend/src/workers/main.py)).
- Every 15 minutes: roll up raw engagement events into daily per-content and per-creator stats
  tables that power the analytics endpoints above ([workers/rollup.py](../backend/src/workers/rollup.py)).
- Every 5 minutes: recompute the global trending-content list from a recency-weighted decay over
  recent engagement, cached for the feed's `TrendingSource`
  ([workers/trending.py](../backend/src/workers/trending.py)).
