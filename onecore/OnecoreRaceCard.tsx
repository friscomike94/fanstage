import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { Artist, Race } from "./types";
import { formatCountdown, raceProgressHeadline, raceStatusLabel } from "./copy";
import { OC, OC_SPACE as S } from "./tokens";

type Props = {
  race: Race;
  artist: Artist;
  onPress: () => void;
};

export function OnecoreRaceCard({ race, artist, onPress }: Props) {
  const pct = Math.min(100, Math.round((race.currentCount / Math.max(race.targetCount, 1)) * 100));
  const isDemandGathering = race.currentCount < race.targetCount;
  const isTicketOpen = race.adminPhase === "ticketing_ready" || race.status === "ticketing_ready";
  const assignedVenue = race.assignedVenueId === "venue-ff" ? "홍대 클럽 FF" : race.assignedVenueId ? "확정 공연장" : null;
  const remainingPublicTickets = assignedVenue ? Math.max(0, 180 - race.targetCount) : null;
  const statusLabel = isDemandGathering
    ? "모집 중"
    : race.adminPhase === "artist_reviewing_invite"
      ? "아티스트가 초대장을 검토 중이에요"
      : raceStatusLabel(race.status);
  const cardLabel = isTicketOpen ? "티켓 추가 오픈" : "ONECORE";
  const borderColor = isTicketOpen ? OC.fan.border : OC.gold + "55";
  const progressColor = isTicketOpen ? OC.gold : OC.fan.primary;
  const progressHeadline = isDemandGathering
    ? `${Math.max(0, race.targetCount - race.currentCount)}코어 더 모이면 아티스트 초대 단계로 넘어갑니다`
    : raceProgressHeadline(race);
  const subline = isDemandGathering
    ? "베뉴 정원은 공연장 확정 후 공개돼요"
    : isTicketOpen
      ? "100코어는 공연을 여는 최소 수요였고, 남은 좌석은 베뉴 확정 후 추가로 열립니다."
      : "최소 수요가 증명됐어요. fanstage가 아티스트와 공연 조건을 확인합니다.";

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        backgroundColor: OC.card,
        borderRadius: 18,
        padding: S.md,
        marginBottom: S.md,
        borderWidth: 1,
        borderColor,
      }}
    >
      <Text style={{ color: isTicketOpen ? OC.accentSoft : OC.gold, fontWeight: "900", fontSize: 10, letterSpacing: 1 }}>{cardLabel.toUpperCase()}</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>{race.title}</Text>
      <Text style={{ color: OC.muted, fontSize: 13, marginTop: 2 }}>
        {artist.name} · {statusLabel}
      </Text>
      <Text style={{ color: OC.text, fontWeight: "800", fontSize: 15, marginTop: S.sm }}>
        {race.currentCount} / {race.targetCount} core
      </Text>
      {!isTicketOpen ? (
        <Text style={{ color: OC.dim, fontSize: 11, marginTop: 2 }}>최소 수요 100코어</Text>
      ) : null}
      <Text style={{ color: OC.muted, fontSize: 13, marginTop: 4 }}>{progressHeadline}</Text>
      <View style={{ height: 6, backgroundColor: OC.border, borderRadius: 999, marginTop: S.sm, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: progressColor }} />
      </View>
      {isTicketOpen ? (
        <View style={{ marginTop: S.sm }}>
          <Text style={{ color: OC.muted, fontSize: 12 }}>베뉴 {assignedVenue ?? "공연장 확정 대기"}</Text>
          <Text style={{ color: OC.muted, fontSize: 12, marginTop: 2 }}>정원 180 · 100코어 확보 · 가격 3만원</Text>
          {remainingPublicTickets !== null ? (
            <Text style={{ color: OC.accentSoft, fontSize: 13, fontWeight: "800", marginTop: 4 }}>
              추가 티켓 {remainingPublicTickets}장 오픈
            </Text>
          ) : null}
          <Text style={{ color: OC.dim, fontSize: 11, marginTop: S.xs }}>{subline}</Text>
          <View
            style={{
              marginTop: S.sm,
              borderRadius: 10,
              backgroundColor: OC.fan.bg,
              borderWidth: 1,
              borderColor: OC.fan.border,
              alignItems: "center",
              paddingVertical: 10,
            }}
          >
            <Text style={{ color: OC.accentSoft, fontWeight: "900", fontSize: 13 }}>추가 티켓 구매</Text>
          </View>
        </View>
      ) : (
        <Text style={{ color: OC.dim, fontSize: 11, marginTop: S.sm }}>
          {formatCountdown(race.deadlineCountdown)} · {subline}
        </Text>
      )}
    </TouchableOpacity>
  );
}
