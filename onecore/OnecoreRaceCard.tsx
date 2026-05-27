import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { BattleArtistSocialProof } from "../components/BattleArtistSocialProof";
import type { Artist, Race } from "./types";
import { fanPhaseLabel, fanPhaseSubline, formatCountdown, formatDeposit } from "./copy";
import { resolveOnecoreFanPhase } from "./logic";
import { OC, OC_SPACE as S } from "./tokens";

type Props = {
  race: Race;
  artist: Artist;
  venueName?: string;
  venueCapacity?: number;
  onPress: () => void;
};

export function OnecoreRaceCard({ race, artist, venueName, venueCapacity, onPress }: Props) {
  const phase = resolveOnecoreFanPhase(race);
  const pct = Math.min(100, Math.round((race.currentCount / Math.max(race.targetCount, 1)) * 100));
  const remaining = Math.max(0, race.targetCount - race.currentCount);
  const pitch = artist.battlePitch ?? race.proposalReason;
  const isTicketOpen = phase === "ticket_open";
  const capacity = venueCapacity ?? 180;
  const remainingTickets = Math.max(0, capacity - race.targetCount);

  const cardLabel = isTicketOpen ? "티켓 추가 오픈" : "ONECORE";
  const borderColor = isTicketOpen ? OC.fan.border : OC.gold + "55";
  const labelColor = isTicketOpen ? OC.accentSoft : OC.gold;

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
      <Text style={{ color: labelColor, fontWeight: "900", fontSize: 10, letterSpacing: 1 }}>{cardLabel}</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>{race.title}</Text>
      <Text style={{ color: OC.muted, fontSize: 13, marginTop: 2 }}>
        {artist.name} · {artist.genre} · {fanPhaseLabel(phase)}
      </Text>

      {pitch ? (
        <Text style={{ color: "#cbd5e1", fontSize: 13, lineHeight: 20, marginTop: S.sm }} numberOfLines={2}>
          {pitch}
        </Text>
      ) : null}

      {!isTicketOpen ? (
        <BattleArtistSocialProof social={artist.social} compact sectionLabel="아티스트 확인하기" />
      ) : null}

      <Text style={{ color: OC.text, fontWeight: "800", fontSize: 15, marginTop: S.sm }}>
        {race.currentCount} / {race.targetCount} core
      </Text>
      {!isTicketOpen ? (
        <Text style={{ color: OC.dim, fontSize: 11, marginTop: 2 }}>최소 수요 100코어</Text>
      ) : (
        <Text style={{ color: OC.dim, fontSize: 11, marginTop: 2 }}>100코어 확보</Text>
      )}

      <Text style={{ color: OC.muted, fontSize: 13, marginTop: 4, lineHeight: 18 }}>{fanPhaseSubline(phase, race)}</Text>

      <View style={{ height: 6, backgroundColor: OC.border, borderRadius: 999, marginTop: S.sm, overflow: "hidden" }}>
        <View
          style={{
            width: `${pct}%`,
            height: "100%",
            backgroundColor: isTicketOpen ? OC.gold : OC.fan.primary,
          }}
        />
      </View>

      {isTicketOpen ? (
        <View style={{ marginTop: S.sm }}>
          <Text style={{ color: OC.muted, fontSize: 12 }}>베뉴 {venueName ?? "확정 공연장"}</Text>
          <Text style={{ color: OC.muted, fontSize: 12, marginTop: 2 }}>
            정원 {capacity} · 가격 {formatDeposit(race.depositAmount)}
          </Text>
          <Text style={{ color: OC.accentSoft, fontSize: 13, fontWeight: "800", marginTop: 4 }}>
            추가 티켓 {remainingTickets}장 오픈
          </Text>
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
        <>
          <Text style={{ color: OC.dim, fontSize: 11, marginTop: S.sm }}>
            {formatCountdown(race.deadlineCountdown)}
            {phase === "collecting_core" ? ` · ${remaining}코어 남음` : ""}
          </Text>
          {phase === "collecting_core" ? (
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
          ) : null}
        </>
      )}
    </TouchableOpacity>
  );
}
