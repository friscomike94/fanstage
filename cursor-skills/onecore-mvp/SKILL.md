---
name: onecore-mvp
description: >-
  Build or extend ONECORE MVP in fanstage-clean: core commitments, show preparation
  (not instant confirm), Race admin + RaceEventLog. Use when editing onecore/*,
  Race proposal UI, Venues ONECORE cards, or admin race flows.
---

# ONECORE MVP

Use this skill when building or reviewing ONECORE in **fanstage-clean** (Expo 54, React Native).

## Product Truth

**ONECORE is the MVP wedge; multi-team venue Battle is a later growth mechanic (beta), not the default loop.**

ONECORE is not a ticketing page. Fans join with **core** (예치); reaching the target does **not** mean the show is confirmed.

- **100 core** = minimum demand to start show preparation (not venue capacity).
- **Venue capacity** matters only after artist acceptance + venue assignment → additional tickets open.

See `docs/decisions/2026-05-27-onecore-first-battle-later.md`.

Required loop:

1. Show is **proposed** (이유가 보여야 함).
2. Fans commit core before deadline.
3. `targetCount` is reached → **`show_preparation`** (via `target_reached` + system log).
4. Artist, venue, date, ticketing advance in visible steps.
5. Failures → refund messaging; every admin status change → **`RaceEventLog`**.

Never tell fans **「공연이 확정됩니다」** or **「공연이 열립니다」** until artist, venue, and date are all confirmed. Until then: **「공연 준비 단계」**.

## Codebase Map (implemented)

```
onecore/
  types.ts              # Domain models (camelCase in TS)
  seed.ts               # seedOnecoreState(), DEFAULT_REFUND_POLICY_ID
  logic.ts              # commitCore, applyRaceStatusChange, applyTargetReached, …
  copy.ts               # raceProgressHeadline, buildPreparationSteps, failureCopy
  tokens.ts             # OC colors (mirror App.tsx dark theme)
  RaceProposalScreen.tsx   # Fan: proposal, CTA, founding fans, prep pipeline, trust
  OnecoreRaceCard.tsx      # Discover list card
  AdminRaceScreen.tsx      # Admin: list, create/edit, status, logs
App.tsx                 # State: onecoreState, overlays raceProposal | adminRace
```

### App wiring

| Entry | Path |
|-------|------|
| Fan discover | **Onecore** tab → `ONECORE 캠페인` → `OnecoreRaceCard` → overlay `raceProposal` · 팬 추천 `fanRecommend` |
| Fan detail | `RaceProposalScreen` |
| Admin | **Profile** (curator) → `ONECORE Admin · Race & logs` → overlay `adminRace` |
| State | `useState(seedOnecoreState())` in `AppContent`; user `user-mike`, admin `admin@fanstage` |

Legacy **venue battle** (`VenueCompetition`, club FF, 100-core race UI) still lives in `App.tsx` beside ONECORE Race — do not conflate the two flows unless explicitly merging.

## Two Show Workflows

Keep two formats alive in the product:

1. **Artist-first core workflow**
   - Venue is not fixed yet.
   - Fans prove demand around one artist/show idea first.
   - Target reached means `show_preparation`, then venue/date/artist details are confirmed.
   - Fits the first and second ONECORE cards.

2. **Venue-first battle workflow**
   - Venue is fixed before the race.
   - Multiple artists/teams compete for one room/date/context.
   - The UI can emphasize ranking, leading team, and remaining cores.
   - Fits the jazz battle card.

Do not collapse these into one vague race model. If editing UI or data, make the workflow type explicit enough that users understand whether the venue is already fixed.

### Dev

```bash
npm start          # Metro
npm run qr         # Expo Go URL + QR
npm run reload     # Touch App.tsx → rebundle
```

## Data Models (`onecore/types.ts`)

Implemented: `Artist`, `Race`, `VenueCandidate`, `CoreCommitment`, `User`, `PaymentIntent`, `RefundPolicy`, `RaceEventLog`, `OnecoreState`.

### Race fields (TypeScript names)

| Spec (snake) | Code (camelCase) |
|--------------|------------------|
| artist_id | `artistId` |
| target_count | `targetCount` |
| current_count | `currentCount` |
| payment_type | `paymentType` (`deposit` \| `full`) |
| deposit_amount | `depositAmount` |
| refund_policy_id | `refundPolicyId` |
| preferred_date | `preferredDate` |
| backup_dates | `backupDates` |
| venue_candidate_ids | `venueCandidateIds` |
| artist_confirmation_status | `artistConfirmationStatus` |
| venue_confirmation_status | `venueConfirmationStatus` |
| show_preparation_status | `showPreparationStatus` |

Extra in code: `proposalReason`, `deadlineCountdown`, `failureKind`, `failureMessage`.

### Race statuses

`draft` · `active` · `target_reached` · `admin_review` · `show_preparation` · `artist_contacting` · `venue_matching` · `confirming_terms` · `artist_confirmed` · `venue_confirmed` · `date_confirmed` · `ticketing_ready` · `failed` · `cancelled` · `refunded`

**On target hit** (`commitCore` in `logic.ts`): `active` → `target_reached` → `show_preparation` (two public logs). Not `ticketing_ready`.

### Confirmation statuses (current MVP)

`pending` · `confirmed` · `unavailable` · `failed`

Backlog (not in types yet): `soft_confirmed`, `declined`, `expired`, `needs_changes`.

### VenueCandidate (current MVP)

`id`, `name`, `district`, `capacity`, `note?`

Backlog: `hold_expires_at`, `curfew`, `load_in_constraints`, `public_status_copy`, etc.

### Payment (current MVP)

`paymentType`: `deposit` | `full`. `PaymentIntent.status`: `pending` | `held` | `captured` | `refunded`.

Fan copy in `RaceProposalScreen`: 예치 보관, 실패 시 환불 (`copy.ts` `TRUST_COPY`).

Backlog: explicit `pledge` / `authorization` / `refundable_deposit` / capture timing UI.

## Fan UI (`RaceProposalScreen`)

Must include (implemented):

- **WHY THIS SHOW** — `proposalReason` + artist bio
- Progress — `currentCount` / `targetCount`, `raceProgressHeadline()` → **「N명 더 모이면 공연 준비 단계로 넘어갑니다」**
- Primary CTA — **「core로 참여하기 · 3만원」** (uses `Race.depositAmount`)
- Founding fans — `displayConsent`, `isAnonymous`, optional `displayName`; list via `getPublicFoundingFans()`
- **공연 준비 진행** — `buildPreparationSteps()` when status ≥ `target_reached`
- Failure block — `failureCopy(failureKind)` for `failed` / `cancelled` / `refunded`
- **신뢰 · 규칙** — refund policy, deadline, venue candidates, no “confirmed show” language

Primary CTA label in product spec may say **「코어팬으로 참여하기」** — align copy in `RaceProposalScreen` if product asks; keep one strong CTA per screen.

## Admin UI (`AdminRaceScreen`)

Implemented:

- List races · **수정** (draft fields) · **상태** (all statuses + reason + public flag) · **로그**
- Create race · save draft · **게시 · active**
- `applyRaceStatusChange` always appends `RaceEventLog`

Not yet in admin UI (extend `AdminRaceScreen` or new tabs):

- Dedicated venue-candidate editor
- Refund policy CRUD
- Artist/venue confirmation pickers separate from status enum
- Payment capture/refund triggers

## Event Log

Every admin status change: `changedBy`, `fromStatus`, `toStatus`, `reason`, `timestamp`, `visibleToPublic`.

Also logged: race create/publish, draft edits (non-public), system target-reached → show_preparation.

When adding features, append logs in `onecore/logic.ts` — never mutate history.

## Copy Rules (enforce in `onecore/copy.ts`)

**Use:**

- `N명 더 모이면 공연 준비 단계로 넘어갑니다` — `raceProgressHeadline()`
- `100코어를 먼저 채운 한 팀이 단독 공연 준비 단계로 넘어갑니다.` — `ONECORE_RACE_FINISH`
- `100명의 코어가 모이면, 한 팀의 밤이 공연 준비 단계로 넘어갑니다.` — `ONECORE_TAGLINE_SHORT`
- `목표를 달성했습니다. 지금은 공연 준비 단계예요 — 아직 ‘공연 확정’이 아닙니다.`
- `목표 인원에 도달하지 못하면 환불 절차가 시작됩니다` (trust section)

**Avoid:**

- `공연이 확정됩니다` / `공연이 열립니다` before `date_confirmed` (and prefer “티켓 오픈” over “확정” for ticketing)
- Contest/ranking hype that drowns out “we’re making a stage together”
- Savior framing about ONECORE “saving” artists

## Mobile Safe Area

`RaceProposalScreen` / `AdminRaceScreen` use in-scroll **「← 뒤로」** inside overlay `ScrollView` (paddingTop 32 when not using `OverlayBackHeader`).

Venue/artist overlays use `OverlayBackHeader` + `useSafeAreaInsets()`.

When changing ONECORE screens:

- Respect `SafeAreaView` / insets for back + title
- Do not let sticky CTAs cover refund/rule text
- Test narrow iPhone + Android heights

## Seed Data (`onecore/seed.ts`)

| Race id | Purpose |
|---------|---------|
| `race-kimogi-jazz-ff` | `active`, 34/100 — test `commitCore` |
| `race-moon-prep-demo` | `show_preparation` — prep pipeline UI |

## MVP Checklist

| Criterion | Status |
|-----------|--------|
| Fan understands proposal why | ✅ `proposalReason` |
| Fan can join core | ✅ `commitCore` |
| Remaining count visible | ✅ headline + bar |
| Success/failure/refund rules visible | ✅ trust + failure blocks |
| Admin create/edit race | ✅ |
| Admin status + logs | ✅ |
| Target → show preparation | ✅ auto in `applyTargetReached` |
| RaceEventLog on important changes | ✅ |

## Backlog (do not claim done)

- Real payment provider (Stripe/Toss) — MVP uses `PaymentIntent` mock `held`
- `admin_review` as manual gate before `show_preparation` (currently auto-advance)
- Rich `VenueCandidate` ops fields
- Extended confirmation enum
- Public event timeline on fan screen
- Sync or merge with legacy `VenueCompetition` / 100-core battle cards

## When Editing

1. Read `onecore/types.ts` and `logic.ts` before UI changes.
2. Put fan-facing strings in `onecore/copy.ts`.
3. Any new admin transition → `applyRaceStatusChange` or helper that writes `RaceEventLog`.
4. Run `npx tsc --noEmit` after changes.
5. `npm run reload` for Expo Go verification.

## Related Docs

- `DESIGN.md` — status-first, fan credit, card roles
- `AGENTS.md` — Expo 54 docs URL
