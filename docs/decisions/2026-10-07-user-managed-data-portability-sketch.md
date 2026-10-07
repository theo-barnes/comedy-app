# User-Managed Data Portability and Connectors

- Status: Rough ADR sketch; deferred, not accepted or scheduled for implementation.
- Date: 2026-10-07
- Risk: High if implemented: external access, credentials, data contracts and synchronization.
- Owner: Separate future data-portability workstream.

## Context

Venues and promoters may already manage programmes on their websites, in files or with ticket
providers. Users should be responsible for porting their data, building or commissioning
connectors, configuring synchronization and maintaining authority to use each external source.

This is optional interoperability, not content creation or a required signup/onboarding step.
No platform-maintained provider catalogue, automatic importer or hosted connector builder is
promised here.

## Tentative Direction

The app might eventually provide a documented, authorized interchange surface while users
operate their own integration tooling. Possible starting points, to evaluate separately:

- User-driven structured file import/export with validation and a reviewable change summary.
- Stable IDs, versioned event-data schemas and documented mappings.
- Scoped API access for user-operated connectors, distinct from app sign-in credentials.
- Outbound change notifications or a changes feed for synchronizing a user's website.
- Inbound idempotent writes with explicit ownership and conflict rules.

These are ideas, not accepted endpoints or a commitment to all capabilities. Decide whether the
app supplies any tooling beyond documentation and an API before designing it. User-operated
connector code should not run inside the app's backend by default.

Users choose their source of truth and synchronization direction: one-off migration, inbound,
outbound or bidirectional. Responsibility does not remove the app's duty to enforce authorization,
validation, rate limits and isolation at its boundary.

## Questions for the Future ADR

- Who can authorize porting: venue operator, promoter, organization member or delegated integrator?
- Where does connector code run, and who stores, rotates and revokes credentials?
- How are provider account IDs, physical venues, event occurrences and app IDs mapped?
- How are repeated imports, multiple ticket sellers and cross-source duplicates reconciled?
- Which source owns each field, and how do edits avoid sync loops and silent overwrites?
- How are timezones, recurring shows, reschedules, cancellations and unpublished events handled?
- How do users see partial failures, stale data, retry progress and a safe preview before writes?
- What happens on disconnection, deletion requests, provider outages or changing terms?

Exclude attendee, customer, order and payment data unless a later, purpose-specific decision
authorizes it. Start with event metadata; artwork requires its own reuse permission.

## Provider Research Notes

Research on 2026-10-07 distinguishes API availability from permission to export or redistribute:

- [Ticketmaster Discovery](https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/)
  is public listing discovery, not authenticated organizer export.
  [Partner access](https://developer.ticketmaster.com/products-and-docs/apis/partner/) is restricted.
- [Eventbrite](https://www.eventbrite.com/platform/new/docs/eventbrite-api-v3-public.apib) documents
  organizer OAuth and organization-event access; its former public event search is discontinued.
- [Ticket Tailor](https://help.tickettailor.com/en/articles/4593218-how-do-i-connect-to-the-ticket-tailor-api)
  documents user access to box-office data with endpoint permissions.
- [DICE promoter tools](https://dice.fm/partners) do not establish third-party API entitlement.
  Supported access, exports and synchronization mechanisms need direct confirmation.
- [Skiddle](https://www.skiddle.com/api/) offers an application process with commercial-use conditions.

Bulk event-metadata account exports and live calendar feeds were not verified across these
providers. Do not confuse attendee exports with event inventory, or single-event calendar files
with ongoing synchronization. Recheck documentation and actual account capabilities when this
work resumes; no provider connector is selected.

## TODO: Business Model and Permission

Monetization is undecided. Before making provider-related commitments, describe possible
subscriptions, advertising/sponsorship, affiliate revenue or a free service and clarify the
app's intended role. A free pilot does not establish permission for future commercial use.

[Ticketmaster terms](https://developer.ticketmaster.com/support/terms-of-use/),
[Eventbrite terms](https://www.eventbrite.com/help/en-us/articles/833731/eventbrite-api-terms-of-use/)
and [Skiddle terms](https://www.skiddle.com/api/join.php) have material permitted-use restrictions.
Account consent does not waive provider terms or grant artwork rights. Clarify caching,
attribution, ticket links, redistribution, retention, revocation and takedown responsibilities.
User-built connectors do not circumvent contractual restrictions.

## Alternatives and Consequences

- Manual copying only: least platform integration surface, but repetitive and prone to stale data.
- User-operated connectors against a documented boundary: proposed direction to explore; gives
  users control but requires technical expertise or third-party assistance.
- Platform-built/hosted provider connectors: outside the requested direction; would introduce
  maintenance, credential handling and provider-access commitments.
- Bidirectional synchronization by default: not recommended without explicit conflict/loop rules.

Responsibility for mapping, connector operation and provider access belongs to the user or their
integrator. The app still owns the safety and reliability of any interchange surface it offers.
Public API support and compatibility obligations would be a durable cost, not a free extension.

## Independent Future Plan

1. Interview a small UK sample of venues and multi-venue promoters about actual file/API access
   and who would build and operate their tooling.
2. Define a single interoperability use case and allocate user/integrator/platform responsibilities.
3. Resolve business-model and source-permission questions for that use case.
4. Choose an interchange contract and security model; write an accepted ADR before implementation.
5. Pilot with user-supplied non-sensitive examples and failure/conflict scenarios.

Next action when resumed: gather event-only samples and confirm whether users want file
portability, programmatic access or ongoing synchronization. Do not start provider adapters now.

## Rollout, Rollback and Verification Sketch

Any future rollout should be opt-in and limited in scope. Provide previews, idempotency,
auditable changes and credential revocation before permitting automated writes. Rollback stops
connector access/jobs without destructive restoration of unrelated user edits; honor applicable
retention/deletion obligations.

Verify tenant isolation, revoked access, duplicate delivery, partial failure, stale updates,
timezone/occurrence mapping, cancellation and conflict handling. No connector should acquire
rights to modify a venue merely through a name match. Verification and operational commands
remain to be designed; none of these capabilities has been implemented.
