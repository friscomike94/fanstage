# Decision: 100 Core Show Preparation Flow

Status: decision
Date: 2026-05-27

## Decision

100 cores is the threshold for show preparation, not final show confirmation.

When a race reaches 100 cores:

1. Fan demand is proven.
2. The race enters show preparation.
3. Admin starts private artist outreach.
4. Admin manually shortlists and assigns venue candidates.
5. Artist terms, venue hold, date, ticket price, production cost, and minimum economics are checked.
6. Fans receive public status updates while money remains refundable.
7. Only after artist, venue, date, terms, and ticketing are confirmed can the product say the show is confirmed.

## Product Flow

Recommended MVP status path:

`active` -> `target_reached` -> `show_preparation` -> `artist_contacting` -> `venue_matching` -> `confirming_terms` -> `artist_confirmed` -> `venue_confirmed` -> `date_confirmed` -> `ticketing_ready`

Failure paths remain:

`failed` -> `refunded`

## Artist Participation

Use a hybrid model.

Fans may recommend an artist and gather demand, but the artist must control whether the campaign becomes official.

Before artist opt-in:

- Treat fan activity as an interest signal.
- Do not imply the artist owes fans a show.
- Do not ask fans to pressure the artist publicly.
- Contact the artist privately first, using official channels when possible and social DM as a secondary route.

## Venue Assignment

Do not auto-confirm a venue at 100 cores.

Admin should manually shortlist 2-3 venues based on:

- City and neighborhood
- Capacity and layout
- Genre and room fit
- Rental cost or deal structure
- Sound, lighting, house staff, load-in, setup, and teardown constraints
- Date availability
- Age policy and safety conditions
- Ticket split, F&B, merch, and settlement rules

## Economics

Recommended model: cost-first waterfall, then artist-favorable split.

Gross ticket revenue should account for:

1. VAT/tax and payment costs
2. Ticketing, refund, and dispute reserve
3. Venue rental or venue minimum
4. Required production costs
5. Scout success fee
6. Platform margin
7. Artist payout

Recommended ranges:

- Venue: fixed rental preferred early; if revenue share, keep it limited.
- Scout: net revenue 2-5%, capped for early MVP shows.
- Platform: buyer fee 5-8% plus low net commission, or net revenue 8-12%.
- Artist: maximize remaining payout; use minimum guarantees only when economics support them.

100 cores opens the booking conversation. Healthier economics likely start around 150-200 paid attendees or stronger ticket pricing.

## Guardrails

- Never say `100 cores = confirmed show`.
- Never send fans to pressure an artist publicly.
- Keep outreach and admin decisions logged.
- Do not hold fan money indefinitely; unresolved campaigns need refund review around 21-30 days.
- Venue choice is operational risk, not decoration.
- Scout and platform compensation must not leave the artist as the least protected party.
