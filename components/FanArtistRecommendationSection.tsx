import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import type { FanArtistRecommendation } from "../onecore/fanRecommendations";
import { fanRecommendationStatusLabel, platformLabelKo } from "../onecore/fanRecommendations";

const C = {
  card: "#0f172a",
  border: "#1e293b",
  text: "#f8fafc",
  muted: "#94a3b8",
  dim: "#64748b",
  accent: "#22c55e",
  accentSoft: "#86efac",
  gold: "#f59e0b",
};

type Props = {
  recommendations: FanArtistRecommendation[];
  onRecommend: () => void;
};

export function FanArtistRecommendationSection({ recommendations, onRecommend }: Props) {
  const visibleRecommendations = recommendations.filter((rec) => rec.status !== "rejected");

  return (
    <View style={{ marginBottom: 20 }}>
      <View
        style={{
          backgroundColor: "#111827",
          borderRadius: 16,
          padding: 15,
          borderWidth: 1,
          borderColor: C.gold + "88",
        }}
      >
        <Text style={{ color: C.gold, fontWeight: "900", fontSize: 10, letterSpacing: 0.8 }}>팬 추천 · 새 캠페인 제안</Text>
        <Text style={{ color: C.text, fontWeight: "900", fontSize: 16, marginTop: 6, lineHeight: 22 }}>
          공연 열고 싶은 아티스트가 있나요?
        </Text>
        <Text style={{ color: C.muted, fontSize: 12, lineHeight: 18, marginTop: 6 }}>
          아티스트 링크와 이유를 남겨주세요. 팬 추천이 모이면 ONECORE 캠페인 후보로 검토합니다.
        </Text>
        <Text style={{ color: C.dim, fontSize: 11, lineHeight: 16, marginTop: 8 }}>
          아티스트 신청이 아니에요 · fanstage 검토 후 100코어 캠페인이 열릴 수 있어요
        </Text>
        <TouchableOpacity
          onPress={onRecommend}
          activeOpacity={0.9}
          style={{
            marginTop: 12,
            backgroundColor: C.accent,
            borderRadius: 10,
            paddingVertical: 12,
            alignItems: "center",
          }}
        >
          <Text style={{ color: "#020617", fontWeight: "900", fontSize: 14 }}>아티스트 추천하기</Text>
        </TouchableOpacity>
      </View>

      {visibleRecommendations.length > 0 ? (
        <View style={{ marginTop: 12 }}>
          {visibleRecommendations.map((rec) => {
            const approved = rec.status === "approved";
            return (
            <View
              key={rec.id}
              style={{
                backgroundColor: C.card,
                borderRadius: 12,
                padding: 12,
                marginBottom: 8,
                borderWidth: 1,
                borderColor: C.border,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: C.text, fontWeight: "800", fontSize: 14 }}>{rec.artistName}</Text>
                <View
                  style={{
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    borderRadius: 6,
                  backgroundColor: approved ? "#14532d" : "#422006",
                  borderWidth: 1,
                  borderColor: approved ? C.accent + "66" : C.gold + "55",
                  }}
                >
                  <Text style={{ color: approved ? C.accentSoft : C.gold, fontWeight: "800", fontSize: 10 }}>
                    {fanRecommendationStatusLabel(rec.status)}
                  </Text>
                </View>
              </View>
              <View
                style={{
                  alignSelf: "flex-start",
                  marginTop: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                  borderRadius: 6,
                  backgroundColor: "#172033",
                  borderWidth: 1,
                  borderColor: C.border,
                }}
              >
                <Text style={{ color: C.muted, fontWeight: "700", fontSize: 10 }}>
                  {platformLabelKo(rec.proofPlatform)}
                </Text>
              </View>
              <Text style={{ color: C.dim, fontSize: 12, lineHeight: 17, marginTop: 6 }} numberOfLines={2}>
                {rec.fanReason}
              </Text>
            </View>
          );
          })}
        </View>
      ) : null}
    </View>
  );
}
