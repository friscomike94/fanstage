import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BattleArtistSocialProof } from "../components/BattleArtistSocialProof";
import type { Artist, OnecoreFanPhase, Race } from "./types";
import {
  fanPhaseLabel,
  fanPhaseCardHero,
  fanPhaseReviewingBullets,
  fanPhaseSubline,
  formatCollectingDeadlineLine,
  formatDeposit,
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
  label,
  labelColor,
  title,
  meta,
  children,
  onPress,
}: {
  borderColor: string;
  label: string;
  labelColor: string;
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
        padding: S.md,
        marginBottom: S.md,
        borderWidth: 1.5,
        borderColor,
      }}
    >
      <Text style={{ color: labelColor, fontWeight: "900", fontSize: 10, letterSpacing: 1 }}>{label}</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 17, marginTop: 4, lineHeight: 22 }} numberOfLines={2}>
        {title}
      </Text>
      <Text style={{ color: OC.muted, fontSize: 12, marginTop: 3 }} numberOfLines={1}>
        {meta}
      </Text>
      {children}
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
  onPress,
}: {
  race: Race;
  artist: Artist;
  phase: OnecoreFanPhase;
  pitch: string | undefined;
  pct: number;
  remaining: number;
  onPress: () => void;
}) {
  return (
    <CardShell
      onPress={onPress}
      borderColor={OC.gold + "66"}
      label="ONECORE"
      labelColor={OC.gold}
      title={race.title}
      meta={`${artist.name} · ${artist.genre} · ${fanPhaseLabel(phase)}`}
    >
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 26, marginTop: S.sm, letterSpacing: -0.5 }}>
        {fanPhaseCardHero(phase, race)}
      </Text>
      <Text style={{ color: OC.gold, fontWeight: "800", fontSize: 15, marginTop: 4 }}>{remaining}코어 남음</Text>

      {pitch ? (
        <Text style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 19, marginTop: S.sm }} numberOfLines={2}>
          {pitch}
        </Text>
      ) : null}

      <BattleArtistSocialProof social={artist.social} sectionLabel="아티스트 확인하기" />

      <Text style={{ color: OC.muted, fontSize: 12, marginTop: S.sm, lineHeight: 17 }}>{fanPhaseSubline(phase, race)}</Text>

      <View style={{ marginTop: S.sm }}>
        <ProgressBar pct={pct} fillColor={OC.fan.primary} />
      </View>
      <Text style={{ color: OC.dim, fontSize: 11, marginTop: 6 }}>{formatCollectingDeadlineLine(race)}</Text>

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
  onPress,
}: {
  race: Race;
  artist: Artist;
  phase: OnecoreFanPhase;
  pitch: string | undefined;
  pct: number;
  onPress: () => void;
}) {
  const bullets = fanPhaseReviewingBullets();
  return (
    <CardShell
      onPress={onPress}
      borderColor={OC.gold + "55"}
      label="ONECORE"
      labelColor={OC.gold}
      title={race.title}
      meta={`${artist.name} · ${artist.genre}`}
    >
      <View
        style={{
          alignSelf: "flex-start",
          marginTop: S.sm,
          paddingHorizontal: 10,
          paddingVertical: 4,
          borderRadius: 999,
          backgroundColor: OC.gold + "22",
          borderWidth: 1,
          borderColor: OC.gold + "55",
        }}
      >
        <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 11 }}>최소 수요 증명 완료</Text>
      </View>

      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 20, marginTop: S.sm, lineHeight: 26 }}>
        {fanPhaseCardHero(phase, race)}
      </Text>
      <Text style={{ color: OC.muted, fontSize: 12, marginTop: 4, lineHeight: 17 }}>{fanPhaseSubline(phase, race)}</Text>

      {bullets.map((line) => (
        <Text key={line} style={{ color: OC.dim, fontSize: 11, marginTop: 4, lineHeight: 16 }}>
          · {line}
        </Text>
      ))}

      {pitch ? (
        <Text style={{ color: "#94a3b8", fontSize: 12, lineHeight: 17, marginTop: S.sm }} numberOfLines={2}>
          {pitch}
        </Text>
      ) : null}

      <BattleArtistSocialProof social={artist.social} compact sectionLabel="아티스트 확인하기" />

      <View style={{ marginTop: S.sm, opacity: 0.55 }}>
        <ProgressBar pct={pct} fillColor={OC.gold} height={4} />
        <Text style={{ color: OC.dim, fontSize: 10, marginTop: 4 }}>
          {race.currentCount} / {race.targetCount} core · 최소 수요 달성
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
  onPress,
}: {
  race: Race;
  artist: Artist;
  pitch: string | undefined;
  venueName: string;
  capacity: number;
  remainingTickets: number;
  onPress: () => void;
}) {
  const venueLine = `${venueName} · 정원 ${capacity} · 추가 티켓 ${remainingTickets}장`;
  return (
    <CardShell
      onPress={onPress}
      borderColor={OC.fan.border}
      label="티켓 추가 오픈"
      labelColor={OC.accentSoft}
      title={race.title}
      meta={`${artist.name} · ${artist.genre}`}
    >
      <View
        style={{
          alignSelf: "flex-start",
          marginTop: S.sm,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderRadius: 6,
          backgroundColor: OC.fan.bg,
          borderWidth: 1,
          borderColor: OC.fan.border,
        }}
      >
        <Text style={{ color: OC.accentSoft, fontWeight: "800", fontSize: 10 }}>100코어 확보</Text>
      </View>

      <Text style={{ color: OC.accentSoft, fontWeight: "900", fontSize: 22, marginTop: S.sm, lineHeight: 28 }}>
        {fanPhaseCardHero("ticket_open", race, remainingTickets)}
      </Text>

      <Text style={{ color: OC.text, fontWeight: "800", fontSize: 14, marginTop: 6 }}>{venueName}</Text>
      <Text style={{ color: OC.muted, fontSize: 12, marginTop: 2 }}>정원 {capacity}</Text>
      <Text style={{ color: OC.muted, fontSize: 13, fontWeight: "700", marginTop: 4 }}>
        가격 {formatDeposit(race.depositAmount)}
      </Text>

      <Text style={{ color: OC.dim, fontSize: 11, marginTop: 6, lineHeight: 16 }}>{venueLine}</Text>
      <Text style={{ color: OC.muted, fontSize: 12, marginTop: S.sm, lineHeight: 17 }}>
        100코어는 공연을 여는 최소 수요였고, 남은 좌석은 베뉴 확정 후 추가로 열립니다.
      </Text>

      {pitch ? (
        <Text style={{ color: "#94a3b8", fontSize: 12, lineHeight: 17, marginTop: S.sm }} numberOfLines={2}>
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
  const pitch = artist.battlePitch ?? race.proposalReason;
  const capacity = venueCapacity ?? 180;
  const remainingTickets = Math.max(0, capacity - race.targetCount);
  const resolvedVenue = venueName ?? "홍대 클럽 FF";

  if (variant === "collecting") {
    return (
      <CollectingCard
        race={race}
        artist={artist}
        phase={phase}
        pitch={pitch}
        pct={pct}
        remaining={remaining}
        onPress={onPress}
      />
    );
  }

  if (variant === "reviewing") {
    return (
      <ReviewingCard race={race} artist={artist} phase={phase} pitch={pitch} pct={pct} onPress={onPress} />
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
      onPress={onPress}
    />
  );
}
