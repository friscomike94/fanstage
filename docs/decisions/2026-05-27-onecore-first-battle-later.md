# ONECORE first, Battle later

**Date:** 2026-05-27  
**Status:** Accepted

## Decision

fanstage MVP is anchored on **ONECORE campaigns**, not venue battle competitions.

## Product loop (default)

1. Artist/show idea → fans commit **core** toward **minimum demand (100 core)**
2. Threshold reached → private artist invite & terms review
3. Artist accepted → venue matching
4. Venue assigned → **additional ticket sales** open for remaining capacity

## Key distinctions

| Concept | Meaning |
|--------|---------|
| **100 core** | Minimum demand threshold to **start show preparation** (the key to open the door) |
| **Venue capacity** | Maximum attendees **after** venue is assigned — separate from 100 core |
| **Additional tickets** | `venue capacity − secured core demand` (e.g. 180 − 100 = 80) |

## Fan-facing copy principles

- Say **100코어**, not “100명” when describing the threshold
- Do not imply venue capacity is part of the 100 core goal
- Ticket availability copy appears only after artist + venue confirmation

## Battle (optional later)

Multi-team venue **battle** remains in the codebase as a **beta / future event** mechanic for curators, venues, and promotional use cases. It is **not** required for the first product loop and must not dominate Discover or primary navigation.

## Implementation notes

- Primary surfaces: `OnecoreRaceCard`, `RaceProposalScreen`, Discover ONECORE section
- Beta battle venues: demoted section + banner linking back to ONECORE campaign
- Fan phases: `collecting_core` → `threshold_reached` → `artist_accepted` → `venue_assigned` → `ticket_open`
