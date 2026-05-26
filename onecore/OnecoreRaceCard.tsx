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
        borderColor: OC.gold + "55",
      }}
    >
      <Text style={{ color: OC.gold, fontWeight: "900", fontSize: 10, letterSpacing: 1 }}>ONECORE</Text>
      <Text style={{ color: OC.text, fontWeight: "900", fontSize: 18, marginTop: 4 }}>{race.title}</Text>
      <Text style={{ color: OC.muted, fontSize: 13, marginTop: 2 }}>
        {artist.name} · {raceStatusLabel(race.status)}
      </Text>
      <Text style={{ color: OC.text, fontWeight: "800", fontSize: 15, marginTop: S.sm }}>
        {race.currentCount} / {race.targetCount} core
      </Text>
      <Text style={{ color: OC.muted, fontSize: 13, marginTop: 4 }}>{raceProgressHeadline(race)}</Text>
      <View style={{ height: 6, backgroundColor: OC.border, borderRadius: 999, marginTop: S.sm, overflow: "hidden" }}>
        <View style={{ width: `${pct}%`, height: "100%", backgroundColor: OC.fan.primary }} />
      </View>
      <Text style={{ color: OC.dim, fontSize: 11, marginTop: S.sm }}>{formatCountdown(race.deadlineCountdown)}</Text>
    </TouchableOpacity>
  );
}
