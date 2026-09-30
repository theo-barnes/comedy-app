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

Module-local (defined in that module's own `service.py`, implemented via an adapter class in the
_consuming_ module's `factory.py`):

| Protocol          | Declared in             | Method                  | Implemented by                                                                        |
| ----------------- | ----------------------- | ----------------------- | ------------------------------------------------------------------------------------- |
| `ComedianLookup`  | `events/service.py`     | `comedian_exists`       | `creators` (via `events/factory.py:RepositoryComedianLookup`)                         |
| `CreatorLookup`   | `social/service.py`     | `creator_exists`        | `creators` (via `social/factory.py:RepositoryCreatorLookup`)                          |
| `ContentLookup`   | `engagement/service.py` | `content_is_engageable` | `content` (via `engagement/factory.py:RepositoryContentLookup`)                       |
| `EventsLookup`    | `feed/service.py`       | `list_nearby`           | `events` (feed's own `FeedService` is passed `events.factory.get_service()` directly) |
| `VenueNameLookup` | `feed/service.py`       | `venue_names`           | `feed`'s own repository (self-satisfied)                                              |

## Module map

| Module                                  | Purpose                                                                                                                                                                                                             | Notable dependencies                                                                                |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| [location](../backend/src/location)     | Geographic place hierarchy + discovery-region strategy (mega/large/mid/small city). See `docs/location-discovery.md`.                                                                                               | none (foundation module)                                                                            |
| [creators](../backend/src/creators)     | Comedian/venue profile CRUD.                                                                                                                                                                                        | none                                                                                                |
| [social](../backend/src/social)         | Follows, blocks, reports.                                                                                                                                                                                           | `creators` (`CreatorLookup`)                                                                        |
| [content](../backend/src/content)       | Content posts + video upload lifecycle via `media`.                                                                                                                                                                 | `location` (`PlaceLookup`), `media`                                                                 |
| [events](../backend/src/events)         | Venue events + comedian lineup.                                                                                                                                                                                     | `creators` (`ComedianLookup`), `location` (`PlaceLookup`)                                           |
| [engagement](../backend/src/engagement) | Saves, likes, raw analytics events.                                                                                                                                                                                 | `content` (`ContentLookup`)                                                                         |
| [feed](../backend/src/feed)             | Ranked video feed + home feed, assembled from `content`/`social`/`events`/`engagement` data via its own repository. Trending section reads `workers`' cached score list (falls back to an on-demand query if cold). | `location` (`PlaceLookup`), `events`, `workers` (cache contract only, via `feed/trending_cache.py`) |
| [analytics](../backend/src/analytics)   | Creator-facing stats, read from rollup tables written by `workers`.                                                                                                                                                 | `content`, `engagement`, `social`, `location` (read-only joins)                                     |
| [media](../backend/src/media)           | `MediaProvider` boundary: Cloudflare Stream or in-memory stub.                                                                                                                                                      | none                                                                                                |
| [workers](../backend/src/workers)       | `platform-worker` process: scheduled rollup/trending/media-reconciliation jobs.                                                                                                                                     | `analytics`, `content`                                                                              |
| [shared](../backend/src/shared)         | Config, auth (JWT + role cache), cache (Redis/memory), database (engine/session), errors, logging, middleware, rate limiting, cross-module `ports`.                                                                 | none (foundation module)                                                                            |

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

| Bucket key       | Routes                                                                                     | Limit     |
| ---------------- | ------------------------------------------------------------------------------------------ | --------- |
| `follow`         | `POST`/`DELETE /follows/{creator_id}`                                                      | 30 / min  |
| `block`          | `POST`/`DELETE /blocks/{user_id}`                                                          | 20 / min  |
| `reports`        | `POST /reports`                                                                            | 10 / hour |
| `like`           | `POST`/`DELETE /content/{id}/like`                                                         | 60 / min  |
| `save`           | `POST`/`DELETE /content/{id}/save`                                                         | 60 / min  |
| `analytics`      | `POST /analytics/events`                                                                   | 60 / min  |
| `event-write`    | `POST /events`, `PATCH`/`DELETE /events/{id}`, `POST`/`DELETE /events/{id}/comedians/{id}` | 20 / hour |
| `content-create` | `POST /content` (all types)                                                                | 20 / min  |
| `video-upload`   | `POST /content` (only when `type=video_clip`; additive on top of `content-create`)         | 5 / min   |

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
- Create, update, and cancel events, and manage the comedian lineup: `POST /events`,
  `PATCH /events/{id}`, `DELETE /events/{id}`, `POST`/`DELETE /events/{id}/comedians/{comedian_id}`
  ([events](../backend/src/events)).
- Post event-promotion content linked to one of their events: `POST /content` with
  `type=event_promotion` and `eventId` set.
- Same analytics endpoints as comedians, scoped to their own content/events.

**Automatic / background (no direct user action)**

- Every 2 minutes: reconcile any video upload that's gone stale — expire uploads whose signed URL
  lapsed, and re-poll Cloudflare for ones that missed their webhook
  (`ContentService.reconcile_stale_media`, run from [workers/main.py](../backend/src/workers/main.py)).
- Every 15 minutes: roll up raw engagement events into daily per-content and per-creator stats
  tables that power the analytics endpoints above ([workers/rollup.py](../backend/src/workers/rollup.py)).
- Every 5 minutes: recompute the global trending-content list from a recency-weighted decay over
  recent engagement, cached for the feed's `TrendingSource`
  ([workers/trending.py](../backend/src/workers/trending.py)).
