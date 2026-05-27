# Battle pitch split: proof + pitch

**Date:** 2026-05-26  
**Status:** Accepted

## Context

Fans need to decide whether to back an artist in a venue battle before committing cores or deposits. A single free-text pitch does not separate *who the artist is* from *why fans should rally now*.

## Decision

1. **Battle proof** — structured social links (Instagram, TikTok, YouTube, Spotify, SoundCloud, website/press, other) with an optional primary platform. At least one link is required for applications and scout campaigns.
2. **Battle pitch** — a short fan-facing reason to support (roughly 140–240 characters; minimum 20 for submit, max 240).
3. **Fan UX** — battle cards show pitch under “팬들이 응원할 이유” and proof under “아티스트 확인하기” / “소셜 증거”. Tapping opens the profile via `Linking.openURL` without leaving the battle screen state.
4. **Hierarchy** — support/vote/core CTA remains visually dominant; social chips are secondary.

## Rationale

Social links are **decision evidence**, not promotional decoration. They help fans verify identity before backing. This aligns with the MVP thesis: **fans prove demand before booking** — proof comes first, then pitch, then commitment.

## Implementation

- `lib/artistSocial.ts` — URL normalization, platform list, demo seed meta per lineup artist
- `components/BattleArtistSocialProof.tsx` — fan-facing link row
- `components/BattleProofPitchFields.tsx` — artist/scout submission form
- Venue battle cards, artist detail, venue admin applications, demand scout campaigns
