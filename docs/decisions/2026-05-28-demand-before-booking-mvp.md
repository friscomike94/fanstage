# Decision: Demand Before Booking (fanstage MVP secret)

Status: accepted  
Date: 2026-05-28

## Core idea

fanstage is **not** primarily an artist self-service event registration tool.

The MVP proves: **fans rally core demand first** → fanstage **privately** converts that demand into a show.

Flow:

1. Scout finds a demand campaign (artist + city + why now).
2. Fans commit core until threshold (100).
3. Demand is proven — not “show confirmed.”
4. fanstage starts **private artist outreach** (invite link).
5. Admin/scout narrows **2–3 venue candidates** (fans never confirm venue).
6. Artist reviews private invite (interest / adjust terms / not available).
7. Terms confirmed → ticketing opens, or refund / alternative path.

## Roles

| Role | Does | Does not |
|------|------|----------|
| Fan | Proves demand with core | Confirm venue, see negotiation economics |
| Scout | Scouts demand campaigns | Create confirmed shows |
| Admin | Converts demand → artist/venue/terms | Auto-book on 100 cores |
| Artist | Responds on **private invite** | Public self-service dashboard (MVP) |

## References (remix)

- [Bandsintown Request A Show](https://www.bandsintown.com/) — fan requests as demand insight
- Spotify Reserved / priority demand signals — rewarding real fans
- Sofar Sounds — curated venue / intimate show experience
- FanFlex / Vibe Room style — fan-funded or pre-sold attendance ideas

**Our remix:** Bandsintown demand signal + Kickstarter threshold + Sofar venue curation + **private artist invite**.

## Product surfaces

- **Fan:** ONECORE proposal / Venues cards — fan-safe copy only
- **Scout:** Demand scout screen (not “create show”)
- **Admin:** Race ops, shortlist venues, send private invite
- **Artist:** Private invite page (`artistInvite` overlay) — economics + venue options + response form

## Technical notes

- `RaceAdminPhase` maps public/admin rhythm without breaking `RaceStatus`
- `artist_reviewing_invite` status when invite is sent
- `DemandScoutCampaign` + `ArtistInviteSubmission` in `onecore/`
- Expo SDK **54** — do not upgrade for Expo Go 54.0.2 compatibility

## Copy guardrails

- Never: “공연이 확정됩니다” before artist, venue, date, terms are done
- Fan lines: 수요 증명 → 비공개 초대 → 공연장 검토 → 조건 확인 → 티켓 오픈
