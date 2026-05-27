import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BattleArtistSocialProof } from "../components/BattleArtistSocialProof";
import type { Artist, OnecoreFanPhase, Race } from "./types";
import { resolveRaceCampaignVisual } from "./campaignVisuals";
import { OnecoreCampaignPoster } from "./OnecoreCampaignPoster";
import type { OnecoreCardVariant } from "./copy";
import {
  fanCampaignCardMeta,
  fanPhaseCardHero,
  fanPhaseSubline,
  formatCollectingDeadlineLine,
  formatDeposit,
  resolveFanCampaignPitch,
  resolveOnecoreCardVariant,
} from "./copy";
import { resolveOnecoreFanPhase } from "./logic";
import { OC, OC_SPACE as S } from "./tokens";

type Props = {
  race: Race;
  artist: Artist;
  venueName?: string;
  venueCapacity?: number;
  onPress: () => void;
};

function CardShell({
  borderColor,
  variant,
  posterBadge,
  posterBadgeColor,
  campaignImage,
  title,
  meta,
  children,
  onPress,
}: {
  borderColor: string;
  variant: OnecoreCardVariant;
  posterBadge: string;
  posterBadgeColor: string;
  campaignImage?: ReturnType<typeof resolveRaceCampaignVisual>;
  title: string;
  meta: string;
  children: React.ReactNode;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        backgroundColor: OC.card,
        borderRadius: 18,
        marginBottom: S.md,
        borderWidth: 1.5,
        borderColor,
        overflow: "hidden",
      }}
    >
      <OnecoreCampaignPoster
        image={campaignImage}
        variant={variant}
        badgeLabel={posterBadge}
        badgeColor={posterBadgeColor}
      />
      <View style={{ paddingHorizontal: S.md, paddingTop: S.sm, paddingBottom: S.md }}>
        <Text style={{ color: OC.text, fontWeight: "900", fontSize: 16, lineHeight: 21 }} numberOfLines={2}>
          {title}
        </Text>
        <Text style={{ color: OC.muted, fontSize: 11, marginTop: 3 }} numberOfLines={1}>
          {meta}
        </Text>
        {children}
      </View>
    </TouchableOpacity>
  );
}

function ProgressBar({
  pct,
  fillColor,
  height = 6,
}: {
  pct: number;
  fillColor: string;
  height?: number;
}) {
  return (
    <View style={{ height, backgroundColor: OC.border, borderRadius: 999, overflow: "hidden" }}>
      <View style={{ width: `${pct}%`, height: "100%", backgroundColor: fillColor }} />
    </View>
  );
}

function CollectingCard({
  race,
  artist,
  phase,
  pitch,
  pct,
  remaining,
  campaignImage,
  onPress,
}: {
  race: Race;
  artist: Artist;
  phase: OnecoreFanPhase;
  pitch: string | undefined;
  pct: number;
  remaining: number;
  campaignImage?: ReturnType<typeof resolveRaceCampaignVisual>;
  onPress: () => void;
}) {
  return (
    <CardShell
      onPress={onPress}
      variant="collecting"
      borderColor={OC.gold + "66"}
      posterBadge="ONECORE"
      posterBadgeColor={OC.gold}
      campaignImage={campaignImage}
      title={race.title}
      meta={fanCampaignCardMeta(artist.name, artist.genre, phase)}
    >
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 24, marginTop: S.sm, letterSpacing: -0.5 }}>
        {fanPhaseCardHero(phase, race)}
      </Text>
      <Text style={{ color: OC.gold, fontWeight: "800", fontSize: 14, marginTop: 2 }}>{remaining}코어 남음</Text>

      {pitch ? (
        <Text style={{ color: "#cbd5e1", fontSize: 12, lineHeight: 17, marginTop: S.sm }} numberOfLines={1}>
          {pitch}
        </Text>
      ) : null}
      <Text style={{ color: OC.muted, fontSize: 11, marginTop: 4, lineHeight: 16 }}>{fanPhaseSubline(phase, race)}</Text>

      <BattleArtistSocialProof social={artist.social} compact sectionLabel="아티스트 확인하기" />

      <View style={{ marginTop: S.sm }}>
        <ProgressBar pct={pct} fillColor={OC.fan.primary} />
      </View>
      <Text style={{ color: OC.dim, fontSize: 11, marginTop: 5 }}>{formatCollectingDeadlineLine(race)}</Text>

      <View
        style={{
          marginTop: S.sm,
          borderRadius: 10,
          backgroundColor: OC.accent,
          alignItems: "center",
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: OC.ink, fontWeight: "900", fontSize: 14 }}>
          코어 참여하기 · {formatDeposit(race.depositAmount)}
        </Text>
      </View>
    </CardShell>
  );
}

function ReviewingCard({
  race,
  artist,
  phase,
  pitch,
  pct,
  campaignImage,
  onPress,
}: {
  race: Race;
  artist: Artist;
  phase: OnecoreFanPhase;
  pitch: string | undefined;
  pct: number;
  campaignImage?: ReturnType<typeof resolveRaceCampaignVisual>;
  onPress: () => void;
}) {
  return (
    <CardShell
      onPress={onPress}
      variant="reviewing"
      borderColor={OC.gold + "55"}
      posterBadge="최소 수요 증명 완료"
      posterBadgeColor={OC.gold}
      campaignImage={campaignImage}
      title={race.title}
      meta={`${artist.name} · ${artist.genre}`}
    >
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 19, marginTop: S.sm, lineHeight: 25 }}>
        {fanPhaseCardHero(phase, race)}
      </Text>
      <Text style={{ color: OC.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>{fanPhaseSubline(phase, race)}</Text>
      <Text style={{ color: OC.dim, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
        아직 티켓 판매 단계는 아니에요
      </Text>

      {pitch ? (
        <Text style={{ color: "#94a3b8", fontSize: 11, lineHeight: 16, marginTop: 6 }} numberOfLines={1}>
          {pitch}
        </Text>
      ) : null}

      <BattleArtistSocialProof social={artist.social} compact sectionLabel="아티스트 확인하기" />

      <View style={{ marginTop: S.sm, opacity: 0.5 }}>
        <ProgressBar pct={pct} fillColor={OC.gold} height={4} />
        <Text style={{ color: OC.dim, fontSize: 10, marginTop: 3 }}>
          {race.currentCount} / {race.targetCount} core
        </Text>
      </View>

      <View
        style={{
          marginTop: S.sm,
          borderRadius: 10,
          backgroundColor: OC.surface,
          borderWidth: 1,
          borderColor: OC.border,
          alignItems: "center",
          paddingVertical: 11,
        }}
      >
        <Text style={{ color: OC.muted, fontWeight: "800", fontSize: 13 }}>아티스트 검토 중</Text>
      </View>
    </CardShell>
  );
}

function TicketOpenCard({
  race,
  artist,
  pitch,
  venueName,
  capacity,
  remainingTickets,
  campaignImage,
  onPress,
}: {
  race: Race;
  artist: Artist;
  pitch: string | undefined;
  venueName: string;
  capacity: number;
  remainingTickets: number;
  campaignImage?: ReturnType<typeof resolveRaceCampaignVisual>;
  onPress: () => void;
}) {
  return (
    <CardShell
      onPress={onPress}
      variant="ticket"
      borderColor={OC.fan.border}
      posterBadge="티켓 추가 오픈"
      posterBadgeColor={OC.accentSoft}
      campaignImage={campaignImage}
      title={race.title}
      meta={`${artist.name} · ${artist.genre} · ${venueName}`}
    >
      <View
        style={{
          alignSelf: "flex-start",
          marginTop: S.sm,
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 5,
          backgroundColor: OC.fan.bg,
          borderWidth: 1,
          borderColor: OC.fan.border,
        }}
      >
        <Text style={{ color: OC.accentSoft, fontWeight: "800", fontSize: 9 }}>100코어 확보</Text>
      </View>

      <Text style={{ color: OC.accentSoft, fontWeight: "900", fontSize: 21, marginTop: 6, lineHeight: 27 }}>
        {fanPhaseCardHero("ticket_open", race, remainingTickets)}
      </Text>

      <Text style={{ color: OC.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>
        {venueName} · 정원 {capacity} · {formatDeposit(race.depositAmount)}
      </Text>
      <Text style={{ color: OC.dim, fontSize: 11, marginTop: 4, lineHeight: 15 }} numberOfLines={2}>
        100코어는 공연을 여는 최소 수요였고, 남은 좌석은 베뉴 확정 후 추가로 열립니다.
      </Text>

      {pitch ? (
        <Text style={{ color: "#94a3b8", fontSize: 11, lineHeight: 16, marginTop: 6 }} numberOfLines={1}>
          {pitch}
        </Text>
      ) : null}

      <View
        style={{
          marginTop: S.sm,
          borderRadius: 10,
          backgroundColor: OC.accent,
          alignItems: "center",
          paddingVertical: 12,
        }}
      >
        <Text style={{ color: OC.ink, fontWeight: "900", fontSize: 14 }}>추가 티켓 구매</Text>
      </View>

      <BattleArtistSocialProof social={artist.social} compact sectionLabel="아티스트 확인하기" />
    </CardShell>
  );
}

export function OnecoreRaceCard({ race, artist, venueName, venueCapacity, onPress }: Props) {
  const phase = resolveOnecoreFanPhase(race);
  const variant = resolveOnecoreCardVariant(phase);
  const pct = Math.min(100, Math.round((race.currentCount / Math.max(race.targetCount, 1)) * 100));
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  const pitch = resolveFanCampaignPitch(race, artist, variant);
  const capacity = venueCapacity ?? 180;
  const remainingTickets = Math.max(0, capacity - race.targetCount);
  const resolvedVenue = venueName ?? "홍대 클럽 FF";
  const campaignImage = resolveRaceCampaignVisual({ race, artist, variant });

  if (variant === "collecting") {
    return (
      <CollectingCard
        race={race}
        artist={artist}
        phase={phase}
        pitch={pitch}
        pct={pct}
        remaining={remaining}
        campaignImage={campaignImage}
        onPress={onPress}
      />
    );
  }

  if (variant === "reviewing") {
    return (
      <ReviewingCard
        race={race}
        artist={artist}
        phase={phase}
        pitch={pitch}
        pct={pct}
        campaignImage={campaignImage}
        onPress={onPress}
      />
    );
  }

  return (
    <TicketOpenCard
      race={race}
      artist={artist}
      pitch={pitch}
      venueName={resolvedVenue}
      capacity={capacity}
      remainingTickets={remainingTickets}
      campaignImage={campaignImage}
      onPress={onPress}
    />
  );
}
